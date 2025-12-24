"""
Metrics Collectors - OpenTelemetry and custom metric collection
"""
import asyncio
from typing import Dict, Any, Optional
from datetime import datetime
import httpx

from utils.config import settings
from utils.logger import logger

# Store active service collectors
_active_collectors: Dict[str, asyncio.Task] = {}
_collector_running = False


async def start_collectors():
    """Start the metrics collection background task"""
    global _collector_running
    _collector_running = True
    logger.info("Metrics collectors started")


async def stop_collectors():
    """Stop all metrics collectors"""
    global _collector_running
    _collector_running = False
    
    for service_id, task in _active_collectors.items():
        task.cancel()
        try:
            await task
        except asyncio.CancelledError:
            pass
    
    _active_collectors.clear()
    logger.info("Metrics collectors stopped")


async def register_service(service: Dict[str, Any]):
    """Register a service for metrics collection"""
    service_id = service["id"]
    
    if service_id in _active_collectors:
        logger.warning(f"Service {service_id} already registered")
        return
    
    task = asyncio.create_task(collect_service_metrics(service))
    _active_collectors[service_id] = task
    logger.info(f"Registered collector for service: {service['name']}")


async def unregister_service(service_id: str):
    """Unregister a service from metrics collection"""
    if service_id in _active_collectors:
        _active_collectors[service_id].cancel()
        try:
            await _active_collectors[service_id]
        except asyncio.CancelledError:
            pass
        del _active_collectors[service_id]
        logger.info(f"Unregistered collector for service: {service_id}")


async def collect_service_metrics(service: Dict[str, Any]):
    """Collect metrics for a specific service"""
    service_id = service["id"]
    service_name = service["name"]
    
    while _collector_running:
        try:
            # Collect metrics from Prometheus
            metrics = await fetch_prometheus_metrics(service_id)
            
            if metrics:
                await store_metrics(service_id, metrics)
            
            # Check service health
            await check_service_health(service)
            
            # Sleep before next collection
            await asyncio.sleep(settings.COLLECTION_INTERVAL_SECONDS)
            
        except asyncio.CancelledError:
            break
        except Exception as e:
            logger.error(f"Error collecting metrics for {service_name}: {e}")
            await asyncio.sleep(settings.COLLECTION_INTERVAL_SECONDS)


async def fetch_prometheus_metrics(service_id: str) -> Optional[Dict[str, float]]:
    """Fetch metrics from Prometheus for a service"""
    from monitoring.prometheus import query_prometheus
    
    try:
        metrics = {}
        
        # CPU usage
        cpu = await query_prometheus(
            f'avg(rate(container_cpu_usage_seconds_total{{service="{service_id}"}}[5m])) * 100'
        )
        if cpu is not None:
            metrics["cpu_usage"] = cpu
        
        # Memory usage
        memory = await query_prometheus(
            f'avg(container_memory_usage_bytes{{service="{service_id}"}}) / avg(container_spec_memory_limit_bytes{{service="{service_id}"}}) * 100'
        )
        if memory is not None:
            metrics["memory_usage"] = memory
        
        # Request rate
        rps = await query_prometheus(
            f'sum(rate(http_requests_total{{service="{service_id}"}}[5m]))'
        )
        if rps is not None:
            metrics["requests_per_second"] = rps
        
        # Error rate
        error_rate = await query_prometheus(
            f'sum(rate(http_requests_total{{service="{service_id}",status=~"5.."}}[5m])) / sum(rate(http_requests_total{{service="{service_id}"}}[5m])) * 100'
        )
        if error_rate is not None:
            metrics["error_rate"] = error_rate
        
        # Latency p50
        p50 = await query_prometheus(
            f'histogram_quantile(0.50, rate(http_request_duration_seconds_bucket{{service="{service_id}"}}[5m]))'
        )
        if p50 is not None:
            metrics["latency_p50"] = p50 * 1000  # Convert to ms
        
        # Latency p99
        p99 = await query_prometheus(
            f'histogram_quantile(0.99, rate(http_request_duration_seconds_bucket{{service="{service_id}"}}[5m]))'
        )
        if p99 is not None:
            metrics["latency_p99"] = p99 * 1000  # Convert to ms
        
        return metrics if metrics else None
        
    except Exception as e:
        logger.error(f"Failed to fetch Prometheus metrics: {e}")
        return None


