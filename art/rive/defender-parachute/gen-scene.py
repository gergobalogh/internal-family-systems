#!/usr/bin/env python3
"""Write scene.rml and parachute.json: the Defender floats down under a felt canopy.

    python3 gen-scene.py                       # the shipping scene
    DEFENDER_REVIEW=land python3 gen-scene.py  # default machine plays Land, for captures

The page owns the descent: it moves the canvas down the screen and sets `land`
during the last sway cycle. Rive owns everything that happens in place, in the
`Motion` machine:

- `Descend` loops one pendulum swing. The whole rig sways about a point inside
  the canopy, the body lags the canopy a little, and the canopy breathes.
- `Land` follows once a cycle has finished: the flare damps the swing out, the
  feet touch down at FLARE (the page stops its travel on the same frame), the
  body squashes into its feet, and the canopy, unloaded, keeps sinking,
  deflates, topples to one side behind the figure and fades.
- `Idle` is the Defender standing, breathing.

Every pose is computed here and keyed frame by frame, so the lines can be
solved against both of their ends: the hands (through the sway and squash
transforms) and the canopy hem (through the collapse mesh, interpolated the
way the runtime interpolates it). A line is straight while it is loaded and
sags once its ends come closer than its length.
"""

import json
import math
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.dirname(HERE))
from rivegen import (Grid, apply, damped_to_rest, frames, hermite, interpolate, keyed,  # noqa: E402
                     line_vertices, mesh_channels, mul, node, rope, smoothstep)

FPS = 60
WIDTH, HEIGHT = 1100, 1120
CENTRE_X = WIDTH / 2

# --- the figure: assets/defender.webp, a 640 tile with the feet at 95% ---------

TILE = 640
FIGURE_BOX = (CENTRE_X - TILE / 2, 468.0)  # the tile's top-left in the artboard
FEET = (320.0, 605.0)        # in the tile: bottom centre of the soles, the squash origin
HANDS = {"L": (46.0, 284.0), "R": (594.0, 280.0)}  # in the tile: where the lines vanish
                                                   # into the paddles, ~16px below their tops
SHADOW = {"x": 0.5, "w": 0.44}  # footprint, as fractions of the tile (as in app.css)

# --- the canopy: assets/canopy.webp -------------------------------------------

CANOPY = (752, 432)          # texture size
CANOPY_SCALE = 1.1
HEM = (376.0, 345.0)         # in the texture: middle of the near hem, the canopy's origin
CANOPY_AT = (CENTRE_X, 419.5)  # HEM in the artboard: 40px of headroom above the dome
# Where the lines meet the hem, in texture pixels: the cusps between the near
# scallops, then the cusps between the far ones seen through the opening.
CUSPS = {
    "L": [(20, 378), (77, 352), (266, 343), (126, 386), (296, 391)],
    "R": [(733, 376), (670, 375), (492, 340), (624, 382), (470, 391)],
}
GRID = (17, 10)              # collapse mesh: columns x rows of vertices

PIVOT = (CENTRE_X, 300.0)    # the sway pivots inside the canopy

# --- motion ------------------------------------------------------------------

CYCLE = 160                  # one pendulum swing, frames
OMEGA = 2 * math.pi / CYCLE
SWAY = 0.06                  # rig swing amplitude, rad
LAG = 0.014                  # the body trails the canopy by this much, rad
LAG_PHASE = 0.9
BREATH = (0.015, -0.008)     # canopy breathing, scale x / y, twice per swing
BREATH_PHASE = 0.5

FLARE = 45                   # Land frames before the feet touch down
TOUCHDOWN_SPEED = 1.2        # artboard px per frame when they do
SQUASH = 0.07                # the body sinks into its feet on landing
SQUASH_PERIOD = 28
SQUASH_DECAY = 10.0

FALL_FRAMES = 115            # the canopy, unloaded, sinks behind the figure
FALL_TO = 980.0              # artboard y its hem comes to rest at: within reach
                             # of the lines, so they end slack, not stretched
