import { useCallback, useEffect, useLayoutEffect, useReducer, useRef } from 'react'
import type { Dispatch } from 'react'
import type { Action, LandscapeState } from '../model/types'
import { checkCentrality, checkRisk, checkToward, parseCorrections, reflect } from './ai'
import { conversationReducer, startConversation } from './flow'
import type { ConversationEvent, ConversationState, Pending } from './flow'

/** An event before the map snapshot is attached. */
type WithoutMap<E> = E extends unknown ? Omit<E, 'map'> : never
type Outcome = Extract<
  WithoutMap<ConversationEvent>,
  { type: 'reflected' | 'towardChecked' | 'centralityChecked' | 'corrected' | 'riskChecked' }
>

/** Runs one AI job; resolves to the event that feeds its result back (null-safe throughout). */
async function run(job: Pending, signal: AbortSignal): Promise<Outcome> {
  switch (job.kind) {
    case 'reflect':
      return { type: 'reflected', seq: job.seq, text: await reflect(job.request, signal) }
    case 'towardCheck':
      return { type: 'towardChecked', seq: job.seq, result: await checkToward(job.request, signal) }
    case 'centrality':
      return { type: 'centralityChecked', seq: job.seq, result: await checkCentrality(job.request, signal) }
    case 'corrections':
      return { type: 'corrected', seq: job.seq, ops: await parseCorrections(job.request, signal) }
    case 'risk':
      return { type: 'riskChecked', seq: job.seq, atRisk: await checkRisk(job.request, signal) }
  }
}

/**
 * Runs the entry conversation, and the guide after it, against a live
 * landscape: the conversation's map changes are applied in order as they
 * are decided, and every event reads the map as it is now (a rename or
 * removal made mid-conversation wins). `initial` starts somewhere other than
 * Turn 0 (the dev jump); its effects are already on the map.
 */
export function useConversation(landscape: LandscapeState, dispatch: Dispatch<Action>, initial?: ConversationState) {
  const [state, send] = useReducer(conversationReducer, initial, (start) => start ?? startConversation())

  const landscapeRef = useRef(landscape)
  useLayoutEffect(() => {
    landscapeRef.current = landscape
  })
  const map = useCallback(() => landscapeRef.current, [])

  // Apply new map effects before paint, in order. Each is safe to repeat.
  const applied = useRef(initial?.effects.length ?? 0)
  useLayoutEffect(() => {
    for (const action of state.effects.slice(applied.current)) dispatch(action)
    applied.current = state.effects.length
  }, [state.effects, dispatch])

  // Run the pending AI call. Unmounting (or a newer call) abandons it unseen.
  useEffect(() => {
    const job = state.pending
    if (!job) return
    const controller = new AbortController()
    void run(job, controller.signal).then((outcome) => {
      if (!controller.signal.aborted) send({ ...outcome, map: map() } as ConversationEvent)
    })
    return () => controller.abort()
  }, [state.pending, map])

  /** Sends a person's event with the map as it is now. */
  const say = useCallback((event: WithoutMap<ConversationEvent>) => send({ ...event, map: map() } as ConversationEvent), [map])

  return {
    state,
    answer: useCallback((text: string) => say({ type: 'answer', text }), [say]),
    noChanges: useCallback((text: string) => say({ type: 'noChanges', text }), [say]),
    dismiss: useCallback(() => say({ type: 'dismiss' }), [say]),
    decline: useCallback(() => say({ type: 'decline' }), [say]),
    accept: useCallback(() => say({ type: 'accept' }), [say]),
    tried: useCallback(() => say({ type: 'tried' }), [say]),
    enteredWhatIf: useCallback(() => say({ type: 'enteredWhatIf' }), [say]),
    getToKnow: useCallback((partId: string) => say({ type: 'getToKnow', partId }), [say]),
    notice: useCallback((before: LandscapeState, partId: string | null) => say({ type: 'notice', before, partId }), [say]),
  }
}

export type Talk = ReturnType<typeof useConversation>
