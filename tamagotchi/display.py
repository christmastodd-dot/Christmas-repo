"""Terminal rendering, ASCII art, and stat bars."""

import os
import shutil

from tamagotchi.config import STAT_MAX, FOODS


# ── Stitch-like ASCII art per mood ──────────────────────────────────────

ART = {
    "happy": r"""
        ╱╲___╱╲
       (  o   o  )
       (  =^.^=  )
      ╱ )       ( ╲
     (  ╱  ♥   ♥  ╲  )
      ╲_╲  ╱───╲  ╱_╱
        ╲_╱ \_/ ╲_╱
         │  ╱ ╲  │
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
         │  ╱ ╲  │
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
         │  ╱ ╲  │
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
         │  ╱ ╲  │
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
         │  ╱ ╲  │
         ╰─╯   ╰─╯
""",
    "dead": r"""

        ╱╲___╱╲
       (  x   x  )
       (  =╳.╳=  )
      ╱ ) R.I.P. ( ╲
     (  ╱    ✿    ╲  )
      ╲_╲  ╱───╲  ╱_╱
        ╲_╱     ╲_╱

""",
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


def render(pet, message=""):
    clear_screen()
    cols = shutil.get_terminal_size().columns

    def center(text):
        return text.center(cols)

    print()
    print(center(f"~ {pet.name} the {pet.species} ~"))
    print(center(f"Ticks alive: {pet.ticks_alive}"))
    print()

    # ASCII art
    mood = pet.get_mood()
    art = ART.get(mood, ART["neutral"])
    for line in art.strip("\n").split("\n"):
        print(center(line))

    print()

    # Stat bars
    print(stat_bar("Hunger", int(pet.stats["hunger"])))
    print(stat_bar("Happiness", int(pet.stats["happiness"])))
    print(stat_bar("Energy", int(pet.stats["energy"])))
    print(stat_bar("Cleanliness", int(pet.stats["cleanliness"])))
    print(stat_bar("Health", int(pet.stats["health"])))
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

    if pet.sleeping:
        print("  (actions unavailable while sleeping)")
        print("  [Q] Save & Quit")
        return

    print("  [F] Feed    [P] Play    [C] Clean    [S] Sleep    [Q] Save & Quit")


def render_food_menu():
    print("  Pick a food:")
    for i, (name, hunger, happiness) in enumerate(FOODS):
        hap_str = f"+{happiness}" if happiness >= 0 else str(happiness)
        print(f"    [{i + 1}] {name}  (hunger +{hunger}, happy {hap_str})")
    print("    [0] Cancel")


def render_welcome():
    clear_screen()
    print(r"""
    ╔═══════════════════════════════════════╗
    ║                                       ║
    ║      ~ STITCH PET SIMULATOR ~         ║
    ║                                       ║
    ║         ╱╲___╱╲                       ║
    ║        (  o   o  )  "Hi!"             ║
    ║        (  =^.^=  )                    ║
    ║       ╱ )       ( ╲                   ║
    ║      (  ╱  ♥   ♥  ╲  )               ║
    ║                                       ║
    ║   Adopt your very own Stitch-like     ║
    ║   creature and keep it happy!         ║
    ║                                       ║
    ╚═══════════════════════════════════════╝
    """)


def render_memorial(pet):
    clear_screen()
    art = ART["dead"]
    print()
    print(f"  {pet.name} has passed away...")
    print(f"  They lived for {pet.ticks_alive} ticks.")
    print()
    for line in art.strip("\n").split("\n"):
        print(f"  {line}")
    print()
    print(f"  Rest in peace, {pet.name}. You were a good {pet.species}.")
    print()
