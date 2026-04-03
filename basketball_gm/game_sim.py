"""Game simulation engine — possession-by-possession basketball simulation."""

from __future__ import annotations

import random
from dataclasses import dataclass, field
from typing import Optional

from basketball_gm.player import Player
from basketball_gm.team import Team


# ── Simulation constants ────────────────────────────────────────────

POSSESSIONS_PER_GAME = 98        # per team (~196 total)
HOME_COURT_BONUS = 0.025         # +2.5% shooting at home

# Base percentages (before player rating modifiers)
BASE_TWO_PT_PCT = 0.53
BASE_THREE_PT_PCT = 0.37
BASE_FT_PCT = 0.78

# Possession outcome weights (before player adjustments)
BASE_TWO_PT_RATE = 0.40          # % of possessions that are 2pt attempts
BASE_THREE_PT_RATE = 0.32        # 3pt attempts
BASE_FT_RATE = 0.13              # free throw trips
BASE_TURNOVER_RATE = 0.12        # turnovers
BASE_ASSIST_RATE = 0.03          # pass-then-score (remainder)

# Minutes distribution
STARTER_MINUTES = 33.0
BENCH_MINUTES_POOL = 240.0 - (5 * STARTER_MINUTES)  # 75 min split among bench

# Stat generation modifiers
REBOUND_CHANCE_OFFENSIVE = 0.25  # 25% of missed shots are offensive rebounds
REBOUND_RECOVERY_RATE = 0.60     # only ~60% of misses become tracked rebounds (rest out of bounds etc.)
STEAL_CHANCE_PER_TO = 0.24       # what fraction of turnovers are steals
BLOCK_CHANCE_PER_MISS = 0.17     # base block rate on missed 2pt attempts


# ── Per-player tendency system ─────────────────────────────────────
# Deterministic random multipliers seeded by player ID.
# Creates persistent variation: some players are high-volume scorers,
# elite rebounders, or shot-blocking specialists independent of ratings.

_tendency_cache: dict[tuple[int, str], float] = {}


def _player_tendency(player_id: int, category: str, low: float, high: float) -> float:
    """Get a deterministic tendency multiplier for a player+category.

    Seeded by player_id so it's consistent across all games but
    different per player. Heavily right-skewed: 75% of players cluster
    in the bottom third of the range, 15% are above-average, and 10%
    are true outliers. This ensures only 3-5 players in any given stat
    category truly dominate league-wide.
    """
    key = (player_id, category)
    if key in _tendency_cache:
        return _tendency_cache[key]
    rng = random.Random(player_id * 7919 + hash(category))
    span = high - low
    roll = rng.random()
    if roll < 0.10:
        # Elite outlier (~10%): top quarter of range
        val = low + span * rng.uniform(0.70, 1.0)
    elif roll < 0.25:
        # Above-average (~15%): middle of range
        val = low + span * rng.uniform(0.35, 0.65)
    else:
        # Majority (~75%): bottom third, clustered
        val = low + span * (rng.uniform(0, 0.35) + rng.uniform(0, 0.35)) / 2
    _tendency_cache[key] = val
    return val


@dataclass
class PlayerGameStats:
    player_id: int
    minutes: float = 0.0
    points: int = 0
    rebounds: int = 0
    offensive_rebounds: int = 0
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
            "player_id": self.player_id, "minutes": self.minutes,
            "points": self.points, "rebounds": self.rebounds,
            "offensive_rebounds": self.offensive_rebounds,
            "assists": self.assists, "steals": self.steals,
            "blocks": self.blocks, "turnovers": self.turnovers,
            "fg_made": self.fg_made, "fg_attempted": self.fg_attempted,
            "three_made": self.three_made, "three_attempted": self.three_attempted,
            "ft_made": self.ft_made, "ft_attempted": self.ft_attempted,
        }


