from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict
from app.models.vehicle import FuelType

class EmissionFactorBase(BaseModel):
    fuel_type: FuelType
    kg_co2_per_unit: float = Field(..., ge=0.0, description="CO2 emission factor per unit must be non-negative")
    unit: str

class EmissionFactorCreate(EmissionFactorBase):
    pass

class EmissionFactorResponse(EmissionFactorBase):
    id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
