#!/usr/bin/env python3
"""Generate scene.rml and gait.json: the Critic as one skinned mesh, walking.

The figure is a single texture under a single `Mesh`, deformed by bones, so
nothing is cut and there is no seam to hide. See docs/rigging-notes.md for how
the format's skinning rules were established.

Authoring notes, all established by experiment:

  * Mesh vertex x/y are absolute in the Image's parent space. The Image's own
    x/y is ignored once it carries a Mesh.
  * A Tendon's bind transform is the bone's world transform at the bind pose,
    read as Mat2D(xx, xy, yx, yy, tx, ty). The legs hang straight down, so
    their bones are authored at +90 degrees and bind with xx=0 xy=1 yx=-1 yy=0.
  * Bones must sit inside the Image's parent chain, or the skinning delta
    cancels the parent's motion and the figure stops following the rig.
  * `Weight.indices` holds tendonIndex + 1 per byte, 1-based; `Weight.values`
    must total 255 across the slots that are used.

The walk is planned in world space, not keyed by eye. The figure travels at a
constant speed; while a foot is on the ground its lowest point must not move,
so the thigh angle is solved from that constraint and the body bob is whatever
keeps the planted foot on the ground. The page moves the figure across the
screen at exactly the speed this file reports in gait.json, so the feet stay
planted on screen too. Get either half wrong and the figure skates; get the
sign wrong and it moonwalks.

Rive rotation is clockwise-positive (y points down). The figure walks to the
right, so a positive thigh angle puts the foot *behind* the hip.

Run via build-assets.sh, which produces the texture this file reads.
"""

import base64
import bisect
import json
import math
import os
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))

# --- artboard and texture ----------------------------------------------------

ARTBOARD = 640
TEXTURE = 640  # critic.png is a 640x640 composite
FPS = 60

# Where build-assets.sh puts each piece of art, in texture pixels.
BLINK_XY = (243, 90)


# --- skeleton -----------------------------------------------------------------

TORSO = (266.0, 552.0)      # the walking lean pivots at the hips
SHOULDER = (352.0, 246.0)   # where the arm leaves the body
# The hip pivots sit a little up inside the body and the ankle just above the
# foot, which gives the stub legs a long enough lever to take a real step.
HIPS = {"L": (239.0, 544.0), "R": (294.0, 544.0)}
THIGH = 40.0                # hip to ankle
FOOT = 21.0                 # ankle to sole; the foot bone carries everything below

DOWN = math.pi / 2          # rest rotation of a leg bone: pointing straight down

# Tendon order; Weight.indices refer to it 1-based.
TENDONS = ["Torso", "Arm", "LegL", "FootL", "LegR", "FootR"]
TENDON = {name: i + 1 for i, name in enumerate(TENDONS)}
BONE_IDS = {name: f"0:{40 + i}" for i, name in enumerate(TENDONS)}

RIG_ID = "0:20"
BODY_NODE_ID = "0:21"
BLINK_ID = "0:28"

# The figure is drawn as three meshes over the one texture. Within a single
# mesh the runtime does not blend overlapping triangles: a later triangle
# replaces what is under it, transparent pixels and all. So when the near leg
# swung across the far one, the empty pixels around it punched a hole through
# the far leg to the page behind. Separate meshes composite normally.
# Front to back, because the first sibling draws on top. Ids: image, mesh,
# skin, first tendon.
PARTS = [
    ("Near Leg", "L", ("0:29", "0:30", "0:31", 310)),
    ("Critic", "body", ("0:27", "0:26", "0:25", 300)),
    ("Far Leg", "R", ("0:32", "0:33", "0:34", 320)),
]

