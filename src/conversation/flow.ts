import { NAME_MAX_LENGTH } from '../model/landscape'
import { LOOKS } from '../model/types'
import type { Action, LandscapeState, Look, Placement } from '../model/types'
import {
  LISTED_FORMS,
  NO_FORMS,
  SEPARATE_FORMS,
  UNSURE_FORMS,
  YES_FORMS,
  checkReflection,
  contentWords,
  hasRiskPhrase,
  isExit,
  matchesAny,
  nameWords,
  normalizeAnswer,
  wordRun,
} from './checks'
import type {
  FigureChoice,
  FigureReading,
  FigureRequest,
  FreeWriteAnalysis,
  FreeWriteForm,
  FreeWriteRequest,
  PartKind,
  PartKindChoice,
  ReflectRequest,
  ReflectTurn,
  RiskRequest,
  TowardCheck,
  TowardCheckRequest,
} from './contract'
import { EDGE_SPOTS, clearestSpot, startingSpot } from './geometry'
import { script } from './script'
import { arrangementChanges, arrangementDiffers, partPhrases, summarize, summaryClauses } from './summary'
import type { ArrangedPart, SummaryInput } from './summary'

/**
 * The story's walk (docs/redesign/story-redesign.md, Option A) as a pure
 * state machine. Act 1, the entry conversation: Turns 0–3, where Turn 3
 * asks who else is here (docs/four-turn-journey-plan.md), closing with
 * "These are the ones who came." Act 2: the person taps one figure and sits
 * with it (its words, what it might be trying to do, a thanks). Then what
 * the guide does after it (docs/slice-4-handoff.md). Async work (LLM
 * reflections, risk checks, JEV judgements) is
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

/** A JEV reading at or above this is acted on (the polarization branch, a part's kind). */
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
    | 'alsoHere'
    | 'unheard'
    | 'gathered'
    | 'sitWith'
    | 'fears'
    | 'thanks'
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
  /** Turn 3: feelings the free-write named that aren't on the map yet, as choices. */
  | 'alsoHere'
  /** Turn 3 with nothing left over: is there a quieter feeling? */
  | 'quieter'
  /** Act 1's close: "These are the ones who came." and Go on. */
  | 'gathered'
  // Act 2: sit with one (frames A07–A11), and Get to know it after the hand-over.
  /** Which one would like your attention first? The figures are the buttons. */
  | 'choose'
  /** Nothing: the card has only lines and Close (an early close, a last reflection). */
  | 'closed'
  /** No card. */
  | 'idle'
  // After the entry conversation.
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
  /** Sitting with one: what the part would say… */
  | 'voice'
  /** …what it might be trying to do… */
  | 'intent'
  /** …what it's afraid would happen if it stopped (off until a therapist has reviewed it)… */
  | 'fears'
  /** …and would you like to thank it? */
  | 'thanks'
  /** Thanked: no card, while its glow is seen up close. */
  | 'thanked'
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
  'alsoHere',
  'quieter',
  'newPart',
  'experiment',
  'voice',
  'intent',
  'fears',
  'noticing',
]

/** Steps with a way out that keeps the map as it is (Not now, That's enough for now, Skip, Not yet, Skip this one, Finish without changes). */
export const DECLINABLE_STEPS: readonly Step[] = [
  'choose',
  'fears',
  'thanks',
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
  /** Phrases naming feelings, copied word for word from Turn 0 (verified): Turn 1's and Turn 3's choices. */
  freeWritePhrases: string[]
  /** A Turn 0 phrase confirmed or tapped (Turn 1 or Turn 3), with its original source: the exact name. */
  liftedName: { name: string; source: string } | null
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
  /** Turn 3's choices: Turn 0 phrases not yet on the map, as offered. */
  alsoHere: string[]
  /** The part that rarely gets heard. */
  unheard: string | null
  /** The tension link, once part 2 exists. */
  link: string | null

  // ---------- After the entry conversation ----------

  /** The entry conversation is over (its closing, or a pause): the map is the person's. */
  ended: boolean
  /** Risk language was seen: no more questions, invitations, or noticing this session. */
  paused: boolean
  /** The experiment invitation has been shown, or they started one themselves: the app doesn't invite again. */
  invited: boolean
  /** How "What if" differed from "How it is" when they said they'd tried it. */
  tried: string[]
  /** The part being sat with (Act 2, Get to know it), and its words once given. */
  subject: { id: string; voice: string | null; intent: string | null } | null
  /** Parts the person has thanked: they glow. */
  thanked: string[]
  /** Act 2 asks the Fears question: off until an IFS-trained therapist has reviewed it (`?fears`). */
  askFears: boolean
  /** Parts the noticing question has asked about (once each per session). */
  noticed: string[]
}

