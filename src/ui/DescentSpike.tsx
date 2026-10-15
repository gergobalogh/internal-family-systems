import { useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { Alignment, EventType, Fit, Layout, useRive, type Event } from '@rive-app/react-canvas'
import { descents, type Descent, type DescentName, type Motion, type Plan } from './descents'

interface Pace {
  cycles: number
  /** Artboard px a frame when the descent starts, and at the end of the last cycle. */
  start: number
  speed: number
}

/**
 * Artboard px the canvas has come down `frame` frames into a descent of
 * `cycles` cycles, its speed changing evenly from `start` to `speed` px a
 * frame over them (a drift keeps one speed; a fall speeds up). Through the
 * flare the speed eases (smoothstep) to the touchdown speed, and on touchdown
 * it stops dead: Rive's `Land` takes the rest.
 */
function descended(plan: Plan, frame: number, { cycles, start, speed }: Pace) {
  const swinging = cycles * plan.cycleFrames
  const f = Math.min(frame, swinging)
  const travelled = start * f + ((speed - start) * f * f) / (2 * swinging)
  const flare = plan.flareFrames
  if (frame <= swinging || flare === 0) return travelled
  const t = Math.min(frame - swinging, flare)
  const s = t / flare
  const touchdown = plan.touchdownSpeed
  return travelled + touchdown * t + (speed - touchdown) * flare * (s - s ** 3 + s ** 4 / 2)
}

/**
 * Whole cycles, and speeds, that bring the canvas down exactly `total`
 * artboard px. `target` is the drift speed aimed for, in artboard px a frame.
 */
function fit(plan: Plan, motion: Motion, total: number, target: number): Pace {
  const flare = plan.flareFrames
  const touchdown = plan.touchdownSpeed
  const cycle = plan.cycleFrames
  if ('fall' in motion) {
    // Over n cycles the mean speed is (start + touchdown) / 2.
    let cycles = Math.max(1, Math.round((2 * total) / ((1 + motion.fall) * touchdown) / cycle))
    while (cycles > 1 && (2 * total) / (cycles * cycle) < touchdown) cycles -= 1
    return { cycles, start: (2 * total) / (cycles * cycle) - touchdown, speed: touchdown }
  }
  const cycles = Math.max(1, Math.round((total / target - flare / 2) / cycle))
  const speed = (total - (touchdown * flare) / 2) / (cycles * cycle + flare / 2)
  return { cycles, start: speed, speed }
}

/**
 * THROWAWAY REVIEW SPIKE — not product code. Delete this file, its render in
 * `App.tsx`, and its `.spike-entrance` block in `app.css` once the descents
 * have been judged. Hidden by default; append `?parachute` or `?sleeper` to
 * the URL to see one (`?pod` drops the Pod). Append `?parachutepose=<frame>`
 * (or `sleeperpose`) to skip the descent and hold the figure in the middle on
 * that frame of the swing (0..cycleFrames), for screenshots; `?podpose`
 * holds a frame of its landing instead.
 *
 * The figure comes down from above the top edge and lands in the middle.
 * Rive owns everything in place (the `Motion` machine swings until `land` is
 * set, then flares, touches down and settles); this component owns the
 * descent. It fits the speed so the drop takes whole swings (or, for a fall,
 * whole cycles while it speeds up to the touchdown speed), sets `land` in the
 * last one, and reads the travel off Rive's own clock, so the figure meets
 * the ground on the frame its landing begins.
 */
export function DescentSpike({ name }: { name: DescentName }) {
  const { src, plan, motion, pose }: Descent = descents[name]
  const reduced = useMemo(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches, [])
  const held = useMemo(() => {
    const frame = new URLSearchParams(window.location.search).get(`${name}pose`)
    return frame === null ? null : Number(frame) || 0
  }, [name])
  const still = reduced || held !== null
  const [run, setRun] = useState(0)
  const traveler = useRef<HTMLDivElement>(null)
  const shadow = useRef<HTMLDivElement>(null)
  const layout = useMemo(() => new Layout({ fit: Fit.Contain, alignment: Alignment.Center }), [])

  const { rive, RiveComponent } = useRive(
    still
      ? { src, animations: held === null ? 'Idle' : pose, autoplay: held === null, layout }
      : { src, stateMachine: 'Motion', autoplay: false, layout },
    // The descent starts off screen, and by default the runtime stops drawing
    // a canvas that is out of view -- which would stop the swing that brings
    // it into view.
    { shouldUseIntersectionObserver: false },
  )

  useEffect(() => {
    if (rive && held !== null) rive.scrub(pose, held / plan.fps)
  }, [rive, held, plan, pose])

  useEffect(() => {
    const box = traveler.current
    const ground = shadow.current
    if (!rive || still || !box || !ground) return
    if (run > 0) rive.reset({ stateMachine: 'Motion', autoplay: false })

    const land = rive.stateMachineInputs('Motion')?.find((input) => input.name === 'land')
    if (!land) return
    land.value = false

    const scale = () => box.offsetWidth / plan.artboard.width
    const boxCentreY = plan.figureBox.y + plan.figureBox.size / 2
    // Start with the feet just above the top edge; everything else is above them.
    const feetAtRest = window.innerHeight / 2 + (plan.feetY - boxCentreY) * scale()
    const total = (feetAtRest + 4) / scale()
    const target = 'drift' in motion ? motion.drift / plan.fps / scale() : 0
    const descent = fit(plan, motion, total, target)
    const { cycles } = descent

    let elapsed = 0
    const place = () => {
      const travelled = descended(plan, elapsed * plan.fps, descent)
      box.style.transform = `translateY(${(travelled - total) * scale()}px)`
      // The shadow gathers on the ground as the feet come down to it.
      const near = Math.max(0, 1 - ((total - travelled) * scale()) / (box.offsetWidth * 0.7))
      ground.style.opacity = String(near ** 1.5)
      ground.style.scale = String(0.45 + 0.55 * near)
    }
    const onAdvance = (event: Event) => {
      elapsed += event.data as number
      // Any time in the last swing: the machine finishes that swing, then lands.
      if (!land.value && elapsed * plan.fps >= (cycles - 1) * plan.cycleFrames) land.value = true
      place()
    }

    place()
    rive.on(EventType.Advance, onAdvance)
    rive.play('Motion')
    return () => rive.off(EventType.Advance, onAdvance)
  }, [rive, still, run, plan, motion])

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
    <div className="spike-entrance" style={geometry}>
      <div ref={shadow} className="spike-entrance__shadow" style={still ? undefined : { opacity: 0 }} />
      <div
        ref={traveler}
        className={still ? 'spike-entrance__traveler' : 'spike-entrance__traveler spike-entrance__traveler--entering'}
      >
        <RiveComponent className="spike-entrance__canvas" />
      </div>
      {!still && (
        <button type="button" className="spike-entrance__replay" onClick={() => setRun((current) => current + 1)}>
          replay descent
        </button>
      )}
    </div>
  )
}
