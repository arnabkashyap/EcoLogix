"""
EcoLogix Route Optimizer & Pareto Frontier Generator

Uses multi-objective Vehicle Routing Problem (VRP) solving with an exact combinatorial solver
(optimal for ≤9 stops), or a greedy nearest-neighbor heuristic fallback above that.
Wired directly to the pure shared Emissions Model (`backend/app/core/emissions.py`).
"""

import math
import itertools
from typing import List, Dict, Any, Tuple
from backend.app.core.emissions import calculate_segment_emissions, VEHICLE_PROFILES


# MOCK DATA for demo purposes, not a real risk feed
MOCK_CLIMATE_RISK_CORRIDORS = [
    {
        "name": "Yamuna River Floodplain Corridor",
        "lat_min": 28.50,
        "lat_max": 28.75,
        "lng_min": 77.20,
        "lng_max": 77.35,
        "note": "Corridor has elevated monsoon flood risk advisory",
    },
    {
        "name": "NCR Industrial Smog Hazard Pass",
        "lat_min": 28.30,
        "lat_max": 28.50,
        "lng_min": 76.90,
        "lng_max": 77.10,
        "note": "Seasonal winter fog & haze visibility hazard corridor",
    },
    {
        "name": "Mumbai Coastal Inundation Zone",
        "lat_min": 18.90,
        "lat_max": 19.30,
        "lng_min": 72.80,
        "lng_max": 73.10,
        "note": "High tide coastal storm surge and waterlogging advisory corridor",
    },
]


def check_climate_risk(from_lat: float, from_lng: float, to_lat: float, to_lng: float) -> Tuple[bool, str]:
    """
    Checks if a leg's endpoints or midpoint intersect mock climate risk corridors.
    Returns (climate_risk_flag, climate_risk_note).
    """
    points = [
        (from_lat, from_lng),
        (to_lat, to_lng),
        ((from_lat + to_lat) / 2.0, (from_lng + to_lng) / 2.0),
    ]
    for corridor in MOCK_CLIMATE_RISK_CORRIDORS:
        for lat, lng in points:
            if (corridor["lat_min"] <= lat <= corridor["lat_max"]) and (corridor["lng_min"] <= lng <= corridor["lng_max"]):
                return True, corridor["note"]
    return False, ""


