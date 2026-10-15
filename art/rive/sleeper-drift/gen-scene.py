#!/usr/bin/env python3
"""Write scene.rml and drift.json: the Sleeper drifts down asleep like a falling leaf.

    python3 gen-scene.py                      # the shipping scene
    SLEEPER_REVIEW=land python3 gen-scene.py  # default machine plays Land, for captures

The page owns the descent: it moves the canvas down the screen and sets `land`
during the last swing. Rive owns everything in place, in the `Motion` machine:

- `Descend` loops one swing of a long pendulum hung from well above the
  figure. The body travels out on the arc and rises at each end, tilting into
  the swing with its outer edge up, then slides back down through the middle,
  like a leaf. It breathes once per swing.
- `Land` follows once a swing has finished: the flare damps the swing out, the
  Sleeper touches down at FLARE (the page stops its travel on the same frame)
  and settles into a soft, small squash without waking.
- `Idle` is the Sleeper asleep: slower, deeper breaths.

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
from rivegen import apply, damped_to_rest, frames, keyed, mul, node, smoothstep  # noqa: E402

FPS = 60
WIDTH, HEIGHT = 840, 420
CENTRE_X = WIDTH / 2

# --- the figure: assets/sleeper.webp, the app's 640 tile with the feet at 95% --

TILE = 640
FIGURE = os.path.join(HERE, "assets", "sleeper.webp")
FIGURE_BOX = (CENTRE_X - TILE / 2, -221.0)  # the tile's top-left in the artboard: its
                                             # empty top third sticks out above
FEET = (333.0, 600.0)         # in the tile: middle of where it rests, the squash origin
BODY = (330.0, 470.0)         # in the tile: the tilt turns about this, the middle of the body
SHADOW = {"x": 0.52, "w": 0.8}  # footprint, as fractions of the tile (as in app.css)

# --- motion ------------------------------------------------------------------

CYCLE = 160                   # one swing out and back on both sides, frames
OMEGA = 2 * math.pi / CYCLE
SWING = 0.34                  # pendulum amplitude, rad
RADIUS = 400.0                # the pivot is this far above BODY
TILT = 0.75                   # the visible tilt, as a fraction of the swing angle
LIFT = 26.0                   # extra rise at each end of the swing, px
BREATH = (-0.004, 0.010)      # breathing while it drifts, scale x / y, once per swing

FLARE = 64                    # Land frames before it touches down
TOUCHDOWN_SPEED = 0.6         # artboard px per frame when it does
SQUASH = 0.03                 # and it sinks softly into the ground
SQUASH_PERIOD = 48
SQUASH_DECAY = 22.0
LAND = CYCLE                  # one breath, so Land hands Idle an out-breath
IDLE = 270
BREATHE = (-0.006, 0.014)     # asleep on the ground: slower and deeper
BLINK_DURATION = 600
BLINK_KEYS = [(155, 163), (479, 487)]
BLINK_XY = (232.0, 376.0)     # cropped overlay's top-left in the 640 figure tile

STEP_DESCEND, STEP_LAND, STEP_IDLE = 4, 2, 6

REVIEW = os.environ.get("SLEEPER_REVIEW", "")

# --- ids ---------------------------------------------------------------------

IDS = {
    "artboard": "0:2", "style": "0:5", "machine": "0:7", "layer": "0:8", "land": "0:9",
    "blink_layer": "0:10", "blink_state": "0:11", "a_blink": "0:17",
    "s_descend": "0:12", "s_land": "0:13", "s_idle": "0:14",
    "a_descend": "0:6", "a_land": "0:15", "a_idle": "0:16",
    "lift": "0:20", "rig": "0:21", "tilt": "0:22", "squash": "0:23", "figure": "0:24",
    "blink": "0:25", "figure_asset": "0:60", "blink_asset": "0:61",
}

# --- the rig at rest ---------------------------------------------------------
# Lift (at the pivot, moves up) > Rig (swings) > Tilt (at BODY, turns some of
# the swing back) > Squash (at FEET) > the image.

PIVOT = (FIGURE_BOX[0] + BODY[0], FIGURE_BOX[1] + BODY[1] - RADIUS)
TILT_AT = (0.0, RADIUS)
SQUASH_AT = (FEET[0] - BODY[0], FEET[1] - BODY[1])


def figure_matrix(pose):
    """Tile pixels to artboard pixels."""
    m = node(PIVOT[0], PIVOT[1] - pose["lift"])
    m = mul(m, node(0, 0, pose["rig"]))
    m = mul(m, node(*TILT_AT, pose["tilt"]))
    m = mul(m, node(*SQUASH_AT, 0, pose["sx"], pose["sy"]))
    return mul(m, node(-FEET[0], -FEET[1]))


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


# --- poses -------------------------------------------------------------------

REST_POSE = {"lift": 0.0, "rig": 0.0, "tilt": 0.0, "sx": 1.0, "sy": 1.0}


def swung(angle):
    """The pendulum at `angle`: it rises at the ends, and turns back part of the tilt."""
    return {"rig": angle, "tilt": -(1 - TILT) * angle, "lift": LIFT * (angle / SWING) ** 2}


def breath(f, period, amount):
    s = 0.5 - 0.5 * math.cos(2 * math.pi * f / period)
    return 1 + amount[0] * s, 1 + amount[1] * s


def descend(f):
    sx, sy = breath(f, CYCLE, BREATH)
    return {**REST_POSE, **swung(SWING * math.sin(OMEGA * f)), "sx": sx, "sy": sy}


def land(f):
    # The swing under way at the cycle boundary, damped out so it touches down
    # level and still: zero angle and zero angular velocity at FLARE.
    pose = {**REST_POSE, **swung(damped_to_rest(f, SWING * OMEGA, FLARE))}
    sx, sy = breath(f, LAND, BREATH)
    t = f - FLARE
    if t >= 0:
        # Ends at rest, exactly, with Land.
        wave = (math.exp(-t / SQUASH_DECAY) * math.sin(2 * math.pi * t / SQUASH_PERIOD)
                * (1 - smoothstep(LAND - FLARE - 30, LAND - FLARE, t)))
        sy *= 1 - SQUASH * wave
        sx *= 1 + 0.5 * SQUASH * wave
    pose["sx"], pose["sy"] = sx, sy
    return pose


def idle(f):
    sx, sy = breath(f, IDLE, BREATHE)
    return {**REST_POSE, "sx": sx, "sy": sy}


# --- keyframes ---------------------------------------------------------------


def pose_channels(at, pose_of):
    channels = {}

    def put(object_id, prop, frame, value):
        channels.setdefault((object_id, prop), []).append((frame, value))

    for f in at:
        pose = pose_of(f)
        put(IDS["lift"], "y", f, PIVOT[1] - pose["lift"])
        put(IDS["rig"], "rotation", f, pose["rig"])
        put(IDS["tilt"], "rotation", f, pose["tilt"])
        put(IDS["squash"], "scaleX", f, pose["sx"])
        put(IDS["squash"], "scaleY", f, pose["sy"])
    return channels


# --- checks ------------------------------------------------------------------


def validate(edge):
    problems = []
    # The loop and the hand-offs must not jump.
    for name, a, b in [("descend loop", descend(0), descend(CYCLE)),
                       ("descend -> land", descend(CYCLE), land(0)),
                       ("land -> idle", land(LAND), idle(0))]:
        for k in REST_POSE:
            if abs(a[k] - b[k]) > 1e-3:
                problems.append(f"{name}: {k} jumps {a[k]:.4f} -> {b[k]:.4f}")
    # Speeds carry across the cycle boundary into the flare.
    h = 1e-4
    for k, allowed in (("rig", 1e-5), ("lift", 1e-3)):
        v_descend = (descend(CYCLE)[k] - descend(CYCLE - h)[k]) / h
        v_land = (land(h)[k] - land(0)[k]) / h
        if abs(v_descend - v_land) > allowed:
            problems.append(f"{k} speed jumps {v_descend:.5f} -> {v_land:.5f} per frame")
    # Touchdown: it rests where the page parks it, level and still.
    td, after = land(FLARE), land(FLARE + 1)
    for k in ("rig", "tilt", "lift"):
        if abs(td[k]) > 1e-6 or abs(after[k]) > 1e-6:
            problems.append(f"not at rest at touchdown: {k} {td[k]:.5f}")
    # The figure stays on the artboard, whatever the pose.
    poses = ([descend(f) for f in range(CYCLE)] + [land(f) for f in range(LAND + 1)]
             + [idle(f) for f in range(0, IDLE, 3)])
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
        raise SystemExit("gen-scene: " + "\n  ".join(problems))
    print(f"figure spans x {box[0]:.0f}..{box[2]:.0f}, y {box[1]:.0f}..{box[3]:.0f} "
          f"of {WIDTH}x{HEIGHT}")
    return box


# --- scene -------------------------------------------------------------------


def main():
    edge = outline()
    box = validate(edge)

    descend_keys = keyed(pose_channels(frames(CYCLE, STEP_DESCEND), descend))
    land_keys = keyed(pose_channels(frames(LAND, STEP_LAND), land))
    idle_keys = keyed(pose_channels(frames(IDLE, STEP_IDLE), idle))
    blink = [(0, 0.0)]
    for start, end in BLINK_KEYS:
        blink += [(start - 1, 0.0), (start, 1.0), (end, 0.0)]
    blink.append((BLINK_DURATION, 0.0))
    blink_keys = keyed({(IDS["blink"], "opacity"): blink})

    blink_layer = f'''            <StateMachineLayer name="Blink" id="{IDS['blink_layer']}">
                <AnyState x="160" y="-120"/>
                <ExitState x="560" y="-120"/>
                <EntryState x="0" y="0">
                    <StateTransition stateToId="{IDS['blink_state']}"/>
                </EntryState>
                <AnimationState x="160" y="0" animationId="{IDS['a_blink']}" id="{IDS['blink_state']}"/>
            </StateMachineLayer>'''

    if REVIEW == "land":
        machine = f'''        <StateMachine name="Motion" id="{IDS['machine']}">
            <StateMachineBool name="land" id="{IDS['land']}"/>
            <StateMachineLayer name="Review" id="{IDS['layer']}">
                <AnyState x="160" y="-120"/>
                <ExitState x="560" y="-120"/>
                <EntryState x="0" y="0">
                    <StateTransition stateToId="{IDS['s_land']}"/>
                </EntryState>
                <AnimationState x="160" y="0" animationId="{IDS['a_land']}" id="{IDS['s_land']}"/>
            </StateMachineLayer>
{blink_layer}
        </StateMachine>'''
    else:
        machine = f'''        <StateMachine name="Motion" id="{IDS['machine']}">
            <StateMachineBool name="land" id="{IDS['land']}"/>
            <StateMachineLayer name="Drift" id="{IDS['layer']}">
                <AnyState x="160" y="-120"/>
                <ExitState x="760" y="-120"/>
                <EntryState x="0" y="0">
                    <StateTransition stateToId="{IDS['s_descend']}"/>
                </EntryState>
                <!-- Finish the swing under way, so Land starts at zero angle. -->
                <AnimationState x="160" y="0" animationId="{IDS['a_descend']}" id="{IDS['s_descend']}">
                    <StateTransition stateToId="{IDS['s_land']}" enableExitTime="true"
                                     exitTimeIsPercetange="true" exitTime="100">
                        <TransitionBoolCondition inputId="{IDS['land']}" opValue="equal"/>
                    </StateTransition>
                </AnimationState>
                <AnimationState x="360" y="0" animationId="{IDS['a_land']}" id="{IDS['s_land']}">
                    <StateTransition stateToId="{IDS['s_idle']}" enableExitTime="true"
                                     exitTimeIsPercetange="true" exitTime="100"/>
                </AnimationState>
                <AnimationState x="560" y="0" animationId="{IDS['a_idle']}" id="{IDS['s_idle']}"/>
            </StateMachineLayer>
{blink_layer}
        </StateMachine>'''

    scene = f'''<Rive version="1" kind="fragment">
    <!-- Generated by gen-scene.py; edit that, not this. -->
    <Artboard defaultStateMachineId="{IDS['machine']}" styleId="{IDS['style']}" width="{WIDTH}" height="{HEIGHT}" name="Sleeper Drift" id="{IDS['artboard']}">
        <LayoutComponentStyle name="Artboard Style" id="{IDS['style']}"/>

        <Node x="{PIVOT[0]:.2f}" y="{PIVOT[1]:.2f}" name="Lift" id="{IDS['lift']}">
            <Node x="0" y="0" name="Rig" id="{IDS['rig']}">
                <Node x="{TILT_AT[0]:.2f}" y="{TILT_AT[1]:.2f}" name="Tilt" id="{IDS['tilt']}">
                    <Node x="{SQUASH_AT[0]:.2f}" y="{SQUASH_AT[1]:.2f}" name="Squash" id="{IDS['squash']}">
                        <Image x="{-FEET[0] + BLINK_XY[0]:.2f}" y="{-FEET[1] + BLINK_XY[1]:.2f}"
                               originX="0" originY="0" opacity="0"
                               assetId="{IDS['blink_asset']}" name="Blink" id="{IDS['blink']}"/>
                        <Image x="{-FEET[0]:.2f}" y="{-FEET[1]:.2f}" originX="0" originY="0"
                               assetId="{IDS['figure_asset']}" name="Sleeper" id="{IDS['figure']}"/>
                    </Node>
                </Node>
            </Node>
        </Node>

{machine}

        <LinearAnimation loopValue="loop" fps="{FPS}" duration="{CYCLE}" name="Descend" id="{IDS['a_descend']}">
{descend_keys}
        </LinearAnimation>

        <LinearAnimation loopValue="oneShot" fps="{FPS}" duration="{LAND}" name="Land" id="{IDS['a_land']}">
{land_keys}
        </LinearAnimation>

        <LinearAnimation loopValue="loop" fps="{FPS}" duration="{IDLE}" name="Idle" id="{IDS['a_idle']}">
{idle_keys}
        </LinearAnimation>

        <LinearAnimation loopValue="loop" fps="{FPS}" duration="{BLINK_DURATION}" name="Blink" id="{IDS['a_blink']}">
{blink_keys}
        </LinearAnimation>
    </Artboard>

    <ImageAsset file="assets/sleeper.webp" name="Sleeper" id="{IDS['figure_asset']}"/>
    <ImageAsset file="assets/blink.png" name="Blink" id="{IDS['blink_asset']}"/>
</Rive>
'''
    with open(os.path.join(HERE, "scene.rml"), "w") as f:
        f.write(scene)

    # What the page needs to move the canvas: everything in artboard px.
    content_top = min(apply(figure_matrix(descend(f)), p)[1] for f in range(CYCLE) for p in edge)
    plan = {
        "fps": FPS,
        "artboard": {"width": WIDTH, "height": HEIGHT},
        "figureBox": {"x": FIGURE_BOX[0], "y": FIGURE_BOX[1], "size": TILE},
        "feetY": FIGURE_BOX[1] + FEET[1],
        "contentTop": round(content_top, 1),
        "cycleFrames": CYCLE,
        "flareFrames": FLARE,
        "touchdownSpeed": TOUCHDOWN_SPEED,
        "shadow": SHADOW,
    }
    with open(os.path.join(HERE, "drift.json"), "w") as f:
        json.dump(plan, f, indent=2)
        f.write("\n")
    print(f"wrote scene.rml ({len(scene) // 1024} KB) and drift.json; "
          f"sway ±{RADIUS * math.sin(SWING):.0f}px, tilt ±{math.degrees(TILT * SWING):.1f}°, "
          f"rise {RADIUS * (1 - math.cos(SWING)) + LIFT:.0f}px")


if __name__ == "__main__":
    main()
