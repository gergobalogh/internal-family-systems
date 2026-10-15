#!/usr/bin/env python3
"""Cut generated figures out of their plain white backgrounds.

    python3 scripts/cutout-figures.py OUT_DIR art/out/figure-*.jpg

Background and the generated contact shadow are smooth, light and only
faintly tinted; the felt figures are textured even where they are pale.
Flood-filling that smooth region from the image border removes it without
touching details inside a figure (eyes, a cream flower). All figures are
cropped with one shared box size, feet on a common ground line, so their
relative sizes survive.
"""
import re
import sys
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageFilter, ImageMath

MAX_SATURATION = 70  # of 255
MIN_VALUE = 80  # of 255
MAX_TEXTURE = 3  # local detail, of 255: studio backdrop ~1, felt ~4–5
NEAR_WHITE_SATURATION = 22
NEAR_WHITE_VALUE = 226
# Figures whose felt is too pale for the texture test. A glow (the lantern's)
# has colour too, so the colour test is only for these.
PALE_FELT = {'figure-sleeper', 'figure-curled', 'figure-self-hug', 'figure-kaleidoscope', 'figure-stack',
             'figure-doodle', 'figure-shell'}
MIN_FELT_CHROMA = 8  # of 255, blurred: never backdrop above the shadow band
FIGURE_CHROMA = 10  # what counts as the figure when finding that band
SHADOW_BAND = 0.2  # of the figure's height, at the bottom
# Figures with something pale in their bottom fifth too: Doodle sits, and the
# edge of the cream pad on its lap comes that low. There, pixels at least this
# warm (r - b) and this bright (luma) are kept as well: the pad's edge is about
# 20 and 240+. The floor beside Doodle is either darker (its shadow, ~206) or
# bluish (where it picks up the felt). Gaps of a few px (a highlight along the
# pad's edge) are closed.
BAND_FELT = {'figure-doodle': (14, 230)}
BAND_CLOSE = 5  # px
# Of those, figures whose floor leaves a grey rim along the bottom: in the
# band, whatever has no colour of its own fades out. Not for felt that is
# grey where it is shaded (Curled, between its shins).
FLOOR_RIM = {'figure-sleeper'}
RIM_CHROMA = (5, 12)  # in the band, alpha fades out below this chroma
RIM_LIFT = 4  # source px: how far edges facing down are lifted in the band
# Figures whose cut leaves pale floor glare round the feet: between the
# Sprout's legs and under its soles. Its own felt keeps its colour even where
# lit, and where it loses it (shaded soles) it is dark.
# In the shadow band, pixels this grey (chroma) and this pale (luma) fade
# out. The Stack's floor has picked up its olive, and its felt there is dark.
FLOOR_GLARE = {
    'figure-sprout': ((10, 18), (130, 165)),
    'figure-kaleidoscope': ((10, 18), (130, 165)),
    'figure-stack': ((30, 45), (150, 180)),
    'figure-ribbon': ((10, 18), (130, 165)),
    'figure-shell': ((20, 30), (110, 150)),
    'figure-map': ((36, 50), (140, 175)),
    'figure-doodle': ((7, 10), (175, 200)),
}
# Figures sitting on the floor: under Curled's body and feet the floor's
# shadow and the dark crease where they meet it pass as figure, and some of
# its shaded felt is as grey as they are. Felt always shows colour somewhere
# low in each column, though: in the shadow band, everything below the
# lowest clearly coloured pixel of a column fades out.
FLOOR_UNDER = {'figure-curled'}
UNDER_CHROMA = 12  # of 255, blurred: clearly felt, never floor
UNDER_FADE = 3  # source px over which alpha fades out below it
UNDER_REACH = 5  # source px: a column's felt reaches as low as its neighbours'
# Strongly coloured felt bleeds its chroma a few px into the white beside it
# through the usual blur, and the colour tests above keep that as a pale
# halo. For these, they read the chroma blurred this little instead.
FELT_BLUR = {'figure-kaleidoscope': 0.7, 'figure-stack': 0.7}
# Figures whose felt fades into the backdrop over a few px of fuzz, so that
# its edge pixels are mostly backdrop white: a light line on any colour (the
# Kaleidoscope's right side). Their edge takes the colour of the felt just
# inside it instead.
DEFRINGE = {'figure-kaleidoscope', 'figure-stack', 'figure-ribbon', 'figure-shell', 'figure-map', 'figure-doodle'}
DEFRINGE_REACH = 3  # px: how far in the felt's colour is gathered from
# Figures that enclose some backdrop: the Kaleidoscope's arm curls round
# under its scope. The flood fill from the border never reaches it, so it is
# also seeded wherever the backdrop is unmistakable: a patch of pure grey
# white. Only for PALE_FELT figures, whose felt is kept by its colour anyway.
# Doodle's is in shade, between the pad on its lap and its leg, so for it
# shaded grey counts too.
PURE_BACKDROP = (2, 246)  # chroma at most, luma at least
ENCLOSED = {'figure-kaleidoscope': PURE_BACKDROP, 'figure-stack': PURE_BACKDROP, 'figure-doodle': (8, 180)}
PURE_PATCH = 5  # px square, all of it pure backdrop
GROUND = 0.95  # feet sit at 95% of the box height, like the app's figures
PADDING = 1.06
SIZE = 640


