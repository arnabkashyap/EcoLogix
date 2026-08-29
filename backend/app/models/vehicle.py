import enum
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Enum as SQLEnum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database.session import Base

class VehicleType(str, enum.Enum):
    VAN = "VAN"
    MHCV = "MHCV"
    HCV = "HCV"
    EV = "EV"

class FuelType(str, enum.Enum):
    DIESEL = "DIESEL"
    PETROL = "PETROL"
    ELECTRIC = "ELECTRIC"

class Vehicle(Base):
    __tablename__ = "vehicles"

    id = Column(Integer, primary_key=True, index=True)
    provider_id = Column(Integer, ForeignKey("providers.id", ondelete="CASCADE"), nullable=False, index=True)
    vehicle_type = Column(String(50), nullable=False, index=True)
    fuel_type = Column(String(50), nullable=False, index=True)
    capacity_kg = Column(Float, nullable=False)
    fuel_efficiency_km_per_l = Column(Float, nullable=False)
    current_lat = Column(Float, nullable=False)
    current_lng = Column(Float, nullable=False)
    status = Column(String(50), default="ACTIVE", nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Relationships
    provider = relationship("Provider", back_populates="vehicles")
    routes = relationship("Route", back_populates="vehicle", cascade="all, delete-orphan")
    load_pool_matches = relationship("LoadPoolMatch", back_populates="vehicle", cascade="all, delete-orphan")
