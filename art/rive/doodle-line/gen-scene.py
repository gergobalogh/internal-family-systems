#!/usr/bin/env python3
"""Write scene.rml and line.json: Doodle rides in on its own crayon line.

    python3 gen-scene.py                       # the shipping scene
    DOODLE_REVIEW=enter python3 gen-scene.py   # default machine plays Enter, for captures

The page owns the line and the ride along it: a loose dusty-pink crayon line
drawn in from the left edge, high up and wandering in slow waves down to the
ground, revealed a little way ahead of the figure, which sits on it and
tilts a little with it. Rive owns everything in place, in the `Motion`
machine:

- `Ride` loops: a gentle sway about its seat, as if carried, and its crayon
  hand scribbling on the pad.
- `Enter` follows when `arrive` is set and a sway has finished: the glide
  slows to a stop on the ground, the scribbling stops, and it settles onto
  the ground with a small squash.
- `Idle`: breathing, and now and then a burst of drawing.

The hand scribbles through an image mesh: the vertices round the hand and
crayon move in a small loop, fading out to the rest of the figure. The page
fits whole sways to the ride, sets `arrive` during the last one, and reads
the travel from line.json: steady along the line through `Ride`, then, in
`Enter`, in sways' travel, so the stop carries the ride's speed. The line's
shape is described there too, in artboard px, for the page to draw. Every
pose is computed here and keyed frame by frame, from the shared helpers in
../rivegen.py. See docs/rive-entrance-playbook.md.
"""

import json
import math
import os
import sys

from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.dirname(HERE))
from rivegen import (Grid, apply, blink_animation, blink_asset, blink_image, blink_layer, damped_to_rest,  # noqa: E402
                     frames, hermite, keyed, mesh_channels, mul, node, smoothstep)

FPS = 60
WIDTH, HEIGHT = 660, 690

# --- the figure: assets/doodle.webp, a 640 tile with its seat at 95% ----------

TILE = 640
FIGURE = os.path.join(HERE, "assets", "doodle.webp")
BLINK_XY = (193.0, 161.0)       # the closed-eye overlay's top-left in the tile (build-assets.sh)
SEAT = (296.0, 606.0)          # in the tile: the lowest point of its bottom, what it sits on the line by
FIGURE_BOX = (WIDTH / 2 - SEAT[0], 40.0)   # the tile's top-left in the artboard
SHADOW = {"x": 320 / TILE, "w": 0.56}      # footprint, as fractions of the tile (as in app.css)

# The line, for the page, in artboard px: it is `rise` above the ground where
# it starts to come down, `descent` before the resting place, and waves
# `amplitude` up and down every `wavelength`, the waves dying away as it
# lands. The page reveals it `lead` ahead of the seat.
LINE = {"rise": 250, "descent": 1000, "amplitude": 55, "wavelength": 520, "lead": 420}

# --- motion ------------------------------------------------------------------

RIDE = 60                      # one sway
SWAY = 0.03                    # rad either way, about the seat
RIDE_TRAVEL = 360.0            # artboard px along the line a sway, nominal: the page fits it
BREATH = (-0.003, 0.008)
SCRIBBLE = 20                  # frames a scribble: three to a sway
SCRIB = (6.0, 3.5)             # tile px: the crayon hand's loop, across and up and down
HAND = (238.0, 352.0)          # tile px: the middle of the hand and crayon
REACH = (45.0, 105.0)          # the scribble is whole within the first, gone past the second

GLIDE = 44                     # Enter: slowing to a stop on the ground
SPEED = 1 / RIDE               # sways' travel a frame
LAND = GLIDE - 4               # touching down
SQUASH = 0.045
SQUASH_PERIOD = 28
ENTER = LAND + 76
DIE = 40                       # the sway dies down
IDLE = 360
IDLE_DRAW = (150, 270)         # Idle: a burst of drawing
BREATHE = (-0.004, 0.010)

STEP_STATE, STEP_IDLE, STEP_MESH, STEP_TRAVEL = 2, 6, 2, 2

REVIEW = os.environ.get("DOODLE_REVIEW", "")

# --- ids ---------------------------------------------------------------------

