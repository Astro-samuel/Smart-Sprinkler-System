"""In-memory state for the single relay the ESP32 mirrors.

Process-local, so it only works with one long-running server (local uvicorn),
not Vercel serverless. Swap for Redis/KV when deploying.
"""

import time

_run: dict | None = None  # {"zone_id": int, "ends_at": float (monotonic)}


def start(zone_id: int, duration_ms: int) -> None:
    global _run
    _run = {"zone_id": zone_id, "ends_at": time.monotonic() + duration_ms / 1000}


def stop(zone_id: int | None = None) -> None:
    """Stop the relay. If zone_id is given, only stop when that zone is the one running."""
    global _run
    if _run and (zone_id is None or _run["zone_id"] == zone_id):
        _run = None


def state() -> dict:
    """Relay state for the ESP32. Uses remaining time, so no clock sync is needed."""
    global _run
    if _run:
        remaining_ms = int((_run["ends_at"] - time.monotonic()) * 1000)
        if remaining_ms > 0:
            return {"relay": True, "zone_id": _run["zone_id"], "remaining_ms": remaining_ms}
        _run = None
    return {"relay": False, "zone_id": None, "remaining_ms": 0}
