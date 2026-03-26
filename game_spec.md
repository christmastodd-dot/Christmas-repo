# Mountain Climb - Game Spec

## Overview

**Genre:** Side-scrolling platformer
**Target Audience:** Children ages 6-12
**Platform:** TBD
**Levels:** Multiple (this spec covers Level 1)

---

## Level 1: Climb the Mountain

### Concept

The player controls a character who must climb to the top of a mountain. The level scrolls at a diagonal angle — the terrain visually rises from the lower-left to the upper-right so the player feels like they are ascending the entire time, not walking on flat ground. The trail follows a winding uphill slope with rocky switchbacks and visible elevation gain. Along the way, mountain goats charge downhill at the player and try to headbutt them. The player must jump over the goats to avoid taking damage.

### Core Mechanics

- **Movement:** The player moves along an uphill-sloping trail that scrolls diagonally (lower-left to upper-right). The terrain angle conveys a constant sense of climbing. Movement can be auto-scroll or player-controlled.
- **Jump:** The player can jump to avoid obstacles. A single button/key press triggers the jump.
- **Lives:** The player starts with **2 lives**.
  - Getting headbutted by a goat removes 1 life.
  - At 0 lives, it is game over and the player restarts Level 1 from the beginning.
- **Win Condition:** Reach the mountain summit to complete the level.

### Obstacles

- **Mountain Goats:** 5 goats are spaced throughout the level.
  - Goats charge downhill toward the player from further up the slope.
  - The player must jump over them to avoid being hit.
  - Goat positions are fixed at pre-set points along the trail so encounters are predictable and learnable.

### Level Duration

- Approximately **1 minute** of gameplay from start to summit.

### Visual Style

- Bright, colorful mountain environment appropriate for young children.
- The trail visibly ascends: the ground slopes upward, background layers (distant peaks, clouds, sky) shift with parallax to reinforce the feeling of gaining altitude.
- Elevation markers or visual cues (tree line fading, snow appearing, thinner clouds) show progress toward the summit.
- Friendly but mischievous-looking goats (not scary).
- Clear visual feedback when the player is hit (flash/blink) or when a goat is successfully avoided.

### Audio

- Upbeat background music.
- Sound effects for jumping, goat headbutts, life loss, and reaching the summit.

---

## Playable Milestones

### Milestone 1: Movement and Environment

**Goal:** Player can move through the level and reach the summit.

**Deliverables:**
- Ascending mountain environment rendered on screen — the trail slopes upward diagonally so the player visually climbs, not walks flat.
- Parallax background layers (distant mountains, sky, clouds) that shift to reinforce the sense of altitude gain.
- Player character displayed and controllable (move uphill, jump).
- Camera follows the player along the ascending path.
- Summit endpoint triggers a "Level Complete" message.
- Basic placeholder art (shapes/colors are fine).

**Acceptance Criteria:**
- The player can move from the base to the summit.
- The terrain clearly slopes upward — the player visually ascends throughout the level, never walks flat.
- Jumping works reliably and feels responsive.
- The level takes roughly 1 minute to traverse at a normal pace.
- A clear "Level Complete" state is reached at the summit.

---

### Milestone 2: Goats and Collision

**Goal:** Goats appear as obstacles and the life system is functional.

**Deliverables:**
- 5 mountain goats placed at pre-set positions along the trail.
- Goats animate a charging motion toward the player when the player is within range.
- Collision detection between the player and goats.
- Life system: player starts with 2 lives, loses 1 on each hit.
- Hit feedback: player character flashes/blinks on contact and gets a brief invincibility window.
- Game over screen on 0 lives with a "Restart" option that resets the level.
- Life counter displayed on screen (e.g., two heart icons).

**Acceptance Criteria:**
- All 5 goats appear at distinct points in the level.
- Jumping over a goat avoids damage; colliding with a goat removes a life.
- The life counter updates correctly on hit.
- Game over triggers on the second hit and the player can restart.
- The player gets a short invincibility period after being hit so they aren't immediately hit again.

---

### Milestone 3: Polish and Juice

**Goal:** The level feels complete, fun, and child-friendly.

**Deliverables:**
- Final art for the mountain environment, player character, and goats (colorful, kid-friendly style).
- Background music and sound effects (jump, hit, goat charge, level complete, game over).
- Start screen with a "Play" button.
- Animated level-complete celebration (e.g., character cheers, confetti).
- Game over screen with encouraging message (e.g., "Nice try! Let's go again!").
- Simple tutorial prompt at the start (e.g., "Press SPACE to jump over the goats!").
- Smooth scrolling and consistent frame rate.

**Acceptance Criteria:**
- The full level is playable from start screen through completion or game over.
- Art and audio are in place with no placeholder assets remaining.
- The game feels encouraging and appropriate for ages 6-12.
- Performance is smooth with no frame drops or visual glitches.
- A new player can understand how to play within seconds.
