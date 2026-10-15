# Character motion — blink prototype

## Decision

Characters arrive individually when they are named. Before designing those
entrances, test the smallest useful sign of life: a blink on the Critic, one
of the three figures already integrated into the landscape.

## Prototype

- Keep the existing Critic image as the permanent base frame.
- Add a transparent overlay containing only the closed-eye area, derived from
  a tightly constrained generated edit. Never swap the whole character, so
  generated differences in body, lantern, texture, or framing cannot shimmer.
- Blink once shortly after appearing, then at quiet irregular intervals.
- Keep a blink brief and unsynchronised: about 120 ms closed, with several
  seconds between blinks.
- Do not blink while the page is hidden, and disable blinking when the user
  prefers reduced motion.
- Keep the overlay decorative so it changes no labels or accessibility
  semantics.

## Review gate

Review this single figure in the running landscape before producing closed-eye
assets for the other characters or adding entrance and resize motion.

## Blink rollout

The review passed, and the same quiet blink timing now applies to every figure,
including its Rive entrance. Sprout closes its bead eyes. Sleeper's eyes are
already closed by design, so its frame is a slightly tighter sleepy eyelid
squeeze rather than briefly waking the character. The Defender closes its bead
eyes while parachuting and after landing. Each remains a small transparent
overlay so the surrounding felt, props, silhouette and pose never swap.

The rest of the cast followed in their Rive entrances: Curled, Self-hug,
Ribbon, Stack, Map, Doodle, the Pod and the Kaleidoscope all blink. Shell's
eyes are shut by design, so it doesn't. Two needed more than an overlay. The
Pod's padding mesh moves its face during the landing, so it blinks only at
rest. The Kaleidoscope's scope covers one eye, so it lowers the scope to
blink: two generated poses, swapped like stop-motion. How it's done:
[rive-entrance-playbook.md](rive-entrance-playbook.md).

## Lantern gesture prototype

- Split the Critic's existing art into a still body and an arm-plus-lantern
  layer. The two layers reconstruct the original pose at rest.
- Rotate the moving layer around the shoulder through a small seven-degree
  arc, hold briefly, then return it to rest.
- Move the dusk glow with the lantern layer.
- Begin after the first blink window, then repeat only at quiet irregular
  intervals. Pause in hidden tabs and honor reduced-motion preferences.

## Walk-in, and why the split went away

The lantern prototype above needed the arm cut away from the body, and the walk
needed the feet cut away from the legs. Four layers, three seams, and the seams
did not survive being moved: the hand-drawn foot mask both sliced the leg and
picked up the grass rim from the original photo cutout, and the torso crop kept
the top twenty rows of both legs, so every step left ghost legs behind on the
belly.

The seams were not fixable by drawing better masks — the foot slabs had to slide
and rotate, and any cut across the crotch either ghosted or tore.

The Critic is now **one texture under a skinned mesh**, six bones, no cuts. See
[rigging-notes.md](rigging-notes.md) for the rig, the format rules that were
established by experiment, and the pixel-identity check that proves the split is
faithful.

Still to decide before this becomes the shipping figure:

- Where the walk lives. The review spike now renders it at part scale and moves
  that wrapper from the viewport edge to the centre. The real thing still
  belongs inside the landscape's existing arrival and placement system.
- Reduced motion. The Rive canvas currently plays unconditionally. The blink and
  lantern in `src/ui/Figure.tsx` already honour `prefers-reduced-motion` and
  pause in hidden tabs, and the Rive figure has to match that.
- The other two figures, once this one is in the landscape.

## Entrances

The Defender's parachute descent (`?parachute`) set the pattern for the rest
of the cast: the figure stays one image, and the motion comes from
whole-body moves, physics and felt props. The Sleeper's leaf drift
(`?sleeper`) and the Sprout's rise out of the ground (`?sprout`) followed. The method is in
[rive-entrance-playbook.md](rive-entrance-playbook.md), and an entrance idea
for every character is in [character-entrances.md](character-entrances.md).

