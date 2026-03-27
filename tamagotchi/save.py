"""Save and load pet state to JSON."""

import json
import os

from tamagotchi.config import SAVE_FILE
from tamagotchi.pet import Pet


def save_game(pet, filepath=None):
    filepath = filepath or SAVE_FILE
    with open(filepath, "w") as f:
        json.dump(pet.to_dict(), f, indent=2)


def load_game(filepath=None):
    filepath = filepath or SAVE_FILE
    if not os.path.exists(filepath):
        return None
    try:
        with open(filepath) as f:
            data = json.load(f)
        return Pet.from_dict(data)
    except (json.JSONDecodeError, KeyError):
        return None


def delete_save(filepath=None):
    filepath = filepath or SAVE_FILE
    if os.path.exists(filepath):
        os.remove(filepath)
