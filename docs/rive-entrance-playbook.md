# Rive entrance playbook

How the Defender's parachute descent was made, written so the next entrance
can be made the same way. There are twelve worked examples, each with notes
on its specifics:

- `art/rive/defender-parachute`: comes down from above, with a felt prop
  and vector lines ([parachute-notes.md](parachute-notes.md));
- `art/rive/sleeper-drift`: comes down from above with nothing but
  whole-body moves ([sleeper-drift-notes.md](sleeper-drift-notes.md));
- `art/rive/sprout-rise`: in place, out of the ground, with clipping and a
  mesh that bends only the leaves ([sprout-rise-notes.md](sprout-rise-notes.md));
- `art/rive/pod-drop`: falls, speeding up, into a mesh squash that keeps
  the legs ([pod-drop-notes.md](pod-drop-notes.md));
- `art/rive/curled-peek`: from the side, one long oneShot, travel that
  stretches to the screen ([curled-peek-notes.md](curled-peek-notes.md));
- `art/rive/selfhug-waddle`: from the side with a looping gait, rocking
  about two pivots ([selfhug-waddle-notes.md](selfhug-waddle-notes.md));
- `art/rive/kaleidoscope-backwards`: the same gait from the right, round a
  lean, with a bump ([kaleidoscope-backwards-notes.md](kaleidoscope-backwards-notes.md));
- `art/rive/stack-tiptoe`: the gait on tiptoe, with a mesh that moves only
  the tower ([stack-tiptoe-notes.md](stack-tiptoe-notes.md));
- `art/rive/ribbon-pirouette`: a spin by scaling through zero, and a hop
  ([ribbon-pirouette-notes.md](ribbon-pirouette-notes.md));
- `art/rive/shell-wave`: from the side inside a generated felt prop that
  paints over the figure, rolling, cresting and drawing back
  ([shell-wave-notes.md](shell-wave-notes.md));
- `art/rive/map-route`: the gait along a route with a corner, a stop in the
  middle and a stitched trail on the page ([map-route-notes.md](map-route-notes.md));
- `art/rive/doodle-line`: riding a line the page draws, with a mesh that
  moves only the hand ([doodle-line-notes.md](doodle-line-notes.md)).

The generic helpers they share are in `art/rive/rivegen.py`; the page side
is `src/ui/DescentSpike.tsx` (from above), `src/ui/SideEntranceSpike.tsx`
(from the side), `src/ui/SproutRiseSpike.tsx` (in place), and one each for
the two that travel in two dimensions over something the page draws,
`src/ui/MapRouteSpike.tsx` and `src/ui/DoodleLineSpike.tsx`.
The ideas waiting to be built are in
[character-entrances.md](character-entrances.md).

## What made it work

1. **The felt figure is never cut.** It stays one photo on one image. The
   Critic's walk showed that every cut becomes a seam once the pieces move
   ([rigging-notes.md](rigging-notes.md)), and the rejected 3D test showed
   that the felt look is what makes a character recognisable
   ([Things-learned.md](Things-learned.md)). The motion comes from three
   other places:
   - **Whole-body transforms**: sway, drop, tilt, and a squash about the feet.
   - **Props generated in the same felt**, deformed through an image mesh if
     they have to change shape (the canopy).
   - **Procedural vector parts with a little physics** (the lines).
2. **Python plans everything; Rive only plays it.** `gen-scene.py` computes
   every pose as a pure function of the frame number and writes it into RML
   as linear keyframes. No easing curves, constraints or bones in Rive
   decide anything, so whatever is attached to something else can be solved
   exactly, and the plan can be checked before it is built.
3. **The page moves the canvas, Rive moves what is inside it.** The page
   owns the travel across the screen because only it knows the screen. Rive
   owns everything in place. Both read one clock, the sum of the runtime's
   `Advance` events, so the feet meet the ground on the frame the squash
   starts.
4. **The generator refuses a bad plan.** `validate()` checks the things that
   look wrong on screen: jumps at a loop or a hand-off, feet away from where
   the page parks them, a line stretched past its length, a prop leaving the
   artboard. Before anything was rendered, it caught the canopy coming to
   rest 45 px further from the hands than the lines are long.
5. **Look at it, frame by frame, then in the page.** Contact sheets of
   rendered frames show what the numbers don't. The last check is always
   the real page, in front of the real world plate.

## Steps

### 1. Write the beat down

In words, before any code: how it arrives, the moment of contact, how it
settles, what it does while standing. Decide which parts are the figure
(rigid), which are props, and which are vector. Split the motion between
the page (travel across the screen) and Rive (everything in place). Keep
the entrance about the character's role in IFS, not a stunt, and use what
the pose already offers: the Defender's arms reach up and out, so they
hold the lines.

