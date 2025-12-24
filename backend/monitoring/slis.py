"""
SLI Calculations - Service Level Indicator computation
"""
from typing import Optional
from datetime import datetime, timedelta

from monitoring.prometheus import query_prometheus, query_prometheus_range
from utils.logger import logger


async def calculate_sli(
    service_id: str,
    sli_type: str,
    window: str = "24h"
) -> Optional[float]:
    """
    Calculate a Service Level Indicator for a service
    
    Args:
        service_id: The service identifier
        sli_type: Type of SLI (availability, latency, error_rate, throughput)
        window: Time window for calculation
        
    Returns:
        The SLI value as a percentage or None if unavailable
    """
    try:
        if sli_type == "availability":
            return await calculate_availability_sli(service_id, window)
        elif sli_type == "latency":
            return await calculate_latency_sli(service_id, window)
        elif sli_type == "error_rate":
            return await calculate_error_rate_sli(service_id, window)
        elif sli_type == "throughput":
            return await calculate_throughput_sli(service_id, window)
        else:
            logger.warning(f"Unknown SLI type: {sli_type}")
            return None
            
    except Exception as e:
        logger.error(f"Failed to calculate SLI: {e}")
        return None


async def calculate_availability_sli(service_id: str, window: str) -> Optional[float]:
    """
    Calculate availability SLI
    
    Availability = (successful requests / total requests) * 100
    """
    # Total requests
    total = await query_prometheus(
        f'sum(increase(http_requests_total{{service="{service_id}"}}[{window}]))'
    )
    
    if not total or total == 0:
        return None
    
    # Successful requests (non-5xx)
    successful = await query_prometheus(
        f'sum(increase(http_requests_total{{service="{service_id}",status!~"5.."}}[{window}]))'
    )
    
    if successful is None:
        return None
    
    availability = (successful / total) * 100
    return round(availability, 4)


async def calculate_latency_sli(
    service_id: str,
    window: str,
    threshold_ms: float = 200
) -> Optional[float]:
    """
    Calculate latency SLI
    
    Latency SLI = (requests under threshold / total requests) * 100
    """
    # Requests under threshold
    bucket_query = f'''
        sum(increase(http_request_duration_seconds_bucket{{
            service="{service_id}",
            le="{threshold_ms / 1000}"
        }}[{window}]))
    '''
    fast_requests = await query_prometheus(bucket_query)
    
    # Total requests
    total = await query_prometheus(
        f'sum(increase(http_requests_total{{service="{service_id}"}}[{window}]))'
    )
    
    if not total or total == 0:
        return None
    
    if fast_requests is None:
        return None
    
    latency_sli = (fast_requests / total) * 100
    return round(latency_sli, 4)


async def calculate_error_rate_sli(service_id: str, window: str) -> Optional[float]:
    """
    Calculate error rate SLI
    
    Error Rate = (error requests / total requests) * 100
    """
    # Error requests (5xx)
    errors = await query_prometheus(
        f'sum(increase(http_requests_total{{service="{service_id}",status=~"5.."}}[{window}]))'
    )
    
    # Total requests
    total = await query_prometheus(
        f'sum(increase(http_requests_total{{service="{service_id}"}}[{window}]))'
    )
    
    if not total or total == 0:
        return 0  # No traffic, no errors
    
    if errors is None:
        errors = 0
    
    error_rate = (errors / total) * 100
    return round(error_rate, 4)


async def calculate_throughput_sli(service_id: str, window: str) -> Optional[float]:
    """
    Calculate throughput SLI
    
    Returns: Average requests per second over the window
    """
    rps = await query_prometheus(
        f'avg(rate(http_requests_total{{service="{service_id}"}}[{window}]))'
    )
    
    return round(rps, 2) if rps is not None else None


async def get_sli_trend(
    service_id: str,
    sli_type: str,
    period_hours: int = 24,
    step: str = "1h"
) -> list:
    """
    Get SLI trend over time
    
    Args:
        service_id: The service identifier
        sli_type: Type of SLI
        period_hours: Number of hours to look back
        step: Query resolution
        
    Returns:
        List of {timestamp, value} points
    """
    end = datetime.utcnow()
    start = end - timedelta(hours=period_hours)
    
    if sli_type == "availability":
        query = f'''
            (
                sum(rate(http_requests_total{{service="{service_id}",status!~"5.."}}[5m]))
                /
                sum(rate(http_requests_total{{service="{service_id}"}}[5m]))
            ) * 100
        '''
    elif sli_type == "error_rate":
        query = f'''
            (
                sum(rate(http_requests_total{{service="{service_id}",status=~"5.."}}[5m]))
                /
                sum(rate(http_requests_total{{service="{service_id}"}}[5m]))
            ) * 100
        '''
    elif sli_type == "latency":
        query = f'''
            histogram_quantile(0.99, 
                rate(http_request_duration_seconds_bucket{{service="{service_id}"}}[5m])
            ) * 1000
        '''
    else:
        return []
    
    result = await query_prometheus_range(query, start, end, step)
    
    if result and len(result) > 0:
        return result[0].get("values", [])
    
    return []


async def check_slo_compliance(
    service_id: str,
    slo_target: float,
    sli_type: str,
    window: str = "30d"
) -> dict:
    """
    Check if a service is meeting its SLO
    
    Args:
        service_id: The service identifier
        slo_target: The SLO target (e.g., 99.9 for 99.9%)
        sli_type: Type of SLI
        window: Evaluation window
        
    Returns:
        Compliance information including error budget status
    """
    current_sli = await calculate_sli(service_id, sli_type, window)
    
    if current_sli is None:
        return {
            "compliant": None,
            "current_sli": None,
            "slo_target": slo_target,
            "error_budget_remaining": None,
            "status": "unknown"
        }
    
    # For availability/latency SLIs, higher is better
    # For error_rate, lower is better
    if sli_type == "error_rate":
        max_error = 100 - slo_target  # e.g., 0.1% for 99.9% SLO
        compliant = current_sli <= max_error
        error_budget_total = max_error
        error_budget_consumed = current_sli
    else:
        compliant = current_sli >= slo_target
        error_budget_total = 100 - slo_target
        error_budget_consumed = 100 - current_sli
    
    error_budget_remaining = max(0, error_budget_total - error_budget_consumed)
    error_budget_percent = (error_budget_remaining / error_budget_total * 100) if error_budget_total > 0 else 0
    
    if error_budget_percent > 50:
        status = "healthy"
    elif error_budget_percent > 20:
        status = "warning"
    elif error_budget_percent > 0:
        status = "critical"
    else:
        status = "exhausted"
    
    return {
        "compliant": compliant,
        "current_sli": current_sli,
        "slo_target": slo_target,
        "error_budget_total": round(error_budget_total, 4),
        "error_budget_consumed": round(error_budget_consumed, 4),
        "error_budget_remaining": round(error_budget_remaining, 4),
        "error_budget_percent": round(error_budget_percent, 2),
        "status": status
    }
