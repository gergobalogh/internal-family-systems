import { NAME_MAX_LENGTH } from '../model/landscape'
import { LOOKS } from '../model/types'
import type { Action, LandscapeState, Look, Placement } from '../model/types'
import {
  AFFIRM_FORMS,
  CLOSE_FORMS,
  FAR_FORMS,
  LISTED_FORMS,
  MIDDLE_FORMS,
  NO_FORMS,
  SEPARATE_FORMS,
  TIE_FORMS,
  UNLINK_FORMS,
  UNSURE_FORMS,
  YES_FORMS,
  checkReflection,
  hasRiskPhrase,
  isExit,
  matchesAny,
  nameWords,
  normalizeAnswer,
  wordRun,
} from './checks'
import type {
  CentralityRequest,
  CentralityResult,
  CorrectionsRequest,
  FigureChoice,
  FigureReading,
  FigureRequest,
  FreeWriteAnalysis,
  FreeWriteForm,
  FreeWriteRequest,
  ParsedOp,
  PartKind,
  PartKindChoice,
  ReflectRequest,
  ReflectTurn,
  RiskRequest,
  TowardCheck,
  TowardCheckRequest,
} from './contract'
import { applyCorrections } from './corrections'
import type { CorrectionLink, CorrectionPart, Wish } from './corrections'
import { EDGE_SPOTS, clearestSpot, inOrder, intoBucket, samePlace, startingSpotsForKind } from './geometry'
import type { Bucket } from './geometry'
import { script } from './script'
import { arrangementChanges, arrangementDiffers, partPhrases, summarize, summaryClauses } from './summary'
import type { ArrangedPart, SummaryInput } from './summary'

/**
 * The entry conversation, Turns 0–4, and what the guide does after it
 * (docs/slice-4-handoff.md, plus the optional part that rarely gets heard,
 * offered on the closing card), as a pure state machine. Async work (LLM
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
/** Calibrated on 72 messy free-writes: 71/72 labels, with the one error below this gate. */
export const TURN_1_FORM_THRESHOLD = 0.7

export const PART_1 = 'part-1'
export const PART_2 = 'part-2'
/** The Turn 2 pairing, drawn as a link. */
export const TENSION_LINK = 'link-tension'
/** "Loudest" → largest: the size seed rule. */
export const PART_1_SCALE = 1.6
export const DEFAULT_SCALE = 1
/** "Rarely gets heard" → small (Brief 2's mapping rule). */
export const UNHEARD_SCALE = 0.7

export type Confidence =
  /** The person's own words, verbatim (or an exact list match on them). */
  | { tag: 'high' }
  /** The app's shortening of a naming answer: contiguous words from it, verified in code. */
  | { tag: 'extracted' }
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
    | 'freeWriteForm'
    | 'freeWritePhrases'
    | 'kind'
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
  /** Hidden JEV reading used for its opening position; null means unsure or unavailable. */
  kind: PartKind | null
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
  | 'confirm'
  /** The full run's closing card: Close, or add a part that rarely gets heard. */
  | 'closing'
  /** Nothing: the card has only lines and Close (an early close, a last reflection). */
  | 'closed'
  /** No card. */
  | 'idle'
  // After the entry conversation.
  /** Add a quieter part: what they'd call the part that rarely gets heard. */
  | 'unheard'
  /** Add a part: what they'd call it. */
  | 'newPart'
  /** The experiment invitation: Not now or Let's try. */
  | 'invite'
  /** The slim bar while they try: I've tried it. */
  | 'trying'
  /** "I've tried it" with nothing moved: Keep trying, or Finish without changes. */
  | 'nothingMoved'
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
  'confirm',
  'unheard',
  'newPart',
  'experiment',
  'voice',
  'intent',
  'noticing',
]

/** Steps with a way out that keeps the map as it is (Not now, That's enough for now, Skip this one, Finish without changes). */
export const DECLINABLE_STEPS: readonly Step[] = [
  'unheard',
  'newPart',
  'invite',
  'nothingMoved',
  'experiment',
  'voice',
  'intent',
  'noticing',
]

export type Job =
  | { kind: 'reflect'; request: ReflectRequest }
  | { kind: 'freeWrite'; request: FreeWriteRequest }
  | { kind: 'towardCheck'; request: TowardCheckRequest }
  | { kind: 'centrality'; request: CentralityRequest }
  | { kind: 'corrections'; request: CorrectionsRequest }
  | { kind: 'risk'; request: RiskRequest }
  /**
   * A part is about to be named: which figure fits it and which hidden kind
   * chooses its opening ring. `next` is the
   * reflection that follows the naming, started alongside so the guide
   * thinks while the part walks in (see `reflectionAfterNaming`).
   */
  | { kind: 'figure'; request: FigureRequest; next?: ReflectRequest; extract?: boolean }

