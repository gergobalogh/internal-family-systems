import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'
import type { CSSProperties, RefObject } from 'react'
import { Alignment, EventType, Fit, Layout, useRive, type Event, type RiveFile } from '@rive-app/react-canvas'
import { SCALED_ABOUT, type Point, type RiveEntrance as Entrance } from './riveEntrances'

const FADE_IN_MS = 600
/** An entrance that hasn't finished this long after its longest (the scene never loaded) gives way to the still figure. */
const GIVE_UP_AFTER_MS = 3000
/** Screen px across one tile of Doodle's crayon grain. */
const CRAYON_GRAIN = 48

/** A tile of dusty-pink wax with flecks where the paper shows through. */
function crayonGrain(size: number) {
  if (typeof document === 'undefined') return ''
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = size
  const context = canvas.getContext('2d')
  if (!context) return ''
  const image = context.createImageData(size, size)
  for (let i = 0; i < size * size; i++) {
    image.data.set([201, 138, 147, Math.random() < 0.16 ? 70 : 190 + 65 * Math.random()], i * 4)
  }
  context.putImageData(image, 0, 0)
  return canvas.toDataURL()
}

/** A hand-drawn wobble, in screen px, `x` screen px along. */
function wobble(x: number) {
  return 0.8 * Math.sin(x / 23) + 0.5 * Math.sin(x / 9.7 + 1.3) + 0.3 * Math.sin(x / 4.3 + 2.1)
}

interface RiveEntranceProps {
  entrance: Entrance
  /** The scene, loaded ahead (useRiveEntranceFiles); without it, the entrance loads its own. */
  riveFile?: RiveFile
  /** From the part's centre to its side's edge, as a fraction of the landscape's width. */
  edge: number
  landscapeRef: RefObject<HTMLElement | null>
  /** It stands on its spot; it may still be settling. */
  onArrived: () => void
  /** It has settled: the still figure can take over. */
  onDone: () => void
}

/**
 * A part's Rive entrance: the scene plays in place (the `Motion` machine),
 * while its route moves the whole canvas across or down the map, or leaves
 * it on the spot for the Sprout's rise. The route is read off Rive's own
 * clock and may also draw a trail or drive the ground shadow. It sits in the part's figure box,
 * the scene's tile laid over the still figure, so a part from the right
 * (mirrored) comes in from the right; the Kaleidoscope backs in from its
 * far edge, on either side. It starts as soon as the scene has loaded: the
 * part is named, and comes in while the guide is still thinking.
 */
