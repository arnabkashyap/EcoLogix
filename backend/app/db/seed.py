"""
Seed Script for EcoLogix.
Seeds comprehensive, realistic Guwahati / Assam regional logistics datasets for two distinct tenants:
1. Tenant A ("tenant-northwind"): Northwind Logistics (Betkuchi ISBT Freight Terminal, Guwahati)
2. Tenant B ("tenant-apex"): Apex Freight (ICD Amingaon Multi-Modal Depot, Guwahati)

Fully grounded in the Guwahati/Assam node registry (GW-HUB-001 through GW-HUB-016)
from data-flow-dynamic.md with mixed Diesel/EV fleets, multi-stop routes, verified
bipartite load-pooling backhauls, climate hazard corridors, and completed optimization jobs.
"""

import sys
import os
from datetime import datetime, timezone, timedelta

# Ensure project root is on sys.path for direct CLI script execution
PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

import json
from backend.app.db.database import Base, engine, SessionLocal
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
from backend.app.core.optimizer import optimize_route_vrp


# -------------------------------------------------------------------------
# GUWAHATI / ASSAM LOGISTICS NODE REGISTRY (Authoritative Coordinates)
# -------------------------------------------------------------------------
NODES = {
    "GW-HUB-001": {
        "id": "GW-HUB-001",
        "name": "ICD Amingaon Container Depot",
        "lat": 26.1852,
        "lng": 91.6811,
        "category": "Multimodal Hub",
        "corridor": "Saraighat North",
    },
    "GW-HUB-002": {
        "id": "GW-HUB-002",
        "name": "Betkuchi ISBT Freight Terminal",
        "lat": 26.1214,
        "lng": 91.7319,
        "category": "Distribution Center",
        "corridor": "NH-27 Central",
    },
    "GW-HUB-003": {
        "id": "GW-HUB-003",
        "name": "LGBI Airport Cargo Terminal",
        "lat": 26.1061,
        "lng": 91.5859,
        "category": "Air Freight Hub",
        "corridor": "Airport Expressway",
    },
    "GW-HUB-004": {
        "id": "GW-HUB-004",
        "name": "Bamunimaidam Industrial Estate",
        "lat": 26.1884,
        "lng": 91.7821,
        "category": "Industrial Node",
        "corridor": "Brahmaputra Floodplain East",
    },
    "GW-HUB-005": {
        "id": "GW-HUB-005",
        "name": "Rani Industrial Corridor",
        "lat": 26.0612,
        "lng": 91.6115,
        "category": "Eco Industrial Park",
        "corridor": "South-West Rani Pass",
    },
    "GW-HUB-006": {
        "id": "GW-HUB-006",
        "name": "Jalukbari Junction Node",
        "lat": 26.1558,
        "lng": 91.6625,
        "category": "Transit Gateway",
        "corridor": "Saraighat South Approach",
    },
    "GW-HUB-007": {
        "id": "GW-HUB-007",
        "name": "Khanapara Commercial Gate",
        "lat": 26.1189,
        "lng": 91.8214,
        "category": "Transit Gateway",
        "corridor": "Jorabat Pass Meghalaya Entry",
    },
    "GW-HUB-008": {
        "id": "GW-HUB-008",
        "name": "Dispur Secretariat Node",
        "lat": 26.1432,
        "lng": 91.7898,
        "category": "Retail Consignment",
        "corridor": "Capital Complex",
    },
    "GW-HUB-009": {
        "id": "GW-HUB-009",
        "name": "Fancy Bazar Commercial Core",
        "lat": 26.1864,
        "lng": 91.7441,
        "category": "Trade Center",
        "corridor": "Old City Wholesale",
    },
    "GW-HUB-010": {
        "id": "GW-HUB-010",
        "name": "Azara Industrial Park",
        "lat": 26.1154,
        "lng": 91.6092,
        "category": "Logistics Node",
        "corridor": "Airport Logistics Zone",
    },
    "GW-HUB-011": {
        "id": "GW-HUB-011",
        "name": "Changsari Logistics Hub",
        "lat": 26.2410,
        "lng": 91.6720,
        "category": "Logistics Park",
        "corridor": "NH-27 North Bank Bypass",
    },
    "GW-HUB-012": {
        "id": "GW-HUB-012",
        "name": "Noonmati Refinery Freight Depot",
        "lat": 26.1950,
        "lng": 91.8020,
        "category": "Petroleum & Heavy Cargo",
        "corridor": "Brahmaputra Floodplain East",
    },
    "GW-HUB-013": {
        "id": "GW-HUB-013",
        "name": "Beltola Trade & Parcel Center",
        "lat": 26.1280,
        "lng": 91.7920,
        "category": "Commercial Node",
        "corridor": "South Guwahati Ring",
    },
    "GW-HUB-014": {
        "id": "GW-HUB-014",
        "name": "North Guwahati Inland River Port",
        "lat": 26.2050,
        "lng": 91.7210,
        "category": "River Freight Terminal",
        "corridor": "National Waterway 2",
    },
    "GW-HUB-015": {
        "id": "GW-HUB-015",
        "name": "Borjhar Air Cargo Warehouse",
        "lat": 26.1020,
        "lng": 91.6010,
        "category": "Air Cargo Complex",
        "corridor": "LGBI South Wing",
    },
    "GW-HUB-016": {
        "id": "GW-HUB-016",
        "name": "Paltan Bazar Railway Freight Yard",
        "lat": 26.1780,
        "lng": 91.7510,
        "category": "Rail Freight Terminal",
        "corridor": "Guwahati Central Junction",
    },
}


