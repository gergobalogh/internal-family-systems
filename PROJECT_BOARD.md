# Project board

What's being worked on, what's waiting on a decision, and what's next.
Newest decisions go in [project.md](project.md)'s decision log; this board
only tracks the work.

## In progress

- **Public GitHub repo.** Create it with `gh`, make the first commit, push.
  `dream.mp4` (40 MB) and the loose `Generated Image … .jpg` stay out
  (`.gitignore`); add them later if they should be public.

## Needs a decision

- **Figures don't fit their parts.** In one run, ‘the worry’ got the
  Sleeper, ‘the quiet one’ the Sprout, and ‘the one who yells’ the Critic's
  lantern. The pick is random on purpose: `flow.ts` shuffles the three
  figures once per session and hands them out in the order parts are named
  (slice 2's rule: "figures carry no meaning, never matched to a part's
  character"; slice 3 added the shuffle). Two things to decide:
  - whether to match at all (project.md allows it: "appearance can suggest
    a protective strategy, burden, or emotional posture without declaring
    what a part really is"), and how: the AI picks by the part's name and
    the person's words, the person picks, or both;
  - whether the pool grows from 3 figures to the 13 in
    [docs/character-entrances.md](docs/character-entrances.md). With only 3
    for 3 parts, the third part gets whatever is left, so a match can only
    do so much. The 10 new ones need map-ready cutouts at a shared scale,
    and the "no bigger cast yet" agreement from 2026-10-14 would change.
- **Noticing on the first nudge.** The summary only describes a part's
  place when an answer set it (Turn 3) or the person moved it, so an
  untouched part gets no position words (`positionSpeaks` in
  `summary.ts`). The unheard part (Turn 4a) is the usual case: it starts at
  the edge, but the summary only says it "rarely gets heard". Nudge it a
  pixel and it counts as moved, gains "feels more off to the side", and
  noticing asks: "The map now shows that ‘the quiet one’ feels more off to
  the side. Is anything different about it?" It was off to the side all
  along. Proposed fix: noticing compares where parts actually are (each
  part's distance band and size rank, before and after), not what the
  summary chose to mention, so only a real change asks. The map note keeps
  its current rule.

## Up next

- **Review slice 4's draft wording:** the invitation, the "Take your time"
  bar, the pause card, the Get to know it questions, "might be trying to:".
- **Card covers the selected part's box on desktop.** The card sits at a
  fixed spot under the house, so a part there has its box hidden behind it.
- **Rive entrances in the real app.** Slices 1–4 run end to end, so the
  "finish the app first" condition looks met. Replace the CSS walk-in with
  each character's entrance spike, one character at a time.
- **Risk check: one known miss.** "I found a new home for my cat, for
  good" scores near zero on both moderation and JEV (Claude caught it).

## Done

- **How the app works, in ASCII:** [docs/how-it-works.md](docs/how-it-works.md),
  linked from the README.
- **Risk calibration script kept:** `node scripts/calibrate-risk.ts [A|B|C]`
  runs 77 made-up answers through the app's own risk check
  (`readRisk`/`riskVerdict`, now exported from `server/ai.ts`), so it can't
  drift from the thresholds. On 2026-10-15, set C was 13 of 15 as expected,
  with the cat miss and one cautious pause, the same as before the move.
- Slices 1–4: the landscape, the entry conversation (Turns 0–4b), the
  correction round, and after closing: the experiment, Get to know it,
  noticing, and the safety pause.
- The risk check moved from Claude to OpenAI moderation + JEV, side by side
  (about 0.3 s instead of 1.3–2 s).
- An entrance spike for every character in
  [docs/character-entrances.md](docs/character-entrances.md); every
  open-eyed figure blinks.
