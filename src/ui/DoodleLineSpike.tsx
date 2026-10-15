import { useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { Alignment, EventType, Fit, Layout, useRive, type Event } from '@rive-app/react-canvas'
import plan from '../assets/rive/doodle-line.json'
import { keyedAt } from './sideEntrances'

const src = new URL('../assets/rive/doodle-line.riv', import.meta.url).href

/** How much of the line's slope the figure leans with, and at most (rad). */
const TILT = { share: 0.5, most: 0.2 }
/** Artboard px of line past the resting place, under the figure. */
const TAIL = 30
/** Artboard px between the points the line is drawn through. */
const STEP = 4
/** Screen px across the tile of crayon grain. */
const GRAIN = 48

/**
 * A tile of crayon grain, in the line's colour: mostly wax, with flecks
 * where the paper shows through. Made once; the line is stroked with it.
 */
function crayonGrain(size: number) {
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

/** A hand's wobble, in screen px, `x` screen px along. */
function wobble(x: number) {
  return 0.8 * Math.sin(x / 23) + 0.5 * Math.sin(x / 9.7 + 1.3) + 0.3 * Math.sin(x / 4.3 + 2.1)
}

/**
 * The line's height above the ground (artboard px) `d` before the resting
 * place: it comes down over `descent` from `rise`, wandering in waves that
 * die away as it lands, flat at the end.
 */
function heightAt(d: number) {
  const { rise, descent, amplitude, wavelength } = plan.line
  const ease = (edge: number, x: number) => {
    const t = Math.min(1, Math.max(0, x / edge))
    return t * t * (3 - 2 * t)
  }
  if (d <= 0) return 0
  return rise * ease(descent, d) + amplitude * Math.sin((2 * Math.PI * d) / wavelength) * ease(0.6 * descent, d)
}

/**
 * THROWAWAY REVIEW SPIKE — not product code. Delete this file, its render in
 * `App.tsx`, and the line styles in the `.spike-entrance` block in `app.css`
 * once the entrance has been judged. Hidden by default; append `?doodle` to
 * the URL to see it. Append `?doodlepose=<frame>` to hold that frame of
 * `Enter` in the middle, for screenshots.
 *
 * A dusty-pink crayon line draws itself in from the left edge, high up,
 * wandering down to the ground a little way ahead of Doodle, which rides in
 * sitting on it and tilting a little with it; the line fades once it has
 * landed. Rive plays everything in place (the `Motion` machine loops `Ride`,
 * a sway with the crayon hand scribbling, then plays `Enter` once `arrive`
 * is set, then `Idle`); this component draws the line, reveals it, and
 * carries the canvas along it on Rive's own clock, fitting whole sways to
 * the ride (see art/rive/doodle-line/gen-scene.py).
 */
export function DoodleLineSpike() {
  const reduced = useMemo(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches, [])
  const held = useMemo(() => {
    const frame = new URLSearchParams(window.location.search).get('doodlepose')
    return frame === null ? null : Number(frame) || 0
  }, [])
  const still = reduced || held !== null
  const [run, setRun] = useState(0)
  const traveler = useRef<HTMLDivElement>(null)
  const shadow = useRef<HTMLDivElement>(null)
  const line = useRef<SVGSVGElement>(null)
  const layout = useMemo(() => new Layout({ fit: Fit.Contain, alignment: Alignment.Center }), [])
  const grain = useMemo(() => (still ? '' : crayonGrain(GRAIN)), [still])

  const { rive, RiveComponent } = useRive(
    still
      ? { src, animations: held === null ? 'Idle' : 'Enter', autoplay: held === null, layout }
      : { src, stateMachine: 'Motion', autoplay: false, layout },
    // It starts off screen, where the runtime would stop drawing it.
    { shouldUseIntersectionObserver: false },
  )

  useEffect(() => {
    if (rive && held !== null) rive.scrub('Enter', held / plan.fps)
  }, [rive, held])

  useEffect(() => {
    const box = traveler.current
    const ground = shadow.current
    const svg = line.current
    const crayon = svg?.querySelector('path')
    if (!rive || still || !box || !ground || !svg || !crayon) return
    if (run > 0) rive.reset({ stateMachine: 'Motion', autoplay: false })
    svg.classList.remove('spike-entrance__trail--faded')

    box.style.transform = 'none'
    const rest = box.getBoundingClientRect()
    const scale = rest.width / plan.artboard.width
    // The seat at rest, on screen: the line lands there.
    const seatX = rest.left + plan.seat.x * scale
    const seatY = rest.top + plan.seat.y * scale

    // The line, in artboard px from the seat at rest: it starts where the
    // figure does, far enough off the left edge that it and the line `lead`
    // ahead of it are out of sight, and runs on a little under it.
    const lead = plan.line.lead
    const begin = -(seatX / scale + lead + 40)
    const xs: number[] = []
    for (let x = begin; x < TAIL; x += STEP) xs.push(x)
    xs.push(TAIL)
    const hs = xs.map((x) => heightAt(-x))
    const along = [0]
    for (let i = 1; i < xs.length; i++) along.push(along[i - 1] + Math.hypot(xs[i] - xs[i - 1], hs[i] - hs[i - 1]))
    const total = along[along.length - 1]
    const resting = along[xs.findIndex((x) => x >= 0)]
    crayon.setAttribute(
      'd',
      xs
        .map((x, i) => {
          const screenX = seatX + x * scale
          return `${i ? 'L' : 'M'}${screenX.toFixed(1)},${(seatY - hs[i] * scale + wobble(screenX)).toFixed(1)}`
        })
        .join(''),
    )
    crayon.setAttribute('pathLength', String(total))
    crayon.style.strokeDasharray = `${total} ${total}`

    // Where the seat is, `s` artboard px along the line, and the line's slope there.
    const at = (s: number) => {
      let i = along.findIndex((a) => a > s)
      if (i <= 0) i = i === 0 ? 1 : along.length - 1
      const t = Math.min(1, (s - along[i - 1]) / (along[i] - along[i - 1]))
      return {
        x: xs[i - 1] + (xs[i] - xs[i - 1]) * t,
        h: hs[i - 1] + (hs[i] - hs[i - 1]) * t,
        slope: Math.atan2(hs[i - 1] - hs[i], xs[i] - xs[i - 1]),
      }
    }

    // Whole sways, fitted so the ride and the glide in `Enter` land it exactly.
    const { cycle, enter } = plan
    const glide = enter.travel[enter.travel.length - 1][1]
    const sways = Math.max(1, Math.round(resting / cycle.travel - glide))
    const perSway = resting / (sways + glide)
    const enterAt = sways * cycle.frames
    const fadeAt = enterAt + enter.frames

    const arrive = rive.stateMachineInputs('Motion')?.find((input) => input.name === 'arrive')
    if (arrive) arrive.value = false

    let elapsed = 0
    let faded = false
    const place = () => {
      const frame = elapsed * plan.fps
      // Any time in the last sway: the machine finishes it, then enters.
      if (arrive && !arrive.value && frame >= enterAt - cycle.frames) arrive.value = true
      const done = frame < enterAt ? frame / cycle.frames : sways + keyedAt(enter.travel, frame - enterAt)[0]
      const s = Math.min(resting, done * perSway)
      const { x, h, slope } = at(s)
      const tilt = Math.max(-TILT.most, Math.min(TILT.most, slope * TILT.share))
      box.style.transform = `translate(${x * scale}px, ${-h * scale}px) rotate(${tilt}rad)`
      // On the ground under it, fainter and smaller the higher it rides.
      const height = Math.min(1, h / plan.line.rise)
      ground.style.transform = `translateX(${x * scale}px) scale(${1 - 0.35 * height})`
      ground.style.opacity = String(1 - 0.7 * height)
      crayon.style.strokeDashoffset = String(total - Math.min(total, s + lead))
      if (!faded && frame >= fadeAt) {
        faded = true
        svg.classList.add('spike-entrance__trail--faded')
      }
    }
    const onAdvance = (event: Event) => {
      elapsed += event.data as number
      place()
    }

    place()
    rive.on(EventType.Advance, onAdvance)
    rive.play('Motion')
    return () => rive.off(EventType.Advance, onAdvance)
  }, [rive, still, run])

  const geometry = {
    '--board-w': plan.artboard.width,
    '--board-h': plan.artboard.height,
    '--box': plan.figureBox.size,
    '--box-cx': plan.figureBox.x + plan.figureBox.size / 2,
    '--box-cy': plan.figureBox.y + plan.figureBox.size / 2,
    '--feet-y': plan.feetY,
    '--shadow-x': plan.shadow.x,
    '--shadow-w': plan.shadow.w,
  } as CSSProperties
  // The page tilts the canvas about the seat.
  const seat = { transformOrigin: `${(plan.seat.x / plan.artboard.width) * 100}% ${(plan.seat.y / plan.artboard.height) * 100}%` }

  return (
    <div className={`spike-entrance${still ? '' : ' spike-entrance--from-left'}`} style={geometry}>
      <div ref={shadow} className="spike-entrance__shadow" />
      {!still && (
        <svg ref={line} className="spike-entrance__trail" aria-hidden="true">
          <defs>
            {/* Fixed to the screen, like the paper's tooth: the line is revealed over it. */}
            <pattern id="spike-crayon" patternUnits="userSpaceOnUse" width={GRAIN} height={GRAIN}>
              <image href={grain} width={GRAIN} height={GRAIN} />
            </pattern>
          </defs>
          <path className="spike-entrance__crayon" />
        </svg>
      )}
      <div ref={traveler} className="spike-entrance__traveler" style={seat}>
        <RiveComponent className="spike-entrance__canvas" />
      </div>
      {!still && (
        <button type="button" className="spike-entrance__replay" onClick={() => setRun((current) => current + 1)}>
          replay entrance
        </button>
      )}
    </div>
  )
}
