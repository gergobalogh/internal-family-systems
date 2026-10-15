#!/usr/bin/env python3
"""Write scene.rml and tiptoe.json: the Stack tiptoes in and keeps its tower up.

    python3 gen-scene.py                      # the shipping scene
    STACK_REVIEW=enter python3 gen-scene.py   # default machine plays Enter, for captures

The page owns the travel across the screen; Rive owns everything in place,
in the `Motion` machine:

- `Approach` loops two quick, tiny steps: the wind-up rock of Self-hug's
  waddle (art/rive/selfhug-waddle), small and fast, as on tiptoe. The tower
  of blocks sways a little behind the body.
- `Enter` follows once a cycle has finished: a few more steps die down as it
  stops, and the tower carries on: it teeters forward. The Stack leans in
  under it to catch it, the tower swings back and is caught again, smaller,
  and steadies.
- `Idle`: standing very still, the tower barely swaying, breathing.

The figure is one photo. The tower moves through an image mesh: everything
above the bottom of the middle block tips over the corner it leans to, where
it sits on the lowest block, and a band at the bottom of the middle block
takes up the bend. The lowest block, which the arms hold,
never moves. Every pose is computed here and keyed frame by frame, from the
shared helpers in ../rivegen.py. See docs/rive-entrance-playbook.md.
"""

import json
import math
import os
import sys

from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.dirname(HERE))
from rivegen import (Grid, apply, blink_animation, blink_asset, blink_image, blink_layer,  # noqa: E402
                     frames, hermite, keyed, mesh_channels, mul, node, smoothstep)

FPS = 60
WIDTH, HEIGHT = 520, 680

# --- the figure: assets/stack.webp, a 640 tile with the feet at 95% ----------

TILE = 640
FIGURE = os.path.join(HERE, "assets", "stack.webp")
BLINK_XY = (260.0, 324.0)       # the closed-eye overlay's top-left in the tile (build-assets.sh)
LEFT_FOOT = (270.0, 604.0)     # in the tile: the outer corner of each sole
RIGHT_FOOT = (377.0, 600.0)
FEET = ((LEFT_FOOT[0] + RIGHT_FOOT[0]) / 2, (LEFT_FOOT[1] + RIGHT_FOOT[1]) / 2)
FIGURE_BOX = (WIDTH / 2 - FEET[0], 50.0)  # the tile's top-left in the artboard
SHADOW = {"x": 0.5, "w": 0.42}  # footprint, as fractions of the tile (as in app.css)

# The tower: the top two blocks sit on the lowest along y 198, between the
# corners at x 276 and 369. Leaning, they tip over the corner on that side.
SEAT = (276.0, 369.0, 198.0)
SOFT = 14.0                    # px of the middle block's bottom that take up the bend
TOWER_X = (262.0, 388.0)       # the blocks' span; the mesh is still 50 px beyond it

# --- motion ------------------------------------------------------------------

CYCLE = 22                     # two quick steps
OMEGA = 2 * math.pi / CYCLE
ROCK = 0.05                    # lifts the other foot ~5 px
CYCLE_TRAVEL = 90.0            # artboard px per cycle, nominal: the page fits it to the screen
SHUFFLE = 0.5
SWAY = (0.02, 0.9)             # the tower lags the rock: amplitude (rad), phase

STOP = 34                      # Enter: frames the steps take to die down and the glide to stop
TEETER_AT = 14                 # the tower sets off as the stop bites
TEETER = (0.17, 58.0, 48.0)    # how far it tips (rad), its period and its decay (frames)
CATCH = (0.55, 8)              # the body follows it under, by this much and this late
ENTER = 260
IDLE = 300
IDLE_SWAY = 0.006
BREATHE = (-0.004, 0.010)

STEP_CYCLE, STEP_ENTER, STEP_IDLE, STEP_TRAVEL = 2, 2, 6, 2
STEP_TEETER = 4                # the mesh, once the steps have stopped: the teeter is slow

REVIEW = os.environ.get("STACK_REVIEW", "")

# --- ids ---------------------------------------------------------------------

IDS = {
    "artboard": "0:2", "style": "0:5", "machine": "0:7", "layer": "0:8", "arrive": "0:9",
    "s_approach": "0:12", "s_enter": "0:13", "s_idle": "0:14",
    "a_approach": "0:6", "a_enter": "0:15", "a_idle": "0:16",
    "right": "0:20", "left": "0:21", "breath": "0:22", "figure": "0:23", "mesh": "0:24",
    "figure_asset": "0:60",
}
VERTEX_ID_BASE = 2000

MESH_XS = [0, 212, 240, 262, SEAT[0], 299, 322, 346, SEAT[1], 388, 438, 640]
MESH_YS = [0, 50, 97, 140, SEAT[2] - SOFT, SEAT[2], 240, 330, 430, 530, 640]
MESH = Grid.lines((TILE, TILE), MESH_XS, MESH_YS)

