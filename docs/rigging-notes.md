# Rive rigging notes — Critic

Notes for `art/rive/critic-walk`, written down because the format's skinning
rules are not discoverable from `--verify` output. Everything here was
established by building a small test artboard and rendering it, not assumed.

## Why the figure is skinned rather than cut up

The first version of the walk split the Critic into torso, left foot, right
foot and lantern arm, each an image on its own pivot. Every one of those cuts
was a seam, and the seams showed:

- `assets/masks/right-foot.svg` was hand-drawn, and wrong twice over. It was
  narrower than the leg at the top, slicing the leg with a slanted edge, and
  wider than the foot along the bottom-right, enclosing the bright grass rim
  the original photo cutout left around the foot. Those rim pixels were then
  rendered as if they were part of the foot.
- `torso.png` was a plain `640x555` crop of the figure, but the legs do not
  separate until y=555. The torso therefore kept ~20 rows of leg. The feet sat
  on pivots at y=530 and both translated and rotated, so that static band stayed
  behind while the legs moved out from under it — ghost legs on the belly,
  visible even at rest.

Neither is fixable by tightening a mask. The foot layers are rigid slabs that
rotate *and* slide 42px on pivots above the crotch, so any horizontal cut
across the crotch either leaves a ghost (cut low) or tears open when a foot
slides (cut high). Skinning removes the cut entirely.

## The rig

`gen-scene.py` writes `scene.rml` and `gait.json`; `build-assets.sh` rebuilds
the textures, compiles the Rive project with `rive --once`, and copies the
`.riv` and the gait to `src/assets/rive/`. One 640×640 texture — the body with
the arm already in its rest pose — is cut by a 49×37 grid into three skinned
meshes (far leg, body, near leg; see below) deformed by six bones:

| Bone | Position | Role |
|---|---|---|
| `Torso` | 266, 552 | the walking lean and the stopping squash, pivoting at the hips |
| `Arm` | 352, 246 | child of `Torso`; the shoulder the arm leaves from |
| `LegL` → `FootL` | hip 239, 544 → ankle 239, 584 | near (screen-left) leg |
| `LegR` → `FootR` | hip 294, 544 → ankle 294, 584 | far (screen-right) leg |

Each leg is a chain: a `RootBone` pointing straight down (rotation +90°) with
the foot as a child `Bone` at its tip, so the foot follows the hip. The first
rig had the shins as separate root bones, so swinging a thigh left the foot
where it was and stretched the leg between them. The hip sits a little up
inside the body and the ankle just above the sole, which gives the stub legs a
40 px lever — long enough for a stride.

Weights come from a field, not from hand-placement: a vertical ramp hands the
body to the leg at y 538–564 and the leg to the foot at y 578–590. Above the
crotch (y < 550) the two legs share the body smoothly; below it the split is
exact, at mesh columns x=272 (left leg) and x=274 (right leg). The gap between
the feet is transparent from 272 to 274 on every row, so when the legs part or
cross, the only triangles that stretch or fold are empty ones.
`build-assets.sh` clears that 3 px strip, because faint ground shadow in it
otherwise stretched into a visible line. The arm is a special case: it takes a
vertex only where the arm texture is present *and* the body is not.

### Three meshes, one texture

The Critic stands three-quarters on, turned to its left, so the screen-left leg
is nearer and has to pass in front when the legs cross. That rules out a single
mesh: **within one mesh the runtime does not blend overlapping triangles.** A
later triangle replaces what is under it, transparent pixels and all, so the
empty pixels around the near leg punched a hole through the far leg to the page
behind — a pale, striped wedge travelling with the near leg. Separate meshes
composite normally.

So the grid is split into three `Image`s over the same asset, front to back
(the first sibling draws on top): `Near Leg`, `Critic` (the body and arm), `Far
Leg`. Each leg mesh also carries a copy of the fully opaque body triangles its
leg pulls on, painted first, so the leg–body seam falls inside one mesh where
the rasteriser leaves no crack. Only opaque triangles are copied: a
semi-transparent outline pixel painted twice comes out darker, which the bind
check below caught at the hips (RMSE 125.6 with the copies, 37.8 without).
The empty strip between the feet, below y=554, is in no mesh at all.

### Retouching the legs

The photo was taken standing still, and two things in it only show once the
legs move. `retouch-legs.py` runs in `build-assets.sh` after the cutout
cleanup:

- **The far leg was 40% darker** than the near one, mean RGB (100, 60, 50)
  against (177, 124, 111), shaded by the body and the near leg. Painted on, the
  shadow travelled with the leg. Its low-frequency shading is divided out and
  replaced by the near leg's, sampled at the same position across the leg's
  width on the same row, at 90% so the far leg still sits behind. Highlights
  are capped, or photo glare at the heel turns white, and semi-transparent
  edge pixels are relit in proportion to their alpha, or the edge haloes.
  First, the pale floor fringe round the far foot is faded out by warmth
  *relative to brightness*: the far foot is dark felt, which an absolute
  threshold cannot tell from a pale fringe.
