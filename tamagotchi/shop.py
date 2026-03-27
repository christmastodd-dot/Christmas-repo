"""Shop display and purchase logic."""

from tamagotchi.config import (
    SHOP_FOODS, SHOP_TOYS, SHOP_MEDICINE, BALL_PLAY_USES,
)


def get_shop_items():
    """Return a flat list of all shop items with unified structure."""
    items = []
    for name, price, hunger, happiness in SHOP_FOODS:
        hap = f", happy +{happiness}" if happiness else ""
        items.append({
            "name": name,
            "price": price,
            "category": "food",
            "desc": f"hunger +{hunger}{hap}",
            "hunger": hunger,
            "happiness": happiness,
        })
    for name, price, toy_type, desc in SHOP_TOYS:
        items.append({
            "name": name,
            "price": price,
            "category": "toy",
            "toy_type": toy_type,
            "desc": desc,
        })
    for name, price, health in SHOP_MEDICINE:
        items.append({
            "name": name,
            "price": price,
            "category": "medicine",
            "desc": f"health +{health}",
            "health": health,
        })
    return items


def render_shop(coins):
    """Print the shop menu. Returns the item list for index-based selection."""
    items = get_shop_items()
    print(f"  === SHOP === (You have {coins} coins)")
    print()
    for i, item in enumerate(items):
        affordable = " " if coins >= item["price"] else "x"
        print(f"  [{affordable}] [{i + 1}] {item['name']:<12} {item['price']:>3} coins  -  {item['desc']}")
    print()
    print("      [0] Leave shop")
    return items


def buy_item(item, pet, inventory):
    """Process a purchase. Returns (success: bool, message: str)."""
    if pet.coins < item["price"]:
        return False, "Not enough coins!"

    pet.coins -= item["price"]

    if item["category"] == "food":
        inventory.add_consumable(item["name"])
        return True, f"Bought {item['name']}! Use it from your inventory."

    elif item["category"] == "toy":
        toy_type = item["toy_type"]
        if toy_type == "ball":
            inventory.add_permanent("ball")
            inventory.add_ball_uses(BALL_PLAY_USES)
            return True, f"Bought a Ball! +{BALL_PLAY_USES} boosted plays."
        elif toy_type == "hat":
            if inventory.has_permanent("hat"):
                pet.coins += item["price"]  # refund
                return False, "You already have a hat!"
            inventory.add_permanent("hat")
            return True, "Bought a Hat! Your pet looks stylish!"

    elif item["category"] == "medicine":
        inventory.add_consumable(item["name"])
        return True, f"Bought {item['name']}! Use it from your inventory."

    return False, "Unknown item."
