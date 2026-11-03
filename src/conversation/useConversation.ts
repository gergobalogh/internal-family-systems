import { useCallback, useEffect, useLayoutEffect, useReducer, useRef } from 'react'
import type { Dispatch } from 'react'
import type { Action, LandscapeState } from '../model/types'
import { analyzeFreeWrite, checkRisk, checkToward, chooseFigure, extractName, reflect } from './ai'
import { fearsRequested } from './features'
import { conversationReducer, startConversation } from './flow'
import type { ConversationEvent, ConversationState, Pending } from './flow'
import type { ReflectRequest } from './contract'

/** An event before the map snapshot is attached. */
type WithoutMap<E> = E extends unknown ? Omit<E, 'map'> : never
type Outcome = Extract<
  WithoutMap<ConversationEvent>,
  { type: 'reflected' | 'freeWriteRead' | 'towardChecked' | 'riskChecked' | 'figured' }
>

/** Reflections started ahead of their turn, by request (key order aside), until the flow asks for one. */
type Early = Map<string, Promise<string | null>>

const keyOf = (request: ReflectRequest) => JSON.stringify(request, Object.keys(request).sort())

/** Runs one AI job; resolves to the event that feeds its result back (null-safe throughout). */
async function run(job: Pending, signal: AbortSignal, early: Early): Promise<Outcome> {
  switch (job.kind) {
    case 'freeWrite':
      return { type: 'freeWriteRead', seq: job.seq, result: await analyzeFreeWrite(job.request, signal) }
    case 'reflect': {
      const started = early.get(keyOf(job.request))
      early.clear()
      return { type: 'reflected', seq: job.seq, text: await (started ?? reflect(job.request, signal)) }
    }
    case 'towardCheck':
      return { type: 'towardChecked', seq: job.seq, result: await checkToward(job.request, signal) }
    case 'risk':
      return { type: 'riskChecked', seq: job.seq, atRisk: await checkRisk(job.request, signal) }
    case 'figure': {
      // The reflection after the naming starts now and outlives this job
      // (its own timeout still applies); the flow asks for it next.
      early.clear()
      if (job.next) early.set(keyOf(job.next), reflect(job.next, new AbortController().signal))
      // Side by side: the part already waits for its figure, so the
      // extraction costs no extra wait. The figure judges the raw answer.
      const [result, extracted] = await Promise.all([
        chooseFigure(job.request, signal),
        job.extract === false
          ? Promise.resolve(null)
          : extractName({ question: job.request.question, answer: job.request.name }, signal),
      ])
      return { type: 'figured', seq: job.seq, result, extracted }
    }
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
  const [state, send] = useReducer(conversationReducer, initial, (start) => start ?? startConversation({ askFears: fearsRequested }))

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
  const early = useRef<Early>(new Map())
  useEffect(() => {
    const job = state.pending
    if (!job) return
    const controller = new AbortController()
    void run(job, controller.signal, early.current).then((outcome) => {
      if (!controller.signal.aborted) send({ ...outcome, map: map() } as ConversationEvent)
    })
    return () => controller.abort()
  }, [state.pending, map])

  /** Sends a person's event with the map as it is now. */
  const say = useCallback((event: WithoutMap<ConversationEvent>) => send({ ...event, map: map() } as ConversationEvent), [map])

  return {
    state,
    answer: useCallback((text: string) => say({ type: 'answer', text }), [say]),
    choose: useCallback((phrase: string) => say({ type: 'choice', phrase }), [say]),
    goOn: useCallback(() => say({ type: 'goOn' }), [say]),
    dismiss: useCallback(() => say({ type: 'dismiss' }), [say]),
    decline: useCallback(() => say({ type: 'decline' }), [say]),
    accept: useCallback(() => say({ type: 'accept' }), [say]),
    tryExperiment: useCallback(() => say({ type: 'tryExperiment' }), [say]),
    tried: useCallback(() => say({ type: 'tried' }), [say]),
    keepTrying: useCallback(() => say({ type: 'keepTrying' }), [say]),
    newPart: useCallback(() => say({ type: 'newPart' }), [say]),
    enteredWhatIf: useCallback(() => say({ type: 'enteredWhatIf' }), [say]),
    getToKnow: useCallback((partId: string) => say({ type: 'getToKnow', partId }), [say]),
    thank: useCallback(() => say({ type: 'thank' }), [say]),
    thanksSeen: useCallback(() => say({ type: 'thanksSeen' }), [say]),
    thatsHowItIs: useCallback(() => say({ type: 'thatsHowItIs' }), [say]),
    goBack: useCallback(() => say({ type: 'goBack' }), [say]),
    keepIt: useCallback(() => say({ type: 'keepIt' }), [say]),
    notice: useCallback((before: LandscapeState, partId: string | null) => say({ type: 'notice', before, partId }), [say]),
  }
}

export type Talk = ReturnType<typeof useConversation>
