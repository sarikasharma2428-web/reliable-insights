"""
Loki Integration - Query and stream logs from Loki
"""
import httpx
import json
from typing import Any, Optional, List, Dict, AsyncIterator
from datetime import datetime
import asyncio

from utils.config import settings
from utils.logger import logger


async def check_loki_health() -> bool:
    """Check if Loki is healthy"""
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{settings.LOKI_URL}/ready",
                timeout=5.0
            )
            return response.status_code == 200
    except Exception as e:
        logger.error(f"Loki health check failed: {e}")
        return False


async def query_loki(
    query: str,
    start: datetime,
    end: datetime,
    limit: int = 100
) -> List[Dict[str, Any]]:
    """
    Execute a LogQL query against Loki
    
    Args:
        query: LogQL query string
        start: Start timestamp
        end: End timestamp
        limit: Maximum number of log entries
        
    Returns:
        List of log entries
    """
    try:
        params = {
            "query": query,
            "start": str(int(start.timestamp() * 1e9)),  # Nanoseconds
            "end": str(int(end.timestamp() * 1e9)),
            "limit": limit,
            "direction": "backward"
        }
        
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{settings.LOKI_URL}/loki/api/v1/query_range",
                params=params,
                timeout=60.0
            )
            
            if response.status_code != 200:
                logger.error(f"Loki query failed: {response.text}")
                return []
            
            data = response.json()
            
            if data.get("status") != "success":
                logger.error(f"Loki query error: {data.get('error', 'Unknown')}")
                return []
            
            results = []
            for stream in data.get("data", {}).get("result", []):
                labels = stream.get("stream", {})
                for value in stream.get("values", []):
                    timestamp_ns, log_line = value
                    timestamp = datetime.fromtimestamp(int(timestamp_ns) / 1e9)
                    
                    # Try to parse as JSON
                    try:
                        parsed = json.loads(log_line)
                        message = parsed.get("message", log_line)
                        level = parsed.get("level", "info")
                        metadata = {k: v for k, v in parsed.items() if k not in ["message", "level"]}
                    except json.JSONDecodeError:
                        message = log_line
                        level = "info"
                        metadata = {}
                    
                    results.append({
                        "timestamp": timestamp.isoformat(),
                        "labels": labels,
                        "message": message,
                        "level": level,
                        "metadata": metadata,
                        "raw": log_line
                    })
            
            return results
            
    except Exception as e:
        logger.error(f"Loki query failed: {e}")
        return []


async def stream_logs(query: str) -> AsyncIterator[Dict[str, Any]]:
    """
    Stream logs from Loki using WebSocket tail
    
    Args:
        query: LogQL query string
        
    Yields:
        Log entries as they arrive
    """
    import websockets
    
    ws_url = settings.LOKI_URL.replace("http://", "ws://").replace("https://", "wss://")
    
    params = {
        "query": query,
        "delay_for": "0",
        "limit": "100"
    }
    
    param_str = "&".join(f"{k}={v}" for k, v in params.items())
    url = f"{ws_url}/loki/api/v1/tail?{param_str}"
    
    try:
        async with websockets.connect(url) as ws:
            while True:
                try:
                    message = await asyncio.wait_for(ws.recv(), timeout=30.0)
                    data = json.loads(message)
                    
                    for stream in data.get("streams", []):
                        labels = stream.get("stream", {})
                        for value in stream.get("values", []):
                            timestamp_ns, log_line = value
                            timestamp = datetime.fromtimestamp(int(timestamp_ns) / 1e9)
                            
                            try:
                                parsed = json.loads(log_line)
                                message = parsed.get("message", log_line)
                                level = parsed.get("level", "info")
                            except json.JSONDecodeError:
                                message = log_line
                                level = "info"
                            
                            yield {
                                "timestamp": timestamp.isoformat(),
                                "labels": labels,
                                "message": message,
                                "level": level
                            }
                            
                except asyncio.TimeoutError:
                    # Send keepalive
                    await ws.ping()
                    continue
                    
    except Exception as e:
        logger.error(f"Loki stream error: {e}")
        raise


async def get_labels() -> List[str]:
    """Get all available Loki labels"""
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{settings.LOKI_URL}/loki/api/v1/labels",
                timeout=10.0
            )
            
            if response.status_code != 200:
                return []
            
            data = response.json()
            return data.get("data", [])
            
    except Exception as e:
        logger.error(f"Failed to get Loki labels: {e}")
        return []


async def get_label_values(label: str) -> List[str]:
    """Get values for a specific Loki label"""
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{settings.LOKI_URL}/loki/api/v1/label/{label}/values",
                timeout=10.0
            )
            
            if response.status_code != 200:
                return []
            
            data = response.json()
            return data.get("data", [])
            
    except Exception as e:
        logger.error(f"Failed to get label values: {e}")
        return []


async def push_logs(streams: List[Dict[str, Any]]) -> bool:
    """
    Push logs to Loki
    
    Args:
        streams: List of stream objects with labels and values
        
    Returns:
        True if successful
    """
    try:
        payload = {"streams": streams}
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{settings.LOKI_URL}/loki/api/v1/push",
                json=payload,
                timeout=10.0
            )
            
            return response.status_code == 204
            
    except Exception as e:
        logger.error(f"Failed to push logs to Loki: {e}")
        return False


async def get_series(
    match: List[str],
    start: Optional[datetime] = None,
    end: Optional[datetime] = None
) -> List[Dict[str, str]]:
    """Get log series matching selectors"""
    try:
        params = {"match[]": match}
        if start:
            params["start"] = str(int(start.timestamp() * 1e9))
        if end:
            params["end"] = str(int(end.timestamp() * 1e9))
        
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{settings.LOKI_URL}/loki/api/v1/series",
                params=params,
                timeout=30.0
            )
            
            if response.status_code != 200:
                return []
            
            data = response.json()
            return data.get("data", [])
            
    except Exception as e:
        logger.error(f"Failed to get series: {e}")
        return []
