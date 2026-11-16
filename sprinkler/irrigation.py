"""Watering decision logic.

Uses a simple water-balance model: lawn demand = ET0 × crop coefficient,
minus rain (forecast rain is weighted by its probability). Hard rules
(freeze, heavy rain, wind) override the balance.

Open-Meteo's daily arrays are requested with past_days=2, so index 0 and 1
are observed days, index 2 is today, and 3+ are forecast days.
"""

from __future__ import annotations

from datetime import date, datetime, timezone

from . import config as C

TODAY = 2

WATER, REDUCE, DELAY, SKIP, OFF = "WATER", "REDUCE", "DELAY", "SKIP", "OFF"


def _num(v, default=0.0) -> float:
    return default if v is None else float(v)


def _expected_rain(daily: dict, i: int) -> float:
    """Observed rain for past days; probability-weighted for today onward."""
    rain = _num(daily["precipitation_sum"][i])
    if i < TODAY:
        return rain
    prob = daily["precipitation_probability_max"][i]
    return rain * (_num(prob, 100.0) / 100.0)


def _minutes_for_deficit(deficit_mm: float) -> int:
    frac = max(0.25, min(1.0, deficit_mm / C.APPLIED_MM_PER_CYCLE))
    return int(round(C.BASE_RUN_MINUTES * frac))


def _next_24h(data: dict) -> dict:
    hourly = data["hourly"]
    now_hour = data["current"]["time"][:13]  # "YYYY-MM-DDTHH"
    times = hourly["time"]
    start = next((i for i, t in enumerate(times) if t[:13] >= now_hour), 0)
    end = start + 24
    rain = sum(_num(x) for x in hourly["precipitation"][start:end])
    probs = [_num(x) for x in hourly["precipitation_probability"][start:end]]
    return {
        "start": start,
        "rain_mm": round(rain, 1),
        "prob_max": int(max(probs) if probs else 0),
    }


def recommend_today(data: dict) -> dict:
    d = data["daily"]
    cur = data["current"]
    nxt = _next_24h(data)

    rain_48h = _num(d["precipitation_sum"][0]) + _num(d["precipitation_sum"][1])
    demand = sum(_num(d["et0_fao_evapotranspiration"][i]) for i in range(TODAY + 1)) * C.CROP_COEFFICIENT
    supply = rain_48h + nxt["rain_mm"] * (nxt["prob_max"] / 100.0)
    deficit = demand - supply
    tmin = _num(d["temperature_2m_min"][TODAY])
    temp_now = _num(cur["temperature_2m"])
    wind = _num(cur["wind_speed_10m"])
    humidity = _num(cur["relative_humidity_2m"])

    metrics = {
        "rain_last_48h_mm": round(rain_48h, 1),
        "rain_next_24h_mm": nxt["rain_mm"],
        "rain_prob_next_24h": nxt["prob_max"],
        "lawn_demand_mm": round(demand, 1),
        "water_deficit_mm": round(deficit, 1),
        "min_temp_c": round(tmin, 1),
        "wind_kmh": round(wind, 1),
        "humidity_pct": round(humidity),
    }

    def result(action, headline, reasons, minutes=0):
        return {
            "action": action,
            "headline": headline,
            "reasons": reasons,
            "run_minutes": minutes,
            "base_minutes": C.BASE_RUN_MINUTES,
            "metrics": metrics,
        }

    if tmin <= C.FREEZE_TEMP_C or temp_now <= C.FREEZE_TEMP_C + 1:
        return result(SKIP, "Skip watering: freeze risk", [
            f"Forecast low is {tmin:.0f}°C. Water on turf and in pipes can freeze.",
        ])
    if rain_48h >= C.RECENT_RAIN_SKIP_MM:
        return result(SKIP, "Skip watering: soil is already wet", [
            f"{rain_48h:.1f} mm of rain fell in the last 48 hours.",
        ])
    if nxt["rain_mm"] >= C.FORECAST_RAIN_SKIP_MM and nxt["prob_max"] >= C.FORECAST_PROB_MIN:
        return result(SKIP, "Skip watering: rain is on the way", [
            f"{nxt['rain_mm']:.1f} mm expected in the next 24 h ({nxt['prob_max']}% chance).",
        ])
    if humidity >= C.HIGH_HUMIDITY_PCT:
        return result(SKIP, "Skip watering: air is saturated", [
            f"Humidity is {humidity:.0f}%, so the lawn is losing little water and the soil is likely still damp.",
        ])
    if deficit < C.MIN_DEFICIT_MM:
        return result(SKIP, "Skip watering: lawn has enough water", [
            f"Lawn used about {demand:.1f} mm over 3 days; rain covered {supply:.1f} mm.",
        ])

    minutes = _minutes_for_deficit(deficit)
    reasons = [f"Water deficit of {deficit:.1f} mm (lawn used {demand:.1f} mm, rain supplied {supply:.1f} mm)."]
    if minutes < C.BASE_RUN_MINUTES:
        action, headline = REDUCE, f"Water lightly: {minutes} min per zone"
        reasons.append(f"Shortened from the usual {C.BASE_RUN_MINUTES} min since demand is low.")
    else:
        action, headline = WATER, f"Water as scheduled: {minutes} min per zone"

    if wind >= C.HIGH_WIND_KMH:
        reasons.append(f"Wind is {wind:.0f} km/h, so spray would drift. Wait for calmer air (early morning).")
        return result(DELAY, "Delay watering: too windy", reasons, minutes)

    return result(action, headline, reasons, minutes)


