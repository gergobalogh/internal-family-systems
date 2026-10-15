# Rive notes — Self-hug's toy waddle

`art/rive/selfhug-waddle` brings Self-hug in from the left, rocking from one
foot to the other like a wind-up felt toy. It stops, and then leans over
toward the empty space beside it and stays there a while. It is a review
spike: hidden unless the URL has `?selfhug`, or `?selfhugpose=<frame>` to
hold one frame of the rock (0–60) in the middle of the screen. The method is
in [rive-entrance-playbook.md](rive-entrance-playbook.md).

## Rebuild

```sh
art/rive/selfhug-waddle/build-assets.sh
cd art/rive/selfhug-waddle && SELFHUG_REVIEW=enter python3 gen-scene.py   # Enter at once, for screenshots
```

The cut is `cut()` from `scripts/cutout-figures.py` (opted in to
`PALE_FELT`) on `art/out/figure-self-hug-1.jpg`, cropped like a set of one.
The project's `cutout.py` then fades the floor round the feet, below tile row
560, wherever a pixel loses the felt's warmth, `(r − (g + b)/2)/255`, between
0.13 and 0.19.

The closed-eye overlay, `blink.png`, is cut by `scripts/blink-overlay.py`
from a generated edit (`art/prompts/figure-self-hug-blink.md`). AI Studio
declined the whole figure with its eyes shut twice (and failed once),
perhaps because closed eyes over crossed arms read as something darker. So
the edit is of a close-up of its face, `art/out/figure-self-hug-face.png`:
the photo's box 465,290,645,470 scaled up to 1024. The result is
`art/out/figure-self-hug-blink-face-1.jpg`, and `--from` puts it back. A
`Blink` layer in the machine shows it twice every ten seconds, through the
entrance too (the blink recipe in
[rive-entrance-playbook.md](rive-entrance-playbook.md)).

## Who owns what

`src/ui/SideEntranceSpike.tsx`, with the `selfhug` entry in
`src/ui/sideEntrances.ts`. This is the first figure with a gait:

- Rive's `Motion` machine loops `Approach` (one rock, 60 frames) until
  `arrive` is set. It then finishes the rock in progress (exit time 100%) and
  plays `Enter` (250 frames), then `Idle` (300 frames, rocking itself very
  gently).
- The page fits whole rocks to the screen: as many as come nearest the
  nominal 190 artboard px a rock, with the speed fitted so they land it
  exactly. It sets `arrive` during the last one. Within a rock it reads the
  travel from `cycle.profile` (a fraction of a rock's travel); in `Enter`,
  from `travel` in rocks, so the glide out of the last rock carries on at its
  speed.

The rig:

```
Right Foot  (at the outer corner of the right sole: max(tip, 0))
  Left Foot  (at the outer corner of the left: min(tip, 0))
    Breath  (at the middle of the feet)
      Image Self-hug
```

## Things that were not obvious

- **Rocking about two pivots is two nested nodes.** Tipping right turns about
  the right foot's outer corner, tipping left about the left's. So one node
  takes the positive part of the tip and the one inside it the negative part.
  Each is zero while the other works. For that to hold between keys, there
  must be a key exactly where the tip crosses zero. The rock is a sine with
  a period of 60 frames, so its zero crossings fall on whole frames, and
  `tip_frames()` adds a key there.
- **A rigid figure cannot rock its way along without its feet slipping.**
  Each tip about a foot undoes itself, so on its own it goes nowhere. A
  wind-up toy's feet do slip, so these do too. The page's travel is
  bunched where the weight crosses from one foot to the other and nearly
  still while it stands on one: `f/T + S/(2ωT)·sin(2ωf)` with `S = 0.8`.
  There the slip is hidden in the motion.
- **The rock dies down rather than stopping.** `damped_to_rest` leaves zero
  at the rock's own angular speed and is back at zero, standing still, 46
  frames later. The glide to a stop is a Hermite from the rock's travel speed
  over the same frames.
- **The floor round its feet has picked up its warmth**: a pale rim beside
  each foot and a dark line under the soles, which pass as figure. Below
  the legs only, alpha fades out wherever a pixel loses the felt's warmth,
  as the Defender's cutout does.
