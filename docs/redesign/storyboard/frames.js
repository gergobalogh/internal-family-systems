// Storyboard frames, phone size (390×844). All copy is draft.
// `caption` is for the sheet under each frame, not part of the screen.
// Cast, every name word for word from one free-write:
//   ‘push harder’ (lantern; reads as guarding) · ‘hide under the covers’ (shell; escaping)
//   ‘not good enough’ (curled; hurting) · ‘the tired one’ (sleeper; the quieter part)
const PUSH = { look: 'lantern', name: '‘push harder’', x: 118, y: 700, size: 190 }
const HIDE = { look: 'shell', name: '‘hide under the covers’', x: 288, y: 628, size: 118, mirror: true }
const HURT = { look: 'curled', name: '‘not good enough’', x: 312, y: 800, size: 112, mirror: true }
const TIRED = { look: 'sleeper', name: '‘the tired one’', x: 62, y: 548, size: 74 }
const FOUR = [TIRED, HIDE, PUSH, HURT]
const ZOOM_PUSH = { zoom: [118, 700, 1.75], zoomY: 770 - 700 * 1.75 }
const INTENT = [{ text: 'trying to: keep me from being let go', x: 195, y: 800 }]
const VOICE = [{ text: '“Don’t you dare slow down.”', x: 230, y: 440 }]
/** Everyone but `keep` softens; nobody carries a tag (the card names the part). */
const dimmed = (parts, keep, extra = {}) =>
  parts.map((p) => (p.look === keep.look ? { ...p, noTag: true, ...extra } : { ...p, dim: true, noTag: true }))
const POSTCARD_PARTS = [
  { look: 'sleeper', x: 120, y: 205, size: 70 },
  { look: 'shell', x: 245, y: 190, size: 62, mirror: true },
  { look: 'lantern', x: 80, y: 262, size: 104 },
  { look: 'curled', x: 270, y: 262, size: 66, mirror: true },
]
const NAMES = '‘push harder’ · ‘hide under the covers’ · ‘not good enough’ · ‘the tired one’'