DRIFT = 8.0                  # and it drifts this far to the right
TILT = (0.2, 0.0)            # peak and resting tilt as it topples
COLLAPSE = (4, 95)           # frames after touchdown over which the dome deflates
FADE = (130, 180)            # frames after touchdown over which canopy and lines fade
LAND = FLARE + FADE[1] + 4
IDLE = 240
BREATHE = (-0.003, 0.006)    # idle breathing, scale x / y
BLINK_DURATION = 600          # same ten-second loop as the Critic
BLINK_KEYS = [(155, 163), (479, 487)]
BLINK_XY = (233.0, 245.0)     # cropped overlay's top-left in the 640 figure tile

# The lines once the canopy is unloaded: light yarn in still air.
ROPE_SEGMENTS = 14
ROPE_GRAVITY = 0.8           # artboard px per frame^2
ROPE_DAMPING = 0.9           # velocity kept per frame
ROPE_SUBSTEPS = 4
ROPE_ITERATIONS = 20

STEP_DESCEND, STEP_LAND, STEP_MESH = 4, 2, 6
LINE_COLOR = "FFAE9F86"   # natural wool: reads on sky, clouds and meadow
LINE_WIDTH = 3.8

REVIEW = os.environ.get("DEFENDER_REVIEW", "")

# --- ids ---------------------------------------------------------------------

IDS = {
    "artboard": "0:2", "style": "0:5", "machine": "0:7", "layer": "0:8", "land": "0:9",
    "blink_layer": "0:10", "blink_state": "0:11", "a_blink": "0:17",
    "s_descend": "0:12", "s_land": "0:13", "s_idle": "0:14",
    "a_descend": "0:6", "a_land": "0:15", "a_idle": "0:16",
    "rig": "0:20", "swing": "0:21", "squash": "0:22", "figure": "0:23", "blink": "0:24",
    "lines": "0:30", "canopy": "0:40", "canopy_offset": "0:41", "canopy_image": "0:42",
    "canopy_mesh": "0:43", "figure_asset": "0:60", "canopy_asset": "0:61", "blink_asset": "0:62",
}
LINE_IDS = {}  # (side, i) -> (path id, top vertex id, bottom vertex id)
for n, (side, i) in enumerate((s, i) for s in "LR" for i in range(len(CUSPS[s]))):
    LINE_IDS[(side, i)] = (f"0:{100 + 3 * n}", f"0:{101 + 3 * n}", f"0:{102 + 3 * n}")
VERTEX_ID_BASE = 2000

# --- the rig at rest ---------------------------------------------------------
# Every node position is relative to its parent; the rig is the root.

HAND_MID = ((HANDS["L"][0] + HANDS["R"][0]) / 2, (HANDS["L"][1] + HANDS["R"][1]) / 2)
SWING_AT = (FIGURE_BOX[0] + HAND_MID[0] - PIVOT[0], FIGURE_BOX[1] + HAND_MID[1] - PIVOT[1])
SQUASH_AT = (FEET[0] - HAND_MID[0], FEET[1] - HAND_MID[1])
ANCHOR_AT = (CANOPY_AT[0] - PIVOT[0], CANOPY_AT[1] - PIVOT[1])
GROUND = FIGURE_BOX[1] + FEET[1] - PIVOT[1]  # the feet line, in rig space


def hand(pose, side):
    """A hand's position in rig space."""
    m = mul(node(*SWING_AT, pose["swing"]), node(*SQUASH_AT, 0, pose["sx"], pose["sy"]))
    return apply(m, (HANDS[side][0] - FEET[0], HANDS[side][1] - FEET[1]))


def canopy_matrix(pose):
    """Texture pixels (after the mesh) to rig space."""
    m = node(ANCHOR_AT[0] + pose["cx"], ANCHOR_AT[1] + pose["cy"], pose["tilt"],
             CANOPY_SCALE * pose["bx"], CANOPY_SCALE * pose["by"])
    return mul(m, node(-HEM[0], -HEM[1]))


# --- the collapse mesh -------------------------------------------------------

