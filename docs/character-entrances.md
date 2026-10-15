# Character entrances

How each part could arrive on the map. Each entrance acts out the part's
role, and none of them bends a limb: the felt figure stays one image, and
the motion comes from whole-body moves, physics, felt props and small vector
parts. How to build one: [rive-entrance-playbook.md](rive-entrance-playbook.md).

The parachute takes about six seconds, which is lovely as a one-off. If
entrances run each time a part is named in the conversation, 2–4 seconds
will probably feel better. Each one starts life as a hidden review spike,
like `?walk`, `?parachute`, `?sleeper` and `?sprout`. The ones from the side
take 6–9 s on a desktop, most of it crossing the screen.

| Character | Role | Entrance | Effort | Status |
|---|---|---|---|---|
| Critic (lantern) | watchful, keeps things safe | walks in from the side and stops | done | spike `?walk` |
| Defender | steps forward when unsafe | floats down by parachute | done | spike `?parachute` |
| Sprout | eager to please | pops up out of a felt soil mound, then bows with the flower | done | spike `?sprout` |
| Sleeper | resting, needs care | drifts down asleep like a falling leaf | done | spike `?sleeper` |
| Pod | insulates, turns the world down | lands in a deep soft squash, no bounce | done | spike `?pod` |
| Curled | wary, checks it's safe | peeks in, freezes, backs off, inches in | done | spike `?curled` |
| Self-hug | self-comforting, hoping for connection | rocks in with a toy waddle, glances beside it | done | spike `?selfhug` |
| Ribbon | playful, making and exploring | pirouettes in on one foot, lands balanced | done | spike `?ribbon` |
| Kaleidoscope | escapes into somewhere colourful | wanders in backwards, bumps to a stop | done | spike `?kaleidoscope` |
| Stack | over-responsible | tiptoes in, the tower teetering and corrected | done | spike `?stack` |
| Map | anticipates every turn | walks a planned route, a stitched trail behind | done | spike `?map` |
| Doodle | absorbed in making | draws its own way in and rides the line | done | spike `?doodle` |
| Shell | retreats into quiet | a felt wave washes it ashore | done | spike `?shell` |

Sprout and Sleeper came first: with the Critic, they are the three figures
already in the landscape (`src/model/types.ts`), so all three now have an
entrance. The six small ones came next, each cut out of its photo in
`art/out/` (with `cut()` from `scripts/cutout-figures.py`, except the Pod,
which has its own) and cropped like a set of one. So they are not to scale
with each other or with the map yet. The three medium ones came last, cut
and cropped the same way: Map and Doodle draw their route and line on the
page, and Shell's wave is a generated felt prop. Every character now has an
entrance spike.

Every figure whose eyes are open also blinks, twice in ten seconds, through
the entrance and after it. Each blink is a small closed-eye overlay cut
from a generated edit (the blink recipe in
[rive-entrance-playbook.md](rive-entrance-playbook.md)). The Sleeper's
closed eyes squeeze a little tighter instead, and Shell's stay shut. The Pod
blinks only once it has landed, because the padding moves its face. The
Kaleidoscope's scope covers one eye, so now and then it lowers the scope,
blinks and raises it again.

## In the landscape now

### Sprout: up out of the ground

It pushes up through the ground line like a seedling: first the two leaves,
then the head. It rises with a little overshoot, the leaves shiver, and then
it bows slightly, holding out the flower. Eager, a touch anxious.

- **Built** (`art/rive/sprout-rise`, [sprout-rise-notes.md](sprout-rise-notes.md)):
  a felt soil mound (generated) heaves up out of the meadow. The leaves come
  up through its top folded together, open and shiver. The Sprout gathers
  itself, pops up out of the soil into a hop and lands in a squash, and the
  mound sinks back into the ground before the bow. Rive clips the Sprout to
  the ground and to the mound's top edge, and an image mesh bends only the
  leaves. 3.7 s, all in place.

### Sleeper: falling like a leaf

Asleep on its pillow, it drifts down from above in slow side-to-side arcs,
like a falling leaf, tilting into each swing, and settles without waking.
Then slow breathing.

- **Built** (`art/rive/sleeper-drift`, [sleeper-drift-notes.md](sleeper-drift-notes.md)):
  a long pendulum hung 400 px above it swings it ±133 px, tilting ±15° into
  each swing and rising at each end, while the page drops it at about
  90 px/s. The flare damps the swing out, it settles into a soft 3% squash,
  and in Idle it breathes slowly. The page shadow gathers as it comes down.
  It uses the app's cutout, re-cut so the top of its head is no longer lost.

## The rest of the cast

### Pod: the padding swallows the landing

It drops in from above and lands in a deep, slow squash with no bounce at
all, as if the padding absorbed everything, then rises back to its shape
with no overshoot. Quiet, insulated.

- **Built** (`art/rive/pod-drop`, [pod-drop-notes.md](pod-drop-notes.md)):
  the page drops it, speeding up evenly to 20 artboard px a frame. Through
  an image mesh the padding gives way at the speed it fell, slowing as it
  takes it, while its lower half spreads like a beanbag and the legs stay as
  they are. It holds, sinking a touch deeper, and rises back over 70 frames
  with no overshoot. 3% stretch while it falls.

