"""
Dev Auth Router — /api/v1/dev-login
"""

from fastapi import APIRouter
from backend.app.schemas.domain import DevLoginRequest, DevLoginResponse
from backend.app.core.auth import create_tenant_jwt

router = APIRouter()


@router.post("/dev-login", response_model=DevLoginResponse)
def dev_login(req: DevLoginRequest):
    """
    Mock Auth endpoint issuing signed JWT for Company A (Northwind Logistics) or Company B (Apex Freight).
    Proves multi-tenancy data isolation live during demo.
    """
    res = create_tenant_jwt(req.company)
    return res
