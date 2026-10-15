#!/usr/bin/env python3
"""Cut a closed-eye overlay for a Rive figure out of a generated edit.

    python3 scripts/blink-overlay.py [--from BOX] CUTOUT_PY PHOTO CLOSED OUT.png CROP EYE [EYE...]

PHOTO is the figure's generated photo and CLOSED the closed-eye edit of it
(art/prompts/figure-*-blink.md). Each EYE is a box round one eye in photo px,
`x0,y0,x1,y1`, big enough to hold the closed-eye seam too. CROP is where the
overlay sits in the 640 figure tile, `x,y,w,h`; the scene's BLINK_XY is its
x and y.

With `--from x0,y0,x1,y1`, CLOSED is an edit of only that box of PHOTO, at
any size: AI Studio declined Self-hug's whole figure with its eyes shut, but
not a close-up of its face.

Only what the edit changed inside the eye boxes is taken from it, with a
feathered edge, so the redrawn mouth or a drift in the felt elsewhere never
shows. That goes into a copy of PHOTO, which is cut and cropped by the
scene's own `figure_tile()` from CUTOUT_PY: the eyes are inside the figure,
so the cut and the crop come out exactly as for the figure itself, and the
overlay lines up with it pixel for pixel.

The functions are shared with cutouts that build more than one pose, like
art/rive/kaleidoscope-backwards/cutout.py.
"""
import importlib.util
import sys
import tempfile
from pathlib import Path

from PIL import Image, ImageChops, ImageFilter, ImageStat

CHANGED = 18  # of 255, after a small blur: re-rendered felt alone stays under ~10
GROW = 7  # photo px the changed area is grown by, to take the bead's halo too
FEATHER = 2.5  # photo px of blur on the mask's edge
TILE_CHANGED = 2  # of 255 in the tile: anything the edit touched
REACH = 8  # photo px an edit may have drifted by


def load_cutout(path: Path):
    spec = importlib.util.spec_from_file_location('scene_cutout', path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def box(text: str):
    return tuple(int(v) for v in text.split(','))


def aligned(photo, edit, region):
    """`edit`, moved by the whole px that best lines `region` of it up with
    the photo. Edits sometimes come back shifted a few px."""
    target = photo.convert('L').crop(region)
    grey = edit.convert('L')
    best = min(
        (ImageStat.Stat(ImageChops.difference(target, ImageChops.offset(grey, dx, dy).crop(region))).mean[0], dx, dy)
        for dx in range(-REACH, REACH + 1)
        for dy in range(-REACH, REACH + 1)
    )
    _, dx, dy = best
    return ImageChops.offset(edit, dx, dy) if (dx, dy) != (0, 0) else edit, (dx, dy)


def eye_mask(photo, closed, eyes):
    diff = ImageChops.difference(photo, closed).convert('L').filter(ImageFilter.GaussianBlur(1.5))
    changed = diff.point(lambda v: 255 if v > CHANGED else 0)
    inside = Image.new('L', photo.size, 0)
    for eye in eyes:
        inside.paste(255, eye)
    mask = ImageChops.multiply(changed, inside)
    mask = mask.filter(ImageFilter.MaxFilter(2 * GROW + 1))
    # Never let the grown edge leave the eye boxes: the mouth may sit close.
    return ImageChops.multiply(mask, inside).filter(ImageFilter.GaussianBlur(FEATHER))


def tiles(figure_tile, name, *photos):
    """Each photo through `figure_tile`, saved under the figure's own file
    name first: cut() picks the figure's fixes by it."""
    out = []
    with tempfile.TemporaryDirectory() as tmp:
        path = Path(tmp) / f'{name}.png'
        for photo in photos:
            photo.save(path)
            out.append(figure_tile(path).convert('RGBA'))
    return out


def overlay(open_tile, closed_tile, crop):
    """What changed between two tiles, cropped to `crop`, with a soft edge."""
    x, y, w, h = crop
    diff = ImageChops.difference(closed_tile.convert('RGB'), open_tile.convert('RGB')).convert('L')
    touched = diff.point(lambda v: 255 if v > TILE_CHANGED else 0)
    bounds = touched.getbbox()
    if not bounds:
        raise SystemExit('the edit changed nothing inside the eye boxes')
    if bounds[0] < x or bounds[1] < y or bounds[2] > x + w or bounds[3] > y + h:
        raise SystemExit(f'changed area {bounds} is not inside the crop {(x, y, x + w, y + h)}')
    alpha = touched.filter(ImageFilter.MaxFilter(3)).filter(ImageFilter.GaussianBlur(1))
    alpha = ImageChops.multiply(alpha, closed_tile.getchannel('A'))
    out = closed_tile.copy()
    out.putalpha(alpha)
    return out.crop((x, y, x + w, y + h)), bounds


def closed_eyes(photo, closed, eyes):
    """The photo with the eyes of its closed-eye edit."""
    if closed.size != photo.size:
        raise SystemExit(f'the closed-eye edit is {closed.size}, the photo {photo.size}')
    around = (min(e[0] for e in eyes) - 60, min(e[1] for e in eyes) - 60,
              max(e[2] for e in eyes) + 60, max(e[3] for e in eyes) + 60)
    closed, shift = aligned(photo, closed, around)
    if shift != (0, 0):
        print(f'the closed-eye edit was {-shift[0]}, {-shift[1]} px off; moved back')
    return Image.composite(closed, photo, eye_mask(photo, closed, eyes))


def uncropped(photo, closed, region):
    """The photo with `closed`, an edit of `region` of it, scaled back in."""
    x0, y0, x1, y1 = region
    out = photo.copy()
    out.paste(closed.resize((x1 - x0, y1 - y0), Image.LANCZOS), (x0, y0))
    return out


def main() -> None:
    args = sys.argv[1:]
    region = None
    if args[0] == '--from':
        region = box(args[1])
        args = args[2:]
    cutout_py, photo_path, closed_path, out = (Path(a) for a in args[:4])
    crop = box(args[4])
    eyes = [box(a) for a in args[5:]]
    cutout = load_cutout(cutout_py)

    photo = Image.open(photo_path).convert('RGB')
    closed = Image.open(closed_path).convert('RGB')
    if region:
        closed = uncropped(photo, closed, region)
    blinked = closed_eyes(photo, closed, eyes)
    open_tile, closed_tile = tiles(cutout.figure_tile, photo_path.stem, photo, blinked)
    image, bounds = overlay(open_tile, closed_tile, crop)
    image.save(out)
    x, y, w, h = crop
    print(f'{out}: {w}x{h} at ({x}, {y}) in the tile; the edit changed {bounds}')


if __name__ == '__main__':
    main()
