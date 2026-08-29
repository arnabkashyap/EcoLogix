from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database.session import Base

class Route(Base):
    __tablename__ = "routes"

    id = Column(Integer, primary_key=True, index=True)
    vehicle_id = Column(Integer, ForeignKey("vehicles.id", ondelete="CASCADE"), nullable=False, index=True)
    route_type = Column(String(50), nullable=False, index=True)  # BASELINE, OPTIMIZED, PARETO
    total_distance_km = Column(Float, nullable=False)
    total_time_min = Column(Float, nullable=False)
    total_fuel_l = Column(Float, nullable=False)
    total_co2_kg = Column(Float, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Relationships
    vehicle = relationship("Vehicle", back_populates="routes")
    legs = relationship("RouteLeg", back_populates="route", cascade="all, delete-orphan")