@dataclass
class GameResult:
    home_team_id: int
    away_team_id: int
    home_score: int = 0
    away_score: int = 0
    home_box: list[PlayerGameStats] = field(default_factory=list)
    away_box: list[PlayerGameStats] = field(default_factory=list)
    overtime_periods: int = 0

    @property
    def winner_id(self) -> int:
        return self.home_team_id if self.home_score > self.away_score else self.away_team_id

    @property
    def loser_id(self) -> int:
        return self.away_team_id if self.home_score > self.away_score else self.home_team_id

    def score_str(self) -> str:
        ot = f" (OT{self.overtime_periods})" if self.overtime_periods else ""
        return f"{self.home_score}-{self.away_score}{ot}"

    def to_dict(self) -> dict:
        return {
            "home_team_id": self.home_team_id,
            "away_team_id": self.away_team_id,
            "home_score": self.home_score,
            "away_score": self.away_score,
            "home_box": [s.to_dict() for s in self.home_box],
            "away_box": [s.to_dict() for s in self.away_box],
            "overtime_periods": self.overtime_periods,
        }


# ── Minute allocation ───────────────────────────────────────────────


def _allocate_minutes(team: Team, extra_minutes: float = 0.0) -> dict[int, float]:
    """Allocate minutes to players. Returns {player_id: minutes}.

    Stars get more minutes (up to 38), bench players get fewer,
    creating realistic usage separation.
    """
    starters = team.get_starters()
    bench = team.get_bench()

    total_minutes = 240.0 + extra_minutes
    starter_total = min(5 * 40.0, total_minutes * 0.72)  # starters get ~72%
    bench_total = total_minutes - starter_total

    minutes = {}

    # Distribute starter minutes weighted by overall (power-scaled)
    if starters:
        starter_overalls = [max(p.overall, 40) ** 1.5 for p in starters]
        s_total = sum(starter_overalls)
        for p, ovr in zip(starters, starter_overalls):
            share = ovr / s_total
            mins = starter_total * share
            minutes[p.id] = max(24.0, min(38.0 + extra_minutes * 0.4, mins))

    # Distribute bench minutes weighted by overall (power-scaled)
    active_bench = bench[:8]  # max 8 bench players get minutes
    if active_bench:
        bench_overalls = [max(p.overall, 30) ** 1.5 for p in active_bench]
        b_total = sum(bench_overalls)
        for p, ovr in zip(active_bench, bench_overalls):
            share = ovr / b_total
            mins = bench_total * share
            minutes[p.id] = max(4.0, min(24.0, mins))

    # Deep bench gets 0
    for p in bench[8:]:
        minutes[p.id] = 0.0

    # Normalize to exactly total_minutes
    current = sum(minutes.values())
    if current > 0:
        factor = total_minutes / current
        for pid in minutes:
            minutes[pid] = round(minutes[pid] * factor, 1)

    return minutes


# ── Core simulation ─────────────────────────────────────────────────


def simulate_game(
    home_team: Team,
    away_team: Team,
    rng: Optional[random.Random] = None,
    playoff: bool = False,
) -> GameResult:
    """Simulate a full basketball game and return detailed results."""
    r = rng or random.Random()

    result = GameResult(
        home_team_id=home_team.id,
        away_team_id=away_team.id,
    )

    # Allocate minutes
    home_minutes = _allocate_minutes(home_team)
    away_minutes = _allocate_minutes(away_team)

    # Init stat lines
    home_stats = {pid: PlayerGameStats(player_id=pid, minutes=mins)
                  for pid, mins in home_minutes.items() if mins > 0}
    away_stats = {pid: PlayerGameStats(player_id=pid, minutes=mins)
                  for pid, mins in away_minutes.items() if mins > 0}

    # Build player lookup
    home_players = {p.id: p for p in home_team.roster}
    away_players = {p.id: p for p in away_team.roster}

    # Compute team defense ratings
    home_def = _team_defense(home_team, home_minutes)
    away_def = _team_defense(away_team, away_minutes)

    # Simulate regulation
    _simulate_possessions(
        r, POSSESSIONS_PER_GAME,
        home_team, home_players, home_stats, home_minutes, away_def,
        is_home=True, playoff=playoff,
    )
    _simulate_possessions(
        r, POSSESSIONS_PER_GAME,
        away_team, away_players, away_stats, away_minutes, home_def,
        is_home=False, playoff=playoff,
    )

    # Calculate scores
    home_score = sum(s.points for s in home_stats.values())
    away_score = sum(s.points for s in away_stats.values())

    # Rebounds from missed shots
    _distribute_rebounds(r, home_stats, away_stats, home_players, away_players,
                         home_minutes, away_minutes)

    # Overtime if tied
    ot_periods = 0
    while home_score == away_score:
        ot_periods += 1
        ot_possessions = 20  # ~5 min overtime
        extra_min = 5.0

        _simulate_possessions(
            r, ot_possessions,
            home_team, home_players, home_stats, home_minutes, away_def,
            is_home=True, playoff=playoff,
        )
        _simulate_possessions(
            r, ot_possessions,
            away_team, away_players, away_stats, away_minutes, home_def,
            is_home=False, playoff=playoff,
        )

        home_score = sum(s.points for s in home_stats.values())
        away_score = sum(s.points for s in away_stats.values())

        # Add OT minutes
        for pid in home_stats:
            if home_minutes.get(pid, 0) >= 20:
                home_stats[pid].minutes += 3.0
        for pid in away_stats:
            if away_minutes.get(pid, 0) >= 20:
                away_stats[pid].minutes += 3.0

    result.home_score = home_score
    result.away_score = away_score
    result.overtime_periods = ot_periods
    result.home_box = sorted(home_stats.values(), key=lambda s: s.minutes, reverse=True)
    result.away_box = sorted(away_stats.values(), key=lambda s: s.minutes, reverse=True)

    return result


