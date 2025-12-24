"""
Incidents API - Manage and track incidents
"""
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from datetime import datetime
from enum import Enum

from db.database import get_db
from incidents.lifecycle import (
    create_incident,
    acknowledge_incident,
    resolve_incident,
    add_incident_event
)
from incidents.correlator import correlate_incident
from utils.logger import logger

router = APIRouter()


class IncidentSeverity(str, Enum):
    critical = "critical"
    high = "high"
    medium = "medium"
    low = "low"


class IncidentStatus(str, Enum):
    open = "open"
    acknowledged = "acknowledged"
    investigating = "investigating"
    resolved = "resolved"


class IncidentCreate(BaseModel):
    title: str
    description: Optional[str]
    severity: IncidentSeverity = IncidentSeverity.medium
    service_id: Optional[str]
    triggered_by: Optional[str]


class IncidentUpdate(BaseModel):
    title: Optional[str]
    description: Optional[str]
    severity: Optional[IncidentSeverity]
    status: Optional[IncidentStatus]


class IncidentEventCreate(BaseModel):
    event_type: str
    message: str


@router.get("/incidents")
async def list_incidents(
    status: Optional[IncidentStatus] = Query(None),
    severity: Optional[IncidentSeverity] = Query(None),
    service_id: Optional[str] = Query(None),
    start: Optional[datetime] = Query(None),
    end: Optional[datetime] = Query(None),
    limit: int = Query(50, le=200),
    db=Depends(get_db)
):
    """List incidents with filtering"""
    query = "SELECT * FROM incidents WHERE 1=1"
    params = []
    param_idx = 1
    
    if status:
        query += f" AND status = ${param_idx}"
        params.append(status.value)
        param_idx += 1
    
    if severity:
        query += f" AND severity = ${param_idx}"
        params.append(severity.value)
        param_idx += 1
    
    if service_id:
        query += f" AND service_id = ${param_idx}"
        params.append(service_id)
        param_idx += 1
    
    if start:
        query += f" AND started_at >= ${param_idx}"
        params.append(start)
        param_idx += 1
    
    if end:
        query += f" AND started_at <= ${param_idx}"
        params.append(end)
        param_idx += 1
    
    query += f" ORDER BY started_at DESC LIMIT ${param_idx}"
    params.append(limit)
    
    rows = await db.fetch(query, *params)
    return [dict(row) for row in rows]


@router.post("/incidents")
async def create_incident_endpoint(
    incident: IncidentCreate,
    db=Depends(get_db)
):
    """Create a new incident"""
    result = await create_incident(
        db,
        title=incident.title,
        description=incident.description,
        severity=incident.severity.value,
        service_id=incident.service_id,
        triggered_by=incident.triggered_by
    )
    
    logger.info(f"Incident created: {result['incident_number']}")
    return result


@router.get("/incidents/{incident_id}")
async def get_incident(incident_id: str, db=Depends(get_db)):
    """Get incident details with timeline"""
    incident = await db.fetchrow(
        "SELECT * FROM incidents WHERE id = $1",
        incident_id
    )
    
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")
    
    # Get events timeline
    events = await db.fetch(
        """
        SELECT * FROM incident_events 
        WHERE incident_id = $1 
        ORDER BY created_at ASC
        """,
        incident_id
    )
    
    result = dict(incident)
    result["events"] = [dict(e) for e in events]
    
    return result


@router.put("/incidents/{incident_id}")
async def update_incident(
    incident_id: str,
    update: IncidentUpdate,
    db=Depends(get_db)
):
    """Update incident details"""
    update_fields = []
    params = []
    param_idx = 1
    
    if update.title is not None:
        update_fields.append(f"title = ${param_idx}")
        params.append(update.title)
        param_idx += 1
    
    if update.description is not None:
        update_fields.append(f"description = ${param_idx}")
        params.append(update.description)
        param_idx += 1
    
    if update.severity is not None:
        update_fields.append(f"severity = ${param_idx}")
        params.append(update.severity.value)
        param_idx += 1
    
    if update.status is not None:
        update_fields.append(f"status = ${param_idx}")
        params.append(update.status.value)
        param_idx += 1
    
    if not update_fields:
        raise HTTPException(status_code=400, detail="No fields to update")
    
    update_fields.append("updated_at = NOW()")
    params.append(incident_id)
    
    query = f"""
        UPDATE incidents 
        SET {', '.join(update_fields)}
        WHERE id = ${param_idx}
        RETURNING *
    """
    
    row = await db.fetchrow(query, *params)
    
    if not row:
        raise HTTPException(status_code=404, detail="Incident not found")
    
    return dict(row)


@router.post("/incidents/{incident_id}/acknowledge")
async def acknowledge_incident_endpoint(incident_id: str, db=Depends(get_db)):
    """Acknowledge an incident"""
    result = await acknowledge_incident(db, incident_id)
    return result


@router.post("/incidents/{incident_id}/resolve")
async def resolve_incident_endpoint(
    incident_id: str,
    resolution_note: Optional[str] = None,
    db=Depends(get_db)
):
    """Resolve an incident"""
    result = await resolve_incident(db, incident_id, resolution_note)
    return result


@router.post("/incidents/{incident_id}/events")
async def add_event(
    incident_id: str,
    event: IncidentEventCreate,
    db=Depends(get_db)
):
    """Add an event to incident timeline"""
    result = await add_incident_event(
        db,
        incident_id,
        event.event_type,
        event.message
    )
    return result


@router.get("/incidents/{incident_id}/correlate")
async def correlate_incident_endpoint(incident_id: str, db=Depends(get_db)):
    """Get correlated metrics and logs for an incident"""
    incident = await db.fetchrow(
        "SELECT * FROM incidents WHERE id = $1",
        incident_id
    )
    
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")
    
    correlation = await correlate_incident(dict(incident))
    return correlation


@router.get("/incidents/stats/summary")
async def get_incident_stats(
    days: int = Query(30, le=90),
    db=Depends(get_db)
):
    """Get incident statistics summary"""
    from datetime import timedelta
    since = datetime.utcnow() - timedelta(days=days)
    
    stats = await db.fetchrow(
        """
        SELECT 
            COUNT(*) as total,
            COUNT(*) FILTER (WHERE status = 'open') as open,
            COUNT(*) FILTER (WHERE status = 'acknowledged') as acknowledged,
            COUNT(*) FILTER (WHERE status = 'resolved') as resolved,
            COUNT(*) FILTER (WHERE severity = 'critical') as critical,
            COUNT(*) FILTER (WHERE severity = 'high') as high,
            AVG(EXTRACT(EPOCH FROM (acknowledged_at - started_at))/60) 
                FILTER (WHERE acknowledged_at IS NOT NULL) as avg_ack_time_minutes,
            AVG(EXTRACT(EPOCH FROM (resolved_at - started_at))/60) 
                FILTER (WHERE resolved_at IS NOT NULL) as avg_resolution_time_minutes
        FROM incidents
        WHERE started_at >= $1
        """,
        since
    )
    
    return dict(stats)