- **The near leg's front edge had a 2–4 px pale rim**, invisible against the
  meadow but a white outline once it crossed the far leg. Those pixels keep
  their alpha, so the edge stays antialiased, and take the colour of the felt
  just inside them.

The blink stays a separate image. It fades in over the face and has no business
being part of the deformable mesh. It is not parented to `Torso`, so it would
not follow the lean — it only fires in `Idle`, where the lean is zero.

The source cutout contained pale meadow pixels around the feet. The asset build
cleans only that static region by attenuating alpha where the pixels lose the
warm-red colour difference of the felt, then removes one disconnected remnant.
This does not split the character or reintroduce a moving seam: the result is
still one texture on one mesh.

## Source of truth and rebuild

`gen-scene.py` is the source of truth for topology, weights and animation
timing. Editing the generated `scene.rml` or `build/critic-walk.riv` directly is
temporary; the next build replaces it. Port any useful editor experiment back
into the generator before rebuilding.

From the repository root:

```sh
art/rive/critic-walk/build-assets.sh
```

That one command regenerates `assets/critic.png`, `assets/blink.png`,
`scene.rml`, `gait.json`, `build/critic-walk.riv`, and the app's copies of the
`.riv` and the gait. Verify after changes with:

```sh
cd art/rive/critic-walk
rive . --verify
rive inspect . --summary
```

## Format rules worth remembering

- **Mesh vertex `x`/`y` are absolute in the Image's parent space.** The Image's
  own `x`/`y` is ignored once it carries a Mesh.
- **A Tendon's bind transform is the bone's world transform in that same
  space**, at the bind pose, read as `Mat2D(xx, xy, yx, yy, tx, ty)`. A bone at
  rotation 0 binds with the defaults; the leg bones point down at +90° and bind
  with `xx="0" xy="1" yx="-1" yy="0"`, which the pixel check below confirms.
  A child `Bone`'s bind is at its parent's tip, with the parent's rotation.
- **Bones must sit inside the Mesh's parent chain.** Bones parked on the
  artboard while the mesh lives under a Node mean the skinning delta
  `boneNow · boneBind⁻¹` cancels the Node's motion, and the figure silently
  stops following the rig. There is no warning; `--verify` passes and the figure
  simply renders in the wrong place.
- **`Weight.indices` holds `tendonIndex + 1` per byte**, 1-based, and
  `Weight.values` must total 255 across the slots in use. The runtime divides by
  255 and does not renormalise, so 128 + 128 scales a vertex by 256/255. Use
  128/127.
- Four bones per vertex is the runtime limit, not a convention.
- `triangleIndexBytes` is varint-encoded triangle indices, base64'd. A bad index
  takes down the whole file, not just that image.
- Mesh vertices are emitted as `ContourMeshVertex` on the grid's border and
  `MeshVertex` inside. At runtime the two behave identically; the distinction
  only matters for a file that round-trips through the editor. The mesh is a
  rectangular grid, so its "silhouette" is that rectangle, not the figure's
  outline — it is a grid, and the editor's reading of it should not be trusted.

## The check that proves it

At the bind pose the deformation is the identity, so the meshed figure must
render **pixel-identical** to the flat texture. That is the test.
`CRITIC_RIG_REVIEW=bind python3 gen-scene.py` writes a scene whose default
machine plays nothing; render frame 1 and compare against `assets/critic.png`
composited on the renderer's `#1d1d1d` backdrop:

```
RMSE 37.7 (0.00058), 0 pixels off by more than 3%
```

What remains is texture resampling on the outline. Three meshes give
`RMSE 37.8`, so the split is invisible at rest. A wrong or transposed bind
shows up here as the whole figure shifted, mirrored or collapsed, and
`inspect` reports nothing. Rebuild with `build-assets.sh` afterwards; the review
scenes are not for shipping.

`rive inspect` does decode what you wrote, which makes the weights checkable
without rendering:

```
"Weight": {"influences": [{"tendon": 1, "weight": 0.502}, {"tendon": 2, "weight": 0.498}]}
"Skin":   {"tendons": [{"index": 1, "boneId": "0:40", "bind": [1, 0, 0, 1, 100, 50]}]}
```

## The walk

The first version moonwalked, for three reasons stacked on each other:

- **The signs were backwards.** Rive rotation is clockwise-positive with y
  down, so for a figure walking right a *positive* thigh angle puts the foot
  *behind* the hip. The old cycle had the foot swing forward while it was on
  the ground and back while it was in the air — the definition of a moonwalk —
  and the knee bent the wrong way.
