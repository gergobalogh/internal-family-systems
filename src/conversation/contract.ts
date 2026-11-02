/**
 * The contract between the browser and the server-side AI routes. API keys
 * live only on the server (server/ai.ts); the browser sees these shapes.
 * Framework- and DOM-free so the server can import it too.
 */

// The .ts extension lets the server import this file too (Node resolution).
import { LOOKS } from '../model/types.ts'
import type { Look } from '../model/types.ts'

export const API = {
  reflect: '/api/reflect',
  freeWrite: '/api/free-write',
  towardCheck: '/api/toward-check',
  centrality: '/api/centrality',
  corrections: '/api/corrections',
  risk: '/api/risk',
  figure: '/api/figure',
  extractName: '/api/extract-name',
} as const

/** A JEV Choice: the most probable label, and every label's probability. */
export interface Judgement<Label extends string> {
  label: Label
  probabilities: Record<Label, number>
}

/** How Turn 0 was written — about the words on the page, never the person. */
export const FREE_WRITE_FORM_LABELS = ['one_feeling', 'several_feelings', 'situation', 'little'] as const
export type FreeWriteFormLabel = (typeof FREE_WRITE_FORM_LABELS)[number]
export type FreeWriteForm = Judgement<FreeWriteFormLabel>

export interface FreeWriteRequest {
  freeWrite: string
}

/**
 * The two Turn 0 readings run side by side. Either may be null when its AI
 * provider is unavailable; Turn 1 always has a scripted fallback.
 */
export interface FreeWriteAnalysis {
  form: FreeWriteForm | null
  /** Candidate names copied from the free-write. The browser verifies every one. */
  phrases: string[] | null
}

/** The toward-check is a 3-way Choice. */
export const TOWARD_LABELS = ['warm_curious', 'frustrated_critical', 'unclear'] as const
export type TowardLabel = (typeof TOWARD_LABELS)[number]
export type TowardCheck = Judgement<TowardLabel>

export interface TowardCheckRequest {
  /** The part's name as shown in the question. */
  partName: string
  question: string
  answer: string
}

/** Turn 3 with one part on the map. */
export const CENTRALITY_ONE_LABELS = ['close', 'middle', 'far', 'unclear'] as const
/** Turn 3 with two parts: which feels closer. */
export const CENTRALITY_TWO_LABELS = ['part_a_closer', 'part_b_closer', 'about_same', 'unclear'] as const
export type CentralityOneLabel = (typeof CENTRALITY_ONE_LABELS)[number]
export type CentralityTwoLabel = (typeof CENTRALITY_TWO_LABELS)[number]

export type CentralityRequest =
  | { kind: 'one'; partName: string; question: string; answer: string }
  | { kind: 'two'; partA: string; partB: string; question: string; answer: string }

export type CentralityResult = Judgement<CentralityOneLabel> | Judgement<CentralityTwoLabel>

/**
 * Turn 1 reflects the free-write; Turn 2 the answer to "loudest"; Turns 3
 * and 4 the most recent answer, with the question it answered. After the
 * entry conversation: a part's voice and intent (Get to know it), the
 * experiment's "What was that like?", and the noticing question.
 */
export type ReflectRequest =
  | { turn: 1; freeWrite: string; nextQuestion?: string; avoidPhrases?: string[] }
  | { turn: 2; freeWrite: string; loudest: string }
  | { turn: 3 | 4; freeWrite: string; question: string; answer: string }
  /** The frustrated path reflects on the toward answer before wondering about a second feeling. */
  | { turn: 'toward'; freeWrite: string; partName: string; question: string; answer: string }
  | { turn: 'voice'; freeWrite: string; partName: string; question: string; answer: string }
  | { turn: 'intent'; freeWrite: string; partName: string; voice: string; question: string; answer: string }
  /** `changes`: how "What if" differs from "How it is", one line per part (names theirs). */
  | { turn: 'experiment'; freeWrite: string; changes: string[]; question: string; answer: string }
  | { turn: 'noticing'; freeWrite: string; question: string; answer: string }

export type ReflectTurn = ReflectRequest['turn']

export interface ReflectResponse {
  text: string
}

/** What one instruction in a Turn 4 correction asks for. */
export const OP_KINDS = [
  'rename',
  'remove',
  'bigger',
  'smaller',
  'closer',
  'further',
  'unlink',
  'wish',
  'affirm',
  'unclear',
] as const
export type OpKind = (typeof OP_KINDS)[number]

/**
 * One instruction as the LLM reads it. Everything is copied from the
 * person's words — the browser verifies each op against their text before
 * anything is applied.
 */
