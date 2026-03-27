#!/usr/bin/env python3
"""
Mountain Climb - Level 1
A side-scrolling platformer where you climb a mountain and jump over goats!
Target audience: children ages 6-12
"""

import pygame
import sys
import math
import random

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------
SCREEN_WIDTH = 800
SCREEN_HEIGHT = 600
FPS = 60

# The total length of the level in "world x" units.  At the player's walk
# speed (~160 px/s world-x) this gives roughly 60 seconds of gameplay.
LEVEL_LENGTH = 9600

# Slope: for every 1 px moved in world-x the trail rises by SLOPE px.
SLOPE = 0.30

# Colors
SKY_TOP = (100, 180, 255)
SKY_BOTTOM = (200, 230, 255)
SNOW_COLOR = (245, 245, 255)
ROCK_COLOR = (140, 130, 120)
GRASS_COLOR = (90, 180, 80)
TRAIL_COLOR = (180, 160, 130)
TREE_GREEN = (40, 140, 50)
TREE_TRUNK = (100, 70, 40)
CLOUD_COLOR = (255, 255, 255)
SUMMIT_COLOR = (255, 215, 0)
HEART_COLOR = (220, 40, 40)

PLAYER_COLOR = (50, 120, 220)
PLAYER_EYE = (255, 255, 255)
PLAYER_PUPIL = (30, 30, 30)
PLAYER_MOUTH = (220, 80, 80)

GOAT_BODY = (240, 230, 210)
GOAT_HORN = (200, 180, 140)
GOAT_EYE = (40, 40, 40)

# Player physics
PLAYER_SPEED = 160          # world-x pixels per second
JUMP_VELOCITY = -520        # initial upward velocity
GRAVITY = 1400              # px / s^2

# Goat settings
NUM_GOATS = 5
GOAT_CHARGE_SPEED = 200     # px/s toward the player (world-x)
GOAT_TRIGGER_DIST = 400     # how close before a goat starts charging

# Invincibility after being hit (seconds)
INVINCIBILITY_TIME = 1.5

# Confetti for win celebration
NUM_CONFETTI = 80

# ---------------------------------------------------------------------------
# Helper: draw gradient sky
# ---------------------------------------------------------------------------
def draw_sky(surface):
    for y in range(SCREEN_HEIGHT):
        t = y / SCREEN_HEIGHT
        r = int(SKY_TOP[0] + (SKY_BOTTOM[0] - SKY_TOP[0]) * t)
        g = int(SKY_TOP[1] + (SKY_BOTTOM[1] - SKY_TOP[1]) * t)
        b = int(SKY_TOP[2] + (SKY_BOTTOM[2] - SKY_TOP[2]) * t)
        pygame.draw.line(surface, (r, g, b), (0, y), (SCREEN_WIDTH, y))


# Cache the sky surface so we only compute the gradient once.
_sky_cache = None


def get_sky(surface):
    global _sky_cache
    if _sky_cache is None or _sky_cache.get_size() != surface.get_size():
        _sky_cache = pygame.Surface(surface.get_size())
        draw_sky(_sky_cache)
    return _sky_cache


# ---------------------------------------------------------------------------
# Helper: world -> screen coordinate conversion
# ---------------------------------------------------------------------------
def world_to_screen(wx, wy, camera_wx, camera_wy):
    """Convert world coords to screen coords given camera world position."""
    sx = wx - camera_wx + SCREEN_WIDTH * 0.35   # player sits at 35% from left
    sy = wy - camera_wy + SCREEN_HEIGHT * 0.65  # player sits at 65% from top
    return (sx, sy)


def trail_y(wx):
    """Return the world-y of the trail surface at a given world-x."""
    return -wx * SLOPE


