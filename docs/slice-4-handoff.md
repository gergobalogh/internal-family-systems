# Slice 4 handoff — after the map: Mirror → Gentle guide

**For:** implementation session (Claude Code). **Date:** 2026-10-15.
**Status:** product spec locked with user. API routes, request shapes,
layout, file structure, and exact constants are OUT of this note — decide
those in the build session. All copy marked *draft* is draft until reviewed.

## Context

Read first:

- `docs/slice-3-handoff.md` — the full entry conversation (Turns 0–4b),
  closing, the map note, links, and the correction round this slice builds on.
- `research/brief3-uncertainty-transition.md` — readiness signals, the
  Elicit-Provide-Elicit invitation, the Mirror fallback. This slice amends
  its gate (see Locked resolutions).
- `research/brief1-ifs-elicitation.md` — patterns 5 (voice-quoting) and 7
  (protective intent), and "never manage crisis."
- `docs/input-choreography-plan.md` — one glass card at a time.

## Goal

Give the app something to do once the map is the person's, without it
becoming an authority on how things should be:

1. **Experiment loop** (Gentle guide) — one invited what-if, the person's
   own move, *"What was that like?"*, one reflection.
2. **Get to know it** (Mirror, deeper) — a part's voice and what it might be
   trying to do, in the person's words.
3. **Noticing edits** (Mirror) — one question when a "How it is" edit
   changes what the map says.
4. **Safety path** — risk language anywhere in the app stops the guide and
   points to real help.

## Starting state

A full run that has reached closing. A dev-only, clearly-marked jump starts
at closing with two linked parts, an unheard part, and a recorded 4b wish,
so every surface is testable from it. `?ai=off` still forces every fallback.

## After closing — who may open the card

```
                     closing card (terminal, replaceable)
                               |
       +-----------------------+------------------------+
       |                       |                        |
 person enters           person selects a part     person edits in
 "What if…"              → [Get to know it]        "How it is" → idle
       |                       |                        |
 INVITATION (app)        GET TO KNOW (person)      NOTICING (app)
 once per session        any time                  once per part
```

