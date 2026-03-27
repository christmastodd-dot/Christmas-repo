"""Pet class with stat management, tick logic, life stages, and tricks."""

import random
import time

from tamagotchi.config import (
    DECAY_RATES, HEALTH_DECAY_PER_CRITICAL, CRITICAL_THRESHOLD,
    STAT_MIN, STAT_MAX, STARTING_STATS, FOODS,
    PLAY_HAPPINESS, PLAY_ENERGY_COST,
    SLEEP_ENERGY_GAIN, SLEEP_TICKS, SLEEP_DECAY_MULTIPLIER,
    CLEAN_BOOST,
    STAGES, STAGE_THRESHOLDS, EVOLUTION_HEALTH_MIN,
    STAGE_DECAY_MULTIPLIER, STAGE_ACTIONS,
    TEEN_REBELLION_CHANCE, REBELLION_MESSAGES,
    TRICKS, TRICK_HAPPINESS_COST, TRICK_FAIL_CHANCE,
    MINIGAME_ENERGY_COST, MINIGAME_COOLDOWN_TICKS,
    BALL_PLAY_BONUS,
)
from tamagotchi.inventory import Inventory


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

        # Life stages
        self.stage = "egg"
        self.stage_ticks = 0
        self.tricks_learned = []

        # Evolution event flag — checked and cleared by the game loop
        self.just_evolved = False
        self.evolved_from = None

        # Economy
        self.coins = 0
        self.inventory = Inventory()
        # Cooldowns: {game_index: ticks_remaining}
        self.minigame_cooldowns = {}

    def _clamp(self, value):
        return max(STAT_MIN, min(STAT_MAX, value))

    # ── Stage helpers ────────────────────────────────────────────────

    def can_do(self, action):
        return action in STAGE_ACTIONS.get(self.stage, [])

    def check_rebellion(self):
        if self.stage == "teen" and random.random() < TEEN_REBELLION_CHANCE:
            msg = random.choice(REBELLION_MESSAGES).format(name=self.name)
            return msg
        return None

    def next_stage(self):
        idx = STAGES.index(self.stage)
        if idx + 1 < len(STAGES):
            return STAGES[idx + 1]
        return None

    def _try_evolve(self):
        threshold = STAGE_THRESHOLDS.get(self.stage)
        if threshold is None:
            return
        if self.stage_ticks >= threshold:
            if self.stats["health"] > EVOLUTION_HEALTH_MIN:
                old_stage = self.stage
                new_stage = self.next_stage()
                if new_stage:
                    self.evolved_from = old_stage
                    self.stage = new_stage
                    self.stage_ticks = 0
                    self.just_evolved = True

    # ── Mood ─────────────────────────────────────────────────────────

    def get_mood(self):
        if not self.alive:
            return "dead"
        if self.stage == "egg":
            return "egg"
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

    # ── Tick ─────────────────────────────────────────────────────────

    def tick(self):
        if not self.alive:
            return

        self.ticks_alive += 1
        self.stage_ticks += 1

        # Egg stage — no stat decay, just wait to hatch
        if self.stage == "egg":
            self._try_evolve()
            return

        # Stage-based decay multiplier
        stage_mult = STAGE_DECAY_MULTIPLIER.get(self.stage, 1.0)
        sleep_mult = SLEEP_DECAY_MULTIPLIER if self.sleeping else 1.0
        mult = stage_mult * sleep_mult

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

        # Tick down minigame cooldowns
        for key in list(self.minigame_cooldowns):
            self.minigame_cooldowns[key] -= 1
            if self.minigame_cooldowns[key] <= 0:
                del self.minigame_cooldowns[key]

        # Check evolution
        self._try_evolve()

    # ── Actions ──────────────────────────────────────────────────────

    def feed(self, food_index):
        if not self.alive or self.sleeping or not self.can_do("feed"):
            return None
        if food_index < 0 or food_index >= len(FOODS):
            return None
        name, hunger_boost, happiness_boost = FOODS[food_index]
        self.stats["hunger"] = self._clamp(self.stats["hunger"] + hunger_boost)
        self.stats["happiness"] = self._clamp(self.stats["happiness"] + happiness_boost)
        return name

    def play(self):
        if not self.alive or self.sleeping or not self.can_do("play"):
            return False
        bonus = 0
        if self.inventory.use_ball():
            bonus = BALL_PLAY_BONUS
        self.stats["happiness"] = self._clamp(
            self.stats["happiness"] + PLAY_HAPPINESS + bonus
        )
        self.stats["energy"] = self._clamp(self.stats["energy"] - PLAY_ENERGY_COST)
        return True

    def sleep(self):
        if not self.alive or self.sleeping or not self.can_do("sleep"):
            return False
        self.sleeping = True
        self.sleep_ticks_left = SLEEP_TICKS
        self.stats["energy"] = self._clamp(self.stats["energy"] + SLEEP_ENERGY_GAIN)
        return True

    def clean(self):
        if not self.alive or self.sleeping or not self.can_do("clean"):
            return False
        self.stats["cleanliness"] = self._clamp(self.stats["cleanliness"] + CLEAN_BOOST)
        return True

    def teach_trick(self, trick_index):
        if not self.alive or self.sleeping or not self.can_do("trick"):
            return None, None
        if trick_index < 0 or trick_index >= len(TRICKS):
            return None, None
        trick = TRICKS[trick_index]
        if trick in self.tricks_learned:
            return trick, "already_known"

        self.stats["happiness"] = self._clamp(
            self.stats["happiness"] - TRICK_HAPPINESS_COST
        )

        if random.random() < TRICK_FAIL_CHANCE:
            return trick, "failed"

        self.tricks_learned.append(trick)
        return trick, "success"

    # ── Mini-games ───────────────────────────────────────────────────

    def can_play_minigame(self, game_index):
        if not self.alive or self.sleeping or not self.can_do("minigame"):
            return False, "Can't play right now."
        if game_index in self.minigame_cooldowns:
            ticks = self.minigame_cooldowns[game_index]
            return False, f"On cooldown! {ticks} ticks remaining."
        if self.stats["energy"] < MINIGAME_ENERGY_COST:
            return False, "Not enough energy!"
        return True, ""

    def start_minigame(self, game_index):
        self.stats["energy"] = self._clamp(
            self.stats["energy"] - MINIGAME_ENERGY_COST
        )
        self.minigame_cooldowns[game_index] = MINIGAME_COOLDOWN_TICKS

    def apply_minigame_reward(self, coins, happiness_delta):
        self.coins += coins
        if happiness_delta:
            self.stats["happiness"] = self._clamp(
                self.stats["happiness"] + happiness_delta
            )

    # ── Inventory usage ──────────────────────────────────────────────

    def use_food_item(self, name, hunger_boost, happiness_boost):
        if not self.alive or self.sleeping:
            return False
        if not self.inventory.use_consumable(name):
            return False
        self.stats["hunger"] = self._clamp(self.stats["hunger"] + hunger_boost)
        self.stats["happiness"] = self._clamp(self.stats["happiness"] + happiness_boost)
        return True

    def use_medicine_item(self, name, health_boost):
        if not self.alive or self.sleeping:
            return False
        if not self.inventory.use_consumable(name):
            return False
        self.stats["health"] = self._clamp(self.stats["health"] + health_boost)
        return True

    # ── Serialization ────────────────────────────────────────────────

    def to_dict(self):
        return {
            "name": self.name,
            "species": self.species,
            "alive": self.alive,
            "stats": self.stats,
            "sleeping": self.sleeping,
            "sleep_ticks_left": self.sleep_ticks_left,
            "ticks_alive": self.ticks_alive,
            "stage": self.stage,
            "stage_ticks": self.stage_ticks,
            "tricks_learned": self.tricks_learned,
            "coins": self.coins,
            "inventory": self.inventory.to_dict(),
            "minigame_cooldowns": self.minigame_cooldowns,
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
        pet.stage = data.get("stage", "child")
        pet.stage_ticks = data.get("stage_ticks", 0)
        pet.tricks_learned = data.get("tricks_learned", [])
        pet.coins = data.get("coins", 0)
        if "inventory" in data:
            pet.inventory = Inventory.from_dict(data["inventory"])
        pet.minigame_cooldowns = {
            int(k): v for k, v in data.get("minigame_cooldowns", {}).items()
        }
        pet.last_tick_time = time.time()

        # Apply offline decay
        elapsed = time.time() - data.get("save_time", time.time())
        from tamagotchi.config import TICK_INTERVAL
        missed_ticks = int(elapsed // TICK_INTERVAL)
        for _ in range(min(missed_ticks, 200)):
            pet.tick()

        return pet
