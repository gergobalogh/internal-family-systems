# Slice 2 handoff — entry conversation, Turns 0–2, live map

**For:** implementation session (Claude Code). **Date:** 2026-10-13.
**Status:** product spec locked with user. API call route, server shape,
layout, and file structure are OUT of this note — decide those in the
build session.

## Context

Read first:

- `docs/slice-1-handoff.md` — the landscape this slice feeds, and its
  locked resolutions.
- `research/synthesis-4-turn-script.md` — the agreed entry script. This
  slice builds Turns 0–2 only.
- `project.md` — product principles (never villainize a part, tentative
  and editable interpretations, reduced motion).

## Goal

Prove that a real conversation drives the slice 1 landscape end to end,
and that each stage of the locked pipeline works once:

- **Rules** — "part 1 is always largest" (the size seed).
- **JEV** — classifies the Turn 2 toward-check.
- **LLM** — writes the short reflections.

Turns 3–4 wait for slice 3, because Turn 4's free-text correction parsing
is the hardest extraction job and should not land before the pipeline is
proven.

## Starting state

An empty landscape beside the conversation, opening on Turn 0. A
clearly-marked skip loads the slice 1 demo map (for testing only).

## The flow

Questions in *italics* are pinned: show them verbatim, with only the
user's name for the part substituted in.

1. **Turn 0 — free-write.** *"In your own words, what's weighing on you
   right now? No need to be organized."* Nothing reads this answer for
   map attributes. It is context for the Turn 1 reflection only.
2. **Turn 1.** LLM reflection on the free-write, then *"Which feeling has
   been loudest lately — what would you call it?"* The full answer
   becomes part 1's name, unaltered. Part 1 appears on the map the moment
   the answer is sent, at the largest size.
3. **Turn 2.** LLM reflection on the Turn 1 answer, then *"And how do you
   feel toward [their name] — curious about it, frustrated with it, or
   something else?"* JEV classifies the answer.
4. **Branch** on JEV's result:
   - **frustrated/critical at or above the threshold** → the polarization
     branch (step 5).
   - **anything else** (warm/curious, unclear, below threshold, or JEV
     failed) → closing (step 6) with one part.
5. **Polarization branch.** Fixed reflection *"Sounds like another part
   has strong feelings about this one."*, then the part 2 naming question,
   which carries an exit clause (see Locked resolutions §6). A name → part
   2 appears at default size, clearly separated from part 1. An exit
   phrase → no part 2.
6. **Closing.** One fixed line on both paths (see Locked resolutions §8).
   The map is then the user's to work with.

Every pinned question gets the blank-answer rule (Locked resolutions §5).

## Behaviors (all required)

1. **Live map.** Each part appears when its naming answer is sent, never
   in a single reveal at the end. Drag, resize, modes, rename, remove, and
   undo all work on conversation-created parts, including during the
   conversation.
2. **User-owned names.** The app never invents, extracts, or trims a name.
   Reflections never introduce a label either: they may only mirror part-names the user already wrote.
