"""
Route Optimization Router — /api/v1/routes/optimize & /api/v1/routes/pareto
"""

import json
import uuid
from datetime import datetime, timezone
from typing import Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from backend.app.db.database import get_db
from backend.app.db.models import OptimizationJob, Vehicle, Shipment, Organization
from backend.app.schemas.domain import OptimizeRouteRequest
from backend.app.core.auth import get_current_tenant
from backend.app.core.optimizer import optimize_route_vrp

router = APIRouter()


def process_optimization_job(job_id: str):
    """Background task executor for route optimization job."""
    from backend.app.db.database import SessionLocal
    db = SessionLocal()
    try:
        job = db.query(OptimizationJob).filter(OptimizationJob.id == job_id).first()
        if not job:
            return

        job.status = "processing"
        db.commit()

        tenant_id = job.tenant_id
        org = db.query(Organization).filter(Organization.id == tenant_id).first()
        vehicle = db.query(Vehicle).filter(Vehicle.id == job.vehicle_id, Vehicle.tenant_id == tenant_id).first()

        depot_stop = {
            "id": "depot",
            "title": f"{org.name if org else 'Company'} Depot",
            "lat": org.depot_lat if org else 28.6139,
            "lng": org.depot_lng if org else 77.2090,
            "stop_type": "depot",
            "load_kg": 0.0,
        }

        shipment_ids = json.loads(job.shipment_ids_json)
        shipments = db.query(Shipment).filter(
            Shipment.tenant_id == tenant_id,
            Shipment.id.in_(shipment_ids)
        ).all()

        stops = []
        for s in shipments:
            stops.append({
                "id": s.id,
                "title": s.title,
                "dest_name": s.dest_name,
                "lat": s.dest_lat,
                "lng": s.dest_lng,
                "stop_type": "delivery",
                "load_kg": s.weight_kg,
            })

        vehicle_type = vehicle.vehicle_type if vehicle else "heavy_truck"
        opt_res = optimize_route_vrp(
            depot=depot_stop,
            stops=stops,
            vehicle_type=vehicle_type,
            alpha=job.alpha,
        )

        job.status = "completed"
        job.result_json = json.dumps(opt_res)
        job.completed_at = datetime.now(timezone.utc)
        db.commit()

    except Exception as e:
        if job:
            job.status = "failed"
            job.error = str(e)
            db.commit()
    finally:
        db.close()


@router.post("/optimize")
def request_route_optimization(
    req: OptimizeRouteRequest,
    background_tasks: BackgroundTasks,
    current_tenant: Dict[str, Any] = Depends(get_current_tenant),
    db: Session = Depends(get_db),
):
    """
    Submits route optimization job for async queue.
    Tenant is strictly verified server-side from JWT.
    """
    tenant_id = current_tenant["tenant_id"]

    job_id = f"job-{uuid.uuid4().hex[:8]}"
    job = OptimizationJob(
        id=job_id,
        tenant_id=tenant_id,
        status="pending",
        vehicle_id=req.vehicle_id,
        shipment_ids_json=json.dumps(req.shipment_ids),
        alpha=req.alpha,
    )
    db.add(job)
    db.commit()

    # Execute background worker task immediately
    background_tasks.add_task(process_optimization_job, job_id)

    return {
        "job_id": job_id,
        "status": "pending",
        "message": "Route optimization job queued successfully.",
    }


@router.get("/pareto")
def get_pareto_curve(
    vehicle_id: str,
    shipment_ids: str,  # comma-separated list
    current_tenant: Dict[str, Any] = Depends(get_current_tenant),
    db: Session = Depends(get_db),
):
    """
    Returns Pareto frontier points (time vs CO2) across alpha = 0 -> 1.
    """
    tenant_id = current_tenant["tenant_id"]
    org = db.query(Organization).filter(Organization.id == tenant_id).first()
    vehicle = db.query(Vehicle).filter(Vehicle.id == vehicle_id, Vehicle.tenant_id == tenant_id).first()

    s_list = [s.strip() for s in shipment_ids.split(",") if s.strip()]
    shipments = db.query(Shipment).filter(
        Shipment.tenant_id == tenant_id,
        Shipment.id.in_(s_list)
    ).all()

    depot_stop = {
        "id": "depot",
        "title": f"{org.name if org else 'Company'} Depot",
        "lat": org.depot_lat if org else 28.6139,
        "lng": org.depot_lng if org else 77.2090,
        "stop_type": "depot",
        "load_kg": 0.0,
    }

    stops = [
        {
            "id": s.id,
            "title": s.title,
            "dest_name": s.dest_name,
            "lat": s.dest_lat,
            "lng": s.dest_lng,
            "stop_type": "delivery",
            "load_kg": s.weight_kg,
        }
        for s in shipments
    ]

    vehicle_type = vehicle.vehicle_type if vehicle else "heavy_truck"
    res = optimize_route_vrp(depot=depot_stop, stops=stops, vehicle_type=vehicle_type, alpha=0.5)

    return {
        "tenant_id": tenant_id,
        "vehicle_id": vehicle_id,
        "pareto_points": res["pareto_points"],
    }
