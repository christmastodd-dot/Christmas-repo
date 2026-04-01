# Hawaii House: Path to Speaker
### Browser Game Specification

---

## Concept

A turn-based political simulation set in the Hawaii State House of Representatives. The player begins as a first-term independent legislator and maneuvers through a career of relationship-building, coalition politics, and strategic resource management with the ultimate goal of being elected Speaker of the House.

---

## Setting

- **Chamber:** Hawaii State House of Representatives — 51 seats
- **Turn length:** 1 month
- **Start date:** November (post-election, Year 1 of term)
- **Legislative calendar:**
  - November: Election results, orientation
  - December: Pre-session organizing (caucuses form, leadership selected)
  - January–May: Legislative session (bills, committees, floor votes)
  - June–October: Interim (district work, fundraising, relationship-building)
  - November (even years): General election with 5–18 seat turnover

---

## The House

### Representatives (51 total, including player)

Each representative has the following attributes:

| Attribute | Details |
|---|---|
| **District** | One of ~8 geographic regions: Honolulu urban core, Honolulu suburbs, Windward Oahu, Leeward Oahu, North Shore/Central Oahu, Maui County, Hawaii Island, Kauai/Molokai/Lanai |
| **Age** | 28–72 |
| **Ethnicity** | Drawn from Hawaii demographics: Japanese American, Filipino, Native Hawaiian, White/Haole, Chinese American, Korean American, Mixed/Other |
| **Gender** | Male / Female / Nonbinary |
| **Ideology** | Score from 1–10: 1 = Progressive left, 10 = Conservative right. Hawaii House skews 2–6, with occasional outliers |
| **Seniority** | Number of terms served (1–12) |
| **Warchest** | Campaign fundraising total |
| **Position** | Committee chair, leadership role, or backbencher |
| **Disposition** | Toward the player: Ally / Friendly / Neutral / Cool / Hostile |

### Affinity Calculation

The closer a representative is to the player across ideology, district, ethnicity, and gender, the higher their **base affinity** — and the lower the political capital cost to improve the relationship. Representatives with very different profiles require more capital and more creative relationship-building.

---

## Political Capital

The player's action currency, refreshed each turn.

**Base formula:**

```
Capital = Base(5) + Seniority Bonus + Warchest Bonus + Position Bonus
```

| Source | Bonus |
|---|---|
| Each term of seniority | +1 |
| Warchest $25k–$100k | +1 |
| Warchest $100k–$500k | +2 |
| Warchest $500k+ | +3 |
| Committee member | +0 |
| Committee vice-chair | +1 |
| Committee chair | +2 |
| Minority/Majority Whip | +3 |
| Minority/Majority Leader | +4 |
| Speaker (win condition) | — |

A first-term backbencher with no warchest starts with **5 capital/turn**.

---

## Core Actions

Actions cost political capital and have different availability by calendar phase.

| Action | Cost | Effect | Available |
|---|---|---|---|
| **Introduce yourself** | 1 | Small disposition boost; learn rep's profile | Any phase |
| **Social gesture** | 1 | Minor disposition boost (lunch, event invite) | Any phase |
| **Offer a favor** | 2 | Moderate boost; creates a reciprocal obligation | Any phase |
| **Political donation** | 2 + warchest | Disposition boost; boosts their warchest | Any phase |
| **Co-sponsor a bill** | 2 | Boost with bill's author and ideological allies | Session only |
| **Committee maneuver** | 3 | Advance or block a bill; earns loyalty or enmity | Session only |
| **Endorse in election** | 2 | Boost with endorsed rep; risk if they lose | Election month |
| **Recruit to faction** | 3 | Invite a Friendly/Ally to formally join your faction | Any phase |
| **Fundraise** | 2 | Grow your warchest | Interim only |
| **Seek leadership role** | 4 | Attempt to be appointed/elected to a position | Dec / leadership votes |

---

## Factions

Factions are formal political coalitions within the House. They have a name, a loose ideology, a leader, and member count.