# --- mesh sampling ------------------------------------------------------------
# Dense through the legs, where they bend; coarse through the torso, which only
# leans rigidly. At the bind pose the mesh renders the texture exactly, so
# density only buys smoothness of deformation, never fidelity.
#
# Columns 272 and 274 straddle the gap between the legs. Below the crotch the
# gap is transparent from x=272 to x=274 on every row, so the left leg can take
# everything up to 272 and the right leg everything from 274, and the only
# triangles that tear when the legs move apart or cross are empty ones.
SPLIT_L, SPLIT_R = 272.0, 274.0
GAP_TOP = 554.0  # below here the strip between the split columns is empty, and dropped
COLUMNS = (
    [140.0, 158.0, 176.0, 194.0, 206.0]
    + [float(x) for x in range(212, 271, 6)]
    + [SPLIT_L, SPLIT_R]
    + [float(x) for x in range(280, 335, 6)]
    + [float(x) for x in range(338, 501, 18)]
)
ROWS = (
    [float(y) for y in range(0, 140, 40)]
    + [float(y) for y in range(140, 351, 21)]
    + [390.0, 430.0, 470.0, 500.0, 510.0, 520.0, 530.0]
    + [float(y) for y in range(536, 615, 3)]
)

# --- weight field -------------------------------------------------------------
# Vertical ramps: where the body hands off to the leg, and the leg to the foot.
HIP_BAND = (538.0, 564.0)
ANKLE_BAND = (578.0, 590.0)

# Above the crotch the body is one piece, so the two legs share it smoothly
# across this half-width. Below the crotch the split is exact (see SPLIT_*).
CROTCH = (550.0, 556.0)
SPINE_BAND = 12.0

# The arm only takes a vertex where the arm texture is present *and* the body
# is not, so the shoulder pixels stay with the body.
ARM_GRIP = 46.0  # distance over which the arm takes a vertex from the body

# --- gait ---------------------------------------------------------------------
# One step is STEP frames; a full cycle (left step + right step) is two. The
# left leg is in stance for the first half of the cycle, the right for the
# second.
#
# In stance the foot is flat on the ground and does not move: the ankle is
# pinned and the hip rides an arc over it, from REACH in front to REACH behind.
# That fixes everything else -- the stride is 2 * THIGH * sin(REACH), the bob
# is THIGH * (1 - cos(thigh angle)), and the body's speed is stride per step.
# Both legs share THIGH, so at each handoff the foot landing and the foot
# leaving ask for exactly the same body height.
STEP = 13
CYCLE = 2 * STEP
REACH = 0.6                               # thigh angle at heel strike / toe-off, rad
STRIDE = 2 * THIGH * math.sin(REACH)      # body travel per step, artboard px
SPEED = STRIDE / STEP                     # artboard px per frame

LIFT = 8.0          # how far the hip draws the swinging leg up, px
FLICK = 0.16        # swing foot: toe down as it leaves, toe up as it reaches, rad
WALK_LEAN = 0.02    # forward lean of the body while walking, rad
STOP_LEAN = 0.035   # the lean peaks as the body brakes, then rocks back
STOP_SQUASH = 0.012 # how far the body sinks into its hips on stopping
ARM_REST = -0.004   # the arm's rest angle, which Idle also uses
ARM_LAG = 0.0025    # lantern lag: rad of arm per px of body drop
ARM_LAG_FRAMES = 4

SETTLE = 40         # frames after the last foot lands for lean and arm to settle

BLINK_KEYS = [(155, 163), (479, 487)]  # closed-eye windows, in frames

REVIEW = os.environ.get("CRITIC_RIG_REVIEW", "")
REVIEW_CYCLES = 3


def smoothstep(edge0, edge1, x):
    if edge1 == edge0:
        return 0.0 if x < edge0 else 1.0
    t = max(0.0, min(1.0, (x - edge0) / (edge1 - edge0)))
    return t * t * (3 - 2 * t)


def ease(s):
    return 0.5 - 0.5 * math.cos(math.pi * s)


def rotate(x, y, angle):
    c, s = math.cos(angle), math.sin(angle)
    return x * c - y * s, x * s + y * c


def alpha_map(path):
    """1.0 where the image is opaque, 0.0 where it is not."""
    raw = subprocess.run(
        ["convert", path, "-alpha", "extract", "-threshold", "50%", "-depth", "8", "gray:-"],
        capture_output=True,
        check=True,
    ).stdout
    if len(raw) != TEXTURE * TEXTURE:
        raise SystemExit(f"{path}: expected {TEXTURE}x{TEXTURE}, got {len(raw)} bytes")
    return raw


# --- the walk -----------------------------------------------------------------
# A pose per leg is (thigh, foot, lift): the thigh's angle from straight down,
# the foot's angle relative to the thigh, and how far the hip is drawn up.
# Positive angles are clockwise, which for a figure walking right puts the foot
# behind the hip.


