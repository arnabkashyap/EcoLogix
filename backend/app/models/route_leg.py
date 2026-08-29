from sqlalchemy import Column, Integer, String, Float, ForeignKey
from sqlalchemy.orm import relationship
from app.database.session import Base

class RouteLeg(Base):
    __tablename__ = "route_legs"

    id = Column(Integer, primary_key=True, index=True)
    route_id = Column(Integer, ForeignKey("routes.id", ondelete="CASCADE"), nullable=False, index=True)
    sequence = Column(Integer, nullable=False)
    from_name = Column(String(255), nullable=False)
    from_lat = Column(Float, nullable=False)
    from_lng = Column(Float, nullable=False)
    to_name = Column(String(255), nullable=False)
    to_lat = Column(Float, nullable=False)
    to_lng = Column(Float, nullable=False)
    distance_km = Column(Float, nullable=False)
    time_min = Column(Float, nullable=False)
    load_kg = Column(Float, nullable=False)
    fuel_l = Column(Float, nullable=False)
    co2_kg = Column(Float, nullable=False)
    mode = Column(String(50), nullable=False)

    # Relationships
    route = relationship("Route", back_populates="legs")