export type ConversationEvent =
  | { type: 'answer'; text: string; map: LandscapeState }
  | { type: 'reflected'; seq: number; text: string | null; map: LandscapeState }
  | { type: 'freeWriteRead'; seq: number; result: FreeWriteAnalysis | null; map: LandscapeState }
  | { type: 'towardChecked'; seq: number; result: TowardCheck | null; map: LandscapeState }
  | { type: 'riskChecked'; seq: number; atRisk: boolean | null; map: LandscapeState }
  | { type: 'figured'; seq: number; result: FigureReading | null; extracted: string | null; map: LandscapeState }
  /** One of the verified free-write phrases on the card was tapped (Turn 1 or Turn 3). */
  | { type: 'choice'; phrase: string; map: LandscapeState }
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
  /** Go on, at Act 1's close: the map is theirs. */
  | { type: 'goOn'; map: LandscapeState }
  /** Add a part, from the top bar in "How it is". */
  | { type: 'newPart'; map: LandscapeState }
  /** Get to know it, on a selected part; or, at Act 2's first question, a tapped figure. */
  | { type: 'getToKnow'; partId: string; map: LandscapeState }
  /** Thank it. */
  | { type: 'thank'; map: LandscapeState }
  /** The thanked part's glow has been seen up close: the sitting ends. */
  | { type: 'thanksSeen'; map: LandscapeState }
  /** The person rested after a "How it is" edit; `before` is the map the last time this was asked. */
  | { type: 'notice'; before: LandscapeState; partId: string | null; map: LandscapeState }

const high: Confidence = { tag: 'high' }
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
function linkNow(state: ConversationState, map: LandscapeState): { id: string; between: [string, string]; removed: boolean } | null {
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
    extract: state.liftedName === null,
  })
}

/**
 * The reflection asked for once this naming answer has named a part — the
 * same request `nameLoudest`, `toTurn3` and `toTurn4` will make, built from
 * the same stored answer, so the early one is used. None after adding a part.
 */
function reflectionAfterNaming(state: ConversationState): ReflectRequest | undefined {
  const freeWrite = state.answers.freeWrite ?? ''
  if (state.step === 'loudest') return { turn: 2, freeWrite, loudest: state.liftedName?.name ?? state.answers.loudest! }
  if (state.step === 'secondName') return { turn: 3, freeWrite, question: state.asked, answer: state.answers.secondName! }
  if (state.step === 'alsoHere' || state.step === 'quieter') {
    return { turn: 4, freeWrite, question: state.asked, answer: state.answers[state.step]! }
  }
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
    placement: { ...startingSpot(map, activeKind), scale },
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
  freeWritePhrases: [],
  liftedName: null,
  parts: [],
  record: [],
  polarization: null,
  figures: shuffled(LOOKS),
  effects: [],
  alsoHere: [],
  unheard: null,
  link: null,
  ended: false,
  paused: false,
  invited: false,
  tried: [],
  subject: null,
  noticed: [],
  thanked: [],
  askFears: false,
})

