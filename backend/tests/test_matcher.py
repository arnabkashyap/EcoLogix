"""
Unit Tests for EcoLogix Load-Pooling Matcher.
Verifies real spatial & temporal matching, exclusion of distant shipments regardless of title keywords,
and distance scaling of CO2 savings.
"""

import pytest
from backend.app.db.database import Base, engine, SessionLocal
from backend.app.db.models import Organization, Shipment, LoadPoolMatch
from backend.app.core.matcher import find_load_pool_matches
from backend.app.core.emissions import calculate_segment_emissions


@pytest.fixture(scope="function")
def db_session():
    Base.metadata.create_all(bind=engine)
    session = SessionLocal()
    try:
        session.query(LoadPoolMatch).delete()
        session.query(Shipment).delete()
        session.query(Organization).delete()
        session.commit()

        # Seed 2 test organizations
        org1 = Organization(
            id="tenant-northwind",
            name="Northwind Logistics",
            depot_city="NCR Freight Hub, Delhi",
            depot_lat=28.6139,
            depot_lng=77.2090,
        )
        org2 = Organization(
            id="tenant-apex",
            name="Apex Freight",
            depot_city="Mumbai Hub",
            depot_lat=19.0760,
            depot_lng=72.8777,
        )
        session.add_all([org1, org2])
        session.commit()

        yield session
    finally:
        session.close()


def test_matcher_no_keyword_matching_and_distance_exclusion(db_session):
    """
    Asserts that:
    1. A shipment with title containing 'pool' or 'Return' located FAR outside the radius (e.g. Kolkata, 1300km away) IS EXCLUDED.
    2. A shipment within radius is INCLUDED.
    """
    # Northwind shipment: Delhi to Faridabad (Faridabad is 28.4089, 77.3178)
    # Return corridor goes Faridabad -> Delhi depot (28.6139, 77.2090)
    s_nw = Shipment(
        id="ship-nw-test",
        tenant_id="tenant-northwind",
        title="Faridabad Cargo",
        origin_name="Delhi",
        origin_lat=28.6139,
        origin_lng=77.2090,
        dest_name="Faridabad",
        dest_lat=28.4089,
        dest_lng=77.3178,
        weight_kg=3000.0,
        delivery_window_start="09:00",
        delivery_window_end="14:00",
    )

    # Apex shipment 1: DISTANT shipment (Kolkata) with 'Return Pool Medical' keywords
    s_apex_far = Shipment(
        id="ship-apex-far",
        tenant_id="tenant-apex",
        title="Return Pool Medical Distant Cargo",
        origin_name="Kolkata",
        origin_lat=22.5726,
        origin_lng=88.3639,
        dest_name="Asansol",
        dest_lat=23.6889,
        dest_lng=86.9661,
        weight_kg=2000.0,
        delivery_window_start="09:00",
        delivery_window_end="14:00",
    )

    # Apex shipment 2: NEARBY shipment (Faridabad -> Delhi) matching corridor
    s_apex_near = Shipment(
        id="ship-apex-near",
        tenant_id="tenant-apex",
        title="Normal Generic Title Freight",
        origin_name="Faridabad Industrial Area",
        origin_lat=28.4089,
        origin_lng=77.3178,
        dest_name="Delhi Central",
        dest_lat=28.6139,
        dest_lng=77.2090,
        weight_kg=2500.0,
        delivery_window_start="10:00",
        delivery_window_end="15:00",
    )

    db_session.add_all([s_nw, s_apex_far, s_apex_near])
    db_session.commit()

    matches = find_load_pool_matches("tenant-northwind", db_session, radius_km=15.0)

    # Check that s_apex_far (Kolkata) is NOT matched despite having 'pool'/'Return' in title
    matched_ids = [m["id"] for m in matches]
    assert "dynamic-match-ship-apex-far" not in matched_ids, "Distant shipment with keywords should be excluded!"

    # Check that s_apex_near IS matched
    assert "dynamic-match-ship-apex-near" in matched_ids, "Nearby candidate shipment should be matched!"


def test_co2_saved_scales_with_actual_computed_distance(db_session):
    """
    Asserts that co2_saved_kg scales with real distance rather than returning a constant 28.4km calculation.
    """
    s_nw = Shipment(
        id="ship-nw-1",
        tenant_id="tenant-northwind",
        title="Faridabad Cargo",
        origin_name="Delhi",
        origin_lat=28.6139,
        origin_lng=77.2090,
        dest_name="Faridabad",
        dest_lat=28.4089,
        dest_lng=77.3178,
        weight_kg=3000.0,
        delivery_window_start="09:00",
        delivery_window_end="14:00",
    )

    # Short distance nearby leg (~3.3 km)
    s_apex_short = Shipment(
        id="ship-apex-short",
        tenant_id="tenant-apex",
        title="Short Leg Freight",
        origin_name="Faridabad Industrial",
        origin_lat=28.4089,
        origin_lng=77.3178,
        dest_name="Faridabad South",
        dest_lat=28.3800,
        dest_lng=77.3100,
        weight_kg=2000.0,
        delivery_window_start="09:00",
        delivery_window_end="14:00",
    )

    db_session.add_all([s_nw, s_apex_short])
    db_session.commit()

    matches = find_load_pool_matches("tenant-northwind", db_session, radius_km=15.0)
    match_entry = next((m for m in matches if m["id"] == "dynamic-match-ship-apex-short"), None)
    assert match_entry is not None

    # The actual distance for short leg is ~3.3 km, NOT 28.4 km
    assert match_entry["distance_km"] < 10.0
    # Expected CO2 for ~3.3km heavy truck segment is < 15 kg CO2 (not 28.6 kg)
    assert match_entry["co2_saved_kg"] < 15.0