IDS = {
    "artboard": "0:2", "style": "0:5", "machine": "0:7", "layer": "0:8", "arrive": "0:9",
    "s_ride": "0:12", "s_enter": "0:13", "s_idle": "0:14",
    "a_ride": "0:6", "a_enter": "0:15", "a_idle": "0:16",
    "seat": "0:20", "figure": "0:21", "mesh": "0:22",
    "figure_asset": "0:60",
}
VERTEX_ID_BASE = 100

SEAT_AT = (FIGURE_BOX[0] + SEAT[0], FIGURE_BOX[1] + SEAT[1])

# Dense round the hand, so the loop fades out over a few cells.
MESH = Grid.lines((TILE, TILE), (0, 120, 160, 190, 215, 238, 262, 288, 318, 360, TILE),
                  (0, 230, 270, 300, 328, 352, 378, 405, 435, 475, TILE))


def figure_matrix(pose):
    return mul(node(*SEAT_AT, pose["sway"], pose["sx"], pose["sy"]), node(-SEAT[0], -SEAT[1]))


def deform(p, pose):
    """A tile point, moved with the hand: whole near it, fading out by REACH[1]."""
    weight = 1 - smoothstep(*REACH, math.dist(p, HAND))
    return (p[0] + pose["scrib"][0] * weight, p[1] + pose["scrib"][1] * weight)


# --- travel (in sways' travel) -----------------------------------------------


def gliding(f):
    """Out of a sway at the ride's speed, to a stop at GLIDE."""
    s = min(max(f / GLIDE, 0.0), 1.0)
    return hermite(s, 0, SPEED * GLIDE / 2.2, SPEED * GLIDE, 0)


# --- poses -------------------------------------------------------------------

REST_POSE = {"sway": 0.0, "sx": 1.0, "sy": 1.0, "scrib": (0.0, 0.0)}


def breath(f, period, amount):
    s = 0.5 - 0.5 * math.cos(2 * math.pi * f / period)
    return 1 + amount[0] * s, 1 + amount[1] * s


def bump(f, span):
    """0 outside span, rising to 1 and back, smoothly."""
    a, b = span
    return smoothstep(a, (a + b) / 2, f) * (1 - smoothstep((a + b) / 2, b, f))


def scribble(f, amount):
    phase = 2 * math.pi * f / SCRIBBLE
    return (SCRIB[0] * amount * math.sin(phase), SCRIB[1] * amount * math.sin(2 * phase))


def ride(f):
    sx, sy = breath(f, RIDE, BREATH)
    return {"sway": SWAY * math.sin(2 * math.pi * f / RIDE), "sx": sx, "sy": sy, "scrib": scribble(f, 1)}


def enter(f):
    t = f - LAND
    squash = 0.0
    if t > 0:
        squash = SQUASH * math.sin(2 * math.pi * t / SQUASH_PERIOD) * math.exp(-t / 14) * (1 - smoothstep(40, ENTER - LAND, t))
    return {"sway": damped_to_rest(f, SWAY * 2 * math.pi / RIDE, DIE),
            "sx": 1 + 0.6 * squash, "sy": 1 - squash,
            "scrib": scribble(f, 1 - smoothstep(0, GLIDE, f))}


def idle(f):
    sx, sy = breath(f, IDLE / 2, BREATHE)
    return {"sway": 0.0, "sx": sx, "sy": sy, "scrib": scribble(f, bump(f, IDLE_DRAW))}


# --- keys --------------------------------------------------------------------


def pose_channels(at, pose_of):
    channels = {}
    for f in at:
        pose = pose_of(f)
        for prop, value in (("rotation", pose["sway"]), ("scaleX", pose["sx"]), ("scaleY", pose["sy"])):
            channels.setdefault((IDS["seat"], prop), []).append((f, value))
    return channels


def mesh_keys(at, pose_of):
    return [(f, [deform(p, pose_of(f)) for p in MESH.rest]) for f in at]


def channels_for(duration, step, pose_of):
    at = frames(duration, step)
    return {**pose_channels(at, pose_of), **mesh_channels(mesh_keys(at, pose_of), VERTEX_ID_BASE, MESH.rest)}


