"""
English Word Adventure — Web App
Flask wrapper for the English Word Adventure game.
"""

import os
import random
from flask import Flask, render_template, session, redirect, url_for, request

from english_word_game import WORDS, QUESTIONS, MAX_QUESTIONS, get_word_pool, filter_words

app = Flask(__name__)
app.secret_key = os.environ.get("SECRET_KEY", "english-word-adventure-dev-key")


def get_game_state():
    """Get or initialize game state from session."""
    if "game" not in session:
        session["game"] = {
            "difficulty": None,
            "wins": 0,
            "rounds": 0,
            "streak": 0,
            "best_streak": 0,
            "words_seen": [],
        }
    return session["game"]


def get_round_state():
    """Get or initialize round state from session."""
    return session.get("round")


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
    session.modified = True
    return redirect(url_for("new_round"))


@app.route("/new-round")
def new_round():
    """Begin a new round — pick a random word."""
    game = get_game_state()
    if not game["difficulty"]:
        return redirect(url_for("home"))

    word_pool = get_word_pool(game["difficulty"])
    word = random.choice(word_pool)

    session["round"] = {
        "word": word,
        "asked_indices": [],
        "questions_left": MAX_QUESTIONS,
        "possible_count": len(word_pool),
    }
    game["rounds"] += 1
    session.modified = True
    return redirect(url_for("play"))


@app.route("/play")
def play():
    """Main game screen — show available questions."""
    game = get_game_state()
    rnd = get_round_state()
    if not rnd:
        return redirect(url_for("home"))

    available = []
    for i, (question, _) in enumerate(QUESTIONS):
        if i not in rnd["asked_indices"]:
            available.append((i, question))

    return render_template("play.html",
                           game=game,
                           rnd=rnd,
                           available_questions=available,
                           max_questions=MAX_QUESTIONS)


@app.route("/ask", methods=["POST"])
def ask():
    """Process a question selection."""
    game = get_game_state()
    rnd = get_round_state()
    if not rnd:
        return redirect(url_for("home"))

    q_index = int(request.form.get("question_index", -1))
    if q_index < 0 or q_index >= len(QUESTIONS) or q_index in rnd["asked_indices"]:
        return redirect(url_for("play"))

    question_text, attribute = QUESTIONS[q_index]
    answer = rnd["word"][attribute]

    rnd["asked_indices"].append(q_index)
    rnd["questions_left"] -= 1

    # Filter possible words
    word_pool = get_word_pool(game["difficulty"])
    possible = list(word_pool)
    for idx in rnd["asked_indices"]:
        _, attr = QUESTIONS[idx]
        possible = filter_words(possible, attr, rnd["word"][attr])
    rnd["possible_count"] = len(possible)

    session["last_answer"] = {
        "question": question_text,
        "answer": answer,
    }
    session.modified = True

    # Auto-advance to guess if only 1 word left or no questions remain
    if rnd["possible_count"] == 1 or rnd["questions_left"] == 0:
        return redirect(url_for("guess"))

    return redirect(url_for("play"))


@app.route("/guess")
def guess():
    """Guess screen — show hints and accept a guess."""
    game = get_game_state()
    rnd = get_round_state()
    if not rnd:
        return redirect(url_for("home"))

    word = rnd["word"]

    # Build hint list from possible words
    word_pool = get_word_pool(game["difficulty"])
    possible = list(word_pool)
    for idx in rnd["asked_indices"]:
        _, attr = QUESTIONS[idx]
        possible = filter_words(possible, attr, rnd["word"][attr])

    hint_words = [w["name"] for w in possible] if len(possible) <= 10 else []

    return render_template("guess.html",
                           game=game,
                           rnd=rnd,
                           letter_count=len(word["name"]),
                           first_letter=word["name"][0].upper(),
                           hint_words=hint_words,
                           max_questions=MAX_QUESTIONS)


@app.route("/check", methods=["POST"])
def check():
    """Check the player's guess."""
    game = get_game_state()
    rnd = get_round_state()
    if not rnd:
        return redirect(url_for("home"))

    guess_text = request.form.get("guess", "").strip()
    word = rnd["word"]
    correct = guess_text.lower() == word["name"].lower()
    questions_used = MAX_QUESTIONS - rnd["questions_left"]

    if correct:
        game["wins"] += 1
        game["streak"] += 1
        if game["streak"] > game["best_streak"]:
            game["best_streak"] = game["streak"]
    else:
        game["streak"] = 0

    game["words_seen"].append({
        "name": word["name"],
        "correct": correct,
        "definition": word["definition"],
        "tip": word["tip"],
        "difficulty": word["difficulty"],
    })

    # Build traits list
    traits = []
    if word["noun"]:
        traits.append("noun")
    if word["verb"]:
        traits.append("verb")
    if word["adjective"]:
        traits.append("adjective")
    if not any([word["noun"], word["verb"], word["adjective"]]):
        traits.append("adverb")
    if word["one_syllable"]:
        traits.append("one syllable")
    if word["starts_with_vowel"]:
        traits.append("starts with a vowel")
    if word["has_double_letters"]:
        traits.append("has double letters")
    if word["has_silent_letters"]:
        traits.append("has silent letters")
    if word["latin_or_french_origin"]:
        traits.append("Latin/French origin")
    else:
        traits.append("Germanic origin")
    if word["has_prefix"]:
        traits.append("has a prefix")
    if word["has_suffix"]:
        traits.append("has a suffix")

    streak_msg = None
    if correct:
        if game["streak"] == 3:
            streak_msg = "3 in a row! You're on fire!"
        elif game["streak"] == 5:
            streak_msg = "5 in a row! Word master!"
        elif game["streak"] >= 7:
            streak_msg = f"{game['streak']} in a row! Unstoppable!"

    speed_bonus = correct and questions_used <= 2

    session.modified = True

    return render_template("result.html",
                           game=game,
                           word=word,
                           guess=guess_text,
                           correct=correct,
                           questions_used=questions_used,
                           max_questions=MAX_QUESTIONS,
                           traits=traits,
                           streak_msg=streak_msg,
                           speed_bonus=speed_bonus)


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
