"""
SLO Rules - Service Level Objective definitions and breach detection
"""
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
from dataclasses import dataclass
from enum import Enum

from monitoring.slis import calculate_sli, check_slo_compliance
from monitoring.prometheus import query_prometheus
from utils.logger import logger


class SLOType(str, Enum):
    AVAILABILITY = "availability"
    LATENCY = "latency"
    ERROR_RATE = "error_rate"
    THROUGHPUT = "throughput"


@dataclass
class SLODefinition:
    """SLO Definition"""
    name: str
    service_id: str
    slo_type: SLOType
    target: float
    window: str = "30d"
    description: Optional[str] = None
    

# Default SLO templates
DEFAULT_SLO_TEMPLATES = [
    SLODefinition(
        name="API Availability",
        service_id="",
        slo_type=SLOType.AVAILABILITY,
        target=99.9,
        window="30d",
        description="99.9% of requests should succeed"
    ),
    SLODefinition(
        name="API Latency P99",
        service_id="",
        slo_type=SLOType.LATENCY,
        target=99.0,
        window="30d",
        description="99% of requests should complete under 200ms"
    ),
    SLODefinition(
        name="Error Rate",
        service_id="",
        slo_type=SLOType.ERROR_RATE,
        target=0.1,
        window="30d",
        description="Error rate should be below 0.1%"
    ),
]


async def get_slo_status(service_id: str) -> List[Dict[str, Any]]:
    """Get SLO status for a service"""
    from db.database import get_db_pool
    
    pool = await get_db_pool()
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            "SELECT * FROM slos WHERE service_id = $1",
            service_id
        )
        
        results = []
        for row in rows:
            slo = dict(row)
            
            # Calculate current compliance
            compliance = await check_slo_compliance(
                service_id=service_id,
                slo_target=slo["target_availability"],
                sli_type="availability",
                window=slo.get("period", "30d")
            )
            
            slo["compliance"] = compliance
            slo["is_breaching"] = not compliance.get("compliant", True)
            
            results.append(slo)
        
        return results


async def check_slo_breaches() -> List[Dict[str, Any]]:
    """
    Check all SLOs for breaches
    
    Returns:
        List of SLO breaches with details
    """
    from db.database import get_db_pool
    
    breaches = []
    
    pool = await get_db_pool()
    async with pool.acquire() as conn:
        # Get all active SLOs
        rows = await conn.fetch("SELECT * FROM slos")
        
        for row in rows:
            slo = dict(row)
            service_id = slo.get("service_id")
            
            if not service_id:
                continue
            
            # Check availability SLO
            if slo.get("target_availability"):
                compliance = await check_slo_compliance(
                    service_id=service_id,
                    slo_target=slo["target_availability"],
                    sli_type="availability",
                    window=slo.get("period", "30d")
                )
                
                if compliance.get("compliant") is False:
                    breaches.append({
                        "slo_id": slo["id"],
                        "slo_name": slo["name"],
                        "service_id": service_id,
                        "type": "availability",
                        "target": slo["target_availability"],
                        "current": compliance["current_sli"],
                        "error_budget_remaining": compliance["error_budget_remaining"],
                        "status": compliance["status"],
                        "detected_at": datetime.utcnow().isoformat()
                    })
            
            # Check latency SLO
            if slo.get("target_latency_p99"):
                current_latency = await query_prometheus(
                    f'histogram_quantile(0.99, rate(http_request_duration_seconds_bucket{{service="{service_id}"}}[5m])) * 1000'
                )
                
                if current_latency and current_latency > slo["target_latency_p99"]:
                    breaches.append({
                        "slo_id": slo["id"],
                        "slo_name": slo["name"],
                        "service_id": service_id,
                        "type": "latency",
                        "target": slo["target_latency_p99"],
                        "current": current_latency,
                        "status": "breaching",
                        "detected_at": datetime.utcnow().isoformat()
                    })
    
    return breaches


async def create_slo(
    name: str,
    service_id: str,
    target_availability: float,
    target_latency_p99: Optional[float] = None,
    period: str = "30d"
) -> Dict[str, Any]:
    """Create a new SLO"""
    from db.database import get_db_pool
    
    pool = await get_db_pool()
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            """
            INSERT INTO slos (
                name, service_id, target_availability, target_latency_p99,
                current_availability, period
            )
            VALUES ($1, $2, $3, $4, 100.0, $5)
            RETURNING *
            """,
            name,
            service_id,
            target_availability,
            target_latency_p99,
            period
        )
        
        logger.info(f"SLO created: {name} for service {service_id}")
        return dict(row)


async def update_slo_metrics(slo_id: str):
    """Update SLO with current metric values"""
    from db.database import get_db_pool
    
    pool = await get_db_pool()
    async with pool.acquire() as conn:
        slo = await conn.fetchrow(
            "SELECT * FROM slos WHERE id = $1",
            slo_id
        )
        
        if not slo:
            return
        
        service_id = slo["service_id"]
        period = slo.get("period", "30d")
        
        # Calculate current availability
        availability = await calculate_sli(service_id, "availability", period)
        
        # Get current latency
        latency = await query_prometheus(
            f'histogram_quantile(0.99, rate(http_request_duration_seconds_bucket{{service="{service_id}"}}[5m])) * 1000'
        )
        
        # Calculate error budget
        target = slo["target_availability"]
        error_budget_total = 100 - target
        error_budget_consumed = 100 - (availability or 100)
        
        await conn.execute(
            """
            UPDATE slos SET
                current_availability = $2,
                current_latency_p99 = $3,
                error_budget = $4,
                error_budget_consumed = $5,
                updated_at = NOW()
            WHERE id = $1
            """,
            slo_id,
            availability,
            latency,
            error_budget_total,
            error_budget_consumed
        )


async def burn_rate_alert(
    service_id: str,
    slo_target: float,
    short_window: str = "5m",
    long_window: str = "1h",
    burn_rate_threshold: float = 14.4
) -> Optional[Dict[str, Any]]:
    """
    Multi-window burn rate alerting
    
    Uses Google SRE book approach for alerting on error budget burn rate
    """
    # Calculate burn rates
    short_error_rate = await calculate_sli(service_id, "error_rate", short_window)
    long_error_rate = await calculate_sli(service_id, "error_rate", long_window)
    
    if short_error_rate is None or long_error_rate is None:
        return None
    
    # Error budget per period
    error_budget = 100 - slo_target
    
    # Burn rate = actual error rate / allowed error rate
    short_burn_rate = short_error_rate / error_budget if error_budget > 0 else 0
    long_burn_rate = long_error_rate / error_budget if error_budget > 0 else 0
    
    # Alert if both windows exceed threshold
    if short_burn_rate > burn_rate_threshold and long_burn_rate > burn_rate_threshold:
        return {
            "service_id": service_id,
            "alert_type": "burn_rate",
            "short_burn_rate": round(short_burn_rate, 2),
            "long_burn_rate": round(long_burn_rate, 2),
            "threshold": burn_rate_threshold,
            "severity": "critical" if short_burn_rate > burn_rate_threshold * 2 else "warning",
            "message": f"Error budget burning at {short_burn_rate:.1f}x rate"
        }
    
    return None
