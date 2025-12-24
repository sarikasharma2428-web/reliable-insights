"""
Prometheus Integration - Query and interact with Prometheus
"""
import httpx
from typing import Any, Optional, List, Dict
from datetime import datetime
from urllib.parse import quote

from utils.config import settings
from utils.logger import logger


async def check_prometheus_health() -> bool:
    """Check if Prometheus is healthy"""
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{settings.PROMETHEUS_URL}/-/healthy",
                timeout=5.0
            )
            return response.status_code == 200
    except Exception as e:
        logger.error(f"Prometheus health check failed: {e}")
        return False


async def query_prometheus(query: str, time: Optional[datetime] = None) -> Optional[float]:
    """
    Execute an instant query against Prometheus
    
    Args:
        query: PromQL query string
        time: Optional evaluation timestamp
        
    Returns:
        The scalar value or None if no data
    """
    try:
        params = {"query": query}
        if time:
            params["time"] = time.timestamp()
        
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{settings.PROMETHEUS_URL}/api/v1/query",
                params=params,
                timeout=30.0
            )
            
            if response.status_code != 200:
                logger.error(f"Prometheus query failed: {response.text}")
                return None
            
            data = response.json()
            
            if data["status"] != "success":
                logger.error(f"Prometheus query error: {data.get('error', 'Unknown')}")
                return None
            
            result = data.get("data", {}).get("result", [])
            
            if not result:
                return None
            
            # Extract scalar value from vector result
            if data["data"]["resultType"] == "vector" and result:
                value = result[0].get("value", [None, None])[1]
                return float(value) if value and value != "NaN" else None
            
            if data["data"]["resultType"] == "scalar":
                return float(result[1]) if result[1] != "NaN" else None
            
            return None
            
    except Exception as e:
        logger.error(f"Prometheus query failed: {e}")
        return None


async def query_prometheus_range(
    query: str,
    start: datetime,
    end: datetime,
    step: str = "1m"
) -> List[Dict[str, Any]]:
    """
    Execute a range query against Prometheus
    
    Args:
        query: PromQL query string
        start: Start timestamp
        end: End timestamp
        step: Query resolution step
        
    Returns:
        List of data points with timestamps and values
    """
    try:
        params = {
            "query": query,
            "start": start.timestamp(),
            "end": end.timestamp(),
            "step": step
        }
        
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{settings.PROMETHEUS_URL}/api/v1/query_range",
                params=params,
                timeout=60.0
            )
            
            if response.status_code != 200:
                logger.error(f"Prometheus range query failed: {response.text}")
                return []
            
            data = response.json()
            
            if data["status"] != "success":
                logger.error(f"Prometheus query error: {data.get('error', 'Unknown')}")
                return []
            
            results = []
            for series in data.get("data", {}).get("result", []):
                metric_labels = series.get("metric", {})
                values = [
                    {
                        "timestamp": datetime.fromtimestamp(ts).isoformat(),
                        "value": float(val) if val != "NaN" else None
                    }
                    for ts, val in series.get("values", [])
                ]
                results.append({
                    "metric": metric_labels,
                    "values": values
                })
            
            return results
            
    except Exception as e:
        logger.error(f"Prometheus range query failed: {e}")
        return []


async def get_prometheus_targets() -> List[Dict[str, Any]]:
    """Get list of Prometheus scrape targets"""
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{settings.PROMETHEUS_URL}/api/v1/targets",
                timeout=10.0
            )
            
            if response.status_code != 200:
                return []
            
            data = response.json()
            return data.get("data", {}).get("activeTargets", [])
            
    except Exception as e:
        logger.error(f"Failed to get Prometheus targets: {e}")
        return []


async def get_prometheus_alerts() -> List[Dict[str, Any]]:
    """Get active Prometheus alerts"""
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{settings.PROMETHEUS_URL}/api/v1/alerts",
                timeout=10.0
            )
            
            if response.status_code != 200:
                return []
            
            data = response.json()
            return data.get("data", {}).get("alerts", [])
            
    except Exception as e:
        logger.error(f"Failed to get Prometheus alerts: {e}")
        return []


async def get_prometheus_rules() -> List[Dict[str, Any]]:
    """Get Prometheus recording and alerting rules"""
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{settings.PROMETHEUS_URL}/api/v1/rules",
                timeout=10.0
            )
            
            if response.status_code != 200:
                return []
            
            data = response.json()
            return data.get("data", {}).get("groups", [])
            
    except Exception as e:
        logger.error(f"Failed to get Prometheus rules: {e}")
        return []


async def get_metric_metadata(metric_name: Optional[str] = None) -> Dict[str, Any]:
    """Get metric metadata from Prometheus"""
    try:
        params = {}
        if metric_name:
            params["metric"] = metric_name
        
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{settings.PROMETHEUS_URL}/api/v1/metadata",
                params=params,
                timeout=10.0
            )
            
            if response.status_code != 200:
                return {}
            
            data = response.json()
            return data.get("data", {})
            
    except Exception as e:
        logger.error(f"Failed to get metric metadata: {e}")
        return {}


async def get_label_values(label: str) -> List[str]:
    """Get all values for a specific label"""
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{settings.PROMETHEUS_URL}/api/v1/label/{quote(label)}/values",
                timeout=10.0
            )
            
            if response.status_code != 200:
                return []
            
            data = response.json()
            return data.get("data", [])
            
    except Exception as e:
        logger.error(f"Failed to get label values: {e}")
        return []
