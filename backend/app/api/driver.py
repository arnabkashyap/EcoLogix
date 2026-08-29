from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Dict, Any, Optional

router = APIRouter()

# Default in-memory profile state (can be backed by Driver table in models.py)
DRIVER_PROFILE = {
    "id": "DRV-001",
    "name": "John Doe",
    "phone": "+91 98765 43210",
    "license_class": "Class 1 Heavy Vehicle",
    "status": "online",
    "home_city": "Guwahati",
    "home_address": "Betkuchi ISBT Freight Terminal, Guwahati, Assam",
    "home_lat": 26.1214,
    "home_lng": 91.7319,
    "assigned_vehicle": "NW Tata Signa Heavy Diesel #101",
    "completed_trips": 124,
    "co2_saved_kg": 1402.0,
}


class DriverProfileUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    home_city: Optional[str] = None
    home_address: Optional[str] = None
    home_lat: Optional[float] = None
    home_lng: Optional[float] = None


@router.get("/profile")
def get_driver_profile() -> Dict[str, Any]:
    """Retrieve driver personal details and home base location."""
    return DRIVER_PROFILE


@router.patch("/profile")
def update_driver_profile(payload: DriverProfileUpdate) -> Dict[str, Any]:
    """Update driver personal details and home base location."""
    update_data = payload.model_dump(exclude_unset=True)
    DRIVER_PROFILE.update(update_data)
    return {
        "message": "Driver profile updated successfully",
        "profile": DRIVER_PROFILE,
    }


@router.put("/profile")
def put_driver_profile(payload: DriverProfileUpdate) -> Dict[str, Any]:
    """Full update driver personal details and home base location."""
    return update_driver_profile(payload)


@router.get("/status")
def get_driver_status() -> Dict[str, Any]:
    """Stub endpoint for driver status"""
    return {
        "status": DRIVER_PROFILE.get("status", "online"),
        "current_vehicle": "V-7742",
        "available_for_pooling": True,
        "live_lat": DRIVER_PROFILE.get("home_lat", 26.1214),
        "live_lng": DRIVER_PROFILE.get("home_lng", 91.7319),
    }


@router.get("/trips")
def get_driver_trips() -> Dict[str, Any]:
    """Stub endpoint for driver trips"""
    return {
        "active_trip": None,
        "upcoming_trips": [],
        "completed_trips": DRIVER_PROFILE.get("completed_trips", 124),
    }


@router.get("/alerts")
def get_driver_alerts() -> Dict[str, Any]:
    """Stub endpoint for driver alerts"""
    return {
        "alerts": [
            {"id": 1, "type": "info", "message": "New empty-return pooling opportunity available."}
        ]
    }
