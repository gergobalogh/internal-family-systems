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
