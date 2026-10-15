import { useLayoutEffect, useRef, useState } from 'react'
import type { CSSProperties, KeyboardEvent, RefObject } from 'react'
import { clampPlacement } from '../model/landscape'
import type { Part, Placement } from '../model/types'
import { copy } from './copy'
import { Figure } from './Figure'
import { usePointerDrag } from './usePointerDrag'

/** A new part's entrance: hidden while the world waits, then walking in from its side. */
export type Entrance = 'held' | 'walking'

/** The edge a part walks in from. A part from the right is mirrored, so it faces the way it walks. */
export type Side = 'left' | 'right'

interface PartFigureProps {
  part: Part
  placement: Placement
  selected: boolean
  entrance?: Entrance
  side: Side
  hintId: string
  landscapeRef: RefObject<HTMLElement | null>
  onSelect: () => void
  onPlace: (placement: Placement) => void
  onRename: (name: string) => void
  onRemove: () => void
  /** Get to know it; absent while the guide can't ask (mid-conversation, a card waiting, a pause). */
  onGetToKnow?: () => void
  onClearWords: () => void
  /** The in-progress gesture, so things drawn between parts can follow it. */
  onDraft?: (placement: Placement | null) => void
}

const MOVE_STEP = 0.02
const MOVE_STEP_LARGE = 0.08
const SCALE_STEP = 1.12

/** Room kept between a label and the landscape's edge. */
const EDGE_ROOM = 8
/** The label's gap from the figure's hit area (.part__tag's top). */
const TAG_GAP = 8

interface LabelSides {
  x: 'start' | 'center' | 'end'
  y: 'above' | 'below'
}

/**
 * Keeps a part's label whole on the map: under the figure unless it would
 * run off the bottom, centred unless it would run off a side. Worked out
 * from where the part is going (not where its glide is) and the label's own
 * size, and again whenever the landscape changes size.
 */
function useLabelSides(
  placement: Placement,
  landscapeRef: RefObject<HTMLElement | null>,
  tagRef: RefObject<HTMLElement | null>,
  /** Whatever changes the label's size (name, actions, rename field). */
  content: string,
): LabelSides {
  const [sides, setSides] = useState<LabelSides>({ x: 'center', y: 'below' })
  const { x, y, scale } = placement

  useLayoutEffect(() => {
    const landscape = landscapeRef.current
    const tag = tagRef.current
    if (!landscape || !tag) return
    const fit = () => {
      const box = landscape.getBoundingClientRect()
      const cx = x * box.width
      const cy = y * box.height
      // The hit area's half-height: --hit on .part, max(scale × 18cqmin, 44px).
      const reach = Math.max((scale * 18 * Math.min(box.width, box.height)) / 100, 44) / 2 + TAG_GAP + tag.offsetHeight
      const roomBelow = box.height - EDGE_ROOM - (cy + reach)
      const roomAbove = cy - reach - EDGE_ROOM
      const half = tag.offsetWidth / 2
      const next: LabelSides = {
        x: cx - half >= EDGE_ROOM && cx + half <= box.width - EDGE_ROOM ? 'center' : cx < box.width / 2 ? 'start' : 'end',
        y: roomBelow >= 0 || roomBelow >= roomAbove ? 'below' : 'above',
      }
      setSides((current) => (current.x === next.x && current.y === next.y ? current : next))
    }
    fit()
    const observer = new ResizeObserver(fit)
    observer.observe(landscape)
    return () => observer.disconnect()
  }, [x, y, scale, landscapeRef, tagRef, content])

  return sides
}