### Curled: is it safe?

It slides a little way in from the edge, freezes, backs off, then inches in
with pauses. During each pause it tilts up to check. All of the character
is in the timing.

- **Built** (`art/rive/curled-peek`, [curled-peek-notes.md](curled-peek-notes.md)):
  it slides on its bottom, so the page's travel can stretch to the screen:
  the peek and the retreat are fixed distances, the three slides fractions
  of what is left. Rive leans it with a damped spring driven by the slides'
  acceleration, cranes it up to check, cowers it after the retreat and sighs
  at the end. 6.2 s.

### Self-hug: a toy waddle

It rocks in slowly, tipping from one foot to the other like a wind-up felt
toy, stops, and its gaze drifts to the empty space beside it.

- **Built** (`art/rive/selfhug-waddle`, [selfhug-waddle-notes.md](selfhug-waddle-notes.md)):
  it tips about the outer corner of each foot in turn, through two nested
  nodes. A rigid figure can't rock its way along without slipping, so like a
  wind-up toy it shuffles, fastest as its weight crosses over. The page fits
  whole rocks to the screen. The rocking dies down as it stops, and then it
  leans over toward the space beside it and stays there a while.

### Ribbon: a pirouette

It spins in on one foot, the ribbon looping with it, hops once and lands
balanced, arm out.

- **Built** (`art/rive/ribbon-pirouette`, [ribbon-pirouette-notes.md](ribbon-pirouette-notes.md)):
  the spin scales the photo across through zero about the standing foot,
  spotting like a dancer so it is only a sliver for a frame. One turn on
  the ground sinking into it, one in a 54 px hop, and it lands facing out in
  a squash, slides to a stop and wobbles to its balance. The ribbon is part
  of the photo, so it spins with the body. A free-flowing ribbon would mean
  a version of the photo without it and a felt ribbon of its own: much more
  work.

### Kaleidoscope: not looking where it's going

It wanders in backwards, eye still to the kaleidoscope, tilted up, not
looking where it's going. It comes to a stop with a small bump, then keeps
looking.

- **Built** (`art/rive/kaleidoscope-backwards`, [kaleidoscope-backwards-notes.md](kaleidoscope-backwards-notes.md)):
  Self-hug's waddle, slower, from the right, rocking round a lean back. The
  bump stops the travel in 6 frames; a spring driven by that throws the top
  on backwards and back, with a small squash. In `Idle` it scans slowly up
  and down. Once every ten seconds it glances out from behind the scope: it
  lowers the scope to its chest through an in-between pose, straightens up,
  blinks, and raises it again, like stop-motion.

### Stack: keeping it all exactly right

It tiptoes in with tiny steps. The tower of blocks starts to teeter, and
each wobble is caught: the whole figure leans against it and the tower
steadies.

- **Built** (`art/rive/stack-tiptoe`, [stack-tiptoe-notes.md](stack-tiptoe-notes.md)):
  the waddle as quick, tiny tiptoe steps. The tower moves alone, through an
  image mesh: the top two blocks tip over a corner of the lowest, which the
  arms hold and which never moves. On the stop the tower teeters forward,
  the body leans in under it a moment later, and the swing dies down.

### Map: following the plan

It walks a planned route in careful legs: a straight stretch, a stop to
check the map, a turn, another stretch. A trail of felt-like stitches
appears behind it, showing the route it took, then fades once it arrives.

- **Built** (`art/rive/map-route`, [map-route-notes.md](map-route-notes.md)):
  the waddle, small and careful, with the map held open. The page walks it
  along two legs: straight in from the left further back in the meadow, a
  stop at the corner, then slanting forward to its place, fitting whole
  rocks to each. At the corner the rocking dies down, it reads across the
  map, looks up and leans toward the turn, and rocks off again at the
  gait's speed. The trail is a running stitch in the parachute lines'
  natural-wool tan, drawn up to its feet, and fades once it has arrived.

### Doodle: drawing its way in

A loose dusty-pink crayon line wanders across the screen ahead of it, and
the creature rides in along the line, still drawing, as if the line were
carrying it. The line fades once it stops.

- **Built** (`art/rive/doodle-line`, [doodle-line-notes.md](doodle-line-notes.md)):
  the page draws the line from the left edge, high up, wandering in slow
  waves down to the ground, and reveals it a little ahead of the figure,
  which sits on it and tilts by half its slope. The crayon look is a tile of
  grain as the stroke's pattern and a slight wobble in the drawn points (a
  filter was too slow). In Rive it sways as it rides, its crayon hand
  scribbling through an image mesh, then squashes onto the ground.

### Shell: washed ashore

A soft felt wave rolls in from the side, crests, and draws back, leaving
the creature there, eyes still closed, listening to its shell.

- **Built** (`art/rive/shell-wave`, [shell-wave-notes.md](shell-wave-notes.md)):
  a generated felt wave (`art/prompts/prop-wave.md`) paints over Shell,
  which rides in waist-deep behind the crest, bobbing. One image mesh rolls
  the felt under the surface, leans the crest over and curls the lip as it
  stops; then the wave sinks back the way it came and fades, and Shell
  settles onto the ground.
