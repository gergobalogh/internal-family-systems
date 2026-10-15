#!/usr/bin/env python3
"""Write scene.rml and wander.json: the Kaleidoscope wanders in backwards.

    python3 gen-scene.py                    # the shipping scene
    KAL_REVIEW=enter python3 gen-scene.py   # default machine plays Enter, for captures
    KAL_REVIEW=idle python3 gen-scene.py    # ... or Idle

It comes in from the right, backing up, its eye still to the kaleidoscope
and leaning back to look up through it: not looking where it is going. The
page owns the travel across the screen; Rive owns everything in place, in
the `Motion` machine:

- `Approach` loops one slow rock, the same wind-up toy shuffle as Self-hug's
  (art/rive/selfhug-waddle), about the outer corners of its feet, round a
  lean back (it spends longer on its back foot).
- `Enter` follows once a rock has finished: it keeps backing up, then stops
  short with a small bump, as if it had backed into something. The top of
  it carries on and springs back, and it squashes a little. Then it settles
  and keeps looking.
- `Idle Glance`: still looking, slowly scanning up and down, breathing.
  Halfway through it lowers the scope and straightens up, so both eyes
  show, blinks, and raises it again. `Idle`, the scanning and breathing
  alone, is what the page plays by itself (reduced motion).

The page fits whole rocks to the screen, sets `arrive` during the last one,
and reads the travel from wander.json, in rocks' travel, so the backing up
out of the last rock carries on at its speed. Every pose is computed here
and keyed frame by frame, from the shared helpers in ../rivegen.py. See
docs/rive-entrance-playbook.md.

The lowered pose is another tile, kaleidoscope-lowered.webp, the same as the
first but for the arms and the scope (see cutout.py), and so is the
in-between, kaleidoscope-halfway.webp. The scope comes down and goes back up
through them like stop-motion, a pose held for a few frames each, never two
at once. The closed-eye overlay, blink.png, belongs to the lowered pose: with
the scope at its eye only one eye shows, so it only blinks with the scope
down.
"""

import json
import math
import os
import sys

from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.dirname(HERE))
from rivegen import (apply, blink_asset, blink_channels, blink_image, frames, hermite,  # noqa: E402
                     keyed, mul, node, smoothstep)

FPS = 60
WIDTH, HEIGHT = 600, 660

# --- the figure: assets/kaleidoscope.webp, a 640 tile with the feet at 95% ---

TILE = 640
FIGURE = os.path.join(HERE, "assets", "kaleidoscope.webp")
HALFWAY = os.path.join(HERE, "assets", "kaleidoscope-halfway.webp")
LOWERED = os.path.join(HERE, "assets", "kaleidoscope-lowered.webp")
BLINK_XY = (200.0, 113.0)     # the closed-eye overlay's top-left in the tile (cutout.py BLINK_CROP)
LEFT_FOOT = (186.0, 602.0)     # in the tile: the outer corner of each sole, what it tips about
RIGHT_FOOT = (322.0, 592.0)
FEET = ((LEFT_FOOT[0] + RIGHT_FOOT[0]) / 2, (LEFT_FOOT[1] + RIGHT_FOOT[1]) / 2)
FIGURE_BOX = (WIDTH / 2 - 320.0, 36.0)   # the tile's top-left in the artboard
SHADOW = {"x": 0.4, "w": 0.42}  # footprint, as fractions of the tile (as in app.css)

# --- motion ------------------------------------------------------------------

CYCLE = 72                     # one rock, slower than Self-hug's; a multiple of 12, so that
OMEGA = 2 * math.pi / CYCLE    # the tip crosses zero on whole frames (T/12, 5T/12)
LOOK = -0.03                   # leaning back to look up, rad (anticlockwise: top to the left)
ROCK = 0.06                    # about the lean
CYCLE_TRAVEL = 150.0           # artboard px per rock, nominal: the page fits it to the screen
SHUFFLE = 0.8                  # how much of the travel bunches up while the weight crosses
BREATH = (-0.004, 0.008)

COAST = 20                     # Enter: frames it keeps backing up before the bump
STOP = 6                       # frames the bump takes to stop it
SETTLE = 110                   # the jolt springs back and settles
ENTER = COAST + STOP + SETTLE
JOLT_PERIOD = 22.0             # the lean's spring
JOLT_DAMPING = 0.35
JOLT_GAIN = 0.010              # rad per (px/frame^2)
BUMP = (0.035, 0.02)           # squash on the bump: scale y down, x up
BUMP_DECAY = 9.0
BUMP_PERIOD = 20.0

