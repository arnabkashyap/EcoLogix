from typing import List, Optional, Union
from pydantic import BaseModel, Field, field_validator

class ReturnRouteSummary(BaseModel):
    origin: str
    destination: str
    distance_km: float

class LoadPoolMatchRequest(BaseModel):
    vehicle_id: Union[int, str]
    shipment_ids: Optional[List[Union[int, str]]] = None

    @field_validator("vehicle_id")
    def parse_vehicle_id(cls, v):
        try:
            return int(v)
        except (ValueError, TypeError):
            raise ValueError("vehicle_id must be an integer or integer string")

    @field_validator("shipment_ids")
    def parse_shipment_ids(cls, v):
        if v is None:
            return None
        parsed = []
        for item in v:
            try:
                parsed.append(int(item))
            except (ValueError, TypeError):
                raise ValueError(f"Shipment ID '{item}' must be an integer or integer string")
        return parsed

class LoadPoolMatchItem(BaseModel):
    match_id: Optional[int] = None
    shipment_id: Union[int, str]
    shipment_pickup_name: Optional[str] = None
    shipment_destination_name: Optional[str] = None
    match_score: float
    shipment_weight_kg: float
    available_capacity_kg: float
    pickup_detour_km: float
    destination_detour_km: float
    empty_distance_km: float
    pooled_distance_km: float
    detour_distance_km: float
    co2_saved_kg: float
    fuel_saved_l: float
    cost_saved: Optional[float] = None
    status: str
    explanation: str
    is_eligible: bool = True

class LoadPoolMatchResponse(BaseModel):
    vehicle_id: Union[int, str]
    return_route: ReturnRouteSummary
    matches: List[LoadPoolMatchItem]

class MatchStatusResponse(BaseModel):
    match_id: int
    vehicle_id: int
    shipment_id: int
    status: str
    message: str
