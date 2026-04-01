"""Season orchestration — regular season simulation and management."""

from __future__ import annotations

import random
from dataclasses import dataclass, field
from typing import Optional

from basketball_gm.game_sim import GameResult, simulate_game, accumulate_player_stats
from basketball_gm.league import League, ScheduledGame, generate_schedule
from basketball_gm.team import Team


@dataclass
class Season:
    """Manages a single season: schedule, simulation, standings."""
    league: League
    schedule: list[ScheduledGame] = field(default_factory=list)
    results: list[GameResult] = field(default_factory=list)
    current_day: int = 0
    rng: random.Random = field(default_factory=random.Random)

    def initialize(self, seed: Optional[int] = None) -> None:
        """Set up the season schedule and reset team records."""
        if seed is not None:
            self.rng = random.Random(seed)
        self.schedule = generate_schedule(self.league, self.rng)
        self.results = []
        self.current_day = 0
        self.league.phase = "regular_season"
        for team in self.league.teams:
            team.reset_season()
            for p in team.roster:
                p.season_stats.__init__()

    @property
    def total_days(self) -> int:
        if not self.schedule:
            return 0
        return max(g.day for g in self.schedule) + 1

    @property
    def games_played(self) -> int:
        return sum(1 for g in self.schedule if g.played)

    @property
    def games_remaining(self) -> int:
        return sum(1 for g in self.schedule if not g.played)

    @property
    def season_complete(self) -> bool:
        return all(g.played for g in self.schedule)

    def get_day_games(self, day: int) -> list[ScheduledGame]:
        return [g for g in self.schedule if g.day == day]

    def get_team_schedule(self, team_id: int) -> list[ScheduledGame]:
        return [g for g in self.schedule
                if g.home_id == team_id or g.away_id == team_id]

    def get_team_remaining(self, team_id: int) -> list[ScheduledGame]:
        return [g for g in self.get_team_schedule(team_id) if not g.played]

    def get_team_results(self, team_id: int) -> list[GameResult]:
        return [r for r in self.results
                if r.home_team_id == team_id or r.away_team_id == team_id]

    def sim_day(self) -> list[GameResult]:
        """Simulate all games on the current day, advance to next day."""
        day_games = [g for g in self.schedule if g.day == self.current_day and not g.played]
        day_results = []

        for game in day_games:
            home = self.league.get_team(game.home_id)
            away = self.league.get_team(game.away_id)
            if not home or not away:
                continue

            result = simulate_game(home, away, rng=self.rng)
            game.played = True

            # Update records
            if result.winner_id == home.id:
                home.wins += 1
                away.losses += 1
            else:
                away.wins += 1
                home.losses += 1

            # Accumulate player stats
            for s in result.home_box:
                p = home.get_player(s.player_id)
                if p:
                    accumulate_player_stats(p, s)
            for s in result.away_box:
                p = away.get_player(s.player_id)
                if p:
                    accumulate_player_stats(p, s)

            self.results.append(result)
            day_results.append(result)

        self.current_day += 1
        return day_results

    def sim_days(self, num_days: int) -> list[GameResult]:
        """Simulate multiple days of games."""
        all_results = []
        for _ in range(num_days):
            if self.season_complete:
                break
            all_results.extend(self.sim_day())
        return all_results

    def sim_to_day(self, target_day: int) -> list[GameResult]:
        """Simulate up to (but not including) a target day."""
        all_results = []
        while self.current_day < target_day and not self.season_complete:
            all_results.extend(self.sim_day())
        return all_results

    def sim_rest_of_season(self) -> list[GameResult]:
        """Simulate all remaining games."""
        all_results = []
        while not self.season_complete:
            all_results.extend(self.sim_day())
        return all_results

    def sim_week(self) -> list[GameResult]:
        """Simulate ~7 days of games."""
        return self.sim_days(7)

    def get_user_next_game(self) -> Optional[ScheduledGame]:
        """Find the next unplayed game for the user's team."""
        user_id = self.league.user_team_id
        for g in self.schedule:
            if not g.played and (g.home_id == user_id or g.away_id == user_id):
                return g
        return None

    def sim_to_next_user_game(self) -> list[GameResult]:
        """Simulate up to (but not including) the user's next game day."""
        next_game = self.get_user_next_game()
        if next_game is None:
            return self.sim_rest_of_season()
        return self.sim_to_day(next_game.day)

    def to_dict(self) -> dict:
        return {
            "schedule": [g.to_dict() for g in self.schedule],
            "results": [r.to_dict() for r in self.results],
            "current_day": self.current_day,
        }

    @classmethod
    def from_dict(cls, d: dict, league: League) -> Season:
        season = cls(league=league)
        season.schedule = [ScheduledGame.from_dict(g) for g in d.get("schedule", [])]
        season.current_day = d.get("current_day", 0)
        # Results are not fully restored (box scores are large); just track count
        season.results = []
        return season