# ---------------------------------------------------------------------------
# Parallax backgrounds
# ---------------------------------------------------------------------------
def draw_distant_mountains(surface, camera_wx, camera_wy):
    """Distant mountain range that scrolls at 20% of camera speed."""
    parallax = 0.2
    base_y = SCREEN_HEIGHT * 0.55
    offset_x = -camera_wx * parallax
    offset_y = -camera_wy * parallax
    peaks = [
        (0, 180), (150, 80), (300, 140), (450, 60), (600, 120),
        (750, 90), (900, 160), (1050, 70), (1200, 130), (1400, 100),
        (1600, 150), (1800, 65), (2000, 110),
    ]
    points = []
    for px, py in peaks:
        sx = (px + offset_x) % (SCREEN_WIDTH + 400) - 200
        sy = base_y - py + offset_y * 0.3
        points.append((sx, sy))
    # close the polygon at the bottom
    points.append((SCREEN_WIDTH + 200, SCREEN_HEIGHT))
    points.append((-200, SCREEN_HEIGHT))
    if len(points) >= 3:
        pygame.draw.polygon(surface, (170, 180, 200), points)


def draw_mid_mountains(surface, camera_wx, camera_wy):
    """Mid-ground mountains at 40% parallax."""
    parallax = 0.4
    base_y = SCREEN_HEIGHT * 0.65
    offset_x = -camera_wx * parallax
    offset_y = -camera_wy * parallax
    peaks = [
        (0, 140), (200, 60), (350, 100), (500, 50), (700, 120),
        (900, 70), (1100, 110), (1300, 55), (1500, 95), (1700, 80),
    ]
    points = []
    for px, py in peaks:
        sx = (px + offset_x) % (SCREEN_WIDTH + 300) - 150
        sy = base_y - py + offset_y * 0.3
        points.append((sx, sy))
    points.append((SCREEN_WIDTH + 150, SCREEN_HEIGHT))
    points.append((-150, SCREEN_HEIGHT))
    if len(points) >= 3:
        pygame.draw.polygon(surface, (130, 145, 130), points)


def draw_clouds(surface, camera_wx, camera_wy, progress):
    """Draw clouds that thin out as the player climbs higher."""
    parallax = 0.15
    ox = -camera_wx * parallax
    oy = -camera_wy * parallax
    num_clouds = max(2, int(8 * (1 - progress * 0.7)))
    random.seed(42)  # deterministic cloud placement
    for i in range(num_clouds):
        cx = random.randint(0, 1600)
        cy = random.randint(30, 200)
        w = random.randint(80, 160)
        h = random.randint(25, 50)
        sx = (cx + ox) % (SCREEN_WIDTH + 300) - 150
        sy = cy + oy * 0.2
        alpha = int(200 * (1 - progress * 0.5))
        cloud_surf = pygame.Surface((w, h), pygame.SRCALPHA)
        pygame.draw.ellipse(cloud_surf, (*CLOUD_COLOR, alpha), (0, 0, w, h))
        pygame.draw.ellipse(cloud_surf, (*CLOUD_COLOR, alpha),
                            (w * 0.2, -h * 0.3, w * 0.6, h * 0.8))
        surface.blit(cloud_surf, (sx, sy))
    random.seed()  # restore randomness