RIGHT_AT = (FIGURE_BOX[0] + RIGHT_FOOT[0], FIGURE_BOX[1] + RIGHT_FOOT[1])
LEFT_AT = (LEFT_FOOT[0] - RIGHT_FOOT[0], LEFT_FOOT[1] - RIGHT_FOOT[1])
BREATH_AT = (FEET[0] - LEFT_FOOT[0], FEET[1] - LEFT_FOOT[1])


def figure_matrix(pose):
    m = node(*RIGHT_AT, max(pose["tip"], 0.0))
    m = mul(m, node(*LEFT_AT, min(pose["tip"], 0.0)))
    m = mul(m, node(*BREATH_AT, 0, pose["sx"], pose["sy"]))
    return mul(m, node(-FEET[0], -FEET[1]))


def deform(p, pose):
    """Where texture point p is with the tower turned by pose["tower"]."""
    x, y = p
    weight = ((1 - smoothstep(SEAT[2] - SOFT, SEAT[2], y)) * smoothstep(TOWER_X[0] - 50, TOWER_X[0], x)
              * (1 - smoothstep(TOWER_X[1], TOWER_X[1] + 50, x)))
    if weight == 0:
        return p
    angle = weight * pose["tower"]
    pivot = SEAT[1] if pose["tower"] > 0 else SEAT[0]
    c, s = math.cos(angle), math.sin(angle)
    dx, dy = x - pivot, y - SEAT[2]
    return pivot + c * dx - s * dy, SEAT[2] + s * dx + c * dy


# --- travel ------------------------------------------------------------------


def cycle_travel(f):
    return f / CYCLE + SHUFFLE / (2 * OMEGA * CYCLE) * math.sin(2 * OMEGA * f)


SPEED_OUT = (1 + SHUFFLE) / CYCLE


def enter_travel(f):
    """In cycles' travel: out of the last cycle at its speed, to a stop."""
    s = min(max(f / STOP, 0.0), 1.0)
    return hermite(s, 0, SPEED_OUT * STOP / 2.4, SPEED_OUT * STOP, 0)


# --- poses -------------------------------------------------------------------

REST_POSE = {"tip": 0.0, "tower": 0.0, "sx": 1.0, "sy": 1.0}


def breath(f, period, amount):
    s = 0.5 - 0.5 * math.cos(2 * math.pi * f / period)
    return 1 + amount[0] * s, 1 + amount[1] * s


def sway(f):
    return -SWAY[0] * math.sin(OMEGA * f - SWAY[1]) + SWAY[0] * math.sin(-SWAY[1])


def approach(f):
    return {"tip": ROCK * math.sin(OMEGA * f), "tower": sway(f), "sx": 1.0, "sy": 1.0}


def teeter(f):
    """The tower's own lean, in the world: kicked forward by the stop, then
    swinging back and forth, smaller each time, to rest by the end."""
    t = f - TEETER_AT
    if t <= 0:
        return 0.0
    amount, period, decay = TEETER
    return (amount * math.exp(-t / decay) * math.sin(2 * math.pi * t / period)
            * smoothstep(0, 10, t) * (1 - smoothstep(ENTER - 50, ENTER - 10, f)))


def enter(f):
    fade = 1 - smoothstep(0, STOP, f)
    world = teeter(f)
    lean = CATCH[0] * teeter(f - CATCH[1])
    sx, sy = breath(f, ENTER, BREATHE)
    return {"tip": ROCK * math.sin(OMEGA * f) * fade + lean,
            "tower": sway(f) * fade + world - lean, "sx": sx, "sy": sy}


def idle(f):
    sx, sy = breath(f, IDLE / 2, BREATHE)
    return {"tip": 0.0, "tower": IDLE_SWAY * math.sin(2 * math.pi * f / IDLE), "sx": sx, "sy": sy}


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


def mesh_keys(at, pose_of):
    return [(f, [deform(p, pose_of(f)) for p in MESH.rest]) for f in at]


