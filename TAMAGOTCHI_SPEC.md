# Tamagotchi Pet Game - Technical Specification

## Overview

A terminal-based virtual pet game inspired by the classic Tamagotchi. Players adopt a pet, keep it alive and happy by feeding, playing, and caring for it. The pet evolves through life stages, and neglect leads to consequences. Built in Python with a real-time text UI.

---

## Core Concepts

- **Pet**: A virtual creature with needs (hunger, happiness, energy, health) that change over time
- **Time system**: Stats decay in real-time (tick-based), even while the player is deciding what to do
- **Life stages**: Egg → Baby → Child → Teen → Adult
- **Actions**: Feed, Play, Clean, Sleep, Medicine, and more as milestones progress
- **Death**: If health reaches zero, the pet dies and the game ends

### Stat Model

| Stat       | Range | Decay Rate     | Replenished By       |
|------------|-------|----------------|----------------------|
| Hunger     | 0-100 | -2 per tick    | Feeding              |
| Happiness  | 0-100 | -1 per tick    | Playing, petting     |
| Energy     | 0-100 | -1 per tick    | Sleeping             |
| Cleanliness| 0-100 | -1 per tick    | Cleaning             |
| Health     | 0-100 | Conditional    | Medicine, good care  |

- Health decays when any other stat is critically low (< 20)
- A "tick" occurs every 3 seconds of real time
- Stats are clamped to 0-100

---

## Milestone 1: Basic Pet & Core Loop

**Goal**: A living pet that you can feed and play with in the terminal.

### Features

1. **Pet creation**: Player names their pet and chooses a species (cat, dog, dragon)
2. **Stat display**: Show pet name, species, life stage, and all stats as labeled bars
3. **Real-time tick**: Stats decay on a background timer (every 3 seconds)
4. **Core actions** (menu-driven):
   - **Feed** → hunger +25 (choose from 3 foods with different hunger/happiness effects)
   - **Play** → happiness +20, energy -10
   - **Sleep** → energy +30 (pet is unavailable for 5 ticks, stats still decay at half rate)
   - **Clean** → cleanliness +30
5. **Health logic**: Health drops by -3 per tick for each stat below 20. If health hits 0, the pet dies and the game displays a memorial screen.
6. **ASCII art**: Simple ASCII art for the pet that changes based on current mood (happy, neutral, sad, sick, sleeping)
7. **Save/Load**: Auto-save pet state to a JSON file on exit; load on start if a save exists. Store elapsed time so stats decay correctly on reload.

### Acceptance Criteria

- Player can start a new game, name a pet, and pick a species
- Stats visibly decrease over time in the terminal
- All four actions work and update stats correctly
- Pet dies if fully neglected
- Game persists across sessions via save file

### File Structure

```
tamagotchi/
  __init__.py
  main.py          # Entry point, game loop, input handling
  pet.py           # Pet class, stat management, tick logic
  display.py       # Terminal rendering, ASCII art, stat bars
  save.py          # Save/load JSON
  config.py        # Constants (decay rates, action values, tick interval)
```

---

## Milestone 2: Life Stages & Evolution

**Goal**: The pet grows through life stages over time, unlocking new interactions.

### Features

1. **Life stages with timers**:
   - Egg → Baby (10 ticks), Baby → Child (50 ticks), Child → Teen (100 ticks), Teen → Adult (200 ticks)
   - Evolution only triggers if health > 50 at the time threshold
2. **Stage-specific behavior**:
   - **Egg**: No actions available, just wait. Displays a hatching animation at transition.
   - **Baby**: Only Feed and Sleep available. Higher decay rates (1.5x).
   - **Child**: All core actions available. Normal decay.
   - **Teen**: Unlock mini-game (see below). Pet occasionally refuses actions (random 20% chance, displays rebellious message).
   - **Adult**: All features, lower decay rates (0.75x). Unlock the "teach trick" action.
3. **Teach trick** (Adult only): Spend happiness (-15) to teach a trick from a list (roll over, shake, dance, sing). Tricks are displayed in the status screen. Teaching can fail (30% chance), costing happiness with no reward.
4. **Evolution ASCII art**: Each stage has distinct ASCII art. Evolution plays a brief animation (3-frame transition).
5. **Stage-aware save/load**: Save file includes current stage and tick count toward next stage.

### Acceptance Criteria

- Pet progresses through all 5 life stages with visible transitions
- Actions are correctly restricted/modified per stage
- Teen rebellion mechanic works
- Adult trick system works
- Save/load preserves stage progression

### New/Modified Files

```
  pet.py           # Add stage logic, evolution checks, trick list
  display.py       # Stage-specific ASCII art, evolution animation
  config.py        # Stage thresholds, per-stage multipliers
```

---

## Milestone 3: Mini-Games & Economy

**Goal**: Interactive mini-games that reward currency, used to buy items from a shop.

### Features

