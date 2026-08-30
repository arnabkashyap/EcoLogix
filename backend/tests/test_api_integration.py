import pytest
from unittest.mock import patch
from fastapi.testclient import TestClient
from backend.app.main import app

client = TestClient(app)

# ---------------------------------------------------------------------------
# Test-session weather mock
# Patches fetch_weather_risk (called per optimizer leg) to return the clear-weather
# fallback immediately — keeps tests fast and network-independent.
# The optimizer code path is fully exercised; only the HTTP call is stubbed.
# ---------------------------------------------------------------------------
WEATHER_CLEAR_FALLBACK = {
    "flood_risk": "low",
    "wind_strength_kmh": 14.5,
    "precipitation_mm": 0.0,
    "weather_condition": "Clear",
    "note": "Test stub: clear weather assumed.",
}


@pytest.fixture(autouse=True, scope="session")
def mock_weather_lookup():
    with patch(
        "backend.app.core.optimizer.fetch_weather_risk",
        return_value=WEATHER_CLEAR_FALLBACK,
    ):
        yield



def test_dev_login_company_a_and_b():
    # Login Company A
    res_a = client.post("/api/v1/dev-login", json={"company": "A"})
    assert res_a.status_code == 200
    data_a = res_a.json()
    assert data_a["tenant_id"] == "tenant-northwind"
    assert "access_token" in data_a

    # Login Company B
    res_b = client.post("/api/v1/dev-login", json={"company": "B"})
    assert res_b.status_code == 200
    data_b = res_b.json()
    assert data_b["tenant_id"] == "tenant-apex"
    assert "access_token" in data_b


def test_tenant_data_isolation():
    # Login Company A
    token_a = client.post("/api/v1/dev-login", json={"company": "A"}).json()["access_token"]
    headers_a = {"Authorization": f"Bearer {token_a}"}

    # Login Company B
    token_b = client.post("/api/v1/dev-login", json={"company": "B"}).json()["access_token"]
    headers_b = {"Authorization": f"Bearer {token_b}"}

    # Fetch shipments for Company A
    ship_a = client.get("/api/v1/shipments", headers=headers_a).json()
    assert ship_a["tenant_id"] == "tenant-northwind"
    ship_a_ids = [s["id"] for s in ship_a["shipments"]]
    assert all("nw" in sid for sid in ship_a_ids)

    # Fetch shipments for Company B
    ship_b = client.get("/api/v1/shipments", headers=headers_b).json()
    assert ship_b["tenant_id"] == "tenant-apex"
    ship_b_ids = [s["id"] for s in ship_b["shipments"]]
    assert all("apex" in sid for sid in ship_b_ids)

    # Verify no overlap
    assert set(ship_a_ids).isdisjoint(set(ship_b_ids))


def test_route_optimization_end_to_end():
    token_a = client.post("/api/v1/dev-login", json={"company": "A"}).json()["access_token"]
    headers_a = {"Authorization": f"Bearer {token_a}"}

    v_res = client.get("/api/v1/vehicles", headers=headers_a).json()
    vehicle_id = v_res["vehicles"][0]["id"]

    s_res = client.get("/api/v1/shipments", headers=headers_a).json()
    shipment_ids = [s["id"] for s in s_res["shipments"][:3]]

    # Submit optimization job
    opt_res = client.post(
        "/api/v1/routes/optimize",
        json={"vehicle_id": vehicle_id, "shipment_ids": shipment_ids, "alpha": 0.5},
        headers=headers_a,
    )
    assert opt_res.status_code == 200
    job_id = opt_res.json()["job_id"]

    # Poll status
    job_status = client.get(f"/api/v1/jobs/{job_id}", headers=headers_a).json()
    assert job_status["status"] in ["pending", "processing", "completed"]
    assert job_status["tenant_id"] == "tenant-northwind"


def test_load_pool_matching():
    token_a = client.post("/api/v1/dev-login", json={"company": "A"}).json()["access_token"]
    headers_a = {"Authorization": f"Bearer {token_a}"}

    match_res = client.post("/api/v1/loadpool/match", json={}, headers=headers_a)
    assert match_res.status_code == 200
    data = match_res.json()
    assert data["tenant_id"] == "tenant-northwind"
    assert data["match_count"] > 0
    match = data["matches"][0]
    assert "co2_saved_kg" in match
    assert match["co2_saved_kg"] > 0
    assert "cost_saved_usd" in match
    assert match["data_boundary_proof"]["is_data_isolated"] is True


def test_impact_summary():
    token_a = client.post("/api/v1/dev-login", json={"company": "A"}).json()["access_token"]
    headers_a = {"Authorization": f"Bearer {token_a}"}

    res = client.get("/api/v1/impact/summary", headers=headers_a)
    assert res.status_code == 200
    data = res.json()
    assert data["tenant_id"] == "tenant-northwind"
    assert data["company_name"] == "Northwind Logistics"
    assert "total_routes_optimized" in data
    assert "total_co2_saved_kg" in data
    assert "total_load_pool_matches" in data
    assert "total_co2_saved_from_pooling_kg" in data
    assert "combined_total_co2_saved_kg" in data
    assert "equivalent_trees_planted" in data
    assert "total_cost_saved_usd" in data
    assert "total_fuel_saved_liters" in data
    assert "tree_equivalence_factor_note" in data
    assert data["combined_total_co2_saved_kg"] >= 0
    assert data["equivalent_trees_planted"] >= 0


def test_impact_summary_zero_state_fresh_tenant():
    from backend.app.core.auth import create_access_token
    token_fresh = create_access_token({"tenant_id": "tenant-fresh-zero", "company_name": "Zero Emissions Freight"})
    headers_fresh = {"Authorization": f"Bearer {token_fresh}"}

    res = client.get("/api/v1/impact/summary", headers=headers_fresh)
    assert res.status_code == 200
    data = res.json()
    assert data["tenant_id"] == "tenant-fresh-zero"
    assert data["company_name"] == "Zero Emissions Freight"
    assert data["total_routes_optimized"] == 0
    assert data["total_co2_saved_kg"] == 0.0
    assert data["total_load_pool_matches"] == 0
    assert data["total_co2_saved_from_pooling_kg"] == 0.0
    assert data["combined_total_co2_saved_kg"] == 0.0
    assert data["equivalent_trees_planted"] == 0.0
    assert data["total_cost_saved_usd"] == 0.0
    assert data["total_fuel_saved_liters"] == 0.0

