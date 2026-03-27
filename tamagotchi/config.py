"""Game constants and configuration."""

# ── Life Stages ──────────────────────────────────────────────────────

STAGES = ["egg", "baby", "child", "teen", "adult"]

# Correct math answers required at each stage to evolve
STAGE_THRESHOLDS = {
    "egg": 1,
    "baby": 1,
    "child": 1,
    "teen": 1,
    "adult": None,  # final stage — keep answering for fun
}

STAGE_LABELS = {
    "egg": "Egg",
    "baby": "Baby",
    "child": "Child",
    "teen": "Teen",
    "adult": "Adult",
}

# ── Math Problem Config ──────────────────────────────────────────────

# Streak bonuses (every 5 correct in a row)
MATH_STREAK_THRESHOLD = 5

# ── Care Stats ───────────────────────────────────────────────────────

STAT_MAX = 100
STAT_START = 80

# How much each care action restores
CARE_AMOUNTS = {
    "feed": {"hunger": 30},
    "play": {"happiness": 30},
    "clean": {"hygiene": 35},
    "sleep": {"energy": 35},
}

# Stat decay per tick (30-second intervals)
DECAY_PER_TICK = {
    "hunger": 2,
    "happiness": 2,
    "hygiene": 1,
    "energy": 2,
}

# Cooldown in seconds between care actions of the same type
CARE_COOLDOWN = 5

# Tick interval in seconds
TICK_INTERVAL = 30

# Save file
SAVE_FILE = "tamagotchi_save.json"