export function PartFigure({
  part,
  placement,
  selected,
  entrance,
  side,
  hintId,
  landscapeRef,
  onSelect,
  onPlace,
  onRename,
  onRemove,
  onGetToKnow,
  onClearWords,
  onDraft,
}: PartFigureProps) {
  // In-progress gesture; the model only sees the committed placement.
  const [draft, setDraftState] = useState<Placement | null>(null)
  const setDraft = (next: Placement | null) => {
    setDraftState(next)
    onDraft?.(next)
  }
  const [renaming, setRenaming] = useState(false)
  const figureRef = useRef<HTMLSpanElement>(null)
  const tagRef = useRef<HTMLDivElement>(null)
  const shown = draft ?? placement
  const hasWords = part.voice !== undefined || part.intent !== undefined
  const label = useLabelSides(
    shown,
    landscapeRef,
    tagRef,
    `${part.name} ${selected} ${renaming} ${part.voice} ${part.intent} ${onGetToKnow !== undefined}`,
  )

  const finish = (value: Placement | null) => {
    setDraft(null)
    if (value) onPlace(value)
    else onSelect()
  }

  const moveDrag = usePointerDrag({
    start: () => ({ from: placement, box: landscapeRef.current!.getBoundingClientRect() }),
    move: ({ from, box }, { dx, dy }) => {
      const next = clampPlacement({ ...from, x: from.x + dx / box.width, y: from.y + dy / box.height })
      setDraft(next)
      return next
    },
    end: finish,
    cancel: () => setDraft(null),
  })

  const resizeDrag = usePointerDrag({
    start: (event) => {
      const rect = figureRef.current!.getBoundingClientRect()
      const cx = rect.left + rect.width / 2
      const cy = rect.top + rect.height / 2
      const distance = Math.max(1, Math.hypot(event.clientX - cx, event.clientY - cy))
      return { from: placement, cx, cy, distance }
    },
    move: ({ from, cx, cy, distance }, { clientX, clientY }) => {
      const ratio = Math.hypot(clientX - cx, clientY - cy) / distance
      const next = clampPlacement({ ...from, scale: from.scale * ratio })
      setDraft(next)
      return next
    },
    end: finish,
    cancel: () => setDraft(null),
  })

  const onKeyDown = (event: KeyboardEvent) => {
    const step = event.shiftKey ? MOVE_STEP_LARGE : MOVE_STEP
    const { x, y, scale } = placement
    const next: Partial<Record<string, Placement>> = {
      ArrowLeft: { x: x - step, y, scale },
      ArrowRight: { x: x + step, y, scale },
      ArrowUp: { x, y: y - step, scale },
      ArrowDown: { x, y: y + step, scale },
      '+': { x, y, scale: scale * SCALE_STEP },
      '=': { x, y, scale: scale * SCALE_STEP },
      '-': { x, y, scale: scale / SCALE_STEP },
      _: { x, y, scale: scale / SCALE_STEP },
    }
    const placementForKey = next[event.key]
    if (!placementForKey) return
    event.preventDefault()
    onPlace(placementForKey)
  }

  const style = {
    left: `${shown.x * 100}%`,
    top: `${shown.y * 100}%`,
    '--scale': shown.scale,
    // Walks in from its side, starting just off the map.
    '--walk-from': `calc(${((side === 'left' ? -0.12 : 1.12) - shown.x) * 100} * 1cqw)`,
    // Larger parts sit underneath so smaller ones stay reachable.
    zIndex: draft ? 1001 : selected ? 1000 : Math.round(500 - shown.scale * 100),
  } as CSSProperties

  return (
    <div
      className={`part${selected ? ' is-selected' : ''}${draft ? ' is-dragging' : ''}${entrance ? ` is-${entrance}` : ''}`}
      style={style}
      data-part={part.id}
      data-look={part.look}
      data-side={side}
      data-label-x={label.x}
      data-label-y={label.y}
    >
      <button
        type="button"
        className="part__body"
        aria-label={copy.partLabel(part.name)}
        aria-describedby={hintId}
        aria-expanded={selected}
        onClick={(event) => {
          // Pointer taps select via the drag gesture; this covers Enter/Space.
          if (event.detail === 0) onSelect()
        }}
        onKeyDown={onKeyDown}
        {...moveDrag}
      >
        <span className="part__figure" ref={figureRef}>
          <Figure look={part.look} />
          <span className="part__ring" />
        </span>
      </button>

      <span className="part__handle" aria-hidden="true" {...resizeDrag} />

      {/* Label and actions stack in one box, so a selected part's full name
          can wrap without running into its actions. */}
      <div className="part__tag" ref={tagRef}>
        <div className="part__label">
          <span className="part__hedge">{copy.hedge}</span>
          {renaming ? (
            <RenameField
              name={part.name}
              onDone={(name) => {
                setRenaming(false)
                if (name !== null) onRename(name)
              }}
            />
          ) : (
            <span className="part__name">{part.name}</span>
          )}
          {/* Its words from Get to know it: theirs, whole, only when selected (the meadow stays sparse). */}
          {selected && hasWords && (
            <span className="part__words">
              {part.voice !== undefined && <span className="part__voice">“{part.voice}”</span>}
              {part.intent !== undefined && (
                <span className="part__intent">
                  <span className="part__intent-label">{copy.intentLabel}</span> {part.intent}
                </span>
              )}
            </span>
          )}
        </div>

        {selected && !renaming && (
          <div className="part__actions">
            {onGetToKnow && (
              // Asking for the card: its field takes focus (see Conversation's Reply).
              <button type="button" data-opens-card onClick={onGetToKnow}>
                {copy.getToKnow}
              </button>
            )}
            <button type="button" onClick={() => setRenaming(true)}>
              {copy.rename}
            </button>
            <button type="button" onClick={onRemove}>
              {copy.remove}
            </button>
            {hasWords && (
              <button type="button" onClick={onClearWords}>
                {copy.clearWords}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function RenameField({ name, onDone }: { name: string; onDone: (name: string | null) => void }) {
  const done = useRef(false)
  const finish = (value: string | null) => {
    if (done.current) return
    done.current = true
    // Closing unchanged (blur or Enter) is not a rename: dispatching it would
    // let the length cap silently shorten a long name.
    onDone(value === null || value.trim() === name.trim() ? null : value)
  }

  return (
    <input
      className="part__rename"
      defaultValue={name}
      aria-label={copy.renameLabel(name)}
      placeholder={copy.renamePlaceholder}
      maxLength={40}
      autoFocus
      onFocus={(event) => event.currentTarget.select()}
      onKeyDown={(event) => {
        if (event.key === 'Enter') finish(event.currentTarget.value)
        if (event.key === 'Escape') {
          event.stopPropagation()
          finish(null)
        }
      }}
      onBlur={(event) => finish(event.currentTarget.value)}
    />
  )
}
