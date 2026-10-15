import { useEffect, useRef, useState } from 'react'
import type { ConversationState } from '../conversation/flow'

/** A new part's trace walking in from the edge to its spot (trace → figure). */
export const WALK_MS = 2600
/** Conversation-driven moves (Turn 3, corrections) glide this slowly. */
export const SETTLE_MS = 1400

/**
 * card: the current card is up. waiting: an answer was sent and the world
 * waits with the person (card ghosted). arriving: the world is moving (a
 * trace walking in, parts settling); the next card waits until it's done.
 */
export type Phase = 'card' | 'waiting' | 'arriving'

/**
 * The input ritual's timing (docs/input-choreography-plan.md): send → ghost
 * → world waits → trace walks in → next card. One motion idea at a time:
 * the next card is held back while the world moves.
 */
export function useChoreography(state: ConversationState) {
  const waiting = state.pending !== null
  const [shown, setShown] = useState(state.card)
  const [arriving, setArriving] = useState(false)
  /** When the world's current motion ends (performance.now() time). */
  const motionUntil = useRef(0)
  /** A part was named while waiting: its walk starts when the waiting ends. */
  const walkOwed = useRef(false)
  // Effects from before the first render (the dev jump) are already on the map, not motion to wait for.
  const seen = useRef(state.effects.length)

  useEffect(() => {
    const fresh = state.effects.slice(seen.current)
    seen.current = state.effects.length
    const now = performance.now()
    if (fresh.some((action) => action.type === 'addPart')) {
      if (waiting) walkOwed.current = true
      else motionUntil.current = Math.max(motionUntil.current, now + WALK_MS)
    }
    if (fresh.some((action) => action.type === 'place' || action.type === 'remove' || action.type === 'unlink')) {
      motionUntil.current = Math.max(motionUntil.current, now + SETTLE_MS)
    }
  }, [state.effects, waiting])

  useEffect(() => {
    if (waiting || !walkOwed.current) return
    walkOwed.current = false
    motionUntil.current = Math.max(motionUntil.current, performance.now() + WALK_MS)
  }, [waiting])

  useEffect(() => {
    if (waiting || state.card === shown) return
    const delay = motionUntil.current - performance.now()
    const show = () => {
      setArriving(false)
      setShown(state.card)
    }
    if (delay <= 0) {
      show()
      return
    }
    setArriving(true)
    const timer = setTimeout(show, delay)
    return () => clearTimeout(timer)
  }, [waiting, state.card, shown])

  // The new card is owed from the render the waiting ends: never un-ghost the old one first.
  const phase: Phase = waiting ? 'waiting' : arriving || state.card !== shown ? 'arriving' : 'card'
  return {
    /** Index of the first line of the card on screen. */
    shown,
    phase,
    waiting,
    /** Parts glide slowly while the conversation is moving them. */
    settling: waiting || arriving || state.card !== shown,
  }
}