- At game start, 3–4 NPC factions exist (e.g., a Progressive Caucus, a moderate Business-friendly caucus, a Rural/neighbor island caucus)
- The player starts unaffiliated
- At 3+ members the player can **found their own faction**
- Faction size confers bonuses: larger factions have more sway in leadership elections, committee assignments, and floor votes
- Factions can **merge, fracture, or flip** based on political events and player actions

---

## Winning: The Speaker Election

The Speaker is elected by the full House at the start of each new legislative session (December organizing period after an election). To win:

1. Secure a **formal majority pledge** from 26 of 51 members
2. Survive a floor vote in December

The Speaker race is the final milestone. Other factions will mount competing candidates. The player must outmaneuver them through the career mechanics built in Milestones 1 and 2.

---

---

# MILESTONE 1: First Steps
**"Learn the chamber, survive your first session"**

### Scope

A playable vertical slice demonstrating the core monthly loop, the House roster, and basic relationship-building — no factions yet.

### Features

**1. Character Creation**
- Player chooses: name, district (one of 8 regions), age (28–45), ethnicity, gender, and ideology (1–10 slider with descriptive labels)
- Warchest starts at $15,000; seniority 0; no position

**2. House Roster Generation**
- Generate 50 NPC representatives procedurally with all attributes
- Hawaii-accurate name pool and demographic distribution
- Each NPC has a starting disposition of Neutral toward the player (with slight variance based on affinity)

**3. Minimalist House UI**
- A visual grid or chamber seating chart of all 51 seats
- Color-coded by disposition toward player: Ally (green), Friendly (light green), Neutral (gray), Cool (yellow), Hostile (red)
- A separate **Ideology Bar** showing the full House distribution on a left-right axis
- Click any seat to view the representative's profile card

**4. Turn System**
- Month/year displayed in header
- Political capital shown as a point pool (e.g., 5/5)
- "End Turn" button advances the month
- Calendar phase label shown (Pre-Session / Session / Interim)

**5. Available Actions (Milestone 1 subset)**
- Introduce yourself (cost: 1) — unlocks the rep's full profile
- Social gesture (cost: 1) — small disposition boost
- Political donation (cost: 2, reduces warchest by $5k) — moderate boost

**6. Event Feed**
- A text feed logs what happened each turn: "You had lunch with Rep. Kahananui. She seems more open to you."
- Simple NPC events fire occasionally: a bill passes, a representative announces a committee interest

**7. Win Condition for Milestone 1**
- End the first legislative session (end of May, Year 1) with at least **5 representatives at Friendly or better**
- Display a simple end-of-session summary screen

### What's NOT in Milestone 1
- Factions
- Committee assignments
- Elections
- Warchest fundraising
- Leadership positions
- The Speaker race

---

# MILESTONE 2: Coalition Builder
**"Form a faction, accumulate power, survive an election cycle"**

### Scope

Adds factions, the full action set, committee mechanics, the first election, and NPC political competition. The player now feels real political pressure.

### New Features

**1. Factions Panel**
- Sidebar or overlay showing all active factions: name, leader, member count, ideological center
- Player faction created once they hit 3 recruited allies
- Color-coded faction blocs visible on the House seating chart
- Faction tooltip shows current legislative agenda and known positions

**2. Full Action Menu**
- All core actions now available (see Actions table above)
- Actions have contextual availability (session vs. interim vs. election)
- "Recruit to Faction" action unlocked once player has 2 Allies

**3. NPC Faction AI**
- 3–4 NPC factions compete for members, committee influence, and eventually the Speakership
- Each faction leader has a rudimentary strategy: one focuses on ideology, one on seniority, one on geographic bloc
- NPCs spend their own (invisible) capital each turn — player can observe faction size shifts

**4. Committee System**
- In December (organizing), committee assignments are distributed
- Player can spend capital to lobby for desired assignments
- Chairing a committee (requires seniority + faction backing) grants +2 capital/turn
- During session, the player can use "Committee maneuver" to shape bills and earn/lose relationships