def stance(distance):
    """Thigh angle and body drop once the body has travelled `distance` px over a planted foot."""
    theta = math.asin(distance / THIGH - math.sin(REACH))
    return theta, THIGH * (1 - math.cos(theta))


def planted(theta):
    return (theta, -theta, 0.0)  # the foot stays flat whatever the thigh does


def swing(s, start=REACH, end=-REACH, height=1.0):
    """The free leg: lifted, carried from behind to in front, and set down flat."""
    theta = start + (end - start) * ease(s)
    foot = FLICK * math.sin(2 * math.pi * s) * (abs(start - end) / (2 * REACH))
    lift = -LIFT * height * math.sin(math.pi * s)
    return (theta, foot - theta, lift)


def walk_cycle():
    """Per-frame pose for one looping cycle, frames 0..CYCLE inclusive."""
    frames = []
    for f in range(CYCLE + 1):
        u = (f % STEP) / STEP
        stand, free = ("L", "R") if (f % CYCLE) < STEP else ("R", "L")
        theta, drop = stance(u * STRIDE)
        frames.append({
            stand: planted(theta),
            free: swing(u),
            "bob": drop,
            "lean": WALK_LEAN,
            "squash": 1.0,
            "travel": SPEED * f,
        })

    # The lantern lags the body: when the body drops, the hand rises a touch.
    for f, pose in enumerate(frames):
        lagged = frames[(f - ARM_LAG_FRAMES) % CYCLE]["bob"]
        pose["arm"] = ARM_REST - ARM_LAG * lagged
    return frames


def stop_sequence(cycle):
    """Per-frame pose from the end of a cycle to standing still.

    The cycle ends with the left foot just planted in front and the right foot
    about to leave from behind. The body brakes to a stop over the left foot,
    the right foot swings up beside it, and the lean and lantern rock to rest.
    """
    remaining = STRIDE / 2           # from planting the left foot to standing over it
    brake = round(2 * remaining / SPEED)

    # x(g) = SPEED g + b g^2 + c g^3: leaves at walking speed, arrives at rest.
    b = (3 * remaining - 2 * SPEED * brake) / brake**2
    c = -(SPEED + 2 * b * brake) / (3 * brake**2)

    frames = []
    for g in range(brake + SETTLE + 1):
        k = min(g, brake)
        x = SPEED * k + b * k * k + c * k * k * k
        theta, drop = stance(x)
        pose = {
            "L": planted(theta),
            "R": swing(k / brake, start=REACH, end=0.0, height=0.8),
            "bob": drop,
            "travel": x,
        }

        if g <= brake:
            pose["lean"] = WALK_LEAN + (STOP_LEAN - WALK_LEAN) * ease(k / brake)
            pose["squash"] = 1.0
        else:
            # A damped rock back to upright, and the body settling into its
            # hips -- a squash about the hip pivot, so the feet stay put.
            t = g - brake
            zeta, omega = 1 / 11.0, 2 * math.pi / 34.0
            rock = math.exp(-zeta * t) * (math.cos(omega * t) + zeta / omega * math.sin(omega * t))
            pose["lean"] = STOP_LEAN * rock * (1 - smoothstep(SETTLE - 12, SETTLE, t))
            pose["squash"] = 1.0 - STOP_SQUASH * math.sin(math.pi * min(1.0, t / 20))
        frames.append(pose)

    bobs = [p["bob"] for p in cycle[CYCLE - ARM_LAG_FRAMES:CYCLE]] + [p["bob"] for p in frames]
    for g, pose in enumerate(frames):
        pose["arm"] = ARM_REST - ARM_LAG * bobs[g]
    frames[-1].update(lean=0.0, squash=1.0, arm=ARM_REST)
    return frames, brake


# --- checks -------------------------------------------------------------------