### 2. Generate any prop

Props go in the user's figure-set chat in AI Studio, so the felt material is
already in context (see [image-generation.md](image-generation.md)). The
prompt opens with "NEXT IMAGE in the same set, but not a creature this
time…" and asks for a plain white background, no shadow, and nothing the
animation will draw itself. The canopy prompt said "no suspension lines, no
strings", because the lines are vector.

```sh
export STUDIO_CDP=http://127.0.0.1:9223   # if another Chrome holds 9222
node scripts/studio/settings.mjs 16:9 1K
node scripts/studio/generate.mjs art/out/prop-parachute-1.jpg art/prompts/prop-parachute.md
```

If the page shows "Upgrade to unlock Nano Banana 2.1", the window isn't
logged in to the paid account. Ask for a login rather than working around it.

Ask for the shape the motion needs. The wave prompt (`prop-wave.md`) asked
for a crest that curls over with a hollow under the lip, seen from the side,
so the mesh could lean and curl it rather than invent it.

### 3. Cut out, clean, shrink

`art/rive/defender-parachute/cutout.py` is the template:

- **Figure already in the app** (Critic, Sprout, Sleeper): use its tile in
  `src/assets/figures/` as it is; `build-assets.sh` copies it in. It comes
  from `scripts/cutout-figures.py`, which crops every figure with one box
  size and ground line, so sizes match the map. Fix a bad cut there, not in
  the Rive project. Its fixes are opt-in, each for named figures only,
  because a global test broke the lantern's glow. The name is the photo's
  without the take (`figure-stack` for `figure-stack-2.jpg`):
  - `PALE_FELT` (Sleeper, Curled, Self-hug, Kaleidoscope, Stack, Doodle,
    Shell): felt pale enough to pass every backdrop test is kept by its
    colour above the bottom fifth;
  - `BAND_FELT` (Doodle), with a least warmth and luma: inside the bottom
    fifth too, warm bright pixels are kept, small gaps closed. Doodle's cream
    pad comes down into the band, where anything pale is otherwise taken for
    glare;
  - `FLOOR_RIM` (Sleeper): there, a floor rim with no colour of its own is
    faded out and lifted off downward edges;
  - `FLOOR_GLARE` (Sprout, Kaleidoscope, Stack, Ribbon, Shell, Map, Doodle),
    with its own
    chroma and luma ramps for each figure: in the bottom fifth, pixels both
    pale and grey fade out. Felt keeps its colour even where it is lit, and
    where it loses it (shaded soles) it is dark;
  - `FLOOR_UNDER` (Curled, which sits on the floor): in the bottom fifth,
    everything below the lowest clearly coloured pixel of each column fades
    out;
  - `FELT_BLUR` (Kaleidoscope, Stack): strong colour bleeds into the white
    beside it through the usual 2 px blur, so the colour tests read chroma
    blurred less;
  - `ENCLOSED` (Kaleidoscope, Stack, Doodle), with the most chroma and
    least luma a seed may have: backdrop the border flood can't reach
    (inside a curled arm) is seeded wherever it is unmistakable, a patch of
    pure grey white (`PURE_BACKDROP`), or, for Doodle's shaded gap between
    pad and leg, of any pale grey;
  - `DEFRINGE` (Kaleidoscope, Stack, Ribbon, Shell, Map, Doodle): edge
    pixels, mostly backdrop
    white where the felt fuzzes out, take the colour of the felt just
    inside.

  Re-run it on the three photos in the app and check that they come out
  byte-identical:

  ```sh
  python3 scripts/cutout-figures.py /tmp/figs art/out/figure-lantern-1.jpg art/out/figure-sprout-1.jpg art/out/figure-sleeper-1.jpg
  for f in /tmp/figs/*; do cmp $f src/assets/figures/$(basename $f); done
  ```

  Do the same for the figures cut for a project only: re-run each
  `cutout.py` into a scratch folder and `cmp` it with the project's
  `assets/`.
- **New figure:** `cut()` from `scripts/cutout-figures.py`, opted in to what
  it needs, and cropped in the project's `cutout.py` to the 640 tile with the
  feet at 95%, as that script crops a set of one (`stack-tiptoe/cutout.py` is
  the shortest). Check the soles over a dark and a loud colour: what is left
  is usually the floor, pale or shaded. If no opt-in fits, fade alpha below
  the legs wherever a pixel loses the felt's warm colour (Self-hug, the
  Defender). The Pod's padding needed a cut of its own, on chroma.
