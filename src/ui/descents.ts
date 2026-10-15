/** THROWAWAY review spike data for DescentSpike.tsx; delete with it. */

// Each pair is copied in by its art/rive/<name>/build-assets.sh. The JSON is
// the plan the scene was generated from: artboard geometry and landing timing.
import parachutePlan from '../assets/rive/defender-parachute.json'
import driftPlan from '../assets/rive/sleeper-drift.json'
import dropPlan from '../assets/rive/pod-drop.json'

export type Plan = typeof parachutePlan

/** How the page brings the canvas down to the ground. */
export type Motion =
  /** At a steady speed near this many screen px per second, fitted to whole swings. */
  | { drift: number }
  /** Speeding up evenly from this fraction of the plan's touchdown speed to all of it, fitted to whole cycles. */
  | { fall: number }

export interface Descent {
  src: string
  plan: Plan
  motion: Motion
  /** The animation `?<name>pose=<frame>` holds a frame of. */
  pose: string
}

/** The figures that come down from above, by the URL parameter that shows them. */
export const descents = {
  // The Defender floats down by parachute.
  parachute: {
    src: new URL('../assets/rive/defender-parachute.riv', import.meta.url).href,
    plan: parachutePlan,
    motion: { drift: 110 },
    pose: 'Descend',
  },
  // The Sleeper drifts down like a falling leaf, slower.
  sleeper: {
    src: new URL('../assets/rive/sleeper-drift.riv', import.meta.url).href,
    plan: driftPlan,
    motion: { drift: 90 },
    pose: 'Descend',
  },
  // The Pod drops, and its padding swallows the landing; the pose is the squash.
  pod: {
    src: new URL('../assets/rive/pod-drop.riv', import.meta.url).href,
    plan: dropPlan,
    motion: { fall: 0.25 },
    pose: 'Land',
  },
} satisfies Record<string, Descent>

export type DescentName = keyof typeof descents

/** The descent the URL asks for (`?<name>` or `?<name>pose=<frame>`), if any. */
export function requestedDescent(params: URLSearchParams): DescentName | null {
  const names = Object.keys(descents) as DescentName[]
  return names.find((name) => params.has(name) || params.has(`${name}pose`)) ?? null
}
