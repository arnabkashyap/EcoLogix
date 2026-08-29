from app.emissions.calculator import (
    calculate_load_ratio,
    calculate_load_multiplier,
    calculate_congestion_multiplier,
    calculate_fuel_consumption,
    calculate_co2_emissions,
)

def evaluate_leg_emissions(
    distance_km: float,
    travel_time_min: float,
    current_load_kg: float,
    capacity_kg: float,
    fuel_efficiency_km_per_l: float,
    emission_factor_kg_co2: float,
    congestion_index: float = 0.20
) -> dict:
    """
    Evaluates fuel and CO2 emissions for a single route leg using existing emission engine.
    """
    load_ratio = calculate_load_ratio(current_load_kg, capacity_kg)
    load_mult = calculate_load_multiplier(load_ratio)
    congestion_mult = calculate_congestion_multiplier(congestion_index)

    fuel_l = calculate_fuel_consumption(
        distance_km,
        fuel_efficiency_km_per_l,
        load_mult,
        congestion_mult
    )
    co2_kg = calculate_co2_emissions(fuel_l, emission_factor_kg_co2)

    return {
        "distance_km": distance_km,
        "travel_time_min": travel_time_min,
        "load_kg": current_load_kg,
        "fuel_l": fuel_l,
        "co2_kg": co2_kg,
    }


def compute_weighted_objective(
    time_min: float,
    co2_kg: float,
    alpha: float,
    max_time_scale: float = 600.0,
    max_co2_scale: float = 200.0
) -> float:
    """
    Computes weighted objective:
    objective = alpha * normalized_time + (1 - alpha) * normalized_co2

    alpha = 1.0 -> fastest route
    alpha = 0.5 -> balanced
    alpha = 0.0 -> greenest route
    """
    normalized_time = time_min / max_time_scale if max_time_scale > 0 else 0.0
    normalized_co2 = co2_kg / max_co2_scale if max_co2_scale > 0 else 0.0

    return alpha * normalized_time + (1.0 - alpha) * normalized_co2
