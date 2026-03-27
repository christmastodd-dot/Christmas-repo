#!/usr/bin/env python3
"""Flask + Socket.IO web frontend for the Tamagotchi game."""

import os
import random
import threading
import time

from flask import Flask, render_template, session, request
from flask_socketio import SocketIO, emit

from tamagotchi.config import (
    TICK_INTERVAL, FOODS, TRICKS, STAT_MAX,
    STAGE_THRESHOLDS, SHOP_FOODS, SHOP_MEDICINE,
    MINIGAME_COOLDOWN_TICKS, BALL_PLAY_USES,
    NUMBER_GUESS_RANGE, NUMBER_GUESS_TRIES, NUMBER_GUESS_REWARD, NUMBER_GUESS_HAPPINESS,
    RPS_WIN_REWARD, RPS_LOSS_HAPPINESS,
    MEMORY_MIN_LENGTH, MEMORY_MAX_LENGTH, MEMORY_SYMBOLS, MEMORY_COIN_PER_SYMBOL,
)
from tamagotchi.pet import Pet
from tamagotchi.inventory import Inventory
from tamagotchi.shop import get_shop_items, buy_item
from tamagotchi.display import STAGE_ART, DEAD_ART, HAT_ART, STAGE_LABELS

app = Flask(__name__, template_folder=os.path.join(os.path.dirname(__file__), "templates"))
app.secret_key = os.environ.get("SECRET_KEY", "stitch-pet-secret-key-change-me")
socketio = SocketIO(app, cors_allowed_origins="*", async_mode="gevent")

# ── Per-session game state ───────────────────────────────────────────

games = {}  # sid -> GameState
lock = threading.Lock()


class GameState:
    def __init__(self, sid, pet):
        self.sid = sid
        self.pet = pet
        self.message = ""
        self.running = True
        # Minigame state
        self.minigame_active = None  # None, "number_guess", "rps", "memory"
        self.mg_data = {}

    def get_state(self):
        """Build the full game state dict to send to the client."""
        pet = self.pet
        mood = pet.get_mood()
        art = self._get_art(mood)

        threshold = STAGE_THRESHOLDS.get(pet.stage)
        evo_remaining = max(0, threshold - pet.stage_ticks) if threshold else None

        # Available actions
        actions = []
        if not pet.alive:
            actions = ["new_game"]
        elif pet.stage == "egg":
            actions = ["quit"]
        elif pet.sleeping:
            actions = ["quit"]
        else:
            if pet.can_do("feed"):
                actions.append("feed")
            if pet.can_do("play"):
                actions.append("play")
            if pet.can_do("clean"):
                actions.append("clean")
            if pet.can_do("sleep"):
                actions.append("sleep")
            if pet.can_do("trick"):
                actions.append("trick")
            if pet.can_do("minigame"):
                actions.append("minigame")
            if pet.can_do("shop"):
                actions.append("shop")
            if pet.can_do("inventory") and pet.inventory.has_items():
                actions.append("inventory")

        # Build foods list
        foods = [{"name": n, "hunger": h, "happiness": hp} for n, h, hp in FOODS]

        # Tricks
        tricks = [{"name": t, "learned": t in pet.tricks_learned} for t in TRICKS]

        # Shop items
        shop_items = []
        for item in get_shop_items():
            shop_items.append({
                "name": item["name"],
                "price": item["price"],
                "desc": item["desc"],
                "affordable": pet.coins >= item["price"],
            })

        # Inventory
        inv_items = []
        for name, price, hunger, happiness in SHOP_FOODS:
            qty = pet.inventory.consumables.get(name, 0)
            if qty > 0:
                hap = f", happy +{happiness}" if happiness else ""
                inv_items.append({"name": name, "qty": qty, "desc": f"hunger +{hunger}{hap}", "cat": "food",
                                  "data": {"hunger": hunger, "happiness": happiness}})
        for name, price, health in SHOP_MEDICINE:
            qty = pet.inventory.consumables.get(name, 0)
            if qty > 0:
                inv_items.append({"name": name, "qty": qty, "desc": f"health +{health}", "cat": "medicine",
                                  "data": {"health": health}})
        if pet.inventory.has_permanent("ball"):
            inv_items.append({"name": "Ball", "qty": None, "desc": f"{pet.inventory.ball_uses} boosted plays left",
                              "cat": "perm", "data": {}})
        if pet.inventory.has_permanent("hat"):
            inv_items.append({"name": "Hat", "qty": None, "desc": "Equipped!", "cat": "perm", "data": {}})

        # Minigame info
        minigames = []
        mg_names = ["Number Guess", "Rock Paper Scissors", "Memory Sequence"]
        for i, name in enumerate(mg_names):
            cd = pet.minigame_cooldowns.get(i, 0)
            can_play, reason = pet.can_play_minigame(i)
            minigames.append({"name": name, "cooldown": cd, "can_play": can_play, "reason": reason})

        return {
            "name": pet.name,
            "species": pet.species,
            "alive": pet.alive,
            "stage": pet.stage,
            "stage_label": STAGE_LABELS.get(pet.stage, pet.stage.title()),
            "mood": mood,
            "art": art,
            "stats": {k: int(v) for k, v in pet.stats.items()},
            "ticks_alive": pet.ticks_alive,
            "evo_remaining": evo_remaining,
            "coins": pet.coins,
            "sleeping": pet.sleeping,
            "sleep_ticks_left": pet.sleep_ticks_left,
            "tricks_learned": pet.tricks_learned,
            "actions": actions,
            "foods": foods,
            "tricks": tricks,
            "shop_items": shop_items,
            "inv_items": inv_items,
            "minigames": minigames,
            "message": self.message,
            "minigame_active": self.minigame_active,
            "mg_data": self.mg_data,
        }

    def _get_art(self, mood):
        pet = self.pet
        if not pet.alive:
            return DEAD_ART
        has_hat = pet.inventory.has_permanent("hat")
        if has_hat and pet.stage in HAT_ART and mood in HAT_ART[pet.stage]:
            return HAT_ART[pet.stage][mood]
        stage_arts = STAGE_ART.get(pet.stage, STAGE_ART["child"])
        return stage_arts.get(mood, stage_arts.get("neutral", DEAD_ART))


