/** THROWAWAY review spike data for SideEntranceSpike.tsx; delete with it. */

// Each pair is copied in by its art/rive/<name>/build-assets.sh. The JSON is
// the plan the scene was generated from: artboard geometry and the travel.
import peekPlan from '../assets/rive/curled-peek.json'
import waddlePlan from '../assets/rive/selfhug-waddle.json'
import wanderPlan from '../assets/rive/kaleidoscope-backwards.json'
import tiptoePlan from '../assets/rive/stack-tiptoe.json'
import pirouettePlan from '../assets/rive/ribbon-pirouette.json'
import washPlan from '../assets/rive/shell-wave.json'

export interface SidePlan {
  fps: number
  artboard: { width: number; height: number }
  figureBox: { x: number; y: number; size: number }
  feetY: number
  shadow: { x: number; w: number }
  /** The edge it comes in from. */
  from: string
  /** Artboard x the figure reaches to either side, over the whole entrance. */
  content: { left: number; right: number }
  /**
   * A gait that loops (`Approach`) before `Enter`, as many times as the
   * screen needs: `travel` artboard px a cycle, nominally, with `profile`
   * keys of [frame, fraction of a cycle's travel done].
   */
  cycle?: { frames: number; travel: number; profile: number[][] }
  enterFrames: number
  /**
   * [frame of `Enter`, fixed artboard px, fraction of the rest, cycles]: how
   * far it has come. The fixed part is measured from the edge; the fraction
   * is of whatever distance the screen leaves; the cycles are the gait's
   * travel, which carries on out of the last loop.
   */
  travel: number[][]
}

export interface SideEntrance {
  src: string
  plan: SidePlan
  /** The animation `?<name>pose=<frame>` holds a frame of. */
  pose: string
}

/** The figures that come in from the side, by the URL parameter that shows them. */
export const sideEntrances = {
  // Curled peeks in, backs off, and comes in warily in three slides.
  curled: {
    src: new URL('../assets/rive/curled-peek.riv', import.meta.url).href,
    plan: peekPlan,
    pose: 'Enter',
  },
  // Self-hug rocks in like a wind-up toy, then leans toward the space beside it.
  selfhug: {
    src: new URL('../assets/rive/selfhug-waddle.riv', import.meta.url).href,
    plan: waddlePlan,
    pose: 'Approach',
  },
  // The Kaleidoscope backs in from the right, still looking, and bumps to a stop.
  kaleidoscope: {
    src: new URL('../assets/rive/kaleidoscope-backwards.riv', import.meta.url).href,
    plan: wanderPlan,
    pose: 'Approach',
  },
  // The Stack tiptoes in, stops, and catches its tower as it teeters.
  stack: {
    src: new URL('../assets/rive/stack-tiptoe.riv', import.meta.url).href,
    plan: tiptoePlan,
    pose: 'Enter',
  },
  // Ribbon pirouettes in on one foot, hops one last turn and lands balanced.
  ribbon: {
    src: new URL('../assets/rive/ribbon-pirouette.riv', import.meta.url).href,
    plan: pirouettePlan,
    pose: 'Enter',
  },
  // A felt wave washes Shell ashore and draws back, leaving it listening to its shell.
  shell: {
    src: new URL('../assets/rive/shell-wave.riv', import.meta.url).href,
    plan: washPlan,
    pose: 'Enter',
  },
} satisfies Record<string, SideEntrance>

export type SideEntranceName = keyof typeof sideEntrances

/** Keyed values at `frame`, linear between keys of [frame, ...values]. */
export function keyedAt(keys: number[][], frame: number) {
  const next = keys.findIndex(([f]) => f > frame)
  if (next === -1) return keys[keys.length - 1].slice(1)
  if (next === 0) return keys[0].slice(1)
  const [f0, ...a] = keys[next - 1]
  const [f1, ...b] = keys[next]
  const t = (frame - f0) / (f1 - f0)
  return a.map((value, i) => value + (b[i] - value) * t)
}

/** The side entrance the URL asks for (`?<name>` or `?<name>pose=<frame>`), if any. */
export function requestedSideEntrance(params: URLSearchParams): SideEntranceName | null {
  const names = Object.keys(sideEntrances) as SideEntranceName[]
  return names.find((name) => params.has(name) || params.has(`${name}pose`)) ?? null
}
