#!/usr/bin/env python3
"""
Christmas Chat - Web Server

Serves the chat frontend and a small JSON API:
- Shared "login" (no password) with online presence, reused from the
  earlier candy-guessing project.
- A global chat room and 1:1 DMs between registered users.
- Per-conversation "suggested topics" that members can propose.
- A "Guess a Country" mini-game DM partners can invite each other to.
"""

import json
import random
import time
from pathlib import Path
from threading import Lock

from flask import Flask, jsonify, request, send_from_directory

from country_data import COUNTRIES, MAX_QUESTIONS, QUESTIONS

BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data"
USERS_FILE = DATA_DIR / "users.json"
MESSAGES_FILE = DATA_DIR / "messages.json"
TOPICS_FILE = DATA_DIR / "topics.json"
GAMES_FILE = DATA_DIR / "games.json"

ONLINE_THRESHOLD_SECONDS = 30
MAX_USERNAME_LENGTH = 20
MAX_MESSAGE_LENGTH = 1000
MAX_TOPIC_LENGTH = 200
MAX_GUESS_LENGTH = 100
MAX_MESSAGES_PER_CONVERSATION = 200
GLOBAL_CONVERSATION = "global"

app = Flask(__name__, static_folder=None)
_lock = Lock()


# ---------------- storage helpers ----------------

def _load(path, default):
    if not path.exists():
        return default
    try:
        with open(path) as f:
            return json.load(f)
    except (json.JSONDecodeError, OSError):
        return default


def _save(path, data):
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    with open(path, "w") as f:
        json.dump(data, f)


def load_users():
    return _load(USERS_FILE, {})


def save_users(users):
    _save(USERS_FILE, users)


def load_messages():
    return _load(MESSAGES_FILE, {})


def save_messages(messages):
    _save(MESSAGES_FILE, messages)


def load_topics():
    return _load(TOPICS_FILE, {})


def save_topics(topics):
    _save(TOPICS_FILE, topics)


def load_games():
    return _load(GAMES_FILE, {})


def save_games(games):
    _save(GAMES_FILE, games)


def find_existing_name(users, username):
    key = username.lower()
    for name in users:
        if name.lower() == key:
            return name
    return None


def users_with_status(users):
    now = time.time()
    return [
        {
            "username": name,
            "online": (now - info.get("last_seen", 0)) < ONLINE_THRESHOLD_SECONDS,
        }
        for name, info in sorted(users.items(), key=lambda item: item[0].lower())
    ]


def dm_conversation_id(user_a, user_b):
    pair = sorted([user_a.lower(), user_b.lower()])
    return f"dm:{pair[0]}|{pair[1]}"


def is_valid_conversation(conv_id, username, users):
    if conv_id == GLOBAL_CONVERSATION:
        return True
    if not conv_id.startswith("dm:") or "|" not in conv_id:
        return False
    parts = conv_id[len("dm:"):].split("|")
    if len(parts) != 2:
        return False
    if username.lower() not in parts:
        return False
    existing_lower = {name.lower() for name in users}
    return all(p in existing_lower for p in parts)


def get_username_from_request():
    data = request.get_json(silent=True) or {}
    return (data.get("username") or "").strip()[:MAX_USERNAME_LENGTH]


def dm_participants(conv_id, users):
    parts = conv_id[len("dm:"):].split("|")
    return [find_existing_name(users, p) or p for p in parts]


def public_game_state(game, username):
    if not game or game.get("status") in (None, "none"):
        return {"status": "none"}

    state = {
        "status": game["status"],
        "host": game["host"],
        "guest": game["guest"],
    }

    if game["status"] == "declined":
        state["declined_by"] = game.get("declined_by")
        return state

    if game["status"] in ("active", "finished"):
        state["max_questions"] = MAX_QUESTIONS
        state["questions_asked"] = game.get("questions_asked", [])

        if game["status"] == "active":
            asked_ids = {q["id"] for q in game["questions_asked"]}
            state["available_questions"] = [
                {"id": i, "text": text}
                for i, (text, _key) in enumerate(QUESTIONS)
                if i not in asked_ids
            ]

        guesses = game.get("guesses", {})
        state["my_guess"] = guesses.get(username.lower())
        partner = game["guest"] if username.lower() == game["host"].lower() else game["host"]
        state["partner_has_guessed"] = partner.lower() in guesses

        if game["status"] == "finished":
            state["secret_country"] = game["secret_country"]
            state["winner"] = game.get("winner")
            state["guesses"] = guesses

    return state


