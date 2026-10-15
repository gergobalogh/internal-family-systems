# Rive notes — Shell washed ashore

`art/rive/shell-wave` brings Shell in from the left inside a felt wave:
waist-deep behind the crest, bobbing, eyes still closed, still listening to
its shell. As the wave runs up the beach and stops, it crests: the crest
leans over and the lip curls. Then it draws back the way it came, sinking
and fading, and leaves Shell on the ground, which it settles onto with a
small squash. It is a review spike: hidden unless the URL has `?shell`, or
`?shellpose=<frame>` to hold one frame of `Enter` (0–340; 150 is the crest)
in the middle of the screen. The method is in
[rive-entrance-playbook.md](rive-entrance-playbook.md).

## Rebuild

```sh
art/rive/shell-wave/build-assets.sh
cd art/rive/shell-wave && SHELL_REVIEW=enter python3 gen-scene.py   # Enter at once, for screenshots
```

Shell's cut is `cut()` from `scripts/cutout-figures.py` on
`art/out/figure-shell-1.jpg`, cropped like a set of one, with Shell opted in
to `PALE_FELT` (the cream shell is as pale as the backdrop), `FLOOR_GLARE`
(the floor between its feet has picked up the plum) and `DEFRINGE`.

The wave is a generated prop: `art/prompts/prop-wave.md`, made in AI Studio
with `scripts/studio/generate.mjs` into `art/out/prop-wave-1.jpg` (a felt
wave in pale blue, a cream crest curling right, a hollow under the lip).
`cutout.py` separates it on chroma like the other props, with two extras:

- The flood from the border is also seeded inside the hollow under the lip
  (`HOLLOW`: pure backdrop), which the border flood reaches only through a
  gap a pixel or two wide.
- The floor shadow at the foot of the front face is pale and grey. It fades
  out in the bottom 12% (`FLOOR_BAND`), and then only the largest connected
  piece is kept, which drops what is left of it.

It is scaled to `WAVE_HEIGHT` (460) in Shell's tile pixels, so the scene
places it 1:1; the scene's wave constants were measured on a 352 px cut and
are scaled by `K`.

## Who owns what

A side entrance with no gait: the `shell` entry in
`src/ui/sideEntrances.ts`, with `SideEntranceSpike.tsx`. The page brings the
canvas in over `Enter`'s first 170 frames (`ARRIVE`), fast at first and
slowing to a stop, whatever the screen: the plan's travel is all
`fraction`. Rive does everything else in `Enter` (340 frames), then `Idle`
(300 frames: breathing, and leaning slowly into the sound).

```
Wave Base  (sinks back and down: x, scaleY; opacity for the fade)
  Image Wave + Mesh "Water"  (the roll, the crest's lean, the lip's curl)
  Shape Wave Shadow           (a feathered ellipse on the ground)
Feet  (Shell's float, bob and settle)
  Image Shell
```

## Things that were not obvious

- **The first sibling paints on top.** The wave node comes before Shell in
  the RML so it paints over it, and Shell is in the water rather than in
  front of it.
- **One mesh does three things.** `deform()` moves each texture point by
  the roll (a sine along the surface, more the higher up, so the base stays
  flat), the lean (the crest's upper part pushed forward, by the square of
  height), and the curl (the lip rotated about a point under it). The grid
  is dense under the crest and lip. `validate()` checks that no triangle
  turns over at any frame.
- **The wave sits under Shell's body, not its feet.** `WAVE_AT` is a point
  on the back slope two thirds of the way up, under the middle of the body,
  so Shell is waist-deep with its face and the top of the shell clear of
  the crest. Shell floats 16 px while it rides and comes down as the water
  goes (`SETTLE`, 200–262).
- **The wave's shadow is in the scene.** It is an ellipse in the page
  shadows' colour (`6B342C28`), softened by a `Feather` of 16, behind the
  wave, and goes with it as it recedes. The page's own shadow is Shell's.
- **A big `.riv` stalls headless captures.** At 295 KB (the wave texture and
  its mesh keys), SwiftShader takes about 3 s before the first frame, so a
  screenshot timed for the middle of the entrance catches the start. Use
  `?shellpose=N` for those.