def outline():
    alpha = Image.open(FIGURE).getchannel("A").point(lambda a: 255 if a > 40 else 0)
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


# --- checks ------------------------------------------------------------------


def validate(edge):
    problems = []
    for name, a, b in [("ride loop", ride(0), ride(RIDE)),
                       ("ride -> enter", ride(RIDE), enter(0)),
                       ("enter -> idle", enter(ENTER), idle(0)),
                       ("idle loop", idle(0), idle(IDLE))]:
        for k in ("sway", "sx", "sy"):
            if abs(a[k] - b[k]) > 1e-4:
                problems.append(f"{name}: {k} jumps {a[k]:.4f} -> {b[k]:.4f}")
        if math.dist(a["scrib"], b["scrib"]) > 1e-4:
            problems.append(f"{name}: the scribble jumps")
    h = 1e-4
    for name, v, want in [("enter starts", (enter(h)["sway"] - enter(0)["sway"]) / h,
                           (ride(RIDE)["sway"] - ride(RIDE - h)["sway"]) / h),
                          ("glide starts", (gliding(h) - gliding(0)) / h, SPEED)]:
        if abs(v - want) > 1e-4:
            problems.append(f"{name}: speed {v:.5f}, not {want:.5f}")
    if any(gliding(f + 1) < gliding(f) - 1e-9 for f in range(GLIDE)):
        problems.append("the glide goes backwards")

    def cross(v, a, b, c):
        return (v[b][0] - v[a][0]) * (v[c][1] - v[a][1]) - (v[b][1] - v[a][1]) * (v[c][0] - v[a][0])

    poses = ([ride(f) for f in range(0, RIDE + 1, 2)] + [enter(f) for f in range(0, ENTER + 1, 2)]
             + [idle(f) for f in range(0, IDLE + 1, 6)])
    for pose in poses:
        v = [deform(p, pose) for p in MESH.rest]
        if any(cross(v, a, b, c) * cross(MESH.rest, a, b, c) <= 0 for a, b, c in MESH.triangles()):
            problems.append("a mesh triangle turns over")
            break
    xs, ys = [], []
    for pose in poses:
        m = figure_matrix(pose)
        for p in edge:
            x, y = apply(m, p)
            xs.append(x)
            ys.append(y)
    box = (min(xs), min(ys), max(xs), max(ys))
    if box[0] < 0 or box[1] < 0 or box[2] > WIDTH or box[3] > HEIGHT:
        problems.append(f"figure off the artboard: x {box[0]:.0f}..{box[2]:.0f}, y {box[1]:.0f}..{box[3]:.0f}")
    if problems:
        raise SystemExit("gen-scene: " + "\n  ".join(problems[:12]))
    print(f"figure spans x {box[0]:.0f}..{box[2]:.0f}, y {box[1]:.0f}..{box[3]:.0f} of {WIDTH}x{HEIGHT}")
    return box


# --- scene -------------------------------------------------------------------


def state_layer():
    if REVIEW == "enter":
        return f'''            <StateMachineLayer name="Review" id="{IDS['layer']}">
                <AnyState x="160" y="-120"/>
                <ExitState x="560" y="-120"/>
                <EntryState x="0" y="0">
                    <StateTransition stateToId="{IDS['s_enter']}"/>
                </EntryState>
                <AnimationState x="160" y="0" animationId="{IDS['a_enter']}" id="{IDS['s_enter']}"/>
            </StateMachineLayer>'''
    return f'''            <StateMachineLayer name="Line" id="{IDS['layer']}">
                <AnyState x="160" y="-120"/>
                <ExitState x="560" y="-120"/>
                <EntryState x="0" y="0">
                    <StateTransition stateToId="{IDS['s_ride']}"/>
                </EntryState>
                <!-- Finishes the sway under way, so Enter starts where a sway does. -->
                <AnimationState x="160" y="0" animationId="{IDS['a_ride']}" id="{IDS['s_ride']}">
                    <StateTransition stateToId="{IDS['s_enter']}" enableExitTime="true"
                                     exitTimeIsPercetange="true" exitTime="100">
                        <TransitionBoolCondition inputId="{IDS['arrive']}" opValue="equal"/>
                    </StateTransition>
                </AnimationState>
                <AnimationState x="360" y="0" animationId="{IDS['a_enter']}" id="{IDS['s_enter']}">
                    <StateTransition stateToId="{IDS['s_idle']}" enableExitTime="true"
                                     exitTimeIsPercetange="true" exitTime="100"/>
                </AnimationState>
                <AnimationState x="560" y="0" animationId="{IDS['a_idle']}" id="{IDS['s_idle']}"/>
            </StateMachineLayer>'''