MESH = Grid(CANOPY, *GRID)
REST = MESH.rest
DOME = HEM[1] - 8.0          # hem to the top of the dome, texture px


def deform(x, y, c):
    """Where texture point (x, y) sits with the dome a fraction c deflated."""
    if c <= 0:
        return x, y
    nx = (x - HEM[0]) / HEM[0]
    depth = HEM[1] - y                    # positive above the hem
    up = max(0.0, depth) / DOME
    # The dome loses most of its height. The inside showing under the near hem
    # folds away almost entirely, or the heap reads as an upturned plate.
    height = 1 - (0.74 if depth > 0 else 0.92) * c
    spread = 1 + c * 0.05 * up            # its top spreads a little as it flattens
    droop = 28 * c * nx * nx              # the sides fall further than the middle
    wobble = 9 * math.sin(math.pi * c) + 7 * c  # and it settles lumpy, not flat
    ripple = wobble * math.sin(nx * math.pi * 3.5 + 1.1) * (0.4 + 0.6 * up)
    return HEM[0] + (x - HEM[0]) * spread, HEM[1] - depth * height + droop + ripple


CUSP_WEIGHTS = {key: MESH.barycentric(CUSPS[key[0]][key[1]]) for key in LINE_IDS}


def mesh_keys():
    """Frames (in Land) at which the mesh is keyed, and the vertex positions there."""
    at = [0, FLARE]
    f = FLARE + STEP_MESH
    while f < FLARE + COLLAPSE[1]:
        at.append(f)
        f += STEP_MESH
    at += [FLARE + COLLAPSE[1], LAND]
    keys = []
    for frame in at:
        c = smoothstep(*COLLAPSE, frame - FLARE)
        keys.append((frame, [deform(x, y, c) for x, y in REST]))
    return keys


MESH_KEYS = mesh_keys()


def mesh_at(frame):
    return interpolate(MESH_KEYS, frame)


def cusp(pose, key, mesh):
    return apply(canopy_matrix(pose), Grid.point(mesh, CUSP_WEIGHTS[key]))


# --- poses -------------------------------------------------------------------

REST_POSE = {"rig": 0.0, "swing": 0.0, "sx": 1.0, "sy": 1.0, "cx": 0.0, "cy": 0.0,
             "tilt": 0.0, "bx": 1.0, "by": 1.0, "fade": 1.0}


def lag(f):
    return -LAG * math.sin(OMEGA * f - LAG_PHASE)


def breath(f):
    s = math.sin(2 * OMEGA * f + BREATH_PHASE)
    return 1 + BREATH[0] * s, 1 + BREATH[1] * s


def descend(f):
    bx, by = breath(f)
    return {**REST_POSE, "rig": SWAY * math.sin(OMEGA * f), "swing": lag(f), "bx": bx, "by": by}


def land(f):
    pose = dict(REST_POSE)
    calm = 1 - smoothstep(0, FLARE, f)
    if f <= FLARE:
        # The swing that was under way at the cycle boundary, damped out so the
        # feet arrive under the pivot, standing still: zero angle and zero
        # angular velocity at touchdown.
        pose["rig"] = damped_to_rest(f, SWAY * OMEGA, FLARE)
    pose["swing"] = lag(f) * calm
    bx, by = breath(f)
    t = f - FLARE
    puff = 0.025 * math.exp(-((t - 8) / 9) ** 2)
    pose["bx"] = 1 + (bx - 1) * calm + puff
    pose["by"] = 1 + (by - 1) * calm + puff * 0.4
    if t >= 0:
        wave = math.exp(-t / SQUASH_DECAY) * math.sin(2 * math.pi * t / SQUASH_PERIOD)
        pose["sy"] = 1 - SQUASH * wave
        pose["sx"] = 1 + 0.6 * SQUASH * wave
        u = t / FALL_FRAMES
        fall = FALL_TO - CANOPY_AT[1]
        # Leaves at the speed the figure touched down at, comes to rest softly.
        pose["cy"] = hermite(u, 0, fall, TOUCHDOWN_SPEED * FALL_FRAMES, 0)
        pose["cx"] = DRIFT * smoothstep(0, FALL_FRAMES, t)
        rise = smoothstep(0, 55, t)
        pose["tilt"] = TILT[0] * rise + (TILT[1] - TILT[0]) * smoothstep(55, FALL_FRAMES, t)
        pose["fade"] = 1 - smoothstep(*FADE, t)
    return pose


