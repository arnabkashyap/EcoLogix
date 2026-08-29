from typing import List, Any

def is_dominated(route_a: Any, route_b: Any) -> bool:
    """
    Returns True if route_a dominates route_b.
    route_a dominates route_b if:
    - time_a <= time_b and co2_a <= co2_b
    - and (time_a < time_b or co2_a < co2_b)
    """
    time_a = getattr(route_a, "total_time_min", 0.0)
    co2_a = getattr(route_a, "total_co2_kg", 0.0)

    time_b = getattr(route_b, "total_time_min", 0.0)
    co2_b = getattr(route_b, "total_co2_kg", 0.0)

    no_worse = (time_a <= time_b) and (co2_a <= co2_b)
    strictly_better = (time_a < time_b) or (co2_a < co2_b)

    return no_worse and strictly_better

def find_pareto_routes(routes: List[Any]) -> List[Any]:
    """
    Filters a list of route options to return only non-dominated (Pareto-optimal) solutions.
    """
    if not routes:
        return []

    pareto_routes = []
    for candidate in routes:
        dominated = False
        for other in routes:
            if candidate is not other and is_dominated(other, candidate):
                dominated = True
                break
        if not dominated:
            pareto_routes.append(candidate)

    return pareto_routes
