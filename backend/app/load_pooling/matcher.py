from typing import Tuple, Dict, Any, Optional
from sqlalchemy.orm import Session

from app.models.vehicle import Vehicle
from app.models.shipment import Shipment
from app.models.emission_factor import EmissionFactor
from app.models.provider import Provider
from app.optimization.routing import RoutingService
from app.emissions.calculator import (
    calculate_load_ratio,
    calculate_load_multiplier,
    calculate_congestion_multiplier,
    calculate_fuel_consumption,
    calculate_co2_emissions,
)
from app.load_pooling.constants import (
    MAX_PICKUP_DETOUR_KM,
    MAX_DESTINATION_DETOUR_KM,
    FUEL_PRICE_PER_LITRE,
)
from app.load_pooling.scoring import compute_match_score, generate_match_explanation
from app.load_pooling.schemas import ReturnRouteSummary, LoadPoolMatchItem

class LoadPoolingMatcher:
    def __init__(self, db: Session, routing_service: Optional[RoutingService] = None):
        self.db = db
        self.routing_service = routing_service or RoutingService()

    def resolve_return_route(self, vehicle: Vehicle) -> Tuple[str, float, float, str, float, float, float]:
        """
        Determines expected return route for vehicle.
        Returns: (origin_name, origin_lat, origin_lng, dest_name, dest_lat, dest_lng, empty_distance_km)
        """
        # Origin: Vehicle's current location
        origin_lat = vehicle.current_lat
        origin_lng = vehicle.current_lng

        # Find closest known hub name or default
        origin_name = "Vehicle Current Location"
        for hub, coords in self.routing_service.provider.HUB_COORDINATES.items():
            if abs(coords[0] - origin_lat) < 0.2 and abs(coords[1] - origin_lng) < 0.2:
                origin_name = hub
                break

        # Destination: Provider home depot
        dest_name = "Guwahati Central Depot"
        if vehicle.provider and vehicle.provider.home_depot_location:
            dest_name = vehicle.provider.home_depot_location

        dest_lat, dest_lng = 26.1445, 91.7362
        for hub, coords in self.routing_service.provider.HUB_COORDINATES.items():
            if hub.lower() in dest_name.lower():
                dest_lat, dest_lng = coords
                break

        empty_distance_km = self.routing_service.distance_km(
            origin_lat, origin_lng, dest_lat, dest_lng, origin_name, dest_name
        )

        return (origin_name, origin_lat, origin_lng, dest_name, dest_lat, dest_lng, empty_distance_km)

    def evaluate_shipment_match(
        self,
        vehicle: Vehicle,
        shipment: Shipment,
        return_route: Tuple[str, float, float, str, float, float, float]
    ) -> LoadPoolMatchItem:
        (
            origin_name, origin_lat, origin_lng,
            dest_name, dest_lat, dest_lng,
            empty_distance_km
        ) = return_route

        # 1. Capacity Validation
        available_capacity_kg = vehicle.capacity_kg  # Base empty capacity
        is_overweight = shipment.weight_kg > available_capacity_kg

        # 2. Detour Distances
        pickup_detour_km = self.routing_service.distance_km(
            origin_lat, origin_lng, shipment.pickup_lat, shipment.pickup_lng,
            origin_name, shipment.pickup_name
        )

        dest_detour_km = self.routing_service.distance_km(
            shipment.destination_lat, shipment.destination_lng, dest_lat, dest_lng,
            shipment.destination_name, dest_name
        )

        leg1 = pickup_detour_km
        leg2 = self.routing_service.distance_km(
            shipment.pickup_lat, shipment.pickup_lng,
            shipment.destination_lat, shipment.destination_lng,
            shipment.pickup_name, shipment.destination_name
        )
        leg3 = dest_detour_km

        pooled_distance_km = round(leg1 + leg2 + leg3, 2)
        detour_distance_km = round(max(0.0, pooled_distance_km - empty_distance_km), 2)

        # 3. Eligibility Check
        is_eligible = (
            not is_overweight and
            pickup_detour_km <= MAX_PICKUP_DETOUR_KM and
            dest_detour_km <= MAX_DESTINATION_DETOUR_KM and
            shipment.status not in ["ASSIGNED", "COMPLETED", "ACCEPTED"]
        )

        # 4. Fetch Emission Factor for Vehicle Fuel Type
        fuel_type_str = str(vehicle.fuel_type).upper()
        factor_record = self.db.query(EmissionFactor).filter(
            EmissionFactor.fuel_type == fuel_type_str
        ).first()

        emission_factor_kg_co2 = factor_record.kg_co2_per_unit if factor_record else 2.68

        # 5. CO2 & Fuel Savings Calculation
        # Empty Return: 0kg load
        empty_load_ratio = 0.0
        empty_load_mult = calculate_load_multiplier(empty_load_ratio)
        empty_fuel_l = calculate_fuel_consumption(
            empty_distance_km, vehicle.fuel_efficiency_km_per_l, empty_load_mult, congestion_multiplier=1.0
        )
        empty_co2_kg = calculate_co2_emissions(empty_fuel_l, emission_factor_kg_co2)

        # Pooled Return: carrying shipment weight
        pooled_load_ratio = calculate_load_ratio(shipment.weight_kg, vehicle.capacity_kg)
        pooled_load_mult = calculate_load_multiplier(pooled_load_ratio)
        pooled_fuel_l = calculate_fuel_consumption(
            pooled_distance_km, vehicle.fuel_efficiency_km_per_l, pooled_load_mult, congestion_multiplier=1.0
        )
        pooled_co2_kg = calculate_co2_emissions(pooled_fuel_l, emission_factor_kg_co2)

        # Savings = Empty - Pooled
        fuel_saved_l = round(empty_fuel_l - pooled_fuel_l, 2)
        co2_saved_kg = round(empty_co2_kg - pooled_co2_kg, 2)

        # Cost savings
        cost_saved = round(max(0.0, fuel_saved_l) * FUEL_PRICE_PER_LITRE, 2)

        # 6. Score and Explanation
        match_score = compute_match_score(
            pickup_detour_km=pickup_detour_km,
            dest_detour_km=dest_detour_km,
            detour_km=detour_distance_km,
            shipment_weight_kg=shipment.weight_kg,
            available_capacity_kg=available_capacity_kg,
            time_compatible=True
        )

        explanation = generate_match_explanation(
            is_eligible=is_eligible,
            shipment_weight_kg=shipment.weight_kg,
            available_capacity_kg=available_capacity_kg,
            pickup_detour_km=pickup_detour_km,
            dest_detour_km=dest_detour_km,
            detour_km=detour_distance_km,
            status=shipment.status
        )

        return LoadPoolMatchItem(
            match_id=None,
            shipment_id=shipment.id,
            shipment_pickup_name=shipment.pickup_name,
            shipment_destination_name=shipment.destination_name,
            match_score=match_score,
            shipment_weight_kg=shipment.weight_kg,
            available_capacity_kg=available_capacity_kg,
            pickup_detour_km=round(pickup_detour_km, 1),
            destination_detour_km=round(dest_detour_km, 1),
            empty_distance_km=empty_distance_km,
            pooled_distance_km=pooled_distance_km,
            detour_distance_km=detour_distance_km,
            co2_saved_kg=co2_saved_kg,
            fuel_saved_l=fuel_saved_l,
            cost_saved=cost_saved,
            status="CANDIDATE" if is_eligible else "REJECTED",
            explanation=explanation,
            is_eligible=is_eligible
        )