def idle(f):
    s = 0.5 - 0.5 * math.cos(2 * math.pi * f / IDLE)
    return {**REST_POSE, "sx": 1 + BREATHE[0] * s, "sy": 1 + BREATHE[1] * s, "fade": 0.0}


# --- lines -------------------------------------------------------------------

REST_MESH = list(REST)
LENGTH = {key: math.dist(cusp(descend(0), key, REST_MESH), hand(descend(0), key[0]))
          for key in LINE_IDS}


def ends(f, key):
    """A line's two ends in rig space, at a (possibly fractional) Land frame."""
    pose = land(f)
    return cusp(pose, key, mesh_at(f)), hand(pose, key[0])


def simulate_ropes():
    """Each line as a hanging rope from touchdown on: {key: {frame: (c1, c2)}}.

    While the canopy carries the Defender the lines are taut and straight.
    Once it is unloaded they are yarn pinned at the hem and the hand, coming
    down at touchdown speed and lying on the ground.
    """
    return {key: rope(lambda f, key=key: ends(f, key), LENGTH[key], FLARE, LAND, TOUCHDOWN_SPEED, GROUND,
                      ROPE_SEGMENTS, ROPE_GRAVITY, ROPE_DAMPING, ROPE_SUBSTEPS, ROPE_ITERATIONS)
            for key in LINE_IDS}


def line(pose, key, mesh, handles=None):
    """Top and bottom vertex of one line: straight, or a fitted rope's handles."""
    return line_vertices(cusp(pose, key, mesh), hand(pose, key[0]), handles)


# --- keyframes ---------------------------------------------------------------


def pose_channels(at, pose_of, mesh_of, lines=True, ropes=None):
    channels = {}

    def put(object_id, prop, frame, value):
        channels.setdefault((object_id, prop), []).append((frame, value))

    for f in at:
        pose = pose_of(f)
        put(IDS["rig"], "rotation", f, pose["rig"])
        put(IDS["swing"], "rotation", f, pose["swing"])
        put(IDS["squash"], "scaleX", f, pose["sx"])
        put(IDS["squash"], "scaleY", f, pose["sy"])
        put(IDS["canopy"], "x", f, ANCHOR_AT[0] + pose["cx"])
        put(IDS["canopy"], "y", f, ANCHOR_AT[1] + pose["cy"])
        put(IDS["canopy"], "rotation", f, pose["tilt"])
        put(IDS["canopy"], "scaleX", f, CANOPY_SCALE * pose["bx"])
        put(IDS["canopy"], "scaleY", f, CANOPY_SCALE * pose["by"])
        put(IDS["canopy"], "opacity", f, pose["fade"])
        put(IDS["lines"], "opacity", f, pose["fade"])
        if not lines:
            continue
        mesh = mesh_of(f)
        for key, (_, top_id, bottom_id) in LINE_IDS.items():
            l = line(pose, key, mesh, ropes[key].get(f) if ropes else None)
            put(top_id, "x", f, l["top"][0])
            put(top_id, "y", f, l["top"][1])
            put(top_id, "outRotation", f, l["outRotation"])
            put(top_id, "outDistance", f, l["outDistance"])
            put(bottom_id, "x", f, l["bottom"][0])
            put(bottom_id, "y", f, l["bottom"][1])
            put(bottom_id, "inRotation", f, l["inRotation"])
            put(bottom_id, "inDistance", f, l["inDistance"])
    return channels


# --- checks ------------------------------------------------------------------


