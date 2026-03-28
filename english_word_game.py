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
    # --- Words 1-50 (M1b) ---
    {
        "name": "happy",
        "noun": False, "verb": False, "adjective": True,
        "one_syllable": False, "starts_with_vowel": False,
        "has_double_letters": True, "has_silent_letters": False,
        "latin_or_french_origin": False, "related_to_nature": False,
        "related_to_emotions": True, "has_prefix": False, "has_suffix": False,
        "common_word": True, "difficulty": "easy",
        "definition": "feeling or showing pleasure or contentment",
        "example": "She felt happy when she saw her friends.",
        "tip": "'Happy' has double 'p' — many English words double a consonant before adding '-y'.",
        "synonyms": ["glad", "cheerful", "pleased"],
        "distractors": ["angry", "tired", "hungry"],
    },
    {
        "name": "run",
        "noun": True, "verb": True, "adjective": False,
        "one_syllable": True, "starts_with_vowel": False,
        "has_double_letters": False, "has_silent_letters": False,
        "latin_or_french_origin": False, "related_to_nature": False,
        "related_to_emotions": False, "has_prefix": False, "has_suffix": False,
        "common_word": True, "difficulty": "easy",
        "definition": "to move quickly on foot",
        "example": "I like to run in the park every morning.",
        "tip": "'Run' is both a noun and a verb — 'go for a run' vs 'run fast'.",
        "synonyms": ["sprint", "dash", "jog"],
        "distractors": ["crawl", "sit", "sleep"],
    },
    {
        "name": "beautiful",
        "noun": False, "verb": False, "adjective": True,
        "one_syllable": False, "starts_with_vowel": False,
        "has_double_letters": False, "has_silent_letters": True,
        "latin_or_french_origin": True, "related_to_nature": False,
        "related_to_emotions": True, "has_prefix": False, "has_suffix": True,
        "common_word": True, "difficulty": "medium",
        "definition": "pleasing the senses or mind aesthetically",
        "example": "The sunset over the ocean was beautiful.",
        "tip": "The 'eau' in 'beautiful' comes from French 'beau' meaning handsome.",
        "synonyms": ["gorgeous", "stunning", "lovely"],
        "distractors": ["ugly", "plain", "dull"],
    },
    {
        "name": "knight",
        "noun": True, "verb": False, "adjective": False,
        "one_syllable": True, "starts_with_vowel": False,
        "has_double_letters": False, "has_silent_letters": True,
        "latin_or_french_origin": False, "related_to_nature": False,
        "related_to_emotions": False, "has_prefix": False, "has_suffix": False,
        "common_word": True, "difficulty": "medium",
        "definition": "a medieval warrior who served a lord or king",
        "example": "The knight rode his horse into battle.",
        "tip": "The 'k' in 'knight' is silent — Old English used to pronounce it!",
        "synonyms": ["warrior", "champion", "defender"],
        "distractors": ["peasant", "merchant", "jester"],
    },
    {
        "name": "umbrella",
        "noun": True, "verb": False, "adjective": False,
        "one_syllable": False, "starts_with_vowel": True,
        "has_double_letters": True, "has_silent_letters": False,
        "latin_or_french_origin": True, "related_to_nature": False,
        "related_to_emotions": False, "has_prefix": False, "has_suffix": False,
        "common_word": True, "difficulty": "medium",
        "definition": "a device used for protection against rain or sun",
        "example": "Don't forget your umbrella — it might rain today.",
        "tip": "'Umbrella' comes from Latin 'umbra' meaning shade or shadow.",
        "synonyms": ["parasol", "canopy", "shade"],
        "distractors": ["blanket", "jacket", "helmet"],
    },
    {
        "name": "tree",
        "noun": True, "verb": False, "adjective": False,
        "one_syllable": True, "starts_with_vowel": False,
        "has_double_letters": True, "has_silent_letters": False,
        "latin_or_french_origin": False, "related_to_nature": True,
        "related_to_emotions": False, "has_prefix": False, "has_suffix": False,
        "common_word": True, "difficulty": "easy",
        "definition": "a tall plant with a trunk, branches, and leaves",
        "example": "We planted a tree in the backyard.",
        "tip": "'Tree' has the double 'e' pattern — like 'free', 'see', 'bee'.",
        "synonyms": ["oak", "timber", "sapling"],
        "distractors": ["rock", "river", "cloud"],
    },
    {
        "name": "write",
        "noun": False, "verb": True, "adjective": False,
        "one_syllable": True, "starts_with_vowel": False,
        "has_double_letters": False, "has_silent_letters": True,
        "latin_or_french_origin": False, "related_to_nature": False,
        "related_to_emotions": False, "has_prefix": False, "has_suffix": False,
        "common_word": True, "difficulty": "easy",
        "definition": "to mark letters or words on a surface",
        "example": "Please write your name on the paper.",
        "tip": "The 'w' in 'write' is silent — it's a homophone of 'right'!",
        "synonyms": ["compose", "record", "inscribe"],
        "distractors": ["erase", "shout", "forget"],
    },
    {
        "name": "adventure",
        "noun": True, "verb": False, "adjective": False,
        "one_syllable": False, "starts_with_vowel": True,
        "has_double_letters": False, "has_silent_letters": False,
        "latin_or_french_origin": True, "related_to_nature": False,
        "related_to_emotions": True, "has_prefix": False, "has_suffix": True,
        "common_word": True, "difficulty": "medium",
        "definition": "an unusual and exciting experience or activity",
        "example": "Going camping in the mountains was a great adventure.",
        "tip": "From Latin 'adventura' — the '-ture' suffix turns verbs into nouns.",
        "synonyms": ["quest", "journey", "expedition"],
        "distractors": ["routine", "chore", "rest"],
    },
    {
        "name": "elephant",
        "noun": True, "verb": False, "adjective": False,
        "one_syllable": False, "starts_with_vowel": True,
        "has_double_letters": False, "has_silent_letters": False,
        "latin_or_french_origin": True, "related_to_nature": True,
        "related_to_emotions": False, "has_prefix": False, "has_suffix": False,
        "common_word": True, "difficulty": "medium",
        "definition": "the largest living land animal with a trunk and tusks",
        "example": "The elephant sprayed water with its trunk.",
        "tip": "'Ph' makes an 'f' sound in English — from Greek 'elephas'.",
        "synonyms": ["pachyderm", "mammoth", "tusker"],
        "distractors": ["giraffe", "dolphin", "sparrow"],
    },
    {
        "name": "unhappy",
        "noun": False, "verb": False, "adjective": True,
        "one_syllable": False, "starts_with_vowel": True,
        "has_double_letters": True, "has_silent_letters": False,
        "latin_or_french_origin": False, "related_to_nature": False,
        "related_to_emotions": True, "has_prefix": True, "has_suffix": False,
        "common_word": True, "difficulty": "easy",
        "definition": "not happy; sad or discontented",
        "example": "He was unhappy about the cancelled trip.",
        "tip": "The prefix 'un-' means 'not' — one of the most common English prefixes.",
        "synonyms": ["sad", "miserable", "gloomy"],
        "distractors": ["excited", "calm", "proud"],
    },
    {
        "name": "knowledge",
        "noun": True, "verb": False, "adjective": False,
        "one_syllable": False, "starts_with_vowel": False,
        "has_double_letters": False, "has_silent_letters": True,
        "latin_or_french_origin": False, "related_to_nature": False,
        "related_to_emotions": False, "has_prefix": False, "has_suffix": False,
        "common_word": True, "difficulty": "hard",
        "definition": "facts, information, and skills acquired through experience or education",
        "example": "Her knowledge of history is impressive.",
        "tip": "The 'k' in 'knowledge' is silent — same pattern as 'know' and 'knee'.",
        "synonyms": ["wisdom", "understanding", "learning"],
        "distractors": ["ignorance", "confusion", "doubt"],
    },
    {
        "name": "quickly",
        "noun": False, "verb": False, "adjective": False,
        "one_syllable": False, "starts_with_vowel": False,
        "has_double_letters": False, "has_silent_letters": False,
        "latin_or_french_origin": False, "related_to_nature": False,
        "related_to_emotions": False, "has_prefix": False, "has_suffix": True,
        "common_word": True, "difficulty": "easy",
        "definition": "at a fast speed; rapidly",
        "example": "She quickly finished her homework.",
        "tip": "The suffix '-ly' turns adjectives into adverbs: quick → quickly.",
        "synonyms": ["rapidly", "swiftly", "fast"],
        "distractors": ["slowly", "carefully", "quietly"],
    },
    {
        "name": "rain",
        "noun": True, "verb": True, "adjective": False,
        "one_syllable": True, "starts_with_vowel": False,
        "has_double_letters": False, "has_silent_letters": False,
        "latin_or_french_origin": False, "related_to_nature": True,
        "related_to_emotions": False, "has_prefix": False, "has_suffix": False,
        "common_word": True, "difficulty": "easy",
        "definition": "water that falls from clouds in drops",
        "example": "The rain lasted all afternoon.",
        "tip": "'Rain', 'reign', and 'rein' all sound the same — classic English homophones!",
        "synonyms": ["drizzle", "downpour", "shower"],
        "distractors": ["sunshine", "breeze", "fog"],
    },
    {
        "name": "discover",
        "noun": False, "verb": True, "adjective": False,
        "one_syllable": False, "starts_with_vowel": False,
        "has_double_letters": False, "has_silent_letters": False,
        "latin_or_french_origin": True, "related_to_nature": False,
        "related_to_emotions": False, "has_prefix": True, "has_suffix": False,
        "common_word": True, "difficulty": "medium",
        "definition": "to find something for the first time",
        "example": "Scientists discover new species every year.",
        "tip": "'Dis-' is a Latin prefix meaning 'apart' — discover literally means 'uncover'.",
        "synonyms": ["find", "uncover", "detect"],
        "distractors": ["hide", "lose", "ignore"],
    },
    {
        "name": "ocean",
        "noun": True, "verb": False, "adjective": False,
        "one_syllable": False, "starts_with_vowel": True,
        "has_double_letters": False, "has_silent_letters": False,
        "latin_or_french_origin": True, "related_to_nature": True,
        "related_to_emotions": False, "has_prefix": False, "has_suffix": False,
        "common_word": True, "difficulty": "easy",
        "definition": "a very large expanse of sea",
        "example": "Whales live in the ocean.",
        "tip": "The 'ce' in 'ocean' makes a 'sh' sound — an unusual English spelling pattern.",
        "synonyms": ["sea", "deep", "waters"],
        "distractors": ["desert", "forest", "meadow"],
    },
    {
        "name": "lamb",
        "noun": True, "verb": False, "adjective": False,
        "one_syllable": True, "starts_with_vowel": False,
        "has_double_letters": False, "has_silent_letters": True,
        "latin_or_french_origin": False, "related_to_nature": True,
        "related_to_emotions": False, "has_prefix": False, "has_suffix": False,
        "common_word": True, "difficulty": "easy",
        "definition": "a young sheep",
        "example": "The lamb followed its mother across the field.",
        "tip": "The 'b' in 'lamb' is silent — same pattern as 'comb', 'thumb', 'climb'.",
        "synonyms": ["sheep", "ewe", "yearling"],
        "distractors": ["calf", "foal", "piglet"],
    },
    {
        "name": "impossible",
        "noun": False, "verb": False, "adjective": True,
        "one_syllable": False, "starts_with_vowel": True,
        "has_double_letters": False, "has_silent_letters": False,
        "latin_or_french_origin": True, "related_to_nature": False,
        "related_to_emotions": False, "has_prefix": True, "has_suffix": True,
        "common_word": True, "difficulty": "medium",
        "definition": "not able to occur, exist, or be done",
        "example": "Nothing is impossible if you work hard enough.",
        "tip": "The prefix 'im-' is a form of 'in-' (meaning 'not') used before 'b', 'm', 'p'.",
        "synonyms": ["unachievable", "hopeless", "unattainable"],
        "distractors": ["simple", "likely", "certain"],
    },
    {
        "name": "flower",
        "noun": True, "verb": True, "adjective": False,
        "one_syllable": False, "starts_with_vowel": False,
        "has_double_letters": False, "has_silent_letters": False,
        "latin_or_french_origin": True, "related_to_nature": True,
        "related_to_emotions": False, "has_prefix": False, "has_suffix": False,
        "common_word": True, "difficulty": "easy",
        "definition": "the seed-bearing part of a plant, often colorful",
        "example": "She picked a flower from the garden.",
        "tip": "'Flower' and 'flour' are homophones — they used to be the same word!",
        "synonyms": ["bloom", "blossom", "petal"],
        "distractors": ["thorn", "root", "stone"],
    },
    {
        "name": "remember",
        "noun": False, "verb": True, "adjective": False,
        "one_syllable": False, "starts_with_vowel": False,
        "has_double_letters": False, "has_silent_letters": False,
        "latin_or_french_origin": True, "related_to_nature": False,
        "related_to_emotions": True, "has_prefix": True, "has_suffix": False,
        "common_word": True, "difficulty": "medium",
        "definition": "to have something come into the mind again",
        "example": "Do you remember your first day of school?",
        "tip": "'Re-' means 'again' — to remember is to bring a 'member' (thought) back again.",
        "synonyms": ["recall", "recollect", "reminisce"],
        "distractors": ["forget", "ignore", "overlook"],
    },
    {
        "name": "bright",
        "noun": False, "verb": False, "adjective": True,
        "one_syllable": True, "starts_with_vowel": False,
        "has_double_letters": False, "has_silent_letters": True,
        "latin_or_french_origin": False, "related_to_nature": False,
        "related_to_emotions": False, "has_prefix": False, "has_suffix": False,
        "common_word": True, "difficulty": "easy",
        "definition": "giving out or reflecting a lot of light; shining",
        "example": "The bright sun made everyone squint.",
        "tip": "The 'gh' in 'bright' is silent — same as 'night', 'light', 'right'.",
        "synonyms": ["radiant", "luminous", "shining"],
        "distractors": ["dim", "dull", "murky"],
    },
    {
        "name": "education",
        "noun": True, "verb": False, "adjective": False,
        "one_syllable": False, "starts_with_vowel": True,
        "has_double_letters": False, "has_silent_letters": False,
        "latin_or_french_origin": True, "related_to_nature": False,
        "related_to_emotions": False, "has_prefix": False, "has_suffix": True,
        "common_word": True, "difficulty": "medium",
        "definition": "the process of receiving or giving systematic instruction",
        "example": "Education opens doors to new opportunities.",
        "tip": "The suffix '-tion' (pronounced 'shun') is one of the most common noun endings.",
        "synonyms": ["learning", "schooling", "instruction"],
        "distractors": ["vacation", "entertainment", "relaxation"],
    },
    {
        "name": "cold",
        "noun": True, "verb": False, "adjective": True,
        "one_syllable": True, "starts_with_vowel": False,
        "has_double_letters": False, "has_silent_letters": False,
        "latin_or_french_origin": False, "related_to_nature": True,
        "related_to_emotions": True, "has_prefix": False, "has_suffix": False,
        "common_word": True, "difficulty": "easy",
        "definition": "of or at a low temperature",
        "example": "It was so cold that the pond froze over.",
        "tip": "'Cold' is both a noun ('catch a cold') and an adjective ('cold water').",
        "synonyms": ["chilly", "freezing", "frigid"],
        "distractors": ["warm", "humid", "dry"],
    },
    {
        "name": "butterfly",
        "noun": True, "verb": False, "adjective": False,
        "one_syllable": False, "starts_with_vowel": False,
        "has_double_letters": True, "has_silent_letters": False,
        "latin_or_french_origin": False, "related_to_nature": True,
        "related_to_emotions": False, "has_prefix": False, "has_suffix": False,
        "common_word": True, "difficulty": "medium",
        "definition": "an insect with large colorful wings",
        "example": "A butterfly landed on the flower.",
        "tip": "'Butterfly' is a compound word: 'butter' + 'fly'. Nobody knows why!",
        "synonyms": ["moth", "insect", "winged creature"],
        "distractors": ["beetle", "spider", "worm"],
    },
    {
        "name": "accept",
        "noun": False, "verb": True, "adjective": False,
        "one_syllable": False, "starts_with_vowel": True,
        "has_double_letters": False, "has_silent_letters": False,
        "latin_or_french_origin": True, "related_to_nature": False,
        "related_to_emotions": False, "has_prefix": False, "has_suffix": False,
        "common_word": True, "difficulty": "medium",
        "definition": "to agree to receive or take something offered",
        "example": "She decided to accept the job offer.",
        "tip": "Don't confuse 'accept' (verb: to receive) with 'except' (preposition: excluding).",
        "synonyms": ["agree", "approve", "embrace"],
        "distractors": ["reject", "refuse", "deny"],
    },
    {
        "name": "sleep",
        "noun": True, "verb": True, "adjective": False,
        "one_syllable": True, "starts_with_vowel": False,
        "has_double_letters": True, "has_silent_letters": False,
        "latin_or_french_origin": False, "related_to_nature": False,
        "related_to_emotions": False, "has_prefix": False, "has_suffix": False,
        "common_word": True, "difficulty": "easy",
        "definition": "a natural state of rest for the body and mind",
        "example": "I need eight hours of sleep every night.",
        "tip": "'Sleep' is both a noun and verb — 'a good sleep' vs 'I sleep well'.",
        "synonyms": ["rest", "slumber", "nap"],
        "distractors": ["wake", "work", "exercise"],
    },
    {
        "name": "mysterious",
        "noun": False, "verb": False, "adjective": True,
        "one_syllable": False, "starts_with_vowel": False,
        "has_double_letters": False, "has_silent_letters": False,
        "latin_or_french_origin": True, "related_to_nature": False,
        "related_to_emotions": True, "has_prefix": False, "has_suffix": True,
        "common_word": True, "difficulty": "hard",
        "definition": "difficult or impossible to understand, explain, or identify",
        "example": "The old house had a mysterious atmosphere.",
        "tip": "The suffix '-ous' turns nouns into adjectives: mystery → mysterious.",
        "synonyms": ["enigmatic", "puzzling", "cryptic"],
        "distractors": ["obvious", "clear", "simple"],
    },
    {
        "name": "island",
        "noun": True, "verb": False, "adjective": False,
        "one_syllable": False, "starts_with_vowel": True,
        "has_double_letters": False, "has_silent_letters": True,
        "latin_or_french_origin": False, "related_to_nature": True,
        "related_to_emotions": False, "has_prefix": False, "has_suffix": False,
        "common_word": True, "difficulty": "medium",
        "definition": "a piece of land surrounded by water",
        "example": "We took a boat to the small island.",
        "tip": "The 's' in 'island' is silent! It was added by mistake — influenced by Latin 'insula'.",
        "synonyms": ["isle", "atoll", "islet"],
        "distractors": ["peninsula", "continent", "valley"],
    },
    {
        "name": "return",
        "noun": True, "verb": True, "adjective": False,
        "one_syllable": False, "starts_with_vowel": False,
        "has_double_letters": False, "has_silent_letters": False,
        "latin_or_french_origin": True, "related_to_nature": False,
        "related_to_emotions": False, "has_prefix": True, "has_suffix": False,
        "common_word": True, "difficulty": "easy",
        "definition": "to come or go back to a place or activity",
        "example": "I will return the book to the library tomorrow.",
        "tip": "'Re-' means 'back' — return literally means 'to turn back'.",
        "synonyms": ["come back", "go back", "restore"],
        "distractors": ["depart", "leave", "abandon"],
    },
    {
        "name": "gentle",
        "noun": False, "verb": False, "adjective": True,
        "one_syllable": False, "starts_with_vowel": False,
        "has_double_letters": False, "has_silent_letters": False,
        "latin_or_french_origin": True, "related_to_nature": False,
        "related_to_emotions": True, "has_prefix": False, "has_suffix": True,
        "common_word": True, "difficulty": "easy",
        "definition": "mild in temperament or behavior; kind and tender",
        "example": "Be gentle with the baby kitten.",
        "tip": "From French 'gentil' — the '-le' ending is common in English adjectives.",
        "synonyms": ["soft", "tender", "mild"],
        "distractors": ["rough", "harsh", "fierce"],
    },
    {
        "name": "mountain",
        "noun": True, "verb": False, "adjective": False,
        "one_syllable": False, "starts_with_vowel": False,
        "has_double_letters": False, "has_silent_letters": True,
        "latin_or_french_origin": True, "related_to_nature": True,
        "related_to_emotions": False, "has_prefix": False, "has_suffix": False,
        "common_word": True, "difficulty": "medium",
        "definition": "a large natural elevation of the earth's surface",
        "example": "They climbed the mountain to see the view.",
        "tip": "The 'ai' in 'mountain' makes a short 'i' sound — English spelling is tricky!",
        "synonyms": ["peak", "summit", "ridge"],
        "distractors": ["valley", "canyon", "plain"],
    },
    {
        "name": "disappear",
        "noun": False, "verb": True, "adjective": False,
        "one_syllable": False, "starts_with_vowel": False,
        "has_double_letters": True, "has_silent_letters": False,
        "latin_or_french_origin": True, "related_to_nature": False,
        "related_to_emotions": False, "has_prefix": True, "has_suffix": False,
        "common_word": True, "difficulty": "medium",
        "definition": "to cease to be visible; to vanish",
        "example": "The magician made the rabbit disappear.",
        "tip": "'Dis-' means 'not' or 'opposite' — disappear = opposite of appear.",
        "synonyms": ["vanish", "fade", "evaporate"],
        "distractors": ["appear", "arrive", "emerge"],
    },
    {
        "name": "light",
        "noun": True, "verb": True, "adjective": True,
        "one_syllable": True, "starts_with_vowel": False,
        "has_double_letters": False, "has_silent_letters": True,
        "latin_or_french_origin": False, "related_to_nature": True,
        "related_to_emotions": False, "has_prefix": False, "has_suffix": False,
        "common_word": True, "difficulty": "easy",
        "definition": "the natural agent that makes things visible",
        "example": "The light from the candle filled the room.",
        "tip": "'Light' can be a noun, verb, AND adjective — one of English's most flexible words.",
        "synonyms": ["glow", "radiance", "brightness"],
        "distractors": ["darkness", "shadow", "gloom"],
    },
    {
        "name": "kindness",
        "noun": True, "verb": False, "adjective": False,
        "one_syllable": False, "starts_with_vowel": False,
        "has_double_letters": False, "has_silent_letters": False,
        "latin_or_french_origin": False, "related_to_nature": False,
        "related_to_emotions": True, "has_prefix": False, "has_suffix": True,
        "common_word": True, "difficulty": "easy",
        "definition": "the quality of being friendly, generous, and considerate",
        "example": "Her kindness made everyone feel welcome.",
        "tip": "The suffix '-ness' turns adjectives into nouns: kind → kindness.",
        "synonyms": ["generosity", "compassion", "goodness"],
        "distractors": ["cruelty", "meanness", "greed"],
    },
    {
        "name": "whisper",
        "noun": True, "verb": True, "adjective": False,
        "one_syllable": False, "starts_with_vowel": False,
        "has_double_letters": False, "has_silent_letters": False,
        "latin_or_french_origin": False, "related_to_nature": False,
        "related_to_emotions": False, "has_prefix": False, "has_suffix": False,
        "common_word": True, "difficulty": "medium",
        "definition": "to speak very softly using one's breath",
        "example": "She had to whisper in the library.",
        "tip": "The 'wh-' in 'whisper' was once pronounced with a puff of air — some dialects still do!",
        "synonyms": ["murmur", "mutter", "hush"],
        "distractors": ["shout", "scream", "yell"],
    },
    {
        "name": "ancient",
        "noun": False, "verb": False, "adjective": True,
        "one_syllable": False, "starts_with_vowel": True,
        "has_double_letters": False, "has_silent_letters": False,
        "latin_or_french_origin": True, "related_to_nature": False,
        "related_to_emotions": False, "has_prefix": False, "has_suffix": False,
        "common_word": True, "difficulty": "medium",
        "definition": "belonging to the very distant past",
        "example": "The ancient ruins were thousands of years old.",
        "tip": "From Latin 'antiquus' via French — the '-ient' ending is a Latin pattern.",
        "synonyms": ["old", "antique", "prehistoric"],
        "distractors": ["modern", "recent", "new"],
    },
    {
        "name": "storm",
        "noun": True, "verb": True, "adjective": False,
        "one_syllable": True, "starts_with_vowel": False,
        "has_double_letters": False, "has_silent_letters": False,
        "latin_or_french_origin": False, "related_to_nature": True,
        "related_to_emotions": True, "has_prefix": False, "has_suffix": False,
        "common_word": True, "difficulty": "easy",
        "definition": "a violent disturbance of the atmosphere with wind and rain",
        "example": "The storm knocked down several trees.",
        "tip": "'Storm' is Germanic — many short, strong English weather words are Germanic.",
        "synonyms": ["tempest", "gale", "squall"],
        "distractors": ["calm", "breeze", "stillness"],
    },
    {
        "name": "rebuild",
        "noun": False, "verb": True, "adjective": False,
        "one_syllable": False, "starts_with_vowel": False,
        "has_double_letters": False, "has_silent_letters": False,
        "latin_or_french_origin": False, "related_to_nature": False,
        "related_to_emotions": False, "has_prefix": True, "has_suffix": False,
        "common_word": True, "difficulty": "easy",
        "definition": "to build something again after it has been damaged",
        "example": "They had to rebuild the house after the fire.",
        "tip": "'Re-' means 'again' — rebuild, redo, restart all follow this pattern.",
        "synonyms": ["reconstruct", "restore", "renovate"],
        "distractors": ["demolish", "destroy", "abandon"],
    },
    {
        "name": "tongue",
        "noun": True, "verb": False, "adjective": False,
        "one_syllable": True, "starts_with_vowel": False,
        "has_double_letters": False, "has_silent_letters": True,
        "latin_or_french_origin": False, "related_to_nature": False,
        "related_to_emotions": False, "has_prefix": False, "has_suffix": False,
        "common_word": True, "difficulty": "hard",
        "definition": "the muscular organ in the mouth used for tasting and speaking",
        "example": "The doctor asked me to stick out my tongue.",
        "tip": "The 'ue' at the end of 'tongue' is silent — one of English's trickiest spellings.",
        "synonyms": ["language", "speech", "dialect"],
        "distractors": ["finger", "elbow", "ankle"],
    },
    {
        "name": "joyful",
        "noun": False, "verb": False, "adjective": True,
        "one_syllable": False, "starts_with_vowel": False,
        "has_double_letters": False, "has_silent_letters": False,
        "latin_or_french_origin": True, "related_to_nature": False,
        "related_to_emotions": True, "has_prefix": False, "has_suffix": True,
        "common_word": True, "difficulty": "easy",
        "definition": "feeling, expressing, or causing great pleasure and happiness",
        "example": "It was a joyful celebration for the whole family.",
        "tip": "The suffix '-ful' means 'full of' — joyful = full of joy.",
        "synonyms": ["delighted", "elated", "jubilant"],
        "distractors": ["sorrowful", "gloomy", "bitter"],
    },
    {
        "name": "wolf",
        "noun": True, "verb": False, "adjective": False,
        "one_syllable": True, "starts_with_vowel": False,
        "has_double_letters": False, "has_silent_letters": False,
        "latin_or_french_origin": False, "related_to_nature": True,
        "related_to_emotions": False, "has_prefix": False, "has_suffix": False,
        "common_word": True, "difficulty": "easy",
        "definition": "a wild carnivorous mammal related to the dog",
        "example": "The wolf howled at the moon.",
        "tip": "Plural is 'wolves' — English changes 'f' to 'v' before adding '-es' (wife/wives, leaf/leaves).",
        "synonyms": ["canine", "predator", "beast"],
        "distractors": ["rabbit", "deer", "lamb"],
    },
    {
        "name": "precious",
        "noun": False, "verb": False, "adjective": True,
        "one_syllable": False, "starts_with_vowel": False,
        "has_double_letters": False, "has_silent_letters": False,
        "latin_or_french_origin": True, "related_to_nature": False,
        "related_to_emotions": True, "has_prefix": False, "has_suffix": True,
        "common_word": True, "difficulty": "medium",
        "definition": "of great value; not to be wasted or treated carelessly",
        "example": "Time is precious — use it wisely.",
        "tip": "The '-ious' suffix (from Latin) is common in adjectives: precious, curious, serious.",
        "synonyms": ["valuable", "treasured", "priceless"],
        "distractors": ["worthless", "cheap", "common"],
    },
    {
        "name": "eagle",
        "noun": True, "verb": False, "adjective": False,
        "one_syllable": False, "starts_with_vowel": True,
        "has_double_letters": False, "has_silent_letters": True,
        "latin_or_french_origin": True, "related_to_nature": True,
        "related_to_emotions": False, "has_prefix": False, "has_suffix": True,
        "common_word": True, "difficulty": "easy",
        "definition": "a large bird of prey with keen eyesight",
        "example": "The eagle soared high above the valley.",
        "tip": "The 'le' at the end is a common English pattern — eagle, table, little, apple.",
        "synonyms": ["hawk", "falcon", "raptor"],
        "distractors": ["penguin", "parrot", "robin"],
    },
    {
        "name": "predict",
        "noun": False, "verb": True, "adjective": False,
        "one_syllable": False, "starts_with_vowel": False,
        "has_double_letters": False, "has_silent_letters": False,
        "latin_or_french_origin": True, "related_to_nature": False,
        "related_to_emotions": False, "has_prefix": True, "has_suffix": False,
        "common_word": True, "difficulty": "medium",
        "definition": "to say what will happen in the future",
        "example": "Can you predict who will win the game?",
        "tip": "'Pre-' means 'before' and 'dict' means 'say' — predict = say beforehand.",
        "synonyms": ["forecast", "foresee", "anticipate"],
        "distractors": ["recall", "review", "reflect"],
    },
    {
        "name": "angry",
        "noun": False, "verb": False, "adjective": True,
        "one_syllable": False, "starts_with_vowel": True,
        "has_double_letters": False, "has_silent_letters": False,
        "latin_or_french_origin": False, "related_to_nature": False,
        "related_to_emotions": True, "has_prefix": False, "has_suffix": False,
        "common_word": True, "difficulty": "easy",
        "definition": "feeling or showing strong annoyance or hostility",
        "example": "He was angry because someone broke his toy.",
        "tip": "'Angry' comes from Old Norse 'angr' meaning grief — Vikings influenced English!",
        "synonyms": ["furious", "mad", "enraged"],
        "distractors": ["calm", "peaceful", "pleased"],
    },
    {
        "name": "scissors",
        "noun": True, "verb": False, "adjective": False,
        "one_syllable": False, "starts_with_vowel": False,
        "has_double_letters": True, "has_silent_letters": True,
        "latin_or_french_origin": True, "related_to_nature": False,
        "related_to_emotions": False, "has_prefix": False, "has_suffix": False,
        "common_word": True, "difficulty": "hard",
        "definition": "a cutting instrument with two blades",
        "example": "Use scissors to cut along the dotted line.",
        "tip": "The 'sc' makes an 's' sound (the 'c' is silent) — 'scissors' is always plural!",
        "synonyms": ["shears", "clippers", "cutters"],
        "distractors": ["stapler", "ruler", "eraser"],
    },
    {
        "name": "freeze",
        "noun": True, "verb": True, "adjective": False,
        "one_syllable": True, "starts_with_vowel": False,
        "has_double_letters": True, "has_silent_letters": False,
        "latin_or_french_origin": False, "related_to_nature": True,
        "related_to_emotions": False, "has_prefix": False, "has_suffix": False,
        "common_word": True, "difficulty": "easy",
        "definition": "to turn from liquid to solid by cold temperature",
        "example": "Water will freeze at zero degrees Celsius.",
        "tip": "Irregular past tense: freeze → froze → frozen. Many old Germanic verbs are irregular.",
        "synonyms": ["solidify", "ice over", "chill"],
        "distractors": ["melt", "boil", "evaporate"],
    },
    {
        "name": "comfortable",
        "noun": False, "verb": False, "adjective": True,
        "one_syllable": False, "starts_with_vowel": False,
        "has_double_letters": False, "has_silent_letters": True,
        "latin_or_french_origin": True, "related_to_nature": False,
        "related_to_emotions": True, "has_prefix": False, "has_suffix": True,
        "common_word": True, "difficulty": "medium",
        "definition": "providing physical ease and relaxation",
        "example": "This chair is very comfortable.",
        "tip": "Most people say 'COMF-ter-ble' (3 syllables) — the 'or' is often silent in speech.",
        "synonyms": ["cozy", "snug", "relaxed"],
        "distractors": ["stiff", "tense", "painful"],
    },
    {
        "name": "explore",
        "noun": False, "verb": True, "adjective": False,
        "one_syllable": False, "starts_with_vowel": True,
        "has_double_letters": False, "has_silent_letters": False,
        "latin_or_french_origin": True, "related_to_nature": False,
        "related_to_emotions": False, "has_prefix": True, "has_suffix": False,
        "common_word": True, "difficulty": "medium",
        "definition": "to travel through an unfamiliar area to learn about it",
        "example": "We love to explore new places on vacation.",
        "tip": "'Ex-' means 'out' — explore originally meant 'to search out'.",
        "synonyms": ["investigate", "discover", "examine"],
        "distractors": ["ignore", "avoid", "retreat"],
    },
    # --- Words 51-100 (M1c) ---
    {
        "name": "courage",
        "noun": True, "verb": False, "adjective": False,
        "one_syllable": False, "starts_with_vowel": False,
        "has_double_letters": False, "has_silent_letters": False,
        "latin_or_french_origin": True, "related_to_nature": False,
        "related_to_emotions": True, "has_prefix": False, "has_suffix": False,
        "common_word": True, "difficulty": "medium",
        "definition": "the ability to do something that frightens you",
        "example": "It took courage to speak in front of the whole school.",
        "tip": "From French 'coeur' (heart) — courage literally means 'heartfulness'.",
        "synonyms": ["bravery", "valor", "nerve"],
        "distractors": ["cowardice", "fear", "doubt"],
    },
    {
        "name": "bread",
        "noun": True, "verb": False, "adjective": False,
        "one_syllable": True, "starts_with_vowel": False,
        "has_double_letters": False, "has_silent_letters": True,
        "latin_or_french_origin": False, "related_to_nature": False,
        "related_to_emotions": False, "has_prefix": False, "has_suffix": False,
        "common_word": True, "difficulty": "easy",
        "definition": "food made from flour, water, and yeast baked together",
        "example": "She bought a loaf of bread from the bakery.",
        "tip": "The 'ea' in 'bread' sounds like 'eh' — compare 'read' (past) vs 'read' (present).",
        "synonyms": ["loaf", "roll", "baguette"],
        "distractors": ["cake", "cookie", "candy"],
    },
    {
        "name": "invisible",
        "noun": False, "verb": False, "adjective": True,
        "one_syllable": False, "starts_with_vowel": True,
        "has_double_letters": False, "has_silent_letters": False,
        "latin_or_french_origin": True, "related_to_nature": False,
        "related_to_emotions": False, "has_prefix": True, "has_suffix": True,
        "common_word": True, "difficulty": "medium",
        "definition": "unable to be seen",
        "example": "The ghost was invisible to everyone.",
        "tip": "'In-' means 'not' + 'visible' = not visible. The prefix 'in-' becomes 'im-' before b/m/p.",
        "synonyms": ["unseen", "hidden", "concealed"],
        "distractors": ["obvious", "visible", "bright"],
    },
    {
        "name": "climb",
        "noun": True, "verb": True, "adjective": False,
        "one_syllable": True, "starts_with_vowel": False,
        "has_double_letters": False, "has_silent_letters": True,
        "latin_or_french_origin": False, "related_to_nature": False,
        "related_to_emotions": False, "has_prefix": False, "has_suffix": False,
        "common_word": True, "difficulty": "easy",
        "definition": "to go upward using hands and feet",
        "example": "We had to climb the steep hill to reach the top.",
        "tip": "The 'b' in 'climb' is silent — same pattern as 'lamb', 'comb', 'thumb'.",
        "synonyms": ["ascend", "scale", "mount"],
        "distractors": ["descend", "fall", "slide"],
    },
    {
        "name": "wonderful",
        "noun": False, "verb": False, "adjective": True,
        "one_syllable": False, "starts_with_vowel": False,
        "has_double_letters": False, "has_silent_letters": False,
        "latin_or_french_origin": False, "related_to_nature": False,
        "related_to_emotions": True, "has_prefix": False, "has_suffix": True,
        "common_word": True, "difficulty": "easy",
        "definition": "inspiring delight, pleasure, or admiration",
        "example": "We had a wonderful time at the beach.",
        "tip": "'Wonder' + '-ful' = full of wonder. Compare: beautiful, grateful, powerful.",
        "synonyms": ["amazing", "marvelous", "fantastic"],
        "distractors": ["terrible", "boring", "ordinary"],
    },
    {
        "name": "receive",
        "noun": False, "verb": True, "adjective": False,
        "one_syllable": False, "starts_with_vowel": False,
        "has_double_letters": False, "has_silent_letters": True,
        "latin_or_french_origin": True, "related_to_nature": False,
        "related_to_emotions": False, "has_prefix": True, "has_suffix": False,
        "common_word": True, "difficulty": "medium",
        "definition": "to be given or presented with something",
        "example": "Did you receive my letter?",
        "tip": "Remember: 'i before e, except after c' — receive, ceiling, deceive.",
        "synonyms": ["get", "obtain", "acquire"],
        "distractors": ["give", "send", "donate"],
    },
    {
        "name": "shadow",
        "noun": True, "verb": True, "adjective": False,
        "one_syllable": False, "starts_with_vowel": False,
        "has_double_letters": False, "has_silent_letters": False,
        "latin_or_french_origin": False, "related_to_nature": True,
        "related_to_emotions": False, "has_prefix": False, "has_suffix": False,
        "common_word": True, "difficulty": "easy",
        "definition": "a dark area produced by an object blocking light",
        "example": "The tree cast a long shadow on the ground.",
        "tip": "'Shadow' comes from Old English 'sceadwe' — the 'ow' ending is Germanic.",
        "synonyms": ["shade", "silhouette", "outline"],
        "distractors": ["spotlight", "glare", "flash"],
    },
    {
        "name": "pronunciation",
        "noun": True, "verb": False, "adjective": False,
        "one_syllable": False, "starts_with_vowel": False,
        "has_double_letters": False, "has_silent_letters": False,
        "latin_or_french_origin": True, "related_to_nature": False,
        "related_to_emotions": False, "has_prefix": True, "has_suffix": True,
        "common_word": True, "difficulty": "hard",
        "definition": "the way in which a word is spoken",
        "example": "The pronunciation of 'colonel' surprises many learners.",
        "tip": "Note: it's 'pronUNciation' not 'proNOUNciation' — a common mistake!",
        "synonyms": ["articulation", "enunciation", "accent"],
        "distractors": ["spelling", "grammar", "vocabulary"],
    },
    {
        "name": "strong",
        "noun": False, "verb": False, "adjective": True,
        "one_syllable": True, "starts_with_vowel": False,
        "has_double_letters": False, "has_silent_letters": False,
        "latin_or_french_origin": False, "related_to_nature": False,
        "related_to_emotions": False, "has_prefix": False, "has_suffix": False,
        "common_word": True, "difficulty": "easy",
        "definition": "having great physical power or force",
        "example": "She is strong enough to lift the heavy box.",
        "tip": "'Strong' is Germanic — short, punchy adjectives in English tend to be Germanic.",
        "synonyms": ["powerful", "mighty", "sturdy"],
        "distractors": ["weak", "fragile", "delicate"],
    },
    {
        "name": "environment",
        "noun": True, "verb": False, "adjective": False,
        "one_syllable": False, "starts_with_vowel": True,
        "has_double_letters": False, "has_silent_letters": True,
        "latin_or_french_origin": True, "related_to_nature": True,
        "related_to_emotions": False, "has_prefix": True, "has_suffix": True,
        "common_word": True, "difficulty": "hard",
        "definition": "the surroundings or conditions in which a person or animal lives",
        "example": "We should protect the environment for future generations.",
        "tip": "The '-ment' suffix turns verbs into nouns: environ → environment.",
        "synonyms": ["surroundings", "habitat", "ecosystem"],
        "distractors": ["furniture", "equipment", "machinery"],
    },
    {
        "name": "fish",
        "noun": True, "verb": True, "adjective": False,
        "one_syllable": True, "starts_with_vowel": False,
        "has_double_letters": False, "has_silent_letters": False,
        "latin_or_french_origin": False, "related_to_nature": True,
        "related_to_emotions": False, "has_prefix": False, "has_suffix": False,
        "common_word": True, "difficulty": "easy",
        "definition": "a cold-blooded animal that lives in water and breathes through gills",
        "example": "We watched the fish swim in the pond.",
        "tip": "'Fish' is the same in singular and plural — 'one fish, two fish'!",
        "synonyms": ["trout", "bass", "seafood"],
        "distractors": ["bird", "mammal", "insect"],
    },
    {
        "name": "unbelievable",
        "noun": False, "verb": False, "adjective": True,
        "one_syllable": False, "starts_with_vowel": True,
        "has_double_letters": False, "has_silent_letters": False,
        "latin_or_french_origin": False, "related_to_nature": False,
        "related_to_emotions": True, "has_prefix": True, "has_suffix": True,
        "common_word": True, "difficulty": "medium",
        "definition": "so great or extreme as to be difficult to believe",
        "example": "The view from the top was unbelievable.",
        "tip": "Three parts: 'un-' (not) + 'believe' + '-able' (can be). English loves stacking affixes!",
        "synonyms": ["incredible", "astonishing", "astounding"],
        "distractors": ["ordinary", "expected", "typical"],
    },
    {
        "name": "whistle",
        "noun": True, "verb": True, "adjective": False,
        "one_syllable": False, "starts_with_vowel": False,
        "has_double_letters": False, "has_silent_letters": True,
        "latin_or_french_origin": False, "related_to_nature": False,
        "related_to_emotions": False, "has_prefix": False, "has_suffix": True,
        "common_word": True, "difficulty": "medium",
        "definition": "to make a clear high-pitched sound by forcing air through the lips",
        "example": "He can whistle his favorite song perfectly.",
        "tip": "The 't' in 'whistle' is silent — same as 'castle', 'listen', 'fasten'.",
        "synonyms": ["tweet", "toot", "pipe"],
        "distractors": ["drum", "clap", "stomp"],
    },
    {
        "name": "curious",
        "noun": False, "verb": False, "adjective": True,
        "one_syllable": False, "starts_with_vowel": False,
        "has_double_letters": False, "has_silent_letters": False,
        "latin_or_french_origin": True, "related_to_nature": False,
        "related_to_emotions": True, "has_prefix": False, "has_suffix": True,
        "common_word": True, "difficulty": "medium",
        "definition": "eager to know or learn something",
        "example": "The curious cat explored every corner of the house.",
        "tip": "From Latin 'curiosus' — the '-ous' suffix means 'full of': full of curiosity.",
        "synonyms": ["inquisitive", "nosy", "eager"],
        "distractors": ["bored", "indifferent", "apathetic"],
    },
    {
        "name": "earth",
        "noun": True, "verb": False, "adjective": False,
        "one_syllable": True, "starts_with_vowel": True,
        "has_double_letters": False, "has_silent_letters": False,
        "latin_or_french_origin": False, "related_to_nature": True,
        "related_to_emotions": False, "has_prefix": False, "has_suffix": False,
        "common_word": True, "difficulty": "easy",
        "definition": "the planet on which we live; soil or ground",
        "example": "The earth orbits the sun once a year.",
        "tip": "'Earth' has two meanings: the planet (capitalize) and soil (lowercase).",
        "synonyms": ["world", "globe", "soil"],
        "distractors": ["sky", "space", "void"],
    },
    {
        "name": "rewrite",
        "noun": True, "verb": True, "adjective": False,
        "one_syllable": False, "starts_with_vowel": False,
        "has_double_letters": False, "has_silent_letters": True,
        "latin_or_french_origin": False, "related_to_nature": False,
        "related_to_emotions": False, "has_prefix": True, "has_suffix": False,
        "common_word": True, "difficulty": "easy",
        "definition": "to write something again in a different way",
        "example": "The teacher asked me to rewrite my essay.",
        "tip": "'Re-' + 'write' — both the prefix 're-' and silent 'w' in one word!",
        "synonyms": ["revise", "edit", "rework"],
        "distractors": ["copy", "delete", "ignore"],
    },
    {
        "name": "happiness",
        "noun": True, "verb": False, "adjective": False,
        "one_syllable": False, "starts_with_vowel": False,
        "has_double_letters": True, "has_silent_letters": False,
        "latin_or_french_origin": False, "related_to_nature": False,
        "related_to_emotions": True, "has_prefix": False, "has_suffix": True,
        "common_word": True, "difficulty": "easy",
        "definition": "the state of being happy",
        "example": "Her face glowed with happiness.",
        "tip": "When adding '-ness' to words ending in 'y', change 'y' to 'i': happy → happiness.",
        "synonyms": ["joy", "bliss", "delight"],
        "distractors": ["sadness", "misery", "sorrow"],
    },
    {
        "name": "foreign",
        "noun": False, "verb": False, "adjective": True,
        "one_syllable": False, "starts_with_vowel": False,
        "has_double_letters": False, "has_silent_letters": True,
        "latin_or_french_origin": True, "related_to_nature": False,
        "related_to_emotions": False, "has_prefix": False, "has_suffix": False,
        "common_word": True, "difficulty": "hard",
        "definition": "of, from, or relating to a country other than one's own",
        "example": "She enjoys learning foreign languages.",
        "tip": "The 'g' in 'foreign' is silent — and 'eig' breaks the 'i before e' rule!",
        "synonyms": ["overseas", "alien", "exotic"],
        "distractors": ["local", "native", "domestic"],
    },
    {
        "name": "search",
        "noun": True, "verb": True, "adjective": False,
        "one_syllable": True, "starts_with_vowel": False,
        "has_double_letters": False, "has_silent_letters": False,
        "latin_or_french_origin": True, "related_to_nature": False,
        "related_to_emotions": False, "has_prefix": False, "has_suffix": False,
        "common_word": True, "difficulty": "easy",
        "definition": "to look carefully in order to find something",
        "example": "Let's search for the missing keys.",
        "tip": "From Old French 'cerchier' — the 'ea' makes an 'er' sound here.",
        "synonyms": ["seek", "hunt", "look for"],
        "distractors": ["hide", "ignore", "forget"],
    },
    {
        "name": "peaceful",
        "noun": False, "verb": False, "adjective": True,
        "one_syllable": False, "starts_with_vowel": False,
        "has_double_letters": False, "has_silent_letters": False,
        "latin_or_french_origin": True, "related_to_nature": False,
        "related_to_emotions": True, "has_prefix": False, "has_suffix": True,
        "common_word": True, "difficulty": "easy",
        "definition": "free from disturbance; calm and tranquil",
        "example": "The peaceful lake reflected the mountains.",
        "tip": "'Peace' + '-ful' — the suffix '-ful' always has one 'l' (not 'full').",
        "synonyms": ["calm", "tranquil", "serene"],
        "distractors": ["chaotic", "noisy", "violent"],
    },
    {
        "name": "thunder",
        "noun": True, "verb": True, "adjective": False,
        "one_syllable": False, "starts_with_vowel": False,
        "has_double_letters": False, "has_silent_letters": False,
        "latin_or_french_origin": False, "related_to_nature": True,
        "related_to_emotions": False, "has_prefix": False, "has_suffix": False,
        "common_word": True, "difficulty": "easy",
        "definition": "a loud rumbling sound heard after lightning",
        "example": "The thunder was so loud it shook the windows.",
        "tip": "'Thunder' comes from the Norse god Thor — 'Thursday' is 'Thor's day'!",
        "synonyms": ["rumble", "boom", "roar"],
        "distractors": ["whisper", "silence", "hum"],
    },
    {
        "name": "photograph",
        "noun": True, "verb": True, "adjective": False,
        "one_syllable": False, "starts_with_vowel": False,
        "has_double_letters": False, "has_silent_letters": False,
        "latin_or_french_origin": True, "related_to_nature": False,
        "related_to_emotions": False, "has_prefix": False, "has_suffix": False,
        "common_word": True, "difficulty": "medium",
        "definition": "a picture made using a camera",
        "example": "She took a photograph of the sunset.",
        "tip": "'Photo' (light) + 'graph' (write) — Greek roots meaning 'writing with light'.",
        "synonyms": ["picture", "snapshot", "image"],
        "distractors": ["painting", "sculpture", "drawing"],
    },
    {
        "name": "awkward",
        "noun": False, "verb": False, "adjective": True,
        "one_syllable": False, "starts_with_vowel": True,
        "has_double_letters": False, "has_silent_letters": False,
        "latin_or_french_origin": False, "related_to_nature": False,
        "related_to_emotions": True, "has_prefix": False, "has_suffix": False,
        "common_word": True, "difficulty": "medium",
        "definition": "causing difficulty; hard to deal with; clumsy",
        "example": "There was an awkward silence after the joke.",
        "tip": "From Old Norse 'afugr' (turned the wrong way) — another Viking word in English!",
        "synonyms": ["clumsy", "uncomfortable", "embarrassing"],
        "distractors": ["graceful", "smooth", "natural"],
    },
    {
        "name": "growth",
        "noun": True, "verb": False, "adjective": False,
        "one_syllable": True, "starts_with_vowel": False,
        "has_double_letters": False, "has_silent_letters": False,
        "latin_or_french_origin": False, "related_to_nature": True,
        "related_to_emotions": False, "has_prefix": False, "has_suffix": True,
        "common_word": True, "difficulty": "easy",
        "definition": "the process of increasing in size or developing",
        "example": "The growth of the plant was impressive.",
        "tip": "'Grow' + '-th' — the suffix '-th' turns verbs into nouns: warm→warmth, grow→growth.",
        "synonyms": ["expansion", "development", "increase"],
        "distractors": ["decline", "shrinkage", "loss"],
    },
    {
        "name": "wreck",
        "noun": True, "verb": True, "adjective": False,
        "one_syllable": True, "starts_with_vowel": False,
        "has_double_letters": False, "has_silent_letters": True,
        "latin_or_french_origin": False, "related_to_nature": False,
        "related_to_emotions": False, "has_prefix": False, "has_suffix": False,
        "common_word": True, "difficulty": "easy",
        "definition": "to destroy or severely damage something",
        "example": "The storm threatened to wreck the old barn.",
        "tip": "The 'w' in 'wreck' is silent — from Old Norse. Compare: wrap, wrist, wrong.",
        "synonyms": ["ruin", "destroy", "demolish"],
        "distractors": ["repair", "build", "protect"],
    },
    {
        "name": "imagination",
        "noun": True, "verb": False, "adjective": False,
        "one_syllable": False, "starts_with_vowel": True,
        "has_double_letters": False, "has_silent_letters": False,
        "latin_or_french_origin": True, "related_to_nature": False,
        "related_to_emotions": True, "has_prefix": False, "has_suffix": True,
        "common_word": True, "difficulty": "medium",
        "definition": "the ability to form new ideas or images in the mind",
        "example": "Children have a wonderful imagination.",
        "tip": "From Latin 'imaginatio' — the '-ation' suffix is one of the most productive in English.",
        "synonyms": ["creativity", "fantasy", "vision"],
        "distractors": ["reality", "logic", "fact"],
    },
    {
        "name": "speak",
        "noun": False, "verb": True, "adjective": False,
        "one_syllable": True, "starts_with_vowel": False,
        "has_double_letters": False, "has_silent_letters": False,
        "latin_or_french_origin": False, "related_to_nature": False,
        "related_to_emotions": False, "has_prefix": False, "has_suffix": False,
        "common_word": True, "difficulty": "easy",
        "definition": "to say words; to talk",
        "example": "She can speak three languages fluently.",
        "tip": "Irregular: speak → spoke → spoken. The vowel change pattern is common in Germanic verbs.",
        "synonyms": ["talk", "say", "utter"],
        "distractors": ["listen", "read", "watch"],
    },
    {
        "name": "delicious",
        "noun": False, "verb": False, "adjective": True,
        "one_syllable": False, "starts_with_vowel": False,
        "has_double_letters": False, "has_silent_letters": False,
        "latin_or_french_origin": True, "related_to_nature": False,
        "related_to_emotions": True, "has_prefix": False, "has_suffix": True,
        "common_word": True, "difficulty": "medium",
        "definition": "highly pleasant to the taste",
        "example": "The homemade soup was absolutely delicious.",
        "tip": "From Latin 'deliciosus' — the '-ious' ending often signals a Latin-origin adjective.",
        "synonyms": ["tasty", "scrumptious", "appetizing"],
        "distractors": ["bland", "bitter", "sour"],
    },
    {
        "name": "rainbow",
        "noun": True, "verb": False, "adjective": False,
        "one_syllable": False, "starts_with_vowel": False,
        "has_double_letters": False, "has_silent_letters": False,
        "latin_or_french_origin": False, "related_to_nature": True,
        "related_to_emotions": False, "has_prefix": False, "has_suffix": False,
        "common_word": True, "difficulty": "easy",
        "definition": "an arc of colors visible in the sky after rain",
        "example": "A beautiful rainbow appeared after the storm.",
        "tip": "'Rain' + 'bow' (arc) — a compound word. The 'bow' here means a curved shape.",
        "synonyms": ["spectrum", "arc", "prism"],
        "distractors": ["cloud", "fog", "haze"],
    },
    {
        "name": "misspell",
        "noun": False, "verb": True, "adjective": False,
        "one_syllable": False, "starts_with_vowel": False,
        "has_double_letters": True, "has_silent_letters": False,
        "latin_or_french_origin": False, "related_to_nature": False,
        "related_to_emotions": False, "has_prefix": True, "has_suffix": False,
        "common_word": True, "difficulty": "medium",
        "definition": "to spell a word incorrectly",
        "example": "Be careful not to misspell your name on the form.",
        "tip": "'Mis-' + 'spell' — the double 's' comes from the prefix ending and root starting with 's'.",
        "synonyms": ["miswrite", "err", "blunder"],
        "distractors": ["correct", "proofread", "fix"],
    },
    {
        "name": "knee",
        "noun": True, "verb": False, "adjective": False,
        "one_syllable": True, "starts_with_vowel": False,
        "has_double_letters": True, "has_silent_letters": True,
        "latin_or_french_origin": False, "related_to_nature": False,
        "related_to_emotions": False, "has_prefix": False, "has_suffix": False,
        "common_word": True, "difficulty": "easy",
        "definition": "the joint connecting the thigh and lower leg",
        "example": "She scraped her knee when she fell.",
        "tip": "The 'k' in 'knee' is silent — in Old English, it was pronounced! Same for 'knot', 'knife'.",
        "synonyms": ["joint", "kneecap", "leg bend"],
        "distractors": ["elbow", "shoulder", "ankle"],
    },
    {
        "name": "dangerous",
        "noun": False, "verb": False, "adjective": True,
        "one_syllable": False, "starts_with_vowel": False,
        "has_double_letters": False, "has_silent_letters": False,
        "latin_or_french_origin": True, "related_to_nature": False,
        "related_to_emotions": True, "has_prefix": False, "has_suffix": True,
        "common_word": True, "difficulty": "medium",
        "definition": "able or likely to cause harm or injury",
        "example": "Swimming in the deep river can be dangerous.",
        "tip": "'Danger' + '-ous' — from Old French 'dangeros'. The '-ous' makes it an adjective.",
        "synonyms": ["hazardous", "risky", "perilous"],
        "distractors": ["safe", "harmless", "secure"],
    },
    {
        "name": "understand",
        "noun": False, "verb": True, "adjective": False,
        "one_syllable": False, "starts_with_vowel": True,
        "has_double_letters": False, "has_silent_letters": False,
        "latin_or_french_origin": False, "related_to_nature": False,
        "related_to_emotions": True, "has_prefix": True, "has_suffix": False,
        "common_word": True, "difficulty": "easy",
        "definition": "to perceive the meaning of something",
        "example": "Do you understand the instructions?",
        "tip": "'Under-' + 'stand' — in Old English, 'understandan' meant 'to stand among' (to grasp).",
        "synonyms": ["comprehend", "grasp", "get"],
        "distractors": ["confuse", "misread", "doubt"],
    },
    {
        "name": "squirrel",
        "noun": True, "verb": False, "adjective": False,
        "one_syllable": False, "starts_with_vowel": False,
        "has_double_letters": True, "has_silent_letters": False,
        "latin_or_french_origin": True, "related_to_nature": True,
        "related_to_emotions": False, "has_prefix": False, "has_suffix": False,
        "common_word": True, "difficulty": "hard",
        "definition": "a small, bushy-tailed rodent that lives in trees",
        "example": "The squirrel buried acorns in the yard.",
        "tip": "From Greek 'skiouros' (shadow-tail). One of the hardest English words to pronounce!",
        "synonyms": ["rodent", "chipmunk", "critter"],
        "distractors": ["rabbit", "fox", "owl"],
    },
    {
        "name": "silent",
        "noun": False, "verb": False, "adjective": True,
        "one_syllable": False, "starts_with_vowel": False,
        "has_double_letters": False, "has_silent_letters": False,
        "latin_or_french_origin": True, "related_to_nature": False,
        "related_to_emotions": True, "has_prefix": False, "has_suffix": False,
        "common_word": True, "difficulty": "easy",
        "definition": "making no sound; completely quiet",
        "example": "The classroom was silent during the test.",
        "tip": "Ironic: 'silent' itself has no silent letters, but it's an anagram of 'listen'!",
        "synonyms": ["quiet", "mute", "hushed"],
        "distractors": ["loud", "noisy", "booming"],
    },
    {
        "name": "autumn",
        "noun": True, "verb": False, "adjective": False,
        "one_syllable": False, "starts_with_vowel": True,
        "has_double_letters": False, "has_silent_letters": True,
        "latin_or_french_origin": True, "related_to_nature": True,
        "related_to_emotions": False, "has_prefix": False, "has_suffix": False,
        "common_word": True, "difficulty": "medium",
        "definition": "the season between summer and winter; fall",
        "example": "The leaves change color in autumn.",
        "tip": "The 'n' in 'autumn' is silent — but it appears in 'autumnal' (aw-TUM-nul)!",
        "synonyms": ["fall", "harvest time", "season"],
        "distractors": ["spring", "summer", "winter"],
    },
    {
        "name": "believe",
        "noun": False, "verb": True, "adjective": False,
        "one_syllable": False, "starts_with_vowel": False,
        "has_double_letters": False, "has_silent_letters": False,
        "latin_or_french_origin": False, "related_to_nature": False,
        "related_to_emotions": True, "has_prefix": False, "has_suffix": False,
        "common_word": True, "difficulty": "easy",
        "definition": "to accept something as true or to have faith in",
        "example": "I believe you can do anything you set your mind to.",
        "tip": "'I before E except after C' works here: beLIEve. But 'weird' breaks the rule!",
        "synonyms": ["trust", "have faith", "accept"],
        "distractors": ["doubt", "deny", "question"],
    },
    {
        "name": "together",
        "noun": False, "verb": False, "adjective": False,
        "one_syllable": False, "starts_with_vowel": False,
        "has_double_letters": False, "has_silent_letters": False,
        "latin_or_french_origin": False, "related_to_nature": False,
        "related_to_emotions": True, "has_prefix": True, "has_suffix": False,
        "common_word": True, "difficulty": "easy",
        "definition": "with or in proximity to another person or people",
        "example": "Let's work together on this project.",
        "tip": "'To-' + 'gather' — literally 'to gather (in one place)'. Old English compound!",
        "synonyms": ["united", "jointly", "collectively"],
        "distractors": ["apart", "alone", "separately"],
    },
    {
        "name": "vocabulary",
        "noun": True, "verb": False, "adjective": False,
        "one_syllable": False, "starts_with_vowel": False,
        "has_double_letters": False, "has_silent_letters": False,
        "latin_or_french_origin": True, "related_to_nature": False,
        "related_to_emotions": False, "has_prefix": False, "has_suffix": True,
        "common_word": True, "difficulty": "hard",
        "definition": "all the words known and used by a particular person",
        "example": "Reading books helps you build your vocabulary.",
        "tip": "From Latin 'vocabulum' (word). The '-ary' suffix means 'related to'.",
        "synonyms": ["lexicon", "glossary", "word list"],
        "distractors": ["grammar", "syntax", "punctuation"],
    },
    {
        "name": "warm",
        "noun": False, "verb": True, "adjective": True,
        "one_syllable": True, "starts_with_vowel": False,
        "has_double_letters": False, "has_silent_letters": False,
        "latin_or_french_origin": False, "related_to_nature": True,
        "related_to_emotions": True, "has_prefix": False, "has_suffix": False,
        "common_word": True, "difficulty": "easy",
        "definition": "of or at a fairly high temperature",
        "example": "Put on a warm jacket before going outside.",
        "tip": "'Warm' works as both a verb ('warm up') and adjective ('warm day').",
        "synonyms": ["toasty", "heated", "mild"],
        "distractors": ["cold", "frozen", "icy"],
    },
    {
        "name": "unfortunately",
        "noun": False, "verb": False, "adjective": False,
        "one_syllable": False, "starts_with_vowel": True,
        "has_double_letters": False, "has_silent_letters": False,
        "latin_or_french_origin": True, "related_to_nature": False,
        "related_to_emotions": True, "has_prefix": True, "has_suffix": True,
        "common_word": True, "difficulty": "hard",
        "definition": "it is regrettable that; used to express sadness about a fact",
        "example": "Unfortunately, the game was cancelled due to rain.",
        "tip": "Four parts: 'un-' + 'fortun(e)' + '-ate' + '-ly'. English can stack many affixes!",
        "synonyms": ["sadly", "regrettably", "unluckily"],
        "distractors": ["happily", "luckily", "thankfully"],
    },
    {
        "name": "apple",
        "noun": True, "verb": False, "adjective": False,
        "one_syllable": False, "starts_with_vowel": True,
        "has_double_letters": True, "has_silent_letters": False,
        "latin_or_french_origin": False, "related_to_nature": True,
        "related_to_emotions": False, "has_prefix": False, "has_suffix": True,
        "common_word": True, "difficulty": "easy",
        "definition": "a round fruit with red, green, or yellow skin",
        "example": "She packed an apple in her lunch bag.",
        "tip": "One of the oldest English words — 'aeppel' in Old English. Double 'p' is key to spelling it.",
        "synonyms": ["fruit", "pip", "orchard fruit"],
        "distractors": ["carrot", "potato", "onion"],
    },
    {
        "name": "language",
        "noun": True, "verb": False, "adjective": False,
        "one_syllable": False, "starts_with_vowel": False,
        "has_double_letters": False, "has_silent_letters": False,
        "latin_or_french_origin": True, "related_to_nature": False,
        "related_to_emotions": False, "has_prefix": False, "has_suffix": False,
        "common_word": True, "difficulty": "medium",
        "definition": "the method of human communication using words",
        "example": "English is a widely spoken language.",
        "tip": "From French 'langage' — the '-age' ending is a French suffix (voyage, courage).",
        "synonyms": ["tongue", "speech", "dialect"],
        "distractors": ["silence", "gesture", "noise"],
    },
    {
        "name": "thought",
        "noun": True, "verb": False, "adjective": False,
        "one_syllable": True, "starts_with_vowel": False,
        "has_double_letters": False, "has_silent_letters": True,
        "latin_or_french_origin": False, "related_to_nature": False,
        "related_to_emotions": True, "has_prefix": False, "has_suffix": False,
        "common_word": True, "difficulty": "medium",
        "definition": "an idea or opinion produced by thinking",
        "example": "She was lost in thought during the lecture.",
        "tip": "The 'ough' in 'thought' makes an 'aw' sound — 'ough' has 7+ pronunciations in English!",
        "synonyms": ["idea", "notion", "reflection"],
        "distractors": ["action", "movement", "reflex"],
    },
    {
        "name": "create",
        "noun": False, "verb": True, "adjective": False,
        "one_syllable": False, "starts_with_vowel": False,
        "has_double_letters": False, "has_silent_letters": False,
        "latin_or_french_origin": True, "related_to_nature": False,
        "related_to_emotions": False, "has_prefix": False, "has_suffix": False,
        "common_word": True, "difficulty": "easy",
        "definition": "to bring something into existence",
        "example": "Artists create beauty from ordinary materials.",
        "tip": "From Latin 'creare'. Related words: creation, creative, creature — all share the root.",
        "synonyms": ["make", "produce", "invent"],
        "distractors": ["destroy", "remove", "erase"],
    },
    {
        "name": "neighbor",
        "noun": True, "verb": False, "adjective": False,
        "one_syllable": False, "starts_with_vowel": False,
        "has_double_letters": False, "has_silent_letters": True,
        "latin_or_french_origin": False, "related_to_nature": False,
        "related_to_emotions": False, "has_prefix": False, "has_suffix": False,
        "common_word": True, "difficulty": "medium",
        "definition": "a person living near or next door to the speaker",
        "example": "Our neighbor has a friendly dog.",
        "tip": "The 'gh' is silent. In British English it's 'neighbour' — American drops the 'u'.",
        "synonyms": ["resident", "local", "fellow citizen"],
        "distractors": ["stranger", "tourist", "foreigner"],
    },
    {
        "name": "enormous",
        "noun": False, "verb": False, "adjective": True,
        "one_syllable": False, "starts_with_vowel": True,
        "has_double_letters": False, "has_silent_letters": False,
        "latin_or_french_origin": True, "related_to_nature": False,
        "related_to_emotions": False, "has_prefix": True, "has_suffix": True,
        "common_word": True, "difficulty": "medium",
        "definition": "very large in size, quantity, or extent",
        "example": "The enormous whale swam beneath the boat.",
        "tip": "'E-' (out of) + 'norm' (standard) + '-ous' — literally 'out of the normal' in Latin.",
        "synonyms": ["huge", "massive", "gigantic"],
        "distractors": ["tiny", "small", "miniature"],
    },
    {
        "name": "wrist",
        "noun": True, "verb": False, "adjective": False,
        "one_syllable": True, "starts_with_vowel": False,
        "has_double_letters": False, "has_silent_letters": True,
        "latin_or_french_origin": False, "related_to_nature": False,
        "related_to_emotions": False, "has_prefix": False, "has_suffix": False,
        "common_word": True, "difficulty": "easy",
        "definition": "the joint connecting the hand to the forearm",
        "example": "She wore a bracelet on her wrist.",
        "tip": "The 'w' in 'wrist' is silent — from Old English 'wrist' (a turning joint).",
        "synonyms": ["forearm joint", "hand joint", "carpus"],
        "distractors": ["ankle", "elbow", "knuckle"],
    },
    {
        "name": "travel",
        "noun": True, "verb": True, "adjective": False,
        "one_syllable": False, "starts_with_vowel": False,
        "has_double_letters": False, "has_silent_letters": False,
        "latin_or_french_origin": True, "related_to_nature": False,
        "related_to_emotions": False, "has_prefix": False, "has_suffix": False,
        "common_word": True, "difficulty": "easy",
        "definition": "to make a journey from one place to another",
        "example": "They love to travel around the world.",
        "tip": "From French 'travail' (hard work) — traveling used to be very difficult!",
        "synonyms": ["journey", "voyage", "trip"],
        "distractors": ["stay", "remain", "settle"],
    },
    {
        "name": "grateful",
        "noun": False, "verb": False, "adjective": True,
        "one_syllable": False, "starts_with_vowel": False,
        "has_double_letters": False, "has_silent_letters": False,
        "latin_or_french_origin": True, "related_to_nature": False,
        "related_to_emotions": True, "has_prefix": False, "has_suffix": True,
        "common_word": True, "difficulty": "easy",
        "definition": "feeling or showing thanks and appreciation",
        "example": "I am grateful for your help.",
        "tip": "It's 'grate-ful' not 'great-ful' — a very common spelling mistake!",
        "synonyms": ["thankful", "appreciative", "obliged"],
        "distractors": ["ungrateful", "resentful", "bitter"],
    },
    {
        "name": "midnight",
        "noun": True, "verb": False, "adjective": False,
        "one_syllable": False, "starts_with_vowel": False,
        "has_double_letters": False, "has_silent_letters": True,
        "latin_or_french_origin": False, "related_to_nature": True,
        "related_to_emotions": False, "has_prefix": False, "has_suffix": False,
        "common_word": True, "difficulty": "easy",
        "definition": "twelve o'clock at night",
        "example": "The clock struck midnight on New Year's Eve.",
        "tip": "'Mid' + 'night' — a compound word. The 'gh' in 'night' is silent.",
        "synonyms": ["twelve o'clock", "dead of night", "witching hour"],
        "distractors": ["noon", "dawn", "dusk"],
    },
    {
        "name": "listen",
        "noun": False, "verb": True, "adjective": False,
        "one_syllable": False, "starts_with_vowel": False,
        "has_double_letters": False, "has_silent_letters": True,
        "latin_or_french_origin": False, "related_to_nature": False,
        "related_to_emotions": False, "has_prefix": False, "has_suffix": False,
        "common_word": True, "difficulty": "easy",
        "definition": "to give attention to sound or action",
        "example": "Please listen carefully to the instructions.",
        "tip": "The 't' in 'listen' is silent — and 'listen' is an anagram of 'silent'!",
        "synonyms": ["hear", "pay attention", "tune in"],
        "distractors": ["ignore", "shout", "speak"],
    },
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


