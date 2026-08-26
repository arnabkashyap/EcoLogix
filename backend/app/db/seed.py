"""
Seed Script for EcoLogix.
Seeds realistic Pacific Northwest logistics datasets for two distinct tenants:
1. Tenant A ("tenant-northwind"): Northwind Logistics (Seattle Depot)
2. Tenant B ("tenant-apex"): Apex Freight (Tacoma Depot)
"""

from backend.app.db.database import Base, engine, SessionLocal
from backend.app.db.models import Organization, User, Fleet, Vehicle, Shipment, LoadPoolMatch, Route, RouteLeg, OptimizationJob


def seed_database():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    try:
        # Clear existing tables to ensure idempotent fresh seed
        db.query(RouteLeg).delete()
        db.query(Route).delete()
        db.query(OptimizationJob).delete()
        db.query(LoadPoolMatch).delete()
        db.query(Shipment).delete()
        db.query(Vehicle).delete()
        db.query(Fleet).delete()
        db.query(User).delete()
        db.query(Organization).delete()
        db.commit()

        # 1. Organizations (Tenants)
        northwind_org = Organization(
            id="tenant-northwind",
            name="Northwind Logistics",
            depot_city="Seattle Port Terminal, WA",
            depot_lat=47.5952,
            depot_lng=-122.3316,
        )
        apex_org = Organization(
            id="tenant-apex",
            name="Apex Freight",
            depot_city="Tacoma Logistics Hub, WA",
            depot_lat=47.2529,
            depot_lng=-122.4443,
        )
        db.add_all([northwind_org, apex_org])
        db.commit()

        # 2. Users
        user_nw = User(
            id="user-northwind",
            tenant_id="tenant-northwind",
            email="dispatcher@northwindlogistics.com",
            name="Sarah Jenkins (Seattle Ops)",
            role="Dispatcher",
        )
        user_apex = User(
            id="user-apex",
            tenant_id="tenant-apex",
            email="logistics@apexfreight.com",
            name="Marcus Vance (Tacoma Ops)",
            role="Fleet Manager",
        )
        db.add_all([user_nw, user_apex])
        db.commit()

        # 3. Fleets
        nw_fleet = Fleet(
            id="fleet-nw-main",
            tenant_id="tenant-northwind",
            name="Northwind Puget Sound Fleet",
            depot_location="Seattle Port Terminal",
            depot_lat=47.5952,
            depot_lng=-122.3316,
        )
        apex_fleet = Fleet(
            id="fleet-apex-main",
            tenant_id="tenant-apex",
            name="Apex South Sound Fleet",
            depot_location="Tacoma Logistics Hub",
            depot_lat=47.2529,
            depot_lng=-122.4443,
        )
        db.add_all([nw_fleet, apex_fleet])
        db.commit()

        # 4. Vehicles
        v1 = Vehicle(
            id="veh-nw-101",
            tenant_id="tenant-northwind",
            fleet_id="fleet-nw-main",
            name="NW Heavy Freightliner #101",
            vehicle_type="heavy_truck",
            fuel_type="diesel",
            capacity_kg=18000.0,
            current_lat=47.5952,
            current_lng=-122.3316,
        )
        v2 = Vehicle(
            id="veh-nw-202",
            tenant_id="tenant-northwind",
            fleet_id="fleet-nw-main",
            name="NW E-Cascadia EV Truck #202",
            vehicle_type="ev_truck",
            fuel_type="electric",
            capacity_kg=14000.0,
            current_lat=47.5952,
            current_lng=-122.3316,
        )
        v3 = Vehicle(
            id="veh-apex-301",
            tenant_id="tenant-apex",
            fleet_id="fleet-apex-main",
            name="Apex Heavy Volvo FH #301",
            vehicle_type="heavy_truck",
            fuel_type="diesel",
            capacity_kg=20000.0,
            current_lat=47.2529,
            current_lng=-122.4443,
        )
        v4 = Vehicle(
            id="veh-apex-402",
            tenant_id="tenant-apex",
            fleet_id="fleet-apex-main",
            name="Apex Medium Kenworth #402",
            vehicle_type="medium_truck",
            fuel_type="diesel",
            capacity_kg=10000.0,
            current_lat=47.2529,
            current_lng=-122.4443,
        )
        db.add_all([v1, v2, v3, v4])
        db.commit()

        # 5. Shipments for Northwind Logistics (Tenant A)
        nw_shipments = [
            Shipment(
                id="ship-nw-01",
                tenant_id="tenant-northwind",
                title="Boeing Parts Delivery (Everett)",
                origin_name="Seattle Port Terminal",
                origin_lat=47.5952,
                origin_lng=-122.3316,
                dest_name="Everett Boeing Facility",
                dest_lat=47.9790,
                dest_lng=-122.2021,
                weight_kg=4200.0,
                volume_m3=18.5,
                delivery_window_start="08:30",
                delivery_window_end="11:30",
            ),
            Shipment(
                id="ship-nw-02",
                tenant_id="tenant-northwind",
                title="Amazon Bellevue Fulfillment",
                origin_name="Seattle Port Terminal",
                origin_lat=47.5952,
                origin_lng=-122.3316,
                dest_name="Bellevue Commerce Center",
                dest_lat=47.6101,
                dest_lng=-122.2015,
                weight_kg=2800.0,
                volume_m3=12.0,
                delivery_window_start="09:00",
                delivery_window_end="12:00",
            ),
            Shipment(
                id="ship-nw-03",
                tenant_id="tenant-northwind",
                title="Kent Valley Distribution",
                origin_name="Seattle Port Terminal",
                origin_lat=47.5952,
                origin_lng=-122.3316,
                dest_name="Kent Industrial Park",
                dest_lat=47.3809,
                dest_lng=-122.2348,
                weight_kg=3500.0,
                volume_m3=15.0,
                delivery_window_start="10:00",
                delivery_window_end="14:00",
            ),
            Shipment(
                id="ship-nw-04",
                tenant_id="tenant-northwind",
                title="Renton Tech Cargo",
                origin_name="Seattle Port Terminal",
                origin_lat=47.5952,
                origin_lng=-122.3316,
                dest_name="Renton Commercial Hub",
                dest_lat=47.4829,
                dest_lng=-122.2171,
                weight_kg=1900.0,
                volume_m3=8.0,
                delivery_window_start="11:00",
                delivery_window_end="15:00",
            ),
            Shipment(
                id="ship-nw-05",
                tenant_id="tenant-northwind",
                title="Tacoma Port Connection",
                origin_name="Seattle Port Terminal",
                origin_lat=47.5952,
                origin_lng=-122.3316,
                dest_name="Tacoma Tideflats Dock",
                dest_lat=47.2625,
                dest_lng=-122.4180,
                weight_kg=5100.0,
                volume_m3=22.0,
                delivery_window_start="12:30",
                delivery_window_end="16:30",
            ),
        ]

        # 6. Shipments for Apex Freight (Tenant B)
        apex_shipments = [
            Shipment(
                id="ship-apex-01",
                tenant_id="tenant-apex",
                title="Olympia Regional Supplies",
                origin_name="Tacoma Logistics Hub",
                origin_lat=47.2529,
                origin_lng=-122.4443,
                dest_name="Olympia State Warehouse",
                dest_lat=47.0379,
                dest_lng=-122.9007,
                weight_kg=6200.0,
                volume_m3=25.0,
                delivery_window_start="08:00",
                delivery_window_end="11:00",
            ),
            Shipment(
                id="ship-apex-02",
                tenant_id="tenant-apex",
                title="Federal Way Retail Freight",
                origin_name="Tacoma Logistics Hub",
                origin_lat=47.2529,
                origin_lng=-122.4443,
                dest_name="Federal Way Distribution",
                dest_lat=47.3223,
                dest_lng=-122.3126,
                weight_kg=3100.0,
                volume_m3=14.0,
                delivery_window_start="09:30",
                delivery_window_end="13:00",
            ),
            Shipment(
                id="ship-apex-03",
                tenant_id="tenant-apex",
                title="Auburn Manufacturing Consignment",
                origin_name="Tacoma Logistics Hub",
                origin_lat=47.2529,
                origin_lng=-122.4443,
                dest_name="Auburn Supermall Depot",
                dest_lat=47.3073,
                dest_lng=-122.2285,
                weight_kg=4500.0,
                volume_m3=19.0,
                delivery_window_start="10:30",
                delivery_window_end="14:30",
            ),
            # Empty Return Leg / Backhaul Match Candidate for Load Pool
            Shipment(
                id="ship-apex-04-pool",
                tenant_id="tenant-apex",
                title="Seattle Downtown Medical Cargo",
                origin_name="Kent Industrial Park (Apex Return Stop)",
                origin_lat=47.3809,
                origin_lng=-122.2348,
                dest_name="Seattle Harborview Center",
                dest_lat=47.6045,
                dest_lng=-122.3242,
                weight_kg=2400.0,
                volume_m3=10.0,
                delivery_window_start="13:00",
                delivery_window_end="17:00",
            ),
        ]

        db.add_all(nw_shipments + apex_shipments)
        db.commit()

        # 7. Seed Initial Load-Pool Match (proving cross-company savings without exposing internal shipment rosters)
        pool_match = LoadPoolMatch(
            id="match-nw-apex-001",
            tenant_id="tenant-northwind",
            carrier_a_tenant_id="tenant-northwind",
            carrier_b_tenant_id="tenant-apex",
            carrier_a_name="Northwind Logistics",
            carrier_b_name="Apex Freight",
            empty_leg_title="Apex Freight Return Leg: Tacoma → Seattle Corridor",
            matched_shipment_title="Northwind Kent Valley Freight (#ship-nw-03)",
            origin_name="Kent Industrial Park, WA",
            dest_name="Seattle Port Terminal, WA",
            origin_lat=47.3809,
            origin_lng=-122.2348,
            dest_lat=47.5952,
            dest_lng=-122.3316,
            distance_km=28.4,
            weight_kg=3500.0,
            co2_saved_kg=28.6,
            cost_saved_usd=142.50,
            match_score=0.94,
        )
        db.add(pool_match)
        db.commit()

        print("Database seeded successfully with Northwind Logistics and Apex Freight datasets.")
    finally:
        db.close()


if __name__ == "__main__":
    seed_database()