class Foot:
    """The underside of one foot, for checking poses against the ground."""

    def __init__(self, side, alpha):
        self.hip = HIPS[side]
        lo, hi = (200, int(SPLIT_L)) if side == "L" else (int(SPLIT_R), 340)
        self.sole = []
        for x in range(lo, hi + 1):
            ys = [y for y in range(580, TEXTURE) if alpha[y * TEXTURE + x] > 127]
            if ys:
                self.sole.append((x + 0.5, max(ys) + 1.0))
        self.ground = max(y for _, y in self.sole)

    def points(self, pose, bob, travel):
        theta, foot, lift = pose
        hx, hy = self.hip
        ax, ay = rotate(0.0, THIGH, theta)
        ax, ay = hx + ax, hy + lift + ay
        return [
            (travel + ax + dx, bob + ay + dy)
            for dx, dy in (rotate(px - hx, py - (hy + THIGH), theta + foot) for px, py in self.sole)
        ]


def validate(cycle, stop, alpha):
    """Catch what the format cannot see: a foot that skates, scuffs or sinks."""
    feet = {side: Foot(side, alpha) for side in ("L", "R")}
    problems = []
    clearance = []

    for name, frames in (("cycle", cycle), ("stop", stop)):
        for f, pose in enumerate(frames):
            for side, foot in feet.items():
                pts = foot.points(pose[side], pose["bob"], pose["travel"])
                height = foot.ground - max(y for _, y in pts)  # > 0: off the ground
                if height < -0.5:
                    problems.append(f"{name} {f}: {side} foot {-height:.1f}px into the ground")
                is_stance = pose[side][2] == 0.0 and pose[side][1] == -pose[side][0]
                if name == "cycle" and not is_stance:
                    u = (f % STEP) / STEP
                    if 0.2 <= u <= 0.8:
                        clearance.append(height)
                if is_stance and f + 1 < len(frames):
                    nxt = frames[f + 1]
                    if nxt[side][2] == 0.0 and nxt[side][1] == -nxt[side][0]:
                        after = foot.points(nxt[side], nxt["bob"], nxt["travel"])
                        slide = max(abs(a[0] - b[0]) + abs(a[1] - b[1]) for a, b in zip(pts, after))
                        if slide > 0.01:
                            problems.append(f"{name} {f}: planted {side} foot moves {slide:.2f}px")

    if min(clearance) < 2.0:
        problems.append(f"swinging foot clears the ground by only {min(clearance):.1f}px")
    if problems:
        raise SystemExit("gait check failed:\n  " + "\n  ".join(problems[:20]))
    return min(clearance)


# --- mesh ---------------------------------------------------------------------


def pack(influences):
    values = 0
    indices = 0
    for slot, (tendon, weight) in enumerate(influences):
        values |= int(round(weight)) << (8 * slot)
        indices |= tendon << (8 * slot)
    return values, indices


def to_bytes_255(weights):
    """Float weights -> up to four (tendon, byte) pairs summing to 255.

    Largest-remainder rounding, because the runtime divides by 255 and does not
    renormalise.
    """
    live = [(TENDON[name], w) for name, w in weights.items() if w > 1e-4]
    if not live:
        return []
    live.sort(key=lambda pair: -pair[1])
    live = live[:4]
    total = sum(w for _, w in live)
    scaled = [w * 255 / total for _, w in live]

    floors = [int(math.floor(s)) for s in scaled]
    short = 255 - sum(floors)
    order = sorted(range(len(scaled)), key=lambda i: -(scaled[i] - floors[i]))
    for i in order[:short]:
        floors[i] += 1
    return [(tendon, byte) for (tendon, _), byte in zip(live, floors) if byte > 0]


def varint(value):
    out = bytearray()
    while True:
        byte = value & 0x7F
        value >>= 7
        if value:
            out.append(byte | 0x80)
        else:
            out.append(byte)
            return bytes(out)


def vertex_weights(x, y, base_alpha, arm_alpha):
    px, py = int(round(min(x, TEXTURE - 1))), int(round(min(y, TEXTURE - 1)))
    offset = py * TEXTURE + px

    arm_only = (arm_alpha[offset] > 127) and (base_alpha[offset] <= 127)
    if arm_only:
        reach = math.hypot(x - SHOULDER[0], y - SHOULDER[1])
        arm_w = smoothstep(0.0, ARM_GRIP, reach)
        if arm_w > 0.0:
            return {"Torso": 1.0 - arm_w, "Arm": arm_w}

    hip = smoothstep(HIP_BAND[0], HIP_BAND[1], y)
    ankle = smoothstep(ANKLE_BAND[0], ANKLE_BAND[1], y)
    band = SPINE_BAND * (1 - smoothstep(CROTCH[0], CROTCH[1], y))
    middle = (SPLIT_L + SPLIT_R) / 2
    if band > 0.5:
        right = smoothstep(middle - band, middle + band, x)
    else:
        right = 0.0 if x < middle else 1.0
    return {
        "Torso": 1.0 - hip,
        "LegL": hip * (1 - ankle) * (1 - right),
        "FootL": hip * ankle * (1 - right),
        "LegR": hip * (1 - ankle) * right,
        "FootR": hip * ankle * right,
    }