# --- Game Functions ---


def clear_screen():
    print("\n" + "=" * 60)


def display_header(difficulty=None):
    print("=" * 60)
    print("      *** ENGLISH WORD ADVENTURE ***")
    print("=" * 60)
    if difficulty:
        word_pool = get_word_pool(difficulty)
        label = "all" if difficulty == "all" else difficulty
        print(f"  Difficulty: {label.upper()} ({len(word_pool)} words)")
    print("  Ask up to 5 yes/no questions, then take your guess.")
    print("  Learn about word origins, spelling, and grammar!")
    print("=" * 60)


def get_word_pool(difficulty):
    if difficulty == "all":
        return list(WORDS)
    return [w for w in WORDS if w["difficulty"] == difficulty]


def choose_difficulty():
    easy_count = len([w for w in WORDS if w["difficulty"] == "easy"])
    med_count = len([w for w in WORDS if w["difficulty"] == "medium"])
    hard_count = len([w for w in WORDS if w["difficulty"] == "hard"])

    print("\n  Choose your difficulty level:")
    print(f"  [1] Easy   ({easy_count} words) — common, short words")
    print(f"  [2] Medium ({med_count} words) — longer words with tricky spelling")
    print(f"  [3] Hard   ({hard_count} words) — challenging vocabulary")
    print(f"  [4] All    ({len(WORDS)} words) — the full word list")

    while True:
        try:
            choice = int(input("  > ").strip())
            if choice == 1:
                return "easy"
            elif choice == 2:
                return "medium"
            elif choice == 3:
                return "hard"
            elif choice == 4:
                return "all"
            else:
                print("  Please enter 1, 2, 3, or 4.")
        except ValueError:
            print("  Please enter a valid number.")


