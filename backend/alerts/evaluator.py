"""
Alert Evaluator - Evaluate alert rules against current metrics
"""
import asyncio
from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta

from alerts.rules import get_alert_rules, evaluate_comparison, Comparison
from monitoring.prometheus import query_prometheus
from utils.config import settings
from utils.logger import logger

_evaluator_running = False
_evaluator_task: Optional[asyncio.Task] = None

# Track pending alerts (for "for" duration)
_pending_alerts: Dict[str, Dict[str, Any]] = {}


async def start_alert_evaluator():
    """Start the alert evaluation background task"""
    global _evaluator_running, _evaluator_task
    _evaluator_running = True
    _evaluator_task = asyncio.create_task(evaluation_loop())
    logger.info("Alert evaluator started")


async def stop_alert_evaluator():
    """Stop the alert evaluator"""
    global _evaluator_running, _evaluator_task
    _evaluator_running = False
    
    if _evaluator_task:
        _evaluator_task.cancel()
        try:
            await _evaluator_task
        except asyncio.CancelledError:
            pass
    
    logger.info("Alert evaluator stopped")


async def evaluation_loop():
    """Main evaluation loop"""
    while _evaluator_running:
        try:
            await run_evaluation_cycle()
            await asyncio.sleep(settings.ALERT_EVALUATION_INTERVAL_SECONDS)
        except asyncio.CancelledError:
            break
        except Exception as e:
            logger.error(f"Evaluation cycle error: {e}")
            await asyncio.sleep(settings.ALERT_EVALUATION_INTERVAL_SECONDS)


async def run_evaluation_cycle():
    """Run a single evaluation cycle"""
    from db.database import get_db_pool
    
    rules = await get_alert_rules()
    pool = await get_db_pool()
    
    async with pool.acquire() as conn:
        # Get all services
        services = await conn.fetch("SELECT * FROM services")
        
        for rule in rules:
            if not rule.get("enabled", True):
                continue
            
            for service in services:
                # Skip if rule is for a specific service
                if rule.get("service_id") and rule["service_id"] != service["id"]:
                    continue
                
                await evaluate_rule(conn, rule, dict(service))


async def evaluate_rule(conn, rule: Dict[str, Any], service: Dict[str, Any]):
    """Evaluate a single rule against a service"""
    service_id = service["id"]
    metric_name = rule["metric_name"]
    
    # Get current metric value
    current_value = service.get(metric_name)
    
    # If not in service, try Prometheus
    if current_value is None:
        current_value = await get_metric_from_prometheus(service_id, metric_name)
    
    if current_value is None:
        return
    
    # Evaluate the rule
    comparison = Comparison(rule["comparison"])
    threshold = rule["threshold"]
    
    is_firing = evaluate_comparison(current_value, threshold, comparison)
    
    pending_key = f"{service_id}_{rule['id']}"
    
    if is_firing:
        # Check if we've been firing long enough
        if pending_key not in _pending_alerts:
            _pending_alerts[pending_key] = {
                "started_at": datetime.utcnow(),
                "rule": rule,
                "service": service,
                "current_value": current_value
            }
        
        pending = _pending_alerts[pending_key]
        for_duration = parse_duration(rule.get("for_duration", "0s"))
        elapsed = datetime.utcnow() - pending["started_at"]
        
        if elapsed >= for_duration:
            # Fire the alert
            await fire_alert(conn, rule, service, current_value)
            # Remove from pending
            del _pending_alerts[pending_key]
    else:
        # Clear pending if condition no longer true
        if pending_key in _pending_alerts:
            del _pending_alerts[pending_key]
        
        # Resolve any active alerts
        await maybe_resolve_alert(conn, rule, service)


