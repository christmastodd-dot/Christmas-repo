"""Pet class — evolves by answering math problems, needs care to stay happy."""

import random
import time

from tamagotchi.config import (
    STAGES, STAGE_THRESHOLDS,
    STAT_MAX, STAT_START, CARE_AMOUNTS, DECAY_PER_TICK, CARE_COOLDOWN,
    COIN_DROP_CHANCE, TICK_INTERVAL, OFFLINE_DECAY_FLOOR,
    SHOP_ITEMS, SLEEP_DURATION, SLEEP_ENERGY_PER_TICK, TRICKS,
)


class Pet:
    def __init__(self, name):
        self.name = name
        self.species = "Stitch"
        self.alive = True

        # Life stages
        self.stage = "egg"
        self.stage_correct = 0  # correct answers at current stage

        # Lifetime stats
        self.total_correct = 0
        self.total_wrong = 0
        self.streak = 0          # current streak of correct answers
        self.best_streak = 0

        # Care stats (only active after hatching)
        self.hunger = STAT_START
        self.happiness = STAT_START
        self.hygiene = STAT_START
        self.energy = STAT_START
        self.last_care = {}  # action -> timestamp of last use

        # Sleep state
        self.sleeping = False
        self.sleep_until = 0

        # Economy
        self.coins = 0
        self.inventory = {}  # item_id -> quantity

        # Tricks (endgame)
        self.tricks_learned = []  # list of trick IDs
        self.just_learned_trick = None  # set when a new trick is learned

        # Evolution event flag
        self.just_evolved = False
        self.evolved_from = None

    def get_mood(self):
        if self.stage == "egg":
            return "egg"
        if self.sleeping:
            return "sleeping"
        # Check for specific unmet needs (threshold: below 35)
        if self.hunger < 35:
            return "hungry"
        if self.energy < 35:
            return "sleepy"
        if self.happiness < 35:
            return "bored"
        # General mood based on average
        avg = self.stat_average()
        if avg >= 70:
            return "happy"
        return "neutral"

    def stat_average(self):
        return (self.hunger + self.happiness + self.hygiene + self.energy) / 4

    def care(self, action):
        """Perform a care action. Returns (success, message)."""
        if self.stage == "egg":
            return False, "The egg doesn't need that yet!"

        if action in ("feed", "play"):
            return False, "Use an item from your inventory!"

        if action not in CARE_AMOUNTS:
            return False, "Unknown action."

        # Check sleeping state before cooldown
        if action == "sleep" and self.sleeping:
            return False, f"{self.name} is already sleeping!"

        now = time.time()
        last = self.last_care.get(action, 0)
        remaining = CARE_COOLDOWN - (now - last)
        if remaining > 0:
            return False, f"Wait {int(remaining + 1)}s before doing that again."

        # Special handling for sleep
        if action == "sleep":
            self.sleeping = True
            self.sleep_until = now + SLEEP_DURATION
            self.last_care[action] = now
            return True, f"{self.name} curls up for a nap... Zzz"

        amounts = CARE_AMOUNTS[action]
        for stat, amount in amounts.items():
            old = getattr(self, stat)
            setattr(self, stat, min(STAT_MAX, old + amount))

        self.last_care[action] = now

        messages = {
            "clean": f"{self.name} is squeaky clean!",
        }
        return True, messages.get(action, "Done!")

    def tick(self):
        """Decay stats over time. Called periodically."""
        if self.stage == "egg":
            return

        # Check if sleep is over
        if self.sleeping and time.time() >= self.sleep_until:
            self.sleeping = False

        if self.sleeping:
            # Recover energy while sleeping
            self.energy = min(STAT_MAX, self.energy + SLEEP_ENERGY_PER_TICK)
            # Still decay other stats (but not energy)
            for stat, amount in DECAY_PER_TICK.items():
                if stat == "energy":
                    continue
                old = getattr(self, stat)
                setattr(self, stat, max(0, old - amount))
        else:
            for stat, amount in DECAY_PER_TICK.items():
                old = getattr(self, stat)
                setattr(self, stat, max(0, old - amount))

    def next_stage(self):
        idx = STAGES.index(self.stage)
        if idx + 1 < len(STAGES):
            return STAGES[idx + 1]
        return None

    def _try_evolve(self):
        threshold = STAGE_THRESHOLDS.get(self.stage)
        if threshold is None:
            return
        if self.stage_correct >= threshold:
            new_stage = self.next_stage()
            if new_stage:
                self.evolved_from = self.stage
                self.stage = new_stage
                self.stage_correct = 0
                self.just_evolved = True
                # Boost stats on evolution
                self.hunger = STAT_START
                self.happiness = STAT_MAX
                self.hygiene = STAT_START
                self.energy = STAT_START

    def answer_correct(self):
        self.total_correct += 1
        self.stage_correct += 1
        self.streak += 1
        if self.streak > self.best_streak:
            self.best_streak = self.streak
        # Answering correctly gives a small happiness boost
        self.happiness = min(STAT_MAX, self.happiness + 5)
        # Random coin drop (~1 per 10 questions)
        earned_coin = random.random() < COIN_DROP_CHANCE
        if earned_coin:
            self.coins += 1
        self._try_evolve()
        self._check_tricks()
        return earned_coin

    def _check_tricks(self):
        """Check if a new trick is unlocked at the final stage."""
        self.just_learned_trick = None
        if STAGE_THRESHOLDS.get(self.stage) is not None:
            return  # not at final stage
        for trick in TRICKS:
            if trick["id"] not in self.tricks_learned and self.stage_correct >= trick["unlock_at"]:
                self.tricks_learned.append(trick["id"])
                self.just_learned_trick = trick["id"]

    def answer_wrong(self):
        self.total_wrong += 1
        self.streak = 0

    def buy_item(self, item_id):
        """Buy an item from the shop. Returns (success, message)."""
        if item_id not in SHOP_ITEMS:
            return False, "Item not found."
        item = SHOP_ITEMS[item_id]
        if self.coins < item["cost"]:
            return False, f"Not enough coins! Need {item['cost']}, have {self.coins}."
        self.coins -= item["cost"]
        self.inventory[item_id] = self.inventory.get(item_id, 0) + 1
        return True, f"Bought {item['label']}! ({self.coins} coins left)"

    def use_item(self, item_id):
        """Use an item from inventory. Returns (success, message)."""
        if self.stage == "egg":
            return False, "The egg can't use items yet!"
        if self.inventory.get(item_id, 0) <= 0:
            return False, "You don't have that item!"
        item = SHOP_ITEMS.get(item_id)
        if not item:
            return False, "Item not found."
        self.inventory[item_id] -= 1
        if self.inventory[item_id] <= 0:
            del self.inventory[item_id]
        for stat, amount in item["effects"].items():
            old = getattr(self, stat)
            setattr(self, stat, min(STAT_MAX, old + amount))
        return True, f"{self.name} used {item['label']}!"

    def progress_pct(self):
        threshold = STAGE_THRESHOLDS.get(self.stage)
        if threshold is None:
            return 100
        return int((self.stage_correct / threshold) * 100)

    def stats_dict(self):
        return {
            "hunger": self.hunger,
            "happiness": self.happiness,
            "hygiene": self.hygiene,
            "energy": self.energy,
            "coins": self.coins,
            "sleeping": self.sleeping,
        }

    def to_dict(self):
        return {
            "name": self.name,
            "species": self.species,
            "stage": self.stage,
            "stage_correct": self.stage_correct,
            "total_correct": self.total_correct,
            "total_wrong": self.total_wrong,
            "streak": self.streak,
            "best_streak": self.best_streak,
            "hunger": self.hunger,
            "happiness": self.happiness,
            "hygiene": self.hygiene,
            "energy": self.energy,
            "coins": self.coins,
            "inventory": dict(self.inventory),
            "sleeping": self.sleeping,
            "sleep_until": self.sleep_until,
            "tricks_learned": list(self.tricks_learned),
            "save_time": time.time(),
        }

    @classmethod
    def from_dict(cls, data):
        pet = cls(data["name"])
        pet.species = data.get("species", "Stitch")
        pet.stage = data.get("stage", "egg")
        pet.stage_correct = data.get("stage_correct", 0)
        pet.total_correct = data.get("total_correct", 0)
        pet.total_wrong = data.get("total_wrong", 0)
        pet.streak = data.get("streak", 0)
        pet.best_streak = data.get("best_streak", 0)
        pet.hunger = data.get("hunger", STAT_START)
        pet.happiness = data.get("happiness", STAT_START)
        pet.hygiene = data.get("hygiene", STAT_START)
        pet.energy = data.get("energy", STAT_START)
        pet.coins = data.get("coins", 0)
        pet.inventory = data.get("inventory", {})
        pet.sleeping = data.get("sleeping", False)
        pet.sleep_until = data.get("sleep_until", 0)
        pet.tricks_learned = data.get("tricks_learned", [])

        # ── Offline decay ───────────────────────────────────────────
        # Apply stat decay for time elapsed since last save.
        # Stats floor at OFFLINE_DECAY_FLOOR * STAT_MAX (70% max decay).
        if pet.stage != "egg":
            save_time = data.get("save_time", 0)
            if save_time:
                elapsed = time.time() - save_time
                ticks = int(elapsed / TICK_INTERVAL)
                if ticks > 0:
                    floor = int(OFFLINE_DECAY_FLOOR * STAT_MAX)

                    # If pet was sleeping, finish the nap first
                    if pet.sleeping:
                        sleep_ticks = max(0, int((pet.sleep_until - save_time) / TICK_INTERVAL))
                        sleep_ticks = min(sleep_ticks, ticks)
                        # Recover energy during remaining sleep
                        pet.energy = min(STAT_MAX, pet.energy + SLEEP_ENERGY_PER_TICK * sleep_ticks)
                        # Decay non-energy stats during sleep
                        for stat, amount in DECAY_PER_TICK.items():
                            if stat == "energy":
                                continue
                            old = getattr(pet, stat)
                            setattr(pet, stat, max(floor, old - amount * sleep_ticks))
                        ticks -= sleep_ticks
                        pet.sleeping = False

                    # Apply normal decay for remaining ticks
                    for stat, amount in DECAY_PER_TICK.items():
                        old = getattr(pet, stat)
                        setattr(pet, stat, max(floor, old - amount * ticks))

        return pet
