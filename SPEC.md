# Basketball Franchise Manager - Project Spec

A terminal-based basketball franchise manager game inspired by Basketball GM.
Run a franchise across multiple seasons: draft rookies, sign free agents, make trades,
manage your salary cap, and compete for championships.

---

## Architecture

```
basketball_gm/
├── __init__.py
├── __main__.py          # Entry point (python -m basketball_gm)
├── config.py            # Constants, league settings, salary cap rules
├── player.py            # Player model, generation, development/aging
├── team.py              # Team model, roster management, chemistry
├── league.py            # League structure, schedule, standings
├── game_sim.py          # Individual game simulation engine
├── season.py            # Season orchestration (regular season + playoffs)
├── draft.py             # Draft class generation, scouting, draft event
├── free_agency.py       # Free agent pool, signings, salary logic
├── trade.py             # Trade proposals, AI trade logic, validation
├── stats.py             # Stat tracking, league leaders, awards
├── save_load.py         # JSON serialization, save/load game state
├── ui.py                # Terminal UI: menus, tables, formatting
└── engine.py            # Main game loop, phase transitions
```

**No external dependencies** — stdlib only (json, random, os, dataclasses, etc.).

---

## Milestone 1: Core Data Models & League Setup

**Goal**: Define the foundational data structures and generate a full 30-team league.

**Deliverables**:
- `config.py` — All league constants: 30 real NBA team names/cities, conferences (East/West),
  divisions (Atlantic, Central, Southeast, Northwest, Pacific, Southwest),
  salary cap ($125M), luxury tax, min/max contracts, roster size (15), position list
- `player.py` — `Player` dataclass with:
  - Identity: name, age (19–38), position (PG/SG/SF/PF/C), height, weight
  - Ratings (1–99): shooting, defense, rebounding, passing, athleticism, basketball_iq
  - Overall rating (weighted composite), potential rating
  - Contract: salary, years remaining
  - Career stats accumulator
  - `generate_player()` — random player with position-appropriate rating distributions
  - `generate_rookie()` — younger player with higher potential, lower current ratings
- `team.py` — `Team` dataclass with:
  - Name, city, conference, division
  - Roster (list of Players), salary total
  - Season record (wins/losses)
  - `team_overall()` — composite rating from roster
- `league.py` — `League` class:
  - Initialize 30 teams with 15 players each (450 total players)
  - Realistic name generation (first/last name pools)
  - Assign balanced rosters so all teams start in a reasonable range

**Acceptance**: Run a script that creates a league and prints all 30 rosters with player ratings.

---

## Milestone 2: Game Simulation Engine

**Goal**: Simulate a single basketball game between two teams with realistic box scores.

**Deliverables**:
- `game_sim.py` — `simulate_game(home_team, away_team)` returns a `GameResult`:
  - Possession-by-possession simulation (simplified): ~100 possessions per team
  - Each possession: pick ball handler weighted by usage, determine outcome
    (2pt attempt, 3pt attempt, free throws, turnover, assist) based on player ratings
  - Shot success influenced by shooter's ratings vs. defender quality
  - Rebounds allocated by rebounding ratings
  - Generate realistic stat lines: points, rebounds, assists, steals, blocks, turnovers, FG/3PT/FT
  - Home court advantage modifier (+3% shooting)
  - Final score with no ties (overtime periods if tied)
  - Box score for both teams
- `stats.py` — `PlayerGameStats` and `TeamGameStats` dataclasses
  - Accumulate per-game stats into season averages

**Acceptance**: Simulate 100 games between two teams; average scores should be 95–115,
top scorers 18–30 PPG, realistic assist/rebound distributions.

---

## Milestone 3: Season Simulation & Standings

**Goal**: Simulate a full 82-game regular season with schedule generation and standings.

**Deliverables**:
- `league.py` additions:
  - `generate_schedule()` — 82-game schedule per team:
    - 4 games vs. division rivals (5 teams × 4 = 20 games)
    - 3–4 games vs. conference non-division (10 teams × 3 or 4 = 32 games)
    - 2 games vs. opposite conference (15 teams × 2 = 30 games)
  - Standings sorted by conference: win%, with division winners marked
  - Tiebreaker: head-to-head, then division record, then point differential
- `season.py` — `Season` class:
  - `sim_day()` — simulate one day's games
  - `sim_week()` — simulate a week at a time
  - `sim_to_playoffs()` — simulate rest of regular season
  - Track standings after each game
- `ui.py` — Basic terminal display:
  - Conference standings table (rank, team, W-L, PCT, GB)
  - Box score display for individual games
  - League leaders (PPG, RPG, APG)

**Acceptance**: Full 82-game season completes with correct game counts per team,
standings display correctly, and stats accumulate properly.

---

## Milestone 4: Playoffs

**Goal**: Full 16-team playoff bracket with best-of-7 series.

**Deliverables**:
- `season.py` additions:
  - Seed top 8 teams per conference (division winners get top 3 seeds)
  - 4 rounds: First Round, Conference Semis, Conference Finals, Finals
  - Best-of-7 series with home court advantage (2-2-1-1-1 format)
  - Series results tracked with game-by-game scores
  - Playoff intensity modifier: ratings boosted slightly, more variance
