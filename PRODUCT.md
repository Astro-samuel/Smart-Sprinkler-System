# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Homeowners with a lawn or garden and a sprinkler timer. Typical moment: a quick glance on phone or laptop, usually in the morning before the 06:00 run or after rain. Job: know whether it will water today and why, trust that, occasionally start a zone by hand.

## Product Purpose

Weather-aware watering for a home sprinkler. Reads local weather from Open-Meteo, runs a water-balance model (lawn demand = ET0 x 0.8 minus recent and forecast rain, plus freeze, heavy-rain and wind rules) and recommends WATER / REDUCE / DELAY / SKIP. Success: homeowner trusts the verdict at a glance and wastes less water than a fixed timer.

## Positioning

Explains each decision from the real weather balance (mm of rain, mm of demand, deficit) and shows litres saved against a fixed timer.

## Operating Context

Early prototype. FastAPI backend, static HTML/CSS/vanilla JS frontend in `public/`, hosted on Vercel. Zones are simulated; no real valves. Nothing is stored. Location via browser GPS, city search, or Vancouver demo.

## Capabilities and Constraints

Features to keep: location picker; verdict with reasons and metrics; current conditions; weekly plan (Mon/Wed/Fri 06:00 with skips); 24 h rain chance; simulated zones with start/stop, countdown, demo-speed toggle; 7-day forecast; water saved vs fixed timer. Backend and API unchanged. Metric units (mm, L, degC, km/h).

## Brand Commitments

Name stays "Smart Sprinkler". Keep Open-Meteo CC BY 4.0 attribution and honest "prototype / simulated zones / nothing is stored" disclosures. Keep a designed dark theme. User wants it to feel authentic (real gardening / field-instrument character) and not like AI-generated slop.

## Evidence on Hand

No testimonials, customers, or benchmarks exist. Do not invent any. Data shown comes live from the API.

## Product Principles

1. The verdict comes first and is explained in plain words.
2. Every number shown is real and labelled with its unit.
3. Be honest about what is simulated.
4. No decoration that carries no information.
