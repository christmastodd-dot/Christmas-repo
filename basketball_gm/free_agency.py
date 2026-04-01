"""Free agency — player signings, contract offers, AI logic."""

from __future__ import annotations

import random
from typing import Optional

from basketball_gm.config import (
    MAX_SALARY, MID_LEVEL_EXCEPTION, MIN_SALARY, ROSTER_SIZE, SALARY_CAP,
)
from basketball_gm.league import League
from basketball_gm.player import Player, Contract
from basketball_gm.team import Team


def get_free_agents_sorted(league: League) -> list[Player]:
    """Return free agents sorted by overall rating descending."""
    agents = list(league.free_agents)
    agents.sort(key=lambda p: p.overall, reverse=True)
    return agents


def desired_salary(player: Player) -> int:
    """What a free agent expects to be paid based on their overall."""
    ovr = player.overall
    if ovr >= 85:
        return min(MAX_SALARY, 30_000_000 + (ovr - 85) * 1_500_000)
    elif ovr >= 75:
        return 15_000_000 + (ovr - 75) * 1_500_000
    elif ovr >= 65:
        return 6_000_000 + (ovr - 65) * 900_000
    elif ovr >= 55:
        return 2_500_000 + (ovr - 55) * 350_000
    else:
        return MIN_SALARY


def sign_player(
    team: Team,
    player: Player,
    league: League,
    salary: int,
    years: int,
) -> tuple[bool, str]:
    """Attempt to sign a free agent to a team. Returns (success, message)."""
    # Roster check
    if len(team.roster) >= ROSTER_SIZE:
        return False, "Roster is full (15 players). Release someone first."

    # Salary check
    if team.payroll + salary > SALARY_CAP:
        # Allow mid-level exception
        if salary <= MID_LEVEL_EXCEPTION:
            pass  # allowed
        else:
            return False, f"Not enough cap space. Need ${salary/1e6:.1f}M, have ${team.cap_space/1e6:.1f}M."

    # Check if player accepts
    min_acceptable = int(desired_salary(player) * 0.75)
    if salary < min_acceptable:
        return False, f"Offer too low. Player wants at least ${min_acceptable/1e6:.1f}M."

    if years < 1 or years > 5:
        return False, "Contract must be 1-5 years."

    # Sign the player
    player.contract = Contract(salary=salary, years=years)

    # Remove from free agents
    league.free_agents = [p for p in league.free_agents if p.id != player.id]

    team.add_player(player)
    return True, f"Signed {player.name} for ${salary/1e6:.1f}M x {years} yr(s)."


def release_player(
    team: Team,
    player_id: int,
    league: League,
) -> tuple[bool, str]:
    """Release a player from a team to free agency."""
    player = team.remove_player(player_id)
    if not player:
        return False, "Player not found on roster."

    player.contract = Contract(salary=MIN_SALARY, years=1)
    league.free_agents.append(player)
    return True, f"Released {player.name}."


def ai_free_agency(league: League, rng: Optional[random.Random] = None) -> list[str]:
    """AI teams sign free agents to fill roster needs. Returns log of signings."""
    r = rng or random.Random()
    log = []

    # Multiple rounds — best FAs go first
    for _ in range(5):
        available = get_free_agents_sorted(league)
        if not available:
            break

        for player in available[:30]:  # top 30 FAs per round
            # Find teams that need players and can afford them
            needy_teams = [
                t for t in league.teams
                if t.id != league.user_team_id
                and len(t.roster) < ROSTER_SIZE
            ]

            if not needy_teams:
                break

            # Weight by team need: fewer players = more need
            r.shuffle(needy_teams)

            for team in needy_teams:
                salary = desired_salary(player)
                # AI teams negotiate down slightly
                offer = max(MIN_SALARY, int(salary * r.uniform(0.85, 1.05)))

                if team.payroll + offer <= SALARY_CAP + MID_LEVEL_EXCEPTION:
                    years = r.randint(1, min(4, max(1, 6 - max(0, player.age - 28))))
                    player.contract = Contract(salary=offer, years=years)
                    league.free_agents = [p for p in league.free_agents if p.id != player.id]
                    team.add_player(player)
                    log.append(f"{player.name} signed with {team.full_name} "
                               f"({player.salary_str()} x {years} yr)")
                    break

    return log


def expire_contracts(league: League) -> list[Player]:
    """End of season: expire contracts and move players to free agency. Returns newly freed players."""
    freed = []
    for team in league.teams:
        expiring = [p for p in team.roster if p.contract.years <= 1]
        for player in expiring:
            team.remove_player(player.id)
            player.contract = Contract(salary=MIN_SALARY, years=0)
            league.free_agents.append(player)
            freed.append(player)

    # Decrement remaining contracts
    for team in league.teams:
        for player in team.roster:
            player.contract.years = max(1, player.contract.years - 1)

    return freed
