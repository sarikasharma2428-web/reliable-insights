"""
Health check API endpoints
"""
from fastapi import APIRouter, Depends
from datetime import datetime

from db.database import get_db
from monitoring.prometheus import check_prometheus_health
from monitoring.loki import check_loki_health
from utils.logger import logger

router = APIRouter()


@router.get("/health")
async def health_check():
    """Basic health check endpoint"""
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "service": "sre-observability-platform"
    }


@router.get("/health/detailed")
async def detailed_health_check(db=Depends(get_db)):
    """Detailed health check including all dependencies"""
    checks = {
        "api": {"status": "healthy"},
        "database": {"status": "unknown"},
        "prometheus": {"status": "unknown"},
        "loki": {"status": "unknown"}
    }
    
    # Check database
    try:
        await db.execute("SELECT 1")
        checks["database"]["status"] = "healthy"
    except Exception as e:
        checks["database"]["status"] = "unhealthy"
        checks["database"]["error"] = str(e)
        logger.error(f"Database health check failed: {e}")
    
    # Check Prometheus
    try:
        prom_healthy = await check_prometheus_health()
        checks["prometheus"]["status"] = "healthy" if prom_healthy else "unhealthy"
    except Exception as e:
        checks["prometheus"]["status"] = "unhealthy"
        checks["prometheus"]["error"] = str(e)
        logger.error(f"Prometheus health check failed: {e}")
    
    # Check Loki
    try:
        loki_healthy = await check_loki_health()
        checks["loki"]["status"] = "healthy" if loki_healthy else "unhealthy"
    except Exception as e:
        checks["loki"]["status"] = "unhealthy"
        checks["loki"]["error"] = str(e)
        logger.error(f"Loki health check failed: {e}")
    
    # Overall status
    all_healthy = all(c["status"] == "healthy" for c in checks.values())
    
    return {
        "status": "healthy" if all_healthy else "degraded",
        "timestamp": datetime.utcnow().isoformat(),
        "checks": checks
    }


@router.get("/ready")
async def readiness_check(db=Depends(get_db)):
    """Kubernetes readiness probe endpoint"""
    try:
        await db.execute("SELECT 1")
        return {"ready": True}
    except Exception:
        return {"ready": False}


@router.get("/live")
async def liveness_check():
    """Kubernetes liveness probe endpoint"""
    return {"alive": True}
