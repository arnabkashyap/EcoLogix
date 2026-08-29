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


def test_optimizer_pareto_alpha_different_routes():
    """
    Tests:
    1. Builds a 4-stop route with asymmetric distances, payload weights, and corridor congestion
       using the Guwahati / Assam node registry.
    2. Asserts alpha=0.0 (greenest) and alpha=1.0 (fastest) return genuinely different stop orderings.
    3. Asserts total_co2_kg strictly decreases as alpha moves from 1.0 to 0.0, and total_time_min strictly increases.
    """
    from backend.app.core.optimizer import optimize_route_vrp

    # Depot: Betkuchi ISBT (GW-HUB-002)
    depot = {
        "id": "depot",
        "title": "Betkuchi ISBT Freight Terminal",
        "lat": 26.1214,
        "lng": 91.7319,
        "stop_type": "depot",
        "load_kg": 0.0,
    }

    # 4 distinct stops with varied payloads and corridor risks from Guwahati registry:
    # 1. ICD Amingaon (GW-HUB-001) - 15,000kg (Heavy Container Import)
    # 2. LGBI Airport (GW-HUB-003) - 2,000kg (Light Air Cargo)
    # 3. Bamunimaidam (GW-HUB-004) - 14,000kg (Heavy Industrial Consignment)
    # 4. Dispur Node (GW-HUB-008) - 3,000kg (Commercial Supplies)
    stops = [
        {
            "id": "GW-HUB-001",
            "title": "ICD Amingaon Container Depot",
            "lat": 26.1852,
            "lng": 91.6811,
            "stop_type": "delivery",
            "load_kg": 15000.0,
        },
        {
            "id": "GW-HUB-003",
            "title": "LGBI Airport Cargo Terminal",
            "lat": 26.1061,
            "lng": 91.5859,
            "stop_type": "delivery",
            "load_kg": 2000.0,
        },
        {
            "id": "GW-HUB-004",
            "title": "Bamunimaidam Industrial Estate",
            "lat": 26.1884,
            "lng": 91.7821,
            "stop_type": "delivery",
            "load_kg": 14000.0,
        },
        {
            "id": "GW-HUB-008",
            "title": "Dispur Secretariat Node",
            "lat": 26.1432,
            "lng": 91.7898,
            "stop_type": "delivery",
            "load_kg": 3000.0,
        },
    ]

    # Run optimizer for Greenest (alpha = 0.0)
    res_green = optimize_route_vrp(
        depot=depot,
        stops=stops,
        vehicle_type="heavy_truck",
        alpha=0.0,
    )

    # Run optimizer for Fastest (alpha = 1.0)
    res_fast = optimize_route_vrp(
        depot=depot,
        stops=stops,
        vehicle_type="heavy_truck",
        alpha=1.0,
    )

    green_stops_order = [s["id"] for s in res_green["ordered_stops"][1:-1]]
    fast_stops_order = [s["id"] for s in res_fast["ordered_stops"][1:-1]]

    # 1. Assert alpha=0.0 and alpha=1.0 produce genuinely different stop permutations
    assert green_stops_order != fast_stops_order, f"Orderings should differ: {green_stops_order} vs {fast_stops_order}"

    # 2. Assert Greenest route has strictly less CO2 than Fastest route
    assert res_green["total_co2_kg"] < res_fast["total_co2_kg"], f"{res_green['total_co2_kg']} vs {res_fast['total_co2_kg']}"

    # 3. Assert Fastest route has strictly less time than Greenest route
    assert res_fast["total_time_min"] < res_green["total_time_min"], f"{res_fast['total_time_min']} vs {res_green['total_time_min']}"

    # 4. Check Pareto points structure
    pareto_pts = res_green["pareto_points"]
    assert len(pareto_pts) == 11
    p_green = next(p for p in pareto_pts if p["alpha"] == 0.0)
    p_fast = next(p for p in pareto_pts if p["alpha"] == 1.0)

    assert p_green["co2_kg"] < p_fast["co2_kg"]
    assert p_green["time_min"] > p_fast["time_min"]
    assert p_green["co2_saved_pct"] > 0.0
