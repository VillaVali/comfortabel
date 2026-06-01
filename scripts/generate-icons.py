#!/usr/bin/env python3
"""Generate PWA icons for MijnComfortabel."""
from PIL import Image, ImageDraw, ImageFont
import os

OUTPUT_DIR = "/home/ubuntu/mijncomfortabel/client/public/icons"
os.makedirs(OUTPUT_DIR, exist_ok=True)

# Brand colors
BG_COLOR = (26, 39, 68)       # #1a2744 — dark navy
ACCENT_COLOR = (196, 155, 82) # #c49b52 — gold

def create_icon(size: int) -> Image.Image:
    img = Image.new("RGBA", (size, size), BG_COLOR + (255,))
    draw = ImageDraw.Draw(img)

    # Rounded rect background (simulate with circle corners)
    radius = size // 6
    draw.rounded_rectangle([0, 0, size - 1, size - 1], radius=radius, fill=BG_COLOR)

    # Draw a simple house icon in gold
    cx = size // 2
    # Roof triangle
    roof_top = int(size * 0.18)
    roof_left = int(size * 0.15)
    roof_right = int(size * 0.85)
    roof_mid = int(size * 0.45)
    draw.polygon(
        [(cx, roof_top), (roof_right, roof_mid), (roof_left, roof_mid)],
        fill=ACCENT_COLOR,
    )
    # House body
    body_top = int(size * 0.44)
    body_bottom = int(size * 0.80)
    body_left = int(size * 0.20)
    body_right = int(size * 0.80)
    draw.rectangle([body_left, body_top, body_right, body_bottom], fill=ACCENT_COLOR)
    # Door
    door_w = int(size * 0.18)
    door_h = int(size * 0.22)
    door_left = cx - door_w // 2
    door_top = body_bottom - door_h
    draw.rectangle(
        [door_left, door_top, door_left + door_w, body_bottom],
        fill=BG_COLOR,
    )
    # Windows (two small squares)
    win_size = int(size * 0.12)
    win_y = int(size * 0.50)
    draw.rectangle(
        [body_left + int(size * 0.06), win_y, body_left + int(size * 0.06) + win_size, win_y + win_size],
        fill=BG_COLOR,
    )
    draw.rectangle(
        [body_right - int(size * 0.06) - win_size, win_y, body_right - int(size * 0.06), win_y + win_size],
        fill=BG_COLOR,
    )
    # "MC" text below house
    text = "MC"
    font_size = max(int(size * 0.12), 8)
    try:
        font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", font_size)
    except Exception:
        font = ImageFont.load_default()
    bbox = draw.textbbox((0, 0), text, font=font)
    tw = bbox[2] - bbox[0]
    tx = cx - tw // 2
    ty = int(size * 0.82)
    draw.text((tx, ty), text, fill=ACCENT_COLOR, font=font)

    return img

for size in [192, 512]:
    icon = create_icon(size)
    path = os.path.join(OUTPUT_DIR, f"icon-{size}.png")
    icon.save(path, "PNG")
    print(f"Generated {path}")

# Also generate apple-touch-icon (180x180)
apple = create_icon(180)
apple_path = "/home/ubuntu/mijncomfortabel/client/public/apple-touch-icon.png"
apple.save(apple_path, "PNG")
print(f"Generated {apple_path}")

print("Done!")