# ---------------- static pages ----------------

@app.route("/")
def index():
    return send_from_directory(BASE_DIR, "index.html")


@app.route("/static/<path:path>")
def static_files(path):
    return send_from_directory(BASE_DIR / "static", path)


# ---------------- login / presence API ----------------

@app.route("/api/users", methods=["GET"])
def get_users():
    with _lock:
        users = load_users()
    return jsonify(users_with_status(users))


@app.route("/api/login", methods=["POST"])
def login():
    username = get_username_from_request()
    if not username:
        return jsonify({"error": "Username is required."}), 400

    with _lock:
        users = load_users()
        existing = find_existing_name(users, username)
        name = existing or username
        users[name] = {"last_seen": time.time()}
        save_users(users)

    return jsonify({"username": name, "online": True})


@app.route("/api/heartbeat", methods=["POST"])
def heartbeat():
    username = get_username_from_request()
    if not username:
        return jsonify({"error": "Username is required."}), 400

    with _lock:
        users = load_users()
        existing = find_existing_name(users, username)
        if existing is None:
            return jsonify({"error": "Unknown username."}), 404
        users[existing]["last_seen"] = time.time()
        save_users(users)

    return jsonify({"ok": True})


@app.route("/api/logout", methods=["POST"])
def logout():
    username = get_username_from_request()
    if not username:
        return jsonify({"error": "Username is required."}), 400

    with _lock:
        users = load_users()
        existing = find_existing_name(users, username)
        if existing:
            users[existing]["last_seen"] = 0
            save_users(users)

    return jsonify({"ok": True})


# ---------------- conversations: messages ----------------

@app.route("/api/conversations/<conv_id>/messages", methods=["GET"])
def get_messages(conv_id):
    username = (request.args.get("username") or "").strip()[:MAX_USERNAME_LENGTH]

    with _lock:
        users = load_users()
        if not is_valid_conversation(conv_id, username, users):
            return jsonify({"error": "Invalid conversation."}), 400
        messages = load_messages()

    return jsonify(messages.get(conv_id, []))


@app.route("/api/conversations/<conv_id>/messages", methods=["POST"])
def post_message(conv_id):
    data = request.get_json(silent=True) or {}
    username = (data.get("username") or "").strip()[:MAX_USERNAME_LENGTH]
    text = (data.get("text") or "").strip()[:MAX_MESSAGE_LENGTH]

    if not username or not text:
        return jsonify({"error": "username and text are required."}), 400

    with _lock:
        users = load_users()
        if find_existing_name(users, username) is None:
            return jsonify({"error": "Unknown username."}), 404
        if not is_valid_conversation(conv_id, username, users):
            return jsonify({"error": "Invalid conversation."}), 400

        messages = load_messages()
        conv_messages = messages.setdefault(conv_id, [])
        message = {"from": username, "text": text, "ts": time.time()}
        conv_messages.append(message)
        if len(conv_messages) > MAX_MESSAGES_PER_CONVERSATION:
            del conv_messages[:-MAX_MESSAGES_PER_CONVERSATION]
        save_messages(messages)

    return jsonify(message)


# ---------------- conversations: suggested topics ----------------

@app.route("/api/conversations/<conv_id>/topics", methods=["GET"])
def get_topics(conv_id):
    username = (request.args.get("username") or "").strip()[:MAX_USERNAME_LENGTH]

    with _lock:
        users = load_users()
        if not is_valid_conversation(conv_id, username, users):
            return jsonify({"error": "Invalid conversation."}), 400
        topics = load_topics()

    return jsonify(topics.get(conv_id, []))


