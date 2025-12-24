"""
SRE Observability Platform - FastAPI Entrypoint
"""
import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api import health, services, metrics, logs, incidents, alerts
from auth.middleware import TenantMiddleware
from db.database import init_db, close_db
from monitoring.collectors import start_collectors, stop_collectors
from incidents.detector import start_incident_detector, stop_incident_detector
from alerts.evaluator import start_alert_evaluator, stop_alert_evaluator
from utils.config import settings
from utils.logger import logger


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifecycle manager"""
    logger.info("Starting SRE Observability Platform...")
    
    # Initialize database
    await init_db()
    
    # Start background tasks
    await start_collectors()
    await start_incident_detector()
    await start_alert_evaluator()
    
    logger.info("Platform started successfully")
    yield
    
    # Cleanup
    logger.info("Shutting down platform...")
    await stop_collectors()
    await stop_incident_detector()
    await stop_alert_evaluator()
    await close_db()
    logger.info("Platform shutdown complete")


app = FastAPI(
    title="SRE Observability Platform",
    description="Real-time monitoring, incident detection, and alerting platform",
    version="1.0.0",
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Tenant isolation middleware
app.add_middleware(TenantMiddleware)

# Include routers
app.include_router(health.router, tags=["Health"])
app.include_router(services.router, prefix="/api/v1", tags=["Services"])
app.include_router(metrics.router, prefix="/api/v1", tags=["Metrics"])
app.include_router(logs.router, prefix="/api/v1", tags=["Logs"])
app.include_router(incidents.router, prefix="/api/v1", tags=["Incidents"])
app.include_router(alerts.router, prefix="/api/v1", tags=["Alerts"])


@app.get("/")
async def root():
    return {
        "name": "SRE Observability Platform",
        "version": "1.0.0",
        "status": "running"
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG
    )
