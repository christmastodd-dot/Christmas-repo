"""Game constants and configuration."""

TICK_INTERVAL = 3  # seconds between ticks

# Stat decay per tick
DECAY_RATES = {
    "hunger": 2,
    "happiness": 1,
    "energy": 1,
    "cleanliness": 1,
}

# Health drops by this amount per tick for EACH stat below the critical threshold
HEALTH_DECAY_PER_CRITICAL = 3
CRITICAL_THRESHOLD = 20

# Stat bounds
STAT_MIN = 0
STAT_MAX = 100

# Starting stats
STARTING_STATS = {
    "hunger": 80,
    "happiness": 80,
    "energy": 80,
    "cleanliness": 80,
    "health": 100,
}

# Food options: (name, hunger_boost, happiness_boost)
FOODS = [
    ("Coconut Cake", 25, 5),
    ("Space Burrito", 15, 15),
    ("Bug Soup", 35, -5),
]

# Action effects
PLAY_HAPPINESS = 20
PLAY_ENERGY_COST = 10

SLEEP_ENERGY_GAIN = 30
SLEEP_TICKS = 5
SLEEP_DECAY_MULTIPLIER = 0.5

CLEAN_BOOST = 30

# ── Life Stages ──────────────────────────────────────────────────────

STAGES = ["egg", "baby", "child", "teen", "adult"]

# Ticks required at each stage before evolving to the next
STAGE_THRESHOLDS = {
    "egg": 10,
    "baby": 50,
    "child": 100,
    "teen": 200,
    "adult": None,  # final stage
}

# Health must be above this to evolve
EVOLUTION_HEALTH_MIN = 50

# Stat decay multiplier per stage
STAGE_DECAY_MULTIPLIER = {
    "egg": 0.0,     # no decay while egg
    "baby": 1.5,
    "child": 1.0,
    "teen": 1.0,
    "adult": 0.75,
}

# Actions available per stage
STAGE_ACTIONS = {
    "egg": [],
    "baby": ["feed", "sleep"],
    "child": ["feed", "play", "clean", "sleep"],
    "teen": ["feed", "play", "clean", "sleep", "minigame", "shop", "inventory"],
    "adult": ["feed", "play", "clean", "sleep", "trick", "minigame", "shop", "inventory"],
}

# Teen rebellion chance (0.0 - 1.0)
TEEN_REBELLION_CHANCE = 0.20

REBELLION_MESSAGES = [
    "{name} rolls their eyes and ignores you!",
    "{name} sticks out their tongue! How rude!",
    "{name} pretends they can't hear you...",
    "{name} says 'You're not my REAL owner!'",
    "{name} turns around dramatically!",
]

# Tricks
TRICKS = ["roll over", "shake", "dance", "sing"]
TRICK_HAPPINESS_COST = 15
TRICK_FAIL_CHANCE = 0.30

# ── Mini-Games & Economy ─────────────────────────────────────────────

# Mini-games unlock at teen stage
MINIGAME_UNLOCK_STAGE = "teen"
MINIGAME_ENERGY_COST = 15
MINIGAME_COOLDOWN_TICKS = 15

# Number Guess
NUMBER_GUESS_RANGE = (1, 10)
NUMBER_GUESS_TRIES = 3
NUMBER_GUESS_REWARD = 10
NUMBER_GUESS_HAPPINESS = 10

# Rock Paper Scissors
RPS_ROUNDS = 3  # best of 3
RPS_WIN_REWARD = 15
RPS_LOSS_HAPPINESS = -5

# Memory Sequence
MEMORY_MIN_LENGTH = 4
MEMORY_MAX_LENGTH = 7
MEMORY_SYMBOLS = ["*", "#", "@", "&", "!", "?", "+"]
MEMORY_COIN_PER_SYMBOL = 5

# ── Shop ─────────────────────────────────────────────────────────────

# Shop foods: (name, price, hunger_boost, happiness_boost)
SHOP_FOODS = [
    ("Apple", 5, 15, 0),
    ("Steak", 15, 40, 5),
    ("Cake", 10, 10, 20),
]

# Shop toys: (name, price, type, description)
# type: "ball" or "hat"
SHOP_TOYS = [
    ("Ball", 20, "ball", "+10 happiness per play for 5 plays"),
    ("Hat", 30, "hat", "Cosmetic - adds a hat!"),
]

# Shop medicine: (name, price, health_boost)
SHOP_MEDICINE = [
    ("Potion", 25, 30),
]

# Ball toy bonus
BALL_PLAY_BONUS = 10
BALL_PLAY_USES = 5

# Save file
SAVE_FILE = "tamagotchi_save.json"
