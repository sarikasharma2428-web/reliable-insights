"""
Incident Correlator - Correlate metrics, logs, and events for incident analysis
"""
from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta

from monitoring.prometheus import query_prometheus_range
from monitoring.loki import query_loki
from utils.logger import logger


async def correlate_incident(incident: Dict[str, Any]) -> Dict[str, Any]:
    """
    Correlate an incident with related metrics and logs
    
    Args:
        incident: The incident to correlate
        
    Returns:
        Correlation data including metrics, logs, and potential causes
    """
    service_id = incident.get("service_id")
    started_at = incident.get("started_at")
    resolved_at = incident.get("resolved_at")
    
    if not service_id or not started_at:
        return {"error": "Missing service_id or started_at"}
    
    # Define time window for correlation
    if isinstance(started_at, str):
        started_at = datetime.fromisoformat(started_at.replace('Z', '+00:00'))
    
    # Look back 30 minutes before incident started
    window_start = started_at - timedelta(minutes=30)
    
    # End at resolved time or now
    if resolved_at:
        if isinstance(resolved_at, str):
            resolved_at = datetime.fromisoformat(resolved_at.replace('Z', '+00:00'))
        window_end = resolved_at + timedelta(minutes=15)
    else:
        window_end = datetime.utcnow()
    
    correlation = {
        "incident_id": incident["id"],
        "incident_number": incident.get("incident_number"),
        "window": {
            "start": window_start.isoformat(),
            "end": window_end.isoformat()
        },
        "metrics": {},
        "logs": [],
        "related_changes": [],
        "potential_causes": []
    }
    
    # Gather correlated data
    try:
        correlation["metrics"] = await get_correlated_metrics(
            service_id, window_start, window_end
        )
        
        correlation["logs"] = await get_correlated_logs(
            service_id, window_start, window_end
        )
        
        correlation["potential_causes"] = await analyze_potential_causes(
            correlation["metrics"],
            correlation["logs"],
            incident
        )
        
    except Exception as e:
        logger.error(f"Correlation error: {e}")
        correlation["error"] = str(e)
    
    return correlation


async def get_correlated_metrics(
    service_id: str,
    start: datetime,
    end: datetime
) -> Dict[str, Any]:
    """Get metrics data for the incident window"""
    metrics = {}
    
    # Error rate trend
    error_data = await query_prometheus_range(
        f'sum(rate(http_requests_total{{service="{service_id}",status=~"5.."}}[1m])) / sum(rate(http_requests_total{{service="{service_id}"}}[1m])) * 100',
        start, end, "1m"
    )
    if error_data:
        metrics["error_rate"] = error_data
    
    # Latency trend
    latency_data = await query_prometheus_range(
        f'histogram_quantile(0.99, rate(http_request_duration_seconds_bucket{{service="{service_id}"}}[1m])) * 1000',
        start, end, "1m"
    )
    if latency_data:
        metrics["latency_p99"] = latency_data
    
    # Request rate trend
    rps_data = await query_prometheus_range(
        f'sum(rate(http_requests_total{{service="{service_id}"}}[1m]))',
        start, end, "1m"
    )
    if rps_data:
        metrics["requests_per_second"] = rps_data
    
    # CPU trend
    cpu_data = await query_prometheus_range(
        f'avg(rate(container_cpu_usage_seconds_total{{service="{service_id}"}}[1m])) * 100',
        start, end, "1m"
    )
    if cpu_data:
        metrics["cpu_usage"] = cpu_data
    
    # Memory trend
    memory_data = await query_prometheus_range(
        f'avg(container_memory_usage_bytes{{service="{service_id}"}}) / avg(container_spec_memory_limit_bytes{{service="{service_id}"}}) * 100',
        start, end, "1m"
    )
    if memory_data:
        metrics["memory_usage"] = memory_data
    
    return metrics


async def get_correlated_logs(
    service_id: str,
    start: datetime,
    end: datetime,
    limit: int = 100
) -> List[Dict[str, Any]]:
    """Get error and warning logs during the incident window"""
    # Query for error logs
    error_logs = await query_loki(
        f'{{service="{service_id}"}} |= "error" or level="error"',
        start, end, limit // 2
    )
    
    # Query for warning logs
    warning_logs = await query_loki(
        f'{{service="{service_id}"}} |= "warn" or level="warn"',
        start, end, limit // 2
    )
    
    # Combine and sort by timestamp
    all_logs = error_logs + warning_logs
    all_logs.sort(key=lambda x: x.get("timestamp", ""), reverse=True)
    
    return all_logs[:limit]


async def analyze_potential_causes(
    metrics: Dict[str, Any],
    logs: List[Dict[str, Any]],
    incident: Dict[str, Any]
) -> List[Dict[str, Any]]:
    """
    Analyze correlated data to identify potential causes
    
    Returns:
        List of potential causes with confidence scores
    """
    causes = []
    
    # Analyze metrics for anomalies
    metric_causes = analyze_metric_anomalies(metrics)
    causes.extend(metric_causes)
    
    # Analyze logs for patterns
    log_causes = analyze_log_patterns(logs)
    causes.extend(log_causes)
    
    # Sort by confidence
    causes.sort(key=lambda x: x.get("confidence", 0), reverse=True)
    
    return causes[:5]  # Return top 5 potential causes