@app.route("/api/conversations/<conv_id>/topics", methods=["POST"])
def post_topic(conv_id):
    data = request.get_json(silent=True) or {}
    username = (data.get("username") or "").strip()[:MAX_USERNAME_LENGTH]
    text = (data.get("text") or "").strip()[:MAX_TOPIC_LENGTH]

    if not username or not text:
        return jsonify({"error": "username and text are required."}), 400

    with _lock:
        users = load_users()
        if find_existing_name(users, username) is None:
            return jsonify({"error": "Unknown username."}), 404
        if not is_valid_conversation(conv_id, username, users):
            return jsonify({"error": "Invalid conversation."}), 400

        topics = load_topics()
        conv_topics = topics.setdefault(conv_id, [])
        topic = {
            "id": int(time.time() * 1000),
            "suggested_by": username,
            "text": text,
            "ts": time.time(),
        }
        conv_topics.append(topic)
        save_topics(topics)

    return jsonify(topic)


@app.route("/api/conversations/<conv_id>/topics/<int:topic_id>", methods=["DELETE"])
def delete_topic(conv_id, topic_id):
    username = (request.args.get("username") or "").strip()[:MAX_USERNAME_LENGTH]

    with _lock:
        users = load_users()
        if not is_valid_conversation(conv_id, username, users):
            return jsonify({"error": "Invalid conversation."}), 400

        topics = load_topics()
        conv_topics = topics.get(conv_id, [])
        topic = next((t for t in conv_topics if t["id"] == topic_id), None)
        if topic is None:
            return jsonify({"error": "Topic not found."}), 404
        if topic["suggested_by"].lower() != username.lower():
            return jsonify({"error": "You can only remove your own suggestions."}), 403

        topics[conv_id] = [t for t in conv_topics if t["id"] != topic_id]
        save_topics(topics)

    return jsonify({"ok": True})


# ---------------- DM mini-game: Guess a Country ----------------

@app.route("/api/conversations/<conv_id>/game", methods=["GET"])
def get_game(conv_id):
    username = (request.args.get("username") or "").strip()[:MAX_USERNAME_LENGTH]

    with _lock:
        users = load_users()
        if not is_valid_conversation(conv_id, username, users):
            return jsonify({"error": "Invalid conversation."}), 400
        games = load_games()

    return jsonify(public_game_state(games.get(conv_id), username))


@app.route("/api/conversations/<conv_id>/game/invite", methods=["POST"])
def invite_game(conv_id):
    username = get_username_from_request()
    if not username:
        return jsonify({"error": "username is required."}), 400
    if not conv_id.startswith("dm:"):
        return jsonify({"error": "Games are only available in DMs."}), 400

    with _lock:
        users = load_users()
        if not is_valid_conversation(conv_id, username, users):
            return jsonify({"error": "Invalid conversation."}), 400

        games = load_games()
        game = games.get(conv_id)
        if game and game.get("status") in ("invited", "active"):
            return jsonify({"error": "A game is already in progress."}), 400

        host = find_existing_name(users, username)
        guest = next(p for p in dm_participants(conv_id, users) if p.lower() != host.lower())

        game = {
            "status": "invited",
            "host": host,
            "guest": guest,
            "secret_country": None,
            "questions_asked": [],
            "guesses": {},
            "winner": None,
        }
        games[conv_id] = game
        save_games(games)

    return jsonify(public_game_state(game, username))


@app.route("/api/conversations/<conv_id>/game/respond", methods=["POST"])
def respond_game(conv_id):
    data = request.get_json(silent=True) or {}
    username = (data.get("username") or "").strip()[:MAX_USERNAME_LENGTH]
    accept = bool(data.get("accept"))
    if not username:
        return jsonify({"error": "username is required."}), 400

    with _lock:
        users = load_users()
        if not is_valid_conversation(conv_id, username, users):
            return jsonify({"error": "Invalid conversation."}), 400

        games = load_games()
        game = games.get(conv_id)
        if not game or game.get("status") != "invited":
            return jsonify({"error": "No pending invite."}), 400
        if game["guest"].lower() != username.lower():
            return jsonify({"error": "Only the invited player can respond."}), 403

        if accept:
            game["status"] = "active"
            game["secret_country"] = random.choice(COUNTRIES)["name"]
            game["questions_asked"] = []
            game["guesses"] = {}
            game["winner"] = None
        else:
            game["status"] = "declined"
            game["declined_by"] = game["guest"]

        games[conv_id] = game
        save_games(games)

    return jsonify(public_game_state(game, username))