def display_available_questions(asked_indices):
    print("\nAvailable questions to ask:")
    for i, (question, _) in enumerate(QUESTIONS):
        if i not in asked_indices:
            print(f"  [{i + 1:2}] {question}")


def get_yes_no(prompt):
    while True:
        answer = input(prompt).strip().lower()
        if answer in ("yes", "y"):
            return True
        elif answer in ("no", "n"):
            return False
        else:
            print("      Please answer 'yes' or 'no'.")


def filter_words(words, attribute, value):
    return [w for w in words if w[attribute] == value]


def play_game(word, word_pool):
    questions_left = MAX_QUESTIONS
    asked_indices = set()
    possible_words = list(word_pool)

    print(f"\n  I'm thinking of a word... ({len(possible_words)} possibilities)")

    while questions_left > 0:
        print(f"\n  Questions remaining: {questions_left}")
        print(f"  Remaining possible words: {len(possible_words)}")
        display_available_questions(asked_indices)

        remaining_q_indices = [i for i in range(len(QUESTIONS)) if i not in asked_indices]
        if not remaining_q_indices:
            print("\n  You've asked all available questions!")
            break

        print(f"\n  Enter a question number (1-{len(QUESTIONS)}) or 0 to make your guess now:")

        while True:
            try:
                choice = int(input("  > ").strip())
                if choice == 0:
                    questions_left = 0
                    break
                elif 1 <= choice <= len(QUESTIONS) and (choice - 1) not in asked_indices:
                    break
                elif 1 <= choice <= len(QUESTIONS) and (choice - 1) in asked_indices:
                    print("  You already asked that question! Pick another.")
                else:
                    print(f"  Please enter a number between 1 and {len(QUESTIONS)}, or 0 to guess.")
            except ValueError:
                print("  Please enter a valid number.")

        if questions_left == 0:
            break

        q_index = choice - 1
        question_text, attribute = QUESTIONS[q_index]
        asked_indices.add(q_index)

        print(f"\n  Q: {question_text}")
        answer = word[attribute]
        print(f"  A: {'YES' if answer else 'NO'}")

        possible_words = filter_words(possible_words, attribute, answer)
        questions_left -= 1

        if len(possible_words) == 1:
            print(f"\n  [Only 1 word left matching your clues!]")
            break

    questions_used = MAX_QUESTIONS - questions_left

    print("\n" + "-" * 60)
    print("  TIME TO GUESS!")
    print("-" * 60)

    print(f"\n  Bonus hints:")
    print(f"    - The word has {len(word['name'])} letters")
    print(f"    - It starts with '{word['name'][0].upper()}'")

    if len(possible_words) <= 10 and len(possible_words) > 1:
        print(f"\n  Based on your questions, it could be one of these:")
        for w in possible_words:
            print(f"    - {w['name']}")

    print("\n  What word am I thinking of?")
    guess = input("  Your guess: ").strip()

    if guess.lower() == word["name"].lower():
        print("\n  *** CORRECT! ***")
        print(f"  You guessed it! The word was: {word['name']}")
        print(f"  You used {questions_used} of {MAX_QUESTIONS} questions.")
        return True, questions_used
    else:
        print(f"\n  Not quite! The word was: {word['name']}")
        print(f"  You guessed: {guess}")
        print(f"  You used {questions_used} of {MAX_QUESTIONS} questions.")
        return False, questions_used