# ---------------------------------------------------------------------------
# Trail / terrain drawing
# ---------------------------------------------------------------------------
def draw_terrain(surface, camera_wx, camera_wy, progress):
    """Draw the ascending trail and surrounding terrain."""
    # We draw vertical slices of terrain across the screen.
    step = 4
    ground_points = []
    for sx in range(-step, SCREEN_WIDTH + step * 2, step):
        wx = camera_wx - SCREEN_WIDTH * 0.35 + sx
        wy = trail_y(wx)
        _, sy = world_to_screen(wx, wy, camera_wx, camera_wy)
        ground_points.append((sx, sy))

    # Fill below the trail with layered colors
    if len(ground_points) >= 2:
        # Rock / ground fill
        fill = ground_points + [(SCREEN_WIDTH + step, SCREEN_HEIGHT + 10),
                                (-step, SCREEN_HEIGHT + 10)]
        # Choose ground colour based on progress (grass -> rock -> snow)
        if progress < 0.3:
            col = GRASS_COLOR
        elif progress < 0.7:
            t = (progress - 0.3) / 0.4
            col = tuple(int(GRASS_COLOR[i] + (ROCK_COLOR[i] - GRASS_COLOR[i]) * t) for i in range(3))
        else:
            t = (progress - 0.7) / 0.3
            col = tuple(int(ROCK_COLOR[i] + (SNOW_COLOR[i] - ROCK_COLOR[i]) * t) for i in range(3))
        pygame.draw.polygon(surface, col, fill)

        # Trail surface (a band along the slope)
        trail_top = [(x, y - 6) for x, y in ground_points]
        trail_bot = [(x, y + 6) for x, y in ground_points]
        trail_poly = trail_top + trail_bot[::-1]
        pygame.draw.polygon(surface, TRAIL_COLOR, trail_poly)


def draw_trees(surface, camera_wx, camera_wy, progress):
    """Draw trees that thin out with altitude."""
    if progress > 0.65:
        return
    density = max(0, 1 - progress * 1.5)
    random.seed(17)
    for i in range(30):
        wx = i * 340 + random.randint(-40, 40)
        wy = trail_y(wx) + random.choice([-50, -60, -70, 50, 60, 70])
        sx, sy = world_to_screen(wx, wy, camera_wx, camera_wy)
        if sx < -60 or sx > SCREEN_WIDTH + 60:
            continue
        if random.random() > density:
            continue
        # trunk
        pygame.draw.rect(surface, TREE_TRUNK, (sx - 4, sy - 30, 8, 30))
        # foliage
        pygame.draw.polygon(surface, TREE_GREEN,
                            [(sx, sy - 65), (sx - 20, sy - 30), (sx + 20, sy - 30)])
        pygame.draw.polygon(surface, TREE_GREEN,
                            [(sx, sy - 80), (sx - 15, sy - 50), (sx + 15, sy - 50)])
    random.seed()


def draw_summit_flag(surface, camera_wx, camera_wy):
    """Draw a flag at the summit."""
    wx = LEVEL_LENGTH
    wy = trail_y(wx)
    sx, sy = world_to_screen(wx, wy, camera_wx, camera_wy)
    # pole
    pygame.draw.line(surface, (100, 80, 60), (sx, sy), (sx, sy - 80), 4)
    # flag
    pygame.draw.polygon(surface, SUMMIT_COLOR,
                        [(sx, sy - 80), (sx + 40, sy - 65), (sx, sy - 50)])


