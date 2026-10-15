# Slice 1 handoff — dual-mode landscape (no conversation)

**For:** implementation session (Claude Code). **Date:** 2026-10-12.
**Status:** product spec locked with user. All technical decisions (stack,
libraries, visual fidelity, file layout) are explicitly OUT of this note —
decide those in the build session.

## Context

Part of the Internal Family Systems visual app. Read first:

- `project.md` — product concept, art direction, principles (esp. never
  villainize a part, tentative/editable interpretations, reduced motion).
- `research-briefs.md` — the three research briefs.
- `research/synthesis-4-turn-script.md` — the agreed entry flow (NOT built
  in this slice; included so demo data matches its vocabulary).
- `research/brief3-uncertainty-transition.md` — source of the How-it-is /
  What-if mode requirement.

## Goal

Prove the current-vs-desired distinction is unambiguous and undo-safe.
Everything else waits.

## Starting state (demo data, fixed)

A landscape showing three parts:

1. "The Critic" — largest, near centre.
2. "The People-Pleaser" — medium, close to centre.
3. "The Exhausted One" — small, near the edge.

The count of three is illustrative demo data, not a product rule — in the
real app the number of parts varies per person and comes out of the entry
conversation (a later slice). Names, sizes, and positions above are
placeholders. No conversation exists yet; this screen IS the start.

## Behaviors (all required)

1. "How it is" mode (default): the user can move parts (drag) and change
   their size (a visible handle). The mode is labeled on screen at all
   times. Edits here mean "this is how things are."
2. A "What if" switch enters a visibly distinct mode (same map copied
   over). It must be impossible to confuse the two modes at a glance.
3. Edits in "What if" never alter "How it is." Leaving "What if" needs no
   save/discard decision — reversibility is structural, not a dialog.
4. Instant undo for the last "What if" change, plus one-tap return to
   "How it is."
5. Every part label is presented as tentative (wording like "one way to
   see this…"), with rename and remove entry points. Corrections persist
   when flipping between modes. A removed part stays removed.

## Product constraints (from research — honor regardless of stack)

- No part is ever framed as villain, monster, or joke; no darkness,
  menace, or coldness as shorthand for difficult parts.
- Short on-screen text; microcopy stays calm, warm, and non-clinical.
- Respect reduced-motion preferences; nothing meaningful may depend on
  animation alone.

## Out of scope (do not build)

Entry conversation, 4-turn script, experiment-invitation wording/flow,
finished creature art (simple shapes are fine), sound, accounts,
persistence across sessions, onboarding/tutorial.

## Acceptance checks

1. The current mode is visible without interaction, in both modes.
2. Undo restores the exact prior state (position AND size).
3. Rename/remove work, persist across mode flips, and removal is total.
4. Ten edits in "What if" leave "How it is" unchanged (verify by
   flipping back).
5. A first-time viewer can say which mode they are in and how to get back.

## Demo walkthrough (for review)

Open → see 3 parts in labeled "How it is" → resize Critic smaller
(correction of reality) → flip to "What if" (screen clearly changes) →
move Exhausted One to centre, undo (returns) → flip back (How-it-is shows
Critic smaller, Exhausted One untouched) → rename a part → flip modes
(name persists) → remove a part (gone everywhere, stays gone).

## Locked resolutions (2026-10-12)

Product answers to the build session's four open questions. Locked with
user; treat as part of the spec.

1. **Re-entering "What if": remembered, fork-on-first-entry.** First entry
   copies "How it is" over; thereafter the two layouts are independent for
   the session. Provide a "start over from how it is" reset in "What if."
   Rationale: re-entry must never destroy the layout (comparison requires
   flipping back and forth); directionally answers project.md's "keep both
   landscapes?" as yes, in-session.
2. **Remove/rename are global; only position/size are per-mode.** Removing
   a part anywhere removes it everywhere — removal always means "this isn't
   one of my parts" (a map correction), never a "What if" experiment
   (wishing a part gone would facilitate exiling, against the no-bad-parts
   principle). Same for rename: identity is shared.
3. **Undo: multi-level, both modes, covers removal.** Every mutation
   (move, resize, rename, remove) undoable in both modes, ~10–20 steps.
   No redo in slice 1.
4. **Foundation, not a spike.** Build as the real codebase's first slice;
   the state model (global identity + per-mode spatial attributes) is core
   architecture worth keeping. Speed comes from the narrow scope, not
   throwaway quality. Stack is the build session's call — pick as if
   keeping it.
