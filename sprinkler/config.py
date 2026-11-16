"""Global defaults for the prototype (no per-user storage yet)."""

# Cool-season turf crop coefficient: lawn water use ≈ ET0 × KC
CROP_COEFFICIENT = 0.8

# Typical scheduled cycle per zone
BASE_RUN_MINUTES = 20

# Days of week the controller is scheduled to run (0 = Monday)
SCHEDULED_WEEKDAYS = (0, 2, 4)  # Mon, Wed, Fri
SCHEDULED_START = "06:00"

# Decision thresholds
FREEZE_TEMP_C = 2.0          # skip if forecast low at or below this
RECENT_RAIN_SKIP_MM = 6.0    # rain in the last 48 h that saturates the root zone
FORECAST_RAIN_SKIP_MM = 6.0  # expected rain in the next 24 h
FORECAST_PROB_MIN = 60       # % probability for forecast rain to count fully
HIGH_WIND_KMH = 20.0         # spray drifts above this; delay to a calmer time
HIGH_HUMIDITY_PCT = 85.0     # skip at or above this: little evaporation, soil likely still damp
MIN_DEFICIT_MM = 2.0         # below this the lawn doesn't need water

# Mock zones (a real controller would report these)
ZONES = [
    {"id": 1, "name": "Front lawn", "flow_lpm": 12.0},
    {"id": 2, "name": "Back yard", "flow_lpm": 15.0},
    {"id": 3, "name": "Side garden", "flow_lpm": 6.0},
]

# Water a full BASE_RUN_MINUTES cycle applies to the root zone (mm)
APPLIED_MM_PER_CYCLE = 8.0
