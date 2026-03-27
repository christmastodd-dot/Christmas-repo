"""Pet class with stat management and tick logic."""

import time
from tamagotchi.config import (
    DECAY_RATES, HEALTH_DECAY_PER_CRITICAL, CRITICAL_THRESHOLD,
    STAT_MIN, STAT_MAX, STARTING_STATS, FOODS,
    PLAY_HAPPINESS, PLAY_ENERGY_COST,
    SLEEP_ENERGY_GAIN, SLEEP_TICKS, SLEEP_DECAY_MULTIPLIER,
    CLEAN_BOOST,
)


class Pet:
    def __init__(self, name):
        self.name = name
        self.species = "Stitch"
        self.alive = True
        self.stats = dict(STARTING_STATS)
        self.sleeping = False
        self.sleep_ticks_left = 0
        self.ticks_alive = 0
        self.last_tick_time = time.time()

    def _clamp(self, value):
        return max(STAT_MIN, min(STAT_MAX, value))

    def get_mood(self):
        if not self.alive:
            return "dead"
        if self.sleeping:
            return "sleeping"
        if self.stats["health"] < 30:
            return "sick"
        avg = (self.stats["hunger"] + self.stats["happiness"]
               + self.stats["energy"] + self.stats["cleanliness"]) / 4
        if avg >= 65:
            return "happy"
        if avg >= 35:
            return "neutral"
        return "sad"

    def tick(self):
        if not self.alive:
            return

        self.ticks_alive += 1

        # Determine decay multiplier
        mult = SLEEP_DECAY_MULTIPLIER if self.sleeping else 1.0

        # Decay stats
        for stat, rate in DECAY_RATES.items():
            self.stats[stat] = self._clamp(
                self.stats[stat] - rate * mult
            )

        # Health decay for critically low stats
        critical_count = sum(
            1 for s in ["hunger", "happiness", "energy", "cleanliness"]
            if self.stats[s] < CRITICAL_THRESHOLD
        )
        if critical_count > 0:
            self.stats["health"] = self._clamp(
                self.stats["health"] - HEALTH_DECAY_PER_CRITICAL * critical_count
            )

        # Handle sleep countdown
        if self.sleeping:
            self.sleep_ticks_left -= 1
            if self.sleep_ticks_left <= 0:
                self.sleeping = False
                self.sleep_ticks_left = 0

        # Check death
        if self.stats["health"] <= 0:
            self.alive = False

    def feed(self, food_index):
        if not self.alive or self.sleeping:
            return None
        if food_index < 0 or food_index >= len(FOODS):
            return None
        name, hunger_boost, happiness_boost = FOODS[food_index]
        self.stats["hunger"] = self._clamp(self.stats["hunger"] + hunger_boost)
        self.stats["happiness"] = self._clamp(self.stats["happiness"] + happiness_boost)
        return name

    def play(self):
        if not self.alive or self.sleeping:
            return False
        self.stats["happiness"] = self._clamp(self.stats["happiness"] + PLAY_HAPPINESS)
        self.stats["energy"] = self._clamp(self.stats["energy"] - PLAY_ENERGY_COST)
        return True

    def sleep(self):
        if not self.alive or self.sleeping:
            return False
        self.sleeping = True
        self.sleep_ticks_left = SLEEP_TICKS
        self.stats["energy"] = self._clamp(self.stats["energy"] + SLEEP_ENERGY_GAIN)
        return True

    def clean(self):
        if not self.alive or self.sleeping:
            return False
        self.stats["cleanliness"] = self._clamp(self.stats["cleanliness"] + CLEAN_BOOST)
        return True

    def to_dict(self):
        return {
            "name": self.name,
            "species": self.species,
            "alive": self.alive,
            "stats": self.stats,
            "sleeping": self.sleeping,
            "sleep_ticks_left": self.sleep_ticks_left,
            "ticks_alive": self.ticks_alive,
            "save_time": time.time(),
        }

    @classmethod
    def from_dict(cls, data):
        pet = cls(data["name"])
        pet.species = data.get("species", "Stitch")
        pet.alive = data["alive"]
        pet.stats = data["stats"]
        pet.sleeping = data["sleeping"]
        pet.sleep_ticks_left = data["sleep_ticks_left"]
        pet.ticks_alive = data["ticks_alive"]
        pet.last_tick_time = time.time()

        # Apply offline decay
        elapsed = time.time() - data.get("save_time", time.time())
        from tamagotchi.config import TICK_INTERVAL
        missed_ticks = int(elapsed // TICK_INTERVAL)
        for _ in range(min(missed_ticks, 200)):  # cap to prevent long freeze
            pet.tick()

        return pet
