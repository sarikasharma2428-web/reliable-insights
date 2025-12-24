"""
Alerts API - Manage alert rules and active alerts
"""
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from datetime import datetime
from enum import Enum

from db.database import get_db
from alerts.rules import get_alert_rules, create_alert_rule, update_alert_rule, delete_alert_rule
from utils.logger import logger

router = APIRouter()


class AlertSeverity(str, Enum):
    critical = "critical"
    warning = "warning"
    info = "info"


class AlertRuleCreate(BaseModel):
    name: str
    metric_name: str
    threshold: float
    comparison: str  # gt, lt, gte, lte, eq
    severity: AlertSeverity
    service_id: Optional[str]
    for_duration: Optional[str] = "5m"  # Duration before firing


class AlertRuleUpdate(BaseModel):
    name: Optional[str]
    threshold: Optional[float]
    comparison: Optional[str]
    severity: Optional[AlertSeverity]
    enabled: Optional[bool]
    for_duration: Optional[str]


@router.get("/alerts")
async def list_alerts(
    severity: Optional[AlertSeverity] = Query(None),
    service_id: Optional[str] = Query(None),
    acknowledged: Optional[bool] = Query(None),
    silenced: Optional[bool] = Query(None),
    limit: int = Query(100, le=500),
    db=Depends(get_db)
):
    """List active alerts"""
    query = "SELECT * FROM alerts WHERE 1=1"
    params = []
    param_idx = 1
    
    if severity:
        query += f" AND severity = ${param_idx}"
        params.append(severity.value)
        param_idx += 1
    
    if service_id:
        query += f" AND service_id = ${param_idx}"
        params.append(service_id)
        param_idx += 1
    
    if acknowledged is not None:
        if acknowledged:
            query += " AND acknowledged_at IS NOT NULL"
        else:
            query += " AND acknowledged_at IS NULL"
    
    if silenced is not None:
        if silenced:
            query += " AND silenced_until > NOW()"
        else:
            query += " AND (silenced_until IS NULL OR silenced_until <= NOW())"
    
    query += f" ORDER BY fired_at DESC LIMIT ${param_idx}"
    params.append(limit)
    
    rows = await db.fetch(query, *params)
    return [dict(row) for row in rows]


@router.get("/alerts/{alert_id}")
async def get_alert(alert_id: str, db=Depends(get_db)):
    """Get alert details"""
    row = await db.fetchrow(
        "SELECT * FROM alerts WHERE id = $1",
        alert_id
    )
    
    if not row:
        raise HTTPException(status_code=404, detail="Alert not found")
    
    return dict(row)


@router.post("/alerts/{alert_id}/acknowledge")
async def acknowledge_alert(alert_id: str, db=Depends(get_db)):
    """Acknowledge an alert"""
    row = await db.fetchrow(
        """
        UPDATE alerts 
        SET acknowledged_at = NOW()
        WHERE id = $1 AND acknowledged_at IS NULL
        RETURNING *
        """,
        alert_id
    )
    
    if not row:
        raise HTTPException(status_code=404, detail="Alert not found or already acknowledged")
    
    logger.info(f"Alert acknowledged: {row['name']}")
    return dict(row)


@router.post("/alerts/{alert_id}/silence")
async def silence_alert(
    alert_id: str,
    duration_minutes: int = Query(60, ge=5, le=1440),
    db=Depends(get_db)
):
    """Silence an alert for a duration"""
    from datetime import timedelta
    
    silenced_until = datetime.utcnow() + timedelta(minutes=duration_minutes)
    
    row = await db.fetchrow(
        """
        UPDATE alerts 
        SET silenced_until = $2
        WHERE id = $1
        RETURNING *
        """,
        alert_id,
        silenced_until
    )
    
    if not row:
        raise HTTPException(status_code=404, detail="Alert not found")
    
    logger.info(f"Alert silenced until {silenced_until}: {row['name']}")
    return dict(row)


@router.delete("/alerts/{alert_id}")
async def resolve_alert(alert_id: str, db=Depends(get_db)):
    """Resolve/dismiss an alert"""
    row = await db.fetchrow(
        "DELETE FROM alerts WHERE id = $1 RETURNING id, name",
        alert_id
    )
    
    if not row:
        raise HTTPException(status_code=404, detail="Alert not found")
    
    logger.info(f"Alert resolved: {row['name']}")
    return {"message": f"Alert {row['name']} resolved"}


# Alert Rules endpoints

@router.get("/alert-rules")
async def list_alert_rules():
    """List all alert rules"""
    rules = await get_alert_rules()
    return rules


@router.post("/alert-rules")
async def create_rule(rule: AlertRuleCreate):
    """Create a new alert rule"""
    result = await create_alert_rule(
        name=rule.name,
        metric_name=rule.metric_name,
        threshold=rule.threshold,
        comparison=rule.comparison,
        severity=rule.severity.value,
        service_id=rule.service_id,
        for_duration=rule.for_duration
    )
    
    logger.info(f"Alert rule created: {rule.name}")
    return result


@router.put("/alert-rules/{rule_id}")
async def update_rule(rule_id: str, rule: AlertRuleUpdate):
    """Update an alert rule"""
    result = await update_alert_rule(rule_id, rule.dict(exclude_none=True))
    
    if not result:
        raise HTTPException(status_code=404, detail="Alert rule not found")
    
    return result


@router.delete("/alert-rules/{rule_id}")
async def delete_rule(rule_id: str):
    """Delete an alert rule"""
    result = await delete_alert_rule(rule_id)
    
    if not result:
        raise HTTPException(status_code=404, detail="Alert rule not found")
    
    return {"message": "Alert rule deleted"}


@router.get("/alerts/stats/summary")
async def get_alert_stats(
    hours: int = Query(24, le=168),
    db=Depends(get_db)
):
    """Get alert statistics"""
    from datetime import timedelta
    since = datetime.utcnow() - timedelta(hours=hours)
    
    stats = await db.fetchrow(
        """
        SELECT 
            COUNT(*) as total,
            COUNT(*) FILTER (WHERE severity = 'critical') as critical,
            COUNT(*) FILTER (WHERE severity = 'warning') as warning,
            COUNT(*) FILTER (WHERE acknowledged_at IS NOT NULL) as acknowledged,
            COUNT(*) FILTER (WHERE silenced_until > NOW()) as silenced
        FROM alerts
        WHERE fired_at >= $1
        """,
        since
    )
    
    return dict(stats)