IDLE = 360
SCAN = 0.015                   # scanning up and down, once per Idle
BREATHE = (-0.004, 0.010)      # twice per Idle

IDLE_GLANCE = 600              # ten seconds: half a scan, the glance, the other half
GLANCE = IDLE_GLANCE - IDLE    # with the scope lowered, both eyes show, so it can blink
UPRIGHT = 0.0                  # its tip with the scope lowered: no longer leaning back to look
STRAIGHTEN = 16                # frames it takes to straighten up, and to lean back again
HOLD = 5                       # frames the halfway pose shows, either way: 12 poses a second
LOWER_AT = 2                   # glance frame the halfway pose shows, on the way down
BLINK_AT = 84                  # glance frame its eyes shut; they open over 8
RAISE_AT = 160                 # glance frame the halfway pose shows, on the way up

STEP_CYCLE, STEP_ENTER, STEP_IDLE, STEP_TRAVEL = 2, 2, 6, 2

REVIEW = os.environ.get("KAL_REVIEW", "")

# --- ids ---------------------------------------------------------------------

IDS = {
    "artboard": "0:2", "style": "0:5", "machine": "0:7", "layer": "0:8", "arrive": "0:9",
    "s_approach": "0:12", "s_enter": "0:13", "s_idle": "0:14",
    "a_approach": "0:6", "a_enter": "0:15", "a_idle": "0:16", "a_glance": "0:17",
    "right": "0:20", "left": "0:21", "breath": "0:22", "figure": "0:23", "lowered": "0:24", "halfway": "0:25",
    "figure_asset": "0:60", "lowered_asset": "0:62", "halfway_asset": "0:63",
}

# The rig, as Self-hug's: Right (at the right foot's corner, tips clockwise) >
# Left (at the left foot's corner, tips anticlockwise) > Breath (at the feet).
RIGHT_AT = (FIGURE_BOX[0] + RIGHT_FOOT[0], FIGURE_BOX[1] + RIGHT_FOOT[1])
LEFT_AT = (LEFT_FOOT[0] - RIGHT_FOOT[0], LEFT_FOOT[1] - RIGHT_FOOT[1])
BREATH_AT = (FEET[0] - LEFT_FOOT[0], FEET[1] - LEFT_FOOT[1])


def figure_matrix(pose):
    m = node(*RIGHT_AT, max(pose["tip"], 0.0))
    m = mul(m, node(*LEFT_AT, min(pose["tip"], 0.0)))
    m = mul(m, node(*BREATH_AT, 0, pose["sx"], pose["sy"]))
    return mul(m, node(-FEET[0], -FEET[1]))


# --- travel (in rocks' travel, towards the left) -----------------------------


def cycle_travel(f):
    """Fraction of a rock's travel done at frame f of it, bunched up where the
    rock passes through the lean (f = 0, CYCLE/2)."""
    return f / CYCLE + SHUFFLE / (2 * OMEGA * CYCLE) * math.sin(2 * OMEGA * f)


SPEED_OUT = (1 + SHUFFLE) / CYCLE      # rocks' travel per frame, leaving the last rock


def enter_travel(f):
    """Keeps backing up at the speed it had, then the bump stops it short."""
    if f <= COAST:
        return SPEED_OUT * f
    s = min((f - COAST) / STOP, 1.0)
    return SPEED_OUT * COAST + hermite(s, 0, SPEED_OUT * STOP / 2.4, SPEED_OUT * STOP, 0)


def jolt_track():
    """The lean's spring, frame by frame, driven by the stop's deceleration
    (on a nominal rock): the top carries on backwards, then springs back."""
    omega = 2 * math.pi / JOLT_PERIOD
    theta, speed, out, substeps = 0.0, 0.0, [], 8

    def x(t):
        return enter_travel(t) * CYCLE_TRAVEL

    for f in range(ENTER + 1):
        out.append(theta)
        for k in range(substeps):
            t, h = f + k / substeps, 1 / substeps
            accel = (x(t + h) - 2 * x(t) + x(max(t - h, 0))) / h ** 2 if t > h else 0.0
            # Travel is to the left, so a stop throws the top to the left too:
            # anticlockwise, negative.
            speed += (-omega ** 2 * theta - 2 * JOLT_DAMPING * omega * speed + JOLT_GAIN * accel) * h
            theta += speed * h
    return [theta * (1 - smoothstep(ENTER - 30, ENTER, f)) for f, theta in enumerate(out)]


