"""
Pydantic Schemas for Vehicle & Weather Lookup Endpoints.
"""

from typing import Optional
from pydantic import BaseModel


class VehicleLookupRequest(BaseModel):
    vehicle_name: str


class VehicleLookupResponse(BaseModel):
    vehicle_name: str
    capacity_kg: float
    mileage_kmpl: float
    fuel_type: str
    source: str  # 'database' | 'reference'


class WeatherLookupRequest(BaseModel):
    destination_lat: float
    destination_lon: float
    condition: Optional[str] = None


class WeatherLookupResponse(BaseModel):
    flood_risk: str  # 'low' | 'moderate' | 'high'
    wind_strength_kmh: float
    precipitation_mm: float
    weather_condition: str
    note: str
