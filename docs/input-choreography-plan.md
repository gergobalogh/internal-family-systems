# Input choreography plan — centered glass card + world-only waiting

**Status:** product spec locked with user. **Date:** 2026-10-13.
Stack-free: implementation decisions belong to the build session.

## Context — read first

- `project.md` — art direction, motion/composition (slow, one surprise at a
  time, writing stays the focus), legibility risk, reduced motion.
- `research/synthesis-4-turn-script.md` — pinned script, progressive
  revelation (traces appear per turn).
- `docs/slice-2-handoff.md` — Turns 0–2 behaviors: verbatim questions, live
  map, silent fallbacks, provenance, blank re-ask, mid-conversation edits.
- Current `src/ui/Conversation.tsx` (side-panel log + dots waiting) is
  **replaced** by this design. Its Enter rules, idle-focus behavior, and
  dev-only provenance record carry over.

## Goal

A calm centered input ritual: one glass card at a time under the horizon
house; sending an answer softens the card while the world itself signals
waiting; each answer draws at most one character trace onto the meadow.

## Locked design

1. **Layout:** one floating card, centered below the house (never covering
   it). No history list; one question visible at a time. *Changed
   2026-10-15:* on tall screens (phones) the card floats in the sky just
   above the roof instead, with the house in the lower middle. That shows
   more sky, keeps the meadow clear so parts are visible as they walk in,
   and keeps the field above the phone keyboard.
2. **Card content:** reflection + current question together, then the field
   and send. Short text only.
3. **Glass style ("Wes Anderson glass"):** frosted and quiet at rest —
   symmetrical, cream frame, pastel — a little more solid on focus/typing.
   A contrast floor applies at all times: the resting state never crosses
   it (see project.md legibility risk).
4. **Turn loop:**
   - Card fades in slowly (fade + small rise, ~400–600ms ease).
   - Person types; send/Enter submits (Enter sends on every turn,
     free-write included; Shift+Enter adds a line).
   - Card fades to a disabled ghost **in place** — no layout jump, field
     read-only while waiting (read-only, not disabled, so it keeps focus
     and a phone keyboard stays up for the next question).
   - **Waiting, world-only visible layer:** the sunlight pool breathes +
     clouds drift slowly. House glow joins only if cheap. One idea only.
   - At most one character trace enters per answer: walks in from the
     edge slowly (trace → figure), never a sudden pop.
   - Next card (reflection + question) fades in; focus moves to the field
     only if the person is idle, never stealing map work.
5. **Waiting accessibility (underneath the world motion):** a "One moment…"
   state, `aria-live` announcement, and read-only field persist regardless
   of animation. Under reduced motion the world goes still and the state
   change alone carries the meaning.
6. **Corrections without history:** past answers are reachable only via the
   map (rename/remove). User authority must never depend on a hidden
   transcript. Provenance record stays (dev-only today).
7. **Pinned-script rules still bind:** verbatim questions, short hedged
   non-clinical reflections with checks, silent fallbacks, blank re-ask
   with "Take your time.", user-owned verbatim names, never villainize.

## Acceptance checks

1. Card sits centered below the house on desktop and above it on phone;
   house and pool of light stay visible.
2. Every turn follows fade-in → ghost-on-send → world-waiting → trace →
   next card, with no layout jump and no second motion idea competing.
3. With reduced motion on, all travel stops and waiting/completion are
   still communicated (state + text, no meaning lost).
4. A screen reader announces waiting and each new question.
5. Idle and focused/typing glass both meet the contrast floor; typing is a little more solid.
6. At most one trace per answer; slow entrance; previous slices' checks
   still pass (verbatim, traceability, AI-off run, blank, mid-talk edits).

## Out of scope

Turns 3–4, correction parsing, relationship-link drawing, new art plates,
invitations/experiments, persistence, accounts, sound, tutorial.

## Demo walkthrough (for review)

Open → card fades in (Turn 0) → answer → ghost + world breathes →
reflection + naming question → name "the worry" (trace walks in) → toward
question → "honestly I hate it" → polarization line + naming question →
name "the one who yells" (second trace walks in) → closing line → map is
the user's. Repeat with reduced motion on and with AI off.
