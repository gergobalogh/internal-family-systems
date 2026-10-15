import { useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { Alignment, EventType, Fit, Layout, useRive, type Event } from '@rive-app/react-canvas'
import { keyedAt, sideEntrances, type SideEntrance, type SideEntranceName } from './sideEntrances'

/**
 * THROWAWAY REVIEW SPIKE — not product code. Delete this file,
 * `sideEntrances.ts`, its render in `App.tsx`, and the `.spike-entrance`
 * block in `app.css` once the entrances have been judged. Hidden by default;
 * append `?curled` to the URL to see one. Append `?curledpose=<frame>` to
 * hold that frame of `Enter` (0..enterFrames) in the middle, for screenshots.
 *
 * The figure comes in from the side and stops in the middle. Rive plays
 * everything in place (the `Motion` machine plays `Enter`, then `Idle`; a
 * figure with a gait first loops `Approach` until `arrive` is set); this
 * component moves the canvas across the screen, reading the plan's travel on
 * Rive's own clock. The travel is fixed artboard px measured from the edge,
 * plus a fraction of whatever distance this screen leaves, or whole gait
 * cycles fitted to it.
 */
export function SideEntranceSpike({ name }: { name: SideEntranceName }) {
  const { src, plan, pose }: SideEntrance = sideEntrances[name]
  const reduced = useMemo(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches, [])
  const held = useMemo(() => {
    const frame = new URLSearchParams(window.location.search).get(`${name}pose`)
    return frame === null ? null : Number(frame) || 0
  }, [name])
  const still = reduced || held !== null
  const fromLeft = plan.from === 'left'
  const [run, setRun] = useState(0)
  const traveler = useRef<HTMLDivElement>(null)
  const shadow = useRef<HTMLDivElement>(null)
  const layout = useMemo(() => new Layout({ fit: Fit.Contain, alignment: Alignment.Center }), [])

  const { rive, RiveComponent } = useRive(
    still
      ? { src, animations: held === null ? 'Idle' : pose, autoplay: held === null, layout }
      : { src, stateMachine: 'Motion', autoplay: false, layout },
    // The entrance starts off screen, and by default the runtime stops
    // drawing a canvas that is out of view -- which would stop the motion
    // that brings it into view.
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

    // Where the canvas sits at rest, before any travel (the class that keeps
    // it off stage until now is overridden).
    box.style.transform = 'none'
    const rest = box.getBoundingClientRect()
    const scale = rest.width / plan.artboard.width
    // Artboard px from fully off the edge to the resting place.
    const distance = fromLeft
      ? rest.left / scale + plan.content.right
      : (window.innerWidth - rest.left) / scale - plan.content.left
    const [, fixedEnd, , cyclesEnd] = plan.travel[plan.travel.length - 1]
    // A gait loops whole cycles, as many as come nearest its own travel, and
    // its travel is fitted so they land it exactly.
    const cycle = plan.cycle
    const loops = cycle ? Math.max(1, Math.round((distance - fixedEnd) / cycle.travel - cyclesEnd)) : 0
    const perCycle = cycle ? (distance - fixedEnd) / (loops + cyclesEnd) : 0
    const looping = cycle ? loops * cycle.frames : 0
    const remainder = distance - fixedEnd - (loops + cyclesEnd) * perCycle

    const arrive = rive.stateMachineInputs('Motion')?.find((input) => input.name === 'arrive')
    if (arrive) arrive.value = false

    let elapsed = 0
    const travelled = (frame: number) => {
      if (cycle && frame < looping) {
        const done = Math.floor(frame / cycle.frames)
        const [part] = keyedAt(cycle.profile, frame - done * cycle.frames)
        return (done + part) * perCycle
      }
      const [fixed, fraction, cycles] = keyedAt(plan.travel, frame - looping)
      return fixed + fraction * remainder + (loops + cycles) * perCycle
    }
    const place = () => {
      const frame = elapsed * plan.fps
      // Any time in the last cycle: the machine finishes that cycle, then enters.
      if (arrive && !arrive.value && cycle && frame >= looping - cycle.frames) arrive.value = true
      const left = distance - travelled(frame)
      const offset = `translateX(${(fromLeft ? -left : left) * scale}px)`
      box.style.transform = offset
      ground.style.transform = offset
    }
    const onAdvance = (event: Event) => {
      elapsed += event.data as number
      place()
    }

    place()
    rive.on(EventType.Advance, onAdvance)
    rive.play('Motion')
    return () => rive.off(EventType.Advance, onAdvance)
  }, [rive, still, run, plan, fromLeft])

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
  const offstage = still ? '' : fromLeft ? ' spike-entrance--from-left' : ' spike-entrance--from-right'

  return (
    <div className={`spike-entrance${offstage}`} style={geometry}>
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
