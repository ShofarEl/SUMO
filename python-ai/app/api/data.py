"""
Data processing API endpoints
"""
from fastapi import APIRouter

router = APIRouter()


@router.get("/")
async def data_info():
    """Get data processing service information"""
    return {
        "service": "Data Processing",
        "status": "ready",
        "message": "Data processing endpoints will be implemented in future tasks"
    }
