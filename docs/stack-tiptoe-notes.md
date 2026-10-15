# Rive notes — the Stack's tiptoe

`art/rive/stack-tiptoe` brings the Stack in from the left on tiptoe: two
quick, tiny steps a cycle, the tower of blocks swaying a little behind. It
stops, and the tower carries on. It teeters forward, the Stack leans in
under it to catch it, it swings back and is caught again, smaller, and
steadies. It is a review spike: hidden unless the URL has `?stack`, or
`?stackpose=<frame>` to hold one frame of `Enter` (0–260; 34 is the teeter
caught) in the middle of the screen. The method is in
[rive-entrance-playbook.md](rive-entrance-playbook.md).

## Rebuild

```sh
art/rive/stack-tiptoe/build-assets.sh
cd art/rive/stack-tiptoe && STACK_REVIEW=enter python3 gen-scene.py   # Enter at once, for screenshots
```

The photo is the second take, `art/out/figure-stack-2.jpg` (the one with
bead eyes). The cut is `cut()` from `scripts/cutout-figures.py`, cropped like
a set of one, with the Stack opted in to `PALE_FELT` (the cream blocks),
`ENCLOSED` (the backdrop between its arms and its head), `FELT_BLUR`,
`FLOOR_GLARE` and `DEFRINGE`.

The closed-eye overlay, `blink.png`, is cut by `scripts/blink-overlay.py`
from a generated edit, `art/out/figure-stack-blink-1.jpg`
(`art/prompts/figure-stack-blink.md`). A `Blink` layer in the machine shows it
twice every ten seconds, through the entrance too (the blink recipe in
[rive-entrance-playbook.md](rive-entrance-playbook.md)).

## Who owns what

The waddle's arrangement ([selfhug-waddle-notes.md](selfhug-waddle-notes.md)),
with the `stack` entry in `src/ui/sideEntrances.ts`. `Approach` is a
22-frame cycle (two steps), `Enter` is 260 frames and `Idle` 300. The rig:

```
Right Foot  (at the outer corner of the right sole: max(tip, 0))
  Left Foot  (at the outer corner of the left: min(tip, 0))
    Breath  (at the middle of the feet)
      Image Stack + Mesh Tower
```

## Things that were not obvious

- **Only the tower moves, through one mesh over the whole photo.** The rows
  are close together only where it bends (`Grid.lines`). Everything above
  the bottom of the middle block turns as one, and a 14 px band at the
  bottom of that block takes up the bend. The lowest block, which the arms
  hold, never moves, so the arms never come apart from it. The weight also
  fades out 50 px either side of the blocks, so the far vertices don't
  swing round.
- **A stack tips over a corner, not its middle.** Turning about the middle of
  the seat looked like a bendy column. Leaning right, it turns about the
  right corner of where the middle block sits on the lowest (369, 198);
  leaning left, about the left (276, 198). The pivot changes where the angle
  is zero, so nothing jumps.
- **Catching is the body leaning in under it, late.** The tower's lean in the
  world is a damped swing (0.17 rad, period 58 frames, decay 48) kicked off
  as the stop bites. The body tips forward about its front foot by 0.55 of
  that, 8 frames late, and the mesh turns the tower by the difference. So
  the tower runs ahead of the body, which catches up, and the tower moves at
  most 0.12 rad against it.
- **At page size, small is invisible.** The first rock (0.035 rad) and teeter
  (0.13 rad) read in Rive's full-size renders, but the page draws the figure
  at about half that on a desktop and a third on a phone. There the top of
  the tower would have moved about 8 px.
- **Key only where the tip actually crosses zero.** `tip_frames()` used to
  add both frames round every frame where the tip *was* zero, which in a
  still `Idle` is every frame, with the whole mesh keyed each time. Keying
  only the crossings, and the teeter's mesh every 4 frames once the steps
  have stopped, took the `.riv` from 298 KB to 171 KB.
