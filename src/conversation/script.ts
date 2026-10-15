/**
 * The pinned entry script (research/synthesis-4-turn-script.md, as locked in
 * docs/slice-2-handoff.md and docs/slice-3-handoff.md), and the guide's lines
 * after it (docs/slice-4-handoff.md). Shown verbatim: the only things ever
 * substituted in are the person's own words (a part's name, their Turn 4b
 * wish) or the deterministic map summary. Kept apart from src/ui/copy.ts
 * because changing a line here changes the agreed script.
 */

/** Names inside the guide's sentences are quoted, so long names stay readable. */
export const quoted = (name: string) => `‘${name}’`

/** "a", "a and b", "a, b, and c". */
export function listed(items: readonly string[]): string {
  if (items.length <= 2) return items.join(' and ')
  return `${items.slice(0, -1).join(', ')}, and ${items.at(-1)}`
}

/** A quoted wish ends as a sentence: trailing commas dropped, a full stop added unless it ends in one already. */
function asSentence(text: string): string {
  const trimmed = text.trim().replace(/[\s,;:—–-]+$/, '')
  return /[.!?…]$/.test(trimmed) ? trimmed : `${trimmed}.`
}

/** Summary clauses: "a, and b" for two; "a; b; and c" for more. */
function joinClauses(clauses: readonly string[]): string {
  return clauses.length <= 2 ? clauses.join(', and ') : `${clauses.slice(0, -1).join('; ')}; and ${clauses.at(-1)}`
}

export const script = {
  /** Turn 0. */
  freeWrite: "In your own words, what's weighing on you right now? No need to be organized.",
  /** Turn 1. The answer becomes part 1's name, unaltered. */
  loudest: 'Which feeling has been loudest lately — what would you call it?',
  /** Turn 2, with the part's name as it is when the question appears. */
  towardCheck: (name: string) =>
    `And how do you feel toward ${name} — curious about it, frustrated with it, or something else?`,
  /** Polarization branch: a fixed reflection, then the part 2 naming question. */
  polarization: 'Sounds like another part has strong feelings about this one.',
  secondName: 'What would you call that part — or is it all one feeling?',
  /** Turn 3, one part on the map. */
  centralityOne: (name: string) => `Does ${name} feel close, or more off to the side?`,
  /** Turn 3, two parts on the map (in creation order). */
  centralityTwo: (a: string, b: string) => `Which feels closer — ${a} or ${b}?`,
  /** Turn 4a. A fused identify+name question, like Turn 1. */
  unheard: 'Is there a part that rarely gets heard — what would you call it?',
  /** Turn 4a, after a bare "yes" only: a name can't be conjured. */
  unheardName: 'What would you call it?',
  /** Turn 4b. `map` is the deterministic summary (see summary.ts). */
  confirm: (map: string) => `One way I'm seeing this is ${map} — what would you change?`,
  /** Full runs end here. Draft copy until reviewed. */
  closing: "That's the picture so far — it's yours. Move anything that doesn't look right.",
  /** The note left on the map after a full run: Turn 4b's summary, kept true to the map. Draft copy. */
  note: (map: string) => `One way I'm seeing this is ${map}.`,
  /** The same note in "What if…": about the arrangement being tried. Draft copy. */
  noteWhatIf: (clauses: readonly string[]) => `In this ‘What if’, ${joinClauses(clauses)}.`,
  /** Early closes only (no parts left to confirm). Slice 2's shipped line. */
  closingEarly: "Here's what I'm seeing so far — it's yours to rearrange.",
  /** A correction the app couldn't verify. Draft copy. */
  mapLine: "I didn't catch that — the map is yours to fix directly: drag, resize, rename, or remove (parts or link).",
  /** A correction phrased as a wish: nothing changes in "How it is". Draft copy. */
  wishLine: "That sounds like how you'd like it to be — you could try that in ‘What if’.",
  /** A blank answer gets the identical question again, gently. */
  reask: (question: string) => `Take your time. ${question}`,
  /** Shown, silently, when a reflection can't be had or fails its checks. Turns 3–4 and after are draft copy. */
  fallbackReflection: {
    1: 'Thank you for putting that into words.',
    2: 'Thank you for giving it a name.',
    3: 'Thank you for telling me.',
    4: 'Thank you for staying with this.',
    voice: 'Thank you for letting it speak.',
    intent: 'Thank you for telling me.',
    experiment: 'Thank you for trying that.',
    noticing: 'Thank you for telling me.',
  },

  // ---------- After the entry conversation (docs/slice-4-handoff.md). Draft copy. ----------

  /**
   * The experiment invitation, on entering "What if". With a Turn 4b wish,
   * the wish in their words, never paraphrased.
   */
  invite: (wish: string | null) =>
    wish === null
      ? 'Would it be alright to try something small here — move anything so it feels a little better, and notice what shifts? Undo is one tap.'
      : `In your words: ‘${asSentence(wish)}’ Would it be alright to try that here, and notice what shifts? Undo is one tap.`,
  /** The slim bar while they try. */
  trying: 'Take your time.',
  /** "I've tried it" with nothing different from "How it is". */
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

  /** Turn 4b's summary clauses, about the map as it is now (summary.ts composes them). */
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
    closerThan: (other: string) => `feels closer than ${quoted(other)}`,
    aboutAsCloseAs: (other: string) => `feels about as close as ${quoted(other)}`,
    unheard: 'rarely gets heard',
    tension: (a: string, b: string) => `${quoted(a)} and ${quoted(b)} seem to be pulling in different directions`,
    tensionOfTheTwo: 'the two seem to be pulling in different directions',
    here: (names: readonly string[]) => `${listed(names.map(quoted))} ${names.length === 1 ? 'is' : 'are'} here`,
    hereToo: (names: readonly string[]) => `${listed(names.map(quoted))} ${names.length === 1 ? 'is' : 'are'} here too`,
  },

  /** Correction narration: a deterministic template, never LLM prose. */
  done: {
    line: (applied: readonly string[], notes: readonly string[]) =>
      [applied.length > 0 ? `Done: ${listed(applied)}.` : '', ...notes].filter(Boolean).join(' '),
    renamed: (from: string, to: string) => `renamed ${quoted(from)} to ${quoted(to)}`,
    removed: (name: string) => `took ${quoted(name)} off the map`,
    bigger: (name: string) => `made ${quoted(name)} bigger`,
    smaller: (name: string) => `made ${quoted(name)} smaller`,
    closer: (name: string) => `moved ${quoted(name)} closer`,
    further: (name: string) => `moved ${quoted(name)} further out`,
    unlinked: (a: string, b: string) => `took down the link between ${quoted(a)} and ${quoted(b)}`,
    atLimit: {
      bigger: (name: string) => `${quoted(name)} is already as big as it goes.`,
      smaller: (name: string) => `${quoted(name)} is already as small as it goes.`,
      closer: (name: string) => `${quoted(name)} is already as close as it goes.`,
      further: (name: string) => `${quoted(name)} is already as far out as it goes.`,
    },
    gone: (name: string) => `${quoted(name)} isn't on the map anymore.`,
  },
} as const
