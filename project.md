# Internal Family Systems — product concept

## Core idea

A beautiful, visual space where someone encounters characters representing different parts of themselves: the critic, the people pleaser, the ambitious one, the exhausted one, and others that emerge from their own words.

Rather than asking the person to invent every part from a blank canvas, the experience begins as a short guided conversation. The person describes what is happening in plain language; the app reflects something useful and asks one focused question. Over roughly three or four exchanges, it gathers enough context to identify a small cast of inner parts.

The inner landscape builds itself gradually in the background as the conversation unfolds. Characters appear, shift, and become clearer through a scrollytelling-like transition, so discovering the landscape feels continuous with the conversation rather than like arriving at a separate results screen.

## Experience

1. The person writes about how they feel or what they are struggling with.
2. The app responds with a reflection and one question that helps reveal another layer.
3. Early hints of characters and relationships emerge in an abstract inner landscape behind the conversation.
4. After three or four exchanges, the landscape comes into focus: which parts are present, what each is saying, how influential it feels, and how the parts relate to one another.
5. The person explores and reshapes that landscape by moving characters and changing their size.
6. The app responds to those changes with new reflections, questions, or guidance grounded in the arrangement.

## The inner landscape

The scene should feel symbolic and emotionally evocative rather than like a literal room. Position, scale, distance, overlap, motion, light, and atmosphere can communicate relationships between parts.

Characters are draggable and resizable. These actions are meaningful, not merely decorative:

- **Current influence:** “This is how much space this part occupies in me right now.”
- **Desired relationship:** “This is how I would like this part to relate to me or the others.”

The experience must make that intent explicit. The same resizing gesture cannot reliably communicate whether someone is describing the present or imagining a change. A lightweight mode, prompt, or before-and-after state could distinguish the two while preserving the directness of the interaction.

Questions the landscape might help someone explore:

- Who takes up the most space?
- Who stays closest to the centre?
- Who has been pushed to the edge?
- Who has not been heard?
- What changes when one part is given more room—or asked to step back?

## Art direction

### Visual thesis

> A half-remembered inner world rendered as a cinematic storybook dream—tender, spacious, and physically impossible. Its inhabitants feel symbolic but alive, and the landscape quietly reshapes itself as the person understands them.

The overall style is soft surrealism and dreamcore: photorealistic yet impossible scenes rendered in a cinematic, painterly way. The visual references combine surrealist tableaux, carefully composed film frames, classic children's-book illustration, and the smooth fluidity of high-end generative imagery. The result should feel original rather than like an imitation of any one artist or filmmaker.

The palette centres on dusty pinks, soft greens, creamy whites, and gentle blues. Lighting is diffuse and smooth, with occasional warm points of light. Surfaces can have a subtly glossy, hyper-real quality while retaining the softness of a painted world.

Possible landscape motifs include endless pastel fields, shallow reflective water, floating stairways, enormous curtains, impossible doorways, tiny moons, and domestic objects placed at an uncanny scale. These should be used sparingly: one memorable visual idea is stronger than a scene crowded with surreal effects.

### Emotional tone

The experience should evoke quiet wonder and gentle melancholy: childlike magic, soft nostalgia, and the feeling of lingering inside a half-remembered dream. It is peaceful, slightly lonely, meditative, and imaginative. The world feels familiar but untethered from reality, inviting curiosity rather than shock.

The melancholy must retain warmth, especially when the person is vulnerable. The app should never use darkness, menace, or emotional coldness as shorthand for a difficult part.

### Three visual layers

- **The world:** cinematic, painterly, spacious, and almost real. It carries most of the photorealism and surreal spectacle.
- **The characters:** tactile, sculptural, and slightly illustrated. They are strange, gentle creatures with subtle human qualities—distinct enough to recognise and bond with, but ambiguous enough for the person to project meaning onto them.
- **The interface:** crisp, calm, and restrained. Typography, controls, and conversational text provide clarity and accessible contrast without breaking the dream.

This separation is important. Fully photorealistic characters could become uncanny or feel like overly literal diagnoses. Simpler, stable silhouettes will also make characters easier to recognise, drag, resize, and follow as the landscape changes.

### Character principles

- No part is designed as a villain, monster, or joke.
- Appearance can suggest a protective strategy, burden, or emotional posture without declaring what a part “really is.”
- Even difficult parts should contain some trace of vulnerability or good intent.
- Characters need consistent silhouettes, textures, and identifying details across every state and scale.
- Scale, position, posture, and movement should communicate influence without relying only on facial expression.
- The person can reject or reinterpret both a character's meaning and its appearance.

### Motion and composition

- Use slow, deliberate movement rather than constant ambient animation.
- Reveal one visual surprise at a time as the conversation progresses.
- Keep compositions sparse enough that the person's writing remains the focus.
- Let characters first appear as subtle traces—movement, shadow, colour, or silhouette—before becoming fully recognisable.
- Avoid sudden transformations, chaotic particle effects, or imagery that could feel ominous.
- Respect reduced-motion preferences and preserve meaning when animation is disabled.

### Visual risks to guard against

- A generic “AI dream art” look caused by inconsistent imagery or an undefined visual language.
- Uncanny photorealistic characters that feel emotionally prescriptive.
- Pastel colours and atmospheric effects reducing text or control legibility.
- Beautiful motion competing with reflection and writing.
- Gentle melancholy becoming isolating or emotionally cold.
- Cute character design trivialising complex or painful inner experiences.

## Product principles

- **Conversation before configuration:** describing an experience should be easier than designing a cast of characters.
- **Progressive revelation:** the landscape emerges throughout the conversation instead of appearing all at once.
- **Editable interpretation:** the generated landscape is a starting hypothesis, not an authoritative reading of the person.
- **Meaningful interaction:** moving or resizing a character changes the reflection the app offers.
- **Visual wonder with emotional restraint:** the experience should feel stunning, alive, and immersive without becoming distracting or falsely clinical.
- **User authority:** the person can rename, correct, remove, or reinterpret any generated part.

## System needs

The conversational layer needs to produce structured information the visual experience can render and revise, including:

- each part's tentative identity, words, and emotional role;
- size or influence;
- position and relationships to other parts;
- confidence or uncertainty, so tentative interpretations are presented as such;
- changes inferred from later conversation or direct manipulation.

Possible implementation directions include an LLM with a structured schema or JEV (typesafe.ai) for typed output. This is a technical decision to investigate later, not yet a product decision.

## Central unresolved question

What role should the app play after it visualises the person's inner world?

Possible directions to explore:

- **Mirror:** reflect patterns and ask questions without recommending what to do.
- **Gentle guide:** suggest small experiments within the landscape and help the person notice what changes.
- **IFS-informed companion:** use a more explicit therapeutic framework and offer structured exercises, which would require stronger boundaries, safety design, and clarity that it is not a therapist.

This decision will determine the tone of the responses, what happens after a character is moved or resized, and how much authority the app appears to have.

## Other open questions

- How visible should emerging characters be during the early conversation: atmospheric hints, recognisable silhouettes, or named parts?
- Does the app preserve both the “current” and “desired” landscapes so the person can compare them?
- How much control does the person have over a generated character's appearance?
- What does JEV provide beyond an LLM constrained by a schema?

## Decision log

