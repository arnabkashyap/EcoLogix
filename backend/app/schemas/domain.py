"""
Pydantic Schemas for API Request/Response Models.
"""

from typing import List, Dict, Any, Optional
from pydantic import BaseModel


class DevLoginRequest(BaseModel):
    company: str  # "A" or "B" (or "northwind" / "apex")


class DevLoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    tenant_id: str
    company_name: str
    expires_in: int


class OptimizeRouteRequest(BaseModel):
    vehicle_id: str
    shipment_ids: List[str]
    alpha: float = 0.5  # 0.0 = greenest, 1.0 = fastest


class EstimateEmissionsRequest(BaseModel):
    vehicle_type: str = "heavy_truck"
    distance_km: float
    load_factor: float = 0.5
    congestion_index: float = 0.2


class EstimateEmissionsResponse(BaseModel):
    distance_km: float
    load_factor: float
    congestion_index: float
    vehicle_type: str
    fuel_type: str
    fuel_L: float
    energy_kwh: float
    co2_kg: float
    formula_breakdown: Dict[str, Any]


class CompareEVRequest(BaseModel):
    distance_km: float
    current_vehicle_type: Optional[str] = "heavy_truck"
    load_factor: Optional[float] = 0.5
    congestion_index: Optional[float] = 0.2
    current_co2_kg: Optional[float] = None


class CompareEVResponse(BaseModel):
    distance_km: float
    current_vehicle_type: str
    current_fuel_type: str
    current_co2_kg: float
    current_fuel_L: float
    ev_vehicle_type: str
    ev_fuel_type: str
    ev_co2_kg: float
    ev_energy_kwh: float
    co2_saved_kg: float
    co2_reduction_percentage: float
    fuel_saved_L: float
    diesel_cost_usd: float
    ev_electricity_cost_usd: float
    cost_saved_usd: float
    formula_breakdown: Dict[str, Any]
