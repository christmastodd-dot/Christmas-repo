"""Game constants and configuration."""

# ── Life Stages ──────────────────────────────────────────────────────

STAGES = ["egg", "baby", "child", "teen", "adult"]

# Correct math answers required at each stage to evolve
STAGE_THRESHOLDS = {
    "egg": 5,
    "baby": 5,
    "child": 5,
    "teen": 5,
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

# ── Economy ──────────────────────────────────────────────────────────

COINS_PER_CORRECT = 1
COINS_STREAK_BONUS = 2  # extra coins every MATH_STREAK_THRESHOLD correct

SHOP_ITEMS = {
    "pizza":    {"label": "Pizza",        "icon": "\U0001F355", "cost": 3,  "effects": {"hunger": 50},     "desc": "+50 hunger"},
    "cake":     {"label": "Birthday Cake","icon": "\U0001F382", "cost": 5,  "effects": {"hunger": 40, "happiness": 20}, "desc": "+40 hunger, +20 happy"},
    "ball":     {"label": "Beach Ball",   "icon": "\U0001F3D6", "cost": 3,  "effects": {"happiness": 50},  "desc": "+50 happiness"},
    "ukulele":  {"label": "Ukulele",      "icon": "\U0001FA95", "cost": 6,  "effects": {"happiness": 40, "energy": 20}, "desc": "+40 happy, +20 energy"},
    "soap":     {"label": "Bubble Bath",  "icon": "\U0001F6C1", "cost": 3,  "effects": {"hygiene": 50},    "desc": "+50 hygiene"},
    "blanket":  {"label": "Cozy Blanket", "icon": "\U0001F319", "cost": 4,  "effects": {"energy": 50},     "desc": "+50 energy"},
    "superfood":{"label": "Super Smoothie","icon":"\U0001F966", "cost": 10, "effects": {"hunger": 30, "happiness": 30, "hygiene": 30, "energy": 30}, "desc": "+30 all stats"},
}

# Save file
SAVE_FILE = "tamagotchi_save.json"
