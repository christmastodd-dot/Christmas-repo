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


def desired_years(player: Player) -> int:
    """Preferred contract length based on age and rating."""
    age = player.age
    ovr = player.overall
    if age >= 34:
        return 1
    elif age >= 30:
        return 2 if ovr >= 70 else 1
    elif age >= 27:
        return 3 if ovr >= 75 else 2
    else:
        # Young players want longer deals if they're good
        if ovr >= 75:
            return 4
        elif ovr >= 65:
            return 3
        else:
            return 2


def proposed_contract(player: Player) -> tuple[int, int]:
    """Return (salary, years) the player proposes as their opening demand."""
    return desired_salary(player), desired_years(player)


def negotiate_counter(
    player: Player,
    offered_salary: int,
    offered_years: int,
    rng: Optional[random.Random] = None,
) -> tuple[str, int, int]:
    """Player responds to a counter-offer.

    Returns (result, counter_salary, counter_years) where result is one of:
    - "accept" — player takes the deal
    - "reject" — player walks away (offer was insulting)
    - "counter" — player makes a counter-offer (closer to their demand)
    """
    r = rng or random.Random()
    ask_salary = desired_salary(player)
    ask_years = desired_years(player)
    min_salary = int(ask_salary * 0.75)

    salary_ratio = offered_salary / max(ask_salary, 1)
    years_diff = offered_years - ask_years

    # Insulting offer — reject outright
    if salary_ratio < 0.50:
        return "reject", ask_salary, ask_years

    # Great offer — accept immediately
    if offered_salary >= min_salary and abs(years_diff) <= 1:
        # Higher offers have better acceptance chance
        accept_chance = 0.5 + (salary_ratio - 0.75) * 2.0  # 0.5 at 75%, ~1.0 at 100%
        if years_diff >= 0:
            accept_chance += 0.15
        if r.random() < min(accept_chance, 0.95):
            return "accept", offered_salary, offered_years

    # Counter-offer: meet halfway between their ask and the offer
    counter_salary = int((ask_salary + offered_salary) / 2)
    counter_salary = max(min_salary, min(counter_salary, ask_salary))

    if offered_years < ask_years:
        counter_years = max(offered_years, ask_years - 1)
    elif offered_years > ask_years + 1:
        counter_years = ask_years + 1
    else:
        counter_years = ask_years

    return "counter", counter_salary, counter_years


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
