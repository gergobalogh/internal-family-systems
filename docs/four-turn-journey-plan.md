# Four-turn journey plan — every answer brings someone

**Status:** design agreed with user; steps 1–4 are complete (13/13 entrances, adaptive Turn 1 rows, hidden kind placement, and Turn 3). Turn 4 is replaced by Act 1's close under the story redesign (step 5 below).
**Date:** 2026-10-18.
Wording is draft copy throughout. Build decisions not settled here belong
to the build session.

## Context — read first

- `docs/how-it-works.md` — the flow as built today (Turns 0–4, closing,
  after).
- `docs/slice-2-handoff.md`, `docs/slice-3-handoff.md` — the rules this
  plan keeps (user-owned names, provenance, silent fallbacks, blank
  re-ask, mid-conversation edits win). Handoffs are point-in-time; changes
  are logged in `project.md`.
- `docs/character-entrances.md`, `docs/rive-entrance-playbook.md` — the 13
  entrance spikes.
- `server/ai.ts` — JEV Choice calls (`jevChoice`), figure criteria, the
  name extractor.

## Goal

A first session that ends with 3–4 characters on the map, standing in a
way that says something true, in about four answers. The person should
feel heard in their own words, watch each part arrive with a character
that fits it, and see the whole cast described as a system at the end.

3–4 parts is likely, not guaranteed. Every question that adds a part
keeps a way to say "no" or "it's the same feeling". Someone who is curious
about their loudest feeling and has nothing quieter ends with one or two
parts, and that's fine.

## Shape: rows, not a tree

