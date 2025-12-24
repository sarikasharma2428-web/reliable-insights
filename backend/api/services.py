"""
Services API - Onboard and manage monitored services
"""
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from datetime import datetime

from db.database import get_db
from db.models import Service, ServiceCreate, ServiceUpdate
from monitoring.collectors import register_service, unregister_service
from utils.logger import logger

router = APIRouter()


class ServiceResponse(BaseModel):
    id: str
    name: str
    description: Optional[str]
    status: str
    cpu_usage: Optional[float]
    memory_usage: Optional[float]
    requests_per_second: Optional[float]
    error_rate: Optional[float]
    latency_p50: Optional[float]
    latency_p99: Optional[float]
    uptime: Optional[float]
    last_checked_at: Optional[datetime]
    created_at: datetime
    updated_at: datetime


@router.get("/services", response_model=List[ServiceResponse])
async def list_services(
    status: Optional[str] = Query(None, description="Filter by status"),
    db=Depends(get_db)
):
    """List all monitored services"""
    query = "SELECT * FROM services"
    params = []
    
    if status:
        query += " WHERE status = $1"
        params.append(status)
    
    query += " ORDER BY name"
    
    rows = await db.fetch(query, *params)
    return [dict(row) for row in rows]


@router.post("/services", response_model=ServiceResponse)
async def create_service(
    service: ServiceCreate,
    db=Depends(get_db)
):
    """Onboard a new service for monitoring"""
    try:
        row = await db.fetchrow(
            """
            INSERT INTO services (name, description, status)
            VALUES ($1, $2, 'unknown')
            RETURNING *
            """,
            service.name,
            service.description
        )
        
        # Register with collectors
        await register_service(dict(row))
        
        logger.info(f"Service onboarded: {service.name}")
        return dict(row)
        
    except Exception as e:
        logger.error(f"Failed to create service: {e}")
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/services/{service_id}", response_model=ServiceResponse)
async def get_service(service_id: str, db=Depends(get_db)):
    """Get service details"""
    row = await db.fetchrow(
        "SELECT * FROM services WHERE id = $1",
        service_id
    )
    
    if not row:
        raise HTTPException(status_code=404, detail="Service not found")
    
    return dict(row)


@router.put("/services/{service_id}", response_model=ServiceResponse)
async def update_service(
    service_id: str,
    service: ServiceUpdate,
    db=Depends(get_db)
):
    """Update service configuration"""
    update_fields = []
    params = []
    param_idx = 1
    
    if service.name is not None:
        update_fields.append(f"name = ${param_idx}")
        params.append(service.name)
        param_idx += 1
    
    if service.description is not None:
        update_fields.append(f"description = ${param_idx}")
        params.append(service.description)
        param_idx += 1
    
    if service.status is not None:
        update_fields.append(f"status = ${param_idx}")
        params.append(service.status)
        param_idx += 1
    
    if not update_fields:
        raise HTTPException(status_code=400, detail="No fields to update")
    
    update_fields.append("updated_at = NOW()")
    params.append(service_id)
    
    query = f"""
        UPDATE services 
        SET {', '.join(update_fields)}
        WHERE id = ${param_idx}
        RETURNING *
    """
    
    row = await db.fetchrow(query, *params)
    
    if not row:
        raise HTTPException(status_code=404, detail="Service not found")
    
    return dict(row)


@router.delete("/services/{service_id}")
async def delete_service(service_id: str, db=Depends(get_db)):
    """Remove a service from monitoring"""
    row = await db.fetchrow(
        "DELETE FROM services WHERE id = $1 RETURNING id, name",
        service_id
    )
    
    if not row:
        raise HTTPException(status_code=404, detail="Service not found")
    
    # Unregister from collectors
    await unregister_service(service_id)
    
    logger.info(f"Service removed: {row['name']}")
    return {"message": f"Service {row['name']} deleted"}


@router.post("/services/{service_id}/health-check")
async def trigger_health_check(service_id: str, db=Depends(get_db)):
    """Manually trigger a health check for a service"""
    from monitoring.collectors import check_service_health
    
    row = await db.fetchrow(
        "SELECT * FROM services WHERE id = $1",
        service_id
    )
    
    if not row:
        raise HTTPException(status_code=404, detail="Service not found")
    
    result = await check_service_health(dict(row))
    return result
