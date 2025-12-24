"""
Incident Lifecycle - Create, acknowledge, resolve incidents
"""
from typing import Dict, Any, Optional, List
from datetime import datetime
import uuid

from utils.logger import logger


async def create_incident(
    conn,
    title: str,
    description: Optional[str] = None,
    severity: str = "medium",
    service_id: Optional[str] = None,
    triggered_by: Optional[str] = None,
    created_by: Optional[str] = None
) -> Dict[str, Any]:
    """
    Create a new incident
    
    Args:
        conn: Database connection
        title: Incident title
        description: Incident description
        severity: critical, high, medium, low
        service_id: Associated service ID
        triggered_by: What triggered the incident (alert, manual, etc.)
        created_by: User ID who created (for manual incidents)
        
    Returns:
        The created incident
    """
    # Generate incident number
    count = await conn.fetchval("SELECT COUNT(*) FROM incidents")
    incident_number = f"INC-{count + 1:05d}"
    
    row = await conn.fetchrow(
        """
        INSERT INTO incidents (
            incident_number, title, description, severity, status,
            service_id, triggered_by, created_by, started_at
        )
        VALUES ($1, $2, $3, $4, 'open', $5, $6, $7, NOW())
        RETURNING *
        """,
        incident_number,
        title,
        description,
        severity,
        service_id,
        triggered_by,
        created_by
    )
    
    incident = dict(row)
    
    # Add creation event
    await add_incident_event(
        conn,
        incident["id"],
        "created",
        f"Incident created: {title}"
    )
    
    logger.info(f"Incident created: {incident_number} - {title}")
    return incident


async def acknowledge_incident(
    conn,
    incident_id: str,
    acknowledged_by: Optional[str] = None
) -> Dict[str, Any]:
    """
    Acknowledge an incident
    
    Args:
        conn: Database connection
        incident_id: Incident ID
        acknowledged_by: User ID who acknowledged
        
    Returns:
        Updated incident
    """
    row = await conn.fetchrow(
        """
        UPDATE incidents SET
            status = 'acknowledged',
            acknowledged_at = NOW(),
            updated_at = NOW()
        WHERE id = $1 AND status = 'open'
        RETURNING *
        """,
        incident_id
    )
    
    if not row:
        raise ValueError("Incident not found or already acknowledged")
    
    incident = dict(row)
    
    # Add acknowledgment event
    await add_incident_event(
        conn,
        incident_id,
        "acknowledged",
        f"Incident acknowledged by {acknowledged_by or 'system'}"
    )
    
    logger.info(f"Incident acknowledged: {incident['incident_number']}")
    return incident


async def start_investigation(
    conn,
    incident_id: str,
    investigator: Optional[str] = None
) -> Dict[str, Any]:
    """Start investigating an incident"""
    row = await conn.fetchrow(
        """
        UPDATE incidents SET
            status = 'investigating',
            updated_at = NOW()
        WHERE id = $1 AND status IN ('open', 'acknowledged')
        RETURNING *
        """,
        incident_id
    )
    
    if not row:
        raise ValueError("Incident not found or cannot be investigated")
    
    incident = dict(row)
    
    await add_incident_event(
        conn,
        incident_id,
        "investigating",
        f"Investigation started by {investigator or 'system'}"
    )
    
    return incident


async def resolve_incident(
    conn,
    incident_id: str,
    resolution_note: Optional[str] = None,
    resolved_by: Optional[str] = None
) -> Dict[str, Any]:
    """
    Resolve an incident
    
    Args:
        conn: Database connection
        incident_id: Incident ID
        resolution_note: Optional resolution description
        resolved_by: User ID who resolved
        
    Returns:
        Updated incident
    """
    row = await conn.fetchrow(
        """
        UPDATE incidents SET
            status = 'resolved',
            resolved_at = NOW(),
            updated_at = NOW()
        WHERE id = $1 AND status != 'resolved'
        RETURNING *
        """,
        incident_id
    )
    
    if not row:
        raise ValueError("Incident not found or already resolved")
    
    incident = dict(row)
    
    # Add resolution event
    message = "Incident resolved"
    if resolution_note:
        message += f": {resolution_note}"
    if resolved_by:
        message += f" by {resolved_by}"
    
    await add_incident_event(
        conn,
        incident_id,
        "resolved",
        message
    )
    
    # Calculate metrics
    if incident["started_at"]:
        duration = datetime.utcnow() - incident["started_at"]
        logger.info(
            f"Incident resolved: {incident['incident_number']} "
            f"(duration: {duration})"
        )
    
    return incident