def build_meshes(base_alpha, arm_alpha, texture_coverage, tendons):
    """Emit one <Image> with a skinned mesh per entry in PARTS."""
    vertices = []
    for row, y in enumerate(ROWS):
        for col, x in enumerate(COLUMNS):
            weights = vertex_weights(x, y, base_alpha, arm_alpha)
            vertices.append((row, col, x, y, weights, to_bytes_255(weights)))

    def leg_share(tri, side):
        return sum(vertices[i][4].get(f"Leg{side}", 0) + vertices[i][4].get(f"Foot{side}", 0)
                   for i in tri) / 3

    layers = {"body": [], "R": [], "L": []}
    for row in range(len(ROWS) - 1):
        for col in range(len(COLUMNS) - 1):
            if COLUMNS[col] == SPLIT_L and ROWS[row] >= GAP_TOP:
                continue  # the empty strip the legs tear open; nothing to draw
            a = row * len(COLUMNS) + col
            b = (row + 1) * len(COLUMNS) + col
            c = (row + 1) * len(COLUMNS) + col + 1
            d = row * len(COLUMNS) + col + 1
            for tri in ([a, b, c], [a, c, d]):
                left, right = leg_share(tri, "L"), leg_share(tri, "R")
                if max(left, right) < 0.5:
                    layers["body"].append(tri)
                else:
                    layers["L" if left >= right else "R"].append(tri)

    # Each leg mesh also carries the band of body triangles its leg pulls on,
    # painted first. The body mesh has them too, so the copy is invisible, but
    # it means the seam between leg and body lies inside one mesh, where the
    # rasteriser leaves no crack. Only fully opaque triangles are copied: a
    # semi-transparent outline pixel painted twice comes out darker.
    def opaque(tri):
        xs = [vertices[i][2] for i in tri]
        ys = [vertices[i][3] for i in tri]
        return all(texture_coverage[y * TEXTURE + x] == 255
                   for y in range(int(min(ys)), min(int(max(ys)) + 1, TEXTURE))
                   for x in range(int(min(xs)), min(int(max(xs)) + 1, TEXTURE)))

    def band(side):
        return [tri for tri in layers["body"]
                if any(vertices[i][4].get(f"Leg{side}", 0) > 0 for i in tri) and opaque(tri)]

    images, next_id, counts = [], 1000, []
    for name, part, (image_id, mesh_id, skin_id, tendon_base) in PARTS:
        triangles = layers["body"] if part == "body" else band(part) + layers[part]
        used = sorted({i for tri in triangles for i in tri})
        local = {index: n for n, index in enumerate(used)}

        lines = []
        for index in used:
            row, col, x, y, _, influences = vertices[index]
            kind = "ContourMeshVertex" if col in (0, len(COLUMNS) - 1) else "MeshVertex"
            weight = ""
            if influences:
                values, indices = pack(influences)
                weight = f'\n                    <Weight values="{values}" indices="{indices}"/>'
            lines.append(
                f'                    <{kind} x="{x:.1f}" y="{y:.1f}" '
                f'u="{x / TEXTURE:.5f}" v="{y / TEXTURE:.5f}" '
                f'name="V{row}_{col}" id="0:{next_id}">{weight}\n                    </{kind}>'
            )
            next_id += 1

        buffer = b"".join(varint(local[i]) for tri in triangles for i in tri)
        images.append(f'''                <Image x="0" y="0" originX="0" originY="0"
                       assetId="0:60" name="{name}" id="{image_id}">
                    <Mesh triangleIndexBytes="{base64.b64encode(buffer).decode()}" name="{name} Mesh" id="{mesh_id}">
{chr(10).join(lines)}

                        <Skin tx="0" ty="0" name="{name} Skin" id="{skin_id}">
{tendons(tendon_base)}
                        </Skin>
                    </Mesh>
                </Image>''')
        counts.append(f"{name.lower()} {len(triangles)}")
    return "\n\n".join(images), ", ".join(counts)


