"""
Seed Script for EcoLogix.
Seeds realistic Guwahati / Assam regional logistics datasets for two distinct tenants:
1. Tenant A ("tenant-northwind"): Northwind Logistics (NCR & Brahmaputra Freight Hub, Betkuchi ISBT Node)
2. Tenant B ("tenant-apex"): Apex Freight (ICD Amingaon Multi-Modal Depot)

Fully grounded in the Guwahati/Assam node registry (GW-HUB-001 through GW-HUB-010)
from data-flow-dynamic.md with mixed 70/30 Diesel/EV fleet and diverse shipments.
"""

from backend.app.db.database import Base, engine, SessionLocal
from backend.app.db.models import Organization, User, Fleet, Vehicle, Shipment, LoadPoolMatch, Route, RouteLeg, OptimizationJob


# -------------------------------------------------------------------------
# GUWAHATI / ASSAM LOGISTICS NODE REGISTRY (from data-flow-dynamic.md)
# -------------------------------------------------------------------------
NODES = {
    "GW-HUB-001": {
        "id": "GW-HUB-001",
        "name": "ICD Amingaon Container Depot",
        "lat": 26.1852,
        "lng": 91.6811,
        "category": "Multimodal Hub",
    },
    "GW-HUB-002": {
        "id": "GW-HUB-002",
        "name": "Betkuchi ISBT Freight Terminal",
        "lat": 26.1214,
        "lng": 91.7319,
        "category": "Distribution Center",
    },
    "GW-HUB-003": {
        "id": "GW-HUB-003",
        "name": "LGBI Airport Cargo Terminal",
        "lat": 26.1061,
        "lng": 91.5859,
        "category": "Air Freight Hub",
    },
    "GW-HUB-004": {
        "id": "GW-HUB-004",
        "name": "Bamunimaidam Industrial Estate",
        "lat": 26.1884,
        "lng": 91.7821,
        "category": "Industrial Node",
    },
    "GW-HUB-005": {
        "id": "GW-HUB-005",
        "name": "Rani Industrial Corridor",
        "lat": 26.0612,
        "lng": 91.6115,
        "category": "Eco Industrial Park",
    },
    "GW-HUB-006": {
        "id": "GW-HUB-006",
        "name": "Jalukbari Junction Node",
        "lat": 26.1558,
        "lng": 91.6625,
        "category": "Transit Gateway",
    },
    "GW-HUB-007": {
        "id": "GW-HUB-007",
        "name": "Khanapara Commercial Gate",
        "lat": 26.1189,
        "lng": 91.8214,
        "category": "Transit Gateway",
    },
    "GW-HUB-008": {
        "id": "GW-HUB-008",
        "name": "Dispur Secretariat Node",
        "lat": 26.1432,
        "lng": 91.7898,
        "category": "Retail Consignment",
    },
    "GW-HUB-009": {
        "id": "GW-HUB-009",
        "name": "Fancy Bazar Commercial Core",
        "lat": 26.1864,
        "lng": 91.7441,
        "category": "Trade Center",
    },
    "GW-HUB-010": {
        "id": "GW-HUB-010",
        "name": "Azara Industrial Park",
        "lat": 26.1154,
        "lng": 91.6092,
        "category": "Logistics Node",
    },
}


