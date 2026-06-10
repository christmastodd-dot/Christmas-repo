#!/usr/bin/env python3
"""
Christmas Chat - Web Server

Serves the chat frontend and a small JSON API:
- Shared "login" (no password) with online presence, reused from the
  earlier candy-guessing project.
- A global chat room and 1:1 DMs between registered users.
- Per-conversation "suggested topics" that members can propose.
"""

import json
import time
from pathlib import Path
from threading import Lock

from flask import Flask, jsonify, request, send_from_directory

BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data"
USERS_FILE = DATA_DIR / "users.json"
MESSAGES_FILE = DATA_DIR / "messages.json"
TOPICS_FILE = DATA_DIR / "topics.json"

ONLINE_THRESHOLD_SECONDS = 30
MAX_USERNAME_LENGTH = 20
MAX_MESSAGE_LENGTH = 1000
MAX_TOPIC_LENGTH = 200
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


if __name__ == "__main__":
    import os

    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=True)
