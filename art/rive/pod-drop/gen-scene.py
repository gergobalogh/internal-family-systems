#!/usr/bin/env python3
"""Write scene.rml and drop.json: the Pod drops in and its padding swallows the landing.

    python3 gen-scene.py                  # the shipping scene
    POD_REVIEW=land python3 gen-scene.py  # default machine plays Land, for captures

The page owns the fall: it drops the canvas from above the top of the page,
speeding up to TOUCHDOWN_SPEED, and sets `land` during the last cycle. Rive
owns everything in place, in the `Motion` machine:

- `Fall` loops a still pose, stretched a little by the fall.
- `Land` starts on contact. The padding gives way: the top keeps coming down
  at the speed it fell, slowing as the padding takes it, and the lower half
  spreads out like a beanbag. No bounce. It holds, sinking a touch deeper,
  then slowly rises back to its shape with no overshoot.
- `Idle` is the Pod at rest: slow, small breaths. The machine plays it three
  times over as `Idle Blinking`, which blinks twice; played alone (reduced
  motion) it doesn't blink.

The figure is one photo. The squash is an image mesh over it: rows above
LEG_TOP close up toward it and spread sideways, rows below never move, so
the legs keep their length. Every pose is computed here and keyed frame by
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
from rivegen import (Grid, apply, blink_asset, blink_channels, blink_image, frames, hermite,  # noqa: E402
                     keyed, mesh_channels, mul, node, smoothstep)

FPS = 60
WIDTH, HEIGHT = 440, 640
CENTRE_X = WIDTH / 2

# --- the figure: assets/pod.webp, a 640 tile with the feet at 95% ------------

TILE = 640
FIGURE = os.path.join(HERE, "assets", "pod.webp")
BLINK_XY = (255.0, 119.0)       # the closed-eye overlay's top-left in the tile (build-assets.sh)
FEET = (326.0, 604.0)         # in the tile: middle of the soles, where it stands
FIGURE_BOX = (CENTRE_X - FEET[0], 20.0)   # the tile's top-left in the artboard
SHADOW = {"x": 0.51, "w": 0.62}  # footprint, as fractions of the tile (as in app.css)

# The padding, in the tile. Above LEG_TOP everything gives; below it are the
# legs, which never change. The padding is widest at y 305, x 162..478.
TOP = 4.0
LEG_TOP = 548.0
CENTRE = 320.0                # the padding's middle, what it spreads from
SPREAD_AT = 0.72              # where the spread is widest, as a fraction of TOP..LEG_TOP
SPREAD_WIDTH = 0.34
LEG_BLEND = 22.0              # px below LEG_TOP over which the spread fades out

# --- motion ------------------------------------------------------------------

CYCLE = 24                    # Fall loop, frames: the page fits the drop to whole ones
STRETCH = (0.03, 0.02)        # falling: 3% taller, 2% narrower

TOUCHDOWN_SPEED = 20.0        # artboard px per frame at contact
DEPTH = 0.24                  # how far the padding gives, as a fraction of its height
SPREAD = 0.15                 # and how far its lower half spreads, at the widest
SINK = 0.02                   # it keeps sinking a little while held
GIVE = 34                     # frames until the padding has taken it all
HOLD = 22                     # then held
RISE = 70                     # then rising back, no overshoot
LAND = GIVE + HOLD + RISE
IDLE = 240
IDLE_BLINKING = 3 * IDLE       # blinks twice; the mesh moves the face, so only here, at rest
BREATHE = (-0.004, 0.010)     # scale x / y on the in-breath, about the feet

STEP_LAND, STEP_IDLE = 2, 6
STEP_MESH = 6                 # the mesh after the give, which is slow enough

REVIEW = os.environ.get("POD_REVIEW", "")

# The top's speed at contact is d(squash)/dt * (LEG_TOP - TOP). Matching it to
# the fall gives the time constant of the give.
GIVE_TAU = (DEPTH + STRETCH[0]) * (LEG_TOP - TOP) / TOUCHDOWN_SPEED

# --- ids ---------------------------------------------------------------------

IDS = {
    "artboard": "0:2", "style": "0:5", "machine": "0:7", "layer": "0:8", "land": "0:9",
    "s_fall": "0:12", "s_land": "0:13", "s_idle": "0:14",
    "a_fall": "0:6", "a_land": "0:15", "a_idle": "0:16", "a_idle_blinking": "0:17",
    "breath": "0:20", "figure": "0:21", "mesh": "0:22",
    "figure_asset": "0:60",
}
VERTEX_ID_BASE = 2000

MESH_XS = [0, 120, 160, 200, 240, 280, 320, 360, 400, 440, 480, 520, 640]
MESH_YS = [0, 40, 100, 160, 220, 280, 340, 400, 450, 500, LEG_TOP, LEG_TOP + LEG_BLEND, 600, 640]
MESH = Grid.lines((TILE, TILE), MESH_XS, MESH_YS)

# --- poses -------------------------------------------------------------------

REST_POSE = {"squash": 0.0, "spread": 0.0, "sx": 1.0, "sy": 1.0}
FALLING = {"squash": -STRETCH[0], "spread": -STRETCH[1]}


def spread_profile(y):
    """How much of the spread a row of the tile gets: widest low in the padding,
    less at the top, none on the legs."""
    u = (min(y, LEG_TOP) - TOP) / (LEG_TOP - TOP)
    bump = 0.4 + 0.6 * math.exp(-((u - SPREAD_AT) / SPREAD_WIDTH) ** 2)
    return bump * (1 - smoothstep(LEG_TOP, LEG_TOP + LEG_BLEND, y))


def deform(p, pose):
    """Where texture point p is with the padding given way by `squash`
    (a fraction of its height) and spread by `spread`."""
    x, y = p
    if y < LEG_TOP:
        y = LEG_TOP - (LEG_TOP - y) * (1 - pose["squash"])
    x = CENTRE + (x - CENTRE) * (1 + pose["spread"] * spread_profile(p[1]))
    return x, y


def fall(f):
    return {**REST_POSE, **FALLING}


def give(t):
    """0 at contact, leaving at speed 1/GIVE_TAU; 1 at GIVE, standing still.

    An exponential approach, as if the padding soaked up the speed. What the
    exponential still lacks at GIVE is added by a cubic that starts flat, so
    that it arrives exactly, with zero speed."""
    t = min(max(t, 0.0), GIVE)
    rest = math.exp(-GIVE / GIVE_TAU)
    return 1 - math.exp(-t / GIVE_TAU) + hermite(t / GIVE, 0, rest, 0, -rest * GIVE / GIVE_TAU)


def land(f):
    start, deepest = FALLING, {"squash": DEPTH, "spread": SPREAD}
    if f <= GIVE:
        g = give(f)
        pose = {k: start[k] + (deepest[k] - start[k]) * g for k in start}
        sink = SINK * smoothstep(GIVE * 0.6, GIVE + HOLD, f)
    elif f <= GIVE + HOLD:
        pose = dict(deepest)
        sink = SINK * smoothstep(GIVE * 0.6, GIVE + HOLD, f)
    else:
        s = smoothstep(GIVE + HOLD, LAND, f)
        pose = {k: deepest[k] * (1 - s) for k in deepest}
        sink = SINK * (1 - s)
    pose["squash"] += sink
    pose["spread"] += sink * SPREAD / DEPTH
    return {**REST_POSE, **pose}


def breath(f):
    s = 0.5 - 0.5 * math.cos(2 * math.pi * f / IDLE)
    return 1 + BREATHE[0] * s, 1 + BREATHE[1] * s


def idle(f):
    sx, sy = breath(f)
    return {**REST_POSE, "sx": sx, "sy": sy}


# --- transforms and keys -----------------------------------------------------

BREATH_AT = (FIGURE_BOX[0] + FEET[0], FIGURE_BOX[1] + FEET[1])


def figure_matrix(pose):
    """Tile pixels (after the mesh) to artboard pixels."""
    m = node(BREATH_AT[0], BREATH_AT[1], 0, pose["sx"], pose["sy"])
    return mul(m, node(-FEET[0], -FEET[1]))


def mesh_keys(at, pose_of):
    return [(f, [deform(p, pose_of(f)) for p in MESH.rest]) for f in at]


def pose_channels(at, pose_of):
    channels = {}
    for f in at:
        pose = pose_of(f)
        channels.setdefault((IDS["breath"], "scaleX"), []).append((f, pose["sx"]))
        channels.setdefault((IDS["breath"], "scaleY"), []).append((f, pose["sy"]))
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
    keys = list(REST_POSE)
    for name, a, b in [("fall loop", fall(0), fall(CYCLE)),
                       ("fall -> land", fall(CYCLE), land(0)),
                       ("land -> idle", land(LAND), idle(0)),
                       ("idle loop", idle(0), idle(IDLE))]:
        for k in keys:
            if abs(a[k] - b[k]) > 1e-4:
                problems.append(f"{name}: {k} jumps {a[k]:.4f} -> {b[k]:.4f}")
    # On contact the top keeps the speed it fell at, and from there it only
    # goes down, then only back up: no bounce, no overshoot.
    h = 1e-4
    top_speed = (land(h)["squash"] - land(0)["squash"]) / h * (LEG_TOP - TOP)
    if abs(top_speed - TOUCHDOWN_SPEED) > 0.05:
        problems.append(f"the top lands at {top_speed:.2f} px/frame, the fall at {TOUCHDOWN_SPEED}")
    squash = [land(f)["squash"] for f in range(LAND + 1)]
    deepest = squash.index(max(squash))
    if any(b < a - 1e-9 for a, b in zip(squash[:deepest], squash[1:deepest + 1])):
        problems.append("the padding comes back up before it has taken the landing")
    if any(b > a + 1e-9 for a, b in zip(squash[deepest:], squash[deepest + 1:])):
        problems.append("the padding overshoots on the way back")
    if min(squash[deepest:]) < -1e-9:
        problems.append("the padding rises past its shape")
    # The mesh stays in order: no triangle turns over.

    def cross(v, a, b, c):
        return (v[b][0] - v[a][0]) * (v[c][1] - v[a][1]) - (v[b][1] - v[a][1]) * (v[c][0] - v[a][0])

    for pose in [fall(0), land(deepest)]:
        v = [deform(p, pose) for p in MESH.rest]
        for a, b, c in MESH.triangles():
            if cross(v, a, b, c) * cross(MESH.rest, a, b, c) <= 0:
                problems.append(f"mesh triangle {a},{b},{c} turns over")
                break
    # The feet stay where the page parks them.
    for pose in [fall(0), land(deepest), idle(IDLE // 2)]:
        x, y = apply(figure_matrix(pose), deform(FEET, pose))
        if abs(x - BREATH_AT[0]) > 0.5 or abs(y - BREATH_AT[1]) > 0.5:
            problems.append(f"the feet move to {x:.1f}, {y:.1f}")
    # The figure stays on the artboard, whatever the pose.
    xs, ys = [], []
    for pose in [fall(0)] + [land(f) for f in range(0, LAND + 1, 2)] + [idle(f) for f in range(0, IDLE, 6)]:
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
          f"deepest at Land frame {deepest}")


# --- scene -------------------------------------------------------------------


def main():
    edge = outline()
    validate(edge)

    fall_frames = [0, CYCLE]
    land_frames = frames(LAND, STEP_LAND)
    idle_frames = frames(IDLE, STEP_IDLE)
    fall_keys = keyed({**pose_channels(fall_frames, fall),
                       **mesh_channels(mesh_keys(fall_frames, fall), VERTEX_ID_BASE, MESH.rest)})
    land_mesh_frames = list(range(0, GIVE, STEP_LAND)) + [GIVE + f for f in frames(LAND - GIVE, STEP_MESH)]
    land_keys = keyed({**pose_channels(land_frames, land),
                       **mesh_channels(mesh_keys(land_mesh_frames, land), VERTEX_ID_BASE, MESH.rest)})
    # Idle keys the mesh at rest too, so playing it alone (reduced motion)
    # shows the Pod in its own shape.
    idle_keys = keyed({**pose_channels(idle_frames, idle),
                       **mesh_channels(mesh_keys([0, IDLE], idle), VERTEX_ID_BASE, MESH.rest)})
    blinking_keys = keyed({**pose_channels(frames(IDLE_BLINKING, STEP_IDLE), idle),
                           **mesh_channels(mesh_keys([0, IDLE_BLINKING], idle), VERTEX_ID_BASE, MESH.rest),
                           **blink_channels(end=IDLE_BLINKING)})

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
        </StateMachine>'''
    else:
        machine = f'''        <StateMachine name="Motion" id="{IDS['machine']}">
            <StateMachineBool name="land" id="{IDS['land']}"/>
            <StateMachineLayer name="Drop" id="{IDS['layer']}">
                <AnyState x="160" y="-120"/>
                <ExitState x="760" y="-120"/>
                <EntryState x="0" y="0">
                    <StateTransition stateToId="{IDS['s_fall']}"/>
                </EntryState>
                <!-- Land on a cycle boundary: the page times the contact to it. -->
                <AnimationState x="160" y="0" animationId="{IDS['a_fall']}" id="{IDS['s_fall']}">
                    <StateTransition stateToId="{IDS['s_land']}" enableExitTime="true"
                                     exitTimeIsPercetange="true" exitTime="100">
                        <TransitionBoolCondition inputId="{IDS['land']}" opValue="equal"/>
                    </StateTransition>
                </AnimationState>
                <AnimationState x="360" y="0" animationId="{IDS['a_land']}" id="{IDS['s_land']}">
                    <StateTransition stateToId="{IDS['s_idle']}" enableExitTime="true"
                                     exitTimeIsPercetange="true" exitTime="100"/>
                </AnimationState>
                <AnimationState x="560" y="0" animationId="{IDS['a_idle_blinking']}" id="{IDS['s_idle']}"/>
            </StateMachineLayer>
        </StateMachine>'''

    scene = f'''<Rive version="1" kind="fragment">
    <!-- Generated by gen-scene.py; edit that, not this. -->
    <Artboard defaultStateMachineId="{IDS['machine']}" styleId="{IDS['style']}" width="{WIDTH}" height="{HEIGHT}" name="Pod Drop" id="{IDS['artboard']}">
        <LayoutComponentStyle name="Artboard Style" id="{IDS['style']}"/>

        <Node x="{BREATH_AT[0]:.2f}" y="{BREATH_AT[1]:.2f}" name="Breath" id="{IDS['breath']}">
            <!-- Declared first, so it paints on top: the eyes of a generated edit.
                 It is flat, so only Idle Blinking, with the padding at rest, shows it. -->
{blink_image(-FEET[0] + BLINK_XY[0], -FEET[1] + BLINK_XY[1], 12)}
            <Image x="{-FEET[0]:.2f}" y="{-FEET[1]:.2f}" originX="0" originY="0"
                   assetId="{IDS['figure_asset']}" name="Pod" id="{IDS['figure']}">
{MESH.xml(IDS["mesh"], "Padding", VERTEX_ID_BASE, " " * 16)}
            </Image>
        </Node>

{machine}

        <LinearAnimation loopValue="loop" fps="{FPS}" duration="{CYCLE}" name="Fall" id="{IDS['a_fall']}">
{fall_keys}
        </LinearAnimation>

        <LinearAnimation loopValue="oneShot" fps="{FPS}" duration="{LAND}" name="Land" id="{IDS['a_land']}">
{land_keys}
        </LinearAnimation>

        <LinearAnimation loopValue="loop" fps="{FPS}" duration="{IDLE}" name="Idle" id="{IDS['a_idle']}">
{idle_keys}
        </LinearAnimation>

        <LinearAnimation loopValue="loop" fps="{FPS}" duration="{IDLE_BLINKING}" name="Idle Blinking" id="{IDS['a_idle_blinking']}">
{blinking_keys}
        </LinearAnimation>
    </Artboard>

    <ImageAsset file="assets/pod.webp" name="Pod" id="{IDS['figure_asset']}"/>
{blink_asset()}
</Rive>
'''
    with open(os.path.join(HERE, "scene.rml"), "w") as f:
        f.write(scene)

    # What the page needs to move the canvas: everything in artboard px.
    content_top = min(apply(figure_matrix(fall(0)), deform(p, fall(0)))[1] for p in edge)
    plan = {
        "fps": FPS,
        "artboard": {"width": WIDTH, "height": HEIGHT},
        "figureBox": {"x": FIGURE_BOX[0], "y": FIGURE_BOX[1], "size": TILE},
        "feetY": FIGURE_BOX[1] + FEET[1],
        "contentTop": round(content_top, 1),
        "cycleFrames": CYCLE,
        "flareFrames": 0,
        "touchdownSpeed": TOUCHDOWN_SPEED,
        "shadow": SHADOW,
    }
    with open(os.path.join(HERE, "drop.json"), "w") as f:
        json.dump(plan, f, indent=2)
        f.write("\n")
    print(f"wrote scene.rml ({len(scene) // 1024} KB) and drop.json; give tau {GIVE_TAU:.1f} frames")


if __name__ == "__main__":
    main()
