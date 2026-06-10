#!/usr/bin/env python3
"""
Candy Guessing Game
Guess the candy in 5 questions or fewer!
"""

import random

from candy_data import CANDIES, QUESTIONS, MAX_QUESTIONS


def clear_screen():
    print("\n" + "=" * 60)


def display_header():
    print("=" * 60)
    print("      *** CANDY GUESSING GAME ***")
    print("=" * 60)
    print("  I'm thinking of one of the top 100 American candies!")
    print("  Ask up to 5 yes/no questions, then take your guess.")
    print("=" * 60)


def display_available_questions(asked_indices):
    print("\nAvailable questions to ask:")
    for i, (question, _) in enumerate(QUESTIONS):
        if i not in asked_indices:
            print(f"  [{i + 1:2}] {question}")


def get_yes_no(prompt):
    while True:
        answer = input(prompt).strip().lower()
        if answer in ("yes", "y"):
            return True
        elif answer in ("no", "n"):
            return False
        else:
            print("      Please answer 'yes' or 'no'.")


def filter_candies(candies, attribute, value):
    return [c for c in candies if c[attribute] == value]


def play_game(candy):
    questions_left = MAX_QUESTIONS
    asked_indices = set()
    possible_candies = list(CANDIES)

    print(f"\n  I'm thinking of a candy... ({len(possible_candies)} possibilities)")

    while questions_left > 0:
        print(f"\n  Questions remaining: {questions_left}")
        print(f"  Remaining possible candies: {len(possible_candies)}")
        display_available_questions(asked_indices)

        remaining_q_indices = [i for i in range(len(QUESTIONS)) if i not in asked_indices]
        if not remaining_q_indices:
            print("\n  You've asked all available questions!")
            break

        print(f"\n  Enter a question number (1-{len(QUESTIONS)}) or 0 to make your guess now:")

        while True:
            try:
                choice = int(input("  > ").strip())
                if choice == 0:
                    questions_left = 0
                    break
                elif 1 <= choice <= len(QUESTIONS) and (choice - 1) not in asked_indices:
                    break
                elif 1 <= choice <= len(QUESTIONS) and (choice - 1) in asked_indices:
                    print("  You already asked that question! Pick another.")
                else:
                    print(f"  Please enter a number between 1 and {len(QUESTIONS)}, or 0 to guess.")
            except ValueError:
                print("  Please enter a valid number.")

        if questions_left == 0:
            break

        q_index = choice - 1
        question_text, attribute = QUESTIONS[q_index]
        asked_indices.add(q_index)

        print(f"\n  Q: {question_text}")
        answer = candy[attribute]
        print(f"  A: {'YES' if answer else 'NO'}")

        possible_candies = filter_candies(possible_candies, attribute, answer)
        questions_left -= 1

        if len(possible_candies) == 1:
            print(f"\n  [Only 1 candy left matching your clues!]")
            break

    print("\n" + "-" * 60)
    print("  TIME TO GUESS!")
    print("-" * 60)

    if len(possible_candies) <= 10 and len(possible_candies) > 1:
        print(f"\n  Hint: Based on your questions, it could be one of these:")
        for c in possible_candies:
            print(f"    - {c['name']}")

    print("\n  What candy am I thinking of?")
    guess = input("  Your guess: ").strip()

    if guess.lower() == candy["name"].lower():
        print("\n  *** CORRECT! ***")
        print(f"  You guessed it! The candy was: {candy['name']}")
        return True
    else:
        print(f"\n  Not quite! The candy was: {candy['name']}")
        print(f"  You guessed: {guess}")
        return False


def show_candy_facts(candy):
    print("\n  Fun facts about this candy:")
    traits = []
    if candy["chocolate"]:
        traits.append("contains chocolate")
    if candy["chewy"]:
        traits.append("chewy")
    if candy["hard"]:
        traits.append("hard candy")
    if candy["sour"]:
        traits.append("sour")
    if candy["gummy"]:
        traits.append("gummy")
    if candy["fruity"]:
        traits.append("fruity flavored")
    if candy["nutty"]:
        traits.append("contains nuts")
    if candy["caramel"]:
        traits.append("has caramel")
    if candy["mint"]:
        traits.append("mint flavored")
    if candy["bar"]:
        traits.append("a candy bar")
    if candy["individually_wrapped"]:
        traits.append("individually wrapped")
    if candy["american_classic"]:
        traits.append("an American classic")

    print(f"  {candy['name']} first appeared in the {candy['decades']}")
    print(f"  It is: {', '.join(traits) if traits else 'a unique candy!'}")


def main():
    display_header()
    wins = 0
    rounds = 0

    while True:
        candy = random.choice(CANDIES)
        rounds += 1

        won = play_game(candy)
        show_candy_facts(candy)

        if won:
            wins += 1

        print(f"\n  Score: {wins} wins out of {rounds} round(s)")
        print()

        play_again = get_yes_no("  Play again? (yes/no): ")
        if not play_again:
            print("\n  Thanks for playing the Candy Guessing Game!")
            print(f"  Final score: {wins} wins out of {rounds} round(s)")
            print("=" * 60)
            break

        clear_screen()
        display_header()


if __name__ == "__main__":
    main()
