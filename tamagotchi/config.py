"""Game constants and configuration."""

# ── Life Stages ──────────────────────────────────────────────────────

STAGES = ["egg", "baby", "child", "teen"]

# Correct math answers required at each stage to evolve
STAGE_THRESHOLDS = {
    "egg": 20,
    "baby": 40,
    "child": 60,
    "teen": None,  # final stage
}

STAGE_LABELS = {
    "egg": "Egg",
    "baby": "Baby",
    "child": "Child",
    "teen": "Teen",
}

# ── Tricks (endgame content for final stage) ────────────────────────

# Each trick unlocks at a cumulative stage_correct milestone in final stage
TRICKS = [
    {"id": "dance",     "label": "Dance",     "icon": "\U0001F57A", "unlock_at": 20},
    {"id": "flip",      "label": "Backflip",  "icon": "\U0001F938", "unlock_at": 40},
    {"id": "sing",      "label": "Sing",      "icon": "\U0001F3B5", "unlock_at": 65},
    {"id": "juggle",    "label": "Juggle",    "icon": "\U0001F939", "unlock_at": 90},
    {"id": "fireworks", "label": "Fireworks",  "icon": "\U0001F386", "unlock_at": 120},
]


# ── Care Stats ───────────────────────────────────────────────────────

STAT_MAX = 100
STAT_START = 80

# How much each care action restores
# Feed and play require inventory items — no free care for those
CARE_AMOUNTS = {
    "clean": {"hygiene": 35},
    "sleep": {},  # sleep is handled specially — gradual recovery
}

# Sleep: duration in seconds, energy restored per tick while sleeping
SLEEP_DURATION = 90  # 3 ticks worth (90s at 30s tick interval)
SLEEP_ENERGY_PER_TICK = 12  # recovers ~36 energy over full nap

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

# Offline decay: stats can drop to at most this fraction of max while away
OFFLINE_DECAY_FLOOR = 0.30  # 70% decay cap → stats floor at 30% of STAT_MAX

# ── Economy ──────────────────────────────────────────────────────────

# ~1 coin per ~6 correct answers (17% chance each)
COIN_DROP_CHANCE = 0.17

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