# ── Tick engine ──────────────────────────────────────────────────────

def tick_loop():
    while True:
        time.sleep(TICK_INTERVAL)
        with lock:
            for sid, gs in list(games.items()):
                if not gs.running or not gs.pet.alive:
                    continue
                old_stage = gs.pet.stage
                gs.pet.tick()
                if gs.pet.just_evolved:
                    old = gs.pet.evolved_from
                    new = gs.pet.stage
                    gs.pet.just_evolved = False
                    gs.pet.evolved_from = None
                    if new == "baby":
                        gs.message = f"{gs.pet.name} hatched! A tiny Stitch appears!"
                    elif new == "adult":
                        gs.message = f"{gs.pet.name} is fully grown! You can teach tricks now."
                    else:
                        gs.message = f"{gs.pet.name} evolved into a {STAGE_LABELS.get(new, new)}!"
                    socketio.emit("evolution", {"old": old, "new": new}, room=sid)
                if not gs.pet.alive:
                    gs.message = f"{gs.pet.name} has passed away..."
                socketio.emit("state", gs.get_state(), room=sid)
                gs.message = ""


# ── Routes ───────────────────────────────────────────────────────────

@app.route("/")
def index():
    return render_template("index.html")


# ── Socket events ────────────────────────────────────────────────────

@socketio.on("connect")
def on_connect():
    pass


@socketio.on("new_game")
def on_new_game(data):
    sid = request.sid
    name = (data.get("name") or "").strip() or "Stitch Jr."
    pet = Pet(name)
    gs = GameState(sid, pet)
    gs.message = f"{name}'s egg has arrived! Watch it closely..."
    with lock:
        games[sid] = gs
    emit("state", gs.get_state())
    gs.message = ""