# --- keyframes ----------------------------------------------------------------


def keyframes_xml(entries, easing=False):
    out = []
    for frame, value in entries:
        if easing:
            out.append(
                f'                    <KeyFrameDouble value="{value:.4f}" frame="{frame}" '
                f'interpolationType="cubic"><CubicEaseInterpolator/></KeyFrameDouble>'
            )
        else:
            out.append(
                f'                    <KeyFrameDouble value="{value:.4f}" frame="{frame}" '
                f'interpolationType="linear"/>'
            )
    return "\n".join(out)


def keyed_object(object_id, properties):
    body = "\n".join(
        f'                <KeyedProperty property="{prop}">\n'
        f"{keyframes_xml(entries, easing)}\n"
        f"                </KeyedProperty>"
        for prop, entries, easing in properties
    )
    return f'            <KeyedObject objectId="{object_id}">\n{body}\n            </KeyedObject>'


def pose_keys(frames, offset=0):
    """Turn per-frame poses into keyed objects for the body, torso, arm and legs."""
    def series(get):
        return [(offset + f, get(p)) for f, p in enumerate(frames)]

    out = [
        keyed_object(BODY_NODE_ID, [("y", series(lambda p: p["bob"]), False)]),
        keyed_object(BONE_IDS["Torso"], [
            ("rotation", series(lambda p: p["lean"]), False),
            ("scaleY", series(lambda p: p["squash"]), False),
        ]),
        keyed_object(BONE_IDS["Arm"], [("rotation", series(lambda p: p["arm"]), False)]),
    ]
    for side in ("L", "R"):
        out.append(keyed_object(BONE_IDS[f"Leg{side}"], [
            ("y", series(lambda p, s=side: HIPS[s][1] + p[s][2]), False),
            ("rotation", series(lambda p, s=side: DOWN + p[s][0]), False),
        ]))
        out.append(keyed_object(BONE_IDS[f"Foot{side}"], [
            ("rotation", series(lambda p, s=side: p[s][1]), False),
        ]))
    return out


# --- scene --------------------------------------------------------------------


