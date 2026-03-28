"""
English Word Adventure — Web App
Flask wrapper for the synonym quiz game.
"""

import os
import random
from flask import Flask, render_template, session, redirect, url_for, request

from english_word_game import WORDS, ROUNDS_PER_GAME, get_word_pool, build_choices

app = Flask(__name__)
app.secret_key = os.environ.get("SECRET_KEY", "english-word-adventure-dev-key")


def get_game_state():
    """Get or initialize game state from session."""
    if "game" not in session:
        session["game"] = {
            "difficulty": None,
            "wins": 0,
            "round_num": 0,
            "total_rounds": 0,
            "streak": 0,
            "best_streak": 0,
            "words_seen": [],
            "word_indices": [],
        }
    return session["game"]


def get_word_by_index(idx):
    """Get a word dict from WORDS by index."""
    return WORDS[idx]


@app.route("/")
def home():
    """Difficulty selection / start screen."""
    easy_count = len(get_word_pool("easy"))
    med_count = len(get_word_pool("medium"))
    hard_count = len(get_word_pool("hard"))
    all_count = len(WORDS)
    return render_template("home.html",
                           easy_count=easy_count,
                           med_count=med_count,
                           hard_count=hard_count,
                           all_count=all_count)


@app.route("/start", methods=["POST"])
def start():
    """Start a new game session with chosen difficulty."""
    difficulty = request.form.get("difficulty", "all")
    session.clear()
    game = get_game_state()
    game["difficulty"] = difficulty

    word_pool = get_word_pool(difficulty)
    total_rounds = min(ROUNDS_PER_GAME, len(word_pool))
    game["total_rounds"] = total_rounds
    # Store indices into WORDS list instead of full word dicts (session cookie size limit)
    pool_indices = [i for i, w in enumerate(WORDS) if difficulty == "all" or w["difficulty"] == difficulty]
    game["word_indices"] = random.sample(pool_indices, total_rounds)

    session.modified = True
    return redirect(url_for("play"))


@app.route("/play")
def play():
    """Show the current word and 4 synonym choices."""
    game = get_game_state()
    if not game["difficulty"] or game["round_num"] >= game["total_rounds"]:
        return redirect(url_for("home"))

    word_idx = game["word_indices"][game["round_num"]]
    word = get_word_by_index(word_idx)
    choices, correct = build_choices(word)

    # Store only lightweight data in session for validation
    session["current_round"] = {
        "word_idx": word_idx,
        "choices": choices,
        "correct": correct,
    }
    session.modified = True

    return render_template("play.html",
                           game=game,
                           word=word,
                           choices=choices,
                           round_num=game["round_num"] + 1,
                           total_rounds=game["total_rounds"])


@app.route("/answer", methods=["POST"])
def answer():
    """Check the player's synonym choice and show result."""
    game = get_game_state()
    current = session.get("current_round")
    if not current:
        return redirect(url_for("home"))

    pick = int(request.form.get("choice", -1))
    word = get_word_by_index(current["word_idx"])
    choices = current["choices"]
    correct_answer = current["correct"]

    if pick < 0 or pick >= len(choices):
        return redirect(url_for("play"))

    chosen = choices[pick]
    is_correct = chosen == correct_answer

    # Update game state
    game["round_num"] += 1
    if is_correct:
        game["wins"] += 1
        game["streak"] += 1
        if game["streak"] > game["best_streak"]:
            game["best_streak"] = game["streak"]
    else:
        game["streak"] = 0

    game["words_seen"].append({
        "name": word["name"],
        "correct": is_correct,
        "definition": word["definition"],
        "tip": word["tip"],
        "difficulty": word["difficulty"],
        "synonyms": word["synonyms"],
    })

    streak_msg = None
    if is_correct:
        if game["streak"] == 3:
            streak_msg = "3 in a row! You're on fire!"
        elif game["streak"] == 5:
            streak_msg = "5 in a row! Word master!"
        elif game["streak"] >= 7:
            streak_msg = f"{game['streak']} in a row! Unstoppable!"

    is_last_round = game["round_num"] >= game["total_rounds"]

    session.modified = True

    return render_template("result.html",
                           game=game,
                           word=word,
                           chosen=chosen,
                           correct_answer=correct_answer,
                           is_correct=is_correct,
                           streak_msg=streak_msg,
                           is_last_round=is_last_round)


@app.route("/review")
def review():
    """End-of-session vocabulary review."""
    game = get_game_state()
    words_seen = game.get("words_seen", [])
    correct_words = [w for w in words_seen if w["correct"]]
    missed_words = [w for w in words_seen if not w["correct"]]

    return render_template("review.html",
                           game=game,
                           words_seen=words_seen,
                           correct_words=correct_words,
                           missed_words=missed_words)


if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=int(os.environ.get("PORT", 5000)))
