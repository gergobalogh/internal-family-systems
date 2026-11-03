import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { CSSProperties, KeyboardEvent, RefObject } from 'react'
import type { RiveFile } from '@rive-app/react-canvas'
import { SCALE_MAX, SCALE_MIN, clampPlacement } from '../model/landscape'
import type { Look, Part, Placement } from '../model/types'
import { copy } from './copy'
import { Figure, FigureThumb } from './Figure'
import { RiveEntrance } from './RiveEntrance'
import { entersOnRive, riveEntranceOf } from './riveEntrances'
import { usePointerDrag } from './usePointerDrag'

/** The edge a part walks in from. A part from the right is mirrored, so it faces the way it walks. */
export type Side = 'left' | 'right'

interface PartFigureProps {
  part: Part
  placement: Placement
  selected: boolean
  /** In "What if…" the part can be moved and resized, but who it is (name, presence, words) changes only in "How it is". */
  whatIf: boolean
  /** A new part coming in from its side, from the moment it's named until it stands on its spot. */
  entering: boolean
  /** A Rive entrance stands on its spot (a CSS walk-in ends on the landscape's timer). */
  onArrived: () => void
  /** Its figure's Rive entrance, loaded ahead, if there is one and it has loaded. */
  riveFile?: RiveFile
  side: Side
  hintId: string
  landscapeRef: RefObject<HTMLElement | null>
  onSelect: () => void
  onPlace: (placement: Placement) => void
  onRename: (name: string) => void
  /** Figures no part has: what Change figure offers. */
  freeLooks: readonly Look[]
  onChangeLook: (look: Look) => void
  onRemove: () => void
  /** Get to know it; absent while the guide can't ask (mid-conversation, a card waiting, a pause). */
  onGetToKnow?: () => void
  onClearWords: () => void
  /** The in-progress gesture, so things drawn between parts can follow it. */
  onDraft?: (placement: Placement | null) => void
  /** Offered at Act 2's first question: a tap chooses it (see Landscape). */
  offered?: boolean
  /** The part being sat with: the camera is on it, and the others soften. */
  focused?: boolean
  /** Thanked: it glows. */
  thanked?: boolean
  /** Named by Act 3's "what if": a soft ring, so it's clear which one. */
  marked?: boolean
}

const MOVE_STEP = 0.02
const MOVE_STEP_LARGE = 0.08
const SCALE_STEP = 1.12