def main():
    figures = os.path.normpath(os.path.join(HERE, "../../../src/assets/figures"))
    base_alpha = alpha_map(os.path.join(figures, "figure-lantern-base.webp"))
    arm_alpha = alpha_map(os.path.join(figures, "figure-lantern-arm.webp"))
    texture_alpha = alpha_map(os.path.join(HERE, "assets/critic.png"))

    # The rightmost opaque pixel (the lantern), so the page knows how far off
    # screen the figure has to start to be hidden.
    figure_right = max(
        x for y in range(TEXTURE) for x in range(TEXTURE) if texture_alpha[y * TEXTURE + x] > 127
    ) + 1

    cycle = walk_cycle()
    stop, brake = stop_sequence(cycle)
    clearance = validate(cycle, stop, texture_alpha)

    rot90 = 'xx="0" xy="1" yx="-1" yy="0" '
    tendon_binds = {
        "Torso": ("", TORSO),
        "Arm": ("", SHOULDER),
        "LegL": (rot90, HIPS["L"]),
        "FootL": (rot90, (HIPS["L"][0], HIPS["L"][1] + THIGH)),
        "LegR": (rot90, HIPS["R"]),
        "FootR": (rot90, (HIPS["R"][0], HIPS["R"][1] + THIGH)),
    }

    def tendons(first_id):
        return "\n".join(
            f'                            <Tendon boneId="{BONE_IDS[name]}" {matrix}'
            f'tx="{xy[0]}" ty="{xy[1]}" name="{name} Tendon" id="0:{first_id + i}"/>'
            for i, (name, (matrix, xy)) in enumerate(tendon_binds.items())
        )

    coverage = subprocess.run(
        ["convert", os.path.join(HERE, "assets/critic.png"), "-alpha", "extract", "-depth", "8", "gray:-"],
        capture_output=True, check=True,
    ).stdout
    meshes, mesh_counts = build_meshes(base_alpha, arm_alpha, coverage, tendons)

    # The arm hangs off the torso so it leans with it. The legs are chains:
    # the shin is a child of the thigh, so the foot follows the hip.
    bones = [
        f'                <RootBone x="{TORSO[0]}" y="{TORSO[1]}" length="0" rotation="0" '
        f'name="Torso" id="{BONE_IDS["Torso"]}">',
        f'                    <RootBone x="{SHOULDER[0] - TORSO[0]}" y="{SHOULDER[1] - TORSO[1]}" '
        f'length="0" rotation="0" name="Arm" id="{BONE_IDS["Arm"]}"/>',
        "                </RootBone>",
    ]
    for side in ("L", "R"):
        hx, hy = HIPS[side]
        bones += [
            f'                <RootBone x="{hx}" y="{hy}" length="{THIGH}" rotation="{DOWN:.7f}" '
            f'name="Leg{side}" id="{BONE_IDS[f"Leg{side}"]}">',
            f'                    <Bone length="{FOOT}" rotation="0" name="Foot{side}" '
            f'id="{BONE_IDS[f"Foot{side}"]}"/>',
            "                </RootBone>",
        ]
    bones = "\n".join(bones)

    walk = pose_keys(cycle)
    stopping = pose_keys(stop)

    # Idle: the figure stands and breathes, the lantern lifts once, the eyes
    # blink twice.
    idle_bob = [(0, 0.0), (300, 1.4), (600, 0.0)]
    idle_arm = [(0, ARM_REST), (240, ARM_REST), (300, -0.1), (390, -0.1), (450, ARM_REST), (600, ARM_REST)]
    blink = [(0, 0.0)]
    for start, end in BLINK_KEYS:
        blink += [(start - 1, 0.0), (start, 1.0), (end, 0.0)]
    blink.append((600, 0.0))
    idle = [
        keyed_object(BODY_NODE_ID, [("y", idle_bob, True)]),
        keyed_object(BONE_IDS["Arm"], [("rotation", idle_arm, False)]),
        keyed_object(BLINK_ID, [("opacity", blink, True)]),
    ]

    walk_total = CYCLE * REVIEW_CYCLES + len(stop) - 1
    artboard_width = ARTBOARD
    rig_x = 0.0
    review_anim = ""
    default_machine = "0:7"
    if REVIEW == "walk":
        # Review only: the figure travels inside a wider artboard, so a still
        # frame shows whether the planted foot holds its ground.
        artboard_width = 1000
        rig_x = 300.0
        total = SPEED * CYCLE * REVIEW_CYCLES + stop[-1]["travel"]
        frames = []
        for n in range(REVIEW_CYCLES):
            for f, pose in enumerate(cycle[:-1]):
                frames.append(dict(pose, travel=SPEED * (n * CYCLE + f)))
        for pose in stop:
            frames.append(dict(pose, travel=SPEED * CYCLE * REVIEW_CYCLES + pose["travel"]))
        travel = [(f, rig_x + p["travel"] - total) for f, p in enumerate(frames)]
        review_anim = f'''
        <LinearAnimation loopValue="oneShot" fps="{FPS}" duration="{walk_total}" name="Review" id="0:80">
{keyed_object(RIG_ID, [("x", travel, False)])}
{chr(10).join(pose_keys(frames))}
        </LinearAnimation>'''
        default_machine = "0:81"
    elif REVIEW == "bind":
        default_machine = "0:91"

    review_machines = f'''
        <StateMachine name="Review" id="0:81">
            <StateMachineLayer name="Review Layer" id="0:82">
                <AnyState x="160" y="-120"/>
                <ExitState x="560" y="-120"/>
                <EntryState x="0" y="0">
                    <StateTransition stateToId="0:83"/>
                </EntryState>
                <AnimationState x="160" y="0" animationId="0:80" id="0:83"/>
            </StateMachineLayer>
        </StateMachine>''' if REVIEW == "walk" else ""
    if REVIEW == "bind":
        review_machines = '''
        <StateMachine name="Bind" id="0:91">
            <StateMachineLayer name="Bind Layer" id="0:92">
                <AnyState x="160" y="-120"/>
                <ExitState x="560" y="-120"/>
                <EntryState x="0" y="0"/>
            </StateMachineLayer>
        </StateMachine>'''

    scene = f'''<Rive version="1" kind="fragment">
    <Artboard defaultStateMachineId="{default_machine}" styleId="0:5" width="{artboard_width}" height="{ARTBOARD}" name="Critic" id="0:2">
        <LayoutComponentStyle name="Artboard Style" id="0:5"/>

        <Node x="{rig_x}" y="0" name="Critic Rig" id="{RIG_ID}">
            <Node x="0" y="0" name="Critic Body" id="{BODY_NODE_ID}">
                <!-- Declared first, so it paints over the figure: the closed-eye
                     overlay is a separate texture, so it is not part of the mesh. -->
                <Image x="{BLINK_XY[0]}" y="{BLINK_XY[1]}" originX="0" originY="0" opacity="0"
                       assetId="0:62" name="Blink" id="{BLINK_ID}"/>

{meshes}

{bones}
            </Node>
        </Node>

        <!-- The page drives this: Walk loops in place until `arrive` is set,
             then finishes its cycle, brakes in Stop and stands in Idle. The
             page moves the figure across the screen at the speed in gait.json. -->
        <StateMachine name="Motion" id="0:7">
            <StateMachineBool name="arrive" id="0:9"/>
            <StateMachineLayer name="Walk Layer" id="0:8">
                <AnyState x="160" y="-120"/>
                <ExitState x="760" y="-120"/>
                <EntryState x="0" y="0">
                    <StateTransition stateToId="0:12"/>
                </EntryState>
                <AnimationState x="160" y="0" animationId="0:6" id="0:12">
                    <StateTransition stateToId="0:13" enableExitTime="true"
                                     exitTimeIsPercetange="true" exitTime="100">
                        <TransitionBoolCondition inputId="0:9" opValue="equal"/>
                    </StateTransition>
                </AnimationState>
                <AnimationState x="360" y="0" animationId="0:15" id="0:13">
                    <StateTransition stateToId="0:14" enableExitTime="true"
                                     exitTimeIsPercetange="true" exitTime="100"/>
                </AnimationState>
                <AnimationState x="560" y="0" animationId="0:16" id="0:14"/>
            </StateMachineLayer>
        </StateMachine>
{review_machines}

        <LinearAnimation loopValue="loop" fps="{FPS}" duration="{CYCLE}" name="Walk" id="0:6">
{chr(10).join(walk)}
        </LinearAnimation>

        <LinearAnimation loopValue="oneShot" fps="{FPS}" duration="{len(stop) - 1}" name="Stop" id="0:15">
{chr(10).join(stopping)}
        </LinearAnimation>

        <LinearAnimation loopValue="loop" fps="{FPS}" duration="600" name="Idle" id="0:16">
{chr(10).join(idle)}
        </LinearAnimation>
{review_anim}
    </Artboard>

    <ImageAsset file="assets/critic.png" name="Critic" id="0:60"/>
    <ImageAsset file="assets/blink.png" name="Blink" id="0:62"/>
</Rive>
'''

    with open(os.path.join(HERE, "scene.rml"), "w") as handle:
        handle.write(scene)

    # What the page needs to move the figure without its feet skating.
    gait = {
        "fps": FPS,
        "artboard": ARTBOARD,
        "figureRight": figure_right,
        "cycleFrames": CYCLE,
        "cycleTravel": round(SPEED * CYCLE, 4),
        "stopTravel": [round(p["travel"], 4) for p in stop[: brake + 1]],
    }
    with open(os.path.join(HERE, "gait.json"), "w") as handle:
        json.dump(gait, handle, indent=2)
        handle.write("\n")

    print(
        f"wrote scene.rml: {len(ROWS)}x{len(COLUMNS)} grid as three meshes "
        f"(triangles: {mesh_counts}), {len(TENDONS)} bones"
    )
    print(
        f"gait: {CYCLE}-frame cycle, {STRIDE:.1f}px stride, {SPEED * FPS:.0f}px/s, "
        f"bob {THIGH * (1 - math.cos(REACH)):.1f}px, swing clearance {clearance:.1f}px, "
        f"stop brakes over {brake} frames"
    )


if __name__ == "__main__":
    sys.exit(main())
