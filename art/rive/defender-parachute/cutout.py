#!/usr/bin/env python3
"""Cut the Defender and the felt canopy out of their white backgrounds.

    python3 cutout.py FIGURE.jpg CANOPY.jpg OUT_DIR

Both use `cut()` from scripts/cutout-figures.py, the same flood fill the app's
figures went through. The figure is cropped the way that script crops a set
of one: a 640 box, feet at 95% of its height. The canopy is only trimmed to
its own bounds plus a small margin; it has no ground line to share.

The canopy needs its own background test. Its lit side is pale cream and pale
sage, as bright and as smooth as the backdrop, and the figure test (low
saturation, low texture) eats it. What tells them apart is chroma: the
backdrop stays within ~4 levels of neutral grey, the palest felt is 14 or more.
"""
import importlib.util
import sys
from pathlib import Path

from PIL import ImageChops, ImageFilter

ROOT = Path(__file__).resolve().parents[3]
spec = importlib.util.spec_from_file_location('cutout_figures', ROOT / 'scripts' / 'cutout-figures.py')
cutout = importlib.util.module_from_spec(spec)
spec.loader.exec_module(cutout)

CANOPY_MARGIN = 8
FEET_FROM = 540  # tile row below which the floor rim around the soles is cleaned
MAX_BACKDROP_CHROMA = 6  # of 255, after a small blur
MIN_BACKDROP_VALUE = 220


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
    # The photo's floor leaves a pale rim round the soles, invisible on white
    # and plain on the meadow. Below the legs, fade alpha where a pixel loses
    # the felt's warm-red colour difference; dark shaded felt keeps it.
    px = tile.load()
    for y in range(FEET_FROM, cutout.SIZE):
        for x in range(cutout.SIZE):
            r, g, b, a = px[x, y]
            if a:
                warmth = (r - (g + b) / 2) / 255
                keep = max(0.0, min(1.0, (warmth - 0.09) / 0.07))
                px[x, y] = (r, g, b, round(a * keep))
    return tile


def cut_canopy(path: Path):
    rgb = cutout.Image.open(path).convert('RGB')
    r, g, b = rgb.split()
    chroma = ImageChops.subtract(ImageChops.lighter(ImageChops.lighter(r, g), b), ImageChops.darker(ImageChops.darker(r, g), b))
    chroma = chroma.filter(ImageFilter.GaussianBlur(2))
    value = rgb.convert('L').filter(ImageFilter.GaussianBlur(1))
    backdrop = ImageChops.multiply(
        chroma.point(lambda c: 255 if c < MAX_BACKDROP_CHROMA else 0),
        value.point(lambda v: 255 if v > MIN_BACKDROP_VALUE else 0),
    )
    alpha = ImageChops.invert(cutout.flood_from_border(backdrop))
    alpha = alpha.filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(1.1))
    rgba = rgb.copy()
    rgba.putalpha(alpha)
    return rgba


def canopy(path: Path):
    img = cut_canopy(path)
    left, top, right, bottom = img.getchannel('A').point(lambda a: 255 if a > 8 else 0).getbbox()
    m = CANOPY_MARGIN
    return img.crop((left - m, top - m, right + m, bottom + m))


def main() -> None:
    figure, canopy_path, out_dir = Path(sys.argv[1]), Path(sys.argv[2]), Path(sys.argv[3])
    out_dir.mkdir(parents=True, exist_ok=True)
    figure_tile(figure).save(out_dir / 'defender.webp', 'WEBP', quality=90, method=6)
    canopy(canopy_path).save(out_dir / 'canopy.webp', 'WEBP', quality=90, method=6)


if __name__ == '__main__':
    main()
