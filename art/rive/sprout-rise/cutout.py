#!/usr/bin/env python3
"""Cut the felt soil mound out of its white background.

    python3 cutout.py MOUND.jpg OUT_DIR

The brown felt is far from neutral (chroma 45 or more, after a small blur)
and the backdrop within 3 levels of grey, so a flood fill from the border
over everything near grey takes the backdrop. The dark contact line the photo
has under the mound is near grey too (about 8), so it goes with it. The
mound is trimmed to its bounds and scaled to its width in the Sprout's tile
pixels, so the scene places it 1:1. It is mirrored, which puts its high
point to the right of its middle, under the Sprout's stem: the leaves come
up through the top of the mound, not over a shoulder.
"""
import importlib.util
import sys
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parents[3]
spec = importlib.util.spec_from_file_location('cutout_figures', ROOT / 'scripts' / 'cutout-figures.py')
cutout = importlib.util.module_from_spec(spec)
spec.loader.exec_module(cutout)

MAX_BACKDROP_CHROMA = 14  # of 255, after a small blur
FLOOR_BAND = 0.15  # of the mound's height, at the bottom: where floor glare sits
GLARE_CHROMA = (18, 30)  # in that band, pixels this grey ...
GLARE_LUMA = (120, 160)  # ... and this pale fade out
WIDTH = 440  # the mound's width in the scene, in tile px: wider than the Sprout
MARGIN = 6


def mound(path: Path) -> Image.Image:
    rgb = Image.open(path).convert('RGB')
    backdrop = cutout.chroma_of(rgb).point(lambda c: 255 if c < MAX_BACKDROP_CHROMA else 0)
    alpha = ImageChops.invert(cutout.flood_from_border(backdrop))
    alpha = alpha.filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(1.1))
    left, top, right, bottom = alpha.point(lambda a: 255 if a > 8 else 0).getbbox()
    # A little floor glare touches the base and passes for felt. Its chroma is
    # as low as the shaded felt right at the base, but it is pale and the
    # shaded felt is dark. Fibre highlights higher up stay.
    def ramp(edges, flip=False):
        low, high = edges
        return lambda v: round(255 * max(0.0, min(1.0, ((high - v) if flip else (v - low)) / (high - low))))
    grey = cutout.chroma_of(rgb).point(ramp(GLARE_CHROMA, flip=True))
    pale = rgb.convert('L').filter(ImageFilter.GaussianBlur(1)).point(ramp(GLARE_LUMA))
    keep = ImageChops.invert(ImageChops.multiply(grey, pale))
    ImageDraw.Draw(keep).rectangle((0, 0, keep.width, round(bottom - (bottom - top) * FLOOR_BAND)), fill=255)
    alpha = ImageChops.multiply(alpha, keep)
    rgba = rgb.copy()
    rgba.putalpha(alpha)
    scale = WIDTH / (right - left)
    m = MARGIN / scale
    rgba = rgba.crop((round(left - m), round(top - m), round(right + m), round(bottom + m)))
    rgba = rgba.resize((round(rgba.width * scale), round(rgba.height * scale)), Image.LANCZOS)
    return rgba.transpose(Image.Transpose.FLIP_LEFT_RIGHT)


def main() -> None:
    path, out_dir = Path(sys.argv[1]), Path(sys.argv[2])
    out_dir.mkdir(parents=True, exist_ok=True)
    img = mound(path)
    img.save(out_dir / 'mound.webp', 'WEBP', quality=90, method=6)
    print(out_dir / 'mound.webp', img.size)


if __name__ == '__main__':
    main()
