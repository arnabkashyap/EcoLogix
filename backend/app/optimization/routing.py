import math
from abc import ABC, abstractmethod
from typing import Tuple, Dict

class BaseRoutingProvider(ABC):
    @abstractmethod
    def distance_km(self, from_lat: float, from_lng: float, to_lat: float, to_lng: float, from_name: str = "", to_name: str = "") -> float:
        pass

    @abstractmethod
    def travel_time_min(self, from_lat: float, from_lng: float, to_lat: float, to_lng: float, from_name: str = "", to_name: str = "") -> float:
        pass

class MockRoutingProvider(BaseRoutingProvider):
    """
    Deterministic Northeast India mock distance and travel time provider.
    Locations: Guwahati, Shillong, Tezpur, Jorhat, Silchar.
    Uses precise matrix lookup for known hubs and Haversine fallback for custom coordinates.
    """
    HUB_COORDINATES: Dict[str, Tuple[float, float]] = {
        "Guwahati": (26.1445, 91.7362),
        "Shillong": (25.5788, 91.8933),
        "Tezpur": (26.6528, 92.7926),
        "Jorhat": (26.7509, 94.2037),
        "Silchar": (24.8333, 92.7789),
    }

    # Inter-city distances in km (symmetric matrix)
    DISTANCES_KM: Dict[Tuple[str, str], float] = {
        ("Guwahati", "Guwahati"): 0.0,
        ("Shillong", "Shillong"): 0.0,
        ("Tezpur", "Tezpur"): 0.0,
        ("Jorhat", "Jorhat"): 0.0,
        ("Silchar", "Silchar"): 0.0,

        ("Guwahati", "Shillong"): 100.0,
        ("Guwahati", "Tezpur"): 180.0,
        ("Guwahati", "Jorhat"): 300.0,
        ("Guwahati", "Silchar"): 310.0,

        ("Shillong", "Tezpur"): 240.0,
        ("Shillong", "Jorhat"): 360.0,
        ("Shillong", "Silchar"): 210.0,

        ("Tezpur", "Jorhat"): 130.0,
        ("Tezpur", "Silchar"): 340.0,

        ("Jorhat", "Silchar"): 420.0,
    }

    # Travel time in minutes
    TIMES_MIN: Dict[Tuple[str, str], float] = {
        ("Guwahati", "Guwahati"): 0.0,
        ("Shillong", "Shillong"): 0.0,
        ("Tezpur", "Tezpur"): 0.0,
        ("Jorhat", "Jorhat"): 0.0,
        ("Silchar", "Silchar"): 0.0,

        ("Guwahati", "Shillong"): 150.0,
        ("Guwahati", "Tezpur"): 210.0,
        ("Guwahati", "Jorhat"): 360.0,
        ("Guwahati", "Silchar"): 420.0,

        ("Shillong", "Tezpur"): 300.0,
        ("Shillong", "Jorhat"): 450.0,
        ("Shillong", "Silchar"): 330.0,

        ("Tezpur", "Jorhat"): 180.0,
        ("Tezpur", "Silchar"): 480.0,

        ("Jorhat", "Silchar"): 570.0,
    }

    def _get_hub_name(self, lat: float, lng: float, name: str = "") -> str:
        # Match by string name first
        for hub in self.HUB_COORDINATES.keys():
            if hub.lower() in name.lower():
                return hub

        # Match by closest lat/lng within threshold (~0.5 deg)
        min_dist = float("inf")
        closest_hub = None
        for hub, (h_lat, h_lng) in self.HUB_COORDINATES.items():
            d = math.sqrt((lat - h_lat) ** 2 + (lng - h_lng) ** 2)
            if d < min_dist:
                min_dist = d
                closest_hub = hub

        if min_dist <= 0.8 and closest_hub:
            return closest_hub
        return ""

    def _haversine_distance(self, lat1: float, lng1: float, lat2: float, lng2: float) -> float:
        R = 6371.0  # Earth radius in km
        dlat = math.radians(lat2 - lat1)
        dlng = math.radians(lng2 - lng1)
        a = math.sin(dlat / 2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlng / 2)**2
        c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
        return round(R * c * 1.25, 2)  # 1.25 winding factor for road distance

    def distance_km(self, from_lat: float, from_lng: float, to_lat: float, to_lng: float, from_name: str = "", to_name: str = "") -> float:
        from_hub = self._get_hub_name(from_lat, from_lng, from_name)
        to_hub = self._get_hub_name(to_lat, to_lng, to_name)

        if from_hub and to_hub:
            if from_hub == to_hub:
                # If exact same location coords, 0km; if different sub-locations in same city, small intra-city dist
                if abs(from_lat - to_lat) < 0.001 and abs(from_lng - to_lng) < 0.001:
                    return 0.0
                return 5.0
            
            pair = (from_hub, to_hub)
            rev_pair = (to_hub, from_hub)
            if pair in self.DISTANCES_KM:
                return self.DISTANCES_KM[pair]
            if rev_pair in self.DISTANCES_KM:
                return self.DISTANCES_KM[rev_pair]

        # Fallback to Haversine formula
        return self._haversine_distance(from_lat, from_lng, to_lat, to_lng)

    def travel_time_min(self, from_lat: float, from_lng: float, to_lat: float, to_lng: float, from_name: str = "", to_name: str = "") -> float:
        from_hub = self._get_hub_name(from_lat, from_lng, from_name)
        to_hub = self._get_hub_name(to_lat, to_lng, to_name)

        if from_hub and to_hub:
            if from_hub == to_hub:
                if abs(from_lat - to_lat) < 0.001 and abs(from_lng - to_lng) < 0.001:
                    return 0.0
                return 15.0
            
            pair = (from_hub, to_hub)
            rev_pair = (to_hub, from_hub)
            if pair in self.TIMES_MIN:
                return self.TIMES_MIN[pair]
            if rev_pair in self.TIMES_MIN:
                return self.TIMES_MIN[rev_pair]

        dist = self._haversine_distance(from_lat, from_lng, to_lat, to_lng)
        avg_speed_kmh = 45.0
        return round((dist / avg_speed_kmh) * 60.0, 1)


class RoutingService:
    def __init__(self, provider: BaseRoutingProvider = None):
        self.provider = provider or MockRoutingProvider()

    def set_provider(self, provider: BaseRoutingProvider):
        self.provider = provider

    def distance_km(self, from_lat: float, from_lng: float, to_lat: float, to_lng: float, from_name: str = "", to_name: str = "") -> float:
        return self.provider.distance_km(from_lat, from_lng, to_lat, to_lng, from_name, to_name)

    def travel_time_min(self, from_lat: float, from_lng: float, to_lat: float, to_lng: float, from_name: str = "", to_name: str = "") -> float:
        return self.provider.travel_time_min(from_lat, from_lng, to_lat, to_lng, from_name, to_name)
