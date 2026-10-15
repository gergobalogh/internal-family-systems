# Rive notes — Ribbon's pirouette

`art/rive/ribbon-pirouette` brings Ribbon in from the left, spinning on its
standing foot as it travels, the ribbon going round with it. It turns once
more on the ground, sinking into it, then springs into a hop that turns once
more in the air. It lands facing out, as in the photo, squashes, slides to a
stop and wobbles on its one foot, arm out, until it has its balance. It is a
review spike: hidden unless the URL has `?ribbon`, or `?ribbonpose=<frame>`
to hold one frame of `Enter` (0–200; 42 is mid-air) in the middle of the
screen. The method is in
[rive-entrance-playbook.md](rive-entrance-playbook.md).

## Rebuild

```sh
art/rive/ribbon-pirouette/build-assets.sh
cd art/rive/ribbon-pirouette && RIBBON_REVIEW=enter python3 gen-scene.py   # Enter at once, for screenshots
```

The cut is `cut()` from `scripts/cutout-figures.py` on
`art/out/figure-ribbon-1.jpg`, cropped like a set of one, with Ribbon opted
in to `FLOOR_GLARE` (pale floor under both feet, the raised one too) and
`DEFRINGE` (a light line along the ribbon and the body). The ribbon's loops
are open to the backdrop, so it needs no `ENCLOSED`.

The closed-eye overlay, `blink.png`, is cut by `scripts/blink-overlay.py`
from a generated edit, `art/out/figure-ribbon-blink-1.jpg`
(`art/prompts/figure-ribbon-blink.md`). A `Blink` layer in the machine shows it
twice every ten seconds, through the entrance too (the blink recipe in
[rive-entrance-playbook.md](rive-entrance-playbook.md)).

## Who owns what

The waddle's arrangement ([selfhug-waddle-notes.md](selfhug-waddle-notes.md)),
with the `ribbon` entry in `src/ui/sideEntrances.ts`. `Approach` is one turn
(28 frames), travelling evenly, so `cycle.profile` is a straight line.
`Enter` (200 frames) keeps the speed through the turn and the hop, then
slides to a stop in 14 frames. `Idle` (240 frames) sways very slightly on
its one foot. The rig is a single node:

```
Foot  (under the standing foot: scaleX for the spin, y for the hop,
       rotation for the wobble, scale for the squash and the breath)
  Image Ribbon
```

## Things that were not obvious

- **The spin is the photo scaled across, through zero.** `scaleX = cos θ`
  about the standing foot. Past a quarter turn the photo is mirrored, which
  reads as its far side. A negative `scaleX` on a Node draws mirrored in
  the web runtime with no trouble.
- **Side on, it is as thin as a card.** At an even rate it spent several
  frames a turn as a sliver. Turning like a dancer spotting fixes that:
  `θ = φ − 0.3·sin 2φ` for an even φ. It lingers facing out (and away) at
  0.4 times the speed, whips round side on at 1.6 times, and is thin for
  about a frame. It also rises 5 px on its toe each time it is side on.
- **Land exactly facing out, and stopping there is free.** The hop
  (28 frames, 54 px) takes the third turn, so the spin ends at a whole turn
  just as it lands. There `d(cos θ)/dt` is zero whatever the turning speed,
  so the spin can stop dead without a jump in `scaleX`.
- **The artboard has to hold the mirror image.** The ribbon reaches 374 px
  left of the standing foot and the arm 230 px right; mirrored, they swap
  sides. So the artboard is 800 wide with the foot in the middle, and the
  page's travel uses the real extremes (`content`), which `validate()`
  measures over every pose.
