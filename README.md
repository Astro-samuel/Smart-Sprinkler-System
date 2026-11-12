# Smart Sprinkler System (prototype)

An early prototype web app for a residential smart sprinkler. It reads local weather from
[Open-Meteo](https://open-meteo.com/) (free, no API key) and decides whether the lawn should be
watered today. Nothing is stored and the sprinkler hardware is simulated.

## Features

- **Location**: browser GPS, with city search or a Vancouver demo location as the fallback
- **Weather**: current conditions, 24-hour rain chance, 7-day forecast
- **Watering recommendation**: WATER / REDUCE / DELAY / SKIP, based on a water-balance model
  (lawn demand = ET₀ × 0.8, minus recent and forecast rain), plus freeze, heavy-rain and wind rules
- **Weekly plan**: programmed days (Mon/Wed/Fri at 06:00) with rain skips applied
- **Water savings**: litres saved compared with a fixed timer
- **Zones (simulated)**: manual start/stop with a countdown and a "demo speed" toggle

## Stack

| Part     | Tech                                                        |
|----------|-------------------------------------------------------------|
| Backend  | FastAPI (`api/index.py`), logic in `sprinkler/`             |
| Frontend | Static HTML/CSS/vanilla JS in `public/`                     |
| Hosting  | Vercel: Python serverless function plus a CDN for `public/` |

```
api/index.py            FastAPI app (routes under /api)
sprinkler/config.py     Global defaults: thresholds, schedule, mock zones
sprinkler/weather.py    Open-Meteo forecast + geocoding client
sprinkler/irrigation.py Recommendation, weekly plan, savings
public/                 Frontend
vercel.json             Routes /api/* to the FastAPI function
```

## API

- `GET /api/dashboard?lat=..&lon=..`: weather, recommendation, schedule, savings, zones
- `GET /api/geocode?q=..`: city search
- `GET /api/health`
- Interactive docs: `/api/docs`

## Run locally

```bash
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
.venv/bin/uvicorn api.index:app --reload
```

Then open http://localhost:8000. Browsers only allow GPS on `localhost` or HTTPS.

## Deploy to Vercel (GitHub auto-deploy)

1. Push this repo to GitHub.
2. In the Vercel dashboard, go to **Add New → Project** and import `Smart-Sprinkler-System`.
   Leave Framework Preset as **Other** and keep the defaults. No environment variables are needed.
3. Deploy. Every push to `main` redeploys production, and every PR gets a preview URL.

## Hooking up real hardware later

The frontend talks to valves through the `controller` object in `public/app.js`
(`start(zoneId, minutes)` / `stop(zoneId)`). Replace it with calls to new `/api/zones/...`
routes that forward to the device (ESP32 over HTTP/MQTT, Raspberry Pi, etc.). Zone definitions
live in `sprinkler/config.py`.

## Not yet implemented

Accounts, saved settings/schedules, per-zone plant/soil settings, persistent history, real
device control, notifications.
