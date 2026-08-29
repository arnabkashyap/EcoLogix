from app.load_pooling.constants import (
    MAX_PICKUP_DETOUR_KM,
    MAX_DESTINATION_DETOUR_KM,
    MAX_TOTAL_DETOUR_KM,
    WEIGHT_PICKUP_PROXIMITY,
    WEIGHT_DESTINATION_PROXIMITY,
    WEIGHT_DETOUR,
    WEIGHT_CAPACITY,
    WEIGHT_TIME_WINDOW,
)

def compute_match_score(
    pickup_detour_km: float,
    dest_detour_km: float,
    detour_km: float,
    shipment_weight_kg: float,
    available_capacity_kg: float,
    time_compatible: bool = True
) -> float:
    """
    Computes a deterministic compatibility score from 0.0 to 100.0.
    """
    # 1. Pickup Proximity Score (0 to 100)
    if pickup_detour_km <= 5.0:
        pickup_score = 100.0
    elif pickup_detour_km >= MAX_PICKUP_DETOUR_KM:
        pickup_score = 0.0
    else:
        pickup_score = max(0.0, 100.0 * (1.0 - (pickup_detour_km - 5.0) / (MAX_PICKUP_DETOUR_KM - 5.0)))

    # 2. Destination Proximity Score (0 to 100)
    if dest_detour_km <= 5.0:
        dest_score = 100.0
    elif dest_detour_km >= MAX_DESTINATION_DETOUR_KM:
        dest_score = 0.0
    else:
        dest_score = max(0.0, 100.0 * (1.0 - (dest_detour_km - 5.0) / (MAX_DESTINATION_DETOUR_KM - 5.0)))

    # 3. Detour Score (0 to 100)
    if detour_km <= 5.0:
        detour_score = 100.0
    elif detour_km >= MAX_TOTAL_DETOUR_KM:
        detour_score = 0.0
    else:
        detour_score = max(0.0, 100.0 * (1.0 - (detour_km - 5.0) / (MAX_TOTAL_DETOUR_KM - 5.0)))

    # 4. Capacity Utilization Score (0 to 100)
    if available_capacity_kg <= 0 or shipment_weight_kg > available_capacity_kg:
        cap_score = 0.0
    else:
        ratio = shipment_weight_kg / available_capacity_kg
        cap_score = min(100.0, ratio * 100.0)

    # 5. Time Window Score (0 or 100)
    time_score = 100.0 if time_compatible else 0.0

    # Weighted Total Score
    total_score = (
        WEIGHT_PICKUP_PROXIMITY * pickup_score +
        WEIGHT_DESTINATION_PROXIMITY * dest_score +
        WEIGHT_DETOUR * detour_score +
        WEIGHT_CAPACITY * cap_score +
        WEIGHT_TIME_WINDOW * time_score
    )

    return round(total_score, 1)


def generate_match_explanation(
    is_eligible: bool,
    shipment_weight_kg: float,
    available_capacity_kg: float,
    pickup_detour_km: float,
    dest_detour_km: float,
    detour_km: float,
    status: str = "PENDING"
) -> str:
    """
    Generates a deterministic human-readable explanation string.
    """
    if status in ["ACCEPTED", "COMPLETED"]:
        return "Shipment is already assigned to a route."
    if status == "REJECTED":
        return "Match was manually rejected by operator."

    if shipment_weight_kg > available_capacity_kg:
        return f"Rejected because shipment weight ({shipment_weight_kg} kg) exceeds available capacity ({available_capacity_kg} kg)."

    if pickup_detour_km > MAX_PICKUP_DETOUR_KM:
        return f"Rejected because pickup detour ({round(pickup_detour_km, 1)} km) exceeds maximum threshold ({MAX_PICKUP_DETOUR_KM} km)."

    if dest_detour_km > MAX_DESTINATION_DETOUR_KM:
        return f"Rejected because destination detour ({round(dest_detour_km, 1)} km) exceeds maximum threshold ({MAX_DESTINATION_DETOUR_KM} km)."

    if not is_eligible:
        return "Ineligible due to route or time window incompatibility."

    return "Good match because the shipment pickup and destination are both close to the vehicle's planned return route, with sufficient remaining capacity."
