from typing import Optional
from pydantic import BaseModel, Field, ConfigDict

class EmissionEstimateRequest(BaseModel):
    vehicle_id: int = Field(..., description="Database ID of the target vehicle")
    distance_km: float = Field(..., gt=0, description="Travel distance in km must be greater than 0")
    load_kg: float = Field(..., ge=0, description="Cargo load weight in kg must be non-negative")
    congestion_index: float = Field(..., ge=0.0, le=1.0, description="Congestion index between 0.0 and 1.0")

class EmissionEstimateResponse(BaseModel):
    vehicle_id: int
    distance_km: float
    load_kg: float
    capacity_kg: float
    load_ratio: float
    fuel_type: str
    base_fuel_l: float
    load_multiplier: float
    congestion_multiplier: float
    estimated_fuel_l: float
    emission_factor_kg_co2_per_l: float
    unit: str
    estimated_co2_kg: float
    message: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

class ScenarioInput(BaseModel):
    distance_km: float = Field(..., gt=0, description="Distance in km must be greater than 0")
    load_kg: float = Field(..., ge=0, description="Cargo load weight in kg must be non-negative")
    congestion_index: float = Field(..., ge=0.0, le=1.0, description="Congestion index between 0.0 and 1.0")

class EmissionCompareRequest(BaseModel):
    vehicle_id: int = Field(..., description="Database ID of the vehicle for comparison")
    baseline: ScenarioInput
    optimized: ScenarioInput

class EmissionCompareResponse(BaseModel):
    vehicle_id: int
    baseline: EmissionEstimateResponse
    optimized: EmissionEstimateResponse
    fuel_saved_l: float
    co2_saved_kg: float
    co2_reduction_percentage: float

    model_config = ConfigDict(from_attributes=True)
