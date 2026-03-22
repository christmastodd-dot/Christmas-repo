#!/usr/bin/env python3
"""
Candy Guessing Game
Guess the candy in 5 questions or fewer!
"""

import random

CANDIES = [
    {
        "name": "Reese's Peanut Butter Cups",
        "chocolate": True, "chewy": False, "hard": False, "sour": False,
        "gummy": False, "fruity": False, "nutty": True, "caramel": False,
        "mint": False, "individually_wrapped": True, "bar": False, "bag": True,
        "color": "orange", "american_classic": True, "decades": "1920s",
    },
    {
        "name": "M&Ms",
        "chocolate": True, "chewy": False, "hard": True, "sour": False,
        "gummy": False, "fruity": False, "nutty": False, "caramel": False,
        "mint": False, "individually_wrapped": False, "bar": False, "bag": True,
        "color": "multicolor", "american_classic": True, "decades": "1940s",
    },
    {
        "name": "Snickers",
        "chocolate": True, "chewy": True, "hard": False, "sour": False,
        "gummy": False, "fruity": False, "nutty": True, "caramel": True,
        "mint": False, "individually_wrapped": True, "bar": True, "bag": False,
        "color": "brown", "american_classic": True, "decades": "1930s",
    },
    {
        "name": "Kit Kat",
        "chocolate": True, "chewy": False, "hard": False, "sour": False,
        "gummy": False, "fruity": False, "nutty": False, "caramel": False,
        "mint": False, "individually_wrapped": True, "bar": True, "bag": False,
        "color": "red", "american_classic": True, "decades": "1930s",
    },
    {
        "name": "Twix",
        "chocolate": True, "chewy": True, "hard": False, "sour": False,
        "gummy": False, "fruity": False, "nutty": False, "caramel": True,
        "mint": False, "individually_wrapped": True, "bar": True, "bag": False,
        "color": "gold", "american_classic": True, "decades": "1960s",
    },
    {
        "name": "Skittles",
        "chocolate": False, "chewy": True, "hard": False, "sour": False,
        "gummy": False, "fruity": True, "nutty": False, "caramel": False,
        "mint": False, "individually_wrapped": False, "bar": False, "bag": True,
        "color": "multicolor", "american_classic": True, "decades": "1970s",
    },
    {
        "name": "Starburst",
        "chocolate": False, "chewy": True, "hard": False, "sour": False,
        "gummy": False, "fruity": True, "nutty": False, "caramel": False,
        "mint": False, "individually_wrapped": True, "bar": False, "bag": True,
        "color": "multicolor", "american_classic": True, "decades": "1960s",
    },
    {
        "name": "Hershey's Milk Chocolate Bar",
        "chocolate": True, "chewy": False, "hard": False, "sour": False,
        "gummy": False, "fruity": False, "nutty": False, "caramel": False,
        "mint": False, "individually_wrapped": True, "bar": True, "bag": False,
        "color": "brown", "american_classic": True, "decades": "1900s",
    },
    {
        "name": "Milky Way",
        "chocolate": True, "chewy": True, "hard": False, "sour": False,
        "gummy": False, "fruity": False, "nutty": False, "caramel": True,
        "mint": False, "individually_wrapped": True, "bar": True, "bag": False,
        "color": "brown", "american_classic": True, "decades": "1920s",
    },
    {
        "name": "3 Musketeers",
        "chocolate": True, "chewy": False, "hard": False, "sour": False,
        "gummy": False, "fruity": False, "nutty": False, "caramel": False,
        "mint": False, "individually_wrapped": True, "bar": True, "bag": False,
        "color": "brown", "american_classic": True, "decades": "1930s",
    },
    {
        "name": "Butterfinger",
        "chocolate": True, "chewy": False, "hard": True, "sour": False,
        "gummy": False, "fruity": False, "nutty": True, "caramel": False,
        "mint": False, "individually_wrapped": True, "bar": True, "bag": False,
        "color": "orange", "american_classic": True, "decades": "1920s",
    },
    {
        "name": "Jolly Ranchers",
        "chocolate": False, "chewy": False, "hard": True, "sour": False,
        "gummy": False, "fruity": True, "nutty": False, "caramel": False,
        "mint": False, "individually_wrapped": True, "bar": False, "bag": True,
        "color": "multicolor", "american_classic": True, "decades": "1940s",
    },
    {
        "name": "Sour Patch Kids",
        "chocolate": False, "chewy": True, "hard": False, "sour": True,
        "gummy": True, "fruity": True, "nutty": False, "caramel": False,
        "mint": False, "individually_wrapped": False, "bar": False, "bag": True,
        "color": "multicolor", "american_classic": True, "decades": "1980s",
    },
    {
        "name": "Nerds",
        "chocolate": False, "chewy": False, "hard": True, "sour": True,
        "gummy": False, "fruity": True, "nutty": False, "caramel": False,
        "mint": False, "individually_wrapped": False, "bar": False, "bag": True,
        "color": "multicolor", "american_classic": True, "decades": "1980s",
    },
    {
        "name": "Twizzlers",
        "chocolate": False, "chewy": True, "hard": False, "sour": False,
        "gummy": False, "fruity": True, "nutty": False, "caramel": False,
        "mint": False, "individually_wrapped": False, "bar": False, "bag": True,
        "color": "red", "american_classic": True, "decades": "1920s",
    },
    {
        "name": "Swedish Fish",
        "chocolate": False, "chewy": True, "hard": False, "sour": False,
        "gummy": True, "fruity": True, "nutty": False, "caramel": False,
        "mint": False, "individually_wrapped": False, "bar": False, "bag": True,
        "color": "red", "american_classic": True, "decades": "1950s",
    },
    {
        "name": "Gummy Bears",
        "chocolate": False, "chewy": True, "hard": False, "sour": False,
        "gummy": True, "fruity": True, "nutty": False, "caramel": False,
        "mint": False, "individually_wrapped": False, "bar": False, "bag": True,
        "color": "multicolor", "american_classic": True, "decades": "1980s",
    },
    {
        "name": "Peanut M&Ms",
        "chocolate": True, "chewy": False, "hard": True, "sour": False,
        "gummy": False, "fruity": False, "nutty": True, "caramel": False,
        "mint": False, "individually_wrapped": False, "bar": False, "bag": True,
        "color": "multicolor", "american_classic": True, "decades": "1950s",
    },
    {
        "name": "Almond Joy",
        "chocolate": True, "chewy": True, "hard": False, "sour": False,
        "gummy": False, "fruity": False, "nutty": True, "caramel": False,
        "mint": False, "individually_wrapped": True, "bar": True, "bag": False,
        "color": "brown", "american_classic": True, "decades": "1940s",
    },
    {
        "name": "Mounds",
        "chocolate": True, "chewy": True, "hard": False, "sour": False,
        "gummy": False, "fruity": False, "nutty": False, "caramel": False,
        "mint": False, "individually_wrapped": True, "bar": True, "bag": False,
        "color": "dark brown", "american_classic": True, "decades": "1920s",
    },
    {
        "name": "York Peppermint Patties",
        "chocolate": True, "chewy": False, "hard": False, "sour": False,
        "gummy": False, "fruity": False, "nutty": False, "caramel": False,
        "mint": True, "individually_wrapped": True, "bar": False, "bag": True,
        "color": "brown", "american_classic": True, "decades": "1940s",
    },
    {
        "name": "Junior Mints",
        "chocolate": True, "chewy": False, "hard": False, "sour": False,
        "gummy": False, "fruity": False, "nutty": False, "caramel": False,
        "mint": True, "individually_wrapped": False, "bar": False, "bag": False,
        "color": "green", "american_classic": True, "decades": "1940s",
    },
    {
        "name": "Whoppers",
        "chocolate": True, "chewy": False, "hard": True, "sour": False,
        "gummy": False, "fruity": False, "nutty": False, "caramel": False,
        "mint": False, "individually_wrapped": False, "bar": False, "bag": False,
        "color": "brown", "american_classic": True, "decades": "1940s",
    },
    {
        "name": "Hershey's Kisses",
        "chocolate": True, "chewy": False, "hard": False, "sour": False,
        "gummy": False, "fruity": False, "nutty": False, "caramel": False,
        "mint": False, "individually_wrapped": True, "bar": False, "bag": True,
        "color": "silver", "american_classic": True, "decades": "1900s",
    },
    {
        "name": "Baby Ruth",
        "chocolate": True, "chewy": True, "hard": False, "sour": False,
        "gummy": False, "fruity": False, "nutty": True, "caramel": True,
        "mint": False, "individually_wrapped": True, "bar": True, "bag": False,
        "color": "brown", "american_classic": True, "decades": "1920s",
    },
    {
        "name": "PayDay",
        "chocolate": False, "chewy": True, "hard": False, "sour": False,
        "gummy": False, "fruity": False, "nutty": True, "caramel": True,
        "mint": False, "individually_wrapped": True, "bar": True, "bag": False,
        "color": "tan", "american_classic": True, "decades": "1930s",
    },
    {
        "name": "100 Grand",
        "chocolate": True, "chewy": True, "hard": False, "sour": False,
        "gummy": False, "fruity": False, "nutty": False, "caramel": True,
        "mint": False, "individually_wrapped": True, "bar": True, "bag": False,
        "color": "brown", "american_classic": True, "decades": "1960s",
    },
    {
        "name": "Tootsie Roll",
        "chocolate": True, "chewy": True, "hard": False, "sour": False,
        "gummy": False, "fruity": False, "nutty": False, "caramel": False,
        "mint": False, "individually_wrapped": True, "bar": False, "bag": True,
        "color": "brown", "american_classic": True, "decades": "1890s",
    },
    {
        "name": "Tootsie Pop",
        "chocolate": True, "chewy": True, "hard": True, "sour": False,
        "gummy": False, "fruity": True, "nutty": False, "caramel": False,
        "mint": False, "individually_wrapped": True, "bar": False, "bag": True,
        "color": "multicolor", "american_classic": True, "decades": "1930s",
    },
    {
        "name": "Candy Corn",
        "chocolate": False, "chewy": False, "hard": False, "sour": False,
        "gummy": False, "fruity": False, "nutty": False, "caramel": False,
        "mint": False, "individually_wrapped": False, "bar": False, "bag": True,
        "color": "orange/yellow/white", "american_classic": True, "decades": "1880s",
    },
    {
        "name": "Peeps",
        "chocolate": False, "chewy": False, "hard": False, "sour": False,
        "gummy": False, "fruity": False, "nutty": False, "caramel": False,
        "mint": False, "individually_wrapped": False, "bar": False, "bag": False,
        "color": "multicolor", "american_classic": True, "decades": "1950s",
    },
    {
        "name": "Ring Pop",
        "chocolate": False, "chewy": False, "hard": True, "sour": False,
        "gummy": False, "fruity": True, "nutty": False, "caramel": False,
        "mint": False, "individually_wrapped": True, "bar": False, "bag": False,
        "color": "multicolor", "american_classic": True, "decades": "1970s",
    },
    {
        "name": "Pop Rocks",
        "chocolate": False, "chewy": False, "hard": True, "sour": False,
        "gummy": False, "fruity": True, "nutty": False, "caramel": False,
        "mint": False, "individually_wrapped": False, "bar": False, "bag": False,
        "color": "multicolor", "american_classic": True, "decades": "1970s",
    },
    {
        "name": "Fun Dip",
        "chocolate": False, "chewy": False, "hard": False, "sour": False,
        "gummy": False, "fruity": True, "nutty": False, "caramel": False,
        "mint": False, "individually_wrapped": True, "bar": False, "bag": False,
        "color": "multicolor", "american_classic": True, "decades": "1970s",
    },
    {
        "name": "Warheads",
        "chocolate": False, "chewy": False, "hard": True, "sour": True,
        "gummy": False, "fruity": True, "nutty": False, "caramel": False,
        "mint": False, "individually_wrapped": True, "bar": False, "bag": True,
        "color": "multicolor", "american_classic": True, "decades": "1990s",
    },
    {
        "name": "Laffy Taffy",
        "chocolate": False, "chewy": True, "hard": False, "sour": False,
        "gummy": False, "fruity": True, "nutty": False, "caramel": False,
        "mint": False, "individually_wrapped": True, "bar": False, "bag": True,
        "color": "multicolor", "american_classic": True, "decades": "1970s",
    },
    {
        "name": "Airheads",
        "chocolate": False, "chewy": True, "hard": False, "sour": False,
        "gummy": False, "fruity": True, "nutty": False, "caramel": False,
        "mint": False, "individually_wrapped": True, "bar": True, "bag": True,
        "color": "multicolor", "american_classic": True, "decades": "1980s",
    },
    {
        "name": "Blow Pop",
        "chocolate": False, "chewy": True, "hard": True, "sour": False,
        "gummy": False, "fruity": True, "nutty": False, "caramel": False,
        "mint": False, "individually_wrapped": True, "bar": False, "bag": False,
        "color": "multicolor", "american_classic": True, "decades": "1970s",
    },
    {
        "name": "Mike and Ike",
        "chocolate": False, "chewy": True, "hard": False, "sour": False,
        "gummy": False, "fruity": True, "nutty": False, "caramel": False,
        "mint": False, "individually_wrapped": False, "bar": False, "bag": False,
        "color": "multicolor", "american_classic": True, "decades": "1940s",
    },
    {
        "name": "Dots",
        "chocolate": False, "chewy": True, "hard": False, "sour": False,
        "gummy": True, "fruity": True, "nutty": False, "caramel": False,
        "mint": False, "individually_wrapped": False, "bar": False, "bag": False,
        "color": "multicolor", "american_classic": True, "decades": "1940s",
    },
    {
        "name": "Dum Dums",
        "chocolate": False, "chewy": False, "hard": True, "sour": False,
        "gummy": False, "fruity": True, "nutty": False, "caramel": False,
        "mint": False, "individually_wrapped": True, "bar": False, "bag": True,
        "color": "multicolor", "american_classic": True, "decades": "1920s",
    },
    {
        "name": "Life Savers",
        "chocolate": False, "chewy": False, "hard": True, "sour": False,
        "gummy": False, "fruity": True, "nutty": False, "caramel": False,
        "mint": True, "individually_wrapped": True, "bar": False, "bag": False,
        "color": "multicolor", "american_classic": True, "decades": "1910s",
    },
    {
        "name": "Smarties",
        "chocolate": False, "chewy": False, "hard": False, "sour": False,
        "gummy": False, "fruity": True, "nutty": False, "caramel": False,
        "mint": False, "individually_wrapped": True, "bar": False, "bag": True,
        "color": "multicolor", "american_classic": True, "decades": "1940s",
    },
    {
        "name": "SweeTarts",
        "chocolate": False, "chewy": False, "hard": True, "sour": True,
        "gummy": False, "fruity": True, "nutty": False, "caramel": False,
        "mint": False, "individually_wrapped": False, "bar": False, "bag": True,
        "color": "multicolor", "american_classic": True, "decades": "1960s",
    },
    {
        "name": "Pixy Stix",
        "chocolate": False, "chewy": False, "hard": False, "sour": True,
        "gummy": False, "fruity": True, "nutty": False, "caramel": False,
        "mint": False, "individually_wrapped": True, "bar": False, "bag": False,
        "color": "multicolor", "american_classic": True, "decades": "1950s",
    },
    {
        "name": "Candy Necklace",
        "chocolate": False, "chewy": False, "hard": True, "sour": False,
        "gummy": False, "fruity": True, "nutty": False, "caramel": False,
        "mint": False, "individually_wrapped": True, "bar": False, "bag": False,
        "color": "multicolor", "american_classic": True, "decades": "1950s",
    },
    {
        "name": "Werther's Original",
        "chocolate": False, "chewy": False, "hard": True, "sour": False,
        "gummy": False, "fruity": False, "nutty": False, "caramel": True,
        "mint": False, "individually_wrapped": True, "bar": False, "bag": True,
        "color": "gold", "american_classic": True, "decades": "1900s",
    },
    {
        "name": "Caramello",
        "chocolate": True, "chewy": True, "hard": False, "sour": False,
        "gummy": False, "fruity": False, "nutty": False, "caramel": True,
        "mint": False, "individually_wrapped": True, "bar": True, "bag": False,
        "color": "brown", "american_classic": True, "decades": "1980s",
    },
    {
        "name": "Rolo",
        "chocolate": True, "chewy": True, "hard": False, "sour": False,
        "gummy": False, "fruity": False, "nutty": False, "caramel": True,
        "mint": False, "individually_wrapped": False, "bar": False, "bag": True,
        "color": "brown", "american_classic": True, "decades": "1930s",
    },
    {
        "name": "Crunch Bar",
        "chocolate": True, "chewy": False, "hard": False, "sour": False,
        "gummy": False, "fruity": False, "nutty": False, "caramel": False,
        "mint": False, "individually_wrapped": True, "bar": True, "bag": False,
        "color": "brown", "american_classic": True, "decades": "1930s",
    },
    {
        "name": "Take 5",
        "chocolate": True, "chewy": True, "hard": False, "sour": False,
        "gummy": False, "fruity": False, "nutty": True, "caramel": True,
        "mint": False, "individually_wrapped": True, "bar": True, "bag": False,
        "color": "brown", "american_classic": True, "decades": "2000s",
    },
    {
        "name": "Oh Henry!",
        "chocolate": True, "chewy": True, "hard": False, "sour": False,
        "gummy": False, "fruity": False, "nutty": True, "caramel": True,
        "mint": False, "individually_wrapped": True, "bar": True, "bag": False,
        "color": "brown", "american_classic": True, "decades": "1920s",
    },
    {
        "name": "Zero Bar",
        "chocolate": False, "chewy": True, "hard": False, "sour": False,
        "gummy": False, "fruity": False, "nutty": True, "caramel": True,
        "mint": False, "individually_wrapped": True, "bar": True, "bag": False,
        "color": "white", "american_classic": True, "decades": "1920s",
    },
    {
        "name": "Abba-Zaba",
        "chocolate": False, "chewy": True, "hard": False, "sour": False,
        "gummy": False, "fruity": False, "nutty": True, "caramel": False,
        "mint": False, "individually_wrapped": True, "bar": True, "bag": False,
        "color": "yellow/white", "american_classic": True, "decades": "1920s",
    },
    {
        "name": "Charleston Chew",
        "chocolate": True, "chewy": True, "hard": False, "sour": False,
        "gummy": False, "fruity": False, "nutty": False, "caramel": False,
        "mint": False, "individually_wrapped": True, "bar": True, "bag": False,
        "color": "brown", "american_classic": True, "decades": "1920s",
    },
    {
        "name": "Bit-O-Honey",
        "chocolate": False, "chewy": True, "hard": False, "sour": False,
        "gummy": False, "fruity": False, "nutty": True, "caramel": False,
        "mint": False, "individually_wrapped": True, "bar": False, "bag": True,
        "color": "yellow", "american_classic": True, "decades": "1920s",
    },
    {
        "name": "Mary Jane",
        "chocolate": False, "chewy": True, "hard": False, "sour": False,
        "gummy": False, "fruity": False, "nutty": True, "caramel": False,
        "mint": False, "individually_wrapped": True, "bar": False, "bag": True,
        "color": "yellow", "american_classic": True, "decades": "1910s",
    },
    {
        "name": "Milk Duds",
        "chocolate": True, "chewy": True, "hard": False, "sour": False,
        "gummy": False, "fruity": False, "nutty": False, "caramel": True,
        "mint": False, "individually_wrapped": False, "bar": False, "bag": False,
        "color": "brown", "american_classic": True, "decades": "1920s",
    },
    {
        "name": "Jujubes",
        "chocolate": False, "chewy": True, "hard": True, "sour": False,
        "gummy": True, "fruity": True, "nutty": False, "caramel": False,
        "mint": False, "individually_wrapped": False, "bar": False, "bag": False,
        "color": "multicolor", "american_classic": True, "decades": "1920s",
    },
    {
        "name": "Jujyfruits",
        "chocolate": False, "chewy": True, "hard": False, "sour": False,
        "gummy": True, "fruity": True, "nutty": False, "caramel": False,
        "mint": False, "individually_wrapped": False, "bar": False, "bag": False,
        "color": "multicolor", "american_classic": True, "decades": "1920s",
    },
    {
        "name": "Good & Plenty",
        "chocolate": False, "chewy": True, "hard": False, "sour": False,
        "gummy": False, "fruity": False, "nutty": False, "caramel": False,
        "mint": False, "individually_wrapped": False, "bar": False, "bag": False,
        "color": "pink/white", "american_classic": True, "decades": "1890s",
    },
    {
        "name": "Black Licorice",
        "chocolate": False, "chewy": True, "hard": False, "sour": False,
        "gummy": False, "fruity": False, "nutty": False, "caramel": False,
        "mint": False, "individually_wrapped": False, "bar": False, "bag": True,
        "color": "black", "american_classic": True, "decades": "1800s",
    },
    {
        "name": "Red Hots",
        "chocolate": False, "chewy": False, "hard": True, "sour": False,
        "gummy": False, "fruity": False, "nutty": False, "caramel": False,
        "mint": False, "individually_wrapped": False, "bar": False, "bag": True,
        "color": "red", "american_classic": True, "decades": "1930s",
    },
    {
        "name": "Atomic Fireballs",
        "chocolate": False, "chewy": False, "hard": True, "sour": False,
        "gummy": False, "fruity": False, "nutty": False, "caramel": False,
        "mint": False, "individually_wrapped": True, "bar": False, "bag": True,
        "color": "red", "american_classic": True, "decades": "1950s",
    },
    {
        "name": "Haribo Gold-Bears",
        "chocolate": False, "chewy": True, "hard": False, "sour": False,
        "gummy": True, "fruity": True, "nutty": False, "caramel": False,
        "mint": False, "individually_wrapped": False, "bar": False, "bag": True,
        "color": "multicolor", "american_classic": False, "decades": "1920s",
    },
    {
        "name": "Trolli Gummy Worms",
        "chocolate": False, "chewy": True, "hard": False, "sour": True,
        "gummy": True, "fruity": True, "nutty": False, "caramel": False,
        "mint": False, "individually_wrapped": False, "bar": False, "bag": True,
        "color": "multicolor", "american_classic": False, "decades": "1980s",
    },
    {
        "name": "Peach Rings",
        "chocolate": False, "chewy": True, "hard": False, "sour": False,
        "gummy": True, "fruity": True, "nutty": False, "caramel": False,
        "mint": False, "individually_wrapped": False, "bar": False, "bag": True,
        "color": "orange/white", "american_classic": False, "decades": "1980s",
    },
    {
        "name": "Welch's Fruit Snacks",
        "chocolate": False, "chewy": True, "hard": False, "sour": False,
        "gummy": True, "fruity": True, "nutty": False, "caramel": False,
        "mint": False, "individually_wrapped": False, "bar": False, "bag": True,
        "color": "multicolor", "american_classic": True, "decades": "1970s",
    },
    {
        "name": "Almond Roca",
        "chocolate": True, "chewy": False, "hard": True, "sour": False,
        "gummy": False, "fruity": False, "nutty": True, "caramel": False,
        "mint": False, "individually_wrapped": True, "bar": False, "bag": False,
        "color": "gold", "american_classic": True, "decades": "1920s",
    },
    {
        "name": "See's Candies",
        "chocolate": True, "chewy": True, "hard": False, "sour": False,
        "gummy": False, "fruity": False, "nutty": True, "caramel": True,
        "mint": False, "individually_wrapped": True, "bar": False, "bag": False,
        "color": "brown", "american_classic": True, "decades": "1920s",
    },
    {
        "name": "Ferrero Rocher",
        "chocolate": True, "chewy": False, "hard": False, "sour": False,
        "gummy": False, "fruity": False, "nutty": True, "caramel": False,
        "mint": False, "individually_wrapped": True, "bar": False, "bag": False,
        "color": "gold", "american_classic": False, "decades": "1980s",
    },
    {
        "name": "Lindor Truffles",
        "chocolate": True, "chewy": False, "hard": False, "sour": False,
        "gummy": False, "fruity": False, "nutty": False, "caramel": False,
        "mint": False, "individually_wrapped": True, "bar": False, "bag": False,
        "color": "multicolor", "american_classic": False, "decades": "1940s",
    },
    {
        "name": "Sno-Caps",
        "chocolate": True, "chewy": False, "hard": True, "sour": False,
        "gummy": False, "fruity": False, "nutty": False, "caramel": False,
        "mint": False, "individually_wrapped": False, "bar": False, "bag": False,
        "color": "dark brown", "american_classic": True, "decades": "1920s",
    },
    {
        "name": "Gobstopper",
        "chocolate": False, "chewy": False, "hard": True, "sour": False,
        "gummy": False, "fruity": True, "nutty": False, "caramel": False,
        "mint": False, "individually_wrapped": False, "bar": False, "bag": True,
        "color": "multicolor", "american_classic": True, "decades": "1970s",
    },
    {
        "name": "Charms Blow Pop",
        "chocolate": False, "chewy": True, "hard": True, "sour": False,
        "gummy": False, "fruity": True, "nutty": False, "caramel": False,
        "mint": False, "individually_wrapped": True, "bar": False, "bag": True,
        "color": "multicolor", "american_classic": True, "decades": "1970s",
    },
    {
        "name": "Lemonheads",
        "chocolate": False, "chewy": False, "hard": True, "sour": True,
        "gummy": False, "fruity": True, "nutty": False, "caramel": False,
        "mint": False, "individually_wrapped": False, "bar": False, "bag": True,
        "color": "yellow", "american_classic": True, "decades": "1960s",
    },
    {
        "name": "Now and Later",
        "chocolate": False, "chewy": True, "hard": True, "sour": False,
        "gummy": False, "fruity": True, "nutty": False, "caramel": False,
        "mint": False, "individually_wrapped": True, "bar": False, "bag": True,
        "color": "multicolor", "american_classic": True, "decades": "1960s",
    },
    {
        "name": "Chuckles",
        "chocolate": False, "chewy": True, "hard": False, "sour": False,
        "gummy": True, "fruity": True, "nutty": False, "caramel": False,
        "mint": False, "individually_wrapped": False, "bar": False, "bag": False,
        "color": "multicolor", "american_classic": True, "decades": "1920s",
    },
    {
        "name": "Andes Mints",
        "chocolate": True, "chewy": False, "hard": False, "sour": False,
        "gummy": False, "fruity": False, "nutty": False, "caramel": False,
        "mint": True, "individually_wrapped": True, "bar": False, "bag": True,
        "color": "green", "american_classic": True, "decades": "1950s",
    },
    {
        "name": "Peppermint Patty",
        "chocolate": True, "chewy": False, "hard": False, "sour": False,
        "gummy": False, "fruity": False, "nutty": False, "caramel": False,
        "mint": True, "individually_wrapped": True, "bar": False, "bag": True,
        "color": "brown", "american_classic": True, "decades": "1940s",
    },
    {
        "name": "Peanut Brittle",
        "chocolate": False, "chewy": False, "hard": True, "sour": False,
        "gummy": False, "fruity": False, "nutty": True, "caramel": False,
        "mint": False, "individually_wrapped": False, "bar": False, "bag": False,
        "color": "golden brown", "american_classic": True, "decades": "1800s",
    },
    {
        "name": "Fudge",
        "chocolate": True, "chewy": True, "hard": False, "sour": False,
        "gummy": False, "fruity": False, "nutty": False, "caramel": False,
        "mint": False, "individually_wrapped": False, "bar": False, "bag": False,
        "color": "brown", "american_classic": True, "decades": "1880s",
    },
    {
        "name": "Salt Water Taffy",
        "chocolate": False, "chewy": True, "hard": False, "sour": False,
        "gummy": False, "fruity": True, "nutty": False, "caramel": False,
        "mint": False, "individually_wrapped": True, "bar": False, "bag": True,
        "color": "multicolor", "american_classic": True, "decades": "1880s",
    },
    {
        "name": "Caramel Apple",
        "chocolate": False, "chewy": True, "hard": False, "sour": False,
        "gummy": False, "fruity": True, "nutty": False, "caramel": True,
        "mint": False, "individually_wrapped": False, "bar": False, "bag": False,
        "color": "brown", "american_classic": True, "decades": "1950s",
    },
    {
        "name": "Candy Apple",
        "chocolate": False, "chewy": False, "hard": True, "sour": False,
        "gummy": False, "fruity": True, "nutty": False, "caramel": False,
        "mint": False, "individually_wrapped": False, "bar": False, "bag": False,
        "color": "red", "american_classic": True, "decades": "1900s",
    },
    {
        "name": "Cotton Candy",
        "chocolate": False, "chewy": False, "hard": False, "sour": False,
        "gummy": False, "fruity": False, "nutty": False, "caramel": False,
        "mint": False, "individually_wrapped": False, "bar": False, "bag": True,
        "color": "pink/blue", "american_classic": True, "decades": "1890s",
    },
    {
        "name": "Rock Candy",
        "chocolate": False, "chewy": False, "hard": True, "sour": False,
        "gummy": False, "fruity": False, "nutty": False, "caramel": False,
        "mint": False, "individually_wrapped": False, "bar": False, "bag": False,
        "color": "multicolor", "american_classic": True, "decades": "1800s",
    },
    {
        "name": "Candy Cane",
        "chocolate": False, "chewy": False, "hard": True, "sour": False,
        "gummy": False, "fruity": False, "nutty": False, "caramel": False,
        "mint": True, "individually_wrapped": True, "bar": False, "bag": True,
        "color": "red/white", "american_classic": True, "decades": "1800s",
    },
    {
        "name": "Pez",
        "chocolate": False, "chewy": False, "hard": True, "sour": False,
        "gummy": False, "fruity": True, "nutty": False, "caramel": False,
        "mint": False, "individually_wrapped": False, "bar": False, "bag": False,
        "color": "multicolor", "american_classic": False, "decades": "1920s",
    },
    {
        "name": "Jawbreaker",
        "chocolate": False, "chewy": False, "hard": True, "sour": False,
        "gummy": False, "fruity": True, "nutty": False, "caramel": False,
        "mint": False, "individually_wrapped": True, "bar": False, "bag": True,
        "color": "multicolor", "american_classic": True, "decades": "1920s",
    },
    {
        "name": "Mallo Cup",
        "chocolate": True, "chewy": True, "hard": False, "sour": False,
        "gummy": False, "fruity": False, "nutty": False, "caramel": False,
        "mint": False, "individually_wrapped": True, "bar": False, "bag": False,
        "color": "brown", "american_classic": True, "decades": "1930s",
    },
    {
        "name": "Zagnut",
        "chocolate": False, "chewy": True, "hard": False, "sour": False,
        "gummy": False, "fruity": False, "nutty": True, "caramel": False,
        "mint": False, "individually_wrapped": True, "bar": True, "bag": False,
        "color": "tan", "american_classic": True, "decades": "1930s",
    },
    {
        "name": "Idaho Spud",
        "chocolate": True, "chewy": True, "hard": False, "sour": False,
        "gummy": False, "fruity": False, "nutty": False, "caramel": False,
        "mint": False, "individually_wrapped": True, "bar": True, "bag": False,
        "color": "brown", "american_classic": True, "decades": "1910s",
    },
    {
        "name": "Goo Goo Cluster",
        "chocolate": True, "chewy": True, "hard": False, "sour": False,
        "gummy": False, "fruity": False, "nutty": True, "caramel": True,
        "mint": False, "individually_wrapped": True, "bar": False, "bag": False,
        "color": "brown", "american_classic": True, "decades": "1910s",
    },
    {
        "name": "Reese's Pieces",
        "chocolate": False, "chewy": False, "hard": True, "sour": False,
        "gummy": False, "fruity": False, "nutty": True, "caramel": False,
        "mint": False, "individually_wrapped": False, "bar": False, "bag": True,
        "color": "orange/yellow/brown", "american_classic": True, "decades": "1970s",
    },
    {
        "name": "Wax Lips",
        "chocolate": False, "chewy": True, "hard": False, "sour": False,
        "gummy": False, "fruity": False, "nutty": False, "caramel": False,
        "mint": False, "individually_wrapped": True, "bar": False, "bag": False,
        "color": "red", "american_classic": True, "decades": "1940s",
    },
    {
        "name": "Big League Chew",
        "chocolate": False, "chewy": True, "hard": False, "sour": False,
        "gummy": False, "fruity": True, "nutty": False, "caramel": False,
        "mint": False, "individually_wrapped": False, "bar": False, "bag": False,
        "color": "pink", "american_classic": True, "decades": "1980s",
    },
    {
        "name": "Zotz",
        "chocolate": False, "chewy": False, "hard": True, "sour": True,
        "gummy": False, "fruity": True, "nutty": False, "caramel": False,
        "mint": False, "individually_wrapped": True, "bar": False, "bag": True,
        "color": "multicolor", "american_classic": True, "decades": "1960s",
    },
    {
        "name": "Giant Chewy Sweet Tarts",
        "chocolate": False, "chewy": True, "hard": False, "sour": True,
        "gummy": False, "fruity": True, "nutty": False, "caramel": False,
        "mint": False, "individually_wrapped": True, "bar": False, "bag": True,
        "color": "multicolor", "american_classic": True, "decades": "1990s",
    },
]

