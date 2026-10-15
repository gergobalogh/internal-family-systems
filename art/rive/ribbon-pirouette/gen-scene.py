#!/usr/bin/env python3
"""Write scene.rml and pirouette.json: Ribbon pirouettes in on one foot.

    python3 gen-scene.py                       # the shipping scene
    RIBBON_REVIEW=enter python3 gen-scene.py   # default machine plays Enter, for captures

The page owns the travel across the screen; Rive owns everything in place,
in the `Motion` machine:

- `Approach` loops one turn on the standing foot, travelling as it spins,
  rising a little on its toe each time it is side on.
- `Enter` follows once a turn has finished: one more turn on the ground,
  sinking into it to spring, then a hop that turns once more in the air.
  It lands facing out, as in the photo, squashes, slides to a stop and
  wobbles on its one foot, arm out, until it has its balance.
- `Idle`: balancing, swaying very slightly, breathing.

The figure is one photo, ribbon and all, so the spin is the classic 2D
trick: the whole photo is scaled across, through zero, about the standing
foot. Every pose is computed here and keyed frame by frame, from the shared
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
                     frames, hermite, keyed, mul, node, smoothstep)

FPS = 60
WIDTH, HEIGHT = 800, 720

# --- the figure: assets/ribbon.webp, a 640 tile with the feet at 95% ---------

TILE = 640
FIGURE = os.path.join(HERE, "assets", "ribbon.webp")
BLINK_XY = (308.0, 212.0)       # the closed-eye overlay's top-left in the tile (build-assets.sh)
FOOT = (392.0, 606.0)          # in the tile: under the standing foot, which it spins on
FIGURE_BOX = (WIDTH / 2 - FOOT[0], HEIGHT - 16 - FOOT[1])  # the tile's top-left in the artboard
SHADOW = {"x": 0.62, "w": 0.34}  # footprint, as fractions of the tile (as in app.css)

# --- motion ------------------------------------------------------------------

TURN = 28                      # frames a turn: Approach is one
OMEGA = 2 * math.pi / TURN
SPOT = 0.3                     # it lingers facing out (and away) and whips round side on, where it is thin
CYCLE_TRAVEL = 130.0           # artboard px a turn, nominal: the page fits it to the screen
RISE = 5.0                     # px up on its toe, side on

CROUCH = (12, 28, 0.06)        # Enter: sinks into the second turn from this frame to the spring, by this much
AIR = 28                       # frames in the air: the third turn
HOP = 54.0                     # px high
TAKEOFF = TURN                 # Enter frame it leaves the ground
LANDING = TAKEOFF + AIR        # and lands, facing out
STRETCH = 0.05                 # longer as it springs
SQUASH = (0.09, 16.0, 7.0)     # landing: how much, the period and decay of the bounce (frames)
SLIDE = 14                     # frames it slides on landing before it stops
WOBBLE = (0.055, 44.0, 34.0)   # balancing on one foot: how far it tips (rad), period, decay
ENTER = 200
IDLE = 240
IDLE_SWAY = 0.012
BREATHE = (-0.004, 0.010)

STEP_SPIN, STEP_SETTLE, STEP_IDLE, STEP_TRAVEL = 1, 2, 4, 2

REVIEW = os.environ.get("RIBBON_REVIEW", "")

# --- ids ---------------------------------------------------------------------

IDS = {
    "artboard": "0:2", "style": "0:5", "machine": "0:7", "layer": "0:8", "arrive": "0:9",
    "s_approach": "0:12", "s_enter": "0:13", "s_idle": "0:14",
    "a_approach": "0:6", "a_enter": "0:15", "a_idle": "0:16",
    "foot": "0:20", "figure": "0:23",
    "figure_asset": "0:60",
}

FOOT_AT = (FIGURE_BOX[0] + FOOT[0], FIGURE_BOX[1] + FOOT[1])


def figure_matrix(pose):
    """Everything turns, tips, squashes and rises about the standing foot."""
    m = node(FOOT_AT[0], FOOT_AT[1] - pose["lift"], pose["tilt"], pose["sx"], pose["sy"])
    return mul(m, node(-FOOT[0], -FOOT[1]))


# --- travel ------------------------------------------------------------------


def enter_travel(f):
    """In turns' travel: on at a turn's worth a turn until it lands, then a slide to a stop."""
    if f <= LANDING:
        return f / TURN
    return LANDING / TURN + hermite((f - LANDING) / SLIDE, 0, SLIDE / TURN / 2, SLIDE / TURN, 0)


# --- poses -------------------------------------------------------------------

REST_POSE = {"sx": 1.0, "sy": 1.0, "lift": 0.0, "tilt": 0.0}


def breath(f, period, amount):
    s = 0.5 - 0.5 * math.cos(2 * math.pi * f / period)
    return 1 + amount[0] * s, 1 + amount[1] * s


def turned(f):
    """How far round it has turned by frame f: a turn every TURN frames, but
    slower facing out and faster side on, like a dancer spotting."""
    phase = OMEGA * f
    return phase - SPOT * math.sin(2 * phase)


def approach(f):
    angle = turned(f)
    return {"sx": math.cos(angle), "sy": 1.0, "lift": RISE * math.sin(angle) ** 2, "tilt": 0.0}


def hop(t):
    """Height off the ground, t frames after the spring."""
    if not 0 < t < AIR:
        return 0.0
    return 4 * HOP * (t / AIR) * (1 - t / AIR)


def squash(f):
    """The give on landing: the foot takes it, down and back, a little bounce."""
    t = f - LANDING
    if t <= 0:
        return 0.0
    amount, period, decay = SQUASH
    return amount * math.exp(-t / decay) * math.sin(math.pi * t / period) * (1 - smoothstep(ENTER - 60, ENTER - 20, f))


def wobble(f):
    """Tipping forward over the foot from the slide, then back, smaller, to balance."""
    t = f - LANDING - 4
    if t <= 0:
        return 0.0
    amount, period, decay = WOBBLE
    return (amount * math.exp(-t / decay) * math.sin(2 * math.pi * t / period)
            * (1 - smoothstep(ENTER - 50, ENTER - 10, f)))


def enter(f):
    angle = turned(min(f, LANDING))
    start, spring, depth = CROUCH
    crouch = depth * smoothstep(start, spring - 4, f) * (1 - smoothstep(spring - 4, spring, f))
    stretch = STRETCH * smoothstep(spring - 4, spring, f) * (1 - smoothstep(spring, spring + 10, f))
    give = squash(f)
    sx, sy = breath(max(f - LANDING, 0), ENTER - LANDING, BREATHE)
    rise = RISE * math.sin(angle) ** 2 * (1 - smoothstep(0, start, f))
    return {"sx": math.cos(angle) * (1 + crouch / 2 - give / 2) * sx,
            "sy": (1 - crouch + stretch - give) * sy,
            "lift": rise + hop(f - TAKEOFF),
            "tilt": wobble(f)}


def idle(f):
    sx, sy = breath(f, IDLE / 2, BREATHE)
    return {"sx": sx, "sy": sy, "lift": 0.0, "tilt": IDLE_SWAY * math.sin(2 * math.pi * f / IDLE)}


# --- keys --------------------------------------------------------------------


def pose_channels(at, pose_of):
    channels = {}
    for f in at:
        pose = pose_of(f)
        for prop, value in (("y", FOOT_AT[1] - pose["lift"]), ("rotation", pose["tilt"]),
                            ("scaleX", pose["sx"]), ("scaleY", pose["sy"])):
            channels.setdefault((IDS["foot"], prop), []).append((f, value))
    return channels


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
    for name, a, b in [("approach loop", approach(0), approach(TURN)),
                       ("approach -> enter", approach(TURN), enter(0)),
                       ("enter -> idle", enter(ENTER), idle(0)),
                       ("idle loop", idle(0), idle(IDLE))]:
        for k in REST_POSE:
            if abs(a[k] - b[k]) > 1e-4:
                problems.append(f"{name}: {k} jumps {a[k]:.4f} -> {b[k]:.4f}")
    h = 1e-4
    for k in REST_POSE:
        v_cycle = (approach(TURN)[k] - approach(TURN - h)[k]) / h
        v_enter = (enter(h)[k] - enter(0)[k]) / h
        if abs(v_cycle - v_enter) > 1e-3:
            problems.append(f"{k} speed jumps {v_cycle:.5f} -> {v_enter:.5f}")
    if abs(math.cos(turned(LANDING)) - 1) > 1e-9:
        problems.append("it lands side on")
    xs, ys = [], []
    for pose in ([approach(f) for f in range(TURN)] + [enter(f) for f in range(ENTER + 1)]
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

    approach_keys = keyed(pose_channels(frames(TURN, STEP_SPIN), approach))
    enter_at = sorted(set(frames(LANDING + SLIDE, STEP_SPIN)) | set(frames(ENTER, STEP_SETTLE)))
    enter_keys = keyed(pose_channels(enter_at, enter))
    idle_keys = keyed(pose_channels(frames(IDLE, STEP_IDLE), idle))

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
        layer = f'''            <StateMachineLayer name="Pirouette" id="{IDS['layer']}">
                <AnyState x="160" y="-120"/>
                <ExitState x="760" y="-120"/>
                <EntryState x="0" y="0">
                    <StateTransition stateToId="{IDS['s_approach']}"/>
                </EntryState>
                <!-- Finish the turn under way, so Enter starts facing out. -->
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
    <Artboard defaultStateMachineId="{IDS['machine']}" styleId="{IDS['style']}" width="{WIDTH}" height="{HEIGHT}" name="Ribbon Pirouette" id="{IDS['artboard']}">
        <LayoutComponentStyle name="Artboard Style" id="{IDS['style']}"/>

        <Node x="{FOOT_AT[0]:.2f}" y="{FOOT_AT[1]:.2f}" name="Foot" id="{IDS['foot']}">
            <!-- Declared first, so it paints on top: the eyes of a generated edit. -->
{blink_image(-FOOT[0] + BLINK_XY[0], -FOOT[1] + BLINK_XY[1], 12)}
            <Image x="{-FOOT[0]:.2f}" y="{-FOOT[1]:.2f}" originX="0" originY="0"
                   assetId="{IDS['figure_asset']}" name="Ribbon" id="{IDS['figure']}"/>
        </Node>

        <StateMachine name="Motion" id="{IDS['machine']}">
            <StateMachineBool name="arrive" id="{IDS['arrive']}"/>
{layer}
{blink_layer()}
        </StateMachine>

        <LinearAnimation loopValue="loop" fps="{FPS}" duration="{TURN}" name="Approach" id="{IDS['a_approach']}">
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

    <ImageAsset file="assets/ribbon.webp" name="Ribbon" id="{IDS['figure_asset']}"/>
{blink_asset()}
</Rive>
'''
    with open(os.path.join(HERE, "scene.rml"), "w") as f:
        f.write(scene)

    plan = {
        "fps": FPS,
        "artboard": {"width": WIDTH, "height": HEIGHT},
        "figureBox": {"x": FIGURE_BOX[0], "y": FIGURE_BOX[1], "size": TILE},
        "feetY": FOOT_AT[1],
        "shadow": SHADOW,
        "from": "left",
        "content": {"left": round(box[0], 1), "right": round(box[2], 1)},
        "cycle": {
            "frames": TURN,
            "travel": CYCLE_TRAVEL,
            "profile": [[0, 0], [TURN, 1]],
        },
        "enterFrames": ENTER,
        "travel": [[f, 0, 0, round(enter_travel(f), 5)] for f in frames(ENTER, STEP_TRAVEL)],
    }
    with open(os.path.join(HERE, "pirouette.json"), "w") as f:
        json.dump(plan, f, separators=(",", ":"))
        f.write("\n")
    print(f"wrote scene.rml ({len(scene) // 1024} KB) and pirouette.json")


if __name__ == "__main__":
    main()
