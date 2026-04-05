"""Player model, generation, and development."""

from __future__ import annotations

import random
from dataclasses import dataclass, field
from typing import Optional

from basketball_gm.config import (
    ATTRIBUTES, HEIGHT_RANGE, MAX_SALARY, MIN_SALARY, PLAYER_TIERS,
    POSITION_WEIGHTS, POSITIONS, ROOKIE_SALARY, WEIGHT_RANGE,
)
from basketball_gm.data.names import FIRST_NAMES, LAST_NAMES


# Global player ID counter
_next_player_id = 1


def _get_next_id() -> int:
    global _next_player_id
    pid = _next_player_id
    _next_player_id += 1
    return pid


def set_next_player_id(val: int) -> None:
    global _next_player_id
    _next_player_id = val


def get_next_player_id() -> int:
    return _next_player_id


@dataclass
class Contract:
    salary: int = MIN_SALARY
    years: int = 1

    def to_dict(self) -> dict:
        return {"salary": self.salary, "years": self.years}

    @classmethod
    def from_dict(cls, d: dict) -> Contract:
        return cls(salary=d["salary"], years=d["years"])


@dataclass
class SeasonStats:
    """Accumulated stats for one season."""
    games: int = 0
    minutes: float = 0.0
    points: int = 0
    rebounds: int = 0
    assists: int = 0
    steals: int = 0
    blocks: int = 0
    turnovers: int = 0
    fg_made: int = 0
    fg_attempted: int = 0
    three_made: int = 0
    three_attempted: int = 0
    ft_made: int = 0
    ft_attempted: int = 0

    @property
    def ppg(self) -> float:
        return self.points / self.games if self.games else 0.0

    @property
    def rpg(self) -> float:
        return self.rebounds / self.games if self.games else 0.0

    @property
    def apg(self) -> float:
        return self.assists / self.games if self.games else 0.0

    @property
    def spg(self) -> float:
        return self.steals / self.games if self.games else 0.0

    @property
    def bpg(self) -> float:
        return self.blocks / self.games if self.games else 0.0

    @property
    def mpg(self) -> float:
        return self.minutes / self.games if self.games else 0.0

    @property
    def fg_pct(self) -> float:
        return self.fg_made / self.fg_attempted if self.fg_attempted else 0.0

    @property
    def three_pct(self) -> float:
        return self.three_made / self.three_attempted if self.three_attempted else 0.0

    @property
    def ft_pct(self) -> float:
        return self.ft_made / self.ft_attempted if self.ft_attempted else 0.0

    def to_dict(self) -> dict:
        return {
            "games": self.games, "minutes": self.minutes,
            "points": self.points, "rebounds": self.rebounds, "assists": self.assists,
            "steals": self.steals, "blocks": self.blocks, "turnovers": self.turnovers,
            "fg_made": self.fg_made, "fg_attempted": self.fg_attempted,
            "three_made": self.three_made, "three_attempted": self.three_attempted,
            "ft_made": self.ft_made, "ft_attempted": self.ft_attempted,
        }

    @classmethod
    def from_dict(cls, d: dict) -> SeasonStats:
        return cls(**d)


@dataclass
class Player:
    id: int
    first_name: str
    last_name: str
    age: int
    position: str
    height: int          # inches
    weight: int          # lbs
    ratings: dict        # attribute_name -> int (1-99)
    potential: int       # 1-99
    contract: Contract = field(default_factory=Contract)
    season_stats: SeasonStats = field(default_factory=SeasonStats)
    career_stats: dict = field(default_factory=dict)  # year -> SeasonStats dict
    awards: list = field(default_factory=list)  # e.g. [{"year": 2026, "award": "MVP"}, ...]
    draft_year: int = 0
    draft_pick: int = 0
    years_pro: int = 0

    @property
    def name(self) -> str:
        return f"{self.first_name} {self.last_name}"

    @property
    def overall(self) -> int:
        weights = POSITION_WEIGHTS[self.position]
        total = sum(self.ratings[attr] * weights[attr] for attr in ATTRIBUTES)
        return int(round(total))

    @property
    def height_str(self) -> str:
        feet = self.height // 12
        inches = self.height % 12
        return f"{feet}'{inches}\""

    def salary_str(self) -> str:
        if self.contract.salary >= 1_000_000:
            return f"${self.contract.salary / 1_000_000:.1f}M"
        return f"${self.contract.salary / 1_000:,.0f}K"

    def archive_season(self, year: int) -> None:
        """Save current season stats to career history and reset."""
        if self.season_stats.games > 0:
            self.career_stats[str(year)] = self.season_stats.to_dict()
        self.season_stats = SeasonStats()

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "first_name": self.first_name,
            "last_name": self.last_name,
            "age": self.age,
            "position": self.position,
            "height": self.height,
            "weight": self.weight,
            "ratings": dict(self.ratings),
            "potential": self.potential,
            "contract": self.contract.to_dict(),
            "season_stats": self.season_stats.to_dict(),
            "career_stats": self.career_stats,
            "awards": self.awards,
            "draft_year": self.draft_year,
            "draft_pick": self.draft_pick,
            "years_pro": self.years_pro,
        }

    @classmethod
    def from_dict(cls, d: dict) -> Player:
        p = cls(
            id=d["id"],
            first_name=d["first_name"],
            last_name=d["last_name"],
            age=d["age"],
            position=d["position"],
            height=d["height"],
            weight=d["weight"],
            ratings=d["ratings"],
            potential=d["potential"],
            contract=Contract.from_dict(d["contract"]),
            season_stats=SeasonStats.from_dict(d["season_stats"]),
            career_stats=d.get("career_stats", {}),
            awards=d.get("awards", []),
            draft_year=d.get("draft_year", 0),
            draft_pick=d.get("draft_pick", 0),
            years_pro=d.get("years_pro", 0),
        )
        return p


