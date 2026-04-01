"""League model — holds all teams, free agents, and league state."""

from __future__ import annotations

import random
from dataclasses import dataclass, field
from typing import Optional

from basketball_gm.config import (
    POSITIONS, ROSTER_SIZE, STARTING_YEAR, TEAM_TIER_DISTRIBUTION,
)
from basketball_gm.data.teams import TEAM_DATA
from basketball_gm.player import (
    Player, generate_player, get_next_player_id, set_next_player_id,
)
from basketball_gm.team import Team


@dataclass
class League:
    teams: list[Team] = field(default_factory=list)
    free_agents: list[Player] = field(default_factory=list)
    season: int = STARTING_YEAR
    user_team_id: int = 0
    phase: str = "preseason"  # preseason, regular_season, playoffs, offseason, draft, free_agency
    history: list[dict] = field(default_factory=list)  # past season summaries

    def get_team(self, team_id: int) -> Optional[Team]:
        for t in self.teams:
            if t.id == team_id:
                return t
        return None

    def get_team_by_abbr(self, abbr: str) -> Optional[Team]:
        for t in self.teams:
            if t.abbr == abbr:
                return t
        return None

    @property
    def user_team(self) -> Optional[Team]:
        return self.get_team(self.user_team_id)

    def conference_teams(self, conference: str) -> list[Team]:
        return [t for t in self.teams if t.conference == conference]

    def division_teams(self, division: str) -> list[Team]:
        return [t for t in self.teams if t.division == division]

    def standings(self, conference: str) -> list[Team]:
        """Return teams in a conference sorted by win%, then point differential tiebreak."""
        teams = self.conference_teams(conference)
        teams.sort(key=lambda t: (t.win_pct, t.wins), reverse=True)
        return teams

    def all_players(self) -> list[Player]:
        """Every rostered player in the league."""
        players = []
        for t in self.teams:
            players.extend(t.roster)
        return players

    def find_player(self, player_id: int) -> tuple[Optional[Player], Optional[Team]]:
        """Find a player and which team they're on."""
        for t in self.teams:
            p = t.get_player(player_id)
            if p:
                return p, t
        for p in self.free_agents:
            if p.id == player_id:
                return p, None
        return None, None

    def to_dict(self) -> dict:
        return {
            "teams": [t.to_dict() for t in self.teams],
            "free_agents": [p.to_dict() for p in self.free_agents],
            "season": self.season,
            "user_team_id": self.user_team_id,
            "phase": self.phase,
            "history": self.history,
            "next_player_id": get_next_player_id(),
        }

    @classmethod
    def from_dict(cls, d: dict) -> League:
        league = cls(
            season=d["season"],
            user_team_id=d["user_team_id"],
            phase=d.get("phase", "preseason"),
            history=d.get("history", []),
        )
        league.teams = [Team.from_dict(t) for t in d["teams"]]
        league.free_agents = [Player.from_dict(p) for p in d.get("free_agents", [])]
        if "next_player_id" in d:
            set_next_player_id(d["next_player_id"])
        return league


def create_league(seed: Optional[int] = None) -> League:
    """Create a new league with 30 teams, each with a full roster."""
    rng = random.Random(seed)

    league = League()

    # Create all 30 teams
    for i, td in enumerate(TEAM_DATA):
        team = Team(
            id=i + 1,
            city=td["city"],
            name=td["name"],
            abbr=td["abbr"],
            conference=td["conference"],
            division=td["division"],
        )
        league.teams.append(team)

    # Populate each team with players
    for team in league.teams:
        _populate_roster(team, rng)

    # Generate some free agents
    for _ in range(40):
        tier = rng.choice(["rotation", "bench", "bench", "scrub", "scrub"])
        player = generate_player(tier=tier, rng=rng)
        league.free_agents.append(player)

    return league


def _populate_roster(team: Team, rng: random.Random) -> None:
    """Fill a team's roster with 15 players following a varied tier distribution."""
    positions_needed = list(POSITIONS)  # PG, SG, SF, PF, C

    # Vary team quality: some teams get more stars, some get fewer
    base_tiers = list(TEAM_TIER_DISTRIBUTION)
    # Randomly upgrade or downgrade 2-4 slots to create team variance
    tiers = list(base_tiers)
    tier_list = ["star", "starter", "rotation", "bench", "scrub"]
    swaps = rng.randint(2, 5)
    for _ in range(swaps):
        idx = rng.randint(0, len(tiers) - 1)
        current = tier_list.index(tiers[idx])
        direction = rng.choice([-1, 1])
        new_idx = max(0, min(len(tier_list) - 1, current + direction))
        tiers[idx] = tier_list[new_idx]
    rng.shuffle(tiers)

    for i in range(ROSTER_SIZE):
        tier = tiers[i]

        if i < len(positions_needed):
            # First 5: one per position
            pos = positions_needed[i]
        else:
            # Remaining 10: weighted random, favoring guard/wing
            pos = rng.choices(
                POSITIONS,
                weights=[22, 22, 22, 17, 17],
            )[0]

        player = generate_player(position=pos, tier=tier, rng=rng)
        team.roster.append(player)

    # Sort roster by position then overall
    pos_order = {p: i for i, p in enumerate(POSITIONS)}
    team.roster.sort(key=lambda p: (pos_order[p.position], -p.overall))