def validate():
    problems = []
    # The loop and the hand-offs must not jump.
    for name, a, b in [("descend loop", descend(0), descend(CYCLE)),
                       ("descend -> land", descend(CYCLE), land(0)),
                       ("land -> idle", land(LAND), idle(0))]:
        for k in ("rig", "swing", "sx", "sy", "bx", "by"):
            if abs(a[k] - b[k]) > 1e-3:
                problems.append(f"{name}: {k} jumps {a[k]:.4f} -> {b[k]:.4f}")
    # Rotational speed carries across the cycle boundary into the flare.
    v_descend = descend(CYCLE)["rig"] - descend(CYCLE - 1)["rig"]
    v_land = land(1)["rig"] - land(0)["rig"]
    if abs(v_descend - v_land) > 2e-4:
        problems.append(f"swing speed jumps {v_descend:.5f} -> {v_land:.5f} rad/frame")
    # Touchdown: the feet stand where the page parks them.
    td = land(FLARE)
    if abs(td["rig"]) > 1e-6 or abs(td["swing"]) > 1e-6:
        problems.append(f"feet not under the pivot at touchdown: rig {td['rig']:.5f}, swing {td['swing']:.5f}")
    # No line stretches past its length once the canopy is unloaded. The
    # squash pulls the hands down a few px before the canopy follows; the
    # lines are taut and straight then, so a little stretch does not show.
    for key in LINE_IDS:
        for first, last, allowed in ((FLARE, FLARE + 14, 10.0), (FLARE + 15, LAND, 3.0)):
            worst = max(((math.dist(cusp(land(f), key, mesh_at(f)), hand(land(f), key[0])) - LENGTH[key], f)
                         for f in range(first, last + 1) if land(f)["fade"] > 0.05), default=(0, 0))
            if worst[0] > allowed:
                problems.append(f"line {key} stretched {worst[0]:.1f}px at land frame {worst[1]}")
    # The heap stays on the artboard.
    end = land(FLARE + FALL_FRAMES)
    m = canopy_matrix(end)
    xs, ys = zip(*(apply(m, (x, y)) for x, y in MESH_KEYS[-1][1]))
    left, right = min(xs) + PIVOT[0], max(xs) + PIVOT[0]
    bottom = max(ys) + PIVOT[1]
    if left < 0 or right > WIDTH or bottom > HEIGHT:
        problems.append(f"collapsed canopy off the artboard: x {left:.0f}..{right:.0f}, bottom {bottom:.0f}")
    if problems:
        raise SystemExit("gen-scene: " + "\n  ".join(problems))
    print(f"canopy at rest spans x {left:.0f}..{right:.0f}, bottom {bottom:.0f}")


# --- scene -------------------------------------------------------------------


def lines_xml():
    pose, paths = descend(0), []
    for key, (path_id, top_id, bottom_id) in LINE_IDS.items():
        l = line(pose, key, REST_MESH)
        paths.append(
            f'''            <PointsPath name="Line {key[0]}{key[1]}" id="{path_id}">
                <CubicDetachedVertex x="{l['top'][0]:.2f}" y="{l['top'][1]:.2f}" name="Hem" id="{top_id}"/>
                <CubicDetachedVertex x="{l['bottom'][0]:.2f}" y="{l['bottom'][1]:.2f}" name="Hand" id="{bottom_id}"/>
            </PointsPath>''')
    return "\n".join(paths)