QUESTIONS = [
    ("Is it a chocolate candy?", "chocolate"),
    ("Is it chewy?", "chewy"),
    ("Is it a hard candy?", "hard"),
    ("Is it sour?", "sour"),
    ("Is it gummy?", "gummy"),
    ("Does it have a fruity flavor?", "fruity"),
    ("Does it contain nuts?", "nutty"),
    ("Does it have caramel?", "caramel"),
    ("Does it have a mint flavor?", "mint"),
    ("Does it come individually wrapped?", "individually_wrapped"),
    ("Is it a candy bar?", "bar"),
    ("Does it come in a bag?", "bag"),
    ("Is it considered an American classic candy?", "american_classic"),
]

MAX_QUESTIONS = 5


def clear_screen():
    print("\n" + "=" * 60)


def display_header():
    print("=" * 60)
    print("      *** CANDY GUESSING GAME ***")
    print("=" * 60)
    print("  I'm thinking of one of the top 100 American candies!")
    print("  Ask up to 5 yes/no questions, then take your guess.")
    print("=" * 60)


def display_available_questions(asked_indices):
    print("\nAvailable questions to ask:")
    for i, (question, _) in enumerate(QUESTIONS):
        if i not in asked_indices:
            print(f"  [{i + 1:2}] {question}")


