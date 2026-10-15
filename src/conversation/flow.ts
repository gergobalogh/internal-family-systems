import type { Action, LandscapeState, Look, Placement } from '../model/types'
import {
  AFFIRM_FORMS,
  CLOSE_FORMS,
  FAR_FORMS,
  LISTED_FORMS,
  MIDDLE_FORMS,
  NO_FORMS,
  TIE_FORMS,
  UNLINK_FORMS,
  UNSURE_FORMS,
  YES_FORMS,
  checkReflection,
  hasRiskPhrase,
  isExit,
  matchesAny,
  normalizeAnswer,
} from './checks'
import type {
  CentralityRequest,
  CentralityResult,
  CorrectionsRequest,
  ParsedOp,
  ReflectRequest,
  ReflectTurn,
  RiskRequest,
  TowardCheck,
  TowardCheckRequest,
} from './contract'
import { applyCorrections } from './corrections'
import type { CorrectionLink, CorrectionPart, Wish } from './corrections'
import { EDGE_SPOTS, STARTING_SPOTS, clearestSpot, inOrder, intoBucket, samePlace } from './geometry'
import type { Bucket } from './geometry'
import { script } from './script'
import { arrangementChanges, arrangementDiffers, partPhrases, summarize, summaryClauses } from './summary'
import type { ArrangedPart, SummaryInput } from './summary'

/**
 * The entry conversation, Turns 0–4, and what the guide does after it
 * (docs/slice-4-handoff.md), as a pure state machine. Async work (LLM
 * reflections, correction parsing and risk checks, JEV judgements) is
 * described by `pending`; the caller runs it and feeds the result back.
 * Every AI result may be null (failed or timed out): the talk always
 * continues, only with less richness. Map changes go out through `effects`,
 * as ordinary landscape actions, in order.
 *
 * Every event carries the map as it is now, so decisions read the person's
 * latest edits: a rename or removal made mid-conversation wins.
 *
 * Every typed answer passes the safety path first: a risk phrase, or the AI
 * risk check, pauses the guide for the session instead of using the answer.
 */

/** A JEV reading at or above this is acted on (the polarization branch, Turn 3 moves). */
export const JEV_THRESHOLD = 0.7

export const PART_1 = 'part-1'
export const PART_2 = 'part-2'
export const PART_3 = 'part-3'
/** The Turn 2 pairing, drawn as a link. */
export const TENSION_LINK = 'link-tension'
/** "Loudest" → largest: the size seed rule. */
export const PART_1_SCALE = 1.6
export const DEFAULT_SCALE = 1
/** "Rarely gets heard" → small (Brief 2's mapping rule). */
export const UNHEARD_SCALE = 0.7

const FIGURES: readonly Look[] = ['lantern', 'sprout', 'sleeper']

export type Confidence =
  /** The person's own words, verbatim (or an exact list match on them). */
  | { tag: 'high' }
  /** JEV's reading, at or above the threshold. */
  | { tag: 'jev'; probability: number }
  /** JEV's reading, below the threshold. */
  | { tag: 'low'; probability: number }
  /** JEV failed, timed out, or was skipped. */
  | { tag: 'notJudged' }
  /** An LLM-parsed correction, verified against the person's words. */
  | { tag: 'parsed' }
  /** The app's starting choice; no user source. */
  | { tag: 'default' }

/** One provenance entry: what the map holds, and where it came from. */
export interface Attribute {
  /** A part id, or 'conversation'. */
  subject: string
  attribute:
    | 'name'
    | 'size'
    | 'placement'
    | 'figure'
    | 'towardCheck'
    | 'existence'
    | 'pairing'
    | 'secondPart'
    | 'centrality'
    | 'unheard'
    | 'confirmation'
    | 'safety'
    | 'invitation'
    | 'experiment'
    | 'voice'
    | 'intent'
    | 'noticing'
  value: string
  /** The person's text it came from, verbatim. Defaults never borrow one. */
  source: string | null
  confidence: Confidence
}

export interface Line {
  id: number
  speaker: 'guide' | 'person'
  text: string
  origin: 'script' | 'ai' | 'fallback' | 'person'
  /** Why a fallback was used — for the record, never shown in the talk. */
  note?: string
}

export interface ConversationPart {
  id: string
  name: string
  look: Look
  /** Where it started; the summary only describes a default once it has been moved. */
  placement: Placement
  /** Its starting size came from an answer ("loudest", "rarely heard"). */
  sizeFromAnswer: boolean
}

/** What the card on screen is waiting for. */
export type Step =
  // The entry conversation's questions.
  | 'freeWrite'
  | 'loudest'
  | 'towardCheck'
  | 'secondName'
  | 'centrality'
  | 'unheard'
  | 'unheardName'
  | 'confirm'
  /** Nothing: the card has only lines and Close (the closing, a last reflection). */
  | 'closed'
  /** No card. */
  | 'idle'
  // After the entry conversation.
  /** The experiment invitation: Not now or Let's try. */
  | 'invite'
  /** The slim bar while they try: I've tried it. */
  | 'trying'
  /** "What was that like?" */
  | 'experiment'
  /** Get to know it: what the part would say… */
  | 'voice'
  /** …and what it might be trying to do. */
  | 'intent'
  /** A "How it is" edit changed what the summary says. */
  | 'noticing'
  /** The safety path: the pause card, then no more guide this session. */
  | 'paused'

/** Steps that wait for a typed answer. */
export const ANSWERED_STEPS: readonly Step[] = [
  'freeWrite',
  'loudest',
  'towardCheck',
  'secondName',
  'centrality',
  'unheard',
  'unheardName',
  'confirm',
  'experiment',
  'voice',
  'intent',
  'noticing',
]

/** Steps with a way out that keeps the map as it is (Not now, That's enough for now). */
export const DECLINABLE_STEPS: readonly Step[] = ['invite', 'experiment', 'voice', 'intent', 'noticing']

export type Job =
  | { kind: 'reflect'; request: ReflectRequest }
  | { kind: 'towardCheck'; request: TowardCheckRequest }
  | { kind: 'centrality'; request: CentralityRequest }
  | { kind: 'corrections'; request: CorrectionsRequest }
  | { kind: 'risk'; request: RiskRequest }