/** How long a Rive entrance's last frame and the still figure overlap (the fade in app.css). */
const HANDOVER_MS = 500

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
  whatIf,
  entering,
  onArrived,
  riveFile,
  side,
  hintId,
  landscapeRef,
  onSelect,
  onPlace,
  onRename,
  freeLooks,
  onChangeLook,
  onRemove,
  onGetToKnow,
  onClearWords,
  onDraft,
  offered = false,
  focused = false,
  thanked = false,
  marked = false,
}: PartFigureProps) {
  // In-progress gesture; the model only sees the committed placement.
  const [draft, setDraftState] = useState<Placement | null>(null)
  const setDraft = (next: Placement | null) => {
    setDraftState(next)
    onDraft?.(next)
  }
  const [renaming, setRenaming] = useState(false)
  const [choosing, setChoosing] = useState(false)
  // Deselecting closes the figure choices, so they don't come back on the next select.
  if (!selected && choosing) setChoosing(false)
  const figureRef = useRef<HTMLSpanElement>(null)
  const tagRef = useRef<HTMLDivElement>(null)
  const shown = draft ?? placement
  const riveEntrance = entersOnRive(part.look) ? riveEntranceOf(part.look) : undefined
  // A Rive entrance plays from the moment the part is named until it has
  // settled, a little after it stands on its spot (when the next card can
  // come). Then it hands over to the still figure by fading it in over the
  // last frame: the scene's cut of the figure differs slightly from the map's.
  const [playing, setPlaying] = useState(entering && riveEntrance !== undefined)
  const [wasEntering, setWasEntering] = useState(entering)
  if (entering !== wasEntering) {
    setWasEntering(entering)
    if (entering && riveEntrance) setPlaying(true)
  }
  // Changed to a figure without one: it simply stands there.
  if (playing && !riveEntrance) setPlaying(false)
  const [handingOver, setHandingOver] = useState(false)
  const settled = useCallback(() => {
    setPlaying(false)
    setHandingOver(true)
  }, [])
  useEffect(() => {
    if (!handingOver) return
    const timer = setTimeout(() => setHandingOver(false), HANDOVER_MS)
    return () => clearTimeout(timer)
  }, [handingOver])
  // A Rive entrance moves only the figure, so the part takes neither of the CSS walk-in's classes.
  const entrance = handingOver ? ' is-handing-over' : !entering ? '' : playing ? ' is-entering' : ' is-walking'
  const hasWords = part.voice !== undefined || part.intent !== undefined
  const label = useLabelSides(
    shown,
    landscapeRef,
    tagRef,
    `${part.name} ${selected} ${renaming} ${choosing} ${part.voice} ${part.intent} ${onGetToKnow !== undefined} ${whatIf}`,
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
      className={`part${selected ? ' is-selected' : ''}${draft ? ' is-dragging' : ''}${entrance}${offered ? ' is-offered' : ''}${focused ? ' is-focus' : ''}${thanked ? ' is-thanked' : ''}${marked ? ' is-marked' : ''}`}
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
        aria-label={offered ? copy.offeredLabel(part.name) : copy.partLabel(part.name)}
        aria-describedby={hintId}
        aria-expanded={selected}
        // Chosen at Act 2, the next card's field may take focus (see Conversation's Reply).
        data-opens-card={offered ? '' : undefined}
        onClick={(event) => {
          // Pointer taps select via the drag gesture; this covers Enter/Space.
          if (event.detail === 0) onSelect()
        }}
        onKeyDown={onKeyDown}
        {...moveDrag}
      >
        <span className="part__figure" ref={figureRef}>
          {(playing || handingOver) && riveEntrance && (
            <RiveEntrance
              // A new figure mid-entrance is a new entrance.
              key={part.look}
              entrance={riveEntrance}
              riveFile={riveFile}
              edge={side === 'left' ? shown.x : 1 - shown.x}
              landscapeRef={landscapeRef}
              onArrived={onArrived}
              onDone={settled}
            />
          )}
          {!playing && <Figure look={part.look} />}
          <span className="part__ring" />
        </span>
      </button>

      <span className="part__handle" aria-hidden="true" {...resizeDrag} />

      {/* Label and actions stack in one box, so a selected part's full name
          can wrap without running into its actions. */}
      <div className="part__tag" ref={tagRef}>
        <div className="part__label">
          <span className="part__hedge">{copy.hedge}</span>
          {renaming && !whatIf ? (
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

        {selected && !renaming && choosing && !whatIf && (
          <div className="part__figures" role="group" aria-label={copy.figureChoices(part.name)}>
            {freeLooks.map((look, index) => (
              <button
                key={look}
                type="button"
                className="part__figure-choice"
                aria-label={copy.figureLabels[look]}
                autoFocus={index === 0}
                onClick={() => {
                  setChoosing(false)
                  onChangeLook(look)
                }}
              >
                <FigureThumb look={look} />
              </button>
            ))}
            <div className="part__actions">
              <button type="button" onClick={() => setChoosing(false)}>
                {copy.keepFigure}
              </button>
            </div>
          </div>
        )}

        {selected && !renaming && !(choosing && !whatIf) && (
          <div className="part__actions" role="group" aria-label={copy.sizeLabel(part.name)}>
            <button
              type="button"
              disabled={placement.scale <= SCALE_MIN}
              onClick={() => onPlace({ ...placement, scale: placement.scale / SCALE_STEP })}
            >
              {copy.smaller}
            </button>
            <button
              type="button"
              disabled={placement.scale >= SCALE_MAX}
              onClick={() => onPlace({ ...placement, scale: placement.scale * SCALE_STEP })}
            >
              {copy.larger}
            </button>
          </div>
        )}

        {selected && !renaming && !(choosing && !whatIf) && (
          <div className="part__actions">
            {onGetToKnow && (
              // Asking for the card: its field takes focus (see Conversation's Reply).
              <button type="button" data-opens-card onClick={onGetToKnow}>
                {copy.getToKnow}
              </button>
            )}
            {whatIf ? (
              <span className="part__elsewhere">{copy.changeInHowItIs}</span>
            ) : (
              <>
                <button type="button" onClick={() => setRenaming(true)}>
                  {copy.rename}
                </button>
                {freeLooks.length > 0 && (
                  <button type="button" onClick={() => setChoosing(true)}>
                    {copy.changeFigure}
                  </button>
                )}
                <button type="button" onClick={onRemove}>
                  {copy.remove}
                </button>
                {hasWords && (
                  <button type="button" onClick={onClearWords}>
                    {copy.clearWords}
                  </button>
                )}
              </>
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
