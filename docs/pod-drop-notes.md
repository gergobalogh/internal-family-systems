# Rive notes — the Pod's soft landing

`art/rive/pod-drop` drops the Pod in from above the top of the page. Its
padding swallows the landing: a deep, slow squash with no bounce, then a
slow rise back to its shape with no overshoot. It is a review spike: hidden
unless the URL has `?pod`, or `?podpose=<frame>` to hold one frame of the
landing (0–126) in the middle of the screen. The method is in
[rive-entrance-playbook.md](rive-entrance-playbook.md).

## Rebuild

```sh
art/rive/pod-drop/build-assets.sh
```

The Pod is not in the app yet, so this cuts it out of
`art/out/figure-pod-1.jpg` with the project's own `cutout.py`, and crops it
like a set of one. It then runs `gen-scene.py`, compiles the `.riv` and copies
it and `drop.json` into `src/assets/rive/`. Without the photo (`art/out` is
gitignored), the committed `assets/pod.webp` is used as it is.

To look at the landing frame by frame:

```sh
cd art/rive/pod-drop
POD_REVIEW=land python3 gen-scene.py
for f in 4 10 20 34 56 90 126; do rive . --screenshot=review/land-$f.png --advance=$f; done
python3 gen-scene.py   # back to the shipping scene
```

## Who owns what

The page component is the descents' (`src/ui/DescentSpike.tsx`), with the
`pod` entry in `src/ui/descents.ts`. Its motion is `{ fall: 0.25 }`: the canvas
speeds up evenly from a quarter of the touchdown speed to all of it (20
artboard px a frame) over whole `Fall` cycles, and there is no flare
(`flareFrames: 0`), so it hits the ground at full speed. `land` is set in the
last cycle. Rive's `Motion` machine plays `Fall` (24 frames, 3% taller and 2%
narrower), then `Land` (126 frames), then `Idle Blinking`. That is `Idle`
(slow breaths, 240 frames) three times over, blinking at frames 155 and 479.
The page plays `Idle` alone with reduced motion, and then it doesn't blink.

The rig is one node and a mesh:

```
Breath  (at the feet: breathing)
  Image Pod + Mesh Padding
```

## Things that were not obvious

- **The padding is eaten by the figure test.** Its cream felt is as bright
  and smooth at its lit edge as the backdrop. `cutout.py` separates on chroma
  instead: the backdrop stays within ~3 levels of grey, the cream's fuzzy
  halo is 15 or more. The grey feet stand in a floor shadow as grey as they
  are, and there texture tells them apart: the shadow is smooth.
- **The give keeps the speed it fell at.** The squash is an exponential
  approach, `1 − e^(−t/τ)`, with τ chosen so the top of the padding leaves
  contact at the touchdown speed: τ = (depth + stretch) · padding height /
  touchdown speed ≈ 7.3 frames. A flat-starting cubic adds what the
  exponential still lacks at frame 34, so it arrives exactly, standing
  still. Any slower start reads as a bounce off the ground.
- **The legs must not squash.** The mesh rows above `LEG_TOP` (tile y 548)
  close up toward it and its lower half spreads like a beanbag. The rows
  below never move, and the spread fades out over 22 px under that line.
  A plain scale about the feet shortened the legs into stubs.
- **It holds, then rises with no overshoot.** It holds for 22 frames,
  sinking 2% deeper, then rises on a 70-frame smoothstep. Insulated means
  nothing springs back.
- **It blinks only at rest.** The closed-eye overlay, `blink.png`, is flat,
  and the padding mesh moves the face as it lands. A Blink layer of its own
  would slide off the face. So the blink keys live in `Idle Blinking`, in
  which the mesh rests and only breathes. The overlay is cut by
  `scripts/blink-overlay.py` from `art/out/figure-pod-blink-1.jpg`.
- **The mesh is the size of the file.** After the give, its keys are 6
  frames apart, which is plenty for the slow hold and rise. That brought
  the `.riv` down to 150 KB.
