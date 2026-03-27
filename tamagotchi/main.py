#!/usr/bin/env python3
"""Entry point: game loop with real-time ticks and input handling."""

import sys
import threading
import time

from tamagotchi.config import TICK_INTERVAL, TRICKS
from tamagotchi.pet import Pet
from tamagotchi.display import (
    render, render_menu, render_food_menu, render_trick_menu,
    render_welcome, render_memorial, clear_screen,
    play_evolution_animation,
)
from tamagotchi.save import save_game, load_game, delete_save


class Game:
    def __init__(self):
        self.pet = None
        self.message = ""
        self.running = False
        self.lock = threading.Lock()
        self.input_mode = "main"  # "main", "food", or "trick"

    # ── Setup ────────────────────────────────────────────────────────

    def start(self):
        render_welcome()

        # Try loading existing save
        pet = load_game()
        if pet and pet.alive:
            print(f"  Found save for '{pet.name}'!")
            choice = input("  Continue? (y/n): ").strip().lower()
            if choice == "y":
                self.pet = pet
                self.message = f"Welcome back, {pet.name}!"
            else:
                delete_save()

        if self.pet is None:
            print()
            name = input("  Name your new pet: ").strip()
            if not name:
                name = "Stitch Jr."
            self.pet = Pet(name)
            self.message = f"{name}'s egg has arrived! Watch it closely..."

        self.running = True
        self._run()

    # ── Tick thread ──────────────────────────────────────────────────

    def _tick_loop(self):
        while self.running and self.pet.alive:
            time.sleep(TICK_INTERVAL)
            with self.lock:
                self.pet.tick()
                if not self.pet.alive:
                    self.running = False

    # ── Main loop ────────────────────────────────────────────────────

    def _run(self):
        tick_thread = threading.Thread(target=self._tick_loop, daemon=True)
        tick_thread.start()

        while self.running:
            with self.lock:
                # Check for evolution event
                if self.pet.just_evolved:
                    old = self.pet.evolved_from
                    new = self.pet.stage
                    self.pet.just_evolved = False
                    self.pet.evolved_from = None
                    play_evolution_animation(old, new)
                    if new == "baby":
                        self.message = f"{self.pet.name} hatched! A tiny Stitch appears!"
                    elif new == "adult":
                        self.message = f"{self.pet.name} is fully grown! You can now teach tricks."
                    else:
                        self.message = f"{self.pet.name} evolved into a {new}!"

                render(self.pet, self.message)
                self.message = ""

                if not self.pet.alive:
                    render_memorial(self.pet)
                    delete_save()
                    input("  Press Enter to exit...")
                    self.running = False
                    break

                if self.input_mode == "food":
                    render_food_menu()
                elif self.input_mode == "trick":
                    render_trick_menu(self.pet)
                else:
                    render_menu(self.pet)

            try:
                choice = input("\n  > ").strip().lower()
            except (EOFError, KeyboardInterrupt):
                self._quit()
                break

            with self.lock:
                self._handle_input(choice)

    def _handle_input(self, choice):
        if self.input_mode == "food":
            self._handle_food(choice)
            return
        if self.input_mode == "trick":
            self._handle_trick(choice)
            return

        if choice == "q":
            self._quit()
        elif self.pet.stage == "egg":
            self.message = "The egg wobbles slightly..."
        elif self.pet.sleeping:
            self.message = f"{self.pet.name} is sleeping... shh!"
        elif choice == "f" and self.pet.can_do("feed"):
            self.input_mode = "food"
        elif choice == "p" and self.pet.can_do("play"):
            rebellion = self.pet.check_rebellion()
            if rebellion:
                self.message = rebellion
            elif self.pet.play():
                self.message = f"You played with {self.pet.name}! So fun!"
            else:
                self.message = "Can't play right now."
        elif choice == "c" and self.pet.can_do("clean"):
            rebellion = self.pet.check_rebellion()
            if rebellion:
                self.message = rebellion
            elif self.pet.clean():
                self.message = f"{self.pet.name} is squeaky clean!"
            else:
                self.message = "Can't clean right now."
        elif choice == "s" and self.pet.can_do("sleep"):
            if self.pet.sleep():
                self.message = f"{self.pet.name} curls up and falls asleep... zzz"
            else:
                self.message = "Can't sleep right now."
        elif choice == "t" and self.pet.can_do("trick"):
            self.input_mode = "trick"
        else:
            available = self._available_keys()
            self.message = f"Unknown command. Use {available}"

    def _handle_food(self, choice):
        self.input_mode = "main"
        if choice == "0":
            self.message = "Cancelled."
            return

        # Teen rebellion on feeding
        rebellion = self.pet.check_rebellion()
        if rebellion:
            self.message = rebellion
            return

        try:
            idx = int(choice) - 1
            name = self.pet.feed(idx)
            if name:
                self.message = f"{self.pet.name} ate {name}! Yum!"
            else:
                self.message = "Invalid food choice."
        except (ValueError, IndexError):
            self.message = "Invalid choice."

    def _handle_trick(self, choice):
        self.input_mode = "main"
        if choice == "0":
            self.message = "Cancelled."
            return
        try:
            idx = int(choice) - 1
            trick, result = self.pet.teach_trick(idx)
            if trick is None:
                self.message = "Invalid trick choice."
            elif result == "already_known":
                self.message = f"{self.pet.name} already knows {trick}!"
            elif result == "failed":
                self.message = f"{self.pet.name} got confused... teaching {trick} failed! (-15 happiness)"
            elif result == "success":
                self.message = f"{self.pet.name} learned {trick}! Amazing!"
        except (ValueError, IndexError):
            self.message = "Invalid choice."

    def _available_keys(self):
        keys = []
        if self.pet.can_do("feed"):
            keys.append("F")
        if self.pet.can_do("play"):
            keys.append("P")
        if self.pet.can_do("clean"):
            keys.append("C")
        if self.pet.can_do("sleep"):
            keys.append("S")
        if self.pet.can_do("trick"):
            keys.append("T")
        keys.append("Q")
        return ", ".join(keys)

    def _quit(self):
        if self.pet.alive:
            save_game(self.pet)
            clear_screen()
            print(f"\n  Game saved! See you later, {self.pet.name}!\n")
        self.running = False


def main():
    game = Game()
    game.start()


if __name__ == "__main__":
    main()