async def reopen_incident(
    conn,
    incident_id: str,
    reason: Optional[str] = None
) -> Dict[str, Any]:
    """Reopen a resolved incident"""
    row = await conn.fetchrow(
        """
        UPDATE incidents SET
            status = 'open',
            resolved_at = NULL,
            updated_at = NOW()
        WHERE id = $1 AND status = 'resolved'
        RETURNING *
        """,
        incident_id
    )
    
    if not row:
        raise ValueError("Incident not found or not resolved")
    
    incident = dict(row)
    
    await add_incident_event(
        conn,
        incident_id,
        "reopened",
        f"Incident reopened: {reason or 'No reason provided'}"
    )
    
    return incident


async def add_incident_event(
    conn,
    incident_id: str,
    event_type: str,
    message: str,
    author_id: Optional[str] = None
) -> Dict[str, Any]:
    """
    Add an event to incident timeline
    
    Args:
        conn: Database connection
        incident_id: Incident ID
        event_type: Type of event (created, acknowledged, update, resolved, etc.)
        message: Event message
        author_id: User ID who created the event
        
    Returns:
        The created event
    """
    row = await conn.fetchrow(
        """
        INSERT INTO incident_events (
            incident_id, event_type, message, author_id
        )
        VALUES ($1, $2, $3, $4)
        RETURNING *
        """,
        incident_id,
        event_type,
        message,
        author_id
    )
    
    return dict(row)


async def get_open_incidents(conn, service_id: Optional[str] = None) -> List[Dict[str, Any]]:
    """Get all open incidents"""
    if service_id:
        rows = await conn.fetch(
            """
            SELECT * FROM incidents 
            WHERE status IN ('open', 'acknowledged', 'investigating')
            AND service_id = $1
            ORDER BY 
                CASE severity 
                    WHEN 'critical' THEN 1 
                    WHEN 'high' THEN 2 
                    WHEN 'medium' THEN 3 
                    ELSE 4 
                END,
                started_at DESC
            """,
            service_id
        )
    else:
        rows = await conn.fetch(
            """
            SELECT * FROM incidents 
            WHERE status IN ('open', 'acknowledged', 'investigating')
            ORDER BY 
                CASE severity 
                    WHEN 'critical' THEN 1 
                    WHEN 'high' THEN 2 
                    WHEN 'medium' THEN 3 
                    ELSE 4 
                END,
                started_at DESC
            """
        )
    
    return [dict(row) for row in rows]


async def get_incident_timeline(conn, incident_id: str) -> List[Dict[str, Any]]:
    """Get full timeline for an incident"""
    rows = await conn.fetch(
        """
        SELECT * FROM incident_events 
        WHERE incident_id = $1 
        ORDER BY created_at ASC
        """,
        incident_id
    )
    
    return [dict(row) for row in rows]


async def get_incident_metrics(conn, days: int = 30) -> Dict[str, Any]:
    """Get incident metrics for analysis"""
    from datetime import timedelta
    
    since = datetime.utcnow() - timedelta(days=days)
    
    stats = await conn.fetchrow(
        """
        SELECT 
            COUNT(*) as total_incidents,
            COUNT(*) FILTER (WHERE severity = 'critical') as critical_count,
            COUNT(*) FILTER (WHERE severity = 'high') as high_count,
            AVG(EXTRACT(EPOCH FROM (acknowledged_at - started_at))/60) 
                FILTER (WHERE acknowledged_at IS NOT NULL) as avg_time_to_ack_minutes,
            AVG(EXTRACT(EPOCH FROM (resolved_at - started_at))/60) 
                FILTER (WHERE resolved_at IS NOT NULL) as avg_time_to_resolve_minutes,
            COUNT(*) FILTER (WHERE status = 'resolved') as resolved_count
        FROM incidents
        WHERE started_at >= $1
        """,
        since
    )
    
    total = stats["total_incidents"] or 1
    
    return {
        "period_days": days,
        "total_incidents": stats["total_incidents"],
        "critical_count": stats["critical_count"],
        "high_count": stats["high_count"],
        "resolved_count": stats["resolved_count"],
        "resolution_rate": (stats["resolved_count"] / total) * 100,
        "avg_time_to_acknowledge_minutes": round(stats["avg_time_to_ack_minutes"] or 0, 1),
        "avg_time_to_resolve_minutes": round(stats["avg_time_to_resolve_minutes"] or 0, 1)
    }