- **Prop:** pale felt (cream, pale sage) is as smooth and bright as the
  backdrop, so the figure test eats it. Separate on chroma instead: the
  backdrop stays within ~4 levels of neutral grey, the palest felt is 14 or
  more. Strongly coloured felt (the soil mound) is even easier: anything
  within 14 of grey is backdrop, which takes the photo's dark contact line
  too. Floor glare at the base that survives is pale *and* grey. A hollow
  the border flood reaches only through a pixel-wide gap (under the wave's
  lip) needs seeds of its own; and when a fade leaves crumbs of shadow,
  keep only the largest connected piece (`shell-wave/cutout.py`).
- **Save as WebP** at quality 90. The `.riv` went from 1 MB to 268 KB.

Check every cutout over a loud colour:

```sh
convert -size 640x640 xc:'#3a6ea5' assets/defender.webp -composite /tmp/check.png
```

### 4. Measure the anchor points

Hands, feet and attachment points come from the pixels, not from guesses.
Scan the alpha for extremes (the top of each paddle, the lowest sole row),
and for fiddly points like the hem cusps, render a 2× crop with a 25 px grid
over it and read the coordinates off. Put the lines' ends ~16 px inside a
paddle, drawn behind the figure, so they disappear into the grip.

### 5. Scaffold the Rive project

```sh
cd art/rive && rive create <name>
```

Copy `gen-scene.py` and `build-assets.sh` (and `cutout.py` for props) from
the example closest to yours and change what is specific. The generic parts
are in `art/rive/rivegen.py`; import them instead of copying:

- easing: `smoothstep`, `hermite`, `damped_to_rest`;
- transforms: `node`, `mul`, `apply`, the same matrices the runtime builds;
- image meshes: `Grid` (even lines) or `Grid.lines` (lines where the texture
  bends), with `barycentric`, `point`, `triangles` and `xml`; `interpolate`
  for a keyed mesh as the runtime draws it; `mesh_channels`, which given the
  rest pose keys only the vertices that move;
- lines: `rope` (a slack line as a verlet chain), `fit_cubic`,
  `line_vertices`;
- keyframes: `frames`, `compress`, `keyed`;
- the blink: `blink_image`, `blink_layer`, `blink_animation`, `blink_asset`
  and `blink_channels` (see the blink recipe below).

A generator imports it with `sys.path.insert(0, os.path.dirname(HERE))`.
When you change `rivegen.py`, regenerate the other scenes and check that
their `scene.rml` is byte-identical (copy it aside first, then `cmp`).

### 6. Write the generator

The shape of `gen-scene.py`:

- **Constants:** geometry in artboard px (artboard size, where the 640 tile
  sits, the pivot, the measured points) and every motion parameter, named.
- **The hierarchy**, as nested Nodes, each doing one job, so each transform
  stays simple:

  ```
  Rig (pivot, sway rotation)
    Swing (between the hands, lag rotation)
      Squash (at the feet, scale)
        Image Defender
    Shape Lines (10 PointsPaths, one Stroke)
    Canopy (at the hem: position, tilt, scale, opacity)
      Canopy Texture (offset by -hem)
        Image Canopy Felt + Mesh
  ```

  The first sibling paints on top, so the figure comes first, then the
  lines, then the canopy behind them.
- **One pose function per state:** `descend(f)`, `land(f)`, `idle(f)`. Each
  returns a dict of plain numbers, so the hand-offs are checked by comparing
  dicts.
- **Attachments solved through the same transforms:** a hand's position is
  `Swing · Squash · (hand − feet)`, the same matrices the runtime builds.
  Anything on a deforming mesh is a fixed barycentric point in its rest
  triangle, evaluated on the mesh **as the runtime interpolates it**,
  linearly between the mesh's keys.
- **Keys:** linear keyframes at a fixed step (4 frames for the loop, 2 for
  the landing, 6 for the mesh). `compress()` then drops the ones a straight
  line through their neighbours already gives.
- **The machine:** `Descend` loops; on `land` it moves on with exit time
  100%, so the swing in progress finishes first; `Land` is a oneShot that
  exits at 100% into `Idle`. Idle keys the canopy and lines to opacity 0 at
  frame 0, so playing `Idle` alone (reduced motion) shows only the figure.
- **The plan for the page:** a JSON file with the artboard, where the figure
  box sits in it, the feet line, and the timing the page has to honour
  (cycle and flare frames, touchdown speed). `build-assets.sh` copies it
  next to the `.riv` in `src/assets/rive/`.
- **`validate()`** before anything is written (see above).

### 7. Review the scene

```sh
cd art/rive/<name>
rive . --verify && rive inspect . --summary                # builds, no problems
rive . --screenshot=review/d-040.png --advance=40          # one frame
DEFENDER_REVIEW=land python3 gen-scene.py                  # a scene whose machine plays Land at once
for f in 46 60 80 100 120 160; do rive . --screenshot=review/land-$f.png --advance=$f; done
python3 gen-scene.py                                       # back to the shipping scene
montage review/land-*.png -tile 7x -geometry 330x336+3+3 -background '#1d1d1d' sheet.png
```

