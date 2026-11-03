import { useCallback, useEffect, useId, useRef, useState } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import { CLOSE_BELOW, MAP_CENTRE } from '../conversation/geometry'
import { visibleLinks, visibleParts } from '../model/landscape'
import { LOOKS } from '../model/types'
import type { LandscapeState, Look, Placement } from '../model/types'
import { copy } from './copy'
import { entersOnRive, useRiveEntranceFiles } from './riveEntrances'
import { LinkThread } from './LinkThread'
import { PartFigure } from './PartFigure'
import type { Side } from './PartFigure'
import { Speech } from './Speech'
import { CAMERA_MS } from './useCamera'
import { SETTLE_MS, WALK_MS } from './useChoreography'
import { Atmosphere, Curtains, World } from './World'

/** Matches the parts' own glide (`--glide` in tokens.css). */
const GLIDE_MS = 350

export interface LandscapeProps {
  state: LandscapeState
  selectedId: string | null
  onSelect: (id: string | null) => void
  onPlace: (partId: string, placement: Placement) => void
  onRename: (partId: string, name: string) => void
  onChangeLook: (partId: string, look: Look) => void
  onRemove: (partId: string) => void
  onRemoveLink: (linkId: string) => void
  /** Get to know it, when the guide can ask (otherwise absent). */
  onGetToKnow?: (partId: string) => void
  onClearWords: (partId: string) => void
  /** The world waits with the person (a part named meanwhile still walks in). */
  waiting?: boolean
  /** Whether any part is still coming in, so the next card can wait until it stands on its spot. */
  onEntering?: (entering: boolean) => void
  /** The conversation is moving parts: they glide slowly. */
  settling?: boolean
  /** Show the light that closeness is measured from (once the map is the person's, and its hint names it). */
  centre?: boolean
  /**
   * The part being sat with (Act 2, Get to know it): the camera goes to it,
   * the others soften, and its words appear from it. `layoutKey` changes
   * with the card on screen.
   */
  focus?: { id: string; voice: string | null; intent: string | null; layoutKey: number | null } | null
  /** Act 2's first question: the figures to tap (they ring; the rest soften). */
  offered?: readonly string[] | null
  /** A figure tapped while offered. */
  onChoose?: (partId: string) => void
  /** Thanked parts: they glow. */
  thanked?: readonly string[]
  /** Layered above the characters (the conversation card). */
  children?: ReactNode
}

/**
 * Parts that appear after the landscape first renders walk in from the
 * moment they're named, while the guide may still be thinking. A CSS
 * walk-in (trace → figure) is over after WALK_MS; a Rive one says when it
 * stands on its spot (it may settle a little longer, under the next card).
 * The demo map's parts are simply there.
 */
