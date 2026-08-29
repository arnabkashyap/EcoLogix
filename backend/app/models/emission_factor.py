from sqlalchemy import Column, Integer, String, Float, DateTime
from sqlalchemy.sql import func
from app.database.session import Base

class EmissionFactor(Base):
    __tablename__ = "emission_factors"

    id = Column(Integer, primary_key=True, index=True)
    fuel_type = Column(String(50), nullable=False, unique=True, index=True)  # DIESEL, PETROL, ELECTRIC
    kg_co2_per_unit = Column(Float, nullable=False)  # e.g., 2.68 kg CO2/L for DIESEL
    unit = Column(String(50), nullable=False)  # "litre", "kWh"
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
