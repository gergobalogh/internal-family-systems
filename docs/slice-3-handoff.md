# Slice 3 handoff — Turns 3–4: map completion + one correction round

**For:** implementation session (Claude Code). **Date:** 2026-10-13.
**Status:** product spec locked with user. API route, layout, file structure,
exact constants, and rendering details are OUT of this note — decide those in
the build session.

## Context

Read first:

- `docs/slice-2-handoff.md` — the conversation through Turn 2, the pipeline
  (rules, JEV, LLM), and the equality-matching precedent.
- `research/synthesis-4-turn-script.md` — the agreed entry script. This slice
  builds Turns 3–4 and amends two of its rules (guardrail, Turn 4 cap).
- `project.md` — product principles (never villainize a part, tentative and
  editable interpretations, reduced motion).

## Goal

Complete the entry map: positions from Turn 3, the unheard part and a
confirmed map from Turn 4. Prove corrections work once: parse, apply,
narrate, close — exactly one round, then the map is the user's.

Verification: headless walkthrough of the checks below (no unit tests, per
project decision 2026-10-13).

## Starting state

A Turn 2 conversation in progress (one or two parts on a live map). A
dev-only, clearly-marked jump starts at Turn 3 with two scripted parts
in the polarized state (link recorded), so unlink and the link control
are testable from it.

## The flow

Questions in *italics* are pinned: show them verbatim, with only current
part names substituted in. The blank rule (re-ask identical with "Take your
time." in front, until answered) applies to every scripted question below.

1. **Turn 3 — centrality.** Branched by visible part count:
   - One part: *"Does [name] feel close, or more off to the side?"*
   - Two parts: *"Which feels closer — [A] or [B]?"* (names in creation
     order). One question preserves the four-turn shape; asking per part
     would not.
   - No parts: skip Turn 3, ask the Turn 4a probe directly with no
     reflection (nothing new to reflect). Same-name parts: skip the
     relative question the same way; record centrality as undetermined
     (value 'undetermined: same name', no source, default tag).
   - Equality first (normalized full-answer match, same normalization as
     exits): one-part close-family ("close", "pretty close", "very
     close", "near", "nearby", "close to the centre", "close to the
     center"), far-family ("far", "far away", "far off", "distant",
     "off to the side"), middle-family ("in the middle", "middle",
     "midway", "halfway", "in between"); two-part exact names and the
     tie list ("about the same", "both", "the same", "same"). Never
     keyword search: "not close at all" contains "close", and names can
     contain each other.
   - Everything else goes to JEV: one-part Choice (close/middle/far/
     unclear), two-part Choice (part_a_closer/part_b_closer/about_same/
     unclear, criteria quoting the names). Criteria include tentative
     versions, as in slice 2. Threshold 0.7 reused (build renames
     FRUSTRATED_THRESHOLD to a general name — internal only).
   - Below threshold, JEV failure, or AI off with a fuzzy answer: move
     nothing. Equality matches still apply with AI off.
   - Moves change only distance from the map centre and keep direction.
     One part: inward/outward/mid-radius step along its ray. Two parts:
     after the move the named part is strictly nearer (move it inward;
     push the other outward only if clamping would otherwise break the
     order). Part at exact centre + outward → +x ray (documented
     arbitrary). Clamps bound everything; radii and steps are named
     constants. Moves are silent-but-visible: no narration line.
   - If a part is removed while answering: one left → treat the answer
     as unclear (no move); none left → skip to Turn 4a as above.
2. **Turn 4a — unheard probe.** *"Is there a part that rarely gets heard —
   what would you call it?"* (Fused identify+name, Turn 1's shape; the
   guardrail amendment below licenses it.)
   - Bare-yes list ("yes", "yeah", "yep", "there is", "i think so") →
     one pinned follow-up, *"What would you call it?"* (blank rule
     applies; no/unsure lists honored; anything else is the verbatim
     name). A name can't be conjured; the follow-up is the only
     alternative to inventing one.
   - No list ("no", "nope", "none", "not really", "nothing", "don't
     think so", "i don't think so", "nobody", "no one", "never mind",
     "forget it") → no part, recorded 'none'.
   - Unsure list ("not sure", "unsure", "i don't know", "don't know",
     "maybe", "no idea") → no part, recorded 'unsure' (distinct from
     none;
     "I don't know its name" ambiguity resolves against creating).
   - Anything else → part 3, verbatim name, small scale, edge-leaning
     spot clearly apart (Brief 2 maps "rarely heard" to edge + small,
     the way "loudest" maps to largest). Size and position tag high
     with the 4a answer as source, exactly like part 1's size; figure
     stays a default with no source.
