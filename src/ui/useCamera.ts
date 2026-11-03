import { useEffect, useState } from 'react'

/** The camera's move in to a part, and back out (`--camera` in app.css). */
export const CAMERA_MS = 1400
/** After Thank it: how long its glow is seen up close before the camera steps back. */
export const THANKS_MS = 2200

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

/**
 * Whether the camera is moving (in to `focus`, or back out to the whole
 * meadow). Worked out during render, so the next card is held from the same
 * render the focus changes: a card never appears mid-move. Reduced motion
 * cuts straight there.
 */
export function useCamera(focus: string | null): boolean {
  const [target, setTarget] = useState(focus)
  const [moving, setMoving] = useState(false)
  if (focus !== target) {
    setTarget(focus)
    if (!reducedMotion()) setMoving(true)
  }
  useEffect(() => {
    if (!moving) return
    const timer = setTimeout(() => setMoving(false), CAMERA_MS)
    return () => clearTimeout(timer)
  }, [moving, target])
  return moving
}
