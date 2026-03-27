"""First-grade math problem generator."""

import random


def generate_problem(stage="child"):
    """Generate a math problem appropriate for 1st graders.

    Returns (question_text, correct_answer).
    Difficulty scales slightly with pet stage.
    """
    # Pick problem type based on stage
    if stage == "egg":
        return _counting_problem()
    elif stage == "baby":
        return _simple_addition()
    elif stage == "child":
        return random.choice([_simple_addition, _simple_subtraction])()
    elif stage == "teen":
        return random.choice([_addition, _subtraction, _missing_number])()
    else:  # adult
        return random.choice([_addition, _subtraction, _missing_number, _word_problem])()


def _counting_problem():
    """Count objects: 'How many stars? * * * *'"""
    n = random.randint(1, 5)
    symbols = random.choice(["*", "#", "@"])
    display = " ".join([symbols] * n)
    return f"How many {symbols}'s?  {display}", n


def _simple_addition():
    """Single digit: 2 + 3 = ?"""
    a = random.randint(1, 5)
    b = random.randint(1, 5)
    return f"{a} + {b} = ?", a + b


def _simple_subtraction():
    """Single digit, no negatives: 5 - 2 = ?"""
    a = random.randint(2, 9)
    b = random.randint(1, a)
    return f"{a} - {b} = ?", a - b


def _addition():
    """Slightly larger: up to 10 + 10."""
    a = random.randint(1, 10)
    b = random.randint(1, 10)
    return f"{a} + {b} = ?", a + b


def _subtraction():
    """Larger subtraction, no negatives."""
    a = random.randint(5, 20)
    b = random.randint(1, a)
    return f"{a} - {b} = ?", a - b


def _missing_number():
    """Fill in the blank: 3 + ___ = 7"""
    answer = random.randint(1, 9)
    a = random.randint(1, 9)
    total = a + answer
    if random.random() < 0.5:
        return f"{a} + ___ = {total}", answer
    else:
        return f"___ + {a} = {total}", answer


def _word_problem():
    """Simple word problem."""
    templates = [
        ("You have {a} apples and find {b} more. How many apples?", lambda a, b: a + b),
        ("{name} has {a} cookies and eats {b}. How many are left?", lambda a, b: a - b),
        ("There are {a} cats and {b} dogs. How many animals?", lambda a, b: a + b),
        ("{name} had {a} toys. They gave away {b}. How many left?", lambda a, b: a - b),
    ]
    names = ["Stitch", "Lilo", "Nani", "Jumba"]
    template, op = random.choice(templates)

    if "eats" in template or "gave" in template:
        a = random.randint(5, 12)
        b = random.randint(1, a)
    else:
        a = random.randint(1, 10)
        b = random.randint(1, 10)

    question = template.format(a=a, b=b, name=random.choice(names))
    return question, op(a, b)
