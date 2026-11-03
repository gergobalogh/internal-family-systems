# How the app works

What a person sees and does, from the first question to the experiment.
The exact wording lives in `src/conversation/script.ts` (the guide's
lines) and `src/ui/copy.ts` (buttons and labels). Lines from slice 4 on are
still draft.

## The screen

One scene, no pages. A meadow under a big sky with a small house on the
horizon. The conversation is a single glass card (under the house on
desktop, above it on a phone). Parts appear on the meadow as felt figures.

```
 +--------------------------------------------------------------+
 |  [How it is | What if…]                           [Undo]     |  <- only after the
 |                                                              |     conversation ends
 |        ~ clouds drift ~               ~                      |
 |                         _/\_                                 |
 |                        |[] |  house                          |
 |              +--------------------------------+              |
 |              |  reflection on the last answer |              |
 |              |  the next question             |  glass card  |
 |              |  [ your answer.............. ] |  (one at a   |
 |              |                       [Send]   |   time)      |
 |              +--------------------------------+              |
 |    (PART 1)                                                  |
 |     big                (PART 2)                   (part 3)   |
 |  ‘the worry’          ‘the critic’               small, edge |
 |  ,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,, |
 +--------------------------------------------------------------+
```

Each part's figure is picked from your words (‘the worry’ gets the Map,
which plans every turn; ‘the one who yells’ the Defender, who steps
forward to protect), and no two parts share one. There are 13 figures, one
per character in `docs/character-entrances.md`. The pick is an
interpretation, so you can change it: "Change figure" in the part's box.

That same quick reading privately chooses only the part's opening place:
something keeping watch or pushing starts near the meadow's light;
something getting away starts on the middle ring, off to the side; and
something carrying pain starts further out. Playful, creative, unclear,
low-confidence and AI-off readings keep the neutral starting places. These
labels are never shown or narrated. The starting place is not treated as
the person's answer, and changing a figure does not change it.

No transcript is kept on screen: one question at a time. Past answers live
on as the map itself (names, sizes, places), and the map is where you fix
them.

## The whole journey

```
 START ─► 1. ENTRY CONVERSATION (the app asks 4 questions, then checks the map)
           │   each answer: card fades to a ghost → the world "waits"
           │   (light breathes, clouds drift), and a part named meanwhile
           │   walks in while the guide thinks: the card steps back to a
           │   small "One moment…" in the sky and a phone's keyboard goes
           │   down, so the whole meadow is clear → next card with a short
           │   reflection + the next question
           │
           ├─ Turn 0  "In your own words, what's weighing on you right now?"
           │            nothing appears yet: the app only reflects
           │
           ├─ Turn 1  one feeling already named → "Would you call it ‘X’
           │            — or something else?"
           │          several named → "Which of these has been loudest
           │            lately?" with their phrases as buttons
           │          otherwise → "Which feeling has been loudest lately
           │            — what would you call it?"
           │            ─► PART 1 walks in, LARGE, named for the naming
           │               words in Turn 0 or the naming answer (only
           │               word-for-word copies are accepted), as the felt
           │               figure JEV picks for it; the same request gives
           │               it a hidden kind-based starting place
           │
           ├─ Turn 2  "And how do you feel toward ‘X’ — curious about it,
           │            frustrated with it, or something else?"
           │            ├─ frustrated ─► one sentence on how you feel
           │            │                 toward it, then "There may be
           │            │                 another feeling here too. If it
           │            │                 feels separate, what would you
           │            │                 call it — or is it part of the
           │            │                 same feeling?"
           │            │                 ├─ a name ─► PART 2 walks in, a
           │            │                 │  "pulling in different directions"
           │            │                 │  thread links the two
           │            │                 ├─ just "separate" / "yes" ─►
           │            │                 │  "What would you call it?"
           │            │                 └─ "same" / "no" ─► one part
           │            └─ otherwise  ─► straight on with one part
           │
           ├─ Turn 3  who else is here?
           │            ├─ the free-write named feelings not on the map yet
           │            │  ─► "You also mentioned these. Are any of them
           │            │      here too?" + a button for each, copied from
           │            │      their words                  [No one else]
           │            │      a tap or a typed name ─► PART 3 walks in
           │            └─ otherwise ─► "Is there a quieter feeling ‘X’
           │               might be standing in front of?" (‘X’ guards or
           │               escapes) or "Is there a quieter feeling here,
           │               one that rarely gets heard?" [I don't think so]
           │               a name ─► a small part walks in at the edge
           │
           └─ Act 1's close (frame A06): a reflection on Turn 3's answer,
                        then "These are the ones who came."   [Go on]
                        (Turn 4's summary question and the closing card
                        are gone, 2026-11-03: the map is changed by hand)
                                    │
                                    ▼
          2. ACT 2: SIT WITH ONE (frames A07–A11; see "Sitting with one")
             "Which one would like your attention first?"     [Not now]
             the figures are the buttons; a part read as hurting, and
             Turn 3's quieter part, aren't offered (until a therapist has
             reviewed it); with nobody to offer, Act 2 is skipped
             ─► the camera goes to it: its words, what it might be trying
                to do, a thanks
             ─► the camera steps back; the top bar appears; the summary
                stays on the map as a note, and keeps itself true as you
                move things (until Act 3 is built)
                                    │
                                    ▼
          3. THE MAP IS YOURS (you lead; the app asks only when invited)
             │
             ├─ drag / resize / rename / remove any part, undo anything
             ├─ Add a part ............... from the bar, in "How it is"
             ├─ A. Get to know it ........ select a part, you start it
             │                              (the same scenes as Act 2)
             ├─ B. Noticing ............... after you move a part in "How it is"
             └─ C. The experiment ......... the first time you open "What if…",
                                            then any time from the bar

          SAFETY, everywhere: every typed answer is checked first (see below)
```

