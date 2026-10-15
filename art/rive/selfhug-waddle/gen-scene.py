#!/usr/bin/env python3
"""Write scene.rml and waddle.json: Self-hug rocks in like a wind-up felt toy.

    python3 gen-scene.py                       # the shipping scene
    SELFHUG_REVIEW=enter python3 gen-scene.py  # default machine plays Enter, for captures

The page owns the travel across the screen; Rive owns everything in place,
in the `Motion` machine:

- `Approach` loops one rock: it tips onto the outer edge of its right foot,
  the left foot lifting, then over onto the outer edge of its left. Like a
  wind-up toy it shuffles along as it goes, fastest while its weight
  crosses from one foot to the other and nearly still while it stands on one.
- `Enter` follows once a rock has finished: the rocking dies down as it
  glides to a stop. It stands a moment, then leans over onto its right foot,
  toward the empty space beside it, and stays there a while before it comes
  back.
- `Idle` rocks itself, very gently, and breathes.

A rigid figure cannot rock its way along without its feet slipping: each tip
about a foot undoes itself. A wind-up toy's feet do slip, so this one does
too, mostly while its weight is crossing over.

The page fits whole rocks to the screen, sets `arrive` during the last one,
and reads the travel from waddle.json: within a rock, as a fraction of the
rock's travel; in `Enter`, in rocks' travel too, so the glide out of the last
rock carries on at its speed. Every pose is computed here and keyed frame by
frame, from the shared helpers in ../rivegen.py. See
docs/rive-entrance-playbook.md.
"""

import json
import math
import os
import sys

from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.dirname(HERE))
from rivegen import (apply, blink_animation, blink_asset, blink_image, blink_layer, damped_to_rest,  # noqa: E402
                     frames, hermite, keyed, mul, node, smoothstep)

FPS = 60
WIDTH, HEIGHT = 520, 660

# --- the figure: assets/selfhug.webp, a 640 tile with the feet at 95% --------

TILE = 640
FIGURE = os.path.join(HERE, "assets", "selfhug.webp")
BLINK_XY = (298.0, 111.0)       # the closed-eye overlay's top-left in the tile (build-assets.sh)
LEFT_FOOT = (262.0, 600.0)     # in the tile: the outer corner of each sole, what it tips about
RIGHT_FOOT = (378.0, 594.0)
FEET = ((LEFT_FOOT[0] + RIGHT_FOOT[0]) / 2, (LEFT_FOOT[1] + RIGHT_FOOT[1]) / 2)
FIGURE_BOX = (WIDTH / 2 - FEET[0], 36.0)  # the tile's top-left in the artboard
SHADOW = {"x": 0.5, "w": 0.42}  # footprint, as fractions of the tile (as in app.css)

# --- motion ------------------------------------------------------------------

CYCLE = 60                     # one rock: over onto the right foot and back, then the left
OMEGA = 2 * math.pi / CYCLE
ROCK = 0.075                   # rad either way: lifts the other foot ~9 px
CYCLE_TRAVEL = 190.0           # artboard px per rock, nominal: the page fits it to the screen
SHUFFLE = 0.8                  # how much of the travel bunches up while the weight crosses
BREATH = (-0.004, 0.008)       # once per rock

DIE = 46                       # Enter: frames for the rocking to die down and the glide to stop
STAND = (DIE, DIE + 30)
LEAN = (STAND[1], STAND[1] + 150)   # leans over toward the space beside it, stays, comes back
LEAN_ANGLE = 0.05
ENTER = LEAN[1] + 24
IDLE = 300
IDLE_ROCK = 0.012              # rocking itself, twice per Idle
BREATHE = (-0.004, 0.010)

STEP_CYCLE, STEP_ENTER, STEP_IDLE, STEP_TRAVEL = 2, 2, 6, 2

REVIEW = os.environ.get("SELFHUG_REVIEW", "")

# --- ids ---------------------------------------------------------------------