def figure_name(path: Path) -> str:
    """`figure-stack` for art/out/figure-stack-2.jpg: the name without the take."""
    return re.sub(r'-\d+$', '', path.stem)


def flood_from_border(candidates: Image.Image, extra_seeds=()) -> Image.Image:
    """Of the 255-valued candidate pixels, keep those connected to the seeds."""
    mask = candidates.copy()
    width, height = mask.size
    seeds = [(x, y) for x in range(0, width, 16) for y in (0, height - 1)]
    seeds += [(x, y) for y in range(0, height, 16) for x in (0, width - 1)]
    for seed in [*seeds, *extra_seeds]:
        if mask.getpixel(seed) == 255:
            ImageDraw.floodfill(mask, seed, 128)
    return mask.point(lambda p: 255 if p == 128 else 0)


def chroma_of(rgb: Image.Image, blur: float = 2) -> Image.Image:
    r, g, b = rgb.filter(ImageFilter.GaussianBlur(blur)).split()
    return ImageChops.subtract(ImageChops.lighter(ImageChops.lighter(r, g), b), ImageChops.darker(ImageChops.darker(r, g), b))


def shadow_line(chroma: Image.Image) -> int | None:
    """The row below which shadows fall: the bottom fifth of the figure."""
    box = chroma.point(lambda c: 255 if c >= FIGURE_CHROMA else 0).getbbox()
    if not box:
        return None
    _, top, _, bottom = box
    return round(bottom - (bottom - top) * SHADOW_BAND)


def pure_backdrop(rgb: Image.Image, chroma: Image.Image, most: int, least: int) -> list[tuple[int, int]]:
    """Seeds in every patch of unmistakable backdrop, enclosed or not: chroma
    at most `most`, luma at least `least`."""
    pure = ImageChops.multiply(chroma.point(lambda c: 255 if c <= most else 0),
                               rgb.convert('L').point(lambda v: 255 if v >= least else 0))
    pure = pure.filter(ImageFilter.MinFilter(PURE_PATCH))
    px = pure.load()
    return [(x, y) for y in range(0, pure.height, 8) for x in range(0, pure.width, 8) if px[x, y]]


def coloured_above_shadow(chroma: Image.Image, line: int | None, in_band=None) -> Image.Image:
    """255 where a pixel has clear colour and sits above where shadows fall.

    Pale smooth felt (the Sleeper's misty blue on top of its head) passes the
    backdrop tests for saturation, texture and near-white, and was eaten.
    Its chroma still sets it apart: the backdrop stays within ~1 level of
    grey. The contact shadow picks up the felt's colour, though (chroma up to
    ~12 under the Sleeper), so the protection stops short of the bottom fifth
    of the figure, where shadows fall. There, `in_band`, if given, is an
    image of what is kept anyway.
    """
    coloured = chroma.point(lambda c: 255 if c >= MIN_FELT_CHROMA else 0)
    if line is not None:
        below = (0, line, coloured.width, coloured.height)
        kept = in_band if in_band is not None else Image.new('L', coloured.size, 0)
        coloured.paste(kept.crop(below), below[:2])
    return coloured


