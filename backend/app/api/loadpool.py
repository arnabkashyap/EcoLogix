"""
Load Pooling Match Router — /api/v1/loadpool/match
"""

from typing import Dict, Any
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from backend.app.db.database import get_db
from backend.app.core.auth import get_current_tenant
from backend.app.core.matcher import find_load_pool_matches

router = APIRouter()


@router.post("/match")
def match_load_pool(
    current_tenant: Dict[str, Any] = Depends(get_current_tenant),
    db: Session = Depends(get_db),
):
    """
    Triggers cross-tenant load pool matching.
    Tenant is strictly identified via verified JWT.
    Returns matched empty leg opportunities with CO2 and cost saved,
    while proving strict data boundary isolation (partner internal details hidden).
    """
    tenant_id = current_tenant["tenant_id"]
    res = find_load_pool_matches(tenant_id, db)
    matches = res["matches"]
    rejected_candidates = res.get("rejected_candidates", [])
    return {
        "tenant_id": tenant_id,
        "requesting_company": current_tenant["company_name"],
        "match_count": len(matches),
        "matches": matches,
        "rejected_candidates": rejected_candidates,
    }
