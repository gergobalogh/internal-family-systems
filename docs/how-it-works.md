# How the app works

What a person sees and does, from the first question to a later visit.
The exact wording lives in `src/conversation/script.ts` (the guide's
lines) and `src/ui/copy.ts` (buttons and labels). Lines from slice 4 on are
still draft.

## The screen

One scene, no pages. A meadow under a big sky with a small house on the
horizon. The conversation is a single glass card (under the house on
desktop, above it on a phone). Parts appear on the meadow as felt figures.

```
 +--------------------------------------------------------------+
 |  [↶ Undo]  <- after the walk, while there's something to undo |
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

There's no menu or top bar at any point: the story moves the person on,
and the few controls left live on the parts themselves.

Each part's figure is picked from your words (‘the worry’ gets the Map,
which plans every turn; ‘the one who yells’ the Defender, who steps
forward to protect), and no two parts share one. There are 13 figures, one
per character in `docs/character-entrances.md`. The pick is an
interpretation, so you can change it: "Change figure", behind the "…" in
the part's box.

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
 START ─► (a meadow saved on this device? then "A later visit", below)
          1. ENTRY CONVERSATION (the app asks 4 questions, then checks the map)
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
             ─► the camera steps back to the whole meadow
                                    │
                                    ▼
          3. ACT 3: STEP BACK (frames A12–A13; see "Stepping back")
             "Step back and look at all of them. Does anyone want to be
              somewhere else, or take up more or less room?"
             you move and resize; Undo sits on the card ["That's how it is"]
             ─► dusk, and one "what if":
                "What if ‘X’ had a bit more room?"   [Go back]  [Keep it]
                                    │
                                    ▼
          4. THE ENDING (frame A14; see "The ending")
             still at dusk, the meadow rests under a veil, and the picture
             to keep lies beside the card
             "Thank them for showing up. They'll be here when you come back."
             [Done]                                  [Keep this picture]
             ─► Done: the light returns to day, and the card goes
                                    │
                                    ▼
          5. THE MAP IS YOURS (you lead; the app asks only about a change)
             │
             ├─ drag / resize / rename / remove any part
             ├─ Undo in the corner, while there's something to undo
             └─ Noticing ............... after you move or resize a part

          SAVED, from the ending on: the meadow stays on this device, and
          every later change is saved too (see "A later visit"). Someone
          new joins on a later visit, from its welcome.

          SAFETY, everywhere: every typed answer is checked first (see below)
```

## Selecting a part

Tap or click a figure. Move it by dragging or with the arrow keys. Change
its size with [Smaller] [Larger], the round handle by its feet, or plus and
minus. Size shows how much space a part takes up; once the map is handed
over, a soft pool of light on the meadow, left of the house, marks the
point "close" and "off to the side" are measured from.

```
                 (THE WORRY)
   +-----------------------------------------------------+
   | the worry                <- tap the name to rename it |
   | “you're going to mess this up”          <- its voice |
   | might be trying to: keep me from failing <- intent   |
   | [Smaller] [Larger] […]                               |
   +-----------------------------------------------------+
      │ […] opens:
      ▼
   | [Change figure] [Not one of my parts]                |
   | [Clear what it said]          <- when it has words   |

   Change figure opens the figures no other part has, still,
   with [Keep this one]. Undo changes it back. Clear what it
   said takes its voice and intent off the map; Undo brings
   them back.

   at dusk (Act 3's "what if") the box has only [Smaller] [Larger]:
   who a part is stays put there, only where it stands changes.
```

Names on the map are plain: the guide's lines keep their tentative
wording, the labels don't repeat it. Selecting the knot on a "pulling in
different directions" link offers [Remove this link] (not at dusk).

Undo sits in the sky's top-left corner after the walk, only while there's
something to undo, and steps aside while a card is up. (At the bottom it
covered the names of parts standing near the edge on a phone.) Taking a
part off the map shows its own notice with Undo instead, and the corner
one steps aside meanwhile.

## A. Sitting with one: Act 2

Tapping a figure at Act 2's first question (or its name on a later visit's
welcome) plays these scenes. The camera goes
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
sitting the same way: the camera steps back, and Act 3 follows (on a later
visit, the ending).

## Stepping back: Act 3

