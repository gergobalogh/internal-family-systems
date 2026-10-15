/**
 * Deterministic checks on what the person and the LLM write. All matching is
 * case-insensitive and whole-word ("Self" never matches "yourself"), and
 * every answer list is matched by equality, never by searching inside — the
 * risk phrases (`RISK_PHRASES`) are the one deliberate exception.
 */

export const REFLECTION_MAX_CHARS = 280
export const REFLECTION_MAX_SENTENCES = 2

/** IFS jargon the app must not introduce. Closed list — exact words only. */
export const JARGON_WORDS = [
  'exile',
  'manager',
  'firefighter',
  'protector',
  'self',
  'polarization',
  'trauma',
  'burden',
  'ifs',
] as const

/** Clinical vocabulary the app must not introduce. Closed list — exact words only. */
export const CLINICAL_WORDS = [
  'anxiety',
  'depression',
  'adhd',
  'ocd',
  'ptsd',
  'bipolar',
  'disorder',
  'diagnosis',
  'diagnose',
  'diagnostic',
  'symptom',
  'symptoms',
] as const

/**
 * Ways a reflection could hand a part a label of the app's own making. Closed
 * list, matched against normalized text (see `normalize`), so "my" reads as
 * "your" on both sides:
 * - "your inner ___"          e.g. "your inner critic"
 * - "your ___ part" / "side"  e.g. "your worried part", "your anxious side"
 * - "the ___ part of you"     e.g. "the worried part of you"
 */