Always advance at least one frame; frame 0 is the authored pose, not the
animation's. Crop details at full resolution too: line ends on the hem, the
grip, the soles.

### 8. Put it on the page

A figure that comes down from above needs no new component: add it to
`descents` in `src/ui/descents.ts` (its `.riv`, its plan JSON with the same
fields as `defender-parachute.json`, and a motion), and `DescentSpike` shows
it at `?<name>`. The motion is `{ drift: px/s }`, a steady speed fitted to
whole swings, or `{ fall: ratio }`, speeding up evenly from that fraction of
the touchdown speed to all of it over whole cycles (the Pod: 0.25, no
flare).

A figure that comes in from the side needs none either: add it to
`sideEntrances` in `src/ui/sideEntrances.ts`, and `SideEntranceSpike` shows
it at `?<name>`. Its plan (`SidePlan`) gives the edge it comes from
(`from`), how far the figure reaches either side over the whole entrance
(`content`, measured by `validate()`), and the travel:

- `cycle`, for a gait that loops (`Approach`): its frames, its nominal
  travel in artboard px, and a `profile` of [frame, fraction of a cycle's
  travel]. The page loops as many whole cycles as come nearest the nominal
  travel, fits their travel so they land it exactly, and sets `arrive`
  during the last one.
- `travel`, rows of [frame of `Enter`, fixed px, fraction, cycles]. Fixed
  px are measured from the edge (Curled's peek, the same on any screen); the
  fraction is of whatever distance the screen leaves (its slides); cycles
  are the gait's travel, so the glide out of the last cycle carries on at
  its speed.

A prop that comes in with the figure and leaves (Shell's wave) lives in
the scene; the page only brings the canvas in, as for any side entrance.

An entrance in place is like `src/ui/SproutRiseSpike.tsx`: Rive plays all
of it, and the page only parks the canvas and moves the shadow along keys
from the plan.

Travel in two dimensions, over something the page draws, gets its own
component. `MapRouteSpike` walks a polyline in legs, fitting whole rocks to
each, with a `Check` state at the corner that the page triggers with a
second input; the trail is an SVG path redrawn each frame up to the feet.
`DoodleLineSpike` draws a curve once as an SVG path, reveals it ahead of
the figure with its dash offset, and moves and tilts the canvas along it.
All of them use the `.spike-entrance` CSS block. The pattern:

- **Hidden behind a URL flag** (`?parachute`), with a pose mode
  (`?parachutepose=<frame>`) that holds one loop frame in place for
  screenshots, and a replay button.
- **CSS sizes the figure box** like the other spikes (`clamp(190px, 34vmin,
  320px)`). The canvas is the whole artboard scaled to match, translated so
  the box sits mid-screen.
- **Travel computed from the elapsed time** on every `Advance` event: start
  just off screen, then pick the number of whole loop cycles that comes
  nearest a target screen speed (~110 px/s) and fit the speed to it exactly.
  Set the input during the last cycle. Ease into the contact over the same
  frames the scene uses. With N cycles of T frames at speed v, then a
  smoothstep ease down to touchdown speed vt over F frames, the distance t
  frames into the ease (s = t/F) is
  `N·T·v + vt·t + (v − vt)·F·(s − s³ + s⁴/2)`. Solve that for v at t = F,
  so the whole drop is exactly the distance to the ground.
- **`shouldUseIntersectionObserver: false`**, or the runtime stops drawing
  the off-screen canvas that is meant to bring the figure on screen.
- **The contact shadow is a page element** on the ground at the landing
  spot, using the app's figure-shadow gradient. Its opacity and scale come
  from the height left to fall.
- **Reduced motion** plays `Idle` where the figure would have landed.
- **From the side**, the canvas starts `translateX(∓200vw)` in CSS, so it
  is off stage before the script runs, and the shadow gets the same offset
  as the figure: on the ground, moving with it.

### 9. Check it in the browser

```sh
npx vite --port 5173
node scripts/capture-page.mjs "http://localhost:5173/?parachute" 1440x900 /tmp/shots 3500 7000 12000 --track=.spike-entrance__traveler
node scripts/capture-page.mjs "http://localhost:5173/?parachute" 390x844 /tmp/phone 4500 13000
node scripts/capture-page.mjs "http://localhost:5173/?parachute" 1440x900 /tmp/reduced 2500 --reduced-motion
```

Look at the shots against the world plate. That is where the pale lines
turned out to vanish against the sky and the clouds, and where the pale
fringe round the Sprout's feet showed. For the first second or two of a
run, capture held frames with the pose flag (`?sproutpose=40`): the first
screenshot stalls the renderer so long that the run is past them. Give the
page 2.5 s or more before a shot; under SwiftShader a large `.riv` is not
drawn yet at 1.5 s.

### 10. Write the notes

A `docs/<name>-notes.md` like [parachute-notes.md](parachute-notes.md): how
to rebuild and review, who owns what, and what wasn't obvious.

## Motion recipes

All in frames at 60 fps, values from the parachute unless named.

- **Pendulum sway:** `θ = A·sin(2πf/T)`, with A = 0.06 rad and T = 160. Make
  the loop exactly one period, so its boundary is at zero angle and the exit
  time hands off there.
- **Secondary lag:** the body trails the swing, `−B·sin(ωf − φ)` with
  B = 0.014 rad and φ = 0.9, rotating about the point between the hands.
- **Breathing:** scale at twice the swing frequency, +1.5% wide and −0.8%
  tall in antiphase.
- **Damp to a standstill, keeping the speed you had:** `θ(f) = v₀·f·(1 − f/F)²`
  starts at the swing's own angular speed and reaches zero angle and zero
  speed at frame F (the flare, 45 frames).
- **Squash on contact:** `scaleY = 1 − A·e^(−t/τ)·sin(2πt/P)` with A = 0.07,
  τ = 10 and P = 28, and scaleX the opposite at 0.6×, about the feet.
- **Leave at a given speed, arrive softly:** a cubic Hermite from 0 to the
  distance with start slope = speed·duration and end slope 0 (the canopy's
  fall).
- **Deform a prop:** an image mesh as a 17 × 10 grid over the texture, moved
  by one `deform(x, y, c)` for c from 0 to 1. Keep it monotonic, with rows
  and columns staying in order: within one mesh, triangles that overlap do
  not blend; the later one replaces what is under it.
- **Falling leaf** (Sleeper): a long pendulum, pivot 400 px above the
  body, A = 0.34 rad, T = 160. The page drops it, the arc lifts it at each
  end (R·(1 − cos A) ≈ 23 px), plus an extra `LIFT·(θ/A)²` = 26 px. So it
  nearly hovers coming into each end and falls fastest leaving it. A child
  node turns back a quarter of the swing (`−(1 − 0.75)·θ`) so the tilt stays
  gentle. Breathing is once per swing, and `Land` is one swing long, so it
  hands `Idle` an out-breath.
- **Rise with anticipation and a hop** (Sprout): sink 12 px over 12 frames,
  then a Hermite rest-to-rest up to 30 px above its place in 30 frames, then
  fall `−H·(1 − s²)` onto its feet in 14. Stretch by the upward speed only
  (scaleY +6% at the fastest point), so it is back to 1 at the top of the
  hop and the squash starts clean.
- **Flutter:** `A·e^(−t/τ)·sin(2πt/P)` from an event (leaves open, landing,
  bow), with P = 9–18 and τ = 8–12, all multiplied by a window that reaches
  zero before the hand-off.
- **Bend part of a photo** (Sprout's leaves): a mesh over the whole figure,
  with rows close together only where it bends (`Grid.lines`), and one
  `bend(p, pose)` that rotates each point about the stem by
  `weight · (tilt + fold·side)`. The weight is 0 at the stem's base and below
  it, and fades out sideways 60 px past the leaves, so far vertices do not
  swing round. `side` goes from +1 to −1 across the stem, so the leaves fold
  together or apart.
- **A prop that comes out of the ground and goes back:** move it, don't
  scale it, and clip it to the ground line. It heaves up past its place and
  settles, then sinks back down through the line.
- **Lines under load:** straight. Each is a `PointsPath` with two
  `CubicDetachedVertex`, handles at distance 0.
- **Give at the speed you fell** (Pod): `1 − e^(−t/τ)`, with τ chosen so the
  top leaves contact at the touchdown speed: τ = depth · height / speed. A
  flat-starting cubic adds what the exponential still lacks at the end, so
  it arrives exactly, at rest. Any slower start reads as a bounce.
- **Squash the body, not the legs** (Pod): a mesh whose rows above the legs
  close up toward them and spread, while the rows below never move. The
  spread fades out over 22 px under that line.
- **Lean from acceleration** (Curled, the Kaleidoscope's bump): a damped
  rotational spring, `θ'' = −ω²θ − 2ζωθ' + k·a`, fed the base's
  acceleration, stepped 8 times a frame, and faded to zero before the
  hand-off. Period 22–26 frames, ζ 0.35–0.45, |k| 0.0009–0.010 rad per
  px/frame², its sign set by the direction of travel. It rocks back as it
  sets off and on as it stops.
- **Rock about two pivots** (Self-hug, Kaleidoscope, Stack): nested nodes
  at the outer corner of each sole, the outer one keyed `max(tip, 0)`, the
  inner one `min(tip, 0)`. There must be a key on the frame where the tip
  crosses zero, so pick the period to put the crossings on whole frames.
- **Shuffle along a rock** (Self-hug): travel bunched where the weight
  crosses, `f/T + S/(2ωT)·sin(2ωf)`, S = 0.8. The figure can't really walk
  by rocking, and the slip hides in the crossing.
- **Tip part of a photo over a corner** (Stack's tower): a mesh, with weight
  1 above a soft band and 0 below it. Everything above rotates about the
  corner on the side it leans to, so the pivot changes where the angle is
  zero.
- **Catch a teeter** (Stack): the tower's own lean is a damped swing; the
  body leans by 0.55 of it, 8 frames late; the mesh turns the tower by the
  difference.
- **Spin a flat figure** (Ribbon): `scaleX = cos θ` about the standing foot,
  with `θ = φ − 0.3·sin 2φ` for an even φ, so it lingers facing out and
  away and is a sliver for about a frame. End on a whole turn, where it can
  stop dead with no jump.
- **Roll, lean and curl a prop** (Shell's wave): one mesh, three moves per
  point. Roll: a sine along the surface, scaled by height so the base stays
  flat. Lean: the crest's upper part pushed forward by the square of
  height. Curl: points near the lip rotated about a point under it, weighted
  by a smoothstep in x and y. A node above the image sinks (`scaleY`),
  recedes (`x`) and fades it.
- **A figure in the water:** put the prop first in the RML, so it paints
  over the figure, and anchor it under the body rather than the feet (a
  point on its back slope two thirds up), so the figure shows from the
  waist.
- **Stop and go within a gait** (Map): a oneShot between two runs of the
  loop. It leaves at the gait's speed with `damped_to_rest`, does its
  business, and winds back up with `−v·(F−t)·(t/F)²`, which swings through
  zero at the loop's speed `v`. Its travel, in cycles, stops and restarts
  with Hermites, so the page can split it at the stopping point.
- **Ride a line** (Doodle): the page moves the seat along the curve at an
  even arc-length speed and tilts the canvas about the seat by half the
  slope, capped at 0.2 rad. The line lands flat (`smoothstep` for the
  descent, the waves faded out by another), so the glide in `Enter` meets
  the ground tangentially.
- **Move one small part of a photo** (Doodle's crayon hand): a mesh dense
  round the part, each vertex moved by `1 − smoothstep(r₀, r₁, distance)`
  of the part's motion. The scribble is a figure of eight, `(a·sin φ,
  b·sin 2φ)`, three to a sway so the loop closes.
- **A trail behind it** (Map): an SVG path, always from the same start, to
  the corner and the current feet. Dashes stay put on the ground; a moving
  dash offset would make them crawl.
- **A line drawn ahead of it** (Doodle): the whole path drawn once, with
  `pathLength` set to its arc length in artboard px, revealed by
  `stroke-dashoffset`. The figure starts `lead` back along the line from
  where it begins, so the line starts drawing first.
- **Lines gone slack:** at the moment of release each line becomes a verlet
  rope, 14 segments of fixed length, gravity 0.8 px/frame², 0.9 damping, 4
  substeps and 20 constraint passes, pinned at both ends and kept above the
  ground. A least-squares cubic is fitted to it every frame. So the runtime
  still draws two vertices, with handles keyed as `outRotation`/`outDistance`
  and `inRotation`/`inDistance`, in path space.

### A blink

Every figure whose eyes are open blinks. Shell's eyes are shut by design, and
so are the Sleeper's, which squeeze a little tighter instead. The figure
stays one image. A small closed-eye overlay, `assets/blink.png`, is shown
over it for a moment twice in a ten-second loop. Only the eyes come from a
generated edit, so no other part of the figure ever swaps.

1. **The edit.** `art/prompts/figure-<name>-blink.md` asks for the two bead
   eyes as short curved felt-thread seams and nothing else changed. Copy
   one and change the colour, the name and what the figure holds. Upload
   the photo itself, so the edit is of those exact pixels:

   ```sh
   node scripts/studio/generate.mjs --in art/out/figure-curled-1.jpg \
     art/out/figure-curled-blink-1.jpg art/prompts/figure-curled-blink.md
   ```

   If AI Studio declines the whole figure, send a close-up of its face,
   scaled up to 1024, and pass the box it came from to
   `blink-overlay.py` with `--from x0,y0,x1,y1` (Self-hug's
   `build-assets.sh`).
2. **The eye boxes.** Find what changed with a diff of the two photos. The
   edit also redraws the mouth and the felt a little, so look at the blobs
   round the eyes only. Box each eye in photo px, with room for the seam.
3. **The overlay.** `scripts/blink-overlay.py` lines the edit up (they come
   back up to a few px off) and takes only what changed inside the eye
   boxes, with a feathered edge. It pastes that into the photo and cuts the
   result with the scene's own `figure_tile()`, so the overlay lines up
   with the tile pixel for pixel. Run it once with the whole tile as the
   crop, `0,0,640,640`. It prints the box the edit changed in the tile.
   Then crop to that box with about 4 px to spare:

   ```sh
   python3 scripts/blink-overlay.py art/rive/curled-peek/cutout.py \
     art/out/figure-curled-1.jpg art/out/figure-curled-blink-1.jpg \
     art/rive/curled-peek/assets/blink.png 264,91,220,100 480,434,543,481 566,431,601,466
   ```

   Put that line in `build-assets.sh`, after the cutout and guarded on both
   photos (`curled-peek/build-assets.sh`). A cutout that makes several poses
   calls its functions itself (`kaleidoscope-backwards/cutout.py`).
4. **The scene.** `BLINK_XY` is the crop's x and y. Declare
   `blink_image(image_x + BLINK_XY[0], image_y + BLINK_XY[1], indent)`
   just before the figure's Image, as its sibling: it paints on top and
   moves with the figure. Add `blink_layer()` to the state machine,
   `blink_animation(FPS)` to the animations and `blink_asset()` to the
   assets. The layer loops on its own whatever the other layers play, so
   the figure blinks during the entrance too. Each blink shuts at once and
   opens over 8 frames, at frames 155 and 479 of the 600.
5. **Check it** at a blink frame: `rive . --screenshot=review/blink.png
   --advance=157`.

The overlay is flat. Where a mesh moves the face (the Pod's padding), a
separate layer would slide off it. Key `blink_channels(end=…)` into an
animation in which the mesh rests instead. The Pod's `Idle Blinking` is
`Idle` three times over with the blink keys added. The state machine plays
that, and `Idle` alone (reduced motion) still doesn't blink. Where a prop
hides an eye (the Kaleidoscope's scope), make a pose in which both eyes
show and blink in that (see
[kaleidoscope-backwards-notes.md](kaleidoscope-backwards-notes.md)).

## Rive and RML rules this relied on

- Rotation is radians, clockwise positive (y points down). Animation
  durations are frames; transition durations are milliseconds.
- A Node's transform is translate · rotate · scale, and children live in
  their parent's space. Put an Image at 0,0 with `originX="0" originY="0"`
  under an offset Node, and its mesh vertices are simply texture pixels.
- `opacity` on a Node fades everything under it.
- Keys are `linear` everywhere. A `cubic` key without an interpolator child
  eases nothing.
- `KeyedObject objectId` is written by hand, and ids share one namespace
  across the file.
- State machine inputs (`land`) still work, and the web runtime warns that
  they are deprecated in favour of data binding.
- `.webp` image assets are accepted and keep their alpha.
- A `ClippingShape` inside a Node clips everything under that Node. Several
  inside one Node intersect. The source is any shape with no paints, which
  draws nothing and still lends its geometry, and it can live inside a
  moving node so that the clip moves with it (the Sprout's clip moves with
  the mound). Don't mark the source `hidden`: that empties the mask.
- `PointsPath isClosed="true"` with `StraightVertex` children makes a
  polygon; with the default nonZero fill rule its direction doesn't matter
  for a clip.
- Siblings paint in reverse order: the first child of a Node or the
  Artboard is on top.
- A `Feather` child of a `Fill` (`strength` in px) softens its edge: an
  `Ellipse` filled that way is a shadow inside the scene (Shell's wave
  carries its own).

## Traps already found

- **Slack lines must hang, not bow.** Bowing them sideways looked fine
  while the canopy was above the hands and absurd once it fell below them:
  the lines arched up like handles. Simulate them.
- **Keep a collapsing prop within reach** of whatever holds it. The validator
  caught the canopy heap ending 45 px beyond the lines.
- **Squashed insides read as other objects.** The flattened inside of the
  canopy looked like an upturned plate until it folded away faster than the
  rest.
- **Pale details vanish on this world.** Test any thin vector part against
  the sky, the pink clouds and the meadow. Natural-wool tan `FFAE9F86` reads
  on all three; cream does not.
- **Headless Chrome needs SwiftShader** for Rive's meshes (the flags are in
  `capture-page.mjs`).
- **Screenshots stall software rendering** for seconds, and the runtime then
  catches up in one big advance. Shots taken mid-run are fine for looking
  at, but not for timing.
- **Check speeds at a hand-off with a tiny step,** not one frame. One-frame
  differences across a curved point disagree by a curvature term (the
  Sleeper's swing "jumped" 3%, and a quadratic lift went from −0.04 to +0.04).
  Compare `(f(x) − f(x − h))/h` with h = 1e-4.
- **y points down, so a mesh triangle's rest orientation is negative.** To
  check that none turns over, compare each triangle's sign with its rest
  sign, not with zero.
- **A prop narrower than the figure reads as "behind", not "out of".** The
  Sprout clipped only at the ground line rose from behind the mound. Clipped
  to the mound's top edge as well, it comes up out of the soil. The body
  still shows above the mound's slopes during the half-second pop, which is
  fine at speed.
- **A clip living in a prop that scales to zero collapses**, and hides
  whatever it clips. That is why the mound moves instead.
- **Fixing one cutout can move the figure in its tile.** Removing the glare
  under the Sprout's soles raised its lowest row, so the crop put it 5 px
  lower. Anything measured in tile pixels (the stem, the mesh rows) moves
  with it.
- **Deleting with a relative glob after `cd`** is refused by Claude Code's
  safety check. Overwrite files, or use absolute paths.
- **Small motion vanishes on the page.** The figure is drawn at about half
  the artboard's size on a desktop and a third on a phone. A rock or a
  teeter that reads in Rive's renders can be 2 px on screen. Work out the
  screen px before judging a still.
- **Keyframe frames are whole numbers.** A key at a zero crossing between
  frames is impossible, so choose periods that put the crossings on frames
  (a multiple of 12 for a rock round a lean whose crossings are at T/12).
- **Key the crossings, not the zeros.** Adding keys round every frame where
  the tip *is* zero keys a still `Idle` on every frame, the whole mesh with
  it (the Stack's `.riv` was 298 KB before, 171 KB after).
- **A rigid figure rocking about its feet can't travel** without slipping.
  Accept it as a toy's, and hide it in the crossing.
- **Set-of-one crops are not to scale.** Each new figure's longer side fills
  its own tile, so the Stack's body, under its tower, comes out much smaller
  than Self-hug's. They need cropping together before they meet the map.
- **The take is part of the photo's name.** `figure-stack-2.jpg` matched no
  opt-in while the script only stripped `-1`. `figure_name()` now strips
  any take.
- **Blurred chroma makes a halo.** The colour tests blur 2 px, so strong
  felt keeps a pale ring of backdrop beside it. Use `FELT_BLUR` for that
  figure rather than lowering the threshold for all.
- **There is no numpy here.** Pillow is 10.2. Per-pixel maths goes through
  `ImageChops`, `point()` and `ImageMath.eval`.
- **A big `.riv` stalls headless captures.** Shell's, at 295 KB, takes about
  3 s under SwiftShader before its first frame, so a shot timed for the
  middle of the entrance shows the start. Use the pose mode for those.
- **SVG filters on a moving path are slow.** An `feTurbulence` crayon filter
  on Doodle's line re-filtered a screen-wide path every frame (100–300 ms
  frames in captures, against ~40 ms). A pattern of grain made once on a
  canvas, and a wobble in the drawn points, look nearly the same for free.
- **The cutout picks its fixes by file name.** `blink-overlay.py` cuts the
  photo with the eyes pasted in from a temporary file. That file is named
  after the photo, so `cut()` still opts it in to the figure's fixes.
  Otherwise the closed-eye tile is cut differently, and the overlay picks up
  the whole edge of the figure.
- **Clear an input late, not early.** Map's `check` is cleared halfway
  through `Check`, not as it starts, so it doesn't matter whether the
  `Advance` event comes before or after the machine takes the transition.

## Checklist

- [ ] Beat written down; the figure stays one image.
- [ ] Props generated in the figure-set chat; prompt in `art/prompts/`.
- [ ] Cutouts checked over a loud colour, soles cleaned, saved as WebP; a
      fix in `cutout-figures.py` is opt-in by name and leaves the figures in
      the app byte-identical.
- [ ] If its eyes are open, a closed-eye edit and `blink.png`, and a frame
      checked with the eyes shut.
- [ ] Anchor points measured from pixels.
- [ ] Generator: constants, hierarchy, pose functions, solved attachments,
      linear keys, state machine, plan JSON, `validate()`.
- [ ] `--verify` and `inspect` clean; contact sheets of the loop and the
      oneShot look right; details cropped at full size.
- [ ] Spike component behind a URL flag, with pose mode, replay and reduced
      motion.
- [ ] Captured at desktop and phone size and with reduced motion, against
      the world plate.
- [ ] `tsc -b`, `oxlint`, `vite build` pass.
- [ ] Notes written; the entrance's status updated in
      [character-entrances.md](character-entrances.md).
