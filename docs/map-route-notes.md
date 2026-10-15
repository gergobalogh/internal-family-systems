# Rive notes — Map following the plan

`art/rive/map-route` brings Map in along a planned route, rocking carefully
like Self-hug's wind-up waddle with its map held open. It comes in from the
left on a straight leg further back in the meadow and stops at the corner.
The rocking dies down, it reads across the map, looks up and leans toward
the way the route turns, rocks back onto its left foot and sets off on a
second leg slanting forward to its place. There it checks the map once more
and straightens up. A running stitch in natural-wool tan follows it, up to
its feet, and fades once it has arrived. It is a review spike: hidden unless
the URL has `?map`, or `?mappose=<frame>` to hold one frame of `Check`
(0–150; 60 is reading the map, 110 leaning toward the turn) in the middle of
the screen. The method is in
[rive-entrance-playbook.md](rive-entrance-playbook.md).

## Rebuild

```sh
art/rive/map-route/build-assets.sh
cd art/rive/map-route && MAP_REVIEW=check python3 gen-scene.py   # Check at once (or =enter), for screenshots
```

The cut is `cut()` from `scripts/cutout-figures.py` on
`art/out/figure-map-1.jpg`, cropped like a set of one, with Map opted in to
`FLOOR_GLARE` (the floor round its feet has picked up the ochre) and
`DEFRINGE`.

The closed-eye overlay, `blink.png`, is cut by `scripts/blink-overlay.py`
from a generated edit, `art/out/figure-map-blink-1.jpg`
(`art/prompts/figure-map-blink.md`). A `Blink` layer in the machine shows it
twice every ten seconds, through the entrance too (the blink recipe in
[rive-entrance-playbook.md](rive-entrance-playbook.md)).

## Who owns what

The page component is its own, `src/ui/MapRouteSpike.tsx`, since the travel
is in two dimensions and has a stop in the middle. It reads `route.json`
(copied to `src/assets/rive/map-route.json`).

- **Rive**, in the `Motion` machine: `Approach` loops one rock (44 frames).
  `Check` (150 frames) follows when `check` is set, at the end of a rock,
  and hands back to `Approach` when it ends. `Enter` (150 frames) follows
  when `arrive` is set, then `Idle` (360 frames: breathing, and a glance down
  at the map). The rig is Self-hug's: nested `Right Foot` and `Left Foot`
  nodes, each tipping about the outer corner of its sole, and a `Breath`
  node.
- **The page**: the route is a horizontal leg `route.rise` (200) artboard px
  above the resting place, from fully off the left edge to a corner, then a
  straight leg down to the resting place covering `route.lastLeg` (40%) of
  the way across. It fits whole rocks to each leg, sets `check` during the
  first leg's last rock (clearing it again halfway through `Check`), and
  `arrive` during the second leg's last rock. The trail is an SVG path over
  the whole screen, behind the figure, redrawn each frame from the start
  through the corner to the feet.

## Things that were not obvious

- **The stop and the start keep the gait's speed.** `Check`'s travel is in
  rocks: it leaves the last rock at the rock's own speed and stops at the
  corner (`corner`, about half a rock on); at the end it sets off again,
  reaching a rock's speed exactly as `Approach` takes over. The page splits
  `Check`'s travel at `corner`: up to it in the first leg's fitted rock
  length, after it in the second's.
- **Winding up into a rock.** The tip at the end of `Check` is
  `−v·(F−t)·(t/F)²` over the last `WIND` frames: it rocks back onto its left
  foot and swings through zero at the rock's own speed `v`, so `Approach`
  starts without a hitch. `validate()` checks the tip and travel speeds at
  every hand-over.
- **Clearing `check` too soon would skip the stop.** The page clears it
  halfway through `Check`, not as `Check` starts, so it does not matter
  whether the runtime's advance event fires before or after the machine
  has taken the transition.
- **Stitches that do not crawl.** The trail is redrawn up to the feet each
  frame, always from the same start, so its dashes stay put on the ground
  rather than sliding along under a moving dash offset.
- **On a phone the first leg is short.** The corner is 40% of the way
  across, and most of the first leg is off screen. The stop and the turn
  still read.
