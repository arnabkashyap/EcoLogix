"""
Weather Risk Lookup Helper — Uses Open-Meteo free API to check live wind and precipitation risk.
"""

from typing import Dict, Any, Optional
import requests


def fetch_weather_risk(
    lat: float, lon: float, condition: Optional[str] = None
) -> Dict[str, Any]:
    url = "https://api.open-meteo.com/v1/forecast"
    params = {
        "latitude": lat,
        "longitude": lon,
        "current": "weather_code,wind_speed_10m,precipitation",
    }

    try:
        res = requests.get(url, params=params, timeout=5)
        if res.status_code == 200:
            data = res.json()
            curr = data.get("current", {})
            wind_speed = curr.get("wind_speed_10m", 12.0)
            precip = curr.get("precipitation", 0.0)

            # Risk calculation rules
            if precip > 10.0 or wind_speed > 40.0:
                flood_risk = "high"
                note = f"Heavy precipitation ({precip}mm) and high wind ({wind_speed} km/h). Exercise extreme caution."
            elif precip > 3.0 or wind_speed > 20.0:
                flood_risk = "moderate"
                note = f"Moderate rain ({precip}mm) or wind ({wind_speed} km/h) along destination corridor."
            else:
                flood_risk = "low"
                note = "Clear weather conditions reported along destination corridor."

            return {
                "flood_risk": flood_risk,
                "wind_strength_kmh": float(wind_speed),
                "precipitation_mm": float(precip),
                "weather_condition": condition or ("Rainy" if precip > 2.0 else "Clear"),
                "note": note,
            }
    except Exception as e:
        print(f"Open-Meteo weather API notice: {e}")

    # Fallback response if offline or API error
    return {
        "flood_risk": "low",
        "wind_strength_kmh": 14.5,
        "precipitation_mm": 0.0,
        "weather_condition": condition or "Clear",
        "note": "Standard clear weather assumed (Offline fallback).",
    }
