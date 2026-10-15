#!/usr/bin/env python3
"""Cut the Kaleidoscope out of its white background, in both its poses.

    python3 cutout.py FIGURE.jpg OUT_DIR [HALFWAY.jpg LOWERED.jpg LOWERED_CLOSED.jpg]

All of the cutting is `cut()` in scripts/cutout-figures.py, where the
Kaleidoscope is opted in to five fixes: PALE_FELT keeps the scope's cream
band, ENCLOSED takes out the backdrop its arm curls round, FELT_BLUR keeps
the teal's colour from bleeding into a halo, FLOOR_GLARE takes the floor
from between its feet, and DEFRINGE colours its fuzzy edge like the felt.
It is not in the app yet, so the tile is cropped here, the way that script
crops a set of one: a 640 box, the feet at 95% of its height.

With the scope at its eye only one eye shows, so to blink it lowers the
scope. LOWERED is a generated edit of FIGURE with the scope held low
(art/prompts/figure-kaleidoscope-lowered.md). Only where the arms and the
scope moved is taken from it, so the rest of the felt is the photo's own and
nothing else changes when the poses swap: that is kaleidoscope-lowered.webp,
cut and cropped exactly like the first tile, from the same box. HALFWAY, the
in-between (art/prompts/figure-kaleidoscope-halfway.md, made from FIGURE and
the lowered photo), gives kaleidoscope-halfway.webp the same way. The
closed-eye edit of the lowered photo
(art/prompts/figure-kaleidoscope-lowered-blink.md) gives blink.png, the
overlay for the lowered pose.
"""
import importlib.util
import sys
from pathlib import Path

from PIL import Image, ImageChops, ImageFilter

ROOT = Path(__file__).resolve().parents[3]


def load(name, path):
    spec = importlib.util.spec_from_file_location(name, path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


cutout = load('cutout_figures', ROOT / 'scripts' / 'cutout-figures.py')
blink = load('blink_overlay', ROOT / 'scripts' / 'blink-overlay.py')

POSE_ZONE = (410, 360, 740, 720)  # photo px where the arms and the scope move, above the floor
POSE_CHANGED = 30  # of 255 after a blur: the felt re-rendered under the arms stays below
POSE_GROW = (31, 15)  # px: grown over the felt the threshold misses, then holes closed
POSE_FEATHER = 6
EYES = [(467, 444, 524, 478), (549, 437, 582, 473)]  # in the lowered pose, photo px
BLINK_CROP = (200, 113, 182, 74)  # where blink.png sits in the tile (gen-scene.py BLINK_XY)


def region_of(img):
    left, top, right, bottom = img.getchannel('A').point(lambda a: 255 if a > 40 else 0).getbbox()
    side = max(right - left, bottom - top) * cutout.PADDING
    cx = (left + right) / 2
    return (
        round(cx - side / 2),
        round(bottom - side * cutout.GROUND),
        round(cx + side / 2),
        round(bottom - side * cutout.GROUND + side),
    )


def figure_tile(path: Path, region=None):
    """The tile, from `region` of the photo if given, else from its own box."""
    img = cutout.cut(path)
    return img.crop(region or region_of(img)).resize((cutout.SIZE, cutout.SIZE), cutout.Image.LANCZOS)


def posed_photo(photo, posed, name):
    """The photo with the arms and the scope where the edit moved them."""
    posed, shift = blink.aligned(photo, posed, (360, 420, 470, 780))
    diff = ImageChops.difference(photo, posed).convert('L').filter(ImageFilter.GaussianBlur(3))
    zone = Image.new('L', photo.size, 0)
    zone.paste(255, POSE_ZONE)
    mask = ImageChops.multiply(diff.point(lambda v: 255 if v > POSE_CHANGED else 0), zone)
    mask = (mask.filter(ImageFilter.MaxFilter(POSE_GROW[0])).filter(ImageFilter.MaxFilter(POSE_GROW[1]))
            .filter(ImageFilter.MinFilter(POSE_GROW[1])).filter(ImageFilter.GaussianBlur(POSE_FEATHER)))
    if shift != (0, 0):
        print(f'{name} pose: the edit was {-shift[0]}, {-shift[1]} px off; moved back')
    return Image.composite(posed, photo, mask)


def main() -> None:
    figure, out_dir = Path(sys.argv[1]), Path(sys.argv[2])
    out_dir.mkdir(parents=True, exist_ok=True)
    photo = Image.open(figure).convert('RGB')
    region = region_of(cutout.cut(figure))
    figure_tile(figure, region).save(out_dir / 'kaleidoscope.webp', 'WEBP', quality=90, method=6)
    if len(sys.argv) < 6:
        return

    halfway, lowered, lowered_closed = (Image.open(a).convert('RGB') for a in sys.argv[3:6])
    half = posed_photo(photo, halfway, 'halfway')
    down = posed_photo(photo, lowered, 'lowered')
    closed = blink.closed_eyes(down, lowered_closed, EYES)
    half_tile, down_tile, closed_tile = blink.tiles(lambda path: figure_tile(path, region), figure.stem,
                                                    half, down, closed)
    half_tile.save(out_dir / 'kaleidoscope-halfway.webp', 'WEBP', quality=90, method=6)
    down_tile.save(out_dir / 'kaleidoscope-lowered.webp', 'WEBP', quality=90, method=6)
    image, bounds = blink.overlay(down_tile, closed_tile, BLINK_CROP)
    image.save(out_dir / 'blink.png')
    print(f'blink.png at {BLINK_CROP[:2]} in the tile; the edit changed {bounds}')


if __name__ == '__main__':
    main()
