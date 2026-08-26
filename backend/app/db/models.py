"""
SQLAlchemy ORM Models for EcoLogix.
Every domain table contains `tenant_id` to enforce multi-tenant isolation.
"""

from datetime import datetime
import json
from sqlalchemy import (
    Column,
    String,
    Float,
    Integer,
    DateTime,
    ForeignKey,
    Text,
    Boolean,
)
from sqlalchemy.orm import relationship
from backend.app.db.database import Base


class Organization(Base):
    __tablename__ = "organizations"

    id = Column(String, primary_key=True, index=True)  # tenant-northwind, tenant-apex
    name = Column(String, nullable=False)
    depot_city = Column(String, nullable=False)
    depot_lat = Column(Float, nullable=False)
    depot_lng = Column(Float, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)


class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, index=True)
    tenant_id = Column(String, ForeignKey("organizations.id"), index=True, nullable=False)
    email = Column(String, nullable=False)
    name = Column(String, nullable=False)
    role = Column(String, default="Dispatcher")


class Fleet(Base):
    __tablename__ = "fleets"

    id = Column(String, primary_key=True, index=True)
    tenant_id = Column(String, ForeignKey("organizations.id"), index=True, nullable=False)
    name = Column(String, nullable=False)
    depot_location = Column(String, nullable=False)
    depot_lat = Column(Float, nullable=False)
    depot_lng = Column(Float, nullable=False)

    vehicles = relationship("Vehicle", back_populates="fleet")


class Vehicle(Base):
    __tablename__ = "vehicles"

    id = Column(String, primary_key=True, index=True)
    tenant_id = Column(String, ForeignKey("organizations.id"), index=True, nullable=False)
    fleet_id = Column(String, ForeignKey("fleets.id"), index=True, nullable=False)
    name = Column(String, nullable=False)
    vehicle_type = Column(String, nullable=False)  # heavy_truck, medium_truck, van, ev_truck
    fuel_type = Column(String, default="diesel")  # diesel, electric
    capacity_kg = Column(Float, nullable=False, default=15000.0)
    current_lat = Column(Float, nullable=False)
    current_lng = Column(Float, nullable=False)

    fleet = relationship("Fleet", back_populates="vehicles")


class Shipment(Base):
    __tablename__ = "shipments"

    id = Column(String, primary_key=True, index=True)
    tenant_id = Column(String, ForeignKey("organizations.id"), index=True, nullable=False)
    title = Column(String, nullable=False)
    origin_name = Column(String, nullable=False)
    origin_lat = Column(Float, nullable=False)
    origin_lng = Column(Float, nullable=False)
    dest_name = Column(String, nullable=False)
    dest_lat = Column(Float, nullable=False)
    dest_lng = Column(Float, nullable=False)
    weight_kg = Column(Float, nullable=False)
    volume_m3 = Column(Float, default=10.0)
    delivery_window_start = Column(String, default="08:00")
    delivery_window_end = Column(String, default="18:00")
    status = Column(String, default="pending")  # pending, assigned, completed


class Route(Base):
    __tablename__ = "routes"

    id = Column(String, primary_key=True, index=True)
    tenant_id = Column(String, ForeignKey("organizations.id"), index=True, nullable=False)
    vehicle_id = Column(String, ForeignKey("vehicles.id"), nullable=False)
    alpha = Column(Float, nullable=False, default=0.5)
    total_distance_km = Column(Float, nullable=False)
    total_time_min = Column(Float, nullable=False)
    total_co2_kg = Column(Float, nullable=False)
    baseline_co2_kg = Column(Float, nullable=False)
    co2_saved_pct = Column(Float, nullable=False)
    solution_quality = Column(String, default="optimal")
    created_at = Column(DateTime, default=datetime.utcnow)

    legs = relationship("RouteLeg", back_populates="route", cascade="all, delete-orphan")


class RouteLeg(Base):
    __tablename__ = "route_legs"

    id = Column(String, primary_key=True, index=True)
    route_id = Column(String, ForeignKey("routes.id"), index=True, nullable=False)
    sequence_order = Column(Integer, nullable=False)
    stop_name = Column(String, nullable=False)
    stop_type = Column(String, nullable=False)  # depot, pickup, delivery
    lat = Column(Float, nullable=False)
    lng = Column(Float, nullable=False)
    distance_km = Column(Float, nullable=False)
    time_min = Column(Float, nullable=False)
    load_kg = Column(Float, nullable=False)
    co2_kg = Column(Float, nullable=False)

    route = relationship("Route", back_populates="legs")


class LoadPoolMatch(Base):
    __tablename__ = "load_pool_matches"

    id = Column(String, primary_key=True, index=True)
    tenant_id = Column(String, nullable=False, index=True)  # Querying carrier
    carrier_a_tenant_id = Column(String, nullable=False)
    carrier_b_tenant_id = Column(String, nullable=False)
    carrier_a_name = Column(String, nullable=False)
    carrier_b_name = Column(String, nullable=False)
    empty_leg_title = Column(String, nullable=False)
    matched_shipment_title = Column(String, nullable=False)
    origin_name = Column(String, nullable=False)
    dest_name = Column(String, nullable=False)
    origin_lat = Column(Float, nullable=False)
    origin_lng = Column(Float, nullable=False)
    dest_lat = Column(Float, nullable=False)
    dest_lng = Column(Float, nullable=False)
    distance_km = Column(Float, nullable=False)
    weight_kg = Column(Float, nullable=False)
    co2_saved_kg = Column(Float, nullable=False)
    cost_saved_usd = Column(Float, nullable=False)
    match_score = Column(Float, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)


class OptimizationJob(Base):
    __tablename__ = "optimization_jobs"

    id = Column(String, primary_key=True, index=True)
    tenant_id = Column(String, ForeignKey("organizations.id"), index=True, nullable=False)
    status = Column(String, nullable=False, default="pending")  # pending, processing, completed, failed
    vehicle_id = Column(String, nullable=False)
    shipment_ids_json = Column(Text, nullable=False)
    alpha = Column(Float, nullable=False, default=0.5)
    result_json = Column(Text, nullable=True)
    error = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)
