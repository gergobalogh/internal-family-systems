import { useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { Alignment, EventType, Fit, Layout, useRive, type Event } from '@rive-app/react-canvas'
import plan from '../assets/rive/map-route.json'
import { keyedAt } from './sideEntrances'

const src = new URL('../assets/rive/map-route.riv', import.meta.url).href

/**
 * THROWAWAY REVIEW SPIKE — not product code. Delete this file, its render in
 * `App.tsx`, and the trail styles in the `.spike-entrance` block in `app.css`
 * once the entrance has been judged. Hidden by default; append `?map` to the
 * URL to see it. Append `?mappose=<frame>` to hold that frame of `Check`
 * (0..150) in the middle, for screenshots.
 *
 * Map walks a planned route: a straight leg in from the left, further back
 * than where it stops, a stop at the corner to check the map, and a second
 * leg slanting forward to its place, with a running stitch behind it that
 * fades once it arrives. Rive rocks it along in place (the `Motion` machine
 * loops `Approach`, plays `Check` once `check` is set and `Enter` once
 * `arrive` is); this component moves the canvas along the route, fitting
 * whole rocks to each leg, and reads the travel from the plan on Rive's own
 * clock (see art/rive/map-route/gen-scene.py).
 */
export function MapRouteSpike() {
  const reduced = useMemo(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches, [])
  const held = useMemo(() => {
    const frame = new URLSearchParams(window.location.search).get('mappose')
    return frame === null ? null : Number(frame) || 0
  }, [])
  const still = reduced || held !== null
  const [run, setRun] = useState(0)
  const traveler = useRef<HTMLDivElement>(null)
  const shadow = useRef<HTMLDivElement>(null)
  const trail = useRef<SVGSVGElement>(null)
  const layout = useMemo(() => new Layout({ fit: Fit.Contain, alignment: Alignment.Center }), [])

  const { rive, RiveComponent } = useRive(
    still
      ? { src, animations: held === null ? 'Idle' : 'Check', autoplay: held === null, layout }
      : { src, stateMachine: 'Motion', autoplay: false, layout },
    // It starts off screen, where the runtime would stop drawing it.
    { shouldUseIntersectionObserver: false },
  )

  useEffect(() => {
    if (rive && held !== null) rive.scrub('Check', held / plan.fps)
  }, [rive, held])

  useEffect(() => {
    const box = traveler.current
    const ground = shadow.current
    const stitches = trail.current
    if (!rive || still || !box || !ground || !stitches) return
    if (run > 0) rive.reset({ stateMachine: 'Motion', autoplay: false })
    const paths = stitches.querySelectorAll('path')
    paths.forEach((path) => path.setAttribute('d', ''))
    stitches.classList.remove('spike-entrance__trail--faded')

    box.style.transform = 'none'
    const rest = box.getBoundingClientRect()
    const scale = rest.width / plan.artboard.width
    // The feet at rest, on screen: the trail runs up to them.
    const feetX = rest.left + plan.feet.x * scale
    const feetY = rest.top + plan.feet.y * scale

    // Artboard px across, from fully off the left edge to the resting place;
    // the corner is the last leg's share of that before it, and `rise` back.
    const across = rest.left / scale + plan.content.right
    const { rise, lastLeg } = plan.route
    const lastAcross = across * lastLeg
    const first = across - lastAcross
    const second = Math.hypot(lastAcross, rise)

    // Whole rocks on each leg, fitted so they land it exactly. `Check` stops
    // `corner` rocks' travel on (at the corner) and goes the rest of its
    // travel into the second leg; `Enter` stops its travel on.
    const { cycle, check, enter } = plan
    const checkTravel = check.travel[check.travel.length - 1][1]
    const enterTravel = enter.travel[enter.travel.length - 1][1]
    const pastCorner = checkTravel - check.corner
    const firstRocks = Math.max(1, Math.round(first / cycle.travel - check.corner))
    const firstPer = first / (firstRocks + check.corner)
    const secondRocks = Math.max(1, Math.round(second / cycle.travel - pastCorner - enterTravel))
    const secondPer = second / (pastCorner + secondRocks + enterTravel)
    const checkAt = firstRocks * cycle.frames
    const secondAt = checkAt + check.frames
    const enterAt = secondAt + secondRocks * cycle.frames
    const fadeAt = enterAt + enter.frames

    const inputs = rive.stateMachineInputs('Motion') ?? []
    const checking = inputs.find((input) => input.name === 'check')
    const arrive = inputs.find((input) => input.name === 'arrive')
    if (checking) checking.value = false
    if (arrive) arrive.value = false

    const rocks = (frame: number) => {
      const done = Math.floor(frame / cycle.frames)
      const [part] = keyedAt(cycle.profile, frame - done * cycle.frames)
      return done + part
    }
    // [leg, artboard px along it] at `frame`.
    const along = (frame: number): [number, number] => {
      if (frame < checkAt) return [1, rocks(frame) * firstPer]
      if (frame < secondAt) {
        const [t] = keyedAt(check.travel, frame - checkAt)
        return t <= check.corner ? [1, (firstRocks + t) * firstPer] : [2, (t - check.corner) * secondPer]
      }
      if (frame < enterAt) return [2, (pastCorner + rocks(frame - secondAt)) * secondPer]
      const [t] = keyedAt(enter.travel, frame - enterAt)
      return [2, (pastCorner + secondRocks + t) * secondPer]
    }

    const start = `M${feetX - across * scale},${feetY - rise * scale}`
    const corner = `L${feetX - lastAcross * scale},${feetY - rise * scale}`
    let elapsed = 0
    let faded = false
    const place = () => {
      const frame = elapsed * plan.fps
      // Any time in a leg's last rock: the machine finishes the rock, then
      // stops. `check` is cleared again well before `Check` hands back.
      if (checking) checking.value = frame >= checkAt - cycle.frames && frame < checkAt + check.frames / 2
      if (arrive && !arrive.value && frame >= enterAt - cycle.frames) arrive.value = true
      const [leg, s] = along(frame)
      const x = leg === 1 ? s - across : -lastAcross * (1 - s / second)
      const y = leg === 1 ? -rise : -rise * (1 - s / second)
      const offset = `translate(${x * scale}px, ${y * scale}px)`
      box.style.transform = offset
      ground.style.transform = offset
      const to = `L${feetX + x * scale},${feetY + y * scale}`
      paths.forEach((path) => path.setAttribute('d', leg === 1 ? start + to : start + corner + to))
      if (!faded && frame >= fadeAt) {
        faded = true
        stitches.classList.add('spike-entrance__trail--faded')
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

  return (
    <div className={`spike-entrance${still ? '' : ' spike-entrance--from-left'}`} style={geometry}>
      <svg ref={trail} className="spike-entrance__trail" aria-hidden="true">
        <path className="spike-entrance__stitches spike-entrance__stitches--shade" />
        <path className="spike-entrance__stitches" />
      </svg>
      <div ref={shadow} className="spike-entrance__shadow" />
      <div ref={traveler} className="spike-entrance__traveler">
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