Each turn is a row of prepared lines. JEV picks one box per row from what
is known so far (all answers, the map), never from which box an earlier
row used. Every row has a default box (today's line) for when JEV is
unsure (below 0.7) or fails. Rows only move forward; corrections happen
on the map.

```
            what we know so far
                    │
 Turn 1     [confirm]   [choose]   [ask]               → part 1
 Turn 2     [ask]   [skip: already said]               → maybe part 2
 Turn 3     [their leftovers]   [quieter: guard]   [quieter: neutral]   [skip: 4 parts]
 Turn 4     the whole picture + invite to drag
```

## The journey

### Turn 0 — "What's weighing on you?" (unchanged)

After the risk check, two readings run side by side:
- **JEV, form of the free-write:** `one_feeling`, `several_feelings`,
  `situation`, `little`. Judges how they wrote, never the person.
- **Claude, their phrases:** the words naming each feeling, each checked
  word for word against the free-write (`wordRun`), max 40 characters.
  Kept for Turn 1 and Turn 3.

The Turn 1 reflection is told which line follows, so it doesn't name the
feeling right before a question that names it.

### Turn 1 — name the loudest → part 1 walks in, largest

| JEV reads | Line | Answers |
|---|---|---|
| `one_feeling`, phrase lifted | Would you call it ‘X’ — or something else? | yes → ‘X’ · a name → that name (shortened as today) · bare "no" / "something else" → "What would you call it?" |
| `several_feelings`, phrases lifted | Which of these has been loudest lately — or is it something else? + one button per phrase | a tap → that phrase · typed → as today |
| anything else, unsure, or no phrases | Which feeling has been loudest lately — what would you call it? (today) | as today |

Without Claude, `one_feeling` gets "What would you call that feeling?";
`several_feelings` gets today's line.

A name taken from the free-write is recorded with the free-write as its
source, confirmed by the Turn 1 answer.

```
┌──────────────────────────────────────────┐
│ It sounds like a lot is pulling at you   │
│ at once.                                 │
│ Which of these has been loudest lately — │
│ or is it something else?                 │
│ [‘anxious about work’] [‘sad about dad’] │
│ [‘angry at myself’]                      │
│ [ type here…                    ] [Send] │
└──────────────────────────────────────────┘
```

### Turn 2 — how do you feel toward it? (lines unchanged)

- **Skip:** if Turns 0–1 already say how they feel toward it ("the worry,
  and honestly I hate it"), the toward-check runs on those words and the
  question is not asked. Frustrated → straight to the second-part
  question (with its reflection); warm → Turn 3.
- **Frustrated → part 2** arrives with the thread drawn to part 1, placed
  by its kind (below).
- **Curious / warm → no part.** The reflection carries it.

### Turn 3 — what else is here? (replaces "close or off to the side?")

| When | Line | Result |
|---|---|---|
| 4 parts already | — (skip) | Turn 4 |
| Turn 0 named feelings not yet on the map | You also mentioned these. Are any of them here too? + a button per phrase, [Something else…], [No one else] | each tap brings one in (up to 4 parts); Something else… asks "What would you call it?" |
| a part on the map guards or escapes (kind, below) | Is there a quieter feeling ‘X’ might be standing in front of? | a name → small part at the edge, rarely heard |
| otherwise | Is there a quieter feeling here, one that rarely gets heard? | same |

‘X’ is part 1 if it guards or escapes, else part 2 if it does. No and
unsure answers add nothing (today's `NO_FORMS`, `UNSURE_FORMS`); a
shortened name copying a part on the map adds nothing. The quieter part
is named only: nothing is asked about it afterwards, and the risk check
runs as on every answer. The closing card's "Add a quieter part" stays,
for people whose Turn 3 went to their leftovers.

```
┌──────────────────────────────────────────┐
│ You also mentioned these. Are any of     │
│ them here too?                           │
│ [‘sad about dad’] [‘angry at myself’]    │
│ [Something else…]         [No one else]  │
└──────────────────────────────────────────┘
```

### Turn 4 — the whole picture

The summary template stays (it already has the "pulling in different
directions" and "rarely gets heard" clauses); check its ordering reads
as one system with 3–4 parts. One line is added before the question:

```
┌──────────────────────────────────────────┐
│ One way I'm seeing this is that ‘not     │
│ good enough’ takes up the most space,    │
│ ‘not good enough’ and ‘the one who       │
│ pushes’ seem to be pulling in different  │
│ directions, and ‘the little one’ rarely  │
│ gets heard.                              │
│ Move anyone nearer the light if they     │
│ feel close — what would you change?      │
│ [ type here…                    ] [Send] │
│                           [No changes]   │
└──────────────────────────────────────────┘
```

With no closeness question, the summary speaks of closeness only for
parts the person moved (today's `positionSpeaks` rule). The correction
round, closing and everything after stay as they are.

**Replaced (2026-11-03):** under the story redesign's Option A, Act 1
closes with "These are the ones who came." and a single "Go on" instead
of this summary question, the corrections and the closing card. The
summary stays on the map as a note after the hand-over. See
`project.md`, "Act 1 closes with who came".

## A part's kind (JEV, never shown)

Asked alongside the figure, ideally as a second question in the same JEV
request, so it costs no extra wait:

| Kind | Roughly | Starts |
|---|---|---|
| `guards` | keeps watch, pushes, criticizes, plans, controls, pleases, flares up to protect | close ring, near the light |
| `escapes` | gets away from the feeling: distraction, numbing, scrolling, bingeing, shutting off | middle ring, to the side |
| `hurts` | carries the feeling: shame, fear, loneliness, sadness, "not good enough", a young or scared part | far ring |
| `other` / unsure | playful, creative, hopeful, or none clearly | today's starting spots |

- Never shown, narrated, or passed to reflections; no "guard" or "hurt"
  anywhere on screen (the no-labels rule). Recorded in provenance as a
  JEV reading.
- Size still comes from answers: part 1 is largest wherever it stands.
  A big hurting part behind a small guard near the light is the picture
  this is for.
- The quieter part from Turn 3 keeps the unheard rule (small, at the
  edge) whatever its kind.
- Kind-based placement is a starting spot, not an answer: the summary
  never says "close" because of it.
- Changing a part's figure doesn't change its kind.

## Rules this changes

- **Closeness is no longer asked.** Slice 3 made it Turn 3's job; now
  kind sets the starting spot and the person drags (invited at Turn 4).
  The `/api/centrality` route and the centrality step go.
- **The quieter part is back in the conversation**, in the closeness
  question's place, so the run stays at four questions after Turn 0.
- **Turn 0 can supply names** (confirmed at Turn 1, or tapped at Turn 3),
  so "nothing reads Turn 0 for map attributes" is retired.
- **Placement carries meaning** from JEV's reading of each name.

Kept: names are the person's words (lifted phrases checked word for
word), never a part guessed into existence (every add is an answer or a
tap), AI failure never blocks (each row has a default), the risk check on
every answer, the pinned rule that the app never writes its own questions
(every line is reviewed copy).

## Build order

1. **Rive entrances in the real app.** Replace the CSS walk-in with each
   character's entrance spike, one character at a time, starting with
   the ones this journey uses most: Lantern (`?walk`), Curled (`?curled`,
   the Turn 3 peek), Map, Defender, Sleeper, Self-hug, then the rest.
   Reduced motion: no entrance. Blinks continue after. **Complete:** all
   thirteen are in the app.
2. **Turn 1 rows:** JEV form reading, phrase lifting from the free-write,
   the confirm and choose lines with their buttons. **Complete:** calibrated
   on 72 messy free-writes, with a 0.70 action threshold; phrases are
   accepted only as verified word-for-word runs from Turn 0.
3. **Kind:** the JEV question beside the figure, and kind-based starting
   spots. **Complete:** figure and kind are returned by one JEV request;
   only readings at or above 0.70 move off the neutral starting spots.
4. **Turn 3:** leftovers and the quieter lines; remove the closeness step.
   **Complete (2026-11-02):** one Turn 3 answer brings one part (a tap, a
   typed leftover or a new name); a typed name replaces the "Something
   else…" button; the ways out beside Send are "No one else" and "I don't
   think so". The 4-part skip never fires, since at most two parts exist
   before Turn 3. A crowded starting ring falls back to two spare spots.
   Under the redesign's Option A (`docs/redesign/story-redesign.md`),
   step 5's drag invite moves after Act 2.
5. **Turn 4:** the drag invite and summary ordering for 3–4 parts.
   **Replaced (2026-11-03)** by Act 1's close ("These are the ones who
   came." · [Go on]); the drag invite moves after Act 2.
6. **Turn 2 skip:** the "already said" check.

## Checks (in the running app; no test files)

- **Before step 2:** run 60–80 messy made-up free-writes (rambles, typos,
  mixed) through the Turn 1 JEV question, the way
  `scripts/calibrate-risk.ts` does for risk. The costly error is
  `several_feelings` read as `one_feeling` (the app picks one of theirs
  and drops the rest); raise this row's threshold if it shows up. A
  first probe of 22 easy cases sorted 21 as intended. **Done:**
  `scripts/calibrate-turn1.ts` sorted 71/72 as intended, with no several →
  one collapses; the one error had 0.56 confidence and falls below the
  app's 0.70 action threshold.
- **Before step 3:** ~40 names through the kind question, like the
  12-name figure table: critics and planners → guards, shame and fear →
  hurts, scrolling and numbing → escapes, joy → other. **Done:**
  `scripts/calibrate-kind.ts` sorted 40/40 as intended, with no wrong
  reading above the app's 0.70 action threshold; the combined figure +
  kind request had a 273 ms median and 441 ms slowest response.
- **Each step:** full runs in the app with AI on and with `?ai=off`, at
  desktop and phone width, reading every card and the final map.

## Draft wording to review

- Turn 1: "Would you call it ‘X’ — or something else?" · "Which of these
  has been loudest lately — or is it something else?" · "What would you
  call that feeling?"
- Turn 3: "You also mentioned these. Are any of them here too?" ·
  [Something else…] · [No one else] · "Is there a quieter feeling ‘X’
  might be standing in front of?" · "Is there a quieter feeling here, one
  that rarely gets heard?"
- Turn 4 (replaced): "Move anyone nearer the light if they feel close —
  what would you change?"
