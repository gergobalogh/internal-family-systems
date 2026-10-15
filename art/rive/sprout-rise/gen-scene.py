#!/usr/bin/env python3
"""Write scene.rml and rise.json: the Sprout pushes up out of the ground like a seedling.

    python3 gen-scene.py

It all happens in place, so the page only parks the canvas and draws the
shadow. Rive plays it in the `Motion` machine:

- `Rise` (oneShot): a felt mound of soil swells up out of the meadow. The two
  leaves poke out of its top, folded together as seedlings come up, open and
  shiver. The Sprout sinks a little to gather itself, then pops up out of
  the mound into a small hop, the leaves pressed up by the rush, and lands on
  its feet in a squash, the leaves flopping. The mound sinks back into the
  ground, and the Sprout bows, tilting toward the flower it holds.
- `Idle`: standing, breathing, the leaves stirring.

The Sprout is drawn behind the mound and clipped twice: to the ground line,
and to what is above the mound's top edge, a little inside it, so it comes
up out of the soil and the felt hides where it is cut. That second clip
lives in the mound and moves with it. The mound itself comes up out of the
ground and sinks back into it (clipped to the ground line too) instead of
scaling, so the clip never collapses. The leaves move through an image mesh over the whole figure whose rows
are close together only at the top: the rest of the mesh never moves, so the
felt figure is still one uncut photo.

Every pose is computed here and keyed frame by frame, from the shared helpers
in ../rivegen.py. See docs/rive-entrance-playbook.md.
"""

import json
import math
import os
import sys

from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.dirname(HERE))
from rivegen import (Grid, apply, frames, hermite, keyed, mesh_channels, mul, node,  # noqa: E402
                     smoothstep)

FPS = 60
WIDTH, HEIGHT = 560, 640
CENTRE_X = WIDTH / 2

# --- the figure: assets/sprout.webp, the app's 640 tile with the feet at 95% ---

TILE = 640
FIGURE = os.path.join(HERE, "assets", "sprout.webp")
FEET = (322.0, 606.0)          # in the tile: bottom centre of the feet, where it stands
FIGURE_BOX = (CENTRE_X - FEET[0], 18.0)   # the tile's top-left in the artboard
GROUND = FIGURE_BOX[1] + FEET[1]          # the ground line in the artboard
SHADOW = {"x": 0.5, "w": 0.5}  # footprint, as fractions of the tile (as in app.css)

# The leaves: they turn about the top of the stem's base, and nothing below
# STILL_Y moves. The head's top edge is at y 115..123 in the tile.
STEM = (365.0, 115.0)
STILL_Y = 113.0
LEAF_Y = 85.0                  # at and above this the leaves turn fully
LEAF_SIDE = 50.0               # px either side of the stem over which a fold flips direction
LEAVES_X = (285.0, 460.0)      # the leaves' span; the mesh is still 60 px beyond it
MESH_XS = [40.0 * i for i in range(17)]
MESH_YS = [0.0, 30.0, 58.0, 85.0, 99.0, STILL_Y, 145.0, 640.0]

# --- the mound: assets/mound.webp, scaled to tile px by cutout.py --------------

MOUND = os.path.join(HERE, "assets", "mound.webp")
MOUND_X = 345.0                # in the tile: its middle, so its high point is under the stem
MOUND_SINK = 2.0               # its base sits this far below the ground line
MOUND_INSET = 6.0              # the Sprout is cut this far inside the mound's top edge

# --- motion (frames) ---------------------------------------------------------

SWELL = (0, 26)                # the mound comes up, overshoots a little, settles
PEEK = (14, 40)                # the leaves come up out of it
OPEN = (40, 52)                # and open, shivering
GATHER = (52, 64)              # it sinks a little, gathering itself
POP = (64, 94)                 # up out of the mound to the top of a hop
DROP = (94, 108)               # and down onto its feet
SINK = (114, 150)              # the mound sinks back into the ground
BOW = (150, 168, 180, 206)     # down, held, up
RISE = 222
IDLE = 240

