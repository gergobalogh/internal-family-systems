import { useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { Alignment, EventType, Fit, Layout, useRive, type Event } from '@rive-app/react-canvas'
// Both copied in by art/rive/sprout-rise/build-assets.sh. The JSON is the plan
// the scene was generated from: artboard geometry and the shadow's keys.
import plan from '../assets/rive/sprout-rise.json'

const sproutRise = new URL('../assets/rive/sprout-rise.riv', import.meta.url).href

/** The page shadow at `frame` of `Rise`: opacity, width scale, x shift (fraction of the box). */
function shadowAt(frame: number) {
  const keys = plan.shadowKeys
  const next = keys.findIndex(([f]) => f > frame)
  if (next === -1) return keys[keys.length - 1].slice(1)
  if (next === 0) return keys[0].slice(1)
  const [f0, ...a] = keys[next - 1]
  const [f1, ...b] = keys[next]
  const t = (frame - f0) / (f1 - f0)
  return a.map((value, i) => value + (b[i] - value) * t)
}

/**
 * THROWAWAY REVIEW SPIKE — not product code. Delete this file, its render in
 * `App.tsx`, and the `.spike-entrance` block in `app.css` once the entrance
 * has been judged. Hidden by default; append `?sprout` to the URL to see it.
 * Append `?sproutpose=<frame>` to hold one frame of `Rise` (0..riseFrames),
 * for screenshots.
 *
 * The Sprout comes up out of the ground in the middle of the screen. It all
 * happens in place, so Rive plays the whole of it (the `Motion` machine runs
 * `Rise`, then `Idle`); this component only parks the canvas and moves the
 * page shadow along with the mound and the Sprout, on Rive's own clock.
 */
export function SproutRiseSpike() {
  const reduced = useMemo(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches, [])
  const held = useMemo(() => {
    const frame = new URLSearchParams(window.location.search).get('sproutpose')
    return frame === null ? null : Number(frame) || 0
  }, [])
  const still = reduced || held !== null
  const [run, setRun] = useState(0)
  const shadow = useRef<HTMLDivElement>(null)
  const layout = useMemo(() => new Layout({ fit: Fit.Contain, alignment: Alignment.Center }), [])

  const { rive, RiveComponent } = useRive(
    still
      ? { src: sproutRise, animations: held === null ? 'Idle' : 'Rise', autoplay: held === null, layout }
      : { src: sproutRise, stateMachine: 'Motion', autoplay: false, layout },
  )

  useEffect(() => {
    const ground = shadow.current
    if (!rive || held === null || !ground) return
    rive.scrub('Rise', held / plan.fps)
    const [opacity, scale, dx] = shadowAt(held)
    ground.style.opacity = String(opacity)
    ground.style.scale = `${scale} 1`
    ground.style.setProperty('--shadow-dx', String(dx))
  }, [rive, held])

  useEffect(() => {
    const ground = shadow.current
    if (!rive || still || !ground) return
    if (run > 0) rive.reset({ stateMachine: 'Motion', autoplay: false })

    let elapsed = 0
    const place = () => {
      const [opacity, scale, dx] = shadowAt(elapsed * plan.fps)
      ground.style.opacity = String(opacity)
      ground.style.scale = `${scale} 1`
      ground.style.setProperty('--shadow-dx', String(dx))
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
    <div className="spike-entrance" style={geometry}>
      <div ref={shadow} className="spike-entrance__shadow" style={reduced ? undefined : { opacity: 0 }} />
      <div className="spike-entrance__traveler">
        <RiveComponent className="spike-entrance__canvas" />
      </div>
      {!still && (
        <button type="button" className="spike-entrance__replay" onClick={() => setRun((current) => current + 1)}>
          replay rise
        </button>
      )}
    </div>
  )
}
