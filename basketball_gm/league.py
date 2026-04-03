"""League model — holds all teams, free agents, and league state."""

from __future__ import annotations

import random
from dataclasses import dataclass, field
from typing import Optional

from basketball_gm.config import (
    GAMES_PER_SEASON, POSITIONS, ROSTER_SIZE, STARTING_YEAR,
    TEAM_TIER_DISTRIBUTION,
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

    # Vary team quality significantly: some teams get 0-1 stars (tanking),
    # some get 3-4 (superteam). This creates realistic league-wide variance.
    base_tiers = list(TEAM_TIER_DISTRIBUTION)
    tiers = list(base_tiers)
    tier_list = ["star", "starter", "rotation", "bench", "scrub"]
    # More aggressive swaps (3-7) with chance of double-shift
    swaps = rng.randint(3, 7)
    for _ in range(swaps):
        idx = rng.randint(0, len(tiers) - 1)
        current = tier_list.index(tiers[idx])
        # Allow double shifts (±2 tiers) 30% of the time
        shift = rng.choice([-2, -1, -1, 1, 1, 2]) if rng.random() < 0.3 else rng.choice([-1, 1])
        new_idx = max(0, min(len(tier_list) - 1, current + shift))
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


# ── Schedule Generation ─────────────────────────────────────────────


@dataclass
class ScheduledGame:
    """A game on the schedule (not yet played)."""
    home_id: int
    away_id: int
    day: int = 0       # day index within the season (0-based)
    played: bool = False

    def to_dict(self) -> dict:
        return {"home_id": self.home_id, "away_id": self.away_id,
                "day": self.day, "played": self.played}

    @classmethod
    def from_dict(cls, d: dict) -> ScheduledGame:
        return cls(**d)


def generate_schedule(league: League, rng: Optional[random.Random] = None) -> list[ScheduledGame]:
    """Generate an 82-game schedule for each team (1230 total games).

    NBA-like schedule (per team):
    - 4 games vs each division rival (4 rivals x 4 = 16)
    - 3 or 4 games vs conference non-division (10 teams, 36 games total)
    - 2 games vs each opposite-conference team (15 x 2 = 30)
    Total: 16 + 36 + 30 = 82
    """
    r = rng or random.Random()
    games: list[tuple[int, int]] = []  # (home_id, away_id)

    team_map = {t.id: t for t in league.teams}
    processed_pairs: set[tuple[int, int]] = set()

    def add_series(t1: int, t2: int, num_games: int) -> None:
        """Add a series between two teams, splitting home/away."""
        pair = (min(t1, t2), max(t1, t2))
        if pair in processed_pairs:
            return
        processed_pairs.add(pair)
        home_first = t1 if r.random() < 0.5 else t2
        away_first = t2 if home_first == t1 else t1
        for i in range(num_games):
            if i % 2 == 0:
                games.append((home_first, away_first))
            else:
                games.append((away_first, home_first))

    # Step 1: Division games — 4 games per rivalry pair
    for team in league.teams:
        div_mates = [t for t in league.division_teams(team.division) if t.id != team.id]
        for opp in div_mates:
            add_series(team.id, opp.id, 4)

    # Step 2: Inter-conference — 2 games per matchup
    east_teams = league.conference_teams("Eastern")
    west_teams = league.conference_teams("Western")
    for et in east_teams:
        for wt in west_teams:
            add_series(et.id, wt.id, 2)

    # Step 3: Conference non-division — exactly 36 games per team
    # Each team plays 10 non-division conference opponents (mix of 3 and 4 games).
    # 6 opponents x 4 games + 4 opponents x 3 games = 36.
    # We need both teams in a pair to agree on the game count.
    for conf in ["Eastern", "Western"]:
        conf_teams = sorted(league.conference_teams(conf), key=lambda t: t.id)

        # Build all cross-division pairs
        cross_div_pairs = []
        for i, t1 in enumerate(conf_teams):
            for t2 in conf_teams[i + 1:]:
                if t1.division != t2.division:
                    cross_div_pairs.append((t1.id, t2.id))

        # Track how many non-division conference games each team has
        nondiv_games = {t.id: 0 for t in conf_teams}
        target = 36

        # Default all pairs to 3 games, then upgrade some to 4
        pair_games = {pair: 3 for pair in cross_div_pairs}
        for pair in cross_div_pairs:
            nondiv_games[pair[0]] += 3
            nondiv_games[pair[1]] += 3

        # Each team has 10 opponents x 3 = 30 games. Need 36, so upgrade 6 to 4.
        # Shuffle and greedily upgrade pairs where both teams need more games.
        upgradeable = list(cross_div_pairs)
        r.shuffle(upgradeable)
        for pair in upgradeable:
            t1, t2 = pair
            if nondiv_games[t1] < target and nondiv_games[t2] < target:
                pair_games[pair] = 4
                nondiv_games[t1] += 1
                nondiv_games[t2] += 1

        # Second pass: if any team is still short, upgrade their 3-game pairs
        for _ in range(10):
            changed = False
            for pair in upgradeable:
                t1, t2 = pair
                if pair_games[pair] == 3:
                    need1 = nondiv_games[t1] < target
                    need2 = nondiv_games[t2] < target
                    ok1 = nondiv_games[t1] < target  # won't exceed target
                    ok2 = nondiv_games[t2] < target
                    if (need1 or need2) and ok1 and ok2:
                        pair_games[pair] = 4
                        nondiv_games[t1] += 1
                        nondiv_games[t2] += 1
                        changed = True
            if not changed:
                break

        for pair, num in pair_games.items():
            add_series(pair[0], pair[1], num)

    r.shuffle(games)

    # Assign games to days — ~8-12 games per day, ~180 days
    schedule = []
    day = 0
    day_teams: set[int] = set()
    games_today = 0
    max_games_per_day = 15

    for home, away in games:
        if home in day_teams or away in day_teams or games_today >= max_games_per_day:
            day += 1
            day_teams = set()
            games_today = 0
        schedule.append(ScheduledGame(home_id=home, away_id=away, day=day))
        day_teams.add(home)
        day_teams.add(away)
        games_today += 1

    # Sort by day
    schedule.sort(key=lambda g: g.day)

    return schedule
