"""Inventory management for consumables and permanent items."""


class Inventory:
    def __init__(self):
        # Consumables: {"Apple": 2, "Steak": 1, ...}
        self.consumables = {}
        # Permanent items: {"ball": True, "hat": True}
        self.permanents = {}
        # Ball uses remaining (resets when a new ball is bought)
        self.ball_uses = 0

    def add_consumable(self, name, qty=1):
        self.consumables[name] = self.consumables.get(name, 0) + qty

    def use_consumable(self, name):
        if self.consumables.get(name, 0) > 0:
            self.consumables[name] -= 1
            if self.consumables[name] <= 0:
                del self.consumables[name]
            return True
        return False

    def add_permanent(self, item_type):
        self.permanents[item_type] = True

    def has_permanent(self, item_type):
        return self.permanents.get(item_type, False)

    def add_ball_uses(self, uses):
        self.ball_uses += uses

    def use_ball(self):
        if self.ball_uses > 0:
            self.ball_uses -= 1
            return True
        return False

    def has_items(self):
        return bool(self.consumables) or bool(self.permanents)

    def to_dict(self):
        return {
            "consumables": dict(self.consumables),
            "permanents": dict(self.permanents),
            "ball_uses": self.ball_uses,
        }

    @classmethod
    def from_dict(cls, data):
        inv = cls()
        inv.consumables = data.get("consumables", {})
        inv.permanents = data.get("permanents", {})
        inv.ball_uses = data.get("ball_uses", 0)
        return inv
