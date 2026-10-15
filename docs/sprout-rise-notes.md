# Rive notes — the Sprout's rise

`art/rive/sprout-rise` brings the Sprout up out of the ground in the middle
of the page. A felt mound of soil heaves up, the two leaves come up through
its top folded together and open with a shiver, and the Sprout gathers itself,
pops up out of the soil into a small hop and lands on its feet. The mound
sinks back into the ground and the Sprout bows, tilting toward its flower.
It takes 222 frames (3.7 s). It is a review spike: hidden unless the URL has
`?sprout`, or `?sproutpose=<frame>` to hold one frame of `Rise` (0–222). The
method is in [rive-entrance-playbook.md](rive-entrance-playbook.md).

## Rebuild

```sh
art/rive/sprout-rise/build-assets.sh
```

This copies the app's own cutout (`src/assets/figures/figure-sprout.webp`)
in as `assets/sprout.webp`, and cuts the mound out of
`art/out/prop-soil-mound-1.jpg` if it is there (`cutout.py`; prompt
`art/prompts/prop-soil-mound.md`, generated in the figure-set chat). Then it
runs `gen-scene.py`, compiles the `.riv` and copies it and `rise.json` into
`src/assets/rive/`.

`gen-scene.py` refuses to write a plan that breaks its checks:

- no jump from `Rise` into `Idle`, or round the `Idle` loop;
- the Sprout starts wholly underground;
- the mound is wider than the body it has to hide;
- no triangle of the leaf mesh turns over;
- everything above ground stays on the artboard.

## Who owns what

Rive plays all of it: the `Motion` machine runs `Rise` (oneShot), then
`Idle`, with no inputs. `src/ui/SproutRiseSpike.tsx` only parks the canvas
mid-screen and moves the page shadow along `shadowKeys` from the plan,
reading the frame off Rive's `Advance` events. The shadow is under the mound
(wider, a little to the right) while the mound stands, and gathers to the
Sprout's own footprint as the mound sinks.

The scene, in paint order (the first paints on top):

```
Mound              (moves up out of the ground and back; bulges as the Sprout pushes through)
  clip: Above Ground
  Image Mound Felt
  Shape Above Mound   (no paints: the region above the mound's top edge, 6 px inside it)
Sprout
  clip: Above Ground, clip: Above Mound   (both, so they intersect)
  Lift (how far below its place it is)
    Bow  (at the feet: bow tilt, stretch, squash, breathing)
      Image Sprout + Mesh Leaves
Shape Above Ground  (no paints: a rectangle down to the ground line)
```

## Things that were not obvious

- **Clipped only at the ground, it rose from behind the mound.** The body is
  wider than the mound's top, and the mound hid it like a wall. Clipped to the
  region above the mound's top edge as well, it comes up out of the soil. The
  clip's shape lives inside the Mound node, so it heaves, bulges and sinks
  with it. That is also why the mound moves through the ground line instead
  of scaling to nothing: a clip that scales to zero hides everything.
- **The mound is mirrored.** As generated, its high point is left of its
  middle, and the leaves first showed over its right shoulder. Mirrored and
  centred at x 345 of the tile, its top is under the stem.
- **The leaves bend without cutting the photo.** The mesh covers the whole
  figure, with rows 30 px apart only above the head (`Grid.lines`) and one
  row at y 113, just above the head's top edge, below which nothing moves.
  Each vertex rotates about the stem's base (365, 115). They fold together
  as they come up through the soil (`side` +1 for the left leaf, −1 for the
  right), are pressed up again by the pop, and flutter when they open, when
  the Sprout lands and when it bows. The bend fades out sideways 60 px past
  the leaves: without that, the mesh's edge vertices, 365 px from the stem,
  swung round and crossed.
- **The cutout had a pale fringe round the feet**, between the legs and
  under the soles: floor glare, invisible on white and plain on the meadow.
  `FLOOR_GLARE` in `scripts/cutout-figures.py` now fades pixels near the
  floor that are both pale and grey. Removing the glare raised the figure's
  lowest row, so the crop now puts it 5 px lower in its tile; the stem and
  mesh rows here were moved with it.
- **The pop is fast on purpose**, 30 frames from the gathered crouch to the
  top of the hop (peak 19 artboard px/frame), so the moment the body is
  seen above the mound's slopes is too short to read as "behind".