```
   the whole meadow, as it is now
   "Step back and look at all of them."
   "Does anyone want to be somewhere else, or take up more or less room?"
   [Undo] (once you've changed something)          [That's how it is]
      │ you drag and resize any part here; this is how it is
      ▼
   dusk: the evening light, for one "what if"
   "What if ‘the worry’ had a bit more room?"
   "Move it, and notice what shifts."
   [Go back]                                          [Keep it]
      │ Go back: the meadow returns to how it was a moment ago
      │ Keep it: what you moved becomes how it is (Undo in the
      │          corner, after the ending, takes it back)
      ▼
   the ending (below)
```

The "what if" names the smallest part that Act 2 could offer (not one read
as hurting, and not Turn 3's quieter part), if another part is bigger.
Otherwise it asks "What if things sat a little differently?" and "Move
anyone, and notice what shifts." With a single part, the first card says
"Step back and look at it." and "Does it want to be somewhere else, or take
up more or less room?", and the "what if" is "What if ‘X’ sat a little
differently?" with "Move it, and notice what shifts." That one "what if"
is the only one: there's no second map to switch to afterwards.

## B. Noticing (the app asks, once per part)

Only after the walk, only after a drag or resize, and only once you've
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

## The ending

```
   still at dusk; the meadow rests under a veil
   ┌──────────────────────────┐   the picture to keep, a little tilted:
   │  the meadow at dusk,     │   beside the card (above it on a wide
   │  everyone where they     │   screen, below it on a phone, where the
   │  stand                   │   card floats in the sky)
   │ ‘the worry’ · ‘the tired │
   │  one’                    │   names, left to right as they stand
   │ “Don't you dare slow     │   the words of the part they sat with,
   │  down.”                  │   and what it might be trying to do
   │ might be trying to: …    │
   │              3 Nov 2026  │
   └──────────────────────────┘
   "Thank them for showing up. They'll be here when you come back."
   [Done]                                        [Keep this picture]
```

The picture is drawn from the map, not taken from the screen, so it looks
the same on any device; what's on screen is the very image that's kept.
Keep this picture opens a phone's share sheet (where Save Image is), and
downloads a PNG elsewhere. Nothing is sent anywhere. With one part the line
is "Thank it for showing up. It'll be here when you come back." A part they
thanked keeps its glow in the picture; if Act 2 was skipped, the picture
has the names only.

## A later visit

From the ending on (or once the map is handed over some other way, like
the safety pause), the meadow is saved in this browser: who's there, their
names, figures, places and sizes, the thread between two, and each part's
words. Two hidden facts are saved with them, so the welcome holds back the
same parts Act 2 does: a part read as hurting, and Turn 3's quieter part.
Nothing else is kept: not the free-write or the other answers. Opening the
app again shows that meadow, in daylight, as it was left.

```
   "Welcome back. Who's around today?"
   [‘the worry’] [‘the tired one’]       the parts Act 2 would offer; their
                                         figures ring and can be tapped too
   [Not now]                [Someone new]
                 Start over
      │
      ├─ a part ─► Act 2 with it (its words, what it might be trying to
      │            do, a thanks) ─► the ending (no Act 3 on a later visit)
      ├─ Someone new ─► "What would you call the one who's here today?"
      │            ─► it walks in: "‘X’ is here now." ─► Act 2 with it
      │            ─► the ending (straight to the ending if it's read as
      │            hurting)
      ├─ Not now ─► the map is handed over
      └─ Start over ─► "Start over with an empty meadow? This one will be
                   gone for good."   [Not now]   [Start over]
                   ─► the saved meadow is cleared, and the free-write opens
```

New words for a part replace its old ones. Removing every part forgets
the meadow, so the next visit starts with the free-write.

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
                          the answer is dropped; no more questions
                          or noticing this session;
                          the map stays editable
```

## One card at a time

The app never opens a card of its own (noticing) over another card, over
an answer it's still waiting on, or over a drag in progress.

## If the AI is off or fails

Nothing blocks. Reflections fall back to fixed lines ("Thank you for
putting that into words."), Turn 2 takes the one-part path, and the
safety check falls back to
the local phrase list. In dev, `?ai=off` forces all of this, and
`?jump=after` starts at Act 1's close of a scripted full run.
`?ai=scripted` answers on the device instead, without a model call: the
free-write's first short clauses (two to four words) as feeling buttons, a
frustrated feeling toward the first part (so a second one comes), parts
that keep watch or get away (never one read as hurting), and the fixed
lines for reflections.
