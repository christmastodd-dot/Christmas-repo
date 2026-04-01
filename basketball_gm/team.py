"""Team model and roster management."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Optional

from basketball_gm.config import POSITIONS, ROSTER_SIZE, SALARY_CAP, LUXURY_TAX_THRESHOLD
from basketball_gm.player import Player


@dataclass
class Team:
    id: int
    city: str
    name: str
    abbr: str
    conference: str
    division: str
    roster: list[Player] = field(default_factory=list)
    wins: int = 0
    losses: int = 0

    @property
    def full_name(self) -> str:
        return f"{self.city} {self.name}"

    @property
    def record(self) -> str:
        return f"{self.wins}-{self.losses}"

    @property
    def win_pct(self) -> float:
        total = self.wins + self.losses
        return self.wins / total if total > 0 else 0.0

    @property
    def payroll(self) -> int:
        return sum(p.contract.salary for p in self.roster)

    @property
    def cap_space(self) -> int:
        return max(0, SALARY_CAP - self.payroll)

    @property
    def over_luxury_tax(self) -> bool:
        return self.payroll > LUXURY_TAX_THRESHOLD

    def payroll_str(self) -> str:
        p = self.payroll
        if p >= 1_000_000:
            return f"${p / 1_000_000:.1f}M"
        return f"${p / 1_000:,.0f}K"

    def team_overall(self) -> int:
        """Weighted overall: top players matter more."""
        if not self.roster:
            return 0
        sorted_players = sorted(self.roster, key=lambda p: p.overall, reverse=True)
        # Top 5 (starters) count double, next 3 (rotation) normal, rest half
        total = 0.0
        total_weight = 0.0
        for i, p in enumerate(sorted_players):
            if i < 5:
                w = 2.0
            elif i < 8:
                w = 1.0
            else:
                w = 0.5
            total += p.overall * w
            total_weight += w
        return int(round(total / total_weight))

    def get_starters(self) -> list[Player]:
        """Pick the best player at each position for the starting lineup."""
        starters = []
        used = set()
        for pos in POSITIONS:
            best = None
            for p in self.roster:
                if p.id in used:
                    continue
                if p.position == pos and (best is None or p.overall > best.overall):
                    best = p
            if best:
                starters.append(best)
                used.add(best.id)

        # Fill remaining spots with best available if positions couldn't be filled
        remaining = [p for p in self.roster if p.id not in used]
        remaining.sort(key=lambda p: p.overall, reverse=True)
        while len(starters) < 5 and remaining:
            starters.append(remaining.pop(0))
            used.add(starters[-1].id)

        return starters

    def get_bench(self) -> list[Player]:
        """Get non-starters sorted by overall."""
        starter_ids = {p.id for p in self.get_starters()}
        bench = [p for p in self.roster if p.id not in starter_ids]
        bench.sort(key=lambda p: p.overall, reverse=True)
        return bench

    def add_player(self, player: Player) -> bool:
        if len(self.roster) >= ROSTER_SIZE:
            return False
        self.roster.append(player)
        return True

    def remove_player(self, player_id: int) -> Optional[Player]:
        for i, p in enumerate(self.roster):
            if p.id == player_id:
                return self.roster.pop(i)
        return None

    def get_player(self, player_id: int) -> Optional[Player]:
        for p in self.roster:
            if p.id == player_id:
                return p
        return None

    def reset_season(self) -> None:
        self.wins = 0
        self.losses = 0

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "city": self.city,
            "name": self.name,
            "abbr": self.abbr,
            "conference": self.conference,
            "division": self.division,
            "roster": [p.to_dict() for p in self.roster],
            "wins": self.wins,
            "losses": self.losses,
        }

    @classmethod
    def from_dict(cls, d: dict) -> Team:
        team = cls(
            id=d["id"],
            city=d["city"],
            name=d["name"],
            abbr=d["abbr"],
            conference=d["conference"],
            division=d["division"],
            wins=d.get("wins", 0),
            losses=d.get("losses", 0),
        )
        team.roster = [Player.from_dict(p) for p in d.get("roster", [])]
        return team