### 2026-10-12 — Entry-question research scoping

- **App role (resolves central question, first pass):** hybrid — start as Mirror (purely reflective early turns), earn the right to become Gentle guide (small reversible landscape experiments later and post-visualization). IFS-informed companion explicitly deferred: too authoritative and clinical for now.
- **Research scope:** three pillars, run as three separate deep-research sessions in order, then a short synthesis into the 4-turn question script. The Mirror → Gentle guide transition gets no separate run; it is answered in synthesis, with transition questions folded into brief 3.
- Briefs: [research-briefs.md](research-briefs.md) (1. IFS elicitation, 2. Mappable UX, 3. Uncertainty framing + transition).

### 2026-10-15 — Mirror → Gentle guide (slice 4)

- **Gate:** the person's permission is the readiness signal. Brief 3's signals are amended: change-talk inference and "2+ parts" are dropped, and "one loop completed" is met by every full run. The invitation appears only when the person enters "What if" after closing, once per session; the person makes every move.
- **After closing:** one experiment loop (invite → try → "What was that like?" → one reflection), "Get to know it" per part (voice → what it might be trying to do, in the person's words), and one noticing question when a "How it is" edit changes what the summary would say (once per part).
- **Wish:** Turn 4b's wish is quoted in the person's words, never paraphrased.
- **Safety:** every free-text answer, entry conversation included, is screened (local phrase list + AI check) before anything reads it; a hit drops the answer, shows a fixed pause with a helpline directory link, and quiets the guide for the session. This is a sanctioned change to slices 2–3.
- Spec: [docs/slice-4-handoff.md](docs/slice-4-handoff.md). All new copy is draft.

### 2026-10-15 — Figures fit their parts

- **Reverses slice 2's rule** that "figures carry no meaning, never matched to a part's character". A shuffled pick of three gave ‘the worry’ the Sleeper and ‘the one who yells’ the Sprout, and a figure that contradicts the part reads as a misreading of the person. This follows the character principle above: appearance can suggest a posture without declaring what a part "really is".
- **JEV picks the figure** when a part is named, from the name (and Turn 0's words when the name says little), as a Choice over each character's role. The part gets the most probable figure no part of the session has had. With AI off or failing, the session's shuffled order stands in.
- **All 13 characters** from [docs/character-entrances.md](docs/character-entrances.md) are map figures now (this lifts 2026-10-14's "no bigger cast yet"), each scaled to the same felt area as the first three, because on the map size means influence.

### 2026-10-16 — The quieter part is optional

- **Why:** a review counted the ordinary run at six responses (Turns 0, 1, 2, 3, 4a, 4b), up to eight with the two naming follow-ups, against "about 4 turns" in docs/how-it-works.md and "three or four exchanges" above. With no progress sign and no way to finish early, that starts to feel like an intake form.
- **Change:** the entry conversation is four questions (what's weighing on you, the loudest feeling, how you feel toward it, where it sits), then the map check. The old Turn 4a, "Is there a part that rarely gets heard?", moves to the closing card as an optional "Add a quieter part" button. It asks only for the name, so the bare-"yes" follow-up is gone; "no" or "not sure" adds nothing. The part still joins small, at the edge.
- **Numbering:** Turn 4b is now Turn 4. Slice handoff docs keep the old numbers.
- This changes the script pinned in slices 2–3. The new lines are draft copy.

### 2026-10-16 — "What if…" only rearranges

- **Why:** a review found "How it is stays as it is" wasn't true. Removing a part in "What if…" removed it from "How it is" too, and "How it is"'s Undo couldn't bring it back (each mode has its own undo); only "What if…"'s Undo could.
- **Change:** in "What if…" a part can be moved and resized, nothing else. Rename, Not one of my parts, Clear what it said, and Remove this link appear only in "How it is"; in "What if…" a line points back there. Get to know it stays in both: it adds the person's words rather than changing the map.
- **Not taken:** the review's "Leave out of this What if" (a part absent from one experiment). Slice 1 ruled that out: wishing a part gone would rehearse exiling it, against the no-bad-parts principle. Making a part smaller and further away covers that wish. Presence stays global.
- The state model is unchanged; the rule is enforced where the map offers the actions. The new lines are draft copy.

### 2026-10-16 — Optional steps stay open

- **Why:** a review found several "Not now"s meant "never again this session", and the closing card's "Add a quieter part" meant "decide now or lose it". That's quiet pressure.
- **Experiment:** the app still invites once, on first entering "What if…". After that, "Try an experiment" stays in the "What if…" bar after a full run, as often as the person likes. Tapping it goes straight to "Take your time." because the tap is the permission. "Nothing's moved yet" now offers Keep trying or Finish without changes; before, the only way out of the trying bar was to move something.
- **Noticing:** still asks once per part. Its way out says "Skip this one" instead of "Not now". A snooze was not taken: it would bring an app-started question back uninvited.
- **Adding parts:** "Add a part" stays in the "How it is" bar after the conversation, until all 13 figures are used. It asks for a name; the part joins at the usual size at a starting spot. The closing card keeps "Add a quieter part" (small, at the edge, "rarely gets heard"): the question that surfaces quiet parts is worth asking once, and it's no longer the only way in.
- All new lines are draft copy.

### 2026-10-16 — The person has the last word on a part's figure; the second part is a question

- **Change figure:** JEV's pick reads meaning into a part, so a wrong one is a misreading the person should be able to fix as easily as a name. The part's box (in "How it is", like every identity change) offers the figures no other part has, as still thumbnails, and Undo changes it back. Each is labelled by what it looks like ("A figure holding a lantern"), never by a role. Removed parts keep their figures, so undoing a removal never shows two alike; new parts get a figure no part on the map has.
- **The second part:** "Sounds like another part has strong feelings about this one." stated a conclusion and said "part" before the person had. It's now "There may be another feeling here too. If it feels separate, what would you call it — or is it part of the same feeling?" The review suggested a separate "separate or same?" step first; not taken, because it adds a turn on that path, and people often find out whether a feeling is separate by trying to name it. A bare "separate" or "yes" gets "What would you call it?"; "same", "part of the same feeling" or "no" keeps one part.
- This changes the script pinned in slice 2. The new lines are draft copy.

### 2026-10-16 — The map explains itself; size has buttons

- **Why:** a review asked for a line explaining what size and distance mean, and visible size controls (the plus/minus keys are undiscoverable, and the round handle is an unlabelled 18px dot).
- **The centre is visible now.** The review's wording, "distance from the house", would have been untrue: closeness is measured from `MAP_CENTRE`, left of the house (so parts placed "close" in Turn 3 don't hide behind the card), and nothing on screen marked it. A soft pool of light now sits there from the moment the map is handed over, in both modes. It's as wide as "close" reaches, flatter so it lies on the grass.
- **The "How it is" hint says it:** "Size shows how much space a part takes up. Nearer the light, the closer it feels." It replaces "Arrange these as they feel right now." It's in the bar rather than on the closing card, so it stays.
- **[Smaller] [Larger]** on their own row at the top of the part's box, in both modes (size is what "What if…" is for), with the plus/minus keys' step; undoable, and disabled at the limits.
- The new lines are draft copy, and the light's strength is a first pass.

### 2026-10-16 — Names are quoted in every question

- **Why:** the comment at `script.ts:10` says names inside the guide's sentences are quoted, but Turn 2's toward-check and both Turn 3 wordings interpolated the name raw. Fine for "the worry", unreadable once a sentence-long answer became a name.
- **Change:** all three use `quoted()`. This changes the script pinned in slice 2; the new lines are draft copy.

### 2026-10-16 — The lantern judges; the curled feels

- **Why:** "not good enough", "feeling judged" and "shame" all picked the lantern — the critic who holds standards. But Turn 1 asks for the *feeling*, and the one who feels judged isn't the one judging. Moving one phrase would leave "feeling controlled" and "feeling like a failure" on the same trap.
- **Change:** inadequacy and shame words moved to curled's criterion; the lantern keeps judging, criticizing, correcting, pushing to do better, the inner critic, perfectionism, self-judgement and the harsh inner voice. The figure question now also says: when the name says how something feels, match the one who feels it, not the one causing it. Checked on twelve names before and after: the felt states moved to curled, the critics stayed on the lantern, and the Map, Defender and control names didn't move.

### 2026-10-16 — Naming answers are shortened to the name

- **Why:** an annoyed repeat ("as i've told you. not feeling good enough.") became the part's name verbatim — on the map and inside later questions.
- **Change:** reverses slice 2's "never extracts or trims" (invents is still banned). The model picks the naming phrase; the code accepts it only when it appears word for word, in one piece, in the answer — otherwise the answer is used as sent. It runs side by side with the figure call, so no extra wait. Short names come back unchanged; AI off or failing falls back to verbatim. Shortened names are tagged `extracted`, with the full answer as the source.
- The slice-2 handoff is updated (the flow, Behaviors §§2–3 and 5, Locked §§6–7, checks #1, #7 and #11), including its already-stale polarization lines.
- **No copies:** a review found that "honestly it's just the same as not feeling good enough", on the part 2 question, shortened to part 1's exact name: a duplicate part, and Turn 3 asking "Which feels closer — ‘not feeling good enough’ or ‘not feeling good enough’?" A shortening that copies a part on the map is never used. On the part 2 question it counts as "part of the same feeling" (no part 2, tagged `extracted`): not creating a part is the safe direction. When adding a part, the answer is used as sent. Duplicates the person types in full still render as-is (slice 3's rule).
- **Their spelling:** the code checks the model's phrase ignoring case and punctuation, so the stored name is now cut from the answer itself rather than taken from the model's copy.

### 2026-10-16 — The frustrated path reflects first

- **Why:** it was the only path that asked the next question without reflecting on the answer just given — "Frustrated with it." met "There may be another feeling here too." with no acknowledgement in between.
- **Change:** a new `toward` reflection turn (one sentence on how they feel toward the part) comes before the fixed line and the naming question. The fixed line stays: "it" in the naming question refers to it. If part 1 leaves while reflecting, the answer is reflected as Turn 3 instead. This changes the script pinned in slice 2; the new lines are draft copy.


### 2026-10-16 — The four-turn journey: every answer brings someone (planned)

- **Why:** trying the app, Turn 1 asked "Which feeling has been loudest lately?" right after the person had named it, and a session ended with one or two parts. The goal is 3–4 characters on the map in about four answers, standing in a way that says something true.
- **Shape:** each turn is a row of reviewed lines; JEV picks one from what's known so far, with today's line as the default. Rows only move forward. Not a tree: a tree of three versions over four turns is 40 lines, and later lines depend on what's known, not on the path taken.
- **Turn 1** confirms a feeling the free-write already named ("Would you call it ‘X’ — or something else?", their words, checked word for word) or offers their several feelings as buttons. **Turn 3** replaces "close or off to the side?" with "what else is here?": the free-write's other feelings as one-tap adds, or a quieter-feeling question, worded "standing in front of" when a part on the map guards or escapes. **Turn 4** invites dragging parts nearer the light.
- **Kind:** JEV sorts each part as guards, escapes, hurts or other, used only for its starting spot (guards near the light, hurts on the far ring) and Turn 3's wording. Never shown: the no-labels rule stands.
- **Retires:** closeness as a question (slice 3), the quieter part as closing-card-only (earlier today; the closing card keeps it too), and "nothing reads Turn 0 for map attributes" (slice 2).
- **Rive entrances come first**, one character at a time.
- Plan: [docs/four-turn-journey-plan.md](docs/four-turn-journey-plan.md). All new lines are draft copy.

### 2026-10-16 — Rive entrances in the app: the Critic first

- **Change:** the Critic's Rive walk plays in the app when a part gets the lantern, replacing the CSS walk-in for that figure (`src/ui/LanternWalk.tsx`; which figures enter on Rive is listed in `src/ui/riveEntrances.ts`). The rest follow one at a time. Reduced motion: no walk, the part appears.
- **Timing:** the next card now waits until every part has finished entering, reported by the landscape, instead of a fixed 2.6 s. A walk is capped at 5 s (`WALK_MAX_MS`): further than that from its edge, it starts on the map and fades in as it walks. Measured: on a phone, part 1 walks all the way from the edge in 4.3 s; on desktop it would need 5.7 s, and a part 2 from the right 19 s.
- **Handover:** the still figure fades in over the walk's last frame for 500 ms. The scene was built from a cleaned copy of the figure (no grass rim at the feet, the far leg evened), about 2% of the figure's pixels differ, all at the feet, and a straight swap showed it.
- **Not changed then:** parts named while the world waits still held until the waiting ended. With a longer walk, sending an answer to the next card grew to 10–13 s (changed the same day, below).

### 2026-10-16 — A part walks in while the guide thinks

- **Why:** with the Rive walk, sending a naming answer to seeing the next card took 10–13 s, because each step waited for the one before: risk check, then figure and name, then the reflection, then the walk.
- **Change:** after the risk check (which stays first, so nothing reads an answer before it's screened), the figure, the name shortening and the reflection that follows the naming all start together; the flow uses the early reflection when its turn comes. A part walks in the moment it's named, while the world is still waiting, instead of holding until the reflection arrives. This bends the input choreography's "the world waits, then one part walks". Each Rive entrance's scene loads once when the map first shows, so a walk starts at once.
- **Measured** (AI on): answer to next card 8.0 s on desktop (was 10.0), 7.5 s on a phone (was 13.3), 7.4 s for a part 2 from the right (was 11.0). One reflection call per naming, not two. The walk starts 20 ms after the part is named.
- **What's left:** the name shortening (Claude, 1.8–2.4 s) is now what the part waits for; the figure takes 0.2–0.25 s.

### 2026-10-16 — Curled peeks in, in the app

- **Change:** a part that gets Curled comes in on its Rive entrance: it peeks in from the edge, backs off, and comes the rest of the way in three slides. The Lantern's walk component became one for every Rive entrance (`src/ui/RiveEntrance.tsx`); each figure's route is in `src/ui/riveEntrances.ts`, the Lantern's from its gait and Curled's from its side plan.
- **Scale:** the map's later ten figures are their scene tiles shrunk to the same felt area (Curled to 77%). `scripts/app-figures.py` now writes those scales to `src/assets/figures/figure-scales.json`, and the entrance scales its canvas the same way about the figure's feet, so the last frame matches the still figure (0.2–0.4% of pixels off, against the Lantern's 2%).
- **Distance:** Curled takes 6.2 s however far it comes. Its three slides stretch to the screen up to 2000 artboard px in all; further than that they'd look yanked, so the part starts on the map and fades in as it peeks, like a capped Lantern. On desktop that happens to a part 2 from the right; a part 1 and every part on a phone come from the edge.
- **Measured** (AI on): answer to next card 8.9 s for a desktop part 1, 8.9 s on a phone, 8.4 s for a part 2 from the right, a second or so more than the Lantern, because its entrance is longer. The next card comes when Curled settles.

### 2026-10-16 — The Map walks its route in the app; the next card comes on arrival

- **Change:** a part that gets the Map walks its planned route on the map, with the stitched trail behind it. The route became a point in two dimensions, so the Map's legs fit the same component as the Lantern and Curled; each route also says which of the machine's inputs to set when (the Lantern's `arrive`, the Map's `check` and `arrive`), and may leave a trail. The trail is drawn in the part's figure box, so a part from the right gets it mirrored, and it fades as the Map arrives.
- **Cap:** at most four rocks over both legs (`ROCKS_MAX`). Its stop at the corner and its last check take 5 s whatever the route, so a part further away starts on the map and fades in, like the other two. On desktop a part 1 needed five.
- **The next card comes on arrival:** an entrance now reports when the figure stands on its spot, and the next card comes then, while it finishes settling (the Lantern 0.7 s, Curled 1 s, the Map 2 s, its last look at the map). Before, the card waited for the settle, which for the Map would have held it 2 s longer. The still figure still takes over at the very end.
- **Measured** (AI on): answer to next card 8.1 s for a desktop part 1 and 8.3 s for a part 2 from the right, with the Map arriving 6 s after it's named; on a phone 9.7 s, in a run where the name took 4.4 s to come back. Its last frame matches the still figure to 0.1–0.7% of pixels on desktop, 2.5% on a phone.

### 2026-10-16 — The Defender and the Sleeper come down from above, in the app

- **Change:** a part that gets the Defender floats down by parachute, and one that gets the Sleeper drifts down like a leaf, on their Rive entrances. The route takes the room above the part as well as across it, and a route can keep the shadow on the ground (gathering as the figure comes down) instead of under the feet. Each descent's plan now records how long its landing lasts (`landFrames`, from its gen-scene.py; the Pod's too), so the hand-over to the still figure waits for the Defender's canopy to collapse and fade, and the Sleeper's breath. The scenes regenerate unchanged.
- **Cap:** made for a larger figure, the drop would take 6–11 s at the app's sizes. A descent takes at most two swings and comes down at most twice as fast as its spike; further than that, it starts lower and fades in. On desktop that happens to the Sleeper, on a phone to the Defender.
- **Measured** (AI on): touchdown 6.0 s after the part is named (Defender and Sleeper, desktop and phone); the next card comes then, and the Defender's canopy collapses beside it for 3 s more. Last frames match the still figures to 0.0–1.2% of pixels.

### 2026-10-16 — Self-hug rocks in, in the app

- **Change:** a part that gets Self-hug rocks in from its side like a wind-up toy, glides to a stop and leans toward the space beside it, on its Rive entrance. It is the first side entrance with a gait that loops: the side route now loops whole rocks of `Approach`, as many as come nearest the gait's own travel, sets `arrive` during the last, and carries the glide out of it on at their speed, as the spike does. The Kaleidoscope's plan has the same shape, so it can use this route too.
- **Cap:** at most as many rocks as fit the Lantern's 5 s walk with the glide out of the last (four for Self-hug), covering at most half a rock more than they would at its own pace. Its feet slip anyway, so a rock fitted a little faster doesn't show. Further than that, it starts on the map and fades in. On desktop a part 1 starts just inside the map (20 px in), and a part 2 from the right fades in, like the Lantern. On a phone it comes from the edge in three rocks.
- **Measured** (AI on): it stands on its spot 4.9 s after it starts on desktop, 3.8 s on a phone, and 5.1 s as a part 2 from the right; the next card comes then. Its lean plays on under the card for 3.3 s more, and the still figure takes over 8.2 s after it started. Its last frame matches the still figure to 0.2% of pixels on desktop and 0.9–1.1% on a phone or mirrored. In these runs the name shortening took 3.0–6.0 s, so answer to next card was 6.8–11.1 s.

### 2026-10-16 — The Pod drops in, in the app

- **Change:** a part that gets the Pod drops in from just above the map on its Rive entrance, and its padding swallows the landing: a deep squash with no bounce, a hold, and a slow rise. Unlike the Defender and the Sleeper it falls rather than drifts, so it has a route of its own (`fallRoute`): it speeds up evenly to the one touchdown speed its squash was made for (20 artboard px a frame), over whole `Fall` cycles, and stops dead on touchdown, since `Land` has no flare. The descents' gathering shadow became a helper the two routes share.
- **Cap:** at most six cycles (2.4 s), which is what a desktop part 1 takes at its spike's pace (starting at a quarter of the touchdown speed). Falling further in the same time would mean speeding up too gently to read as a drop, so a longer fall comes into view already falling at up to half the touchdown speed; further than that, it starts lower and fades in, like the Defender on a phone. A phone part needs 3,600 artboard px and a desktop part 2 3,500, so both fade in.
- **Measured** (AI on): touchdown 2.3–2.5 s after it starts (desktop part 1, phone, part 2 from the right), and the next card comes then; its landing plays on under the card for 2.1 s. Its last frame matches the still figure to 1.1% of pixels on desktop, 0.4% for the part 2, and 2.8% on a phone, all a sub-pixel outline from the scene's breathing and resampling (no offset). Answer to next card was 4.9–8.8 s, with the name shortening taking 2.3–5.4 s.

### 2026-10-16 — The Stack and Ribbon come in, in the app

- **Change:** a part that gets the Stack tiptoes in from its side, stops, and catches its tower as it teeters; one that gets Ribbon pirouettes in on one foot, hops one last turn and lands balanced. Both are on their Rive entrances (mirrored for a part from the right). Their plans have Self-hug's shape, so they use the same side route with no new code beyond their entries, and their map figures are their scene tiles at full size (scale 1), so the canvas isn't shrunk.
- **Cap:** the same as Self-hug's: as many cycles as fit the Lantern's 5 s walk with the travel out of the last (twelve for the Stack, two steps each; eight turns for Ribbon), covering at most half a cycle more than they would at their own pace. Both are quicker over the ground than Self-hug, so they reach further in that time (1,212 and 1,398 artboard px). A desktop part 1 and every phone part come from the edge; a desktop part 2 from the right fades in.
- **Fix:** an entrance fitted exactly to the screen sometimes faded in as if capped. Fitting divides the distance by the cycles and multiplies it back, so the total could come out a rounding error short of the distance, and "total < distance" read as capped (about 6% of distances for Ribbon; it showed in the first desktop run). Every route (side, descent, fall) now fades only when its cap actually bites.
- **Measured** (AI on): the Stack stands on its spot 4.2 s after it starts on desktop, 2.6 s on a phone, 4.9 s as a part 2 from the right; Ribbon 4.3, 3.2 and 4.8 s. The next card comes then (0–0.1 s later), and the teeter plays on under it for 3.8 s, the wobble for 2.2 s. Last frames match the still figures to 0.1–0.6% of pixels on desktop and 1.5–2.3% for a part 2, an outline only; on a phone 3.2–3.8%, also an outline, because the headless canvas renders at 1× and is compared at 2×. Answer to next card was 5.0–9.0 s, with the name shortening taking 2.1–3.2 s.

### 2026-10-17 — A wave washes Shell ashore, in the app; entrances start on a frame

- **Change:** a part that gets Shell comes in on its Rive entrance (mirrored for a part from the right): waist-deep in a felt wave behind the crest, the wave crests as it stops, draws back the way it came and fades, and Shell settles onto the ground. Its plan has Curled's shape (no gait, all its travel stretched to the screen over the first 170 frames), so it uses the same side route. Its map figure is its tile at 80%, so the canvas is scaled to match; the canvas is 2.4 tiles wide, the wave reaching back behind Shell and the crest ahead.
- **Cap:** Curled's 2000 artboard px, kept: it is about Shell's spike's own pace on a 1280 px screen (1,990 px there). A desktop part 1 (about 1,510 px) and a phone part (about 1,120 px) come from the edge; a desktop part 2 from the right (about 5,040 px: it stands left of centre) fades in, like the other side entrances.
- **The card waits for Shell's feet:** the travel stops at frame 170 with Shell still afloat in a full wave; its feet touch down at 262 as the water goes. Its plan now carries `stands: 262` (written by its gen-scene.py; the scene itself rebuilt byte-identical), and the side route takes arrival from `stands` when a plan has one. So the card comes when Shell stands, as for every other figure, 1.5 s later than the travel alone would say; the end of the retreat and the fade play under it for 1.3 s.
- **Fix:** every Rive entrance skipped its start by however long the page had gone without drawing before it began. Rive's `play()` times its first frame by `document.timeline.currentTime`, the last frame the page drew, so the next frame reported all the time since: 0.77 s for Shell in headless Chrome when 98 ms had passed, which put its wave a third of the way in at its first frame. `RiveEntrance` now starts its clock and calls `play()` inside a `requestAnimationFrame` callback, where that time is current. In a real browser the busy time is shorter, but not zero.
- **Measured** (AI on, headless Chrome, no screenshots): Shell stands on its spot 4.42–4.49 s after it starts on desktop, 4.42–4.44 s on a phone and 4.55 s as a part 2; the next card comes 0.06–0.2 s later, and the still figure takes over at 5.7–6.4 s. Its last frame matches the still figure to 0.76% of the figure's pixels on desktop, 1.14% for a part 2 and 2.75% on a phone (a 112 px figure), an outline with no offset. (These comparisons map the canvas to the page with separate x and y scales, since its backing size is rounded; one scale put a false 1 px offset on Shell. They are a share of the figure's pixels and read higher than earlier entries' figures for the same entrances: Curled is 0.45%.) The other nine, re-run on desktop after the fix, all arrive, hand over and raise no errors; a before/after on the Stack (5.0–5.1% both ways) and the Map (3.9% before, 4.1% after) shows the handover unchanged, while one Stack run before the fix stood on its spot at 3.50 s against 4.25–4.36 s after, the skip it no longer takes. Answer to next card was 7.8–11.4 s (the AI calls vary; the entrance starts 3.3–6.9 s after the answer); the name shortening took 2.7–2.9 s and the entrance waits for it.

### 2026-10-17 — The Kaleidoscope backs in, in the app

- **Change:** a part that gets the Kaleidoscope backs in from its far edge on its Rive entrance (mirrored for a part from the right, so it backs in from the map's left instead): still looking up through its scope and leaning back, it stops short with a small bump and keeps looking. Its plan has Self-hug's shape (a looping gait), so it uses the same side route, which now also runs from the right: the canvas travels the same distance the other way, and the room is measured from the far edge with the figure's left reach. From the near edge it would face the way it walks; backing in from the far edge keeps it backwards on both sides and lands its last frame on the still figure. The scene is unchanged.
- **Cap:** at most three slow rocks (as many 72-frame rocks as fit the Lantern's 5 s walk), covering at most half a rock more than they would at its own pace of 150 artboard px. The far edge is further on every screen, so it always starts on the map and fades in. The bump stops it at frame 26 of `Enter`, and the next card comes then; the jolt springing back plays under the card for 1.8 s.
- **Measured** (AI on, headless Chrome, no screenshots): it stands on its spot 3.8–4.1 s after it starts (desktop part 1, phone, part 2 from the right), and the still figure takes over about 6 s after it starts. Its last frame lines up with the still figure with no offset; the felt grain shimmers at the pixel level, as it does for Self-hug on the same full-resolution comparison (13.5% of crop pixels over a threshold of 12, against 16.7% for Self-hug — a harsher metric than last session's shares, so they don't compare across sessions). The Map, Self-hug and Shell, re-run on desktop after the shared-route change, and the Lantern, Stack, Ribbon, Pod and Sleeper, drawn across five AI-off runs, all arrive, hand over and raise no errors. Answer to next card was 7.2–9.8 s (the entrance starts 3.0–5.2 s after the answer).

### 2026-10-18 — The Sprout rises out of the ground, in the app

- **Change:** a part that gets Sprout now uses its Rive rise in the app. It is the first entrance that happens wholly on the final spot: the route returns zero movement while the scene heaves up a felt mound, brings the folded leaves through it, opens them, lets the Sprout gather and pop out into a hop, sinks the mound and bows the figure toward its flower. The page follows the scene's keyed shadow, widening and shifting it under the mound, then gathering it to the Sprout. A part from the right mirrors the whole scene as usual.
- **Arrival and handover:** the generated plan now records `stands: 108`, when the hop lands. That reports arrival while the mound sinks and the bow plays on; `riseFrames: 222` ends the entrance after 3.7 s of Rive time, when the still figure fades in. The Rive project itself is unchanged apart from that plan field and rebuilds cleanly.
- **Measured** (deterministic local AI responses, headless Chrome, no screenshots for timing): on a desktop part 1, a phone and a mirrored part 2, arrival was reported 2.0–2.2 s after the part appeared, including scene setup; the next card appeared 2.2–2.6 s after it, and the still figure took over 3.9–4.1 s after it. Visual captures at each stage show the mound and figure at the right map scale; the Rive and still boxes coincide exactly and the handover has no visible offset. Reduced motion has no Rive entrance. One separate AI-off run reached the closing card; the unchanged `?sprout` spike also completes. No errors in the clean timing runs, only the pre-existing Rive inputs deprecation warning.

### 2026-10-19 — Turn 1 follows what was already said

- **Change:** after Turn 0 passes the safety check, JEV reads its form
  (`one_feeling`, `several_feelings`, `situation`, `little`) while Claude
  lifts up to four candidate feeling names. The browser accepts a phrase
  only when it finds the same words in one contiguous run in the free-write,
  at the name length cap. One feeling is confirmed; several are tap choices;
  weak, contradictory or failed readings keep the old question.
- **Calibration:** `scripts/calibrate-turn1.ts` runs the app's exact JEV
  question over 72 messy made-up free-writes. It read 71/72 as intended,
  with no several-feeling answer collapsed into one. The only miss scored
  0.56, so the 0.70 action threshold sent it to the default row.
- **Ownership and speed:** a confirmed or tapped phrase keeps Turn 0 as its
  source and the Turn 1 answer as confirmation. Because its name is already
  verified, it skips Claude's name-shortening call; typed alternatives keep
  the existing extractor. AI-off keeps the old question.
- **Reflection:** the Turn 1 reflection receives the exact next card and
  its choice labels, so it reflects context without naming the choices just
  before they appear.
- **Checked:** adaptive one- and several-feeling paths in the browser, four
  choices at 390×844, full runs to closing with AI on at desktop width and
  AI off at phone width, 27 tests, lint and production build. No browser
  errors; the existing bundle-size warning remains.

### 2026-10-19 — A part's hidden kind chooses its starting ring

- **One wait, two readings:** `/api/figure` now asks JEV for the figure and
  a hidden `guards` / `escapes` / `hurts` / `other` kind in one System One
  request. The two results fail independently; name extraction still runs
  beside them as before.
- **Placement:** confident guards begin on the close ring, escapes on the
  middle ring to the side, and hurts on the far ring. `other`, a result
  below 0.70, an unavailable result, and `?ai=off` use the previous neutral
  spots. A quieter part still starts small at the edge regardless of kind.
  The kind and its confidence are kept in provenance and conversation
  state, but never shown, narrated, or sent to a reflection. A later figure
  change does not change it.
- **Card clearance:** the first desktop check put the close point under the
  card. The close candidates now use the left arc of the same ring, where
  the figure and its name remain visible on desktop and phone.
- **Calibration:** `scripts/calibrate-kind.ts` sends 40 critic/planner,
  escape/numbing, hurt/fear, and playful/creative examples through the
  exact combined request. It read 40/40 as intended, with no confident
  wrong placements; median response was 273 ms and slowest 441 ms.
- **Checked:** all four starting outcomes on desktop, guard and AI-off
  fallback at 390×844, complete entry journeys to closing with AI on and
  off, 31 tests, lint, and production build. No browser errors; the existing
  bundle-size warning remains.

### 2026-11-02 — The story redesign: Option A

- **Picked:** Option A from `docs/redesign/story-redesign.md`, one story in
  three acts (who came, getting to know one, one "what if"), with Option B
  as the shape of later visits. The goal: someone carrying something heavy
  spends about ten minutes, leaves with a landscape that feels true and one
  part they understand better, and has a reason to come back.
- **Fears question:** stays behind "Skip" until an IFS-trained therapist
  has reviewed it.
- **Hedge:** the "one way to see this" line comes off the name labels; the
  guide's own lines keep their tentative wording.
- **Saving:** the meadow is saved on the device, with no account.
- **Order:** Turn 3 first, then arrivals the card never covers, Act 1's
  close, Act 2, Act 3, the ending's picture, saving, and removing the modes,
  top bar, map note and closing card (the redesign doc has the full list).

### 2026-11-02 — Turn 3 asks who else is here

- **Change:** the closeness question is gone (client, `/api/centrality`,
  its JEV prompts and its parser). Turn 3 now offers the feelings the
  free-write named that aren't on the map yet, as buttons copied from the
  person's words, with "No one else" beside Send. With none left over, it
  asks about a quieter feeling, naming a part on the map that guards or
  escapes when there is one, with "I don't think so" beside Send.
- **One answer, one part:** a tap, a typed leftover or a new name brings
  one part in at its kind's starting spot; a quieter feeling arrives small,
  at the edge, rarely heard. A typed name replaces the plan's "Something
  else…" button. A name already on the map adds nobody. The closing card
  offers "Add a quieter part" only when Turn 3 didn't add one.
- **Already on the map:** a free-write phrase isn't offered when a part's
  name covers it, comparing only the words that tell feelings apart: ‘the
  one who wants to hide’ covers "wants to hide under the covers". The real
  AI run offered exactly that duplicate before this rule. A typed name is
  still taken as the person wrote it.
- **Placement:** a ring's spots sit close together, so a third part landed
  on top of the first. A new part now needs 0.12 of clearance from every
  other part; when its ring has none, it takes the clearest of two spare
  spots low on the meadow, clear of the card on phone and desktop. This
  also separates two guarding parts.
- **Position words:** with closeness no longer asked, the summary speaks
  about a part's place only after the person moves it.
- **Checked:** with every AI route answered by a script in the browser (no
  model calls): a tapped leftover, a typed leftover, a new name, "No one
  else", the quieter question with a guarding part, "I don't think so",
  `?ai=off` and `?jump=after`, at 390×844 and 1440×900. Every run reached
  the closing card with the right parts and no page errors. Then one run
  with real AI at 390×844 (approved): it found the duplicate above, and
  why Turn 1 shows no buttons for the pusher/hider free-write (a lifted
  phrase over the 40-character name cap; see the board). Build and lint
  pass.
- **No tests:** `src/conversation/flow.test.ts` is deleted, per the
  project rule; `src/model/landscape.test.ts` predates the rule and stays.

### 2026-11-03 — The card steps back while a part walks in

- **Change (Option A step 2, frame A03):** when a part is named, the card
  fades out and a small "One moment…" waits in the sky until the part
  stands on its spot and the next card is ready. On a phone the field lets
  go of focus, so the keyboard goes down and the meadow is clear; the next
  question's field takes one tap. Answers that bring no one keep the
  ghosted card, and the keyboard, as before.
- **Spots:** every starting spot is on the open meadow: below the sky on
  a phone (the card floats there) and left or right of the card on a wide
  screen. Moved: escapes (0.42, 0.42) and (0.42, 0.86), hurts (0.12,
  0.44), and the second neutral spot (0.36, 0.8). Guards moved 0.03 left
  so a large part 1's arms clear the desktop card. Hurts now starts at
  (0.16, 0.8): at (0.08, 0.76) a large part 1 was cut off by the edge.
- **Spacing:** clearance is measured between columns (a figure above its
  spot and its label below, by size), not between spots, so a new part
  doesn't stand on a large part's label.
- **Checked:** scripted AI answers in the browser (no model calls), six
  paths at 390×844 and 1440×900, sampling every arrival: the bar showed
  and the card was fully hidden throughout, focus left the field, and the
  next card took it back. No question card covered a part. Known left:
  the closing card on a phone (replaced next) and label crowding with
  three parts on one side.

### 2026-11-03 — Act 1 closes with who came

- **Change (Option A step 3, frame A06):** Turn 4's question and its
  typed corrections are gone, and so is the closing card. After Turn 3's
  reflection the guide says "These are the ones who came." ("This is the
  one who came." for one part) with a single "Go on". Go on hands the map
  over: the top bar and the summary note arrive then, as before. With
  nobody on the map, the early close stays.
- **Removed:** the corrections route (`/api/corrections`, its prompt,
  schema and parser), `corrections.ts`, the confirm, closing and unheard
  steps, the wish, "No changes" and "Add a quieter part". Turn 3's quieter
  question is now the one place a rarely heard part is asked about; "Add a
  part" stays in the bar. The "What if" invite no longer quotes a wish.
- **Why:** Option A's Act 1 ends on a picture of who came, not a report to
  check. Fixing the map in words was the stitched-on part of the journey;
  Act 2 and Act 3 do that work by touch.
- **Checked:** scripted AI answers in the browser (no model calls), the
  same six paths at 390×844 and 1440×900: every one reached "These are the
  ones who came.", Go on brought the bar and the note, and "What if…"
  opened its invitation without a wish. No page errors. Build and lint
  pass. Known left: after the hand-over on a phone, the bar shrinks the
  map and three labels crowd (the bar goes in step 8).

### 2026-11-03 — Act 2: sit with one

- **Change (Option A step 4, frames A07–A11):** Go on no longer hands the
  map over. The guide asks "Which one would like your attention first?"
  ("Tap one. The others can wait for another time.") and the figures are
  the buttons: offered parts ring, the rest soften. A tap moves the camera
  to that part, the others soften and lose their names, and the next card
  waits until the camera arrives. Then its words ("If ‘X’ had words…"),
  which come out of the figure as speech; what it might be trying to do,
  shown under it; and "Would you like to thank it?" with Not yet / Thank
  it. Thank it makes the part glow, brightly up close for a moment, then
  softly for the rest of the visit. The camera steps back and the map is
  handed over (the bar and note, until Act 3 replaces them).
- **Who is offered (agreed 2026-11-03):** not a part read as hurting, and
  not Turn 3's quieter part, until an IFS-trained therapist has said how to
  meet them. With nobody to offer, Act 2 is skipped. With one, the line is
  "Would ‘X’ like a little of your attention?"
- **Fears:** built, with Skip, but off. The redesign doc puts the
  therapist review before Fears ships, so it shows only with `?fears`, to
  try it or show it to the reviewer. Its answer stays in the record, not on
  the map. The server has a fears reflection prompt.
- **Ways out:** the first question gets a quiet "Not now" (the frame had
  none; every question in the app has a way out). Not now, That's enough
  for now and Not yet all end the sitting the same way.
- **Get to know it** on a selected part, after the hand-over, plays the
  same scenes, thanks included. The part's box closes as the camera moves.
- **Camera:** the world and parts sit in one layer the camera zooms, never
  the card. It zooms closer for smaller parts (1.4–1.8 on a phone, where
  the part comes to the middle of the meadow under the card's sky;
  1.25–1.6 on a wide screen, where it stays on its own side, beside the
  card), and never past the meadow's edges. Reduced motion cuts straight
  there. The speech is drawn over the layer, so the zoom never scales the
  text, and keeps clear of the card and the edges.
- **Checked:** scripted AI answers in the browser, nine paths at 1440×900
  and 390×844: thank, Not yet, Not now, hurting part held back, quieter
  part held back, nobody to offer, AI off, Fears answered and skipped, and
  Get to know it after the hand-over. Every path ended with the camera
  back and the map handed over, with no page errors. Build and lint pass.
  One slip: the first phone run's `?jump=after` path wasn't routed to the
  script, so its two answers reached the real AI (two Claude reflections,
  two moderation and two JEV risk checks, on made-up text). Every path is
  scripted now.

### 2026-11-03 — Turn 1's phrases are short names

- **Change:** the phrase lifter's prompt asks for the fewest words that
  still make the feeling recognizable (usually two to five), without
  lead-ins like "I'm" or "part of me says", and for two feelings in one
  stretch to come back as two phrases. Its example is made up, not the
  free-write that failed.
- **Why:** the real run of 2026-11-02 lifted "I'm not good enough and
  should push harder" (42 characters, two voices in one), over the
  40-character cap, so only one phrase survived and Turn 1 showed no
  choices.
- **Check:** `npm run calibrate:turn1 -- phrases` runs the lifter on the
  18 several-feeling free-writes plus that one, through the app's own
  phrase check (now `verifiedPhrases` in `checks.ts`, shared by the app
  and the script). 19 of 19 keep two or more phrases; none is over the cap
  or not word for word. The failing free-write now gives ‘not good
  enough’ · ‘should push harder’ · ‘wants to hide under the covers’. 19
  Claude calls, approved.

### 2026-11-03 — Act 3: step back, one "what if"

- **Change (Option A step 5, frames A12–A13):** after Act 2 (or straight
  after Go on, when Act 2 has nobody to offer), the guide says "Step back
  and look at all of them." and "Does anyone want to be somewhere else, or
  take up more or less room?" with one button, "That's how it is". Moving
  and resizing live here, in "How it is"; once something has changed, an
  Undo sits on the card. With one part: "Step back and look at it." and
  "Does it want to be somewhere else, or take up more or less room?"
- **Dusk:** "That's how it is" turns the light to the "What if…" evening
  and the curtains go. One "what if": "What if ‘X’ had a bit more room?"
  and "Move it, and notice what shifts.", with Go back / Keep it. ‘X’ is
  the smallest part Act 2 could offer (agreed 2026-11-03), marked with its
  ring, as long as another part is bigger. Otherwise: "What if things sat
  a little differently?" and "Move anyone, and notice what shifts.", or,
  with one part, "What if ‘X’ sat a little differently?" and "Move it, and
  notice what shifts."
- **Go back / Keep it:** Go back clears the "what if" and the meadow
  returns to how it was. Keep it makes the "what if" how it is; one Undo
  in the bar takes it back. Either way the walk ends and the map is handed
  over (the bar and note, until the ending's picture and step 8 replace
  them). The record keeps "that's how it is" and what was kept or that
  they went back.
- **The experiment's invitation:** Act 3 is it, so the first visit to
  "What if…" afterwards doesn't invite again. A walk that never reached
  Act 3 (the safety pause) still gets the invitation.
- **Checked:** scripted AI answers in the browser (no model calls), ten
  paths at 390×844 and 1440×900 and two with reduced motion. Each one
  dragged a part at the step back and undid it from the card, hid the
  curtains at dusk, marked the named part (or asked the open "what if"
  when there was none, or one part alone), resized it, then kept it (the
  size stayed) or went back (it returned). The bar came after, "What if…"
  didn't invite again, and Get to know it after the hand-over ended
  without Act 3. No page errors; build and lint pass. On desktop the
  card's box touches a large part's transparent edge beside it (the
  board's "card covers the selected part's box" item).

### 2026-11-03 — The ending: a picture to keep

- **Change (Option A step 6, frame A14):** Go back or Keep it no longer
  hands the map over. The dusk stays on, the meadow rests under a veil,
  and the guide says "Thank them for showing up. They'll be here when you
  come back." (with one part: "Thank it for showing up. It'll be here when
  you come back.") with Done / Keep this picture. Beside the card, a little
  tilted, lies the picture: above the card on a wide screen, below it on a
  phone, where the card floats in the sky. Done turns the light back to
  day and hands the map over (the bar and note, until step 8).
- **The picture:** a postcard of the meadow at dusk with everyone where
  they stand, a part they thanked still glowing; under it their names, left
  to right as they stand; the words of the part they sat with ("…" and
  "might be trying to: …", the app's own label); and the date in the
  device's language. With Act 2 skipped, names only. It's drawn on a canvas
  from the map (`src/ui/picture.ts`), not from the screen, so it's the same
  on any device and needs no new library; what's on screen is the image
  that's kept.
- **Figures in the picture:** the picture is a 4:3 view of the plate. A
  part keeps its place across and its feet keep their distance from the
  hills; a phone's figures, sized to its narrow width, are drawn at no less
  than 75% of a wide screen's size, and feet never land on the hills.
  (A first try sized them from the tall screen as they were, so a large
  part stood on the far hills like a giant.)
- **Keeping it:** on a phone (a coarse pointer that can share files) Keep
  this picture opens the share sheet, where Save Image is; elsewhere it
  downloads `meadow-YYYY-MM-DD.png`. The picture never leaves the device
  otherwise. The record notes "picture kept" and "done".
- **Until step 7:** "They'll be here when you come back" isn't true yet
  (nothing is saved, so a reload loses the meadow). Step 7 makes it true.
- **Checked:** scripted AI answers in the browser (no model calls), seven
  paths at 390×844 and 1440×900 and one with reduced motion: Keep it and
  Go back, one part ("Thank it…"), no words (Not now, and Act 2 skipped),
  AI off, and the dev jump. Each showed the picture inside the screen and
  clear of the card, kept `meadow-2026-11-03.png` (the download path), and
  Done brought the bar back with the veil gone. No page errors; build and
  lint pass. The share-sheet path hasn't run yet: headless Chrome on Linux
  can't share files, so it needs a real phone.

### 2026-11-03 — The meadow is saved, and a later visit opens on it

- **Change (Option A step 7, frame A15; the three choices agreed
  2026-11-03):** from the ending on, the meadow is saved in this browser's
  storage (no account), and every later change in "How it is" is saved
  too. Opening the app again shows the meadow as it was left, with
  "Welcome back. Who's around today?": the parts to sit with as buttons
  (their figures ring and can be tapped too), Not now, Someone new, and a
  quiet Start over. "They'll be here when you come back" is now true.
- **What's saved:** the parts still on the map (names, figures, places
  and sizes in "How it is"), the thread between two, and each part's words.
  Not the free-write, the other answers or the record. Two hidden facts go
  with the parts, so a later visit is as careful as the first: a part read
  as hurting, and Turn 3's quieter part, aren't offered (the same rule as
  Act 2, until the therapist review). A save that can't be read is ignored,
  and the visit starts with the free-write.
- **A later visit is a short Act 2, then the ending:** a part, then its
  words, what it might be trying to do and a thanks, then "Thank them for
  showing up…" and the picture. No Act 1 or Act 3. New words replace the
  old ones. Someone new asks "What would you call the one who's here
  today?", the part walks in ("‘X’ is here now."), and they sit with it; if
  it's read as hurting, the ending comes straight after it arrives. Not now
  hands the map over.
- **Start over** asks once ("Start over with an empty meadow? This one
  will be gone for good.") and then clears the save and starts a new walk
  with the free-write. Removing every part also forgets the meadow.
- **In the code:** `src/conversation/saved.ts` reads and writes the save;
  `startReturning` in `flow.ts` seeds the conversation with the saved
  parts (so new parts get new ids and figures). The dev jump neither loads
  nor saves.
- **Checked:** scripted AI answers in the browser (no model calls). Each
  path played a first visit, then reloaded on the same browser: the map
  came back the same, the welcome held back the hurting and quieter parts,
  and the bar waited. Then: sitting with a part (the ending followed, no
  Act 3; its new words were saved), someone new (it walked in, they sat
  with it, it was saved), Not now on its name (back to the welcome) and a
  new part read as hurting (straight to the ending), Not now (the map
  handed over), and Start over with nobody to offer (one confirm, then the
  free-write, the save gone after a reload). Six paths at 390×844 and
  1440×900, and AI off, the dev jump and Fears re-run for the first visit.
  No page errors; build and lint pass.

### 2026-11-03 — No modes, top bar or map note

- **Change (Option A step 8, the redesign doc's "Everything on screen
  after closing" table, agreed 2026-11-03):** after the walk the meadow
  has no menu. Cut: the How it is / What if… switch with the bar's title
  and hint, Try an experiment (and its invitation, "Take your time" and
  "What was that like?"), Start over from how it is, the summary note on
  the map, Add a part (Someone new on a later visit replaces it), and Get
  to know it. The rose curtains went with the mode.
  "What if" is now only Act 3's beat at dusk.
- **Kept, on the part:** tap the name to rename it; Smaller / Larger (and
  the handle, the arrow keys, plus and minus); a small "…" opens Change
  figure, Not one of my parts and, when it has words, Clear what it said.
  At dusk the box has only Smaller / Larger. (The redesign's table cut
  Clear what it said in favour of Undo or editing the words in place, but
  Undo can't take back words the conversation gave, and editing in place
  isn't built; Codex's review caught it, so it stays behind the "…".) Remove this link stays on the knot (not at dusk).
- **Undo** sits in a corner after the walk, only while there's something
  to undo: the sky's top-left, not the bottom as first planned, because on
  a phone the bottom corners hold the names of the parts standing there.
  It steps aside while a card is up (a noticing card floats in that sky on
  a phone) and while a removal's notice, with its own Undo, shows. Act 3's
  card keeps its own Undo.
- **Labels:** "one way to see this" is gone from the names and the link's
  label (on screen and for screen readers). The guide's lines keep their
  tentative wording.
- **Noticing** stays as it was; asking only about a real change is still
  its own board item.
- **In the code:** the flow lost its invite, trying, nothing-moved and
  experiment steps, and the server its experiment reflection; `ModeBar`,
  `MapNote` and the curtains are deleted. The model keeps both layouts,
  because Act 3's dusk is the "what if" one.
- **Checked:** scripted AI answers in the browser (no model calls), the
  first walk on six paths at 390×844 and 1280×800, two with reduced
  motion, and the saved meadow's later visit on three. After the ending:
  no bar, note, curtains or mode buttons; no "one way to see this" on
  screen or for screen readers; Undo in the corner. On a part: rename by
  its name, Change figure and Not one of my parts behind the "…", each
  undone (the corner Undo, or the removal notice's while the corner one
  steps aside). At dusk the box had only Smaller / Larger. A drag after
  the walk still brought a noticing card, with the corner Undo away until
  Skip this one. No page errors; build and lint pass.

### 2026-11-03 — A test link on the VPS, and Muse Spark writes the words

- **Change (the user's choice):** the five-person test runs on an
  unlisted link, ifs.gergobalogh.me, on the VPS. Caddy serves the built app;
  `server/serve.ts` serves the AI routes on 127.0.0.1:8785 as a user
  service ([deploy/README.md](deploy/README.md)). No login; kept out of
  search engines.
- **Muse Spark instead of Claude** for the reflections, names and phrases,
  because it's cheaper: when `META_API_KEY` is set, those three go to
  Meta's Model API (`muse-spark-1.3`, its OpenAI-compatible chat
  completions, low reasoning effort). The standard model, never a
  "contributor" one, which is cheaper because Meta may train on what's sent.
  Claude stays the fallback on the laptop. JEV and OpenAI moderation are
  unchanged. Muse's wording hasn't been checked against the reflection
  checks yet.
- **Limits:** the routes have no login, so each visitor gets 200 AI calls an
  hour and the site 2000 a day (a walk takes about 30); over a limit the
  app carries on with its fixed lines.
- **Checked:** against a stand-in for Meta's API (no model calls): the
  request shape, a JSON answer in a code fence, a 503 without the safety
  keys, and the limit's 429. The app builds on the VPS.
