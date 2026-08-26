"""
EcoLogix Auth & Tenant Isolation Middleware

Strictly enforces server-side extraction of tenant_id from verified JWT headers.
No endpoint accepts tenant_id from request params or request body.
"""

import time
from typing import Dict, Any, Optional
import jwt
from fastapi import HTTPException, Security, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

JWT_SECRET = "ecologix_hackathon_super_secret_jwt_key_2026"
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_SECONDS = 86400 * 7  # 7 days

security = HTTPBearer(auto_error=False)

TENANT_CONFIG = {
    "A": {
        "tenant_id": "tenant-northwind",
        "company_name": "Northwind Logistics",
        "role": "Dispatcher",
        "depot_city": "Seattle, WA",
    },
    "B": {
        "tenant_id": "tenant-apex",
        "company_name": "Apex Freight",
        "role": "Operations Manager",
        "depot_city": "Tacoma, WA",
    },
}

# Reverse lookup for convenience in dev-login
TENANT_BY_ID = {
    "tenant-northwind": TENANT_CONFIG["A"],
    "tenant-apex": TENANT_CONFIG["B"],
}


def create_tenant_jwt(company_key: str) -> Dict[str, Any]:
    """Generates a signed JWT for company 'A' or 'B' (or tenant_id directly)."""
    key_upper = company_key.upper() if isinstance(company_key, str) else "A"
    
    if key_upper in TENANT_CONFIG:
        config = TENANT_CONFIG[key_upper]
    elif company_key in TENANT_BY_ID:
        config = TENANT_BY_ID[company_key]
    else:
        # Default fallback for invalid dev keys
        config = TENANT_CONFIG["A"]

    payload = {
        "sub": f"user-{config['tenant_id']}",
        "tenant_id": config["tenant_id"],
        "company_name": config["company_name"],
        "role": config["role"],
        "iat": int(time.time()),
        "exp": int(time.time()) + JWT_EXPIRATION_SECONDS,
    }

    token = jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)
    return {
        "access_token": token,
        "token_type": "bearer",
        "tenant_id": config["tenant_id"],
        "company_name": config["company_name"],
        "expires_in": JWT_EXPIRATION_SECONDS,
    }


def verify_jwt_token(token: str) -> Dict[str, Any]:
    """Verifies and decodes JWT token, returning payload."""
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token signature expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid authorization token")


def get_current_tenant(
    credentials: Optional[HTTPAuthorizationCredentials] = Security(security),
) -> Dict[str, Any]:
    """
    Dependency that enforces JWT authentication and extracts tenant context server-side.
    Returns dict: {"tenant_id": ..., "company_name": ..., "sub": ...}
    """
    if not credentials or not credentials.credentials:
        raise HTTPException(
            status_code=401,
            detail="Missing Authorization header. Please log in via /api/v1/dev-login.",
        )
    return verify_jwt_token(credentials.credentials)
