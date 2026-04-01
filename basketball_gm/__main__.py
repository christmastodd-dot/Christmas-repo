"""Entry point for basketball_gm — run with: python -m basketball_gm"""

from basketball_gm.engine import GameEngine


def main():
    engine = GameEngine()
    try:
        engine.main_menu()
    except KeyboardInterrupt:
        print("\n\n  Game interrupted. Goodbye!")


if __name__ == "__main__":
    main()
