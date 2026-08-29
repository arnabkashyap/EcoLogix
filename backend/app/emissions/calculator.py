from app.emissions.constants import LOAD_FACTOR_WEIGHT, CONGESTION_FACTOR_WEIGHT

def clamp(val: float, min_val: float, max_val: float) -> float:
    return max(min_val, min(max_val, val))

def calculate_load_ratio(load_kg: float, capacity_kg: float) -> float:
    if capacity_kg <= 0:
        return 0.0
    return clamp(load_kg / capacity_kg, 0.0, 1.0)

def calculate_load_multiplier(load_ratio: float, weight: float = LOAD_FACTOR_WEIGHT) -> float:
    clamped_ratio = clamp(load_ratio, 0.0, 1.0)
    return round(1.0 + (weight * clamped_ratio), 4)

def calculate_congestion_multiplier(congestion_index: float, weight: float = CONGESTION_FACTOR_WEIGHT) -> float:
    clamped_congestion = clamp(congestion_index, 0.0, 1.0)
    return round(1.0 + (weight * clamped_congestion), 4)

def calculate_fuel_consumption(
    distance_km: float,
    fuel_efficiency_km_per_unit: float,
    load_multiplier: float,
    congestion_multiplier: float
) -> float:
    if fuel_efficiency_km_per_unit <= 0 or distance_km <= 0:
        return 0.0
    base_fuel = distance_km / fuel_efficiency_km_per_unit
    total_fuel = base_fuel * load_multiplier * congestion_multiplier
    return round(total_fuel, 4)

def calculate_co2_emissions(fuel_units: float, emission_factor_kg_co2: float) -> float:
    if fuel_units <= 0 or emission_factor_kg_co2 < 0:
        return 0.0
    return round(fuel_units * emission_factor_kg_co2, 4)

def compare_scenarios(baseline_fuel_l: float, baseline_co2_kg: float, optimized_fuel_l: float, optimized_co2_kg: float):
    fuel_saved_l = round(baseline_fuel_l - optimized_fuel_l, 4)
    co2_saved_kg = round(baseline_co2_kg - optimized_co2_kg, 4)
    
    if baseline_co2_kg <= 0:
        co2_reduction_percentage = 0.0
    else:
        co2_reduction_percentage = round(((baseline_co2_kg - optimized_co2_kg) / baseline_co2_kg) * 100.0, 2)
        
    return {
        "fuel_saved_l": fuel_saved_l,
        "co2_saved_kg": co2_saved_kg,
        "co2_reduction_percentage": co2_reduction_percentage
    }
