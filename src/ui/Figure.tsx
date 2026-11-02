import { useEffect, useState } from 'react'
import curled from '../assets/figures/figure-curled.webp'
import curledBlink from '../assets/figures/figure-curled-blink.webp'
import defender from '../assets/figures/figure-defender.webp'
import defenderBlink from '../assets/figures/figure-defender-blink.webp'
import doodle from '../assets/figures/figure-doodle.webp'
import doodleBlink from '../assets/figures/figure-doodle-blink.webp'
import kaleidoscope from '../assets/figures/figure-kaleidoscope.webp'
import lanternArm from '../assets/figures/figure-lantern-arm.webp'
import lanternBase from '../assets/figures/figure-lantern-base.webp'
import lanternBlink from '../assets/figures/figure-lantern-blink.webp'
import map from '../assets/figures/figure-map.webp'
import mapBlink from '../assets/figures/figure-map-blink.webp'
import pod from '../assets/figures/figure-pod.webp'
import podBlink from '../assets/figures/figure-pod-blink.webp'
import ribbon from '../assets/figures/figure-ribbon.webp'
import ribbonBlink from '../assets/figures/figure-ribbon-blink.webp'
import selfhug from '../assets/figures/figure-selfhug.webp'
import selfhugBlink from '../assets/figures/figure-selfhug-blink.webp'
import shell from '../assets/figures/figure-shell.webp'
import sleeper from '../assets/figures/figure-sleeper.webp'
import sleeperBlink from '../assets/figures/figure-sleeper-blink.webp'
import sprout from '../assets/figures/figure-sprout.webp'
import sproutBlink from '../assets/figures/figure-sprout-blink.webp'
import stack from '../assets/figures/figure-stack.webp'
import stackBlink from '../assets/figures/figure-stack-blink.webp'
import type { Look } from '../model/types'

const BLINK_CLOSED_MS = 120
const FIRST_BLINK_MIN_MS = 1_600
const FIRST_BLINK_MAX_MS = 2_600
const NEXT_BLINK_MIN_MS = 5_000
const NEXT_BLINK_MAX_MS = 9_000
const LANTERN_RAISED_MS = 1_700
const FIRST_LIFT_MIN_MS = 3_200
const FIRST_LIFT_MAX_MS = 4_400
const NEXT_LIFT_MIN_MS = 9_000
const NEXT_LIFT_MAX_MS = 15_000

function randomBetween(min: number, max: number) {
  return min + Math.random() * (max - min)
}

function useBlink(enabled: boolean) {
  const [closed, setClosed] = useState(false)

  useEffect(() => {
    if (!enabled) return

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
    let nextBlink: number | undefined
    let reopen: number | undefined
    let stopped = false

    const clearTimers = () => {
      window.clearTimeout(nextBlink)
      window.clearTimeout(reopen)
    }

    const schedule = (first = false) => {
      window.clearTimeout(nextBlink)
      if (stopped || reducedMotion.matches) return

      const min = first ? FIRST_BLINK_MIN_MS : NEXT_BLINK_MIN_MS
      const max = first ? FIRST_BLINK_MAX_MS : NEXT_BLINK_MAX_MS
      nextBlink = window.setTimeout(() => {
        if (document.hidden) {
          schedule()
          return
        }

        setClosed(true)
        reopen = window.setTimeout(() => {
          setClosed(false)
          schedule()
        }, BLINK_CLOSED_MS)
      }, randomBetween(min, max))
    }

    const onMotionPreferenceChange = () => {
      clearTimers()
      setClosed(false)
      if (!reducedMotion.matches) schedule(true)
    }

    reducedMotion.addEventListener('change', onMotionPreferenceChange)
    schedule(true)

    return () => {
      stopped = true
      clearTimers()
      reducedMotion.removeEventListener('change', onMotionPreferenceChange)
    }
  }, [enabled])

  return enabled && closed
}

function useLanternLift(enabled: boolean) {
  const [raised, setRaised] = useState(false)

  useEffect(() => {
    if (!enabled) return

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
    let nextLift: number | undefined
    let lower: number | undefined
    let stopped = false

    const clearTimers = () => {
      window.clearTimeout(nextLift)
      window.clearTimeout(lower)
    }

    const schedule = (first = false) => {
      window.clearTimeout(nextLift)
      if (stopped || reducedMotion.matches) return

      const min = first ? FIRST_LIFT_MIN_MS : NEXT_LIFT_MIN_MS
      const max = first ? FIRST_LIFT_MAX_MS : NEXT_LIFT_MAX_MS
      nextLift = window.setTimeout(() => {
        if (document.hidden) {
          schedule()
          return
        }

        setRaised(true)
        lower = window.setTimeout(() => {
          setRaised(false)
          schedule()
        }, LANTERN_RAISED_MS)
      }, randomBetween(min, max))
    }

    const onMotionPreferenceChange = () => {
      clearTimers()
      setRaised(false)
      if (!reducedMotion.matches) schedule(true)
    }

    reducedMotion.addEventListener('change', onMotionPreferenceChange)
    schedule(true)

    return () => {
      stopped = true
      clearTimers()
      reducedMotion.removeEventListener('change', onMotionPreferenceChange)
    }
  }, [enabled])

  return enabled && raised
}

/**
 * Sculpted figures for parts: felted, tactile, gentle — never photoreal, never
 * a villain or a joke. Each pose hints at a strategy (watching, offering,
 * resting) without declaring what the part "is". All share one square box at
 * a common scale, feet on a ground line at 95% of its height
 * (scripts/cutout-figures.py for the first three, scripts/app-figures.py for
 * the rest, sized to the same felt area).
 */
const sources: Record<Look, string> = {
  lantern: lanternBase,
  sprout,
  sleeper,
  defender,
  pod,
  curled,
  selfhug,
  ribbon,
  kaleidoscope,
  stack,
  map,
  doodle,
  shell,
}
/** Closed-eye overlays. The Kaleidoscope's scope hides the eye it would close, and Shell's are shut. */
const blinkSources: Partial<Record<Look, string>> = {
  lantern: lanternBlink,
  sprout: sproutBlink,
  sleeper: sleeperBlink,
  defender: defenderBlink,
  pod: podBlink,
  curled: curledBlink,
  selfhug: selfhugBlink,
  ribbon: ribbonBlink,
  stack: stackBlink,
  map: mapBlink,
  doodle: doodleBlink,
}

export function Figure({ look }: { look: Look }) {
  const blink = blinkSources[look]
  const blinking = useBlink(blink !== undefined)
  const lanternRaised = useLanternLift(look === 'lantern')

  return (
    <>
      <span className="figure__shadow" />
      <img className="figure" src={sources[look]} alt="" draggable={false} />
      {look === 'lantern' && (
        <span className={`figure__lantern-rig${lanternRaised ? ' is-raised' : ''}`} aria-hidden="true">
          <img className="figure" src={lanternArm} alt="" draggable={false} />
          <span className="figure__glow" />
        </span>
      )}
      {blink && (
        <img
          className={`figure figure__blink${blinking ? ' is-visible' : ''}`}
          src={blink}
          alt=""
          aria-hidden="true"
          draggable={false}
        />
      )}
    </>
  )
}

/** A still figure for choosing between them (Change figure): no shadow, blink, or lantern lift. */
export function FigureThumb({ look }: { look: Look }) {
  return (
    <span className="figure-thumb" aria-hidden="true">
      <img className="figure" src={sources[look]} alt="" draggable={false} />
      {look === 'lantern' && <img className="figure" src={lanternArm} alt="" draggable={false} />}
    </span>
  )
}
