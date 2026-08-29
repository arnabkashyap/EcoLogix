"""
Lookup API Router — Vehicle Spec & Weather Risk Lookup Endpoints.
"""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from backend.app.db.database import get_db
from backend.app.schemas.lookup import (
    VehicleLookupRequest,
    VehicleLookupResponse,
    WeatherLookupRequest,
    WeatherLookupResponse,
)
from backend.app.core.vehicle_lookup import lookup_vehicle_specs
from backend.app.core.weather_lookup import fetch_weather_risk

router = APIRouter()


@router.post("/vehicle", response_model=VehicleLookupResponse)
def lookup_vehicle(req: VehicleLookupRequest, db: Session = Depends(get_db)):
    result = lookup_vehicle_specs(db, req.vehicle_name)
    return VehicleLookupResponse(**result)


@router.post("/weather", response_model=WeatherLookupResponse)
def lookup_weather(req: WeatherLookupRequest):
    result = fetch_weather_risk(
        req.destination_lat, req.destination_lon, req.condition
    )
    return WeatherLookupResponse(**result)
