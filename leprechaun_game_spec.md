# Lucky Leprechaun: Rainbow Run - Game Specification

## Overview

A kid-friendly 2D side-scrolling platformer featuring a pixel art leprechaun who hops across clouds to reach a pot of gold at the end of a rainbow. The game has five levels of increasing difficulty, three lives, and a unicorn power-up.

---

## Core Gameplay

### Player Character
- Pixel art leprechaun with idle, jump, land, and fall animations
- Controls: **Left/Right** to move, **Space/Up** to jump
- The leprechaun runs and jumps across clouds suspended in the sky
- If the leprechaun falls off the bottom of the screen, the player loses a life and restarts the current level

### Objective
- Reach the pot of gold at the end of the rainbow at the far right side of each level
- Survive all five levels to win the game

### Lives
- The player starts with **3 lives**
- A life is lost when the leprechaun falls off the clouds
- When all lives are lost, the game displays a "Game Over" screen with an option to restart from Level 1
- Lives are displayed as small clover icons in the top-left corner of the screen

### Level Structure
- Each level scrolls left-to-right and takes roughly **40 seconds** to complete
- A rainbow arc spans the sky in the background, growing more visible as the player nears the end
- Each level ends with a pot of gold sitting on a final large cloud beneath the rainbow's end
- Touching the pot of gold triggers a coin-burst celebration animation and advances to the next level

---

## Levels

### Level 1 - Green Meadow Sky
- **Difficulty:** Easy
- Large, wide clouds spaced close together
- Clouds are static (no movement)
- Gentle background: blue sky, rolling green hills below, birds flying
- Introduces the player to jumping and movement
- 10-12 cloud platforms total

### Level 2 - Breezy Heights
- **Difficulty:** Easy-Medium
- Mix of large and medium clouds
- Some clouds drift slowly left and right on a short horizontal path
- Gaps between clouds are slightly wider
- Background shifts to a sunset palette with warm oranges and pinks
- 12-14 cloud platforms total

### Level 3 - Stormy Stretch
- **Difficulty:** Medium
- Medium and small clouds, fewer large ones
- More clouds move horizontally; some move vertically (bobbing up and down)
- Occasional gaps require well-timed jumps
- Background: gray-purple storm clouds in the distance with gentle lightning flashes (cosmetic only, not hazards)
- 14-16 cloud platforms total

### Level 4 - Windy Peaks
- **Difficulty:** Medium-Hard
- Mostly small and medium clouds
- Faster-moving platforms and wider gaps
- Introduction of **disappearing clouds**: clouds that fade and vanish 1.5 seconds after the leprechaun lands on them, then reappear after 3 seconds
- Background: high-altitude sky with stars beginning to appear
- 14-18 cloud platforms total

### Level 5 - Rainbow's End
- **Difficulty:** Hard
- Small clouds, many moving quickly in various directions
- Multiple disappearing clouds in sequence
- The longest gaps in the game, requiring precise timing
- The rainbow is vivid and fully visible in the background, arching toward the final pot of gold
- Background: a magical twilight sky with shimmering stars and aurora-like colors
- 16-20 cloud platforms total

---

## Power-Up: Unicorn Ride

### Description
A sparkling winged unicorn appears on a special rainbow-colored cloud platform. When the leprechaun touches it, the leprechaun mounts the unicorn and can **fly freely** in any direction for **10 seconds**.

### Behavior
- While riding, the leprechaun does not need to land on clouds and cannot fall
- The unicorn leaves a **rainbow trail** behind it as it flies
- A visible countdown timer (styled as a ring of stars) shows the remaining duration
- When the 10 seconds expire, the unicorn fades away with a sparkle effect and the leprechaun gently drops onto the nearest cloud below
- If no cloud is below when the power-up ends, the leprechaun enters a short grace period (1 second) of slow descent to reach a platform before normal gravity resumes

