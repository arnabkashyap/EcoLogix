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
            depot_city="Seattle Port Terminal",
            depot_lat=47.5952,
            depot_lng=-122.3316,
        )
        org2 = Organization(
            id="tenant-apex",
            name="Apex Freight",
            depot_city="Tacoma Hub",
            depot_lat=47.2529,
            depot_lng=-122.4443,
        )
        session.add_all([org1, org2])
        session.commit()

        yield session
    finally:
        session.close()


def test_matcher_no_keyword_matching_and_distance_exclusion(db_session):
    """
    Asserts that:
    1. A shipment with title containing 'pool' or 'Return' located FAR outside the radius (e.g. Spokane, 400km away) IS EXCLUDED.
    2. A shipment within radius is INCLUDED.
    """
    # Northwind shipment: Seattle to Kent (Kent is 47.3809, -122.2348)
    # Return corridor goes Kent -> Seattle depot (47.5952, -122.3316)
    s_nw = Shipment(
        id="ship-nw-test",
        tenant_id="tenant-northwind",
        title="Kent Cargo",
        origin_name="Seattle",
        origin_lat=47.5952,
        origin_lng=-122.3316,
        dest_name="Kent",
        dest_lat=47.3809,
        dest_lng=-122.2348,
        weight_kg=3000.0,
        delivery_window_start="09:00",
        delivery_window_end="14:00",
    )

    # Apex shipment 1: DISTANT shipment (Spokane) with 'Return Pool Medical' keywords
    s_apex_far = Shipment(
        id="ship-apex-far",
        tenant_id="tenant-apex",
        title="Return Pool Medical Distant Cargo",
        origin_name="Spokane",
        origin_lat=47.6588,
        origin_lng=-117.4260,
        dest_name="Pullman",
        dest_lat=46.7313,
        dest_lng=-117.1796,
        weight_kg=2000.0,
        delivery_window_start="09:00",
        delivery_window_end="14:00",
    )

    # Apex shipment 2: NEARBY shipment (Kent -> Seattle) matching corridor
    s_apex_near = Shipment(
        id="ship-apex-near",
        tenant_id="tenant-apex",
        title="Normal Generic Title Freight",
        origin_name="Kent Industrial Park",
        origin_lat=47.3809,
        origin_lng=-122.2348,
        dest_name="Seattle Center",
        dest_lat=47.6045,
        dest_lng=-122.3242,
        weight_kg=2500.0,
        delivery_window_start="10:00",
        delivery_window_end="15:00",
    )

    db_session.add_all([s_nw, s_apex_far, s_apex_near])
    db_session.commit()

    matches = find_load_pool_matches("tenant-northwind", db_session, radius_km=15.0)

    # Check that s_apex_far (Spokane) is NOT matched despite having 'pool'/'Return' in title
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
        title="Kent Cargo",
        origin_name="Seattle",
        origin_lat=47.5952,
        origin_lng=-122.3316,
        dest_name="Kent",
        dest_lat=47.3809,
        dest_lng=-122.2348,
        weight_kg=3000.0,
        delivery_window_start="09:00",
        delivery_window_end="14:00",
    )

    # Short distance nearby leg (~5 km)
    s_apex_short = Shipment(
        id="ship-apex-short",
        tenant_id="tenant-apex",
        title="Short Leg Freight",
        origin_name="Kent Industrial",
        origin_lat=47.3809,
        origin_lng=-122.2348,
        dest_name="Kent South",
        dest_lat=47.3500,
        dest_lng=-122.2300,
        weight_kg=2000.0,
        delivery_window_start="09:00",
        delivery_window_end="14:00",
    )

    db_session.add_all([s_nw, s_apex_short])
    db_session.commit()

    matches = find_load_pool_matches("tenant-northwind", db_session, radius_km=15.0)
    match_entry = next((m for m in matches if m["id"] == "dynamic-match-ship-apex-short"), None)
    assert match_entry is not None

    # The actual distance for short leg is ~4.3 km, NOT 28.4 km
    assert match_entry["distance_km"] < 10.0
    # Expected CO2 for ~4.3km heavy truck segment is < 15 kg CO2 (not 28.6 kg)
    assert match_entry["co2_saved_kg"] < 15.0