**5. Campaign Warchest**
- "Fundraise" action available during interim
- Donations received from supported reps if relationship is strong
- Warchest tier affects capital generation and attractiveness as an ally

**6. Election Cycle (even years)**
- November of Year 2: general election fires
- 5–18 NPC seats turn over; some allies may lose their seats
- New freshman reps generated with fresh profiles
- Player faces a reelection roll (automatic pass in Milestone 2, contested in Milestone 3)
- Post-election: factions reorganize; player must re-recruit displaced allies

**7. Win Condition for Milestone 2**
- End of Year 2 (after the election and December organizing) with:
  - A named faction with at least 8 members
  - At least one committee chairmanship or leadership position
  - A warchest over $100,000

---

# MILESTONE 3: Path to Speaker
**"Run the gauntlet — become Speaker of the House"**

### Scope

The complete game loop. All systems active. Player can now pursue the Speakership through the full Speaker election mechanic.

### New Features

**1. Speaker Race Mechanic**
- Triggered each December after an election year
- Any faction leader with 10+ members can declare candidacy
- Player may declare if they meet threshold
- A **Pledge Tracker** appears: shows which members are pledged to which candidate (or undecided)
- Each turn in December the player can spend capital to flip undecided or weakly-pledged members
- NPC candidates do the same — relationships built over prior years determine the starting pledge count
- Floor vote on final day of December: majority (26+) wins

**2. Leadership Ladder**
- Full leadership track: Backbencher → Caucus Chair → Whip → Majority/Minority Leader → Speaker candidate
- Each step requires a formal leadership vote among the caucus
- Holding leadership positions increases capital and visibility but attracts NPC opposition

**3. Player Reelection**
- In even-year November, player faces their own district race
- Outcome influenced by warchest, district approval (tracked loosely by actions taken in district), and ideology fit
- Losing reelection ends the game

**4. Political Events**
- Random events fire each turn with political consequences:
  - Scandal (NPC or player): disposition hits
  - Federal funding opportunity: factions compete for credit
  - Redistricting: shifts district compositions slightly
  - Leadership vacancy: opens a ladder slot early

**5. Relationship Depth**
- Long-term Allies accumulate **loyalty scores** — they're harder for NPC factions to poach
- Burning an ally (blocking their bill, endorsing their opponent) creates a **grievance** that persists

**6. Win / Loss Conditions**
- **Win:** Player is elected Speaker of the House (floor majority vote in December)
- **Loss paths:**
  - Lose reelection in own district
  - Drop below 3 faction members for 2 consecutive turns (faction collapses)
  - Fail to secure 26 pledges by end of December organizing period (another candidate wins)

**7. End Screen**
- Win: brief illustrated splash + career summary stats (years served, bills co-sponsored, peak faction size, capital spent)
- Loss: summary with a note on what coalition eventually succeeded

---

## UI Philosophy (All Milestones)

- **Palette:** Off-white background, dark slate text, accent colors per faction (muted: olive, slate blue, rust, teal)
- **Typography:** Clean sans-serif, generous whitespace
- **No map sprites or avatars** — data-forward, abstract representations
- **House View:** Seating grid (primary view) — each seat is a small labeled square
- **Ideology Bar:** Horizontal spectrum, dots per member, always visible
- **Faction Panel:** Vertical list, expandable per faction
- **Rep Profile Card:** Slides in on click — shows all attributes, current disposition, relationship history log
- **Action Menu:** Contextual panel per selected rep — shows available actions, costs, and expected effect range
- **Turn Summary Modal:** Fires at end of each turn — summarizes what changed, what NPCs did visibly, any events

---

## Technical Notes

- Built in vanilla HTML/CSS/JS or lightweight framework (Svelte recommended for reactivity)
- All game state in a single JS object — serializable to localStorage for save/load
- NPC AI is deterministic with seeded randomness for reproducibility
- Procedural generation for House roster at game start
- No backend required — fully client-side

---

*Spec version 1.0 — Ready for Milestone 1 implementation*
