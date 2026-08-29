from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field, model_validator, ConfigDict

class ShipmentBase(BaseModel):
    provider_id: int
    pickup_name: str
    pickup_lat: float = Field(..., ge=-90.0, le=90.0, description="Pickup latitude must be between -90 and 90")
    pickup_lng: float = Field(..., ge=-180.0, le=180.0, description="Pickup longitude must be between -180 and 180")
    destination_name: str
    destination_lat: float = Field(..., ge=-90.0, le=90.0, description="Destination latitude must be between -90 and 90")
    destination_lng: float = Field(..., ge=-180.0, le=180.0, description="Destination longitude must be between -180 and 180")
    weight_kg: float = Field(..., gt=0, description="Shipment weight in kg must be greater than 0")
    volume: Optional[float] = Field(None, ge=0, description="Shipment volume in cubic meters")
    delivery_window_start: datetime
    delivery_window_end: datetime
    status: Optional[str] = "PENDING"

    @model_validator(mode="after")
    def validate_delivery_window(self):
        if self.delivery_window_end <= self.delivery_window_start:
            raise ValueError("delivery_window_end must be strictly later than delivery_window_start")
        return self

class ShipmentCreate(ShipmentBase):
    pass

class ShipmentResponse(ShipmentBase):
    id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