def show_word_facts(word):
    print("\n  --- LEARN ABOUT THIS WORD ---")
    print(f"\n  Word: {word['name']}")
    print(f"  Definition: {word['definition']}")
    print(f"  Example: {word['example']}")
    print(f"  Difficulty: {word['difficulty']}")

    traits = []
    if word["noun"]:
        traits.append("noun")
    if word["verb"]:
        traits.append("verb")
    if word["adjective"]:
        traits.append("adjective")
    if not any([word["noun"], word["verb"], word["adjective"]]):
        traits.append("adverb")
    if word["one_syllable"]:
        traits.append("one syllable")
    if word["starts_with_vowel"]:
        traits.append("starts with a vowel")
    if word["has_double_letters"]:
        traits.append("has double letters")
    if word["has_silent_letters"]:
        traits.append("has silent letters")
    if word["latin_or_french_origin"]:
        traits.append("Latin/French origin")
    else:
        traits.append("Germanic origin")
    if word["has_prefix"]:
        traits.append("has a prefix")
    if word["has_suffix"]:
        traits.append("has a suffix")

    print(f"  Traits: {', '.join(traits)}")
    print(f"\n  Learning tip: {word['tip']}")


def show_session_review(words_seen):
    print("\n" + "=" * 60)
    print("      VOCABULARY REVIEW — Words You Learned Today")
    print("=" * 60)

    for result, word in words_seen:
        icon = "+" if result else "-"
        print(f"\n  [{icon}] {word['name']} ({word['difficulty']})")
        print(f"      {word['definition']}")
        print(f"      Tip: {word['tip']}")

    guessed_right = [w["name"] for r, w in words_seen if r]
    missed = [w["name"] for r, w in words_seen if not r]

    print("\n" + "-" * 60)
    if guessed_right:
        print(f"  Guessed correctly: {', '.join(guessed_right)}")
    if missed:
        print(f"  Words to review:  {', '.join(missed)}")
    print("=" * 60)


