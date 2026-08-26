"""
Job Status Polling Router — /api/v1/jobs/{id}
"""

import json
from typing import Dict, Any
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from backend.app.db.database import get_db
from backend.app.db.models import OptimizationJob
from backend.app.core.auth import get_current_tenant

router = APIRouter()


@router.get("/{job_id}")
def get_job_status(
    job_id: str,
    current_tenant: Dict[str, Any] = Depends(get_current_tenant),
    db: Session = Depends(get_db),
):
    """
    Polls status of optimization job.
    Enforces tenant ownership check.
    """
    tenant_id = current_tenant["tenant_id"]
    job = (
        db.query(OptimizationJob)
        .filter(OptimizationJob.id == job_id, OptimizationJob.tenant_id == tenant_id)
        .first()
    )

    if not job:
        raise HTTPException(status_code=404, detail="Job not found or access denied.")

    result = json.loads(job.result_json) if job.result_json else None

    return {
        "job_id": job.id,
        "tenant_id": job.tenant_id,
        "status": job.status,
        "alpha": job.alpha,
        "created_at": job.created_at.isoformat() if job.created_at else None,
        "completed_at": job.completed_at.isoformat() if job.completed_at else None,
        "result": result,
        "error": job.error,
    }
