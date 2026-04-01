"""Player development — offseason progression, regression, and retirement."""

from __future__ import annotations

import random
from typing import Optional

from basketball_gm.config import ATTRIBUTES
from basketball_gm.league import League
from basketball_gm.player import Player, generate_player


def develop_players(league: League, rng: Optional[random.Random] = None) -> dict[str, list]:
    """Run offseason player development for all players.

    Returns dict with 'improved', 'declined', 'retired' player lists.
    """
    r = rng or random.Random()
    results = {"improved": [], "declined": [], "retired": []}

    for team in league.teams:
        to_retire = []
        for player in team.roster:
            old_ovr = player.overall
            _develop_player(player, r)
            new_ovr = player.overall

            if _should_retire(player, r):
                to_retire.append(player)
                results["retired"].append((player.name, player.age, team.abbr))
            elif new_ovr > old_ovr:
                results["improved"].append((player.name, old_ovr, new_ovr, team.abbr))
            elif new_ovr < old_ovr:
                results["declined"].append((player.name, old_ovr, new_ovr, team.abbr))

            player.age += 1
            player.years_pro += 1

        # Remove retired players
        for player in to_retire:
            team.remove_player(player.id)

    # Also age free agents
    to_remove = []
    for player in league.free_agents:
        _develop_player(player, r)
        player.age += 1
        player.years_pro += 1
        if _should_retire(player, r):
            to_remove.append(player.id)
            results["retired"].append((player.name, player.age, "FA"))

    league.free_agents = [p for p in league.free_agents if p.id not in to_remove]

    # Generate replacement free agents to keep the pool fresh
    for _ in range(15):
        tier = r.choice(["rotation", "bench", "bench", "scrub", "scrub"])
        new_player = generate_player(tier=tier, rng=r)
        new_player.age = r.randint(22, 30)
        league.free_agents.append(new_player)

    return results


