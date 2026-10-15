import { useEffect, useId, useRef, useState } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import { visibleLinks, visibleParts } from '../model/landscape'
import type { LandscapeState, Placement } from '../model/types'
import { copy } from './copy'
import { LinkThread } from './LinkThread'
import { PartFigure } from './PartFigure'
import type { Entrance, Side } from './PartFigure'
import { SETTLE_MS, WALK_MS } from './useChoreography'
import { Atmosphere, Curtains, World } from './World'

/** Matches the parts' own glide (`--glide` in tokens.css). */
const GLIDE_MS = 350

interface LandscapeProps {
  state: LandscapeState
  selectedId: string | null
  onSelect: (id: string | null) => void
  onPlace: (partId: string, placement: Placement) => void
  onRename: (partId: string, name: string) => void
  onRemove: (partId: string) => void
  onRemoveLink: (linkId: string) => void
  /** Get to know it, when the guide can ask (otherwise absent). */
  onGetToKnow?: (partId: string) => void
  onClearWords: (partId: string) => void
  /** The world waits with the person; parts named meanwhile hold their entrance. */
  waiting?: boolean
  /** The conversation is moving parts: they glide slowly. */
  settling?: boolean
  /** Layered above the characters (the conversation card). */
  children?: ReactNode
}

/**
 * Parts that appear after the landscape first renders walk in (trace →
 * figure) — but not while the world is waiting, so one motion idea plays
 * at a time. The demo map's parts are simply there.
 */
function useEntrances(state: LandscapeState, waiting: boolean): Record<string, Entrance> {
  // New ids since the last render (undo restoring a removed part isn't new: its id never left).
  const [seen, setSeen] = useState(state.order)
  const [arriving, setArriving] = useState<string[]>([])
  if (seen !== state.order) {
    setSeen(state.order)
    const fresh = state.order.filter((id) => !seen.includes(id))
    if (fresh.length > 0) setArriving([...arriving, ...fresh])
  }

  // A walk starts when the waiting ends, and is over after WALK_MS.
  const walking = arriving.join(' ')
  useEffect(() => {
    if (waiting || walking === '') return
    const done = walking.split(' ')
    const timer = setTimeout(() => setArriving((current) => current.filter((id) => !done.includes(id))), WALK_MS)
    return () => clearTimeout(timer)
  }, [waiting, walking])

  return Object.fromEntries(arriving.map((id) => [id, waiting ? 'held' : 'walking']))
}

/** Parts arrive one per answer, alternating sides: the first from the left, the next from the right. */
function sideOf(state: LandscapeState, id: string): Side {
  return state.order.indexOf(id) % 2 === 0 ? 'left' : 'right'
}

/**
 * Layers, back to front: the world, the "What if…" curtains, atmosphere,
 * links, the characters, then any overlay. Mode is never conveyed by colour
 * alone — the curtains frame it.
 */
export function Landscape({
  state,
  selectedId,
  onSelect,
  onPlace,
  onRename,
  onRemove,
  onRemoveLink,
  onGetToKnow,
  onClearWords,
  waiting = false,
  settling = false,
  children,
}: LandscapeProps) {
  const ref = useRef<HTMLElement>(null)
  const hintId = useId()
  const parts = visibleParts(state)
  const entrances = useEntrances(state, waiting)
  const [drafts, setDrafts] = useState<Record<string, Placement | null>>({})
  const glide = settling ? SETTLE_MS : GLIDE_MS

  const byId = new Map(parts.map((visible) => [visible.part.id, visible]))
  const end = (id: string) => {
    const { part, placement } = byId.get(id)!
    const draft = drafts[id]
    return { point: draft ?? placement, glide: draft ? 0 : glide, name: part.name }
  }
  // A link appears once both of its parts have arrived.
  const links = visibleLinks(state).filter((link) => link.between.every((id) => !entrances[id]))

  const style = { '--walk': `${WALK_MS}ms`, '--glide': `${glide}ms` } as CSSProperties

  return (
    <main
      className="landscape"
      ref={ref}
      style={style}
      onPointerDown={(event) => {
        if (!(event.target as Element).closest('.part, .link__anchor, .card')) onSelect(null)
      }}
    >
      <World waiting={waiting} />
      <Curtains />
      <Atmosphere />

      <p id={hintId} className="visually-hidden">
        {copy.partHint}
      </p>

      {parts.length === 0 && !children && <p className="landscape__empty">{copy.empty}</p>}

      {links.map((link) => (
        <LinkThread
          key={link.id}
          id={link.id}
          from={end(link.between[0])}
          to={end(link.between[1])}
          selected={selectedId === link.id}
          onSelect={() => onSelect(link.id)}
          onRemove={() => onRemoveLink(link.id)}
        />
      ))}

      {parts.map(({ part, placement }) => (
        <PartFigure
          key={part.id}
          part={part}
          placement={placement}
          selected={selectedId === part.id}
          entrance={entrances[part.id]}
          side={sideOf(state, part.id)}
          hintId={hintId}
          landscapeRef={ref}
          onSelect={() => onSelect(part.id)}
          onPlace={(next) => onPlace(part.id, next)}
          onRename={(name) => onRename(part.id, name)}
          onRemove={() => onRemove(part.id)}
          onGetToKnow={onGetToKnow && (() => onGetToKnow(part.id))}
          onClearWords={() => onClearWords(part.id)}
          onDraft={(draft) => setDrafts((current) => ({ ...current, [part.id]: draft }))}
        />
      ))}

      {children}
    </main>
  )
}