def get_yes_no(prompt):
    while True:
        answer = input(prompt).strip().lower()
        if answer in ("yes", "y"):
            return True
        elif answer in ("no", "n"):
            return False
        else:
            print("      Please answer 'yes' or 'no'.")


def filter_candies(candies, attribute, value):
    return [c for c in candies if c[attribute] == value]


def play_game(candy):
    questions_left = MAX_QUESTIONS
    asked_indices = set()
    possible_candies = list(CANDIES)

    print(f"\n  I'm thinking of a candy... ({len(possible_candies)} possibilities)")

    while questions_left > 0:
        print(f"\n  Questions remaining: {questions_left}")
        print(f"  Remaining possible candies: {len(possible_candies)}")
        display_available_questions(asked_indices)

        remaining_q_indices = [i for i in range(len(QUESTIONS)) if i not in asked_indices]
        if not remaining_q_indices:
            print("\n  You've asked all available questions!")
            break

        print(f"\n  Enter a question number (1-{len(QUESTIONS)}) or 0 to make your guess now:")

        while True:
            try:
                choice = int(input("  > ").strip())
                if choice == 0:
                    questions_left = 0
                    break
                elif 1 <= choice <= len(QUESTIONS) and (choice - 1) not in asked_indices:
                    break
                elif 1 <= choice <= len(QUESTIONS) and (choice - 1) in asked_indices:
                    print("  You already asked that question! Pick another.")
                else:
                    print(f"  Please enter a number between 1 and {len(QUESTIONS)}, or 0 to guess.")
            except ValueError:
                print("  Please enter a valid number.")

        if questions_left == 0:
            break

        q_index = choice - 1
        question_text, attribute = QUESTIONS[q_index]
        asked_indices.add(q_index)

        print(f"\n  Q: {question_text}")
        answer = candy[attribute]
        print(f"  A: {'YES' if answer else 'NO'}")

        possible_candies = filter_candies(possible_candies, attribute, answer)
        questions_left -= 1

        if len(possible_candies) == 1:
            print(f"\n  [Only 1 candy left matching your clues!]")
            break

    print("\n" + "-" * 60)
    print("  TIME TO GUESS!")
    print("-" * 60)

    if len(possible_candies) <= 10 and len(possible_candies) > 1:
        print(f"\n  Hint: Based on your questions, it could be one of these:")
        for c in possible_candies:
            print(f"    - {c['name']}")

    print("\n  What candy am I thinking of?")
    guess = input("  Your guess: ").strip()

    if guess.lower() == candy["name"].lower():
        print("\n  *** CORRECT! ***")
        print(f"  You guessed it! The candy was: {candy['name']}")
        return True
    else:
        print(f"\n  Not quite! The candy was: {candy['name']}")
        print(f"  You guessed: {guess}")
        return False


