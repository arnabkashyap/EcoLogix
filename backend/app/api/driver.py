from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Dict, Any, Optional, List

router = APIRouter()

# Default in-memory profile state
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

# Live-updating Driver Telemetry & Flow State
DRIVER_STATE = {
    "status": "online",
    "active_step": "DETAILS",
    "step_index": 0,
    "vehicle_id": "veh-nw-101",
    "current_vehicle": "NW Tata Signa Heavy Diesel #101",
    "available_for_pooling": True,
    "live_lat": 26.1214,
    "live_lng": 91.7319,
    "active_trip": {
        "trip_id": "DRV-8821",
        "origin": "Betkuchi ISBT Freight Terminal",
        "destination": "ICD Amingaon Container Depot",
        "distance": "84.5 km",
        "time": "118.0 min",
        "vehicle": "NW Tata Signa Heavy Diesel #101",
        "cargo": "12,500 kg",
        "co2": "72.4 kg",
        "baseline_co2": "88.6 kg",
        "co2_saved_pct": 18.3,
    },
    "backhaul_offer": {
        "match_id": "match-rt-01",
        "origin": "ICD Amingaon Container Depot",
        "destination": "Betkuchi ISBT Freight Terminal",
        "shipment_weight_kg": 400.0,
        "detour_distance_km": 6.0,
        "co2_saved_kg": 14.2,
        "carrier_b_name": "GreenFreight Logistics",
        "accepted": False,
    },
    "hazard_alerts": [
        {
            "id": 1,
            "type": "warning",
            "title": "Saraighat Bridge Monsoon Flooding Risk",
            "message": "Corridor has elevated monsoon flood risk advisory. Drive slow — max 45 km/h.",
            "location": "Saraighat Bridge Pass",
            "co2_impact": "+15% fuel penalty",
        },
        {
            "id": 2,
            "type": "info",
            "title": "Empty Return Load Match Opportunity",
            "message": "400 kg backhaul cargo available from ICD Amingaon to Betkuchi Terminal.",
            "location": "ICD Amingaon Container Depot",
            "co2_impact": "Save 14.2 kg CO₂",
        },
    ],
}


class DriverProfileUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    home_city: Optional[str] = None
    home_address: Optional[str] = None
    home_lat: Optional[float] = None
    home_lng: Optional[float] = None


class DriverStatusUpdate(BaseModel):
    status: Optional[str] = None
    active_step: Optional[str] = None
    step_index: Optional[int] = None
    live_lat: Optional[float] = None
    live_lng: Optional[float] = None


class AcceptReturnPayload(BaseModel):
    match_id: Optional[str] = None


@router.get("/profile")
def get_driver_profile() -> Dict[str, Any]:
    """Retrieve driver personal details and home base location."""
    return DRIVER_PROFILE


@router.patch("/profile")
def update_driver_profile(payload: DriverProfileUpdate) -> Dict[str, Any]:
    """Update driver personal details and home base location."""
    update_data = payload.model_dump(exclude_unset=True)
    DRIVER_PROFILE.update(update_data)
    DRIVER_STATE["live_lat"] = DRIVER_PROFILE.get("home_lat", 26.1214)
    DRIVER_STATE["live_lng"] = DRIVER_PROFILE.get("home_lng", 91.7319)
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
    """Retrieve live driver telemetry status, active step, and backhaul state."""
    return {
        "status": DRIVER_STATE["status"],
        "active_step": DRIVER_STATE["active_step"],
        "step_index": DRIVER_STATE["step_index"],
        "vehicle_id": DRIVER_STATE["vehicle_id"],
        "current_vehicle": DRIVER_STATE["current_vehicle"],
        "available_for_pooling": DRIVER_STATE["available_for_pooling"],
        "live_lat": DRIVER_STATE["live_lat"],
        "live_lng": DRIVER_STATE["live_lng"],
        "active_trip": DRIVER_STATE["active_trip"],
        "backhaul_offer": DRIVER_STATE["backhaul_offer"],
        "hazard_alerts": DRIVER_STATE["hazard_alerts"],
    }


@router.post("/status")
def update_driver_status(payload: DriverStatusUpdate) -> Dict[str, Any]:
    """Persist driver status and step transitions."""
    if payload.status is not None:
        DRIVER_STATE["status"] = payload.status
    if payload.active_step is not None:
        DRIVER_STATE["active_step"] = payload.active_step
    if payload.step_index is not None:
        DRIVER_STATE["step_index"] = payload.step_index
    if payload.live_lat is not None:
        DRIVER_STATE["live_lat"] = payload.live_lat
    if payload.live_lng is not None:
        DRIVER_STATE["live_lng"] = payload.live_lng

    return {
        "message": "Driver status updated successfully",
        "status": get_driver_status(),
    }


@router.post("/accept-return")
def accept_driver_return(payload: Optional[AcceptReturnPayload] = None) -> Dict[str, Any]:
    """1-Click Backhaul Load Acceptance endpoint for active driver trip."""
    match_id = payload.match_id if payload else "match-rt-01"
    
    offer = DRIVER_STATE["backhaul_offer"]
    offer["accepted"] = True
    
    active_trip = DRIVER_STATE["active_trip"]
    active_trip["return_load_accepted"] = True
    active_trip["cargo"] = "12,900 kg (+400 kg backhaul)"
    active_trip["co2_saved_kg"] = 14.2
    active_trip["return_match"] = {
        "match_id": match_id,
        "origin": offer["origin"],
        "destination": offer["destination"],
        "weight_kg": offer["shipment_weight_kg"],
        "co2_saved_kg": offer["co2_saved_kg"],
        "partner": offer["carrier_b_name"],
    }

    return {
        "success": True,
        "message": f"Backhaul match '{match_id}' accepted successfully! CO2 saved.",
        "backhaul_offer": offer,
        "active_trip": active_trip,
    }


@router.get("/trips")
def get_driver_trips() -> Dict[str, Any]:
    """Retrieve active and historical driver trips."""
    return {
        "active_trip": DRIVER_STATE["active_trip"],
        "upcoming_trips": [],
        "completed_trips": DRIVER_PROFILE.get("completed_trips", 124),
    }


@router.get("/alerts")
def get_driver_alerts() -> Dict[str, Any]:
    """Retrieve live hazard and backhaul alerts."""
    return {
        "alerts": DRIVER_STATE["hazard_alerts"]
    }