HIDDEN_BELOW = 600.0           # how far below its place it starts: all underground
PEEK_ABOVE = 78.0              # how much of the leaves shows above the mound's top
GATHER_DEPTH = 12.0
HOP = 30.0
STRETCH = (0.06, -0.025)       # scale y / x at the fastest point of the pop
SQUASH = 0.07
SQUASH_PERIOD = 24
SQUASH_DECAY = 10.0
BOW_TILT = 0.05                # rad, toward the flower
BOW_DIP = (0.012, -0.04)       # scale x / y
FOLD = 0.3                     # the leaves folded together while coming up, rad
IDLE_BREATH = 0.008
IDLE_SWAY = 0.035
BLINK_DURATION = 600
BLINK_KEYS = [(155, 163), (479, 487)]
BLINK_XY = (311.0, 240.0)     # cropped overlay's top-left in the 640 figure tile

STEP_RISE, STEP_IDLE = 2, 6

# --- ids ---------------------------------------------------------------------

IDS = {
    "artboard": "0:2", "style": "0:5", "machine": "0:7", "layer": "0:8",
    "blink_layer": "0:9", "blink_state": "0:10", "a_blink": "0:17",
    "s_rise": "0:13", "s_idle": "0:14", "a_rise": "0:15", "a_idle": "0:16",
    "mound": "0:20", "mound_image": "0:21", "mound_clip": "0:22",
    "contour": "0:23", "contour_path": "0:24",
    "ground": "0:30", "ground_rect": "0:31", "sprout": "0:32", "clip_ground": "0:33",
    "clip_mound": "0:38", "blink": "0:39",
    "lift": "0:34", "bow": "0:35", "figure": "0:36", "mesh": "0:37",
    "figure_asset": "0:60", "mound_asset": "0:61", "blink_asset": "0:62",
}
VERTEX_ID_BASE = 2000

MESH = Grid.lines((TILE, TILE), MESH_XS, MESH_YS)


def measure(path):
    """An image's size and the bounds of its opaque part."""
    img = Image.open(path)
    return img.size, img.getchannel("A").point(lambda a: 255 if a > 40 else 0).getbbox()


MOUND_SIZE, MOUND_BOX = measure(MOUND)
MOUND_BASE = (MOUND_BOX[0] + MOUND_BOX[2]) / 2, MOUND_BOX[3]   # in the mound image
MOUND_HEIGHT = MOUND_BOX[3] - MOUND_BOX[1]
MOUND_TOP = GROUND + MOUND_SINK - MOUND_HEIGHT  # its peak, in the artboard
LEAF_TOP = 29.0                # in the tile
PEEK_DEPTH = MOUND_TOP - PEEK_ABOVE - (FIGURE_BOX[1] + LEAF_TOP)  # how far below its place


# --- poses -------------------------------------------------------------------

REST_POSE = {"depth": 0.0, "bow": 0.0, "sx": 1.0, "sy": 1.0, "tilt": 0.0, "fold": 0.0,
             "mdepth": 0.0, "mx": 1.0, "my": 1.0, "mound": 1.0}


def flutter(t, start, amount, period, decay):
    """A damped shake that starts at `start`."""
    if t < start:
        return 0.0
    u = t - start
    return amount * math.exp(-u / decay) * math.sin(2 * math.pi * u / period)


def depth(t):
    """How far below its place the Sprout is, at Rise frame t."""
    if t < PEEK[0]:
        return HIDDEN_BELOW
    if t < GATHER[0]:
        return HIDDEN_BELOW + (PEEK_DEPTH - HIDDEN_BELOW) * smoothstep(*PEEK, t)
    if t < POP[0]:
        return PEEK_DEPTH + GATHER_DEPTH * smoothstep(*GATHER, t)
    if t < DROP[0]:
        return hermite((t - POP[0]) / (POP[1] - POP[0]), PEEK_DEPTH + GATHER_DEPTH, -HOP, 0, 0)
    if t < DROP[1]:
        s = (t - DROP[0]) / (DROP[1] - DROP[0])
        return -HOP * (1 - s * s)
    return 0.0


