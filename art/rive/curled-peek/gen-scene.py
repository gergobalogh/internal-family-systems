#!/usr/bin/env python3
"""Write scene.rml and peek.json: Curled comes in warily, checking it is safe.

    python3 gen-scene.py

Curled sits hugging its knees, so it cannot walk: it pushes itself along the
ground on its bottom. Rive plays the whole entrance in place, in the `Motion`
machine:

- `Enter` (oneShot): it slides in a little way from the edge and freezes.
  It cranes up and leans in to check, then backs off quickly and cowers. It
  waits, then comes the rest of the way in three slides, pausing after each,
  glancing up in the first two pauses. At the end it lets out a breath.
- `Idle`: sitting, breathing, now and then glancing up.

The page owns the travel across the screen. It reads it, frame by frame,
from `travel` in peek.json: fixed artboard px (the peek and the backing off,
which are measured from the edge) plus a fraction of whatever distance the
screen leaves (the three slides). Sliding on its bottom, Curled has no foot
to keep planted, so the slides can stretch to the screen.

The lean is a damped spring driven by the slides' acceleration, as if the
top of the body lagged behind its base: back as it pushes off, forward as it
stops. Every pose is computed here and keyed frame by frame, from the shared
helpers in ../rivegen.py. See docs/rive-entrance-playbook.md.
"""

import json
import math
import os
import sys

from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.dirname(HERE))
from rivegen import (apply, blink_animation, blink_asset, blink_image, blink_layer,  # noqa: E402
                     frames, keyed, mul, node, smoothstep)

FPS = 60
WIDTH, HEIGHT = 560, 648

# --- the figure: assets/curled.webp, a 640 tile with the lowest point at 95% -

TILE = 640
FIGURE = os.path.join(HERE, "assets", "curled.webp")
BLINK_XY = (264.0, 91.0)       # the closed-eye overlay's top-left in the tile (build-assets.sh)
BASE = (330.0, 600.0)          # in the tile: where it sits, what it leans and squashes about
FIGURE_BOX = (WIDTH / 2 - 320.0, 22.0)   # the tile's top-left in the artboard
FEET_Y = 604.0                 # in the tile: the ground line, between the body and the feet
SHADOW = {"x": 0.5, "w": 0.66}  # footprint, as fractions of the tile (as in app.css)

# --- the entrance, in frames -------------------------------------------------

PEEK = 170.0                   # artboard px it comes in from fully off screen
BACK = 120.0                   # and how far it backs off again

T_PEEK = (0, 36)               # slides in, stops dead
T_CHECK = (54, 96)             # cranes up and leans in, holds, back
T_BACK = (96, 112)             # backs off, quickly
T_COWER = (96, 150)            # shrinks down and slowly comes back up
SLIDE_START = 146
ANTICIPATE, PUSH, PAUSE = 8, 32, 22
SLIDES = 3
SLIDE = ANTICIPATE + PUSH + PAUSE
T_SIGH = (SLIDE_START + SLIDES * SLIDE, SLIDE_START + SLIDES * SLIDE + 40)
ENTER = T_SIGH[1]

CRANE = (0.08, 0.04)           # lean toward the middle (rad) and stretch up while checking
GLANCE = (0.035, 0.015)        # the smaller check in a pause
COWER = (0.04, 0.02)           # squash down, widen a little
SIGH = 0.02

# The lean: a damped rotational spring driven by the base's acceleration.
# Computed against a nominal screen, where each slide is SLIDE_SPAN px.
SLIDE_SPAN = 300.0
LEAN_PERIOD = 26.0
LEAN_DAMPING = 0.45
LEAN_GAIN = 0.0009             # rad per (px/frame^2)
ANTICIPATION_LEAN = -0.03      # rocks back before each push

IDLE = 300
BREATHE = (-0.004, 0.010)      # scale x / y on the in-breath, twice per Idle
IDLE_GLANCE = (190, 260)

STEP_ENTER, STEP_IDLE, STEP_TRAVEL = 2, 6, 2

# --- ids ---------------------------------------------------------------------

IDS = {
    "artboard": "0:2", "style": "0:5", "machine": "0:7", "layer": "0:8",
    "s_enter": "0:12", "s_idle": "0:13", "a_enter": "0:15", "a_idle": "0:16",
    "base": "0:20", "figure": "0:21", "figure_asset": "0:60",
}

BASE_AT = (FIGURE_BOX[0] + BASE[0], FIGURE_BOX[1] + BASE[1])

# --- the travel --------------------------------------------------------------


def push(s):
    """0 to 1 over s in [0, 1], fast off the mark and slowing to a stop:
    speed 12 s (1 - s)^2, at its peak a third of the way."""
    s = min(max(s, 0.0), 1.0)
    return 1 - (1 - s) ** 3 * (1 + 3 * s)


