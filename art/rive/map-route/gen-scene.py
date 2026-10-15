#!/usr/bin/env python3
"""Write scene.rml and route.json: Map walks its planned route in careful legs.

    python3 gen-scene.py                    # the shipping scene
    MAP_REVIEW=check python3 gen-scene.py   # default machine plays Check, for captures
    MAP_REVIEW=enter python3 gen-scene.py   # ... or Enter

The page owns the route across the screen: a straight leg in from the left,
a stop at the corner, a turn, and a second leg slanting forward to its place,
with a trail of stitches behind it. Rive owns everything in place, in the
`Motion` machine:

- `Approach` loops one careful rock: the wind-up toy walk of Self-hug's
  waddle (art/rive/selfhug-waddle), small and steady.
- `Check` follows when `check` is set and a rock has finished: the rocking
  dies down as it stops at the corner. It looks down at the map, reading
  across it, looks up and leans toward the way the route turns, then rocks
  back onto its left foot and sets off again into `Approach`, at its speed.
- `Enter` follows when `arrive` is set: it stops, checks the map once more
  and straightens up, satisfied.
- `Idle`: breathing, and now and then a glance down at the map.

The page fits whole rocks to each leg, sets `check` during the last rock of
the first and `arrive` during the last of the second, and reads the travel
from route.json: within a rock as a fraction of its travel; in `Check` and
`Enter`, in rocks' travel, so the stop and the start carry the gait's speed.
Every pose is computed here and keyed frame by frame, from the shared
helpers in ../rivegen.py. See docs/rive-entrance-playbook.md.
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
WIDTH, HEIGHT = 520, 680

# --- the figure: assets/map.webp, a 640 tile with the feet at 95% ------------

TILE = 640
FIGURE = os.path.join(HERE, "assets", "map.webp")
BLINK_XY = (236.0, 138.0)       # the closed-eye overlay's top-left in the tile (build-assets.sh)
LEFT_FOOT = (226.0, 603.0)     # in the tile: the outer corner of each sole, what it tips about
RIGHT_FOOT = (354.0, 597.0)
FEET = ((LEFT_FOOT[0] + RIGHT_FOOT[0]) / 2, (LEFT_FOOT[1] + RIGHT_FOOT[1]) / 2)
FIGURE_BOX = (WIDTH / 2 - FEET[0], 46.0)  # the tile's top-left in the artboard
SHADOW = {"x": FEET[0] / TILE, "w": 0.36}  # footprint, as fractions of the tile (as in app.css)

# The route, for the page: the first leg runs this far (artboard px) above the
# resting place, i.e. further back in the meadow, and the second leg covers
# this fraction of the way across.
ROUTE = {"rise": 200, "lastLeg": 0.4}

# --- motion ------------------------------------------------------------------

CYCLE = 44                     # one rock: over onto the right foot and back, then the left
OMEGA = 2 * math.pi / CYCLE
ROCK = 0.05                    # rad either way: careful
CYCLE_TRAVEL = 190.0           # artboard px a rock, nominal: the page fits it to each leg
SHUFFLE = 0.6                  # how much of the travel bunches up while the weight crosses
BREATH = (-0.003, 0.006)       # once a rock
SPEED_OUT = (1 + SHUFFLE) / CYCLE   # rocks' travel a frame, as a rock starts and ends

DIE = 32                       # Check and Enter: frames for the rocking to die down, and the stop
READ = (36, 92)                # Check: looking down at the map, reading across it
LOOK_UP = (84, 118)            # then up, leaning toward the turn
WIND = 32                      # rocking back onto its left foot to set off again
CHECK = 150
DOWN = 0.022                   # squash looking down at the map
ACROSS = 0.022                 # rad, reading across
UP = (0.016, 0.03)             # stretch up, and lean toward the turn (rad)
ENTER = 150
SATISFIED = (44, 120)          # Enter: a last look at the map, then straightening up
IDLE = 360
IDLE_GLANCE = (210, 300)
BREATHE = (-0.004, 0.010)

STEP_CYCLE, STEP_STATE, STEP_IDLE, STEP_TRAVEL = 2, 2, 6, 2

REVIEW = os.environ.get("MAP_REVIEW", "")

# --- ids ---------------------------------------------------------------------

IDS = {
    "artboard": "0:2", "style": "0:5", "machine": "0:7", "layer": "0:8",
    "check": "0:9", "arrive": "0:10",
    "s_approach": "0:12", "s_check": "0:17", "s_enter": "0:13", "s_idle": "0:14",
    "a_approach": "0:6", "a_check": "0:18", "a_enter": "0:15", "a_idle": "0:16",
    "right": "0:20", "left": "0:21", "breath": "0:22", "figure": "0:23",
    "figure_asset": "0:60",
}

RIGHT_AT = (FIGURE_BOX[0] + RIGHT_FOOT[0], FIGURE_BOX[1] + RIGHT_FOOT[1])
LEFT_AT = (LEFT_FOOT[0] - RIGHT_FOOT[0], LEFT_FOOT[1] - RIGHT_FOOT[1])
BREATH_AT = (FEET[0] - LEFT_FOOT[0], FEET[1] - LEFT_FOOT[1])


def figure_matrix(pose):
    m = node(*RIGHT_AT, max(pose["tip"], 0.0))
    m = mul(m, node(*LEFT_AT, min(pose["tip"], 0.0)))
    m = mul(m, node(*BREATH_AT, 0, pose["sx"], pose["sy"]))
    return mul(m, node(-FEET[0], -FEET[1]))


# --- travel (in rocks' travel) -----------------------------------------------


def cycle_travel(f):
    return f / CYCLE + SHUFFLE / (2 * OMEGA * CYCLE) * math.sin(2 * OMEGA * f)


def stopping(f):
    """Out of a rock at its speed, to a stop at DIE."""
    s = min(max(f / DIE, 0.0), 1.0)
    return hermite(s, 0, SPEED_OUT * DIE / 2.4, SPEED_OUT * DIE, 0)


CORNER = stopping(DIE)         # rocks' travel from the start of Check to the corner


def check_travel(f):
    """Stops at the corner, stands, and sets off again, reaching a rock's speed at the end."""
    if f <= CHECK - WIND:
        return stopping(f)
    s = (f - (CHECK - WIND)) / WIND
    return CORNER + hermite(s, 0, SPEED_OUT * WIND / 2.4, 0, SPEED_OUT * WIND)