def _team_defense(team: Team, minutes: dict[int, float]) -> float:
    """Weighted average defense rating for a team."""
    total_def = 0.0
    total_min = 0.0
    for p in team.roster:
        mins = minutes.get(p.id, 0)
        if mins > 0:
            total_def += p.ratings["defense"] * mins
            total_min += mins
    return total_def / total_min if total_min > 0 else 50.0


def _simulate_possessions(
    r: random.Random,
    num_possessions: int,
    offense_team: Team,
    offense_players: dict[int, Player],
    offense_stats: dict[int, PlayerGameStats],
    offense_minutes: dict[int, float],
    defense_rating: float,
    is_home: bool,
    playoff: bool,
) -> None:
    """Simulate a set of possessions for one team."""

    # Build weighted player pool based on minutes
    active_ids = [pid for pid, mins in offense_minutes.items() if mins > 0]
    if not active_ids:
        return

    minute_weights = [offense_minutes[pid] for pid in active_ids]

    # Usage weights (who handles the ball / initiates possessions).
    # Playmaking tendency (0.25-2.5) creates dominant assist leaders (10+ APG).
    usage_weights = []
    for pid in active_ids:
        p = offense_players[pid]
        raw = (p.ratings["passing"] * 0.55 + p.ratings["basketball_iq"] * 0.25
               + p.ratings["shooting"] * 0.20)
        tendency = _player_tendency(pid, "playmaking", 0.35, 1.7)
        usage = offense_minutes[pid] * (raw ** 1.8) * tendency
        usage_weights.append(usage)

    # Scoring weights — two tiers:
    # 1) "iso_weights" for self-created shots (unassisted): concentrated on stars
    #    with power 1.8 and wide tendency, creating PPG leaders.
    # 2) "catch_weights" for assisted shots: flatter, spreads scoring to role
    #    players so team PPG reaches ~115 without inflating star PPG.
    iso_weights = []
    catch_weights = []
    for pid in active_ids:
        p = offense_players[pid]
        score_ability = (p.ratings["shooting"] * 0.6 + p.ratings["athleticism"] * 0.3
                         + p.ratings["basketball_iq"] * 0.1)
        tendency = _player_tendency(pid, "scoring", 0.4, 1.6)
        iso = offense_minutes[pid] * (score_ability ** 1.4) * tendency
        iso_weights.append(iso)
        # Catch-and-shoot: flatter than iso, spreads scoring to role players
        catch = offense_minutes[pid] * (score_ability ** 0.5)
        catch_weights.append(catch)

    home_bonus = HOME_COURT_BONUS if is_home else 0.0
    playoff_variance = 1.05 if playoff else 1.0

    for _ in range(num_possessions):
        # Pick ball handler
        handler_id = r.choices(active_ids, weights=usage_weights)[0]
        handler = offense_players[handler_id]
        handler_stats = offense_stats[handler_id]

        # Determine possession outcome
        biq = handler.ratings["basketball_iq"] / 100.0
        roll = r.random()

        # Turnover check
        to_rate = BASE_TURNOVER_RATE * (1.3 - biq * 0.6) * (defense_rating / 55.0)
        if roll < to_rate:
            handler_stats.turnovers += 1
            continue

        roll2 = r.random()

        # Determine shot type
        shooting = handler.ratings["shooting"] / 100.0
        athleticism = handler.ratings["athleticism"] / 100.0

        # Assist chance: targets ~70% of FGM being assisted (NBA-like)
        assist_chance = 0.36 + 0.18 * (handler.ratings["passing"] / 100.0)
        is_assisted = r.random() < assist_chance
        if is_assisted:
            # Pick a different scorer — use catch_weights (flatter) so assists
            # spread scoring to role players, keeping team PPG high without
            # inflating star PPG leaders.
            other_ids = [pid for pid in active_ids if pid != handler_id]
            if other_ids:
                other_weights = [catch_weights[active_ids.index(pid)] for pid in other_ids]
                scorer_id = r.choices(other_ids, weights=other_weights)[0]
            else:
                scorer_id = handler_id
                is_assisted = False
            scorer = offense_players[scorer_id]
            scorer_stats = offense_stats[scorer_id]
            shooter_shooting = scorer.ratings["shooting"] / 100.0
            shooter_ath = scorer.ratings["athleticism"] / 100.0
        else:
            scorer_id = handler_id
            scorer = handler
            scorer_stats = handler_stats
            shooter_shooting = shooting
            shooter_ath = athleticism

        # Free throw trip
        if roll2 < BASE_FT_RATE:
            ft_pct = BASE_FT_PCT + (shooter_shooting - 0.5) * 0.20 + home_bonus * 0.5
            ft_pct = max(0.40, min(0.93, ft_pct))
            # 2 or 3 free throws
            num_fts = r.choices([2, 3], weights=[75, 25])[0]
            made = 0
            for _ in range(num_fts):
                scorer_stats.ft_attempted += 1
                if r.random() < ft_pct:
                    scorer_stats.ft_made += 1
                    made += 1
            scorer_stats.points += made
            if is_assisted and made > 0:
                handler_stats.assists += 1
            continue

        # Three pointer
        if roll2 < BASE_FT_RATE + BASE_THREE_PT_RATE:
            shot_pct = (BASE_THREE_PT_PCT
                        + (shooter_shooting - 0.5) * 0.32  # wider range for 3PT
                        + (defense_rating - 55) * -0.003
                        + home_bonus)
            shot_pct *= playoff_variance
            shot_pct = max(0.18, min(0.48, shot_pct))

            scorer_stats.fg_attempted += 1
            scorer_stats.three_attempted += 1
            if r.random() < shot_pct:
                scorer_stats.fg_made += 1
                scorer_stats.three_made += 1
                scorer_stats.points += 3
                if is_assisted:
                    handler_stats.assists += 1
            continue

        # Two pointer (remainder of possessions)
        shot_pct = (BASE_TWO_PT_PCT
                    + (shooter_shooting - 0.5) * 0.28  # wider range for 2PT
                    + (shooter_ath - 0.5) * 0.15
                    + (defense_rating - 55) * -0.004
                    + home_bonus)
        shot_pct *= playoff_variance
        shot_pct = max(0.28, min(0.68, shot_pct))

        scorer_stats.fg_attempted += 1
        if r.random() < shot_pct:
            scorer_stats.fg_made += 1
            scorer_stats.points += 2
            if is_assisted:
                handler_stats.assists += 1