IDS = {
    "artboard": "0:2", "style": "0:5", "machine": "0:7", "layer": "0:8", "arrive": "0:9",
    "s_approach": "0:12", "s_enter": "0:13", "s_idle": "0:14",
    "a_approach": "0:6", "a_enter": "0:15", "a_idle": "0:16",
    "right": "0:20", "left": "0:21", "breath": "0:22", "figure": "0:23",
    "figure_asset": "0:60",
}

# The rig: Right (at the right foot's corner, tips clockwise) > Left (at the
# left foot's corner, tips anticlockwise) > Breath (at the feet) > the image.
# Only one of the two tips is ever non-zero, so each turns about its own foot.
RIGHT_AT = (FIGURE_BOX[0] + RIGHT_FOOT[0], FIGURE_BOX[1] + RIGHT_FOOT[1])
LEFT_AT = (LEFT_FOOT[0] - RIGHT_FOOT[0], LEFT_FOOT[1] - RIGHT_FOOT[1])
BREATH_AT = (FEET[0] - LEFT_FOOT[0], FEET[1] - LEFT_FOOT[1])


def figure_matrix(pose):
    """Tile pixels to artboard pixels."""
    m = node(*RIGHT_AT, max(pose["tip"], 0.0))
    m = mul(m, node(*LEFT_AT, min(pose["tip"], 0.0)))
    m = mul(m, node(*BREATH_AT, 0, pose["sx"], pose["sy"]))
    return mul(m, node(-FEET[0], -FEET[1]))


# --- travel ------------------------------------------------------------------


def cycle_travel(f):
    """Fraction of a rock's travel done at frame f of it: bunched up where the
    weight crosses over (f = 0, CYCLE/2), nearly still on one foot."""
    return f / CYCLE + SHUFFLE / (2 * OMEGA * CYCLE) * math.sin(2 * OMEGA * f)


SPEED_OUT = (1 + SHUFFLE) / CYCLE      # rocks' travel per frame, leaving the last rock


def enter_travel(f):
    """Rocks' travel in Enter: the glide out of the last rock, coming to a stop."""
    s = min(max(f / DIE, 0.0), 1.0)
    # Leaves at SPEED_OUT, stops; a Hermite with no overshoot needs the
    # distance at least a third of the leaving slope.
    return hermite(s, 0, SPEED_OUT * DIE / 2.4, SPEED_OUT * DIE, 0)


# --- poses -------------------------------------------------------------------

REST_POSE = {"tip": 0.0, "sx": 1.0, "sy": 1.0}


def breath(f, period, amount):
    s = 0.5 - 0.5 * math.cos(2 * math.pi * f / period)
    return 1 + amount[0] * s, 1 + amount[1] * s


def approach(f):
    sx, sy = breath(f, CYCLE, BREATH)
    return {"tip": ROCK * math.sin(OMEGA * f), "sx": sx, "sy": sy}


def enter(f):
    tip = damped_to_rest(f, ROCK * OMEGA, DIE)
    span = LEAN[1] - LEAN[0]
    tip += LEAN_ANGLE * smoothstep(LEAN[0], LEAN[0] + 0.3 * span, f) * (1 - smoothstep(LEAN[1] - 0.25 * span, LEAN[1], f))
    sx, sy = breath(f, ENTER, BREATHE)
    return {"tip": tip, "sx": sx, "sy": sy}


def idle(f):
    sx, sy = breath(f, IDLE / 2, BREATHE)
    return {"tip": IDLE_ROCK * math.sin(4 * math.pi * f / IDLE), "sx": sx, "sy": sy}


# --- keys --------------------------------------------------------------------


def pose_channels(at, pose_of):
    channels = {}
    for f in at:
        pose = pose_of(f)
        for object_id, prop, value in ((IDS["right"], "rotation", max(pose["tip"], 0.0)),
                                       (IDS["left"], "rotation", min(pose["tip"], 0.0)),
                                       (IDS["breath"], "scaleX", pose["sx"]),
                                       (IDS["breath"], "scaleY", pose["sy"])):
            channels.setdefault((object_id, prop), []).append((f, value))
    return channels