/** An AI call in flight; results carrying another `seq` are stale and ignored. */
export type Pending = Job & { seq: number }

/** What Turn 3 asked about. */
type CentralityAsk = { kind: 'one'; id: string } | { kind: 'two'; a: string; b: string }

/** The Turn 1 row chosen from Turn 0; `phrases` are verified copies of their words. */
export type Turn1Ask = {
  kind: 'default' | 'confirm' | 'choose' | 'name'
  question: string
  phrases: string[]
}

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
  turn1: Turn1Ask | null
  /** A Turn 0 phrase confirmed or tapped at Turn 1, with its original source. */
  turn1Name: { name: string; source: string } | null
  parts: ConversationPart[]
  record: Attribute[]
  /** Set when JEV opens the polarization branch; part 2 inherits its source. */
  polarization: { answer: string; probability: number } | null
  /**
   * Every figure, shuffled once per session. JEV picks a new part's figure;
   * this order breaks its ties and stands in when it can't be had.
   */
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
  /** Turn 4's first usable wish, quoted in the experiment invitation. */
  wish: Wish | null
  /** The experiment invitation has been shown, or they started one themselves: the app doesn't invite again. */
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
  | { type: 'freeWriteRead'; seq: number; result: FreeWriteAnalysis | null; map: LandscapeState }
  | { type: 'towardChecked'; seq: number; result: TowardCheck | null; map: LandscapeState }
  | { type: 'centralityChecked'; seq: number; result: CentralityResult | null; map: LandscapeState }
  | { type: 'corrected'; seq: number; ops: ParsedOp[] | null; map: LandscapeState }
  | { type: 'riskChecked'; seq: number; atRisk: boolean | null; map: LandscapeState }
  | { type: 'figured'; seq: number; result: FigureReading | null; extracted: string | null; map: LandscapeState }
  /** One of Turn 1's verified free-write phrases was tapped. */
  | { type: 'turn1Choice'; phrase: string; map: LandscapeState }
  /** Close on a card with nothing pending. */
  | { type: 'dismiss'; map: LandscapeState }
  /** Not now, That's enough for now. */
  | { type: 'decline'; map: LandscapeState }
  /** Let's try. */
  | { type: 'accept'; map: LandscapeState }
  /** Try an experiment, from the top bar in "What if…". */
  | { type: 'tryExperiment'; map: LandscapeState }
  /** I've tried it. */
  | { type: 'tried'; map: LandscapeState }
  /** Keep trying, after "Nothing's moved yet". */
  | { type: 'keepTrying'; map: LandscapeState }
  /** The person switched to "What if…". */
  | { type: 'enteredWhatIf'; map: LandscapeState }
  /** Add a quieter part, on the closing card. */
  | { type: 'addQuieter'; map: LandscapeState }
  /** Add a part, from the top bar in "How it is". */
  | { type: 'newPart'; map: LandscapeState }
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