- **The shins were not children of the thighs** (see the rig above), so the
  feet barely moved while the legs stretched.
- **Travel and gait had no relation to each other.** The page slid the figure
  across with a 4 s CSS animation whatever the legs were doing — a ±0.2 rad
  thigh swing covers a few pixels a step while the page moved 50+. On top of
  that, the runtime stops drawing a canvas that is off screen, so the gait did
  not even start until the figure had already slid into view.

The walk is now planned in world space by `gen-scene.py`, and checked there:

- **A planted foot is flat and does not move.** In stance the ankle is pinned
  and the foot bone counter-rotates to stay level, while the hip rides an arc
  over it from `REACH` in front to `REACH` behind. That fixes the rest: stride
  is `2 · THIGH · sin(REACH)` (45.2 px), the bob is
  `THIGH · (1 − cos θ)` (up to 7 px, lowest at each footfall), and the speed is
  stride per step (208 artboard px/s at 13 frames a step). Both legs share
  `THIGH`, so at every handoff the foot landing and the foot leaving ask for
  the same body height.
- **The swing lifts and reaches.** The hip draws the free leg up (`LIFT`), the
  thigh carries it from behind to in front with an ease, and the foot tips
  toe-down as it leaves and toe-up as it reaches (`FLICK`), landing flat.
- **The stop is a real last step.** `Walk` loops until the page sets `arrive`;
  the machine finishes the cycle it is in (exit time 100%), then `Stop` brakes
  the body over the planted left foot on a cubic that leaves at walking speed
  and arrives at rest, swings the right foot alongside, rocks the lean forward
  and back, and squashes the body into its hips (a `Torso` scale, so the feet
  stay put). Then `Idle`.
- **`validate()` refuses a bad gait.** It fails the build if a planted foot
  moves at all between frames, if any foot sinks more than 0.5 px into the
  ground, or if the swinging foot clears the ground by less than 2 px through
  the middle of its swing.

A rigid foot rolling with the leg was tried first and rejected: the toe points
forward, so the foot reaches lower behind the hip than in front, and making the
two footfalls meet at the same body height pushed the legs 50° back and 8° forward.

### Reviewing it

The spike is hidden by default; `?walk` on the page shows the entrance.
`?walkpose=<frame>` skips the entrance and holds the figure in the
middle on that frame of the cycle: 0 has the near leg planted in front of the
far one, 13 the far leg in front with the legs apart, 20–25 the near leg
swinging across.

The screenshot tool renders single frames, so a walk in place proves nothing
about skating. `CRITIC_RIG_REVIEW=walk python3 gen-scene.py` writes a scene on
a 1000 px artboard whose default machine walks three cycles and stops *with*
travel. Render frames with `rive . --screenshot=<png> --advance=<frame>`, and a
planted foot must hold the same pixels from frame to frame. It does: the left
foot sits at x 346–389 through its whole stance, and the right one lands at
445–475 and stays there.

## The page

`gen-scene.py` also writes `gait.json`: the cycle length, the travel per cycle,
and the stop's travel curve, frame by frame. `src/ui/CriticWalkSpike.tsx` reads
it and moves the figure at exactly that speed. It plans whole cycles, as many
as it takes to start with the lantern (`figureRight`) off the left edge, and
sets `arrive` during the last one. The position is read off Rive's own clock —
the sum of the `Advance` event's elapsed time — rather than a CSS animation, so
gait and travel cannot drift. `shouldUseIntersectionObserver: false` keeps the
runtime drawing while the figure is still off screen.

Measured in Chromium by reading the canvas every frame: the planted foot holds
within ±0.4 px in page coordinates for its whole stance, and the figure stops
with its box exactly centred at 390, 1440 and 1920 px wide. The speed is set by
the stride, not by the screen, so the entrance takes 4.1 s on a phone, 8.4 s at
1440×900 and 10.2 s at 1920×1080. Going faster means a longer stride (`REACH`)
or a quicker step (`STEP`); scaling the page travel instead brings the skating
back.

Headless Chromium no longer falls back to software WebGL, and the runtime draws
image meshes through WebGL: without
`--use-angle=swiftshader --enable-unsafe-swiftshader` the figure silently does
not draw and the console reports "Cannot render the mesh because the GL Context
was lost".

## Still open

- The page spike (`src/ui/CriticWalkSpike.tsx`) is throwaway review
  scaffolding, not the shipping home for the figure. When the walk is promoted,
  the same separation belongs inside `.landscape`: Rive supplies the gait;
  the placement system supplies travel, at the speed in `gait.json`.
- `arrive` is a state machine input, which the runtime now warns is
  deprecated in favour of view model data binding.
- The other two figures (Sleeper, Sprout) have not been rigged. Per the review
  gate in `character-motion-plan.md`, the Critic goes in first.