PEAK_RISE = max(depth(t - 0.5) - depth(t + 0.5) for t in range(*POP))


def rise(t):
    pose = dict(REST_POSE)
    pose["depth"] = depth(t)
    # Stretched by the rush up, at its most at the fastest point.
    up = max(0.0, depth(t - 0.5) - depth(t + 0.5)) / PEAK_RISE if POP[0] <= t <= POP[1] else 0.0
    sy = 1 + STRETCH[0] * up
    sx = 1 + STRETCH[1] * up
    # Squashed onto its feet on landing, back to rest well before the bow.
    land = t - DROP[1]
    if land >= 0:
        wave = (math.exp(-land / SQUASH_DECAY) * math.sin(2 * math.pi * land / SQUASH_PERIOD)
                * (1 - smoothstep(30, 42, land)))
        sy *= 1 - SQUASH * wave
        sx *= 1 + 0.5 * SQUASH * wave
    b = smoothstep(BOW[0], BOW[1], t) - smoothstep(BOW[2], BOW[3], t)
    pose["bow"] = BOW_TILT * b
    pose["sx"] = sx * (1 + BOW_DIP[0] * b)
    pose["sy"] = sy * (1 + BOW_DIP[1] * b)
    # The leaves: folded while they come up, then open with a shiver; pressed
    # up again by the pop; flopping on landing and as it bows.
    end = 1 - smoothstep(RISE - 24, RISE, t)
    pose["fold"] = (FOLD * (1 - smoothstep(*OPEN, t))
                    + 0.25 * up
                    + flutter(t, OPEN[1] - 4, -0.08, 14, 8)
                    + flutter(t, DROP[1], -0.14, 16, 9)
                    + flutter(t, BOW[1] - 4, -0.06, 18, 10)) * end
    pose["tilt"] = (flutter(t, OPEN[0] + 4, 0.10, 9, 9)
                    + flutter(t, BOW[1], 0.06, 18, 12)
                    + flutter(t, BOW[3] - 12, -0.05, 18, 10)) * end
    # The mound: heaves up out of the ground, a little too far, and settles;
    # bulges as the Sprout pushes out through it; then sinks back down into
    # the ground, spreading a little.
    under = MOUND_HEIGHT + 2 * MOUND_SINK
    if t < SWELL[1] - 8:
        heave = hermite(t / (SWELL[1] - 8), under, -5.0, 0, 0)
    else:
        heave = -5.0 * (1 - smoothstep(SWELL[1] - 8, SWELL[1], t))
    bulge = math.sin(math.pi * min(1.0, max(0.0, (t - POP[0] + 4) / 24)))
    sink = smoothstep(*SINK, t)
    pose["mdepth"] = heave + under * sink
    pose["my"] = 1 + 0.05 * bulge
    pose["mx"] = (0.85 + 0.15 * smoothstep(SWELL[0], SWELL[1] - 6, t)) * (1 + 0.03 * bulge + 0.08 * sink)
    pose["mound"] = 1 - smoothstep(SINK[1] - 6, SINK[1], t)   # once it is underground
    return pose


def idle(f):
    s = 0.5 - 0.5 * math.cos(2 * math.pi * f / IDLE)
    gone = {k: rise(RISE)[k] for k in ("mdepth", "mx", "my", "mound")}   # the mound stays sunk
    return {**REST_POSE, **gone, "sx": 1 - IDLE_BREATH * 0.4 * s, "sy": 1 + IDLE_BREATH * s,
            "tilt": IDLE_SWAY * math.sin(2 * math.pi * f / IDLE),
            "fold": 0.5 * IDLE_SWAY * (0.5 - 0.5 * math.cos(4 * math.pi * f / IDLE))}


