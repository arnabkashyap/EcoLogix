import math
from typing import List, Dict, Any, Tuple, Optional
from ortools.constraint_solver import routing_enums_pb2
from ortools.constraint_solver import pywrapcp

from app.optimization.routing import RoutingService
from app.optimization.cost_function import compute_weighted_objective

class RouteNode:
    def __init__(self, node_id: int, node_type: str, location_name: str, lat: float, lng: float, shipment_id: Optional[int] = None, weight_delta: float = 0.0):
        self.node_id = node_id
        self.node_type = node_type  # DEPOT, PICKUP, DELIVERY
        self.location_name = location_name
        self.lat = lat
        self.lng = lng
        self.shipment_id = shipment_id
        self.weight_delta = weight_delta

class RouteOptimizer:
    def __init__(self, routing_service: RoutingService = None):
        self.routing_service = routing_service or RoutingService()

    def optimize_route(
        self,
        depot_location: Tuple[str, float, float],
        shipments: List[Dict[str, Any]],
        vehicle_capacity_kg: float,
        fuel_efficiency_km_per_l: float,
        emission_factor_kg_co2: float,
        alpha: float = 0.5
    ) -> List[RouteNode]:
        """
        Generates an optimized stop sequence using Google OR-Tools.

        depot_location: (location_name, lat, lng)
        shipments: list of dicts with keys:
            id, pickup_name, pickup_lat, pickup_lng, destination_name, destination_lat, destination_lng, weight_kg
        """
        if not shipments:
            depot_node = RouteNode(
                node_id=0,
                node_type="DEPOT",
                location_name=depot_location[0],
                lat=depot_location[1],
                lng=depot_location[2],
                weight_delta=0.0
            )
            return [depot_node]

        # Build list of nodes
        nodes: List[RouteNode] = []
        
        # Node 0: Depot
        depot_node = RouteNode(
            node_id=0,
            node_type="DEPOT",
            location_name=depot_location[0],
            lat=depot_location[1],
            lng=depot_location[2],
            weight_delta=0.0
        )
        nodes.append(depot_node)

        # Map shipment pickups and deliveries
        shipment_pair_indices = []
        node_counter = 1
        for shp in shipments:
            pickup_idx = node_counter
            p_node = RouteNode(
                node_id=pickup_idx,
                node_type="PICKUP",
                location_name=shp["pickup_name"],
                lat=shp["pickup_lat"],
                lng=shp["pickup_lng"],
                shipment_id=shp["id"],
                weight_delta=shp["weight_kg"]
            )
            nodes.append(p_node)
            node_counter += 1

            delivery_idx = node_counter
            d_node = RouteNode(
                node_id=delivery_idx,
                node_type="DELIVERY",
                location_name=shp["destination_name"],
                lat=shp["destination_lat"],
                lng=shp["destination_lng"],
                shipment_id=shp["id"],
                weight_delta=-shp["weight_kg"]
            )
            nodes.append(d_node)
            node_counter += 1

            shipment_pair_indices.append((pickup_idx, delivery_idx))

        num_nodes = len(nodes)

        # Compute Distance and Travel Time matrices
        distance_matrix = [[0.0] * num_nodes for _ in range(num_nodes)]
        time_matrix = [[0.0] * num_nodes for _ in range(num_nodes)]
        max_time_scale = 1.0
        max_co2_scale = 1.0

        for i in range(num_nodes):
            for j in range(num_nodes):
                if i != j:
                    dist = self.routing_service.distance_km(
                        nodes[i].lat, nodes[i].lng,
                        nodes[j].lat, nodes[j].lng,
                        nodes[i].location_name, nodes[j].location_name
                    )
                    tm = self.routing_service.travel_time_min(
                        nodes[i].lat, nodes[i].lng,
                        nodes[j].lat, nodes[j].lng,
                        nodes[i].location_name, nodes[j].location_name
                    )
                    distance_matrix[i][j] = dist
                    time_matrix[i][j] = tm
                    if tm > max_time_scale:
                        max_time_scale = tm
                    co2_est = (dist / fuel_efficiency_km_per_l if fuel_efficiency_km_per_l > 0 else 0.0) * emission_factor_kg_co2
                    if co2_est > max_co2_scale:
                        max_co2_scale = co2_est

        # OR-Tools Routing Model Setup
        manager = pywrapcp.RoutingIndexManager(num_nodes, 1, [0], [0])
        routing = pywrapcp.RoutingModel(manager)


        # Cost evaluator callback
        def cost_callback(from_index, to_index):
            from_node = manager.IndexToNode(from_index)
            to_node = manager.IndexToNode(to_index)
            
            # If returning to depot after visits, 0 cost for open route completion
            if to_node == 0 and from_node != 0:
                return 0

            dist = distance_matrix[from_node][to_node]
            tm = time_matrix[from_node][to_node]
            co2_est = (dist / fuel_efficiency_km_per_l if fuel_efficiency_km_per_l > 0 else 0.0) * emission_factor_kg_co2

            obj_cost = compute_weighted_objective(
                tm, co2_est, alpha, max_time_scale, max_co2_scale
            )
            return int(obj_cost * 100000)

        transit_callback_index = routing.RegisterTransitCallback(cost_callback)
        routing.SetArcCostEvaluatorOfAllVehicles(transit_callback_index)

        # Add Capacity dimension
        demands = [int(n.weight_delta) for n in nodes]
        def demand_callback(from_index):
            from_node = manager.IndexToNode(from_index)
            return demands[from_node]

        demand_callback_index = routing.RegisterUnaryTransitCallback(demand_callback)
        routing.AddDimension(
            demand_callback_index,
            0,  # null capacity slack
            int(vehicle_capacity_kg),  # vehicle max capacity
            True,  # start cumulative to zero
            "Capacity"
        )

        # Add Time dimension for precedence ordering
        def time_callback(from_index, to_index):
            from_node = manager.IndexToNode(from_index)
            to_node = manager.IndexToNode(to_index)
            return int(time_matrix[from_node][to_node])

        time_transit_callback_index = routing.RegisterTransitCallback(time_callback)
        routing.AddDimension(
            time_transit_callback_index,
            100000,  # allow waiting
            1000000,  # max time
            True,
            "Time"
        )
        time_dimension = routing.GetDimensionOrDie("Time")

        # Pickup and Delivery constraints
        solver = routing.solver()
        for p_idx, d_idx in shipment_pair_indices:
            p_node_idx = manager.NodeToIndex(p_idx)
            d_node_idx = manager.NodeToIndex(d_idx)
            routing.AddPickupAndDelivery(p_node_idx, d_node_idx)
            solver.Add(time_dimension.CumulVar(p_node_idx) <= time_dimension.CumulVar(d_node_idx))

        # Search parameters
        search_parameters = pywrapcp.DefaultRoutingSearchParameters()
        search_parameters.first_solution_strategy = (
            routing_enums_pb2.FirstSolutionStrategy.PARALLEL_CHEAPEST_INSERTION
        )

        solution = routing.SolveWithParameters(search_parameters)

        if not solution:
            # Fallback strategy if initial strategy did not find solution
            search_parameters.first_solution_strategy = (
                routing_enums_pb2.FirstSolutionStrategy.PATH_CHEAPEST_ARC
            )
            solution = routing.SolveWithParameters(search_parameters)

        if not solution:
            # If OR-Tools fails to find a solution, fallback to default order
            return nodes

        # Extract sequence from solution
        ordered_nodes: List[RouteNode] = []
        index = routing.Start(0)
        while not routing.IsEnd(index):
            node_idx = manager.IndexToNode(index)
            ordered_nodes.append(nodes[node_idx])
            index = solution.Value(routing.NextVar(index))

        # Check if we should trim the final depot return if start and end are 0
        if len(ordered_nodes) > 1 and ordered_nodes[0].node_id == 0:
            pass  # Starts with depot

        return ordered_nodes
