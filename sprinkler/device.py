"""Relay state shared between the web app (writes) and the ESP32 (polls).

Storage:
  - Redis over REST (Upstash / Vercel Marketplace) when its env vars are set.
    Required on Vercel: serverless instances share no memory.
  - Process memory otherwise, for local `uvicorn` runs.

Expiry uses wall-clock `ends_at`, and the ESP32 is told the *remaining* time, so the
device needs no clock sync.
"""

import json
import math
import os
import time

import httpx

KEY = "sprinkler:run"


class StoreError(RuntimeError):
    """The state store is missing or unreachable."""


_mem: dict | None = None  # local fallback only


def _redis() -> tuple[str, str] | None:
    url = os.environ.get("UPSTASH_REDIS_REST_URL") or os.environ.get("KV_REST_API_URL")
    token = os.environ.get("UPSTASH_REDIS_REST_TOKEN") or os.environ.get("KV_REST_API_TOKEN")
    return (url.rstrip("/"), token) if url and token else None


def _cmd(cfg: tuple[str, str], *args):
    url, token = cfg
    try:
        res = httpx.post(url, json=list(args), headers={"Authorization": f"Bearer {token}"}, timeout=5)
        res.raise_for_status()
    except httpx.HTTPError as e:
        raise StoreError(f"State store unavailable: {e}") from e
    return res.json().get("result")


def _require_store() -> tuple[str, str] | None:
    cfg = _redis()
    if cfg is None and os.environ.get("VERCEL"):
        raise StoreError("No Redis configured: connect an Upstash Redis database to this Vercel project.")
    return cfg


def _load() -> dict | None:
    cfg = _require_store()
    if cfg:
        raw = _cmd(cfg, "GET", KEY)
        return json.loads(raw) if raw else None
    return _mem


def start(zone_id: int, duration_ms: int) -> None:
    global _mem
    run = {"zone_id": zone_id, "ends_at": time.time() + duration_ms / 1000}
    cfg = _require_store()
    if cfg:
        _cmd(cfg, "SET", KEY, json.dumps(run), "EX", str(math.ceil(duration_ms / 1000) + 5))
    else:
        _mem = run


def stop(zone_id: int | None = None) -> None:
    """Stop the relay. If zone_id is given, only stop when that zone is the one running."""
    global _mem
    run = _load()
    if not run or (zone_id is not None and run["zone_id"] != zone_id):
        return
    cfg = _require_store()
    if cfg:
        _cmd(cfg, "DEL", KEY)
    else:
        _mem = None


def state() -> dict:
    """Relay state for the ESP32: on/off, zone, and milliseconds left."""
    run = _load()
    if run:
        remaining_ms = int((run["ends_at"] - time.time()) * 1000)
        if remaining_ms > 0:
            return {"relay": True, "zone_id": run["zone_id"], "remaining_ms": remaining_ms}
    return {"relay": False, "zone_id": None, "remaining_ms": 0}
