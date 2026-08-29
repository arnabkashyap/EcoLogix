from datetime import datetime
from pydantic import BaseModel, ConfigDict

class ProviderBase(BaseModel):
    name: str
    home_depot_location: str

class ProviderCreate(ProviderBase):
    pass

class ProviderResponse(ProviderBase):
    id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