def main():
    edge = outline()
    box = validate(edge)

    ride_keys = keyed(channels_for(RIDE, STEP_STATE, ride))
    enter_keys = keyed(channels_for(ENTER, STEP_STATE, enter))
    idle_keys = keyed(channels_for(IDLE, STEP_IDLE, idle))

    scene = f'''<Rive version="1" kind="fragment">
    <!-- Generated by gen-scene.py; edit that, not this. -->
    <Artboard defaultStateMachineId="{IDS['machine']}" styleId="{IDS['style']}" width="{WIDTH}" height="{HEIGHT}" name="Doodle Line" id="{IDS['artboard']}">
        <LayoutComponentStyle name="Artboard Style" id="{IDS['style']}"/>

        <Node x="{SEAT_AT[0]:.2f}" y="{SEAT_AT[1]:.2f}" name="Seat" id="{IDS['seat']}">
            <!-- Declared first, so it paints on top: the eyes of a generated edit. -->
{blink_image(-SEAT[0] + BLINK_XY[0], -SEAT[1] + BLINK_XY[1], 12)}
            <Image x="{-SEAT[0]:.2f}" y="{-SEAT[1]:.2f}" originX="0" originY="0"
                   assetId="{IDS['figure_asset']}" name="Doodle" id="{IDS['figure']}">
{MESH.xml(IDS["mesh"], "Hand", VERTEX_ID_BASE, " " * 16)}
            </Image>
        </Node>

        <StateMachine name="Motion" id="{IDS['machine']}">
            <StateMachineBool name="arrive" id="{IDS['arrive']}"/>
{state_layer()}
{blink_layer()}
        </StateMachine>

        <LinearAnimation loopValue="loop" fps="{FPS}" duration="{RIDE}" name="Ride" id="{IDS['a_ride']}">
{ride_keys}
        </LinearAnimation>

        <LinearAnimation loopValue="oneShot" fps="{FPS}" duration="{ENTER}" name="Enter" id="{IDS['a_enter']}">
{enter_keys}
        </LinearAnimation>

        <LinearAnimation loopValue="loop" fps="{FPS}" duration="{IDLE}" name="Idle" id="{IDS['a_idle']}">
{idle_keys}
        </LinearAnimation>

{blink_animation(FPS)}
    </Artboard>

    <ImageAsset file="assets/doodle.webp" name="Doodle" id="{IDS['figure_asset']}"/>
{blink_asset()}
</Rive>
'''
    with open(os.path.join(HERE, "scene.rml"), "w") as f:
        f.write(scene)

    plan = {
        "fps": FPS,
        "artboard": {"width": WIDTH, "height": HEIGHT},
        "figureBox": {"x": FIGURE_BOX[0], "y": FIGURE_BOX[1], "size": TILE},
        "seat": {"x": SEAT_AT[0], "y": SEAT_AT[1]},
        "feetY": SEAT_AT[1],
        "shadow": SHADOW,
        "content": {"left": round(box[0], 1), "right": round(box[2], 1)},
        "line": LINE,
        "cycle": {"frames": RIDE, "travel": RIDE_TRAVEL},
        "enter": {
            "frames": ENTER,
            "travel": [[f, round(gliding(f), 5)] for f in frames(GLIDE, STEP_TRAVEL)],
        },
    }
    with open(os.path.join(HERE, "line.json"), "w") as f:
        json.dump(plan, f, separators=(",", ":"))
        f.write("\n")
    print(f"wrote scene.rml ({len(scene) // 1024} KB) and line.json")


if __name__ == "__main__":
    main()
