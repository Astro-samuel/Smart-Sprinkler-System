"""FastAPI entrypoint. Vercel serves this as a Python serverless function;
locally run:  uvicorn api.index:app --reload
"""

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

import httpx  # noqa: E402
from fastapi import FastAPI, HTTPException, Query  # noqa: E402

from pydantic import BaseModel, Field  # noqa: E402

from sprinkler import config as C  # noqa: E402
from sprinkler import device, irrigation, weather  # noqa: E402

app = FastAPI(
    title="Smart Sprinkler API",
    version="0.1.0",
    docs_url="/api/docs",
    openapi_url="/api/openapi.json",
)


@app.get("/api/health")
def health():
    return {"status": "ok"}


@app.get("/api/geocode")
async def geocode(q: str = Query(..., min_length=2, max_length=100)):
    try:
        return {"results": await weather.geocode(q)}
    except httpx.HTTPError as e:
        raise HTTPException(502, f"Geocoding service unavailable: {e}") from e


@app.get("/api/dashboard")
async def dashboard(
    lat: float = Query(..., ge=-90, le=90),
    lon: float = Query(..., ge=-180, le=180),
):
    """Weather plus the watering recommendation, weekly plan and savings."""
    try:
        raw = await weather.fetch_forecast(lat, lon)
    except httpx.HTTPError as e:
        raise HTTPException(502, f"Weather service unavailable: {e}") from e

    rec = irrigation.recommend_today(raw)
    plan = irrigation.weekly_plan(raw, rec)
    return {
        "location": {"latitude": raw["latitude"], "longitude": raw["longitude"]},
        "weather": irrigation.summarize_weather(raw),
        "recommendation": rec,
        "schedule": plan,
        "savings": irrigation.water_savings(plan),
        "zones": C.ZONES,
    }


class StartZone(BaseModel):
    duration_ms: int = Field(..., ge=1000, le=3_600_000)


def _require_zone(zone_id: int) -> None:
    if zone_id not in {z["id"] for z in C.ZONES}:
        raise HTTPException(404, f"Unknown zone {zone_id}")


@app.post("/api/zones/{zone_id}/start")
def start_zone(zone_id: int, body: StartZone):
    _require_zone(zone_id)
    device.start(zone_id, body.duration_ms)
    return device.state()


@app.post("/api/zones/{zone_id}/stop")
def stop_zone(zone_id: int):
    _require_zone(zone_id)
    device.stop(zone_id)
    return device.state()


@app.get("/api/device/state")
def device_state():
    """Polled by the ESP32: should the relay be on, and for how much longer."""
    return device.state()


# Local dev only: serve the static frontend. On Vercel, /public is served by the CDN.
_public = ROOT / "public"
if _public.is_dir():
    from fastapi.staticfiles import StaticFiles

    app.mount("/", StaticFiles(directory=_public, html=True), name="static")
