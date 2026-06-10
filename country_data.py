"""
Shared country data and questions for the "Guess a Country" DM mini-game.
"""

COUNTRIES = [
    {"name": "France", "in_europe": True, "in_asia": False, "in_africa": False, "in_north_america": False, "in_south_america": False, "in_oceania": False, "northern_hemisphere": True, "landlocked": False, "island_nation": False, "population_over_100_million": False, "english_official_language": False, "name_starts_with_vowel": False},
    {"name": "Germany", "in_europe": True, "in_asia": False, "in_africa": False, "in_north_america": False, "in_south_america": False, "in_oceania": False, "northern_hemisphere": True, "landlocked": False, "island_nation": False, "population_over_100_million": False, "english_official_language": False, "name_starts_with_vowel": False},
    {"name": "Switzerland", "in_europe": True, "in_asia": False, "in_africa": False, "in_north_america": False, "in_south_america": False, "in_oceania": False, "northern_hemisphere": True, "landlocked": True, "island_nation": False, "population_over_100_million": False, "english_official_language": False, "name_starts_with_vowel": False},
    {"name": "United Kingdom", "in_europe": True, "in_asia": False, "in_africa": False, "in_north_america": False, "in_south_america": False, "in_oceania": False, "northern_hemisphere": True, "landlocked": False, "island_nation": True, "population_over_100_million": False, "english_official_language": True, "name_starts_with_vowel": True},
    {"name": "Iceland", "in_europe": True, "in_asia": False, "in_africa": False, "in_north_america": False, "in_south_america": False, "in_oceania": False, "northern_hemisphere": True, "landlocked": False, "island_nation": True, "population_over_100_million": False, "english_official_language": False, "name_starts_with_vowel": True},
    {"name": "Egypt", "in_europe": False, "in_asia": False, "in_africa": True, "in_north_america": False, "in_south_america": False, "in_oceania": False, "northern_hemisphere": True, "landlocked": False, "island_nation": False, "population_over_100_million": True, "english_official_language": False, "name_starts_with_vowel": True},
    {"name": "Nigeria", "in_europe": False, "in_asia": False, "in_africa": True, "in_north_america": False, "in_south_america": False, "in_oceania": False, "northern_hemisphere": True, "landlocked": False, "island_nation": False, "population_over_100_million": True, "english_official_language": True, "name_starts_with_vowel": False},
    {"name": "Kenya", "in_europe": False, "in_asia": False, "in_africa": True, "in_north_america": False, "in_south_america": False, "in_oceania": False, "northern_hemisphere": True, "landlocked": False, "island_nation": False, "population_over_100_million": False, "english_official_language": True, "name_starts_with_vowel": False},
    {"name": "Mali", "in_europe": False, "in_asia": False, "in_africa": True, "in_north_america": False, "in_south_america": False, "in_oceania": False, "northern_hemisphere": True, "landlocked": True, "island_nation": False, "population_over_100_million": False, "english_official_language": False, "name_starts_with_vowel": False},
    {"name": "Madagascar", "in_europe": False, "in_asia": False, "in_africa": True, "in_north_america": False, "in_south_america": False, "in_oceania": False, "northern_hemisphere": False, "landlocked": False, "island_nation": True, "population_over_100_million": False, "english_official_language": False, "name_starts_with_vowel": False},
    {"name": "Australia", "in_europe": False, "in_asia": False, "in_africa": False, "in_north_america": False, "in_south_america": False, "in_oceania": True, "northern_hemisphere": False, "landlocked": False, "island_nation": True, "population_over_100_million": False, "english_official_language": True, "name_starts_with_vowel": True},
    {"name": "New Zealand", "in_europe": False, "in_asia": False, "in_africa": False, "in_north_america": False, "in_south_america": False, "in_oceania": True, "northern_hemisphere": False, "landlocked": False, "island_nation": True, "population_over_100_million": False, "english_official_language": True, "name_starts_with_vowel": False},
    {"name": "Japan", "in_europe": False, "in_asia": True, "in_africa": False, "in_north_america": False, "in_south_america": False, "in_oceania": False, "northern_hemisphere": True, "landlocked": False, "island_nation": True, "population_over_100_million": True, "english_official_language": False, "name_starts_with_vowel": False},
    {"name": "India", "in_europe": False, "in_asia": True, "in_africa": False, "in_north_america": False, "in_south_america": False, "in_oceania": False, "northern_hemisphere": True, "landlocked": False, "island_nation": False, "population_over_100_million": True, "english_official_language": True, "name_starts_with_vowel": True},
    {"name": "China", "in_europe": False, "in_asia": True, "in_africa": False, "in_north_america": False, "in_south_america": False, "in_oceania": False, "northern_hemisphere": True, "landlocked": False, "island_nation": False, "population_over_100_million": True, "english_official_language": False, "name_starts_with_vowel": False},
    {"name": "Mongolia", "in_europe": False, "in_asia": True, "in_africa": False, "in_north_america": False, "in_south_america": False, "in_oceania": False, "northern_hemisphere": True, "landlocked": True, "island_nation": False, "population_over_100_million": False, "english_official_language": False, "name_starts_with_vowel": False},
    {"name": "Indonesia", "in_europe": False, "in_asia": True, "in_africa": False, "in_north_america": False, "in_south_america": False, "in_oceania": False, "northern_hemisphere": False, "landlocked": False, "island_nation": True, "population_over_100_million": True, "english_official_language": False, "name_starts_with_vowel": True},
    {"name": "Brazil", "in_europe": False, "in_asia": False, "in_africa": False, "in_north_america": False, "in_south_america": True, "in_oceania": False, "northern_hemisphere": False, "landlocked": False, "island_nation": False, "population_over_100_million": True, "english_official_language": False, "name_starts_with_vowel": False},
    {"name": "Argentina", "in_europe": False, "in_asia": False, "in_africa": False, "in_north_america": False, "in_south_america": True, "in_oceania": False, "northern_hemisphere": False, "landlocked": False, "island_nation": False, "population_over_100_million": False, "english_official_language": False, "name_starts_with_vowel": True},
    {"name": "Bolivia", "in_europe": False, "in_asia": False, "in_africa": False, "in_north_america": False, "in_south_america": True, "in_oceania": False, "northern_hemisphere": False, "landlocked": True, "island_nation": False, "population_over_100_million": False, "english_official_language": False, "name_starts_with_vowel": False},
    {"name": "Canada", "in_europe": False, "in_asia": False, "in_africa": False, "in_north_america": True, "in_south_america": False, "in_oceania": False, "northern_hemisphere": True, "landlocked": False, "island_nation": False, "population_over_100_million": False, "english_official_language": True, "name_starts_with_vowel": False},
    {"name": "United States", "in_europe": False, "in_asia": False, "in_africa": False, "in_north_america": True, "in_south_america": False, "in_oceania": False, "northern_hemisphere": True, "landlocked": False, "island_nation": False, "population_over_100_million": True, "english_official_language": True, "name_starts_with_vowel": True},
    {"name": "Mexico", "in_europe": False, "in_asia": False, "in_africa": False, "in_north_america": True, "in_south_america": False, "in_oceania": False, "northern_hemisphere": True, "landlocked": False, "island_nation": False, "population_over_100_million": True, "english_official_language": False, "name_starts_with_vowel": False},
    {"name": "Cuba", "in_europe": False, "in_asia": False, "in_africa": False, "in_north_america": True, "in_south_america": False, "in_oceania": False, "northern_hemisphere": True, "landlocked": False, "island_nation": True, "population_over_100_million": False, "english_official_language": False, "name_starts_with_vowel": False},
]

QUESTIONS = [
    ("Is this country in Europe?", "in_europe"),
    ("Is this country in Asia?", "in_asia"),
    ("Is this country in Africa?", "in_africa"),
    ("Is this country in North America?", "in_north_america"),
    ("Is this country in South America?", "in_south_america"),
    ("Is this country in Oceania?", "in_oceania"),
    ("Is this country in the Northern Hemisphere?", "northern_hemisphere"),
    ("Is this country landlocked (no ocean coastline)?", "landlocked"),
    ("Is this country an island nation?", "island_nation"),
    ("Does this country have a population over 100 million?", "population_over_100_million"),
    ("Is English an official language of this country?", "english_official_language"),
    ("Does this country's name start with a vowel?", "name_starts_with_vowel"),
]

MAX_QUESTIONS = 5
