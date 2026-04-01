"""Terminal UI — menus, tables, display helpers."""

from __future__ import annotations

import os
from typing import Optional

from basketball_gm.league import League, ScheduledGame
from basketball_gm.team import Team
from basketball_gm.player import Player
from basketball_gm.game_sim import GameResult
from basketball_gm.stats import format_box_score, get_league_leaders


# ── Input helpers ───────────────────────────────────────────────────


def clear_screen() -> None:
    os.system("clear" if os.name != "nt" else "cls")


def get_choice(prompt: str, min_val: int, max_val: int) -> int:
    """Get a validated integer choice from the user."""
    while True:
        try:
            val = int(input(prompt))
            if min_val <= val <= max_val:
                return val
            print(f"  Please enter a number between {min_val} and {max_val}.")
        except ValueError:
            print("  Invalid input. Please enter a number.")
        except (EOFError, KeyboardInterrupt):
            print()
            return min_val


def get_yes_no(prompt: str) -> bool:
    """Get a yes/no answer."""
    while True:
        try:
            val = input(prompt).strip().lower()
            if val in ("y", "yes"):
                return True
            if val in ("n", "no"):
                return False
            print("  Please enter y or n.")
        except (EOFError, KeyboardInterrupt):
            print()
            return False


def press_enter() -> None:
    try:
        input("\n  Press Enter to continue...")
    except (EOFError, KeyboardInterrupt):
        pass


# ── Standings ───────────────────────────────────────────────────────


def print_standings(league: League, conference: Optional[str] = None) -> None:
    """Display conference standings."""
    conferences = [conference] if conference else ["Eastern", "Western"]

    for conf in conferences:
        teams = league.standings(conf)
        print(f"\n  {'=' * 52}")
        print(f"  {conf} Conference Standings")
        print(f"  {'=' * 52}")
        print(f"  {'#':>3s}  {'TEAM':<26s} {'W':>3s} {'L':>3s} {'PCT':>6s} {'GB':>5s}")
        print(f"  {'-' * 52}")

        if teams:
            leader_pct = teams[0].win_pct

        current_div = None
        for i, team in enumerate(teams, 1):
            # Games behind
            if i == 1:
                gb_str = "  -  "
            else:
                gb = (leader_pct - team.win_pct) * (team.wins + team.losses) / 2
                if gb == 0:
                    gb_str = "  -  "
                else:
                    gb_str = f"{gb:5.1f}"

            marker = " *" if team.id == league.user_team_id else "  "
            print(f"  {i:3d}  {team.full_name:<26s} {team.wins:3d} {team.losses:3d} "
                  f"{team.win_pct:6.3f} {gb_str}{marker}")

    print()


# ── Roster ──────────────────────────────────────────────────────────


def print_roster(team: Team, detailed: bool = False) -> None:
    """Display a team's roster."""
    print(f"\n  {'=' * 72}")
    print(f"  {team.full_name} ({team.record})  OVR: {team.team_overall()}")
    print(f"  Payroll: {team.payroll_str()}  Cap Space: ${team.cap_space / 1_000_000:.1f}M")
    print(f"  {'=' * 72}")

    if detailed:
        print(f"  {'POS':<4s} {'NAME':<22s} {'OVR':>4s} {'POT':>4s} {'AGE':>4s} "
              f"{'HT':>6s} {'WT':>4s} {'SAL':>8s} {'YRS':>4s}")
    else:
        print(f"  {'POS':<4s} {'NAME':<22s} {'OVR':>4s} {'AGE':>4s} "
              f"{'PPG':>5s} {'RPG':>5s} {'APG':>5s} {'SAL':>8s} {'YRS':>4s}")

    print(f"  {'-' * 72}")

    starters = team.get_starters()
    starter_ids = {p.id for p in starters}

    # Print starters first
    for p in starters:
        _print_player_row(p, detailed, is_starter=True)

    print(f"  {'-' * 72}")

    # Bench
    bench = [p for p in team.roster if p.id not in starter_ids]
    bench.sort(key=lambda p: p.overall, reverse=True)
    for p in bench:
        _print_player_row(p, detailed, is_starter=False)

    print()


def _print_player_row(player: Player, detailed: bool, is_starter: bool) -> None:
    tag = ">" if is_starter else " "
    if detailed:
        print(f" {tag}{player.position:<4s} {player.name:<22s} {player.overall:4d} "
              f"{player.potential:4d} {player.age:4d} {player.height_str:>6s} "
              f"{player.weight:4d} {player.salary_str():>8s} {player.contract.years:4d}")
    else:
        s = player.season_stats
        print(f" {tag}{player.position:<4s} {player.name:<22s} {player.overall:4d} "
              f"{player.age:4d} {s.ppg:5.1f} {s.rpg:5.1f} {s.apg:5.1f} "
              f"{player.salary_str():>8s} {player.contract.years:4d}")


