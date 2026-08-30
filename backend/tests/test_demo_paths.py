import sys
import os
import json

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.db.seed import seed_database
from backend.app.db.database import SessionLocal
from backend.app.db.models import (
    Organization,
    User,
    Fleet,
    Vehicle,
    Shipment,
    LoadPoolMatch,
    Route,
    RouteLeg,
    OptimizationJob,
)

def test_all_demo_paths():
    # 1. Fresh seed
    seed_database(force=True)
    client = TestClient(app)

    db = SessionLocal()
    try:
        orgs = db.query(Organization).all()
        vehicles = db.query(Vehicle).all()
        shipments = db.query(Shipment).all()
        pool_matches = db.query(LoadPoolMatch).all()
        jobs = db.query(OptimizationJob).all()
        routes = db.query(Route).all()

        assert len(orgs) == 2
        assert len(vehicles) == 10
        assert len(shipments) == 30
        assert len(pool_matches) == 4
        assert len(jobs) == 2
        assert len(routes) == 2
    finally:
        db.close()

    # 2. Auth tokens
    res_a = client.post('/api/v1/dev-login', json={'company': 'A'})
    assert res_a.status_code == 200
    token_a = res_a.json()['access_token']
    headers_a = {'Authorization': f'Bearer {token_a}'}

    res_b = client.post('/api/v1/dev-login', json={'company': 'B'})
    assert res_b.status_code == 200
    token_b = res_b.json()['access_token']
    headers_b = {'Authorization': f'Bearer {token_b}'}

    # 3. Route Optimization & Hazards
    opt_payload = {
        'vehicle_id': 'veh-nw-101',
        'shipment_ids': ['ship-nw-01', 'ship-nw-03', 'ship-nw-06'],
        'alpha': 0.5,
    }
    opt_res = client.post('/api/v1/routes/optimize', json=opt_payload, headers=headers_a)
    assert opt_res.status_code == 200
    job_id = opt_res.json()['job_id']
    job_status = client.get(f'/api/v1/jobs/{job_id}', headers=headers_a).json()
    assert job_status['status'] == 'completed'
    res_json = job_status['result']
    assert res_json['total_distance_km'] > 0
    assert len(res_json['legs']) >= 4
    flagged = [leg for leg in res_json['legs'] if leg.get('climate_risk_flag')]
    assert len(flagged) > 0

    pareto_res = client.get('/api/v1/routes/pareto?vehicle_id=veh-nw-101&shipment_ids=ship-nw-01,ship-nw-03,ship-nw-06', headers=headers_a)
    assert pareto_res.status_code == 200
    assert len(pareto_res.json()['pareto_points']) == 11

    # 4. Load Pooling Matcher
    match_a = client.post('/api/v1/loadpool/match', json={}, headers=headers_a).json()
    assert match_a['match_count'] > 0
    computed_a = [m for m in match_a['matches'] if m.get('source') == 'computed']
    assert len(computed_a) >= 1
    assert computed_a[0]['co2_saved_kg'] > 0
    assert computed_a[0]['cost_saved_usd'] > 0

    match_b = client.post('/api/v1/loadpool/match', json={}, headers=headers_b).json()
    assert match_b['match_count'] > 0

    # 5. Driver Portal
    drv_status = client.get('/api/v1/driver/status').json()
    assert drv_status['status'] == 'online'
    drv_profile = client.get('/api/v1/driver/profile').json()
    assert 'Guwahati' in drv_profile['home_address']

    # 6. EV Comparison
    veh_diesel = client.post('/api/v1/lookup/vehicle', json={'vehicle_name': 'NW Tata Signa Heavy Diesel #101'}).json()
    assert veh_diesel['fuel_type'] == 'diesel'
    assert veh_diesel['capacity_kg'] == 18000.0

    veh_ev = client.post('/api/v1/lookup/vehicle', json={'vehicle_name': 'NW E-Cascadia EV Freightliner #202'}).json()
    assert veh_ev['fuel_type'] == 'electric'
    assert veh_ev['capacity_kg'] == 14000.0

    em_diesel = client.post('/api/v1/emissions/estimate', json={'vehicle_type': 'heavy_truck', 'distance_km': 80.0, 'load_factor': 0.5, 'congestion_index': 0.2}).json()
    em_ev = client.post('/api/v1/emissions/estimate', json={'vehicle_type': 'ev_truck', 'distance_km': 80.0, 'load_factor': 0.5, 'congestion_index': 0.2}).json()
    assert em_diesel['co2_kg'] > em_ev['co2_kg']

    # Test /api/v1/emissions/compare-ev
    comp_ev = client.post('/api/v1/emissions/compare-ev', json={'distance_km': 80.0, 'current_vehicle_type': 'heavy_truck', 'load_factor': 0.5, 'congestion_index': 0.2}).json()
    assert comp_ev['distance_km'] == 80.0
    assert comp_ev['current_co2_kg'] > comp_ev['ev_co2_kg']
    assert comp_ev['co2_saved_kg'] > 0
    assert comp_ev['co2_reduction_percentage'] > 75.0
    assert comp_ev['cost_saved_usd'] > 0

    # 7. Impact Summary
    impact_a = client.get('/api/v1/impact/summary', headers=headers_a).json()
    assert impact_a['total_routes_optimized'] >= 1
    assert impact_a['total_co2_saved_kg'] > 0
    assert impact_a['total_load_pool_matches'] >= 1
    assert impact_a['equivalent_trees_planted'] > 0

    impact_b = client.get('/api/v1/impact/summary', headers=headers_b).json()
    assert impact_b['total_routes_optimized'] >= 1
    assert impact_b['combined_total_co2_saved_kg'] > 0

if __name__ == '__main__':
    test_all_demo_paths()
    print('ALL DEMO PATH TESTS PASSED!')
