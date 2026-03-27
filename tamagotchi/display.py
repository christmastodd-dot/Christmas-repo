"""Terminal rendering, ASCII art, stat bars, and evolution animations."""

import os
import shutil
import time

from tamagotchi.config import STAT_MAX, FOODS, STAGE_THRESHOLDS, TRICKS


# ── Stitch-like ASCII art per stage + mood ──────────────────────────────

STAGE_ART = {
    # ── Egg ──────────────────────────────────────────────────────────
    "egg": {
        "egg": r"""
            ╭──────╮
           ╱ ·  · · ╲
          │  · ♥ ·  · │
          │ ·  ·  · · │
           ╲ · ·  ·  ╱
            ╰──────╯
""",
    },

    # ── Baby ─────────────────────────────────────────────────────────
    "baby": {
        "happy": r"""
          ╱╲_╱╲
         ( ^.^ )
         ╱) ♥ (╲
        ( ╱   ╲ )
         ╰╯   ╰╯
""",
        "neutral": r"""
          ╱╲_╱╲
         ( •.• )
         ╱)   (╲
        ( ╱   ╲ )
         ╰╯   ╰╯
""",
        "sad": r"""
          ╱╲_╱╲
         ( ╥.╥ )
         ╱) ~ (╲
        ( ╱   ╲ )
         ╰╯   ╰╯
""",
        "sick": r"""
          ╱╲_╱╲
         ( x.x ) ~
         ╱) · (╲
        ( ╱   ╲ )
         ╰╯   ╰╯
""",
        "sleeping": r"""
          ╱╲_╱╲      z
         ( -.- )   z
         ╱) ♡ (╲ z
        ( ╱   ╲ )
         ╰╯   ╰╯
""",
    },

    # ── Child ────────────────────────────────────────────────────────
    "child": {
        "happy": r"""
        ╱╲___╱╲
       (  o   o  )
       (  =^.^=  )
      ╱ )  ♥♥♥  ( ╲
     (  ╱         ╲  )
      ╲_╲  ╱───╲  ╱_╱
        ╲_╱ \_/ ╲_╱
         ╰─╯   ╰─╯
""",
        "neutral": r"""
        ╱╲___╱╲
       (  o   o  )
       (  =•.•=  )
      ╱ )       ( ╲
     (  ╱         ╲  )
      ╲_╲  ╱───╲  ╱_╱
        ╲_╱ \_/ ╲_╱
         ╰─╯   ╰─╯
""",
        "sad": r"""
        ╱╲___╱╲
       (  ◦   ◦  )
       (  =╥.╥=  )
      ╱ )  ~~~  ( ╲
     (  ╱    ·    ╲  )
      ╲_╲  ╱───╲  ╱_╱
        ╲_╱ \_/ ╲_╱
         ╰─╯   ╰─╯
""",
        "sick": r"""
        ╱╲___╱╲
       (  x   x  )
       (  =~.~=  )  ~
      ╱ )  ···  ( ╲ ~
     (  ╱    @    ╲  )
      ╲_╲  ╱───╲  ╱_╱
        ╲_╱ \_/ ╲_╱
         ╰─╯   ╰─╯
""",
        "sleeping": r"""
        ╱╲___╱╲         z
       (  -   -  )     z
       (  =~.~=  )   z
      ╱ )       ( ╲
     (  ╱   ♡     ╲  )
      ╲_╲  ╱───╲  ╱_╱
        ╲_╱ \_/ ╲_╱
         ╰─╯   ╰─╯
""",
    },

    # ── Teen ─────────────────────────────────────────────────────────
    "teen": {
        "happy": r"""
       ╱╲_____╱╲
      (  o     o  )
      (   =^.^=   )
     ╱ )  ♥   ♥  ( ╲
    (  ╱    ◡      ╲  )
     ╲_╲   ╱───╲   ╱_╱
       ╲_╱  \_/  ╲_╱
        │  ╱   ╲  │
        ╰─╯     ╰─╯
""",
        "neutral": r"""
       ╱╲_____╱╲
      (  o     o  )
      (   =•.•=   )
     ╱ )         ( ╲
    (  ╱    ─      ╲  )
     ╲_╲   ╱───╲   ╱_╱
       ╲_╱  \_/  ╲_╱
        │  ╱   ╲  │
        ╰─╯     ╰─╯
""",
        "sad": r"""
       ╱╲_____╱╲
      (  ◦     ◦  )
      (   =╥.╥=   )
     ╱ )   ~~~   ( ╲
    (  ╱     ·     ╲  )
     ╲_╲   ╱───╲   ╱_╱
       ╲_╱  \_/  ╲_╱
        │  ╱   ╲  │
        ╰─╯     ╰─╯
""",
        "sick": r"""
       ╱╲_____╱╲
      (  x     x  )  ~
      (   =~.~=   ) ~
     ╱ )   ···   ( ╲
    (  ╱     @     ╲  )
     ╲_╲   ╱───╲   ╱_╱
       ╲_╱  \_/  ╲_╱
        │  ╱   ╲  │
        ╰─╯     ╰─╯
""",
        "sleeping": r"""
       ╱╲_____╱╲          z
      (  -     -  )      z
      (   =~.~=   )   z
     ╱ )         ( ╲
    (  ╱    ♡      ╲  )
     ╲_╲   ╱───╲   ╱_╱
       ╲_╱  \_/  ╲_╱
        │  ╱   ╲  │
        ╰─╯     ╰─╯
""",
    },

    # ── Adult ────────────────────────────────────────────────────────
    "adult": {
        "happy": r"""
      ╱╲_______╱╲
     (  O       O  )
     (    =^.^=    )
    ╱ )   ♥   ♥   ( ╲
   (  ╱     ◡       ╲  )
    ╲_╲    ╱───╲    ╱_╱
      ╲_╱   \_/   ╲_╱
       │   ╱   ╲   │
       │  ╱     ╲  │
       ╰─╯       ╰─╯
""",
        "neutral": r"""
      ╱╲_______╱╲
     (  O       O  )
     (    =•.•=    )
    ╱ )           ( ╲
   (  ╱     ─       ╲  )
    ╲_╲    ╱───╲    ╱_╱
      ╲_╱   \_/   ╲_╱
       │   ╱   ╲   │
       │  ╱     ╲  │
       ╰─╯       ╰─╯
""",
        "sad": r"""
      ╱╲_______╱╲
     (  ◦       ◦  )
     (    =╥.╥=    )
    ╱ )    ~~~    ( ╲
   (  ╱      ·      ╲  )
    ╲_╲    ╱───╲    ╱_╱
      ╲_╱   \_/   ╲_╱
       │   ╱   ╲   │
       │  ╱     ╲  │
       ╰─╯       ╰─╯
""",
        "sick": r"""
      ╱╲_______╱╲
     (  x       x  )  ~
     (    =~.~=    ) ~
    ╱ )    ···    ( ╲
   (  ╱      @      ╲  )
    ╲_╲    ╱───╲    ╱_╱
      ╲_╱   \_/   ╲_╱
       │   ╱   ╲   │
       │  ╱     ╲  │
       ╰─╯       ╰─╯
""",
        "sleeping": r"""
      ╱╲_______╱╲            z
     (  -       -  )        z
     (    =~.~=    )      z
    ╱ )           ( ╲
   (  ╱     ♡       ╲  )
    ╲_╲    ╱───╲    ╱_╱
      ╲_╱   \_/   ╲_╱
       │   ╱   ╲   │
       │  ╱     ╲  │
       ╰─╯       ╰─╯
""",
    },
}