1. **Currency**: Earn coins from mini-games. Displayed in the status bar.
2. **Mini-games** (unlocked at Teen stage):
   - **Number Guess**: Guess a number 1-10 in 3 tries. Reward: 10 coins (+ happiness +10).
   - **Rock Paper Scissors**: Best of 3 against the pet. Reward: 15 coins. Loss: happiness -5.
   - **Memory Sequence**: Pet shows a sequence of 4-7 symbols, player repeats them. Reward scales with length: length x 5 coins.
3. **Cooldowns**: Each mini-game has a cooldown (15 ticks). Energy cost: -15 per game.
4. **Shop**:
   - **Foods**: Apple (5 coins, hunger +15), Steak (15 coins, hunger +40, happiness +5), Cake (10 coins, hunger +10, happiness +20)
   - **Toys**: Ball (20 coins, happiness +10 per play for next 5 plays), Hat (30 coins, cosmetic - changes ASCII art)
   - **Medicine**: Potion (25 coins, health +30)
5. **Inventory**: Player holds purchased items. Foods/potions are consumable (single use). Toys are permanent.
6. **Toy effects**: If the player owns a Ball, the "Play" action gives +10 bonus happiness. Hat adds a hat to the ASCII art.
7. **Persistent economy**: Coins and inventory saved to the save file.

### Acceptance Criteria

- All 3 mini-games are playable and reward coins correctly
- Shop displays items with prices, allows purchase, deducts coins
- Inventory system works for consumables and permanent items
- Toy bonuses apply correctly to actions
- Cooldowns prevent mini-game spam
- Economy persists across saves

### New/Modified Files

```
  minigames.py     # Mini-game implementations
  shop.py          # Shop display, purchase logic
  inventory.py     # Inventory management
  pet.py           # Integrate toy bonuses into actions
  display.py       # Show coins, inventory, shop UI, cosmetics
  config.py        # Prices, rewards, cooldowns
```

---

## Milestone 4: Events, Achievements & Endgame

**Goal**: Random events add unpredictability, achievements provide long-term goals, and an endgame gives closure.

### Features

1. **Random events** (chance per tick, checked every 10 ticks):
   - **Sunny Day** (15%): Happiness +10 for all ticks in the next 30 ticks
   - **Rainstorm** (10%): Cleanliness -5 per tick for 10 ticks
   - **Found Coin** (10%): +5-20 random coins
   - **Sickness** (5%): Health -2 per tick until medicine is given
   - **Visitor** (10%): A friend pet visits. Happiness +15. Display a second ASCII pet briefly.
   - **Nightmare** (5%): Pet wakes up if sleeping, energy -20, happiness -10
   - Events display a notification banner at the top of the screen
2. **Achievements** (tracked and displayed on a dedicated screen):
   - "First Steps" - Hatch your pet
   - "Well Fed" - Feed your pet 50 times
   - "Best Friends" - Reach 100 happiness 10 times
   - "Trick Master" - Teach all 4 tricks
   - "High Roller" - Accumulate 500 coins total
   - "Survivor" - Keep your pet alive for 1000 ticks
   - "Mini-Game Pro" - Win each mini-game at least 5 times
   - "Fashionista" - Buy the Hat
   - "Doctor" - Cure sickness 5 times
   - "Perfect Day" - Have all stats above 80 simultaneously
3. **Achievement rewards**: Each achievement grants a one-time coin bonus (10-50 coins) and a permanent small stat bonus (+2 to a related stat's max effective decay offset).
4. **Endgame - Retirement**:
   - After 2000 ticks as an Adult, the pet can "retire"
   - Retirement screen shows: total time alive, achievements earned, tricks learned, coins earned lifetime, a farewell ASCII art scene
   - The save file is archived (renamed with timestamp) and a fresh game can begin
   - Player can choose to continue instead of retiring (no penalty)
5. **Stats summary**: A "Stats" menu option shows lifetime counters (times fed, games played, coins earned, etc.)

### Acceptance Criteria

- Random events trigger at correct rates and apply effects properly
- Sickness persists until medicine is used
- All 10 achievements are trackable and trigger correctly
- Achievement rewards apply
- Retirement option appears at the correct time
- Retirement summary displays accurate lifetime stats
- Archived save file is created on retirement
- Stats screen shows accurate lifetime counters

### New/Modified Files

```
  events.py        # Event definitions, trigger logic, active effect tracking
  achievements.py  # Achievement definitions, progress tracking, reward logic
  pet.py           # Integrate events into tick, retirement check
  display.py       # Event banners, achievement screen, retirement screen, stats screen
  save.py          # Archive save on retirement, track lifetime stats
  config.py        # Event probabilities, achievement thresholds
```

---

## Technical Notes

- **Python 3.9+** required
- **No external dependencies** for Milestones 1-2. Optional: `curses` for better terminal control in Milestones 3-4, but fallback to basic `print`/`input` loop should work.
- **Input handling**: Non-blocking input via `select` (Unix) or `msvcrt` (Windows), with a fallback to blocking input between ticks.
- **Tick engine**: Background thread runs the tick timer; main thread handles display and input. Use a lock to synchronize stat access.
- **Testing**: Each milestone should include unit tests for stat clamping, decay math, evolution thresholds, mini-game logic, event probabilities, and achievement tracking.
