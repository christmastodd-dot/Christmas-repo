"""Second-grade math problem generator: +, -, x, /."""

import random


def generate_problem(stage="child"):
    """Generate a math problem appropriate for 2nd graders.

    Returns (question_text, correct_answer).
    Difficulty scales with pet stage across all four operations.
    """
    if stage == "egg":
        # Single-digit addition and subtraction
        return random.choice([_add_single, _sub_single])()
    elif stage == "baby":
        # Double-digit addition/subtraction, intro multiplication
        return random.choice([_add_double, _sub_double, _mult_intro])()
    elif stage == "child":
        # All four operations, moderate difficulty
        return random.choice([_add_double, _sub_double, _mult_basic, _div_basic])()
    elif stage == "teen":
        # Harder numbers, missing number problems
        return random.choice([_add_harder, _sub_harder, _mult_basic, _div_basic, _missing_number])()
    else:  # adult
        # Full mix including word problems
        return random.choice([_add_harder, _sub_harder, _mult_harder, _div_harder, _missing_number, _word_problem])()


# ── Addition ─────────────────────────────────────────────────────────

def _add_single():
    a = random.randint(1, 9)
    b = random.randint(1, 9)
    return f"{a} + {b} = ?", a + b


def _add_double():
    a = random.randint(10, 50)
    b = random.randint(1, 30)
    return f"{a} + {b} = ?", a + b


def _add_harder():
    a = random.randint(25, 99)
    b = random.randint(10, 75)
    return f"{a} + {b} = ?", a + b


# ── Subtraction ──────────────────────────────────────────────────────

def _sub_single():
    a = random.randint(2, 18)
    b = random.randint(1, a)
    return f"{a} - {b} = ?", a - b


def _sub_double():
    a = random.randint(20, 60)
    b = random.randint(1, a)
    return f"{a} - {b} = ?", a - b


def _sub_harder():
    a = random.randint(50, 150)
    b = random.randint(10, a)
    return f"{a} - {b} = ?", a - b


# ── Multiplication ───────────────────────────────────────────────────

def _mult_intro():
    a = random.randint(1, 5)
    b = random.randint(1, 5)
    return f"{a} x {b} = ?", a * b


def _mult_basic():
    a = random.randint(2, 9)
    b = random.randint(2, 9)
    return f"{a} x {b} = ?", a * b


def _mult_harder():
    a = random.randint(3, 12)
    b = random.randint(2, 12)
    return f"{a} x {b} = ?", a * b


# ── Division ─────────────────────────────────────────────────────────

def _div_basic():
    b = random.randint(2, 9)
    answer = random.randint(1, 9)
    a = b * answer  # always divides evenly
    return f"{a} / {b} = ?", answer


def _div_harder():
    b = random.randint(2, 12)
    answer = random.randint(2, 12)
    a = b * answer
    return f"{a} / {b} = ?", answer


# ── Missing number ───────────────────────────────────────────────────

def _missing_number():
    op = random.choice(["+", "-", "x"])
    if op == "+":
        answer = random.randint(1, 20)
        a = random.randint(1, 30)
        total = a + answer
        if random.random() < 0.5:
            return f"{a} + ___ = {total}", answer
        else:
            return f"___ + {a} = {total}", answer
    elif op == "-":
        b = random.randint(1, 20)
        answer = random.randint(1, 30)
        a = answer + b  # a - b = answer
        return f"{a} - ___ = {answer}", b
    else:  # x
        answer = random.randint(2, 9)
        a = random.randint(2, 9)
        total = a * answer
        return f"{a} x ___ = {total}", answer


# ── Word problems ────────────────────────────────────────────────────

def _word_problem():
    templates = [
        ("You have {a} apples and find {b} more. How many apples?",
         "+", lambda a, b: a + b),
        ("{name} has {a} stickers and gives away {b}. How many left?",
         "-", lambda a, b: a - b),
        ("There are {a} rows with {b} chairs each. How many chairs?",
         "x", lambda a, b: a * b),
        ("{name} shares {a} candies equally among {b} friends. How many each?",
         "/", lambda a, b: a // b),
        ("{a} kids each have {b} pencils. How many pencils total?",
         "x", lambda a, b: a * b),
        ("{name} has {a} marbles and wins {b} more. How many now?",
         "+", lambda a, b: a + b),
    ]
    names = ["Stitch", "Lilo", "Nani", "Jumba"]
    template, op_type, op = random.choice(templates)

    if op_type == "+":
        a = random.randint(5, 50)
        b = random.randint(3, 30)
    elif op_type == "-":
        a = random.randint(15, 60)
        b = random.randint(1, a)
    elif op_type == "x":
        a = random.randint(2, 9)
        b = random.randint(2, 9)
    else:  # /
        b = random.randint(2, 8)
        answer = random.randint(2, 8)
        a = b * answer

    question = template.format(a=a, b=b, name=random.choice(names))
    return question, op(a, b)
