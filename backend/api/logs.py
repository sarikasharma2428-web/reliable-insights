"""
Logs API - Query and stream logs
"""
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, WebSocket
from pydantic import BaseModel
from datetime import datetime, timedelta
import json

from db.database import get_db
from monitoring.loki import query_loki, stream_logs
from utils.logger import logger

router = APIRouter()


class LogEntry(BaseModel):
    id: str
    service_id: Optional[str]
    level: str
    message: str
    metadata: Optional[dict]
    trace_id: Optional[str]
    created_at: datetime


@router.get("/logs", response_model=List[LogEntry])
async def list_logs(
    service_id: Optional[str] = Query(None),
    level: Optional[str] = Query(None, description="Filter by level: debug, info, warn, error"),
    search: Optional[str] = Query(None, description="Search in message"),
    trace_id: Optional[str] = Query(None),
    start: Optional[datetime] = Query(None),
    end: Optional[datetime] = Query(None),
    limit: int = Query(100, le=1000),
    db=Depends(get_db)
):
    """List logs with filtering"""
    query = "SELECT * FROM logs WHERE 1=1"
    params = []
    param_idx = 1
    
    if service_id:
        query += f" AND service_id = ${param_idx}"
        params.append(service_id)
        param_idx += 1
    
    if level:
        query += f" AND level = ${param_idx}"
        params.append(level)
        param_idx += 1
    
    if search:
        query += f" AND message ILIKE ${param_idx}"
        params.append(f"%{search}%")
        param_idx += 1
    
    if trace_id:
        query += f" AND trace_id = ${param_idx}"
        params.append(trace_id)
        param_idx += 1
    
    if start:
        query += f" AND created_at >= ${param_idx}"
        params.append(start)
        param_idx += 1
    
    if end:
        query += f" AND created_at <= ${param_idx}"
        params.append(end)
        param_idx += 1
    
    query += f" ORDER BY created_at DESC LIMIT ${param_idx}"
    params.append(limit)
    
    rows = await db.fetch(query, *params)
    return [dict(row) for row in rows]


@router.get("/logs/loki/query")
async def loki_query(
    query: str = Query(..., description="LogQL query"),
    start: Optional[datetime] = Query(None),
    end: Optional[datetime] = Query(None),
    limit: int = Query(100, le=5000)
):
    """Execute a LogQL query against Loki"""
    try:
        if not start:
            start = datetime.utcnow() - timedelta(hours=1)
        if not end:
            end = datetime.utcnow()
        
        result = await query_loki(query, start, end, limit)
        return {"status": "success", "data": result}
    except Exception as e:
        logger.error(f"Loki query failed: {e}")
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/logs/loki/labels")
async def get_loki_labels():
    """Get available Loki labels"""
    try:
        from monitoring.loki import get_labels
        labels = await get_labels()
        return {"labels": labels}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/logs/loki/label/{label}/values")
async def get_loki_label_values(label: str):
    """Get values for a specific Loki label"""
    try:
        from monitoring.loki import get_label_values
        values = await get_label_values(label)
        return {"label": label, "values": values}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.websocket("/logs/stream")
async def websocket_log_stream(
    websocket: WebSocket,
    service_id: Optional[str] = Query(None),
    level: Optional[str] = Query(None)
):
    """WebSocket endpoint for real-time log streaming"""
    await websocket.accept()
    
    try:
        # Build Loki query
        labels = []
        if service_id:
            labels.append(f'service="{service_id}"')
        if level:
            labels.append(f'level="{level}"')
        
        label_selector = "{" + ",".join(labels) + "}" if labels else "{}"
        query = label_selector
        
        # Stream logs
        async for log_entry in stream_logs(query):
            await websocket.send_json(log_entry)
            
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
    finally:
        await websocket.close()


@router.post("/logs/ingest")
async def ingest_log(
    service_id: str,
    level: str,
    message: str,
    metadata: Optional[dict] = None,
    trace_id: Optional[str] = None,
    db=Depends(get_db)
):
    """Ingest a log entry"""
    row = await db.fetchrow(
        """
        INSERT INTO logs (service_id, level, message, metadata, trace_id)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
        """,
        service_id,
        level,
        message,
        json.dumps(metadata) if metadata else None,
        trace_id
    )
    
    return dict(row)


@router.get("/logs/trace/{trace_id}")
async def get_trace_logs(trace_id: str, db=Depends(get_db)):
    """Get all logs for a specific trace"""
    rows = await db.fetch(
        """
        SELECT * FROM logs 
        WHERE trace_id = $1 
        ORDER BY created_at ASC
        """,
        trace_id
    )
    
    return [dict(row) for row in rows]


@router.get("/logs/stats")
async def get_log_stats(
    service_id: Optional[str] = Query(None),
    hours: int = Query(24, le=168),
    db=Depends(get_db)
):
    """Get log statistics"""
    since = datetime.utcnow() - timedelta(hours=hours)
    
    params = [since]
    service_filter = ""
    if service_id:
        service_filter = "AND service_id = $2"
        params.append(service_id)
    
    stats = await db.fetchrow(
        f"""
        SELECT 
            COUNT(*) as total,
            COUNT(*) FILTER (WHERE level = 'error') as errors,
            COUNT(*) FILTER (WHERE level = 'warn') as warnings,
            COUNT(*) FILTER (WHERE level = 'info') as info,
            COUNT(*) FILTER (WHERE level = 'debug') as debug
        FROM logs
        WHERE created_at >= $1 {service_filter}
        """,
        *params
    )
    
    return dict(stats)
