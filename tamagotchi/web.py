#!/usr/bin/env python3
"""Flask + Socket.IO web frontend — math-driven pet evolution with care."""

import os
import threading

from flask import Flask, render_template, request
from flask_socketio import SocketIO, emit

from tamagotchi.config import (
    STAGES, STAGE_THRESHOLDS, STAGE_LABELS, MATH_STREAK_THRESHOLD,
    TICK_INTERVAL, SHOP_ITEMS,
)
from tamagotchi.pet import Pet
from tamagotchi.math_problems import generate_problem

app = Flask(__name__,
            template_folder=os.path.join(os.path.dirname(__file__), "templates"),
            static_folder=os.path.join(os.path.dirname(__file__), "static"))
app.secret_key = os.environ.get("SECRET_KEY", "stitch-pet-secret-key-change-me")
socketio = SocketIO(app, cors_allowed_origins="*", async_mode="gevent")

# ── Per-session game state ───────────────────────────────────────────

games = {}  # sid -> GameState
lock = threading.Lock()
tick_running = False


class GameState:
    def __init__(self, sid, pet):
        self.sid = sid
        self.pet = pet
        self.message = ""
        self.current_question = None
        self.current_answer = None
        self._generate_problem()

    def _generate_problem(self):
        q, a = generate_problem(self.pet.stage)
        self.current_question = q
        self.current_answer = a

    def get_state(self):
        pet = self.pet
        mood = pet.get_mood()
        threshold = STAGE_THRESHOLDS.get(pet.stage)
        progress_pct = pet.progress_pct()
        is_egg = pet.stage == "egg"

        return {
            "name": pet.name,
            "species": pet.species,
            "stage": pet.stage,
            "stage_label": STAGE_LABELS.get(pet.stage, pet.stage.title()),
            "mood": mood,
            "total_correct": pet.total_correct,
            "total_wrong": pet.total_wrong,
            "streak": pet.streak,
            "best_streak": pet.best_streak,
            "stage_correct": pet.stage_correct,
            "stage_needed": threshold,
            "progress_pct": progress_pct,
            "question": self.current_question,
            "message": self.message,
            "is_final_stage": threshold is None,
            "is_egg": is_egg,
            "stats": pet.stats_dict(),
            "coins": pet.coins,
            "inventory": pet.inventory,
        }


# ── Tick loop for stat decay ─────────────────────────────────────────

def tick_loop():
    while True:
        socketio.sleep(TICK_INTERVAL)
        with lock:
            sids = list(games.keys())
        for sid in sids:
            with lock:
                gs = games.get(sid)
            if gs and gs.pet.stage != "egg":
                gs.pet.tick()
                socketio.emit("state", gs.get_state(), to=sid)


def ensure_tick_running():
    global tick_running
    if not tick_running:
        tick_running = True
        socketio.start_background_task(tick_loop)


# ── Routes ───────────────────────────────────────────────────────────

@app.route("/")
def index():
    return render_template("index.html")


# ── Socket events ────────────────────────────────────────────────────

@socketio.on("new_game")
def on_new_game(data):
    sid = request.sid
    name = (data.get("name") or "").strip() or "Stitch Jr."
    pet = Pet(name)
    gs = GameState(sid, pet)
    gs.message = f"{name}'s egg is here! Answer math problems to help it hatch!"
    with lock:
        games[sid] = gs
    ensure_tick_running()
    emit("state", gs.get_state())
    gs.message = ""


@socketio.on("answer")
def on_answer(data):
    sid = request.sid
    with lock:
        gs = games.get(sid)
    if not gs:
        emit("no_game")
        return

    pet = gs.pet
    raw = (data.get("answer") or "").strip()

    try:
        player_answer = int(raw)
    except ValueError:
        gs.message = "Type a number!"
        emit("state", gs.get_state())
        gs.message = ""
        return

    correct = player_answer == gs.current_answer

    if correct:
        pet.answer_correct()
        streak_msg = ""
        if pet.streak > 0 and pet.streak % MATH_STREAK_THRESHOLD == 0:
            streak_msg = f" {pet.streak} in a row!"
        gs.message = f"Correct! {gs.current_question[:-1]}{gs.current_answer}{streak_msg}"

        # Check evolution
        if pet.just_evolved:
            old = pet.evolved_from
            new = pet.stage
            pet.just_evolved = False
            pet.evolved_from = None
            label = STAGE_LABELS.get(new, new)
            if new == "baby":
                gs.message = f"The egg hatched! {pet.name} is born!"
            else:
                gs.message = f"{pet.name} evolved into a {label}!"
            emit("evolution", {"old": old, "new": new})
    else:
        pet.answer_wrong()
        gs.message = f"Not quite! {gs.current_question[:-1]}{gs.current_answer}"

    # Generate next problem
    gs._generate_problem()

    emit("state", gs.get_state())
    gs.message = ""


@socketio.on("care")
def on_care(data):
    sid = request.sid
    with lock:
        gs = games.get(sid)
    if not gs:
        emit("no_game")
        return

    action = (data.get("action") or "").strip()
    success, message = gs.pet.care(action)
    gs.message = message
    emit("state", gs.get_state())
    gs.message = ""


@socketio.on("buy")
def on_buy(data):
    sid = request.sid
    with lock:
        gs = games.get(sid)
    if not gs:
        emit("no_game")
        return
    item_id = (data.get("item") or "").strip()
    success, message = gs.pet.buy_item(item_id)
    gs.message = message
    emit("state", gs.get_state())
    gs.message = ""


@socketio.on("use_item")
def on_use_item(data):
    sid = request.sid
    with lock:
        gs = games.get(sid)
    if not gs:
        emit("no_game")
        return
    item_id = (data.get("item") or "").strip()
    success, message = gs.pet.use_item(item_id)
    gs.message = message
    emit("state", gs.get_state())
    gs.message = ""


@socketio.on("disconnect")
def on_disconnect():
    sid = request.sid
    with lock:
        games.pop(sid, None)


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    socketio.run(app, host="0.0.0.0", port=port, debug=False)