def seed_database():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    try:
        # Check if database is already seeded with current registry
        existing_org = db.query(Organization).filter(Organization.id == "tenant-northwind").first()
        if existing_org and "Betkuchi" in existing_org.depot_city:
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
            depot_city="Betkuchi ISBT Freight Terminal, Guwahati",
            depot_lat=NODES["GW-HUB-002"]["lat"],
            depot_lng=NODES["GW-HUB-002"]["lng"],
        )
        apex_org = Organization(
            id="tenant-apex",
            name="Apex Freight",
            depot_city="ICD Amingaon Multi-Modal Depot, Guwahati",
            depot_lat=NODES["GW-HUB-001"]["lat"],
            depot_lng=NODES["GW-HUB-001"]["lng"],
        )
        db.add_all([northwind_org, apex_org])
        db.commit()

        # 2. Users
        user_nw = User(
            id="user-northwind",
            tenant_id="tenant-northwind",
            email="dispatcher@northwindlogistics.com",
            name="Sarah Jenkins (Guwahati Ops)",
            role="Dispatcher",
        )
        user_apex = User(
            id="user-apex",
            tenant_id="tenant-apex",
            email="logistics@apexfreight.com",
            name="Marcus Vance (Amingaon Ops)",
            role="Fleet Manager",
        )
        db.add_all([user_nw, user_apex])
        db.commit()

        # 3. Fleets
        nw_fleet = Fleet(
            id="fleet-nw-main",
            tenant_id="tenant-northwind",
            name="Northwind Assam Express Fleet",
            depot_location="Betkuchi ISBT Freight Terminal, Guwahati",
            depot_lat=NODES["GW-HUB-002"]["lat"],
            depot_lng=NODES["GW-HUB-002"]["lng"],
        )
        apex_fleet = Fleet(
            id="fleet-apex-main",
            tenant_id="tenant-apex",
            name="Apex Brahmaputra Express Fleet",
            depot_location="ICD Amingaon Multi-Modal Depot",
            depot_lat=NODES["GW-HUB-001"]["lat"],
            depot_lng=NODES["GW-HUB-001"]["lng"],
        )
        db.add_all([nw_fleet, apex_fleet])
        db.commit()

        # 4. Vehicles (70/30 Diesel to EV ratio across fleet)
        vehicles = [
            # Tenant A: Northwind (2 Heavy Diesel, 1 EV Freightliner)
            Vehicle(
                id="veh-nw-101",
                tenant_id="tenant-northwind",
                fleet_id="fleet-nw-main",
                name="NW Tata Signa Heavy Diesel #101",
                vehicle_type="heavy_truck",
                fuel_type="diesel",
                capacity_kg=18000.0,
                current_lat=NODES["GW-HUB-002"]["lat"],
                current_lng=NODES["GW-HUB-002"]["lng"],
            ),
            Vehicle(
                id="veh-nw-102",
                tenant_id="tenant-northwind",
                fleet_id="fleet-nw-main",
                name="NW Eicher Pro Heavy Hauler #102",
                vehicle_type="heavy_truck",
                fuel_type="diesel",
                capacity_kg=18000.0,
                current_lat=NODES["GW-HUB-002"]["lat"],
                current_lng=NODES["GW-HUB-002"]["lng"],
            ),
            Vehicle(
                id="veh-nw-202",
                tenant_id="tenant-northwind",
                fleet_id="fleet-nw-main",
                name="NW E-Cascadia EV Freightliner #202",
                vehicle_type="ev_truck",
                fuel_type="electric",
                capacity_kg=14000.0,
                current_lat=NODES["GW-HUB-002"]["lat"],
                current_lng=NODES["GW-HUB-002"]["lng"],
            ),
            # Tenant B: Apex Freight (2 Heavy Diesel, 1 EV Truck, 1 Medium Diesel)
            Vehicle(
                id="veh-apex-301",
                tenant_id="tenant-apex",
                fleet_id="fleet-apex-main",
                name="Apex Volvo FH Heavy Diesel #301",
                vehicle_type="heavy_truck",
                fuel_type="diesel",
                capacity_kg=20000.0,
                current_lat=NODES["GW-HUB-001"]["lat"],
                current_lng=NODES["GW-HUB-001"]["lng"],
            ),
            Vehicle(
                id="veh-apex-302",
                tenant_id="tenant-apex",
                fleet_id="fleet-apex-main",
                name="Apex BharatBenz Heavy #302",
                vehicle_type="heavy_truck",
                fuel_type="diesel",
                capacity_kg=18000.0,
                current_lat=NODES["GW-HUB-001"]["lat"],
                current_lng=NODES["GW-HUB-001"]["lng"],
            ),
            Vehicle(
                id="veh-apex-401",
                tenant_id="tenant-apex",
                fleet_id="fleet-apex-main",
                name="Apex Tata Ultra EV Carrier #401",
                vehicle_type="ev_truck",
                fuel_type="electric",
                capacity_kg=14000.0,
                current_lat=NODES["GW-HUB-001"]["lat"],
                current_lng=NODES["GW-HUB-001"]["lng"],
            ),
            Vehicle(
                id="veh-apex-402",
                tenant_id="tenant-apex",
                fleet_id="fleet-apex-main",
                name="Apex Medium Kenworth #402",
                vehicle_type="medium_truck",
                fuel_type="diesel",
                capacity_kg=10000.0,
                current_lat=NODES["GW-HUB-001"]["lat"],
                current_lng=NODES["GW-HUB-001"]["lng"],
            ),
        ]
        db.add_all(vehicles)
        db.commit()

        # 5. Shipments for Northwind Logistics (Tenant A) — 11 Pending shipments with varied weights/load factors
        # Load factors range from ~0.20 to ~0.94 (relative to 18,000kg heavy truck capacity)
        nw_shipments = [
            Shipment(
                id="ship-nw-01",
                tenant_id="tenant-northwind",
                title="Amingaon Export Tea Consignment [Saraighat Corridor]",
                origin_name=NODES["GW-HUB-002"]["name"],
                origin_lat=NODES["GW-HUB-002"]["lat"],
                origin_lng=NODES["GW-HUB-002"]["lng"],
                dest_name=NODES["GW-HUB-001"]["name"],
                dest_lat=NODES["GW-HUB-001"]["lat"],
                dest_lng=NODES["GW-HUB-001"]["lng"],
                weight_kg=12500.0,  # LF: ~0.69
                volume_m3=28.0,
                delivery_window_start="08:00",
                delivery_window_end="11:30",
                status="pending",
            ),
            Shipment(
                id="ship-nw-02",
                tenant_id="tenant-northwind",
                title="LGBI Cold Chain Vaccine Express",
                origin_name=NODES["GW-HUB-002"]["name"],
                origin_lat=NODES["GW-HUB-002"]["lat"],
                origin_lng=NODES["GW-HUB-002"]["lng"],
                dest_name=NODES["GW-HUB-003"]["name"],
                dest_lat=NODES["GW-HUB-003"]["lat"],
                dest_lng=NODES["GW-HUB-003"]["lng"],
                weight_kg=3600.0,  # LF: ~0.20
                volume_m3=12.5,
                delivery_window_start="08:30",
                delivery_window_end="11:00",
                status="pending",
            ),
            Shipment(
                id="ship-nw-03",
                tenant_id="tenant-northwind",
                title="Bamunimaidam Industrial Raw Polymers",
                origin_name=NODES["GW-HUB-002"]["name"],
                origin_lat=NODES["GW-HUB-002"]["lat"],
                origin_lng=NODES["GW-HUB-002"]["lng"],
                dest_name=NODES["GW-HUB-004"]["name"],
                dest_lat=NODES["GW-HUB-004"]["lat"],
                dest_lng=NODES["GW-HUB-004"]["lng"],
                weight_kg=15200.0,  # LF: ~0.84
                volume_m3=32.0,
                delivery_window_start="09:00",
                delivery_window_end="13:00",
                status="pending",
            ),
            Shipment(
                id="ship-nw-04",
                tenant_id="tenant-northwind",
                title="Rani Paper Mill Heavy Pulp Consignment",
                origin_name=NODES["GW-HUB-002"]["name"],
                origin_lat=NODES["GW-HUB-002"]["lat"],
                origin_lng=NODES["GW-HUB-002"]["lng"],
                dest_name=NODES["GW-HUB-005"]["name"],
                dest_lat=NODES["GW-HUB-005"]["lat"],
                dest_lng=NODES["GW-HUB-005"]["lng"],
                weight_kg=16800.0,  # LF: ~0.93
                volume_m3=36.0,
                delivery_window_start="09:30",
                delivery_window_end="14:00",
                status="pending",
            ),
            Shipment(
                id="ship-nw-05",
                tenant_id="tenant-northwind",
                title="Jalukbari Transit Hub Parcel Cargo",
                origin_name=NODES["GW-HUB-002"]["name"],
                origin_lat=NODES["GW-HUB-002"]["lat"],
                origin_lng=NODES["GW-HUB-002"]["lng"],
                dest_name=NODES["GW-HUB-006"]["name"],
                dest_lat=NODES["GW-HUB-006"]["lat"],
                dest_lng=NODES["GW-HUB-006"]["lng"],
                weight_kg=4800.0,  # LF: ~0.27
                volume_m3=18.0,
                delivery_window_start="10:00",
                delivery_window_end="13:30",
                status="pending",
            ),
            Shipment(
                id="ship-nw-06",
                tenant_id="tenant-northwind",
                title="Khanapara Meghalaya Freight Gateway [Jorabat Pass]",
                origin_name=NODES["GW-HUB-002"]["name"],
                origin_lat=NODES["GW-HUB-002"]["lat"],
                origin_lng=NODES["GW-HUB-002"]["lng"],
                dest_name=NODES["GW-HUB-007"]["name"],
                dest_lat=NODES["GW-HUB-007"]["lat"],
                dest_lng=NODES["GW-HUB-007"]["lng"],
                weight_kg=14100.0,  # LF: ~0.78
                volume_m3=30.0,
                delivery_window_start="10:30",
                delivery_window_end="15:00",
                status="pending",
            ),
            Shipment(
                id="ship-nw-07",
                tenant_id="tenant-northwind",
                title="Dispur Secretariat Stationery & Supplies",
                origin_name=NODES["GW-HUB-002"]["name"],
                origin_lat=NODES["GW-HUB-002"]["lat"],
                origin_lng=NODES["GW-HUB-002"]["lng"],
                dest_name=NODES["GW-HUB-008"]["name"],
                dest_lat=NODES["GW-HUB-008"]["lat"],
                dest_lng=NODES["GW-HUB-008"]["lng"],
                weight_kg=5400.0,  # LF: ~0.30
                volume_m3=14.0,
                delivery_window_start="11:00",
                delivery_window_end="14:30",
                status="pending",
            ),
            Shipment(
                id="ship-nw-08",
                tenant_id="tenant-northwind",
                title="Fancy Bazar FMCG Wholesale Freight",
                origin_name=NODES["GW-HUB-002"]["name"],
                origin_lat=NODES["GW-HUB-002"]["lat"],
                origin_lng=NODES["GW-HUB-002"]["lng"],
                dest_name=NODES["GW-HUB-009"]["name"],
                dest_lat=NODES["GW-HUB-009"]["lat"],
                dest_lng=NODES["GW-HUB-009"]["lng"],
                weight_kg=8900.0,  # LF: ~0.49
                volume_m3=24.0,
                delivery_window_start="11:30",
                delivery_window_end="16:00",
                status="pending",
            ),
            Shipment(
                id="ship-nw-09",
                tenant_id="tenant-northwind",
                title="Azara Solar Panel Logistics Load",
                origin_name=NODES["GW-HUB-002"]["name"],
                origin_lat=NODES["GW-HUB-002"]["lat"],
                origin_lng=NODES["GW-HUB-002"]["lng"],
                dest_name=NODES["GW-HUB-010"]["name"],
                dest_lat=NODES["GW-HUB-010"]["lat"],
                dest_lng=NODES["GW-HUB-010"]["lng"],
                weight_kg=9800.0,  # LF: ~0.54
                volume_m3=26.0,
                delivery_window_start="12:00",
                delivery_window_end="16:30",
                status="pending",
            ),
            Shipment(
                id="ship-nw-10",
                tenant_id="tenant-northwind",
                title="LGBI Heavy Cargo Inbound Shuttle",
                origin_name=NODES["GW-HUB-003"]["name"],
                origin_lat=NODES["GW-HUB-003"]["lat"],
                origin_lng=NODES["GW-HUB-003"]["lng"],
                dest_name=NODES["GW-HUB-002"]["name"],
                dest_lat=NODES["GW-HUB-002"]["lat"],
                dest_lng=NODES["GW-HUB-002"]["lng"],
                weight_kg=7200.0,  # LF: ~0.40
                volume_m3=20.0,
                delivery_window_start="13:00",
                delivery_window_end="17:00",
                status="pending",
            ),
            Shipment(
                id="ship-nw-11",
                tenant_id="tenant-northwind",
                title="Fancy Bazar Bulk Grains Transfer",
                origin_name=NODES["GW-HUB-009"]["name"],
                origin_lat=NODES["GW-HUB-009"]["lat"],
                origin_lng=NODES["GW-HUB-009"]["lng"],
                dest_name=NODES["GW-HUB-007"]["name"],
                dest_lat=NODES["GW-HUB-007"]["lat"],
                dest_lng=NODES["GW-HUB-007"]["lng"],
                weight_kg=11200.0,  # LF: ~0.62
                volume_m3=25.0,
                delivery_window_start="14:00",
                delivery_window_end="18:00",
                status="pending",
            ),
        ]

        # 6. Shipments for Apex Freight (Tenant B) — 10 Pending shipments with diverse regional routes
        # Spanning cross-river Amingaon container movements and South-Bank corridors
        apex_shipments = [
            Shipment(
                id="ship-apex-01",
                tenant_id="tenant-apex",
                title="Amingaon Heavy Steel Coil Import",
                origin_name=NODES["GW-HUB-001"]["name"],
                origin_lat=NODES["GW-HUB-001"]["lat"],
                origin_lng=NODES["GW-HUB-001"]["lng"],
                dest_name=NODES["GW-HUB-004"]["name"],
                dest_lat=NODES["GW-HUB-004"]["lat"],
                dest_lng=NODES["GW-HUB-004"]["lng"],
                weight_kg=17000.0,  # LF: ~0.85
                volume_m3=30.0,
                delivery_window_start="08:00",
                delivery_window_end="11:30",
                status="pending",
            ),
            Shipment(
                id="ship-apex-02",
                tenant_id="tenant-apex",
                title="Amingaon to LGBI Air Express Container",
                origin_name=NODES["GW-HUB-001"]["name"],
                origin_lat=NODES["GW-HUB-001"]["lat"],
                origin_lng=NODES["GW-HUB-001"]["lng"],
                dest_name=NODES["GW-HUB-003"]["name"],
                dest_lat=NODES["GW-HUB-003"]["lat"],
                dest_lng=NODES["GW-HUB-003"]["lng"],
                weight_kg=8400.0,  # LF: ~0.42
                volume_m3=22.0,
                delivery_window_start="08:30",
                delivery_window_end="12:00",
                status="pending",
            ),
            Shipment(
                id="ship-apex-03",
                tenant_id="tenant-apex",
                title="Amingaon to Betkuchi Bulk FMCG Transfer",
                origin_name=NODES["GW-HUB-001"]["name"],
                origin_lat=NODES["GW-HUB-001"]["lat"],
                origin_lng=NODES["GW-HUB-001"]["lng"],
                dest_name=NODES["GW-HUB-002"]["name"],
                dest_lat=NODES["GW-HUB-002"]["lat"],
                dest_lng=NODES["GW-HUB-002"]["lng"],
                weight_kg=13800.0,  # LF: ~0.69
                volume_m3=29.0,
                delivery_window_start="09:00",
                delivery_window_end="13:00",
                status="pending",
            ),
            Shipment(
                id="ship-apex-04",
                tenant_id="tenant-apex",
                title="Fancy Bazar Textile Container Drop",
                origin_name=NODES["GW-HUB-001"]["name"],
                origin_lat=NODES["GW-HUB-001"]["lat"],
                origin_lng=NODES["GW-HUB-001"]["lng"],
                dest_name=NODES["GW-HUB-009"]["name"],
                dest_lat=NODES["GW-HUB-009"]["lat"],
                dest_lng=NODES["GW-HUB-009"]["lng"],
                weight_kg=9200.0,  # LF: ~0.46
                volume_m3=23.0,
                delivery_window_start="09:30",
                delivery_window_end="14:00",
                status="pending",
            ),
            Shipment(
                id="ship-apex-05",
                tenant_id="tenant-apex",
                title="Khanapara Heavy Fertilizer Movement [Jorabat Bypass]",
                origin_name=NODES["GW-HUB-001"]["name"],
                origin_lat=NODES["GW-HUB-001"]["lat"],
                origin_lng=NODES["GW-HUB-001"]["lng"],
                dest_name=NODES["GW-HUB-007"]["name"],
                dest_lat=NODES["GW-HUB-007"]["lat"],
                dest_lng=NODES["GW-HUB-007"]["lng"],
                weight_kg=15900.0,  # LF: ~0.80
                volume_m3=34.0,
                delivery_window_start="10:00",
                delivery_window_end="15:00",
                status="pending",
            ),
            # Backhaul Load-Pooling Deadhead-Capture Candidates
            Shipment(
                id="ship-apex-06-pool",
                tenant_id="tenant-apex",
                title="Bamunimaidam Scrap Metal Backhaul to Amingaon",
                origin_name=NODES["GW-HUB-004"]["name"],
                origin_lat=NODES["GW-HUB-004"]["lat"],
                origin_lng=NODES["GW-HUB-004"]["lng"],
                dest_name=NODES["GW-HUB-001"]["name"],
                dest_lat=NODES["GW-HUB-001"]["lat"],
                dest_lng=NODES["GW-HUB-001"]["lng"],
                weight_kg=8500.0,  # LF: ~0.43
                volume_m3=20.0,
                delivery_window_start="13:00",
                delivery_window_end="17:00",
                status="pending",
            ),
            Shipment(
                id="ship-apex-07-pool",
                tenant_id="tenant-apex",
                title="Khanapara Spices Backhaul to North Bank",
                origin_name=NODES["GW-HUB-007"]["name"],
                origin_lat=NODES["GW-HUB-007"]["lat"],
                origin_lng=NODES["GW-HUB-007"]["lng"],
                dest_name=NODES["GW-HUB-001"]["name"],
                dest_lat=NODES["GW-HUB-001"]["lat"],
                dest_lng=NODES["GW-HUB-001"]["lng"],
                weight_kg=6200.0,  # LF: ~0.31
                volume_m3=16.0,
                delivery_window_start="14:00",
                delivery_window_end="18:00",
                status="pending",
            ),
            Shipment(
                id="ship-apex-08-pool",
                tenant_id="tenant-apex",
                title="Rani Organic Herbs Backhaul to Jalukbari",
                origin_name=NODES["GW-HUB-005"]["name"],
                origin_lat=NODES["GW-HUB-005"]["lat"],
                origin_lng=NODES["GW-HUB-005"]["lng"],
                dest_name=NODES["GW-HUB-006"]["name"],
                dest_lat=NODES["GW-HUB-006"]["lat"],
                dest_lng=NODES["GW-HUB-006"]["lng"],
                weight_kg=4100.0,  # LF: ~0.21
                volume_m3=11.0,
                delivery_window_start="12:00",
                delivery_window_end="16:00",
                status="pending",
            ),
            Shipment(
                id="ship-apex-09-pool",
                tenant_id="tenant-apex",
                title="Azara Warehousing Reverse Cargo to Amingaon",
                origin_name=NODES["GW-HUB-010"]["name"],
                origin_lat=NODES["GW-HUB-010"]["lat"],
                origin_lng=NODES["GW-HUB-010"]["lng"],
                dest_name=NODES["GW-HUB-001"]["name"],
                dest_lat=NODES["GW-HUB-001"]["lat"],
                dest_lng=NODES["GW-HUB-001"]["lng"],
                weight_kg=10500.0,  # LF: ~0.53
                volume_m3=24.0,
                delivery_window_start="13:30",
                delivery_window_end="17:30",
                status="pending",
            ),
            Shipment(
                id="ship-apex-10",
                tenant_id="tenant-apex",
                title="Dispur IT Equipment Delivery",
                origin_name=NODES["GW-HUB-001"]["name"],
                origin_lat=NODES["GW-HUB-001"]["lat"],
                origin_lng=NODES["GW-HUB-001"]["lng"],
                dest_name=NODES["GW-HUB-008"]["name"],
                dest_lat=NODES["GW-HUB-008"]["lat"],
                dest_lng=NODES["GW-HUB-008"]["lng"],
                weight_kg=3200.0,  # LF: ~0.16
                volume_m3=8.5,
                delivery_window_start="11:00",
                delivery_window_end="15:00",
                status="pending",
            ),
        ]

        db.add_all(nw_shipments + apex_shipments)
        db.commit()

        # 7. Seed Initial Load-Pool Match (Proving Bipartite Deadhead Capture across Brahmaputra Corridor)
        # Northwind delivers from Betkuchi to Bamunimaidam (#ship-nw-03); Apex has return cargo from Bamunimaidam to Amingaon (#ship-apex-06-pool)
        pool_match = LoadPoolMatch(
            id="match-nw-apex-001",
            tenant_id="tenant-northwind",
            carrier_a_tenant_id="tenant-northwind",
            carrier_b_tenant_id="tenant-apex",
            carrier_a_name="Northwind Logistics",
            carrier_b_name="Apex Freight",
            empty_leg_title="Apex Freight Deadhead Backhaul: Bamunimaidam → Amingaon Container Corridor",
            matched_shipment_title="Northwind Bamunimaidam Delivery (#ship-nw-03)",
            origin_name=NODES["GW-HUB-004"]["name"],
            dest_name=NODES["GW-HUB-001"]["name"],
            origin_lat=NODES["GW-HUB-004"]["lat"],
            origin_lng=NODES["GW-HUB-004"]["lng"],
            dest_lat=NODES["GW-HUB-001"]["lat"],
            dest_lng=NODES["GW-HUB-001"]["lng"],
            distance_km=14.5,
            weight_kg=8500.0,
            co2_saved_kg=19.4,
            cost_saved_usd=69.60,
            match_score=0.92,
        )

        pool_match_2 = LoadPoolMatch(
            id="match-nw-apex-002",
            tenant_id="tenant-northwind",
            carrier_a_tenant_id="tenant-northwind",
            carrier_b_tenant_id="tenant-apex",
            carrier_a_name="Northwind Logistics",
            carrier_b_name="Apex Freight",
            empty_leg_title="Apex Freight Deadhead Backhaul: Khanapara → Amingaon Hub",
            matched_shipment_title="Northwind Khanapara Gate Consignment (#ship-nw-06)",
            origin_name=NODES["GW-HUB-007"]["name"],
            dest_name=NODES["GW-HUB-001"]["name"],
            origin_lat=NODES["GW-HUB-007"]["lat"],
            origin_lng=NODES["GW-HUB-007"]["lng"],
            dest_lat=NODES["GW-HUB-001"]["lat"],
            dest_lng=NODES["GW-HUB-001"]["lng"],
            distance_km=21.8,
            weight_kg=6200.0,
            co2_saved_kg=28.7,
            cost_saved_usd=104.64,
            match_score=0.88,
        )

        db.add_all([pool_match, pool_match_2])
        db.commit()

        print("Database seeded successfully with Guwahati / Assam Regional Logistics datasets (21 shipments, 7 vehicles).")
    finally:
        db.close()


if __name__ == "__main__":
    seed_database()
