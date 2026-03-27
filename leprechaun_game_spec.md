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

### Milestone 2 — Moving Platforms, Levels 2-3 & Unicorn Power-Up
**Goal:** Expand to three playable levels with moving clouds and the unicorn power-up.

**Deliverables:**
- Horizontal and vertical cloud movement patterns
- Level 2 layout with drifting clouds and sunset background
- Level 3 layout with mixed movement clouds and storm background with lightning flashes
- Level progression system: completing a level advances to the next
- Unicorn power-up collectible and 10-second flight mechanic
- Rainbow trail particle effect behind the unicorn
- Star-ring countdown timer for power-up duration
- Graceful power-up expiration (drop to nearest cloud)
- One unicorn placed in Level 2, one in Level 3

**Done when:** A player can play through Levels 1-3 in sequence, use the unicorn power-up to fly, and experience increasing difficulty with moving platforms.

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
