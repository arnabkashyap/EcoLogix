from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database.session import Base

class LoadPoolMatch(Base):
    __tablename__ = "load_pool_matches"

    id = Column(Integer, primary_key=True, index=True)
    vehicle_id = Column(Integer, ForeignKey("vehicles.id", ondelete="CASCADE"), nullable=False, index=True)
    shipment_id = Column(Integer, ForeignKey("shipments.id", ondelete="CASCADE"), nullable=False, index=True)
    empty_distance_km = Column(Float, nullable=False)
    co2_saved_kg = Column(Float, nullable=False)
    cost_saved = Column(Float, nullable=True)
    match_score = Column(Float, nullable=False)
    status = Column(String(50), default="CANDIDATE", nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Relationships
    vehicle = relationship("Vehicle", back_populates="load_pool_matches")
    shipment = relationship("Shipment", back_populates="load_pool_matches")