# ── Player Detail ───────────────────────────────────────────────────


def print_player_detail(player: Player) -> None:
    """Show detailed player info including ratings."""
    print(f"\n  {'=' * 50}")
    print(f"  {player.name}")
    print(f"  {player.position} | {player.height_str} {player.weight} lbs | Age {player.age}")
    print(f"  Overall: {player.overall}  Potential: {player.potential}")
    print(f"  Contract: {player.salary_str()} x {player.contract.years} yr(s)")
    print(f"  {'=' * 50}")
    print(f"  Ratings:")
    for attr in ["shooting", "defense", "rebounding", "passing", "athleticism", "basketball_iq"]:
        bar = "#" * (player.ratings[attr] // 5)
        print(f"    {attr:<15s} {player.ratings[attr]:3d}  {bar}")

    s = player.season_stats
    if s.games > 0:
        print(f"\n  Season Stats ({s.games} GP):")
        print(f"    PPG: {s.ppg:.1f}  RPG: {s.rpg:.1f}  APG: {s.apg:.1f}")
        print(f"    SPG: {s.spg:.1f}  BPG: {s.bpg:.1f}  MPG: {s.mpg:.1f}")
        print(f"    FG: {s.fg_pct*100:.1f}%  3PT: {s.three_pct*100:.1f}%  FT: {s.ft_pct*100:.1f}%")
    print()


# ── Box Score ───────────────────────────────────────────────────────


def print_game_result(result: GameResult, league: League) -> None:
    """Print a box score for a game."""
    home = league.get_team(result.home_team_id)
    away = league.get_team(result.away_team_id)
    if not home or not away:
        return
    home_players = {p.id: p for p in home.roster}
    away_players = {p.id: p for p in away.roster}
    print(format_box_score(result, home.full_name, away.full_name, home_players, away_players))


def print_score_summary(result: GameResult, league: League) -> None:
    """Print a single-line score summary."""
    home = league.get_team(result.home_team_id)
    away = league.get_team(result.away_team_id)
    if not home or not away:
        return
    winner = ">" if result.winner_id == league.user_team_id else " "
    ot = f" OT{result.overtime_periods}" if result.overtime_periods else ""
    if result.home_score > result.away_score:
        print(f" {winner} {home.abbr:4s} {result.home_score:3d}  -  {away.abbr:4s} {result.away_score:3d}{ot}")
    else:
        print(f" {winner} {away.abbr:4s} {result.away_score:3d}  -  {home.abbr:4s} {result.home_score:3d}{ot}")


# ── League Leaders ──────────────────────────────────────────────────


def print_all_leaders(league: League, min_games: int = 5) -> None:
    """Print league leaders in major categories."""
    all_players = league.all_players()
    team_lookup = {}
    for t in league.teams:
        for p in t.roster:
            team_lookup[p.id] = t.abbr

    categories = [
        ("ppg", "Points Per Game"),
        ("rpg", "Rebounds Per Game"),
        ("apg", "Assists Per Game"),
        ("spg", "Steals Per Game"),
        ("bpg", "Blocks Per Game"),
    ]

    for cat, label in categories:
        leaders = get_league_leaders(all_players, cat, top_n=10, min_games=min_games)
        if not leaders:
            continue
        is_pct = cat.endswith("_pct")
        print(f"\n  === {label} ===")
        print(f"  {'#':>3s} {'NAME':<24s} {'TEAM':>4s} {'POS':>4s} {'GP':>3s} {'':>7s}")
        print(f"  {'-' * 50}")
        for i, (p, val) in enumerate(leaders, 1):
            team_str = team_lookup.get(p.id, "???")
            val_str = f"{val * 100:.1f}%" if is_pct else f"{val:.1f}"
            print(f"  {i:3d} {p.name:<24s} {team_str:>4s} {p.position:>4s} "
                  f"{p.season_stats.games:3d} {val_str:>7s}")


# ── Schedule Display ────────────────────────────────────────────────


def print_upcoming_schedule(league: League, schedule: list[ScheduledGame],
                            team_id: int, num_games: int = 10) -> None:
    """Show upcoming games for a team."""
    upcoming = [g for g in schedule
                if not g.played and (g.home_id == team_id or g.away_id == team_id)]

    print(f"\n  Upcoming Games:")
    print(f"  {'DAY':>5s}  {'OPPONENT':<26s} {'LOC':>4s}")
    print(f"  {'-' * 40}")

    for g in upcoming[:num_games]:
        if g.home_id == team_id:
            opp = league.get_team(g.away_id)
            loc = "HOME"
        else:
            opp = league.get_team(g.home_id)
            loc = "AWAY"
        opp_name = opp.full_name if opp else "???"
        opp_rec = f" ({opp.record})" if opp else ""
        print(f"  {g.day + 1:5d}  {opp_name + opp_rec:<26s} {loc:>4s}")

    remaining = len(upcoming) - num_games
    if remaining > 0:
        print(f"  ... and {remaining} more games")
    print()


def print_recent_results(league: League, results: list[GameResult],
                         team_id: int, num_games: int = 10) -> None:
    """Show recent results for a team."""
    team_results = [r for r in results
                    if r.home_team_id == team_id or r.away_team_id == team_id]

    recent = team_results[-num_games:]
    if not recent:
        print("\n  No games played yet.")
        return

    print(f"\n  Recent Results:")
    print(f"  {'RESULT':>7s}  {'OPPONENT':<26s} {'SCORE':>10s}")
    print(f"  {'-' * 48}")

    for r in reversed(recent):
        if r.home_team_id == team_id:
            opp = league.get_team(r.away_team_id)
            my_score = r.home_score
            opp_score = r.away_score
            loc = "vs"
        else:
            opp = league.get_team(r.home_team_id)
            my_score = r.away_score
            opp_score = r.home_score
            loc = "@"

        result_str = "  W" if my_score > opp_score else "  L"
        opp_name = f"{loc} {opp.full_name}" if opp else "???"
        ot = f" OT{r.overtime_periods}" if r.overtime_periods else ""
        print(f"  {result_str:>7s}  {opp_name:<26s} {my_score:3d}-{opp_score:3d}{ot}")

    print()


# ── Team Selection ──────────────────────────────────────────────────


def team_selection_menu(league: League) -> int:
    """Let the user pick their team. Returns team_id."""
    print("\n  Choose your franchise:")
    print(f"\n  {'#':>3s}  {'TEAM':<28s} {'CONF':<8s} {'DIV':<12s} {'OVR':>4s}")
    print(f"  {'-' * 60}")

    for i, team in enumerate(league.teams, 1):
        print(f"  {i:3d}  {team.full_name:<28s} {team.conference:<8s} "
              f"{team.division:<12s} {team.team_overall():4d}")

    choice = get_choice("\n  Select team (1-30): ", 1, 30)
    return league.teams[choice - 1].id


# ── Main Season Menu ────────────────────────────────────────────────


def season_menu(league: League, season) -> str:
    """Display the main season menu and return the user's choice."""
    team = league.user_team
    if not team:
        return "quit"

    games_played = season.games_played
    total_games = len(season.schedule)
    pct_done = games_played / total_games * 100 if total_games else 0

    print(f"\n  {'=' * 58}")
    print(f"  Basketball GM - Season {league.season}")
    print(f"  {team.full_name} ({team.record})  OVR: {team.team_overall()}")
    print(f"  Day {season.current_day + 1}  |  {games_played}/{total_games} games ({pct_done:.0f}%)")
    print(f"  {'=' * 58}")

    options = [
        "View Standings",
        "View My Roster",
        "View League Leaders",
        "Simulate One Day",
        "Simulate One Week",
        "Simulate to My Next Game",
        "Simulate Rest of Season",
        "View Upcoming Schedule",
        "View Recent Results",
        "View Other Team",
        "View Player Detail",
    ]

    for i, opt in enumerate(options, 1):
        print(f"  {i:2d}. {opt}")

    choice = get_choice("\n  Enter choice: ", 1, len(options))

    return [
        "standings", "roster", "leaders", "sim_day", "sim_week",
        "sim_next", "sim_rest", "schedule", "results", "other_team",
        "player_detail",
    ][choice - 1]


def view_other_team(league: League) -> None:
    """Browse another team's roster."""
    print("\n  Select a team:")
    for i, team in enumerate(league.teams, 1):
        print(f"  {i:3d}  {team.abbr:4s} {team.full_name:<28s} ({team.record})")

    choice = get_choice("\n  Team #: ", 1, 30)
    team = league.teams[choice - 1]
    print_roster(team, detailed=True)


def view_player_detail_menu(league: League) -> None:
    """Search and view a player's detailed stats."""
    team = league.user_team
    if not team:
        return

    print("\n  Select from your roster:")
    for i, p in enumerate(team.roster, 1):
        print(f"  {i:3d}  {p.position:<4s} {p.name:<24s} OVR:{p.overall:3d}")

    choice = get_choice(f"\n  Player # (1-{len(team.roster)}): ", 1, len(team.roster))
    print_player_detail(team.roster[choice - 1])
