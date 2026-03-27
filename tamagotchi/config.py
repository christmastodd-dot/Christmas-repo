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

# Save file
SAVE_FILE = "tamagotchi_save.json"