# --- the leaf mesh -----------------------------------------------------------


def bend(p, pose):
    """Where texture point p is with the leaves tilted and folded."""
    x, y = p
    weight = (smoothstep(STILL_Y, LEAF_Y, y) * smoothstep(LEAVES_X[0] - 60, LEAVES_X[0], x)
              * (1 - smoothstep(LEAVES_X[1], LEAVES_X[1] + 60, x)))
    if weight == 0:
        return p
    side = max(-1.0, min(1.0, (STEM[0] - x) / LEAF_SIDE))   # +1 left leaf, -1 right leaf
    angle = weight * (pose["tilt"] + pose["fold"] * side)
    c, s = math.cos(angle), math.sin(angle)
    dx, dy = x - STEM[0], y - STEM[1]
    return STEM[0] + c * dx - s * dy, STEM[1] + s * dx + c * dy


def mesh_keys(at, pose_of):
    return [(f, [bend(p, pose_of(f)) for p in MESH.rest]) for f in at]


# --- transforms --------------------------------------------------------------

LIFT_AT = (FIGURE_BOX[0] + FEET[0], GROUND)


def figure_matrix(pose):
    """Tile pixels (after the mesh) to artboard pixels."""
    m = node(LIFT_AT[0], LIFT_AT[1] + pose["depth"])
    m = mul(m, node(0, 0, pose["bow"], pose["sx"], pose["sy"]))
    return mul(m, node(-FEET[0], -FEET[1]))


MOUND_AT = (FIGURE_BOX[0] + MOUND_X, GROUND + MOUND_SINK)


def mound_matrix(pose):
    m = node(MOUND_AT[0], MOUND_AT[1] + pose["mdepth"], 0, pose["mx"], pose["my"])
    return mul(m, node(-MOUND_BASE[0], -MOUND_BASE[1]))


def contour():
    """The region above the mound's top edge, MOUND_INSET inside it, in the
    Mound node's space: it runs along the edge, then out at the base and
    round the whole sky."""
    alpha = Image.open(MOUND).getchannel("A")
    width, height = alpha.size
    pixels = alpha.load()
    edge = []
    for x in list(range(MOUND_BOX[0], MOUND_BOX[2], 6)) + [MOUND_BOX[2] - 1]:
        top = next((y for y in range(height) if pixels[x, y] > 160), None)
        if top is not None:
            y = min(top + MOUND_INSET, MOUND_BASE[1])
            edge.append((x - MOUND_BASE[0], y - MOUND_BASE[1]))
    far, base = 4 * WIDTH, 0.0
    return ([(-far, base), (edge[0][0], base)] + edge + [(edge[-1][0], base), (far, base),
            (far, -4 * HEIGHT), (-far, -4 * HEIGHT)])


# --- keyframes ---------------------------------------------------------------


def pose_channels(at, pose_of):
    channels = {}

    def put(object_id, prop, frame, value):
        channels.setdefault((object_id, prop), []).append((frame, value))

    for f in at:
        pose = pose_of(f)
        put(IDS["lift"], "y", f, LIFT_AT[1] + pose["depth"])
        put(IDS["bow"], "rotation", f, pose["bow"])
        put(IDS["bow"], "scaleX", f, pose["sx"])
        put(IDS["bow"], "scaleY", f, pose["sy"])
        put(IDS["mound"], "y", f, MOUND_AT[1] + pose["mdepth"])
        put(IDS["mound"], "scaleX", f, pose["mx"])
        put(IDS["mound"], "scaleY", f, pose["my"])
        put(IDS["mound"], "opacity", f, pose["mound"])
    return channels


# --- checks ------------------------------------------------------------------


def outline(path):
    alpha = Image.open(path).getchannel("A").point(lambda a: 255 if a > 40 else 0)
    width, height = alpha.size
    pixels = alpha.load()
    points = []
    for y in range(0, height, 4):
        row = [x for x in range(width) if pixels[x, y]]
        if row:
            points += [(row[0], y), (row[-1], y)]
    for x in range(0, width, 4):
        column = [y for y in range(height) if pixels[x, y]]
        if column:
            points += [(x, column[0]), (x, column[-1])]
    return points