def warm_and_bright(rgb: Image.Image, chroma: Image.Image, least_warmth: int, least_luma: int) -> Image.Image:
    """255 where a pixel is at least this warm and this bright, with small gaps closed."""
    r, _, b = rgb.filter(ImageFilter.GaussianBlur(1)).split()
    clear = ImageChops.multiply(ImageChops.subtract(r, b).point(lambda w: 255 if w >= least_warmth else 0),
                                rgb.convert('L').point(lambda v: 255 if v >= least_luma else 0))
    either = ImageChops.lighter(clear, chroma.point(lambda c: 255 if c >= MIN_FELT_CHROMA * 2 else 0))
    closed = either.filter(ImageFilter.MaxFilter(BAND_CLOSE)).filter(ImageFilter.MinFilter(BAND_CLOSE))
    return ImageChops.lighter(clear, ImageChops.subtract(closed, either))


def ramp(low: float, high: float, falling: bool = False):
    """A point() lookup from 0 at `low` to 255 at `high` (or the other way)."""
    def f(v: int) -> int:
        t = max(0.0, min(1.0, (v - low) / (high - low)))
        return round(255 * (1 - t if falling else t))
    return f


def floor_glare(rgb: Image.Image, line: int, grey_chroma, pale_luma) -> Image.Image:
    """Alpha to keep: 0 where a pixel below `line` is pale and grey."""
    sharp = rgb.filter(ImageFilter.GaussianBlur(1))
    r, g, b = sharp.split()
    chroma = ImageChops.subtract(ImageChops.lighter(ImageChops.lighter(r, g), b), ImageChops.darker(ImageChops.darker(r, g), b))
    grey = chroma.point(ramp(*grey_chroma, falling=True))
    pale = sharp.convert('L').point(ramp(*pale_luma))
    keep = ImageChops.invert(ImageChops.multiply(grey, pale))
    ImageDraw.Draw(keep).rectangle((0, 0, keep.width, line - 1), fill=255)
    return keep


def lifted(alpha: Image.Image, lift: int) -> Image.Image:
    """Alpha with every edge that faces down lifted by `lift` px: each pixel
    takes the lowest alpha of the pixels just below it."""
    keep = Image.new('L', alpha.size, 255)
    for k in range(1, lift + 1):
        below = Image.new('L', alpha.size, 0)
        below.paste(alpha.crop((0, k, alpha.width, alpha.height)), (0, 0))
        keep = ImageChops.darker(keep, below)
    return keep


def under_felt(chroma: Image.Image, line: int) -> Image.Image:
    """Alpha to keep: 0 below the lowest clearly coloured pixel of each column.

    Felt that is grey in one column (the shaded gap between Curled's shins,
    the far foot's edge) is coloured in the columns beside it, so a column
    reaches as low as any within UNDER_REACH of it."""
    keep = Image.new('L', chroma.size, 255)
    width, height = chroma.size
    px, out = chroma.load(), keep.load()
    lowest = [next((y for y in range(height - 1, line - 1, -1) if px[x, y] >= UNDER_CHROMA), line - 1)
              for x in range(width)]
    for x in range(width):
        reach = max(lowest[max(0, x - UNDER_REACH):x + UNDER_REACH + 1])
        for y in range(reach + 1, height):
            out[x, y] = round(255 * max(0.0, 1 - (y - reach) / UNDER_FADE))
    return keep


def defringed(rgb: Image.Image, alpha: Image.Image) -> Image.Image:
    """`rgb` with every partly transparent pixel coloured like the opaque felt
    near it: the average of the opaque pixels within DEFRINGE_REACH."""
    solid = alpha.point(lambda a: 255 if a >= 250 else 0)
    near = solid.filter(ImageFilter.GaussianBlur(DEFRINGE_REACH))
    bands = []
    for band in rgb.split():
        felt = ImageChops.multiply(band, solid).filter(ImageFilter.GaussianBlur(DEFRINGE_REACH))
        bands.append(ImageMath.eval("convert(min(felt * 255 / max(near, 1), 255), 'L')", felt=felt, near=near))
    edge = ImageChops.multiply(alpha.point(lambda a: 255 if a < 250 else 0), near.point(lambda n: 255 if n > 8 else 0))
    return Image.composite(Image.merge('RGB', bands), rgb, edge)


