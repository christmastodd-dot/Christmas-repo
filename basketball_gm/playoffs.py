"""Playoff bracket — 16-team best-of-7 tournament."""

from __future__ import annotations

import random
from dataclasses import dataclass, field
from typing import Optional

from basketball_gm.game_sim import GameResult, simulate_game, accumulate_player_stats
from basketball_gm.league import League
from basketball_gm.team import Team


ROUND_NAMES = ["First Round", "Conference Semifinals", "Conference Finals", "NBA Finals"]
HOME_PATTERN = [True, True, False, False, True, False, True]  # 2-2-1-1-1


@dataclass
class PlayoffSeries:
    """A best-of-7 series between two teams."""
    higher_seed_id: int
    lower_seed_id: int
    higher_seed_rank: int = 0
    lower_seed_rank: int = 0
    higher_wins: int = 0
    lower_wins: int = 0
    results: list[GameResult] = field(default_factory=list)
    conference: str = ""

    @property
    def complete(self) -> bool:
        return self.higher_wins == 4 or self.lower_wins == 4

    @property
    def winner_id(self) -> Optional[int]:
        if self.higher_wins == 4:
            return self.higher_seed_id
        if self.lower_wins == 4:
            return self.lower_seed_id
        return None

    @property
    def loser_id(self) -> Optional[int]:
        if self.higher_wins == 4:
            return self.lower_seed_id
        if self.lower_wins == 4:
            return self.higher_seed_id
        return None

    @property
    def games_played(self) -> int:
        return self.higher_wins + self.lower_wins

    def status_str(self, league: League) -> str:
        higher = league.get_team(self.higher_seed_id)
        lower = league.get_team(self.lower_seed_id)
        h_name = higher.abbr if higher else "???"
        l_name = lower.abbr if lower else "???"

        if self.complete:
            winner = h_name if self.higher_wins == 4 else l_name
            loser = l_name if self.higher_wins == 4 else h_name
            w = max(self.higher_wins, self.lower_wins)
            l = min(self.higher_wins, self.lower_wins)
            return f"{winner} def. {loser} {w}-{l}"
        elif self.higher_wins == self.lower_wins:
            return f"{h_name} vs {l_name}  Tied {self.higher_wins}-{self.lower_wins}"
        elif self.higher_wins > self.lower_wins:
            return f"{h_name} leads {l_name}  {self.higher_wins}-{self.lower_wins}"
        else:
            return f"{l_name} leads {h_name}  {self.lower_wins}-{self.higher_wins}"

    def next_home_team_id(self) -> int:
        """Determine home team for the next game (2-2-1-1-1 format)."""
        game_num = self.games_played
        if game_num >= 7:
            return self.higher_seed_id
        if HOME_PATTERN[game_num]:
            return self.higher_seed_id
        return self.lower_seed_id

    def to_dict(self) -> dict:
        return {
            "higher_seed_id": self.higher_seed_id,
            "lower_seed_id": self.lower_seed_id,
            "higher_seed_rank": self.higher_seed_rank,
            "lower_seed_rank": self.lower_seed_rank,
            "higher_wins": self.higher_wins,
            "lower_wins": self.lower_wins,
            "conference": self.conference,
        }

    @classmethod
    def from_dict(cls, d: dict) -> PlayoffSeries:
        return cls(
            higher_seed_id=d["higher_seed_id"],
            lower_seed_id=d["lower_seed_id"],
            higher_seed_rank=d.get("higher_seed_rank", 0),
            lower_seed_rank=d.get("lower_seed_rank", 0),
            higher_wins=d.get("higher_wins", 0),
            lower_wins=d.get("lower_wins", 0),
            conference=d.get("conference", ""),
        )


