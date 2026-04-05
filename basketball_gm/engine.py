"""Main game engine — ties all systems together into a playable game loop."""

from __future__ import annotations

import random
from typing import Optional

from basketball_gm.league import League, create_league
from basketball_gm.season import Season
from basketball_gm.playoffs import (
    PlayoffBracket, create_playoff_bracket, sim_series_game,
    sim_full_series, sim_playoff_round, sim_full_playoffs,
)
from basketball_gm.draft import generate_draft_class, run_draft_lottery, run_draft
from basketball_gm.free_agency import expire_contracts, ai_free_agency
from basketball_gm.trade import ai_propose_trade
from basketball_gm.development import develop_players, compute_awards, print_awards
from basketball_gm.save_load import save_game, load_game, list_saves
from basketball_gm import ui


BANNER = """
  ╔══════════════════════════════════════════════════╗
  ║         BASKETBALL FRANCHISE MANAGER             ║
  ║                                                  ║
  ║   Build a dynasty. Win championships.            ║
  ╚══════════════════════════════════════════════════╝
"""


class GameEngine:
    """Main game engine managing game state and phase transitions."""

    def __init__(self):
        self.league: Optional[League] = None
        self.season: Optional[Season] = None
        self.bracket: Optional[PlayoffBracket] = None
        self.rng = random.Random()
        self.running = True

    def main_menu(self) -> None:
        """Display main menu and handle new/load game."""
        while self.running:
            print(BANNER)
            print("  1. New Game")
            print("  2. Load Game")
            print("  3. Quit")

            choice = ui.get_choice("\n  Enter choice: ", 1, 3)

            if choice == 1:
                self.new_game()
            elif choice == 2:
                self.load_game_menu()
            elif choice == 3:
                print("\n  Thanks for playing!")
                self.running = False
                return

            if self.league:
                self.game_loop()

    def new_game(self) -> None:
        """Start a new game."""
        ui.clear_screen()
        print("\n  Creating a new league...\n")

        seed = random.randint(0, 999999)
        self.league = create_league(seed=seed)
        self.rng = random.Random(seed)

        # Team selection
        team_id = ui.team_selection_menu(self.league)
        self.league.user_team_id = team_id

        team = self.league.user_team
        print(f"\n  You are now the GM of the {team.full_name}!")
        print(f"  Team Overall: {team.team_overall()}")
        ui.print_roster(team, detailed=True)
        ui.press_enter()

    def load_game_menu(self) -> None:
        """Load a saved game."""
        saves = list_saves()
        if not saves:
            print("\n  No saved games found.")
            ui.press_enter()
            return

        print("\n  Saved Games:")
        for s in saves:
            print(f"  Slot {s['slot']}: {s['team']} - Season {s['season']} "
                  f"({s['phase']}) [{s['size_mb']:.1f} MB]")

        slot = ui.get_choice(f"\n  Load slot (1-{saves[-1]['slot']}, 0 to cancel): ",
                             0, saves[-1]["slot"])
        if slot == 0:
            return

        result = load_game(slot)
        if result:
            self.league, season_data = result
            if season_data:
                self.season = Season.from_dict(season_data, self.league)
            print(f"\n  Game loaded: {self.league.user_team.full_name}, Season {self.league.season}")
            ui.press_enter()
        else:
            print("\n  Failed to load save file.")
            ui.press_enter()

    def save_game_menu(self) -> None:
        """Save the current game."""
        saves = list_saves()
        if saves:
            print("\n  Existing saves:")
            for s in saves:
                print(f"  Slot {s['slot']}: {s['team']} - Season {s['season']}")

        slot = ui.get_choice("\n  Save to slot (1-9): ", 1, 9)
        season_data = self.season.to_dict() if self.season else None
        path = save_game(self.league, slot, season_data)
        print(f"\n  Game saved to slot {slot}.")

    def game_loop(self) -> None:
        """Main game loop — routes to phase-appropriate handlers."""
        while self.running and self.league:
            phase = self.league.phase

            if phase == "preseason":
                self.handle_preseason()
            elif phase == "regular_season":
                self.handle_regular_season()
            elif phase == "playoffs":
                self.handle_playoffs()
            elif phase == "offseason":
                self.handle_offseason()
            elif phase == "draft":
                self.handle_draft()
            elif phase == "free_agency":
                self.handle_free_agency_phase()
            else:
                # Unknown phase, start a new season
                self.league.phase = "preseason"

    def handle_preseason(self) -> None:
        """Initialize the season and transition to regular season."""
        print(f"\n  Season {self.league.season} is about to begin!")
        self.season = Season(league=self.league)
        self.season.initialize(seed=self.rng.randint(0, 999999))
        self.league.phase = "regular_season"

        team = self.league.user_team
        ui.print_roster(team)
        ui.press_enter()

    def handle_regular_season(self) -> None:
        """Regular season game loop."""
        while self.league.phase == "regular_season" and self.running:
            ui.clear_screen()
            action = ui.season_menu(self.league, self.season)

            if action == "standings":
                ui.print_standings(self.league)
                ui.press_enter()

            elif action == "roster":
                ui.print_roster(self.league.user_team)
                ui.press_enter()

            elif action == "leaders":
                min_gp = max(5, self.season.games_played // 100)
                ui.print_all_leaders(self.league, min_games=min_gp)
                ui.press_enter()

            elif action == "sim_day":
                results = self.season.sim_day()
                self._show_day_results(results)
                self._maybe_ai_trade()

            elif action == "sim_week":
                results = self.season.sim_week()
                self._show_week_summary(results)
                self._maybe_ai_trade()

            elif action == "sim_next":
                results = self.season.sim_to_next_user_game()
                if results:
                    print(f"\n  Simulated {len(results)} games.")
                    team = self.league.user_team
                    print(f"  {team.full_name}: {team.record}")
                ui.press_enter()

            elif action == "sim_rest":
                if ui.get_yes_no("  Simulate rest of regular season? (y/n): "):
                    results = self.season.sim_rest_of_season()
                    print(f"\n  Season complete! {len(results)} games simulated.")
                    ui.print_standings(self.league)
                    ui.press_enter()

            elif action == "schedule":
                ui.print_upcoming_schedule(self.league, self.season.schedule,
                                           self.league.user_team_id)
                ui.press_enter()

            elif action == "results":
                ui.print_recent_results(self.league, self.season.results,
                                        self.league.user_team_id)
                ui.press_enter()

            elif action == "other_team":
                ui.view_other_team(self.league)
                ui.press_enter()

            elif action == "player_detail":
                ui.view_player_detail_menu(self.league)
                ui.press_enter()

            # Check if season is complete
            if self.season.season_complete:
                print("\n  Regular season complete!")
                ui.print_standings(self.league)
                ui.press_enter()
                self.league.phase = "playoffs"
                return

    def handle_playoffs(self) -> None:
        """Playoff game loop."""
        if not self.bracket:
            self.bracket = create_playoff_bracket(self.league)
            print("\n  The playoffs are set!")
            ui.print_playoff_bracket(self.bracket, self.league)
            ui.press_enter()

        while not self.bracket.playoffs_complete and self.running:
            ui.clear_screen()
            action = ui.playoff_menu(self.league, self.bracket)

            if action == "bracket":
                ui.print_playoff_bracket(self.bracket, self.league)
                ui.press_enter()

            elif action == "sim_game":
                # Find user's series or first active series
                user_id = self.league.user_team_id
                target = None
                for s in self.bracket.current_series_list:
                    if not s.complete and (s.higher_seed_id == user_id or s.lower_seed_id == user_id):
                        target = s
                        break
                if not target:
                    for s in self.bracket.current_series_list:
                        if not s.complete:
                            target = s
                            break
                if target:
                    result = sim_series_game(target, self.league, self.rng)
                    ui.print_score_summary(result, self.league)
                    print(f"  {target.status_str(self.league)}")
                    ui.press_enter()
                self._check_playoff_advance()

            elif action == "sim_round":
                sim_playoff_round(self.bracket, self.league, self.rng)
                ui.print_playoff_bracket(self.bracket, self.league)
                ui.press_enter()
                self._check_playoff_advance()

            elif action == "sim_all":
                sim_full_playoffs(self.bracket, self.league, self.rng)
                ui.print_playoff_bracket(self.bracket, self.league)
                ui.press_enter()

            elif action == "series_detail":
                series = ui.select_series(self.bracket, self.league)
                if series:
                    ui.print_series_detail(series, self.league)
                ui.press_enter()

            elif action == "roster":
                ui.print_roster(self.league.user_team)
                ui.press_enter()

            elif action == "standings":
                ui.print_standings(self.league)
                ui.press_enter()

        # Playoffs complete
        if self.bracket.playoffs_complete:
            champ = self.league.get_team(self.bracket.champion_id)
            print(f"\n  {'=' * 50}")
            print(f"  CHAMPION: {champ.full_name}!")
            print(f"  {'=' * 50}")
            if self.bracket.finals_mvp_id:
                mvp, _ = self.league.find_player(self.bracket.finals_mvp_id)
                if mvp:
                    print(f"  Finals MVP: {mvp.name}")

            # Save to history
            self.league.history.append({
                "season": self.league.season,
                "champion": champ.full_name,
                "champion_record": champ.record,
                "finals_mvp": mvp.name if mvp else "Unknown",
            })
            ui.press_enter()
            self.bracket = None
            self.league.phase = "offseason"

    def handle_offseason(self) -> None:
        """Offseason: awards, development, contract expiry, draft, free agency."""
        print(f"\n  {'=' * 50}")
        print(f"  OFFSEASON - Season {self.league.season}")
        print(f"  {'=' * 50}")

        # Awards
        awards = compute_awards(self.league)
        print_awards(awards)

        # Save awards to history
        if self.league.history and self.league.history[-1]["season"] == self.league.season:
            self.league.history[-1]["awards"] = awards

        # Archive season stats
        for t in self.league.teams:
            for p in t.roster:
                p.archive_season(self.league.season)
        for p in self.league.free_agents:
            p.archive_season(self.league.season)

        ui.press_enter()

        # Player development
        print("\n  Player Development:")
        dev = develop_players(self.league, self.rng)
        print(f"  {len(dev['improved'])} players improved")
        print(f"  {len(dev['declined'])} players declined")
        print(f"  {len(dev['retired'])} players retired")

        # Show user team changes
        team = self.league.user_team
        user_improved = [e for e in dev["improved"] if e[3] == team.abbr]
        user_declined = [e for e in dev["declined"] if e[3] == team.abbr]
        user_retired = [e for e in dev["retired"] if e[2] == team.abbr]

        if user_improved:
            print(f"\n  Your team improvements:")
            for name, old, new, _ in user_improved:
                print(f"    {name}: {old} -> {new} (+{new - old})")
        if user_declined:
            print(f"\n  Your team declines:")
            for name, old, new, _ in user_declined:
                print(f"    {name}: {old} -> {new} ({new - old})")
        if user_retired:
            print(f"\n  Retired from your team:")
            for name, age, _ in user_retired:
                print(f"    {name} (age {age})")

        ui.press_enter()

        # Contract expiry
        expired = expire_contracts(self.league)
        user_expired = [p for p in expired if any(
            t.abbr == team.abbr for t in self.league.teams if t.get_player(p.id)
        ) or p.name in [e.name for e in expired]]  # simplified: show all expired
        print(f"\n  {len(expired)} contracts expired league-wide.")
        # Show user team losses
        team_before = {p.id for p in team.roster}
        user_lost = [p for p in expired if p.id not in team_before and p.id not in {pp.id for pp in team.roster}]

        ui.press_enter()
        self.league.phase = "draft"

    def handle_draft(self) -> None:
        """Run the draft."""
        print(f"\n  {'=' * 50}")
        print(f"  {self.league.season + 1} NBA DRAFT")
        print(f"  {'=' * 50}")

        draft_class = generate_draft_class(rng=self.rng)
        draft_order, lottery_results = run_draft_lottery(self.league, self.rng)

        # Show lottery results
        print("\n  Draft Lottery Results:")
        for entry in lottery_results:
            marker = " <-- YOUR PICK" if entry["team_id"] == self.league.user_team_id else ""
            move = entry["movement"]
            arrow = f" (+{move})" if move > 0 else (f" ({move})" if move < 0 else "")
            print(f"  #{entry['post_pick']:2d}: {entry['full_name']}{arrow}{marker}")

        ui.press_enter()
        print("\n  The draft begins!\n")

        result = run_draft(self.league, draft_class, draft_order, self.rng)

        print(f"\n  Draft complete! {len(result.picks)} players selected.")
        ui.press_enter()

        # Show user's new roster
        ui.print_roster(self.league.user_team, detailed=True)
        ui.press_enter()

        self.league.phase = "free_agency"

    def handle_free_agency_phase(self) -> None:
        """Free agency phase — user signs, then AI fills rosters."""
        print(f"\n  {'=' * 50}")
        print(f"  FREE AGENCY PERIOD")
        print(f"  {'=' * 50}")

        # User free agency
        while True:
            action = ui.free_agency_menu(self.league)

            if action == "browse_fa":
                ui.browse_free_agents(self.league)
                ui.press_enter()
            elif action == "sign_fa":
                ui.sign_free_agent_ui(self.league)
                ui.press_enter()
            elif action == "release":
                ui.release_player_ui(self.league)
                ui.press_enter()
            elif action == "back":
                break

        # AI free agency
        print("\n  AI teams are signing free agents...")
        log = ai_free_agency(self.league, self.rng)
        print(f"  {len(log)} signings made.")
        if log:
            for entry in log[:5]:
                print(f"    {entry}")
            if len(log) > 5:
                print(f"    ... and {len(log) - 5} more")

        ui.press_enter()

        # Auto-save
        save_game(self.league, slot=1)
        print("  Game auto-saved to slot 1.")

        # Advance to next season
        self.league.season += 1
        self.league.phase = "preseason"
        self.season = None

        # Reset team records
        for team in self.league.teams:
            team.reset_season()

    def _show_day_results(self, results: list) -> None:
        """Show results from a simulated day."""
        if not results:
            print("\n  No games today.")
        else:
            print(f"\n  Day's Results ({len(results)} games):")
            for r in results:
                ui.print_score_summary(r, self.league)

            # Show user game if played
            user_id = self.league.user_team_id
            for r in results:
                if r.home_team_id == user_id or r.away_team_id == user_id:
                    if ui.get_yes_no("\n  View box score? (y/n): "):
                        ui.print_game_result(r, self.league)
                    break
        ui.press_enter()

    def _show_week_summary(self, results: list) -> None:
        """Show summary after simulating a week."""
        if not results:
            print("\n  No games this week.")
        else:
            team = self.league.user_team
            user_results = [r for r in results
                            if r.home_team_id == team.id or r.away_team_id == team.id]
            wins = sum(1 for r in user_results if r.winner_id == team.id)
            losses = len(user_results) - wins
            print(f"\n  Week summary: {len(results)} games simulated")
            print(f"  {team.full_name}: {wins}-{losses} this week ({team.record} overall)")
        ui.press_enter()

    def _maybe_ai_trade(self) -> None:
        """Randomly trigger an AI trade proposal."""
        if self.rng.random() < 0.08:  # ~8% chance per action
            ui.handle_ai_trade_proposal(self.league, self.rng)

    def _check_playoff_advance(self) -> None:
        """Check if the current playoff round is complete and advance."""
        if self.bracket and self.bracket.round_complete:
            if self.bracket.current_round == 3:
                finals = self.bracket.current_series_list[0]
                self.bracket.champion_id = finals.winner_id
                from basketball_gm.playoffs import _pick_finals_mvp
                self.bracket.finals_mvp_id = _pick_finals_mvp(finals, self.league)
            else:
                self.bracket.advance_round(self.league)
                print(f"\n  Advancing to: {self.bracket.current_round_name}")
                ui.print_playoff_bracket(self.bracket, self.league)
                ui.press_enter()
