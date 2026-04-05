"""League constants and configuration."""

# League structure
NUM_TEAMS = 30
CONFERENCES = ["Eastern", "Western"]
DIVISIONS = {
    "Eastern": ["Atlantic", "Central", "Southeast"],
    "Western": ["Northwest", "Pacific", "Southwest"],
}
TEAMS_PER_DIVISION = 5

# Roster
ROSTER_SIZE = 15
ACTIVE_ROSTER = 13
POSITIONS = ["PG", "SG", "SF", "PF", "C"]

# Season
GAMES_PER_SEASON = 82
PLAYOFF_TEAMS_PER_CONF = 8
SERIES_WIN_TARGET = 4
DRAFT_ROUNDS = 2

# Salary cap (in dollars)
SALARY_CAP = 125_000_000
LUXURY_TAX_THRESHOLD = 155_000_000
MIN_SALARY = 1_100_000
MAX_SALARY = 45_000_000
MID_LEVEL_EXCEPTION = 10_500_000

# Rookie scale (by pick range)
ROOKIE_SALARY = {
    1: 12_000_000,
    2: 10_500_000,
    3: 9_500_000,
    4: 8_500_000,
    5: 7_500_000,
    10: 5_000_000,
    15: 3_500_000,
    20: 2_500_000,
    25: 2_000_000,
    30: 1_800_000,
    # Second round
    35: 1_500_000,
    40: 1_300_000,
    45: 1_200_000,
    50: 1_100_000,
    55: 1_100_000,
    60: 1_100_000,
}

# Player attributes
ATTRIBUTES = [
    "inside_scoring",    # finishing at rim, post moves, mid-range
    "outside_scoring",   # 3PT shooting, catch-and-shoot, FT touch
    "interior_defense",  # rim protection, post defense, shot blocking
    "perimeter_defense", # on-ball defense, closeouts, steals
    "rebounding", "passing", "athleticism", "basketball_iq",
]

# Position weights for overall calculation
# Each position values attributes differently
POSITION_WEIGHTS = {
    "PG": {"inside_scoring": 0.06, "outside_scoring": 0.12, "interior_defense": 0.02, "perimeter_defense": 0.08, "rebounding": 0.05, "passing": 0.27, "athleticism": 0.18, "basketball_iq": 0.22},
    "SG": {"inside_scoring": 0.08, "outside_scoring": 0.19, "interior_defense": 0.03, "perimeter_defense": 0.09, "rebounding": 0.05, "passing": 0.15, "athleticism": 0.22, "basketball_iq": 0.19},
    "SF": {"inside_scoring": 0.10, "outside_scoring": 0.10, "interior_defense": 0.07, "perimeter_defense": 0.10, "rebounding": 0.12, "passing": 0.13, "athleticism": 0.20, "basketball_iq": 0.18},
    "PF": {"inside_scoring": 0.10, "outside_scoring": 0.03, "interior_defense": 0.13, "perimeter_defense": 0.07, "rebounding": 0.22, "passing": 0.08, "athleticism": 0.18, "basketball_iq": 0.19},
    "C":  {"inside_scoring": 0.07, "outside_scoring": 0.01, "interior_defense": 0.17, "perimeter_defense": 0.05, "rebounding": 0.27, "passing": 0.05, "athleticism": 0.15, "basketball_iq": 0.23},
}

# Player generation tiers (min, max for attribute ranges)
PLAYER_TIERS = {
    "star":     (72, 95),
    "starter":  (58, 80),
    "rotation": (45, 68),
    "bench":    (35, 58),
    "scrub":    (25, 48),
}

# Tier distribution per team at league creation
TEAM_TIER_DISTRIBUTION = [
    "star", "star",
    "starter", "starter", "starter",
    "rotation", "rotation", "rotation", "rotation",
    "bench", "bench", "bench",
    "scrub", "scrub", "scrub",
]

# Height ranges by position (inches)
HEIGHT_RANGE = {
    "PG": (71, 77),   # 5'11" - 6'5"
    "SG": (74, 79),   # 6'2" - 6'7"
    "SF": (77, 82),   # 6'5" - 6'10"
    "PF": (79, 84),   # 6'7" - 7'0"
    "C":  (82, 88),   # 6'10" - 7'4"
}

# Weight ranges by position (lbs)
WEIGHT_RANGE = {
    "PG": (175, 205),
    "SG": (190, 220),
    "SF": (210, 240),
    "PF": (225, 255),
    "C":  (240, 280),
}

# Starting season year
STARTING_YEAR = 2026
