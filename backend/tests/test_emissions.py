import pytest
from backend.app.core.emissions import (
    calculate_segment_emissions,
    VEHICLE_PROFILES,
    DIESEL_EMISSION_FACTOR_KG_PER_LITER,
)


def test_diesel_emissions_base():
    # 100km, 0 load, 0 congestion, heavy truck (base_L = 0.34)
    res = calculate_segment_emissions(
        distance_km=100.0,
        load_factor=0.0,
        congestion_index=0.0,
        vehicle_type="heavy_truck",
    )
    expected_fuel = 0.34 * 100.0  # 34.0 L
    expected_co2 = expected_fuel * DIESEL_EMISSION_FACTOR_KG_PER_LITER  # 91.12 kg
    assert res["fuel_L"] == pytest.approx(34.0, abs=0.1)
    assert res["co2_kg"] == pytest.approx(91.12, abs=0.1)


def test_diesel_emissions_with_load_and_congestion():
    # 50km, 0.5 load factor, 0.4 congestion, heavy truck
    res = calculate_segment_emissions(
        distance_km=50.0,
        load_factor=0.5,
        congestion_index=0.4,
        vehicle_type="heavy_truck",
    )
    # load_mult = 1 + 0.5*0.40 = 1.2
    # cong_mult = 1 + 0.4*0.35 = 1.14
    # fuel = 0.34 * 50 * 1.2 * 1.14 = 23.256 L
    # co2 = 23.256 * 2.68 = 62.326 kg
    assert res["fuel_L"] > 0
    assert res["co2_kg"] > 0
    assert res["co2_kg"] > 23.0 * 2.68  # Must be higher than empty/free-flow


def test_ev_emissions():
    res = calculate_segment_emissions(
        distance_km=100.0,
        load_factor=0.0,
        congestion_index=0.0,
        vehicle_type="ev_truck",
    )
    assert res["fuel_type"] == "electric"
    assert res["fuel_L"] == 0.0
    assert res["energy_kwh"] > 0
    assert res["co2_kg"] > 0


def test_shared_model_consistency():
    # Calling twice with same inputs produces identical deterministic outputs
    res1 = calculate_segment_emissions(120.0, 0.75, 0.3, "medium_truck")
    res2 = calculate_segment_emissions(120.0, 0.75, 0.3, "medium_truck")
    assert res1 == res2
