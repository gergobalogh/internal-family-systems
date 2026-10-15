import type { Placement } from '../model/types'
import { MIN_VISIBLE_GAP, bucketOf, radiusOf } from './geometry'
import { script } from './script'

/**
 * Turn 4b's map summary: a deterministic template, never LLM prose, so it
 * can't misreport. Sizes and positions describe the live layout ("How it
 * is", or "What if…" for the map note), but only where they come from an
 * answer or the person's own edits —
 * untouched defaults get no words. Names, the tension pair, and the unheard
 * part come from the conversation.
 */

/** Single-part size words: at least this big "takes up a lot of space"… */
export const LARGE_SCALE = 1.4
/** …and at most this small "takes up only a little space". */
export const SMALL_SCALE = 0.75
const EPSILON = 1e-3

export interface SummaryPart {
  id: string
  /** The name as it is on the map now. */
  name: string
  /** Where it is now, in the layout being described. */
  placement: Placement
  /** Where it started; differing from it means the person (or Turn 3) moved it. */
  start: Placement
  /** Its starting size came from an answer ("loudest" → largest, "rarely heard" → small). */
  sizeFromAnswer: boolean
  /** Turn 3 answered its distance (one-part question). */
  positionFromAnswer: boolean
  /** The part that rarely gets heard (Turn 4a). */
  unheard: boolean
}

export interface SummaryInput {
  /** Visible parts only, in creation order. */
  parts: SummaryPart[]
  /** Turn 3's two-part answer (an order or a tie), when both parts are still here. */
  pair: [string, string] | null
  /** The drawn tension link, when both parts are here. */
  link: [string, string] | null
}

/** One thing the summary says about a part; `key` names it apart from the words (names change). */
export interface Phrase {
  key: string
  text: string
}

const differs = (a: Placement, b: Placement) => Math.abs(a.x - b.x) > EPSILON || Math.abs(a.y - b.y) > EPSILON
const moved = (part: SummaryPart) => differs(part.placement, part.start)
const resized = (part: SummaryPart) => Math.abs(part.placement.scale - part.start.scale) > EPSILON

/** The unheard part's own clause covers its starting size, so only a resize speaks for it. */
const sizeSpeaks = (part: SummaryPart) => (part.sizeFromAnswer && !part.unheard) || resized(part)
const positionSpeaks = (part: SummaryPart) => part.positionFromAnswer || moved(part)

/** The one part strictly bigger (or smaller) than every other, if there is one. */
function strictlyMost(parts: readonly SummaryPart[], sign: 1 | -1): SummaryPart | null {
  const sorted = [...parts].sort((a, b) => sign * (b.placement.scale - a.placement.scale))
  return sorted.length > 1 && Math.abs(sorted[0].placement.scale - sorted[1].placement.scale) > EPSILON
    ? sorted[0]
    : null
}

export function summarize(input: SummaryInput): string {
  return script.summary.lead(summaryClauses(input))
}

/** What the summary says about each part, and which other parts each part's clause names (comparisons). */
function describe({ parts, pair }: SummaryInput) {
  const words = script.summary
  const phrases = new Map(parts.map((part) => [part.id, [] as Phrase[]]))
  const alsoNames = new Map(parts.map((part) => [part.id, [] as string[]]))
  const byId = new Map(parts.map((part) => [part.id, part]))
  const say = (part: SummaryPart, key: string, text: string) => phrases.get(part.id)!.push({ key, text })

  // Size: superlatives among several parts, plain size words for one.
  if (parts.length === 1) {
    const [part] = parts
    if (sizeSpeaks(part) && part.placement.scale >= LARGE_SCALE) say(part, 'large', words.large)
    else if (sizeSpeaks(part) && part.placement.scale <= SMALL_SCALE) say(part, 'small', words.small)
  } else {
    const largest = strictlyMost(parts, 1)
    if (largest && sizeSpeaks(largest)) say(largest, 'most', words.most)
    const smallest = parts.length >= 3 ? strictlyMost(parts, -1) : null
    if (smallest && smallest !== largest && sizeSpeaks(smallest)) say(smallest, 'least', words.least)
  }

  // Position: Turn 3's two-part answer as a comparison only (never "[B] is
  // off to the side"); anyone else whose position speaks, in plain words.
  const compared = pair?.every((id) => byId.has(id)) ? pair.map((id) => byId.get(id)!) : null
  if (compared) {
    const [a, b] = compared
    const gap = radiusOf(a.placement) - radiusOf(b.placement)
    const [near, other] = gap > 0 ? [b, a] : [a, b]
    if (Math.abs(gap) < MIN_VISIBLE_GAP) say(near, `aboutAsCloseAs:${other.id}`, words.aboutAsCloseAs(other.name))
    else say(near, `closerThan:${other.id}`, words.closerThan(other.name))
    alsoNames.get(near.id)!.push(other.id)
  }
  for (const part of parts) {
    if (compared?.includes(part) || !positionSpeaks(part)) continue
    const bucket = bucketOf(radiusOf(part.placement))
    say(part, bucket, words[bucket])
  }

  for (const part of parts) if (part.unheard) say(part, 'unheard', words.unheard)
  return { phrases, alsoNames }
}

