"""
Seed Script for EcoLogix.
Seeds realistic Indian logistics datasets for two distinct tenants:
1. Tenant A ("tenant-northwind"): Northwind Logistics (Delhi/NCR Depot)
2. Tenant B ("tenant-apex"): Apex Freight (Mumbai Depot)
"""

from backend.app.db.database import Base, engine, SessionLocal
from backend.app.db.models import Organization, User, Fleet, Vehicle, Shipment, LoadPoolMatch, Route, RouteLeg, OptimizationJob


def seed_database():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    try:
        # Check if database is already seeded
        existing = db.query(Organization).filter(Organization.id == "tenant-northwind").first()
        if existing:
            return

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
            depot_city="NCR Freight Hub, Delhi",
            depot_lat=28.6139,
            depot_lng=77.2090,
        )
        apex_org = Organization(
            id="tenant-apex",
            name="Apex Freight",
            depot_city="Mumbai Logistics Hub, MH",
            depot_lat=19.0760,
            depot_lng=72.8777,
        )
        db.add_all([northwind_org, apex_org])
        db.commit()

        # 2. Users
        user_nw = User(
            id="user-northwind",
            tenant_id="tenant-northwind",
            email="dispatcher@northwindlogistics.com",
            name="Sarah Jenkins (Delhi Ops)",
            role="Dispatcher",
        )
        user_apex = User(
            id="user-apex",
            tenant_id="tenant-apex",
            email="logistics@apexfreight.com",
            name="Marcus Vance (Mumbai Ops)",
            role="Fleet Manager",
        )
        db.add_all([user_nw, user_apex])
        db.commit()

        # 3. Fleets
        nw_fleet = Fleet(
            id="fleet-nw-main",
            tenant_id="tenant-northwind",
            name="Northwind Northern Express Fleet",
            depot_location="NCR Freight Hub, Delhi",
            depot_lat=28.6139,
            depot_lng=77.2090,
        )
        apex_fleet = Fleet(
            id="fleet-apex-main",
            tenant_id="tenant-apex",
            name="Apex Western India Fleet",
            depot_location="Mumbai Logistics Hub",
            depot_lat=19.0760,
            depot_lng=72.8777,
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
            current_lat=28.6139,
            current_lng=77.2090,
        )
        v2 = Vehicle(
            id="veh-nw-202",
            tenant_id="tenant-northwind",
            fleet_id="fleet-nw-main",
            name="NW E-Cascadia EV Truck #202",
            vehicle_type="ev_truck",
            fuel_type="electric",
            capacity_kg=14000.0,
            current_lat=28.6139,
            current_lng=77.2090,
        )
        v3 = Vehicle(
            id="veh-apex-301",
            tenant_id="tenant-apex",
            fleet_id="fleet-apex-main",
            name="Apex Heavy Volvo FH #301",
            vehicle_type="heavy_truck",
            fuel_type="diesel",
            capacity_kg=20000.0,
            current_lat=19.0760,
            current_lng=72.8777,
        )
        v4 = Vehicle(
            id="veh-apex-402",
            tenant_id="tenant-apex",
            fleet_id="fleet-apex-main",
            name="Apex Medium Kenworth #402",
            vehicle_type="medium_truck",
            fuel_type="diesel",
            capacity_kg=10000.0,
            current_lat=19.0760,
            current_lng=72.8777,
        )
        db.add_all([v1, v2, v3, v4])
        db.commit()

        # 5. Shipments for Northwind Logistics (Tenant A)
        nw_shipments = [
            Shipment(
                id="ship-nw-01",
                tenant_id="tenant-northwind",
                title="Gurugram Cyber City Cargo",
                origin_name="NCR Freight Hub, Delhi",
                origin_lat=28.6139,
                origin_lng=77.2090,
                dest_name="Gurugram Industrial Hub",
                dest_lat=28.4595,
                dest_lng=77.0266,
                weight_kg=4200.0,
                volume_m3=18.5,
                delivery_window_start="08:30",
                delivery_window_end="11:30",
            ),
            Shipment(
                id="ship-nw-02",
                tenant_id="tenant-northwind",
                title="Noida Commercial Delivery",
                origin_name="NCR Freight Hub, Delhi",
                origin_lat=28.6139,
                origin_lng=77.2090,
                dest_name="Noida Sector 62 Commerce Center",
                dest_lat=28.6280,
                dest_lng=77.3649,
                weight_kg=2800.0,
                volume_m3=12.0,
                delivery_window_start="09:00",
                delivery_window_end="12:00",
            ),
            Shipment(
                id="ship-nw-03",
                tenant_id="tenant-northwind",
                title="Faridabad Manufacturing Consignment",
                origin_name="NCR Freight Hub, Delhi",
                origin_lat=28.6139,
                origin_lng=77.2090,
                dest_name="Faridabad Industrial Area",
                dest_lat=28.4089,
                dest_lng=77.3178,
                weight_kg=3500.0,
                volume_m3=15.0,
                delivery_window_start="10:00",
                delivery_window_end="14:00",
            ),
            Shipment(
                id="ship-nw-04",
                tenant_id="tenant-northwind",
                title="Ghaziabad Freight Center",
                origin_name="NCR Freight Hub, Delhi",
                origin_lat=28.6139,
                origin_lng=77.2090,
                dest_name="Ghaziabad Industrial Hub",
                dest_lat=28.6692,
                dest_lng=77.4538,
                weight_kg=1900.0,
                volume_m3=8.0,
                delivery_window_start="11:00",
                delivery_window_end="15:00",
            ),
            Shipment(
                id="ship-nw-05",
                tenant_id="tenant-northwind",
                title="Manesar Auto Corridor Dock",
                origin_name="NCR Freight Hub, Delhi",
                origin_lat=28.6139,
                origin_lng=77.2090,
                dest_name="Manesar Industrial Zone",
                dest_lat=28.3587,
                dest_lng=76.9370,
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
                title="JNPT Port Container Shipment",
                origin_name="Mumbai Logistics Hub",
                origin_lat=19.0760,
                origin_lng=72.8777,
                dest_name="Navi Mumbai JNPT Port",
                dest_lat=18.9500,
                dest_lng=72.9500,
                weight_kg=6200.0,
                volume_m3=25.0,
                delivery_window_start="08:00",
                delivery_window_end="11:00",
            ),
            Shipment(
                id="ship-apex-02",
                tenant_id="tenant-apex",
                title="Thane Retail Cargo",
                origin_name="Mumbai Logistics Hub",
                origin_lat=19.0760,
                origin_lng=72.8777,
                dest_name="Thane Commercial Zone",
                dest_lat=19.2183,
                dest_lng=72.9781,
                weight_kg=3100.0,
                volume_m3=14.0,
                delivery_window_start="09:30",
                delivery_window_end="13:00",
            ),
            Shipment(
                id="ship-apex-03",
                tenant_id="tenant-apex",
                title="Bhiwandi Supermall Freight",
                origin_name="Mumbai Logistics Hub",
                origin_lat=19.0760,
                origin_lng=72.8777,
                dest_name="Bhiwandi Warehousing Complex",
                dest_lat=19.2812,
                dest_lng=73.0482,
                weight_kg=4500.0,
                volume_m3=19.0,
                delivery_window_start="10:30",
                delivery_window_end="14:30",
            ),
            # Empty Return Leg / Backhaul Match Candidate for Load Pool
            Shipment(
                id="ship-apex-04-pool",
                tenant_id="tenant-apex",
                title="Delhi Medical Equipment Backhaul",
                origin_name="Faridabad Industrial Area (Apex Return Stop)",
                origin_lat=28.4089,
                origin_lng=77.3178,
                dest_name="Delhi Central Medical Center",
                dest_lat=28.6139,
                dest_lng=77.2090,
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
            empty_leg_title="Apex Freight Return Leg: Faridabad → Delhi Corridor",
            matched_shipment_title="Northwind Faridabad Freight (#ship-nw-03)",
            origin_name="Faridabad Industrial Area, HR",
            dest_name="NCR Freight Hub, Delhi",
            origin_lat=28.4089,
            origin_lng=77.3178,
            dest_lat=28.6139,
            dest_lng=77.2090,
            distance_km=26.5,
            weight_kg=3500.0,
            co2_saved_kg=26.8,
            cost_saved_usd=132.50,
            match_score=0.94,
        )
        db.add(pool_match)
        db.commit()

        print("Database seeded successfully with Northwind Logistics and Apex Freight datasets.")
    finally:
        db.close()


if __name__ == "__main__":
    seed_database()
