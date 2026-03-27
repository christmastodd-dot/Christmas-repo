"""Mini-game implementations: Number Guess, Rock Paper Scissors, Memory Sequence."""

import random
import time

from tamagotchi.config import (
    NUMBER_GUESS_RANGE, NUMBER_GUESS_TRIES, NUMBER_GUESS_REWARD, NUMBER_GUESS_HAPPINESS,
    RPS_ROUNDS, RPS_WIN_REWARD, RPS_LOSS_HAPPINESS,
    MEMORY_MIN_LENGTH, MEMORY_MAX_LENGTH, MEMORY_SYMBOLS, MEMORY_COIN_PER_SYMBOL,
)
from tamagotchi.display import clear_screen


def play_number_guess():
    """Guess a number 1-10 in 3 tries. Returns (coins, happiness_delta, summary)."""
    lo, hi = NUMBER_GUESS_RANGE
    target = random.randint(lo, hi)

    clear_screen()
    print()
    print(f"  === NUMBER GUESS ===")
    print(f"  I'm thinking of a number between {lo} and {hi}.")
    print(f"  You have {NUMBER_GUESS_TRIES} tries!")
    print()

    for attempt in range(1, NUMBER_GUESS_TRIES + 1):
        try:
            raw = input(f"  Guess #{attempt}: ").strip()
            guess = int(raw)
        except (ValueError, EOFError, KeyboardInterrupt):
            print("  Invalid input!")
            continue

        if guess == target:
            print(f"  Correct! The number was {target}!")
            return (NUMBER_GUESS_REWARD, NUMBER_GUESS_HAPPINESS,
                    f"You won! +{NUMBER_GUESS_REWARD} coins, +{NUMBER_GUESS_HAPPINESS} happiness")

        if guess < target:
            print("  Too low!")
        else:
            print("  Too high!")

    print(f"  Out of tries! The number was {target}.")
    return (0, 0, "Better luck next time!")


def play_rps():
    """Best of 3 Rock Paper Scissors. Returns (coins, happiness_delta, summary)."""
    choices = ["rock", "paper", "scissors"]
    beats = {"rock": "scissors", "scissors": "paper", "paper": "rock"}

    clear_screen()
    print()
    print(f"  === ROCK PAPER SCISSORS ===")
    print(f"  Best of {RPS_ROUNDS}!")
    print()

    player_wins = 0
    pet_wins = 0
    round_num = 0

    while player_wins < 2 and pet_wins < 2:
        round_num += 1
        print(f"  --- Round {round_num} ---")

        try:
            raw = input("  Choose [R]ock, [P]aper, or [S]cissors: ").strip().lower()
        except (EOFError, KeyboardInterrupt):
            return (0, RPS_LOSS_HAPPINESS, "Game abandoned!")

        choice_map = {"r": "rock", "p": "paper", "s": "scissors",
                      "rock": "rock", "paper": "paper", "scissors": "scissors"}
        player = choice_map.get(raw)
        if not player:
            print("  Invalid choice! Skipping round.")
            continue

        pet_choice = random.choice(choices)
        print(f"  You: {player.title()}  vs  Pet: {pet_choice.title()}")

        if player == pet_choice:
            print("  Tie! Redo.")
        elif beats[player] == pet_choice:
            print("  You win this round!")
            player_wins += 1
        else:
            print("  Pet wins this round!")
            pet_wins += 1

        print(f"  Score: You {player_wins} - {pet_wins} Pet")
        print()

    if player_wins > pet_wins:
        print("  You won the match!")
        return (RPS_WIN_REWARD, 0, f"Victory! +{RPS_WIN_REWARD} coins")
    else:
        print("  Pet won the match!")
        return (0, RPS_LOSS_HAPPINESS, f"Defeat! {RPS_LOSS_HAPPINESS} happiness")


def play_memory():
    """Memory sequence game. Returns (coins, happiness_delta, summary)."""
    length = random.randint(MEMORY_MIN_LENGTH, MEMORY_MAX_LENGTH)
    sequence = [random.choice(MEMORY_SYMBOLS) for _ in range(length)]

    clear_screen()
    print()
    print(f"  === MEMORY SEQUENCE ===")
    print(f"  Watch carefully! ({length} symbols)")
    print()
    time.sleep(0.5)

    # Show the sequence
    display = "  " + "  ".join(sequence)
    print(display)
    time.sleep(1.0 + length * 0.4)

    # Clear and ask for recall
    clear_screen()
    print()
    print(f"  === MEMORY SEQUENCE ===")
    print(f"  Now repeat the {length} symbols!")
    print(f"  Symbols: {' '.join(sorted(set(MEMORY_SYMBOLS)))}")
    print()

    try:
        raw = input("  Your answer (space-separated): ").strip()
    except (EOFError, KeyboardInterrupt):
        return (0, 0, "Game abandoned!")

    answer = raw.split()

    if answer == sequence:
        reward = length * MEMORY_COIN_PER_SYMBOL
        print(f"  Perfect! You remembered all {length} symbols!")
        return (reward, 0, f"Perfect memory! +{reward} coins")
    else:
        print(f"  Wrong! The sequence was: {' '.join(sequence)}")
        return (0, 0, "Better luck next time!")


MINIGAMES = [
    ("Number Guess", play_number_guess),
    ("Rock Paper Scissors", play_rps),
    ("Memory Sequence", play_memory),
]
