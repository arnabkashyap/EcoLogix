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


# Climate Risk Corridors for Assam & Guwahati Domain (from data-flow-dynamic.md)
MOCK_CLIMATE_RISK_CORRIDORS = [
    {
        "name": "Saraighat Bridge Bottleneck Corridor",
        "lat_min": 26.16,
        "lat_max": 26.20,
        "lng_min": 91.66,
        "lng_max": 91.70,
        "note": "Saraighat Bridge river crossing bottleneck & monsoon waterlogging advisory",
        "speed_kmh": 25.0,
        "congestion_index": 0.28,  # +28% surge
    },
    {
        "name": "Jorabat Pass Monsoon Flood Corridor",
        "lat_min": 26.08,
        "lat_max": 26.13,
        "lng_min": 91.80,
        "lng_max": 91.85,
        "note": "Jorabat / Khanapara mountain runoff waterlogging corridor",
        "speed_kmh": 35.0,
        "congestion_index": 0.15,  # +15% surge
    },
    {
        "name": "Brahmaputra Floodplain Inundation Zone",
        "lat_min": 26.17,
        "lat_max": 26.22,
        "lng_min": 91.72,
        "lng_max": 91.82,
        "note": "North Bank low-lying seasonal flood hazard zone",
        "speed_kmh": 35.0,
        "congestion_index": 0.28,  # +28% surge
    },
]