# ── Player Generation ──────────────────────────────────────────────


def generate_player(
    age: Optional[int] = None,
    position: Optional[str] = None,
    tier: str = "rotation",
    rng: Optional[random.Random] = None,
) -> Player:
    """Generate a random player."""
    r = rng or random.Random()

    if position is None:
        position = r.choice(POSITIONS)

    if age is None:
        # Weighted toward prime years
        age = r.choices(
            range(19, 39),
            weights=[3, 4, 5, 6, 7, 8, 8, 8, 7, 6, 5, 4, 3, 2, 2, 1, 1, 1, 1, 1],
        )[0]

    first_name = r.choice(FIRST_NAMES)
    last_name = r.choice(LAST_NAMES)

    lo, hi = PLAYER_TIERS[tier]
    h_lo, h_hi = HEIGHT_RANGE[position]
    w_lo, w_hi = WEIGHT_RANGE[position]

    # Generate ratings with position tendencies
    ratings = {}
    for attr in ATTRIBUTES:
        base = r.randint(lo, hi)
        # Position bonus: boost the primary attributes for this position
        weight = POSITION_WEIGHTS[position][attr]
        if weight >= 0.22:
            base = min(99, base + r.randint(3, 8))
        elif weight >= 0.18:
            base = min(99, base + r.randint(0, 4))
        ratings[attr] = max(1, min(99, base))

    # Potential: younger players get higher potential
    ovr = _calc_overall(ratings, position)
    if age <= 22:
        potential = min(99, ovr + r.randint(8, 25))
    elif age <= 26:
        potential = min(99, ovr + r.randint(2, 12))
    elif age <= 30:
        potential = min(99, ovr + r.randint(0, 5))
    else:
        potential = ovr  # veterans don't grow

    # Contract based on overall
    salary = _salary_from_overall(ovr, r)
    years = r.randint(1, 4)
    contract = Contract(salary=salary, years=years)

    return Player(
        id=_get_next_id(),
        first_name=first_name,
        last_name=last_name,
        age=age,
        position=position,
        height=r.randint(h_lo, h_hi),
        weight=r.randint(w_lo, w_hi),
        ratings=ratings,
        potential=potential,
        contract=contract,
        years_pro=max(0, age - 19),
    )


def generate_rookie(
    position: Optional[str] = None,
    tier: str = "rotation",
    rng: Optional[random.Random] = None,
) -> Player:
    """Generate a draft-eligible rookie (age 19-22)."""
    r = rng or random.Random()
    age = r.choices([19, 20, 21, 22], weights=[30, 35, 25, 10])[0]
    player = generate_player(age=age, position=position, tier=tier, rng=r)
    # Rookies get higher potential bump
    player.potential = min(99, player.overall + r.randint(10, 30))
    player.years_pro = 0
    return player


def _calc_overall(ratings: dict, position: str) -> int:
    weights = POSITION_WEIGHTS[position]
    return int(round(sum(ratings[a] * weights[a] for a in ATTRIBUTES)))


def _salary_from_overall(overall: int, rng: random.Random) -> int:
    """Map overall rating to a contract salary."""
    if overall >= 85:
        base = 35_000_000
        bonus = (overall - 85) * 700_000
    elif overall >= 75:
        base = 18_000_000
        bonus = (overall - 75) * 1_700_000
    elif overall >= 65:
        base = 8_000_000
        bonus = (overall - 65) * 1_000_000
    elif overall >= 55:
        base = 3_000_000
        bonus = (overall - 55) * 500_000
    else:
        base = MIN_SALARY
        bonus = max(0, (overall - 40)) * 100_000

    salary = base + bonus + rng.randint(-500_000, 500_000)
    return max(MIN_SALARY, min(MAX_SALARY, salary))


def get_rookie_salary(pick: int) -> int:
    """Get salary for a draft pick based on pick number."""
    # Find the closest bracket
    brackets = sorted(ROOKIE_SALARY.keys())
    for i, bracket in enumerate(brackets):
        if pick <= bracket:
            return ROOKIE_SALARY[bracket]
    return MIN_SALARY