@app.route("/api/conversations/<conv_id>/game/question", methods=["POST"])
def ask_game_question(conv_id):
    data = request.get_json(silent=True) or {}
    username = (data.get("username") or "").strip()[:MAX_USERNAME_LENGTH]
    question_id = data.get("question_id")

    with _lock:
        users = load_users()
        if not is_valid_conversation(conv_id, username, users):
            return jsonify({"error": "Invalid conversation."}), 400

        games = load_games()
        game = games.get(conv_id)
        if not game or game.get("status") != "active":
            return jsonify({"error": "No active game."}), 400
        if username.lower() not in (game["host"].lower(), game["guest"].lower()):
            return jsonify({"error": "Not a player in this game."}), 403

        if not isinstance(question_id, int) or not (0 <= question_id < len(QUESTIONS)):
            return jsonify({"error": "Invalid question."}), 400

        asked_ids = {q["id"] for q in game["questions_asked"]}
        if question_id in asked_ids:
            return jsonify({"error": "That question has already been asked."}), 400
        if len(game["questions_asked"]) >= MAX_QUESTIONS:
            return jsonify({"error": "No questions remaining."}), 400

        text, key = QUESTIONS[question_id]
        country = next(c for c in COUNTRIES if c["name"] == game["secret_country"])
        game["questions_asked"].append({
            "id": question_id,
            "text": text,
            "answer": bool(country[key]),
            "asked_by": find_existing_name(users, username) or username,
        })
        games[conv_id] = game
        save_games(games)

    return jsonify(public_game_state(game, username))


@app.route("/api/conversations/<conv_id>/game/guess", methods=["POST"])
def guess_game(conv_id):
    data = request.get_json(silent=True) or {}
    username = (data.get("username") or "").strip()[:MAX_USERNAME_LENGTH]
    guess_text = (data.get("guess") or "").strip()[:MAX_GUESS_LENGTH]

    if not guess_text:
        return jsonify({"error": "guess is required."}), 400

    with _lock:
        users = load_users()
        if not is_valid_conversation(conv_id, username, users):
            return jsonify({"error": "Invalid conversation."}), 400

        games = load_games()
        game = games.get(conv_id)
        if not game or game.get("status") != "active":
            return jsonify({"error": "No active game."}), 400
        if username.lower() not in (game["host"].lower(), game["guest"].lower()):
            return jsonify({"error": "Not a player in this game."}), 403
        if username.lower() in game["guesses"]:
            return jsonify({"error": "You already guessed."}), 400

        canonical = find_existing_name(users, username) or username
        correct = guess_text.lower() == game["secret_country"].lower()
        game["guesses"][username.lower()] = {
            "username": canonical,
            "text": guess_text,
            "correct": correct,
        }

        if correct:
            game["status"] = "finished"
            game["winner"] = canonical
        elif len(game["guesses"]) >= 2:
            game["status"] = "finished"
            game["winner"] = None

        games[conv_id] = game
        save_games(games)

    return jsonify(public_game_state(game, username))


@app.route("/api/conversations/<conv_id>/game/reset", methods=["POST"])
def reset_game(conv_id):
    username = get_username_from_request()

    with _lock:
        users = load_users()
        if not is_valid_conversation(conv_id, username, users):
            return jsonify({"error": "Invalid conversation."}), 400

        games = load_games()
        game = games.get(conv_id)
        if game and game.get("status") in ("declined", "finished"):
            games[conv_id] = {"status": "none"}
            save_games(games)

    return jsonify({"status": "none"})


if __name__ == "__main__":
    import os

    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=True)
