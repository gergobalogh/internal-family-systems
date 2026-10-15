import { useEffect, useRef } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'

export interface DragPoint {
  dx: number
  dy: number
  clientX: number
  clientY: number
}

interface DragOptions<S, V> {
  start: (event: ReactPointerEvent<HTMLElement>) => S
  move: (start: S, point: DragPoint) => V
  /** `value` is null when the pointer never passed the threshold — a tap. */
  end: (value: V | null) => void
  cancel: () => void
  threshold?: number
}

interface ActiveDrag<S, V> {
  pointerId: number
  x0: number
  y0: number
  start: S
  value: V | null
  moved: boolean
}

/**
 * Pointer-capture drag gesture. Spread the returned handlers onto the element
 * being dragged; it needs `touch-action: none`.
 */
export function usePointerDrag<S, V>(options: DragOptions<S, V>) {
  const optionsRef = useRef(options)
  useEffect(() => {
    optionsRef.current = options
  })
  const drag = useRef<ActiveDrag<S, V> | null>(null)

  return {
    onPointerDown(event: ReactPointerEvent<HTMLElement>) {
      if (event.button !== 0 || drag.current) return
      event.currentTarget.setPointerCapture(event.pointerId)
      drag.current = {
        pointerId: event.pointerId,
        x0: event.clientX,
        y0: event.clientY,
        start: optionsRef.current.start(event),
        value: null,
        moved: false,
      }
    },
    onPointerMove(event: ReactPointerEvent<HTMLElement>) {
      const active = drag.current
      if (!active || active.pointerId !== event.pointerId) return
      const dx = event.clientX - active.x0
      const dy = event.clientY - active.y0
      if (!active.moved && Math.hypot(dx, dy) < (optionsRef.current.threshold ?? 4)) return
      active.moved = true
      active.value = optionsRef.current.move(active.start, {
        dx,
        dy,
        clientX: event.clientX,
        clientY: event.clientY,
      })
    },
    onPointerUp(event: ReactPointerEvent<HTMLElement>) {
      const active = drag.current
      if (!active || active.pointerId !== event.pointerId) return
      drag.current = null
      optionsRef.current.end(active.moved ? active.value : null)
    },
    onPointerCancel(event: ReactPointerEvent<HTMLElement>) {
      if (drag.current?.pointerId !== event.pointerId) return
      drag.current = null
      optionsRef.current.cancel()
    },
  }
}
