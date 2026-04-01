"""Draft system — draft class generation, lottery, and draft event."""

from __future__ import annotations

import random
from dataclasses import dataclass, field
from typing import Optional

from basketball_gm.config import DRAFT_ROUNDS, POSITIONS
from basketball_gm.league import League
from basketball_gm.player import Player, Contract, generate_rookie, get_rookie_salary
from basketball_gm.team import Team


# Draft lottery odds for bottom 14 teams (NBA-style)
LOTTERY_ODDS = [140, 140, 140, 125, 105, 90, 75, 60, 45, 30, 20, 15, 10, 5]


@dataclass
class DraftProspect:
    """A prospect with scouted (noisy) ratings."""
    player: Player
    scouted_overall: int = 0  # what scouts think the overall is
    scouting_report: str = ""

    def to_dict(self) -> dict:
        return {
            "player": self.player.to_dict(),
            "scouted_overall": self.scouted_overall,
            "scouting_report": self.scouting_report,
        }


@dataclass
class DraftPick:
    """A draft pick (round, pick number, owning team)."""
    round: int
    pick: int
    team_id: int

    def to_dict(self) -> dict:
        return {"round": self.round, "pick": self.pick, "team_id": self.team_id}

    @classmethod
    def from_dict(cls, d: dict) -> DraftPick:
        return cls(**d)


@dataclass
class DraftResult:
    """Record of a completed draft."""
    picks: list[dict] = field(default_factory=list)  # [{pick, round, team_abbr, player_name, overall}]

    def to_dict(self) -> dict:
        return {"picks": self.picks}


def generate_draft_class(
    num_players: int = 60,
    rng: Optional[random.Random] = None,
) -> list[DraftProspect]:
    """Generate a draft class of prospects with scouting reports."""
    r = rng or random.Random()

    # Tier distribution for a draft class
    tiers = (
        ["star"] * 3
        + ["starter"] * 8
        + ["rotation"] * 20
        + ["bench"] * 20
        + ["scrub"] * 9
    )
    r.shuffle(tiers)

    prospects = []
    for i in range(num_players):
        tier = tiers[i] if i < len(tiers) else "scrub"
        player = generate_rookie(tier=tier, rng=r)

        # Scouting: add noise to perceived overall
        noise = r.randint(-8, 8)
        scouted = max(25, min(99, player.overall + noise))

        report = _generate_scouting_report(player, r)

        prospects.append(DraftProspect(
            player=player,
            scouted_overall=scouted,
            scouting_report=report,
        ))

    # Sort by scouted overall (best prospects first)
    prospects.sort(key=lambda p: p.scouted_overall, reverse=True)
    return prospects


def _generate_scouting_report(player: Player, rng: random.Random) -> str:
    """Generate a brief scouting report."""
    strengths = []
    weaknesses = []

    for attr, val in player.ratings.items():
        if val >= 75:
            strengths.append(attr.replace("_", " "))
        elif val <= 40:
            weaknesses.append(attr.replace("_", " "))

    templates = [
        "{pos} with {strength}",
        "Promising {pos}, {strength} stands out",
        "Raw {pos} with upside in {strength}",
        "Polished {pos}, strong {strength}",
        "Athletic {pos} who excels at {strength}",
    ]

    pos_names = {"PG": "point guard", "SG": "shooting guard", "SF": "small forward",
                 "PF": "power forward", "C": "center"}
    pos = pos_names.get(player.position, "player")

    if strengths:
        strength = rng.choice(strengths)
        report = rng.choice(templates).format(pos=pos, strength=strength)
    else:
        report = f"Developmental {pos} project"

    if weaknesses and rng.random() < 0.5:
        report += f". Needs work on {rng.choice(weaknesses)}"

    return report


def run_draft_lottery(
    league: League,
    rng: Optional[random.Random] = None,
) -> list[int]:
    """Determine draft order via lottery. Returns list of team_ids."""
    r = rng or random.Random()

    # Sort teams by record (worst to best)
    all_teams = sorted(league.teams, key=lambda t: (t.win_pct, t.wins))

    # Bottom 14 teams enter lottery
    lottery_teams = all_teams[:14]
    non_lottery = all_teams[14:]

    # Simulate lottery for top 4 picks
    remaining = list(range(14))
    weights = list(LOTTERY_ODDS)
    top_picks = []

    for _ in range(4):
        if not remaining:
            break
        pick_weights = [weights[i] for i in remaining]
        chosen_idx = r.choices(remaining, weights=pick_weights)[0]
        top_picks.append(lottery_teams[chosen_idx].id)
        remaining.remove(chosen_idx)

    # Remaining lottery teams in reverse record order
    rest_lottery = [lottery_teams[i].id for i in remaining]

    # Non-lottery teams by record (worst to best, i.e., 15th pick onward)
    non_lottery_ids = [t.id for t in non_lottery]

    # First round order
    first_round = top_picks + rest_lottery + non_lottery_ids

    return first_round