def main():
    validate()
    squash_xy = SQUASH_AT
    image_xy = (-FEET[0], -FEET[1])

    descend_keys = keyed(pose_channels(frames(CYCLE, STEP_DESCEND), descend, lambda f: REST_MESH))
    ropes = simulate_ropes()
    land_keys = keyed({**pose_channels(frames(LAND, STEP_LAND), land, mesh_at, ropes=ropes),
                       **mesh_channels(MESH_KEYS, VERTEX_ID_BASE)})
    idle_keys = keyed(pose_channels(frames(IDLE, 8), idle, lambda f: REST_MESH, lines=False))
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
            <StateMachineLayer name="Parachute" id="{IDS['layer']}">
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
    <Artboard defaultStateMachineId="{IDS['machine']}" styleId="{IDS['style']}" width="{WIDTH}" height="{HEIGHT}" name="Defender Parachute" id="{IDS['artboard']}">
        <LayoutComponentStyle name="Artboard Style" id="{IDS['style']}"/>

        <Node x="{PIVOT[0]:.2f}" y="{PIVOT[1]:.2f}" name="Rig" id="{IDS['rig']}">
            <!-- Declared first, so it paints on top: the figure, then the lines,
                 then the canopy behind them both. -->
            <Node x="{SWING_AT[0]:.2f}" y="{SWING_AT[1]:.2f}" name="Swing" id="{IDS['swing']}">
                <Node x="{squash_xy[0]:.2f}" y="{squash_xy[1]:.2f}" name="Squash" id="{IDS['squash']}">
                    <!-- First sibling paints on top: the generated edit is
                         cropped to the eyes, so only the face changes. -->
                    <Image x="{image_xy[0] + BLINK_XY[0]:.2f}" y="{image_xy[1] + BLINK_XY[1]:.2f}"
                           originX="0" originY="0" opacity="0"
                           assetId="{IDS['blink_asset']}" name="Blink" id="{IDS['blink']}"/>
                    <Image x="{image_xy[0]:.2f}" y="{image_xy[1]:.2f}" originX="0" originY="0"
                           assetId="{IDS['figure_asset']}" name="Defender" id="{IDS['figure']}"/>
                </Node>
            </Node>

            <Shape x="0" y="0" name="Lines" id="{IDS['lines']}">
{lines_xml()}
                <Stroke thickness="{LINE_WIDTH}" cap="round" join="round" name="Yarn">
                    <SolidColor colorValue="{LINE_COLOR}" name="Yarn Color"/>
                </Stroke>
            </Shape>

            <Node x="{ANCHOR_AT[0]:.2f}" y="{ANCHOR_AT[1]:.2f}" scaleX="{CANOPY_SCALE}" scaleY="{CANOPY_SCALE}" name="Canopy" id="{IDS['canopy']}">
                <Node x="{-HEM[0]:.2f}" y="{-HEM[1]:.2f}" name="Canopy Texture" id="{IDS['canopy_offset']}">
                    <Image x="0" y="0" originX="0" originY="0"
                           assetId="{IDS['canopy_asset']}" name="Canopy Felt" id="{IDS['canopy_image']}">
{MESH.xml(IDS["canopy_mesh"], "Canopy Mesh", VERTEX_ID_BASE, " " * 24)}
                    </Image>
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

    <ImageAsset file="assets/defender.webp" name="Defender" id="{IDS['figure_asset']}"/>
    <ImageAsset file="assets/canopy.webp" name="Canopy" id="{IDS['canopy_asset']}"/>
    <ImageAsset file="assets/blink.png" name="Blink" id="{IDS['blink_asset']}"/>
</Rive>
'''
    with open(os.path.join(HERE, "scene.rml"), "w") as f:
        f.write(scene)

    # What the page needs to move the canvas: everything in artboard px.
    dome_top = min(apply(mul(node(*PIVOT), canopy_matrix(descend(f))), p)[1]
                   for f in range(CYCLE) for p in REST if p[1] < 40)
    plan = {
        "fps": FPS,
        "artboard": {"width": WIDTH, "height": HEIGHT},
        "figureBox": {"x": FIGURE_BOX[0], "y": FIGURE_BOX[1], "size": TILE},
        "feetY": FIGURE_BOX[1] + FEET[1],
        "contentTop": round(dome_top, 1),
        "cycleFrames": CYCLE,
        "flareFrames": FLARE,
        "touchdownSpeed": TOUCHDOWN_SPEED,
        "shadow": SHADOW,
    }
    with open(os.path.join(HERE, "parachute.json"), "w") as f:
        json.dump(plan, f, indent=2)
        f.write("\n")
    print(f"wrote scene.rml ({len(scene) // 1024} KB) and parachute.json; "
          f"line lengths {', '.join(f'{v:.0f}' for v in LENGTH.values())}")


if __name__ == "__main__":
    main()
