"""
Incident Detector - Threshold and anomaly detection for auto-incident creation
"""
import asyncio
from typing import Dict, Any, Optional, List
from datetime import datetime, timedelta

from monitoring.prometheus import query_prometheus
from monitoring.slos import check_slo_breaches, burn_rate_alert
from incidents.lifecycle import create_incident, get_open_incidents
from utils.config import settings
from utils.logger import logger

_detector_running = False
_detector_task: Optional[asyncio.Task] = None


# Detection thresholds
THRESHOLDS = {
    "error_rate_critical": 10.0,      # > 10% error rate
    "error_rate_warning": 5.0,        # > 5% error rate
    "latency_p99_critical": 2000,     # > 2000ms
    "latency_p99_warning": 1000,      # > 1000ms
    "cpu_critical": 95,               # > 95% CPU
    "cpu_warning": 85,                # > 85% CPU
    "memory_critical": 95,            # > 95% memory
    "memory_warning": 85,             # > 85% memory
    "availability_critical": 99.0,    # < 99% availability
}


async def start_incident_detector():
    """Start the incident detection background task"""
    global _detector_running, _detector_task
    _detector_running = True
    _detector_task = asyncio.create_task(detection_loop())
    logger.info("Incident detector started")


async def stop_incident_detector():
    """Stop the incident detector"""
    global _detector_running, _detector_task
    _detector_running = False
    
    if _detector_task:
        _detector_task.cancel()
        try:
            await _detector_task
        except asyncio.CancelledError:
            pass
    
    logger.info("Incident detector stopped")


async def detection_loop():
    """Main detection loop"""
    while _detector_running:
        try:
            await run_detection_cycle()
            await asyncio.sleep(settings.DETECTION_INTERVAL_SECONDS)
        except asyncio.CancelledError:
            break
        except Exception as e:
            logger.error(f"Detection cycle error: {e}")
            await asyncio.sleep(settings.DETECTION_INTERVAL_SECONDS)


async def run_detection_cycle():
    """Run a single detection cycle"""
    from db.database import get_db_pool
    
    pool = await get_db_pool()
    async with pool.acquire() as conn:
        # Get all active services
        services = await conn.fetch("SELECT * FROM services")
        
        for service in services:
            service_dict = dict(service)
            await detect_service_issues(conn, service_dict)
        
        # Check SLO breaches
        await check_slo_breach_incidents(conn)


async def detect_service_issues(conn, service: Dict[str, Any]):
    """Detect issues for a specific service"""
    service_id = service["id"]
    service_name = service["name"]
    
    issues = []
    
    # Check error rate
    error_rate = service.get("error_rate")
    if error_rate is not None:
        if error_rate > THRESHOLDS["error_rate_critical"]:
            issues.append({
                "type": "error_rate",
                "severity": "critical",
                "message": f"Critical error rate: {error_rate:.1f}%",
                "metric": "error_rate",
                "value": error_rate,
                "threshold": THRESHOLDS["error_rate_critical"]
            })
        elif error_rate > THRESHOLDS["error_rate_warning"]:
            issues.append({
                "type": "error_rate",
                "severity": "high",
                "message": f"High error rate: {error_rate:.1f}%",
                "metric": "error_rate",
                "value": error_rate,
                "threshold": THRESHOLDS["error_rate_warning"]
            })
    
    # Check latency
    latency = service.get("latency_p99")
    if latency is not None:
        if latency > THRESHOLDS["latency_p99_critical"]:
            issues.append({
                "type": "latency",
                "severity": "critical",
                "message": f"Critical latency: {latency:.0f}ms p99",
                "metric": "latency_p99",
                "value": latency,
                "threshold": THRESHOLDS["latency_p99_critical"]
            })
        elif latency > THRESHOLDS["latency_p99_warning"]:
            issues.append({
                "type": "latency",
                "severity": "high",
                "message": f"High latency: {latency:.0f}ms p99",
                "metric": "latency_p99",
                "value": latency,
                "threshold": THRESHOLDS["latency_p99_warning"]
            })
    
    # Check CPU
    cpu = service.get("cpu_usage")
    if cpu is not None:
        if cpu > THRESHOLDS["cpu_critical"]:
            issues.append({
                "type": "resource",
                "severity": "critical",
                "message": f"Critical CPU usage: {cpu:.1f}%",
                "metric": "cpu_usage",
                "value": cpu,
                "threshold": THRESHOLDS["cpu_critical"]
            })
        elif cpu > THRESHOLDS["cpu_warning"]:
            issues.append({
                "type": "resource",
                "severity": "high",
                "message": f"High CPU usage: {cpu:.1f}%",
                "metric": "cpu_usage",
                "value": cpu,
                "threshold": THRESHOLDS["cpu_warning"]
            })
    
    # Check Memory
    memory = service.get("memory_usage")
    if memory is not None:
        if memory > THRESHOLDS["memory_critical"]:
            issues.append({
                "type": "resource",
                "severity": "critical",
                "message": f"Critical memory usage: {memory:.1f}%",
                "metric": "memory_usage",
                "value": memory,
                "threshold": THRESHOLDS["memory_critical"]
            })
        elif memory > THRESHOLDS["memory_warning"]:
            issues.append({
                "type": "resource",
                "severity": "high",
                "message": f"High memory usage: {memory:.1f}%",
                "metric": "memory_usage",
                "value": memory,
                "threshold": THRESHOLDS["memory_warning"]
            })
    
    # Create incidents for detected issues
    for issue in issues:
        await maybe_create_incident(conn, service_id, service_name, issue)