def run_draft(
    league: League,
    draft_class: list[DraftProspect],
    draft_order: list[int],
    rng: Optional[random.Random] = None,
) -> DraftResult:
    """Execute the draft. User picks manually, AI picks automatically.

    Returns DraftResult with all picks.
    """
    r = rng or random.Random()
    result = DraftResult()
    available = list(draft_class)

    total_picks = len(draft_order) * DRAFT_ROUNDS

    for round_num in range(1, DRAFT_ROUNDS + 1):
        # Second round: same order (no snake)
        round_order = draft_order if round_num == 1 else list(reversed(draft_order))
        # Actually NBA draft doesn't snake. Both rounds same order.
        round_order = draft_order

        for pick_in_round, team_id in enumerate(round_order, 1):
            if not available:
                break

            team = league.get_team(team_id)
            if not team:
                continue

            overall_pick = (round_num - 1) * len(draft_order) + pick_in_round

            if team_id == league.user_team_id:
                # User picks
                prospect = _user_draft_pick(team, available, round_num, pick_in_round, overall_pick)
            else:
                # AI picks
                prospect = _ai_draft_pick(team, available, r)

            if prospect:
                # Sign the player
                salary = get_rookie_salary(overall_pick)
                prospect.player.contract = Contract(salary=salary, years=min(4, 5 - round_num))
                prospect.player.draft_year = league.season
                prospect.player.draft_pick = overall_pick

                team.add_player(prospect.player)
                available.remove(prospect)

                result.picks.append({
                    "pick": overall_pick,
                    "round": round_num,
                    "team_abbr": team.abbr,
                    "player_name": prospect.player.name,
                    "overall": prospect.player.overall,
                    "position": prospect.player.position,
                    "scouted_overall": prospect.scouted_overall,
                })

                print(f"  Rd {round_num} Pick {pick_in_round:2d} ({overall_pick:2d}): "
                      f"{team.abbr:4s} selects {prospect.player.name} "
                      f"({prospect.player.position}, Scout OVR {prospect.scouted_overall})")

    return result


def _user_draft_pick(
    team: Team,
    available: list[DraftProspect],
    round_num: int,
    pick_in_round: int,
    overall_pick: int,
) -> Optional[DraftProspect]:
    """Let the user choose a prospect."""
    print(f"\n  {'=' * 60}")
    print(f"  YOUR PICK - Round {round_num}, Pick {pick_in_round} (#{overall_pick} overall)")
    print(f"  {team.full_name}")
    print(f"  {'=' * 60}")

    show_count = min(20, len(available))
    print(f"\n  {'#':>3s} {'POS':<4s} {'NAME':<22s} {'S.OVR':>5s} {'POT':>4s} {'AGE':>4s} {'REPORT'}")
    print(f"  {'-' * 70}")

    for i, prospect in enumerate(available[:show_count], 1):
        p = prospect.player
        print(f"  {i:3d} {p.position:<4s} {p.name:<22s} {prospect.scouted_overall:5d} "
              f"{p.potential:4d} {p.age:4d} {prospect.scouting_report[:30]}")

    while True:
        try:
            choice = int(input(f"\n  Select player (1-{show_count}): "))
            if 1 <= choice <= show_count:
                return available[choice - 1]
            print(f"  Please enter 1-{show_count}.")
        except (ValueError, EOFError, KeyboardInterrupt):
            # Auto-pick if input fails
            return available[0]


def _ai_draft_pick(
    team: Team,
    available: list[DraftProspect],
    rng: random.Random,
) -> Optional[DraftProspect]:
    """AI selects a prospect based on need and talent."""
    if not available:
        return None

    # Determine team needs (positions with fewer/weaker players)
    pos_strength = {pos: 0 for pos in POSITIONS}
    for p in team.roster:
        pos_strength[p.position] = max(pos_strength[p.position], p.overall)

    # Weakest position
    weakest_pos = min(pos_strength, key=pos_strength.get)

    # Look for best available at position of need (with some randomness)
    candidates = available[:10]  # consider top 10

    # Prefer need position but not exclusively
    scored = []
    for prospect in candidates:
        score = prospect.scouted_overall
        if prospect.player.position == weakest_pos:
            score += rng.randint(3, 8)  # need bonus
        score += rng.randint(-3, 3)  # randomness
        scored.append((score, prospect))

    scored.sort(key=lambda x: x[0], reverse=True)
    return scored[0][1]