# --- poses -------------------------------------------------------------------

REST_POSE = {"tip": 0.0, "sx": 1.0, "sy": 1.0}


def breath(f, period, amount):
    s = 0.5 - 0.5 * math.cos(2 * math.pi * f / period)
    return 1 + amount[0] * s, 1 + amount[1] * s


def bump(f, span):
    """0 outside span, rising to 1 and back, smoothly."""
    a, b = span
    return smoothstep(a, (a + b) / 2, f) * (1 - smoothstep((a + b) / 2, b, f))


def approach(f):
    sx, sy = breath(f, CYCLE, BREATH)
    return {"tip": ROCK * math.sin(OMEGA * f), "sx": sx, "sy": sy}


def check(f):
    tip = damped_to_rest(f, ROCK * OMEGA, DIE)
    reading = bump(f, READ)
    tip += ACROSS * reading * math.sin(2 * math.pi * (f - READ[0]) / (READ[1] - READ[0]) * 1.5)
    up = bump(f, LOOK_UP)
    tip += UP[1] * up
    t = f - (CHECK - WIND)
    if t > 0:
        tip += -ROCK * OMEGA * (WIND - t) * (t / WIND) ** 2
    sx, sy = breath(f, CHECK, BREATHE)
    return {"tip": tip, "sx": sx * (1 + DOWN * 0.5 * reading),
            "sy": sy * (1 - DOWN * reading + UP[0] * up)}


def enter(f):
    tip = damped_to_rest(f, ROCK * OMEGA, DIE)
    a, b = SATISFIED
    looking = bump(f, (a, (a + b) / 2 + 10))
    up = bump(f, ((a + b) / 2 - 10, b))
    sx, sy = breath(f, ENTER, BREATHE)
    return {"tip": tip, "sx": sx * (1 + DOWN * 0.5 * looking),
            "sy": sy * (1 - DOWN * looking + UP[0] * up)}


