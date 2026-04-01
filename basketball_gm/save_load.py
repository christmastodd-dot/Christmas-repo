"""Save and load game state to/from JSON files."""

from __future__ import annotations

import json
import os
from typing import Optional

from basketball_gm.league import League


SAVE_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "saves")
SAVE_VERSION = 1


def ensure_save_dir() -> None:
    os.makedirs(SAVE_DIR, exist_ok=True)


def save_game(league: League, slot: int = 1, season_data: Optional[dict] = None) -> str:
    """Save the full game state to a JSON file. Returns the filepath."""
    ensure_save_dir()
    filepath = os.path.join(SAVE_DIR, f"save_{slot}.json")

    data = {
        "version": SAVE_VERSION,
        "league": league.to_dict(),
    }
    if season_data:
        data["season_data"] = season_data

    with open(filepath, "w") as f:
        json.dump(data, f, separators=(",", ":"))

    return filepath


def load_game(slot: int = 1) -> Optional[tuple[League, Optional[dict]]]:
    """Load game state from a JSON file. Returns (League, season_data) or None."""
    filepath = os.path.join(SAVE_DIR, f"save_{slot}.json")

    if not os.path.exists(filepath):
        return None

    with open(filepath, "r") as f:
        data = json.load(f)

    league = League.from_dict(data["league"])
    season_data = data.get("season_data")
    return league, season_data


def list_saves() -> list[dict]:
    """List available save files with metadata."""
    ensure_save_dir()
    saves = []

    for filename in sorted(os.listdir(SAVE_DIR)):
        if not filename.startswith("save_") or not filename.endswith(".json"):
            continue
        slot = int(filename.replace("save_", "").replace(".json", ""))
        filepath = os.path.join(SAVE_DIR, filename)

        try:
            with open(filepath, "r") as f:
                data = json.load(f)
            league_data = data.get("league", {})
            season = league_data.get("season", "?")
            user_team_id = league_data.get("user_team_id", 0)
            phase = league_data.get("phase", "?")
            # Find user team name
            team_name = "Unknown"
            for t in league_data.get("teams", []):
                if t.get("id") == user_team_id:
                    team_name = f"{t['city']} {t['name']}"
                    break
            size_mb = os.path.getsize(filepath) / (1024 * 1024)
            saves.append({
                "slot": slot,
                "season": season,
                "team": team_name,
                "phase": phase,
                "size_mb": size_mb,
            })
        except (json.JSONDecodeError, KeyError):
            saves.append({"slot": slot, "season": "?", "team": "Corrupted", "phase": "?", "size_mb": 0})

    return saves


def delete_save(slot: int) -> bool:
    """Delete a save file."""
    filepath = os.path.join(SAVE_DIR, f"save_{slot}.json")
    if os.path.exists(filepath):
        os.remove(filepath)
        return True
    return False