@dataclass
class PlayoffBracket:
    """Full playoff bracket: 4 rounds of series."""
    rounds: list[list[PlayoffSeries]] = field(default_factory=list)
    current_round: int = 0
    champion_id: Optional[int] = None
    finals_mvp_id: Optional[int] = None

    @property
    def current_round_name(self) -> str:
        if self.current_round < len(ROUND_NAMES):
            return ROUND_NAMES[self.current_round]
        return "Complete"

    @property
    def current_series_list(self) -> list[PlayoffSeries]:
        if self.current_round < len(self.rounds):
            return self.rounds[self.current_round]
        return []

    @property
    def round_complete(self) -> bool:
        return all(s.complete for s in self.current_series_list)

    @property
    def playoffs_complete(self) -> bool:
        return self.champion_id is not None

    def advance_round(self, league: League) -> None:
        """Create the next round's matchups from current round winners."""
        if not self.round_complete:
            return

        winners = [s.winner_id for s in self.current_series_list]
        self.current_round += 1

        if self.current_round >= 4:
            # Playoffs complete
            return

        if self.current_round == 3:
            # Finals: East champion vs West champion
            east_winner = None
            west_winner = None
            for s in self.rounds[2]:  # Conference Finals
                winner_team = league.get_team(s.winner_id)
                if winner_team:
                    if winner_team.conference == "Eastern":
                        east_winner = s.winner_id
                    else:
                        west_winner = s.winner_id
            if east_winner and west_winner:
                # Higher seed by regular season record
                et = league.get_team(east_winner)
                wt = league.get_team(west_winner)
                if et and wt:
                    if et.win_pct >= wt.win_pct:
                        series = PlayoffSeries(
                            higher_seed_id=east_winner,
                            lower_seed_id=west_winner,
                            conference="Finals",
                        )
                    else:
                        series = PlayoffSeries(
                            higher_seed_id=west_winner,
                            lower_seed_id=east_winner,
                            conference="Finals",
                        )
                    self.rounds.append([series])
            return

        # Pair winners: 1st vs 4th, 2nd vs 3rd in each conference group
        new_round = []
        # Winners are ordered by their original series position
        # For rounds 1->2: series 0,1,2,3 map to [0v3, 1v2] pairings (within conference)
        # Group by conference
        east_winners = []
        west_winners = []
        for s in self.current_series_list:
            pass  # current_round already incremented

        # Use the previous round's series to get conference info
        prev_series = self.rounds[self.current_round - 1]
        east_series = [s for s in prev_series if s.conference == "Eastern"]
        west_series = [s for s in prev_series if s.conference == "Western"]

        for conf_series in [east_series, west_series]:
            conf_winners = [(s.winner_id, s.higher_seed_rank if s.winner_id == s.higher_seed_id
                             else s.lower_seed_rank) for s in conf_series]
            conf_winners.sort(key=lambda x: x[1])  # sort by seed

            if len(conf_winners) >= 2:
                # Reseed: best remaining vs worst remaining
                new_round.append(PlayoffSeries(
                    higher_seed_id=conf_winners[0][0],
                    lower_seed_id=conf_winners[-1][0],
                    higher_seed_rank=conf_winners[0][1],
                    lower_seed_rank=conf_winners[-1][1],
                    conference=conf_series[0].conference,
                ))
            if len(conf_winners) >= 4:
                new_round.append(PlayoffSeries(
                    higher_seed_id=conf_winners[1][0],
                    lower_seed_id=conf_winners[-2][0],
                    higher_seed_rank=conf_winners[1][1],
                    lower_seed_rank=conf_winners[-2][1],
                    conference=conf_series[0].conference,
                ))

        self.rounds.append(new_round)

    def to_dict(self) -> dict:
        return {
            "rounds": [[s.to_dict() for s in rd] for rd in self.rounds],
            "current_round": self.current_round,
            "champion_id": self.champion_id,
            "finals_mvp_id": self.finals_mvp_id,
        }

    @classmethod
    def from_dict(cls, d: dict) -> PlayoffBracket:
        bracket = cls(
            current_round=d.get("current_round", 0),
            champion_id=d.get("champion_id"),
            finals_mvp_id=d.get("finals_mvp_id"),
        )
        bracket.rounds = [
            [PlayoffSeries.from_dict(s) for s in rd]
            for rd in d.get("rounds", [])
        ]
        return bracket


