"""
Vehicle Spec Lookup Helper — Queries DB or static reference table for vehicle capacity, mileage, and fuel type.
"""

from typing import Dict, Any
from sqlalchemy.orm import Session
from backend.app.db.models import Vehicle

REFERENCE_VEHICLES = {
    "heavy": {
        "capacity_kg": 18000.0,
        "mileage_kmpl": 3.2,
        "fuel_type": "diesel",
    },
    "ev": {
        "capacity_kg": 14000.0,
        "mileage_kmpl": 1.8,  # Equivalent km / kWh
        "fuel_type": "electric",
    },
    "medium": {
        "capacity_kg": 8000.0,
        "mileage_kmpl": 5.5,
        "fuel_type": "diesel",
    },
    "van": {
        "capacity_kg": 3500.0,
        "mileage_kmpl": 9.0,
        "fuel_type": "diesel",
    },
}


def lookup_vehicle_specs(db: Session, vehicle_name: str) -> Dict[str, Any]:
    # 1. Try querying local Fleet DB
    try:
        db_veh = (
            db.query(Vehicle)
            .filter(Vehicle.name.ilike(f"%{vehicle_name}%"))
            .first()
        )
        if db_veh:
            v_type = getattr(db_veh, "vehicle_type", "heavy_truck")
            ref = REFERENCE_VEHICLES.get("ev" if "ev" in v_type or "electric" in db_veh.fuel_type else "heavy")
            return {
                "vehicle_name": db_veh.name,
                "capacity_kg": getattr(db_veh, "capacity_kg", ref["capacity_kg"]),
                "mileage_kmpl": ref["mileage_kmpl"],
                "fuel_type": getattr(db_veh, "fuel_type", ref["fuel_type"]),
                "source": "database",
            }
    except Exception as e:
        print(f"Vehicle DB query fallback notice: {e}")

    # 2. Fallback to static reference table
    name_lower = vehicle_name.lower()
    if "ev" in name_lower or "electric" in name_lower or "cascadia" in name_lower:
        match_key = "ev"
    elif "medium" in name_lower or "rigid" in name_lower:
        match_key = "medium"
    elif "van" in name_lower or "light" in name_lower:
        match_key = "van"
    else:
        match_key = "heavy"

    spec = REFERENCE_VEHICLES[match_key]
    return {
        "vehicle_name": vehicle_name,
        "capacity_kg": spec["capacity_kg"],
        "mileage_kmpl": spec["mileage_kmpl"],
        "fuel_type": spec["fuel_type"],
        "source": "reference",
    }
