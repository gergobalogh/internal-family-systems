#!/usr/bin/env python3
"""Lays the rendered frames out as one captioned sheet per option (sheet-A.jpg …).

    python3 docs/redesign/storyboard/sheets.py
"""
import json
import re
import subprocess
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

HERE = Path(__file__).parent
FRAME_W, FRAME_H = 300, 649  # 390×844 scaled
COLS, GAP, CAP_H = 5, 18, 70
BG, INK, SOFT = (34, 31, 38), (245, 240, 232), (190, 182, 196)


def frames():
    """Reads id and caption for every frame straight from frames.js."""
    js = (HERE / 'frames.js').read_text()
    out = subprocess.run(
        ['node', '-e', f'{js}; console.log(JSON.stringify(FRAMES.map(f => [f.id, f.caption])))'],
        capture_output=True, text=True, check=True,
    ).stdout
    return json.loads(out)


def font(size, bold=False):
    for name in (['DejaVuSans-Bold.ttf'] if bold else ['DejaVuSans.ttf']):
        for base in ('/usr/share/fonts/truetype/dejavu/',):
            p = Path(base) / name
            if p.exists():
                return ImageFont.truetype(str(p), size)
    return ImageFont.load_default()


def wrap(draw, text, f, width):
    words, lines, line = text.split(), [], ''
    for w in words:
        trial = f'{line} {w}'.strip()
        if draw.textlength(trial, font=f) > width and line:
            lines.append(line)
            line = w
        else:
            line = trial
    return lines + [line] if line else lines


def sheet(option, items, title):
    rows = (len(items) + COLS - 1) // COLS
    W = COLS * FRAME_W + (COLS + 1) * GAP
    H = 60 + rows * (FRAME_H + CAP_H + GAP) + GAP
    img = Image.new('RGB', (W, H), BG)
    d = ImageDraw.Draw(img)
    d.text((GAP, 18), title, fill=INK, font=font(24, True))
    for i, (fid, caption) in enumerate(items):
        x = GAP + (i % COLS) * (FRAME_W + GAP)
        y = 60 + (i // COLS) * (FRAME_H + CAP_H + GAP)
        img.paste(Image.open(HERE / 'frames' / f'{fid}.jpg').convert('RGB').resize((FRAME_W, FRAME_H), Image.LANCZOS), (x, y))
        head, _, rest = caption.partition('\n')
        d.text((x, y + FRAME_H + 6), f'{fid}  {head}', fill=INK, font=font(14, True))
        for j, line in enumerate(wrap(d, rest, font(12), FRAME_W)[:3]):
            d.text((x, y + FRAME_H + 26 + j * 15), line, fill=SOFT, font=font(12))
    img.save(HERE / f'sheet-{option}.jpg', quality=85)
    print(f'sheet-{option}.jpg', img.size)


TITLES = {
    'A': 'Option A: one walk, three acts, one keepsake (recommended)',
    'B': 'Option B: the meadow is home (you pick the chapter)',
    'C': "Option C: today's app, plus a real ending",
}
all_frames = frames()
for option, title in TITLES.items():
    sheet(option, [f for f in all_frames if re.match(option, f[0])], title)
