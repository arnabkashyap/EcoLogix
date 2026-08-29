from typing import List, Optional
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app.models.vehicle import Vehicle
from app.models.shipment import Shipment
from app.models.load_pool_match import LoadPoolMatch
from app.load_pooling.matcher import LoadPoolingMatcher
from app.load_pooling.schemas import (
    LoadPoolMatchRequest,
    LoadPoolMatchResponse,
    LoadPoolMatchItem,
    ReturnRouteSummary,
    MatchStatusResponse,
)
from app.load_pooling.constants import (
    STATUS_CANDIDATE,
    STATUS_ACCEPTED,
    STATUS_REJECTED,
    STATUS_COMPLETED,
)

class LoadPoolingService:
    def __init__(self, db: Session):
        self.db = db
        self.matcher = LoadPoolingMatcher(db)

    def find_matches(self, req: LoadPoolMatchRequest) -> LoadPoolMatchResponse:
        vehicle_id = int(req.vehicle_id)

        # 1. Fetch Vehicle
        vehicle = self.db.query(Vehicle).filter(Vehicle.id == vehicle_id).first()
        if not vehicle:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Vehicle with ID '{vehicle_id}' not found"
            )

        # 2. Resolve Return Route
        return_route_data = self.matcher.resolve_return_route(vehicle)
        (origin_name, origin_lat, origin_lng, dest_name, dest_lat, dest_lng, empty_dist) = return_route_data

        return_route_summary = ReturnRouteSummary(
            origin=origin_name,
            destination=dest_name,
            distance_km=empty_dist
        )

        # 3. Fetch Candidate Shipments
        query = self.db.query(Shipment)
        if req.shipment_ids:
            s_ids = [int(s) for s in req.shipment_ids]
            shipments = query.filter(Shipment.id.in_(s_ids)).all()
        else:
            shipments = query.filter(Shipment.status == "PENDING").all()

        match_items: List[LoadPoolMatchItem] = []

        # 4. Evaluate & Persist Matches
        for s in shipments:
            match_item = self.matcher.evaluate_shipment_match(vehicle, s, return_route_data)

            # Check if match record already exists in database
            existing_match = self.db.query(LoadPoolMatch).filter(
                LoadPoolMatch.vehicle_id == vehicle.id,
                LoadPoolMatch.shipment_id == s.id
            ).first()

            if existing_match:
                existing_match.empty_distance_km = match_item.empty_distance_km
                existing_match.co2_saved_kg = match_item.co2_saved_kg
                existing_match.cost_saved = match_item.cost_saved
                existing_match.match_score = match_item.match_score
                if existing_match.status == STATUS_CANDIDATE and not match_item.is_eligible:
                    existing_match.status = STATUS_REJECTED
                match_record = existing_match
            else:
                match_record = LoadPoolMatch(
                    vehicle_id=vehicle.id,
                    shipment_id=s.id,
                    empty_distance_km=match_item.empty_distance_km,
                    co2_saved_kg=match_item.co2_saved_kg,
                    cost_saved=match_item.cost_saved,
                    match_score=match_item.match_score,
                    status=match_item.status
                )
                self.db.add(match_record)

            self.db.flush()
            match_item.match_id = match_record.id
            match_item.status = match_record.status
            match_items.append(match_item)

        self.db.commit()

        # Sort matches by match_score descending
        match_items.sort(key=lambda x: x.match_score, reverse=True)

        return LoadPoolMatchResponse(
            vehicle_id=vehicle.id,
            return_route=return_route_summary,
            matches=match_items
        )

    def accept_match(self, match_id: int) -> MatchStatusResponse:
        match_record = self.db.query(LoadPoolMatch).filter(LoadPoolMatch.id == match_id).first()
        if not match_record:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Load pool match with ID '{match_id}' not found"
            )

        if match_record.status == STATUS_ACCEPTED:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Match #{match_id} has already been accepted and cannot be accepted twice"
            )

        shipment = self.db.query(Shipment).filter(Shipment.id == match_record.shipment_id).first()
        if not shipment:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Shipment with ID '{match_record.shipment_id}' not found"
            )

        vehicle = self.db.query(Vehicle).filter(Vehicle.id == match_record.vehicle_id).first()
        if not vehicle:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Vehicle with ID '{match_record.vehicle_id}' not found"
            )

        # Validate shipment state
        if shipment.status in ["ASSIGNED", "COMPLETED"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Shipment '{shipment.id}' is already assigned or completed and cannot be accepted twice"
            )

        # Validate capacity
        if shipment.weight_kg > vehicle.capacity_kg:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Shipment weight ({shipment.weight_kg} kg) exceeds vehicle capacity ({vehicle.capacity_kg} kg)"
            )

        # Accept match and assign shipment
        match_record.status = STATUS_ACCEPTED
        shipment.status = "ASSIGNED"
        self.db.commit()

        return MatchStatusResponse(
            match_id=match_record.id,
            vehicle_id=match_record.vehicle_id,
            shipment_id=match_record.shipment_id,
            status=STATUS_ACCEPTED,
            message=f"Match #{match_id} accepted successfully. Shipment #{shipment.id} assigned to Vehicle #{vehicle.id}."
        )

    def reject_match(self, match_id: int) -> MatchStatusResponse:
        match_record = self.db.query(LoadPoolMatch).filter(LoadPoolMatch.id == match_id).first()
        if not match_record:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Load pool match with ID '{match_id}' not found"
            )

        match_record.status = STATUS_REJECTED
        self.db.commit()

        return MatchStatusResponse(
            match_id=match_record.id,
            vehicle_id=match_record.vehicle_id,
            shipment_id=match_record.shipment_id,
            status=STATUS_REJECTED,
            message=f"Match #{match_id} rejected successfully."
        )

    def get_match_by_id(self, match_id: int) -> LoadPoolMatchItem:
        match_record = self.db.query(LoadPoolMatch).filter(LoadPoolMatch.id == match_id).first()
        if not match_record:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Load pool match with ID '{match_id}' not found"
            )

        vehicle = self.db.query(Vehicle).filter(Vehicle.id == match_record.vehicle_id).first()
        shipment = self.db.query(Shipment).filter(Shipment.id == match_record.shipment_id).first()

        if not vehicle or not shipment:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Associated vehicle or shipment for match not found"
            )

        return_route_data = self.matcher.resolve_return_route(vehicle)
        item = self.matcher.evaluate_shipment_match(vehicle, shipment, return_route_data)
        item.match_id = match_record.id
        item.status = match_record.status

        return item
