from sqlalchemy import Column, Integer, String, Float, DateTime
from sqlalchemy.sql import func
from app.database.session import Base

class TrafficSegment(Base):
    __tablename__ = "traffic_segments"

    id = Column(Integer, primary_key=True, index=True)
    road_segment_id = Column(String(100), nullable=False, index=True)
    congestion_index = Column(Float, nullable=False)  # 0.0 to 1.0
    timestamp = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