function useEntrances(state: LandscapeState) {
  // New ids since the last render (undo restoring a removed part isn't new: its id never left).
  const [seen, setSeen] = useState(state.order)
  const [arriving, setArriving] = useState<string[]>([])
  let next = arriving
  if (seen !== state.order) {
    setSeen(state.order)
    next = [...next, ...state.order.filter((id) => !seen.includes(id))]
  }
  // A part taken off the map mid-entrance has nothing left to finish, and an undo brings it back standing.
  next = next.filter((id) => state.parts[id]?.removed === false)
  if (next.length !== arriving.length || next.some((id, index) => id !== arriving[index])) setArriving(next)

  // A CSS walk-in is over after WALK_MS.
  const walking = next.filter((id) => !entersOnRive(state.parts[id].look)).join(' ')
  useEffect(() => {
    if (walking === '') return
    const done = walking.split(' ')
    const timer = setTimeout(() => setArriving((current) => current.filter((id) => !done.includes(id))), WALK_MS)
    return () => clearTimeout(timer)
  }, [walking])

  const arrived = useCallback((id: string) => setArriving((current) => current.filter((other) => other !== id)), [])
  return { arriving: next, arrived }
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
  onChangeLook,
  onRemove,
  onRemoveLink,
  onGetToKnow,
  onClearWords,
  waiting = false,
  onEntering,
  settling = false,
  centre = false,
  focus = null,
  offered = null,
  onChoose,
  thanked = [],
  children,
}: LandscapeProps) {
  const ref = useRef<HTMLElement>(null)
  const hintId = useId()
  const parts = visibleParts(state)
  const { arriving, arrived } = useEntrances(state)
  const riveFiles = useRiveEntranceFiles()
  const entering = arriving.length > 0
  useEffect(() => onEntering?.(entering), [entering, onEntering])
  const [drafts, setDrafts] = useState<Record<string, Placement | null>>({})
  const glide = settling ? SETTLE_MS : GLIDE_MS
  // Removed parts keep their figures, so undoing a removal never shows two alike.
  const taken = new Set(Object.values(state.parts).map((part) => part.look))
  const freeLooks = LOOKS.filter((look) => !taken.has(look))

  const byId = new Map(parts.map((visible) => [visible.part.id, visible]))
  const end = (id: string) => {
    const { part, placement } = byId.get(id)!
    const draft = drafts[id]
    return { point: draft ?? placement, glide: draft ? 0 : glide, name: part.name }
  }
  // A link appears once both of its parts have arrived.
  const links = visibleLinks(state).filter((link) => link.between.every((id) => !arriving.includes(id)))

  const style = { '--walk': `${WALK_MS}ms`, '--glide': `${glide}ms`, '--camera': `${CAMERA_MS}ms` } as CSSProperties

  // The camera: to the part being sat with (app.css works out the zoom and where it lands).
  const focused = focus ? byId.get(focus.id) : undefined
  const camera = focused
    ? ({
        '--cam-x': focused.placement.x,
        '--cam-y': focused.placement.y,
        '--cam-scale': focused.placement.scale,
        // Wide screens keep it beside the card: on its own side of the meadow.
        '--cam-side': focused.placement.x < 0.5 ? 0.2 : 0.8,
      } as CSSProperties)
    : undefined

  return (
    <main
      className="landscape"
      ref={ref}
      style={style}
      onPointerDown={(event) => {
        if (!(event.target as Element).closest('.part, .link__anchor, .card')) onSelect(null)
      }}
    >
      <p id={hintId} className="visually-hidden">
        {copy.partHint}
      </p>

      {/* What the camera moves: the world and everyone in it, never the card. */}
      <div
        className={`landscape__scene${focused ? ' is-focused' : ''}${offered && offered.length > 0 ? ' is-choosing' : ''}`}
        style={camera}
      >
      <World waiting={waiting} />
      <Curtains />
      <Atmosphere />
      {centre && <CentreLight />}

      {links.map((link) => (
        <LinkThread
          key={link.id}
          id={link.id}
          from={end(link.between[0])}
          to={end(link.between[1])}
          selected={selectedId === link.id}
          whatIf={state.mode === 'whatIf'}
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
          whatIf={state.mode === 'whatIf'}
          entering={arriving.includes(part.id)}
          onArrived={() => arrived(part.id)}
          riveFile={riveFiles[part.look]}
          side={sideOf(state, part.id)}
          hintId={hintId}
          landscapeRef={ref}
          onSelect={() => (offered?.includes(part.id) && onChoose ? onChoose(part.id) : onSelect(part.id))}
          offered={offered?.includes(part.id) ?? false}
          focused={focused?.part.id === part.id}
          thanked={thanked.includes(part.id)}
          onPlace={(next) => onPlace(part.id, next)}
          onRename={(name) => onRename(part.id, name)}
          freeLooks={freeLooks}
          onChangeLook={(look) => onChangeLook(part.id, look)}
          onRemove={() => onRemove(part.id)}
          onGetToKnow={onGetToKnow && (() => onGetToKnow(part.id))}
          onClearWords={() => onClearWords(part.id)}
          onDraft={(draft) => setDrafts((current) => ({ ...current, [part.id]: draft }))}
        />
      ))}
      </div>

      {parts.length === 0 && !children && <p className="landscape__empty">{copy.empty}</p>}

      {focused && (
        <Speech
          key={focused.part.id}
          landscapeRef={ref}
          partId={focused.part.id}
          voice={focus!.voice}
          intent={focus!.intent}
          layoutKey={focus!.layoutKey}
        />
      )}

      {children}
    </main>
  )
}

/**
 * The point closeness is measured from (MAP_CENTRE), made visible: a pool of
 * light on the meadow, as wide as "close" reaches, so "nearer the light, the
 * closer it feels" points at something on screen. Flatter than the zone it
 * stands for, so it lies on the grass instead of rising past the horizon.
 */
function CentreLight() {
  const style = {
    left: `${MAP_CENTRE.x * 100}%`,
    top: `${MAP_CENTRE.y * 100}%`,
    width: `${CLOSE_BELOW * 200}%`,
    height: `${CLOSE_BELOW * 80}%`,
  } as CSSProperties
  return <div className="centre-light" style={style} aria-hidden="true" />
}

