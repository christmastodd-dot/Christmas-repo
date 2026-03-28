#!/usr/bin/env python3
"""
English Word Adventure
Guess the English word in 5 questions or fewer!
Learn about word origins, parts of speech, and letter patterns.
"""

import random


# --- Word Database ---
# Each word has 13 attributes that players can ask about.
# Attributes:
#   noun              - Is it a noun?
#   verb              - Is it a verb?
#   adjective         - Is it an adjective?
#   one_syllable      - Does it have exactly one syllable?
#   starts_with_vowel - Does it start with a vowel (a, e, i, o, u)?
#   has_double_letters - Contains consecutive repeated letters (ee, ll, ss, ...)?
#   has_silent_letters - Contains a silent letter (k in knight, b in lamb, ...)?
#   latin_or_french_origin - Word originates from Latin or French?
#   related_to_nature - Relates to nature, animals, weather, plants?
#   related_to_emotions - Describes or relates to feelings/emotions?
#   has_prefix        - Has a recognizable prefix (un-, re-, pre-, dis-, ...)?
#   has_suffix        - Has a recognizable suffix (-tion, -ly, -ness, -ment, ...)?
#   common_word       - High-frequency everyday word?

WORDS = [
    # --- Words 1-50 will be added in M1b ---
    # --- Words 51-100 will be added in M1c ---
]

QUESTIONS = [
    ("Is it a noun?", "noun"),
    ("Is it a verb?", "verb"),
    ("Is it an adjective?", "adjective"),
    ("Does it have exactly one syllable?", "one_syllable"),
    ("Does it start with a vowel?", "starts_with_vowel"),
    ("Does it have double letters (like 'ee' or 'll')?", "has_double_letters"),
    ("Does it have any silent letters?", "has_silent_letters"),
    ("Does it come from Latin or French?", "latin_or_french_origin"),
    ("Is it related to nature?", "related_to_nature"),
    ("Is it related to emotions or feelings?", "related_to_emotions"),
    ("Does it have a prefix (like 'un-' or 're-')?", "has_prefix"),
    ("Does it have a suffix (like '-tion' or '-ly')?", "has_suffix"),
    ("Is it a common everyday word?", "common_word"),
]

MAX_QUESTIONS = 5


# --- Game Functions (to be implemented in M1c / M2 / M3) ---


if __name__ == "__main__":
    pass