JOLT = jolt_track()

# --- poses -------------------------------------------------------------------

REST_POSE = {"tip": LOOK, "sx": 1.0, "sy": 1.0}


def breath(f, period, amount):
    s = 0.5 - 0.5 * math.cos(2 * math.pi * f / period)
    return 1 + amount[0] * s, 1 + amount[1] * s


def approach(f):
    sx, sy = breath(f, CYCLE, BREATH)
    return {"tip": LOOK + ROCK * math.sin(OMEGA * f), "sx": sx, "sy": sy}


def enter(f):
    # The rock under way carries on until the bump, then dies down with the jolt.
    fade = 1 - smoothstep(COAST, COAST + STOP + 30, f)
    tip = LOOK + ROCK * math.sin(OMEGA * f) * fade + JOLT[min(int(round(f)), ENTER)]
    t = f - COAST - STOP / 2
    wave = 0.0
    if t > 0:
        wave = (math.exp(-t / BUMP_DECAY) * math.sin(2 * math.pi * t / BUMP_PERIOD)
                * (1 - smoothstep(ENTER - 40, ENTER, f)))
    sx, sy = breath(f, ENTER, BREATHE)
    return {"tip": tip, "sx": sx * (1 + BUMP[1] * wave), "sy": sy * (1 - BUMP[0] * wave)}


def idle(f):
    sx, sy = breath(f, IDLE / 2, BREATHE)
    return {"tip": LOOK - SCAN * math.sin(2 * math.pi * f / IDLE), "sx": sx, "sy": sy}


def glance(g):
    """Glance frame g: it straightens up as it lowers the scope, and leans
    back to look again as it raises it."""
    lean = smoothstep(0, STRAIGHTEN, g) * (1 - smoothstep(RAISE_AT, RAISE_AT + STRAIGHTEN, g))
    return LOOK + (UPRIGHT - LOOK) * lean


def idle_glance(f):
    """Idle's first half, the glance, then Idle's second half."""
    half = IDLE // 2
    if f < half:
        return idle(f)
    if f >= half + GLANCE:
        return idle(f - GLANCE)
    sx, sy = breath(f - half, GLANCE, BREATHE)   # one slow breath, out and back to rest
    return {"tip": glance(f - half), "sx": sx, "sy": sy}


def glance_opacities():
    """Which pose shows, as hard cuts on exact frames, and the blink."""
    half = IDLE // 2
    down, up, shut = half + LOWER_AT, half + RAISE_AT, half + BLINK_AT

    def shown(*spans):
        keys = [(0, 0.0)]
        for start, end in spans:
            keys += [(start - 1, 0.0), (start, 1.0), (end - 1, 1.0), (end, 0.0)]
        return keys + [(IDLE_GLANCE, 0.0)]

    raised = [(0, 1.0), (down - 1, 1.0), (down, 0.0), (up + HOLD - 1, 0.0), (up + HOLD, 1.0), (IDLE_GLANCE, 1.0)]
    return {
        (IDS["figure"], "opacity"): raised,
        (IDS["halfway"], "opacity"): shown((down, down + HOLD), (up, up + HOLD)),
        (IDS["lowered"], "opacity"): shown((down + HOLD, up)),
        **blink_channels(shut=[(shut, shut + 8)], end=IDLE_GLANCE),
    }


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
    """Key frames, plus both frames around wherever the tip changes sides."""
    at = set(frames(duration, step))
    tips = [pose_of(f)["tip"] for f in range(duration + 1)]
    for f, (a, b) in enumerate(zip(tips, tips[1:])):
        if a * b < 0 or (abs(a) < 1e-9) != (abs(b) < 1e-9):
            at.update((f, f + 1))
    return sorted(at)


def outline(path=FIGURE):
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


# --- checks ------------------------------------------------------------------


