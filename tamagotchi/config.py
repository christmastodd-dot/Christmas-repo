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

# Save file
SAVE_FILE = "tamagotchi_save.json"