def cut(path: Path) -> Image.Image:
    rgb = Image.open(path).convert('RGB')
    _, sat, val = rgb.convert('HSV').split()
    gray = rgb.convert('L')
    texture = ImageChops.difference(gray, gray.filter(ImageFilter.GaussianBlur(1.5)))
    texture = texture.filter(ImageFilter.GaussianBlur(3))
    name = figure_name(path)
    pale = name in PALE_FELT
    chroma = chroma_of(rgb)
    felt_chroma = chroma_of(rgb, FELT_BLUR[name]) if name in FELT_BLUR else chroma
    line = shadow_line(chroma)
    in_band = warm_and_bright(rgb, felt_chroma, *BAND_FELT[name]) if name in BAND_FELT else None
    felt = coloured_above_shadow(felt_chroma, line, in_band) if pale else Image.new('L', rgb.size, 0)
    neutral = ImageChops.subtract(
        ImageChops.multiply(
            ImageChops.multiply(
                sat.point(lambda s: 255 if s < MAX_SATURATION else 0),
                val.point(lambda v: 255 if v > MIN_VALUE else 0),
            ),
            texture.point(lambda t: 255 if t < MAX_TEXTURE else 0),
        ),
        felt,
    )
    background = flood_from_border(neutral)
    # Second pass: the texture blur leaves a near-white fringe at the edges.
    near_white = ImageChops.subtract(
        ImageChops.multiply(
            sat.point(lambda s: 255 if s < NEAR_WHITE_SATURATION else 0),
            val.point(lambda v: 255 if v > NEAR_WHITE_VALUE else 0),
        ),
        felt,
    )
    candidates = ImageChops.lighter(background, near_white)
    background = flood_from_border(candidates, pure_backdrop(rgb, felt_chroma, *ENCLOSED[name]) if name in ENCLOSED else ())
    # Gaps between the feet are enclosed by the legs; seed from the feet line.
    left, top, right, bottom = ImageChops.invert(background).getbbox()
    feet = [
        (x, y)
        for y in range(round(bottom - (bottom - top) * 0.1), bottom, 2)
        for x in range(left, right, 2)
    ]
    background = flood_from_border(candidates, [*feet, *(pure_backdrop(rgb, felt_chroma, *ENCLOSED[name]) if name in ENCLOSED else ())])
    alpha = ImageChops.invert(background)
    # Drop the light fringe, then soften the edge.
    alpha = alpha.filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(1.1))
    if name in FLOOR_RIM:
        # The photo's floor leaves a grey rim along the bottom, kept because
        # the shadow there is too dark and textured to read as backdrop. In
        # the shadow band, fade out whatever has no colour of its own.
        line = shadow_line(chroma)
        low, high = RIM_CHROMA
        keep = chroma.point(lambda c: round(255 * max(0.0, min(1.0, (c - low) / (high - low)))))
        # Where the floor picked up the felt's colour (pink under the
        # pillow) the rim keeps its chroma; it is only a few px tall, so lift
        # every edge that faces down by that much.
        keep = ImageChops.darker(keep, lifted(alpha, RIM_LIFT))
        ImageDraw.Draw(keep).rectangle((0, 0, keep.width, line - 1), fill=255)
        alpha = ImageChops.multiply(alpha, keep)
    if name in FLOOR_GLARE:
        alpha = ImageChops.multiply(alpha, floor_glare(rgb, shadow_line(chroma), *FLOOR_GLARE[name]))
    if name in FLOOR_UNDER:
        alpha = ImageChops.multiply(alpha, under_felt(felt_chroma, shadow_line(chroma)))
    rgba = defringed(rgb, alpha) if name in DEFRINGE else rgb.copy()
    rgba.putalpha(alpha)
    return rgba


def main() -> None:
    out_dir = Path(sys.argv[1])
    paths = [Path(p) for p in sys.argv[2:]]
    figures = {path: cut(path) for path in paths}
    boxes = {path: img.getchannel('A').point(lambda a: 255 if a > 40 else 0).getbbox() for path, img in figures.items()}
    side = max(max(r - l, b - t) for l, t, r, b in boxes.values()) * PADDING

    out_dir.mkdir(parents=True, exist_ok=True)
    for path, img in figures.items():
        left, top, right, bottom = boxes[path]
        cx = (left + right) / 2
        region = (
            round(cx - side / 2),
            round(bottom - side * GROUND),
            round(cx + side / 2),
            round(bottom - side * GROUND + side),
        )
        tile = img.crop(region).resize((SIZE, SIZE), Image.LANCZOS)
        name = figure_name(path) + '.webp'
        tile.save(out_dir / name, 'WEBP', quality=90, method=6)
        print(out_dir / name, 'bbox', boxes[path])


if __name__ == '__main__':
    main()