- `ui.py` additions:
  - Playoff bracket display
  - Series status (e.g., "BOS leads 3-2")
  - Option to simulate series game-by-game or all at once
  - Champion announcement with Finals MVP

**Acceptance**: Playoffs complete correctly — 15 series, proper bracket advancement,
champion crowned, no bugs in elimination logic.

---

## Milestone 5: Roster Management & Salary Cap

**Goal**: Player contract system and user roster management.

**Deliverables**:
- `config.py` additions: salary cap rules, max contract tiers, minimum salary,
  luxury tax threshold, rookie scale contracts
- `player.py` additions:
  - Contract: yearly salary, years remaining, player/team options
  - Restricted/unrestricted free agent status based on years in league
- `team.py` additions:
  - `sign_player()`, `release_player()`, `get_cap_space()`
  - Roster limits enforcement (15 players, 13 active)
- `free_agency.py`:
  - Free agent pool (players without contracts)
  - AI teams sign free agents based on needs and budget
  - User can browse and sign free agents
  - Bidding system: offer years + salary, player evaluates based on
    money, team quality, and playing time opportunity
- `ui.py` additions:
  - Roster screen with salaries and contract years
  - Free agent listing sorted by overall rating
  - Cap space display, luxury tax warning

**Acceptance**: User can sign/release players, cap is enforced, AI teams
fill their rosters sensibly, contracts expire correctly between seasons.

---

## Milestone 6: Trading System

**Goal**: Player-for-player trades between user team and AI teams.

**Deliverables**:
- `trade.py`:
  - `TradeProposal`: players offered / players requested, draft pick swaps
  - Trade value calculator: based on player overall, age, potential, contract
  - AI acceptance logic: team accepts if value received > value given,
    with adjustments for positional need and cap implications
  - Salary matching rules: traded salaries must be within 125% + $5M
  - Trade deadline (game 60 of 82)
- AI-initiated trades: AI teams occasionally propose trades to user
- `ui.py` additions:
  - Trade screen: select your players, select target team, browse their roster
  - Trade proposal result (accepted/rejected with reason)
  - Trade history log

**Acceptance**: User can propose and complete trades, AI rejects bad deals,
salary matching is enforced, traded players appear on new rosters.

---

## Milestone 7: Draft System & Player Development

**Goal**: Annual rookie draft and between-season player progression.

**Deliverables**:
- `draft.py`:
  - Generate 60-player draft class with scouting reports
  - Draft lottery: bottom 14 teams get lottery odds (weighted)
  - 2 rounds, 30 picks each, snake order
  - Scouting: reveals partial ratings with some uncertainty
  - AI draft logic: teams pick best available player by need
  - User selects their picks manually
- `player.py` additions:
  - `develop_player()` — offseason progression:
    - Age 19–24: ratings improve toward potential (bigger jumps)
    - Age 25–29: small improvements or plateau
    - Age 30+: gradual decline, accelerating after 34
    - Random variance: some players boom, some bust
  - Retirement: players retire if ratings drop too low or age > 38
- `season.py` additions:
  - Offseason phase: development → retirements → draft → free agency
  - Award voting: MVP, DPOY, ROY, All-NBA teams

**Acceptance**: Draft completes with all 60 picks, rookies join teams,
players age realistically over 5+ simulated seasons, awards are given.

---

## Milestone 8: Game Engine, Save/Load & Polish

**Goal**: Tie everything together into a polished, playable game loop.

**Deliverables**:
- `engine.py` — Main game loop with phase management:
  - New Game: pick your team from the 30 available
  - Preseason → Regular Season → Playoffs → Offseason → repeat
  - Between each phase, user can manage roster
  - "Sim to next event" quick navigation
- `save_load.py`:
  - Serialize full game state to JSON (league, all teams, all players,
    schedule, standings, season number, user team)
  - Load game from JSON file
  - Auto-save after each phase
  - Multiple save slots
- `__main__.py` — Entry point:
  - Main menu: New Game / Load Game / Quit
  - `python -m basketball_gm` to run
- `ui.py` polish:
  - Team dashboard: roster, upcoming games, standings at a glance
  - Season summary screen
  - Historical records (past champions, past MVPs)
  - Clean formatting with column alignment
- `.gitignore` update: add `saves/` directory

**Acceptance**: Complete game loop — start a new franchise, play through 3+ seasons
with drafts, free agency, trades, and playoffs. Save, quit, reload, and continue
seamlessly. Game runs with `python -m basketball_gm`.

---

## Summary

| Milestone | Focus | Key Files |
|-----------|-------|-----------|
| 1 | Data models & league init | config, player, team, league |
| 2 | Game simulation | game_sim, stats |
| 3 | Season & standings | league, season, ui |
| 4 | Playoffs | season, ui |
| 5 | Roster & salary cap | free_agency, team, player |
| 6 | Trading | trade, ui |
| 7 | Draft & development | draft, player, season |
| 8 | Game loop & save/load | engine, save_load, __main__, ui |
