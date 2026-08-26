import pytest
from fastapi import HTTPException
from backend.app.core.auth import (
    create_tenant_jwt,
    verify_jwt_token,
    get_current_tenant,
)


def test_jwt_generation_and_verification_company_a():
    res = create_tenant_jwt("A")
    assert "access_token" in res
    assert res["tenant_id"] == "tenant-northwind"

    payload = verify_jwt_token(res["access_token"])
    assert payload["tenant_id"] == "tenant-northwind"
    assert payload["company_name"] == "Northwind Logistics"


def test_jwt_generation_and_verification_company_b():
    res = create_tenant_jwt("B")
    assert res["tenant_id"] == "tenant-apex"

    payload = verify_jwt_token(res["access_token"])
    assert payload["tenant_id"] == "tenant-apex"
    assert payload["company_name"] == "Apex Freight"


def test_invalid_token_rejection():
    with pytest.raises(HTTPException) as exc_info:
        verify_jwt_token("invalid.token.payload")
    assert exc_info.value.status_code == 401
