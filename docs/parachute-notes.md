# Rive notes — the Defender's parachute

`art/rive/defender-parachute` floats the Defender down from above the top of
the page under a felt canopy. It is a review spike like the Critic's walk:
hidden unless the URL has `?parachute`, or `?parachutepose=<frame>` to hold
one frame of the sway (0–160) in the middle of the screen.

## Rebuild

```sh
art/rive/defender-parachute/build-assets.sh
```

This cuts the figure and canopy out of `art/out/figure-defender-1.jpg` and
`art/out/prop-parachute-1.jpg` (if they are there), runs `gen-scene.py`,
compiles the `.riv` and copies it and `parachute.json` into
`src/assets/rive/`. `gen-scene.py` is the source of truth; `scene.rml` is
generated, and `gen-scene.py` refuses to write it if the plan breaks its own
checks (no jumps at the loop or the hand-offs, feet under the pivot at
touchdown, no line stretched past its length, the heap inside the artboard).

To look at the landing frame by frame, write the review scene, whose default
machine plays `Land` straight away, and capture frames:

```sh
cd art/rive/defender-parachute
DEFENDER_REVIEW=land python3 gen-scene.py
rive . --screenshot=review/land.png --advance=60
python3 gen-scene.py   # back to the shipping scene
```

## Who owns what

The page (`src/ui/DescentSpike.tsx`, shared with the Sleeper's drift) moves
the canvas; Rive moves everything inside it (`Motion`
machine: `Descend` loops one 160-frame swing, `Land` follows once `land` is
set and the swing in progress finishes, then `Idle`). The page fits its speed
so the drop takes whole swings (aiming at ~110 screen px/s), sets `land` in
the last one, and eases from that speed to `touchdownSpeed` over the
`flareFrames` of the flare, as Rive damps out the sway. It stops on the frame
`Land` starts the squash. Both read the same clock, the sum of the runtime's
`Advance` events, so they cannot drift. The contact shadow is a page element
on the ground, and it gathers as the feet come down to it.

## Things that were not obvious

The general lessons (cutouts, WebP, testing against the world plate,
headless capture) are in [rive-entrance-playbook.md](rive-entrance-playbook.md).
These are the parachute's own:

- **The canopy needed its own cutout.** The figure cutout keeps pixels that
  are textured or saturated, and the canopy's lit side (pale cream, pale sage)
  is neither. It lost a third of the dome. Chroma separates them: the
  backdrop stays within ~4 levels of neutral grey, and the palest felt is 14
  or more (`cutout.py`).
- **Slack lines have to hang.** The first version bowed each slack line
  sideways by the sag a parabola of that length would have. Once the canopy
  fell below the hands, the lines arched *up* from the heap like handles.
  Now each line becomes a rope at touchdown (a verlet chain with gravity,
  pinned at the hem and the hand), and a cubic is fitted to it each frame,
  so the runtime still draws two vertices per line.
- **Line ends are solved against the mesh as the runtime draws it.** The
  canopy collapses through an image mesh keyed every 6 frames and drawn
  linearly in between. The hem cusps are fixed barycentric points in that
  mesh, so their positions come from the same interpolation, and the lines
  stay attached between keys.
- **Keep the heap within reach of the lines.** The validator caught the
  first collapse ending 45 px further from the hands than the lines are long.
  The heap rests higher and drifts less now.
- **The inside of the canopy folds away as it flattens.** Otherwise the cream
  inside, squashed flat, reads as an upturned plate.
- **Pale lines vanish in this world.** Cream yarn disappeared against the
  sky and the pink clouds. Natural-wool tan (`FFAE9F86`) reads on all of
  them.
