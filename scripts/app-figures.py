#!/usr/bin/env python3
"""Bring the entrance-spike figures into the app as map figures.

    python3 scripts/app-figures.py src/assets/figures

The app's first three figures (Critic, Sprout, Sleeper) came from one
cutout-figures.py run. The other ten were cut later for their Rive scenes,
each cropped like a set of one, so every one fills its own 640 tile. Here
each scene tile (and its closed-eye overlay, where it has one) is scaled
down about its feet, which sit at 95% of the tile like the app's, until its
felt covers about the same area as the first three's. On the map, size
means influence, so no figure may look bigger just because it was drawn
broad. A figure already smaller than that keeps its full tile.

Everything is read from the committed scene assets (art/rive/*/assets), so
this runs without the gitignored photos. It writes each figure's scale to
figure-scales.json beside them, so a Rive entrance (which plays the scene
tile) can shrink the same way and hand over to the still figure exactly
(src/ui/riveEntrances.ts). It prints the footprint CSS for
each figure (`--shadow-x`, `--shadow-w` in src/styles/app.css): measured
across the bottom 40% of the figure, which matches the hand-set values of
the first three to within 0.02.
"""
import json
import sys
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SIZE = 640
GROUND = 0.95
SOLID = 40  # of 255: alpha that counts as felt
FOOTPRINT = 0.4  # of the figure's height, from the ground up
FOOTPRINT_PAD = 0.02  # of the tile: the shadow reaches a little past the body
FIRST_THREE = ('lantern', 'sprout', 'sleeper')
# Ribbon's ribbon trails down to the ground on its left, so the bottom 40%
# spans 0.91 of the tile. Its blue body alone (b > r + 10) measures this.
FOOTPRINT_OVERRIDE = {'ribbon': (0.64, 0.37)}

# look: (scene, figure asset, closed-eye overlay's top-left in the scene tile, or None)
# Kaleidoscope's only blink is for its lowered pose, and Shell's eyes are shut.
FIGURES = {
    'defender': ('defender-parachute', 'defender.webp', (233, 245)),
    'pod': ('pod-drop', 'pod.webp', (255, 119)),
    'curled': ('curled-peek', 'curled.webp', (264, 91)),
    'selfhug': ('selfhug-waddle', 'selfhug.webp', (298, 111)),
    'ribbon': ('ribbon-pirouette', 'ribbon.webp', (308, 212)),
    'kaleidoscope': ('kaleidoscope-backwards', 'kaleidoscope.webp', None),
    'stack': ('stack-tiptoe', 'stack.webp', (260, 324)),
    'map': ('map-route', 'map.webp', (236, 138)),
    'doodle': ('doodle-line', 'doodle.webp', (193, 161)),
    'shell': ('shell-wave', 'shell.webp', None),
}


def solid(img: Image.Image) -> Image.Image:
    return img.getchannel('A').point(lambda a: 255 if a > SOLID else 0)


def area(img: Image.Image) -> int:
    return solid(img).histogram()[255]


def shrunk(tile: Image.Image, k: float) -> Image.Image:
    """`tile` scaled by k about its feet: the centre of the ground line stays put."""
    if k >= 1:
        return tile
    side = round(SIZE * k)
    out = Image.new('RGBA', (SIZE, SIZE), (0, 0, 0, 0))
    ground = SIZE * GROUND
    out.alpha_composite(tile.resize((side, side), Image.LANCZOS), (round(SIZE / 2 * (1 - k)), round(ground * (1 - k))))
    return out


def footprint(tile: Image.Image) -> tuple[float, float]:
    mask = solid(tile)
    _, top, _, bottom = mask.getbbox()
    left, _, right, _ = mask.crop((0, round(bottom - (bottom - top) * FOOTPRINT), SIZE, bottom)).getbbox()
    return (left + right) / 2 / SIZE, (right - left) / SIZE + FOOTPRINT_PAD


def main() -> None:
    out_dir = Path(sys.argv[1])
    target = sum(area(Image.open(out_dir / f'figure-{look}.webp')) for look in FIRST_THREE) / len(FIRST_THREE)
    print(f'target felt area: {target:.0f} px of the 640 tile')
    scales = {look: 1.0 for look in FIRST_THREE}
    for look, (scene, asset, blink_xy) in FIGURES.items():
        assets = ROOT / 'art' / 'rive' / scene / 'assets'
        tile = Image.open(assets / asset).convert('RGBA')
        k = min(1.0, (target / area(tile)) ** 0.5)
        scales[look] = round(k, 4)
        figure = shrunk(tile, k)
        figure.save(out_dir / f'figure-{look}.webp', 'WEBP', quality=90, method=6)
        if blink_xy:
            closed = Image.new('RGBA', (SIZE, SIZE), (0, 0, 0, 0))
            closed.alpha_composite(Image.open(assets / 'blink.png').convert('RGBA'), blink_xy)
            shrunk(closed, k).save(out_dir / f'figure-{look}-blink.webp', 'WEBP', quality=90, method=6)
        x, w = FOOTPRINT_OVERRIDE.get(look) or footprint(figure)
        print(f"{look:13} scale {k:.3f}  .part[data-look='{look}'] {{ --shadow-x: {x:.2f}; --shadow-w: {w:.2f}; }}")
    (out_dir / 'figure-scales.json').write_text(json.dumps(scales, indent=2) + '\n')


if __name__ == '__main__':
    main()
