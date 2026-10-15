#!/usr/bin/env python3
"""Retouch the legs of critic.png so they survive walking.

The photo was taken standing still, and two things in it only show once the
legs move: the far leg's shadow, and a pale rim along the near leg's front.

Far (screen-right) leg: take the photographed shadow off it.

In the source photo the near leg and the body shade the far leg, so it is
roughly 40% darker than the near one. That reads as depth while the legs stand
still, but once they walk the shadow stays painted on the far leg wherever it
goes, and the leg just looks dirty.

The far leg is relit rather than repainted. Its low-frequency shading (a wide
alpha-weighted average) is divided out and replaced by the near leg's, sampled
at the same place across the leg's width on the same row, and scaled down a
touch so the far leg still sits behind. The felt texture -- everything finer
than the average -- survives. The change fades in below the crotch so the body
above the legs is untouched.

First, the pale meadow fringe the cutout left round the far leg is faded out.
It is the same idea as build-assets.sh's warm-red cleanup, but measured
relative to brightness, because the far foot is dark felt and an absolute
threshold cannot tell it from a pale fringe; relit, the fringe would turn white.

Near (screen-left) leg: its front edge carries a 2-4 px rim of pale pixels,
half to mostly opaque, left over from the photo's background. Against the
meadow it is invisible; once the near leg swings across the darker far leg it
reads as a white outline. Those pixels keep their alpha, so the edge stays
antialiased, but take the colour of the felt just inside them.

Usage: retouch-legs.py <critic.png>   (rewrites the file in place)
"""

import subprocess
import sys

SIZE = 640
SPLIT = 273.5              # the mesh's split between the legs, see gen-scene.py
FADE_IN = (548.0, 564.0)   # rows over which the relight takes over from the body
CROTCH = 556               # the fringe cleanup applies to the leg below this row
WARMTH = (0.20, 0.34)      # (r - (g+b)/2) / r: fringe below, felt above
PALE = 0.22                # near-leg pixels less warm than this are rim, not felt
RIM_REACH = 4              # how far in to look for felt to recolour the rim with
DEPTH = 0.9                # the far leg stays a little darker than the near one
RADIUS = 7                 # half-width of the shading average, px
HIGHLIGHT = 1.12           # how far a relit pixel may rise above its new shading
OPAQUE = 200


def smoothstep(edge0, edge1, x):
    t = max(0.0, min(1.0, (x - edge0) / (edge1 - edge0)))
    return t * t * (3 - 2 * t)


def main(path):
    raw = subprocess.run(
        ["convert", path, "-depth", "8", "rgba:-"], capture_output=True, check=True
    ).stdout
    if len(raw) != SIZE * SIZE * 4:
        raise SystemExit(f"{path}: expected {SIZE}x{SIZE}")
    out = bytearray(raw)

    def px(x, y):
        i = (y * SIZE + x) * 4
        return out[i], out[i + 1], out[i + 2], out[i + 3]

    def is_far(x):
        return x > SPLIT

    # 1. Fade the pale fringe off the far leg.
    for y in range(CROTCH, SIZE):
        for x in range(int(SPLIT) + 1, 345):
            r, g, b, a = px(x, y)
            if a:
                warmth = (r - (g + b) / 2) / max(r, 1)
                out[(y * SIZE + x) * 4 + 3] = round(a * smoothstep(*WARMTH, warmth))

    # 2. Each leg's extent per row, and its low-frequency shading.
    def extent(y, far):
        xs = [x for x in range(200, 345) if is_far(x) == far and px(x, y)[3] > OPAQUE]
        return (min(xs), max(xs)) if xs else None

    def shading(x, y, far):
        near = [px(xx, yy)[:3] for yy in range(y - RADIUS, y + RADIUS + 1)
                for xx in range(x - RADIUS, x + RADIUS + 1)
                if 0 <= yy < SIZE and is_far(xx) == far and px(xx, yy)[3] > OPAQUE
                and yy >= FADE_IN[0]]
        if not near:
            return None
        return [sum(c[i] for c in near) / len(near) for i in range(3)]

    # 3. Relight: swap the far leg's shading for the near leg's at the matching spot.
    relit = bytearray(out)
    for y in range(int(FADE_IN[0]), SIZE):
        far_span, near_span = extent(y, True), extent(y, False)
        if not far_span or not near_span:
            continue
        for x in range(int(SPLIT) + 1, 345):
            r, g, b, a = px(x, y)
            if not a:
                continue
            # Edge pixels are part background; brightening them draws a halo.
            amount = smoothstep(*FADE_IN, y) * a / 255
            across = (x - far_span[0]) / max(far_span[1] - far_span[0], 1)
            across = max(0.0, min(1.0, across))
            mirror = round(near_span[0] + across * (near_span[1] - near_span[0]))
            own, target = shading(x, y, True), shading(mirror, y, False)
            if not own or not target:
                continue
            i = (y * SIZE + x) * 4
            for ch, value in enumerate((r, g, b)):
                # Cap the highlights: a pixel already brighter than its
                # surroundings is usually photo glare, and the gain multiplies it.
                shade = DEPTH * target[ch]
                lit = min(value * shade / max(own[ch], 1.0), shade * HIGHLIGHT)
                relit[i + ch] = max(0, min(255, round(value + (lit - value) * amount)))

    # 4. Recolour the pale rim on the near leg with the felt beside it.
    def warmth(r, g, b):
        return (r - (g + b) / 2) / max(r, 1)

    for y in range(CROTCH, SIZE):
        for x in range(200, int(SPLIT) + 1):
            r, g, b, a = px(x, y)
            if not a or warmth(r, g, b) >= PALE:
                continue
            felt = [px(xx, yy)[:3]
                    for yy in range(y - RIM_REACH, y + RIM_REACH + 1)
                    for xx in range(x - RIM_REACH, min(x + RIM_REACH + 1, int(SPLIT) + 1))
                    if 0 <= yy < SIZE and px(xx, yy)[3] > OPAQUE and warmth(*px(xx, yy)[:3]) >= PALE]
            if felt:
                i = (y * SIZE + x) * 4
                for ch in range(3):
                    relit[i + ch] = round(sum(c[ch] for c in felt) / len(felt))

    subprocess.run(
        ["convert", "-size", f"{SIZE}x{SIZE}", "-depth", "8", "rgba:-", path],
        input=bytes(relit), check=True,
    )


if __name__ == "__main__":
    main(sys.argv[1])
