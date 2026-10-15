# Rive notes — Doodle drawing its way in

`art/rive/doodle-line` brings Doodle in on its own crayon line. A loose
dusty-pink line draws itself in from the left edge, high up, wandering in
slow waves down to the ground a little way ahead of Doodle, which rides it
sitting down, still scribbling on its pad, swaying a little and tilting
with the line. The line lands it on the ground; it settles with a small
squash, and the line fades. It is a review spike: hidden unless the URL has
`?doodle`, or `?doodlepose=<frame>` to hold one frame of `Enter` (0–116; 40
is the touch-down) in the middle of the screen. The method is in
[rive-entrance-playbook.md](rive-entrance-playbook.md).

## Rebuild

```sh
art/rive/doodle-line/build-assets.sh
cd art/rive/doodle-line && DOODLE_REVIEW=enter python3 gen-scene.py   # Enter at once, for screenshots
```

The cut is `cut()` from `scripts/cutout-figures.py` on
`art/out/figure-doodle-1.jpg`, cropped like a set of one, with Doodle opted
in to:

- `PALE_FELT` and `BAND_FELT`. The cream pad on its lap is as pale as the
  backdrop, and its edge comes down into the bottom fifth, where everything
  pale is normally taken for floor glare. `BAND_FELT` keeps warm, bright
  pixels there.
- `ENCLOSED`, with looser thresholds than the default: the backdrop between
  the pad and its leg is in shade.
- `FLOOR_GLARE` and `DEFRINGE`.

The closed-eye overlay, `blink.png`, is cut by `scripts/blink-overlay.py`
from a generated edit, `art/out/figure-doodle-blink-1.jpg`
(`art/prompts/figure-doodle-blink.md`). A `Blink` layer in the machine shows it
twice every ten seconds, through the entrance too (the blink recipe in
[rive-entrance-playbook.md](rive-entrance-playbook.md)).

## Who owns what

The page component is its own, `src/ui/DoodleLineSpike.tsx`. It reads
`line.json` (copied to `src/assets/rive/doodle-line.json`).

- **Rive**, in the `Motion` machine: `Ride` loops one sway (60 frames) with
  three scribbles of the crayon hand. `Enter` (116 frames) follows when
  `arrive` is set, at the end of a sway: the glide slows to a stop in 44
  frames as the scribbling stops, and it squashes onto the ground. Then
  `Idle` (360 frames: breathing, and a burst of drawing).

  ```
  Seat  (at its lowest point: rotation for the sway, scale for the breath and squash)
    Image Doodle + Mesh "Hand"  (the scribble)
  ```

- **The page**: the line's shape is in the plan (`line`: `rise`, `descent`,
  `amplitude`, `wavelength`, `lead`, all artboard px). Its height `d` before
  the resting place is `rise·smoothstep(d/descent)` plus a sine wave that dies
  away over the last stretch, so it lands flat. The page samples it every 4
  artboard px from off the left edge to a little past the resting place,
  draws it once as an SVG path, and reveals it `lead` ahead of the seat with
  its dash offset (`pathLength` is the arc length in artboard px). It fits
  whole sways to the ride, moves the canvas so the seat is on the line,
  tilts it about the seat by half the line's slope (at most 0.2 rad), and
  slides the shadow along the ground under it, smaller and fainter the
  higher it rides.

## Things that were not obvious

- **The line starts before the figure does.** The figure starts `lead` px
  back along the line from where it begins, so at the first frame the line
  starts drawing at the left edge and the figure follows it on.
- **A crayon filter cost too much.** An `feTurbulence` displacement and
  grain filter looked right but made every frame re-filter a path the width
  of the screen; frames took 100–300 ms in the headless captures, against
  about 40 without it. The line is now stroked with a pattern: a 48 px tile
  of grain (mostly wax, flecks where the paper shows), made once on a canvas.
  The hand-drawn edge comes from a slight wobble added to the drawn points
  (not to the ride, which follows the smooth line).
- **The scribble is a local mesh.** The vertices round the hand and crayon
  move in a small figure-of-eight (6 × 3.5 tile px), whole within 45 px of
  the hand and gone by 105, on a grid that is dense there and coarse
  elsewhere. The pad round the crayon's tip moves a little with it. It reads
  as drawing at this size.
- **Seat, not feet.** It sits, so the point that rides the line and lands
  is the lowest point of its bottom (`SEAT`), and the tile is cropped with
  that at 95%. The line passes just under it, behind the figure, and shows
  again under the raised foot.
