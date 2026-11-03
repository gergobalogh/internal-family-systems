/**
 * The pinned entry script (research/synthesis-4-turn-script.md, as locked in
 * docs/slice-2-handoff.md and docs/slice-3-handoff.md), and the guide's lines
 * after it (docs/slice-4-handoff.md). Shown verbatim: the only things ever
 * substituted in are the person's own words (a part's name) or the
 * deterministic map summary. Kept apart from src/ui/copy.ts
 * because changing a line here changes the agreed script.
 */

/** Names inside the guide's sentences are quoted, so long names stay readable. */
export const quoted = (name: string) => `‘${name}’`

/** "a", "a and b", "a, b, and c". */
export function listed(items: readonly string[]): string {
  if (items.length <= 2) return items.join(' and ')
  return `${items.slice(0, -1).join(', ')}, and ${items.at(-1)}`
}

/** Summary clauses: "a, and b" for two; "a; b; and c" for more. */
function joinClauses(clauses: readonly string[]): string {
  return clauses.length <= 2 ? clauses.join(', and ') : `${clauses.slice(0, -1).join('; ')}; and ${clauses.at(-1)}`
}

export const script = {
  /** Turn 0. */
  freeWrite: "In your own words, what's weighing on you right now? No need to be organized.",
  /**
   * Turn 1. The naming words in the answer become part 1's name: the model
   * picks the phrase, and the code accepts it only when it appears word for
   * word in the answer — otherwise the answer is used as sent. Short
   * answers that already are names come back unchanged.
   */
  loudest: 'Which feeling has been loudest lately — what would you call it?',
  /** Turn 1 rows selected from Turn 0's form reading. Names are copied from their free-write. */
  confirmFeeling: (name: string) => `Would you call it ${quoted(name)} — or something else?`,
  chooseFeeling: 'Which of these has been loudest lately — or is it something else?',
  nameThatFeeling: 'What would you call that feeling?',
  nameSomethingElse: 'What would you call it?',
  /** Turn 2, with the part's name as it is when the question appears. */
  towardCheck: (name: string) =>
    `And how do you feel toward ${quoted(name)} — curious about it, frustrated with it, or something else?`,
  /**
   * Polarization branch: one sentence on the toward answer, then this fixed
   * line, then the part 2 naming question. Tentative on purpose: the app
   * wonders, the person decides whether it's separate (2026-10-16; was
   * "Sounds like another part has strong feelings about this one."). The
   * fixed line stays because "it" in the naming question refers to it.
   * Draft copy.
   */
  polarization: 'There may be another feeling here too.',
  secondName: 'If it feels separate, what would you call it — or is it part of the same feeling?',
  /** After a bare "separate" or "yes" only: a name can't be conjured. */
  secondNameAgain: 'What would you call it?',
  /**
   * Turn 3, who else is here (docs/four-turn-journey-plan.md). Feelings their
   * free-write named that aren't on the map yet, as choices copied from their
   * words. Draft copy.
   */
  alsoHere: (count: number) =>
    count === 1 ? 'You also mentioned this. Is it here too?' : 'You also mentioned these. Are any of them here too?',
  /** Turn 3 with nothing left over, when a part on the map guards or escapes. Draft copy. */
  quieterBehind: (name: string) => `Is there a quieter feeling ${quoted(name)} might be standing in front of?`,
  /** Turn 3 otherwise. Draft copy. */
  quieter: 'Is there a quieter feeling here, one that rarely gets heard?',
  /**
   * Act 1's close (docs/redesign/story-redesign.md, frame A06): everyone
   * who came, on the meadow, and Go on. Replaces Turn 4's summary question
   * and the closing card. Draft copy.
   */
  gathered: (count: number) => (count === 1 ? 'This is the one who came.' : 'These are the ones who came.'),
  /** Add a part, from the top bar after closing. Draft copy. */
  newPart: "What would you call the part you'd like to add?",
  partAdded: (name: string) => `${quoted(name)} is here now. Move it wherever feels right.`,
  /** The note left on the map after a full run: the map's summary, kept true to it. Draft copy. */
  note: (map: string) => `One way I'm seeing this is ${map}.`,
  /** The same note in "What if…": about the arrangement being tried. Draft copy. */
  noteWhatIf: (clauses: readonly string[]) => `In this ‘What if’, ${joinClauses(clauses)}.`,
  /** Early closes only (no parts left to confirm). Slice 2's shipped line. */
  closingEarly: "Here's what I'm seeing so far — it's yours to rearrange.",
  /** A blank answer gets the identical question again, gently. */
  reask: (question: string) => `Take your time. ${question}`,
  /** Shown, silently, when a reflection can't be had or fails its checks. Turns 3–4 and after are draft copy. */
  fallbackReflection: {
    1: 'Thank you for putting that into words.',
    2: 'Thank you for giving it a name.',
    3: 'Thank you for telling me.',
    4: 'Thank you for staying with this.',
    toward: 'Thank you for telling me.',
    voice: 'Thank you for letting it speak.',
    intent: 'Thank you for telling me.',
    experiment: 'Thank you for trying that.',
    noticing: 'Thank you for telling me.',
  },

  // ---------- After the entry conversation (docs/slice-4-handoff.md). Draft copy. ----------

  /** The experiment invitation, on entering "What if". */
  invite:
    'Would it be alright to try something small here — move anything so it feels a little better, and notice what shifts? Undo is one tap.',
  /** The slim bar while they try. */
  trying: 'Take your time.',
  /** "I've tried it" with nothing different from "How it is": Keep trying, or Finish without changes. */
  nothingMoved: "Nothing's moved yet — take your time.",
  whatWasThatLike: 'What was that like?',
  /** After the experiment's reflection. */
  experimentDone: "‘How it is’ hasn't changed — both pictures are here.",
  /** Get to know it. */
  voice: (name: string) => `If ${quoted(name)} had words, what would it say?`,
  intent: (name: string) => `What might ${quoted(name)} be trying to do for you?`,
  /** After a "How it is" edit changes what the summary says. `clause` is one summary clause ("‘X’ feels close"). */
  noticing: (clause: string) => `The map now shows that ${clause}. Is anything different about it?`,
  /** The safety path: pinned, never generated. */
  pause: "What you wrote sounds really heavy. This app can't help with that the way a person can — please reach out to someone now.",

  /** How "What if" differs from "How it is" (summary.ts) — for the experiment's reflection request only, never shown. */
  changes: {
    bigger: 'takes up more space',
    smaller: 'takes up less space',
    closer: 'sits closer in',
    further: 'sits further out',
    moved: 'sits somewhere else',
  },

  /** The map summary's clauses, about the map as it is now (summary.ts composes them). */
  summary: {
    lead: (clauses: readonly string[]) => `that ${joinClauses(clauses)}`,
    part: (name: string, phrases: readonly string[]) => `${quoted(name)} ${listed(phrases)}`,
    most: 'takes up the most space',
    least: 'takes up the least space',
    large: 'takes up a lot of space',
    small: 'takes up only a little space',
    close: 'feels close',
    middle: 'sits somewhere in the middle',
    far: 'feels more off to the side',
    unheard: 'rarely gets heard',
    tension: (a: string, b: string) => `${quoted(a)} and ${quoted(b)} seem to be pulling in different directions`,
    here: (names: readonly string[]) => `${listed(names.map(quoted))} ${names.length === 1 ? 'is' : 'are'} here`,
    hereToo: (names: readonly string[]) => `${listed(names.map(quoted))} ${names.length === 1 ? 'is' : 'are'} here too`,
  },
} as const
