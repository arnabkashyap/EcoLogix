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
