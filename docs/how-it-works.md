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

No transcript is kept on screen: one question at a time. Past answers live
on as the map itself (names, sizes, places), and the map is where you fix
them.

## The whole journey

```
 START ─► 1. ENTRY CONVERSATION (the app asks, about 4 turns)
           │   each answer: card fades to a ghost → the world "waits"
           │   (light breathes, clouds drift) → at most one part walks in
           │   → next card with a short reflection + the next question
           │
           ├─ Turn 0  "In your own words, what's weighing on you right now?"
           │            nothing appears yet: the app only reflects
           │
           ├─ Turn 1  "Which feeling has been loudest lately — what would
           │            you call it?"
           │            ─► PART 1 walks in, LARGE, named in your exact words
           │
           ├─ Turn 2  "And how do you feel toward ‘X’ — curious about it,
           │            frustrated with it, or something else?"
           │            ├─ frustrated ─► "Sounds like another part has strong
           │            │                 feelings about this one. What would
           │            │                 you call that part — or is it all
           │            │                 one feeling?"
           │            │                 ─► PART 2 walks in, a "pulling in
           │            │                    different directions" thread
           │            │                    links the two
           │            └─ otherwise  ─► straight on with one part
           │
           ├─ Turn 3  "Does ‘X’ feel close, or more off to the side?"
           │          or "Which feels closer — ‘X’ or ‘Y’?"
           │            ─► parts glide nearer to / further from the centre
           │
           ├─ Turn 4a "Is there a part that rarely gets heard — what would
           │            you call it?"
           │            ─► PART 3 walks in, SMALL, at the edge of the meadow
           │
           └─ Turn 4b "One way I'm seeing this is that ‘X’ takes up the
                        most space; ‘Y’ feels closer than ‘X’; … — what
                        would you change?"   [No changes]  [Send]
                        ├─ a fix ("call it the boss", "that's not a part",
                        │  "they're not fighting") ─► applied to the map
                        └─ a wish ("I wish it were further away") ─► kept
                           for later: "you could try that in ‘What if’"
                                    │
                                    ▼
          CLOSING  "That's the picture so far — it's yours. Move anything
                    that doesn't look right."
                    ─► the top bar appears; the summary stays on the map
                       as a note, and keeps itself true as you move things
                                    │
                                    ▼
          2. THE MAP IS YOURS (you lead; the app asks only when invited)
             │
             ├─ drag / resize / rename / remove any part, undo anything
             ├─ A. Get to know it ........ select a part, you start it
             ├─ B. Noticing ............... after you move a part in "How it is"
             └─ C. The experiment ......... the first time you open "What if…"

          SAFETY, everywhere: every typed answer is checked first (see below)
```

## The two maps

```
   [ How it is ]                          [ What if… ]
   the meadow by day                      the same meadow at dusk,
   "Arrange these as they feel            framed by rose curtains
    right now."                           "Try a different arrangement.
                                           How it is stays as it is."

   Each mode keeps its own places and sizes, and its own undo.
   Names, removals, voices and intents are shared by both.
```

## Selecting a part

Tap or click a figure. Move it by dragging or with the arrow keys; plus
and minus change its size.

```
                 (THE WORRY)
   +-----------------------------------------------------+
   | the worry · one way to see this                      |
   | “you're going to mess this up”          <- its voice |
   | might be trying to: keep me from failing <- intent   |
   | [Get to know it] [Rename] [Not one of my parts]      |
   |                              [Clear what it said]    |
   +-----------------------------------------------------+
```

## A. Get to know it (you start it)

```
   card 1   "If ‘the worry’ had words, what would it say?"
            [Not now]                                 [Send]
               │ your answer is kept word for word as its voice
               ▼
   card 2   short reflection ("It sounds like ‘the worry’ tells you…")
            "What might ‘the worry’ be trying to do for you?"
            [That's enough for now]                   [Send]
               │ kept word for word as its intent
               ▼
            short reflection                          [Close]
```

## B. Noticing (the app asks, once per part)

Only in "How it is", only after a drag or resize, and only once you've
rested for a few seconds. If the edit changes what the map's summary would
say, the app asks once about that part:

```
   you drag ‘the worry’ from near the house out to the edge … rest …
   "The map now shows that ‘the worry’ feels more off to the side.
    Is anything different about it?"
   [Not now]                                          [Send]
      ▼
   short reflection                                   [Close]
```

The map is the subject ("the map now shows…"), never "you moved it". The
answer never changes the map.

## C. The experiment (once per session)

```
   you switch to [What if…] for the first time
      ▼
   "In your words: ‘I wish the worry were further away.’ Would it be
    alright to try that here, and notice what shifts? Undo is one tap."
   (no wish at 4b → "…move anything so it feels a little better…")
   [Not now]                                     [Let's try]
      ▼
   slim bar: "Take your time."              [I've tried it]
   you move things; flip between the two maps to compare
      ▼
   nothing moved?  "Nothing's moved yet — take your time."
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
`?jump=after` starts at the closing card of a scripted full run.