def tip_frames(duration, step, pose_of):
    """Key frames, plus every frame where the tip changes sides, so that each
    foot's rotation is keyed to zero exactly there. (Keys sit on whole
    frames, and so do the rocks' crossings.)"""
    at = set(frames(duration, step))
    for f in range(duration + 1):
        before, now = pose_of(max(f - 0.5, 0))["tip"], pose_of(f)["tip"]
        if abs(now) < 1e-9 or before * now < 0:
            at.add(f)
    return sorted(at)


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
    for name, a, b in [("approach loop", approach(0), approach(CYCLE)),
                       ("approach -> enter", approach(CYCLE), enter(0)),
                       ("enter -> idle", enter(ENTER), idle(0)),
                       ("idle loop", idle(0), idle(IDLE))]:
        for k in REST_POSE:
            if abs(a[k] - b[k]) > 1e-4:
                problems.append(f"{name}: {k} jumps {a[k]:.4f} -> {b[k]:.4f}")
    h = 1e-4
    v_cycle = (approach(CYCLE)["tip"] - approach(CYCLE - h)["tip"]) / h
    v_enter = (enter(h)["tip"] - enter(0)["tip"]) / h
    if abs(v_cycle - v_enter) > 1e-5:
        problems.append(f"tip speed jumps {v_cycle:.5f} -> {v_enter:.5f}")
    t_cycle = (cycle_travel(CYCLE) - cycle_travel(CYCLE - h)) / h
    t_enter = (enter_travel(h) - enter_travel(0)) / h
    if abs(t_cycle - t_enter) > 1e-6 or abs(cycle_travel(CYCLE) - 1) > 1e-9:
        problems.append(f"travel speed jumps {t_cycle:.5f} -> {t_enter:.5f}")
    glide = [enter_travel(f) for f in range(DIE + 1)]
    if any(b < a - 1e-12 for a, b in zip(glide, glide[1:])):
        problems.append("the glide goes back")
    # The feet stay on the ground: the lower foot never sinks below it.
    for f in range(CYCLE):
        m = figure_matrix(approach(f))
        for foot in (LEFT_FOOT, RIGHT_FOOT):
            y = apply(m, foot)[1] - (FIGURE_BOX[1] + foot[1])
            if y > 0.6:
                problems.append(f"a foot sinks {y:.2f} px at frame {f}")
                break
    xs, ys = [], []
    for pose in ([approach(f) for f in range(CYCLE)] + [enter(f) for f in range(0, ENTER + 1, 2)]
                 + [idle(f) for f in range(0, IDLE, 6)]):
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