### Placement
- **Level 2:** One unicorn, placed roughly at the midpoint — introduces the mechanic
- **Level 3:** One unicorn, placed just before a difficult cloud sequence
- **Level 4:** One unicorn, placed in the first third of the level
- **Level 5:** Two unicorns, one near the start and one near the end, both positioned before the hardest sections

---

## Playable Milestones

### Milestone 1 — Core Movement & Level 1
**Goal:** Playable leprechaun with basic platforming on static clouds.

**Deliverables:**
- Pixel art leprechaun with idle, run, and jump animations
- Left/right movement and jump controls
- Static cloud platforms laid out for Level 1
- Collision detection: landing on clouds, falling off-screen
- 3-life system with clover HUD icons
- Fall-off-screen triggers life loss and level restart
- Game Over screen when all lives are lost
- Level 1 background (blue sky, green hills)
- Pot of gold at the end of Level 1 with a simple win/celebration screen

**Done when:** A player can move, jump across Level 1's clouds, lose lives by falling, and complete the level by reaching the pot of gold.

### Milestone 2 — Level 2: Breezy Heights (3 sub-milestones)

Level 2 is 3x longer than Level 1 (~30 cloud platforms across ~7000px). It introduces moving clouds, Mario-style crow enemies, and the unicorn power-up, all set against a sunset sky.

#### Milestone 2A — Level System & Level 2 Base Layout (3 sub-parts)

##### 2A-i — Level System & Progression
**Goal:** Refactor the single-level game into a multi-level architecture.

**Deliverables:**
- `LEVELS` array with per-level config objects (clouds, pot position, final cloud, world width, background type)
- `currentLevel` index variable (0-based)
- `resetLevel()` reads from `LEVELS[currentLevel]` instead of hardcoded constants
- Level 1 data extracted from existing constants into `LEVELS[0]` — no gameplay change
- Level 2 stub entry in `LEVELS[1]` (can reuse Level 1 layout temporarily)
- "Level Complete" transition screen: shown when pot of gold is reached if more levels remain; press Space to advance
- "Game Complete" screen: shown after final level
- Lives persist across levels; game over resets to Level 1
- Level indicator in HUD ("Level 1", "Level 2")

**Done when:** Player beats Level 1, sees "Level Complete", presses Space, and loads Level 2 (stub). Existing Level 1 gameplay is unchanged.

##### 2A-ii — Level 2 Layout & Sunset Background
**Goal:** Build the actual Level 2 world — 3x longer with a sunset sky.

**Deliverables:**
- Level 2 cloud layout: ~30 platforms across ~7000px
  - All static for now (moving clouds come in 2A-iii)
  - Mix of large (w:180-250), medium (w:120-160), and small (w:90-120) clouds
  - Gaps slightly wider than Level 1, with occasional rest platforms
- Sunset background function: gradient sky (deep purple → rose → orange → gold), darker hills, warm-tinted decorative clouds
- Background selection based on `level.bgType` ('day' or 'sunset')
- Per-level rainbow arc and pot of gold positioned at Level 2's final cloud
- Level 2 `worldWidth` set to ~7500

**Done when:** Player can play through Level 2's full 30-platform layout with the sunset background and reach the pot of gold.

##### 2A-iii — Moving Clouds & Player Carry
**Goal:** Make selected Level 2 clouds move and carry the player with them.

**Deliverables:**
- Cloud movement system: each cloud can have optional `moveType` ('h' or 'v'), `moveRange` (pixels), and `moveSpeed` (multiplier)
- `updateClouds()` function: tracks `originX`/`originY`, applies sinusoidal movement, records per-frame `dx`/`dy` deltas
- Player carry: when standing on a moving cloud, the player's position updates by the cloud's `dx`/`dy` each frame
- ~10 Level 2 clouds set to drift horizontally (range 40-80px, speed 1.0-2.0)
- ~4 Level 2 clouds set to bob vertically (range 25-45px, speed 0.8-1.5)
- Static clouds remain as rest points between moving sections
- Level 1 clouds remain fully static (no movement config)