def haversine_distance_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Computes great-circle distance in km with 1.25x road curvature factor."""
    if abs(lat1 - lat2) < 1e-6 and abs(lon1 - lon2) < 1e-6:
        return 0.0
    R = 6371.0  # Earth radius in km
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)

    a = (
        math.sin(delta_phi / 2.0) ** 2
        + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2.0) ** 2
    )
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    direct_km = R * c
    return round(direct_km * 1.25, 2)  # 1.25 road curvature multiplier


def build_cost_matrices(
    stops: List[Dict[str, Any]], vehicle_type: str = "heavy_truck"
) -> Tuple[List[List[float]], List[List[float]], List[List[float]]]:
    """
    Builds (Distance Matrix in km, Time Matrix in min, CO2 Matrix in kg).
    """
    n = len(stops)
    dist_matrix = [[0.0] * n for _ in range(n)]
    time_matrix = [[0.0] * n for _ in range(n)]
    co2_matrix = [[0.0] * n for _ in range(n)]

    # Congestion simulation matrix based on coordinates
    for i in range(n):
        for j in range(n):
            if i == j:
                continue
            d_km = haversine_distance_km(
                stops[i]["lat"], stops[i]["lng"], stops[j]["lat"], stops[j]["lng"]
            )
            # Speed: 45 km/h for short urban trips (< 15km), 65 km/h for long haul
            speed_kmh = 45.0 if d_km < 15.0 else 65.0
            t_min = (d_km / speed_kmh) * 60.0 + (10.0 if j != 0 else 0.0)  # 10 min stop handling time

            # Congestion index higher in city center stops
            cong = 0.35 if (stops[i]["lat"] > 47.5 and stops[j]["lat"] > 47.5) else 0.15

            # Calculate emissions using pure shared model
            load_factor = min(1.0, (stops[i].get("load_kg", 0.0) + stops[j].get("load_kg", 0.0)) / 15000.0)
            em_result = calculate_segment_emissions(
                distance_km=d_km,
                load_factor=load_factor,
                congestion_index=cong,
                vehicle_type=vehicle_type,
            )

            dist_matrix[i][j] = d_km
            time_matrix[i][j] = round(t_min, 1)
            co2_matrix[i][j] = em_result["co2_kg"]

    return dist_matrix, time_matrix, co2_matrix


def evaluate_route_sequence(
    sequence: List[int],
    dist_matrix: List[List[float]],
    time_matrix: List[List[float]],
    co2_matrix: List[List[float]],
) -> Dict[str, Any]:
    """Calculates total distance, time, and CO2 for an ordered sequence of stop indices."""
    total_dist = 0.0
    total_time = 0.0
    total_co2 = 0.0

    for idx in range(len(sequence) - 1):
        u, v = sequence[idx], sequence[idx + 1]
        total_dist += dist_matrix[u][v]
        total_time += time_matrix[u][v]
        total_co2 += co2_matrix[u][v]

    return {
        "total_distance_km": round(total_dist, 2),
        "total_time_min": round(total_time, 1),
        "total_co2_kg": round(total_co2, 2),
    }


def optimize_route_vrp(
    depot: Dict[str, Any],
    stops: List[Dict[str, Any]],
    vehicle_type: str = "heavy_truck",
    alpha: float = 0.5,
) -> Dict[str, Any]:
    """
    Solves multi-objective routing for given stops and weighting alpha (0.0=greenest, 1.0=fastest).
    Returns route sequence, baseline route (alpha=1.0), CO2 saved %, and Pareto frontier.
    """
    all_stops = [depot] + stops
    n = len(all_stops)

    if n <= 1:
        return {
            "alpha": alpha,
            "solution_method": "exact_optimal",
            "ordered_stops": all_stops,
            "total_distance_km": 0.0,
            "total_time_min": 0.0,
            "total_co2_kg": 0.0,
            "baseline_co2_kg": 0.0,
            "co2_saved_pct": 0.0,
            "pareto_points": [],
            "legs": [],
        }

    dist_matrix, time_matrix, co2_matrix = build_cost_matrices(all_stops, vehicle_type)

    stop_indices = list(range(1, n))
    alpha_steps = [0.0, 0.25, 0.5, 0.75, 1.0]
    pareto_points = []
    best_seqs_by_alpha = {}

    # Exact combinatorial solver for stop counts <= 9, nearest-neighbor heuristic fallback above that
    if n <= 9:
        solution_method = "exact_optimal"
        for perm in itertools.permutations(stop_indices):
            seq = [0] + list(perm) + [0]
            metrics = evaluate_route_sequence(seq, dist_matrix, time_matrix, co2_matrix)
            t = metrics["total_time_min"]
            c = metrics["total_co2_kg"]

            for a in alpha_steps:
                score = a * t + (1.0 - a) * (c * 2.0)  # scale CO2 appropriately
                if a not in best_seqs_by_alpha or score < best_seqs_by_alpha[a]["score"]:
                    best_seqs_by_alpha[a] = {
                        "score": score,
                        "sequence": seq,
                        "metrics": metrics,
                    }

    else:
        solution_method = "heuristic_nearest_neighbor"
        curr = 0
        unvisited = set(stop_indices)
        seq = [0]
        while unvisited:
            nxt = min(
                unvisited,
                key=lambda x: alpha * time_matrix[curr][x] + (1 - alpha) * co2_matrix[curr][x],
            )
            seq.append(nxt)
            unvisited.remove(nxt)
            curr = nxt
        seq.append(0)
        metrics = evaluate_route_sequence(seq, dist_matrix, time_matrix, co2_matrix)
        for a in alpha_steps:
            best_seqs_by_alpha[a] = {"score": 0, "sequence": seq, "metrics": metrics}

    # Extract baseline (alpha = 1.0)
    baseline_metrics = best_seqs_by_alpha[1.0]["metrics"]
    baseline_co2 = baseline_metrics["total_co2_kg"]
    baseline_seq = best_seqs_by_alpha[1.0]["sequence"]

    # Extract requested alpha route
    selected_alpha_entry = best_seqs_by_alpha.get(alpha, best_seqs_by_alpha[0.5])
    selected_seq = selected_alpha_entry["sequence"]
    selected_metrics = selected_alpha_entry["metrics"]

    # Build Pareto frontier curve points
    for a in sorted(alpha_steps):
        entry = best_seqs_by_alpha[a]
        m = entry["metrics"]
        c_saved = round(
            max(0.0, ((baseline_co2 - m["total_co2_kg"]) / baseline_co2) * 100.0), 1
        ) if baseline_co2 > 0 else 0.0

        pareto_points.append(
            {
                "alpha": a,
                "label": "Fastest" if a == 1.0 else ("Greenest" if a == 0.0 else f"α = {a}"),
                "time_min": m["total_time_min"],
                "co2_kg": m["total_co2_kg"],
                "co2_saved_pct": c_saved,
                "is_selected": (a == alpha),
            }
        )

    co2_saved_pct = round(
        max(0.0, ((baseline_co2 - selected_metrics["total_co2_kg"]) / baseline_co2) * 100.0), 1
    ) if baseline_co2 > 0 else 0.0

    # Build ordered stop details
    ordered_stops = []
    for idx in selected_seq:
        s = all_stops[idx].copy()
        ordered_stops.append(s)

    baseline_stops = []
    for idx in baseline_seq:
        s = all_stops[idx].copy()
        baseline_stops.append(s)

    # Leg details for map rendering & climate risk checking
    legs = []
    for i in range(len(selected_seq) - 1):
        u, v = selected_seq[i], selected_seq[i + 1]
        su, sv = all_stops[u], all_stops[v]
        d = dist_matrix[u][v]
        t = time_matrix[u][v]
        c = co2_matrix[u][v]
        is_flagged, risk_note = check_climate_risk(su["lat"], su["lng"], sv["lat"], sv["lng"])
        legs.append(
            {
                "sequence_order": i + 1,
                "from_stop": su.get("stop_name", su.get("title", "Depot")),
                "to_stop": sv.get("stop_name", sv.get("title", "Depot")),
                "from_lat": su["lat"],
                "from_lng": su["lng"],
                "to_lat": sv["lat"],
                "to_lng": sv["lng"],
                "distance_km": d,
                "time_min": t,
                "co2_kg": c,
                "climate_risk_flag": is_flagged,
                "climate_risk_note": risk_note,
            }
        )

    return {
        "alpha": alpha,
        "solution_method": solution_method,
        "total_distance_km": selected_metrics["total_distance_km"],
        "total_time_min": selected_metrics["total_time_min"],
        "total_co2_kg": selected_metrics["total_co2_kg"],
        "baseline_co2_kg": baseline_co2,
        "baseline_time_min": baseline_metrics["total_time_min"],
        "co2_saved_pct": co2_saved_pct,
        "ordered_stops": ordered_stops,
        "baseline_stops": baseline_stops,
        "legs": legs,
        "pareto_points": pareto_points,
    }