def _distribute_rebounds(
    r: random.Random,
    home_stats: dict[int, PlayerGameStats],
    away_stats: dict[int, PlayerGameStats],
    home_players: dict[int, Player],
    away_players: dict[int, Player],
    home_minutes: dict[int, float],
    away_minutes: dict[int, float],
) -> None:
    """Distribute rebounds based on missed shots and rebounding ratings."""
    # Total missed shots from each team
    home_misses = sum(s.fg_attempted - s.fg_made for s in home_stats.values())
    away_misses = sum(s.fg_attempted - s.fg_made for s in away_stats.values())

    # When home team misses, away team gets most rebounds (and vice versa)
    _award_rebounds(r, home_misses, away_stats, away_players, away_minutes,
                    home_stats, home_players, home_minutes)
    _award_rebounds(r, away_misses, home_stats, home_players, home_minutes,
                    away_stats, away_players, away_minutes)

    # Also distribute steals and blocks based on defensive ratings
    _award_defensive_stats(r, home_stats, away_stats, home_players, away_players,
                           home_minutes, away_minutes)


def _award_rebounds(
    r: random.Random,
    total_misses: int,
    def_stats: dict[int, PlayerGameStats],
    def_players: dict[int, Player],
    def_minutes: dict[int, float],
    off_stats: dict[int, PlayerGameStats],
    off_players: dict[int, Player],
    off_minutes: dict[int, float],
) -> None:
    """Award rebounds from missed shots."""
    if total_misses == 0:
        return

    # Not every miss becomes a tracked rebound (some go out of bounds etc.)
    tracked_misses = int(total_misses * REBOUND_RECOVERY_RATE)

    # Defensive rebounds (~75% of total)
    def_reb_count = 0
    off_reb_count = 0
    for _ in range(tracked_misses):
        if r.random() < REBOUND_CHANCE_OFFENSIVE:
            off_reb_count += 1
        else:
            def_reb_count += 1

    # Award defensive rebounds — rebound tendency (0.15-2.8) creates glass-cleaners.
    # Target: #1 ~13 RPG, #10 ~9 RPG.
    def_ids = [pid for pid in def_stats if def_minutes.get(pid, 0) > 0]
    if def_ids and def_reb_count > 0:
        reb_weights = []
        for pid in def_ids:
            p = def_players[pid]
            raw = p.ratings["rebounding"] * 0.6 + p.ratings["athleticism"] * 0.4
            pos_bonus = 1.3 if p.position in ("C", "PF") else (0.75 if p.position == "SF" else 0.40)
            tendency = _player_tendency(pid, "rebounding", 0.15, 2.8)
            w = raw * def_minutes.get(pid, 0) * pos_bonus * tendency
            reb_weights.append(max(w, 1.0))
        for _ in range(def_reb_count):
            pid = r.choices(def_ids, weights=reb_weights)[0]
            def_stats[pid].rebounds += 1

    # Award offensive rebounds
    off_ids = [pid for pid in off_stats if off_minutes.get(pid, 0) > 0]
    if off_ids and off_reb_count > 0:
        reb_weights = []
        for pid in off_ids:
            p = off_players[pid]
            raw = p.ratings["rebounding"] * 0.6 + p.ratings["athleticism"] * 0.4
            pos_bonus = 1.3 if p.position in ("C", "PF") else (0.75 if p.position == "SF" else 0.40)
            tendency = _player_tendency(pid, "rebounding", 0.15, 2.8)
            w = raw * off_minutes.get(pid, 0) * pos_bonus * tendency
            reb_weights.append(max(w, 1.0))
        for _ in range(off_reb_count):
            pid = r.choices(off_ids, weights=reb_weights)[0]
            off_stats[pid].rebounds += 1
            off_stats[pid].offensive_rebounds += 1