3. **Provenance.** Every attribute records the user text it came from and
   a confidence tag:
   - Part names → the verbatim answer, tagged high.
   - Part 1's size → the answer to the "loudest" question, tagged high.
   - The toward-check result → the Turn 2 answer, with JEV's label and
     probability. Below the threshold → tagged low. JEV failure → tagged
     as not judged, distinct from low.
   - Part 2's existence → the Turn 2 answer and JEV's probability.
   - The polarization pairing (part 2 has strong feelings about part 1)
     is recorded as data for slice 3's Turn 4 confirmation. It is not
     drawn in this slice.
   - Defaults (part 2's size, both starting positions, figures) are tagged
     as defaults with no source phrase. Nothing without a user source may
     borrow one.
4. **Never guess a part into existence.** Only a confident frustrated
   label plus a user-given name creates part 2.
5. **AI failure never blocks the talk.** Any LLM or JEV call that errors
   or exceeds a timeout (named constant) falls back:
   - Failed reflection → a fixed, short, warm fallback line.
   - Failed JEV call → the single-part path.

   Fallbacks are silent in the UI (no error notices mid-conversation);
   the record shows what happened via the confidence tags.

   Names never depend on AI, so they are unaffected. While a call is
   pending, show a calm waiting state.
6. **Reflections.** One or two short sentences, non-clinical, hedged ("it
   sounds like…"). Check the output before showing it; on any failure,
   show the fallback line instead. The checks are explicit, documented,
   and whole-word (so "Self" never matches "yourself"): length (more
   than 2 sentences or 280 characters fails), a closed jargon list
   (exile, manager, firefighter, protector, Self, polarization, trauma,
   burden, IFS), a closed clinical list (anxiety, depression, adhd, ocd,
   ptsd, bipolar, disorder, diagnosis, diagnose, diagnostic, symptom,
   symptoms), and documented invented-label patterns (e.g. "your
   inner ___", "your ___ part"). Matching is case-insensitive. A
   flagged word passes when that word appeared in the user's conversation
   text so far. Label patterns pass only when the user wrote the whole
   phrase, with my/your counting as the same word: a part the user called
   "my inner critic" may be mirrored as "your inner critic", but
   "worried about work" in a free-write never licenses "your worried
   part". The lists stop the app introducing terms, never repeating
   the user.
7. **Keys stay out of the browser.** LLM and JEV calls go through a
   server-side path. The route is the build session's call.
8. **Dev-only AI-off switch.** A clearly-marked dev-only switch (query
   param or hidden control) forces every AI call down its fallback path,
   deterministically.

## Changes to slice 1 (additive only)

"Slice 1 untouched" means its existing behavior is frozen. Small
additions are allowed. No unit tests (project rule, see `CLAUDE.md`):
verify by running the app.

1. **`addPart` reducer action.**
   - Adds a part to the "How it is" layout. If the "What if" layout
     exists, it also adds the part there, at the same starting spot.
   - Leaves both undo stacks alone. Map undo never reaches a part's
     existence, because existence comes from the user's words, not a map
     gesture. Removing the part (which is undoable) is how the user
     corrects it.
   - Never rebuilds the map, so drags made during the conversation
     survive.
2. **Label truncation.** Long names end in an ellipsis and never overflow
   or break the layout. The full name can be found by selecting the part.
   The mechanism is the build session's call.
3. **Rename no-op guard (UI only).** If the rename field's value is
   unchanged when it closes, by blur or Enter, dispatch nothing. Escape
   already cancels. Today, opening rename on a long name and clicking away
   silently cuts it to 40 characters. The reducer's 40-character cap
   stays as a backstop for long names the user types, and is documented.

## Out of scope (do not build)

Turns 3–4, correction parsing, invitations and experiments, drawing
relationship links, finished art, persistence, accounts, sound.

## Acceptance checks

1. **Warm path.** Free-write → name "the worry" → "I'm curious about it"
   → one part, largest, named exactly "the worry", closing line.
2. **"I hate it" path.** The same through Turn 1 → "honestly I hate it"
   → polarization reflection → name "the one who yells" → two parts,
   separated, and part 2 is not taken for an exit phrase.
3. **Exit clause.** On the branch, "it's all one feeling" → no part 2,
   closing line.
4. **Verbatim questions.** Every question matches the script exactly,
   apart from the substituted name.
5. **Reflections.** Short, hedged, no banned terms, no invented part
   labels.
6. **AI outage.** With the dev switch on, the conversation completes:
   fallback reflections, raw-text name, single-part path, closing line.
7. **Traceability.** Every name traces to verbatim user text; every
   non-default attribute traces to user text with a confidence tag;
   defaults carry the default tag and no source phrase.
8. **Blank answers.** A blank answer to any question re-asks the same
   question with "Take your time." in front. No placeholder names.
9. **Live edits.** Drag part 1 during Turn 2, then get part 2 → part 1
   stays where it was dragged. Undo never removes a part the conversation
   created.
10. **Slice 1 behavior.** Slice 1's acceptance checks still pass on the
    demo map.
11. **Exit-lookalike name.** On the branch, "just one more" becomes a part
    named exactly that — exit detection never fires inside a longer answer.
12. **User-echo.** Turn 1 answer "anxiety" → the Turn 2 reflection may
    repeat "anxiety" instead of falling back. The word lists block only
    terms the app introduces.
13. **Mid-conversation edits.** Rename part 1 after Turn 1 → the Turn 2
    question uses the new name. Remove part 1 → the toward-check is
    skipped and the closing line appears. Removing part 1 after the
    toward-check appears (while answering) also skips the JEV call and
    goes straight to closing.
14. **Label mirroring.** Free-write "worried about work" → no reflection
    may say "your worried part". Part named "my inner critic" → a
    reflection may say "your inner critic". Patterns pass only on
    whole user phrases.

## Locked resolutions (2026-10-13)

1. **JEV** is a hosted model (jev-1.13) behind an HTTP API, used directly
   at api.typesafe.ai or through a gateway; the build session picks the
   route. Contract: text plus a typed question in, a label and a
   probability out. The toward-check is a 3-way Choice: warm/curious,
   frustrated/critical, unclear.
2. **Threshold.** The branch needs a frustrated probability of at least
   0.7, held as a named, tunable constant.
3. **Size.** Part 1 is always the largest part. Part 2 gets the default
   scale of 1.0.
4. **Position and figures.** Part 2 is clearly separated from part 1;
   exact coordinates are the build session's call. Part 1's starting
   spot is neutral: closeness to the centre is Turn 3's job (slice 3),
   so this slice must not imply it. Figure (tone) assignment is the
   build session's call, with two rules: two parts always get two
   different figures, and figures carry no meaning (never narrated,
   never matched to a part's character).
5. **Blank answers.** Re-ask the identical question with "Take your time."
   in front, until answered. This applies to all four scripted questions:
   Turn 0, Turn 1, the toward-check, and the part 2 naming question.
6. **Exit clause.** The part 2 naming question is pinned as: *"What would
   you call that part — or is it all one feeling?"* (Confirmed
   2026-10-13. The exit clause offers a second valid answer to one
   question, not a second question, so it complies with the
   fused-question guardrail.)
   - **Detection:** the normalized answer (lowercased, trimmed, squeezed
     whitespace, trailing punctuation stripped) must EQUAL a documented
     exit form. Never substring matching, so a name like "just one more"
     or "the one who yells" is not caught.
   - **Exit forms:** "it's all one feeling", "all one feeling", "all one",
     "same feeling", "just one", "one feeling", "no second part".
   - Padded exits ("I think it's all one, really") fall through and become
     parts the user removes (they're declining a second part, so removal —
     not rename — is the correction); JEV-based exit detection is a slice 3
     hardening item.
7. **Names are stored verbatim and displayed truncated.** The full text
   is never altered. The 40-character rename cap is a known, documented
   limit.
8. **Closing line** is scripted, not generated, and the same on both
   paths: "Here's what I'm seeing so far — it's yours to rearrange."
   Treat the wording as draft copy until it is reviewed.
9. **Mid-conversation edits win.** "[their name]" in the Turn 2 question
   uses the part's name at the moment the question appears, so a rename
   made after Turn 1 is honored. If part 1 has been removed, skip the
   toward-check (and its JEV call) and go straight to the closing line —
   there is nothing left to feel toward. Check removal again when the
   Turn 2 answer is sent: if part 1 is gone by then, skip JEV and close
   rather than reflecting on a part that no longer exists.

## Demo walkthrough (for review)

Open → empty map, Turn 0 → write a few lines → reflection + loudest
question → answer "the worry" (part appears, largest) → drag it aside →
reflection + toward-check → "honestly I hate it" → polarization
reflection → name "the one who yells" (second part appears, separated;
the first stays where it was dragged) → closing line → flip to "What if"
and back → rename, then undo the rename → reload with the AI-off switch
and repeat → same structure with fallback lines and one part.
