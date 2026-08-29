from typing import List, Dict, Any, Tuple
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app.models.vehicle import Vehicle
from app.models.shipment import Shipment
from app.models.emission_factor import EmissionFactor
from app.models.route import Route
from app.models.route_leg import RouteLeg

from app.optimization.models import (
    OptimizationRequest,
    OptimizationResponse,
    ParetoRequest,
    ParetoResponse,
    ParetoRouteOption,
    RouteSummary,
    RouteStop,
    RouteComparison,
)
from app.optimization.routing import RoutingService
from app.optimization.cost_function import evaluate_leg_emissions
from app.optimization.optimizer import RouteOptimizer, RouteNode
from app.optimization.pareto import find_pareto_routes

class RouteOptimizationService:
    def __init__(self, db: Session, routing_service: RoutingService = None):
        self.db = db
        self.routing_service = routing_service or RoutingService()
        self.optimizer = RouteOptimizer(routing_service=self.routing_service)

    def optimize(self, req: OptimizationRequest) -> OptimizationResponse:
        # 1. Fetch Vehicle
        vehicle = self.db.query(Vehicle).filter(Vehicle.id == req.vehicle_id).first()
        if not vehicle:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Vehicle with ID '{req.vehicle_id}' not found"
            )

        # 2. Fetch Shipments
        if not req.shipment_ids:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="At least one shipment must be selected for route optimization"
            )

        shipments = self.db.query(Shipment).filter(Shipment.id.in_(req.shipment_ids)).all()
        found_ids = {s.id for s in shipments}
        for sid in req.shipment_ids:
            if sid not in found_ids:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Shipment with ID '{sid}' not found"
                )

        # 3. Capacity Validation
        total_shipment_load = sum(s.weight_kg for s in shipments)
        if total_shipment_load > vehicle.capacity_kg:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Total shipment load ({total_shipment_load} kg) exceeds vehicle capacity ({vehicle.capacity_kg} kg)"
            )

        # 4. Fetch Emission Factor
        fuel_type_str = str(vehicle.fuel_type).upper()
        factor_record = self.db.query(EmissionFactor).filter(
            EmissionFactor.fuel_type == fuel_type_str
        ).first()

        if not factor_record:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"No emission factor configured for fuel type '{fuel_type_str}'"
            )

        # 5. Vehicle Depot representation
        depot_location = ("Guwahati Central Depot", vehicle.current_lat, vehicle.current_lng)

        shipments_dict = [
            {
                "id": s.id,
                "pickup_name": s.pickup_name,
                "pickup_lat": s.pickup_lat,
                "pickup_lng": s.pickup_lng,
                "destination_name": s.destination_name,
                "destination_lat": s.destination_lat,
                "destination_lng": s.destination_lng,
                "weight_kg": s.weight_kg,
            }
            for s in shipments
        ]

        # 6. Generate Baseline Sequence
        baseline_nodes: List[RouteNode] = [
            RouteNode(0, "DEPOT", depot_location[0], depot_location[1], depot_location[2], weight_delta=0.0)
        ]
        node_id = 1
        for s in shipments_dict:
            baseline_nodes.append(RouteNode(node_id, "PICKUP", s["pickup_name"], s["pickup_lat"], s["pickup_lng"], shipment_id=s["id"], weight_delta=s["weight_kg"]))
            node_id += 1
            baseline_nodes.append(RouteNode(node_id, "DELIVERY", s["destination_name"], s["destination_lat"], s["destination_lng"], shipment_id=s["id"], weight_delta=-s["weight_kg"]))
            node_id += 1

        # 7. Generate Optimized Sequence via OR-Tools
        optimized_nodes = self.optimizer.optimize_route(
            depot_location=depot_location,
            shipments=shipments_dict,
            vehicle_capacity_kg=vehicle.capacity_kg,
            fuel_efficiency_km_per_l=vehicle.fuel_efficiency_km_per_l,
            emission_factor_kg_co2=factor_record.kg_co2_per_unit,
            alpha=req.alpha
        )

        # 8. Evaluate Metrics & Build Summaries
        baseline_summary, baseline_legs_data = self._evaluate_route(
            baseline_nodes, vehicle, factor_record.kg_co2_per_unit
        )
        optimized_summary, optimized_legs_data = self._evaluate_route(
            optimized_nodes, vehicle, factor_record.kg_co2_per_unit
        )

        # 9. Compute Scenario Comparison
        fuel_saved = round(baseline_summary.total_fuel_l - optimized_summary.total_fuel_l, 2)
        co2_saved = round(baseline_summary.total_co2_kg - optimized_summary.total_co2_kg, 2)
        dist_diff = round(baseline_summary.total_distance_km - optimized_summary.total_distance_km, 2)
        time_diff = round(baseline_summary.total_time_min - optimized_summary.total_time_min, 2)

        if baseline_summary.total_co2_kg <= 0:
            co2_reduction_pct = 0.0
        else:
            co2_reduction_pct = round(((baseline_summary.total_co2_kg - optimized_summary.total_co2_kg) / baseline_summary.total_co2_kg) * 100.0, 2)

        comparison = RouteComparison(
            distance_difference_km=dist_diff,
            time_difference_min=time_diff,
            fuel_saved_l=fuel_saved,
            co2_saved_kg=co2_saved,
            co2_reduction_percentage=co2_reduction_pct
        )

        # 10. Save Baseline and Optimized Routes to Database
        baseline_db_route = self._save_route_to_db("BASELINE", vehicle.id, baseline_summary, baseline_legs_data)
        optimized_db_route = self._save_route_to_db("OPTIMIZED", vehicle.id, optimized_summary, optimized_legs_data)

        return OptimizationResponse(
            vehicle_id=vehicle.id,
            alpha=req.alpha,
            baseline=baseline_summary,
            optimized=optimized_summary,
            comparison=comparison,
            baseline_route_id=baseline_db_route.id,
            optimized_route_id=optimized_db_route.id
        )

    def optimize_pareto(self, req: ParetoRequest) -> ParetoResponse:
        # 1. Fetch Vehicle
        vehicle = self.db.query(Vehicle).filter(Vehicle.id == req.vehicle_id).first()
        if not vehicle:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Vehicle with ID '{req.vehicle_id}' not found"
            )

        # 2. Fetch Shipments
        if not req.shipment_ids:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="At least one shipment must be selected for route optimization"
            )

        shipments = self.db.query(Shipment).filter(Shipment.id.in_(req.shipment_ids)).all()
        found_ids = {s.id for s in shipments}
        for sid in req.shipment_ids:
            if sid not in found_ids:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Shipment with ID '{sid}' not found"
                )

        # 3. Capacity Validation
        total_shipment_load = sum(s.weight_kg for s in shipments)
        if total_shipment_load > vehicle.capacity_kg:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Total shipment load ({total_shipment_load} kg) exceeds vehicle capacity ({vehicle.capacity_kg} kg)"
            )

        # 4. Fetch Emission Factor
        fuel_type_str = str(vehicle.fuel_type).upper()
        factor_record = self.db.query(EmissionFactor).filter(
            EmissionFactor.fuel_type == fuel_type_str
        ).first()

        if not factor_record:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"No emission factor configured for fuel type '{fuel_type_str}'"
            )

        # 5. Vehicle Depot representation
        depot_location = ("Guwahati Central Depot", vehicle.current_lat, vehicle.current_lng)

        shipments_dict = [
            {
                "id": s.id,
                "pickup_name": s.pickup_name,
                "pickup_lat": s.pickup_lat,
                "pickup_lng": s.pickup_lng,
                "destination_name": s.destination_name,
                "destination_lat": s.destination_lat,
                "destination_lng": s.destination_lng,
                "weight_kg": s.weight_kg,
            }
            for s in shipments
        ]

        # 6. Generate Baseline Sequence
        baseline_nodes: List[RouteNode] = [
            RouteNode(0, "DEPOT", depot_location[0], depot_location[1], depot_location[2], weight_delta=0.0)
        ]
        node_id = 1
        for s in shipments_dict:
            baseline_nodes.append(RouteNode(node_id, "PICKUP", s["pickup_name"], s["pickup_lat"], s["pickup_lng"], shipment_id=s["id"], weight_delta=s["weight_kg"]))
            node_id += 1
            baseline_nodes.append(RouteNode(node_id, "DELIVERY", s["destination_name"], s["destination_lat"], s["destination_lng"], shipment_id=s["id"], weight_delta=-s["weight_kg"]))
            node_id += 1

        baseline_summary, baseline_legs_data = self._evaluate_route(
            baseline_nodes, vehicle, factor_record.kg_co2_per_unit
        )
        baseline_summary.route_type = "BASELINE"
        baseline_db_route = self._save_route_to_db("BASELINE", vehicle.id, baseline_summary, baseline_legs_data)
        baseline_summary.route_id = baseline_db_route.id

        # 7. Evaluate primary route configurations: FASTEST (1.0), BALANCED (0.5), GREENEST (0.0)
        alpha_targets = [
            ("FASTEST", 1.0),
            ("BALANCED", 0.5),
            ("GREENEST", 0.0)
        ]

        route_options: List[ParetoRouteOption] = []

        for route_type, alpha_val in alpha_targets:
            opt_nodes = self.optimizer.optimize_route(
                depot_location=depot_location,
                shipments=shipments_dict,
                vehicle_capacity_kg=vehicle.capacity_kg,
                fuel_efficiency_km_per_l=vehicle.fuel_efficiency_km_per_l,
                emission_factor_kg_co2=factor_record.kg_co2_per_unit,
                alpha=alpha_val
            )
            opt_summary, opt_legs = self._evaluate_route(
                opt_nodes, vehicle, factor_record.kg_co2_per_unit
            )

            # Compute Comparison vs Baseline
            dist_diff = round(baseline_summary.total_distance_km - opt_summary.total_distance_km, 2)
            time_diff = round(baseline_summary.total_time_min - opt_summary.total_time_min, 2)
            fuel_saved = round(baseline_summary.total_fuel_l - opt_summary.total_fuel_l, 2)
            co2_saved = round(baseline_summary.total_co2_kg - opt_summary.total_co2_kg, 2)
            
            if baseline_summary.total_co2_kg <= 0:
                co2_reduction_pct = 0.0
            else:
                co2_reduction_pct = round(((baseline_summary.total_co2_kg - opt_summary.total_co2_kg) / baseline_summary.total_co2_kg) * 100.0, 2)

            comp = RouteComparison(
                distance_difference_km=dist_diff,
                time_difference_min=time_diff,
                fuel_saved_l=fuel_saved,
                co2_saved_kg=co2_saved,
                co2_reduction_percentage=co2_reduction_pct
            )

            db_route = self._save_route_to_db(route_type, vehicle.id, opt_summary, opt_legs)

            option = ParetoRouteOption(
                route_type=route_type,
                alpha=alpha_val,
                stops=opt_summary.stops,
                total_distance_km=opt_summary.total_distance_km,
                total_time_min=opt_summary.total_time_min,
                total_fuel_l=opt_summary.total_fuel_l,
                total_co2_kg=opt_summary.total_co2_kg,
                comparison=comp,
                route_id=db_route.id,
                is_pareto_optimal=True
            )
            route_options.append(option)

        # 8. Compute Pareto Frontier
        pareto_frontier = find_pareto_routes(route_options)

        return ParetoResponse(
            vehicle_id=vehicle.id,
            baseline=baseline_summary,
            routes=route_options,
            pareto_frontier=pareto_frontier
        )

    def _evaluate_route(
        self,
        nodes: List[RouteNode],
        vehicle: Vehicle,
        emission_factor_kg_co2: float
    ) -> Tuple[RouteSummary, List[Dict[str, Any]]]:
        stops: List[RouteStop] = []
        legs_data: List[Dict[str, Any]] = []

        total_distance = 0.0
        total_time = 0.0
        total_fuel = 0.0
        total_co2 = 0.0

        current_load = 0.0
        cum_time = 0.0

        for i, node in enumerate(nodes):
            current_load = max(0.0, current_load + node.weight_delta)
            
            if i == 0:
                stops.append(RouteStop(
                    sequence=1,
                    type=node.node_type,
                    shipment_id=node.shipment_id,
                    location_name=node.location_name,
                    latitude=node.lat,
                    longitude=node.lng,
                    arrival_time_min=0.0,
                    load_after_stop_kg=current_load
                ))
            else:
                prev_node = nodes[i - 1]
                dist = self.routing_service.distance_km(
                    prev_node.lat, prev_node.lng, node.lat, node.lng, prev_node.location_name, node.location_name
                )
                tm = self.routing_service.travel_time_min(
                    prev_node.lat, prev_node.lng, node.lat, node.lng, prev_node.location_name, node.location_name
                )

                leg_eval = evaluate_leg_emissions(
                    distance_km=dist,
                    travel_time_min=tm,
                    current_load_kg=current_load,
                    capacity_kg=vehicle.capacity_kg,
                    fuel_efficiency_km_per_l=vehicle.fuel_efficiency_km_per_l,
                    emission_factor_kg_co2=emission_factor_kg_co2
                )

                total_distance += dist
                total_time += tm
                total_fuel += leg_eval["fuel_l"]
                total_co2 += leg_eval["co2_kg"]
                cum_time += tm

                stops.append(RouteStop(
                    sequence=i + 1,
                    type=node.node_type,
                    shipment_id=node.shipment_id,
                    location_name=node.location_name,
                    latitude=node.lat,
                    longitude=node.lng,
                    arrival_time_min=round(cum_time, 1),
                    load_after_stop_kg=round(current_load, 1)
                ))

                legs_data.append({
                    "sequence": i,
                    "from_name": prev_node.location_name,
                    "from_lat": prev_node.lat,
                    "from_lng": prev_node.lng,
                    "to_name": node.location_name,
                    "to_lat": node.lat,
                    "to_lng": node.lng,
                    "distance_km": dist,
                    "time_min": tm,
                    "load_kg": current_load,
                    "fuel_l": leg_eval["fuel_l"],
                    "co2_kg": leg_eval["co2_kg"],
                    "mode": "ROAD"
                })

        summary = RouteSummary(
            stops=stops,
            total_distance_km=round(total_distance, 2),
            total_time_min=round(total_time, 1),
            total_fuel_l=round(total_fuel, 2),
            total_co2_kg=round(total_co2, 2)
        )
        return summary, legs_data

    def _save_route_to_db(
        self,
        route_type: str,
        vehicle_id: int,
        summary: RouteSummary,
        legs_data: List[Dict[str, Any]]
    ) -> Route:
        route_record = Route(
            vehicle_id=vehicle_id,
            route_type=route_type,
            total_distance_km=summary.total_distance_km,
            total_time_min=summary.total_time_min,
            total_fuel_l=summary.total_fuel_l,
            total_co2_kg=summary.total_co2_kg
        )
        self.db.add(route_record)
        self.db.flush()

        for leg in legs_data:
            leg_record = RouteLeg(
                route_id=route_record.id,
                sequence=leg["sequence"],
                from_name=leg["from_name"],
                from_lat=leg["from_lat"],
                from_lng=leg["from_lng"],
                to_name=leg["to_name"],
                to_lat=leg["to_lat"],
                to_lng=leg["to_lng"],
                distance_km=leg["distance_km"],
                time_min=leg["time_min"],
                load_kg=leg["load_kg"],
                fuel_l=leg["fuel_l"],
                co2_kg=leg["co2_kg"],
                mode=leg["mode"]
            )
            self.db.add(leg_record)

        self.db.commit()
        return route_record