export function RiveEntrance({ entrance, riveFile, edge, landscapeRef, onArrived, onDone }: RiveEntranceProps) {
  const traveler = useRef<HTMLSpanElement>(null)
  const shadow = useRef<HTMLSpanElement>(null)
  const trail = useRef<SVGSVGElement>(null)
  const crayonId = `figure-crayon-${useId().replaceAll(':', '')}`
  const grain = useMemo(() => (entrance.trail === 'crayon' ? crayonGrain(CRAYON_GRAIN) : ''), [entrance.trail])
  // Read when the entrance starts, never restarting it.
  const latest = useRef({ edge, onArrived, onDone })
  useEffect(() => {
    latest.current = { edge, onArrived, onDone }
  })
  const layout = useMemo(() => new Layout({ fit: Fit.Contain, alignment: Alignment.Center }), [])
  // Whichever source it starts with, it keeps: switching would start it over.
  const [source] = useState(() => (riveFile ? { riveFile } : { src: entrance.src }))
  // Giving way at once: arrived and done.
  const finish = useCallback(() => {
    latest.current.onArrived()
    latest.current.onDone()
  }, [])

  const { rive, RiveComponent } = useRive(
    {
      ...source,
      stateMachine: 'Motion',
      autoplay: false,
      layout,
      onLoadError: finish,
    },
    // It starts off the map, and by default the runtime stops drawing a
    // canvas that is out of view -- which would stop the motion that brings
    // it into view.
    { shouldUseIntersectionObserver: false },
  )

  useEffect(() => {
    const giveUp = setTimeout(finish, entrance.longestMs + GIVE_UP_AFTER_MS)
    return () => clearTimeout(giveUp)
  }, [entrance, finish])

  useEffect(() => {
    const box = traveler.current
    const landscape = landscapeRef.current
    if (!rive || !box || !landscape) return
    const { board, scale, reach, fps, from } = entrance
    // Screen px per artboard px, and the box's own px per tile px.
    const tilePx = () => box.offsetWidth / board.tile.size
    const px = () => tilePx() * scale
    // An artboard point at rest, in the box's px: the tile on the box, scaled
    // like the map's figure about the middle of its ground line.
    const about = { x: board.tile.size * SCALED_ABOUT.x, y: board.tile.size * SCALED_ABOUT.y }
    const inBox = (point: Point) => ({
      x: (about.x + (point.x - board.tile.x - about.x) * scale) * tilePx(),
      y: (about.y + (point.y - board.tile.y - about.y) * scale) * tilePx(),
    })
    const feet = entrance.feet ?? { x: board.tile.x + about.x, y: board.tile.y + about.y }
    const anchor = inBox(feet)
    box.style.transformOrigin = `${anchor.x}px ${anchor.y}px`
    // From the figure fully off the edge to its spot: the part's centre (the
    // middle of the tile, which the scaling keeps in place) to the edge, plus
    // the figure's leading reach beyond it. One that backs in from the right
    // comes from the far edge instead. And from its feet up to the top of the map.
    const map = landscape.getBoundingClientRect()
    const edge = from === 'right' ? 1 - latest.current.edge : latest.current.edge
    const offstage = from === 'right' ? board.tile.x + about.x - reach : reach - (board.tile.x + about.x)
    const anchorOffset = feet.x - board.tile.x - about.x
    const route = entrance.route({
      across: (edge * map.width) / px() + offstage,
      toEdge: (edge * map.width) / px() + (from === 'right' ? -anchorOffset : anchorOffset),
      up: (box.getBoundingClientRect().top + inBox(feet).y - map.top) / px(),
    })
    const inputs = rive.stateMachineInputs('Motion') ?? []
    const needed = Object.keys(route.inputs?.(0) ?? {})
    // A scene without the inputs its route plays would never arrive.
    if (needed.some((name) => !inputs.some((input) => input.name === name))) {
      finish()
      return
    }

    // The trail runs up to the feet, in the box's px.
    const stitches =
      entrance.trail === 'stitches' && trail.current
        ? [...trail.current.querySelectorAll<SVGPathElement>('.figure-trail__stitches')]
        : []
    const crayon =
      entrance.trail === 'crayon'
        ? trail.current?.querySelector<SVGPathElement>('.figure-trail__crayon')
        : undefined
    const pointAt = (offset: Point) => {
      const at = inBox(feet)
      return { x: at.x + offset.x * px(), y: at.y + offset.y * px() }
    }
    if (route.trail && crayon && route.trail.length !== undefined) {
      const d = route.trail
        .path(0)
        .map((point, i) => {
          const at = pointAt(point)
          return `${i ? 'L' : 'M'}${at.x.toFixed(1)},${(at.y + wobble(at.x)).toFixed(1)}`
        })
        .join('')
      crayon.setAttribute('d', d)
      crayon.setAttribute('pathLength', String(route.trail.length))
      crayon.style.strokeDasharray = `${route.trail.length} ${route.trail.length}`
    }

    let elapsed = 0
    let arrived = false
    let done = false
    const place = () => {
      const frame = elapsed * fps
      const { x, y, rotation = 0 } = route.at(frame)
      const opacity = route.fades ? Math.min(1, (elapsed * 1000) / FADE_IN_MS) : 1
      box.style.transform = `translate(${x * px()}px, ${y * px()}px) rotate(${rotation}rad)`
      box.style.opacity = String(opacity)
      // The shadow is under its feet, waits on the ground, or changes shape
      // with an entrance that happens in place (the Sprout's mound).
      const ground = route.ground?.(frame) ?? { at: { x, y }, opacity: 1, scale: 1 }
      if (shadow.current) {
        shadow.current.style.transform = `translate(${ground.at.x * px()}px, ${ground.at.y * px()}px)`
        shadow.current.style.opacity = String(opacity * ground.opacity)
        shadow.current.style.scale = ground.scaleY === undefined ? String(ground.scale) : `${ground.scale} ${ground.scaleY}`
      }
      if (route.trail && trail.current) {
        const d =
          stitches.length > 0
            ? 'M' +
              route.trail
                .path(frame)
                .map((point) => {
                  const at = pointAt(point)
                  return `${at.x},${at.y}`
                })
                .join('L')
            : ''
        stitches.forEach((path) => {
          path.setAttribute('d', d)
          path.style.opacity = String(opacity)
        })
        if (crayon && route.trail.length !== undefined && route.trail.reveal) {
          crayon.style.strokeDashoffset = String(route.trail.length - route.trail.reveal(frame))
          crayon.style.opacity = String(0.9 * opacity)
        }
        trail.current.classList.toggle('is-faded', frame >= route.trail.fadeAt)
      }
    }
    const onAdvance = (event: Event) => {
      elapsed += event.data as number
      const frame = elapsed * fps
      const values = route.inputs?.(frame) ?? {}
      for (const input of inputs) if (input.name in values) input.value = values[input.name]
      place()
      if (!arrived && frame >= route.arrived) {
        arrived = true
        latest.current.onArrived()
      }
      if (!done && frame >= route.end) {
        done = true
        latest.current.onDone()
      }
    }

    const values = route.inputs?.(0) ?? {}
    for (const input of inputs) if (input.name in values) input.value = values[input.name]
    place()
    // Started on a frame: `play` times its first frame by the last one the
    // page drew, and setting up the scene can keep the page from drawing for
    // a while (0.7 s for Shell's in headless Chrome), which the entrance
    // would otherwise skip at once.
    const start = requestAnimationFrame(() => {
      rive.on(EventType.Advance, onAdvance)
      rive.play('Motion')
    })
    return () => {
      cancelAnimationFrame(start)
      rive.off(EventType.Advance, onAdvance)
    }
  }, [rive, entrance, landscapeRef, finish])

  // The artboard over the figure box, the tile on the box, scaled like the map's figure.
  const { board, scale } = entrance
  const { tile } = board
  const boardStyle = {
    left: `${(-tile.x / tile.size) * 100}%`,
    top: `${(-tile.y / tile.size) * 100}%`,
    width: `${(board.width / tile.size) * 100}%`,
    height: `${(board.height / tile.size) * 100}%`,
    transformOrigin: `${((tile.x + tile.size * SCALED_ABOUT.x) / board.width) * 100}% ${((tile.y + tile.size * SCALED_ABOUT.y) / board.height) * 100}%`,
    scale: String(scale),
  } as CSSProperties

  return (
    <>
      {entrance.trail === 'stitches' && (
        <svg ref={trail} className="figure-trail" aria-hidden="true">
          <path className="figure-trail__stitches figure-trail__stitches--shade" />
          <path className="figure-trail__stitches" />
        </svg>
      )}
      {entrance.trail === 'crayon' && (
        <svg ref={trail} className="figure-trail" aria-hidden="true">
          <defs>
            <pattern id={crayonId} patternUnits="userSpaceOnUse" width={CRAYON_GRAIN} height={CRAYON_GRAIN}>
              <image href={grain} width={CRAYON_GRAIN} height={CRAYON_GRAIN} />
            </pattern>
          </defs>
          <path className="figure-trail__crayon" style={{ stroke: `url(#${crayonId})` }} />
        </svg>
      )}
      <span ref={shadow} className="figure__shadow figure-walk__shadow" />
      <span ref={traveler} className="figure-walk">
        <span className="figure-walk__board" style={boardStyle}>
          <RiveComponent className="figure-walk__canvas" />
        </span>
      </span>
    </>
  )
}
