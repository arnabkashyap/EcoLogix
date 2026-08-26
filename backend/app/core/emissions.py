"""
EcoLogix Shared Emissions Model

CRITICAL ARCHITECTURAL RULE:
Every CO2 number across route optimization, Pareto evaluation, and load-pool matching
MUST trace back to this single, pure, deterministic calculation function.
"""

from typing import Dict, Any, Optional
from pydantic import BaseModel


class VehicleProfile(BaseModel):
    vehicle_type: str  # "heavy_truck", "medium_truck", "van", "ev_truck"
    fuel_type: str = "diesel"  # "diesel" or "electric"
    base_L_per_km: float = 0.28
    k_load: float = 0.35
    k_congestion: float = 0.30
    kwh_per_km: float = 0.85
    grid_emission_factor_kg_per_kwh: float = 0.20  # Pacific NW clean grid default


# Standard vehicle profile presets
VEHICLE_PROFILES: Dict[str, VehicleProfile] = {
    "heavy_truck": VehicleProfile(
        vehicle_type="heavy_truck",
        fuel_type="diesel",
        base_L_per_km=0.34,  # 34 L / 100km
        k_load=0.40,
        k_congestion=0.35,
    ),
    "medium_truck": VehicleProfile(
        vehicle_type="medium_truck",
        fuel_type="diesel",
        base_L_per_km=0.24,  # 24 L / 100km
        k_load=0.30,
        k_congestion=0.25,
    ),
    "van": VehicleProfile(
        vehicle_type="van",
        fuel_type="diesel",
        base_L_per_km=0.13,  # 13 L / 100km
        k_load=0.20,
        k_congestion=0.20,
    ),
    "ev_truck": VehicleProfile(
        vehicle_type="ev_truck",
        fuel_type="electric",
        base_L_per_km=0.0,
        kwh_per_km=0.85,
        grid_emission_factor_kg_per_kwh=0.18,
    ),
}

DIESEL_EMISSION_FACTOR_KG_PER_LITER = 2.68  # EPA standard combustion factor for diesel


def calculate_segment_emissions(
    distance_km: float,
    load_factor: float = 0.5,  # 0.0 (empty) to 1.0 (full capacity)
    congestion_index: float = 0.2,  # 0.0 (free flow) to 1.0 (heavy traffic)
    vehicle_type: str = "heavy_truck",
    custom_profile: Optional[VehicleProfile] = None,
) -> Dict[str, Any]:
    """
    Computes exact fuel consumption (liters or kWh) and CO2 emissions (kg) for a single segment.

    Formula (Diesel):
        fuel_L = base_L_per_km * distance_km * (1 + load_factor * k_load) * (1 + congestion_index * k_congestion)
        co2_kg = fuel_L * 2.68

    Formula (EV):
        co2_kg = distance_km * kwh_per_km * grid_emission_factor_kg_per_kwh
        fuel_L = 0 (kWh reported as energy_kwh)
    """
    profile = custom_profile or VEHICLE_PROFILES.get(
        vehicle_type, VEHICLE_PROFILES["heavy_truck"]
    )

    # Clamp load_factor and congestion_index to [0.0, 1.0] for physical stability
    load_factor = max(0.0, min(1.0, float(load_factor)))
    congestion_index = max(0.0, min(1.0, float(congestion_index)))
    distance_km = max(0.0, float(distance_km))

    if profile.fuel_type == "electric":
        energy_kwh = distance_km * profile.kwh_per_km * (1 + load_factor * 0.15) * (1 + congestion_index * 0.10)
        co2_kg = energy_kwh * profile.grid_emission_factor_kg_per_kwh
        fuel_L = 0.0
    else:
        # Diesel calculation
        load_mult = 1.0 + (load_factor * profile.k_load)
        congestion_mult = 1.0 + (congestion_index * profile.k_congestion)
        fuel_L = profile.base_L_per_km * distance_km * load_mult * congestion_mult
        energy_kwh = 0.0
        co2_kg = fuel_L * DIESEL_EMISSION_FACTOR_KG_PER_LITER

    return {
        "distance_km": round(distance_km, 2),
        "load_factor": round(load_factor, 2),
        "congestion_index": round(congestion_index, 2),
        "vehicle_type": profile.vehicle_type,
        "fuel_type": profile.fuel_type,
        "fuel_L": round(fuel_L, 2),
        "energy_kwh": round(energy_kwh, 2),
        "co2_kg": round(co2_kg, 2),
        "formula_breakdown": {
            "base_L_per_km": profile.base_L_per_km,
            "k_load": profile.k_load,
            "k_congestion": profile.k_congestion,
            "diesel_emission_factor": DIESEL_EMISSION_FACTOR_KG_PER_LITER if profile.fuel_type == "diesel" else None,
            "grid_emission_factor": profile.grid_emission_factor_kg_per_kwh if profile.fuel_type == "electric" else None,
        },
    }