def validate():
    problems = []
    # The hand-off and the Idle loop must not jump.
    for name, a, b in [("rise -> idle", rise(RISE), idle(0)), ("idle loop", idle(0), idle(IDLE))]:
        for k in REST_POSE:
            if abs(a[k] - b[k]) > 1e-3:
                problems.append(f"{name}: {k} jumps {a[k]:.4f} -> {b[k]:.4f}")
    # Nothing shows before the mound does: the Sprout starts underground.
    start = figure_matrix(rise(0))
    if min(apply(start, p)[1] for p in outline(FIGURE)) < GROUND:
        problems.append("the Sprout shows above the ground at frame 0")
    # While it is coming up, what is above ground and below the mound's top
    # must be hidden by the mound: check the body's outline at the ground line
    # is inside the mound's base.
    m = mound_matrix(rise(POP[0]))
    base_left = apply(m, (MOUND_BOX[0], MOUND_BOX[3]))[0]
    base_right = apply(m, (MOUND_BOX[2], MOUND_BOX[3]))[0]
    body = [p for p in outline(FIGURE) if p[1] > STILL_Y]
    widest = min(p[0] for p in body) + FIGURE_BOX[0], max(p[0] for p in body) + FIGURE_BOX[0]
    if widest[0] < base_left + 10 or widest[1] > base_right - 10:
        problems.append(f"the mound ({base_left:.0f}..{base_right:.0f}) is too narrow "
                        f"to hide the body ({widest[0]:.0f}..{widest[1]:.0f})")
    # The leaves' mesh stays in order (no triangle turns over).
    def cross(v, a, b, c):
        return (v[b][0] - v[a][0]) * (v[c][1] - v[a][1]) - (v[b][1] - v[a][1]) * (v[c][0] - v[a][0])

    for f in range(RISE + 1):
        v = [bend(p, rise(f)) for p in MESH.rest]
        for a, b, c in MESH.triangles():
            if cross(v, a, b, c) * cross(MESH.rest, a, b, c) <= 0:
                problems.append(f"leaf mesh triangle {a},{b},{c} turns over at frame {f}")
                break
    # On the artboard: the Sprout from when it stands clear, and the mound.
    xs, ys = [], []
    edge = outline(FIGURE)
    for pose in [rise(f) for f in range(DROP[0], RISE + 1)] + [idle(f) for f in range(0, IDLE, 4)]:
        for p in edge:
            x, y = apply(figure_matrix(pose), p)
            xs.append(x)
            ys.append(y)
    for f in range(SWELL[0], SINK[1]):
        for corner in ((MOUND_BOX[0], MOUND_BOX[1]), (MOUND_BOX[2], MOUND_BOX[3])):
            x, y = apply(mound_matrix(rise(f)), corner)
            xs.append(x)
            ys.append(min(y, GROUND))   # below that it is clipped
    box = (min(xs), min(ys), max(xs), max(ys))
    if box[0] < 0 or box[1] < 0 or box[2] > WIDTH or box[3] > HEIGHT:
        problems.append(f"off the artboard: x {box[0]:.0f}..{box[2]:.0f}, y {box[1]:.0f}..{box[3]:.0f}")
    if problems:
        raise SystemExit("gen-scene: " + "\n  ".join(problems[:12]))
    print(f"spans x {box[0]:.0f}..{box[2]:.0f}, y {box[1]:.0f}..{box[3]:.0f} of {WIDTH}x{HEIGHT}; "
          f"mound top at {MOUND_TOP:.0f}, ground at {GROUND:.0f}")


# --- scene -------------------------------------------------------------------


