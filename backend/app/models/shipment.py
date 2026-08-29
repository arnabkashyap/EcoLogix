from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database.session import Base

class Shipment(Base):
    __tablename__ = "shipments"

    id = Column(Integer, primary_key=True, index=True)
    provider_id = Column(Integer, ForeignKey("providers.id", ondelete="CASCADE"), nullable=False, index=True)
    pickup_name = Column(String(255), nullable=False)
    pickup_lat = Column(Float, nullable=False)
    pickup_lng = Column(Float, nullable=False)
    destination_name = Column(String(255), nullable=False)
    destination_lat = Column(Float, nullable=False)
    destination_lng = Column(Float, nullable=False)
    weight_kg = Column(Float, nullable=False)
    volume = Column(Float, nullable=True)
    delivery_window_start = Column(DateTime(timezone=True), nullable=False)
    delivery_window_end = Column(DateTime(timezone=True), nullable=False)
    status = Column(String(50), default="PENDING", nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Relationships
    provider = relationship("Provider", back_populates="shipments")
    load_pool_matches = relationship("LoadPoolMatch", back_populates="shipment", cascade="all, delete-orphan")
