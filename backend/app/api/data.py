"""
Data Router — Fleets, Vehicles, and Shipments (Multi-Tenant Filtered)
"""

from typing import Dict, Any
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from backend.app.db.database import get_db
from backend.app.db.models import Fleet, Vehicle, Shipment, Organization
from backend.app.core.auth import get_current_tenant

router = APIRouter()


@router.get("/fleets")
def get_fleets(
    current_tenant: Dict[str, Any] = Depends(get_current_tenant),
    db: Session = Depends(get_db),
):
    tenant_id = current_tenant["tenant_id"]
    fleets = db.query(Fleet).filter(Fleet.tenant_id == tenant_id).all()
    org = db.query(Organization).filter(Organization.id == tenant_id).first()
    return {
        "tenant_id": tenant_id,
        "company_name": current_tenant["company_name"],
        "depot": {
            "city": org.depot_city if org else "Seattle, WA",
            "lat": org.depot_lat if org else 47.5952,
            "lng": org.depot_lng if org else -122.3316,
        },
        "fleets": fleets,
    }


@router.get("/vehicles")
def get_vehicles(
    current_tenant: Dict[str, Any] = Depends(get_current_tenant),
    db: Session = Depends(get_db),
):
    tenant_id = current_tenant["tenant_id"]
    vehicles = db.query(Vehicle).filter(Vehicle.tenant_id == tenant_id).all()
    return {"tenant_id": tenant_id, "vehicles": vehicles}


@router.get("/shipments")
def get_shipments(
    current_tenant: Dict[str, Any] = Depends(get_current_tenant),
    db: Session = Depends(get_db),
):
    tenant_id = current_tenant["tenant_id"]
    shipments = db.query(Shipment).filter(Shipment.tenant_id == tenant_id).all()
    return {"tenant_id": tenant_id, "shipments": shipments}