def main():
    display_header()
    difficulty = choose_difficulty()
    word_pool = get_word_pool(difficulty)

    clear_screen()
    display_header(difficulty)

    wins = 0
    rounds = 0
    streak = 0
    best_streak = 0
    words_seen = []

    while True:
        word = random.choice(word_pool)
        rounds += 1

        won, questions_used = play_game(word, word_pool)
        show_word_facts(word)
        words_seen.append((won, word))

        if won:
            wins += 1
            streak += 1
            if streak > best_streak:
                best_streak = streak
            if streak == 3:
                print("\n  *** 3 in a row! You're on fire! ***")
            elif streak == 5:
                print("\n  *** 5 in a row! Word master! ***")
            elif streak >= 7:
                print(f"\n  *** {streak} in a row! Unstoppable! ***")
            if questions_used <= 2:
                print("  Speed bonus — guessed with 2 or fewer questions!")
        else:
            if streak >= 3:
                print(f"\n  Streak ended at {streak}. Great run!")
            streak = 0

        print(f"\n  Score: {wins} wins out of {rounds} round(s)")
        if streak >= 2:
            print(f"  Current streak: {streak} | Best streak: {best_streak}")
        print()

        play_again = get_yes_no("  Play again? (yes/no): ")
        if not play_again:
            show_session_review(words_seen)
            print(f"\n  Thanks for playing English Word Adventure!")
            print(f"  Final score: {wins} wins out of {rounds} round(s)")
            if best_streak >= 2:
                print(f"  Best win streak: {best_streak}")
            print("  Keep learning new words every day!")
            print("=" * 60)
            break

        clear_screen()
        display_header(difficulty)


if __name__ == "__main__":
    main()
