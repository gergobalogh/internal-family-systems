import { useId, useState } from 'react'
import type { CSSProperties, KeyboardEvent } from 'react'
import { copy } from './copy'
import { usePointerDrag } from './usePointerDrag'

/**
 * Where the note sits: its own point (x, y) lies on the landscape's same
 * point, inside a gutter, so at 0 it touches the left/top gutter, at 1 the
 * right/bottom, and it never leaves the map at any size.
 */
interface Spot {
  x: number
  y: number
}

/** Top left, in the sky: clear of the closing card (under the house, or under the note on tall screens). */
const START: Spot = { x: 0, y: 0 }
/** Matches the gutter in .map-note's left/top. */
const GUTTER = 16
const MOVE_STEP = 0.04
const MOVE_STEP_LARGE = 0.16

const clampSpot = ({ x, y }: Spot): Spot => ({ x: Math.min(1, Math.max(0, x)), y: Math.min(1, Math.max(0, y)) })

/**
 * The summary the conversation leaves on the map, kept true to it as the
 * person rearranges things. The person can put it wherever suits them; that
 * spot is the note's own, not part of the map (no undo, same in both modes).
 */
export function MapNote({ text }: { text: string | null }) {
  const [spot, setSpot] = useState(START)
  const [draft, setDraft] = useState<Spot | null>(null)
  const hintId = useId()
  const shown = draft ?? spot

  const drag = usePointerDrag({
    start: (event) => {
      const box = event.currentTarget.closest('.landscape')!.getBoundingClientRect()
      const note = event.currentTarget.getBoundingClientRect()
      // The room the note has to travel in, per axis (never zero: a note as wide as the map stays put).
      return {
        from: spot,
        roomX: Math.max(1, box.width - 2 * GUTTER - note.width),
        roomY: Math.max(1, box.height - 2 * GUTTER - note.height),
      }
    },
    move: ({ from, roomX, roomY }, { dx, dy }) => {
      const next = clampSpot({ x: from.x + dx / roomX, y: from.y + dy / roomY })
      setDraft(next)
      return next
    },
    end: (value) => {
      setDraft(null)
      if (value) setSpot(value)
    },
    cancel: () => setDraft(null),
  })

  const onKeyDown = (event: KeyboardEvent) => {
    const step = event.shiftKey ? MOVE_STEP_LARGE : MOVE_STEP
    const moves: Partial<Record<string, Spot>> = {
      ArrowLeft: { x: spot.x - step, y: spot.y },
      ArrowRight: { x: spot.x + step, y: spot.y },
      ArrowUp: { x: spot.x, y: spot.y - step },
      ArrowDown: { x: spot.x, y: spot.y + step },
    }
    const next = moves[event.key]
    if (!next) return
    event.preventDefault()
    setSpot(clampSpot(next))
  }

  if (!text) return null
  const style = { '--note-x': shown.x, '--note-y': shown.y } as CSSProperties

  return (
    <aside
      className={`map-note${draft ? ' is-dragging' : ''}`}
      style={style}
      tabIndex={0}
      aria-label={copy.note.label}
      aria-describedby={hintId}
      onKeyDown={onKeyDown}
      {...drag}
    >
      <p id={hintId} className="visually-hidden">
        {copy.note.hint}
      </p>
      <p className="map-note__text" aria-live="polite">
        {/* Keyed so a changed sentence fades in rather than swapping. */}
        <span key={text} className="map-note__words">
          {text}
        </span>
      </p>
    </aside>
  )
}