def idle(f):
    sx, sy = breath(f, IDLE / 2, BREATHE)
    glance = bump(f, IDLE_GLANCE)
    return {"tip": 0.0, "sx": sx * (1 + DOWN * 0.3 * glance), "sy": sy * (1 - DOWN * 0.6 * glance)}


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
    """Key frames, plus both frames around wherever the tip crosses zero."""
    at = set(frames(duration, step))
    tips = [pose_of(f)["tip"] for f in range(duration + 1)]
    for f, (a, b) in enumerate(zip(tips, tips[1:])):
        if a * b < 0 or (abs(a) < 1e-9) != (abs(b) < 1e-9):
            at.update((f, f + 1))
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
                       ("approach -> check", approach(CYCLE), check(0)),
                       ("check -> approach", check(CHECK), approach(0)),
                       ("approach -> enter", approach(CYCLE), enter(0)),
                       ("enter -> idle", enter(ENTER), idle(0)),
                       ("idle loop", idle(0), idle(IDLE))]:
        for k in REST_POSE:
            if abs(a[k] - b[k]) > 1e-4:
                problems.append(f"{name}: {k} jumps {a[k]:.4f} -> {b[k]:.4f}")
    h = 1e-4
    speed = (approach(CYCLE)["tip"] - approach(CYCLE - h)["tip"]) / h
    for name, v in [("check starts", (check(h)["tip"] - check(0)["tip"]) / h),
                    ("check ends", (check(CHECK)["tip"] - check(CHECK - h)["tip"]) / h),
                    ("enter starts", (enter(h)["tip"] - enter(0)["tip"]) / h)]:
        if abs(v - speed) > 1e-4:
            problems.append(f"{name}: tip speed {v:.5f}, the rock's {speed:.5f}")
    for name, v in [("check starts", (check_travel(h) - check_travel(0)) / h),
                    ("check ends", (check_travel(CHECK) - check_travel(CHECK - h)) / h),
                    ("a rock", (cycle_travel(h) - cycle_travel(0)) / h)]:
        if abs(v - SPEED_OUT) > 1e-4:
            problems.append(f"{name}: travel speed {v:.5f}, not {SPEED_OUT:.5f}")
    if any(check_travel(f + 1) < check_travel(f) - 1e-9 for f in range(CHECK)):
        problems.append("check travel goes backwards")
    xs, ys = [], []
    for pose in ([approach(f) for f in range(CYCLE)] + [check(f) for f in range(0, CHECK + 1, 2)]
                 + [enter(f) for f in range(0, ENTER + 1, 2)] + [idle(f) for f in range(0, IDLE, 6)]):
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
    if REVIEW in ("check", "enter"):
        state, animation = (IDS["s_check"], IDS["a_check"]) if REVIEW == "check" else (IDS["s_enter"], IDS["a_enter"])
        return f'''            <StateMachineLayer name="Review" id="{IDS['layer']}">
                <AnyState x="160" y="-120"/>
                <ExitState x="560" y="-120"/>
                <EntryState x="0" y="0">
                    <StateTransition stateToId="{state}"/>
                </EntryState>
                <AnimationState x="160" y="0" animationId="{animation}" id="{state}"/>
            </StateMachineLayer>'''
    return f'''            <StateMachineLayer name="Route" id="{IDS['layer']}">
                <AnyState x="160" y="-120"/>
                <ExitState x="760" y="-120"/>
                <EntryState x="0" y="0">
                    <StateTransition stateToId="{IDS['s_approach']}"/>
                </EntryState>
                <!-- Each finishes the rock under way, so Check and Enter start where a rock does. -->
                <AnimationState x="160" y="0" animationId="{IDS['a_approach']}" id="{IDS['s_approach']}">
                    <StateTransition stateToId="{IDS['s_check']}" enableExitTime="true"
                                     exitTimeIsPercetange="true" exitTime="100">
                        <TransitionBoolCondition inputId="{IDS['check']}" opValue="equal"/>
                    </StateTransition>
                    <StateTransition stateToId="{IDS['s_enter']}" enableExitTime="true"
                                     exitTimeIsPercetange="true" exitTime="100">
                        <TransitionBoolCondition inputId="{IDS['arrive']}" opValue="equal"/>
                    </StateTransition>
                </AnimationState>
                <!-- Check ends setting off again, at the start of a rock. -->
                <AnimationState x="160" y="160" animationId="{IDS['a_check']}" id="{IDS['s_check']}">
                    <StateTransition stateToId="{IDS['s_approach']}" enableExitTime="true"
                                     exitTimeIsPercetange="true" exitTime="100"/>
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

    approach_keys = keyed(pose_channels(tip_frames(CYCLE, STEP_CYCLE, approach), approach))
    check_keys = keyed(pose_channels(tip_frames(CHECK, STEP_STATE, check), check))
    enter_keys = keyed(pose_channels(tip_frames(ENTER, STEP_STATE, enter), enter))
    idle_keys = keyed(pose_channels(frames(IDLE, STEP_IDLE), idle))

    scene = f'''<Rive version="1" kind="fragment">
    <!-- Generated by gen-scene.py; edit that, not this. -->
    <Artboard defaultStateMachineId="{IDS['machine']}" styleId="{IDS['style']}" width="{WIDTH}" height="{HEIGHT}" name="Map Route" id="{IDS['artboard']}">
        <LayoutComponentStyle name="Artboard Style" id="{IDS['style']}"/>

        <Node x="{RIGHT_AT[0]:.2f}" y="{RIGHT_AT[1]:.2f}" name="Right Foot" id="{IDS['right']}">
            <Node x="{LEFT_AT[0]:.2f}" y="{LEFT_AT[1]:.2f}" name="Left Foot" id="{IDS['left']}">
                <Node x="{BREATH_AT[0]:.2f}" y="{BREATH_AT[1]:.2f}" name="Breath" id="{IDS['breath']}">
                    <!-- Declared first, so it paints on top: the eyes of a generated edit. -->
{blink_image(-FEET[0] + BLINK_XY[0], -FEET[1] + BLINK_XY[1], 20)}
                    <Image x="{-FEET[0]:.2f}" y="{-FEET[1]:.2f}" originX="0" originY="0"
                           assetId="{IDS['figure_asset']}" name="Map" id="{IDS['figure']}"/>
                </Node>
            </Node>
        </Node>

        <StateMachine name="Motion" id="{IDS['machine']}">
            <StateMachineBool name="check" id="{IDS['check']}"/>
            <StateMachineBool name="arrive" id="{IDS['arrive']}"/>
{state_layer()}
{blink_layer()}
        </StateMachine>

        <LinearAnimation loopValue="loop" fps="{FPS}" duration="{CYCLE}" name="Approach" id="{IDS['a_approach']}">
{approach_keys}
        </LinearAnimation>

        <LinearAnimation loopValue="oneShot" fps="{FPS}" duration="{CHECK}" name="Check" id="{IDS['a_check']}">
{check_keys}
        </LinearAnimation>

        <LinearAnimation loopValue="oneShot" fps="{FPS}" duration="{ENTER}" name="Enter" id="{IDS['a_enter']}">
{enter_keys}
        </LinearAnimation>

        <LinearAnimation loopValue="loop" fps="{FPS}" duration="{IDLE}" name="Idle" id="{IDS['a_idle']}">
{idle_keys}
        </LinearAnimation>