def validate(edge, lowered_edges):
    problems = []
    for name, a, b in [("approach loop", approach(0), approach(CYCLE)),
                       ("approach -> enter", approach(CYCLE), enter(0)),
                       ("enter -> idle", enter(ENTER), idle(0)),
                       ("idle loop", idle(0), idle(IDLE)),
                       ("idle glance loop", idle_glance(0), idle_glance(IDLE_GLANCE)),
                       ("enter -> idle glance", enter(ENTER), idle_glance(0)),
                       ("into the glance", idle_glance(IDLE // 2 - 1e-9), idle_glance(IDLE // 2)),
                       ("out of the glance", idle_glance(IDLE // 2 + GLANCE - 1e-9), idle_glance(IDLE // 2 + GLANCE))]:
        for k in REST_POSE:
            if abs(a[k] - b[k]) > 1e-4:
                problems.append(f"{name}: {k} jumps {a[k]:.4f} -> {b[k]:.4f}")
    h = 1e-4
    v_cycle = (approach(CYCLE)["tip"] - approach(CYCLE - h)["tip"]) / h
    v_enter = (enter(h)["tip"] - enter(0)["tip"]) / h
    if abs(v_cycle - v_enter) > 1e-4:
        problems.append(f"tip speed jumps {v_cycle:.5f} -> {v_enter:.5f}")
    t_cycle = (cycle_travel(CYCLE) - cycle_travel(CYCLE - h)) / h
    t_enter = (enter_travel(h) - enter_travel(0)) / h
    if abs(t_cycle - t_enter) > 1e-6 or abs(cycle_travel(CYCLE) - 1) > 1e-9:
        problems.append(f"travel speed jumps {t_cycle:.5f} -> {t_enter:.5f}")
    for f in range(CYCLE):
        a, b = approach(f)["tip"], approach(f + 1)["tip"]
        if abs(a) > 1e-9 and abs(b) > 1e-9 and a * b < 0:
            problems.append(f"the rock changes feet between frames {f} and {f + 1}")
    worst = max(abs(enter(f)["tip"] - LOOK) for f in range(ENTER + 1))
    if worst > 0.12:
        problems.append(f"the jolt leans {worst:.3f} rad")
    xs, ys = [], []
    for pose in ([approach(f) for f in range(CYCLE)] + [enter(f) for f in range(0, ENTER + 1, 2)]
                 + [idle(f) for f in range(0, IDLE, 6)] + [idle_glance(f) for f in range(0, IDLE_GLANCE, 6)]):
        m = figure_matrix(pose)
        for p in edge:
            x, y = apply(m, p)
            xs.append(x)
            ys.append(y)
    box = (min(xs), min(ys), max(xs), max(ys))
    if box[0] < 0 or box[1] < 0 or box[2] > WIDTH or box[3] > HEIGHT:
        problems.append(f"figure off the artboard: x {box[0]:.0f}..{box[2]:.0f}, y {box[1]:.0f}..{box[3]:.0f}")
    down = [apply(figure_matrix(idle_glance(f)), p)
            for f in range(IDLE // 2, IDLE // 2 + GLANCE, 6) for p in lowered_edges]
    if any(x < 0 or y < 0 or x > WIDTH or y > HEIGHT for x, y in down):
        problems.append("the lowered or halfway pose is off the artboard")
    if problems:
        raise SystemExit("gen-scene: " + "\n  ".join(problems[:12]))
    print(f"figure spans x {box[0]:.0f}..{box[2]:.0f}, y {box[1]:.0f}..{box[3]:.0f} of {WIDTH}x{HEIGHT}; "
          f"jolt up to {worst:.3f} rad")
    return box


# --- scene -------------------------------------------------------------------


def main():
    edge = outline()
    box = validate(edge, outline(HALFWAY) + outline(LOWERED))

    approach_keys = keyed(pose_channels(tip_frames(CYCLE, STEP_CYCLE, approach), approach))
    enter_keys = keyed(pose_channels(tip_frames(ENTER, STEP_ENTER, enter), enter))
    idle_keys = keyed(pose_channels(tip_frames(IDLE, STEP_IDLE, idle), idle))
    # Every other frame while it straightens up and leans back.
    moves = [IDLE // 2, IDLE // 2 + RAISE_AT]
    glance_at = sorted(set(tip_frames(IDLE_GLANCE, STEP_IDLE, idle_glance))
                       | {m + k for m in moves for k in range(0, STRAIGHTEN + 1, 2)})
    glance_keys = keyed({**pose_channels(glance_at, idle_glance), **glance_opacities()})

    if REVIEW in ("enter", "idle"):
        state = IDS["s_enter"] if REVIEW == "enter" else IDS["s_idle"]
        animation = IDS["a_enter"] if REVIEW == "enter" else IDS["a_glance"]
        layer = f'''            <StateMachineLayer name="Review" id="{IDS['layer']}">
                <AnyState x="160" y="-120"/>
                <ExitState x="560" y="-120"/>
                <EntryState x="0" y="0">
                    <StateTransition stateToId="{state}"/>
                </EntryState>
                <AnimationState x="160" y="0" animationId="{animation}" id="{state}"/>
            </StateMachineLayer>'''
    else:
        layer = f'''            <StateMachineLayer name="Wander" id="{IDS['layer']}">
                <AnyState x="160" y="-120"/>
                <ExitState x="760" y="-120"/>
                <EntryState x="0" y="0">
                    <StateTransition stateToId="{IDS['s_approach']}"/>
                </EntryState>
                <!-- Finish the rock under way, so Enter starts where a rock does. -->
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
                <AnimationState x="560" y="0" animationId="{IDS['a_glance']}" id="{IDS['s_idle']}"/>
            </StateMachineLayer>'''

    rest = approach(0)
    scene = f'''<Rive version="1" kind="fragment">
    <!-- Generated by gen-scene.py; edit that, not this. -->
    <Artboard defaultStateMachineId="{IDS['machine']}" styleId="{IDS['style']}" width="{WIDTH}" height="{HEIGHT}" name="Kaleidoscope Backwards" id="{IDS['artboard']}">
        <LayoutComponentStyle name="Artboard Style" id="{IDS['style']}"/>

        <Node x="{RIGHT_AT[0]:.2f}" y="{RIGHT_AT[1]:.2f}" name="Right Foot" id="{IDS['right']}">
            <Node x="{LEFT_AT[0]:.2f}" y="{LEFT_AT[1]:.2f}" rotation="{min(rest['tip'], 0.0):.4f}" name="Left Foot" id="{IDS['left']}">
                <Node x="{BREATH_AT[0]:.2f}" y="{BREATH_AT[1]:.2f}" name="Breath" id="{IDS['breath']}">
                    <!-- First declared paints on top: the blink over the lowered
                         pose. Only one of the three poses shows at a time. -->
{blink_image(-FEET[0] + BLINK_XY[0], -FEET[1] + BLINK_XY[1], 20)}
                    <Image x="{-FEET[0]:.2f}" y="{-FEET[1]:.2f}" originX="0" originY="0" opacity="0"
                           assetId="{IDS['lowered_asset']}" name="Lowered" id="{IDS['lowered']}"/>
                    <Image x="{-FEET[0]:.2f}" y="{-FEET[1]:.2f}" originX="0" originY="0" opacity="0"
                           assetId="{IDS['halfway_asset']}" name="Halfway" id="{IDS['halfway']}"/>
                    <Image x="{-FEET[0]:.2f}" y="{-FEET[1]:.2f}" originX="0" originY="0"
                           assetId="{IDS['figure_asset']}" name="Kaleidoscope" id="{IDS['figure']}"/>
                </Node>
            </Node>
        </Node>

        <StateMachine name="Motion" id="{IDS['machine']}">
            <StateMachineBool name="arrive" id="{IDS['arrive']}"/>
{layer}
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

        <LinearAnimation loopValue="loop" fps="{FPS}" duration="{IDLE_GLANCE}" name="Idle Glance" id="{IDS['a_glance']}">
{glance_keys}
        </LinearAnimation>
    </Artboard>

    <ImageAsset file="assets/kaleidoscope.webp" name="Kaleidoscope" id="{IDS['figure_asset']}"/>
    <ImageAsset file="assets/kaleidoscope-lowered.webp" name="Lowered" id="{IDS['lowered_asset']}"/>
    <ImageAsset file="assets/kaleidoscope-halfway.webp" name="Halfway" id="{IDS['halfway_asset']}"/>
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
        "from": "right",
        "content": {"left": round(box[0], 1), "right": round(box[2], 1)},
        "cycle": {
            "frames": CYCLE,
            "travel": CYCLE_TRAVEL,
            "profile": [[f, round(cycle_travel(f), 5)] for f in frames(CYCLE, STEP_TRAVEL)],
        },
        "enterFrames": ENTER,
        "travel": [[f, 0, 0, round(enter_travel(f), 5)] for f in frames(ENTER, STEP_TRAVEL)],
    }
    with open(os.path.join(HERE, "wander.json"), "w") as f:
        json.dump(plan, f, separators=(",", ":"))
        f.write("\n")
    print(f"wrote scene.rml ({len(scene) // 1024} KB) and wander.json; "
          f"backs up {enter_travel(ENTER):.2f} rocks after the last")


if __name__ == "__main__":
    main()
