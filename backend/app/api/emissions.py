"""
Emissions Estimation Router — /api/v1/emissions/estimate
"""

from fastapi import APIRouter
from backend.app.schemas.domain import (
    EstimateEmissionsRequest,
    EstimateEmissionsResponse,
)
from backend.app.core.emissions import calculate_segment_emissions

router = APIRouter()


@router.post("/estimate", response_model=EstimateEmissionsResponse)
def estimate_emissions(req: EstimateEmissionsRequest):
    """
    Computes segment fuel and CO2 emissions using pure shared model.
    Used by front-end "How we calculated this" explainability panel.
    """
    res = calculate_segment_emissions(
        distance_km=req.distance_km,
        load_factor=req.load_factor,
        congestion_index=req.congestion_index,
        vehicle_type=req.vehicle_type,
    )
    return res