/** An AI call in flight; results carrying another `seq` are stale and ignored. */
export type Pending = Job & { seq: number }

/** What Turn 3 asked about. */
type CentralityAsk = { kind: 'one'; id: string } | { kind: 'two'; a: string; b: string }

export interface ConversationState {
  step: Step
  /** The question awaiting an answer, exactly as shown. */
  asked: string
  pending: Pending | null
  seq: number
  /** Everything said, for the record. Only the current card is shown. */
  lines: Line[]
  /**
   * Index of the first line on the current card, or null when there is no
   * card. Never reused: a new card always starts past every line so far.
   */
  card: number | null
  /** The latest answer to each question. */
  answers: Partial<Record<Step, string>>
  parts: ConversationPart[]
  record: Attribute[]
  /** Set when JEV opens the polarization branch; part 2 inherits its source. */
  polarization: { answer: string; probability: number } | null
  /** This session's shuffled figures, taken in creation order: no figure carries meaning. */
  figures: Look[]
  /** Landscape actions to apply, in order. Only ever appended to. */
  effects: Action[]
  centrality: CentralityAsk | null
  /** Parts whose distance Turn 3 answered (one-part question). */
  positionAnswered: string[]
  /** Turn 3's two-part answer: an order (nearer first) or a tie. */
  pair: [string, string] | null
  /** The part that rarely gets heard. */
  unheard: string | null
  /** The tension link, once part 2 exists. */
  link: string | null

  // ---------- After the entry conversation ----------

  /** The entry conversation is over (its closing, or a pause): the map is the person's. */
  ended: boolean
  /** Risk language was seen: no more questions, invitations, or noticing this session. */
  paused: boolean
  /** Turn 4b's first usable wish, quoted in the experiment invitation. */
  wish: Wish | null
  /** The experiment invitation has been shown (once per session). */
  invited: boolean
  /** How "What if" differed from "How it is" when they said they'd tried it. */
  tried: string[]
  /** Get to know it: the part being asked about, and its voice once given. */
  subject: { id: string; voice: string | null } | null
  /** Parts the noticing question has asked about (once each per session). */
  noticed: string[]
}

export type ConversationEvent =
  | { type: 'answer'; text: string; map: LandscapeState }
  | { type: 'noChanges'; text: string; map: LandscapeState }
  | { type: 'reflected'; seq: number; text: string | null; map: LandscapeState }
  | { type: 'towardChecked'; seq: number; result: TowardCheck | null; map: LandscapeState }
  | { type: 'centralityChecked'; seq: number; result: CentralityResult | null; map: LandscapeState }
  | { type: 'corrected'; seq: number; ops: ParsedOp[] | null; map: LandscapeState }
  | { type: 'riskChecked'; seq: number; atRisk: boolean | null; map: LandscapeState }
  /** Close on a card with nothing pending. */
  | { type: 'dismiss'; map: LandscapeState }
  /** Not now, That's enough for now. */
  | { type: 'decline'; map: LandscapeState }
  /** Let's try. */
  | { type: 'accept'; map: LandscapeState }
  /** I've tried it. */
  | { type: 'tried'; map: LandscapeState }
  /** The person switched to "What if…". */
  | { type: 'enteredWhatIf'; map: LandscapeState }
  /** Get to know it, on a selected part. */
  | { type: 'getToKnow'; partId: string; map: LandscapeState }
  /** The person rested after a "How it is" edit; `before` is the map the last time this was asked. */
  | { type: 'notice'; before: LandscapeState; partId: string | null; map: LandscapeState }

const high: Confidence = { tag: 'high' }
const parsed: Confidence = { tag: 'parsed' }
const notJudged: Confidence = { tag: 'notJudged' }
const byDefault: Confidence = { tag: 'default' }
const jev = (probability: number): Confidence =>
  probability >= JEV_THRESHOLD ? { tag: 'jev', probability } : { tag: 'low', probability }

// ---------- State helpers ----------

function say(state: ConversationState, line: Omit<Line, 'id'>): ConversationState {
  return { ...state, lines: [...state.lines, { id: state.lines.length, ...line }] }
}

const guide = (state: ConversationState, text: string) => say(state, { speaker: 'guide', text, origin: 'script' })

function ask(state: ConversationState, step: Step, question: string): ConversationState {
  return { ...guide(state, question), step, asked: question }
}

function note(state: ConversationState, ...attributes: Attribute[]): ConversationState {
  return { ...state, record: [...state.record, ...attributes] }
}

function request(state: ConversationState, job: Job): ConversationState {
  const seq = state.seq + 1
  return { ...state, seq, pending: { ...job, seq } }
}

function closeWith(state: ConversationState, closing: string): ConversationState {
  return { ...guide(state, closing), step: 'closed', asked: '', ended: true }
}

/** The card has said its piece: lines and Close, nothing awaited. */
function rest(state: ConversationState): ConversationState {
  return { ...state, step: 'closed', asked: '', subject: null }
}

/** No card at all. */
function idle(state: ConversationState): ConversationState {
  return { ...state, step: 'idle', asked: '', subject: null, card: null }
}

/** The guide opens a new card with no answer before it (after the entry conversation). */
function freshCard(state: ConversationState): ConversationState {
  return { ...state, card: state.lines.length }
}

/** The person's answer starts a new card: what the guide says next. */
function answered(state: ConversationState, text: string): ConversationState {
  const said = say(state, { speaker: 'person', text, origin: 'person' })
  return { ...said, answers: { ...said.answers, [state.step]: text }, card: said.lines.length }
}

function reask(state: ConversationState): ConversationState {
  const said = guide(state, script.reask(state.asked))
  return { ...said, card: said.lines.length - 1 }
}

/**
 * Queue map actions. Conversation-driven changes describe reality, so they
 * land in "How it is" — if the person is viewing "What if", the view
 * switches back (view only, no data change) so they see the change.
 */
