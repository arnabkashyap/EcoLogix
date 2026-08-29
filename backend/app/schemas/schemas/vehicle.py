from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field, model_validator, ConfigDict
from app.models.vehicle import VehicleType, FuelType

class VehicleBase(BaseModel):
    provider_id: int
    vehicle_type: VehicleType
    fuel_type: FuelType
    capacity_kg: float = Field(..., gt=0, description="Vehicle capacity in kg must be greater than 0")
    fuel_efficiency_km_per_l: float = Field(..., ge=0, description="Fuel efficiency in km per litre or km per kWh")
    current_lat: float = Field(..., ge=-90.0, le=90.0, description="Latitude must be between -90 and 90")
    current_lng: float = Field(..., ge=-180.0, le=180.0, description="Longitude must be between -180 and 180")
    status: Optional[str] = "ACTIVE"

    @model_validator(mode="after")
    def validate_combustion_efficiency(self):
        if self.fuel_type in [FuelType.DIESEL, FuelType.PETROL] and self.fuel_efficiency_km_per_l <= 0:
            raise ValueError(f"Fuel efficiency for combustion vehicle ({self.fuel_type}) must be greater than 0")
        return self

class VehicleCreate(VehicleBase):
    pass

class VehicleResponse(VehicleBase):
    id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
