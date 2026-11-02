import { POSITION_MAX, POSITION_MIN, SCALE_MAX, SCALE_MIN } from '../model/landscape'
import type { LandscapeState, Placement } from '../model/types'
import type { PartKind } from './contract'

/**
 * Where the conversation puts parts, and how corrections move them. Placements are figure centres, normalized to the landscape (0–1).
 *
 * Centrality is distance from MAP_CENTRE: the meadow's pool of light, on its
 * left side, where the conversation card (anchored under the house) never
 * sits. Moves change only that distance and keep the part's direction, so a
 * drag's direction survives.
 */
export const MAP_CENTRE = { x: 0.42, y: 0.64 } as const

/** Bucket edges used by the summary: under CLOSE_BELOW is close, FAR_FROM and over is far. */
export const CLOSE_BELOW = 0.15
export const FAR_FROM = 0.3
/** Nothing moves nearer the centre than this. */
export const MIN_RADIUS = 0.04
/** A smaller difference in distance doesn't count as "closer" (the summary). */
export const MIN_VISIBLE_GAP = 0.05
/** Corrections: one "closer"/"further" step, and one "bigger"/"smaller" factor. */
export const RADIAL_STEP = 0.15
export const SCALE_STEP = 1.3

export type Bucket = 'close' | 'middle' | 'far'

/**
 * Starting spots for parts 1 and 2: the same middling distance from the
 * centre (neutral: where a part without a kind reading starts says
 * nothing), clear of the card, high enough that a large part's label and
 * actions stay on the map.
 */
export const STARTING_SPOTS = [
  { x: 0.23, y: 0.6 },
  { x: 0.36, y: 0.8 },
] as const

/**
 * Kind-based starting rings. These are only opening positions: they never
 * count as the person saying a part feels close or far, and dragging wins.
 * All candidates stay left of the conversation card on wide screens.
 */
export const KIND_SPOTS: Record<PartKind, readonly Point[]> = {
  guards: [
    { x: 0.275, y: 0.64 },
    { x: 0.285, y: 0.695 },
    { x: 0.285, y: 0.585 },
  ],
  escapes: [
    { x: 0.2, y: 0.64 },
    { x: 0.42, y: 0.86 },
    { x: 0.42, y: 0.42 },
  ],
  hurts: [
    { x: 0.08, y: 0.76 },
    { x: 0.18, y: 0.91 },
    { x: 0.12, y: 0.44 },
  ],
  other: STARTING_SPOTS,
}

/** Confident kinds choose a ring; an unsure reading keeps the neutral spots. */
export const startingSpotsForKind = (kind: PartKind | null): readonly Point[] =>
  kind === null ? STARTING_SPOTS : KIND_SPOTS[kind]

/**
 * A new part lands at least this far from every other part, so it never
 * walks in on top of one. A ring's spots sit close together, so a third
 * part (Turn 3, or Add a part) often finds its ring taken.
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

/** How far a spot is from the nearest part on the map, in either layout. */
function clearance(state: LandscapeState, spot: Point): number {
  const others = state.order
    .filter((id) => !state.parts[id].removed)
    .flatMap((id) => [state.layouts.current[id], state.layouts.whatIf?.[id]])
    .filter((placement) => placement !== undefined)
  return Math.min(Infinity, ...others.map((other) => Math.hypot(other.x - spot.x, other.y - spot.y)))
}

export function radiusOf(point: Point): number {
  return Math.hypot(point.x - MAP_CENTRE.x, point.y - MAP_CENTRE.y)
}

export function bucketOf(radius: number): Bucket {
  return radius < CLOSE_BELOW ? 'close' : radius >= FAR_FROM ? 'far' : 'middle'
}

/** The part's direction from the centre; a part exactly at the centre goes along +x (arbitrary). */
function direction(point: Point): Point {
  const radius = radiusOf(point)
  if (radius < 1e-6) return { x: 1, y: 0 }
  return { x: (point.x - MAP_CENTRE.x) / radius, y: (point.y - MAP_CENTRE.y) / radius }
}

/** How far out along its direction a part can go and stay on the map. */
function maxRadius(point: Point): number {
  const { x, y } = direction(point)
  const limits = [
    x > 0 ? (POSITION_MAX - MAP_CENTRE.x) / x : x < 0 ? (POSITION_MIN - MAP_CENTRE.x) / x : Infinity,
    y > 0 ? (POSITION_MAX - MAP_CENTRE.y) / y : y < 0 ? (POSITION_MIN - MAP_CENTRE.y) / y : Infinity,
  ]
  return Math.min(...limits)
}

/** The same part at another distance from the centre, same direction, kept on the map. */
export function atRadius(placement: Placement, radius: number): Placement {
  const { x, y } = direction(placement)
  const clamped = Math.min(Math.max(radius, 0), maxRadius(placement))
  return { ...placement, x: MAP_CENTRE.x + x * clamped, y: MAP_CENTRE.y + y * clamped }
}

export const samePlace = (a: Placement, b: Placement) =>
  Math.abs(a.x - b.x) < 1e-4 && Math.abs(a.y - b.y) < 1e-4 && Math.abs(a.scale - b.scale) < 1e-4

/** Correction ops: one step, never past the limits (and never backwards). */
export function stepped(placement: Placement, op: 'bigger' | 'smaller' | 'closer' | 'further'): Placement {
  const radius = radiusOf(placement)
  switch (op) {
    case 'bigger':
      return { ...placement, scale: Math.max(placement.scale, Math.min(SCALE_MAX, placement.scale * SCALE_STEP)) }
    case 'smaller':
      return { ...placement, scale: Math.min(placement.scale, Math.max(SCALE_MIN, placement.scale / SCALE_STEP)) }
    case 'closer':
      return atRadius(placement, Math.min(radius, Math.max(MIN_RADIUS, radius - RADIAL_STEP)))
    case 'further':
      return atRadius(placement, Math.max(radius, radius + RADIAL_STEP))
  }
}
