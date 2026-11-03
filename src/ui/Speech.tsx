import { useLayoutEffect, useRef, useState } from 'react'
import type { RefObject } from 'react'
import { copy } from './copy'

/** Room kept from the landscape's edges and between things. */
const EDGE = 16
const GAP = 10
/** The figures' heads sit a little below their box's top. */
const HEAD_INSET = 0.06

interface Measured {
  /** The figure's centre line, top and bottom, in the landscape's pixels. */
  x: number
  top: number
  bottom: number
  width: number
  height: number
  /** The card on screen, when there is one. */
  card: { left: number; right: number; bottom: number } | null
}

interface SpeechProps {
  landscapeRef: RefObject<HTMLElement | null>
  partId: string
  /** What it would say, as speech from the figure (frame A09). */
  voice: string | null
  /** What it might be trying to do, under the figure (frames A10–A11). */
  intent: string | null
  /** Changes whenever the card on screen does, so the speech keeps clear of it. */
  layoutKey: number | null
}

const clamp = (value: number, low: number, high: number) => Math.min(Math.max(value, low), Math.max(low, high))

/**
 * A part's own words while the person sits with it: what it would say comes
 * out of it as speech, above its head, and what it might be trying to do sits
 * under it. Drawn over the scene rather than inside it, so the camera's zoom
 * never scales the text; placed from the figure as it is on screen, kept
 * whole on the map and clear of the card.
 */
export function Speech({ landscapeRef, partId, voice, intent, layoutKey }: SpeechProps) {
  const [measured, setMeasured] = useState<Measured | null>(null)
  const voiceRef = useRef<HTMLParagraphElement>(null)
  const intentRef = useRef<HTMLParagraphElement>(null)

  useLayoutEffect(() => {
    const landscape = landscapeRef.current
    if (!landscape) return
    const measure = () => {
      const figure = landscape.querySelector(`[data-part="${CSS.escape(partId)}"] .part__figure`)
      if (!figure) {
        setMeasured(null)
        return
      }
      const area = landscape.getBoundingClientRect()
      const box = figure.getBoundingClientRect()
      const card = landscape.querySelector('.card:not(.is-away)')?.getBoundingClientRect()
      setMeasured({
        x: box.left + box.width / 2 - area.left,
        top: box.top - area.top,
        bottom: box.bottom - area.top,
        width: area.width,
        height: area.height,
        card: card ? { left: card.left - area.left, right: card.right - area.left, bottom: card.bottom - area.top } : null,
      })
    }
    // Again once the camera or the card has settled.
    const settled = (event: Event) => {
      const target = event.target as Element
      if (target.classList.contains('landscape__scene') || target.classList.contains('card')) measure()
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(landscape)
    landscape.addEventListener('transitionend', settled)
    landscape.addEventListener('animationend', settled)
    return () => {
      observer.disconnect()
      landscape.removeEventListener('transitionend', settled)
      landscape.removeEventListener('animationend', settled)
    }
  }, [landscapeRef, partId, layoutKey])

  // Placed before paint, from each one's own size.
  useLayoutEffect(() => {
    if (!measured) return
    const { x, top, bottom, width, height, card } = measured
    const bubble = voiceRef.current
    if (bubble) {
      const w = bubble.offsetWidth
      const h = bubble.offsetHeight
      const left = clamp(x - w / 2, EDGE, width - EDGE - w)
      let foot = top + (bottom - top) * HEAD_INSET - GAP
      // Under the card when they share columns, even if that means over the figure's head.
      if (card && left < card.right && left + w > card.left) foot = Math.max(foot, card.bottom + GAP + h)
      bubble.style.left = `${left}px`
      bubble.style.top = `${foot - h}px`
      bubble.style.setProperty('--tail', `${clamp(x - left, 22, w - 22)}px`)
    }
    const words = intentRef.current
    if (words) {
      const w = words.offsetWidth
      const h = words.offsetHeight
      words.style.left = `${clamp(x - w / 2, EDGE, width - EDGE - w)}px`
      words.style.top = `${Math.min(bottom + GAP / 2, height - EDGE - h)}px`
    }
  }, [measured, voice, intent])

  if (!measured) return null
  return (
    <>
      {voice && (
        <p ref={voiceRef} className="speech">
          “{voice}”
        </p>
      )}
      {intent && (
        <p ref={intentRef} className="speech-intent">
          <span className="speech-intent__label">{copy.intentLabel}</span> {intent}
        </p>
      )}
    </>
  )
}
