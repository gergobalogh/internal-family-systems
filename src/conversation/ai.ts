import {
  API,
  FREE_WRITE_FORM_LABELS,
  PART_KIND_LABELS,
  isFigureReading,
  TOWARD_LABELS,
  isExtractResponse,
  isFreeWriteAnalysis,
  isJudgement,
  isReflectResponse,
  isRiskResponse,
} from './contract'
import type {
  ExtractRequest,
  FigureReading,
  FigureRequest,
  FreeWriteAnalysis,
  FreeWriteRequest,
  Judgement,
  PartKind,
  ReflectRequest,
  RiskRequest,
  TowardCheck,
  TowardCheckRequest,
} from './contract'

/** Any AI call slower than this counts as failed; the talk moves on without it. */
export const AI_TIMEOUT_MS = 12_000

/**
 * Dev-only switches, ignored in production. `?ai=off` sends every AI call
 * down its fallback path, deterministically, without touching the network.
 * `?ai=scripted` answers on the device instead, like the browser checks'
 * scripted answers, so the whole walk can be tried (on a phone, say)
 * without a model call: see `scripted`.
 */
const aiSwitch = import.meta.env.DEV ? new URLSearchParams(window.location.search).get('ai') : null
const aiOff = aiSwitch === 'off'
const aiScripted = aiSwitch === 'scripted'

/** A scripted answer's pause, so the world still waits a moment as with a real call. */
const SCRIPTED_MS = 700
/** Kinds in turn: one keeps watch, one gets away, then the neutral places. Never "hurts", so Act 2 offers them. */
const SCRIPTED_KINDS: readonly PartKind[] = ['guards', 'escapes', 'other']
let scriptedFigures = 0

const judged = <Label extends string>(labels: readonly Label[], label: Label): Judgement<Label> => ({
  label,
  probabilities: Object.fromEntries(
    labels.map((each) => [each, each === label ? 0.91 : 0.09 / (labels.length - 1)]),
  ) as Record<Label, number>,
})

/** The free-write's first few short clauses (two to four words), word for word: the feeling buttons. */
function shortClauses(freeWrite: string): string[] {
  const clauses = freeWrite
    .split(/[.,;:!?]+|\s+(?:and|but|because|so)\s+/i)
    .map((clause) => clause.trim())
    .filter((clause) => {
      const words = clause.split(/\s+/).length
      return words >= 2 && words <= 4
    })
  return [...new Set(clauses)].slice(0, 3)
}

/**
 * `?ai=scripted`: the free-write's short clauses as feeling buttons, a
 * frustrated toward-check (so a second part comes), kinds in turn, no risk
 * from the AI (the local phrase list still pauses), and the fixed fallback
 * lines for reflections and names.
 */
async function scripted(url: string, body: unknown): Promise<unknown> {
  await new Promise((resolve) => setTimeout(resolve, SCRIPTED_MS))
  switch (url) {
    case API.freeWrite: {
      const phrases = shortClauses((body as FreeWriteRequest).freeWrite)
      const form = phrases.length >= 2 ? 'several_feelings' : phrases.length === 1 ? 'one_feeling' : 'little'
      return { form: judged(FREE_WRITE_FORM_LABELS, form), phrases }
    }
    case API.towardCheck:
      return judged(TOWARD_LABELS, 'frustrated_critical')
    case API.risk:
      return { atRisk: false }
    case API.figure:
      return { figure: null, kind: judged(PART_KIND_LABELS, SCRIPTED_KINDS[scriptedFigures++ % SCRIPTED_KINDS.length]) }
    default:
      return null
  }
}

/** Null on any failure — HTTP error, timeout, bad shape, or the dev switch. */
async function post(url: string, body: unknown, signal: AbortSignal): Promise<unknown> {
  if (aiOff) return null
  if (aiScripted) return scripted(url, body)
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.any([signal, AbortSignal.timeout(AI_TIMEOUT_MS)]),
    })
    return response.ok ? await response.json() : null
  } catch {
    return null
  }
}

export async function reflect(request: ReflectRequest, signal: AbortSignal): Promise<string | null> {
  const data = await post(API.reflect, request, signal)
  return isReflectResponse(data) ? data.text : null
}

/** Null only when both Turn 0 readings are unavailable or malformed. */
export async function analyzeFreeWrite(request: FreeWriteRequest, signal: AbortSignal): Promise<FreeWriteAnalysis | null> {
  const data = await post(API.freeWrite, request, signal)
  return isFreeWriteAnalysis(data) ? data : null
}

export async function checkToward(request: TowardCheckRequest, signal: AbortSignal): Promise<TowardCheck | null> {
  const data = await post(API.towardCheck, request, signal)
  return isJudgement(data, TOWARD_LABELS) ? data : null
}

/** Null when the check couldn't be had: the local phrase list stays the floor. */
export async function checkRisk(request: RiskRequest, signal: AbortSignal): Promise<boolean | null> {
  const data = await post(API.risk, request, signal)
  return isRiskResponse(data) ? data.atRisk : null
}

/** Null when JEV can't be had: the flow takes the session's next unused figure. */
export async function chooseFigure(request: FigureRequest, signal: AbortSignal): Promise<FigureReading | null> {
  const data = await post(API.figure, request, signal)
  return isFigureReading(data) ? data : null
}

/** Null when no extraction could be had: the answer is used as the name, as before. */
export async function extractName(request: ExtractRequest, signal: AbortSignal): Promise<string | null> {
  const data = await post(API.extractName, request, signal)
  return isExtractResponse(data) ? data.label : null
}
