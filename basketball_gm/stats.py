"""Stats tracking, league leaders, and formatting helpers."""

from __future__ import annotations

from typing import Optional

from basketball_gm.player import Player
from basketball_gm.game_sim import PlayerGameStats, GameResult


def format_box_score(
    result: GameResult,
    home_team_name: str,
    away_team_name: str,
    home_players: dict[int, Player],
    away_players: dict[int, Player],
) -> str:
    """Format a game result as a readable box score string."""
    lines = []
    ot_str = f" (OT{result.overtime_periods})" if result.overtime_periods else ""
    lines.append(f"{'=' * 78}")
    lines.append(f"  {away_team_name} {result.away_score}  @  {home_team_name} {result.home_score}{ot_str}")
    lines.append(f"{'=' * 78}")

    for label, box, players in [
        (home_team_name, result.home_box, home_players),
        (away_team_name, result.away_box, away_players),
    ]:
        lines.append(f"\n  {label}")
        lines.append(f"  {'NAME':<22s} {'MIN':>4s} {'PTS':>4s} {'REB':>4s} {'AST':>4s} "
                      f"{'STL':>4s} {'BLK':>4s} {'TO':>3s} {'FG':>7s} {'3PT':>7s} {'FT':>7s}")
        lines.append(f"  {'-' * 74}")
        for s in box:
            if s.minutes < 1:
                continue
            p = players.get(s.player_id)
            name = p.name[:21] if p else f"Player {s.player_id}"
            fg = f"{s.fg_made}-{s.fg_attempted}"
            thr = f"{s.three_made}-{s.three_attempted}"
            ft = f"{s.ft_made}-{s.ft_attempted}"
            lines.append(
                f"  {name:<22s} {s.minutes:4.0f} {s.points:4d} {s.rebounds:4d} {s.assists:4d} "
                f"{s.steals:4d} {s.blocks:4d} {s.turnovers:3d} {fg:>7s} {thr:>7s} {ft:>7s}"
            )
        # Team totals
        total_pts = sum(s.points for s in box)
        total_reb = sum(s.rebounds for s in box)
        total_ast = sum(s.assists for s in box)
        total_stl = sum(s.steals for s in box)
        total_blk = sum(s.blocks for s in box)
        total_to = sum(s.turnovers for s in box)
        total_fgm = sum(s.fg_made for s in box)
        total_fga = sum(s.fg_attempted for s in box)
        total_3m = sum(s.three_made for s in box)
        total_3a = sum(s.three_attempted for s in box)
        total_ftm = sum(s.ft_made for s in box)
        total_fta = sum(s.ft_attempted for s in box)
        fg_str = f"{total_fgm}-{total_fga}"
        thr_str = f"{total_3m}-{total_3a}"
        ft_str = f"{total_ftm}-{total_fta}"
        lines.append(f"  {'-' * 74}")
        lines.append(
            f"  {'TOTAL':<22s} {'':>4s} {total_pts:4d} {total_reb:4d} {total_ast:4d} "
            f"{total_stl:4d} {total_blk:4d} {total_to:3d} {fg_str:>7s} {thr_str:>7s} {ft_str:>7s}"
        )
        fg_pct = total_fgm / total_fga * 100 if total_fga else 0
        three_pct = total_3m / total_3a * 100 if total_3a else 0
        ft_pct = total_ftm / total_fta * 100 if total_fta else 0
        lines.append(f"  Shooting: FG {fg_pct:.1f}%  3PT {three_pct:.1f}%  FT {ft_pct:.1f}%")

    return "\n".join(lines)


def get_league_leaders(
    all_players: list[Player],
    category: str = "ppg",
    top_n: int = 10,
    min_games: int = 5,
) -> list[tuple[Player, float]]:
    """Get top players in a stat category. Returns (player, value) pairs."""
    eligible = [p for p in all_players if p.season_stats.games >= min_games]

    stat_getters = {
        "ppg": lambda p: p.season_stats.ppg,
        "rpg": lambda p: p.season_stats.rpg,
        "apg": lambda p: p.season_stats.apg,
        "spg": lambda p: p.season_stats.spg,
        "bpg": lambda p: p.season_stats.bpg,
        "mpg": lambda p: p.season_stats.mpg,
        "fg_pct": lambda p: p.season_stats.fg_pct,
        "three_pct": lambda p: p.season_stats.three_pct,
        "ft_pct": lambda p: p.season_stats.ft_pct,
    }

    getter = stat_getters.get(category, stat_getters["ppg"])
    eligible.sort(key=getter, reverse=True)

    return [(p, getter(p)) for p in eligible[:top_n]]


def format_league_leaders(
    leaders: list[tuple[Player, float]],
    category: str,
    team_lookup: Optional[dict[int, str]] = None,
) -> str:
    """Format league leaders as a displayable string."""
    cat_labels = {
        "ppg": "Points Per Game", "rpg": "Rebounds Per Game",
        "apg": "Assists Per Game", "spg": "Steals Per Game",
        "bpg": "Blocks Per Game", "mpg": "Minutes Per Game",
        "fg_pct": "Field Goal %", "three_pct": "Three Point %",
        "ft_pct": "Free Throw %",
    }
    is_pct = category in ("fg_pct", "three_pct", "ft_pct")
    label = cat_labels.get(category, category)

    lines = [f"\n  === {label} ==="]
    lines.append(f"  {'#':>3s} {'NAME':<24s} {'TEAM':>5s} {'POS':>4s} {'GP':>3s} {'VALUE':>7s}")
    lines.append(f"  {'-' * 50}")

    for i, (p, val) in enumerate(leaders, 1):
        team_str = team_lookup.get(p.id, "???") if team_lookup else "---"
        if is_pct:
            val_str = f"{val * 100:.1f}%"
        else:
            val_str = f"{val:.1f}"
        lines.append(
            f"  {i:3d} {p.name:<24s} {team_str:>5s} {p.position:>4s} "
            f"{p.season_stats.games:3d} {val_str:>7s}"
        )

    return "\n".join(lines)