def show_candy_facts(candy):
    print("\n  Fun facts about this candy:")
    traits = []
    if candy["chocolate"]:
        traits.append("contains chocolate")
    if candy["chewy"]:
        traits.append("chewy")
    if candy["hard"]:
        traits.append("hard candy")
    if candy["sour"]:
        traits.append("sour")
    if candy["gummy"]:
        traits.append("gummy")
    if candy["fruity"]:
        traits.append("fruity flavored")
    if candy["nutty"]:
        traits.append("contains nuts")
    if candy["caramel"]:
        traits.append("has caramel")
    if candy["mint"]:
        traits.append("mint flavored")
    if candy["bar"]:
        traits.append("a candy bar")
    if candy["individually_wrapped"]:
        traits.append("individually wrapped")
    if candy["american_classic"]:
        traits.append("an American classic")

    print(f"  {candy['name']} first appeared in the {candy['decades']}")
    print(f"  It is: {', '.join(traits) if traits else 'a unique candy!'}")


def main():
    display_header()
    wins = 0
    rounds = 0

    while True:
        candy = random.choice(CANDIES)
        rounds += 1

        won = play_game(candy)
        show_candy_facts(candy)

        if won:
            wins += 1

        print(f"\n  Score: {wins} wins out of {rounds} round(s)")
        print()

        play_again = get_yes_no("  Play again? (yes/no): ")
        if not play_again:
            print("\n  Thanks for playing the Candy Guessing Game!")
            print(f"  Final score: {wins} wins out of {rounds} round(s)")
            print("=" * 60)
            break

        clear_screen()
        display_header()


if __name__ == "__main__":
    main()
