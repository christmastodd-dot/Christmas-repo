"""
Shared country data and questions for the "Guess a Country" DM mini-game.
"""

# Each row: (name, in_europe, in_asia, in_africa, in_americas, northern_hemisphere,
#            landlocked, island_nation, population_over_100_million,
#            english_official_language, name_starts_with_vowel)
_COUNTRY_ROWS = [
    ("France", True, False, False, False, True, False, False, False, False, False),
    ("Germany", True, False, False, False, True, False, False, False, False, False),
    ("United Kingdom", True, False, False, False, True, False, True, False, True, True),
    ("Italy", True, False, False, False, True, False, False, False, False, True),
    ("Spain", True, False, False, False, True, False, False, False, False, False),
    ("Russia", True, False, False, False, True, False, False, True, False, False),
    ("Switzerland", True, False, False, False, True, True, False, False, False, False),
    ("Netherlands", True, False, False, False, True, False, False, False, False, False),
    ("Sweden", True, False, False, False, True, False, False, False, False, False),
    ("Greece", True, False, False, False, True, False, False, False, False, False),
    ("Portugal", True, False, False, False, True, False, False, False, False, False),
    ("Ireland", True, False, False, False, True, False, True, False, True, True),
    ("China", False, True, False, False, True, False, False, True, False, False),
    ("Japan", False, True, False, False, True, False, True, True, False, False),
    ("India", False, True, False, False, True, False, False, True, True, True),
    ("South Korea", False, True, False, False, True, False, False, False, False, False),
    ("Indonesia", False, True, False, False, False, False, True, True, False, True),
    ("Thailand", False, True, False, False, True, False, False, False, False, False),
    ("Saudi Arabia", False, True, False, False, True, False, False, False, False, False),
    ("Israel", False, True, False, False, True, False, False, False, False, True),
    ("Turkey", False, True, False, False, True, False, False, False, False, False),
    ("Vietnam", False, True, False, False, True, False, False, False, False, False),
    ("Egypt", False, False, True, False, True, False, False, True, False, True),
    ("Nigeria", False, False, True, False, True, False, False, True, True, False),
    ("South Africa", False, False, True, False, False, False, False, False, True, False),
    ("Kenya", False, False, True, False, True, False, False, False, True, False),
    ("Morocco", False, False, True, False, True, False, False, False, False, False),
    ("Ethiopia", False, False, True, False, True, True, False, True, False, True),
    ("United States", False, False, False, True, True, False, False, True, True, True),
    ("Canada", False, False, False, True, True, False, False, False, True, False),
    ("Mexico", False, False, False, True, True, False, False, True, False, False),
    ("Brazil", False, False, False, True, False, False, False, True, False, False),
    ("Argentina", False, False, False, True, False, False, False, False, False, True),
    ("Chile", False, False, False, True, False, False, False, False, False, False),
    ("Cuba", False, False, False, True, True, False, True, False, False, False),
    ("Colombia", False, False, False, True, True, False, False, False, False, False),
    ("Peru", False, False, False, True, False, False, False, False, False, False),
    ("Jamaica", False, False, False, True, True, False, True, False, True, False),
    ("Australia", False, False, False, False, False, False, True, False, True, True),
    ("New Zealand", False, False, False, False, False, False, True, False, True, False),
]

ATTRIBUTE_KEYS = [
    "in_europe",
    "in_asia",
    "in_africa",
    "in_americas",
    "northern_hemisphere",
    "landlocked",
    "island_nation",
    "population_over_100_million",
    "english_official_language",
    "name_starts_with_vowel",
]

COUNTRIES = [dict(zip(["name"] + ATTRIBUTE_KEYS, row)) for row in _COUNTRY_ROWS]

QUESTIONS = [
    ("Is this country in Europe?", "in_europe"),
    ("Is this country in Asia?", "in_asia"),
    ("Is this country in Africa?", "in_africa"),
    ("Is this country in the Americas?", "in_americas"),
    ("Is this country in the Northern Hemisphere?", "northern_hemisphere"),
    ("Is this country landlocked (no ocean coastline)?", "landlocked"),
    ("Is this country an island nation?", "island_nation"),
    ("Does this country have a population over 100 million?", "population_over_100_million"),
    ("Is English an official language of this country?", "english_official_language"),
    ("Does this country's name start with a vowel?", "name_starts_with_vowel"),
]

MAX_QUESTIONS = 5
