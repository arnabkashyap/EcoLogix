"""
Impact Summary Router — /api/v1/impact/summary
Provides cumulative ESG impact metrics for the active tenant.
"""

import json
from typing import Dict, Any
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from backend.app.db.database import get_db
from backend.app.db.models import OptimizationJob, LoadPoolMatch
from backend.app.core.auth import get_current_tenant

router = APIRouter()

# Conversion factor: ~21 kg CO2 absorbed per tree per year (US EPA / Arbor Day Foundation standard estimate)
CO2_KG_PER_TREE_YEAR = 21.0


@router.get("/summary")
def get_impact_summary(
    current_tenant: Dict[str, Any] = Depends(get_current_tenant),
    db: Session = Depends(get_db),
):
    """
    Returns tenant-scoped cumulative ESG impact summary:
    - total_routes_optimized
    - total_co2_saved_kg (from route optimization)
    - total_load_pool_matches
    - total_co2_saved_from_pooling_kg
    - combined_total_co2_saved_kg
    - equivalent_trees_planted
    """
    tenant_id = current_tenant["tenant_id"]

    # 1. Route Optimization Stats
    completed_jobs = (
        db.query(OptimizationJob)
        .filter(OptimizationJob.tenant_id == tenant_id, OptimizationJob.status == "completed")
        .all()
    )

    total_routes_optimized = len(completed_jobs)
    total_co2_saved_kg = 0.0

    for job in completed_jobs:
        if job.result_json:
            try:
                res = json.loads(job.result_json)
                baseline = float(res.get("baseline_co2_kg", 0.0))
                actual = float(res.get("total_co2_kg", 0.0))
                saved = max(0.0, baseline - actual)
                total_co2_saved_kg += saved
            except Exception:
                pass

    total_co2_saved_kg = round(total_co2_saved_kg, 2)

    # 2. Load Pooling Stats
    pool_matches = (
        db.query(LoadPoolMatch)
        .filter(LoadPoolMatch.tenant_id == tenant_id)
        .all()
    )

    total_load_pool_matches = len(pool_matches)
    total_co2_saved_from_pooling_kg = round(
        sum(m.co2_saved_kg for m in pool_matches), 2
    )

    # 3. Combined & Equivalency
    combined_total_co2_saved_kg = round(
        total_co2_saved_kg + total_co2_saved_from_pooling_kg, 2
    )

    equivalent_trees_planted = round(
        combined_total_co2_saved_kg / CO2_KG_PER_TREE_YEAR, 1
    )

    return {
        "tenant_id": tenant_id,
        "company_name": current_tenant["company_name"],
        "total_routes_optimized": total_routes_optimized,
        "total_co2_saved_kg": total_co2_saved_kg,
        "total_load_pool_matches": total_load_pool_matches,
        "total_co2_saved_from_pooling_kg": total_co2_saved_from_pooling_kg,
        "combined_total_co2_saved_kg": combined_total_co2_saved_kg,
        "equivalent_trees_planted": equivalent_trees_planted,
        "tree_equivalence_factor_note": f"Based on {CO2_KG_PER_TREE_YEAR} kg CO₂ absorbed per tree per year (US EPA standard estimate).",
    }
