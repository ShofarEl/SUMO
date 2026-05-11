from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException
from app.core.config import settings
from app.core.logging import logger
from app.core.middleware import (
    log_requests,
    validation_exception_handler,
    http_exception_handler,
    general_exception_handler
)
from app.api import (
    health_router,
    sumo_router,
    ml_router,
    rl_router,
    data_router
)

app = FastAPI(
    title="Georgetown Traffic AI - Python Service",
    description="AI service for SUMO simulation, ML prediction, and RL training",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ENVIRONMENT == "development" and ["http://localhost:3000", "http://localhost:5000"] or ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Request logging middleware
app.middleware("http")(log_requests)

# Exception handlers
app.add_exception_handler(RequestValidationError, validation_exception_handler)
app.add_exception_handler(StarletteHTTPException, http_exception_handler)
app.add_exception_handler(Exception, general_exception_handler)


@app.on_event("startup")
async def startup_event():
    """Initialize services on startup"""
    logger.info(f"Starting Georgetown Traffic AI Python Service in {settings.ENVIRONMENT} mode")
    logger.info(f"Server running on {settings.HOST}:{settings.PORT}")
    logger.info(f"SUMO_HOME: {settings.SUMO_HOME}")
    logger.info(f"Model storage path: {settings.MODEL_STORAGE_PATH}")


@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup on shutdown"""
    logger.info("Shutting down Georgetown Traffic AI Python Service")


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "Georgetown Traffic AI - Python Service",
        "version": "1.0.0",
        "status": "running",
        "docs": "/docs",
        "health": "/health"
    }


# Include API routers
app.include_router(health_router, prefix="/health", tags=["Health"])
app.include_router(sumo_router, prefix="/api/sumo", tags=["SUMO"])
app.include_router(ml_router, prefix="/api/ml", tags=["Machine Learning"])
app.include_router(rl_router, prefix="/api/rl", tags=["Reinforcement Learning"])
app.include_router(data_router, prefix="/api/data", tags=["Data Processing"])


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.ENVIRONMENT == "development",
        log_level=settings.LOG_LEVEL.lower()
    )