export const LABEL_PATTERNS: readonly RegExp[] = [
  /\byour inner [a-z0-9']+/g,
  /\byour [a-z0-9']+ (?:part|side)\b/g,
  /\bthe [a-z0-9']+ (?:part|side) of you\b/g,
]

const words = (text: string): string[] =>
  text
    .toLowerCase()
    .replace(/[‘’]/g, "'")
    .match(/[a-z0-9]+(?:'[a-z]+)*/g) ?? []

/** Lowercase words joined by single spaces, with "my" read as "your". */
export function normalize(text: string): string {
  return words(text)
    .map((word) => (word === 'my' ? 'your' : word))
    .join(' ')
}

function countSentences(text: string): number {
  return text
    .trim()
    .split(/(?<=[.!?…])["'”’)\]]*\s+/)
    .filter((sentence) => sentence.trim() !== '').length
}

export type CheckResult = { ok: true } | { ok: false; reason: string }

/**
 * Whether an LLM reflection may be shown. A flagged word passes when the
 * person already wrote that word; a label pattern passes only when they wrote
 * the whole phrase. The lists stop the app introducing terms, never repeating
 * the person.
 */
export function checkReflection(text: string, personTexts: readonly string[]): CheckResult {
  const trimmed = text.trim()
  if (trimmed === '') return { ok: false, reason: 'empty' }
  if (trimmed.length > REFLECTION_MAX_CHARS) return { ok: false, reason: 'too long' }
  if (countSentences(trimmed) > REFLECTION_MAX_SENTENCES) return { ok: false, reason: 'too many sentences' }

  const reflectionWords = new Set(words(trimmed))
  const personWords = new Set(personTexts.flatMap(words))
  const flagged = [...JARGON_WORDS, ...CLINICAL_WORDS].find(
    (word) => reflectionWords.has(word) && !personWords.has(word),
  )
  if (flagged) return { ok: false, reason: `introduces "${flagged}"` }

  const reflection = normalize(trimmed)
  const person = personTexts.map((personText) => ` ${normalize(personText)} `)
  for (const pattern of LABEL_PATTERNS) {
    for (const [phrase] of reflection.matchAll(pattern)) {
      if (!person.some((personText) => personText.includes(` ${phrase} `))) {
        return { ok: false, reason: `introduces the label "${phrase}"` }
      }
    }
  }
  return { ok: true }
}

/**
 * The one normalization behind every equality list in the conversation:
 * lowercase, apostrophes dropped (so "dont" matches "don't"), spaces
 * squeezed, trailing punctuation stripped. Lists are normalized the same way,
 * so a form keeps matching whatever way it is written in the list.
 */
export function normalizeAnswer(text: string): string {
  return text
    .toLowerCase()
    .replace(/['‘’]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[.!?…,;:]+$/, '')
    .trim()
}

/**
 * Whether the whole answer equals one of `forms`. Never a substring match:
 * "not close at all" contains "close", and a name like "just one more"
 * contains an exit form.
 */
export function matchesAny(answer: string, forms: readonly string[]): boolean {
  const normalized = normalizeAnswer(answer)
  return forms.some((form) => normalizeAnswer(form) === normalized)
}

/** Answers to the part 2 naming question that mean "there is no second part". */
export const EXIT_FORMS = [
  "it's all one feeling",
  'all one feeling',
  'all one',
  'same feeling',
  'just one',
  'one feeling',
  'no second part',
] as const

/** Turn 3, one part: "Does [name] feel close, or more off to the side?" */
export const CLOSE_FORMS = [
  'close',
  'pretty close',
  'very close',
  'near',
  'nearby',
  'close to the centre',
  'close to the center',
] as const
export const FAR_FORMS = ['far', 'far away', 'far off', 'distant', 'off to the side'] as const
export const MIDDLE_FORMS = ['in the middle', 'middle', 'midway', 'halfway', 'in between'] as const

/** Turn 3, two parts: "Which feels closer — [A] or [B]?" (the names themselves match too). */
export const TIE_FORMS = ['about the same', 'both', 'the same', 'same'] as const

/** Turn 4a: a bare yes, which gets the naming follow-up instead of becoming a name. */
export const YES_FORMS = ['yes', 'yeah', 'yep', 'there is', 'i think so'] as const
export const NO_FORMS = [
  'no',
  'nope',
  'none',
  'not really',
  'nothing',
  "don't think so",
  "i don't think so",
  'nobody',
  'no one',
  'never mind',
  'forget it',
] as const
export const UNSURE_FORMS = ['not sure', 'unsure', "i don't know", "don't know", 'maybe', 'no idea'] as const

/** Turn 4b: "what would you change?" answered with nothing to change. */
export const AFFIRM_FORMS = [
  'looks right',
  'looks good',
  'yes',
  'yeah',
  'nothing',
  'all good',
  'fine',
  'no changes',
] as const

/** Turn 4b: taking down the tension link, without the LLM (so it works AI-off). */
export const UNLINK_FORMS = [
  'not pulling apart',
  'no pulling apart',
  "they're fine together",
  'they get along',
  'remove the link',
  'remove the tension',
  'no tension',
] as const

/**
 * Every answer list. An answer equal to one of these is a fixed phrase that
 * can't carry risk language, so it needn't wait for the AI risk check.
 */
export const LISTED_FORMS: readonly string[] = [
  ...EXIT_FORMS,
  ...CLOSE_FORMS,
  ...FAR_FORMS,
  ...MIDDLE_FORMS,
  ...TIE_FORMS,
  ...YES_FORMS,
  ...NO_FORMS,
  ...UNSURE_FORMS,
  ...AFFIRM_FORMS,
  ...UNLINK_FORMS,
]

/**
 * The safety path's floor, which works with AI off. The one deliberate
 * exception to "equality, never search inside": these are found anywhere in
 * an answer, as whole words, because a needless pause costs little and a
 * miss costs a lot. Words an inner voice says count too ("kill yourself").
 */
export const RISK_PHRASES = [
  'suicide',
  'suicidal',
  'kill myself',
  'killing myself',
  'kill yourself',
  'end my life',
  'ending my life',
  'end your life',
  'take my life',
  'take my own life',
  'want to die',
  'wanna die',
  'wish i was dead',
  'wish i were dead',
  'better off dead',
  'better off without me',
  "don't want to live",
  "don't want to be alive",
  "don't want to exist",
  'no reason to live',
  'not worth living',
  'end it all',
  'hurt myself',
  'hurting myself',
  'hurt yourself',
  'harm myself',
  'self harm',
  'selfharm',
  'cut myself',
  'cutting myself',
  'overdose',
] as const

/** Whether an answer contains a risk phrase, as whole words. */
export function hasRiskPhrase(text: string): boolean {
  const words = nameWords(text)
  return RISK_PHRASES.some((phrase) => findWords(words, nameWords(phrase)) !== -1)
}

/** Whether an answer to the part 2 naming question declines a second part. */
export function isExit(answer: string): boolean {
  return matchesAny(answer, EXIT_FORMS)
}

/** Words for whole-word name matching: lowercase, apostrophes dropped, any script. */
export function nameWords(text: string): string[] {
  return text.toLowerCase().replace(/['‘’]/g, '').match(/[\p{L}\p{N}]+/gu) ?? []
}

/** Where `needle` occurs in `words` as a run of whole words, or -1. */
export function findWords(words: readonly string[], needle: readonly string[], from = 0): number {
  if (needle.length === 0) return -1
  for (let start = from; start + needle.length <= words.length; start++) {
    if (needle.every((word, offset) => words[start + offset] === word)) return start
  }
  return -1
}

/**
 * Which of `names` (each as `nameWords`) occur in `words`, whole words only.
 * Longest match wins: inside "the worry about mom", "the worry" doesn't
 * count separately. Returns indexes into `names`.
 */
export function namesIn(words: readonly string[], names: readonly (readonly string[])[]): number[] {
  const occurrences = names
    .flatMap((name, index) => {
      const found: { index: number; start: number; length: number }[] = []
      for (let start = findWords(words, name); start !== -1; start = findWords(words, name, start + 1)) {
        found.push({ index, start, length: name.length })
      }
      return found
    })
    .sort((a, b) => b.length - a.length)
  const taken = new Set<number>()
  const matched = new Set<number>()
  for (const { index, start, length } of occurrences) {
    const span = Array.from({ length }, (_, offset) => start + offset)
    if (span.some((position) => taken.has(position))) continue
    span.forEach((position) => taken.add(position))
    matched.add(index)
  }
  return [...matched]
}
