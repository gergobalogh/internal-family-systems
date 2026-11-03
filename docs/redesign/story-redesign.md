# The story redesign

2026-11-02. Research and design only; nothing in the app has changed yet.

**Goal (agreed):** someone carrying something heavy spends about ten
minutes, leaves with a landscape that feels true and one part they
understand better, and has a reason to come back.

**The short version.** Today the app is a good conversation followed by a
toolbox. The steps that matter most in parts work (what a part says, what
it's trying to do for you, thanking it) sit behind a button in a part's
box, after the story has ended. On a phone, the interface covers 41–71% of
the meadow once the conversation closes, and the second part walks in
behind the card. Nothing is saved, so nobody can come back. The proposal
(Option A) turns the whole visit into one walk in three acts: meet who's
here, sit with one of them, step back and look. It ends with a picture to
keep, and the meadow waits for the next visit.

| See | File |
|---|---|
| Today, on a phone, one recorded session with captions | [today/sheet-phone.jpg](today/sheet-phone.jpg) |
| Option A storyboard (recommended) | [storyboard/sheet-A.jpg](storyboard/sheet-A.jpg) |
| Options B and C | [storyboard/sheet-B.jpg](storyboard/sheet-B.jpg), [storyboard/sheet-C.jpg](storyboard/sheet-C.jpg) |
| Every card of both recorded sessions, plus timelines | `today/phone/`, `today/desktop/` (each has a `session.webm` on this laptop only; videos stay out of git) |

The storyboard frames are drawn from the app's own meadow and felt figures
(`storyboard/frames.js`, rendered by `storyboard/render.mjs`, laid out by
`storyboard/sheets.py`). Every line on them is draft copy. Sessions are
recorded with `node scripts/record-session.mjs <url> <W>x<H> <out dir>`.

---

## 1. What I started from

- **Two recorded sessions of today's app**, played end to end like a
  person would (AI on, real Rive entrances): one on a phone (390×844), one
  on desktop (1440×900), with a still of every card and a timeline of
  what each card said and when. An earlier pair from the same day was
  lost with a scratch folder; its timings are in section 4. In the
  desktop run several AI calls failed with network errors, and the app
  fell back as designed (Turn 2 opened with "Thank you for giving it a
  name.").
- **How IFS itself runs a session:** the 6 Fs (Find, Focus, Flesh out,
  Feel toward, beFriend, Fears) as therapists teach them
  ([PESI](https://pesi.com/blog/details/1511/6-step-ifs-process-to-jumpstart-healing),
  [therapist.com](https://therapist.com/for-therapists/6-step-ifs-process/),
  [Shortform on Schwartz](https://www.shortform.com/blog/?p=89081)), the
  IFS Institute's [model outline](https://ifs-institute.com/resources/articles/internal-family-systems-model-outline)
  ("working with exile before system is ready" is listed as a common
  mistake), and the parts-mapping exercise adapted from Schwartz's *No Bad
  Parts* ([Therapy in a Nutshell](https://therapyinanutshell.com/mapping-your-parts/)):
  draw a part, name it, ask what it wants and what it protects you from,
  map 4–5 parts, hold the page at arm's length, thank them, and come back
  in a week with the map kept somewhere visible.
- **What people say about the nearest app**, IFS Guide
  ([App Store](https://apps.apple.com/us/app/ifs-guide/id1559214994)): an
  AI practitioner, a parts map made after each session, reminders.
  Reviewers: "It all feels hodgepodge and some information is saved, while
  some isn't"; "I also really wish you could access a summary of each
  session and the parts you met"; "It's also very unclear how many parts to
  expect to unearth."
- **Not reached:** r/InternalFamilySystems. Reddit blocks my tools, and I
  didn't get around the block. Reading it through your logged-in Chrome
  would work; see the questions at the end.

## 2. Who uses it, and when

| | Between sessions | Just read about it | A heavy night |
|---|---|---|---|
| Who | In IFS therapy, or was | Read *No Bad Parts* or saw parts work online; no therapy | Knows nothing about IFS |
| When, where | The evening after a hard day, or the night before a session; phone | In bed or on a Sunday; phone or laptop | 11 pm, phone |
| Time | 10–15 min | About 10 min | 5–10 min |
| Wants to leave with | Their parts in one place, and something to bring to therapy | "So these are my parts": an aha | A little distance ("it's a part of me, not all of me"), calmer |
| Would otherwise use | A notebook, IFS Guide, nothing | ChatGPT, IFS Guide, a worksheet | A journal, a friend, scrolling, ChatGPT |
| Comes back when | Before each session; when a known part flares | If the first visit gave an aha and the meadow is waiting | The next hard night, if it helped |
| Needs most | Saved map, the parts' own words kept | A clear shape (how many parts, how long), a beautiful picture | Safety, gentleness, a real ending |

**What "used" means**, measured with Umami without sending anyone's words
(event names in section 6). The marks are first guesses, to revisit after
the first 50 visitors:

- **Reach the end:** of those who send the free-write, at least half reach the ending.
- **Sit with one:** at least 60% of those who reach Act 2 answer one of its questions.
- **Move something:** at least 40% move or resize a part in Act 3 on their own.
- **Keep:** at least 25% tap "Keep this picture".
- **Come back:** at least 20% of saved meadows are opened again within 14 days.

## 3. How others end a visit and bring people back

| Product | What it does | What we take |
|---|---|---|
| **Unpacking** (Witch Beam) | Tells a life story only through placing objects in rooms; pillars "contemplation, discovery, and expression"; no scores or fail states ([Game Developer](https://www.gamedeveloper.com/design/unpacking-the-design-pillars-of-a-chill-puzzle-game)) | Arranging *is* the story. No separate edit tool after it. |
| **Florence** (Mountains) | Conversations are puzzles that get easier as the relationship grows, jagged when they argue ([GamesBeat](https://gamesbeat.com/florence-uses-clever-interactions-to-create-a-relatable-mobile-game-about-romance/)) | An interaction that means the feeling: thanking is a gesture, not a form. |
| **Gris** (Nomada) | No words; colour returns to the world as the story moves on (from memory, not checked against a source) | The light marks where you are: dusk for "what if", a warm ending. |
| **How We Feel** | The first thing you do is a check-in; afterwards it shows the bigger picture; restrained reminders; a "Today" home ([Atomic Object review](https://spin.atomicobject.com/ux-review-how-we-feel/), [their newsletter](https://howwefeel.substack.com/p/what-comes-next)) | The end of a visit shows the whole picture; coming back is the core loop. |
| **Finch** | Self-care goals give a pet bird energy for adventures ([review](https://www.whistleout.com/CellPhones/Apps/finch-self-care-app-review)) | Something alive waits for you (your parts, where you left them), without guilt mechanics. |
| **Rosebud** | Reflects each entry back; a weekly report of themes ([review](https://blog.mylifenote.ai/rosebud-review/)) | Later: a part's story that grows across visits. |
| **IFS Guide** | AI practitioner, an automatic parts map after each session, a session image, reminders | Closest competitor. Its users ask for exactly what we can do well: a clear picture after each visit, a memory per part, and knowing what to expect. |

## 4. Today, diagnosed

### The seams (see [today/sheet-phone.jpg](today/sheet-phone.jpg))

1. **Turn 1** offered no choices for a free-write that named a pusher and
   a hider, in all three runs that day. It fell back to "Which feeling
   has been loudest lately — what would you call it?"
2. **On a phone, part 2 walks in behind the card.** Thirteen
   entrances were built, and the second one is never seen.
3. **The handover is a dismissal.** The closing card says "you could try
   that in ‘What if’" before "What if" exists, then "it's yours. Move
   anything that doesn't look right." [Close]. At that moment the top bar,
   the summary note and the card cover **71%** of a phone screen.
4. **After Close, nothing invites.** The same summary sits as a note
   (41% of a phone screen is interface).
5. **A part's box** has six or seven buttons, drawn far above the figure
   and over another part's name (51% of a phone screen with a part
   selected).
6. **The heart of it is hidden.** "If ‘X’ had words, what would it say?"
   and "What might ‘X’ be trying to do for you?" are the best questions in
   the app, and only someone who taps a figure, then "Get to know it",
   ever sees them.
7. **Noticing narrates geometry:** "The map now shows that ‘not feeling
   good enough’ feels closer than ‘the one who wants to hide’. Is anything
   different about it?" Its card then covers the part you moved.
8. **"What if…" is a second mode** with its own rules (separate places and
   undo, "Start over from how it is", "To rename or remove it, go back to
   How it is."). It is the most beautiful screen in the app (dusk,
   curtains) and the hardest to understand.
9. **There is no ending.** Nothing says the visit is over, nothing is kept,
   and a reload loses the map: the app saves nothing (no storage at all).
10. **Waiting.** Card to card took 4–13 s on a phone and 6–16 s on
    desktop in headless Chrome, with instant answers. Phone: 10.1, 11.1,
    5.6, 10.3, 4.4, 7.3 s (an earlier run: 9.9, 12.2, 5.7, 13.4, 5.5,
    12.0 s). Desktop: 11.5, 11.4, 6.8, 12.2, 6.2, 6.7 s (an earlier run:
    14.4, 16.0, 10.5, 13.7, 8.8, 9.7 s).
    The world fills the wait only when a part walks in; after the
    free-write nothing happens for about 10 s. Headless software
    rendering is slower than a real phone, so treat these as upper bounds.

On desktop the meadow has room (the interface covers 15–17% after
closing); the crowding is a phone problem, and a phone is where most
people will meet this.

### Against the 6 Fs

| IFS step | Where it is today | What's wrong |
|---|---|---|
| **Find** | Turn 0 free-write, Turn 1 naming | Good |
| **Focus** | Turn 1: part 1 walks in | Attention moves on to part 2 and to geometry straight away |
| **Flesh out** | "If ‘X’ had words…": after closing, in a part's box | Optional and hidden |
| **Feel toward** | Turn 2 | Good, and frustration becoming part 2 is how IFS treats a blended part |
| **beFriend** | "What might ‘X’ be trying to do for you?": same hidden place | Optional and hidden |
| **Fears** | Missing | |
| The map's close: look at it from arm's length, thank them, come back | Turn 4's summary (a report), then nothing | No thanks, no keepsake, nothing saved |

So the order today is Find → Focus → Feel toward → geometry → a report →
toolbox, with the high points (Flesh out, beFriend) after the story ends.
That is why it feels stitched together.

### Everything on screen after closing, and what happens to it

| Control | What story moment it serves | Fate in Option A |
|---|---|---|
| How it is / What if… switch, the bar's title and hint | None: it's a mode | **Cut.** "What if" becomes one beat with its own light (A13); the hint's meaning is said once in Act 3 |
| Try an experiment, Start over from how it is | None | **Cut** (A13 has Go back / Keep it) |
| Summary note pinned on the map | Repeats Turn 4 | **Cut**; the picture to keep (A14) carries the names and words |
| Closing card, Add a quieter part | The quieter part | **Cut**; Act 1's "Who else" (Turn 3) brings it |
| Get to know it | Flesh out, beFriend | **Moved into the main path** (Act 2) |
| Add a part | Someone new | **Moved:** "Someone else…" in Act 1, "Someone new" on later visits |
| Undo | Arranging | **Kept**, in Act 3 and after |
| Smaller / Larger, the handle, plus/minus | Arranging | **Kept**, in Act 3 and after |
| Rename | Any time | **Kept**: tap the name |
| Change figure, Not one of my parts | Any time | **Kept**, behind a small "…" on the part |
| Remove this link | Rare | **Kept** on the knot, as today |
| Clear what it said | None | **Cut** (Undo, or edit the words in place) |
| Noticing | Act 3 | **Kept**, but only for real changes (the open board item) |
| "one way to see this" on every name | The hedge | **Your call:** I'd keep the hedge in the guide's lines and drop it from labels |

### Bugs and loose ends found on the way

- The "Nothing's moved yet" card stays on screen after switching back to
  How it is (phone, twice).
- On a phone, my scripted drag in "What if…" didn't count as a move (twice;
  the same drag counted on desktop); not yet checked whether a finger would.
- A part's resize handle can sit over another part's body (the dev jump on
  a phone), so a tap on that part hits the handle instead.

## 5. Three ways to tell it

### Option A: one walk, three acts, one keepsake (recommended)

[storyboard/sheet-A.jpg](storyboard/sheet-A.jpg)

| Act | Beat | Frame | What's new |
|---|---|---|---|
| 1. Who's here | Free-write | A01 | — |
| | Loudest, from their own phrases | A02 | Built (Turn 1) |
| | It walks in where you can see it | A03 | The card steps back during an entrance; nothing covers an arriving part |
| | How do you feel toward it? | A04 | — |
| | Who else? | A05 | Turn 3 of the four-turn plan, now also the way in for the quieter part |
| | "These are the ones who came." | A06 | Replaces Turn 4's report and the closing card |
| 2. Sit with one | Which one would like your attention first? | A07 | Tap a figure. Parts read as guarding or escaping are offered; a part read as hurting isn't offered first (the hidden kind, used for safety) |
| | If it had words… | A08 | The camera moves in; the others soften |
| | What might it be trying to do for you? | A09 | Its words appear as speech from the figure |
| | What is it afraid would happen if it stopped? | A10 | Optional, and up to the therapist review |
| | Would you like to thank it? | A11 | The high point is a tap, and the figure answers (its lantern glows; later, a small Rive reaction per figure) |
| 3. Step back | Look at all of them; does anyone want to move? | A12 | Turn 4's drag invite, after understanding instead of before; moving and sizing live here |
| | What if ‘the tired one’ had a bit more room? | A13 | One experiment at dusk; Go back or Keep it. Both pictures are kept, but there's no second mode |
| Ending | A picture to keep, and a thank-you | A14 | A postcard of their meadow with names, a part's words and the date; saved to the phone |
| Next visit | "Welcome back. Who's around today?" | A15 | The meadow saved on the device (no account); each visit is a short Act 2 with one part |

### Option B: the meadow is home

[storyboard/sheet-B.jpg](storyboard/sheet-B.jpg). After Act 1 there are
no cards: three things in the world invite you (a part: sit with it; the
hill: step back; the house: close for today). It's freer and more like a
game, but on a first visit it repeats today's problem: nothing leads, and
people have to find the story. **It's the right shape for later visits**
(A15 could open onto it).

### Option C: today's app, plus a real ending

[storyboard/sheet-C.jpg](storyboard/sheet-C.jpg). After Close, go straight
into Get to know it for the biggest part, then a picture to keep. It's the
cheapest and quick to test, but the modes, the toolbar and the map note
stay, so the middle still feels stitched.

### Why A

- It removes the seam rather than decorating it: there is no handover, no
  toolbar and no modes.
- It follows the order IFS already uses, so the emotional peak is inside
  the path, and it is safer: protectors first, and a part read as hurting
  is never opened by the app.
- It gives the visit an ending, and the person a reason and a way to come
  back.
- It reuses what's built: the thirteen entrances, Turn 1's rows, the
  hidden kind, the Get to know it questions, noticing, the dusk art and the
  risk check. On a phone, the interface covers 15–28% of the screen in A's
  frames, against 41–71% today.

### What A changes in the build order

The four-turn plan's Turn 3 is still next, and it becomes Act 1's last
beat. Turn 4's drag invite moves to Act 3, after Act 2. New work:

1. Arrivals never covered: the card steps back while a part walks in.
2. Act 1's close ("These are the ones who came.") replaces the Turn 4 report and the closing card.
3. Act 2: choosing by tapping a figure, the camera move, speech from the figure, the thanks gesture.
4. Act 3: stepping back, one "what if" at dusk (Go back / Keep it).
5. The ending's picture to keep (the scene drawn to an image, saved on the device).
6. Saving the meadow on the device, and the next visit's opening.
7. Removing the modes, the top bar, the map note and the closing card.

**Safety.** Act 2 moves the app from "Mirror" toward an "IFS-informed
companion" (project.md's central question), so the therapist review comes
before Fears ships. Unchanged: the risk check on every answer and the
safety pause.

## 6. How we'll know it's right

### Test with five people (you recruit; I prepare and analyse)

Dropped on 2026-11-03, the user's choice: instead of watching five people,
the test link reports through Umami how far each visit gets
([docs/analytics.md](../analytics.md)), and we read it ourselves. The plan
below is kept for the record.

- **Who:** two in or after IFS therapy, two curious with no therapy, one
  with no interest in psychology. On their own phone.
- **Their words:** tell them they can use a made-up situation; offer a
  scenario card. Their meadow stays on their phone, but what they type
  goes to Meta's Muse, JEV and OpenAI, and Meta may train on it: say so
  first (the agreed line is in project.md, 2026-11-03).
- **Round 1, before any code:** a tap-through of A's frames (and C's, for
  contrast). **Round 2:** the built version.
- **Tasks, said once:** "Use this the way you would on your own." Then:
  "Tell me what your map shows." "Is there anything you'd change on it?"
  "Would you come back to this? When?" "How would you describe it to a
  friend?"
- **Watch for:** a pause over 5 s on any screen; taps on things that
  aren't buttons; where they stop reading; whether they move a part
  without being asked; what they say or do at "Would you like to thank it?";
  whether they understand the dusk "what if".
- **Pass:** 4 of 5 finish without help; 4 of 5 can say in their own words
  what one part is trying to do for them; 3 of 5 move a part on their own;
  3 of 5 say they'd come back and name a moment when.
- **Wordless check:** show A01–A15 with the text blurred to three people
  and ask them to tell the story.

### Questions for an IFS-trained therapist

1. Is asking a protector's fears safe in an unguided app? What should
   happen when the answer points to an exile?
2. Is "Would you like to thank it?" right at that point, or does it push a
   feeling?
3. Is offering protectors first, and holding back a part read as hurting,
   enough? What should the app say about that part?
4. Should Act 2 check "How do you feel toward it?" again before going in,
   and what if the answer is still frustration?
5. The quieter part at the edge: invite it, or leave it be?
6. What should a person never be asked here?
7. What would you want a client to bring to a session from this?

### Umami events, once it has a URL

Built on 2026-11-03, with some changes: [docs/analytics.md](../analytics.md).

Ids and counts only, never anyone's words: `freewrite-sent`,
`part-arrived`, `act1-done`, `act2-answer` (voice / intent / fears),
`thanked`, `act3-moved`, `whatif-kept`, `ending-reached`, `picture-kept`,
`return-visit` (days since the last), `safety-pause`. Funnel:
`freewrite-sent` → `act1-done` → `act2-answer` → `ending-reached` →
`picture-kept`, and `return-visit` within 14 days. Run the page-launch
checklist before it goes public.

## 7. Decisions for you

1. **A, B or C?** I recommend A, with B as the shape of later visits.
2. **Fears (A10):** keep it for the therapist review behind "Skip", or
   drop it now. I'd keep it for the review.
3. **"one way to see this" on every name:** drop it from labels and keep
   the hedge in the guide's lines? I'd drop it.
4. **Save the meadow on the device** (no account): yes?
5. **Reddit:** may I read r/InternalFamilySystems through your logged-in
   Chrome (read only), or skip it?
6. **Testers:** five people and one IFS-trained therapist are yours to
   find. A tap-through of A could be ready for round 1 before any code.