# Dead art (universal)
DEAD_ART = r"""
      ╱╲_______╱╲
     (  x       x  )
     (    =╳.╳=    )
    ╱ )  R.I.P.   ( ╲
   (  ╱      ✿      ╲  )
    ╲_╲    ╱───╲    ╱_╱
      ╲_╱         ╲_╱
"""

# ── Evolution animation frames ──────────────────────────────────────

EVOLUTION_FRAMES = [
    r"""
          * . * . *
        .  *  .  *  .
       *    ·····    *
      .   ·       ·   .
       *    ·····    *
        .  *  .  *  .
          * . * . *
""",
    r"""
        ✦  · ✦ ·  ✦
      ·   ✦     ✦   ·
    ✦   ·   ♥ ♥   ·   ✦
      ·   ✦     ✦   ·
        ✦  · ✦ ·  ✦
""",
    r"""
          ·  ✧  ·
        ✧    ♥    ✧
      ·   ♥     ♥   ·
        ✧    ♥    ✧
          ·  ✧  ·
""",
]

STAGE_LABELS = {
    "egg": "Egg",
    "baby": "Baby",
    "child": "Child",
    "teen": "Teen",
    "adult": "Adult",
}


def clear_screen():
    os.system("cls" if os.name == "nt" else "clear")


def stat_bar(label, value, width=20):
    filled = int((value / STAT_MAX) * width)
    empty = width - filled
    if value >= 60:
        indicator = "+"
    elif value >= 30:
        indicator = "="
    else:
        indicator = "!"
    bar = indicator * filled + "·" * empty
    return f"  {label:<13} [{bar}] {value:>3}"


def get_art(pet):
    if not pet.alive:
        return DEAD_ART
    mood = pet.get_mood()
    stage_arts = STAGE_ART.get(pet.stage, STAGE_ART["child"])
    return stage_arts.get(mood, stage_arts.get("neutral", DEAD_ART))