function act(state: ConversationState, map: LandscapeState, ...actions: Action[]): ConversationState {
  if (actions.length === 0) return state
  // A part's words are its identity, like its name: the same in both modes, so no switch.
  const quiet: Action['type'][] = ['addPart', 'addLink', 'setWords', 'enterWhatIf']
  const changes = actions.some((action) => !quiet.includes(action.type))
  const view: Action[] = changes && map.mode === 'whatIf' ? [{ type: 'returnToCurrent' }] : []
  return { ...state, effects: [...state.effects, ...view, ...actions] }
}

// ---------- The map as it is now ----------

interface PartNow {
  id: string
  name: string
  removed: boolean
  /** In "How it is". */
  placement: Placement
}

/**
 * Every part, as the map has it now (in creation order). A part the
 * conversation named that hasn't landed on the map yet counts as named —
 * absent from the map is not the same as removed.
 */
function partsNow(state: ConversationState, map: LandscapeState): PartNow[] {
  const onMap = map.order.map((id) => ({
    id,
    name: map.parts[id].name,
    removed: map.parts[id].removed,
    placement: map.layouts.current[id],
  }))
  const landing = state.parts
    .filter((part) => !map.parts[part.id])
    .map(({ id, name, placement }) => ({ id, name, removed: false, placement }))
  return [...onMap, ...landing]
}

const visibleNow = (state: ConversationState, map: LandscapeState) =>
  partsNow(state, map).filter((part) => !part.removed)

const partNow = (state: ConversationState, map: LandscapeState, id: string) =>
  partsNow(state, map).find((part) => part.id === id) ?? null

const isHere = (state: ConversationState, map: LandscapeState, id: string) => partNow(state, map, id)?.removed === false

/** The tension link as the map has it (including taken down), or null before part 2. */
function linkNow(state: ConversationState, map: LandscapeState): CorrectionLink | null {
  if (!state.link) return null
  return map.links[state.link] ?? { id: state.link, between: [PART_1, PART_2], removed: false }
}

function drawnLink(state: ConversationState, map: LandscapeState): [string, string] | null {
  const link = linkNow(state, map)
  return link && !link.removed && link.between.every((id) => isHere(state, map, id)) ? link.between : null
}

/** Everything the person has written, for the "never introduce a term" checks. */
function personTexts(state: ConversationState, map: LandscapeState): string[] {
  const said = state.lines.filter((line) => line.speaker === 'person').map((line) => line.text)
  return [...said, ...partsNow(state, map).map((part) => part.name)]
}

// ---------- Parts and links ----------

const startingSpot = (id: string): Attribute => ({
  subject: id,
  attribute: 'placement',
  value: 'starting spot',
  source: null,
  confidence: byDefault,
})

function createPart(
  state: ConversationState,
  map: LandscapeState,
  part: Omit<ConversationPart, 'look'>,
  placement: Attribute,
  ...attributes: Attribute[]
): ConversationState {
  const look = state.figures[state.parts.length % state.figures.length]
  const created = act({ ...state, parts: [...state.parts, { ...part, look }] }, map, {
    type: 'addPart',
    part: { id: part.id, name: part.name, look },
    placement: part.placement,
  })
  return note(created, ...attributes, placement, {
    subject: part.id,
    attribute: 'figure',
    value: look,
    source: null,
    confidence: byDefault,
  })
}

function linkParts(state: ConversationState, map: LandscapeState): ConversationState {
  return act({ ...state, link: TENSION_LINK }, map, {
    type: 'addLink',
    link: { id: TENSION_LINK, between: [PART_1, PART_2] },
  })
}