const FRAMES = [
  // ── Option A: one walk, three acts, one keepsake ──────────────────
  {
    id: 'A01',
    caption: 'Act 1 · Find\nThe free-write, as today',
    card: { top: 150, lines: ["In your own words, what's weighing on you right now? No need to be organized."], field: 'tall', buttons: ['*Send'] },
  },
  {
    id: 'A02',
    caption: 'Act 1 · Focus\nTheir own phrases as choices (Turn 1, built)',
    card: {
      top: 60,
      lines: ['It sounds like a lot is pulling at you at once.', 'Which of these has been loudest lately — or is it something else?'],
      chips: ['‘push harder’', '‘not good enough’', '‘hide under the covers’'],
      field: true,
      buttons: ['*Send'],
    },
  },
  {
    id: 'A03',
    caption: 'Act 1 · Arrival\nThe card steps back; the part walks in where you can see it',
    card: { top: 60, ghosted: true, lines: ['One moment…'] },
    parts: [{ ...PUSH, x: 150 }],
  },
  {
    id: 'A04',
    caption: 'Act 1 · Feel toward\n(Turn 2, as today)',
    card: { top: 40, lines: ['And how do you feel toward ‘push harder’ — curious about it, frustrated with it, or something else?'], field: true, buttons: ['*Send'] },
    parts: [PUSH],
  },
  {
    id: 'A05',
    caption: 'Act 1 · Who else\n(Turn 3 of the four-turn plan)',
    card: { top: 40, lines: ['You also mentioned this. Is it here too?'], chips: ['‘not good enough’'], buttons: ['Someone else…', 'No one else'] },
    parts: [PUSH, HIDE],
  },
  {
    id: 'A06',
    caption: 'Act 1 ends · Who came\nNo report, no toolbar: the cast and one line',
    parts: FOUR,
    card: { top: 60, slim: true, lines: ['These are the ones who came.'], buttons: ['*Go on'] },
  },
  {
    id: 'A07',
    caption: 'Act 2 · Choose\nThe figures are the buttons; a hurting part isn’t offered first',
    parts: FOUR.map((p) => (p === HURT ? { ...p, dim: true } : { ...p, ring: true })),
    card: { top: 40, lines: ['Which one would like your attention first?', '~Tap one. The others can wait for another time.'] },
  },
  {
    id: 'A08',
    caption: 'Act 2 · Flesh out\nThe camera goes to it; the others soften',
    ...ZOOM_PUSH,
    parts: dimmed(FOUR, PUSH),
    card: { top: 40, lines: ['If ‘push harder’ had words, what would it say?'], field: true, buttons: ['Not now', '*Send'] },
  },
  {
    id: 'A09',
    caption: 'Act 2 · beFriend\nIts words come out of it, as speech',
    ...ZOOM_PUSH,
    parts: dimmed(FOUR, PUSH),
    bubbles: VOICE,
    card: { top: 40, lines: ['It sounds like it never lets you rest.', 'What might it be trying to do for you?'], field: true, buttons: ['That’s enough for now', '*Send'] },
  },
  {
    id: 'A10',
    caption: 'Act 2 · Fears (optional)\nFor the therapist review',
    ...ZOOM_PUSH,
    parts: dimmed(FOUR, PUSH),
    bubbles: VOICE,
    floats: INTENT,
    card: { top: 40, lines: ['What is it afraid would happen if it stopped?'], field: true, buttons: ['Skip', '*Send'] },
  },
  {
    id: 'A11',
    caption: 'Act 2 · Thanks\nThe high point is a gesture: one tap, and its lantern glows',
    ...ZOOM_PUSH,
    parts: dimmed(FOUR, PUSH, { glow: true }),
    floats: INTENT,
    card: { top: 40, lines: ['It’s been working hard to keep you from being let go.', 'Would you like to thank it?'], buttons: ['Not yet', '*Thank it'] },
  },
  {
    id: 'A12',
    caption: 'Act 3 · Step back\nThe whole meadow again; moving and sizing live here',
    parts: FOUR.map((p) => (p === PUSH ? { ...p, under: '“Don’t you dare slow down.”', handle: true, ring: true } : p)),
    undo: true,
    card: { top: 70, lines: ['Step back and look at all of them.', 'Does anyone want to be somewhere else, or take up more or less room?'], buttons: ['*That’s how it is'] },
  },
  {
    id: 'A13',
    caption: 'Act 3 · What if…\nOne experiment, in its own light, not a second mode',
    dusk: true,
    parts: [{ ...TIRED, x: 175, y: 660, size: 140 }, HIDE, { ...PUSH, x: 70, y: 760, size: 150 }, HURT],
    card: { top: 40, lines: ['What if ‘the tired one’ had a bit more room?', '~Move it, and notice what shifts.'], buttons: ['Go back', '*Keep it'] },
  },
  {
    id: 'A14',
    caption: 'Ending · Keep\nA picture to keep, with their words, and a thank-you',
    dusk: true,
    parts: FOUR,
    veil: true,
    light: false,
    postcard: {
      dusk: true,
      parts: POSTCARD_PARTS.map((p) => (p.look === 'lantern' ? { ...p, glow: true } : p)),
      caption: `${NAMES}<br><em>“Don’t you dare slow down.” It’s trying to keep me from being let go.</em>`,
      date: '2 November',
    },
    card: { bottom: 40, lines: ['Thank them for showing up. They’ll be here when you come back.'], buttons: ['Done', '*Keep this picture'] },
  },
  {
    id: 'A15',
    caption: 'Next visit\nThe same meadow and places, saved on this phone',
    parts: [{ ...TIRED, x: 175, y: 660, size: 120 }, HIDE, { ...PUSH, under: '“Don’t you dare slow down.”' }, HURT],
    card: { top: 40, lines: ['Welcome back. Who’s around today?'], chips: ['‘push harder’', '‘the tired one’', '‘hide under the covers’'], buttons: ['Someone new'] },
  },

  // ── Option B: the meadow is home (you pick the chapter) ───────────
  {
    id: 'B01',
    caption: 'Home\nAfter Act 1, three things in the world invite you',
    parts: FOUR.map((p) => (p === HURT ? p : { ...p, ring: true })),
    floats: [
      { text: 'Sit with one', x: 128, y: 500 },
      { text: 'Step back', x: 318, y: 372 },
      { text: 'Close for today', x: 222, y: 430, door: true },
    ],
    whisper: { text: 'They’re all here. Where would you like to start?', y: 130 },
  },
  {
    id: 'B02',
    caption: 'Sit with one\nThe same scenes as A08–A11, for the part you tapped',
    ...ZOOM_PUSH,
    parts: dimmed(FOUR, PUSH),
    card: { top: 40, lines: ['If ‘push harder’ had words, what would it say?'], field: true, buttons: ['Not now', '*Send'] },
  },
  {
    id: 'B03',
    caption: 'Close for today\nThe house door ends the visit, with the same picture to keep',
    dusk: true,
    parts: FOUR,
    veil: true,
    light: false,
    postcard: { dusk: true, parts: POSTCARD_PARTS, caption: NAMES, date: '2 November' },
    card: { bottom: 40, lines: ['Good night to all of them.'], buttons: ['Done', '*Keep this picture'] },
  },

  // ── Option C: today's app, plus a real ending ─────────────────────
  {
    id: 'C02',
    caption: 'After Close\nStraight into Get to know it, for the biggest part',
    parts: FOUR.map((p) => (p === PUSH ? { ...p, ring: true } : p)),
    card: { top: 40, lines: ['Before you go: ‘push harder’ takes up the most room.', 'If it had words, what would it say?'], field: true, buttons: ['Not now', '*Send'] },
  },
  {
    id: 'C03',
    caption: 'Then a picture to keep\nThe toolbar and the two modes stay as they are',
    parts: FOUR,
    veil: true,
    light: false,
    postcard: { dusk: false, parts: POSTCARD_PARTS, caption: `${NAMES}<br><em>“Don’t you dare slow down.”</em>`, date: '2 November' },
    card: { bottom: 40, lines: ['That’s your picture for today.'], buttons: ['Done', '*Keep this picture'] },
  },
]
