"""
Health check and system status endpoints
"""
from fastapi import APIRouter, status
from pydantic import BaseModel
from datetime import datetime
from app.core.config import settings
import sys
import os

router = APIRouter()


class HealthResponse(BaseModel):
    status: str
    timestamp: datetime
    environment: str
    version: str
    python_version: str
    sumo_configured: bool


class DetailedHealthResponse(HealthResponse):
    services: dict


@router.get("/", response_model=HealthResponse, status_code=status.HTTP_200_OK)
async def health_check():
    """
    Basic health check endpoint
    Returns service status and basic configuration
    """
    return HealthResponse(
        status="healthy",
        timestamp=datetime.utcnow(),
        environment=settings.ENVIRONMENT,
        version="1.0.0",
        python_version=f"{sys.version_info.major}.{sys.version_info.minor}.{sys.version_info.minor}",
        sumo_configured=settings.SUMO_HOME is not None and os.path.exists(settings.SUMO_HOME) if settings.SUMO_HOME else False
    )


@router.get("/detailed", response_model=DetailedHealthResponse, status_code=status.HTTP_200_OK)
async def detailed_health_check():
    """
    Detailed health check with service status
    """
    services = {
        "sumo": {
            "configured": settings.SUMO_HOME is not None,
            "home_path": settings.SUMO_HOME,
            "binary": settings.SUMO_BINARY
        },
        "models": {
            "storage_path": settings.MODEL_STORAGE_PATH,
            "checkpoint_path": settings.CHECKPOINT_PATH
        },
        "database": {
            "uri": settings.MONGODB_URI.split("@")[-1] if "@" in settings.MONGODB_URI else "localhost"
        }
    }
    
    return DetailedHealthResponse(
        status="healthy",
        timestamp=datetime.utcnow(),
        environment=settings.ENVIRONMENT,
        version="1.0.0",
        python_version=f"{sys.version_info.major}.{sys.version_info.minor}.{sys.version_info.minor}",
        sumo_configured=settings.SUMO_HOME is not None and os.path.exists(settings.SUMO_HOME) if settings.SUMO_HOME else False,
        services=services
    )