3. **Turn 4b — confirmation.** No reflection: the summary mirrors their
   words already, a long turn would read as more certain (Brief 3), and
   it saves an AI call (the 4a answer is acknowledged by the summary
   appearing). A deterministic summary, names quoted, plus *"One way I'm
   seeing this is [map] — what would you change?"* with a **No changes**
   action beside Send at equal visual weight (never more: the app must
   not invite agreement; the user may phrase affirmation however they
   like). Typed affirmatives match locally by equality ("looks right",
   "looks good", "yes", "yeah", "nothing", "all good", "fine",
   "no changes") → close immediately, no narration.
   - If no parts are visible after Turn 4a, skip the confirmation and
     close with slice 2's closing line (early closes keep shipped copy).
4. **Correction parse (one round).** Anything else goes to the LLM once
   and parses into ops; code verifies every op before applying:
   - rename / remove / bigger / smaller / closer / further, each with a
     target. The target must be unique: an exact normalized name in the
     text (whole words; longest match wins, so "the worry" inside "the
     worry about mom" doesn't count separately), or the sole visible
     part ("it" only then). Descriptive references ("the big one"),
     same-name parts, and missing targets → the map line. Several
     verified targets under one instruction ("make X and Y smaller")
     apply the op to each; the round's applications undo as one unit.
     Identity is
     exact; space is approximate — that split is why targets are strict
     while Turn 3 lets JEV judge.
   - The new name must appear word for word in the correction
     (case-insensitive match, stored as typed); otherwise the map line.
     Renames dispatch the ordinary rename action, so the 40-character
     backstop applies (documented edge).
   - unlink needs no target (at most one link exists). Nothing linked →
     nothing to apply → close silently (a parsed endorsement of the
     status quo, not a failure). Equality fast-path so it works AI off:
     "not pulling apart", "no pulling apart", "they're fine together",
     "they get along", "remove the link", "remove the tension",
     "no tension".
   - wish ("I wish…", "I want it to…", "if only…", "hope…") → the wish
     line, no map change: *"That sounds like how you'd like it to be —
     you could try that in 'What if'."* (Draft copy.) It points without
     switching. "Should be" + a concrete change ("X should be bigger")
     is a correction — the map is wrong — consistent with remove
     ("should come off the map") and unlink ("should go"). A wish
     written into "How it is" is exactly what the two modes exist to
     prevent.
   - Magnitudes: bigger/smaller ×/÷1.3 clamped; closer/further ±0.15
     radial. At a limit, the narration says so ("already as small as it
     goes") instead of pretending. Applied ops use the ordinary
     undoable actions grouped as one undo unit for the round, so a
     misparse is one undo away.
   - Narration is a deterministic template ("Done: " + applied ops +
     at-limit notes), never LLM prose: renamed 'A' to 'B' / removed 'A'
     / made 'A' bigger|smaller / moved 'A' closer|further / took down
     the link between 'A' and 'B'. Ops naming a removed part narrate
     honestly ("'X' isn't on the map anymore") instead of applying;
     unknown names, and names matching both a removed and a visible
     part, go to the map line.
   - Then, in order: the wish line if any wishes, the map line if any
     unclear ("I didn't catch that — the map is yours to fix directly:
     drag, resize, rename, or remove (parts or link)."), then the
     closing line. Failed
     parse → the map line, never a silent close.
5. **Closing (new).** *"That's the picture so far — it's yours.
   Move anything that doesn't look right."* (Draft copy.) It replaces
   slice 2's closing on full runs because that line ("Here's what I'm
   seeing so far") repeats the summary. The map stays live.

## Behaviors (all required)

1. **Summary reads the map, minus untouched defaults.** Sizes and
   positions describe the live "How it is" layout — but only values
   derived from an answer or the person's own edits. Starting placement
   is recorded at creation (default tag, except part 3's mapping-derived
   position — see Turn 4a); touched means differs from it
   (user edits count, computed, no record entry needed). Untouched
   defaults get no words; a two-part relative order is stated as
   comparison ("[A] feels closer than [B]"). Superlatives computed
   fresh, strictly-unique only. Names (quoted), the tension pair, and
   the unheard part come from the record. Never "you said/placed" for
   spatial facts. Only visible parts, in creation order.
2. **Links.** The recorded Turn 2 pairing becomes link state (no undo
   entry — like addPart, it comes from the conversation). Drawn only
   while both endpoints are visible and not explicitly unlinked.
   Explicit unlink tombstones (undoable); removal merely hides (undo of
   the removal restores). The drawn link is selectable with a remove
   affordance reusing the unlink op (reachable and labeled, mechanism
   build's call), so a wrong link is never permanent. Rendering reads
   as pulling-apart, never
   conflict-as-villainy: no red, dark, or jagged-clash iconography.
3. **Figures from a shuffled pool.** Creation order takes a per-session
   shuffle of the three figures (replaces slice 2's fixed mapping —
   sanctioned evolution; the demo map's fixed looks are untouched).
   Assignment is structurally independent of character, which is what
   "figures carry no meaning" requires now that a third part exists.
4. **Conversation-driven changes land in "How it is."** Turn 3 moves
   and correction ops describe reality. If the person is viewing "What
   if", switch the view back (view-only, no data change) so the change
   is seen.
5. **Confidence.** New tag 'parsed' for LLM-op-derived attributes
   (source: the correction text). Confirmation outcome is recorded
   (affirmed/corrected). All slice 2 tag rules stand.
6. **AI failure.** Timeouts and errors fall back per slice 2, silently.
   AI off: equality lists still move parts and close affirmations; JEV
   judgments and LLM parses degrade to no-move and the map line. A
   full AI-off run completes.

## Changes to prior slices (additive only)

Existing behavior frozen, as before. New: link state + unlink action
(undoable) with the cascade rules above; figure-pool shuffle (flow
level); threshold-constant rename (internal); conversation-driven
actions reuse place/rename/remove unchanged.

## Out of scope (do not build)

Allied/silenced elicitation and links, invitations and experiments, new
figures or worlds, persistence, multi-round corrections, JEV-based exit
detection (carried from slice 2).

## Acceptance checks

1. **One-part Turn 3.** "close" moves inward along the ray; "far" moves
   outward; summary position words match the map.
2. **Relative Turn 3.** Naming A leaves A strictly nearer; summary says
   "[A] feels closer than [B]", never "[B] is off to the side".
3. **Tie.** "about the same" moves nothing.
4. **Negation trap.** "not close at all" does not move inward.
5. **Unheard yes.** "yes" → "What would you call it?" → name → small
   part at an edge, figure different from parts 1–2.
6. **Unheard no/unsure.** "none" and "I don't know" create nothing; the
   record distinguishes none from unsure.
7. **Summary matches the map** after a drag and a resize mid-flow.
8. **Looks-right.** The No changes action and typed "looks good" both
   close with the new closing line and no parse.
9. **Correction ops.** Rename, remove, resize, move closer/further, and
   unlink each apply once from text; "X should be bigger" parses as a
   correction; "make X and Y smaller" applies to both and undoes as
   one; undo restores the link.
10. **Wish changes nothing** ("I wish it were further away") and shows
    the redirect line.
11. **Rename-not-in-text** goes to the map line.
12. **AI-off full run** completes: equality moves apply, corrections go
    to the map line, closing line appears.
13. **Regression.** Slice 1–2 walkthroughs still pass.
14. **Link control.** Selecting the drawn link offers remove; removing
    hides it, undo brings it back.

## Locked resolutions (2026-10-13)

- Turn 3 drops the research script's optional "How far?" follow-up: an
  unclear answer moves nothing, tags low, and the summary catches it.
- Turn 4's cap is two questions except the bare-yes path, where a naming
  follow-up is the only alternative to inventing a name.
- Guardrail amended (synthesis updated): fused identify+name questions
  permitted (Turns 1, 4a); the name slot resolves to user words or an
  explicit no/unsure — never inferred. All other fused forms stay banned.
- Magnitudes and radii are named constants (1.3 scale steps, 0.15 radial
  steps, documented min radius and position buckets).
- Duplicate names render as-is (verbatim wins over clarity); same-name
  parts make Turn 3 and rename/remove targets unclear.
- Reflections: every app turn opens with an LLM reflection on the most
  recent answer under the standard checks, except skipped turns (probe
  asked directly), the bare-yes follow-up (nothing to reflect in
  "yes"), and Turn 4b (the summary serves). Request shapes are the
  build's call.
- One shared normalize for all equality lists (lowercase, trim, squeeze
  spaces, strip trailing punctuation, drop apostrophes); slice 2's
  exit check adopts it (matching-only expansion — previously-matching
  inputs are unaffected).
- All slice 2 closing paths now continue into Turn 3 (removal paths via
  the Turn 3 skip); the only remaining early close is no visible parts
  at Turn 4b, which keeps slice 2's closing line. This supersedes
  slice 2 check 13's closing expectations.

## Demo walkthrough (for review)

Full polarized run → drag part 1 mid-flow → relative Turn 3 → unheard
"yes" → name part 3 → summary → "make the Critic smaller, and they're
not pulling apart" (both apply, narrated) → closing → undo the unlink
(link returns) → AI-off repeat → prior-slice regression.
