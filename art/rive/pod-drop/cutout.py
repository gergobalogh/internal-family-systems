#!/usr/bin/env python3
"""Cut the Pod out of its white background.

    python3 cutout.py FIGURE.jpg OUT_DIR

The figure test in scripts/cutout-figures.py (low saturation, low texture)
eats the Pod's padding: pale cream felt, as bright and smooth at its lit edge
as the backdrop. What tells them apart is chroma. The backdrop stays within
~3 levels of neutral grey, and even the cream's fuzzy halo is 15 or more. The
grey felt inside (the face, the hands) is enclosed by the cream, so the flood
fill from the border never reaches it.

The grey feet stand on the floor's contact shadow, which is as grey as they
are. There texture tells them apart: the shadow is smooth, the felt is not.

The tile is cropped the way that script crops a set of one: a 640 box, feet at
95% of its height.
"""
import importlib.util
import sys
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parents[3]
spec = importlib.util.spec_from_file_location('cutout_figures', ROOT / 'scripts' / 'cutout-figures.py')
cutout = importlib.util.module_from_spec(spec)
spec.loader.exec_module(cutout)

MAX_BACKDROP_CHROMA = 6  # of 255, after a small blur: the cream's halo is 15+
MIN_BACKDROP_VALUE = 200
SHADOW_CHROMA = 16  # the floor shadow picks up a little of the cream's warmth
SHADOW_VALUE = 120
SMOOTH = 3  # local detail: the backdrop and its shadow ~1, felt 4+
CREAM_CHROMA = 18  # what counts as the padding when finding where the feet start
RIM_ABOVE = 40  # source px: the padding's shaded underside is greyer than its sides
RIM_CHROMA = (8, 16)  # near the feet, pixels this grey ...
RIM_LUMA = (165, 205)  # ... and this pale fade out


def below(image, limit):
    return image.point(lambda v: 255 if v < limit else 0)


def above(image, limit):
    return image.point(lambda v: 255 if v > limit else 0)


def cut(path: Path) -> Image.Image:
    rgb = Image.open(path).convert('RGB')
    chroma = cutout.chroma_of(rgb)
    value = rgb.convert('L').filter(ImageFilter.GaussianBlur(1))
    gray = rgb.convert('L')
    texture = ImageChops.difference(gray, gray.filter(ImageFilter.GaussianBlur(1.5)))
    texture = texture.filter(ImageFilter.GaussianBlur(3))

    backdrop = ImageChops.multiply(below(chroma, MAX_BACKDROP_CHROMA), above(value, MIN_BACKDROP_VALUE))
    background = cutout.flood_from_border(backdrop)
    # The contact shadow, round and between the feet: smooth, nearly grey, and
    # below the padding. Seed it from the floor under the figure.
    left, top, right, bottom = ImageChops.invert(background).getbbox()
    shadow = ImageChops.multiply(
        ImageChops.multiply(below(chroma, SHADOW_CHROMA), above(value, SHADOW_VALUE)),
        below(texture, SMOOTH),
    )
    candidates = ImageChops.lighter(background, shadow)
    feet = [(x, y) for y in range(round(bottom - (bottom - top) * 0.1), bottom, 2)
            for x in range(left, right, 2)]
    background = cutout.flood_from_border(candidates, feet)
    alpha = ImageChops.invert(background)
    alpha = alpha.filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(1.1))
    # The floor leaves a pale rim round the grey feet, invisible on white and
    # plain on the meadow. Round the feet the felt is either mid grey or the
    # cream, which keeps its colour, so fade out whatever is pale and grey.
    padding_bottom = chroma.point(lambda c: 255 if c >= CREAM_CHROMA else 0).getbbox()[3]
    grey = chroma.point(cutout.ramp(*RIM_CHROMA, falling=True))
    pale = value.point(cutout.ramp(*RIM_LUMA))
    keep = ImageChops.invert(ImageChops.multiply(grey, pale))
    ImageDraw.Draw(keep).rectangle((0, 0, keep.width, padding_bottom - RIM_ABOVE), fill=255)
    alpha = ImageChops.multiply(alpha, keep)
    rgba = rgb.copy()
    rgba.putalpha(alpha)
    return rgba


def figure_tile(path: Path) -> Image.Image:
    img = cut(path)
    left, top, right, bottom = img.getchannel('A').point(lambda a: 255 if a > 40 else 0).getbbox()
    side = max(right - left, bottom - top) * cutout.PADDING
    cx = (left + right) / 2
    region = (
        round(cx - side / 2),
        round(bottom - side * cutout.GROUND),
        round(cx + side / 2),
        round(bottom - side * cutout.GROUND + side),
    )
    return img.crop(region).resize((cutout.SIZE, cutout.SIZE), Image.LANCZOS)


def main() -> None:
    figure, out_dir = Path(sys.argv[1]), Path(sys.argv[2])
    out_dir.mkdir(parents=True, exist_ok=True)
    figure_tile(figure).save(out_dir / 'pod.webp', 'WEBP', quality=90, method=6)


if __name__ == '__main__':
    main()
