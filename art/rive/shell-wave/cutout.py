#!/usr/bin/env python3
"""Cut Shell and its felt wave out of their white backgrounds.

    python3 cutout.py FIGURE.jpg WAVE.jpg OUT_DIR

Shell's cut is `cut()` in scripts/cutout-figures.py, where it is opted in to
PALE_FELT (the cream shell is as pale as the backdrop), FLOOR_GLARE (the
floor between its feet has picked up the plum) and DEFRINGE. It is not in the
app yet, so the tile is cropped here, the way that script crops a set of one:
a 640 box, the feet at 95% of its height.

The wave is separated on chroma, like the other props: the backdrop stays
within ~3 levels of grey, the felt is 12 or more. The flood fill from the
border is also seeded inside the hollow under the curling lip, which it can
reach only through a gap a pixel or two wide. A little floor shadow at the
foot of the front face is pale and grey, and fades out; what is left of it
is not joined to the wave, and only the wave's own piece is kept. It is trimmed
to its bounds and scaled to WAVE_HEIGHT in Shell's tile pixels, so the scene
places it 1:1.
"""
import importlib.util
import sys
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parents[3]
spec = importlib.util.spec_from_file_location('cutout_figures', ROOT / 'scripts' / 'cutout-figures.py')
cutout = importlib.util.module_from_spec(spec)
spec.loader.exec_module(cutout)

MAX_BACKDROP_CHROMA = 8  # of 255, after a small blur: the felt is 12+
HOLLOW = (2, 240)  # seeds: chroma at most, luma at least, over a 5 px patch
FLOOR_BAND = 0.12  # of the wave's height, at the bottom: where the floor shadow sits
GLARE_CHROMA = (10, 20)  # in that band, pixels this grey ...
GLARE_LUMA = (150, 200)  # ... and this pale fade out
WAVE_HEIGHT = 460  # tile px: three quarters of Shell's height
MARGIN = 6


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
    return img.crop(region).resize((cutout.SIZE, cutout.SIZE), cutout.Image.LANCZOS)


def largest_piece(alpha: Image.Image) -> Image.Image:
    """255 over the connected piece of the mask that holds the most pixels, and
    a couple of px round it (its soft edge)."""
    solid = alpha.point(lambda a: 255 if a > 40 else 0)
    pieces = solid.copy()
    px = pieces.load()
    best, best_size = None, 0
    for y in range(0, pieces.height, 8):
        for x in range(0, pieces.width, 8):
            if px[x, y] == 255:
                before = pieces.histogram()[254]
                ImageDraw.floodfill(pieces, (x, y), 254)
                size = pieces.histogram()[254] - before
                if size > best_size:
                    best, best_size = (x, y), size
    piece = solid.copy()
    ImageDraw.floodfill(piece, best, 128)
    return piece.point(lambda v: 255 if v == 128 else 0).filter(ImageFilter.MaxFilter(5))


def wave(path: Path) -> Image.Image:
    rgb = Image.open(path).convert('RGB')
    chroma = cutout.chroma_of(rgb, 1)
    backdrop = chroma.point(lambda c: 255 if c < MAX_BACKDROP_CHROMA else 0)
    seeds = cutout.pure_backdrop(rgb, chroma, *HOLLOW)
    alpha = ImageChops.invert(cutout.flood_from_border(backdrop, seeds))
    alpha = alpha.filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(1.1))
    left, top, right, bottom = alpha.point(lambda a: 255 if a > 40 else 0).getbbox()
    grey = chroma.point(cutout.ramp(*GLARE_CHROMA, falling=True))
    pale = rgb.convert('L').filter(ImageFilter.GaussianBlur(1)).point(cutout.ramp(*GLARE_LUMA))
    keep = ImageChops.invert(ImageChops.multiply(grey, pale))
    ImageDraw.Draw(keep).rectangle((0, 0, keep.width, round(bottom - (bottom - top) * FLOOR_BAND)), fill=255)
    alpha = ImageChops.multiply(alpha, keep)
    alpha = ImageChops.multiply(alpha, largest_piece(alpha))
    left, top, right, bottom = alpha.point(lambda a: 255 if a > 40 else 0).getbbox()
    rgba = cutout.defringed(rgb, alpha)
    rgba.putalpha(alpha)
    scale = WAVE_HEIGHT / (bottom - top)
    m = MARGIN / scale
    rgba = rgba.crop((round(left - m), round(top - m), round(right + m), round(bottom + m)))
    return rgba.resize((round(rgba.width * scale), round(rgba.height * scale)), Image.LANCZOS)


def main() -> None:
    figure, wave_photo, out_dir = Path(sys.argv[1]), Path(sys.argv[2]), Path(sys.argv[3])
    out_dir.mkdir(parents=True, exist_ok=True)
    figure_tile(figure).save(out_dir / 'shell.webp', 'WEBP', quality=90, method=6)
    img = wave(wave_photo)
    img.save(out_dir / 'wave.webp', 'WEBP', quality=90, method=6)
    print(out_dir / 'wave.webp', img.size)


if __name__ == '__main__':
    main()