@socketio.on("action")
def on_action(data):
    sid = request.sid
    with lock:
        gs = games.get(sid)
    if not gs or not gs.pet.alive:
        return

    action = data.get("action")
    pet = gs.pet

    if gs.minigame_active:
        _handle_minigame_input(gs, data)
        emit("state", gs.get_state())
        gs.message = ""
        return

    if pet.stage == "egg":
        gs.message = "The egg wobbles slightly..."
    elif pet.sleeping:
        gs.message = f"{pet.name} is sleeping... shh!"
    elif action == "feed":
        idx = data.get("index", 0)
        rebellion = pet.check_rebellion()
        if rebellion:
            gs.message = rebellion
        else:
            name = pet.feed(idx)
            if name:
                gs.message = f"{pet.name} ate {name}! Yum!"
    elif action == "play":
        rebellion = pet.check_rebellion()
        if rebellion:
            gs.message = rebellion
        elif pet.play():
            gs.message = f"You played with {pet.name}! So fun!"
    elif action == "clean":
        rebellion = pet.check_rebellion()
        if rebellion:
            gs.message = rebellion
        elif pet.clean():
            gs.message = f"{pet.name} is squeaky clean!"
    elif action == "sleep":
        if pet.sleep():
            gs.message = f"{pet.name} curls up and falls asleep... zzz"
    elif action == "trick":
        idx = data.get("index", 0)
        trick, result = pet.teach_trick(idx)
        if trick is None:
            gs.message = "Invalid trick."
        elif result == "already_known":
            gs.message = f"{pet.name} already knows {trick}!"
        elif result == "failed":
            gs.message = f"{pet.name} got confused... teaching {trick} failed! (-15 happiness)"
        elif result == "success":
            gs.message = f"{pet.name} learned {trick}! Amazing!"
    elif action == "buy":
        idx = data.get("index", 0)
        items = get_shop_items()
        if 0 <= idx < len(items):
            ok, msg = buy_item(items[idx], pet, pet.inventory)
            gs.message = msg
    elif action == "use_item":
        item_name = data.get("name", "")
        cat = data.get("cat", "")
        item_data = data.get("data", {})
        if cat == "food":
            if pet.use_food_item(item_name, item_data.get("hunger", 0), item_data.get("happiness", 0)):
                gs.message = f"{pet.name} ate {item_name}!"
            else:
                gs.message = "Can't use that right now."
        elif cat == "medicine":
            if pet.use_medicine_item(item_name, item_data.get("health", 0)):
                gs.message = f"{pet.name} drank {item_name}! Health restored!"
            else:
                gs.message = "Can't use that right now."
    elif action == "start_minigame":
        idx = data.get("index", 0)
        can_play, reason = pet.can_play_minigame(idx)
        if not can_play:
            gs.message = reason
        else:
            pet.start_minigame(idx)
            _start_minigame(gs, idx)
    else:
        gs.message = "Unknown action."

    emit("state", gs.get_state())
    gs.message = ""


@socketio.on("disconnect")
def on_disconnect():
    sid = request.sid
    with lock:
        games.pop(sid, None)


# ── Minigame logic (server-side, turn-based via socket) ──────────────

def _start_minigame(gs, idx):
    if idx == 0:
        target = random.randint(*NUMBER_GUESS_RANGE)
        gs.minigame_active = "number_guess"
        gs.mg_data = {"target": target, "tries_left": NUMBER_GUESS_TRIES, "history": []}
        gs.message = f"I'm thinking of a number between {NUMBER_GUESS_RANGE[0]} and {NUMBER_GUESS_RANGE[1]}. You have {NUMBER_GUESS_TRIES} tries!"
    elif idx == 1:
        gs.minigame_active = "rps"
        gs.mg_data = {"player_wins": 0, "pet_wins": 0, "round": 1, "history": []}
        gs.message = "Rock Paper Scissors! Best of 3. Choose R, P, or S!"
    elif idx == 2:
        length = random.randint(MEMORY_MIN_LENGTH, MEMORY_MAX_LENGTH)
        seq = [random.choice(MEMORY_SYMBOLS) for _ in range(length)]
        gs.minigame_active = "memory"
        gs.mg_data = {"sequence": seq, "phase": "show", "length": length}
        gs.message = f"Memorize this sequence! ({length} symbols): {' '.join(seq)}"