def slide_window(i):
    start = SLIDE_START + i * SLIDE + ANTICIPATE
    return start, start + PUSH


def travel(f):
    """(fixed px, fraction of the rest) the base has come by frame f."""
    fixed = PEEK * push((f - T_PEEK[0]) / (T_PEEK[1] - T_PEEK[0]))
    fixed -= BACK * smoothstep(*T_BACK, f)
    fraction = sum(push((f - a) / (b - a)) for a, b in map(slide_window, range(SLIDES))) / SLIDES
    return fixed, fraction


def nominal(f):
    fixed, fraction = travel(f)
    return fixed + fraction * SLIDE_SPAN * SLIDES


def lean_track():
    """The spring's lean, frame by frame, driven by the nominal travel."""
    omega = 2 * math.pi / LEAN_PERIOD
    theta, speed, out = 0.0, 0.0, []
    substeps = 8
    for f in range(ENTER + 1):
        out.append(theta)
        for k in range(substeps):
            t = f + k / substeps
            h = 1 / substeps
            accel = (nominal(t + h) - 2 * nominal(t) + nominal(t - h)) / h ** 2
            speed += (-omega ** 2 * theta - 2 * LEAN_DAMPING * omega * speed - LEAN_GAIN * accel) * h
            theta += speed * h
    # Ends exactly at rest, for the hand-off to Idle.
    return [theta * (1 - smoothstep(ENTER - 30, ENTER, f)) for f, theta in enumerate(out)]


LEAN = lean_track()

# --- poses -------------------------------------------------------------------

REST_POSE = {"rotation": 0.0, "sx": 1.0, "sy": 1.0}


def bump(f, start, end, rise=0.3):
    """0 -> 1 -> 0 over [start, end]: eases up, holds, eases down."""
    span = end - start
    return smoothstep(start, start + rise * span, f) * (1 - smoothstep(end - rise * span, end, f))


def enter(f):
    rotation = LEAN[min(max(int(round(f)), 0), ENTER)]
    sx = sy = 1.0
    # Checking: crane up and lean in toward the middle.
    c = bump(f, *T_CHECK)
    rotation += CRANE[0] * c
    sy += CRANE[1] * c
    sx -= CRANE[1] * 0.4 * c
    # Startled: shrink down as it backs off, and slowly come back up.
    w = smoothstep(T_COWER[0], T_COWER[0] + 10, f) * (1 - smoothstep(T_COWER[0] + 18, T_COWER[1], f))
    sy -= COWER[0] * w
    sx += COWER[1] * w
    for i in range(SLIDES):
        start, stop = slide_window(i)
        # Rocks back to push off.
        rotation += ANTICIPATION_LEAN * bump(f, start - ANTICIPATE, start + 6, 0.5)
        # A glance up in the first pauses.
        if i < SLIDES - 1:
            g = bump(f, stop + 4, stop + PAUSE + ANTICIPATE - 2)
            rotation += GLANCE[0] * g
            sy += GLANCE[1] * g
    # Arrived: a breath out.
    s = bump(f, *T_SIGH, 0.4)
    sy -= SIGH * s
    sx += SIGH * 0.5 * s
    return {"rotation": rotation, "sx": sx, "sy": sy}


def breath(f):
    s = 0.5 - 0.5 * math.cos(4 * math.pi * f / IDLE)
    return 1 + BREATHE[0] * s, 1 + BREATHE[1] * s


def idle(f):
    sx, sy = breath(f)
    g = bump(f, *IDLE_GLANCE)
    return {"rotation": GLANCE[0] * g, "sx": sx, "sy": sy + GLANCE[1] * g}


# --- transforms and keys -----------------------------------------------------


def figure_matrix(pose):
    """Tile pixels to artboard pixels."""
    m = node(BASE_AT[0], BASE_AT[1], pose["rotation"], pose["sx"], pose["sy"])
    return mul(m, node(-BASE[0], -BASE[1]))


def pose_channels(at, pose_of):
    channels = {}
    for f in at:
        pose = pose_of(f)
        for prop, key in (("rotation", "rotation"), ("scaleX", "sx"), ("scaleY", "sy")):
            channels.setdefault((IDS["base"], prop), []).append((f, pose[key]))
    return channels