def _award_defensive_stats(
    r: random.Random,
    home_stats: dict[int, PlayerGameStats],
    away_stats: dict[int, PlayerGameStats],
    home_players: dict[int, Player],
    away_players: dict[int, Player],
    home_minutes: dict[int, float],
    away_minutes: dict[int, float],
) -> None:
    """Award steals and blocks based on turnovers and missed shots."""
    # Steals: fraction of opponent turnovers become steals for defenders
    _award_steals_blocks(r, home_stats, home_players, home_minutes,
                         sum(s.turnovers for s in away_stats.values()),
                         sum(s.fg_attempted - s.fg_made for s in away_stats.values()))
    _award_steals_blocks(r, away_stats, away_players, away_minutes,
                         sum(s.turnovers for s in home_stats.values()),
                         sum(s.fg_attempted - s.fg_made for s in home_stats.values()))


def _award_steals_blocks(
    r: random.Random,
    def_stats: dict[int, PlayerGameStats],
    def_players: dict[int, Player],
    def_minutes: dict[int, float],
    opponent_turnovers: int,
    opponent_misses: int,
) -> None:
    """Award steals and blocks to defensive team."""
    def_ids = [pid for pid in def_stats if def_minutes.get(pid, 0) > 0]
    if not def_ids:
        return

    # Steal weights — wide tendency (0.1-5.0) creates steal specialists.
    # Target: #1 ~2.0 SPG, #10 ~1.5 SPG.
    steal_weights = []
    for pid in def_ids:
        p = def_players[pid]
        raw = (p.ratings["defense"] * 0.5 + p.ratings["athleticism"] * 0.3
               + p.ratings["basketball_iq"] * 0.2)
        pos_bonus = 1.5 if p.position in ("PG", "SG") else (1.0 if p.position == "SF" else 0.7)
        tendency = _player_tendency(pid, "steals", 0.1, 5.0)
        w = (raw ** 2.0) * def_minutes.get(pid, 0) * pos_bonus * (tendency ** 2)
        steal_weights.append(max(w, 1.0))

    # Steals
    num_steals = int(opponent_turnovers * STEAL_CHANCE_PER_TO)
    for _ in range(num_steals):
        pid = r.choices(def_ids, weights=steal_weights)[0]
        def_stats[pid].steals += 1

    # Blocks — two-source approach for realistic spread.
    # Source 1: Base team blocks (~2-3 per game), distributed by position/skill.
    #   This ensures every team's center gets ~1 BPG floor.
    # Source 2: Per-player elite blocks for standout shot-blockers.
    #   This adds 1-3 extra BPG for the league's best blockers.
    # Target: #1 ~3.2 BPG, #10 ~1.4 BPG.
    two_pt_misses = int(opponent_misses * 0.6)

    # Source 1: Base team blocks (distributed by pool)
    base_block_rate = 0.030  # ~0.6 blocks per team per game
    num_base_blocks = 0
    for _ in range(two_pt_misses):
        if r.random() < base_block_rate:
            num_base_blocks += 1

    block_weights = []
    for pid in def_ids:
        p = def_players[pid]
        pos_mult = 3.0 if p.position == "C" else (0.6 if p.position == "PF" else (0.04 if p.position == "SF" else 0.005))
        raw = (p.ratings["defense"] * 0.5 + p.ratings["athleticism"] * 0.5) / 100.0
        w = (raw ** 1.5) * def_minutes.get(pid, 0) * pos_mult
        block_weights.append(max(w, 0.01))

    for _ in range(num_base_blocks):
        pid = r.choices(def_ids, weights=block_weights)[0]
        def_stats[pid].blocks += 1

    # Source 2: Per-player elite blocks (only significant for standout blockers)
    for pid in def_ids:
        p = def_players[pid]
        pos_mult = 1.0 if p.position == "C" else (0.15 if p.position == "PF" else 0.0)
        if pos_mult == 0.0:
            continue
        raw = (p.ratings["defense"] * 0.5 + p.ratings["athleticism"] * 0.5) / 100.0
        tendency = _player_tendency(pid, "blocks", 0.01, 10.0)
        minutes_frac = def_minutes.get(pid, 0) / 240.0
        # Only high-tendency players generate meaningful extra blocks
        block_rate = 0.028 * raw * pos_mult * tendency * minutes_frac * 5.0
        block_rate = min(block_rate, 0.15)
        for _ in range(two_pt_misses):
            if r.random() < block_rate:
                def_stats[pid].blocks += 1


# ── Utility: accumulate game stats into season stats ────────────────

def accumulate_player_stats(player: Player, game_stats: PlayerGameStats) -> None:
    """Add a game's stats to a player's season totals."""
    s = player.season_stats
    s.games += 1
    s.minutes += game_stats.minutes
    s.points += game_stats.points
    s.rebounds += game_stats.rebounds
    s.assists += game_stats.assists
    s.steals += game_stats.steals
    s.blocks += game_stats.blocks
    s.turnovers += game_stats.turnovers
    s.fg_made += game_stats.fg_made
    s.fg_attempted += game_stats.fg_attempted
    s.three_made += game_stats.three_made
    s.three_attempted += game_stats.three_attempted
    s.ft_made += game_stats.ft_made
    s.ft_attempted += game_stats.ft_attempted