def _handle_minigame_input(gs, data):
    answer = data.get("answer", "").strip()
    pet = gs.pet

    if gs.minigame_active == "number_guess":
        mg = gs.mg_data
        try:
            guess = int(answer)
        except ValueError:
            gs.message = "Enter a number!"
            return
        mg["tries_left"] -= 1
        if guess == mg["target"]:
            pet.apply_minigame_reward(NUMBER_GUESS_REWARD, NUMBER_GUESS_HAPPINESS)
            gs.message = f"Correct! The number was {mg['target']}! +{NUMBER_GUESS_REWARD} coins, +{NUMBER_GUESS_HAPPINESS} happiness!"
            gs.minigame_active = None
            gs.mg_data = {}
        elif mg["tries_left"] <= 0:
            gs.message = f"Out of tries! The number was {mg['target']}."
            gs.minigame_active = None
            gs.mg_data = {}
        else:
            hint = "Too low!" if guess < mg["target"] else "Too high!"
            mg["history"].append({"guess": guess, "hint": hint})
            gs.message = f"{hint} {mg['tries_left']} tries left."

    elif gs.minigame_active == "rps":
        mg = gs.mg_data
        choice_map = {"r": "rock", "p": "paper", "s": "scissors",
                      "rock": "rock", "paper": "paper", "scissors": "scissors"}
        player = choice_map.get(answer.lower())
        if not player:
            gs.message = "Choose R, P, or S!"
            return
        beats = {"rock": "scissors", "scissors": "paper", "paper": "rock"}
        pet_choice = random.choice(["rock", "paper", "scissors"])
        mg["history"].append({"player": player, "pet": pet_choice})

        if player == pet_choice:
            gs.message = f"You: {player.title()} vs Pet: {pet_choice.title()} - Tie! Go again."
        elif beats[player] == pet_choice:
            mg["player_wins"] += 1
            gs.message = f"You: {player.title()} vs Pet: {pet_choice.title()} - You win! ({mg['player_wins']}-{mg['pet_wins']})"
        else:
            mg["pet_wins"] += 1
            gs.message = f"You: {player.title()} vs Pet: {pet_choice.title()} - Pet wins! ({mg['player_wins']}-{mg['pet_wins']})"

        if mg["player_wins"] >= 2:
            pet.apply_minigame_reward(RPS_WIN_REWARD, 0)
            gs.message += f" Victory! +{RPS_WIN_REWARD} coins!"
            gs.minigame_active = None
            gs.mg_data = {}
        elif mg["pet_wins"] >= 2:
            pet.apply_minigame_reward(0, RPS_LOSS_HAPPINESS)
            gs.message += f" Defeat! {RPS_LOSS_HAPPINESS} happiness."
            gs.minigame_active = None
            gs.mg_data = {}

    elif gs.minigame_active == "memory":
        mg = gs.mg_data
        if mg["phase"] == "show":
            # Player clicked "ready", now they need to recall
            mg["phase"] = "recall"
            gs.message = "Now type the symbols separated by spaces!"
        elif mg["phase"] == "recall":
            player_seq = answer.split()
            if player_seq == mg["sequence"]:
                reward = mg["length"] * MEMORY_COIN_PER_SYMBOL
                pet.apply_minigame_reward(reward, 0)
                gs.message = f"Perfect memory! +{reward} coins!"
            else:
                gs.message = f"Wrong! The sequence was: {' '.join(mg['sequence'])}"
            gs.minigame_active = None
            gs.mg_data = {}


# ── Start tick thread on import ──────────────────────────────────────

_tick_thread = threading.Thread(target=tick_loop, daemon=True)
_tick_thread.start()

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    socketio.run(app, host="0.0.0.0", port=port, debug=False)