def main():
    edge = outline()
    box = validate(edge)

    approach_keys = keyed(pose_channels(tip_frames(CYCLE, STEP_CYCLE, approach), approach))
    enter_keys = keyed(pose_channels(tip_frames(ENTER, STEP_ENTER, enter), enter))
    idle_keys = keyed(pose_channels(tip_frames(IDLE, STEP_IDLE, idle), idle))

    if REVIEW == "enter":
        layer = f'''            <StateMachineLayer name="Review" id="{IDS['layer']}">
                <AnyState x="160" y="-120"/>
                <ExitState x="560" y="-120"/>
                <EntryState x="0" y="0">
                    <StateTransition stateToId="{IDS['s_enter']}"/>
                </EntryState>
                <AnimationState x="160" y="0" animationId="{IDS['a_enter']}" id="{IDS['s_enter']}"/>
            </StateMachineLayer>'''
    else:
        layer = f'''            <StateMachineLayer name="Waddle" id="{IDS['layer']}">
                <AnyState x="160" y="-120"/>
                <ExitState x="760" y="-120"/>
                <EntryState x="0" y="0">
                    <StateTransition stateToId="{IDS['s_approach']}"/>
                </EntryState>
                <!-- Finish the rock under way, so Enter starts with the weight crossing over. -->
                <AnimationState x="160" y="0" animationId="{IDS['a_approach']}" id="{IDS['s_approach']}">
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

    scene = f'''<Rive version="1" kind="fragment">
    <!-- Generated by gen-scene.py; edit that, not this. -->
    <Artboard defaultStateMachineId="{IDS['machine']}" styleId="{IDS['style']}" width="{WIDTH}" height="{HEIGHT}" name="Self-hug Waddle" id="{IDS['artboard']}">
        <LayoutComponentStyle name="Artboard Style" id="{IDS['style']}"/>

        <Node x="{RIGHT_AT[0]:.2f}" y="{RIGHT_AT[1]:.2f}" name="Right Foot" id="{IDS['right']}">
            <Node x="{LEFT_AT[0]:.2f}" y="{LEFT_AT[1]:.2f}" name="Left Foot" id="{IDS['left']}">
                <Node x="{BREATH_AT[0]:.2f}" y="{BREATH_AT[1]:.2f}" name="Breath" id="{IDS['breath']}">
                    <!-- Declared first, so it paints on top: the eyes of a generated edit. -->
{blink_image(-FEET[0] + BLINK_XY[0], -FEET[1] + BLINK_XY[1], 20)}
                    <Image x="{-FEET[0]:.2f}" y="{-FEET[1]:.2f}" originX="0" originY="0"
                           assetId="{IDS['figure_asset']}" name="Self-hug" id="{IDS['figure']}"/>
                </Node>
            </Node>
        </Node>

        <StateMachine name="Motion" id="{IDS['machine']}">
            <StateMachineBool name="arrive" id="{IDS['arrive']}"/>
{layer}
{blink_layer()}
        </StateMachine>

        <LinearAnimation loopValue="loop" fps="{FPS}" duration="{CYCLE}" name="Approach" id="{IDS['a_approach']}">
{approach_keys}
        </LinearAnimation>

        <LinearAnimation loopValue="oneShot" fps="{FPS}" duration="{ENTER}" name="Enter" id="{IDS['a_enter']}">
{enter_keys}
        </LinearAnimation>

        <LinearAnimation loopValue="loop" fps="{FPS}" duration="{IDLE}" name="Idle" id="{IDS['a_idle']}">
{idle_keys}
        </LinearAnimation>

{blink_animation(FPS)}
    </Artboard>

    <ImageAsset file="assets/selfhug.webp" name="Self-hug" id="{IDS['figure_asset']}"/>
{blink_asset()}
</Rive>
'''
    with open(os.path.join(HERE, "scene.rml"), "w") as f:
        f.write(scene)

    plan = {
        "fps": FPS,
        "artboard": {"width": WIDTH, "height": HEIGHT},
        "figureBox": {"x": FIGURE_BOX[0], "y": FIGURE_BOX[1], "size": TILE},
        "feetY": FIGURE_BOX[1] + FEET[1],
        "shadow": SHADOW,
        "from": "left",
        "content": {"left": round(box[0], 1), "right": round(box[2], 1)},
        "cycle": {
            "frames": CYCLE,
            "travel": CYCLE_TRAVEL,
            "profile": [[f, round(cycle_travel(f), 5)] for f in frames(CYCLE, STEP_TRAVEL)],
        },
        "enterFrames": ENTER,
        "travel": [[f, 0, 0, round(enter_travel(f), 5)] for f in frames(ENTER, STEP_TRAVEL)],
    }
    with open(os.path.join(HERE, "waddle.json"), "w") as f:
        json.dump(plan, f, separators=(",", ":"))
        f.write("\n")
    print(f"wrote scene.rml ({len(scene) // 1024} KB) and waddle.json; "
          f"glide out {enter_travel(DIE):.2f} rocks")


if __name__ == "__main__":
    main()
