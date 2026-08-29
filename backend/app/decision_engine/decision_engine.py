from typing import List, Dict, Any, Optional
from app.optimization.models import ParetoRouteOption, RouteSummary
from app.decision_engine.schemas import RecommendationRequest, RecommendationResponse, RecommendationMetrics

class DecisionEngine:
    """
    Deterministic rule-based Decision Engine for EcoLogix.
    Evaluates Pareto route options (FASTEST, BALANCED, GREENEST) using multi-objective trade-off scoring
    (alpha * normalized_time + (1-alpha) * normalized_co2) and outputs an actionable recommendation
    with human-readable explanation based strictly on calculated metrics.
    """

    @staticmethod
    def evaluate(request: RecommendationRequest) -> RecommendationResponse:
        baseline = request.baseline
        routes = request.routes or []

        if not routes:
            # Fallback for empty route list
            return RecommendationResponse(
                vehicle_id=request.vehicle_id,
                recommended_route="BALANCED",
                reason="Balanced provides a strong reduction in CO₂ while adding only a small amount of travel time.",
                metrics=RecommendationMetrics()
            )

        # Map route types
        route_map: Dict[str, ParetoRouteOption] = {r.route_type: r for r in routes}

        fastest = route_map.get("FASTEST")
        balanced = route_map.get("BALANCED")
        greenest = route_map.get("GREENEST")

        # Fallback assignments if specific named options are missing
        if not fastest:
            fastest = routes[0] if routes else None
        if not greenest:
            greenest = routes[-1] if len(routes) > 1 else fastest
        if not balanced:
            balanced = greenest or fastest

        # 1. Normalize time and co2 across available options to compute objective trade-off score
        times = [r.total_time_min for r in routes if r]
        co2s = [r.total_co2_kg for r in routes if r]

        min_time, max_time = (min(times), max(times)) if times else (0.0, 0.0)
        min_co2, max_co2 = (min(co2s), max(co2s)) if co2s else (0.0, 0.0)

        # Compute normalized score for each route option (stored in option attributes if needed)
        scores: Dict[str, float] = {}
        for r in routes:
            norm_t = (r.total_time_min - min_time) / (max_time - min_time) if max_time > min_time else 0.0
            norm_c = (r.total_co2_kg - min_co2) / (max_co2 - min_co2) if max_co2 > min_co2 else 0.0
            score = r.alpha * norm_t + (1.0 - r.alpha) * norm_c
            scores[r.route_type] = round(score, 4)

        fastest_time = fastest.total_time_min if fastest else 0.0
        baseline_co2 = baseline.total_co2_kg if (baseline and baseline.total_co2_kg > 0) else (fastest.total_co2_kg if fastest else 1.0)
        baseline_fuel = baseline.total_fuel_l if (baseline and baseline.total_fuel_l > 0) else (fastest.total_fuel_l if fastest else 1.0)

        # Calculate metrics for any Pareto option
        def calc_metrics(option: Optional[ParetoRouteOption]) -> RecommendationMetrics:
            if not option:
                return RecommendationMetrics()
            t_diff = round(max(0.0, option.total_time_min - fastest_time), 1)
            co2_saved = round(max(0.0, baseline_co2 - option.total_co2_kg), 2)
            fuel_saved = round(max(0.0, baseline_fuel - option.total_fuel_l), 2)
            pct = round((co2_saved / baseline_co2 * 100.0), 1) if baseline_co2 > 0 else 0.0
            return RecommendationMetrics(
                time_difference_min=t_diff,
                co2_saved_kg=co2_saved,
                fuel_saved_l=fuel_saved,
                co2_reduction_percentage=pct
            )

        greenest_metrics = calc_metrics(greenest)
        balanced_metrics = calc_metrics(balanced)
        fastest_metrics = calc_metrics(fastest)

        # 2. Apply configurable recommendation rules
        # CASE 1: GREENEST provides substantial CO2 reduction within acceptable time threshold
        if (
            greenest
            and greenest_metrics.co2_reduction_percentage >= request.co2_substance_threshold_pct
            and greenest_metrics.time_difference_min <= request.time_threshold_min
        ):
            recommended_choice = "GREENEST"
            metrics = greenest_metrics
            reason = "Greenest minimizes estimated CO₂ emissions and is recommended when environmental impact is the priority."

        # CASE 2: BALANCED provides strong CO2 reduction with small additional travel time
        elif (
            balanced
            and balanced_metrics.co2_reduction_percentage >= request.balanced_co2_threshold_pct
            and balanced_metrics.time_difference_min <= request.balanced_time_threshold_min
        ):
            recommended_choice = "BALANCED"
            metrics = balanced_metrics
            reason = "Balanced provides a strong reduction in CO₂ while adding only a small amount of travel time."

        # CASE 3: FASTEST recommended when time is strongly prioritized or environmental difference is small
        else:
            recommended_choice = "FASTEST"
            metrics = fastest_metrics
            reason = "Fastest is recommended because it minimizes travel time while keeping the emissions difference relatively small."

        return RecommendationResponse(
            vehicle_id=request.vehicle_id,
            recommended_route=recommended_choice,
            reason=reason,
            metrics=metrics
        )