/** The full run's closing: the map is theirs, with a quieter part theirs to add. */
function closeFullRun(state: ConversationState): ConversationState {
  return { ...closeWith(state, script.closing), step: 'closing' }
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

/**
 * Before a part is named, two calls run side by side: one JEV request reads
 * both its figure and hidden kind, while the extractor shortens the answer
 * to the naming words. The figured event carries all three and then names
 * it. The reflection that follows starts alongside them. The answer has
 * passed the safety path by now.
 */
function chooseFigure(state: ConversationState, name: string): ConversationState {
  // "What would you call it?" says nothing on its own: the part is the separate feeling.
  const question = state.step === 'secondName' ? script.secondName : state.asked
  return request(state, {
    kind: 'figure',
    request: { name, question, freeWrite: state.answers.freeWrite ?? '' },
    next: reflectionAfterNaming(state),
    // A phrase copied from Turn 0 is already the exact name; only typed
    // naming answers need the slower Claude shortening call.
    extract: !(state.step === 'loudest' && state.turn1Name !== null),
  })
}

/**
 * The reflection asked for once this naming answer has named a part — the
 * same request `nameLoudest` and `toTurn3` will make, built from the same
 * stored answer, so the early one is used. None after adding a part.
 */
function reflectionAfterNaming(state: ConversationState): ReflectRequest | undefined {
  const freeWrite = state.answers.freeWrite ?? ''
  if (state.step === 'loudest') return { turn: 2, freeWrite, loudest: state.turn1Name?.name ?? state.answers.loudest! }
  if (state.step === 'secondName') return { turn: 3, freeWrite, question: state.asked, answer: state.answers.secondName! }
  return undefined
}

/** A figure, and how it was chosen. */
interface Figure {
  look: Look
  confidence: Confidence
}

interface KindReading {
  /** Null below the confidence gate; the part then keeps a neutral spot. */
  kind: PartKind | null
  value: PartKind | 'not judged'
  confidence: Confidence
}

/**
 * JEV's most probable figure that no part has (removed ones included, so
 * undoing a removal never shows two alike). The map has each part's figure
 * as it is now: the person may have changed one. Without a reading, the next
 * free one in the session's shuffled order.
 */
function figureFor(state: ConversationState, map: LandscapeState, result: FigureChoice | null): Figure {
  const landing = state.parts.filter((part) => !map.parts[part.id])
  const taken = new Set([...Object.values(map.parts), ...landing].map((part) => part.look))
  const free = state.figures.filter((look) => !taken.has(look))
  if (!result) return { look: free[0], confidence: notJudged }
  const look = free.reduce((best, next) => (result.probabilities[next] > result.probabilities[best] ? next : best))
  return { look, confidence: jev(result.probabilities[look]) }
}

function kindFor(result: PartKindChoice | null): KindReading {
  if (!result) return { kind: null, value: 'not judged', confidence: notJudged }
  const probability = result.probabilities[result.label]
  return {
    kind: probability >= JEV_THRESHOLD ? result.label : null,
    value: result.label,
    confidence: jev(probability),
  }
}

const kindRecord = (id: string, source: string, reading: KindReading): Attribute => ({
  subject: id,
  attribute: 'kind',
  value: reading.value,
  source,
  confidence: reading.confidence,
})

/** Kind chooses only the opening ring; low/failed/other readings keep today's spots. */
function kindStartingSpot(map: LandscapeState, id: string, source: string, reading: KindReading, scale: number) {
  const activeKind = reading.kind === 'other' ? null : reading.kind
  return {
    placement: { ...clearestSpot(map, startingSpotsForKind(activeKind)), scale },
    record: {
      subject: id,
      attribute: 'placement',
      value: activeKind ? `${activeKind} starting spot` : 'starting spot',
      source: activeKind ? source : null,
      confidence: activeKind ? reading.confidence : byDefault,
    } satisfies Attribute,
  }
}

/**
 * The name a part gets: the extraction when it is usable, otherwise the
 * answer as sent. Usable means found in the answer as one contiguous run
 * of whole words (case, spacing and punctuation ignored), shorter than the
 * whole answer, and within the rename cap. The name is then cut from the
 * answer itself, so it is spelled as the person wrote it — the model
 * picks, the code checks, and a rewritten name can never get past.
 */
function resolveName(answer: string, extracted: string | null): { name: string; confidence: Confidence } {
  const verbatim = { name: answer, confidence: high }
  const run = extracted === null ? null : wordRun(answer, nameWords(extracted))
  if (!run || run.whole || run.text.length > NAME_MAX_LENGTH) return verbatim
  return { name: run.text, confidence: { tag: 'extracted' } }
}

const sameName = (a: string, b: string) => nameWords(a).join(' ') === nameWords(b).join(' ')

/** No part 2: the answer kept to one feeling. */
function declineSecond(state: ConversationState, map: LandscapeState, text: string, value: string, confidence: Confidence) {
  const declined = note(state, { subject: 'conversation', attribute: 'secondPart', value, source: text, confidence })
  return toTurn3(declined, map, { question: state.asked, answer: text })
}

function createPart(
  state: ConversationState,
  map: LandscapeState,
  part: Omit<ConversationPart, 'look'>,
  { look, confidence }: Figure,
  /** The naming answer the figure was judged from (the name may be its shortening). */
  figureSource: string,
  placement: Attribute,
  ...attributes: Attribute[]
): ConversationState {
  const created = act({ ...state, parts: [...state.parts, { ...part, look }] }, map, {
    type: 'addPart',
    part: { id: part.id, name: part.name, look },
    placement: part.placement,
  })
  return note(created, ...attributes, placement, {
    subject: part.id,
    attribute: 'figure',
    value: look,
    source: figureSource,
    confidence,
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
  turn1: null,
  turn1Name: null,
  parts: [],
  record: [],
  polarization: null,
  figures: shuffled(LOOKS),
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

function secondPartRecord(
  name: string,
  source: string,
  towardAnswer: string,
  probability: number,
  nameConfidence: Confidence,
): Attribute[] {
  return [
    { subject: PART_2, attribute: 'existence', value: 'another part, with strong feelings about part 1', source: towardAnswer, confidence: jev(probability) },
    { subject: PART_2, attribute: 'name', value: name, source, confidence: nameConfidence },
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

// ---------- Turn 0 reading and Turn 1 rows ----------

/** Only exact, short, contiguous copies of Turn 0 can become choice buttons. */
function verifiedFreeWritePhrases(freeWrite: string, phrases: readonly string[] | null): string[] {
  if (!phrases) return []
  const verified: string[] = []
  const seen = new Set<string>()
  for (const phrase of phrases.slice(0, 4)) {
    const run = wordRun(freeWrite, nameWords(phrase))
    if (!run || run.text.length > NAME_MAX_LENGTH) continue
    const key = normalizeAnswer(run.text)
    if (key === '' || seen.has(key)) continue
    seen.add(key)
    verified.push(run.text)
  }
  return verified
}

function turn1Row(form: FreeWriteForm | null, phrases: string[]): Turn1Ask {
  if (form) {
    const probability = form.probabilities[form.label]
    if (probability >= TURN_1_FORM_THRESHOLD && form.label === 'one_feeling') {
      if (phrases.length === 1) {
        return { kind: 'confirm', question: script.confirmFeeling(phrases[0]), phrases }
      }
      if (phrases.length === 0) return { kind: 'name', question: script.nameThatFeeling, phrases: [] }
    }
    if (probability >= TURN_1_FORM_THRESHOLD && form.label === 'several_feelings' && phrases.length >= 2) {
      return { kind: 'choose', question: script.chooseFeeling, phrases }
    }
  }
  return { kind: 'default', question: script.loudest, phrases: [] }
}

function onFreeWriteRead(
  state: ConversationState,
  seq: number,
  result: FreeWriteAnalysis | null,
): ConversationState {
  const job = state.pending
  if (job?.kind !== 'freeWrite' || job.seq !== seq) return state
  const settled = { ...state, pending: null }
  const freeWrite = job.request.freeWrite
  const form = result?.form ?? null
  const phrases = verifiedFreeWritePhrases(freeWrite, result?.phrases ?? null)
  const row = turn1Row(form, phrases)
  const formAttribute: Attribute = form
    ? {
        subject: 'conversation',
        attribute: 'freeWriteForm',
        value: form.label,
        source: freeWrite,
        confidence: jev(form.probabilities[form.label]),
      }
    : {
        subject: 'conversation',
        attribute: 'freeWriteForm',
        value: 'not judged',
        source: freeWrite,
        confidence: notJudged,
      }
  const phraseAttribute: Attribute = {
    subject: 'conversation',
    attribute: 'freeWritePhrases',
    value: result?.phrases === null || result === null ? 'not read' : phrases.length > 0 ? phrases.join(' | ') : 'none found',
    source: freeWrite,
    confidence: result?.phrases === null || result === null ? notJudged : { tag: 'extracted' },
  }
  const read = note({ ...settled, turn1: row }, formAttribute, phraseAttribute)
  const nextCard = row.phrases.length > 0
    ? `${row.question}\nChoices copied from their words: ${row.phrases.join(' · ')}`
    : row.question
  return request(read, {
    kind: 'reflect',
    request: { turn: 1, freeWrite, nextQuestion: nextCard, avoidPhrases: row.phrases },
  })
}

const matchingTurn1Phrase = (state: ConversationState, text: string) =>
  state.turn1?.phrases.find((phrase) => normalizeAnswer(phrase) === normalizeAnswer(text)) ?? null

function chooseTurn1Phrase(state: ConversationState, phrase: string): ConversationState {
  const source = state.answers.freeWrite ?? ''
  return chooseFigure({ ...state, turn1Name: { name: phrase, source } }, phrase)
}

/** Turn 1's typed answer: confirm a lifted phrase, choose one, or name it as before. */
function onTurn1Answer(state: ConversationState, text: string): ConversationState {
  const phrase = matchingTurn1Phrase(state, text)
  if (phrase) return chooseTurn1Phrase(state, phrase)
  if (state.turn1?.kind === 'confirm') {
    if (matchesAny(text, YES_FORMS)) return chooseTurn1Phrase(state, state.turn1.phrases[0])
    if (matchesAny(text, NO_FORMS) || normalizeAnswer(text) === 'something else') {
      const next = { kind: 'name', question: script.nameSomethingElse, phrases: [] } satisfies Turn1Ask
      return ask({ ...state, turn1: next, turn1Name: null }, 'loudest', next.question)
    }
  }
  return chooseFigure({ ...state, turn1Name: null }, text.trim())
}

/** A Turn 1 choice is already a screened, verified stretch of Turn 0. */
function onTurn1Choice(state: ConversationState, phrase: string): ConversationState {
  if (state.pending || state.step !== 'loudest' || state.turn1?.kind !== 'choose') return state
  const verified = matchingTurn1Phrase(state, phrase)
  if (!verified) return state
  return chooseTurn1Phrase(answered(state, verified), verified)
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

/** After Turn 2: reflect on the latest answer, then Turn 3 — or straight to Turn 4 if it can't be asked. */
function toTurn3(state: ConversationState, map: LandscapeState, last: Exchange | null): ConversationState {
  const skipped = centralitySkipped(state, map)
  if (skipped) return toTurn4(skipped, map, null)
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
 * Turn 4; one of two left → the answer is unclear (no move). Null when
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
  if (left.length === 0) return toTurn4(note(state, ...ids.map((id) => unjudged(id, 'not judged: taken off the map'))), map, null)
  return toTurn4(note(state, unjudged(left[0], 'unclear: the other part was taken off the map')), map, last)
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
  if (listed) return toTurn4(listed, map, last)

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
    return toTurn4(
      note(settled, { subject, attribute: 'centrality', value: 'not judged', source: last.answer, confidence: notJudged }),
      map,
      last,
    )
  }
  const probability = (result.probabilities as Record<string, number>)[result.label]
  const confidence = jev(probability)
  // Unclear or below the threshold: nothing moves.
  if (result.label === 'unclear' || probability < JEV_THRESHOLD) {
    return toTurn4(note(settled, { subject, attribute: 'centrality', value: result.label, source: last.answer, confidence }), map, last)
  }
  if (asked.kind === 'one') {
    return toTurn4(placeInBucket(settled, map, asked.id, result.label as Bucket, last.answer, confidence), map, last)
  }
  const placed =
    result.label === 'part_a_closer'
      ? placeInOrder(settled, map, asked.a, asked.b, last.answer, confidence)
      : result.label === 'part_b_closer'
        ? placeInOrder(settled, map, asked.b, asked.a, last.answer, confidence)
        : markTie(settled, asked.a, asked.b, last.answer, confidence)
  return toTurn4(placed, map, last)
}

// ---------- Turn 4: confirmation and one correction round ----------

/** Turn 4 opens with a reflection on Turn 3's answer — unless Turn 3 was skipped. */
function toTurn4(state: ConversationState, map: LandscapeState, last: Exchange | null): ConversationState {
  if (!last) return toConfirm(state, map)
  return request(state, { kind: 'reflect', request: { turn: 4, freeWrite: state.answers.freeWrite ?? '', ...last } })
}

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
 * The note a full run leaves on the map: Turn 4's summary, kept true to
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

/** The map summary and "what would you change?". Without parts, the conversation closes early. */
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
  if (matchesAny(text, AFFIRM_FORMS)) return closeFullRun(note(state, confirmation('affirmed', text, high)))
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
  return closeFullRun(settled)
}

function onCorrected(state: ConversationState, seq: number, ops: ParsedOp[] | null, map: LandscapeState): ConversationState {
  const job = state.pending
  if (job?.kind !== 'corrections' || job.seq !== seq) return state
  const settled = { ...state, pending: null }
  const text = job.request.correction
  // A failed parse is never a silent close.
  if (!ops) {
    return closeFullRun(guide(note(settled, confirmation('not understood', text, notJudged)), script.mapLine))
  }
  return settleCorrections(settled, map, text, ops, parsed)
}

function onNoChanges(state: ConversationState, text: string): ConversationState {
  if (state.pending || state.step !== 'confirm') return state
  return closeFullRun(note(answered(state, text), confirmation('affirmed', text, high)))
}

// ---------- After the entry conversation (docs/slice-4-handoff.md) ----------

/** A full run reached Turn 4's confirmation (not an early close, not a pause before it). */
const fullRun = (state: ConversationState) => state.record.some((entry) => entry.attribute === 'confirmation')

/**
 * Whether the app may open a card of its own (the invitation, noticing):
 * never over a card that waits for the person, an answer in flight, or a pause.
 * The closing card, or any card with only Close, may be replaced.
 */
function appMayOpen(state: ConversationState): boolean {
  const replaceable: Step[] = ['closing', 'closed', 'idle']
  return state.ended && !state.paused && !state.pending && replaceable.includes(state.step)
}

/** Whether the person may start something (Get to know it, Add a part): their own request wins over the app's open cards. */
export function canGetToKnow(state: ConversationState): boolean {
  const replaceable: Step[] = ['closing', 'closed', 'idle', 'invite', 'noticing']
  return state.ended && !state.paused && !state.pending && replaceable.includes(state.step)
}

/** Add a part, while a figure is still free (each part has its own). */
export const canAddPart = (state: ConversationState) => canGetToKnow(state) && state.parts.length < LOOKS.length

/** Try an experiment: after a full run, whenever the invitation isn't already on screen. */
export const canTryExperiment = (state: ConversationState) =>
  canGetToKnow(state) && state.step !== 'invite' && fullRun(state)

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

// ---------- Adding parts after the conversation: a quieter part (closing card), or any part (top bar) ----------

/** Parts are numbered in the order they're named; removed ones keep their number. */
const nextPartId = (state: ConversationState) => `part-${state.parts.length + 1}`

function onAddQuieter(state: ConversationState): ConversationState {
  if (state.pending || state.step !== 'closing') return state
  return ask(freshCard(state), 'unheard', script.unheard)
}

/** Adding changes who is on the map, so only in "How it is". */
function onNewPart(state: ConversationState, map: LandscapeState): ConversationState {
  if (!canAddPart(state) || map.mode !== 'current') return state
  return ask(freshCard(state), 'newPart', script.newPart)
}

/** A name, or an explicit no/unsure — never an inferred one. A bare "yes" gets the question again. */
function resolveNewName(state: ConversationState, text: string): ConversationState {
  const declined = matchesAny(text, NO_FORMS) ? 'none' : matchesAny(text, UNSURE_FORMS) ? 'unsure' : null
  if (declined && state.step === 'unheard') {
    return idle(note(state, { subject: 'conversation', attribute: 'unheard', value: declined, source: text, confidence: high }))
  }
  if (declined) return idle(state)
  if (matchesAny(text, YES_FORMS)) return reask(state)
  return chooseFigure(state, text.trim())
}

/** The person named a part that rarely gets heard: it joins the map small, at the edge. */
function nameUnheard(
  state: ConversationState,
  map: LandscapeState,
  figure: Figure,
  kind: KindReading,
  name: string,
  nameConfidence: Confidence,
): ConversationState {
  const text = state.answers.unheard!
  const id = nextPartId(state)
  const reading = (attribute: Attribute['attribute'], value: string, confidence: Confidence = high): Attribute => ({
    subject: id,
    attribute,
    value,
    source: text,
    confidence,
  })
  const created = createPart(
    state,
    map,
    {
      id,
      name,
      kind: kind.kind,
      placement: { ...clearestSpot(map, EDGE_SPOTS), scale: UNHEARD_SCALE },
      sizeFromAnswer: true,
    },
    figure,
    text,
    reading('placement', 'at the edge (rarely heard)'),
    kindRecord(id, text, kind),
    reading('unheard', 'rarely gets heard'),
    reading('name', name, nameConfidence),
    reading('size', 'small (rarely heard)'),
  )
  return rest(guide({ ...created, unheard: id }, script.unheardAdded(name)))
}

/** Added from the top bar: it joins at a starting spot, at the usual size. */
function nameNewPart(
  state: ConversationState,
  map: LandscapeState,
  figure: Figure,
  kind: KindReading,
  name: string,
  nameConfidence: Confidence,
): ConversationState {
  const text = state.answers.newPart!
  const id = nextPartId(state)
  const start = kindStartingSpot(map, id, text, kind, DEFAULT_SCALE)
  const created = createPart(
    state,
    map,
    { id, name, kind: kind.kind, placement: start.placement, sizeFromAnswer: false },
    figure,
    text,
    start.record,
    kindRecord(id, text, kind),
    { subject: id, attribute: 'name', value: name, source: text, confidence: nameConfidence },
    { subject: id, attribute: 'size', value: String(DEFAULT_SCALE), source: null, confidence: byDefault },
  )
  return rest(guide(created, script.partAdded(name)))
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

/** The slim bar: they move things in "What if", then say when they've tried it. */
function startTrying(state: ConversationState, map: LandscapeState): ConversationState {
  // Started from "How it is" (they switched back meanwhile): the trying happens in "What if".
  const there = map.mode === 'whatIf' ? state : act(state, map, { type: 'enterWhatIf' })
  return { ...guide(freshCard(there), script.trying), step: 'trying', asked: '' }
}

function onAccept(state: ConversationState, map: LandscapeState): ConversationState {
  if (state.pending || state.step !== 'invite') return state
  return startTrying(note(state, { subject: 'conversation', attribute: 'invitation', value: 'accepted', source: null, confidence: high }), map)
}

/** Their own request, any time after a full run: no invitation needed, and none comes later. */
function onTryExperiment(state: ConversationState, map: LandscapeState): ConversationState {
  if (!canTryExperiment(state) || visibleNow(state, map).length === 0) return state
  const started = note(
    { ...state, invited: true },
    { subject: 'conversation', attribute: 'experiment', value: 'started by them', source: null, confidence: high },
  )
  return startTrying(started, map)
}

function onTried(state: ConversationState, map: LandscapeState): ConversationState {
  if (state.pending || state.step !== 'trying') return state
  const parts = arranged(state, map)
  if (!arrangementDiffers(parts)) return { ...guide(freshCard(state), script.nothingMoved), step: 'nothingMoved', asked: '' }
  return ask(freshCard({ ...state, tried: arrangementChanges(parts) }), 'experiment', script.whatWasThatLike)
}

function onKeepTrying(state: ConversationState, map: LandscapeState): ConversationState {
  if (state.pending || state.step !== 'nothingMoved') return state
  return startTrying(state, map)
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

/** Not now, That's enough for now, Skip this one, Finish without changes: the card goes, and the map stays as it is. */
function onDecline(state: ConversationState): ConversationState {
  if (state.pending || !DECLINABLE_STEPS.includes(state.step)) return state
  const outcome: Partial<Record<Step, Attribute>> = {
    unheard: { subject: 'conversation', attribute: 'unheard', value: 'not added', source: null, confidence: high },
    nothingMoved: { subject: 'conversation', attribute: 'experiment', value: 'finished without changes', source: null, confidence: high },
    invite: { subject: 'conversation', attribute: 'invitation', value: 'declined', source: null, confidence: high },
    experiment: { subject: 'conversation', attribute: 'experiment', value: 'not answered', source: null, confidence: high },
    noticing: { subject: 'conversation', attribute: 'noticing', value: 'not answered', source: null, confidence: high },
  }
  const declined = outcome[state.step]
  return idle(declined ? note(state, declined) : state)
}

/** Close, on a card that waits for nothing. */
function onDismiss(state: ConversationState): ConversationState {
  const closable: Step[] = ['closing', 'closed', 'paused']
  if (state.pending || !closable.includes(state.step)) return state
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
      return request(state, { kind: 'freeWrite', request: { freeWrite: text } })

    case 'loudest':
      return onTurn1Answer(state, text)

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
      if (isExit(text)) return declineSecond(state, map, text, 'declined: all one feeling', high)
      if (matchesAny(text, SEPARATE_FORMS)) return ask(state, 'secondName', script.secondNameAgain)
      return chooseFigure(state, text.trim())
    }

    case 'centrality':
      return onCentralityAnswer(state, map, text)

    case 'confirm':
      return onConfirmAnswer(state, map, text)

    case 'unheard':
    case 'newPart':
      return resolveNewName(state, text)

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

/** Turn 1 named the loudest feeling: part 1 joins the map, largest. */
function nameLoudest(
  state: ConversationState,
  map: LandscapeState,
  figure: Figure,
  kind: KindReading,
  name: string,
  nameConfidence: Confidence,
): ConversationState {
  const answer = state.answers.loudest!
  const source = state.turn1Name?.source ?? answer
  const judgedName = state.turn1Name?.name ?? answer
  const start = kindStartingSpot(map, PART_1, judgedName, kind, PART_1_SCALE)
  const named = createPart(
    state,
    map,
    {
      id: PART_1,
      name,
      kind: kind.kind,
      placement: start.placement,
      sizeFromAnswer: true,
    },
    figure,
    judgedName,
    start.record,
    kindRecord(PART_1, judgedName, kind),
    { subject: PART_1, attribute: 'name', value: name, source, confidence: nameConfidence },
    { subject: PART_1, attribute: 'size', value: 'largest', source: answer, confidence: high },
  )
  return request({ ...named, turn1Name: null }, {
    kind: 'reflect',
    request: { turn: 2, freeWrite: state.answers.freeWrite ?? '', loudest: judgedName },
  })
}

/** The polarization branch named a second part: it joins the map, linked to part 1. */
function nameSecond(
  state: ConversationState,
  map: LandscapeState,
  figure: Figure,
  kind: KindReading,
  name: string,
  nameConfidence: Confidence,
): ConversationState {
  const text = state.answers.secondName!
  const { answer, probability } = state.polarization!
  const start = kindStartingSpot(map, PART_2, text, kind, DEFAULT_SCALE)
  const named = createPart(
    state,
    map,
    {
      id: PART_2,
      name,
      kind: kind.kind,
      placement: start.placement,
      sizeFromAnswer: false,
    },
    figure,
    text,
    start.record,
    kindRecord(PART_2, text, kind),
    ...secondPartRecord(name, text, answer, probability, nameConfidence),
  )
  return toTurn3(linkParts(named, map), map, { question: state.asked, answer: text })
}

function onFigured(
  state: ConversationState,
  seq: number,
  result: FigureReading | null,
  extracted: string | null,
  map: LandscapeState,
): ConversationState {
  const job = state.pending
  if (job?.kind !== 'figure' || job.seq !== seq) return state
  const settled = { ...state, pending: null }
  const answer = job.request.name
  const resolved = settled.step === 'loudest' && settled.turn1Name
    ? { name: settled.turn1Name.name, confidence: high }
    : resolveName(answer, extracted)
  // A shortening must not copy a part already on the map. Asked whether
  // the feeling is separate, naming one that's there means it isn't; when
  // adding a part, the answer is used as sent.
  const copies =
    resolved.confidence.tag === 'extracted' && visibleNow(settled, map).some((part) => sameName(part.name, resolved.name))
  if (copies && settled.step === 'secondName') {
    const text = settled.answers.secondName!
    return declineSecond(settled, map, text, 'declined: named a part already on the map', resolved.confidence)
  }
  const { name, confidence } = copies ? { name: answer, confidence: high } : resolved
  const figure = figureFor(settled, map, result?.figure ?? null)
  const kind = kindFor(result?.kind ?? null)
  switch (settled.step) {
    case 'loudest':
      return nameLoudest(settled, map, figure, kind, name, confidence)
    case 'secondName':
      return nameSecond(settled, map, figure, kind, name, confidence)
    case 'unheard':
      return nameUnheard(settled, map, figure, kind, name, confidence)
    case 'newPart':
      return nameNewPart(settled, map, figure, kind, name, confidence)
    default:
      return settled
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
  // Turn 3 became impossible while reflecting: drop the reflection, go straight to Turn 4.
  if (turn === 3) {
    const skipped = centralitySkipped(settled, map)
    if (skipped) return toTurn4(skipped, map, null)
  }
  // Get to know it: the part was taken off the map while reflecting, so the card ends quietly.
  if (turn === 'voice' && !subjectHere(settled, map)) return idle(settled)
  // The toward-check branched, but part 1 left meanwhile: no second part
  // without the first, so the toward answer is reflected as Turn 3 instead.
  if (turn === 'toward' && !isHere(settled, map, PART_1)) {
    return toTurn3(settled, map, { question: job.request.question, answer: job.request.answer })
  }

  const reflected = showReflection(settled, map, turn, text)
  switch (turn) {
    case 1:
      return ask(reflected, 'loudest', reflected.turn1?.question ?? script.loudest)
    case 2:
      return ask(reflected, 'towardCheck', script.towardCheck(partNow(settled, map, PART_1)!.name))
    case 'toward':
      return ask(guide(reflected, script.polarization), 'secondName', script.secondName)
    case 3:
      return askCentrality(reflected, map)
    case 4:
      return toConfirm(reflected, map)
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

  // The branch question waits for one sentence on the toward answer, so the
  // person's frustration is mirrored before the app wonders about a second
  // feeling. The fixed line stays: "it" in the naming question refers to it.
  return request(
    { ...judged, polarization: { answer, probability: frustrated } },
    {
      kind: 'reflect',
      request: {
        turn: 'toward',
        freeWrite: state.answers.freeWrite ?? '',
        partName: partNow(settled, map, PART_1)!.name,
        question,
        answer,
      },
    },
  )
}

export function conversationReducer(state: ConversationState, event: ConversationEvent): ConversationState {
  switch (event.type) {
    case 'answer':
      return onAnswer(state, event.text, event.map)
    case 'noChanges':
      return onNoChanges(state, event.text)
    case 'reflected':
      return onReflected(state, event.seq, event.text, event.map)
    case 'freeWriteRead':
      return onFreeWriteRead(state, event.seq, event.result)
    case 'towardChecked':
      return onTowardChecked(state, event.seq, event.result, event.map)
    case 'centralityChecked':
      return onCentralityChecked(state, event.seq, event.result, event.map)
    case 'corrected':
      return onCorrected(state, event.seq, event.ops, event.map)
    case 'riskChecked':
      return onRiskChecked(state, event.seq, event.atRisk, event.map)
    case 'figured':
      return onFigured(state, event.seq, event.result, event.extracted, event.map)
    case 'turn1Choice':
      return onTurn1Choice(state, event.phrase)
    case 'dismiss':
      return onDismiss(state)
    case 'decline':
      return onDecline(state)
    case 'accept':
      return onAccept(state, event.map)
    case 'tryExperiment':
      return onTryExperiment(state, event.map)
    case 'tried':
      return onTried(state, event.map)
    case 'keepTrying':
      return onKeepTrying(state, event.map)
    case 'enteredWhatIf':
      return onEnteredWhatIf(state, event.map)
    case 'addQuieter':
      return onAddQuieter(state)
    case 'newPart':
      return onNewPart(state, event.map)
    case 'getToKnow':
      return onGetToKnow(state, event.partId, event.map)
    case 'notice':
      return onNotice(state, event.before, event.partId, event.map)
  }
}
