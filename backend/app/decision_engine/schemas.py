from typing import List, Optional, Union, Dict, Any
from pydantic import BaseModel, Field
from app.optimization.models import RouteSummary, ParetoRouteOption, RouteComparison

class RecommendationMetrics(BaseModel):
    time_difference_min: float = 0.0
    co2_saved_kg: float = 0.0
    fuel_saved_l: float = 0.0
    co2_reduction_percentage: float = 0.0

class RecommendationRequest(BaseModel):
    vehicle_id: Union[int, str] = 10
    baseline: Optional[RouteSummary] = None
    routes: Optional[List[ParetoRouteOption]] = None
    time_threshold_min: float = Field(default=25.0, description="Max acceptable additional time for GREENEST")
    co2_substance_threshold_pct: float = Field(default=15.0, description="Min CO2 reduction % to justify GREENEST")
    balanced_time_threshold_min: float = Field(default=15.0, description="Max acceptable additional time for BALANCED")
    balanced_co2_threshold_pct: float = Field(default=10.0, description="Min CO2 reduction % to justify BALANCED")

class RecommendationResponse(BaseModel):
    vehicle_id: Union[int, str]
    recommended_route: str  # FASTEST, BALANCED, GREENEST
    reason: str
    metrics: RecommendationMetrics

class FleetOpportunityItem(BaseModel):
    vehicle_id: str
    opportunity_type: str
    title: str
    description: str
    action_label: str

class FleetOpportunitiesResponse(BaseModel):
    opportunities: List[FleetOpportunityItem]
    count: int