def main():
    validate()

    rise_frames = frames(RISE, STEP_RISE)
    idle_frames = frames(IDLE, STEP_IDLE)
    rise_keys = keyed({**pose_channels(rise_frames, rise),
                       **mesh_channels(mesh_keys(rise_frames, rise), VERTEX_ID_BASE, MESH.rest)})
    idle_keys = keyed({**pose_channels(idle_frames, idle),
                       **mesh_channels(mesh_keys(idle_frames, idle), VERTEX_ID_BASE, MESH.rest)})
    blink = [(0, 0.0)]
    for start, end in BLINK_KEYS:
        blink += [(start - 1, 0.0), (start, 1.0), (end, 0.0)]
    blink.append((BLINK_DURATION, 0.0))
    blink_keys = keyed({(IDS["blink"], "opacity"): blink})

    machine = f'''        <StateMachine name="Motion" id="{IDS['machine']}">
            <StateMachineLayer name="Sprout" id="{IDS['layer']}">
                <AnyState x="160" y="-120"/>
                <ExitState x="560" y="-120"/>
                <EntryState x="0" y="0">
                    <StateTransition stateToId="{IDS['s_rise']}"/>
                </EntryState>
                <AnimationState x="160" y="0" animationId="{IDS['a_rise']}" id="{IDS['s_rise']}">
                    <StateTransition stateToId="{IDS['s_idle']}" enableExitTime="true"
                                     exitTimeIsPercetange="true" exitTime="100"/>
                </AnimationState>
                <AnimationState x="360" y="0" animationId="{IDS['a_idle']}" id="{IDS['s_idle']}"/>
            </StateMachineLayer>
            <StateMachineLayer name="Blink" id="{IDS['blink_layer']}">
                <AnyState x="160" y="-120"/>
                <ExitState x="560" y="-120"/>
                <EntryState x="0" y="0">
                    <StateTransition stateToId="{IDS['blink_state']}"/>
                </EntryState>
                <AnimationState x="160" y="0" animationId="{IDS['a_blink']}" id="{IDS['blink_state']}"/>
            </StateMachineLayer>
        </StateMachine>'''

    rest = rise(0)
    contour_xml = "\n".join(f'                    <StraightVertex x="{x:.2f}" y="{y:.2f}"/>' for x, y in contour())
    scene = f'''<Rive version="1" kind="fragment">
    <!-- Generated by gen-scene.py; edit that, not this. -->
    <Artboard defaultStateMachineId="{IDS['machine']}" styleId="{IDS['style']}" width="{WIDTH}" height="{HEIGHT}" name="Sprout Rise" id="{IDS['artboard']}">
        <LayoutComponentStyle name="Artboard Style" id="{IDS['style']}"/>

        <!-- Declared first, so it paints on top: the mound hides where the
             Sprout is cut off at its edge. -->
        <Node x="{MOUND_AT[0]:.2f}" y="{MOUND_AT[1] + rest['mdepth']:.2f}" scaleX="{rest['mx']:.4f}" scaleY="{rest['my']:.4f}" name="Mound" id="{IDS['mound']}">
            <ClippingShape sourceId="{IDS['ground']}" name="Above Ground" id="{IDS['mound_clip']}"/>
            <Image x="{-MOUND_BASE[0]:.2f}" y="{-MOUND_BASE[1]:.2f}" originX="0" originY="0"
                   assetId="{IDS['mound_asset']}" name="Mound Felt" id="{IDS['mound_image']}"/>
            <!-- No paints: it only lends its geometry to the Sprout's clip. -->
            <Shape x="0" y="0" name="Above Mound" id="{IDS['contour']}">
                <PointsPath isClosed="true" name="Edge" id="{IDS['contour_path']}">
{contour_xml}
                </PointsPath>
            </Shape>
        </Node>

        <Node x="0" y="0" name="Sprout" id="{IDS['sprout']}">
            <ClippingShape sourceId="{IDS['ground']}" name="Above Ground" id="{IDS['clip_ground']}"/>
            <ClippingShape sourceId="{IDS['contour']}" name="Out of the Mound" id="{IDS['clip_mound']}"/>
            <Node x="{LIFT_AT[0]:.2f}" y="{LIFT_AT[1] + rest['depth']:.2f}" name="Lift" id="{IDS['lift']}">
                <Node x="0" y="0" name="Bow" id="{IDS['bow']}">
                    <Image x="{-FEET[0] + BLINK_XY[0]:.2f}" y="{-FEET[1] + BLINK_XY[1]:.2f}"
                           originX="0" originY="0" opacity="0"
                           assetId="{IDS['blink_asset']}" name="Blink" id="{IDS['blink']}"/>
                    <Image x="{-FEET[0]:.2f}" y="{-FEET[1]:.2f}" originX="0" originY="0"
                           assetId="{IDS['figure_asset']}" name="Sprout" id="{IDS['figure']}">
{MESH.xml(IDS["mesh"], "Leaves", VERTEX_ID_BASE, " " * 24)}
                    </Image>
                </Node>
            </Node>
        </Node>

        <!-- No paints: it only lends its geometry to the clips. -->
        <Shape x="0" y="0" name="Above Ground" id="{IDS['ground']}">
            <Rectangle width="{WIDTH}" height="{GROUND:.2f}" originX="0" originY="0" name="Sky" id="{IDS['ground_rect']}"/>
        </Shape>

{machine}

        <LinearAnimation loopValue="oneShot" fps="{FPS}" duration="{RISE}" name="Rise" id="{IDS['a_rise']}">
{rise_keys}
        </LinearAnimation>

        <LinearAnimation loopValue="loop" fps="{FPS}" duration="{IDLE}" name="Idle" id="{IDS['a_idle']}">
{idle_keys}
        </LinearAnimation>

        <LinearAnimation loopValue="loop" fps="{FPS}" duration="{BLINK_DURATION}" name="Blink" id="{IDS['a_blink']}">
{blink_keys}
        </LinearAnimation>
    </Artboard>

    <ImageAsset file="assets/sprout.webp" name="Sprout" id="{IDS['figure_asset']}"/>
    <ImageAsset file="assets/mound.webp" name="Mound" id="{IDS['mound_asset']}"/>
    <ImageAsset file="assets/blink.png" name="Blink" id="{IDS['blink_asset']}"/>
</Rive>
'''
    with open(os.path.join(HERE, "scene.rml"), "w") as f:
        f.write(scene)

    # The page parks the canvas and draws the shadow: under the mound while it
    # stands, gathering to the Sprout's own as the mound sinks.
    mound_w = (MOUND_BOX[2] - MOUND_BOX[0]) / TILE / SHADOW["w"]
    mound_dx = MOUND_X / TILE - SHADOW["x"]
    plan = {
        "fps": FPS,
        "artboard": {"width": WIDTH, "height": HEIGHT},
        "figureBox": {"x": FIGURE_BOX[0], "y": FIGURE_BOX[1], "size": TILE},
        "feetY": GROUND,
        "riseFrames": RISE,
        "shadow": SHADOW,
        # [frame, opacity, width scale, x shift as a fraction of the tile], linear between
        "shadowKeys": [[0, 0, 0.8 * mound_w, mound_dx], [SWELL[1] - 8, 1, mound_w, mound_dx],
                       [SINK[0], 1, mound_w, mound_dx], [SINK[1], 1, 1, 0], [RISE, 1, 1, 0]],
    }
    plan["shadowKeys"] = [[f, o, round(w, 3), round(dx, 4)] for f, o, w, dx in plan["shadowKeys"]]
    with open(os.path.join(HERE, "rise.json"), "w") as f:
        json.dump(plan, f, indent=2)
        f.write("\n")
    print(f"wrote scene.rml ({len(scene) // 1024} KB) and rise.json; leaves peek out at depth "
          f"{PEEK_DEPTH:.0f}, pop peaks at {PEAK_RISE:.1f} px/frame")


if __name__ == "__main__":
    main()
