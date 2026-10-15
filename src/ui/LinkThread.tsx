import { useEffect, useRef, useState } from 'react'
import { copy } from './copy'

type Point = { x: number; y: number }

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

/** Follows `target`, gliding over `duration` ms like the parts do (instant when 0 or reduced motion). */
function useGlide(target: Point, duration: number): Point {
  const [point, setPoint] = useState(target)
  const current = useRef(target)
  const { x, y } = target

  useEffect(() => {
    const goal = { x, y }
    let frame = 0
    if (duration === 0 || reducedMotion()) {
      frame = requestAnimationFrame(() => {
        current.current = goal
        setPoint(goal)
      })
      return () => cancelAnimationFrame(frame)
    }
    const origin = current.current
    const start = performance.now()
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / duration)
      const eased = 1 - (1 - t) ** 3
      const next = { x: origin.x + (goal.x - origin.x) * eased, y: origin.y + (goal.y - origin.y) * eased }
      current.current = next
      setPoint(next)
      if (t < 1) frame = requestAnimationFrame(step)
    }
    frame = requestAnimationFrame(step)
    return () => cancelAnimationFrame(frame)
  }, [x, y, duration])

  return point
}

/** How much of the line, around the middle, stays empty: the pull between the two. */
const GAP = 0.16

interface LinkThreadProps {
  id: string
  /** Each end, with how long it takes to glide there (0 while dragged). */
  from: { point: Point; glide: number; name: string }
  to: { point: Point; glide: number; name: string }
  selected: boolean
  onSelect: () => void
  onRemove: () => void
}

/**
 * A tension link, read as two parts pulling in different directions: a soft
 * thread reaches from each part toward the other and fades before they meet,
 * around a small knot that selects the link. Never red, dark, or jagged.
 */
export function LinkThread({ id, from, to, selected, onSelect, onRemove }: LinkThreadProps) {
  const a = useGlide(from.point, from.glide)
  const b = useGlide(to.point, to.glide)
  const along = (p: Point, q: Point, t: number) => ({ x: (p.x + (q.x - p.x) * t) * 100, y: (p.y + (q.y - p.y) * t) * 100 })
  const reach = 0.5 - GAP / 2
  const strands = [
    { key: 'from', start: along(a, b, 0), end: along(a, b, reach) },
    { key: 'to', start: along(b, a, 0), end: along(b, a, reach) },
  ]
  const middle = along(a, b, 0.5)

  return (
    <div className={`link${selected ? ' is-selected' : ''}`}>
      <svg className="link__threads" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        <defs>
          {strands.map(({ key, start, end }) => (
            <linearGradient
              key={key}
              id={`${id}-${key}`}
              gradientUnits="userSpaceOnUse"
              x1={start.x}
              y1={start.y}
              x2={end.x}
              y2={end.y}
            >
              <stop offset="0.15" style={{ stopColor: 'var(--thread)', stopOpacity: 0.95 }} />
              <stop offset="1" style={{ stopColor: 'var(--thread)', stopOpacity: 0 }} />
            </linearGradient>
          ))}
        </defs>
        {strands.map(({ key, start, end }) => (
          <line key={key} x1={start.x} y1={start.y} x2={end.x} y2={end.y} stroke={`url(#${id}-${key})`} />
        ))}
      </svg>

      <div className="link__anchor" style={{ left: `${middle.x}%`, top: `${middle.y}%` }}>
        <button
          type="button"
          className="link__knot"
          aria-label={copy.link.label(from.name, to.name)}
          aria-expanded={selected}
          onClick={onSelect}
        />
        {selected && (
          <div className="link__tag">
            <div className="part__label">
              <span className="part__hedge">{copy.hedge}</span>
              <span className="link__words">{copy.link.words}</span>
            </div>
            <div className="part__actions">
              <button type="button" onClick={onRemove}>
                {copy.link.remove}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