export function startConversation({ askFears = false } = {}): ConversationState {
  return ask({ ...emptyConversation(), askFears }, 'freeWrite', script.freeWrite)
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
  const read = note({ ...settled, turn1: row, freeWritePhrases: phrases }, formAttribute, phraseAttribute)
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

/** A Turn 0 phrase (confirmed, tapped, or typed back) is already screened and exact: no shortening. */
function chooseLifted(state: ConversationState, phrase: string): ConversationState {
  const source = state.answers.freeWrite ?? ''
  return chooseFigure({ ...state, liftedName: { name: phrase, source } }, phrase)
}

/** Turn 1's typed answer: confirm a lifted phrase, choose one, or name it as before. */
function onTurn1Answer(state: ConversationState, text: string): ConversationState {
  const phrase = matchingTurn1Phrase(state, text)
  if (phrase) return chooseLifted(state, phrase)
  if (state.turn1?.kind === 'confirm') {
    if (matchesAny(text, YES_FORMS)) return chooseLifted(state, state.turn1.phrases[0])
    if (matchesAny(text, NO_FORMS) || normalizeAnswer(text) === 'something else') {
      const next = { kind: 'name', question: script.nameSomethingElse, phrases: [] } satisfies Turn1Ask
      return ask({ ...state, turn1: next, liftedName: null }, 'loudest', next.question)
    }
  }
  return chooseFigure({ ...state, liftedName: null }, text.trim())
}

/** A tapped choice (Turn 1 or Turn 3) is already a screened, verified stretch of Turn 0. */
function onChoice(state: ConversationState, phrase: string): ConversationState {
  if (state.pending) return state
  const verified =
    state.step === 'loudest' && state.turn1?.kind === 'choose'
      ? matchingTurn1Phrase(state, phrase)
      : state.step === 'alsoHere'
        ? matchingLeftover(state, phrase)
        : null
  return verified ? chooseLifted(answered(state, verified), verified) : state
}

// ---------- Turn 3: who else is here ----------

interface Exchange {
  question: string
  answer: string
}

/**
 * Every meaningful word of one is in the other, filler aside: ‘the one who
 * wants to hide’ already covers "wants to hide under the covers". When in
 * doubt it counts as covered: offering a feeling twice is the worse mistake.
 */
function covers(name: string, phrase: string): boolean {
  const nameSet = new Set(contentWords(name))
  const phraseSet = new Set(contentWords(phrase))
  return [...phraseSet].every((word) => nameSet.has(word)) || [...nameSet].every((word) => phraseSet.has(word))
}

/** Turn 0's phrases no part has taken yet. A part taken off the map still counts: they said it isn't theirs. */
function leftoverPhrases(state: ConversationState, map: LandscapeState): string[] {
  const names = partsNow(state, map).map((part) => part.name)
  return state.freeWritePhrases.filter((phrase) => !names.some((name) => covers(name, phrase)))
}

/** The part a quieter feeling might stand behind: the first on the map whose kind guards or escapes. */
function guardOnMap(state: ConversationState, map: LandscapeState): PartNow | null {
  const visible = visibleNow(state, map)
  const guard = state.parts.find(
    (part) => (part.kind === 'guards' || part.kind === 'escapes') && visible.some((each) => each.id === part.id),
  )
  return guard ? partNow(state, map, guard.id) : null
}

/** After Turn 2: reflect on the latest answer, then Turn 3 — or, with no parts left, the early close. */
function toTurn3(state: ConversationState, map: LandscapeState, last: Exchange | null): ConversationState {
  if (visibleNow(state, map).length === 0) {
    const noted = note(state, { subject: 'conversation', attribute: 'alsoHere', value: 'not asked: no parts on the map', source: null, confidence: notJudged })
    return toTurn4(noted, map, null)
  }
  if (!last) return askTurn3(state, map)
  return request(state, { kind: 'reflect', request: { turn: 3, freeWrite: state.answers.freeWrite ?? '', ...last } })
}

/** Their leftovers if Turn 0 named any; otherwise the quieter question, behind a guarding part when there is one. */
function askTurn3(state: ConversationState, map: LandscapeState): ConversationState {
  const leftovers = leftoverPhrases(state, map)
  if (leftovers.length > 0) return { ...ask(state, 'alsoHere', script.alsoHere(leftovers.length)), alsoHere: leftovers }
  const guard = guardOnMap(state, map)
  return { ...ask(state, 'quieter', guard ? script.quieterBehind(guard.name) : script.quieter), alsoHere: [] }
}

const matchingLeftover = (state: ConversationState, text: string) =>
  state.alsoHere.find((phrase) => normalizeAnswer(phrase) === normalizeAnswer(text)) ?? null

const turn3Attribute = (state: ConversationState) => (state.step === 'quieter' ? 'unheard' : 'alsoHere')

/** Turn 3 adds nobody: no, unsure, or "No one else". Straight to the summary, with nothing to reflect. */
function noOneElse(state: ConversationState, map: LandscapeState, text: string, value: string): ConversationState {
  return toTurn4(note(state, { subject: 'conversation', attribute: turn3Attribute(state), value, source: text, confidence: high }), map, null)
}

/** Turn 3's typed answer: a phrase on offer, a new name, or nobody. A bare yes asks for the name. */
function onTurn3Answer(state: ConversationState, map: LandscapeState, text: string): ConversationState {
  if (matchesAny(text, NO_FORMS)) return noOneElse(state, map, text, 'none')
  if (matchesAny(text, UNSURE_FORMS)) return noOneElse(state, map, text, 'unsure')
  const phrase = matchingLeftover(state, text)
  if (phrase) return chooseLifted(state, phrase)
  if (matchesAny(text, YES_FORMS)) {
    if (state.alsoHere.length === 1) return chooseLifted(state, state.alsoHere[0])
    return state.step === 'quieter' ? ask(state, 'quieter', script.nameSomethingElse) : reask(state)
  }
  return chooseFigure({ ...state, liftedName: null }, text.trim())
}

/**
 * Turn 3 named someone. A feeling from Turn 0, or anyone else, joins at its
 * kind's starting spot; a quieter feeling joins small, at the edge. A name
 * already on the map adds nobody.
 */
function nameTurn3(
  state: ConversationState,
  map: LandscapeState,
  figure: Figure,
  kind: KindReading,
  name: string,
  nameConfidence: Confidence,
): ConversationState {
  const text = state.answers[state.step]!
  const last = { question: state.asked, answer: text }
  const lifted = state.liftedName
  const settled = { ...state, liftedName: null }
  if (visibleNow(state, map).some((part) => sameName(part.name, name))) {
    const value = 'not added: named a part already on the map'
    return toTurn4(note(settled, { subject: 'conversation', attribute: turn3Attribute(state), value, source: text, confidence: nameConfidence }), map, last)
  }
  const id = nextPartId(state)
  const nameRecord: Attribute = { subject: id, attribute: 'name', value: name, source: lifted?.source ?? text, confidence: nameConfidence }
  if (state.step === 'quieter') return toTurn4(unheardPart(settled, map, id, figure, kind, text, nameRecord), map, last)

  const judged = lifted?.name ?? text
  const start = kindStartingSpot(map, id, judged, kind, DEFAULT_SCALE)
  const created = createPart(
    settled,
    map,
    { id, name, kind: kind.kind, placement: start.placement, sizeFromAnswer: false },
    figure,
    judged,
    start.record,
    kindRecord(id, judged, kind),
    { subject: id, attribute: 'alsoHere', value: lifted ? 'named in the free-write, here too' : 'someone else', source: text, confidence: high },
    nameRecord,
    { subject: id, attribute: 'size', value: String(DEFAULT_SCALE), source: null, confidence: byDefault },
  )
  return toTurn4(created, map, last)
}

// ---------- Act 1's close (docs/redesign/story-redesign.md, frame A06) ----------

/** After Turn 3: a reflection on its answer — unless it added nobody, or wasn't asked — then Act 1's close. */
function toTurn4(state: ConversationState, map: LandscapeState, last: Exchange | null): ConversationState {
  if (!last) return gather(state, map)
  return request(state, { kind: 'reflect', request: { turn: 4, freeWrite: state.answers.freeWrite ?? '', ...last } })
}

/**
 * "These are the ones who came.", over the meadow with everyone on it, and
 * Go on. It replaces Turn 4's summary question and the closing card: the
 * map is changed by hand, later. Without parts, the conversation closes early.
 */
function gather(state: ConversationState, map: LandscapeState): ConversationState {
  const here = visibleNow(state, map)
  if (here.length === 0) return closeWith(state, script.closingEarly)
  const noted = note(state, { subject: 'conversation', attribute: 'gathered', value: here.map((part) => part.name).join(', '), source: null, confidence: byDefault })
  return { ...guide(noted, script.gathered(here.length)), step: 'gathered', asked: '' }
}

/** Go on: Act 2. */
function onGoOn(state: ConversationState, map: LandscapeState): ConversationState {
  if (state.pending || state.step !== 'gathered') return state
  return toAct2(state, map)
}

// ---------- Act 2: sit with one (docs/redesign/story-redesign.md, frames A07–A11) ----------

/**
 * Who Act 2 offers: every part on the map but one read as hurting, and
 * Turn 3's quieter part (it rarely gets heard, and is often the hurting
 * one). Held back until an IFS-trained therapist has said how to meet them.
 */
function offeredParts(state: ConversationState, map: LandscapeState): PartNow[] {
  const kinds = new Map(state.parts.map((part) => [part.id, part.kind]))
  return visibleNow(state, map).filter((part) => kinds.get(part.id) !== 'hurts' && part.id !== state.unheard)
}

/** The figures to tap while Act 2's first question is up (none otherwise). */
export const offeredIds = (state: ConversationState, map: LandscapeState): string[] =>
  state.step === 'choose' ? offeredParts(state, map).map((part) => part.id) : []

/** "Which one would like your attention first?" With nobody to offer, Act 2 is skipped. */
function toAct2(state: ConversationState, map: LandscapeState): ConversationState {
  const offered = offeredParts(state, map)
  if (offered.length === 0) {
    return endSitting(
      note(state, { subject: 'conversation', attribute: 'sitWith', value: 'nobody offered', source: null, confidence: byDefault }),
    )
  }
  const [question, hint] = offered.length === 1 ? script.chooseOne(offered[0].name) : script.choose
  return { ...guide(guide(freshCard(state), question), hint), step: 'choose', asked: '' }
}

/** Act 2 (or Get to know it, after the hand-over) is over: no card, and the map is the person's. */
function endSitting(state: ConversationState): ConversationState {
  return { ...idle(state), ended: true }
}

const askThanks = (state: ConversationState): ConversationState => ({ ...guide(state, script.thanks), step: 'thanks', asked: '' })

function summaryInput(state: ConversationState, map: LandscapeState): SummaryInput {
  const visible = visibleNow(state, map)
  const named = new Map(state.parts.map((part) => [part.id, part]))
  return {
    parts: visible.map((part) => ({
      id: part.id,
      name: part.name,
      placement: part.placement,
      start: named.get(part.id)?.placement ?? part.placement,
      sizeFromAnswer: named.get(part.id)?.sizeFromAnswer ?? false,
      unheard: part.id === state.unheard,
    })),
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

// ---------- After the entry conversation (docs/slice-4-handoff.md) ----------

/** A full run reached Act 1's close (not an early close, not a pause before it). */
const fullRun = (state: ConversationState) => state.record.some((entry) => entry.attribute === 'gathered')

/**
 * Whether the app may open a card of its own (the invitation, noticing):
 * never over a card that waits for the person, an answer in flight, or a pause.
 * A card with only Close may be replaced.
 */
function appMayOpen(state: ConversationState): boolean {
  const replaceable: Step[] = ['closed', 'idle']
  return state.ended && !state.paused && !state.pending && replaceable.includes(state.step)
}

/** Whether the person may start something (Get to know it, Add a part): their own request wins over the app's open cards. */
export function canGetToKnow(state: ConversationState): boolean {
  const replaceable: Step[] = ['closed', 'idle', 'invite', 'noticing']
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

// ---------- Adding a part after the conversation (top bar) ----------

/** Parts are numbered in the order they're named; removed ones keep their number. */
const nextPartId = (state: ConversationState) => `part-${state.parts.length + 1}`

/** Adding changes who is on the map, so only in "How it is". */
function onNewPart(state: ConversationState, map: LandscapeState): ConversationState {
  if (!canAddPart(state) || map.mode !== 'current') return state
  return ask(freshCard(state), 'newPart', script.newPart)
}

/** A name, or an explicit no/unsure — never an inferred one. A bare "yes" gets the question again. */
function resolveNewName(state: ConversationState, text: string): ConversationState {
  if (matchesAny(text, NO_FORMS) || matchesAny(text, UNSURE_FORMS)) return idle(state)
  if (matchesAny(text, YES_FORMS)) return reask(state)
  return chooseFigure(state, text.trim())
}

/** A part that rarely gets heard joins the map small, at the edge (Turn 3's quieter feeling). */
function unheardPart(
  state: ConversationState,
  map: LandscapeState,
  id: string,
  figure: Figure,
  kind: KindReading,
  text: string,
  nameRecord: Attribute,
): ConversationState {
  const reading = (attribute: Attribute['attribute'], value: string): Attribute => ({
    subject: id,
    attribute,
    value,
    source: text,
    confidence: high,
  })
  const created = createPart(
    state,
    map,
    {
      id,
      name: nameRecord.value,
      kind: kind.kind,
      placement: { ...clearestSpot(map, EDGE_SPOTS), scale: UNHEARD_SCALE },
      sizeFromAnswer: true,
    },
    figure,
    text,
    reading('placement', 'at the edge (rarely heard)'),
    kindRecord(id, text, kind),
    reading('unheard', 'rarely gets heard'),
    nameRecord,
    reading('size', 'small (rarely heard)'),
  )
  return { ...created, unheard: id }
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

/** The first time they enter "What if" after a full run: one invitation. */
function onEnteredWhatIf(state: ConversationState, map: LandscapeState): ConversationState {
  if (state.invited || !appMayOpen(state) || !fullRun(state) || visibleNow(state, map).length === 0) return state
  const shown = note(
    { ...state, invited: true },
    { subject: 'conversation', attribute: 'invitation', value: 'shown', source: null, confidence: byDefault },
  )
  return { ...guide(freshCard(shown), script.invite), step: 'invite', asked: '' }
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

/** A figure tapped at Act 2's first question, or Get to know it on a selected part: the same scenes. */
function onGetToKnow(state: ConversationState, partId: string, map: LandscapeState): ConversationState {
  const chosen = state.step === 'choose' && !state.pending && offeredIds(state, map).includes(partId)
  if (!chosen && (!canGetToKnow(state) || !isHere(state, map, partId))) return state
  const name = partNow(state, map, partId)!.name
  const noted = note(state, {
    subject: partId,
    attribute: 'sitWith',
    value: chosen ? 'chosen' : 'get to know it',
    source: null,
    confidence: high,
  })
  return ask(freshCard({ ...noted, subject: { id: partId, voice: null, intent: null } }), 'voice', script.voice(name))
}

function onVoiceAnswer(state: ConversationState, map: LandscapeState, text: string): ConversationState {
  // Taken off the map while they answered: the card ends quietly, and the answer is dropped.
  if (!subjectHere(state, map)) return endSitting(state)
  const { id } = state.subject!
  const stored = act(
    note({ ...state, subject: { ...state.subject!, voice: text } }, { subject: id, attribute: 'voice', value: text, source: text, confidence: high }),
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
  if (!subjectHere(state, map)) return endSitting(state)
  const { id, voice } = state.subject!
  const stored = act(
    note({ ...state, subject: { ...state.subject!, intent: text } }, { subject: id, attribute: 'intent', value: text, source: text, confidence: high }),
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

/** Fears (frame A10), only with `askFears`: kept in the record, not on the map. */
function onFearsAnswer(state: ConversationState, map: LandscapeState, text: string): ConversationState {
  if (!subjectHere(state, map)) return endSitting(state)
  const { id, voice, intent } = state.subject!
  const noted = note(state, { subject: id, attribute: 'fears', value: text, source: text, confidence: high })
  return request(noted, {
    kind: 'reflect',
    request: {
      turn: 'fears',
      freeWrite: state.answers.freeWrite ?? '',
      partName: partNow(state, map, id)!.name,
      voice: voice ?? '',
      intent: intent ?? '',
      question: state.asked,
      answer: text,
    },
  })
}

/** Thank it (frame A11): the part glows, seen up close for a moment, then the sitting ends (`thanksSeen`). */
function onThank(state: ConversationState, map: LandscapeState): ConversationState {
  if (state.pending || state.step !== 'thanks') return state
  if (!subjectHere(state, map)) return endSitting(state)
  const { id } = state.subject!
  const thanked = state.thanked.includes(id) ? state.thanked : [...state.thanked, id]
  const noted = note({ ...state, thanked }, { subject: id, attribute: 'thanks', value: 'thanked', source: null, confidence: high })
  return { ...noted, step: 'thanked', asked: '', card: null }
}

function onThanksSeen(state: ConversationState): ConversationState {
  return state.step === 'thanked' ? endSitting(state) : state
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

/**
 * Not now, That's enough for now, Not yet, Skip this one, Finish without
 * changes: the card goes, and the map stays as it is. Skipping Fears goes on
 * to the thanks.
 */
function onDecline(state: ConversationState): ConversationState {
  if (state.pending || !DECLINABLE_STEPS.includes(state.step)) return state
  const about = state.subject?.id ?? 'conversation'
  const said = (attribute: Attribute['attribute'], value: string): Attribute => ({ subject: about, attribute, value, source: null, confidence: high })
  switch (state.step) {
    case 'fears':
      return askThanks(freshCard(note(state, said('fears', 'skipped'))))
    case 'choose':
      return endSitting(note(state, said('sitWith', 'not now')))
    case 'voice':
    case 'intent':
      return endSitting(note(state, said(state.step, 'not answered')))
    case 'thanks':
      return endSitting(note(state, said('thanks', 'not yet')))
  }
  const outcome: Partial<Record<Step, Attribute>> = {
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
  const closable: Step[] = ['closed', 'paused']
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

    case 'alsoHere':
    case 'quieter':
      return onTurn3Answer(state, map, text)

    case 'newPart':
      return resolveNewName(state, text)

    case 'experiment':
      return onExperimentAnswer(state, text)

    case 'voice':
      return onVoiceAnswer(state, map, text)

    case 'intent':
      return onIntentAnswer(state, map, text)

    case 'fears':
      return onFearsAnswer(state, map, text)

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
  const source = state.liftedName?.source ?? answer
  const judgedName = state.liftedName?.name ?? answer
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
  return request({ ...named, liftedName: null }, {
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
  const resolved = settled.liftedName ? { name: settled.liftedName.name, confidence: high } : resolveName(answer, extracted)
  // A shortening must not copy a part already on the map. Asked whether
  // the feeling is separate, naming one that's there means it isn't; at
  // Turn 3 it adds nobody (see nameTurn3); when adding a part, the answer
  // is used as sent.
  const copies =
    resolved.confidence.tag === 'extracted' && visibleNow(settled, map).some((part) => sameName(part.name, resolved.name))
  if (copies && settled.step === 'secondName') {
    const text = settled.answers.secondName!
    return declineSecond(settled, map, text, 'declined: named a part already on the map', resolved.confidence)
  }
  const turn3 = settled.step === 'alsoHere' || settled.step === 'quieter'
  const { name, confidence } = copies && !turn3 ? { name: answer, confidence: high } : resolved
  const figure = figureFor(settled, map, result?.figure ?? null)
  const kind = kindFor(result?.kind ?? null)
  switch (settled.step) {
    case 'loudest':
      return nameLoudest(settled, map, figure, kind, name, confidence)
    case 'secondName':
      return nameSecond(settled, map, figure, kind, name, confidence)
    case 'alsoHere':
    case 'quieter':
      return nameTurn3(settled, map, figure, kind, name, confidence)
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
  // Every part was taken off the map while reflecting: drop the reflection; the early close.
  if (turn === 3 && visibleNow(settled, map).length === 0) return toTurn3(settled, map, null)
  // Sitting with a part that was taken off the map while reflecting: the card ends quietly.
  if ((turn === 'voice' || turn === 'intent' || turn === 'fears') && !subjectHere(settled, map)) return endSitting(settled)
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
      return askTurn3(reflected, map)
    case 4:
      return gather(reflected, map)
    case 'voice':
      return ask(reflected, 'intent', script.intent(partNow(settled, map, settled.subject!.id)!.name))
    case 'intent':
      return settled.askFears ? ask(reflected, 'fears', script.fears) : askThanks(reflected)
    case 'fears':
      return askThanks(reflected)
    case 'experiment':
      return rest(guide(reflected, script.experimentDone))
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
    case 'reflected':
      return onReflected(state, event.seq, event.text, event.map)
    case 'freeWriteRead':
      return onFreeWriteRead(state, event.seq, event.result)
    case 'towardChecked':
      return onTowardChecked(state, event.seq, event.result, event.map)
    case 'riskChecked':
      return onRiskChecked(state, event.seq, event.atRisk, event.map)
    case 'figured':
      return onFigured(state, event.seq, event.result, event.extracted, event.map)
    case 'choice':
      return onChoice(state, event.phrase)
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
    case 'goOn':
      return onGoOn(state, event.map)
    case 'newPart':
      return onNewPart(state, event.map)
    case 'getToKnow':
      return onGetToKnow(state, event.partId, event.map)
    case 'thank':
      return onThank(state, event.map)
    case 'thanksSeen':
      return onThanksSeen(state)
    case 'notice':
      return onNotice(state, event.before, event.partId, event.map)
  }
}
