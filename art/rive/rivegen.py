"""Shared helpers for the generated Rive scenes in art/rive/*/gen-scene.py.

Everything here is independent of any one character: the transform maths
the runtime uses, an image mesh on a regular grid, ropes for slack lines, and
the writers that turn per-frame poses into linear RML keyframes. See
docs/rive-entrance-playbook.md for how a scene is put together from them.

A generator imports it with:

    sys.path.insert(0, os.path.dirname(HERE))
    from rivegen import ...
"""

import base64
import bisect
import math

# --- easing ------------------------------------------------------------------


def smoothstep(edge0, edge1, x):
    t = min(1.0, max(0.0, (x - edge0) / (edge1 - edge0)))
    return t * t * (3 - 2 * t)


def hermite(t, p0, p1, v0, v1):
    """Cubic from p0 to p1 over t in [0, 1], with end slopes v0, v1 (per unit t)."""
    t = min(1.0, max(0.0, t))
    h00 = 2 * t ** 3 - 3 * t ** 2 + 1
    h10 = t ** 3 - 2 * t ** 2 + t
    h01 = -2 * t ** 3 + 3 * t ** 2
    h11 = t ** 3 - t ** 2
    return h00 * p0 + h10 * v0 + h01 * p1 + h11 * v1


def damped_to_rest(f, speed, frames):
    """Leaves zero at `speed` per frame, swings once and is back at zero, standing
    still, after `frames`: v0 * f * (1 - f/F)^2. Hands a loop's swing to a stop."""
    f = min(max(f, 0.0), frames)
    return speed * f * (1 - f / frames) ** 2


# --- transforms --------------------------------------------------------------


def node(x=0.0, y=0.0, rotation=0.0, sx=1.0, sy=1.0):
    """A Rive node's local transform: translate, rotate, then scale."""
    c, s = math.cos(rotation), math.sin(rotation)
    return (c * sx, s * sx, -s * sy, c * sy, x, y)


def mul(m, n):
    a, b, c, d, tx, ty = m
    e, f, g, h, ux, uy = n
    return (a * e + c * f, b * e + d * f, a * g + c * h, b * g + d * h,
            a * ux + c * uy + tx, b * ux + d * uy + ty)


def apply(m, p):
    a, b, c, d, tx, ty = m
    return (a * p[0] + c * p[1] + tx, b * p[0] + d * p[1] + ty)


# --- image meshes ------------------------------------------------------------


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


class Grid:
    """A grid of mesh vertices over a texture of `size` pixels.

    `Grid(size, columns, rows)` spaces the lines evenly; `Grid.lines(size,
    xs, ys)` puts them where they are needed, e.g. close together only where
    the texture bends. Vertices are numbered row by row; each cell is split
    along its top-left to bottom-right diagonal. Keep any deformation of it
    monotonic (rows and columns in order): within one mesh, overlapping
    triangles do not blend.
    """

    def __init__(self, size, columns, rows):
        self._setup(size, [size[0] * i / (columns - 1) for i in range(columns)],
                    [size[1] * j / (rows - 1) for j in range(rows)])

    @classmethod
    def lines(cls, size, xs, ys):
        grid = cls.__new__(cls)
        grid._setup(size, list(xs), list(ys))
        return grid

    def _setup(self, size, xs, ys):
        self.size, self.xs, self.ys = size, xs, ys
        self.columns, self.rows = len(xs), len(ys)
        self.rest = [(x, y) for y in self.ys for x in self.xs]

    def triangles(self):
        tris = []
        for row in range(self.rows - 1):
            for col in range(self.columns - 1):
                a = row * self.columns + col
                b = (row + 1) * self.columns + col
                c = (row + 1) * self.columns + col + 1
                d = row * self.columns + col + 1
                tris += [(a, b, c), (a, c, d)]
        return tris

    def barycentric(self, p):
        """The rest triangle holding p, and p's weights in it."""
        col = min(self.columns - 2, max(0, bisect.bisect_right(self.xs, p[0]) - 1))
        row = min(self.rows - 2, max(0, bisect.bisect_right(self.ys, p[1]) - 1))
        u = (p[0] - self.xs[col]) / (self.xs[col + 1] - self.xs[col])
        v = (p[1] - self.ys[row]) / (self.ys[row + 1] - self.ys[row])
        a = row * self.columns + col
        b, c, d = a + self.columns, a + self.columns + 1, a + 1
        if v >= u:   # below the a-c diagonal: triangle a, b, c
            return (a, b, c), (1 - v, v - u, u)
        return (a, c, d), (1 - u, v, u - v)

    @staticmethod
    def point(vertices, weights):
        """Where a barycentric point is on a (deformed) mesh."""
        (i, j, k), (wi, wj, wk) = weights
        return (wi * vertices[i][0] + wj * vertices[j][0] + wk * vertices[k][0],
                wi * vertices[i][1] + wj * vertices[j][1] + wk * vertices[k][1])

    def xml(self, mesh_id, name, vertex_id_base, indent):
        lines = []
        for n, (x, y) in enumerate(self.rest):
            col, row = n % self.columns, n // self.columns
            border = col in (0, self.columns - 1) or row in (0, self.rows - 1)
            kind = "ContourMeshVertex" if border else "MeshVertex"
            lines.append(f'{indent}    <{kind} x="{x:.2f}" y="{y:.2f}" '
                         f'u="{x / self.size[0]:.5f}" v="{y / self.size[1]:.5f}" id="0:{vertex_id_base + n}"/>')
        buffer = b"".join(varint(i) for tri in self.triangles() for i in tri)
        return (f'{indent}<Mesh triangleIndexBytes="{base64.b64encode(buffer).decode()}" '
                f'name="{name}" id="{mesh_id}">\n' + "\n".join(lines) + f"\n{indent}</Mesh>")