async def get_metric_from_prometheus(service_id: str, metric_name: str) -> Optional[float]:
    """Get a metric value from Prometheus"""
    metric_queries = {
        "error_rate": f'sum(rate(http_requests_total{{service="{service_id}",status=~"5.."}}[5m])) / sum(rate(http_requests_total{{service="{service_id}"}}[5m])) * 100',
        "latency_p99": f'histogram_quantile(0.99, rate(http_request_duration_seconds_bucket{{service="{service_id}"}}[5m])) * 1000',
        "cpu_usage": f'avg(rate(container_cpu_usage_seconds_total{{service="{service_id}"}}[5m])) * 100',
        "memory_usage": f'avg(container_memory_usage_bytes{{service="{service_id}"}}) / avg(container_spec_memory_limit_bytes{{service="{service_id}"}}) * 100',
        "requests_per_second": f'sum(rate(http_requests_total{{service="{service_id}"}}[5m]))',
    }
    
    query = metric_queries.get(metric_name)
    if not query:
        return None
    
    return await query_prometheus(query)


async def fire_alert(
    conn,
    rule: Dict[str, Any],
    service: Dict[str, Any],
    current_value: float
):
    """Fire an alert"""
    service_id = service["id"]
    
    # Check if alert already exists
    existing = await conn.fetchrow(
        """
        SELECT * FROM alerts 
        WHERE service_id = $1 
        AND metric_name = $2 
        AND acknowledged_at IS NULL
        AND (silenced_until IS NULL OR silenced_until <= NOW())
        LIMIT 1
        """,
        service_id,
        rule["metric_name"]
    )
    
    if existing:
        # Update existing alert
        await conn.execute(
            """
            UPDATE alerts SET 
                current_value = $2,
                fired_at = NOW()
            WHERE id = $1
            """,
            existing["id"],
            current_value
        )
        return
    
    # Create new alert
    comparison_text = {
        "gt": ">",
        "lt": "<",
        "gte": ">=",
        "lte": "<=",
        "eq": "="
    }.get(rule["comparison"], "?")
    
    message = f"{rule['metric_name']} is {current_value:.2f} ({comparison_text} {rule['threshold']})"
    
    await conn.execute(
        """
        INSERT INTO alerts (
            name, message, severity, metric_name, 
            threshold, current_value, service_id, fired_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
        """,
        rule["name"],
        message,
        rule["severity"],
        rule["metric_name"],
        rule["threshold"],
        current_value,
        service_id
    )
    
    logger.warning(f"Alert fired: {rule['name']} for {service['name']}: {message}")
    
    # Notify (future: send to Slack, email, etc.)
    await notify_alert(rule, service, current_value, message)


async def maybe_resolve_alert(conn, rule: Dict[str, Any], service: Dict[str, Any]):
    """Resolve an alert if condition is no longer true"""
    service_id = service["id"]
    
    # Find and resolve matching alert
    result = await conn.execute(
        """
        DELETE FROM alerts 
        WHERE service_id = $1 
        AND metric_name = $2 
        AND acknowledged_at IS NULL
        """,
        service_id,
        rule["metric_name"]
    )
    
    # Check if any were deleted (resolved)
    if result and "DELETE" in result:
        count = int(result.split()[-1])
        if count > 0:
            logger.info(f"Alert auto-resolved: {rule['name']} for {service['name']}")


async def notify_alert(
    rule: Dict[str, Any],
    service: Dict[str, Any],
    current_value: float,
    message: str
):
    """Send alert notification (placeholder for future integrations)"""
    # This would integrate with:
    # - Slack
    # - Email
    # - PagerDuty
    # - SMS
    # etc.
    pass


def parse_duration(duration: str) -> timedelta:
    """Parse duration string to timedelta"""
    if not duration:
        return timedelta(seconds=0)
    
    unit = duration[-1]
    value = int(duration[:-1])
    
    if unit == 's':
        return timedelta(seconds=value)
    elif unit == 'm':
        return timedelta(minutes=value)
    elif unit == 'h':
        return timedelta(hours=value)
    elif unit == 'd':
        return timedelta(days=value)
    else:
        return timedelta(seconds=0)
