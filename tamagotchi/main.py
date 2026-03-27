#!/usr/bin/env python3
"""Entry point: game loop with real-time ticks and input handling."""

import sys
import threading
import time

from tamagotchi.config import TICK_INTERVAL
from tamagotchi.pet import Pet
from tamagotchi.display import (
    render, render_menu, render_food_menu,
    render_welcome, render_memorial, clear_screen,
)
from tamagotchi.save import save_game, load_game, delete_save


class Game:
    def __init__(self):
        self.pet = None
        self.message = ""
        self.running = False
        self.lock = threading.Lock()
        self.input_mode = "main"  # "main" or "food"

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
            self.message = f"{name} has arrived! Take good care of them."

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

        if choice == "q":
            self._quit()
        elif self.pet.sleeping:
            self.message = f"{self.pet.name} is sleeping... shh!"
        elif choice == "f":
            self.input_mode = "food"
        elif choice == "p":
            if self.pet.play():
                self.message = f"You played with {self.pet.name}! So fun!"
            else:
                self.message = "Can't play right now."
        elif choice == "c":
            if self.pet.clean():
                self.message = f"{self.pet.name} is squeaky clean!"
            else:
                self.message = "Can't clean right now."
        elif choice == "s":
            if self.pet.sleep():
                self.message = f"{self.pet.name} curls up and falls asleep... zzz"
            else:
                self.message = "Can't sleep right now."
        else:
            self.message = "Unknown command. Use F, P, C, S, or Q."

    def _handle_food(self, choice):
        self.input_mode = "main"
        if choice == "0":
            self.message = "Cancelled."
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
