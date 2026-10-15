import { useCallback, useEffect, useLayoutEffect, useRef } from 'react'
import type { LandscapeState } from '../model/types'

/** How long the person rests after a "How it is" edit before the guide may ask about it. */
export const NOTICE_IDLE_MS = 3500

/**
 * Watches "How it is" after the map is handed over (docs/slice-4-handoff.md,
 * noticing edits). After a drag or resize, once the person has rested for
 * NOTICE_IDLE_MS — no pointer held, no key or tap since — it reports the map
 * as it was the last time it reported (the baseline), and which part was
 * edited last. The flow decides whether that is worth a question; either way
 * the baseline moves on, so a moment that couldn't be asked about is dropped.
 * Switching to "What if" drops a pending moment too.
 */
export function useNoticing(
  landscape: LandscapeState,
  enabled: boolean,
  onNotice: (before: LandscapeState, partId: string | null) => void,
) {
  const latest = useRef(landscape)
  const report = useRef(onNotice)
  useLayoutEffect(() => {
    latest.current = landscape
    report.current = onNotice
  })

  const baseline = useRef<LandscapeState | null>(null)
  const edited = useRef<string | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pressed = useRef(false)

  const cancel = useCallback(() => {
    if (timer.current !== null) clearTimeout(timer.current)
    timer.current = null
  }, [])

  const arm = useCallback(() => {
    cancel()
    const wait = () => {
      timer.current = setTimeout(() => {
        timer.current = null
        // A held pointer is a gesture in progress, not rest.
        if (pressed.current) return wait()
        const before = baseline.current
        baseline.current = latest.current
        if (before) report.current(before, edited.current)
        edited.current = null
      }, NOTICE_IDLE_MS)
    }
    wait()
  }, [cancel])

  // Any tap or key while a moment is pending means they're still busy: wait again.
  useEffect(() => {
    const down = () => {
      pressed.current = true
      if (timer.current !== null) arm()
    }
    const up = () => {
      pressed.current = false
    }
    const key = () => {
      if (timer.current !== null) arm()
    }
    window.addEventListener('pointerdown', down, true)
    window.addEventListener('pointerup', up, true)
    window.addEventListener('pointercancel', up, true)
    window.addEventListener('keydown', key, true)
    return () => {
      window.removeEventListener('pointerdown', down, true)
      window.removeEventListener('pointerup', up, true)
      window.removeEventListener('pointercancel', up, true)
      window.removeEventListener('keydown', key, true)
      cancel()
    }
  }, [arm, cancel])

  const layout = landscape.layouts.current
  const mode = landscape.mode
  const seenLayout = useRef(layout)
  useEffect(() => {
    const previous = seenLayout.current
    seenLayout.current = layout
    if (!enabled) {
      cancel()
      baseline.current = null
      return
    }
    // First look (the hand-over), or "What if" showing: this map is where noticing starts from.
    if (!baseline.current || mode !== 'current') {
      cancel()
      baseline.current = latest.current
      edited.current = null
      return
    }
    if (layout === previous) return
    edited.current = Object.keys(layout).find((id) => layout[id] !== previous[id]) ?? edited.current
    arm()
  }, [enabled, layout, mode, arm, cancel])
}
