"""Pet class — evolves by answering math problems."""

import time

from tamagotchi.config import (
    STAGES, STAGE_THRESHOLDS,
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

        # Evolution event flag
        self.just_evolved = False
        self.evolved_from = None

    def get_mood(self):
        if self.stage == "egg":
            return "egg"
        if self.streak >= 5:
            return "happy"
        if self.streak >= 2:
            return "neutral"
        if self.total_wrong > 0 and self.total_wrong > self.total_correct:
            return "sad"
        return "neutral"

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

    def answer_correct(self):
        self.total_correct += 1
        self.stage_correct += 1
        self.streak += 1
        if self.streak > self.best_streak:
            self.best_streak = self.streak
        self._try_evolve()

    def answer_wrong(self):
        self.total_wrong += 1
        self.streak = 0

    def progress_pct(self):
        threshold = STAGE_THRESHOLDS.get(self.stage)
        if threshold is None:
            return 100
        return int((self.stage_correct / threshold) * 100)

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
        return pet
