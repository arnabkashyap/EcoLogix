"""
Emissions Estimation & EV Comparison Router — /api/v1/emissions
"""

from fastapi import APIRouter
from backend.app.schemas.domain import (
    EstimateEmissionsRequest,
    EstimateEmissionsResponse,
    CompareEVRequest,
    CompareEVResponse,
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


@router.post("/compare-ev", response_model=CompareEVResponse)
def compare_ev_scenario(req: CompareEVRequest):
    """
    Computes live comparison between current route vehicle emissions and
    equivalent EV fleet alternative using GLEC Well-to-Wheel standard formulas.
    """
    current_vtype = req.current_vehicle_type or "heavy_truck"
    # 1. Current vehicle emissions calculation
    current_res = calculate_segment_emissions(
        distance_km=req.distance_km,
        load_factor=req.load_factor or 0.5,
        congestion_index=req.congestion_index or 0.2,
        vehicle_type=current_vtype,
    )

    # Use provided current_co2_kg if explicitly given from routeResult
    current_co2 = req.current_co2_kg if (req.current_co2_kg is not None and req.current_co2_kg > 0) else current_res["co2_kg"]
    current_fuel_l = current_res["fuel_L"]

    # 2. EV Alternative emissions calculation
    ev_res = calculate_segment_emissions(
        distance_km=req.distance_km,
        load_factor=req.load_factor or 0.5,
        congestion_index=req.congestion_index or 0.2,
        vehicle_type="ev_truck",
    )

    ev_co2 = ev_res["co2_kg"]
    ev_energy_kwh = ev_res["energy_kwh"]

    # 3. Deltas & Financials
    co2_saved = round(max(0.0, current_co2 - ev_co2), 2)
    pct_reduction = round((co2_saved / current_co2) * 100.0, 1) if current_co2 > 0 else 0.0

    # Regional Indian / US commercial diesel & electricity benchmarks ($1.15/L diesel, $0.10/kWh electricity)
    diesel_cost = round(current_fuel_l * 1.15, 2)
    ev_cost = round(ev_energy_kwh * 0.10, 2)
    cost_saved = round(max(0.0, diesel_cost - ev_cost), 2)

    return {
        "distance_km": req.distance_km,
        "current_vehicle_type": current_res["vehicle_type"],
        "current_fuel_type": current_res["fuel_type"],
        "current_co2_kg": round(current_co2, 2),
        "current_fuel_L": round(current_fuel_l, 2),
        "ev_vehicle_type": ev_res["vehicle_type"],
        "ev_fuel_type": ev_res["fuel_type"],
        "ev_co2_kg": round(ev_co2, 2),
        "ev_energy_kwh": round(ev_energy_kwh, 2),
        "co2_saved_kg": co2_saved,
        "co2_reduction_percentage": pct_reduction,
        "fuel_saved_L": round(current_fuel_l, 2),
        "diesel_cost_usd": diesel_cost,
        "ev_electricity_cost_usd": ev_cost,
        "cost_saved_usd": cost_saved,
        "formula_breakdown": {
            "diesel_combustion_factor_kg_per_l": 2.68,
            "grid_emission_factor_kg_per_kwh": 0.18,
            "diesel_unit_cost_usd_per_l": 1.15,
            "electric_unit_cost_usd_per_kwh": 0.10,
        },
    }