# ── Bracket creation ────────────────────────────────────────────────


def create_playoff_bracket(league: League) -> PlayoffBracket:
    """Seed the top 8 teams per conference into a playoff bracket."""
    bracket = PlayoffBracket()
    first_round = []

    for conf in ["Eastern", "Western"]:
        seeds = league.standings(conf)[:8]

        # 1v8, 4v5, 3v6, 2v7 matchups
        matchups = [(0, 7), (3, 4), (2, 5), (1, 6)]
        for high_idx, low_idx in matchups:
            first_round.append(PlayoffSeries(
                higher_seed_id=seeds[high_idx].id,
                lower_seed_id=seeds[low_idx].id,
                higher_seed_rank=high_idx + 1,
                lower_seed_rank=low_idx + 1,
                conference=conf,
            ))

    bracket.rounds.append(first_round)
    return bracket


# ── Simulate series ─────────────────────────────────────────────────


def sim_series_game(
    series: PlayoffSeries,
    league: League,
    rng: Optional[random.Random] = None,
) -> GameResult:
    """Simulate one game in a playoff series."""
    home_id = series.next_home_team_id()
    away_id = series.lower_seed_id if home_id == series.higher_seed_id else series.higher_seed_id

    home_team = league.get_team(home_id)
    away_team = league.get_team(away_id)

    result = simulate_game(home_team, away_team, rng=rng, playoff=True)

    # Update series
    if result.winner_id == series.higher_seed_id:
        series.higher_wins += 1
    else:
        series.lower_wins += 1
    series.results.append(result)

    # Accumulate player stats
    for s in result.home_box:
        p = home_team.get_player(s.player_id)
        if p:
            accumulate_player_stats(p, s)
    for s in result.away_box:
        p = away_team.get_player(s.player_id)
        if p:
            accumulate_player_stats(p, s)

    return result


def sim_full_series(
    series: PlayoffSeries,
    league: League,
    rng: Optional[random.Random] = None,
) -> list[GameResult]:
    """Simulate an entire series to completion."""
    results = []
    while not series.complete:
        results.append(sim_series_game(series, league, rng))
    return results


def sim_playoff_round(
    bracket: PlayoffBracket,
    league: League,
    rng: Optional[random.Random] = None,
) -> list[GameResult]:
    """Simulate all series in the current round."""
    all_results = []
    for series in bracket.current_series_list:
        if not series.complete:
            all_results.extend(sim_full_series(series, league, rng))
    return all_results


def sim_full_playoffs(
    bracket: PlayoffBracket,
    league: League,
    rng: Optional[random.Random] = None,
) -> list[GameResult]:
    """Simulate the entire playoffs from current state to completion."""
    all_results = []

    while not bracket.playoffs_complete:
        # Sim current round
        all_results.extend(sim_playoff_round(bracket, league, rng))

        if bracket.round_complete:
            if bracket.current_round == 3:
                # Finals complete
                finals = bracket.current_series_list[0]
                bracket.champion_id = finals.winner_id
                bracket.finals_mvp_id = _pick_finals_mvp(finals, league)
            else:
                bracket.advance_round(league)

    return all_results


def _pick_finals_mvp(series: PlayoffSeries, league: League) -> Optional[int]:
    """Pick the Finals MVP based on points scored in the series."""
    winner_id = series.winner_id
    if not winner_id:
        return None

    # Tally points per player on winning team
    player_points: dict[int, int] = {}
    for result in series.results:
        box = result.home_box if result.home_team_id == winner_id else result.away_box
        for s in box:
            player_points[s.player_id] = player_points.get(s.player_id, 0) + s.points

    if not player_points:
        return None

    return max(player_points, key=player_points.get)