export interface ParsedOp {
  kind: OpKind
  /** The words of the correction that make up this instruction. */
  quote: string
  /** The words used for the part ("it", or a name as written); "" if none. */
  refersTo: string
  /** Rename only: the new name as written; otherwise "". */
  newName: string
}

export interface CorrectionsRequest {
  correction: string
  /** Names of the parts on the map, in creation order. */
  parts: string[]
  /** Names of parts taken off the map. */
  removed: string[]
  /** The two names joined by the drawn link, if one is drawn. */
  link: [string, string] | null
}

export interface CorrectionsResponse {
  ops: ParsedOp[]
}

/** The safety path's AI check: one answer, with the question it answered. */
export interface RiskRequest {
  question: string
  answer: string
}

export interface RiskResponse {
  atRisk: boolean
}

/** A part being named: JEV judges which figure fits it, from the person's words. */
export interface FigureRequest {
  /** Their naming answer, trimmed (the figure judges this while the extraction runs alongside). */
  name: string
  /** The question it answered. */
  question: string
  /** Turn 0's answer: what's weighing on them, for a name that says little alone. */
  freeWrite: string
}

/** A hidden reading used only to choose a part's starting spot. */
export const PART_KIND_LABELS = ['guards', 'escapes', 'hurts', 'other'] as const
export type PartKind = (typeof PART_KIND_LABELS)[number]
export type PartKindChoice = Judgement<PartKind>

/** A naming answer, shortened to the naming words before a part appears. */
export interface ExtractRequest {
  /** The question it answered. */
  question: string
  /** Their naming answer, trimmed. */
  answer: string
}

export interface ExtractResponse {
  /** The naming words, copied from the answer — the browser verifies this before using it. */
  label: string
}

/** Every figure's probability; the flow takes the most probable one not yet on the map. */
export type FigureChoice = Judgement<Look>

/** Figure and kind are two questions in one JEV request, so neither adds another wait. */
export interface FigureReading {
  figure: FigureChoice | null
  kind: PartKindChoice | null
}

const isProbability = (value: unknown): value is number =>
  typeof value === 'number' && value >= 0 && value <= 1

export function isJudgement<Label extends string>(
  value: unknown,
  labels: readonly Label[],
): value is Judgement<Label> {
  if (typeof value !== 'object' || value === null) return false
  const { label, probabilities } = value as Partial<Judgement<Label>>
  return (
    labels.includes(label as Label) &&
    typeof probabilities === 'object' &&
    probabilities !== null &&
    labels.every((key) => isProbability(probabilities[key]))
  )
}

export function isReflectResponse(value: unknown): value is ReflectResponse {
  return typeof value === 'object' && value !== null && typeof (value as ReflectResponse).text === 'string'
}

export function isFreeWriteAnalysis(value: unknown): value is FreeWriteAnalysis {
  if (typeof value !== 'object' || value === null) return false
  const { form, phrases } = value as Partial<FreeWriteAnalysis>
  return (
    (form === null || isJudgement(form, FREE_WRITE_FORM_LABELS)) &&
    (phrases === null || (Array.isArray(phrases) && phrases.every((phrase) => typeof phrase === 'string')))
  )
}

export function isParsedOp(value: unknown): value is ParsedOp {
  if (typeof value !== 'object' || value === null) return false
  const { kind, quote, refersTo, newName } = value as Partial<ParsedOp>
  return (
    OP_KINDS.includes(kind as OpKind) &&
    typeof quote === 'string' &&
    typeof refersTo === 'string' &&
    typeof newName === 'string'
  )
}

export function isRiskResponse(value: unknown): value is RiskResponse {
  return typeof value === 'object' && value !== null && typeof (value as RiskResponse).atRisk === 'boolean'
}

export function isFigureReading(value: unknown): value is FigureReading {
  if (typeof value !== 'object' || value === null) return false
  const { figure, kind } = value as Partial<FigureReading>
  return (
    (figure === null || isJudgement(figure, LOOKS)) &&
    (kind === null || isJudgement(kind, PART_KIND_LABELS))
  )
}

export function isExtractResponse(value: unknown): value is ExtractResponse {
  return typeof value === 'object' && value !== null && typeof (value as ExtractResponse).label === 'string'
}

export function isCorrectionsResponse(value: unknown): value is CorrectionsResponse {
  if (typeof value !== 'object' || value === null) return false
  const { ops } = value as Partial<CorrectionsResponse>
  return Array.isArray(ops) && ops.every(isParsedOp)
}
