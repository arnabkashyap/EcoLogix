from typing import Optional, List
from sqlalchemy.orm import Session
from app.decision_engine.schemas import (
    RecommendationRequest,
    RecommendationResponse,
    FleetOpportunitiesResponse,
    FleetOpportunityItem,
)
from app.decision_engine.decision_engine import DecisionEngine
from app.optimization.service import RouteOptimizationService
from app.optimization.models import ParetoRequest
from app.models.vehicle import Vehicle
from app.models.shipment import Shipment
from app.models.load_pool_match import LoadPoolMatch
from app.models.route import Route

class DecisionService:
    def __init__(self):
        self.engine = DecisionEngine()

    def get_recommendation(
        self,
        payload: RecommendationRequest,
        db: Optional[Session] = None
    ) -> RecommendationResponse:
        # If payload already includes explicit Pareto routes and baseline, evaluate directly
        if payload.baseline and payload.routes:
            return self.engine.evaluate(payload)

        # Otherwise, if DB session is available, generate Pareto routes dynamically for vehicle_id
        if db is not None:
            # Parse vehicle ID
            v_id = payload.vehicle_id
            try:
                v_id = int(v_id)
            except (ValueError, TypeError):
                # Fallback to first vehicle in DB
                v = db.query(Vehicle).first()
                v_id = v.id if v else 10

            # Find shipments for this vehicle or pending shipments
            shipments = db.query(Shipment).filter(Shipment.status == "PENDING").all()
            if not shipments:
                shipments = db.query(Shipment).all()

            shipment_ids = [s.id for s in shipments[:3]]
            if shipment_ids:
                try:
                    opt_service = RouteOptimizationService(db)
                    pareto_res = opt_service.optimize_pareto(
                        ParetoRequest(vehicle_id=v_id, shipment_ids=shipment_ids)
                    )
                    payload.baseline = pareto_res.baseline
                    payload.routes = pareto_res.routes
                    payload.vehicle_id = f"TR-0{v_id}" if isinstance(v_id, int) and v_id < 10 else f"TR-{v_id}"
                    return self.engine.evaluate(payload)
                except Exception as e:
                    print(f"Pareto generation warning: {e}")

        # Fallback evaluation if no DB or optimization failed
        return self.engine.evaluate(payload)

    def get_fleet_opportunities(self, db: Session) -> FleetOpportunitiesResponse:
        opportunities: List[FleetOpportunityItem] = []

        # 1. Check Load Pool Matches
        matches = db.query(LoadPoolMatch).all()
        for m in matches:
            if m.status in ["PROPOSED", "CANDIDATE", "ACCEPTED"]:
                v_label = f"TR-0{m.vehicle_id}" if m.vehicle_id < 10 else f"TR-{m.vehicle_id}"
                opportunities.append(FleetOpportunityItem(
                    vehicle_id=v_label,
                    opportunity_type="RETURN_LOAD",
                    title="Return-load opportunity available",
                    description=f"Potential CO₂ reduction of {m.co2_saved_kg:.1f} kg on empty return leg.",
                    action_label="FIND RETURN LOAD"
                ))

        # 2. Check Routes Optimized
        opt_routes = db.query(Route).filter(Route.route_type.in_(["BALANCED", "GREENEST", "OPTIMIZED"])).all()
        for r in opt_routes:
            v_label = f"TR-0{r.vehicle_id}" if r.vehicle_id < 10 else f"TR-{r.vehicle_id}"
            if not any(o.vehicle_id == v_label and o.opportunity_type == "OPTIMIZATION_AVAILABLE" for o in opportunities):
                opportunities.append(FleetOpportunityItem(
                    vehicle_id=v_label,
                    opportunity_type="OPTIMIZATION_AVAILABLE",
                    title="Route optimization available",
                    description=f"Pareto optimization calculated ({r.route_type} option).",
                    action_label="OPTIMIZE A ROUTE"
                ))

        # 3. Check Fleet Vehicles with Available Capacity
        idle_vehicles = db.query(Vehicle).filter(Vehicle.status.in_(["IDLE", "ACTIVE"])).all()
        for v in idle_vehicles:
            v_label = f"TR-0{v.id}" if v.id < 10 else f"TR-{v.id}"
            if not any(o.vehicle_id == v_label for o in opportunities):
                opportunities.append(FleetOpportunityItem(
                    vehicle_id=v_label,
                    opportunity_type="CAPACITY_AVAILABLE",
                    title="Capacity available",
                    description=f"{v.capacity_kg:.0f} kg capacity ready for cargo consolidation.",
                    action_label="OPTIMIZE A ROUTE"
                ))

        # Truncate to top opportunities
        opportunities = opportunities[:5]

        return FleetOpportunitiesResponse(
            opportunities=opportunities,
            count=len(opportunities)
        )

