import type { LandscapeState } from '../model/types'
import type { PartKind } from './contract'

/**
 * Where the conversation puts parts. Placements are figure centres,
 * normalized to the landscape (0–1).
 *
 * Closeness is distance from MAP_CENTRE: the meadow's pool of light, on its
 * left side, where the conversation card (anchored under the house) never
 * sits. The summary reads it once the person has moved a part.
 */
export const MAP_CENTRE = { x: 0.42, y: 0.64 } as const

/** Bucket edges used by the summary: under CLOSE_BELOW is close, FAR_FROM and over is far. */
export const CLOSE_BELOW = 0.15
export const FAR_FROM = 0.3
/** A smaller difference in distance doesn't count as "closer" (the summary). */
export const MIN_VISIBLE_GAP = 0.05

export type Bucket = 'close' | 'middle' | 'far'

/**
 * Every starting spot is on the meadow, where the card never is: below the
 * sky on a phone (the card floats in the sky there), and left or right of
 * the card on a wide screen (centred under the house, x 0.33–0.67). A spot
 * in the sky, or under the wide card, hid its part (2026-11-02).
 */

/**
 * Starting spots for parts 1 and 2: middling distances from the centre
 * (neutral: where a part without a kind reading starts says nothing),
 * high enough that a large part's label and actions stay on the map.
 */
export const STARTING_SPOTS = [
  { x: 0.23, y: 0.6 },
  { x: 0.1, y: 0.86 },
] as const

/**
 * Kind-based starting rings. These are only opening positions: they never
 * count as the person saying a part feels close or far, and dragging wins.
 * Guards stand nearest the light; escapes off to the side; hurts furthest.
 */
export const KIND_SPOTS: Record<PartKind, readonly Point[]> = {
  guards: [
    { x: 0.245, y: 0.64 },
    { x: 0.255, y: 0.695 },
    { x: 0.255, y: 0.585 },
  ],
  escapes: [
    { x: 0.2, y: 0.64 },
    { x: 0.76, y: 0.68 },
    { x: 0.84, y: 0.88 },
  ],
  // First, a spot with room for part 1 at its large size (at x 0.08 it was cut off by the edge).
  hurts: [
    { x: 0.16, y: 0.8 },
    { x: 0.9, y: 0.64 },
    { x: 0.18, y: 0.91 },
  ],
  other: STARTING_SPOTS,
}

/** Confident kinds choose a ring; an unsure reading keeps the neutral spots. */
export const startingSpotsForKind = (kind: PartKind | null): readonly Point[] =>
  kind === null ? STARTING_SPOTS : KIND_SPOTS[kind]

/**
 * A new part lands at least this far from every other part, so it never
 * walks in on top of one. A ring's spots sit close together, so a third
 * part (Turn 3, or Someone new) often finds its ring taken.
 */
export const MIN_CLEARANCE = 0.12

/**
 * Open meadow for a part whose ring has no clear spot: low on the map, left
 * and right, clear of the card on a phone (top half) and on a wide screen
 * (centred under the house).
 */
export const SPARE_SPOTS = [
  { x: 0.76, y: 0.86 },
  { x: 0.12, y: 0.86 },
] as const

/** Its ring's clearest spot, or, when that is crowded, the clearest of the ring and the spare spots. */
export function startingSpot(state: LandscapeState, kind: PartKind | null): Point {
  const ring = startingSpotsForKind(kind)
  const best = clearestSpot(state, ring)
  return clearance(state, best) >= MIN_CLEARANCE ? best : clearestSpot(state, [...ring, ...SPARE_SPOTS])
}

/** The unheard part's spots: at the meadow's edges (Brief 2: "rarely heard" → edge + small). */
export const EDGE_SPOTS = [
  { x: 0.08, y: 0.76 },
  { x: 0.9, y: 0.76 },
  { x: 0.1, y: 0.62 },
] as const

type Point = { x: number; y: number }

/**
 * The spot farthest from every other part on the map, in either layout, so
 * a new part lands clearly apart from where earlier parts now are (including
 * where the person dragged them). Ties go to the earlier spot.
 */
export function clearestSpot(state: LandscapeState, spots: readonly Point[]): Point {
  return spots.reduce((best, spot) => (clearance(state, spot) > clearance(state, best) ? spot : best))
}

/**
 * A part takes up a column around its spot: its figure above, its name
 * label hanging below, both growing with its size. Clearance is measured
 * between columns, so a new part never stands on a large part's label.
 */
const FIGURE_ABOVE = 0.08
const LABEL_BELOW = 0.16

/** How far a spot (for a part of ordinary size) is from the nearest part on the map, in either layout. */
function clearance(state: LandscapeState, spot: Point): number {
  const others = state.order
    .filter((id) => !state.parts[id].removed)
    .flatMap((id) => [state.layouts.current[id], state.layouts.whatIf?.[id]])
    .filter((placement) => placement !== undefined)
  return Math.min(
    Infinity,
    ...others.map((other) => {
      const gap = Math.max(
        0,
        spot.y - FIGURE_ABOVE - (other.y + LABEL_BELOW * other.scale),
        other.y - FIGURE_ABOVE * other.scale - (spot.y + LABEL_BELOW),
      )
      return Math.hypot(other.x - spot.x, gap)
    }),
  )
}

export function radiusOf(point: Point): number {
  return Math.hypot(point.x - MAP_CENTRE.x, point.y - MAP_CENTRE.y)
}

export function bucketOf(radius: number): Bucket {
  return radius < CLOSE_BELOW ? 'close' : radius >= FAR_FROM ? 'far' : 'middle'
}
