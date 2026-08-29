from datetime import datetime
from pydantic import BaseModel, ConfigDict

class LoadPoolMatchBase(BaseModel):
    vehicle_id: int
    shipment_id: int
    empty_distance_km: float
    co2_saved_kg: float
    cost_saved: float
    match_score: float
    status: str

class LoadPoolMatchResponse(LoadPoolMatchBase):
    id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