def check_climate_risk(from_lat: float, from_lng: float, to_lat: float, to_lng: float) -> Tuple[bool, str, float, float]:
    """
    Checks if a leg's endpoints or midpoint intersect climate risk corridors.
    Returns (climate_risk_flag, climate_risk_note, speed_kmh, congestion_index).
    """
    points = [
        (from_lat, from_lng),
        (to_lat, to_lng),
        ((from_lat + to_lat) / 2.0, (from_lng + to_lng) / 2.0),
    ]
    for corridor in MOCK_CLIMATE_RISK_CORRIDORS:
        for lat, lng in points:
            if (corridor["lat_min"] <= lat <= corridor["lat_max"]) and (corridor["lng_min"] <= lng <= corridor["lng_max"]):
                return True, corridor["note"], corridor["speed_kmh"], corridor["congestion_index"]
    return False, "", 45.0, 0.05


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
    Uses real Assam speed profiles and corridor congestion indices.
    """
    n = len(stops)
    dist_matrix = [[0.0] * n for _ in range(n)]
    time_matrix = [[0.0] * n for _ in range(n)]
    co2_matrix = [[0.0] * n for _ in range(n)]

    for i in range(n):
        for j in range(n):
            if i == j:
                continue
            d_km = haversine_distance_km(
                stops[i]["lat"], stops[i]["lng"], stops[j]["lat"], stops[j]["lng"]
            )
            
            # Check corridor environmental risk & speed adjustments
            flagged, note, speed_kmh, cong = check_climate_risk(
                stops[i]["lat"], stops[i]["lng"], stops[j]["lat"], stops[j]["lng"]
            )
            
            # If not in a specific bottleneck corridor, apply standard urban/highway speeds
            if not flagged:
                speed_kmh = 35.0 if d_km < 12.0 else 65.0
                cong = 0.05

            t_min = (d_km / speed_kmh) * 60.0 + (10.0 if j != 0 else 0.0)  # 10 min handling per stop

            # Calculate emissions using pure shared model
            load_factor = min(1.0, (stops[i].get("load_kg", 0.0) + stops[j].get("load_kg", 0.0)) / 18000.0)
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
    all_stops: List[Dict[str, Any]],
    vehicle_type: str = "heavy_truck",
) -> Dict[str, Any]:
    """
    Calculates total distance, time, and CO2 for an ordered sequence of stop indices.
    Emissions are calculated per leg using the exact onboard payload and leg corridor conditions.
    """
    total_dist = 0.0
    total_time = 0.0
    total_co2 = 0.0

    # Total payload carried from depot at start is sum of all delivery loads
    current_load_kg = sum(all_stops[idx].get("load_kg", 0.0) for idx in sequence if idx != 0)
    max_cap = 18000.0 if vehicle_type == "heavy_truck" else 14000.0

    for idx in range(len(sequence) - 1):
        u, v = sequence[idx], sequence[idx + 1]
        su, sv = all_stops[u], all_stops[v]
        
        d_km = haversine_distance_km(su["lat"], su["lng"], sv["lat"], sv["lng"])
        flagged, note, speed_kmh, cong = check_climate_risk(su["lat"], su["lng"], sv["lat"], sv["lng"])
        
        if not flagged:
            speed_kmh = 35.0 if d_km < 12.0 else 65.0
            cong = 0.05

        t_min = (d_km / speed_kmh) * 60.0 + (10.0 if v != 0 else 0.0)

        load_factor = min(1.0, max(0.0, current_load_kg / max_cap))
        em = calculate_segment_emissions(
            distance_km=d_km,
            load_factor=load_factor,
            congestion_index=cong,
            vehicle_type=vehicle_type,
        )

        total_dist += d_km
        total_time += t_min
        total_co2 += em["co2_kg"]

        # Drop off payload at delivery stop v
        if v != 0:
            current_load_kg = max(0.0, current_load_kg - sv.get("load_kg", 0.0))

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
    alpha_steps = [round(i * 0.1, 1) for i in range(11)]
    pareto_points = []
    best_seqs_by_alpha = {}

    # Exact combinatorial solver for stop counts <= 9, nearest-neighbor + 2-opt fallback above that
    if n <= 9:
        solution_method = "exact_optimal"
        all_evals = []
        for perm in itertools.permutations(stop_indices):
            seq = [0] + list(perm) + [0]
            metrics = evaluate_route_sequence(seq, all_stops, vehicle_type)
            all_evals.append((seq, metrics))

        # Determine reference bounds for fair normalization across dimensions
        min_time = min(m["total_time_min"] for _, m in all_evals)
        max_time = max(m["total_time_min"] for _, m in all_evals)
        min_co2 = min(m["total_co2_kg"] for _, m in all_evals)
        max_co2 = max(m["total_co2_kg"] for _, m in all_evals)
        
        t_span = max(1e-3, max_time - min_time)
        c_span = max(1e-3, max_co2 - min_co2)

        for a in alpha_steps:
            best_seq = None
            best_metrics = None
            best_score = float("inf")
            for seq, metrics in all_evals:
                norm_t = (metrics["total_time_min"] - min_time) / t_span
                norm_c = (metrics["total_co2_kg"] - min_co2) / c_span
                score = a * norm_t + (1.0 - a) * norm_c
                if score < best_score:
                    best_score = score
                    best_seq = seq
                    best_metrics = metrics
            
            best_seqs_by_alpha[a] = {
                "score": best_score,
                "sequence": best_seq,
                "metrics": best_metrics,
            }

    else:
        solution_method = "heuristic_nearest_neighbor_2opt"
        for a in alpha_steps:
            curr = 0
            unvisited = set(stop_indices)
            seq = [0]
            while unvisited:
                nxt = min(
                    unvisited,
                    key=lambda x: a * time_matrix[curr][x] + (1.0 - a) * (co2_matrix[curr][x] * 1.5),
                )
                seq.append(nxt)
                unvisited.remove(nxt)
                curr = nxt
            seq.append(0)
            
            # Simple 2-opt local search improvement
            improved = True
            while improved:
                improved = False
                for i in range(1, len(seq) - 2):
                    for j in range(i + 1, len(seq) - 1):
                        new_seq = seq[:i] + seq[i : j + 1][::-1] + seq[j + 1 :]
                        old_m = evaluate_route_sequence(seq, all_stops, vehicle_type)
                        new_m = evaluate_route_sequence(new_seq, all_stops, vehicle_type)
                        old_score = a * old_m["total_time_min"] + (1.0 - a) * (old_m["total_co2_kg"] * 1.5)
                        new_score = a * new_m["total_time_min"] + (1.0 - a) * (new_m["total_co2_kg"] * 1.5)
                        if new_score < old_score:
                            seq = new_seq
                            improved = True
                            break
                    if improved:
                        break

            metrics = evaluate_route_sequence(seq, all_stops, vehicle_type)
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

    # Helper to construct legs for any sequence
    def build_legs_for_seq(seq):
        constructed_legs = []
        current_load = sum(all_stops[idx].get("load_kg", 0.0) for idx in seq if idx != 0)
        max_cap = 18000.0 if vehicle_type == "heavy_truck" else 14000.0

        for i in range(len(seq) - 1):
            u, v = seq[i], seq[i + 1]
            su, sv = all_stops[u], all_stops[v]
            d = haversine_distance_km(su["lat"], su["lng"], sv["lat"], sv["lng"])
            is_flagged, risk_note, speed_kmh, cong = check_climate_risk(su["lat"], su["lng"], sv["lat"], sv["lng"])
            if not is_flagged:
                speed_kmh = 35.0 if d < 12.0 else 65.0
                cong = 0.05
            t = round((d / speed_kmh) * 60.0 + (10.0 if v != 0 else 0.0), 1)

            load_factor = min(1.0, max(0.0, current_load / max_cap))
            em = calculate_segment_emissions(
                distance_km=d,
                load_factor=load_factor,
                congestion_index=cong,
                vehicle_type=vehicle_type,
            )

            constructed_legs.append(
                {
                    "sequence_order": i + 1,
                    "from_stop": su.get("dest_name", su.get("stop_name", su.get("title", "Depot"))),
                    "to_stop": sv.get("dest_name", sv.get("stop_name", sv.get("title", "Depot"))),
                    "from_lat": su["lat"],
                    "from_lng": su["lng"],
                    "to_lat": sv["lat"],
                    "to_lng": sv["lng"],
                    "distance_km": round(d, 2),
                    "time_min": t,
                    "co2_kg": em["co2_kg"],
                    "fuel_L": em["fuel_L"],
                    "energy_kwh": em["energy_kwh"],
                    "load_factor": em["load_factor"],
                    "onboard_weight_kg": round(current_load, 1),
                    "congestion_index": em["congestion_index"],
                    "climate_risk_flag": is_flagged,
                    "climate_risk_note": risk_note,
                    "formula_breakdown": em["formula_breakdown"],
                }
            )

            if v != 0:
                current_load = max(0.0, current_load - sv.get("load_kg", 0.0))

        return constructed_legs

    legs = build_legs_for_seq(selected_seq)
    baseline_legs = build_legs_for_seq(baseline_seq)

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
        "baseline_legs": baseline_legs,
        "pareto_points": pareto_points,
    }

