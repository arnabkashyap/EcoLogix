from fastapi import APIRouter
from typing import Dict, Any

router = APIRouter()

@router.get("/status")
def get_driver_status() -> Dict[str, Any]:
    """Stub endpoint for driver status"""
    return {
        "status": "online",
        "current_vehicle": "V-7742",
        "available_for_pooling": True
    }

@router.get("/trips")
def get_driver_trips() -> Dict[str, Any]:
    """Stub endpoint for driver trips"""
    return {
        "active_trip": None,
        "upcoming_trips": [],
        "completed_trips": 12
    }

@router.get("/alerts")
def get_driver_alerts() -> Dict[str, Any]:
    """Stub endpoint for driver alerts"""
    return {
        "alerts": [
            {"id": 1, "type": "info", "message": "New empty-return pooling opportunity available."}
        ]
    }
