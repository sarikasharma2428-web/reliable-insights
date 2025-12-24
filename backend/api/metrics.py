"""
Metrics API - Query and manage metrics data
"""
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from datetime import datetime, timedelta

from db.database import get_db
from monitoring.prometheus import query_prometheus, query_prometheus_range
from monitoring.slis import calculate_sli
from utils.logger import logger

router = APIRouter()


class MetricPoint(BaseModel):
    timestamp: datetime
    value: float


class MetricResponse(BaseModel):
    metric_name: str
    service_id: Optional[str]
    unit: Optional[str]
    values: List[MetricPoint]


class GoldenSignals(BaseModel):
    latency: float
    traffic: float
    errors: float
    saturation: float


@router.get("/metrics")
async def list_metrics(
    service_id: Optional[str] = Query(None),
    metric_name: Optional[str] = Query(None),
    start: Optional[datetime] = Query(None),
    end: Optional[datetime] = Query(None),
    limit: int = Query(100, le=1000),
    db=Depends(get_db)
):
    """List metrics with optional filtering"""
    query = "SELECT * FROM metrics WHERE 1=1"
    params = []
    param_idx = 1
    
    if service_id:
        query += f" AND service_id = ${param_idx}"
        params.append(service_id)
        param_idx += 1
    
    if metric_name:
        query += f" AND metric_name = ${param_idx}"
        params.append(metric_name)
        param_idx += 1
    
    if start:
        query += f" AND recorded_at >= ${param_idx}"
        params.append(start)
        param_idx += 1
    
    if end:
        query += f" AND recorded_at <= ${param_idx}"
        params.append(end)
        param_idx += 1
    
    query += f" ORDER BY recorded_at DESC LIMIT ${param_idx}"
    params.append(limit)
    
    rows = await db.fetch(query, *params)
    return [dict(row) for row in rows]


@router.get("/metrics/golden-signals/{service_id}")
async def get_golden_signals(
    service_id: str,
    window: str = Query("5m", description="Time window: 5m, 15m, 1h, 24h"),
    db=Depends(get_db)
):
    """Get the four golden signals for a service"""
    # Verify service exists
    service = await db.fetchrow(
        "SELECT * FROM services WHERE id = $1",
        service_id
    )
    
    if not service:
        raise HTTPException(status_code=404, detail="Service not found")
    
    # Query Prometheus for golden signals
    try:
        latency = await query_prometheus(
            f'histogram_quantile(0.99, rate(http_request_duration_seconds_bucket{{service="{service_id}"}}[{window}]))'
        )
        
        traffic = await query_prometheus(
            f'sum(rate(http_requests_total{{service="{service_id}"}}[{window}]))'
        )
        
        errors = await query_prometheus(
            f'sum(rate(http_requests_total{{service="{service_id}",status=~"5.."}}[{window}])) / sum(rate(http_requests_total{{service="{service_id}"}}[{window}]))'
        )
        
        saturation = await query_prometheus(
            f'avg(container_memory_usage_bytes{{service="{service_id}"}}) / avg(container_spec_memory_limit_bytes{{service="{service_id}"}})'
        )
        
        return GoldenSignals(
            latency=latency or 0,
            traffic=traffic or 0,
            errors=errors or 0,
            saturation=saturation or 0
        )
        
    except Exception as e:
        logger.error(f"Failed to get golden signals: {e}")
        # Fallback to database values
        return GoldenSignals(
            latency=service['latency_p99'] or 0,
            traffic=service['requests_per_second'] or 0,
            errors=service['error_rate'] or 0,
            saturation=service['memory_usage'] or 0
        )


@router.get("/metrics/prometheus/query")
async def prometheus_query(
    query: str = Query(..., description="PromQL query"),
    time: Optional[datetime] = Query(None)
):
    """Execute a PromQL instant query"""
    try:
        result = await query_prometheus(query, time)
        return {"status": "success", "data": result}
    except Exception as e:
        logger.error(f"Prometheus query failed: {e}")
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/metrics/prometheus/query_range")
async def prometheus_query_range(
    query: str = Query(..., description="PromQL query"),
    start: datetime = Query(...),
    end: datetime = Query(...),
    step: str = Query("1m", description="Query resolution step")
):
    """Execute a PromQL range query"""
    try:
        result = await query_prometheus_range(query, start, end, step)
        return {"status": "success", "data": result}
    except Exception as e:
        logger.error(f"Prometheus range query failed: {e}")
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/metrics/sli/{service_id}")
async def get_service_sli(
    service_id: str,
    sli_type: str = Query("availability", description="SLI type: availability, latency, error_rate"),
    window: str = Query("24h"),
    db=Depends(get_db)
):
    """Calculate SLI for a service"""
    service = await db.fetchrow(
        "SELECT * FROM services WHERE id = $1",
        service_id
    )
    
    if not service:
        raise HTTPException(status_code=404, detail="Service not found")
    
    sli_value = await calculate_sli(service_id, sli_type, window)
    
    return {
        "service_id": service_id,
        "sli_type": sli_type,
        "window": window,
        "value": sli_value,
        "calculated_at": datetime.utcnow().isoformat()
    }


@router.post("/metrics/record")
async def record_metric(
    service_id: str,
    metric_name: str,
    value: float,
    unit: Optional[str] = None,
    db=Depends(get_db)
):
    """Record a custom metric"""
    row = await db.fetchrow(
        """
        INSERT INTO metrics (service_id, metric_name, value, unit)
        VALUES ($1, $2, $3, $4)
        RETURNING *
        """,
        service_id,
        metric_name,
        value,
        unit
    )
    
    return dict(row)