def render(pet, message=""):
    clear_screen()
    cols = shutil.get_terminal_size().columns

    def center(text):
        return text.center(cols)

    stage_label = STAGE_LABELS.get(pet.stage, pet.stage.title())

    print()
    print(center(f"~ {pet.name} the {pet.species} ~"))
    print(center(f"Stage: {stage_label}  |  Ticks: {pet.ticks_alive}"))

    # Show ticks until next evolution
    threshold = STAGE_THRESHOLDS.get(pet.stage)
    if threshold is not None:
        remaining = max(0, threshold - pet.stage_ticks)
        print(center(f"Next evolution in: {remaining} ticks"))
    print()

    # ASCII art
    art = get_art(pet)
    for line in art.strip("\n").split("\n"):
        print(center(line))

    print()

    # Egg stage: no stats to show
    if pet.stage == "egg":
        print(center("Waiting to hatch..."))
        print()
        if message:
            print(f"  >> {message}")
            print()
        return

    # Stat bars
    print(stat_bar("Hunger", int(pet.stats["hunger"])))
    print(stat_bar("Happiness", int(pet.stats["happiness"])))
    print(stat_bar("Energy", int(pet.stats["energy"])))
    print(stat_bar("Cleanliness", int(pet.stats["cleanliness"])))
    print(stat_bar("Health", int(pet.stats["health"])))
    print()

    # Tricks
    if pet.tricks_learned:
        tricks_str = ", ".join(pet.tricks_learned)
        print(f"  Tricks: {tricks_str}")
        print()

    if pet.sleeping:
        print(f"  ** {pet.name} is sleeping... ({pet.sleep_ticks_left} ticks left) **")
        print()

    if message:
        print(f"  >> {message}")
        print()


def render_menu(pet):
    if not pet.alive:
        print("  [Q] Quit")
        return

    if pet.stage == "egg":
        print("  (waiting to hatch...)")
        print("  [Q] Save & Quit")
        return

    if pet.sleeping:
        print("  (actions unavailable while sleeping)")
        print("  [Q] Save & Quit")
        return

    parts = []
    if pet.can_do("feed"):
        parts.append("[F] Feed")
    if pet.can_do("play"):
        parts.append("[P] Play")
    if pet.can_do("clean"):
        parts.append("[C] Clean")
    if pet.can_do("sleep"):
        parts.append("[S] Sleep")
    if pet.can_do("trick"):
        parts.append("[T] Teach Trick")
    parts.append("[Q] Save & Quit")
    print("  " + "    ".join(parts))


def render_food_menu():
    print("  Pick a food:")
    for i, (name, hunger, happiness) in enumerate(FOODS):
        hap_str = f"+{happiness}" if happiness >= 0 else str(happiness)
        print(f"    [{i + 1}] {name}  (hunger +{hunger}, happy {hap_str})")
    print("    [0] Cancel")


def render_trick_menu(pet):
    print("  Teach a trick (costs 15 happiness):")
    for i, trick in enumerate(TRICKS):
        learned = " [learned]" if trick in pet.tricks_learned else ""
        print(f"    [{i + 1}] {trick.title()}{learned}")
    print("    [0] Cancel")


def render_welcome():
    clear_screen()
    print(r"""
    ╔═══════════════════════════════════════╗
    ║                                       ║
    ║      ~ STITCH PET SIMULATOR ~         ║
    ║                                       ║
    ║           ╭──────╮                    ║
    ║          ╱ ·  · · ╲                   ║
    ║         │  · ♥ ·  · │                 ║
    ║         │ ·  ·  · · │                 ║
    ║          ╲ · ·  ·  ╱                  ║
    ║           ╰──────╯                    ║
    ║                                       ║
    ║   Your egg is waiting to hatch...     ║
    ║   Adopt your very own Stitch!         ║
    ║                                       ║
    ╚═══════════════════════════════════════╝
    """)


def render_memorial(pet):
    clear_screen()
    print()
    print(f"  {pet.name} has passed away...")
    print(f"  They lived for {pet.ticks_alive} ticks and reached the {STAGE_LABELS.get(pet.stage, pet.stage)} stage.")
    if pet.tricks_learned:
        print(f"  Tricks learned: {', '.join(pet.tricks_learned)}")
    print()
    for line in DEAD_ART.strip("\n").split("\n"):
        print(f"  {line}")
    print()
    print(f"  Rest in peace, {pet.name}. You were a good {pet.species}.")
    print()


def play_evolution_animation(old_stage, new_stage):
    """Play a 3-frame sparkle animation, then show the new stage art."""
    cols = shutil.get_terminal_size().columns

    def center(text):
        return text.center(cols)

    old_label = STAGE_LABELS.get(old_stage, old_stage.title())
    new_label = STAGE_LABELS.get(new_stage, new_stage.title())

    for frame in EVOLUTION_FRAMES:
        clear_screen()
        print()
        print(center(f"~ EVOLVING: {old_label} -> {new_label} ~"))
        print()
        for line in frame.strip("\n").split("\n"):
            print(center(line))
        time.sleep(0.6)

    # Show new form
    clear_screen()
    print()
    print(center(f"~ {old_label} evolved into {new_label}! ~"))
    print()
    stage_arts = STAGE_ART.get(new_stage, STAGE_ART["child"])
    art = stage_arts.get("happy", stage_arts.get("neutral", ""))
    for line in art.strip("\n").split("\n"):
        print(center(line))
    print()
    time.sleep(1.5)
