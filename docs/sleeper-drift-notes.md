# Rive notes — the Sleeper's leaf drift

`art/rive/sleeper-drift` brings the Sleeper down from above the top of the
page, asleep on its pillow, swinging from side to side like a falling leaf.
It is a review spike like the parachute: hidden unless the URL has
`?sleeper`, or `?sleeperpose=<frame>` to hold one frame of the swing (0–160)
in the middle of the screen. The method is in
[rive-entrance-playbook.md](rive-entrance-playbook.md).

## Rebuild

```sh
art/rive/sleeper-drift/build-assets.sh
```

This copies the app's own cutout (`src/assets/figures/figure-sleeper.webp`)
in as `assets/sleeper.webp`, runs `gen-scene.py`, compiles the `.riv` and
copies it and `drift.json` into `src/assets/rive/`. There is no prop and no
vector part: only the photo, moved.

To look at the landing frame by frame:

```sh
cd art/rive/sleeper-drift
SLEEPER_REVIEW=land python3 gen-scene.py
rive . --screenshot=review/land.png --advance=60
python3 gen-scene.py   # back to the shipping scene
```

## Who owns what

The same split as the parachute, and the same page component:
`src/ui/DescentSpike.tsx` with the `sleeper` entry in `src/ui/descents.ts`.
The page drops the canvas at about 90 screen px/s, fitted to whole swings,
sets `land` in the last one and eases to `touchdownSpeed` (0.6 artboard
px/frame) over the 64-frame flare. Rive's `Motion` machine plays `Descend`
(one 160-frame swing, looping), then `Land` (the flare damps the swing out,
it touches down at frame 64 and sinks into a 3% squash), then `Idle` (slow,
deeper breaths, 270 frames).

The rig, outermost first:

```
Lift   (at the pivot; moves up as the swing rises at its ends)
  Rig  (the pendulum's rotation)
    Tilt   (at the middle of the body; turns back a quarter of the swing)
      Squash (at the feet: breathing, the landing)
        Image Sleeper
```

## Things that were not obvious

- **The cutout lost the top of its head.** The Sleeper's misty blue felt is
  so pale and smooth that it passed every backdrop test. It is now kept by its
  colour (`PALE_FELT` in `scripts/cutout-figures.py`): the backdrop stays
  within about 1 level of grey, the felt is 8 or more. The contact shadow
  picks up the felt's colour too, so that protection stops above the bottom
  fifth of the figure. There, a floor rim is faded by colour and lifted off
  downward edges. The fix is opt-in; a global colour test kept the lantern's
  glow halo.
- **A leaf is a pendulum that rises at its ends.** With only the arc's own
  rise (23 px) against the page's steady drop it read as a swing, not a
  leaf. The extra `LIFT·(θ/A)²` (26 px) makes it nearly hover coming into
  each end, then drop away.
- **The figure box sticks out of the artboard.** The tile's empty top third
  is above the artboard (`figureBox.y` is negative), so the canvas is no
  bigger than the swing needs. The page CSS works from the box and doesn't
  mind.