def _develop_player(player: Player, rng: random.Random) -> None:
    """Adjust a player's ratings based on age and potential."""
    age = player.age
    ovr = player.overall
    pot = player.potential

    for attr in ATTRIBUTES:
        current = player.ratings[attr]
        change = 0

        if age <= 22:
            # Young: strong growth toward potential
            room = pot - ovr
            if room > 0:
                change = rng.randint(1, min(6, max(1, room // 4)))
            else:
                change = rng.randint(-1, 2)
        elif age <= 26:
            # Approaching prime: moderate growth
            room = pot - ovr
            if room > 0:
                change = rng.randint(0, min(4, max(1, room // 5)))
            else:
                change = rng.randint(-1, 1)
        elif age <= 29:
            # Prime: mostly stable
            change = rng.randint(-1, 1)
        elif age <= 32:
            # Early decline
            change = rng.randint(-3, 0)
        elif age <= 35:
            # Moderate decline
            change = rng.randint(-5, -1)
        else:
            # Steep decline
            change = rng.randint(-7, -2)

        # Random variance: occasional big jumps or drops
        if rng.random() < 0.05:
            change += rng.choice([-5, -3, 3, 5])

        player.ratings[attr] = max(15, min(99, current + change))

    # Potential slowly converges toward current overall
    if age >= 28:
        player.potential = max(player.overall, player.potential - rng.randint(0, 3))


def _should_retire(player: Player, rng: random.Random) -> bool:
    """Determine if a player retires."""
    if player.age >= 40:
        return True
    if player.age >= 38 and rng.random() < 0.7:
        return True
    if player.age >= 36 and player.overall < 40:
        return True
    if player.age >= 34 and player.overall < 35:
        return True
    if player.overall < 25:
        return True
    return False


# ── Awards ──────────────────────────────────────────────────────────


def compute_awards(league: League) -> dict:
    """Compute end-of-season awards. Returns dict of award categories."""
    all_players = []
    team_lookup = {}
    for t in league.teams:
        for p in t.roster:
            all_players.append(p)
            team_lookup[p.id] = t.abbr

    # Filter to players with enough games
    qualified = [p for p in all_players if p.season_stats.games >= 40]

    awards = {}

    # MVP: best overall season
    if qualified:
        mvp_candidates = sorted(qualified, key=lambda p: (
            p.season_stats.ppg * 1.0
            + p.season_stats.rpg * 0.8
            + p.season_stats.apg * 1.0
            + p.season_stats.spg * 1.5
            + p.season_stats.bpg * 1.2
        ), reverse=True)
        mvp = mvp_candidates[0]
        awards["MVP"] = {
            "name": mvp.name, "team": team_lookup.get(mvp.id, "???"),
            "stats": f"{mvp.season_stats.ppg:.1f} PPG, {mvp.season_stats.rpg:.1f} RPG, {mvp.season_stats.apg:.1f} APG",
        }

    # DPOY: best defensive season
    if qualified:
        dpoy_candidates = sorted(qualified, key=lambda p: (
            p.season_stats.spg * 2.0
            + p.season_stats.bpg * 2.5
            + p.season_stats.rpg * 0.5
            + p.ratings["defense"] * 0.02
        ), reverse=True)
        dpoy = dpoy_candidates[0]
        awards["DPOY"] = {
            "name": dpoy.name, "team": team_lookup.get(dpoy.id, "???"),
            "stats": f"{dpoy.season_stats.spg:.1f} SPG, {dpoy.season_stats.bpg:.1f} BPG, {dpoy.season_stats.rpg:.1f} RPG",
        }

    # ROY: best rookie
    rookies = [p for p in qualified if p.years_pro <= 1]
    if rookies:
        roy_candidates = sorted(rookies, key=lambda p: (
            p.season_stats.ppg + p.season_stats.rpg * 0.5 + p.season_stats.apg * 0.5
        ), reverse=True)
        roy = roy_candidates[0]
        awards["ROY"] = {
            "name": roy.name, "team": team_lookup.get(roy.id, "???"),
            "stats": f"{roy.season_stats.ppg:.1f} PPG, {roy.season_stats.rpg:.1f} RPG, {roy.season_stats.apg:.1f} APG",
        }

    # All-NBA First Team (best 2 guards, 2 forwards, 1 center)
    all_nba = _select_all_nba_team(qualified, team_lookup)
    if all_nba:
        awards["All-NBA First Team"] = all_nba

    # Scoring champion
    if qualified:
        scoring_champ = max(qualified, key=lambda p: p.season_stats.ppg)
        awards["Scoring Champion"] = {
            "name": scoring_champ.name,
            "team": team_lookup.get(scoring_champ.id, "???"),
            "stats": f"{scoring_champ.season_stats.ppg:.1f} PPG",
        }

    return awards


def _select_all_nba_team(players: list[Player], team_lookup: dict) -> list[dict]:
    """Select All-NBA First Team: 2 guards, 2 forwards, 1 center."""
    if not players:
        return []

    def score(p: Player) -> float:
        return (p.season_stats.ppg + p.season_stats.rpg * 0.7
                + p.season_stats.apg * 0.8 + p.season_stats.spg * 1.0
                + p.season_stats.bpg * 1.0)

    guards = sorted([p for p in players if p.position in ("PG", "SG")],
                     key=score, reverse=True)
    forwards = sorted([p for p in players if p.position in ("SF", "PF")],
                       key=score, reverse=True)
    centers = sorted([p for p in players if p.position == "C"],
                      key=score, reverse=True)

    team = []
    for p in guards[:2]:
        team.append({"name": p.name, "position": p.position,
                      "team": team_lookup.get(p.id, "???"),
                      "stats": f"{p.season_stats.ppg:.1f}/{p.season_stats.rpg:.1f}/{p.season_stats.apg:.1f}"})
    for p in forwards[:2]:
        team.append({"name": p.name, "position": p.position,
                      "team": team_lookup.get(p.id, "???"),
                      "stats": f"{p.season_stats.ppg:.1f}/{p.season_stats.rpg:.1f}/{p.season_stats.apg:.1f}"})
    for p in centers[:1]:
        team.append({"name": p.name, "position": p.position,
                      "team": team_lookup.get(p.id, "???"),
                      "stats": f"{p.season_stats.ppg:.1f}/{p.season_stats.rpg:.1f}/{p.season_stats.apg:.1f}"})

    return team


def print_awards(awards: dict) -> None:
    """Display end-of-season awards."""
    print(f"\n  {'=' * 55}")
    print(f"  SEASON AWARDS")
    print(f"  {'=' * 55}")

    for award, data in awards.items():
        if award == "All-NBA First Team":
            print(f"\n  {award}:")
            for entry in data:
                print(f"    {entry['position']:<4s} {entry['name']:<24s} ({entry['team']}) {entry['stats']}")
        else:
            print(f"\n  {award}: {data['name']} ({data['team']})")
            print(f"    {data['stats']}")

    print()
