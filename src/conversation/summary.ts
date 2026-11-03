import type { Placement } from '../model/types'
import { MIN_VISIBLE_GAP, bucketOf, radiusOf } from './geometry'
import { script } from './script'

/**
 * What the map says about each part, as a deterministic template, never LLM
 * prose: sizes and positions in the live layout, but only where they come
 * from an answer or the person's own edits (untouched defaults get no
 * words), and the part that rarely gets heard. Noticing a change uses it;
 * Act 3 uses the arrangement helpers below.
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
  /** Where it started; differing from it means the person moved it. */
  start: Placement
  /** Its starting size came from an answer ("loudest" → largest, "rarely heard" → small). */
  sizeFromAnswer: boolean
  /** The part that rarely gets heard (Turn 3's quieter part, or added from the closing card). */
  unheard: boolean
}

export interface SummaryInput {
  /** Visible parts only, in creation order. */
  parts: SummaryPart[]
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
/** A starting spot is the app's, never an answer: only a move speaks for a part's place. */
const positionSpeaks = moved

/** The one part strictly bigger (or smaller) than every other, if there is one. */
function strictlyMost(parts: readonly SummaryPart[], sign: 1 | -1): SummaryPart | null {
  const sorted = [...parts].sort((a, b) => sign * (b.placement.scale - a.placement.scale))
  return sorted.length > 1 && Math.abs(sorted[0].placement.scale - sorted[1].placement.scale) > EPSILON
    ? sorted[0]
    : null
}

/** What the summary says about each part. */
function describe({ parts }: SummaryInput): Map<string, Phrase[]> {
  const words = script.summary
  const phrases = new Map(parts.map((part) => [part.id, [] as Phrase[]]))
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

  // Position: anyone whose position speaks, in plain words.
  for (const part of parts) {
    if (!positionSpeaks(part)) continue
    const bucket = bucketOf(radiusOf(part.placement))
    say(part, bucket, words[bucket])
  }

  for (const part of parts) if (part.unheard) say(part, 'unheard', words.unheard)
  return phrases
}

/** What the summary says about each visible part, by id — for noticing a change in it. */
export function partPhrases(input: SummaryInput): Map<string, Phrase[]> {
  return describe(input)
}

/** A size change smaller than this factor gets no words in Act 3's record. */
export const SIZE_CHANGE = 1.05

/** One visible part in both layouts, for Act 3's "what if". */
export interface ArrangedPart {
  name: string
  current: Placement
  whatIf: Placement
}

/** Whether "What if" differs from "How it is" at all. */
export function arrangementDiffers(parts: readonly ArrangedPart[]): boolean {
  return parts.some(
    ({ current, whatIf }) => differs(whatIf, current) || Math.abs(whatIf.scale - current.scale) > EPSILON,
  )
}

/**
 * How "What if" differs from "How it is", one line per changed part, in
 * creation order. For Act 3's record only (what Keep it kept), never shown.
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
