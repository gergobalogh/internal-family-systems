# Rive notes — Curled's wary peek

`art/rive/curled-peek` brings Curled in from the left edge, warily. It
slides a little way in and freezes, cranes up to check, backs off quickly
and cowers. Then it comes the rest of the way in three slides, glancing up
in the pauses, and lets out a breath. It is a review spike: hidden unless the
URL has `?curled`, or `?curledpose=<frame>` to hold one frame of `Enter`
(0–372) in the middle of the screen. The method is in
[rive-entrance-playbook.md](rive-entrance-playbook.md).

## Rebuild

```sh
art/rive/curled-peek/build-assets.sh
```

Curled is not in the app yet, so this cuts it out of
`art/out/figure-curled-1.jpg` with `cut()` from `scripts/cutout-figures.py`,
opted in to `PALE_FELT` and `FLOOR_UNDER`, and crops it like a set of one.
It then runs `gen-scene.py`, compiles the `.riv` and copies it and
`peek.json` into `src/assets/rive/`.

The closed-eye overlay, `blink.png`, is cut by `scripts/blink-overlay.py`
from a generated edit, `art/out/figure-curled-blink-1.jpg`
(`art/prompts/figure-curled-blink.md`). A `Blink` layer in the machine shows it
twice every ten seconds, through the entrance too (the blink recipe in
[rive-entrance-playbook.md](rive-entrance-playbook.md)).

## Who owns what

This is the first side entrance, and its page component is shared by all of
them: `src/ui/SideEntranceSpike.tsx`, with the `curled` entry in
`src/ui/sideEntrances.ts`. Curled has no gait, so Rive plays one long `Enter`
(372 frames) from the start, then `Idle` (300 frames, breathing, glancing up
now and then). The page reads the travel frame by frame from `travel` in
`peek.json`. Each row is `[frame, fixed px, fraction, 0]`:

- the peek (170 artboard px) and the backing off (120 px) are **fixed**,
  measured from the edge, so they look the same on any screen;
- the three slides are **fractions** of whatever distance is left, so they
  stretch to the screen. Sliding on its bottom, Curled has no foot to keep
  planted, so nothing slips.

The rig:

```
Base  (where it sits: lean, crane, cower, breath)
  Image Curled
```

## Things that were not obvious

- **All of the character is in the timing.** The slides are pushes: 8 frames
  rocking back, 32 frames moving, 22 frames paused. The freeze after the
  peek and the backing off, over in 16 frames, do the rest.
- **The lean is a spring driven by acceleration.** The top of the body lags
  its base: a damped rotational spring (period 26 frames, damping 0.45,
  0.0009 rad per px/frame²) fed the slides' acceleration, computed against a
  nominal 300 px slide. It rocks back as it pushes off and forward as it
  stops, with a little settle.
- **The cutout needed a floor fix of its own.** Curled sits on the floor, and
  the shadow under it and the crease where it meets the floor passed as
  figure. Some of its shaded felt is as grey as they are. `FLOOR_UNDER`
  fades out everything in the bottom fifth below the lowest clearly coloured
  pixel of each column (chroma 12+). Each column reaches as low as its
  neighbours within 5 px, so the fuzzy sides of a foot aren't cut short.
  Keep that reach small: a wider one brings back the floor in the narrow gap
  between its feet.
- **Its lit side is as pale as the backdrop**, so it is `PALE_FELT` too, like
  the Sleeper. It is not `FLOOR_RIM`, which would fade its grey shins.
