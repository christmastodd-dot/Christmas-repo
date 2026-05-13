"""Render the Little Chef home-screen icon at every size we need.

Run from the repo root: python3 scripts/generate_icons.py
Outputs: apple-touch-icon.png, icon-192.png, icon-512.png, favicon-32.png
"""
from PIL import Image, ImageDraw

ACCENT = (231, 111, 81)  # matches --accent in index.html (#e76f51)
WHITE = (255, 255, 255)
MASTER = 1024


def render(size: int) -> Image.Image:
    img = Image.new("RGBA", (size, size), ACCENT)
    draw = ImageDraw.Draw(img)
    s = size / MASTER

    def sx(v: float) -> int:
        return round(v * s)

    # Chef hat band at the bottom
    draw.rounded_rectangle(
        [sx(282), sx(620), sx(742), sx(760)],
        radius=sx(30),
        fill=WHITE,
    )

    # Three overlapping puffs forming the top of the hat
    draw.ellipse([sx(220), sx(360), sx(560), sx(700)], fill=WHITE)   # left puff
    draw.ellipse([sx(464), sx(360), sx(804), sx(700)], fill=WHITE)   # right puff
    draw.ellipse([sx(322), sx(180), sx(702), sx(580)], fill=WHITE)   # top puff

    # Two little stitches on the band for personality
    stitch_y = sx(690)
    for cx in (sx(420), sx(604)):
        draw.ellipse(
            [cx - sx(12), stitch_y - sx(12), cx + sx(12), stitch_y + sx(12)],
            fill=ACCENT,
        )

    return img


def main() -> None:
    master = render(MASTER)
    targets = {
        "apple-touch-icon.png": 180,
        "icon-192.png": 192,
        "icon-512.png": 512,
        "favicon-32.png": 32,
    }
    for filename, size in targets.items():
        master.resize((size, size), Image.LANCZOS).save(filename, optimize=True)
        print(f"wrote {filename} ({size}x{size})")


if __name__ == "__main__":
    main()
