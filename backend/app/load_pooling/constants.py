import os

# Detour & Proximity Thresholds (in km)
MAX_PICKUP_DETOUR_KM = float(os.getenv("MAX_PICKUP_DETOUR_KM", 30.0))
MAX_DESTINATION_DETOUR_KM = float(os.getenv("MAX_DESTINATION_DETOUR_KM", 30.0))
MAX_TOTAL_DETOUR_KM = float(os.getenv("MAX_TOTAL_DETOUR_KM", 50.0))

# Cost Model Configuration (Fuel price per litre, e.g., in INR or local currency)
FUEL_PRICE_PER_LITRE = float(os.getenv("FUEL_PRICE_PER_LITRE", 95.0))

# Rule-Based Compatibility Score Weights (Sum = 1.0)
WEIGHT_PICKUP_PROXIMITY = 0.25
WEIGHT_DESTINATION_PROXIMITY = 0.25
WEIGHT_DETOUR = 0.25
WEIGHT_CAPACITY = 0.15
WEIGHT_TIME_WINDOW = 0.10

# Valid Load Pool Match Statuses
STATUS_CANDIDATE = "CANDIDATE"
STATUS_ACCEPTED = "ACCEPTED"
STATUS_REJECTED = "REJECTED"
STATUS_COMPLETED = "COMPLETED"
