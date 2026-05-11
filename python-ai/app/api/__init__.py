"""
API routers
"""
from app.api.health import router as health_router
from app.api.sumo import router as sumo_router
from app.api.ml import router as ml_router
from app.api.rl import router as rl_router
from app.api.data import router as data_router

__all__ = [
    "health_router",
    "sumo_router",
    "ml_router",
    "rl_router",
    "data_router"
]
