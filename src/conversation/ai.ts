import {
  API,
  CENTRALITY_ONE_LABELS,
  CENTRALITY_TWO_LABELS,
  TOWARD_LABELS,
  isCorrectionsResponse,
  isJudgement,
  isReflectResponse,
  isRiskResponse,
} from './contract'
import type {
  CentralityRequest,
  CentralityResult,
  CorrectionsRequest,
  ParsedOp,
  ReflectRequest,
  RiskRequest,
  TowardCheck,
  TowardCheckRequest,
} from './contract'

/** Any AI call slower than this counts as failed; the talk moves on without it. */
export const AI_TIMEOUT_MS = 12_000

/**
 * Dev-only switch: `?ai=off` sends every AI call down its fallback path,
 * deterministically, without touching the network. Ignored in production.
 */
export const aiOff =
  import.meta.env.DEV && new URLSearchParams(window.location.search).get('ai') === 'off'

/** Null on any failure — HTTP error, timeout, bad shape, or the dev switch. */
async function post(url: string, body: unknown, signal: AbortSignal): Promise<unknown> {
  if (aiOff) return null
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

export async function checkToward(request: TowardCheckRequest, signal: AbortSignal): Promise<TowardCheck | null> {
  const data = await post(API.towardCheck, request, signal)
  return isJudgement(data, TOWARD_LABELS) ? data : null
}

export async function checkCentrality(request: CentralityRequest, signal: AbortSignal): Promise<CentralityResult | null> {
  const data = await post(API.centrality, request, signal)
  const labels = request.kind === 'one' ? CENTRALITY_ONE_LABELS : CENTRALITY_TWO_LABELS
  return isJudgement<string>(data, labels) ? (data as CentralityResult) : null
}

/** Null when the check couldn't be had: the local phrase list stays the floor. */
export async function checkRisk(request: RiskRequest, signal: AbortSignal): Promise<boolean | null> {
  const data = await post(API.risk, request, signal)
  return isRiskResponse(data) ? data.atRisk : null
}

export async function parseCorrections(request: CorrectionsRequest, signal: AbortSignal): Promise<ParsedOp[] | null> {
  const data = await post(API.corrections, request, signal)
  return isCorrectionsResponse(data) ? data.ops : null
}