async def store_metrics(service_id: str, metrics: Dict[str, float]):
    """Store metrics in the database"""
    from db.database import get_db_pool
    
    pool = await get_db_pool()
    async with pool.acquire() as conn:
        # Update service with latest metrics
        await conn.execute(
            """
            UPDATE services SET
                cpu_usage = $2,
                memory_usage = $3,
                requests_per_second = $4,
                error_rate = $5,
                latency_p50 = $6,
                latency_p99 = $7,
                last_checked_at = NOW(),
                updated_at = NOW()
            WHERE id = $1
            """,
            service_id,
            metrics.get("cpu_usage"),
            metrics.get("memory_usage"),
            metrics.get("requests_per_second"),
            metrics.get("error_rate"),
            metrics.get("latency_p50"),
            metrics.get("latency_p99")
        )
        
        # Store individual metric records
        for metric_name, value in metrics.items():
            await conn.execute(
                """
                INSERT INTO metrics (service_id, metric_name, value, unit)
                VALUES ($1, $2, $3, $4)
                """,
                service_id,
                metric_name,
                value,
                get_metric_unit(metric_name)
            )


async def check_service_health(service: Dict[str, Any]) -> Dict[str, Any]:
    """Check the health status of a service"""
    from db.database import get_db_pool
    
    service_id = service["id"]
    
    # Determine health based on metrics
    try:
        pool = await get_db_pool()
        async with pool.acquire() as conn:
            row = await conn.fetchrow(
                "SELECT * FROM services WHERE id = $1",
                service_id
            )
            
            if not row:
                return {"status": "unknown", "reason": "Service not found"}
            
            # Health logic
            status = "healthy"
            reasons = []
            
            if row["error_rate"] and row["error_rate"] > 5:
                status = "degraded"
                reasons.append(f"High error rate: {row['error_rate']:.1f}%")
            
            if row["error_rate"] and row["error_rate"] > 10:
                status = "critical"
                reasons.append(f"Critical error rate: {row['error_rate']:.1f}%")
            
            if row["latency_p99"] and row["latency_p99"] > 1000:
                if status == "healthy":
                    status = "degraded"
                reasons.append(f"High latency: {row['latency_p99']:.0f}ms")
            
            if row["cpu_usage"] and row["cpu_usage"] > 90:
                if status == "healthy":
                    status = "degraded"
                reasons.append(f"High CPU: {row['cpu_usage']:.1f}%")
            
            if row["memory_usage"] and row["memory_usage"] > 90:
                if status == "healthy":
                    status = "degraded"
                reasons.append(f"High memory: {row['memory_usage']:.1f}%")
            
            # Update status
            await conn.execute(
                """
                UPDATE services SET status = $2, updated_at = NOW()
                WHERE id = $1
                """,
                service_id,
                status
            )
            
            return {
                "status": status,
                "reasons": reasons,
                "checked_at": datetime.utcnow().isoformat()
            }
            
    except Exception as e:
        logger.error(f"Health check failed for {service_id}: {e}")
        return {"status": "unknown", "error": str(e)}


def get_metric_unit(metric_name: str) -> str:
    """Get the unit for a metric"""
    units = {
        "cpu_usage": "%",
        "memory_usage": "%",
        "requests_per_second": "req/s",
        "error_rate": "%",
        "latency_p50": "ms",
        "latency_p99": "ms",
        "uptime": "%"
    }
    return units.get(metric_name, "")
