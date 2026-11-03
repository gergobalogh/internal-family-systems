# Internal Family Systems — inner landscape

- **Status:** active
- **What:** An app for mapping your inner landscape, based on Internal Family Systems
- **Done when:** a stranger on a phone goes from the free-write to the picture to keep without help, and comes back to their meadow at least once
- **URL:** none
- **Post where:** not decided yet
- **Next:** Option A, step 5: Act 3, step back and look at everyone (moving and sizing live here), then one "what if" at dusk with Go back / Keep it ([docs/redesign/story-redesign.md](docs/redesign/story-redesign.md))
- **Updated:** 2026-11-03

## Build
- [x] The entry conversation, with all thirteen parts walking in on Rive
- [x] Act 1: every answer brings someone (Turn 3), closing with who came
- [x] Act 2: sit with one part (its words, what it's trying to do, thanks)
- [ ] Act 3 and the ending: step back, one "what if", a picture to keep
- [ ] The meadow is saved on the device, and the next visit opens on it

## Polish
- [ ] Phone first: nothing covers an arriving part; interface under 30% of the screen
- [ ] Copy review (wording skill) and an IFS therapist's review
- [ ] Five-person test passes (docs/redesign/story-redesign.md, section 6)

## Distribute
- [ ] Where to post: your call

# Project board

What's being worked on, what's waiting on a decision, and what's next.
Newest decisions go in [project.md](project.md)'s decision log; this board
only tracks the work.

## In progress

- **The story redesign: building Option A** (picked 2026-11-02,
  [docs/redesign/story-redesign.md](docs/redesign/story-redesign.md); the
  decisions are in project.md's log). One walk in three acts (meet who's
  here, sit with one, step back), ending with a picture to keep, and the
  meadow saved on the device for the next visit. Option B is the shape of
  later visits. Done: Turn 3, arrivals the card never covers, Act 1's
  close, and Act 2 (Fears built but off, `?fears`, until a therapist has
  reviewed it). Next: Act 3, the ending's picture, saving, then removing
  the modes, top bar, map note and the label hedge. The doc's
  section 6 has a five-person test script and the therapist questions.
- **A reflection that follows resizing (brainstorm).** Idea: when a part is
  resized, call Claude so the reflection changes with the map. Possibly
  instead of the noticing fix below.

## Needs a decision

- **Skip the name shortening for short answers?** It's now the slowest
  thing before a part appears: 1.8–2.4 s at first, 2.3–6.0 s in the
  Self-hug and Pod runs, 2.1–3.2 s in the Stack and Ribbon runs, 2.7–2.9 s
  for "the quiet one" in the Shell runs, against 0.2–0.3 s for the figure.
  Answers of three words or fewer ("the worry", "the inner critic")
  almost always come back unchanged, so skipping the call for them would
  let the part walk in about 2 s sooner. Cost: a short padded answer ("I
  said anxiety") would keep its padding, and Rename is the fix.
- **Far parts: fade in on the map, or come from the edge?** Each entrance
  has a limit: the Lantern walks at most 5 s (`WALK_MAX_MS`), Curled's
  slides and Shell's wave stretch at most 2000 artboard px (`STRETCH_MAX`,
  about Shell's spike's own pace), and the Map
  rocks at most four times (`ROCKS_MAX`), Self-hug rocks at most four
  times too (as many as fit the Lantern's 5 s, `cyclesMost`; the Stack
  takes at most twelve tiptoe cycles, Ribbon eight turns and the
  Kaleidoscope three slow rocks), a descent
  takes at most two swings at up to twice its drift (`SWINGS_MAX`,
  `DRIFT_MAX`), the Pod falls at most six cycles, coming into view at
  up to half its touchdown speed (`FALLS_MAX`, `FALL_START_MAX`), and
  Doodle rides at most four sways (`DOODLE_SWAYS_MAX`). A part
  further from its edge starts on the map and fades in (a descent starts
  lower: the Sleeper on desktop, the Defender on a phone, the Pod on a
  phone and as a desktop part 2). On desktop, a Lantern, Map or Self-hug
  part 1 starts just inside the map (one more cycle or rock would bring it
  from the edge; the quicker Stack and Ribbon, and Shell, come from the
  edge), a Kaleidoscope part 1 fades in, and a part 2 from the right
  fades in for all eight, so Curled's peek happens mid-meadow and Shell's
  wave fades in there (it would need 2.5 times its pace to come from the
  edge); Doodle also fades in as a part 2. On a phone both come from the
  edge, except the Kaleidoscope,
  which backs in from its far edge and always fades in. Longer slides
  would look yanked; more slides would need a new scene and take longer.
- **Drop a full stop at the end of a name?** An answer that is already a
  name keeps its punctuation, so "the worry." reads "And how do you feel
  toward ‘the worry.’ — …" in every later question and on the map. It was
  the same before shortening. Option: trim punctuation at either end of
  every name (no AI involved, words untouched), or leave names exactly as
  sent.
- **Noticing on the first nudge.** The summary only describes a part's
  place when the person moved it (Turn 3 no longer asks about closeness),
  so an untouched part gets no position words (`positionSpeaks` in
  `summary.ts`). The quieter part (added at Turn 3) is the usual case: it starts at the edge, but the summary only says it "rarely
  gets heard". Nudge it a
  pixel and it counts as moved, gains "feels more off to the side", and
  noticing asks: "The map now shows that ‘the quiet one’ feels more off to
  the side. Is anything different about it?" It was off to the side all
  along. Proposed fix: noticing compares where parts actually are (each
  part's distance band and size rank, before and after), not what the
  summary chose to mention, so only a real change asks. The map note keeps
  its current rule. May be folded into the resizing brainstorm above.
- **A sense of progress, or a way to finish early.** The same review that
  made the quieter part optional also noted the entry conversation shows no
  progress and has no "finish with what we have" option. Not done yet. With
  four questions, it may no longer be needed.

## Up next

- **After the therapist review: Act 2's held-back parts and Fears**
  (2026-11-03). Act 2 doesn't offer a part read as hurting or Turn 3's
  quieter part, and Fears shows only with `?fears`. The review (the
  redesign doc's questions 1, 3 and 5) decides whether Fears is on by
  default, and how Act 2 meets the parts it holds back.
- **After Go on, labels crowd on a phone** (2026-11-03): the top bar
  arrives and shrinks the map, so three name labels sit close at the
  bottom. Step 8 removes the bar; check again then.
- **Labels crowd when two parts share a side** (2026-11-03): with three
  parts, two name labels can touch or overlap at the bottom of a phone,
  or on the right on desktop. Starting spots now keep figures and labels
  apart from each other's columns, but there are few spots on each side.
- **"Nothing's moved yet" stays on screen after switching back to How it
  is** (phone, twice).
- **Check a finger drag in "What if…" on a phone.** The recorder's drag
  didn't count as a move on a phone (twice); the same drag counted on
  desktop.
- **A new part's reflection can borrow the free-write.** With AI on, naming
  ‘the one who yells’ got "the part that keeps replaying everything you
  said in meetings", which was ‘the worry’'s. Seen before this change too;
  the Turn 3 reflection prompt may need to keep Turn 0's words apart from
  the new name.
- **Review slice 4's draft wording:** the invitation, the "Take your time"
  bar, the pause card, the Get to know it questions, "might be trying to:",
  and "What if…"'s "To rename or remove it, go back to How it is." / "To take
  it down, go back to How it is.", and the bar's "Add a part" / "What
  would you call the part you'd like to add?" / "Try an experiment",
  "Keep trying" / "Finish without changes", "Skip this one", "Change
  figure" / "Keep this one" and the figure labels, the second part's
  "There may be another feeling here too…" / "What would you call it?",
  the "How it is" hint and "Smaller" / "Larger", and Turn 3's "You also
  mentioned these. Are any of them here too?" / "Is there a quieter
  feeling ‘X’ might be standing in front of?" / "Is there a quieter
  feeling here, one that rarely gets heard?" / "No one else" / "I don't
  think so", Act 1's close: "These are the ones who came." / "This is
  the one who came." / "Go on", and Act 2: "Which one would like your
  attention first?" / "Tap one. The others can wait for another time." /
  "Would ‘X’ like a little of your attention?" / "Tap it when you're
  ready." / "What is it afraid would happen if it stopped?" / "Skip" /
  "Would you like to thank it?" / "Not yet" / "Thank it", and the figure's
  label "Give X your attention".
- **Card covers the selected part's box on desktop.** The card sits at a
  fixed spot under the house, so a part dragged there has its box hidden
  behind it. (New parts no longer start there, 2026-11-03.) Idea: on
  desktop too, the card could float in the sky, as on a phone.
- **The four-turn journey** ([plan](docs/four-turn-journey-plan.md)).
  Every answer brings someone: 3–4 characters in about four answers.
  Turn 1 confirms a feeling already named or offers several as buttons;
  Turn 3 becomes "what else is here?" (replacing the closeness question);
  JEV sorts each part's hidden kind for where it starts. Build order:
  1. Rive entrances in the real app — complete: all thirteen are in.
  2. Turn 1 rows — complete: calibrated on 72 free-writes and in the app.
  3. Kind — complete: 40/40 calibrated; combined with the figure request.
  4. Turn 3 — complete (2026-11-02). 5. Turn 4 — replaced by Act 1's
  close (2026-11-03); its drag invite moves after Act 2 (it becomes "Step
  back"). 6. Turn 2's "already said" skip.
- **Reflections echo the answer's filler.** Real run, 2026-11-02: "It
  sounds like, honestly, you feel frustrated with 'not good enough.'"
- **Risk check: one known miss.** "I found a new home for my cat, for
  good" scores near zero on both moderation and JEV (Claude caught it).

## Done

- **Turn 1's phrases are short names** (2026-11-03). The lifter returned
  "I'm not good enough and should push harder", 42 characters, so Turn 1
  showed no choices. Its prompt now asks for the fewest words that name the
  feeling and splits two voices in one stretch. `npm run calibrate:turn1
  -- phrases` checks it through the app's own phrase check: 19 of 19
  free-writes keep two or more phrases (19 Claude calls, approved).

- **Act 2: sit with one** (2026-11-03, Option A step 4, frames A07–A11).
  Go on asks "Which one would like your attention first?" and the figures
  are the buttons; a part read as hurting and Turn 3's quieter part aren't
  offered, and with nobody to offer Act 2 is skipped. A tap moves the
  camera to that part while the others soften; its words come out of it
  as speech, what it might be trying to do sits under it, and "Would you
  like to thank it?" ends with a glow. Then the camera steps back and the
  map is handed over. Get to know it after the hand-over plays the same
  scenes. Fears is built with Skip, but shows only with `?fears` until a
  therapist has reviewed it. Checked with scripted AI answers in the
  browser, nine paths at 1440×900 and 390×844, with no page errors. Build
  and lint pass. Wording is draft. One slip: the first phone run's dev-jump
  path reached the real AI (six calls on made-up text); all paths are
  scripted now.

- **Act 1 closes with who came** (2026-11-03, Option A step 3, frame
  A06). Turn 4's summary question, the typed corrections and the closing
  card are gone. After Turn 3 the guide says "These are the ones who
  came." with one "Go on", which hands the map over (the bar and the
  summary note arrive then). The corrections route, its prompt and
  `corrections.ts` are removed, along with the wish and "Add a quieter
  part"; Turn 3's quieter question is now where a rarely heard part comes
  in. Checked with scripted AI answers in the browser (no model calls),
  six paths at 390×844 and 1440×900: all reached "These are the ones who
  came.", Go on brought the bar and note, and "What if…" opened its
  invitation without a wish. No page errors. Build and lint pass.
  Wording is draft.

- **Nothing covers an arriving part** (2026-11-03, Option A step 2, frame
  A03). While a part walks in, the card steps back to a small "One
  moment…" in the sky, and on a phone the keyboard goes down so the meadow
  is clear; the next card is a tap away. No starting spot is under the
  card any more: the two in the sky and the two under the desktop card
  moved to open meadow left and right, a large part 1 read as hurting no
  longer starts half off the edge, and spacing counts each part's label,
  so part 2 no longer stands on part 1's name. Checked with scripted AI
  answers in the browser (no model calls) at 390×844 and 1440×900: every
  arrival showed the bar with the card fully hidden and the field let go;
  no question card covered a part; adding a quieter part after the
  hand-over put the bar under the map note. Build and lint pass.

- **Turn 3 asks who else is here** (2026-11-02). The closeness question
  is gone, along with its route and JEV prompts. Turn 3 offers the
  feelings the free-write named that aren't on the map yet, as buttons in
  the person's words, with "No one else"; with none left, it asks about a
  quieter feeling (naming a guarding part when there is one), with "I
  don't think so". One answer brings one part; a quieter one arrives small
  at the edge, and the closing card then stops offering one. A new part
  now needs clearance from every other part, with two spare spots on the
  open meadow when its ring is crowded, so a third part no longer lands
  on the first. A feeling already on the map in other words isn't offered
  again (‘the one who wants to hide’ covers "wants to hide under the
  covers"; filler and framing words don't count). Checked with scripted AI
  answers in the browser: nine paths at 390×844 and eight at 1440×900, all
  reaching the closing card with the right parts and no page errors; then
  one run with real AI on a phone, which found the duplicate. Build and
  lint pass. Wording is draft. `flow.test.ts` was deleted (the project has
  no tests).

- **A hidden kind gives every part its opening place** (2026-10-19).
  The existing figure request now asks JEV a second question in the same
  call: `guards`, `escapes`, `hurts`, or `other`. Confident guards start
  on the close ring beside the light, escapes on a middle side ring, and
  hurts on the far ring; `other`, low-confidence, failed, and AI-off
  readings keep the neutral spots. The reading is recorded but never shown
  or sent to reflections, changing a figure leaves it alone, and the
  quieter-part edge rule still wins. The close ring was moved to its
  card-clear left arc after the first desktop capture hid the character.
  The exact combined request scored 40/40 on `scripts/calibrate-kind.ts`
  (273 ms median, 441 ms slowest). Checked all four rings on desktop,
  guard and fallback on a phone, and full runs through closing with AI on
  and off; no browser errors. `npm test` passes 31 tests, lint and build pass.

- **Turn 1 follows the person's free-write** (2026-10-19). After the
  safety check, JEV reads whether Turn 0 contains one feeling, several,
  mainly a situation, or too little to tell, while Claude lifts up to four
  feeling names. Every phrase is accepted only when the browser finds it
  word for word in the free-write. One feeling gets “Would you call it
  ‘X’ — or something else?”; several get tap choices plus the text field;
  uncertainty and AI-off keep the previous question. Confirming or tapping
  a phrase skips name extraction, so the part can appear sooner. A 72-case
  messy corpus scored 71/72 with no several → one collapses; the one miss
  was below the 0.70 action threshold. Checked through closing with AI on
  at desktop width and AI off on a phone, plus four choices on a phone;
  no browser errors. `npm test` passes 27 tests, lint and build pass.

- **Doodle draws its way in; all thirteen entrances are in the app**
  (2026-10-18). Doodle rides in from its side on a loose dusty-pink crayon
  line, still scribbling on its pad; the line draws a little ahead, the
  canvas follows and tilts with its slope, and its shadow stays on the
  ground. It rides whole sways at its own pace, at most four; further away
  it starts on the map and fades in (a desktop part 2). Touchdown at frame
  40 of `Enter` reports arrival and begins the line's 1.8 s fade; the
  remaining squash plays under the next card. In deterministic browser
  runs it reached the next card 3.8 s after appearing on a phone and 5.1 s
  on desktop as part 1 or mirrored part 2; the still took over 5.6–6.7 s
  after appearance. The near-final Rive frame and still line up with no
  visible offset (1.9% of the full figure-box crop differed over a
  12-level pixel threshold). Checked on desktop, phone, as a mirrored part
  2, reduced motion (no Rive), AI-off runs to closing, and the `?doodle`
  spike; only the pre-existing Rive inputs deprecation warning.
- **The Sprout rises out of the ground** (2026-10-18). A part that gets
  Sprout stays on its spot while a felt soil mound heaves up, the leaves
  poke through folded and open, and the Sprout gathers itself, pops out,
  lands, and bows with its flower (mirrored with the rest of a part from
  the right). This is the first in-place route: Rive owns all the visible
  motion, while the page reads the plan's keyed mound shadow. Landing at
  frame 108 reports arrival; the mound sinks and the bow continue until
  frame 222, then the still figure takes over. In deterministic browser
  runs it reported arrival 2.0–2.2 s after the part appeared (including
  scene setup), the next card appeared 2.2–2.6 s after it, and the still
  took over 3.9–4.1 s after it. The last frame and still share the exact
  box with no visible offset. Checked on desktop, phone, as a mirrored
  part 2, reduced motion (no Rive), one AI-off run to closing, and the
  `?sprout` spike; only the pre-existing Rive inputs deprecation warning.
- **The Kaleidoscope backs in** (2026-10-17). A part that gets the
  Kaleidoscope backs in from its far edge on its slow toy waddle, still
  looking up through its scope, and stops short with a small bump
  (mirrored for a part from the right, so it backs in from the map's
  left). Its plan has Self-hug's shape, so it uses the same side route,
  which now also runs from the right: the canvas travels the same
  distance the other way, measured from the far edge. At most three rocks
  fit the Lantern's 5 s, and the far edge is further on every screen, so
  it always starts on the map and fades in. It stands on its spot 3.8–4.1 s
  after it starts (desktop part 1, phone, part 2 from the right), and the
  next card comes then; the jolt springing back plays under it for 1.8 s,
  and the still figure takes over about 6 s after it starts. Its last
  frame lines up with the still figure with no offset (the felt grain
  shimmers at the pixel level, as it does for Self-hug on the same
  comparison). Checked with AI on (desktop part 1, phone, part 2 from the
  right), reduced motion, five AI-off runs to closing with a quieter part
  (two drew the Kaleidoscope), and the `?kaleidoscope` spike.
- **A wave washes Shell ashore** (2026-10-17). A part that gets Shell
  rides in waist-deep in a felt wave from its side; the wave crests and
  draws back, and Shell is left standing, eyes shut, listening to its shell
  (mirrored for a part from the right). It uses Curled's route: the wave's
  travel stretches to the screen, up to the same 2000 artboard px, about
  its spike's own pace. On desktop a part 1 and on a phone every part comes
  from the edge; a desktop part 2 fades in. Its travel stops while Shell is
  still afloat, so its plan now says when it stands (feet down, frame 262)
  and the next card waits for that: 4.4–4.5 s after it starts on desktop
  and phone, 4.6 s for a part 2, with the end of the retreat and the fade
  (1.3 s) under the card. Also fixed: every Rive entrance skipped its first
  moments by however long the page had been busy setting up its scene (Rive
  timed its first frame from the last one the page drew): 0.77 s for Shell
  in headless Chrome, about 0.8 s for the Stack in one run. Entrances now
  start on a frame. Checked with AI on (desktop part 1, phone, part 2 from
  the right, and the other nine entrances again on desktop, since the start
  changed for them, with a before/after on the Stack and the Map), reduced
  motion, five AI-off runs to closing (none drew Shell), and the `?shell`
  spike.
- **The Stack tiptoes in, Ribbon pirouettes in** (2026-10-16). A part
  that gets the Stack tiptoes in from its side, stops, and catches its
  tower as it teeters; one that gets Ribbon spins in on one foot, hops
  one last turn and lands balanced (both mirrored for a part from the
  right). They use Self-hug's side route as they are: at most twelve
  tiptoe cycles, at most eight turns. On desktop a part 1 and on a phone
  every part comes from the edge; a desktop part 2 fades in. Standing on
  the spot 4.2/4.3 s after starting on desktop, 2.6/3.2 s on a phone,
  4.9/4.8 s for a part 2, and the next card comes then; the teeter (3.8 s)
  and the wobble (2.2 s) play under it. Also fixed: an entrance fitted
  exactly to the screen could fade in as if capped, from a rounding
  error (Ribbon's first desktop run did); every route now fades only when
  its cap bites. Checked with AI on (desktop part 1, phone, part 2 from the
  right, and Self-hug, the Pod, the Defender and Curled again, since the
  fade rule changed for them), reduced motion, four AI-off runs to
  closing (two drew Ribbon, once as the quieter part), and the `?stack`
  and `?ribbon` spikes.
- **The Pod drops in** (2026-10-16). A part that gets the Pod drops in
  from just above the map, speeding up to the touchdown speed its squash
  was made for, and its padding swallows the landing; its shadow gathers
  on the ground as it comes down. It has its own route (`fallRoute`):
  whole fall cycles, at most six (2.4 s), coming into view at up to half
  its touchdown speed; further, it starts lower and fades in (a phone, a
  desktop part 2). Touchdown 2.3–2.5 s after it starts, and the next card
  comes then; the landing plays under the card for 2.1 s. Checked with AI
  on (desktop part 1, phone, part 2 from the right, and the Defender and
  Sleeper again, since their shadow code moved), reduced motion, four
  AI-off runs to closing (none drew the Pod), and the `?pod` spike.
- **Self-hug rocks in** (2026-10-16). A part that gets Self-hug rocks in
  from its side like a wind-up toy, glides to a stop and leans toward the
  space beside it (mirrored for a part from the right). The side route now
  loops a gait: whole rocks, as many as come nearest its own pace, fitted
  to land it on its spot. At most four rocks (as many as fit the Lantern's
  5 s), at most half a rock faster; further, it starts on the map and
  fades in. It stands on its spot 4.9 s after it starts on desktop, 3.8 s
  on a phone, and the next card comes then; its lean plays under the card
  for 3.3 s more. Checked with AI on (desktop part 1, phone, part 2 from
  the right, Curled again, since it shares the route), reduced motion, four
  AI-off runs to closing (none drew Self-hug), and the `?selfhug` spike.
- **The Defender and the Sleeper come down from above** (2026-10-16). The
  Defender floats down by parachute, its canopy collapsing and fading
  beside it after touchdown; the Sleeper drifts down like a leaf and
  settles without waking. Their shadow waits on the ground and gathers as
  they come down. At most two swings at up to twice their spike's speed;
  further, they start lower and fade in. Touchdown 6 s after the part is
  named, and the next card comes then. Checked with AI on (both on
  desktop, the Defender on a phone, the Sleeper as a mirrored part 2, and
  the Lantern and Map again, since their shadow moved), reduced motion,
  and four AI-off runs to closing (one gave part 1 the Defender).
- **The Map walks its route; the next card comes on arrival**
  (2026-10-16). A part that gets the Map walks in along the back of the
  meadow, stops at the corner to check its map and slants forward to its
  spot, with a stitched trail behind it that fades as it arrives (mirrored
  for a part from the right). At most four rocks; further, it starts on
  the map. The next card now comes when a figure stands on its spot,
  while it finishes settling (the Map's last look at its map, 2 s; the
  Lantern 0.7 s, Curled 1 s). Answer to next card 8.1 s on desktop, 8.3 s
  for a part 2. Checked with AI on (desktop, phone, part 2 from the right,
  the Lantern and Curled again), reduced motion, and four AI-off runs to
  closing (the shuffle gave the Lantern, the Map and Curled).
- **Curled peeks in** (2026-10-16). A part that gets Curled peeks in from
  its edge, backs off, and comes in over three slides on its Rive
  entrance; the still figure takes over at the end (0.2–0.4% of pixels
  differ). The Lantern's walk became one component for every Rive
  entrance (`RiveEntrance.tsx`, routes in `riveEntrances.ts`), and
  `app-figures.py` now writes each map figure's scale, so a scene's
  canvas shrinks to match. It takes 6.2 s: answer to next card 8.9 s on
  desktop and phone, 8.4 s for a part 2. Checked with AI on (desktop part
  1, phone, part 2 from the right, and the Lantern again), reduced
  motion, and four AI-off runs to closing (one gave the quieter part
  Curled, at the edge).
- **A part walks in while the guide thinks** (2026-10-16). After the
  risk check, the figure, the name and the reflection start together, and
  a part walks in the moment it's named instead of after the reflection;
  the Lantern's scene loads with the map. Answer to next card: 8.0 s on
  desktop (was 10.0), 7.5 s on a phone (was 13.3), 7.4 s for a part 2
  (was 11.0); one reflection call per naming. Checked with AI on (desktop,
  phone, part 2 from the right), reduced motion, and a full AI-off run.
- **The Lantern walks in on Rive** (2026-10-16). A part that gets the
  lantern walks in from its side on the Critic's Rive gait, inside its own
  figure box (mirrored from the right), and the still figure fades in over
  the last frame. The next card waits for the walk to settle instead of a
  fixed 2.6 s. Walks are capped at 5 s, fading in when they start on the
  map. Checked in the app with AI on: desktop part 1 (4.8 s, card 0–63 ms
  after arrival), phone part 1 (4.4 s, from the edge), desktop part 2 from
  the right (facing left, moving left), reduced motion (no walk, card not
  held), and a full AI-off run to closing.
- **Cleaner names, better figures, a reflection on the frustrated path**
  (2026-10-16). Naming answers are shortened to the name
  (`/api/extract-name`, run alongside the figure call; the code accepts
  only words found in one piece in the answer): "as i've told you. not
  feeling good enough." becomes ‘not feeling good enough’. Names are
  quoted in every question. Feelings like "not good enough", "feeling
  judged" and "shame" get Curled instead of the Lantern, which keeps the
  critic. "Frustrated with it." gets a one-sentence reflection before the
  second-part question. Checked in the app with AI on (two full runs) and
  off. Decisions in project.md.
- **A shortened name never copies another part's** (2026-10-16). On the
  second-part question, "honestly it's just the same as not feeling good
  enough" shortened to part 1's exact name and made a duplicate part. Now
  it counts as "part of the same feeling": one part, and the guide
  reflects "all one feeling". When adding a part, a shortening that copies
  a part on the map gives way to the answer as sent. Names are now cut
  from the person's answer, so they keep their spelling. Checked in the
  app with AI on (both cases, plus "well I guess the one who snaps" still
  making part 2) and off.
- **The map explains itself; size has buttons** (2026-10-16). A soft pool
  of light marks the point closeness is measured from (`MAP_CENTRE`, left
  of the house); the "How it is" hint now reads "Size shows how much space
  a part takes up. Nearer the light, the closer it feels."; [Smaller]
  [Larger] in the part's box in both modes. Checked in the app at desktop
  and phone width. On a phone the light is faint, and the closest part
  usually stands on it. Decision in project.md.
- **Change figure, and a softer second part** (2026-10-16). The part's box
  in "How it is" offers the free figures as still thumbnails (three across
  on a phone), undoable; new parts never repeat a figure on the map. The
  polarization branch now says "There may be another feeling here too. If
  it feels separate, what would you call it — or is it part of the same
  feeling?", with "What would you call it?" after a bare "separate" or
  "yes". Checked in the app (AI on for both branch answers). Decision in
  project.md.
- **Optional steps stay open** (2026-10-16). "Try an experiment" in the
  "What if…" bar after a full run (the invitation still comes once);
  "Nothing's moved yet" offers Keep trying / Finish without changes (before,
  the trying bar had no way out without moving something); noticing's
  button says "Skip this one"; "Add a part" in the "How it is" bar, up to
  13 parts. Checked in the app at desktop and phone width. On a phone the
  "What if…" bar now takes three rows. Decision in project.md.
- **"What if…" only rearranges** (2026-10-16). Rename, Not one of my parts,
  Clear what it said and Remove this link appear only in "How it is"; in
  "What if…" the box says "To rename or remove it, go back to How it is."
  Before this, removing a part in "What if…" took it out of "How it is" too,
  and only "What if…"'s Undo could bring it back. Checked in the app on
  desktop and phone width. Decision in project.md.
- **The quieter part is optional** (2026-10-16). The entry conversation is
  four questions (Turns 0–3), then the map check (Turn 4, was 4b). The old
  Turn 4a moved to the closing card as an "Add a quieter part" button,
  which asks only for the name. The dev jump now stops at that closing
  card with two parts. Checked in the app with AI off and on: adding a
  part, Not now, a bare "yes" (asked again), and the "What if" invitation
  over the closing card. Decision in project.md.
- **JEV picks each part's figure** (2026-10-15). When a part is named, a
  `figure` job (after the risk check, before the part appears) asks JEV
  which of the 13 characters fits the name (`/api/figure`, criteria in
  `server/ai.ts`). The part gets the most probable figure the session
  hasn't used yet; with AI off or failing, the next one in a per-session
  shuffle. All 13 are map figures now, sized to the same felt area
  (`scripts/app-figures.py`), with blinks except the Kaleidoscope's (its
  scope hides that eye) and Shell's (eyes shut). In the real app, ‘the
  worry’ got the Map, ‘the one who yells’ the Defender and ‘the quiet one’
  the Shell; ‘the little one’ gets Curled, ‘hope’ the Ribbon.
- **Public GitHub repo:** <https://github.com/gergobalogh/internal-family-systems>
  (branch `main`). `dream.mp4` (40 MB) and the loose `Generated Image … .jpg`
  stay out (`.gitignore`); add them later if they should be public.
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