/** What the summary says about each visible part, by id — for noticing a change in it. */
export function partPhrases(input: SummaryInput): Map<string, Phrase[]> {
  return describe(input).phrases
}

/** The summary's clauses, in creation order, before any lead-in. */
export function summaryClauses(input: SummaryInput): string[] {
  const { parts, link } = input
  const words = script.summary
  const { phrases, alsoNames } = describe(input)
  const byId = new Map(parts.map((part) => [part.id, part]))

  // Clauses in creation order; the tension clause follows the later of its two parts.
  const clauses: string[] = []
  const mentioned = new Set<string>()
  let lastNamed: string[] = []
  const tensionAfter = link && parts.filter((part) => link.includes(part.id)).at(-1)?.id
  for (const part of parts) {
    const own = phrases.get(part.id)!.map((phrase) => phrase.text)
    if (own.length > 0) {
      clauses.push(words.part(part.name, own))
      lastNamed = [part.id, ...alsoNames.get(part.id)!]
      lastNamed.forEach((id) => mentioned.add(id))
    }
    if (link && part.id === tensionAfter) {
      const [a, b] = link.map((id) => byId.get(id)!)
      const both = link.every((id) => lastNamed.includes(id))
      clauses.push(both ? words.tensionOfTheTwo : words.tension(a.name, b.name))
      lastNamed = [...link]
      link.forEach((id) => mentioned.add(id))
    }
  }

  const unmentioned = parts.filter((part) => !mentioned.has(part.id)).map((part) => part.name)
  if (unmentioned.length > 0) clauses.push(clauses.length === 0 ? words.here(unmentioned) : words.hereToo(unmentioned))

  return clauses
}

/** A size change smaller than this factor gets no words in the experiment's reflection. */
export const SIZE_CHANGE = 1.05

/** One visible part in both layouts, for the experiment. */
export interface ArrangedPart {
  name: string
  current: Placement
  whatIf: Placement
}

/** Whether "What if" differs from "How it is" at all: an experiment needs something tried. */
export function arrangementDiffers(parts: readonly ArrangedPart[]): boolean {
  return parts.some(
    ({ current, whatIf }) => differs(whatIf, current) || Math.abs(whatIf.scale - current.scale) > EPSILON,
  )
}

/**
 * How "What if" differs from "How it is", one line per changed part, in
 * creation order. For the experiment's reflection request only — never shown.
 */
export function arrangementChanges(parts: readonly ArrangedPart[]): string[] {
  const words = script.changes
  return parts.flatMap(({ name, current, whatIf }) => {
    const phrases: string[] = []
    const ratio = whatIf.scale / current.scale
    if (ratio >= SIZE_CHANGE) phrases.push(words.bigger)
    else if (ratio <= 1 / SIZE_CHANGE) phrases.push(words.smaller)
    const gap = radiusOf(whatIf) - radiusOf(current)
    if (gap <= -MIN_VISIBLE_GAP) phrases.push(words.closer)
    else if (gap >= MIN_VISIBLE_GAP) phrases.push(words.further)
    else if (differs(whatIf, current)) phrases.push(words.moved)
    return phrases.length === 0 ? [] : [script.summary.part(name, phrases)]
  })
}