**One card at a time.** Person-initiated beats app-initiated. App-initiated
cards (invitation, noticing) never open over an open card, an active drag,
or the experiment bar. A blocked invitation stays pending for the next entry
into "What if" (it's used up only once shown); a blocked noticing question is
dropped. The closing card has nothing pending, so any of these may replace it.

## 1. Experiment loop

1. **Offer** — the first time the person enters "What if…" after closing:

   ```
   [How it is | >What if…<]                     [Undo]
    +----------------------------------------------+
    | In your words: ‘I wish the worry were further |
    | away.’ Would it be alright to try that here,  |
    | and notice what shifts? Undo is one tap.      |
    |          [Not now]          [Let's try]       |
    +----------------------------------------------+
   ```

   - With a 4b wish: *"In your words: ‘[wish quote]’ Would it be alright to
     try that here, and notice what shifts? Undo is one tap."* (draft). The
     quote is the first verified wish op's quote, shown as is — never
     paraphrased. Slice 3 keeps only a `wish` flag today; record the quote.
     If the wish names a part that is no longer visible → generic.
   - Without one: *"Would it be alright to try something small here — move
     anything so it feels a little better, and notice what shifts? Undo is
     one tap."* (draft).
   - **Not now** and **Let's try** have equal weight. Not now ends the
     experiment for the session.
2. **Try** — the card shrinks to a slim bar: *"Take your time."* (draft)
   **[I've tried it]**. The map is free; undo works; the bar stays across
   mode flips (comparing is part of noticing). The app never proposes a
   part, a direction, or an arrangement — only the wish's own words.
3. **I've tried it** — if "What if" doesn't differ from "How it is", the
   bar reads *"Nothing's moved yet — take your time."* (draft). Otherwise
   the card asks *"What was that like?"* with **Not now** beside Send.
   Blank rule applies.
4. **Reflect** — the risk check comes first, then one reflection grounded in
   what moved: the request carries the "What if" note's clauses (how this
   arrangement differs) and their answer. Then *"‘How it is’ hasn't
   changed — both pictures are here."* (draft) and **Close**.
5. **Done** for the session either way. If they answered with sustain
   talk ("I can't…"), the reflection mirrors it and nothing follows — the
   once-per-session rule is the Mirror fallback.

## 2. Get to know it

A new action on a selected part, after closing only (the card is busy
before then), and never after a safety pause:

```
            (THE WORRY)
   +--------------------------------------------+
   | the worry · one way to see this            |
   | “you're going to mess this up”             |
   | might be trying to: keep me from failing   |
   | [Get to know it] [Rename] [Not one of my parts]
   +--------------------------------------------+
```

1. Card 1 (no reflection — nothing to reflect yet): *"If ‘[name]’ had
   words, what would it say?"* **[Not now] [Send]**.
2. Send → risk check → the answer is stored verbatim as the part's voice
   → reflection → card 2: *"What might ‘[name]’ be trying to do for you?"*
   **[That's enough for now] [Send]**.
3. Send → risk check → stored verbatim as the part's intent → reflection
   → **Close**.

- Voice and intent belong to the part's identity (like its name): both
  modes, survive renames, hidden with removal, back with undo of removal.
- Shown only in the selected part's box: voice in quotes, intent on a
  second line under a small label (*"might be trying to:"*, draft).
- Running it again replaces each answer as it is sent. A quiet **Clear** in
  the box removes both (undo behavior is the build's call).
- Names in questions use the part's name when the card appears. Part
  removed while answering → the card ends quietly; the answer is dropped.

## 3. Noticing edits in "How it is"

- **When:** after closing, in "How it is" only, for drags and resizes only
  (not rename, remove, unlink, or conversation-applied changes). After the
  edit settles and the person has been idle for a named constant, compare
  each part's summary phrases (`summary.ts`) with the last baseline (taken
  at closing, refreshed after each question).
- **What triggers it:** the edited part gains a phrase it didn't have
  ("takes up the most space", "feels more off to the side", "feels closer
  than ‘B’"…). Otherwise, another part that newly gained a phrase. Otherwise
  nothing.
- **Asks:** *"The map now shows that ‘[name]’ [phrase]. Is anything
  different about it?"* (draft) **[Not now] [Send]**. The map is the
  subject — never "you moved".
- **Then:** risk check → reflection → **Close**. The answer never edits
  the map (corrections were one round; the map is the person's).
- At most once per part per session, counted only once shown.

## 4. Safety path (whole app)

- **Every free-text answer** — entry conversation included — gets a risk
  check before anything else reads it (reflection, JEV, parse, storing a
  name or voice).
- **Two layers:** a small local list of risk phrases that works with AI off
  — a deliberate exception to "equality, never keyword search", because a
  false pause costs little and a miss costs a lot — plus an AI check. The
  mechanism (JEV Choice or Claude) and threshold are the build's call; err
  toward pausing. If the AI check fails or times out, the local list still
  applies and the flow goes on.
- **On a hit:** the answer is not used (no part, no voice, no reflection).
  The card shows a pinned pause, never generated:

  ```
   +--------------------------------------------+
   | What you wrote sounds really heavy. This   |
   | app can't help with that the way a person  |
   | can — please reach out to someone now.     |
   |   [Find support near you]        [Close]   |
   +--------------------------------------------+
  ```

  (draft). The link goes to an international helpline directory (a named
  constant; the build verifies the URL). For the rest of the session, no
  more questions, invitations, noticing, or Get to know. Map editing stays.
  The record notes the pause (never the text in logs).

## Prompts

- **Reflections:** new request shapes on the reflect route — experiment,
  voice, intent, noticing. Same system prompt, same post-checks, fallbacks
  per kind (draft: *"Thank you for trying that."*, *"Thank you for letting
  it speak."*, *"Thank you for telling me."*). Two additions to the system
  prompt: words given to a part are mirrored as *that part's* ("it sounds
  like ‘the worry’ tells you…"), never said to the person as the app's own;
  and an arrangement is never called better, worse, or healthier.
- **Risk check:** new, server-side, same key rules as the other routes.

## Behaviors (all required)

1. Person decides every move; the app quotes, asks, and reflects only.
2. Everything new is recorded with source and tag, as in slices 2–3:
   invitation shown/declined/accepted, experiment answer, voice, intent,
   noticing answers, pauses.
3. AI failure never blocks: reflections fall back, the risk check falls back
   to the local list, and the wish needs no AI after 4b. AI off: generic
   invitation, fallback reflections, local risk list only.
4. Reduced motion: the bar and cards appear without travel; nothing depends
   on animation.

## Changes to prior slices

- 4b records the first verified wish quote (today only a `wish` flag is
  kept) — additive.
- The risk check is put in front of every entry-conversation answer. On a
  hit, the entry conversation ends with the pause instead of its next turn
  — **a sanctioned change to slices 2–3 behavior**.
- The part model gains voice and intent; the selected part's box gains Get
  to know it, the voice/intent lines, and Clear.
- The closing card can be replaced by an app-initiated card.

## Out of scope

More than one experiment per session, experiments the app proposes,
change/sustain-talk detection, "what is it afraid would happen if it
stopped?", voices shown on the open map, allied/silenced links, localized
helplines, persistence, accounts.

## Acceptance checks

1. **Invitation with wish.** Dev jump → enter "What if" → the wish quoted
   exactly → Let's try → bar → move a part → I've tried it → "What was that
   like?" → reflection mentions nothing better or worse → Close.
2. **Generic invitation.** A run without a wish (or AI off) shows the
   generic wording.
3. **Once.** Not now, then leave and re-enter "What if" → no invitation.
   Same after a finished experiment.
4. **Blocked, then shown.** Enter "What if" with a Get to know card open →
   no invitation; close it, re-enter → invitation appears.
5. **Nothing moved.** I've tried it with no differences → the "nothing's
   moved yet" bar, no question.
6. **Get to know.** Voice → reflection + intent question → intent →
   reflection → Close; both lines show only in the selected box; rename
   keeps them; Clear removes them; remove + undo brings them back.
7. **Exit early.** "That's enough for now" after the voice keeps the voice
   and stores no intent.
8. **Noticing.** Drag a part from close to far in "How it is" → after idle,
   the question names the new phrase; dragging the same part again → no
   second question; a "What if" drag never triggers it.
9. **No noticing on small edits.** A drag that changes no phrase asks
   nothing.
10. **Safety, entry.** A risk phrase as the Turn 1 answer → no part, pause
    card, no further turns; the map still drags.
11. **Safety, AI off.** The local list alone triggers the pause.
12. **Safety, after.** A risk phrase as a voice → nothing stored, pause;
    Get to know is gone for the session.
13. **One card.** Never two cards; a noticing question never interrupts a
    drag, a card, or the experiment bar.
14. **Regression.** Slice 1–3 walkthroughs still pass (except check 10's
    sanctioned change).

## Locked resolutions (2026-10-15)

- **Gate:** permission is the readiness signal. Brief 3's four signals are
  amended: change-talk inference is dropped (the script never invites change
  talk; the 4b wish is the one observed instance and seeds the wording), "2+
  parts" is dropped (one-part experiments are meaningful), and "one loop
  completed" is met by every full run. Structural minimum: a full run
  reached closing with at least one part visible.
- **Entry point:** the person's own switch into "What if" — never at
  closing, never as a standing chip.
- **Frequency:** once per session.
- **Who moves:** the person, always.
- **Per-part:** one Get to know it flow (voice → intent), voice and intent
  shown only when the part is selected.
- **Noticing:** a question only when an edit changes what the summary would
  say; once per part per session.
- **Safety:** minimal path across the whole app, local list + AI check.
- **Wish:** quoted in their words, never paraphrased.

## Demo walkthrough (for review)

Dev jump → close the closing card → select ‘the worry’ → Get to know it →
voice → intent → Close → drag ‘the worry’ far out → idle → noticing
question → answer → switch to "What if" → invitation with the wish → Let's
try → move ‘the worry’ → flip to "How it is" and back → I've tried it →
answer → reflection → Close → re-enter "What if" (no invitation) → fresh
run with a risk phrase at Turn 0 → pause → AI-off repeat.