def interpolate(keys, frame):
    """A keyed mesh as the runtime draws it: linear between its (frame, vertices) keys."""
    for (f0, v0), (f1, v1) in zip(keys, keys[1:]):
        if f0 <= frame <= f1:
            t = (frame - f0) / (f1 - f0)
            return [(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t) for a, b in zip(v0, v1)]
    return keys[-1][1]


def mesh_channels(keys, vertex_id_base, rest=None):
    """Channels for a keyed mesh; given its `rest`, only the vertices that move."""
    moving = set(range(len(keys[0][1])))
    if rest is not None:
        moving = {n for n in moving if any(math.dist(v[n], rest[n]) > 1e-4 for _, v in keys)}
    channels = {}
    for frame, vertices in keys:
        for n, (x, y) in enumerate(vertices):
            if n in moving:
                channels.setdefault((f"0:{vertex_id_base + n}", "x"), []).append((frame, x))
                channels.setdefault((f"0:{vertex_id_base + n}", "y"), []).append((frame, y))
    return channels


# --- lines and ropes ---------------------------------------------------------


def fit_cubic(points):
    """Least-squares cubic through a polyline, its two ends fixed: (c1, c2)."""
    lengths = [0.0]
    for a, b in zip(points, points[1:]):
        lengths.append(lengths[-1] + math.dist(a, b))
    p0, p3 = points[0], points[-1]
    s11 = s12 = s22 = 0.0
    r1, r2 = [0.0, 0.0], [0.0, 0.0]
    for q, length in zip(points, lengths):
        t = length / lengths[-1]
        b0, b1, b2, b3 = (1 - t) ** 3, 3 * (1 - t) ** 2 * t, 3 * (1 - t) * t ** 2, t ** 3
        s11, s12, s22 = s11 + b1 * b1, s12 + b1 * b2, s22 + b2 * b2
        for axis in (0, 1):
            r = q[axis] - b0 * p0[axis] - b3 * p3[axis]
            r1[axis] += b1 * r
            r2[axis] += b2 * r
    det = s11 * s22 - s12 * s12
    c1 = tuple((s22 * r1[a] - s12 * r2[a]) / det for a in (0, 1))
    c2 = tuple((s11 * r2[a] - s12 * r1[a]) / det for a in (0, 1))
    return c1, c2


def rope(ends, length, start, end, fall_speed, ground,
         segments=14, gravity=0.8, damping=0.9, substeps=4, iterations=20):
    """A line gone slack, as a hanging rope: {frame: (c1, c2)} from start to end.

    `ends(f)` gives the two pinned ends at a (fractional) frame. The rope
    starts straight between them, moving down at `fall_speed`, and is a verlet
    chain of fixed `length` under `gravity` (px per frame^2), kept above
    `ground`. One cubic is fitted to it per frame, so the runtime still draws
    two vertices.
    """
    substep_gravity = gravity / substeps ** 2
    substep_damping = damping ** (1 / substeps)
    rest = length / segments
    top, bottom = ends(start)
    points = [(top[0] + (bottom[0] - top[0]) * i / segments, top[1] + (bottom[1] - top[1]) * i / segments)
              for i in range(segments + 1)]
    previous = [(x, y - fall_speed / substeps) for x, y in points]
    shapes = {start: fit_cubic(points)}
    for f in range(start + 1, end + 1):
        for sub in range(1, substeps + 1):
            top, bottom = ends(f - 1 + sub / substeps)
            moved = [points[0]]
            for (x, y), (px, py) in zip(points[1:-1], previous[1:-1]):
                moved.append((x + (x - px) * substep_damping, y + (y - py) * substep_damping + substep_gravity))
            moved.append(points[-1])
            previous, points = points, moved
            points[0], points[-1] = top, bottom
            for _ in range(iterations):
                for i in range(segments):
                    (ax, ay), (bx, by) = points[i], points[i + 1]
                    dx, dy = bx - ax, by - ay
                    d = math.hypot(dx, dy) or 1e-9
                    push = (d - rest) / d * 0.5
                    if i > 0:
                        points[i] = (ax + dx * push, ay + dy * push)
                    if i + 1 < segments:
                        points[i + 1] = (bx - dx * push, by - dy * push)
                points = [points[0]] + [(x, min(y, ground)) for x, y in points[1:-1]] + [points[-1]]
        shapes[f] = fit_cubic(points)
    return shapes


