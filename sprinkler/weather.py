"""Open-Meteo client (free, no API key)."""

import httpx

FORECAST_URL = "https://api.open-meteo.com/v1/forecast"
GEOCODE_URL = "https://geocoding-api.open-meteo.com/v1/search"

_TIMEOUT = httpx.Timeout(10.0)


async def fetch_forecast(lat: float, lon: float) -> dict:
    params = {
        "latitude": lat,
        "longitude": lon,
        "timezone": "auto",
        "past_days": 2,
        "forecast_days": 7,
        "current": ",".join([
            "temperature_2m", "apparent_temperature", "relative_humidity_2m",
            "precipitation", "weather_code", "wind_speed_10m", "is_day",
        ]),
        "hourly": "temperature_2m,precipitation_probability,precipitation,weather_code",
        "daily": ",".join([
            "weather_code", "temperature_2m_max", "temperature_2m_min",
            "precipitation_sum", "precipitation_probability_max",
            "et0_fao_evapotranspiration", "wind_speed_10m_max",
            "sunrise", "sunset",
        ]),
    }
    async with httpx.AsyncClient(timeout=_TIMEOUT) as client:
        r = await client.get(FORECAST_URL, params=params)
        r.raise_for_status()
        return r.json()


async def geocode(query: str, count: int = 5) -> list[dict]:
    params = {"name": query, "count": count, "language": "en", "format": "json"}
    async with httpx.AsyncClient(timeout=_TIMEOUT) as client:
        r = await client.get(GEOCODE_URL, params=params)
        r.raise_for_status()
        data = r.json()
    return [
        {
            "name": p.get("name"),
            "admin1": p.get("admin1"),
            "country": p.get("country"),
            "latitude": p["latitude"],
            "longitude": p["longitude"],
        }
        for p in data.get("results", []) or []
    ]
