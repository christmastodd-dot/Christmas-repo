#!/usr/bin/env python3
"""
Candy Guessing Game - Web Server

Serves the static frontend and a small shared "login" API so visitors can
pick a username (no password) and see who else is currently on the site.
"""

import json
import os
import time
from pathlib import Path
from threading import Lock

from flask import Flask, jsonify, request, send_from_directory

BASE_DIR = Path(__file__).resolve().parent
DATA_FILE = BASE_DIR / "data" / "users.json"
ONLINE_THRESHOLD_SECONDS = 30
MAX_USERNAME_LENGTH = 20

app = Flask(__name__, static_folder=None)
_lock = Lock()


def load_users():
    if not DATA_FILE.exists():
        return {}
    try:
        with open(DATA_FILE) as f:
            return json.load(f)
    except (json.JSONDecodeError, OSError):
        return {}


def save_users(users):
    DATA_FILE.parent.mkdir(parents=True, exist_ok=True)
    with open(DATA_FILE, "w") as f:
        json.dump(users, f)


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


def get_username_from_request():
    data = request.get_json(silent=True) or {}
    username = (data.get("username") or "").strip()[:MAX_USERNAME_LENGTH]
    return username


@app.route("/")
def index():
    return send_from_directory(BASE_DIR, "index.html")


@app.route("/static/<path:path>")
def static_files(path):
    return send_from_directory(BASE_DIR / "static", path)


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


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=True)
