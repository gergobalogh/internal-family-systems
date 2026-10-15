#!/usr/bin/env python3
"""Write scene.rml and wave.json: a felt wave washes Shell ashore.

    python3 gen-scene.py                      # the shipping scene
    SHELL_REVIEW=enter python3 gen-scene.py   # default machine plays Enter, for captures

The page owns the travel across the screen: the wave rushes in from the left
and slows as it runs up the beach, all in Enter's first ARRIVE frames,
whatever the screen. Rive owns everything in place, in the `Motion` machine:

- `Enter` (oneShot): Shell rides in waist-deep behind the wave's crest,
  bobbing, eyes still closed, still listening to its shell, while the felt
  rolls under the surface. As the wave stops, it crests: it leans over and
  its lip curls. Then it draws back the way it came, sinking and fading, and
  leaves Shell standing on the ground, which it settles onto.
- `Idle`: Shell alone, breathing, leaning slowly into the sound.

The wave is a generated felt prop (art/out/prop-wave-1.jpg) on an image mesh
that rolls its surface, leans its crest and curls its lip; a node under it
sinks and fades it. It paints over Shell, so Shell is in the water. Every
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
from rivegen import (Grid, apply, frames, hermite, keyed, mesh_channels, mul, node,  # noqa: E402
                     smoothstep)

FPS = 60
WIDTH, HEIGHT = 1540, 670

# --- the figure: assets/shell.webp, a 640 tile with the feet at 95% ----------

TILE = 640
FIGURE = os.path.join(HERE, "assets", "shell.webp")
FEET = (255.0, 604.0)          # in the tile: between the soles
BODY_X = 240.0                 # the middle of the body, without the shell
GROUND_Y = 605.0               # the ground line in the tile
FIGURE_BOX = (710.0, 40.0)     # the tile's top-left in the artboard
SHADOW = {"x": 0.4, "w": 0.3}  # footprint, as fractions of the tile (as in app.css)

# --- the wave: assets/wave.webp, in tile pixels ------------------------------

WAVE = os.path.join(HERE, "assets", "wave.webp")
WAVE_SIZE = Image.open(WAVE).size
K = WAVE_SIZE[1] / 352         # measured on the wave cut 340 px high (352 with its margins)
WAVE_BASE = 343.0 * K          # its flat bottom
WAVE_AT = (280.0 * K, WAVE_BASE)  # the point on its back slope under Shell's body, 2/3 of the way up
CREST_X = 475.0 * K            # its highest point
LIP = (540.0 * K, 200.0 * K)   # the curling lip: where it starts, and its lowest y
WAVE_SPAN = (10.0 * K, 690.0 * K)  # its base, from the tail to the front face
WAVE_SHADOW = ("6B342C28", 0.08 * TILE, 16)  # the page shadow's colour, height and a soft edge

# --- motion ------------------------------------------------------------------

ARRIVE = 170                   # frames the wave takes to come in (the page's travel)
ARRIVE_SPEED = 1.6             # how fast it comes in at first, against the average
FLOAT = 16.0                   # px Shell floats off the ground in the water
BOB = (6.0, 0.035, 56.0)       # bobbing: px, tilt (rad), period
ROLL = (6.0, 400.0, 70.0)      # the felt rolling under the surface: px, wavelength, period
CREST = (130, 200)             # it crests as it stops
LEAN = 32.0                    # px the crest leans over
CURL = 0.10                    # rad the lip curls
RISE = 0.05                    # and it stands this much taller
RECEDE = (196, 300)            # it draws back
RECEDE_BY = 560.0              # px back the way it came
FLAT = 0.08                    # sinking to this much of its height
FADE = (238, 300)
SETTLE = (200, 262)            # Shell comes down onto its feet as the water goes
SQUASH = (0.03, 22.0, 9.0)     # touching down: how much, period, decay
ENTER = 340
IDLE = 300
IDLE_LEAN = 0.012              # leaning into the sound, once per Idle
BREATHE = (-0.004, 0.010)

STEP_ENTER, STEP_MESH, STEP_IDLE, STEP_TRAVEL = 2, 4, 6, 2

REVIEW = os.environ.get("SHELL_REVIEW", "")

# --- ids ---------------------------------------------------------------------

IDS = {
    "artboard": "0:2", "style": "0:5", "machine": "0:7", "layer": "0:8",
    "s_enter": "0:13", "s_idle": "0:14", "a_enter": "0:15", "a_idle": "0:16",
    "wave_node": "0:20", "wave": "0:21", "mesh": "0:22", "foot": "0:23", "figure": "0:24",
    "wave_shadow": "0:25",
    "figure_asset": "0:60", "wave_asset": "0:61",
}
VERTEX_ID_BASE = 2000

MESH = Grid.lines(WAVE_SIZE, [x * K for x in (0, 60, 120, 180, 240, 300, 360, 420, 475, 520, 560, 600, 640, 680, 703)],
                  [y * K for y in (0, 40, 80, 120, 160, 200, 240, 280, 320, 352)])

FOOT_AT = (FIGURE_BOX[0] + FEET[0], FIGURE_BOX[1] + FEET[1])
WAVE_NODE_AT = (FIGURE_BOX[0] + BODY_X, FIGURE_BOX[1] + GROUND_Y)


def figure_matrix(pose):
    m = node(FOOT_AT[0], FOOT_AT[1] - pose["lift"], pose["tilt"], pose["sx"], pose["sy"])
    return mul(m, node(-FEET[0], -FEET[1]))


def wave_matrix(pose):
    m = node(WAVE_NODE_AT[0] - pose["back"], WAVE_NODE_AT[1], 0, 1, pose["wy"])
    return mul(m, node(-WAVE_AT[0], -WAVE_AT[1]))


def deform(p, pose):
    """Where wave texture point p is: the felt rolling under the surface, the
    crest leaning over and its lip curling."""
    x, y = p
    up = min(max((WAVE_BASE - y) / WAVE_BASE, 0.0), 1.0)
    amount, length, _ = ROLL
    y -= pose["roll"] * amount * up * math.sin(2 * math.pi * x / length - pose["phase"])
    x += pose["lean"] * up ** 2 * smoothstep(CREST_X - 260 * K, CREST_X, x)
    lip = smoothstep(LIP[0] - 40 * K, LIP[0] + 30 * K, p[0]) * (1 - smoothstep(LIP[1] - 20 * K, LIP[1] + 50 * K, p[1]))
    if lip:
        angle = pose["curl"] * lip
        c, s = math.cos(angle), math.sin(angle)
        px, py = LIP[0], 40.0 * K
        dx, dy = x - px, y - py
        x, y = px + c * dx - s * dy, py + s * dx + c * dy
    return x, y


# --- travel ------------------------------------------------------------------


def arrived(f):
    """Fraction of the way in at frame f: fast at first, slowing to a stop."""
    t = min(max(f / ARRIVE, 0.0), 1.0)
    return hermite(t, 0, 1, ARRIVE_SPEED, 0)


# --- poses -------------------------------------------------------------------

REST_POSE = {"lift": 0.0, "tilt": 0.0, "sx": 1.0, "sy": 1.0,
             "back": 0.0, "wy": 1.0, "opacity": 0.0, "roll": 0.0, "phase": 0.0, "lean": 0.0, "curl": 0.0}


def breath(f, period, amount):
    s = 0.5 - 0.5 * math.cos(2 * math.pi * f / period)
    return 1 + amount[0] * s, 1 + amount[1] * s


def enter(f):
    afloat = 1 - smoothstep(*SETTLE, f)
    px, tilt, period = BOB
    lift = (FLOAT + px * math.sin(2 * math.pi * f / period)) * afloat
    lean = BOB[1] * math.sin(2 * math.pi * f / period - 0.9) * afloat
    t = f - SETTLE[1]
    give = 0.0
    if t > 0:
        amount, period_s, decay = SQUASH
        give = amount * math.exp(-t / decay) * math.sin(2 * math.pi * t / period_s) * (1 - smoothstep(ENTER - 40, ENTER, f))
    sx, sy = breath(max(f - SETTLE[1], 0), ENTER - SETTLE[1], BREATHE)

    crest = smoothstep(*CREST, f)
    going = smoothstep(*RECEDE, f)
    return {"lift": lift, "tilt": lean, "sx": sx * (1 + give * 0.6), "sy": sy * (1 - give),
            "back": RECEDE_BY * going,
            "wy": (1 + RISE * crest) * (1 - (1 - FLAT) * smoothstep(RECEDE[0], RECEDE[1] + 20, f)),
            "opacity": 1 - smoothstep(*FADE, f),
            "roll": 1 - smoothstep(CREST[0], RECEDE[1], f),
            "phase": 2 * math.pi * f / ROLL[2],
            "lean": LEAN * crest, "curl": CURL * crest}


def idle(f):
    sx, sy = breath(f, IDLE / 2, BREATHE)
    return {**REST_POSE, "sx": sx, "sy": sy, "tilt": IDLE_LEAN * (0.5 - 0.5 * math.cos(2 * math.pi * f / IDLE))}


# --- keys --------------------------------------------------------------------


def pose_channels(at, pose_of):
    channels = {}
    for f in at:
        pose = pose_of(f)
        for object_id, prop, value in ((IDS["foot"], "y", FOOT_AT[1] - pose["lift"]),
                                       (IDS["foot"], "rotation", pose["tilt"]),
                                       (IDS["foot"], "scaleX", pose["sx"]),
                                       (IDS["foot"], "scaleY", pose["sy"]),
                                       (IDS["wave_node"], "x", WAVE_NODE_AT[0] - pose["back"]),
                                       (IDS["wave_node"], "scaleY", pose["wy"]),
                                       (IDS["wave_node"], "opacity", pose["opacity"])):
            channels.setdefault((object_id, prop), []).append((f, value))
    return channels


def mesh_keys(at, pose_of):
    return [(f, [deform(p, pose_of(f)) for p in MESH.rest]) for f in at]


def outline(path, step=4):
    alpha = Image.open(path).getchannel("A").point(lambda a: 255 if a > 40 else 0)
    width, height = alpha.size
    pixels = alpha.load()
    points = []
    for y in range(0, height, step):
        row = [x for x in range(width) if pixels[x, y]]
        if row:
            points += [(row[0], y), (row[-1], y)]
    for x in range(0, width, step):
        column = [y for y in range(height) if pixels[x, y]]
        if column:
            points += [(x, column[0]), (x, column[-1])]
    return points


# --- checks ------------------------------------------------------------------


def validate(figure_edge, wave_edge):
    problems = []
    for name, a, b in [("enter -> idle", enter(ENTER), idle(0)), ("idle loop", idle(0), idle(IDLE))]:
        for k in ("lift", "tilt", "sx", "sy", "opacity"):
            if abs(a[k] - b[k]) > 1e-4:
                problems.append(f"{name}: {k} jumps {a[k]:.4f} -> {b[k]:.4f}")

    def cross(v, a, b, c):
        return (v[b][0] - v[a][0]) * (v[c][1] - v[a][1]) - (v[b][1] - v[a][1]) * (v[c][0] - v[a][0])

    for f in range(0, ENTER + 1, 2):
        v = [deform(p, enter(f)) for p in MESH.rest]
        if any(cross(v, a, b, c) * cross(MESH.rest, a, b, c) <= 0 for a, b, c in MESH.triangles()):
            problems.append(f"a wave mesh triangle turns over at Enter frame {f}")
            break
    # Shell must not show below the water while it floats: its feet stay
    # under the wave's top edge wherever the wave is.
    xs, ys = [], []
    for f in range(0, ENTER + 1, 2):
        pose = enter(f)
        m = figure_matrix(pose)
        for p in figure_edge:
            x, y = apply(m, p)
            xs.append(x)
            ys.append(y)
        if pose["opacity"] > 0:
            m = wave_matrix(pose)
            for p in wave_edge:
                x, y = apply(m, deform(p, pose))
                xs.append(x)
                ys.append(y)
    for f in range(0, IDLE, 6):
        m = figure_matrix(idle(f))
        for p in figure_edge:
            x, y = apply(m, p)
            xs.append(x)
            ys.append(y)
    box = (min(xs), min(ys), max(xs), max(ys))
    if box[0] < 0 or box[1] < 0 or box[2] > WIDTH or box[3] > HEIGHT:
        problems.append(f"off the artboard: x {box[0]:.0f}..{box[2]:.0f}, y {box[1]:.0f}..{box[3]:.0f}")
    if problems:
        raise SystemExit("gen-scene: " + "\n  ".join(problems[:12]))
    print(f"spans x {box[0]:.0f}..{box[2]:.0f}, y {box[1]:.0f}..{box[3]:.0f} of {WIDTH}x{HEIGHT}")
    return box


# --- scene -------------------------------------------------------------------


def main():
    box = validate(outline(FIGURE), outline(WAVE))

    enter_at = frames(ENTER, STEP_ENTER)
    mesh_at = frames(FADE[1], STEP_MESH)
    idle_at = frames(IDLE, STEP_IDLE)
    enter_keys = keyed({**pose_channels(enter_at, enter),
                        **mesh_channels(mesh_keys(mesh_at, enter), VERTEX_ID_BASE, MESH.rest)})
    idle_keys = keyed(pose_channels(idle_at, idle))

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
        layer = f'''            <StateMachineLayer name="Wave" id="{IDS['layer']}">
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
            </StateMachineLayer>'''

    scene = f'''<Rive version="1" kind="fragment">
    <!-- Generated by gen-scene.py; edit that, not this. -->
    <Artboard defaultStateMachineId="{IDS['machine']}" styleId="{IDS['style']}" width="{WIDTH}" height="{HEIGHT}" name="Shell Wave" id="{IDS['artboard']}">
        <LayoutComponentStyle name="Artboard Style" id="{IDS['style']}"/>

        <!-- The first sibling paints on top: the wave is in front of Shell. -->
        <Node x="{WAVE_NODE_AT[0]:.2f}" y="{WAVE_NODE_AT[1]:.2f}" opacity="0" name="Wave Base" id="{IDS['wave_node']}">
            <Image x="{-WAVE_AT[0]:.2f}" y="{-WAVE_AT[1]:.2f}" originX="0" originY="0"
                   assetId="{IDS['wave_asset']}" name="Wave" id="{IDS['wave']}">
{MESH.xml(IDS["mesh"], "Water", VERTEX_ID_BASE, " " * 16)}
            </Image>
            <!-- On the ground under it, like the page's shadows; behind the wave. -->
            <Shape x="{(WAVE_SPAN[0] + WAVE_SPAN[1]) / 2 - WAVE_AT[0]:.2f}" y="0" name="Wave Shadow" id="{IDS['wave_shadow']}">
                <Ellipse width="{(WAVE_SPAN[1] - WAVE_SPAN[0]) * 0.95:.2f}" height="{WAVE_SHADOW[1]:.2f}" name="Footprint"/>
                <Fill fillRule="clockwise" name="Shadow">
                    <SolidColor colorValue="{WAVE_SHADOW[0]}" name="Colour"/>
                    <Feather strength="{WAVE_SHADOW[2]}" name="Soft"/>
                </Fill>
            </Shape>
        </Node>

        <Node x="{FOOT_AT[0]:.2f}" y="{FOOT_AT[1]:.2f}" name="Feet" id="{IDS['foot']}">
            <Image x="{-FEET[0]:.2f}" y="{-FEET[1]:.2f}" originX="0" originY="0"
                   assetId="{IDS['figure_asset']}" name="Shell" id="{IDS['figure']}"/>
        </Node>

        <StateMachine name="Motion" id="{IDS['machine']}">
{layer}
        </StateMachine>

        <LinearAnimation loopValue="oneShot" fps="{FPS}" duration="{ENTER}" name="Enter" id="{IDS['a_enter']}">
{enter_keys}
        </LinearAnimation>

        <LinearAnimation loopValue="loop" fps="{FPS}" duration="{IDLE}" name="Idle" id="{IDS['a_idle']}">
{idle_keys}
        </LinearAnimation>
    </Artboard>

    <ImageAsset file="assets/shell.webp" name="Shell" id="{IDS['figure_asset']}"/>
    <ImageAsset file="assets/wave.webp" name="Wave" id="{IDS['wave_asset']}"/>
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
        "enterFrames": ENTER,
        "travel": [[f, 0, round(arrived(f), 5), 0] for f in frames(ENTER, STEP_TRAVEL)],
    }
    with open(os.path.join(HERE, "wave.json"), "w") as f:
        json.dump(plan, f, separators=(",", ":"))
        f.write("\n")
    print(f"wrote scene.rml ({len(scene) // 1024} KB) and wave.json")


if __name__ == "__main__":
    main()