**Done when:** Moving clouds drift/bob smoothly, the player rides them without slipping off, and the mix of static + moving platforms feels like a step up in difficulty from Level 1.

#### Milestone 2B — Crow Enemies (Mario-style obstacles)
**Goal:** Add patrolling crow enemies to Level 2 that the player can stomp or be hurt by.

**Deliverables:**
- Crow enemy: small pixel-art bird (procedural canvas drawing) that patrols back and forth on a cloud
- ~6-8 crows placed on various clouds throughout Level 2
- Crows walk along their cloud surface, reversing direction at the edges
- Crows on moving clouds ride with the cloud
- **Stomp mechanic (Mario-style):** if the player lands on a crow from above (falling, vy > 0), the crow is defeated — it disappears with a poof particle effect and the player bounces upward
- **Side/bottom hit:** if the player touches a crow from the side or below, the player loses a life (same as falling)
- Defeated crows stay gone until the level is restarted
- No crows in Level 1 (keep it as the gentle intro)

**Done when:** Crows patrol on Level 2 clouds, can be stomped Mario-style for a satisfying bounce, and hurt the player on side contact.

#### Milestone 2C — Unicorn Power-Up
**Goal:** Add the flying unicorn power-up to Level 2.

**Deliverables:**
- Unicorn collectible: a glowing rainbow orb floating above a specific cloud (~midpoint of Level 2), with a gentle bob animation and sparkle particles
- On contact: the leprechaun activates flight mode for **10 seconds**
- **Flight mode:**
  - No gravity; free movement in all 4 directions (arrow keys / WASD)
  - Slightly faster speed than walking
  - Rainbow trail: colored particles left behind the player as they fly, fading over ~1 second
  - Invulnerable to crows while flying
- **Countdown timer:** circular arc drawn around the player that shrinks as time runs out; color shifts from green → yellow → red in the last 3 seconds
- **Expiration:** when the timer hits zero, flight ends; the player gets a 1-second slow-fall grace period (reduced gravity) to land on a cloud before normal physics resume
- One unicorn pickup in Level 2 (placed before a difficult section of moving clouds)
- Unicorn pickup does not respawn once collected (resets on death/restart)

**Done when:** Player can collect the unicorn orb, fly freely for 10 seconds with a rainbow trail, see the countdown timer, and land gracefully when it expires.

### Milestone 3 — Disappearing Clouds, Levels 4-5 & Polish
**Goal:** Complete all five levels with full difficulty progression and visual polish.

**Deliverables:**
- Disappearing cloud mechanic (fade after 1.5s on contact, reappear after 3s)
- Level 4 layout with fast platforms, disappearing clouds, and starry sky background
- Level 5 layout with the hardest platforming and magical twilight background
- Two unicorn power-ups placed in Level 5
- Coin-burst celebration animation when touching the pot of gold at each level end
- Full game victory screen after completing Level 5
- Background music: cheerful Irish-inspired chiptune loop
- Sound effects: jump, land, fall, power-up collect, power-up expire, coin burst, game over
- Visual polish pass: cloud puff particles on landing, sparkle effects on the pot of gold, smooth camera scrolling

**Done when:** All five levels are playable start to finish, difficulty ramps appropriately, all audio and visual effects are in place, and the game feels complete and fun for a kid audience.

---

## Art Style
- **Pixel art** throughout — chunky, colorful, and friendly
- 16x16 or 32x32 sprite base for the leprechaun and power-ups
- Clouds are soft white and gray with subtle shading
- The rainbow uses bold, saturated colors
- UI elements (lives, timer) use a clean pixel font

## Target Audience
- Kids ages 5-10
- Simple controls (2-3 buttons), forgiving early levels, encouraging visual feedback
- No violent or scary content; falling simply resets the level with a gentle "whoops" animation

## Technical Notes
- 2D side-scroller with horizontal camera tracking
- Target resolution: 800x600 or 1280x720 (scalable)
- Frame rate: 60 FPS target
- Engine/framework: TBD (e.g., Pygame, Godot, Phaser, or similar)