def analyze_metric_anomalies(metrics: Dict[str, Any]) -> List[Dict[str, Any]]:
    """Analyze metrics for anomalies that might indicate causes"""
    causes = []
    
    # Check for error rate spike
    if "error_rate" in metrics and metrics["error_rate"]:
        values = metrics["error_rate"][0].get("values", []) if metrics["error_rate"] else []
        if values:
            error_values = [v["value"] for v in values if v["value"] is not None]
            if error_values:
                max_error = max(error_values)
                if max_error > 10:
                    causes.append({
                        "type": "metric_anomaly",
                        "cause": "High error rate spike",
                        "description": f"Error rate reached {max_error:.1f}%",
                        "metric": "error_rate",
                        "confidence": min(90, 50 + max_error * 2)
                    })
    
    # Check for latency spike
    if "latency_p99" in metrics and metrics["latency_p99"]:
        values = metrics["latency_p99"][0].get("values", []) if metrics["latency_p99"] else []
        if values:
            latency_values = [v["value"] for v in values if v["value"] is not None]
            if latency_values:
                max_latency = max(latency_values)
                if max_latency > 1000:
                    causes.append({
                        "type": "metric_anomaly",
                        "cause": "High latency spike",
                        "description": f"P99 latency reached {max_latency:.0f}ms",
                        "metric": "latency_p99",
                        "confidence": min(85, 40 + max_latency / 50)
                    })
    
    # Check for resource exhaustion
    if "cpu_usage" in metrics and metrics["cpu_usage"]:
        values = metrics["cpu_usage"][0].get("values", []) if metrics["cpu_usage"] else []
        if values:
            cpu_values = [v["value"] for v in values if v["value"] is not None]
            if cpu_values and max(cpu_values) > 90:
                causes.append({
                    "type": "resource_exhaustion",
                    "cause": "CPU exhaustion",
                    "description": f"CPU usage peaked at {max(cpu_values):.1f}%",
                    "metric": "cpu_usage",
                    "confidence": 80
                })
    
    if "memory_usage" in metrics and metrics["memory_usage"]:
        values = metrics["memory_usage"][0].get("values", []) if metrics["memory_usage"] else []
        if values:
            mem_values = [v["value"] for v in values if v["value"] is not None]
            if mem_values and max(mem_values) > 90:
                causes.append({
                    "type": "resource_exhaustion",
                    "cause": "Memory exhaustion",
                    "description": f"Memory usage peaked at {max(mem_values):.1f}%",
                    "metric": "memory_usage",
                    "confidence": 85
                })
    
    return causes


def analyze_log_patterns(logs: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Analyze logs for patterns that might indicate causes"""
    causes = []
    
    # Common error patterns
    patterns = {
        "database": ["connection", "timeout", "deadlock", "transaction"],
        "memory": ["out of memory", "oom", "heap", "gc overhead"],
        "dependency": ["upstream", "downstream", "connection refused", "circuit breaker"],
        "timeout": ["timeout", "timed out", "deadline exceeded"],
        "authentication": ["unauthorized", "forbidden", "token expired", "auth failed"],
    }
    
    pattern_counts = {k: 0 for k in patterns}
    
    for log in logs:
        message = log.get("message", "").lower()
        for pattern_type, keywords in patterns.items():
            if any(kw in message for kw in keywords):
                pattern_counts[pattern_type] += 1
    
    # Report significant patterns
    for pattern_type, count in pattern_counts.items():
        if count >= 3:
            causes.append({
                "type": "log_pattern",
                "cause": f"{pattern_type.title()} related errors",
                "description": f"Found {count} log entries with {pattern_type} related errors",
                "pattern": pattern_type,
                "confidence": min(75, 30 + count * 5)
            })
    
    return causes


async def find_related_incidents(
    conn,
    incident: Dict[str, Any],
    limit: int = 5
) -> List[Dict[str, Any]]:
    """Find incidents that might be related to the current one"""
    service_id = incident.get("service_id")
    triggered_by = incident.get("triggered_by")
    started_at = incident.get("started_at")
    
    if isinstance(started_at, str):
        started_at = datetime.fromisoformat(started_at.replace('Z', '+00:00'))
    
    # Look for similar incidents in the past 30 days
    lookback = started_at - timedelta(days=30)
    
    query = """
        SELECT * FROM incidents 
        WHERE id != $1 
        AND started_at >= $2
        AND (
            service_id = $3
            OR triggered_by = $4
            OR title ILIKE $5
        )
        ORDER BY started_at DESC
        LIMIT $6
    """
    
    title_pattern = f"%{incident.get('title', '').split()[0]}%" if incident.get('title') else "%"
    
    rows = await conn.fetch(
        query,
        incident["id"],
        lookback,
        service_id,
        triggered_by,
        title_pattern,
        limit
    )
    
    return [dict(row) for row in rows]
