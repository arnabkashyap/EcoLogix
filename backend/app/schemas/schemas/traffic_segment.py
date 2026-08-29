from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict

class TrafficSegmentBase(BaseModel):
    road_segment_id: str
    congestion_index: float = Field(..., ge=0.0, le=1.0, description="Congestion index must be between 0.0 and 1.0")

class TrafficSegmentCreate(TrafficSegmentBase):
    pass

class TrafficSegmentResponse(TrafficSegmentBase):
    id: int
    timestamp: datetime

    model_config = ConfigDict(from_attributes=True)