function shuffled<T>(items: readonly T[]): T[] {
  const result = [...items]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

// ---------- Start ----------

const emptyConversation = (): ConversationState => ({
  step: 'freeWrite',
  asked: '',
  pending: null,
  seq: 0,
  lines: [],
  card: 0,
  answers: {},
  parts: [],
  record: [],
  polarization: null,
  figures: shuffled(FIGURES),
  effects: [],
  centrality: null,
  positionAnswered: [],
  pair: null,
  unheard: null,
  link: null,
  ended: false,
  paused: false,
  wish: null,
  invited: false,
  tried: [],
  subject: null,
  noticed: [],
})

export function startConversation(): ConversationState {
  return ask(emptyConversation(), 'freeWrite', script.freeWrite)
}

// ---------- Turns 0–2 ----------

const towardNotJudged = (source: string | null, value = 'not judged'): Attribute => ({
  subject: PART_1,
  attribute: 'towardCheck',
  value,
  source,
  confidence: notJudged,
})

function secondPartRecord(name: string, source: string, towardAnswer: string, probability: number): Attribute[] {
  return [
    { subject: PART_2, attribute: 'existence', value: 'another part, with strong feelings about part 1', source: towardAnswer, confidence: jev(probability) },
    { subject: PART_2, attribute: 'name', value: name, source, confidence: high },
    { subject: PART_2, attribute: 'pairing', value: `has strong feelings about ${PART_1}`, source: towardAnswer, confidence: jev(probability) },
    { subject: PART_2, attribute: 'size', value: String(DEFAULT_SCALE), source: null, confidence: byDefault },
  ]
}

function showReflection(
  state: ConversationState,
  map: LandscapeState,
  turn: ReflectTurn,
  text: string | null,
): ConversationState {
  const check = text === null ? { ok: false as const, reason: 'unavailable' } : checkReflection(text, personTexts(state, map))
  return check.ok
    ? say(state, { speaker: 'guide', text: text!.trim(), origin: 'ai' })
    : say(state, { speaker: 'guide', text: script.fallbackReflection[turn], origin: 'fallback', note: check.reason })
}

// ---------- Turn 3: centrality ----------

interface Exchange {
  question: string
  answer: string
}

/** No parts, or two parts with the same name: Turn 3 can't be asked. Records why. */
function centralitySkipped(state: ConversationState, map: LandscapeState): ConversationState | null {
  const parts = visibleNow(state, map)
  if (parts.length === 0) {
    return note(state, {
      subject: 'conversation',
      attribute: 'centrality',
      value: 'not asked: no parts on the map',
      source: null,
      confidence: notJudged,
    })
  }
  const [a, b] = parts
  if (b && normalizeAnswer(a.name) === normalizeAnswer(b.name)) {
    return note(
      state,
      ...parts.map((part): Attribute => ({
        subject: part.id,
        attribute: 'centrality',
        value: 'undetermined: same name',
        source: null,
        confidence: byDefault,
      })),
    )
  }
  return null
}

/** After Turn 2: reflect on the latest answer, then Turn 3 — or straight to Turn 4a if it can't be asked. */
function toTurn3(state: ConversationState, map: LandscapeState, last: Exchange | null): ConversationState {
  const skipped = centralitySkipped(state, map)
  if (skipped) return askUnheard(skipped, null)
  if (!last) return askCentrality(state, map)
  return request(state, {
    kind: 'reflect',
    request: { turn: 3, freeWrite: state.answers.freeWrite ?? '', ...last },
  })
}

function askCentrality(state: ConversationState, map: LandscapeState): ConversationState {
  const [a, b] = visibleNow(state, map)
  if (!b) return { ...ask(state, 'centrality', script.centralityOne(a.name)), centrality: { kind: 'one', id: a.id } }
  return {
    ...ask(state, 'centrality', script.centralityTwo(a.name, b.name)),
    centrality: { kind: 'two', a: a.id, b: b.id },
  }
}

const centralityIds = (asked: CentralityAsk) => (asked.kind === 'one' ? [asked.id] : [asked.a, asked.b])

/**
 * Parts removed while Turn 3 was being answered: none left → straight to
 * Turn 4a; one of two left → the answer is unclear (no move). Null when
 * every part asked about is still here.
 */
function centralityGone(state: ConversationState, map: LandscapeState, last: Exchange): ConversationState | null {
  const ids = centralityIds(state.centrality!)
  const left = ids.filter((id) => isHere(state, map, id))
  if (left.length === ids.length) return null
  const unjudged = (id: string, value: string): Attribute => ({
    subject: id,
    attribute: 'centrality',
    value,
    source: last.answer,
    confidence: notJudged,
  })
  if (left.length === 0) return askUnheard(note(state, ...ids.map((id) => unjudged(id, 'not judged: taken off the map'))), null)
  return askUnheard(note(state, unjudged(left[0], 'unclear: the other part was taken off the map')), last)
}

function placeInBucket(
  state: ConversationState,
  map: LandscapeState,
  id: string,
  bucket: Bucket,
  source: string,
  confidence: Confidence,
): ConversationState {
  const { placement } = partNow(state, map, id)!
  const next = intoBucket(placement, bucket)
  const noted = note(
    { ...state, positionAnswered: [...state.positionAnswered, id] },
    { subject: id, attribute: 'centrality', value: bucket, source, confidence },
  )
  return samePlace(next, placement) ? noted : act(noted, map, { type: 'place', partId: id, placement: next })
}

function placeInOrder(
  state: ConversationState,
  map: LandscapeState,
  nearId: string,
  otherId: string,
  source: string,
  confidence: Confidence,
): ConversationState {
  const near = partNow(state, map, nearId)!
  const other = partNow(state, map, otherId)!
  const moved = inOrder(near.placement, other.placement)
  const actions: Action[] = [
    ...(samePlace(moved.near, near.placement) ? [] : [{ type: 'place' as const, partId: nearId, placement: moved.near }]),
    ...(samePlace(moved.other, other.placement) ? [] : [{ type: 'place' as const, partId: otherId, placement: moved.other }]),
  ]
  const noted = note(
    { ...state, pair: [nearId, otherId] },
    { subject: nearId, attribute: 'centrality', value: `closer than ${otherId}`, source, confidence },
  )
  return act(noted, map, ...actions)
}

function markTie(state: ConversationState, a: string, b: string, source: string, confidence: Confidence) {
  return note(
    { ...state, pair: [a, b] },
    { subject: 'conversation', attribute: 'centrality', value: `${a} and ${b}: about the same`, source, confidence },
  )
}

/** Turn 3 by exact list match (works with AI off); null when the answer needs JEV. */
function centralityByList(state: ConversationState, map: LandscapeState, text: string): ConversationState | null {
  const asked = state.centrality!
  if (asked.kind === 'one') {
    const bucket: Bucket | null = matchesAny(text, CLOSE_FORMS)
      ? 'close'
      : matchesAny(text, FAR_FORMS)
        ? 'far'
        : matchesAny(text, MIDDLE_FORMS)
          ? 'middle'
          : null
    return bucket && placeInBucket(state, map, asked.id, bucket, text, high)
  }
  const answer = normalizeAnswer(text)
  if (answer === normalizeAnswer(partNow(state, map, asked.a)!.name)) return placeInOrder(state, map, asked.a, asked.b, text, high)
  if (answer === normalizeAnswer(partNow(state, map, asked.b)!.name)) return placeInOrder(state, map, asked.b, asked.a, text, high)
  if (matchesAny(text, TIE_FORMS)) return markTie(state, asked.a, asked.b, text, high)
  return null
}

function onCentralityAnswer(state: ConversationState, map: LandscapeState, text: string): ConversationState {
  const last = { question: state.asked, answer: text }
  const gone = centralityGone(state, map, last)
  if (gone) return gone
  const listed = centralityByList(state, map, text)
  if (listed) return askUnheard(listed, last)

  const asked = state.centrality!
  const name = (id: string) => partNow(state, map, id)!.name
  return request(state, {
    kind: 'centrality',
    request:
      asked.kind === 'one'
        ? { kind: 'one', partName: name(asked.id), ...last }
        : { kind: 'two', partA: name(asked.a), partB: name(asked.b), ...last },
  })
}

function onCentralityChecked(
  state: ConversationState,
  seq: number,
  result: CentralityResult | null,
  map: LandscapeState,
): ConversationState {
  const job = state.pending
  if (job?.kind !== 'centrality' || job.seq !== seq) return state
  const settled = { ...state, pending: null }
  const last = { question: job.request.question, answer: job.request.answer }
  const gone = centralityGone(settled, map, last)
  if (gone) return gone

  const asked = settled.centrality!
  const subject = asked.kind === 'one' ? asked.id : 'conversation'
  if (!result) {
    return askUnheard(
      note(settled, { subject, attribute: 'centrality', value: 'not judged', source: last.answer, confidence: notJudged }),
      last,
    )
  }
  const probability = (result.probabilities as Record<string, number>)[result.label]
  const confidence = jev(probability)
  // Unclear or below the threshold: nothing moves.
  if (result.label === 'unclear' || probability < JEV_THRESHOLD) {
    return askUnheard(note(settled, { subject, attribute: 'centrality', value: result.label, source: last.answer, confidence }), last)
  }
  if (asked.kind === 'one') {
    return askUnheard(placeInBucket(settled, map, asked.id, result.label as Bucket, last.answer, confidence), last)
  }
  const placed =
    result.label === 'part_a_closer'
      ? placeInOrder(settled, map, asked.a, asked.b, last.answer, confidence)
      : result.label === 'part_b_closer'
        ? placeInOrder(settled, map, asked.b, asked.a, last.answer, confidence)
        : markTie(settled, asked.a, asked.b, last.answer, confidence)
  return askUnheard(placed, last)
}

// ---------- Turn 4a: the unheard part ----------

/** Turn 4a opens with a reflection on Turn 3's answer — unless Turn 3 was skipped. */
function askUnheard(state: ConversationState, last: Exchange | null): ConversationState {
  if (!last) return ask(state, 'unheard', script.unheard)
  return request(state, { kind: 'reflect', request: { turn: 4, freeWrite: state.answers.freeWrite ?? '', ...last } })
}

/** A name, or an explicit no/unsure — never an inferred one. `probe` is the answer to the 4a question itself. */
function resolveUnheard(state: ConversationState, map: LandscapeState, text: string, probe: string): ConversationState {
  const decline = (value: 'none' | 'unsure') =>
    toConfirm(note(state, { subject: 'conversation', attribute: 'unheard', value, source: text, confidence: high }), map)
  if (matchesAny(text, NO_FORMS)) return decline('none')
  if (matchesAny(text, UNSURE_FORMS)) return decline('unsure')

  const name = text.trim()
  const reading = (attribute: Attribute['attribute'], value: string): Attribute => ({
    subject: PART_3,
    attribute,
    value,
    source: probe,
    confidence: high,
  })
  const created = createPart(
    state,
    map,
    {
      id: PART_3,
      name,
      placement: { ...clearestSpot(map, EDGE_SPOTS), scale: UNHEARD_SCALE },
      sizeFromAnswer: true,
    },
    reading('placement', 'at the edge (rarely heard)'),
    reading('unheard', 'rarely gets heard'),
    { subject: PART_3, attribute: 'name', value: name, source: text, confidence: high },
    reading('size', 'small (rarely heard)'),
  )
  return toConfirm({ ...created, unheard: PART_3 }, map)
}

// ---------- Turn 4b: confirmation and one correction round ----------

function summaryInput(state: ConversationState, map: LandscapeState): SummaryInput {
  const visible = visibleNow(state, map)
  const named = new Map(state.parts.map((part) => [part.id, part]))
  const here = (id: string) => visible.some((part) => part.id === id)
  return {
    parts: visible.map((part) => ({
      id: part.id,
      name: part.name,
      placement: part.placement,
      start: named.get(part.id)?.placement ?? part.placement,
      sizeFromAnswer: named.get(part.id)?.sizeFromAnswer ?? false,
      positionFromAnswer: state.positionAnswered.includes(part.id),
      unheard: part.id === state.unheard,
    })),
    pair: state.pair?.every(here) ? state.pair : null,
    link: drawnLink(state, map),
  }
}

/**
 * The note a full run leaves on the map: Turn 4b's summary, kept true to
 * the map as the person rearranges it, about whichever mode is showing.
 * Null when nothing is left to describe.
 */
export function mapNote(state: ConversationState, map: LandscapeState): string | null {
  const input = summaryInput(state, map)
  if (input.parts.length === 0) return null
  const whatIf = map.mode === 'whatIf' ? map.layouts.whatIf : null
  if (!whatIf) return script.note(summarize(input))
  const parts = input.parts.map((part) => ({ ...part, placement: whatIf[part.id] ?? part.placement }))
  return script.noteWhatIf(summaryClauses({ ...input, parts }))
}

/** Turn 4b has no reflection: the summary mirrors their words already. */
function toConfirm(state: ConversationState, map: LandscapeState): ConversationState {
  if (visibleNow(state, map).length === 0) return closeWith(state, script.closingEarly)
  return ask(state, 'confirm', script.confirm(summarize(summaryInput(state, map))))
}

const confirmation = (value: string, source: string, confidence: Confidence): Attribute => ({
  subject: 'conversation',
  attribute: 'confirmation',
  value,
  source,
  confidence,
})

function onConfirmAnswer(state: ConversationState, map: LandscapeState, text: string): ConversationState {
  if (matchesAny(text, AFFIRM_FORMS)) return closeWith(note(state, confirmation('affirmed', text, high)), script.closing)
  if (matchesAny(text, UNLINK_FORMS)) {
    return settleCorrections(state, map, text, [{ kind: 'unlink', quote: text, refersTo: '', newName: '' }], high)
  }
  const parts = partsNow(state, map)
  const link = drawnLink(state, map)
  const name = (id: string) => parts.find((part) => part.id === id)!.name
  return request(state, {
    kind: 'corrections',
    request: {
      correction: text,
      parts: parts.filter((part) => !part.removed).map((part) => part.name),
      removed: parts.filter((part) => part.removed).map((part) => part.name),
      link: link && [name(link[0]), name(link[1])],
    },
  })
}

/** Apply what verifies, narrate it, then the wish and map lines as needed, then close. */
function settleCorrections(
  state: ConversationState,
  map: LandscapeState,
  text: string,
  ops: readonly ParsedOp[],
  confidence: Confidence,
): ConversationState {
  const parts: CorrectionPart[] = partsNow(state, map)
  const outcome = applyCorrections(text, ops, parts, linkNow(state, map))
  const changed = outcome.applied.length > 0 || outcome.notes.length > 0
  const affirmed = !changed && !outcome.wish && !outcome.unclear

  let settled = act({ ...state, wish: outcome.firstWish }, map, ...outcome.actions)
  settled = note(
    settled,
    ...outcome.changes.map((change): Attribute => ({ ...change, source: text, confidence })),
    confirmation(affirmed ? 'affirmed' : 'corrected', text, confidence),
  )
  if (changed) settled = guide(settled, script.done.line(outcome.applied, outcome.notes))
  if (outcome.wish) settled = guide(settled, script.wishLine)
  if (outcome.unclear) settled = guide(settled, script.mapLine)
  return closeWith(settled, script.closing)
}

function onCorrected(state: ConversationState, seq: number, ops: ParsedOp[] | null, map: LandscapeState): ConversationState {
  const job = state.pending
  if (job?.kind !== 'corrections' || job.seq !== seq) return state
  const settled = { ...state, pending: null }
  const text = job.request.correction
  // A failed parse is never a silent close.
  if (!ops) {
    return closeWith(guide(note(settled, confirmation('not understood', text, notJudged)), script.mapLine), script.closing)
  }
  return settleCorrections(settled, map, text, ops, parsed)
}

function onNoChanges(state: ConversationState, text: string): ConversationState {
  if (state.pending || state.step !== 'confirm') return state
  return closeWith(note(answered(state, text), confirmation('affirmed', text, high)), script.closing)
}

// ---------- After the entry conversation (docs/slice-4-handoff.md) ----------

/** A full run reached Turn 4b's confirmation (not an early close, not a pause before it). */
const fullRun = (state: ConversationState) => state.record.some((entry) => entry.attribute === 'confirmation')

/**
 * Whether the app may open a card of its own (the invitation, noticing):
 * never over a card that waits for the person, an answer in flight, or a pause.
 * The closing card, or any card with only Close, may be replaced.
 */
function appMayOpen(state: ConversationState): boolean {
  return state.ended && !state.paused && !state.pending && (state.step === 'closed' || state.step === 'idle')
}

/** Whether the person may start Get to know it: their own request wins over the app's open cards. */
export function canGetToKnow(state: ConversationState): boolean {
  const replaceable: Step[] = ['closed', 'idle', 'invite', 'noticing']
  return state.ended && !state.paused && !state.pending && replaceable.includes(state.step)
}

const subjectHere = (state: ConversationState, map: LandscapeState) =>
  state.subject !== null && isHere(state, map, state.subject.id)

/** Visible parts in both layouts, in creation order. */
function arranged(state: ConversationState, map: LandscapeState): ArrangedPart[] {
  const whatIf = map.layouts.whatIf ?? map.layouts.current
  return visibleNow(state, map).map((part) => ({
    name: part.name,
    current: part.placement,
    whatIf: whatIf[part.id] ?? part.placement,
  }))
}

/** The first time they enter "What if" after a full run: one invitation, in their wish's words if they made one. */
function onEnteredWhatIf(state: ConversationState, map: LandscapeState): ConversationState {
  if (state.invited || !appMayOpen(state) || !fullRun(state) || visibleNow(state, map).length === 0) return state
  const { wish } = state
  // A wish about a part that has since left the map gets the generic invitation.
  const quote = wish && (wish.partId === null || isHere(state, map, wish.partId)) ? wish.quote : null
  const shown = note(
    { ...state, invited: true },
    { subject: 'conversation', attribute: 'invitation', value: quote ? 'shown, with their wish' : 'shown', source: quote, confidence: quote ? high : byDefault },
  )
  return { ...guide(freshCard(shown), script.invite(quote)), step: 'invite', asked: '' }
}

function onAccept(state: ConversationState, map: LandscapeState): ConversationState {
  if (state.pending || state.step !== 'invite') return state
  const accepted = note(state, { subject: 'conversation', attribute: 'invitation', value: 'accepted', source: null, confidence: high })
  // Accepted from "How it is" (they switched back meanwhile): the trying happens in "What if".
  const there = map.mode === 'whatIf' ? accepted : act(accepted, map, { type: 'enterWhatIf' })
  return { ...guide(freshCard(there), script.trying), step: 'trying', asked: '' }
}

function onTried(state: ConversationState, map: LandscapeState): ConversationState {
  if (state.pending || state.step !== 'trying') return state
  const parts = arranged(state, map)
  if (!arrangementDiffers(parts)) return { ...guide(freshCard(state), script.nothingMoved), step: 'trying' }
  return ask(freshCard({ ...state, tried: arrangementChanges(parts) }), 'experiment', script.whatWasThatLike)
}

function onExperimentAnswer(state: ConversationState, text: string): ConversationState {
  const noted = note(state, {
    subject: 'conversation',
    attribute: 'experiment',
    value: state.tried.length > 0 ? state.tried.join('; ') : 'small changes',
    source: text,
    confidence: high,
  })
  return request(noted, {
    kind: 'reflect',
    request: { turn: 'experiment', freeWrite: state.answers.freeWrite ?? '', changes: state.tried, question: state.asked, answer: text },
  })
}

function onGetToKnow(state: ConversationState, partId: string, map: LandscapeState): ConversationState {
  if (!canGetToKnow(state) || !isHere(state, map, partId)) return state
  const name = partNow(state, map, partId)!.name
  return ask(freshCard({ ...state, subject: { id: partId, voice: null } }), 'voice', script.voice(name))
}

function onVoiceAnswer(state: ConversationState, map: LandscapeState, text: string): ConversationState {
  // Taken off the map while they answered: the card ends quietly, and the answer is dropped.
  if (!subjectHere(state, map)) return idle(state)
  const { id } = state.subject!
  const stored = act(
    note({ ...state, subject: { id, voice: text } }, { subject: id, attribute: 'voice', value: text, source: text, confidence: high }),
    map,
    { type: 'setWords', partId: id, words: { voice: text } },
  )
  return request(stored, {
    kind: 'reflect',
    request: {
      turn: 'voice',
      freeWrite: state.answers.freeWrite ?? '',
      partName: partNow(state, map, id)!.name,
      question: state.asked,
      answer: text,
    },
  })
}

function onIntentAnswer(state: ConversationState, map: LandscapeState, text: string): ConversationState {
  if (!subjectHere(state, map)) return idle(state)
  const { id, voice } = state.subject!
  const stored = act(
    note(state, { subject: id, attribute: 'intent', value: text, source: text, confidence: high }),
    map,
    { type: 'setWords', partId: id, words: { voice: voice ?? undefined, intent: text } },
  )
  return request(stored, {
    kind: 'reflect',
    request: {
      turn: 'intent',
      freeWrite: state.answers.freeWrite ?? '',
      partName: partNow(state, map, id)!.name,
      voice: voice ?? '',
      question: state.asked,
      answer: text,
    },
  })
}

/**
 * The person rested after a "How it is" edit. Asks once about a part the
 * summary now says something new about — the edited part first, then any
 * other — never about a part it has asked about before. When the card can't
 * open, the moment is simply dropped (the caller's baseline moves on).
 */
function onNotice(state: ConversationState, before: LandscapeState, partId: string | null, map: LandscapeState): ConversationState {
  if (!appMayOpen(state) || !fullRun(state) || map.mode !== 'current') return state
  const was = partPhrases(summaryInput(state, before))
  const now = partPhrases(summaryInput(state, map))
  const visible = visibleNow(state, map)
  const edited = visible.filter((part) => part.id === partId)
  for (const part of [...edited, ...visible.filter((part) => part.id !== partId)]) {
    if (state.noticed.includes(part.id)) continue
    const old = new Set((was.get(part.id) ?? []).map((phrase) => phrase.key))
    const gained = (now.get(part.id) ?? []).filter((phrase) => !old.has(phrase.key))
    if (gained.length === 0) continue
    const clause = script.summary.part(part.name, gained.map((phrase) => phrase.text))
    const asked = note(
      { ...state, noticed: [...state.noticed, part.id] },
      { subject: part.id, attribute: 'noticing', value: `asked: ${clause}`, source: null, confidence: byDefault },
    )
    return ask(freshCard(asked), 'noticing', script.noticing(clause))
  }
  return state
}

function onNoticingAnswer(state: ConversationState, text: string): ConversationState {
  const noted = note(state, { subject: 'conversation', attribute: 'noticing', value: 'answered', source: text, confidence: high })
  return request(noted, {
    kind: 'reflect',
    request: { turn: 'noticing', freeWrite: state.answers.freeWrite ?? '', question: state.asked, answer: text },
  })
}

/** Not now, That's enough for now: the card goes, and the map stays as it is. */
function onDecline(state: ConversationState): ConversationState {
  if (state.pending || !DECLINABLE_STEPS.includes(state.step)) return state
  const outcome: Partial<Record<Step, Attribute>> = {
    invite: { subject: 'conversation', attribute: 'invitation', value: 'declined', source: null, confidence: high },
    experiment: { subject: 'conversation', attribute: 'experiment', value: 'not answered', source: null, confidence: high },
    noticing: { subject: 'conversation', attribute: 'noticing', value: 'not answered', source: null, confidence: high },
  }
  const declined = outcome[state.step]
  return idle(declined ? note(state, declined) : state)
}

/** Close, on a card that waits for nothing. */
function onDismiss(state: ConversationState): ConversationState {
  if (state.pending || (state.step !== 'closed' && state.step !== 'paused')) return state
  return idle(state)
}

// ---------- The safety path ----------

/** Stops the guide for the session: the pause card, then no more questions. The answer isn't used. */
function pause(state: ConversationState, text: string, how: string): ConversationState {
  const noted = note(state, { subject: 'conversation', attribute: 'safety', value: `paused: ${how}`, source: text, confidence: high })
  return { ...guide(noted, script.pause), step: 'paused', asked: '', ended: true, paused: true, subject: null }
}

/**
 * Every typed answer passes here before anything reads it. A risk phrase
 * pauses at once; an exact list answer can't carry risk language and goes
 * straight on; anything else waits for the AI risk check.
 */
function onAnswer(state: ConversationState, text: string, map: LandscapeState): ConversationState {
  if (state.pending || !ANSWERED_STEPS.includes(state.step)) return state
  if (text.trim() === '') return reask(state)

  const next = answered(state, text)
  if (hasRiskPhrase(text)) return pause(next, text, 'risk phrase')
  if (matchesAny(text, LISTED_FORMS)) return proceed(next, text, map)
  return request(next, { kind: 'risk', request: { question: state.asked, answer: text } })
}

function onRiskChecked(state: ConversationState, seq: number, atRisk: boolean | null, map: LandscapeState): ConversationState {
  const job = state.pending
  if (job?.kind !== 'risk' || job.seq !== seq) return state
  const settled = { ...state, pending: null }
  const text = job.request.answer
  if (atRisk) return pause(settled, text, 'risk check')
  // A failed check leaves the phrase list as the floor, and the talk goes on.
  const checked =
    atRisk === null
      ? note(settled, { subject: 'conversation', attribute: 'safety', value: 'not checked', source: text, confidence: notJudged })
      : settled
  return proceed(checked, text, map)
}

// ---------- Events ----------

/** An answer that passed the safety path. `state` already holds it (see `answered`). */
function proceed(state: ConversationState, text: string, map: LandscapeState): ConversationState {
  const last = { question: state.asked, answer: text }

  switch (state.step) {
    case 'freeWrite':
      return request(state, { kind: 'reflect', request: { turn: 1, freeWrite: text } })

    case 'loudest': {
      const name = text.trim()
      const named = createPart(
        state,
        map,
        {
          id: PART_1,
          name,
          placement: { ...clearestSpot(map, STARTING_SPOTS), scale: PART_1_SCALE },
          sizeFromAnswer: true,
        },
        startingSpot(PART_1),
        { subject: PART_1, attribute: 'name', value: name, source: text, confidence: high },
        { subject: PART_1, attribute: 'size', value: 'largest', source: text, confidence: high },
      )
      return request(named, {
        kind: 'reflect',
        request: { turn: 2, freeWrite: state.answers.freeWrite ?? '', loudest: text },
      })
    }

    case 'towardCheck': {
      // Removed while answering: nothing left to feel toward, so skip JEV.
      const part1 = partNow(state, map, PART_1)
      if (!part1 || part1.removed) {
        return toTurn3(note(state, towardNotJudged(text, 'not judged: part taken off the map')), map, last)
      }
      return request(state, {
        kind: 'towardCheck',
        request: { partName: part1.name, question: state.asked, answer: text },
      })
    }

    case 'secondName': {
      if (isExit(text)) {
        const declined = note(state, {
          subject: 'conversation',
          attribute: 'secondPart',
          value: 'declined: all one feeling',
          source: text,
          confidence: high,
        })
        return toTurn3(declined, map, last)
      }
      const { answer, probability } = state.polarization!
      const name = text.trim()
      const named = createPart(
        state,
        map,
        {
          id: PART_2,
          name,
          placement: { ...clearestSpot(map, STARTING_SPOTS), scale: DEFAULT_SCALE },
          sizeFromAnswer: false,
        },
        startingSpot(PART_2),
        ...secondPartRecord(name, text, answer, probability),
      )
      return toTurn3(linkParts(named, map), map, last)
    }

    case 'centrality':
      return onCentralityAnswer(state, map, text)

    case 'unheard':
      if (matchesAny(text, YES_FORMS)) return ask(state, 'unheardName', script.unheardName)
      return resolveUnheard(state, map, text, text)

    case 'unheardName':
      return resolveUnheard(state, map, text, state.answers.unheard ?? text)

    case 'confirm':
      return onConfirmAnswer(state, map, text)

    case 'experiment':
      return onExperimentAnswer(state, text)

    case 'voice':
      return onVoiceAnswer(state, map, text)

    case 'intent':
      return onIntentAnswer(state, map, text)

    case 'noticing':
      return onNoticingAnswer(state, text)

    default:
      return state
  }
}

function onReflected(state: ConversationState, seq: number, text: string | null, map: LandscapeState): ConversationState {
  const job = state.pending
  if (job?.kind !== 'reflect' || job.seq !== seq) return state
  const settled = { ...state, pending: null }
  const { turn } = job.request

  // Removed before the toward-check appears: skip it, and its reflection.
  if (turn === 2 && !isHere(settled, map, PART_1)) {
    return toTurn3(note(settled, towardNotJudged(null, 'not asked: part taken off the map')), map, null)
  }
  // Turn 3 became impossible while reflecting: drop the reflection, ask 4a directly.
  if (turn === 3) {
    const skipped = centralitySkipped(settled, map)
    if (skipped) return askUnheard(skipped, null)
  }
  // Get to know it: the part was taken off the map while reflecting, so the card ends quietly.
  if (turn === 'voice' && !subjectHere(settled, map)) return idle(settled)

  const reflected = showReflection(settled, map, turn, text)
  switch (turn) {
    case 1:
      return ask(reflected, 'loudest', script.loudest)
    case 2:
      return ask(reflected, 'towardCheck', script.towardCheck(partNow(settled, map, PART_1)!.name))
    case 3:
      return askCentrality(reflected, map)
    case 4:
      return ask(reflected, 'unheard', script.unheard)
    case 'voice':
      return ask(reflected, 'intent', script.intent(partNow(settled, map, settled.subject!.id)!.name))
    case 'experiment':
      return rest(guide(reflected, script.experimentDone))
    case 'intent':
    case 'noticing':
      return rest(reflected)
  }
}

function onTowardChecked(state: ConversationState, seq: number, result: TowardCheck | null, map: LandscapeState): ConversationState {
  const job = state.pending
  if (job?.kind !== 'towardCheck' || job.seq !== seq) return state
  const settled = { ...state, pending: null }
  const { answer, question } = job.request
  const last = { question, answer }

  if (!isHere(settled, map, PART_1)) {
    return toTurn3(note(settled, towardNotJudged(answer, 'not judged: part taken off the map')), map, last)
  }
  // JEV failed: the single-part path, tagged as not judged (distinct from low).
  if (!result) return toTurn3(note(settled, towardNotJudged(answer)), map, last)

  const { label, probabilities } = result
  const judged = note(settled, {
    subject: PART_1,
    attribute: 'towardCheck',
    value: label,
    source: answer,
    confidence: jev(probabilities[label]),
  })

  // Below the threshold never guesses a second part into existence.
  const frustrated = probabilities.frustrated_critical
  if (frustrated < JEV_THRESHOLD) return toTurn3(judged, map, last)

  const branched = guide({ ...judged, polarization: { answer, probability: frustrated } }, script.polarization)
  return ask(branched, 'secondName', script.secondName)
}

export function conversationReducer(state: ConversationState, event: ConversationEvent): ConversationState {
  switch (event.type) {
    case 'answer':
      return onAnswer(state, event.text, event.map)
    case 'noChanges':
      return onNoChanges(state, event.text)
    case 'reflected':
      return onReflected(state, event.seq, event.text, event.map)
    case 'towardChecked':
      return onTowardChecked(state, event.seq, event.result, event.map)
    case 'centralityChecked':
      return onCentralityChecked(state, event.seq, event.result, event.map)
    case 'corrected':
      return onCorrected(state, event.seq, event.ops, event.map)
    case 'riskChecked':
      return onRiskChecked(state, event.seq, event.atRisk, event.map)
    case 'dismiss':
      return onDismiss(state)
    case 'decline':
      return onDecline(state)
    case 'accept':
      return onAccept(state, event.map)
    case 'tried':
      return onTried(state, event.map)
    case 'enteredWhatIf':
      return onEnteredWhatIf(state, event.map)
    case 'getToKnow':
      return onGetToKnow(state, event.partId, event.map)
    case 'notice':
      return onNotice(state, event.before, event.partId, event.map)
  }
}
