"""Trading system — trade proposals, AI evaluation, salary matching."""

from __future__ import annotations

import random
from dataclasses import dataclass, field
from typing import Optional

from basketball_gm.config import ROSTER_SIZE
from basketball_gm.league import League
from basketball_gm.player import Player
from basketball_gm.team import Team


# Salary matching: outgoing salary must be within 125% + $5M of incoming
SALARY_MATCH_PCT = 1.25
SALARY_MATCH_FLAT = 5_000_000


@dataclass
class TradeProposal:
    """A trade between two teams."""
    team1_id: int
    team2_id: int
    team1_players: list[int] = field(default_factory=list)  # player IDs going from team1 to team2
    team2_players: list[int] = field(default_factory=list)  # player IDs going from team2 to team1

    @property
    def team1_outgoing_ids(self) -> list[int]:
        return self.team1_players

    @property
    def team2_outgoing_ids(self) -> list[int]:
        return self.team2_players


def player_trade_value(player: Player) -> float:
    """Calculate a player's trade value."""
    ovr = player.overall
    pot = player.potential
    age = player.age

    # Base value from overall
    base = ovr * 2.0

    # Potential bonus (especially for young players)
    if age <= 25:
        pot_bonus = (pot - ovr) * 1.5
    else:
        pot_bonus = (pot - ovr) * 0.5

    # Age factor: young players are more valuable
    if age <= 24:
        age_factor = 1.2
    elif age <= 28:
        age_factor = 1.0
    elif age <= 32:
        age_factor = 0.8
    else:
        age_factor = 0.5

    # Contract factor: bad contracts reduce value
    salary_m = player.contract.salary / 1_000_000
    years = player.contract.years
    if ovr >= 80:
        # Stars on any contract are valuable
        contract_factor = 1.0
    elif salary_m > 15 and ovr < 70:
        # Overpaid players have negative value adjustment
        contract_factor = 0.7
    elif salary_m < 5:
        # Cheap players are slightly more valuable
        contract_factor = 1.1
    else:
        contract_factor = 1.0

    return max(1.0, (base + pot_bonus) * age_factor * contract_factor)


def evaluate_trade(
    proposal: TradeProposal,
    league: League,
) -> tuple[float, float]:
    """Return (team1_value_received, team2_value_received)."""
    team1 = league.get_team(proposal.team1_id)
    team2 = league.get_team(proposal.team2_id)

    # Value team1 receives (team2's outgoing players)
    team1_receives = sum(
        player_trade_value(team2.get_player(pid))
        for pid in proposal.team2_players
        if team2.get_player(pid)
    )

    # Value team2 receives (team1's outgoing players)
    team2_receives = sum(
        player_trade_value(team1.get_player(pid))
        for pid in proposal.team1_players
        if team1.get_player(pid)
    )

    return team1_receives, team2_receives


def check_salary_match(
    proposal: TradeProposal,
    league: League,
) -> tuple[bool, str]:
    """Check if salaries match within trade rules."""
    team1 = league.get_team(proposal.team1_id)
    team2 = league.get_team(proposal.team2_id)

    team1_outgoing_salary = sum(
        team1.get_player(pid).contract.salary
        for pid in proposal.team1_players
        if team1.get_player(pid)
    )
    team2_outgoing_salary = sum(
        team2.get_player(pid).contract.salary
        for pid in proposal.team2_players
        if team2.get_player(pid)
    )

    # Team1 receiving team2's outgoing salary
    max1 = team1_outgoing_salary * SALARY_MATCH_PCT + SALARY_MATCH_FLAT
    # Team2 receiving team1's outgoing salary
    max2 = team2_outgoing_salary * SALARY_MATCH_PCT + SALARY_MATCH_FLAT

    if team2_outgoing_salary > max1:
        return False, (f"Salary mismatch: receiving ${team2_outgoing_salary/1e6:.1f}M "
                        f"but sending only ${team1_outgoing_salary/1e6:.1f}M "
                        f"(max incoming: ${max1/1e6:.1f}M)")
    if team1_outgoing_salary > max2:
        return False, (f"Salary mismatch: partner receiving ${team1_outgoing_salary/1e6:.1f}M "
                        f"but sending only ${team2_outgoing_salary/1e6:.1f}M "
                        f"(max incoming: ${max2/1e6:.1f}M)")

    return True, "Salaries match."


