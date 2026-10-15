#!/usr/bin/env python3
"""Cut Self-hug out of its white background.

    python3 cutout.py FIGURE.jpg OUT_DIR

The cut is `cut()` in scripts/cutout-figures.py, where Self-hug is opted in
to PALE_FELT: its lit left side is as pale and smooth as the backdrop, and
only its colour keeps it. The tile is cropped here, as that script crops a
set of one: a 640 box, the feet at 95% of its height.

Round the feet the photo's floor has picked up the felt's warmth, so it
passes as figure: a pale rim beside each foot and a dark line under the
soles. Below the legs, alpha fades out wherever a pixel loses the felt's
warm colour difference, as for the Defender.
"""
import importlib.util
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
spec = importlib.util.spec_from_file_location('cutout_figures', ROOT / 'scripts' / 'cutout-figures.py')
cutout = importlib.util.module_from_spec(spec)
spec.loader.exec_module(cutout)

FEET_FROM = 560  # tile row below which the floor round the feet is cleaned
WARMTH = (0.13, 0.19)  # (r - (g + b) / 2) / 255: the felt is 0.25+, the floor rim below 0.12


def figure_tile(path: Path):
    img = cutout.cut(path)
    left, top, right, bottom = img.getchannel('A').point(lambda a: 255 if a > 40 else 0).getbbox()
    side = max(right - left, bottom - top) * cutout.PADDING
    cx = (left + right) / 2
    region = (
        round(cx - side / 2),
        round(bottom - side * cutout.GROUND),
        round(cx + side / 2),
        round(bottom - side * cutout.GROUND + side),
    )
    tile = img.crop(region).resize((cutout.SIZE, cutout.SIZE), cutout.Image.LANCZOS)
    px = tile.load()
    low, high = WARMTH
    for y in range(FEET_FROM, cutout.SIZE):
        for x in range(cutout.SIZE):
            r, g, b, a = px[x, y]
            if a:
                warmth = (r - (g + b) / 2) / 255
                keep = max(0.0, min(1.0, (warmth - low) / (high - low)))
                px[x, y] = (r, g, b, round(a * keep))
    return tile


def main() -> None:
    figure, out_dir = Path(sys.argv[1]), Path(sys.argv[2])
    out_dir.mkdir(parents=True, exist_ok=True)
    figure_tile(figure).save(out_dir / 'selfhug.webp', 'WEBP', quality=90, method=6)


if __name__ == '__main__':
    main()
