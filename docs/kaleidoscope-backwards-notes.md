# Rive notes — the Kaleidoscope backing in

`art/rive/kaleidoscope-backwards` brings the Kaleidoscope in from the right.
It backs in with the toy waddle, its eye still to the kaleidoscope, leaning
back to look up through it: not looking where it is going. It stops short
with a small bump, as if it had backed into something, and keeps looking. It
is a review spike: hidden unless the URL has `?kaleidoscope`, or
`?kaleidoscopepose=<frame>` to hold one frame of the rock (0–72) in the
middle of the screen. The method is in
[rive-entrance-playbook.md](rive-entrance-playbook.md).

## Rebuild

```sh
art/rive/kaleidoscope-backwards/build-assets.sh
cd art/rive/kaleidoscope-backwards && KAL_REVIEW=enter python3 gen-scene.py   # Enter at once, for screenshots
cd art/rive/kaleidoscope-backwards && KAL_REVIEW=idle python3 gen-scene.py    # Idle Glance at once
```

The cut is `cut()` from `scripts/cutout-figures.py` on
`art/out/figure-kaleidoscope-1.jpg`, cropped like a set of one. The
Kaleidoscope is opted in to five of its fixes: `PALE_FELT`, `ENCLOSED`,
`FELT_BLUR`, `FLOOR_GLARE` and `DEFRINGE` (see below). The other two poses
and the closed-eye overlay come from three generated edits in `art/out`
(see "The glance" below). Without them, the build keeps the committed
assets.

## Who owns what

The same as Self-hug's waddle ([selfhug-waddle-notes.md](selfhug-waddle-notes.md)),
mirrored: `from: "right"` in `wander.json`, the `kaleidoscope` entry in
`src/ui/sideEntrances.ts`. `Approach` is one slow rock (72 frames), `Enter`
(136 frames) keeps backing up for 20 frames, stops in 6 and settles, and
`Idle Glance` (600 frames) loops after that. `Idle` (360 frames) slowly scans
up and down. It is what the page plays alone with reduced motion, and the
first and last halves of `Idle Glance`. Its feet pivot at the outer corners
of the soles, (186, 602) and (322, 592) in the tile.

## The glance

With the scope at its eye, only one eye shows, so it can't blink. Halfway
through `Idle Glance`, it lowers the scope to its chest, straightens up,
looks ahead, blinks once and raises the scope again. Then the scan carries
on. That is 240 frames in a 10 s loop.

The scope moves like stop-motion, through three tiles of the same figure,
and only one shows at a time:

| Tile | Pose | From |
|---|---|---|
| `kaleidoscope.webp` | scope at the eye | the photo |
| `kaleidoscope-halfway.webp` | scope by the cheek, just off the eye | `figure-kaleidoscope-halfway.md`, given the photo and the lowered photo |
| `kaleidoscope-lowered.webp` | scope at the chest, both eyes open | `figure-kaleidoscope-lowered.md` |

`blink.png` is cut from a closed-eye edit of the lowered photo
(`figure-kaleidoscope-lowered-blink.md`), over the lowered pose.

- **Only the arms and the scope come from an edit.** `posed_photo()` in
  `cutout.py` lines the edit up (the lowered one came back 4 px off), then
  takes only what changed inside `POSE_ZONE`, the box the arms and scope
  move in, by more than 30 after a blur. That area is grown, closed and
  feathered, and pasted into the photo. Everything else is the photo's own
  felt, so nothing shimmers when the tiles swap. Every tile is cut from the
  original's crop box, not its own, so they line up.
- **The timing, in glance frames:** the halfway tile at 2 for 5 frames,
  then the lowered one; the eyes shut at 84 and open over 8; the halfway
  tile again at 160 for 5 frames, then the raised one. Each swap is a hard
  cut on a whole frame, keyed on all three Images' opacity. A crossfade
  would show two scopes at once.
- **It straightens up as the scope comes down.** The tip goes from LOOK
  (leaning back) to 0 over 16 frames, and back over 16 as the scope goes up.
  The glance takes one slow breath. Where it joins the scan, the pose
  matches, and `validate()` checks those seams. It also checks that the
  lowered and halfway poses stay inside the artboard.

## Things that were not obvious

- **Rocking round a lean moves the zero crossings.** The tip is
  `LOOK + ROCK·sin(ωf)`, with LOOK = −0.03 (leaning back) and ROCK = 0.06.
  So the pivot changes feet where the sine is 0.5, at T/12 and 5T/12, not
  at 0 and T/2. With T a multiple of 12 (72), those are whole frames, where
  the keys have to be. It spends longer on its back foot, which suits
  someone leaning back to look up.
- **The bump is the top carrying on.** The travel stops in 6 frames (a
  Hermite from the rock's speed). The lean is a damped spring, period 22
  frames, damping 0.35, 0.010 rad per px/frame², stepped 8 times a frame and
  driven by that deceleration. The top of it is thrown on backwards and
  springs back. A squash of 3.5% down and 2% wide, decaying over 9 frames,
  lands with it.
- **The arm curls round under the scope and encloses some backdrop.** The
  flood fill from the border never reaches it, so `ENCLOSED` also seeds the
  fill wherever the backdrop is unmistakable: a 5 px patch of pure grey white
  (chroma ≤ 2, luma ≥ 246).
- **Strong teal bleeds its colour into the white beside it** through the
  colour tests' blur, and they kept that as a pale halo. `FELT_BLUR` reads
  chroma blurred only 0.7 px for this figure. Its felt also fades into the
  backdrop over a few px of fuzz, so its edge pixels are mostly white: a
  light line on any colour. `DEFRINGE` gives the edge the colour of the felt
  just inside it, a normalised blur of the opaque pixels within 3 px.
- **The shadow is off-centre** (`shadow.x` 0.4): the scope sticks out to the
  right, so the set-of-one crop puts its feet left of the tile's middle.