async def maybe_create_incident(
    conn,
    service_id: str,
    service_name: str,
    issue: Dict[str, Any]
):
    """Create an incident if one doesn't already exist for this issue"""
    # Check for existing open incident with same type
    existing = await conn.fetchrow(
        """
        SELECT * FROM incidents 
        WHERE service_id = $1 
        AND status IN ('open', 'acknowledged', 'investigating')
        AND triggered_by = $2
        ORDER BY created_at DESC
        LIMIT 1
        """,
        service_id,
        f"{issue['type']}_{issue['metric']}"
    )
    
    if existing:
        # Update existing incident if severity escalated
        if _severity_rank(issue["severity"]) > _severity_rank(existing["severity"]):
            await conn.execute(
                """
                UPDATE incidents SET
                    severity = $2,
                    description = $3,
                    updated_at = NOW()
                WHERE id = $1
                """,
                existing["id"],
                issue["severity"],
                f"{issue['message']}. Escalated from {existing['severity']}."
            )
            logger.info(f"Incident escalated: {existing['incident_number']}")
        return
    
    # Create new incident
    incident = await create_incident(
        conn,
        title=f"[{service_name}] {issue['message']}",
        description=f"Auto-detected: {issue['message']}\n\nMetric: {issue['metric']}\nCurrent Value: {issue['value']}\nThreshold: {issue['threshold']}",
        severity=issue["severity"],
        service_id=service_id,
        triggered_by=f"{issue['type']}_{issue['metric']}"
    )
    
    logger.warning(f"Auto-incident created: {incident['incident_number']} - {issue['message']}")
    
    # Fire corresponding alert
    await create_alert_for_incident(conn, service_id, issue, incident)


async def create_alert_for_incident(
    conn,
    service_id: str,
    issue: Dict[str, Any],
    incident: Dict[str, Any]
):
    """Create an alert associated with an incident"""
    severity_map = {
        "critical": "critical",
        "high": "warning",
        "medium": "warning",
        "low": "info"
    }
    
    await conn.execute(
        """
        INSERT INTO alerts (
            name, message, severity, metric_name, threshold, 
            current_value, service_id, fired_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
        """,
        f"{issue['type'].title()} Alert",
        issue["message"],
        severity_map.get(issue["severity"], "warning"),
        issue["metric"],
        issue["threshold"],
        issue["value"],
        service_id
    )


async def check_slo_breach_incidents(conn):
    """Check SLO breaches and create incidents"""
    breaches = await check_slo_breaches()
    
    for breach in breaches:
        # Check for existing SLO breach incident
        existing = await conn.fetchrow(
            """
            SELECT * FROM incidents 
            WHERE service_id = $1 
            AND status IN ('open', 'acknowledged', 'investigating')
            AND triggered_by = $2
            LIMIT 1
            """,
            breach["service_id"],
            f"slo_breach_{breach['slo_id']}"
        )
        
        if existing:
            continue
        
        # Create new SLO breach incident
        severity = "critical" if breach["status"] == "exhausted" else "high"
        
        await create_incident(
            conn,
            title=f"[SLO Breach] {breach['slo_name']}",
            description=f"SLO target: {breach['target']}%\nCurrent: {breach['current']:.2f}%\nError budget remaining: {breach['error_budget_remaining']:.2f}%",
            severity=severity,
            service_id=breach["service_id"],
            triggered_by=f"slo_breach_{breach['slo_id']}"
        )
        
        logger.warning(f"SLO breach incident created for {breach['slo_name']}")


def _severity_rank(severity: str) -> int:
    """Get numeric rank for severity comparison"""
    ranks = {
        "low": 1,
        "medium": 2,
        "high": 3,
        "critical": 4
    }
    return ranks.get(severity, 0)
