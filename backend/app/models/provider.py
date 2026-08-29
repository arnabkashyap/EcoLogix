from sqlalchemy import Column, Integer, String, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database.session import Base

class Provider(Base):
    __tablename__ = "providers"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False, index=True)
    home_depot_location = Column(String(255), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Relationships
    vehicles = relationship("Vehicle", back_populates="provider", cascade="all, delete-orphan")
    shipments = relationship("Shipment", back_populates="provider", cascade="all, delete-orphan")