def outline():
    """Points along the figure's edge, in tile pixels, for the artboard checks."""
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
    for name, a, b in [("enter start", enter(0), REST_POSE),
                       ("enter -> idle", enter(ENTER), idle(0)),
                       ("idle loop", idle(0), idle(IDLE))]:
        for k in REST_POSE:
            if abs(a[k] - b[k]) > 1e-4:
                problems.append(f"{name}: {k} jumps {a[k]:.4f} -> {b[k]:.4f}")
    end = travel(ENTER)
    if abs(end[0] - (PEEK - BACK)) > 1e-6 or abs(end[1] - 1) > 1e-6:
        problems.append(f"travel ends at {end}, not ({PEEK - BACK}, 1)")
    # The lean stays gentle.
    worst = max(abs(enter(f)["rotation"]) for f in range(ENTER + 1))
    if worst > 0.12:
        problems.append(f"leans {worst:.3f} rad")
    # The figure stays on the artboard, whatever the pose.
    xs, ys = [], []
    for pose in [enter(f) for f in range(0, ENTER + 1, 2)] + [idle(f) for f in range(0, IDLE, 6)]:
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
    print(f"figure spans x {box[0]:.0f}..{box[2]:.0f}, y {box[1]:.0f}..{box[3]:.0f} of {WIDTH}x{HEIGHT}; "
          f"leans up to {worst:.3f} rad; {ENTER} frames")
    return box


# --- scene -------------------------------------------------------------------


def main():
    edge = outline()
    box = validate(edge)

    enter_keys = keyed(pose_channels(frames(ENTER, STEP_ENTER), enter))
    idle_keys = keyed(pose_channels(frames(IDLE, STEP_IDLE), idle))

    machine = f'''        <StateMachine name="Motion" id="{IDS['machine']}">
            <StateMachineLayer name="Peek" id="{IDS['layer']}">
                <AnyState x="160" y="-120"/>
                <ExitState x="560" y="-120"/>
                <EntryState x="0" y="0">
                    <StateTransition stateToId="{IDS['s_enter']}"/>
                </EntryState>
                <AnimationState x="160" y="0" animationId="{IDS['a_enter']}" id="{IDS['s_enter']}">
                    <StateTransition stateToId="{IDS['s_idle']}" enableExitTime="true"
                                     exitTimeIsPercetange="true" exitTime="100"/>
                </AnimationState>
                <AnimationState x="360" y="0" animationId="{IDS['a_idle']}" id="{IDS['s_idle']}"/>
            </StateMachineLayer>
{blink_layer()}
        </StateMachine>'''

    scene = f'''<Rive version="1" kind="fragment">
    <!-- Generated by gen-scene.py; edit that, not this. -->
    <Artboard defaultStateMachineId="{IDS['machine']}" styleId="{IDS['style']}" width="{WIDTH}" height="{HEIGHT}" name="Curled Peek" id="{IDS['artboard']}">
        <LayoutComponentStyle name="Artboard Style" id="{IDS['style']}"/>

        <Node x="{BASE_AT[0]:.2f}" y="{BASE_AT[1]:.2f}" name="Base" id="{IDS['base']}">
            <!-- Declared first, so it paints on top: the eyes of a generated edit. -->
{blink_image(-BASE[0] + BLINK_XY[0], -BASE[1] + BLINK_XY[1], 12)}
            <Image x="{-BASE[0]:.2f}" y="{-BASE[1]:.2f}" originX="0" originY="0"
                   assetId="{IDS['figure_asset']}" name="Curled" id="{IDS['figure']}"/>
        </Node>

{machine}

        <LinearAnimation loopValue="oneShot" fps="{FPS}" duration="{ENTER}" name="Enter" id="{IDS['a_enter']}">
{enter_keys}
        </LinearAnimation>

        <LinearAnimation loopValue="loop" fps="{FPS}" duration="{IDLE}" name="Idle" id="{IDS['a_idle']}">
{idle_keys}
        </LinearAnimation>

{blink_animation(FPS)}
    </Artboard>

    <ImageAsset file="assets/curled.webp" name="Curled" id="{IDS['figure_asset']}"/>
{blink_asset()}
</Rive>
'''
    with open(os.path.join(HERE, "scene.rml"), "w") as f:
        f.write(scene)

    # What the page needs to move the canvas: everything in artboard px.
    keys = []
    for f in frames(ENTER, STEP_TRAVEL):
        fixed, fraction = travel(f)
        keys.append([f, round(fixed, 2), round(fraction, 5), 0])
    plan = {
        "fps": FPS,
        "artboard": {"width": WIDTH, "height": HEIGHT},
        "figureBox": {"x": FIGURE_BOX[0], "y": FIGURE_BOX[1], "size": TILE},
        "feetY": FIGURE_BOX[1] + FEET_Y,
        "shadow": SHADOW,
        "from": "left",
        "content": {"left": round(box[0], 1), "right": round(box[2], 1)},
        "enterFrames": ENTER,
        "travel": keys,
    }
    with open(os.path.join(HERE, "peek.json"), "w") as f:
        json.dump(plan, f, separators=(",", ":"))
        f.write("\n")
    print(f"wrote scene.rml ({len(scene) // 1024} KB) and peek.json ({len(keys)} travel keys)")


if __name__ == "__main__":
    main()
