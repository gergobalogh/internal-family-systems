import { useEffect, useMemo, useRef, useState } from 'react'
import { Alignment, EventType, Fit, Layout, useRive, type Event } from '@rive-app/react-canvas'
// Both copied in by art/rive/critic-walk/build-assets.sh. new URL() keeps the
// .riv a plain asset import without a module declaration for the binary
// extension; the JSON is the speed the gait was planned for.
import gait from '../assets/rive/critic-walk.gait.json'

const criticWalk = new URL('../assets/rive/critic-walk.riv', import.meta.url).href

/** Artboard px the body has travelled `seconds` into an entrance of `cycles` walk cycles. */
function travelled(seconds: number, cycles: number) {
  const frame = seconds * gait.fps
  const walkFrames = cycles * gait.cycleFrames
  if (frame < walkFrames) return (frame / gait.cycleFrames) * gait.cycleTravel
  const stop = gait.stopTravel
  const at = Math.min(frame - walkFrames, stop.length - 1)
  const i = Math.floor(at)
  const next = stop[Math.min(i + 1, stop.length - 1)]
  return cycles * gait.cycleTravel + stop[i] + (next - stop[i]) * (at - i)
}

/**
 * THROWAWAY REVIEW SPIKE — not product code. Delete this file, its render in
 * `App.tsx`, and its `.spike-walk` block in `app.css` once the walk has been
 * judged. Hidden by default while the app is finished with static figures;
 * append `?walk` to the URL to see the entrance.
 * Append `?walkpose=<frame>` to skip the entrance and hold the figure in the
 * middle on that frame of the walk cycle (0..cycleFrames), for screenshots.
 *
 * The Critic walks in from the left edge and stops in the middle. Rive owns
 * the gait (the `Motion` machine walks in place until `arrive` is set, then
 * brakes and stands); this component owns the travel, and moves the figure at
 * exactly the speed the gait was planned for, so the planted foot stays put
 * on screen. The travel is read off Rive's own clock each frame rather than a
 * CSS animation, so the two cannot drift apart.
 */
export function CriticWalkSpike() {
  const reduced = useMemo(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches, [])
  const held = useMemo(() => {
    const frame = new URLSearchParams(window.location.search).get('walkpose')
    return frame === null ? null : Number(frame) || 0
  }, [])
  const still = reduced || held !== null
  const [run, setRun] = useState(0)
  const traveler = useRef<HTMLDivElement>(null)
  const layout = useMemo(() => new Layout({ fit: Fit.Contain, alignment: Alignment.Center }), [])

  const { rive, RiveComponent } = useRive(
    still
      ? { src: criticWalk, animations: held === null ? 'Idle' : 'Walk', autoplay: false, layout }
      : { src: criticWalk, stateMachine: 'Motion', autoplay: false, layout },
    // The walk starts off screen, and by default the runtime stops drawing a
    // canvas that is out of view -- which would stop the walk that brings it
    // into view.
    { shouldUseIntersectionObserver: false },
  )

  useEffect(() => {
    if (rive && held !== null) rive.scrub('Walk', held / gait.fps)
  }, [rive, held])

  useEffect(() => {
    const box = traveler.current
    if (!rive || still || !box) return
    if (run > 0) rive.reset({ stateMachine: 'Motion', autoplay: false })

    const arrive = rive.stateMachineInputs('Motion')?.find((input) => input.name === 'arrive')
    if (!arrive) return
    arrive.value = false

    // Walk whole cycles, as many as it takes to start with the figure fully
    // off the left edge. The figure's right edge is the lantern, figureRight
    // into the artboard.
    const scale = () => box.offsetWidth / gait.artboard
    const restLeft = (window.innerWidth - box.offsetWidth) / 2
    const needed = restLeft / scale() + gait.figureRight
    const stopTravel = gait.stopTravel[gait.stopTravel.length - 1]
    const cycles = Math.max(1, Math.ceil((needed - stopTravel) / gait.cycleTravel))
    const total = cycles * gait.cycleTravel + stopTravel

    let elapsed = 0
    const place = () => {
      const offset = (travelled(elapsed, cycles) - total) * scale()
      box.style.transform = `translateX(${offset}px)`
    }
    const onAdvance = (event: Event) => {
      elapsed += event.data as number
      // Any time in the last cycle: the machine finishes that cycle, then stops.
      if (!arrive.value && elapsed * gait.fps >= (cycles - 1) * gait.cycleFrames) arrive.value = true
      place()
    }

    place()
    rive.on(EventType.Advance, onAdvance)
    rive.play('Motion')
    return () => rive.off(EventType.Advance, onAdvance)
  }, [rive, still, run])

  return (
    <div className="spike-walk">
      <div ref={traveler} className={still ? 'spike-walk__traveler' : 'spike-walk__traveler spike-walk__traveler--entering'}>
        <RiveComponent className="spike-walk__canvas" />
      </div>
      {!still && (
        <button type="button" className="spike-walk__replay" onClick={() => setRun((current) => current + 1)}>
          replay walk
        </button>
      )}
    </div>
  )
}