# ---------------------------------------------------------------------------
# Player drawing
# ---------------------------------------------------------------------------
def draw_player(surface, sx, sy, facing_right, flash):
    """Draw a cute kid-friendly player character."""
    if flash and (pygame.time.get_ticks() // 100) % 2 == 0:
        return  # blink effect during invincibility

    # Body (rounded rectangle via circle + rect)
    body_rect = pygame.Rect(sx - 14, sy - 36, 28, 28)
    pygame.draw.rect(surface, PLAYER_COLOR, body_rect, border_radius=8)

    # Head
    head_cx, head_cy = sx, sy - 46
    pygame.draw.circle(surface, PLAYER_COLOR, (head_cx, head_cy), 14)

    # Eyes
    ex_off = 5 if facing_right else -5
    pygame.draw.circle(surface, PLAYER_EYE, (head_cx + ex_off - 3, head_cy - 2), 4)
    pygame.draw.circle(surface, PLAYER_EYE, (head_cx + ex_off + 5, head_cy - 2), 4)
    pygame.draw.circle(surface, PLAYER_PUPIL, (head_cx + ex_off - 2, head_cy - 2), 2)
    pygame.draw.circle(surface, PLAYER_PUPIL, (head_cx + ex_off + 6, head_cy - 2), 2)

    # Mouth (smile)
    mouth_x = head_cx + (3 if facing_right else -3)
    pygame.draw.arc(surface, PLAYER_MOUTH,
                    (mouth_x - 5, head_cy + 2, 10, 8), math.pi, 2 * math.pi, 2)

    # Legs
    pygame.draw.rect(surface, PLAYER_COLOR, (sx - 10, sy - 10, 8, 12), border_radius=3)
    pygame.draw.rect(surface, PLAYER_COLOR, (sx + 2, sy - 10, 8, 12), border_radius=3)

    # Shoes
    pygame.draw.rect(surface, (80, 60, 40), (sx - 12, sy - 2, 10, 5), border_radius=2)
    pygame.draw.rect(surface, (80, 60, 40), (sx + 2, sy - 2, 10, 5), border_radius=2)


# ---------------------------------------------------------------------------
# Goat drawing
# ---------------------------------------------------------------------------
def draw_goat(surface, sx, sy, facing_left):
    """Draw a friendly mountain goat."""
    flip = -1 if facing_left else 1

    # Body
    body_rect = pygame.Rect(sx - 22, sy - 22, 44, 24)
    pygame.draw.ellipse(surface, GOAT_BODY, body_rect)

    # Head
    hx = sx + 22 * flip
    hy = sy - 22
    pygame.draw.circle(surface, GOAT_BODY, (hx, hy), 11)

    # Horns
    pygame.draw.arc(surface, GOAT_HORN,
                    (hx - 8 + 6 * flip, hy - 20, 16, 20),
                    0.3, 2.8, 3)

    # Eye
    pygame.draw.circle(surface, GOAT_EYE, (hx + 4 * flip, hy - 2), 3)

    # Legs
    for lx_off in [-14, -6, 6, 14]:
        pygame.draw.rect(surface, (180, 170, 155),
                         (sx + lx_off - 3, sy - 2, 6, 14), border_radius=2)

    # Hooves
    for lx_off in [-14, -6, 6, 14]:
        pygame.draw.rect(surface, (80, 70, 60),
                         (sx + lx_off - 3, sy + 10, 6, 4), border_radius=1)


# ---------------------------------------------------------------------------
# HUD
# ---------------------------------------------------------------------------
def draw_hearts(surface, lives):
    for i in range(2):
        cx = 40 + i * 40
        cy = 40
        color = HEART_COLOR if i < lives else (80, 80, 80)
        # simple heart shape from two circles + triangle
        pygame.draw.circle(surface, color, (cx - 6, cy - 4), 8)
        pygame.draw.circle(surface, color, (cx + 6, cy - 4), 8)
        pygame.draw.polygon(surface, color,
                            [(cx - 13, cy - 1), (cx + 13, cy - 1), (cx, cy + 14)])


def draw_progress_bar(surface, progress):
    bar_x, bar_y = SCREEN_WIDTH - 180, 30
    bar_w, bar_h = 150, 16
    pygame.draw.rect(surface, (60, 60, 60), (bar_x - 2, bar_y - 2, bar_w + 4, bar_h + 4),
                     border_radius=4)
    pygame.draw.rect(surface, (180, 180, 180), (bar_x, bar_y, bar_w, bar_h), border_radius=3)
    fill_w = int(bar_w * min(progress, 1.0))
    if fill_w > 0:
        pygame.draw.rect(surface, (80, 200, 80), (bar_x, bar_y, fill_w, bar_h), border_radius=3)
    # mountain icon at end
    mx = bar_x + bar_w + 12
    my = bar_y + bar_h // 2
    pygame.draw.polygon(surface, (120, 110, 100),
                        [(mx, my - 10), (mx - 8, my + 6), (mx + 8, my + 6)])
    pygame.draw.polygon(surface, SNOW_COLOR,
                        [(mx, my - 10), (mx - 3, my - 4), (mx + 3, my - 4)])


# ---------------------------------------------------------------------------
# Confetti (win celebration)
# ---------------------------------------------------------------------------
class Confetti:
    def __init__(self):
        self.pieces = []
        for _ in range(NUM_CONFETTI):
            self.pieces.append({
                "x": random.randint(0, SCREEN_WIDTH),
                "y": random.randint(-SCREEN_HEIGHT, 0),
                "vx": random.uniform(-40, 40),
                "vy": random.uniform(80, 200),
                "color": random.choice([
                    (255, 80, 80), (80, 220, 80), (80, 80, 255),
                    (255, 220, 50), (255, 130, 220), (50, 220, 220),
                ]),
                "size": random.randint(4, 10),
                "rot": random.uniform(0, 360),
                "rot_speed": random.uniform(-200, 200),
            })

    def update(self, dt):
        for p in self.pieces:
            p["x"] += p["vx"] * dt
            p["y"] += p["vy"] * dt
            p["rot"] += p["rot_speed"] * dt
            if p["y"] > SCREEN_HEIGHT + 20:
                p["y"] = random.randint(-40, -10)
                p["x"] = random.randint(0, SCREEN_WIDTH)

    def draw(self, surface):
        for p in self.pieces:
            s = p["size"]
            surf = pygame.Surface((s, s), pygame.SRCALPHA)
            pygame.draw.rect(surf, p["color"], (0, 0, s, s))
            rotated = pygame.transform.rotate(surf, p["rot"])
            surface.blit(rotated, (p["x"] - s // 2, p["y"] - s // 2))


# ---------------------------------------------------------------------------
# Goat entity
# ---------------------------------------------------------------------------
class Goat:
    def __init__(self, world_x):
        self.home_wx = world_x
        self.wx = world_x
        self.wy = trail_y(world_x)
        self.charging = False
        self.width = 44
        self.height = 36
        self.active = True

    def update(self, dt, player_wx):
        if not self.active:
            return
        dist = self.wx - player_wx
        if 0 < dist < GOAT_TRIGGER_DIST and not self.charging:
            self.charging = True
        if self.charging:
            self.wx -= GOAT_CHARGE_SPEED * dt
            self.wy = trail_y(self.wx)
            # deactivate if it runs well past the player
            if self.wx < player_wx - 300:
                self.active = False

    def get_rect(self):
        return pygame.Rect(self.wx - self.width // 2, self.wy - self.height,
                           self.width, self.height)

    def draw(self, surface, camera_wx, camera_wy):
        if not self.active:
            return
        sx, sy = world_to_screen(self.wx, self.wy, camera_wx, camera_wy)
        if -60 < sx < SCREEN_WIDTH + 60:
            draw_goat(surface, int(sx), int(sy), facing_left=True)


# ---------------------------------------------------------------------------
# Main Game
# ---------------------------------------------------------------------------
class Game:
    def __init__(self):
        pygame.init()
        pygame.display.set_caption("Mountain Climb")
        self.screen = pygame.display.set_mode((SCREEN_WIDTH, SCREEN_HEIGHT))
        self.clock = pygame.time.Clock()
        self.font_large = pygame.font.SysFont("arial", 48, bold=True)
        self.font_med = pygame.font.SysFont("arial", 32, bold=True)
        self.font_small = pygame.font.SysFont("arial", 22)
        self.state = "start"  # start | playing | gameover | win
        self.reset_level()
        self.confetti = Confetti()

    def reset_level(self):
        self.player_wx = 0.0
        self.player_vy = 0.0
        self.on_ground = True
        self.lives = 2
        self.invincible_timer = 0.0
        self.facing_right = True
        self.goats = []
        spacing = LEVEL_LENGTH / (NUM_GOATS + 1)
        for i in range(NUM_GOATS):
            gx = spacing * (i + 1)
            self.goats.append(Goat(gx))
        self.tutorial_timer = 4.0  # show tutorial text for 4 seconds

    def run(self):
        while True:
            dt = self.clock.tick(FPS) / 1000.0
            dt = min(dt, 0.05)  # clamp

            for event in pygame.event.get():
                if event.type == pygame.QUIT:
                    pygame.quit()
                    sys.exit()
                if event.type == pygame.KEYDOWN:
                    if self.state == "start":
                        if event.key in (pygame.K_SPACE, pygame.K_RETURN):
                            self.state = "playing"
                            self.reset_level()
                    elif self.state == "playing":
                        if event.key == pygame.K_SPACE or event.key == pygame.K_UP:
                            if self.on_ground:
                                self.player_vy = JUMP_VELOCITY
                                self.on_ground = False
                    elif self.state in ("gameover", "win"):
                        if event.key in (pygame.K_SPACE, pygame.K_RETURN):
                            self.state = "start"

            if self.state == "playing":
                self.update(dt)

            if self.state == "win":
                self.confetti.update(dt)

            self.draw()
            pygame.display.flip()

    # -----------------------------------------------------------------------
    # Update
    # -----------------------------------------------------------------------
    def update(self, dt):
        keys = pygame.key.get_pressed()

        # Horizontal movement
        moving = False
        if keys[pygame.K_RIGHT] or keys[pygame.K_d]:
            self.player_wx += PLAYER_SPEED * dt
            self.facing_right = True
            moving = True
        if keys[pygame.K_LEFT] or keys[pygame.K_a]:
            self.player_wx -= PLAYER_SPEED * dt
            self.facing_right = False
            moving = True

        # Clamp to level bounds
        self.player_wx = max(0, min(self.player_wx, LEVEL_LENGTH))

        # Vertical: the player's baseline follows the trail
        ground_y = trail_y(self.player_wx)

        if not self.on_ground:
            self.player_vy += GRAVITY * dt

        player_wy = getattr(self, "_player_wy", ground_y)
        player_wy += self.player_vy * dt

        if player_wy >= ground_y:
            player_wy = ground_y
            self.player_vy = 0
            self.on_ground = True

        self._player_wy = player_wy

        # Invincibility countdown
        if self.invincible_timer > 0:
            self.invincible_timer -= dt

        # Update goats
        for goat in self.goats:
            goat.update(dt, self.player_wx)

        # Collision detection
        player_rect = pygame.Rect(self.player_wx - 14, player_wy - 48, 28, 50)
        if self.invincible_timer <= 0:
            for goat in self.goats:
                if not goat.active:
                    continue
                if player_rect.colliderect(goat.get_rect()):
                    self.lives -= 1
                    self.invincible_timer = INVINCIBILITY_TIME
                    goat.active = False
                    if self.lives <= 0:
                        self.state = "gameover"
                        return

        # Tutorial timer
        if self.tutorial_timer > 0:
            self.tutorial_timer -= dt

        # Win condition
        if self.player_wx >= LEVEL_LENGTH:
            self.state = "win"
            self.confetti = Confetti()

    # -----------------------------------------------------------------------
    # Draw
    # -----------------------------------------------------------------------
    def draw(self):
        screen = self.screen

        if self.state == "start":
            self.draw_start_screen()
            return

        # Camera follows player
        camera_wx = self.player_wx
        camera_wy = getattr(self, "_player_wy", trail_y(self.player_wx))

        progress = self.player_wx / LEVEL_LENGTH

        # Sky
        screen.blit(get_sky(screen), (0, 0))

        # Parallax layers
        draw_clouds(screen, camera_wx, camera_wy, progress)
        draw_distant_mountains(screen, camera_wx, camera_wy)
        draw_mid_mountains(screen, camera_wx, camera_wy)

        # Terrain & trees
        draw_terrain(screen, camera_wx, camera_wy, progress)
        draw_trees(screen, camera_wx, camera_wy, progress)

        # Summit flag
        draw_summit_flag(screen, camera_wx, camera_wy)

        # Goats
        for goat in self.goats:
            goat.draw(screen, camera_wx, camera_wy)

        # Player
        player_wy = getattr(self, "_player_wy", trail_y(self.player_wx))
        sx, sy = world_to_screen(self.player_wx, player_wy, camera_wx, camera_wy)
        flash = self.invincible_timer > 0
        draw_player(screen, int(sx), int(sy), self.facing_right, flash)

        # HUD
        draw_hearts(screen, self.lives)
        draw_progress_bar(screen, progress)

        # Tutorial text
        if self.state == "playing" and self.tutorial_timer > 0:
            alpha = min(1.0, self.tutorial_timer / 0.5) * 255
            txt = self.font_small.render(
                "Arrow keys to move  |  SPACE to jump over the goats!", True, (255, 255, 255))
            txt.set_alpha(int(alpha))
            screen.blit(txt, (SCREEN_WIDTH // 2 - txt.get_width() // 2, SCREEN_HEIGHT - 60))

        # Overlays for gameover / win
        if self.state == "gameover":
            self.draw_gameover_overlay()
        elif self.state == "win":
            self.confetti.draw(screen)
            self.draw_win_overlay()

    def draw_start_screen(self):
        screen = self.screen
        screen.blit(get_sky(screen), (0, 0))

        # Simple mountain silhouette
        pygame.draw.polygon(screen, (130, 145, 130),
                            [(200, 500), (400, 180), (600, 500)])
        pygame.draw.polygon(screen, SNOW_COLOR,
                            [(400, 180), (370, 240), (430, 240)])

        # Title
        title = self.font_large.render("Mountain Climb", True, (50, 50, 100))
        screen.blit(title, (SCREEN_WIDTH // 2 - title.get_width() // 2, 80))

        # Subtitle
        sub = self.font_small.render("Reach the summit! Jump over the goats!", True, (80, 80, 120))
        screen.blit(sub, (SCREEN_WIDTH // 2 - sub.get_width() // 2, 140))

        # Play prompt (pulsing)
        pulse = int(180 + 75 * math.sin(pygame.time.get_ticks() / 400))
        play = self.font_med.render("Press SPACE to Play", True, (pulse, pulse, 255))
        screen.blit(play, (SCREEN_WIDTH // 2 - play.get_width() // 2, 420))

    def draw_gameover_overlay(self):
        overlay = pygame.Surface((SCREEN_WIDTH, SCREEN_HEIGHT), pygame.SRCALPHA)
        overlay.fill((0, 0, 0, 120))
        self.screen.blit(overlay, (0, 0))

        txt1 = self.font_large.render("Oh no!", True, (255, 100, 100))
        txt2 = self.font_med.render("Nice try! Let's go again!", True, (255, 255, 255))
        txt3 = self.font_small.render("Press SPACE to try again", True, (200, 200, 255))

        self.screen.blit(txt1, (SCREEN_WIDTH // 2 - txt1.get_width() // 2, 180))
        self.screen.blit(txt2, (SCREEN_WIDTH // 2 - txt2.get_width() // 2, 260))
        self.screen.blit(txt3, (SCREEN_WIDTH // 2 - txt3.get_width() // 2, 340))

    def draw_win_overlay(self):
        overlay = pygame.Surface((SCREEN_WIDTH, SCREEN_HEIGHT), pygame.SRCALPHA)
        overlay.fill((0, 0, 0, 80))
        self.screen.blit(overlay, (0, 0))

        txt1 = self.font_large.render("You made it!", True, SUMMIT_COLOR)
        txt2 = self.font_med.render("You reached the summit!", True, (255, 255, 255))
        txt3 = self.font_small.render("Press SPACE to play again", True, (200, 255, 200))

        self.screen.blit(txt1, (SCREEN_WIDTH // 2 - txt1.get_width() // 2, 180))
        self.screen.blit(txt2, (SCREEN_WIDTH // 2 - txt2.get_width() // 2, 260))
        self.screen.blit(txt3, (SCREEN_WIDTH // 2 - txt3.get_width() // 2, 340))


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    Game().run()