def validate_trade(
    proposal: TradeProposal,
    league: League,
) -> tuple[bool, str]:
    """Full trade validation."""
    team1 = league.get_team(proposal.team1_id)
    team2 = league.get_team(proposal.team2_id)

    if not team1 or not team2:
        return False, "Invalid team(s)."

    if not proposal.team1_players and not proposal.team2_players:
        return False, "No players in trade."

    # Check all players exist
    for pid in proposal.team1_players:
        if not team1.get_player(pid):
            return False, f"Player {pid} not on {team1.abbr} roster."
    for pid in proposal.team2_players:
        if not team2.get_player(pid):
            return False, f"Player {pid} not on {team2.abbr} roster."

    # Roster size after trade
    team1_after = len(team1.roster) - len(proposal.team1_players) + len(proposal.team2_players)
    team2_after = len(team2.roster) - len(proposal.team2_players) + len(proposal.team1_players)

    if team1_after > ROSTER_SIZE:
        return False, f"{team1.abbr} would exceed roster limit ({team1_after} players)."
    if team2_after > ROSTER_SIZE:
        return False, f"{team2.abbr} would exceed roster limit ({team2_after} players)."
    if team1_after < 8:
        return False, f"{team1.abbr} would have too few players ({team1_after})."
    if team2_after < 8:
        return False, f"{team2.abbr} would have too few players ({team2_after})."

    # Salary matching
    ok, msg = check_salary_match(proposal, league)
    if not ok:
        return False, msg

    return True, "Trade is valid."


def ai_accepts_trade(
    proposal: TradeProposal,
    ai_team_id: int,
    league: League,
    rng: Optional[random.Random] = None,
) -> tuple[bool, str]:
    """Determine if the AI team accepts the trade."""
    r = rng or random.Random()

    team1_val, team2_val = evaluate_trade(proposal, league)

    if ai_team_id == proposal.team1_id:
        ai_receives = team1_val
        ai_gives = team2_val
    else:
        ai_receives = team2_val
        ai_gives = team1_val

    # AI needs to receive at least 85% of what they give up (with randomness)
    threshold = ai_gives * r.uniform(0.80, 0.95)

    if ai_receives >= threshold:
        return True, "Trade accepted!"
    else:
        deficit = (ai_gives - ai_receives) / max(ai_gives, 1) * 100
        return False, f"Trade rejected. AI values their players {deficit:.0f}% more than yours."


def execute_trade(
    proposal: TradeProposal,
    league: League,
) -> str:
    """Execute a validated trade. Returns summary string."""
    team1 = league.get_team(proposal.team1_id)
    team2 = league.get_team(proposal.team2_id)

    # Remove players from original teams, collect them
    t1_players = [team1.remove_player(pid) for pid in proposal.team1_players]
    t2_players = [team2.remove_player(pid) for pid in proposal.team2_players]

    # Add to new teams
    for p in t2_players:
        if p:
            team1.add_player(p)
    for p in t1_players:
        if p:
            team2.add_player(p)

    # Build summary
    t1_names = [p.name for p in t1_players if p]
    t2_names = [p.name for p in t2_players if p]
    return (f"TRADE: {team1.abbr} receives {', '.join(t2_names)} | "
            f"{team2.abbr} receives {', '.join(t1_names)}")


def ai_propose_trade(
    league: League,
    rng: Optional[random.Random] = None,
) -> Optional[TradeProposal]:
    """AI team proposes a trade to the user. Returns proposal or None."""
    r = rng or random.Random()

    user_team = league.user_team
    if not user_team or len(user_team.roster) < 10:
        return None

    # Pick a random AI team
    ai_teams = [t for t in league.teams if t.id != league.user_team_id and len(t.roster) >= 10]
    if not ai_teams:
        return None

    ai_team = r.choice(ai_teams)

    # AI picks one of their worse players and asks for a comparable user player
    ai_roster = sorted(ai_team.roster, key=lambda p: player_trade_value(p))
    user_roster = sorted(user_team.roster, key=lambda p: player_trade_value(p))

    # Try to find a reasonable swap
    for ai_player in ai_roster[2:8]:  # middle of their roster
        ai_val = player_trade_value(ai_player)
        for user_player in user_roster[2:8]:
            user_val = player_trade_value(user_player)
            # Within 20% value
            if abs(ai_val - user_val) / max(ai_val, user_val, 1) < 0.20:
                proposal = TradeProposal(
                    team1_id=user_team.id,
                    team2_id=ai_team.id,
                    team1_players=[user_player.id],
                    team2_players=[ai_player.id],
                )
                ok, _ = validate_trade(proposal, league)
                if ok:
                    return proposal

    return None