def _plan_day(d: dict, i: int) -> dict:
    """Day-level decision for a forecast day (coarser than recommend_today)."""
    tmin = _num(d["temperature_2m_min"][i])
    prev_rain = _expected_rain(d, i - 1) + _expected_rain(d, i - 2)
    same_day = _expected_rain(d, i)
    demand = sum(_num(d["et0_fao_evapotranspiration"][k]) for k in range(i - 2, i + 1)) * C.CROP_COEFFICIENT
    deficit = demand - prev_rain - same_day

    if tmin <= C.FREEZE_TEMP_C:
        return {"action": SKIP, "reason": "Freeze risk", "run_minutes": 0}
    if prev_rain >= C.RECENT_RAIN_SKIP_MM:
        return {"action": SKIP, "reason": "Recent rain", "run_minutes": 0}
    if same_day >= C.FORECAST_RAIN_SKIP_MM:
        return {"action": SKIP, "reason": "Rain expected", "run_minutes": 0}
    if deficit < C.MIN_DEFICIT_MM:
        return {"action": SKIP, "reason": "Low demand", "run_minutes": 0}
    minutes = _minutes_for_deficit(deficit)
    if minutes < C.BASE_RUN_MINUTES:
        return {"action": REDUCE, "reason": "Partial need", "run_minutes": minutes}
    return {"action": WATER, "reason": "Full cycle", "run_minutes": minutes}


def weekly_plan(data: dict, today_rec: dict) -> list[dict]:
    d = data["daily"]
    plan = []
    for i in range(TODAY, len(d["time"])):
        day = date.fromisoformat(d["time"][i])
        scheduled = day.weekday() in C.SCHEDULED_WEEKDAYS
        if not scheduled:
            entry = {"action": OFF, "reason": "Not scheduled", "run_minutes": 0}
        elif i == TODAY:
            entry = {
                "action": today_rec["action"],
                "reason": today_rec["headline"].split(": ", 1)[-1],
                "run_minutes": today_rec["run_minutes"],
            }
        else:
            entry = _plan_day(d, i)
        plan.append({
            "date": d["time"][i],
            "weekday": day.strftime("%a"),
            "scheduled": scheduled,
            "start": C.SCHEDULED_START if scheduled else None,
            **entry,
        })
    return plan


def water_savings(plan: list[dict]) -> dict:
    full_cycle_l = sum(z["flow_lpm"] for z in C.ZONES) * C.BASE_RUN_MINUTES
    scheduled = [p for p in plan if p["scheduled"]]
    baseline = full_cycle_l * len(scheduled)
    planned = sum(
        full_cycle_l * (p["run_minutes"] / C.BASE_RUN_MINUTES)
        for p in scheduled if p["action"] in (WATER, REDUCE, DELAY)
    )
    return {
        "full_cycle_litres": round(full_cycle_l),
        "scheduled_cycles": len(scheduled),
        "skipped_cycles": sum(1 for p in scheduled if p["action"] == SKIP),
        "baseline_litres": round(baseline),
        "planned_litres": round(planned),
        "saved_litres": round(baseline - planned),
        "saved_percent": round(100 * (baseline - planned) / baseline) if baseline else 0,
    }


def summarize_weather(data: dict) -> dict:
    """Trim the Open-Meteo payload to what the UI needs."""
    d, h, cur = data["daily"], data["hourly"], data["current"]
    start = _next_24h(data)["start"]
    return {
        "timezone": data.get("timezone"),
        "current": {
            "time": cur["time"],
            "temperature_c": cur["temperature_2m"],
            "feels_like_c": cur["apparent_temperature"],
            "humidity_pct": cur["relative_humidity_2m"],
            "precipitation_mm": cur["precipitation"],
            "wind_kmh": cur["wind_speed_10m"],
            "weather_code": cur["weather_code"],
            "is_day": bool(cur.get("is_day", 1)),
        },
        "hourly": [
            {
                "time": h["time"][i],
                "temperature_c": h["temperature_2m"][i],
                "precip_prob": h["precipitation_probability"][i],
                "precip_mm": h["precipitation"][i],
                "weather_code": h["weather_code"][i],
            }
            for i in range(start, min(start + 24, len(h["time"])))
        ],
        "daily": [
            {
                "date": d["time"][i],
                "weather_code": d["weather_code"][i],
                "temp_max_c": d["temperature_2m_max"][i],
                "temp_min_c": d["temperature_2m_min"][i],
                "precip_mm": d["precipitation_sum"][i],
                "precip_prob": d["precipitation_probability_max"][i],
                "et0_mm": d["et0_fao_evapotranspiration"][i],
                "wind_max_kmh": d["wind_speed_10m_max"][i],
                "sunrise": d["sunrise"][i],
                "sunset": d["sunset"][i],
            }
            for i in range(TODAY, len(d["time"]))
        ],
        "fetched_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
    }