def tip_frames(duration, step, pose_of):
    """Key frames, plus both frames around wherever the tip changes sides."""
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
                       ("approach -> enter", approach(CYCLE), enter(0)),
                       ("enter -> idle", enter(ENTER), idle(0)),
                       ("idle loop", idle(0), idle(IDLE))]:
        for k in REST_POSE:
            if abs(a[k] - b[k]) > 1e-4:
                problems.append(f"{name}: {k} jumps {a[k]:.4f} -> {b[k]:.4f}")
    h = 1e-4
    for k in ("tip", "tower"):
        v_cycle = (approach(CYCLE)[k] - approach(CYCLE - h)[k]) / h
        v_enter = (enter(h)[k] - enter(0)[k]) / h
        if abs(v_cycle - v_enter) > 1e-4:
            problems.append(f"{k} speed jumps {v_cycle:.5f} -> {v_enter:.5f}")
    t_cycle = (cycle_travel(CYCLE) - cycle_travel(CYCLE - h)) / h
    t_enter = (enter_travel(h) - enter_travel(0)) / h
    if abs(t_cycle - t_enter) > 1e-6 or abs(cycle_travel(CYCLE) - 1) > 1e-9:
        problems.append(f"travel speed jumps {t_cycle:.5f} -> {t_enter:.5f}")

    def cross(v, a, b, c):
        return (v[b][0] - v[a][0]) * (v[c][1] - v[a][1]) - (v[b][1] - v[a][1]) * (v[c][0] - v[a][0])

    worst = max(abs(enter(f)["tower"]) for f in range(ENTER + 1))
    for f in range(ENTER + 1):
        v = [deform(p, enter(f)) for p in MESH.rest]
        if any(cross(v, a, b, c) * cross(MESH.rest, a, b, c) <= 0 for a, b, c in MESH.triangles()):
            problems.append(f"a mesh triangle turns over at Enter frame {f}")
            break
    xs, ys = [], []
    for pose in ([approach(f) for f in range(CYCLE)] + [enter(f) for f in range(0, ENTER + 1, 2)]
                 + [idle(f) for f in range(0, IDLE, 6)]):
        m = figure_matrix(pose)
        for p in edge:
            x, y = apply(m, deform(p, pose))
            xs.append(x)
            ys.append(y)
    box = (min(xs), min(ys), max(xs), max(ys))
    if box[0] < 0 or box[1] < 0 or box[2] > WIDTH or box[3] > HEIGHT:
        problems.append(f"figure off the artboard: x {box[0]:.0f}..{box[2]:.0f}, y {box[1]:.0f}..{box[3]:.0f}")
    if problems:
        raise SystemExit("gen-scene: " + "\n  ".join(problems[:12]))
    print(f"figure spans x {box[0]:.0f}..{box[2]:.0f}, y {box[1]:.0f}..{box[3]:.0f} of {WIDTH}x{HEIGHT}; "
          f"the tower turns up to {worst:.3f} rad against the body")
    return box


# --- scene -------------------------------------------------------------------


def main():
    edge = outline()
    box = validate(edge)

    approach_at = tip_frames(CYCLE, STEP_CYCLE, approach)
    enter_at = tip_frames(ENTER, STEP_ENTER, enter)
    teeter_at = [f for f in enter_at if f <= STOP or f % STEP_TEETER == 0 or f == ENTER]
    idle_at = tip_frames(IDLE, STEP_IDLE, idle)
    approach_keys = keyed({**pose_channels(approach_at, approach),
                           **mesh_channels(mesh_keys(approach_at, approach), VERTEX_ID_BASE, MESH.rest)})
    enter_keys = keyed({**pose_channels(enter_at, enter),
                        **mesh_channels(mesh_keys(teeter_at, enter), VERTEX_ID_BASE, MESH.rest)})
    idle_keys = keyed({**pose_channels(idle_at, idle),
                       **mesh_channels(mesh_keys(idle_at, idle), VERTEX_ID_BASE, MESH.rest)})

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
        layer = f'''            <StateMachineLayer name="Tiptoe" id="{IDS['layer']}">
                <AnyState x="160" y="-120"/>
                <ExitState x="760" y="-120"/>
                <EntryState x="0" y="0">
                    <StateTransition stateToId="{IDS['s_approach']}"/>
                </EntryState>
                <!-- Finish the steps under way, so Enter starts where a cycle does. -->
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
    <Artboard defaultStateMachineId="{IDS['machine']}" styleId="{IDS['style']}" width="{WIDTH}" height="{HEIGHT}" name="Stack Tiptoe" id="{IDS['artboard']}">
        <LayoutComponentStyle name="Artboard Style" id="{IDS['style']}"/>

        <Node x="{RIGHT_AT[0]:.2f}" y="{RIGHT_AT[1]:.2f}" name="Right Foot" id="{IDS['right']}">
            <Node x="{LEFT_AT[0]:.2f}" y="{LEFT_AT[1]:.2f}" name="Left Foot" id="{IDS['left']}">
                <Node x="{BREATH_AT[0]:.2f}" y="{BREATH_AT[1]:.2f}" name="Breath" id="{IDS['breath']}">
                    <!-- Declared first, so it paints on top: the eyes of a generated edit. -->
{blink_image(-FEET[0] + BLINK_XY[0], -FEET[1] + BLINK_XY[1], 20)}
                    <Image x="{-FEET[0]:.2f}" y="{-FEET[1]:.2f}" originX="0" originY="0"
                           assetId="{IDS['figure_asset']}" name="Stack" id="{IDS['figure']}">
{MESH.xml(IDS["mesh"], "Tower", VERTEX_ID_BASE, " " * 24)}
                    </Image>
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

    <ImageAsset file="assets/stack.webp" name="Stack" id="{IDS['figure_asset']}"/>
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
    with open(os.path.join(HERE, "tiptoe.json"), "w") as f:
        json.dump(plan, f, separators=(",", ":"))
        f.write("\n")
    print(f"wrote scene.rml ({len(scene) // 1024} KB) and tiptoe.json")


if __name__ == "__main__":
    main()