## The two maps

```
   [ How it is ]                          [ What if… ]
   the meadow by day                      the same meadow at dusk,
   "Size shows how much space a           framed by rose curtains
    part takes up. Nearer the light,      "Try a different arrangement.
    the closer it feels."                  How it is stays as it is."

   bar: [Add a part]                      bar: [Try an experiment]
                                          [Start over from how it is]

   Both show a soft pool of light on the meadow, left of the house: the
   point "close" and "off to the side" are measured from. It appears
   when the map is handed over.

   Each mode keeps its own places and sizes, and its own undo.
   Names, removals, links, voices and intents are shared by both, and
   only "How it is" changes them: in "What if…" you move and resize,
   nothing else, so an experiment can't change the current map.
```

## Selecting a part

Tap or click a figure. Move it by dragging or with the arrow keys. Change
its size with [Smaller] [Larger], the round handle by its feet, or plus and
minus.

```
                 (THE WORRY)
   +-----------------------------------------------------+
   | the worry · one way to see this                      |
   | “you're going to mess this up”          <- its voice |
   | might be trying to: keep me from failing <- intent   |
   | [Smaller] [Larger]                    <- both modes  |
   | [Get to know it] [Rename] [Change figure]            |
   | [Not one of my parts]        [Clear what it said]    |
   +-----------------------------------------------------+

   Change figure opens the figures no other part has, still,
   with [Keep this one]. Undo changes it back.

   in "What if…" the same box has only [Smaller] [Larger],
   [Get to know it], and "To rename or remove it, go back to How it is."
```

Selecting the knot on a "pulling in different directions" link offers
[Remove this link] in "How it is", and the same pointer back in "What if…".

## A. Sitting with one: Act 2, and Get to know it (you start it)

Tapping a figure at Act 2's first question, or [Get to know it] on a
selected part after the hand-over, plays the same scenes. The camera goes
to the part (closer for a smaller one), the others soften and lose their
names, and the next card waits until the camera has arrived.

```
   card 1   "If ‘the worry’ had words, what would it say?"
            [Not now]                                 [Send]
               │ your answer is kept word for word as its voice,
               │ and comes out of the figure as speech
               ▼
   card 2   short reflection ("It sounds like ‘the worry’ tells you…")
            "What might ‘the worry’ be trying to do for you?"
            [That's enough for now]                   [Send]
               │ kept word for word as its intent, shown under the
               │ figure ("might be trying to: …")
               ▼
  (card 3   only with ?fears, until an IFS-trained therapist has
            reviewed it: short reflection, then "What is it afraid
            would happen if it stopped?"
            [Skip]                                    [Send])
               ▼
   card 4   short reflection
            "Would you like to thank it?"
            [Not yet]                             [Thank it]
               │ Thank it: the card goes, and the part glows, brightly
               │ for a moment up close, then softly for the rest of
               │ the visit
               ▼
            the camera steps back to the whole meadow
```

Any way out ([Not now], [That's enough for now], [Not yet]) ends the
sitting the same way: the camera steps back, and nothing more is asked.

## B. Noticing (the app asks, once per part)

Only in "How it is", only after a drag or resize, and only once you've
rested for a few seconds. If the edit changes what the map's summary would
say, the app asks once about that part:

```
   you drag ‘the worry’ from near the house out to the edge … rest …
   "The map now shows that ‘the worry’ feels more off to the side.
    Is anything different about it?"
   [Skip this one]                                    [Send]
      ▼
   short reflection                                   [Close]
```

The map is the subject ("the map now shows…"), never "you moved it". The
answer never changes the map. Skipping means it won't ask about that part
again, so the button says so instead of "Not now".

## C. The experiment (invited once; yours to start any time)

```
   you switch to [What if…] for the first time
      ▼
   "Would it be alright to try something small here — move anything so
    it feels a little better, and notice what shifts? Undo is one tap."
   [Not now]                                     [Let's try]
      │
      │  or, any time after: [Try an experiment] in the "What if…" bar
      │  (no invitation: tapping it is the yes)
      ▼
   slim bar: "Take your time."              [I've tried it]
   you move things; flip between the two maps to compare
      ▼
   nothing moved?  "Nothing's moved yet — take your time."
                   [Keep trying]  [Finish without changes]
   something moved?  "What was that like?"   [Not now]  [Send]
      ▼
   one reflection about what moved (never "better" or "worse")
   "‘How it is’ hasn't changed — both pictures are here."   [Close]
```

## Safety (the whole app)

```
   any typed answer
      ▼
   local list of risk phrases ──hit──┐
      ▼ clear                        │
   OpenAI moderation + JEV ───hit────┤
      ▼ clear                        ▼
   used as normal         +------------------------------------+
                          | What you wrote sounds really heavy.|
                          | This app can't help with that the  |
                          | way a person can — please reach    |
                          | out to someone now.                |
                          | [Find support near you]   [Close]  |
                          +------------------------------------+
                          the answer is dropped; no more questions,
                          invitations or noticing this session;
                          the map stays editable
```

## One card at a time

Something you start (Get to know it) always beats something the app starts
(noticing, the invitation). The app never opens a card over another card,
over a drag in progress, or over the experiment bar.

## If the AI is off or fails

Nothing blocks. Reflections fall back to fixed lines ("Thank you for
putting that into words."), Turn 2 takes the one-part path, the
invitation uses the generic wording, and the safety check falls back to
the local phrase list. In dev, `?ai=off` forces all of this, and
`?jump=after` starts at Act 1's close of a scripted full run.
