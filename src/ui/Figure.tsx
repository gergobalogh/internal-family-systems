import { useEffect, useState } from 'react'
import type { Look } from '../model/types'
import { blinkSources, figureSources as sources, lanternArm } from './figureSources'

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