{blink_animation(FPS)}
    </Artboard>

    <ImageAsset file="assets/map.webp" name="Map" id="{IDS['figure_asset']}"/>
{blink_asset()}
</Rive>
'''
    with open(os.path.join(HERE, "scene.rml"), "w") as f:
        f.write(scene)

    plan = {
        "fps": FPS,
        "artboard": {"width": WIDTH, "height": HEIGHT},
        "figureBox": {"x": FIGURE_BOX[0], "y": FIGURE_BOX[1], "size": TILE},
        "feet": {"x": FIGURE_BOX[0] + FEET[0], "y": FIGURE_BOX[1] + FEET[1]},
        "feetY": FIGURE_BOX[1] + FEET[1],
        "shadow": SHADOW,
        "content": {"left": round(box[0], 1), "right": round(box[2], 1)},
        "route": ROUTE,
        "cycle": {
            "frames": CYCLE,
            "travel": CYCLE_TRAVEL,
            "profile": [[f, round(cycle_travel(f), 5)] for f in frames(CYCLE, STEP_TRAVEL)],
        },
        "check": {
            "frames": CHECK,
            "corner": round(CORNER, 5),
            "travel": [[f, round(check_travel(f), 5)] for f in frames(CHECK, STEP_TRAVEL)],
        },
        "enter": {
            "frames": ENTER,
            "travel": [[f, round(stopping(f), 5)] for f in frames(ENTER, STEP_TRAVEL)],
        },
    }
    with open(os.path.join(HERE, "route.json"), "w") as f:
        json.dump(plan, f, separators=(",", ":"))
        f.write("\n")
    print(f"wrote scene.rml ({len(scene) // 1024} KB) and route.json")


if __name__ == "__main__":
    main()