def seed_database(force: bool = False):
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    try:
        # Check if database is already seeded with full expanded dataset
        existing_org = db.query(Organization).filter(Organization.id == "tenant-northwind").first()
        existing_shipments_count = db.query(Shipment).count()
        existing_jobs_count = db.query(OptimizationJob).count()

        if not force and existing_org and existing_shipments_count >= 25 and existing_jobs_count >= 2:
            return

        # Clear existing tables to ensure clean, idempotent fresh seed
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

        # ---------------------------------------------------------------------
        # 1. ORGANIZATIONS (Multi-Tenant Carriers)
        # ---------------------------------------------------------------------
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

        # ---------------------------------------------------------------------
        # 2. USERS
        # ---------------------------------------------------------------------
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

        # ---------------------------------------------------------------------
        # 3. FLEETS
        # ---------------------------------------------------------------------
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

        # ---------------------------------------------------------------------
        # 4. VEHICLES (Mixed Heavy Diesel, EV Freightliner, Medium Diesel, EV Carrier)
        # ---------------------------------------------------------------------
        vehicles = [
            # Tenant A: Northwind Logistics (Betkuchi Base)
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
            Vehicle(
                id="veh-nw-103",
                tenant_id="tenant-northwind",
                fleet_id="fleet-nw-main",
                name="NW Mahindra Furio Medium Hauler #103",
                vehicle_type="medium_truck",
                fuel_type="diesel",
                capacity_kg=8000.0,
                current_lat=NODES["GW-HUB-002"]["lat"],
                current_lng=NODES["GW-HUB-002"]["lng"],
            ),
            Vehicle(
                id="veh-nw-203",
                tenant_id="tenant-northwind",
                fleet_id="fleet-nw-main",
                name="NW Tata Ultra EV Medium Carrier #203",
                vehicle_type="ev_truck",
                fuel_type="electric",
                capacity_kg=8000.0,
                current_lat=NODES["GW-HUB-002"]["lat"],
                current_lng=NODES["GW-HUB-002"]["lng"],
            ),
            # Tenant B: Apex Freight (Amingaon Base)
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
            Vehicle(
                id="veh-apex-403",
                tenant_id="tenant-apex",
                fleet_id="fleet-apex-main",
                name="Apex Ashok Leyland E-Transit #403",
                vehicle_type="ev_truck",
                fuel_type="electric",
                capacity_kg=6000.0,
                current_lat=NODES["GW-HUB-001"]["lat"],
                current_lng=NODES["GW-HUB-001"]["lng"],
            ),
        ]
        db.add_all(vehicles)
        db.commit()

        # ---------------------------------------------------------------------
        # 5. SHIPMENTS FOR NORTHWIND LOGISTICS (Tenant A — 16 Shipments)
        # ---------------------------------------------------------------------
        # Calibrated with varied loads, time windows, and Guwahati POI destinations
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
                weight_kg=12500.0,
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
                weight_kg=3600.0,
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
                weight_kg=15200.0,
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
                weight_kg=16800.0,
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
                weight_kg=4800.0,
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
                weight_kg=14100.0,
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
                weight_kg=5400.0,
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
                weight_kg=8900.0,
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
                weight_kg=9800.0,
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
                weight_kg=7200.0,
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
                weight_kg=11200.0,
                volume_m3=25.0,
                delivery_window_start="14:00",
                delivery_window_end="18:00",
                status="pending",
            ),
            Shipment(
                id="ship-nw-12",
                tenant_id="tenant-northwind",
                title="Changsari North Bank Cement Feed",
                origin_name=NODES["GW-HUB-002"]["name"],
                origin_lat=NODES["GW-HUB-002"]["lat"],
                origin_lng=NODES["GW-HUB-002"]["lng"],
                dest_name=NODES["GW-HUB-011"]["name"],
                dest_lat=NODES["GW-HUB-011"]["lat"],
                dest_lng=NODES["GW-HUB-011"]["lng"],
                weight_kg=16000.0,
                volume_m3=32.0,
                delivery_window_start="07:30",
                delivery_window_end="11:00",
                status="pending",
            ),
            Shipment(
                id="ship-nw-13",
                tenant_id="tenant-northwind",
                title="Noonmati Refinery Industrial Lubricants",
                origin_name=NODES["GW-HUB-002"]["name"],
                origin_lat=NODES["GW-HUB-002"]["lat"],
                origin_lng=NODES["GW-HUB-002"]["lng"],
                dest_name=NODES["GW-HUB-012"]["name"],
                dest_lat=NODES["GW-HUB-012"]["lat"],
                dest_lng=NODES["GW-HUB-012"]["lng"],
                weight_kg=10400.0,
                volume_m3=22.0,
                delivery_window_start="09:00",
                delivery_window_end="13:30",
                status="pending",
            ),
            Shipment(
                id="ship-nw-14",
                tenant_id="tenant-northwind",
                title="Beltola Organic Tea Retail Supply",
                origin_name=NODES["GW-HUB-002"]["name"],
                origin_lat=NODES["GW-HUB-002"]["lat"],
                origin_lng=NODES["GW-HUB-002"]["lng"],
                dest_name=NODES["GW-HUB-013"]["name"],
                dest_lat=NODES["GW-HUB-013"]["lat"],
                dest_lng=NODES["GW-HUB-013"]["lng"],
                weight_kg=4200.0,
                volume_m3=12.0,
                delivery_window_start="10:00",
                delivery_window_end="14:00",
                status="pending",
            ),
            Shipment(
                id="ship-nw-15",
                tenant_id="tenant-northwind",
                title="North Guwahati River Port Jute Bales",
                origin_name=NODES["GW-HUB-002"]["name"],
                origin_lat=NODES["GW-HUB-002"]["lat"],
                origin_lng=NODES["GW-HUB-002"]["lng"],
                dest_name=NODES["GW-HUB-014"]["name"],
                dest_lat=NODES["GW-HUB-014"]["lat"],
                dest_lng=NODES["GW-HUB-014"]["lng"],
                weight_kg=13500.0,
                volume_m3=28.0,
                delivery_window_start="08:30",
                delivery_window_end="12:30",
                status="pending",
            ),
            Shipment(
                id="ship-nw-16",
                tenant_id="tenant-northwind",
                title="Paltan Bazar Rail Freight Transfer",
                origin_name=NODES["GW-HUB-002"]["name"],
                origin_lat=NODES["GW-HUB-002"]["lat"],
                origin_lng=NODES["GW-HUB-002"]["lng"],
                dest_name=NODES["GW-HUB-016"]["name"],
                dest_lat=NODES["GW-HUB-016"]["lat"],
                dest_lng=NODES["GW-HUB-016"]["lng"],
                weight_kg=8100.0,
                volume_m3=19.0,
                delivery_window_start="11:00",
                delivery_window_end="15:30",
                status="pending",
            ),
        ]

        # ---------------------------------------------------------------------
        # 6. SHIPMENTS FOR APEX FREIGHT (Tenant B — 14 Shipments)
        # ---------------------------------------------------------------------
        # Specially calibrated with return backhaul candidates that match Northwind's return corridors
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
                weight_kg=17000.0,
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
                weight_kg=8400.0,
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
                weight_kg=13800.0,
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
                weight_kg=9200.0,
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
                weight_kg=15900.0,
                volume_m3=34.0,
                delivery_window_start="10:00",
                delivery_window_end="15:00",
                status="pending",
            ),
            # Backhaul Load-Pooling Deadhead-Capture Candidates (Matching Northwind Return Corridors)
            Shipment(
                id="ship-apex-06-pool",
                tenant_id="tenant-apex",
                title="Bamunimaidam Scrap Metal Backhaul to Betkuchi",
                origin_name=NODES["GW-HUB-004"]["name"],
                origin_lat=NODES["GW-HUB-004"]["lat"],
                origin_lng=NODES["GW-HUB-004"]["lng"],
                dest_name=NODES["GW-HUB-002"]["name"],
                dest_lat=NODES["GW-HUB-002"]["lat"],
                dest_lng=NODES["GW-HUB-002"]["lng"],
                weight_kg=8500.0,
                volume_m3=20.0,
                delivery_window_start="13:00",
                delivery_window_end="17:00",
                status="pending",
            ),
            Shipment(
                id="ship-apex-07-pool",
                tenant_id="tenant-apex",
                title="Khanapara Spices Backhaul to Betkuchi Terminal",
                origin_name=NODES["GW-HUB-007"]["name"],
                origin_lat=NODES["GW-HUB-007"]["lat"],
                origin_lng=NODES["GW-HUB-007"]["lng"],
                dest_name=NODES["GW-HUB-002"]["name"],
                dest_lat=NODES["GW-HUB-002"]["lat"],
                dest_lng=NODES["GW-HUB-002"]["lng"],
                weight_kg=6200.0,
                volume_m3=16.0,
                delivery_window_start="11:00",
                delivery_window_end="16:00",
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
                weight_kg=4100.0,
                volume_m3=11.0,
                delivery_window_start="12:00",
                delivery_window_end="16:00",
                status="pending",
            ),
            Shipment(
                id="ship-apex-09-pool",
                tenant_id="tenant-apex",
                title="Azara Warehousing Reverse Cargo to Betkuchi",
                origin_name=NODES["GW-HUB-010"]["name"],
                origin_lat=NODES["GW-HUB-010"]["lat"],
                origin_lng=NODES["GW-HUB-010"]["lng"],
                dest_name=NODES["GW-HUB-002"]["name"],
                dest_lat=NODES["GW-HUB-002"]["lat"],
                dest_lng=NODES["GW-HUB-002"]["lng"],
                weight_kg=7400.0,
                volume_m3=19.0,
                delivery_window_start="12:30",
                delivery_window_end="17:00",
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
                weight_kg=3200.0,
                volume_m3=8.5,
                delivery_window_start="11:00",
                delivery_window_end="15:00",
                status="pending",
            ),
            Shipment(
                id="ship-apex-11-pool",
                tenant_id="tenant-apex",
                title="Changsari North Bank Freight to Betkuchi Hub",
                origin_name=NODES["GW-HUB-011"]["name"],
                origin_lat=NODES["GW-HUB-011"]["lat"],
                origin_lng=NODES["GW-HUB-011"]["lng"],
                dest_name=NODES["GW-HUB-002"]["name"],
                dest_lat=NODES["GW-HUB-002"]["lat"],
                dest_lng=NODES["GW-HUB-002"]["lng"],
                weight_kg=9100.0,
                volume_m3=21.0,
                delivery_window_start="10:00",
                delivery_window_end="15:00",
                status="pending",
            ),
            Shipment(
                id="ship-apex-12-pool",
                tenant_id="tenant-apex",
                title="Noonmati Petrochemicals to Amingaon Depot",
                origin_name=NODES["GW-HUB-012"]["name"],
                origin_lat=NODES["GW-HUB-012"]["lat"],
                origin_lng=NODES["GW-HUB-012"]["lng"],
                dest_name=NODES["GW-HUB-001"]["name"],
                dest_lat=NODES["GW-HUB-001"]["lat"],
                dest_lng=NODES["GW-HUB-001"]["lng"],
                weight_kg=11500.0,
                volume_m3=24.0,
                delivery_window_start="13:00",
                delivery_window_end="17:30",
                status="pending",
            ),
            Shipment(
                id="ship-apex-13",
                tenant_id="tenant-apex",
                title="Beltola Commercial Hardware Delivery",
                origin_name=NODES["GW-HUB-001"]["name"],
                origin_lat=NODES["GW-HUB-001"]["lat"],
                origin_lng=NODES["GW-HUB-001"]["lng"],
                dest_name=NODES["GW-HUB-013"]["name"],
                dest_lat=NODES["GW-HUB-013"]["lat"],
                dest_lng=NODES["GW-HUB-013"]["lng"],
                weight_kg=6800.0,
                volume_m3=17.0,
                delivery_window_start="10:30",
                delivery_window_end="14:30",
                status="pending",
            ),
            Shipment(
                id="ship-apex-14",
                tenant_id="tenant-apex",
                title="North Guwahati Container to Paltan Bazar",
                origin_name=NODES["GW-HUB-014"]["name"],
                origin_lat=NODES["GW-HUB-014"]["lat"],
                origin_lng=NODES["GW-HUB-014"]["lng"],
                dest_name=NODES["GW-HUB-016"]["name"],
                dest_lat=NODES["GW-HUB-016"]["lat"],
                dest_lng=NODES["GW-HUB-016"]["lng"],
                weight_kg=12000.0,
                volume_m3=27.0,
                delivery_window_start="09:00",
                delivery_window_end="13:00",
                status="pending",
            ),
        ]

        db.add_all(nw_shipments + apex_shipments)
        db.commit()

        # ---------------------------------------------------------------------
        # 7. LOAD-POOL MATCHES (Pre-calculated Matches for Both Tenants)
        # ---------------------------------------------------------------------
        pool_matches = [
            # Matches for Northwind (Tenant A)
            LoadPoolMatch(
                id="match-nw-apex-001",
                tenant_id="tenant-northwind",
                carrier_a_tenant_id="tenant-northwind",
                carrier_b_tenant_id="tenant-apex",
                carrier_a_name="Northwind Logistics",
                carrier_b_name="Apex Freight",
                empty_leg_title="Apex Freight Deadhead Backhaul: Bamunimaidam → Betkuchi Terminal",
                matched_shipment_title="Northwind Bamunimaidam Delivery (#ship-nw-03)",
                origin_name=NODES["GW-HUB-004"]["name"],
                dest_name=NODES["GW-HUB-002"]["name"],
                origin_lat=NODES["GW-HUB-004"]["lat"],
                origin_lng=NODES["GW-HUB-004"]["lng"],
                dest_lat=NODES["GW-HUB-002"]["lat"],
                dest_lng=NODES["GW-HUB-002"]["lng"],
                distance_km=14.5,
                weight_kg=8500.0,
                co2_saved_kg=19.4,
                cost_saved_usd=69.60,
                match_score=0.92,
            ),
            LoadPoolMatch(
                id="match-nw-apex-002",
                tenant_id="tenant-northwind",
                carrier_a_tenant_id="tenant-northwind",
                carrier_b_tenant_id="tenant-apex",
                carrier_a_name="Northwind Logistics",
                carrier_b_name="Apex Freight",
                empty_leg_title="Apex Freight Deadhead Backhaul: Khanapara → Betkuchi Terminal",
                matched_shipment_title="Northwind Khanapara Gate Consignment (#ship-nw-06)",
                origin_name=NODES["GW-HUB-007"]["name"],
                dest_name=NODES["GW-HUB-002"]["name"],
                origin_lat=NODES["GW-HUB-007"]["lat"],
                origin_lng=NODES["GW-HUB-007"]["lng"],
                dest_lat=NODES["GW-HUB-002"]["lat"],
                dest_lng=NODES["GW-HUB-002"]["lng"],
                distance_km=21.8,
                weight_kg=6200.0,
                co2_saved_kg=28.7,
                cost_saved_usd=104.64,
                match_score=0.88,
            ),
            # Matches for Apex Freight (Tenant B)
            LoadPoolMatch(
                id="match-apex-nw-001",
                tenant_id="tenant-apex",
                carrier_a_tenant_id="tenant-apex",
                carrier_b_tenant_id="tenant-northwind",
                carrier_a_name="Apex Freight",
                carrier_b_name="Northwind Logistics",
                empty_leg_title="Northwind Backhaul: Betkuchi ISBT → ICD Amingaon Corridor",
                matched_shipment_title="Apex FMCG Delivery to Betkuchi (#ship-apex-03)",
                origin_name=NODES["GW-HUB-002"]["name"],
                dest_name=NODES["GW-HUB-001"]["name"],
                origin_lat=NODES["GW-HUB-002"]["lat"],
                origin_lng=NODES["GW-HUB-002"]["lng"],
                dest_lat=NODES["GW-HUB-001"]["lat"],
                dest_lng=NODES["GW-HUB-001"]["lng"],
                distance_km=18.2,
                weight_kg=12500.0,
                co2_saved_kg=24.1,
                cost_saved_usd=87.36,
                match_score=0.94,
            ),
            LoadPoolMatch(
                id="match-apex-nw-002",
                tenant_id="tenant-apex",
                carrier_a_tenant_id="tenant-apex",
                carrier_b_tenant_id="tenant-northwind",
                carrier_a_name="Apex Freight",
                carrier_b_name="Northwind Logistics",
                empty_leg_title="Northwind Backhaul: Changsari → ICD Amingaon Container Yard",
                matched_shipment_title="Apex Changsari North Bank Movement (#ship-apex-11-pool)",
                origin_name=NODES["GW-HUB-011"]["name"],
                dest_name=NODES["GW-HUB-001"]["name"],
                origin_lat=NODES["GW-HUB-011"]["lat"],
                origin_lng=NODES["GW-HUB-011"]["lng"],
                dest_lat=NODES["GW-HUB-001"]["lat"],
                dest_lng=NODES["GW-HUB-001"]["lng"],
                distance_km=16.4,
                weight_kg=9100.0,
                co2_saved_kg=21.6,
                cost_saved_usd=78.72,
                match_score=0.90,
            ),
        ]
        db.add_all(pool_matches)
        db.commit()

        # ---------------------------------------------------------------------
        # 8. PRE-COMPLETED OPTIMIZATION JOBS & ROUTES (For Immediate Non-Empty Impact Summary)
        # ---------------------------------------------------------------------
        # Build pre-computed realistic jobs using the actual optimizer engine
        nw_depot_stop = {
            "id": "depot",
            "title": "Northwind Betkuchi Depot",
            "lat": NODES["GW-HUB-002"]["lat"],
            "lng": NODES["GW-HUB-002"]["lng"],
            "stop_type": "depot",
            "load_kg": 0.0,
        }
        nw_sample_stops = [
            {
                "id": "ship-nw-01",
                "title": "Amingaon Export Tea Consignment [Saraighat Corridor]",
                "dest_name": NODES["GW-HUB-001"]["name"],
                "lat": NODES["GW-HUB-001"]["lat"],
                "lng": NODES["GW-HUB-001"]["lng"],
                "stop_type": "delivery",
                "load_kg": 12500.0,
            },
            {
                "id": "ship-nw-03",
                "title": "Bamunimaidam Industrial Raw Polymers",
                "dest_name": NODES["GW-HUB-004"]["name"],
                "lat": NODES["GW-HUB-004"]["lat"],
                "lng": NODES["GW-HUB-004"]["lng"],
                "stop_type": "delivery",
                "load_kg": 15200.0,
            },
            {
                "id": "ship-nw-06",
                "title": "Khanapara Meghalaya Freight Gateway [Jorabat Pass]",
                "dest_name": NODES["GW-HUB-007"]["name"],
                "lat": NODES["GW-HUB-007"]["lat"],
                "lng": NODES["GW-HUB-007"]["lng"],
                "stop_type": "delivery",
                "load_kg": 14100.0,
            },
        ]

        nw_opt_result = optimize_route_vrp(
            depot=nw_depot_stop,
            stops=nw_sample_stops,
            vehicle_type="heavy_truck",
            alpha=0.5,
        )

        completed_time = datetime.now(timezone.utc) - timedelta(hours=2)

        job_nw_1 = OptimizationJob(
            id="job-nw-hist-001",
            tenant_id="tenant-northwind",
            status="completed",
            vehicle_id="veh-nw-101",
            shipment_ids_json=json.dumps(["ship-nw-01", "ship-nw-03", "ship-nw-06"]),
            alpha=0.5,
            result_json=json.dumps(nw_opt_result),
            created_at=completed_time - timedelta(minutes=15),
            completed_at=completed_time,
        )

        route_nw_1 = Route(
            id="route-nw-hist-001",
            tenant_id="tenant-northwind",
            vehicle_id="veh-nw-101",
            alpha=0.5,
            total_distance_km=nw_opt_result["total_distance_km"],
            total_time_min=nw_opt_result["total_time_min"],
            total_co2_kg=nw_opt_result["total_co2_kg"],
            baseline_co2_kg=nw_opt_result["baseline_co2_kg"],
            co2_saved_pct=nw_opt_result["co2_saved_pct"],
            solution_quality="optimal",
            created_at=completed_time,
        )

        db.add_all([job_nw_1, route_nw_1])
        db.commit()

        # Seed route legs
        for leg_data in nw_opt_result.get("legs", []):
            leg = RouteLeg(
                id=f"leg-nw-{leg_data['sequence_order']}-{route_nw_1.id}",
                route_id=route_nw_1.id,
                sequence_order=leg_data["sequence_order"],
                stop_name=leg_data["to_stop"],
                stop_type="delivery" if leg_data["sequence_order"] < len(nw_opt_result["legs"]) else "depot",
                lat=leg_data["to_lat"],
                lng=leg_data["to_lng"],
                distance_km=leg_data["distance_km"],
                time_min=leg_data["time_min"],
                load_kg=leg_data.get("load_kg", 0.0),
                co2_kg=leg_data["co2_kg"],
            )
            db.add(leg)

        # Pre-computed Job for Apex Freight (Tenant B)
        apex_depot_stop = {
            "id": "depot",
            "title": "Apex Amingaon Depot",
            "lat": NODES["GW-HUB-001"]["lat"],
            "lng": NODES["GW-HUB-001"]["lng"],
            "stop_type": "depot",
            "load_kg": 0.0,
        }
        apex_sample_stops = [
            {
                "id": "ship-apex-01",
                "title": "Amingaon Heavy Steel Coil Import",
                "dest_name": NODES["GW-HUB-004"]["name"],
                "lat": NODES["GW-HUB-004"]["lat"],
                "lng": NODES["GW-HUB-004"]["lng"],
                "stop_type": "delivery",
                "load_kg": 17000.0,
            },
            {
                "id": "ship-apex-03",
                "title": "Amingaon to Betkuchi Bulk FMCG Transfer",
                "dest_name": NODES["GW-HUB-002"]["name"],
                "lat": NODES["GW-HUB-002"]["lat"],
                "lng": NODES["GW-HUB-002"]["lng"],
                "stop_type": "delivery",
                "load_kg": 13800.0,
            },
            {
                "id": "ship-apex-05",
                "title": "Khanapara Heavy Fertilizer Movement [Jorabat Bypass]",
                "dest_name": NODES["GW-HUB-007"]["name"],
                "lat": NODES["GW-HUB-007"]["lat"],
                "lng": NODES["GW-HUB-007"]["lng"],
                "stop_type": "delivery",
                "load_kg": 15900.0,
            },
        ]

        apex_opt_result = optimize_route_vrp(
            depot=apex_depot_stop,
            stops=apex_sample_stops,
            vehicle_type="heavy_truck",
            alpha=0.5,
        )

        job_apex_1 = OptimizationJob(
            id="job-apex-hist-001",
            tenant_id="tenant-apex",
            status="completed",
            vehicle_id="veh-apex-301",
            shipment_ids_json=json.dumps(["ship-apex-01", "ship-apex-03", "ship-apex-05"]),
            alpha=0.5,
            result_json=json.dumps(apex_opt_result),
            created_at=completed_time - timedelta(minutes=20),
            completed_at=completed_time,
        )

        route_apex_1 = Route(
            id="route-apex-hist-001",
            tenant_id="tenant-apex",
            vehicle_id="veh-apex-301",
            alpha=0.5,
            total_distance_km=apex_opt_result["total_distance_km"],
            total_time_min=apex_opt_result["total_time_min"],
            total_co2_kg=apex_opt_result["total_co2_kg"],
            baseline_co2_kg=apex_opt_result["baseline_co2_kg"],
            co2_saved_pct=apex_opt_result["co2_saved_pct"],
            solution_quality="optimal",
            created_at=completed_time,
        )

        db.add_all([job_apex_1, route_apex_1])
        db.commit()

        for leg_data in apex_opt_result.get("legs", []):
            leg = RouteLeg(
                id=f"leg-apex-{leg_data['sequence_order']}-{route_apex_1.id}",
                route_id=route_apex_1.id,
                sequence_order=leg_data["sequence_order"],
                stop_name=leg_data["to_stop"],
                stop_type="delivery" if leg_data["sequence_order"] < len(apex_opt_result["legs"]) else "depot",
                lat=leg_data["to_lat"],
                lng=leg_data["to_lng"],
                distance_km=leg_data["distance_km"],
                time_min=leg_data["time_min"],
                load_kg=leg_data.get("load_kg", 0.0),
                co2_kg=leg_data["co2_kg"],
            )
            db.add(leg)

        db.commit()

        print(
            f"Database seeded successfully with Guwahati / Assam Regional Logistics datasets "
            f"({len(nw_shipments) + len(apex_shipments)} shipments, {len(vehicles)} vehicles, "
            f"{len(pool_matches)} load pool matches, and 2 completed optimization jobs)."
        )
    finally:
        db.close()


if __name__ == "__main__":
    seed_database(force=True)

