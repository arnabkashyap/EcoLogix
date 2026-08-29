from typing import List, Optional, Union
from pydantic import BaseModel, Field, field_validator

class LocationPoint(BaseModel):
    name: str
    lat: float
    lng: float

class RouteStop(BaseModel):
    sequence: int
    type: str  # DEPOT, PICKUP, DELIVERY
    shipment_id: Optional[int] = None
    location_name: str
    latitude: float
    longitude: float
    arrival_time_min: float = 0.0
    load_after_stop_kg: float = 0.0

class RouteSummary(BaseModel):
    stops: List[RouteStop]
    total_distance_km: float
    total_time_min: float
    total_fuel_l: float
    total_co2_kg: float
    route_type: Optional[str] = "BASELINE"
    route_id: Optional[int] = None

class RouteComparison(BaseModel):
    distance_difference_km: float
    time_difference_min: float
    fuel_saved_l: float
    co2_saved_kg: float
    co2_reduction_percentage: float

class OptimizationRequest(BaseModel):
    vehicle_id: Union[int, str]
    shipment_ids: List[Union[int, str]]
    alpha: float = Field(default=0.5, ge=0.0, le=1.0)

    @field_validator("vehicle_id")
    def parse_vehicle_id(cls, v):
        try:
            return int(v)
        except (ValueError, TypeError):
            raise ValueError("vehicle_id must be an integer or integer string")

    @field_validator("shipment_ids")
    def parse_shipment_ids(cls, v):
        parsed = []
        for item in v:
            try:
                parsed.append(int(item))
            except (ValueError, TypeError):
                raise ValueError(f"Shipment ID '{item}' must be an integer or integer string")
        return parsed

class OptimizationResponse(BaseModel):
    vehicle_id: int
    alpha: float
    baseline: RouteSummary
    optimized: RouteSummary
    comparison: RouteComparison
    baseline_route_id: Optional[int] = None
    optimized_route_id: Optional[int] = None

class ParetoRequest(BaseModel):
    vehicle_id: Union[int, str]
    shipment_ids: List[Union[int, str]]

    @field_validator("vehicle_id")
    def parse_vehicle_id(cls, v):
        try:
            return int(v)
        except (ValueError, TypeError):
            raise ValueError("vehicle_id must be an integer or integer string")

    @field_validator("shipment_ids")
    def parse_shipment_ids(cls, v):
        parsed = []
        for item in v:
            try:
                parsed.append(int(item))
            except (ValueError, TypeError):
                raise ValueError(f"Shipment ID '{item}' must be an integer or integer string")
        return parsed

class ParetoRouteOption(BaseModel):
    route_type: str  # FASTEST, BALANCED, GREENEST
    alpha: float
    stops: List[RouteStop]
    total_distance_km: float
    total_time_min: float
    total_fuel_l: float
    total_co2_kg: float
    comparison: RouteComparison
    route_id: Optional[int] = None
    is_pareto_optimal: bool = True

class ParetoResponse(BaseModel):
    vehicle_id: int
    baseline: RouteSummary
    routes: List[ParetoRouteOption]
    pareto_frontier: Optional[List[ParetoRouteOption]] = None