def line_vertices(top, bottom, handles=None):
    """Two CubicDetachedVertex values for a line: straight, or a fitted cubic's handles."""
    if handles is None:
        return {"top": top, "bottom": bottom,
                "outRotation": 0.0, "outDistance": 0.0, "inRotation": 0.0, "inDistance": 0.0}
    c1, c2 = handles
    out = (c1[0] - top[0], c1[1] - top[1])
    into = (c2[0] - bottom[0], c2[1] - bottom[1])
    return {
        "top": top, "bottom": bottom,
        "outRotation": math.atan2(out[1], out[0]), "outDistance": math.hypot(*out),
        "inRotation": math.atan2(into[1], into[0]), "inDistance": math.hypot(*into),
    }


# --- keyframes ---------------------------------------------------------------


def frames(duration, step):
    """Key frames 0, step, 2·step, … and always the last one."""
    out = list(range(0, duration, step))
    return out + [duration]


def compress(entries):
    """Drop keys a linear segment through their neighbours already gives."""
    if len(entries) <= 2:
        return entries
    out = [entries[0]]
    for prev, cur, nxt in zip(entries, entries[1:], entries[2:]):
        (f0, v0), (f1, v1), (f2, v2) = out[-1], cur, nxt
        between = v0 + (v2 - v0) * (f1 - f0) / (f2 - f0)
        if abs(between - v1) > 1e-4:
            out.append(cur)
    out.append(entries[-1])
    return out


def keyed(channels):
    """{(object id, property): [(frame, value)]} -> KeyedObject xml, linear keys."""
    by_object = {}
    for (object_id, prop), entries in channels.items():
        by_object.setdefault(object_id, []).append((prop, compress(entries)))
    out = []
    for object_id, props in by_object.items():
        body = []
        for prop, entries in props:
            keys = "\n".join(
                f'                    <KeyFrameDouble value="{v:.4f}" frame="{f}" interpolationType="linear"/>'
                for f, v in entries)
            body.append(f'                <KeyedProperty property="{prop}">\n{keys}\n                </KeyedProperty>')
        out.append(f'            <KeyedObject objectId="{object_id}">\n' + "\n".join(body) + "\n            </KeyedObject>")
    return "\n".join(out)


class Channels:
    """Collects per-frame values for `keyed`."""

    def __init__(self):
        self.data = {}

    def put(self, object_id, prop, frame, value):
        self.data.setdefault((object_id, prop), []).append((frame, value))

    def update(self, other):
        self.data.update(other)
        return self


# --- blink -------------------------------------------------------------------
#
# A closed-eye overlay (assets/blink.png, cut by scripts/blink-overlay.py)
# painted over the figure and shown for a moment twice in a ten-second loop,
# on a layer of its own. It is declared just before the figure's Image, as
# its sibling, so it paints on top and moves with it. It is flat: where a
# mesh moves the face, key `blink_channels` into the animations in which it
# rests instead of adding `blink_layer`.

BLINK_IDS = {"image": "0:40", "layer": "0:41", "state": "0:42", "animation": "0:43", "asset": "0:61"}
BLINK_LOOP = 600                          # frames: ten seconds
BLINK_SHUT = [(155, 163), (479, 487)]     # each shuts at once, then opens over 8 frames


def blink_channels(shut=BLINK_SHUT, end=BLINK_LOOP):
    """The overlay's opacity keys, for `keyed`."""
    keys = [(0, 0.0)]
    for start, done in shut:
        keys += [(start - 1, 0.0), (start, 1.0), (done, 0.0)]
    keys.append((end, 0.0))
    return {(BLINK_IDS["image"], "opacity"): keys}


def blink_image(x, y, indent):
    """The overlay's Image, its top-left at (x, y) in the figure's parent."""
    pad = " " * indent
    return (f'{pad}<Image x="{x:.2f}" y="{y:.2f}" originX="0" originY="0" opacity="0"\n'
            f'{pad}       assetId="{BLINK_IDS["asset"]}" name="Blink" id="{BLINK_IDS["image"]}"/>')


def blink_layer():
    """A state machine layer that loops the Blink animation from the start."""
    return f'''            <StateMachineLayer name="Blink" id="{BLINK_IDS['layer']}">
                <AnyState x="160" y="-120"/>
                <ExitState x="560" y="-120"/>
                <EntryState x="0" y="0">
                    <StateTransition stateToId="{BLINK_IDS['state']}"/>
                </EntryState>
                <AnimationState x="160" y="0" animationId="{BLINK_IDS['animation']}" id="{BLINK_IDS['state']}"/>
            </StateMachineLayer>'''


def blink_animation(fps):
    return f'''        <LinearAnimation loopValue="loop" fps="{fps}" duration="{BLINK_LOOP}" name="Blink" id="{BLINK_IDS['animation']}">
{keyed(blink_channels())}
        </LinearAnimation>'''


def blink_asset():
    return f'    <ImageAsset file="assets/blink.png" name="Blink" id="{BLINK_IDS["asset"]}"/>'
