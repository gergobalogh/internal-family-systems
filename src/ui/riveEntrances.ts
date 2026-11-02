import { useMemo } from 'react'
import { useRiveFile, type RiveFile } from '@rive-app/react-canvas'
// How much smaller each map figure is than its scene's tile (scripts/app-figures.py).
import figureScales from '../assets/figures/figure-scales.json'
// Each scene and the plan it was generated from are copied in by its
// art/rive/<name>/build-assets.sh.
import gait from '../assets/rive/critic-walk.gait.json'
import peekPlan from '../assets/rive/curled-peek.json'
import mapPlan from '../assets/rive/map-route.json'
import parachutePlan from '../assets/rive/defender-parachute.json'
import driftPlan from '../assets/rive/sleeper-drift.json'
import waddlePlan from '../assets/rive/selfhug-waddle.json'
import wanderPlan from '../assets/rive/kaleidoscope-backwards.json'
import tiptoePlan from '../assets/rive/stack-tiptoe.json'
import pirouettePlan from '../assets/rive/ribbon-pirouette.json'
import washPlan from '../assets/rive/shell-wave.json'
import dropPlan from '../assets/rive/pod-drop.json'
import risePlan from '../assets/rive/sprout-rise.json'
import doodlePlan from '../assets/rive/doodle-line.json'
import type { Look } from '../model/types'

/**
 * A side entrance's plan (written by its gen-scene.py): artboard geometry
 * and the travel, which the page reads frame by frame.
 */
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
  /** The frame of `Enter` it stands on its spot, if later than its travel stops (Shell is still afloat then). */
  stands?: number
}

/** A descent's plan (written by its gen-scene.py): artboard geometry and the landing's timing. */
export interface DescentPlan {
  fps: number
  artboard: { width: number; height: number }
  figureBox: { x: number; y: number; size: number }
  feetY: number
  /** Artboard y of the top of everything that comes down (the Defender's canopy). */
  contentTop: number
  /** One swing of `Descend`, which loops until `land` is set. */
  cycleFrames: number
  /** `Land`'s frames before the feet touch down, and the speed they do it at (artboard px a frame). */
  flareFrames: number
  touchdownSpeed: number
  /** All of `Land`: the flare, then settling. */
  landFrames: number
  shadow: { x: number; w: number }
}

/** An entrance that Rive plays wholly on the figure's spot (the Sprout's rise). */
export interface InPlacePlan {
  fps: number
  artboard: { width: number; height: number }
  figureBox: { x: number; y: number; size: number }
  /** When the figure first stands on its spot; the rest can play under the next card. */
  stands: number
  /** The full one-shot animation, after which the still figure takes over. */
  riseFrames: number
  /** [frame, opacity, width scale, x shift as a fraction of the tile]. */
  shadowKeys: number[][]
}

/** Doodle's looping ride and the crayon line the page carries it along. */
export interface DoodlePlan {
  fps: number
  artboard: { width: number; height: number }
  figureBox: { x: number; y: number; size: number }
  seat: Point
  shadow: { x: number; w: number }
  content: { left: number; right: number }
  line: { rise: number; descent: number; amplitude: number; wavelength: number; lead: number }
  cycle: { frames: number; travel: number }
  enter: { frames: number; travel: number[][] }
  /** The frame of `Enter` at which it touches down. */
  stands: number
}

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

export interface Point {
  x: number
  y: number
  /** A route may tilt the whole scene about its feet or seat. */
  rotation?: number
}

/** How far an entrance has to come, in artboard px. */
export interface Room {
  /** From the figure fully off its edge to its spot. */
  across: number
  /** From the route's resting anchor (feet or seat) to its source edge. */
  toEdge: number
  /** From its feet at rest up to the top of the map. */
  up: number
}

/** An entrance's way in, once the screen has said how far it has to come. */
export interface Route {
  /** Where it is, `frame` frames in: artboard px from its spot (it comes from the left, unless it backs in from the right, and up is back). */
  at: (frame: number) => Point
  /** The frame it stands on its spot. The next card can come while it settles. */
  arrived: number
  /** The frame it has settled, and hands over to the still figure. */
  end: number
  /** The machine's inputs, `frame` frames in (a gait walks in place until `arrive` is set). */
  inputs?: (frame: number) => Record<string, boolean>
  /** It would have to come further than it may, so it starts on the map, fading in. */
  fades: boolean
  /** A trail behind it: the route from where it started to where it is, in `at`'s terms; it fades from `fadeAt`. */
  trail?: {
    path: (frame: number) => Point[]
    fadeAt: number
    /** Fixed path length and the amount revealed, for a line drawn ahead of the figure. */
    length?: number
    reveal?: (frame: number) => number
  }
  /** Its shadow, if it isn't simply under its feet (a descent's waits on the ground, gathering as it comes down). */
  ground?: (frame: number) => { at: Point; opacity: number; scale: number; scaleY?: number }
}

export interface RiveEntrance {
  src: string
  fps: number
  /** The scene's artboard, and where the figure's tile sits on it, in artboard px. */
  board: { width: number; height: number; tile: { x: number; y: number; size: number } }
  /**
   * The map's figure is the scene's tile scaled by this about the middle of
   * its ground line, so the canvas is too, and the still figure that takes
   * over lines up with the last frame.
   */
  scale: number
  /** The edge it comes in from, in canvas space (a descent ignores this: it comes from above). */
  from: 'left' | 'right'
  /** Artboard x of the figure's leading edge: off the map when it starts. */
  reach: number
  /** Where its feet are at rest, in artboard px: a trail runs up to them, and a descent starts with them above the map. */
  feet?: Point
  /** How a route's trail is drawn. */
  trail?: 'stitches' | 'crayon'
  route: (room: Room) => Route
  /** The longest it takes, once it has started. */
  longestMs: number
}

/** Where the map's figures are scaled about (scripts/app-figures.py), as fractions of the tile. */
export const SCALED_ABOUT = { x: 0.5, y: 0.95 }

/**
 * The longest the Lantern's walk takes. A part further from its edge than
 * this allows starts on the map instead, fading in as it walks.
 */
const WALK_MAX_MS = 5000
/** Frames of Stop: braking (the travel's frames), then settling into Idle's first pose. */
const STOP_FRAMES = gait.stopTravel.length - 1 + gait.settleFrames

/**
 * The Lantern walks whole cycles, as many as it takes to start with the
 * figure (its leading edge is the lantern) fully off the map, or as many as
 * fit the longest walk, starting on the map. Rive walks it in place; the
 * page moves it at exactly the speed the gait was planned for, so the
 * planted foot stays put.
 */
function gaitRoute({ across: distance }: Room): Route {
  const stop = gait.stopTravel
  const most = Math.max(1, Math.floor(((WALK_MAX_MS / 1000) * gait.fps - STOP_FRAMES) / gait.cycleFrames))
  const cycles = Math.min(most, Math.max(1, Math.ceil((distance - stop[stop.length - 1]) / gait.cycleTravel)))
  const walkFrames = cycles * gait.cycleFrames
  const total = cycles * gait.cycleTravel + stop[stop.length - 1]
  const travelled = (frame: number) => {
    if (frame < walkFrames) return (frame / gait.cycleFrames) * gait.cycleTravel
    const at = Math.min(frame - walkFrames, stop.length - 1)
    const i = Math.floor(at)
    const next = stop[Math.min(i + 1, stop.length - 1)]
    return cycles * gait.cycleTravel + stop[i] + (next - stop[i]) * (at - i)
  }
  return {
    at: (frame) => ({ x: travelled(frame) - total, y: 0 }),
    // Braked to a stop; then it settles into Idle's first pose.
    arrived: walkFrames + stop.length - 1,
    end: walkFrames + STOP_FRAMES,
    // Any time in the last cycle: the machine finishes that cycle, then stops.
    inputs: (frame) => ({ arrive: frame >= walkFrames - gait.cycleFrames }),
    fades: total < distance,
  }
}

/** The first frame of keyed travel at which it has come all the way. */
function stillFrom(travel: number[][]) {
  const last = travel[travel.length - 1]
  return travel.find(([, ...values]) => values.every((value, i) => value === last[i + 1]))![0]
}

/**
 * The most a side entrance's stretching travel covers, in artboard px (a
 * little more than three of Curled's tiles). Its slides take the same time
 * however far they go, so further than this they'd look yanked: a part
 * further from its edge starts on the map, fading in as it comes.
 */
const STRETCH_MAX = 2000

/** The most cycles a side entrance's gait loops: with the travel out of the last, they fit the Lantern's longest walk. */
function cyclesMost(plan: SidePlan, cycle: NonNullable<SidePlan['cycle']>) {
  return Math.max(1, Math.floor(((WALK_MAX_MS / 1000) * plan.fps - stillFrom(plan.travel)) / cycle.frames))
}

/**
 * A side entrance with no gait (Curled, Shell): `Enter` plays from the
 * start, and the page reads its travel off the plan, the fixed part measured
 * from the edge and the rest stretched to the screen.
 *
 * One with a gait (Self-hug, the Stack, Ribbon, the Kaleidoscope) loops
 * `Approach` first: whole cycles, as many as come nearest the gait's own
 * travel, set `arrive` during the last, and the travel out of it carries on
 * at their speed. Its feet slip anyway, so the speed is fitted to the
 * screen, like the spike's. It takes at most `cyclesMost`, covering at
 * most half a cycle more than they would at its own pace: a part further
 * from its edge starts on the map, fading in.
 *
 * One whose plan comes from the right (the Kaleidoscope, which backs in)
 * travels the same distance the other way, from the far edge.
 */
function sideRoute(plan: SidePlan) {
  const [, fixedEnd, , cyclesEnd] = plan.travel[plan.travel.length - 1]
  // The frame of `Enter` it stands on its spot.
  const stands = plan.stands ?? stillFrom(plan.travel)
  const { cycle } = plan
  const dir = plan.from === 'right' ? -1 : 1
  if (!cycle)
    return ({ across: distance }: Room): Route => {
      const stretch = Math.min(STRETCH_MAX, Math.max(0, distance - fixedEnd))
      const total = fixedEnd + stretch
      return {
        at: (frame) => {
          const [fixed, fraction] = keyedAt(plan.travel, frame)
          return { x: dir * (fixed + fraction * stretch - total), y: 0 }
        },
        arrived: stands,
        end: plan.enterFrames,
        // Only if the cap bit: `total` comes back to `distance` only to rounding.
        fades: distance - fixedEnd > STRETCH_MAX,
      }
    }

  const most = cyclesMost(plan, cycle)
  return ({ across: distance }: Room): Route => {
    const rest = Math.max(0, distance - fixedEnd)
    const cycles = Math.min(most, Math.max(1, Math.round(rest / cycle.travel - cyclesEnd)))
    const furthest = (cycles + 0.5 + cyclesEnd) * cycle.travel
    const perCycle = Math.min(rest, furthest) / (cycles + cyclesEnd)
    const looping = cycles * cycle.frames
    const total = fixedEnd + (cycles + cyclesEnd) * perCycle
    const travelled = (frame: number) => {
      if (frame < looping) {
        const done = Math.floor(frame / cycle.frames)
        const [part] = keyedAt(cycle.profile, frame - done * cycle.frames)
        return (done + part) * perCycle
      }
      const [fixed, , more] = keyedAt(plan.travel, frame - looping)
      return fixed + (cycles + more) * perCycle
    }
    return {
      at: (frame) => ({ x: dir * (travelled(frame) - total), y: 0 }),
      arrived: looping + stands,
      end: looping + plan.enterFrames,
      // Any time in the last cycle: the machine finishes that cycle, then enters.
      inputs: (frame) => ({ arrive: frame >= looping - cycle.frames }),
      // Only if the cap bit: fitted to the screen, `total` is `distance` only to rounding.
      fades: rest > furthest,
    }
  }
}

/**
 * The most rocks the Map takes over both legs. Its stop at the corner and
 * its settling take 5 s whatever the route, so a part further away starts
 * on the map, fading in, rather than rocking on for longer.
 */
const ROCKS_MAX = 4

/**
 * The Map walks a planned route (art/rive/map-route/gen-scene.py): a
 * straight leg in from the edge `rise` further back in the meadow than its
 * spot, a stop at the corner to check the map, and a second leg slanting
 * forward to its spot, covering `lastLeg` of the way across. Rive rocks it
 * along in place (`Approach` loops, `Check` plays once `check` is set,
 * `Enter` once `arrive` is); the route fits whole rocks to each leg, so it
 * lands exactly, and reads the stop and the start off the plan in rocks'
 * travel, so they keep the gait's speed. A trail of stitches follows it.
 */
function mapRoute({ across: distance }: Room): Route {
  const { cycle, check, enter, route } = mapPlan
  const { rise, lastLeg } = route
  const checkTravel = check.travel[check.travel.length - 1][1]
  const enterTravel = enter.travel[enter.travel.length - 1][1]
  const pastCorner = checkTravel - check.corner
  // `Check` stops `corner` rocks' travel on (at the corner) and goes the rest
  // into the second leg; `Enter` stops its own travel on.
  const rocksFor = (across: number) => [
    Math.max(1, Math.round((across * (1 - lastLeg)) / cycle.travel - check.corner)),
    Math.max(1, Math.round(Math.hypot(across * lastLeg, rise) / cycle.travel - pastCorner - enterTravel)),
  ]
  const fits = (across: number) => rocksFor(across).reduce((a, b) => a + b) <= ROCKS_MAX
  // The furthest it may come: rocks only grow with the distance.
  let across = distance
  if (!fits(across)) {
    let [near, far] = [0, distance]
    for (let i = 0; i < 24; i++) {
      const mid = (near + far) / 2
      if (fits(mid)) near = mid
      else far = mid
    }
    across = near
  }

  const [firstRocks, secondRocks] = rocksFor(across)
  const lastAcross = across * lastLeg
  const first = across - lastAcross
  const second = Math.hypot(lastAcross, rise)
  const firstPer = first / (firstRocks + check.corner)
  const secondPer = second / (pastCorner + secondRocks + enterTravel)
  const checkAt = firstRocks * cycle.frames
  const secondAt = checkAt + check.frames
  const enterAt = secondAt + secondRocks * cycle.frames
  const arrived = enterAt + stillFrom(enter.travel)

  const rocks = (frame: number) => {
    const done = Math.floor(frame / cycle.frames)
    const [part] = keyedAt(cycle.profile, frame - done * cycle.frames)
    return done + part
  }
  // [leg, artboard px along it] at `frame`.
  const along = (frame: number): [number, number] => {
    if (frame < checkAt) return [1, rocks(frame) * firstPer]
    if (frame < secondAt) {
      const [t] = keyedAt(check.travel, frame - checkAt)
      return t <= check.corner ? [1, (firstRocks + t) * firstPer] : [2, (t - check.corner) * secondPer]
    }
    if (frame < enterAt) return [2, (pastCorner + rocks(frame - secondAt)) * secondPer]
    const [t] = keyedAt(enter.travel, frame - enterAt)
    return [2, (pastCorner + secondRocks + t) * secondPer]
  }
  const at = (frame: number): Point => {
    const [leg, s] = along(frame)
    return leg === 1 ? { x: s - across, y: -rise } : { x: -lastAcross * (1 - s / second), y: -rise * (1 - s / second) }
  }
  const start = { x: -across, y: -rise }
  const corner = { x: -lastAcross, y: -rise }

  return {
    at,
    arrived,
    end: enterAt + enter.frames,
    // Any time in a leg's last rock: the machine finishes the rock, then
    // stops. `check` is cleared again halfway through `Check`, well before
    // it hands back.
    inputs: (frame) => ({
      check: frame >= checkAt - cycle.frames && frame < checkAt + check.frames / 2,
      arrive: frame >= enterAt - cycle.frames,
    }),
    fades: across < distance,
    trail: {
      path: (frame) => (along(frame)[0] === 1 ? [start, at(frame)] : [start, corner, at(frame)]),
      fadeAt: arrived,
    },
  }
}

/** The most whole sways Doodle rides before its landing, fitting inside the Lantern's five-second cap. */
const DOODLE_SWAYS_MAX = 4
/** Artboard px of crayon line left under Doodle after its seat reaches the ground. */
const DOODLE_TAIL = 30
/** Artboard px between points on the crayon line. */
const DOODLE_STEP = 4
/** How much of the line's slope Doodle follows, and the greatest tilt (rad). */
const DOODLE_TILT = { share: 0.5, most: 0.2 }

/** The crayon line's height above the ground, `distance` artboard px before Doodle's spot. */
function doodleHeight(plan: DoodlePlan, distance: number) {
  if (distance <= 0) return 0
  const { rise, descent, amplitude, wavelength } = plan.line
  const ease = (edge: number) => {
    const t = Math.min(1, Math.max(0, distance / edge))
    return t * t * (3 - 2 * t)
  }
  return rise * ease(descent) + amplitude * Math.sin((2 * Math.PI * distance) / wavelength) * ease(0.6 * descent)
}

/**
 * Doodle rides a crayon line from its side's edge. The page draws the line,
 * reveals it a little ahead of the seat, carries and tilts the Rive canvas
 * along it, and leaves the ground shadow below. Rive loops whole `Ride`
 * sways, then glides and squashes through `Enter` when `arrive` is set.
 */
function doodleRoute(plan: DoodlePlan) {
  return ({ toEdge }: Room): Route => {
    // Long enough that both Doodle and the line ahead begin beyond the map.
    const begin = -(toEdge + plan.line.lead + 40)
    const xs: number[] = []
    for (let x = begin; x < 0; x += DOODLE_STEP) xs.push(x)
    // Make the resting point exact, independently of the sampling step.
    xs.push(0)
    for (let x = DOODLE_STEP; x < DOODLE_TAIL; x += DOODLE_STEP) xs.push(x)
    xs.push(DOODLE_TAIL)
    const heights = xs.map((x) => doodleHeight(plan, -x))
    const along = [0]
    for (let i = 1; i < xs.length; i++)
      along.push(along[i - 1] + Math.hypot(xs[i] - xs[i - 1], heights[i] - heights[i - 1]))
    const resting = along[xs.indexOf(0)]
    const glide = plan.enter.travel[plan.enter.travel.length - 1][1]
    const sways = Math.min(DOODLE_SWAYS_MAX, Math.max(1, Math.round(resting / plan.cycle.travel - glide)))
    // As with the side routes, the half-cycle margin bounds how much its
    // own pace can be stretched before it starts on the map and fades in.
    const furthest = (sways + 0.5 + glide) * plan.cycle.travel
    const ride = Math.min(resting, furthest)
    const start = resting - ride
    const perSway = ride / (sways + glide)
    const enterAt = sways * plan.cycle.frames

    const atArc = (distance: number) => {
      let i = along.findIndex((value) => value > distance)
      if (i <= 0) i = i === 0 ? 1 : along.length - 1
      const span = along[i] - along[i - 1]
      const t = span ? Math.min(1, Math.max(0, (distance - along[i - 1]) / span)) : 0
      return {
        x: xs[i - 1] + (xs[i] - xs[i - 1]) * t,
        y: -(heights[i - 1] + (heights[i] - heights[i - 1]) * t),
        rotation: Math.max(
          -DOODLE_TILT.most,
          Math.min(
            DOODLE_TILT.most,
            Math.atan2(heights[i - 1] - heights[i], xs[i] - xs[i - 1]) * DOODLE_TILT.share,
          ),
        ),
      }
    }
    const travelled = (frame: number) => {
      const done =
        frame < enterAt
          ? frame / plan.cycle.frames
          : sways + keyedAt(plan.enter.travel, frame - enterAt)[0]
      return Math.min(ride, done * perSway)
    }
    const startPoint = atArc(start)
    const firstAfterStart = along.findIndex((distance) => distance > start)
    const line = [startPoint, ...xs.slice(firstAfterStart).map((x, i) => ({ x, y: -heights[firstAfterStart + i] }))]
    const lineLength = along[along.length - 1] - start

    return {
      at: (frame) => atArc(start + travelled(frame)),
      arrived: enterAt + plan.stands,
      end: enterAt + plan.enter.frames,
      // Any time in the last sway: the machine finishes it, then enters.
      inputs: (frame) => ({ arrive: frame >= enterAt - plan.cycle.frames }),
      fades: resting > furthest,
      trail: {
        path: () => line,
        length: lineLength,
        reveal: (frame) => Math.min(lineLength, travelled(frame) + plan.line.lead),
        fadeAt: enterAt + plan.stands,
      },
      ground: (frame) => {
        const point = atArc(start + travelled(frame))
        const height = Math.min(1, Math.max(0, -point.y / plan.line.rise))
        return {
          at: { x: point.x, y: 0 },
          opacity: 1 - 0.7 * height,
          scale: 1 - 0.35 * height,
        }
      },
    }
  }
}

/** The most swings a descent takes, and how much faster than it was made to drift it may come down to fit them. */
const SWINGS_MAX = 2
const DRIFT_MAX = 2
/** Artboard px its feet start above the map. */
const ABOVE = 12

/**
 * A figure comes down from above (the Defender by parachute, the Sleeper
 * like a falling leaf): Rive sways it in place (`Descend` loops a swing
 * until `land` is set, then `Land` flares, touches down and settles). The
 * route drops it at a steady speed near `drift` artboard px a frame, fitted
 * to whole swings, eases to the touchdown speed through the flare and stops
 * dead on touchdown, so its feet meet the ground on the frame `Land` takes
 * over. It starts with its feet just above the map; further than whole
 * swings at twice its drift allow, it starts on the map, fading in. Its
 * shadow waits on the ground, gathering as it comes down.
 */
function descentRoute(plan: DescentPlan, drift: number, scale: number) {
  const { cycleFrames: cycle, flareFrames: flare, touchdownSpeed: touchdown } = plan
  return ({ up }: Room): Route => {
    const distance = up + ABOVE
    const cycles = Math.min(SWINGS_MAX, Math.max(1, Math.round((distance / drift - flare / 2) / cycle)))
    const swinging = cycles * cycle
    const fitted = (distance - (touchdown * flare) / 2) / (swinging + flare / 2)
    const speed = Math.min(fitted, drift * DRIFT_MAX)
    const total = speed * (swinging + flare / 2) + (touchdown * flare) / 2
    const descended = (frame: number) => {
      const travelled = speed * Math.min(frame, swinging)
      if (frame <= swinging) return travelled
      // Through the flare the speed eases (smoothstep) to the touchdown speed.
      const t = Math.min(frame - swinging, flare)
      const s = t / flare
      return travelled + touchdown * t + (speed - touchdown) * flare * (s - s ** 3 + s ** 4 / 2)
    }
    return {
      at: (frame) => ({ x: 0, y: descended(frame) - total }),
      arrived: swinging + flare,
      end: swinging + plan.landFrames,
      // Any time in the last swing: the machine finishes that swing, then lands.
      inputs: (frame) => ({ land: frame >= swinging - cycle }),
      // Only if the cap bit: fitted to the room, `total` is `distance` only to rounding.
      fades: fitted > speed,
      ground: gathering(plan, scale, (frame) => total - descended(frame)),
    }
  }
}

/** A descent's shadow: it waits on the ground, gathering as the feet come down to it (`above` artboard px above it). */
function gathering(plan: DescentPlan, scale: number, above: (frame: number) => number) {
  // The tile's width in artboard px at the map's scale: the shadow gathers over 0.7 of it.
  const gathers = (0.7 * plan.figureBox.size) / scale
  return (frame: number) => {
    const near = Math.max(0, 1 - above(frame) / gathers)
    return { at: { x: 0, y: 0 }, opacity: near ** 1.5, scale: 0.45 + 0.55 * near }
  }
}

/**
 * An entrance that stays on its final spot while Rive reveals it there. The
 * Sprout's scene lifts the mound and figure itself; the page only mirrors the
 * scene's changing ground shadow.
 */
function inPlaceRoute(plan: InPlacePlan) {
  return (): Route => ({
    at: () => ({ x: 0, y: 0 }),
    arrived: plan.stands,
    end: plan.riseFrames,
    fades: false,
    ground: (frame) => {
      const [opacity, scale, dx] = keyedAt(plan.shadowKeys, frame)
      return {
        at: { x: dx * plan.figureBox.size, y: 0 },
        opacity,
        scale,
        // The mound widens the shadow without making it taller.
        scaleY: 1,
      }
    },
  })
}

/**
 * The most `Fall` cycles the Pod takes (2.4 s, which covers a desktop map
 * at its spike's pace), and how fast it may already be falling as it comes
 * into view, as a share of its touchdown speed. A longer fall at that speed
 * would speed up too gently to read as a drop.
 */
const FALLS_MAX = 6
const FALL_START_MAX = 0.5

/**
 * The Pod drops (art/rive/pod-drop/gen-scene.py): Rive stretches it a
 * little in place (`Fall` loops a cycle until `land` is set, then `Land`
 * squashes it into its padding and lets it rise). Its squash was made for
 * one touchdown speed, so the route speeds it up evenly to exactly that,
 * from `start` of it as it comes into view, over whole cycles, and stops it
 * dead on touchdown: `Land` has no flare. A longer fall comes into view
 * already falling faster, up to `FALL_START_MAX`, rather than taking more
 * than `FALLS_MAX` cycles; further than that, it starts on the map, fading
 * in. Its shadow waits on the ground, gathering as it comes down.
 */
function fallRoute(plan: DescentPlan, start: number, scale: number) {
  const { cycleFrames: cycle, touchdownSpeed: touchdown } = plan
  return ({ up }: Room): Route => {
    const distance = up + ABOVE
    // Over whole cycles its mean speed is halfway from its start to touchdown.
    let cycles = Math.min(FALLS_MAX, Math.max(1, Math.round((2 * distance) / ((1 + start) * touchdown) / cycle)))
    // Never starting upwards: fewer cycles, falling faster.
    while (cycles > 1 && (2 * distance) / (cycles * cycle) < touchdown) cycles -= 1
    const falling = cycles * cycle
    const needed = (2 * distance) / falling - touchdown
    const from = Math.min(FALL_START_MAX * touchdown, Math.max(0, needed))
    const total = (falling * (from + touchdown)) / 2
    const descended = (frame: number) => {
      const f = Math.min(frame, falling)
      return from * f + ((touchdown - from) * f * f) / (2 * falling)
    }
    return {
      at: (frame) => ({ x: 0, y: descended(frame) - total }),
      arrived: falling,
      end: falling + plan.landFrames,
      // Any time in the last cycle: the machine finishes that cycle, then lands.
      inputs: (frame) => ({ land: frame >= falling - cycle }),
      // Only if the cap bit: fitted to the room, `total` is `distance` only to rounding.
      fades: needed > from,
      ground: gathering(plan, scale, (frame) => total - descended(frame)),
    }
  }
}

/** One that comes down from above, taking at most `cycles` of its plan's cycles before it lands. */
function descentEntrance(
  src: string,
  plan: DescentPlan,
  route: (room: Room) => Route,
  cycles: number,
  scale: number,
): RiveEntrance {
  return {
    src,
    fps: plan.fps,
    board: { width: plan.artboard.width, height: plan.artboard.height, tile: plan.figureBox },
    scale,
    from: 'left',
    // It comes from above: nothing reaches across.
    reach: 0,
    feet: { x: plan.figureBox.x + plan.figureBox.size / 2, y: plan.feetY },
    route,
    longestMs: ((cycles * plan.cycleFrames + plan.landFrames) / plan.fps) * 1000,
  }
}

function sideEntrance(src: string, plan: SidePlan, scale: number): RiveEntrance {
  const looping = plan.cycle ? cyclesMost(plan, plan.cycle) * plan.cycle.frames : 0
  const fromRight = plan.from === 'right'
  return {
    src,
    fps: plan.fps,
    board: { width: plan.artboard.width, height: plan.artboard.height, tile: plan.figureBox },
    scale,
    from: fromRight ? 'right' : 'left',
    reach: fromRight ? plan.content.left : plan.content.right,
    route: sideRoute(plan),
    longestMs: ((looping + plan.enterFrames) / plan.fps) * 1000,
  }
}

function inPlaceEntrance(src: string, plan: InPlacePlan, scale: number): RiveEntrance {
  return {
    src,
    fps: plan.fps,
    board: { width: plan.artboard.width, height: plan.artboard.height, tile: plan.figureBox },
    scale,
    // These are immaterial to an in-place route; the part's side still mirrors the whole scene.
    from: 'left',
    reach: 0,
    route: inPlaceRoute(plan),
    longestMs: (plan.riseFrames / plan.fps) * 1000,
  }
}

/**
 * The figures whose Rive entrance plays in the app. Those from the side
 * come in from their side's edge, and a part from the right is mirrored,
 * entrance and all; the Kaleidoscope backs in from its far edge, on either
 * side. Sprout stays on its spot while its scene rises out of the ground.
 */
const entrances = {
  // The Critic's walk. Its scene's figure is the map's own 640px tile.
  lantern: {
    src: new URL('../assets/rive/critic-walk.riv', import.meta.url).href,
    fps: gait.fps,
    board: { width: gait.artboard, height: gait.artboard, tile: { x: 0, y: 0, size: gait.artboard } },
    scale: figureScales.lantern,
    from: 'left',
    reach: gait.figureRight,
    route: gaitRoute,
    longestMs: WALK_MAX_MS,
  },
  // A mound heaves up on the spot; the Sprout pops out, lands and bows with its flower.
  sprout: inPlaceEntrance(
    new URL('../assets/rive/sprout-rise.riv', import.meta.url).href,
    risePlan,
    figureScales.sprout,
  ),
  // Curled peeks in, backs off, and comes in warily in three slides.
  curled: sideEntrance(new URL('../assets/rive/curled-peek.riv', import.meta.url).href, peekPlan, figureScales.curled),
  // Self-hug rocks in like a wind-up toy, then leans toward the space beside it.
  selfhug: sideEntrance(
    new URL('../assets/rive/selfhug-waddle.riv', import.meta.url).href,
    waddlePlan,
    figureScales.selfhug,
  ),
  // The Stack tiptoes in, stops, and catches its tower as it teeters.
  stack: sideEntrance(new URL('../assets/rive/stack-tiptoe.riv', import.meta.url).href, tiptoePlan, figureScales.stack),
  // Ribbon pirouettes in on one foot, hops one last turn and lands balanced.
  ribbon: sideEntrance(
    new URL('../assets/rive/ribbon-pirouette.riv', import.meta.url).href,
    pirouettePlan,
    figureScales.ribbon,
  ),
  // A felt wave washes Shell ashore and draws back, leaving it listening to its shell.
  shell: sideEntrance(new URL('../assets/rive/shell-wave.riv', import.meta.url).href, washPlan, figureScales.shell),
  // The Kaleidoscope backs in from its far edge, still looking through its scope, and bumps to a stop.
  kaleidoscope: sideEntrance(
    new URL('../assets/rive/kaleidoscope-backwards.riv', import.meta.url).href,
    wanderPlan,
    figureScales.kaleidoscope,
  ),
  // The Map rocks along a planned route, stops at the corner to check it, and leaves a stitched trail.
  map: {
    src: new URL('../assets/rive/map-route.riv', import.meta.url).href,
    fps: mapPlan.fps,
    board: { width: mapPlan.artboard.width, height: mapPlan.artboard.height, tile: mapPlan.figureBox },
    scale: figureScales.map,
    from: 'left',
    reach: mapPlan.content.right,
    feet: mapPlan.feet,
    trail: 'stitches',
    route: mapRoute,
    longestMs: ((ROCKS_MAX * mapPlan.cycle.frames + mapPlan.check.frames + mapPlan.enter.frames) / mapPlan.fps) * 1000,
  },
  // Doodle rides a crayon line that draws itself ahead, lands, and squashes gently into place.
  doodle: {
    src: new URL('../assets/rive/doodle-line.riv', import.meta.url).href,
    fps: doodlePlan.fps,
    board: { width: doodlePlan.artboard.width, height: doodlePlan.artboard.height, tile: doodlePlan.figureBox },
    scale: figureScales.doodle,
    from: 'left',
    reach: doodlePlan.content.right,
    feet: doodlePlan.seat,
    trail: 'crayon',
    route: doodleRoute(doodlePlan),
    longestMs: ((DOODLE_SWAYS_MAX * doodlePlan.cycle.frames + doodlePlan.enter.frames) / doodlePlan.fps) * 1000,
  },
  // The Defender floats down by parachute; it drifts at the speed its spike
  // showed (110 px/s for a 306px figure), in artboard px a frame.
  defender: descentEntrance(
    new URL('../assets/rive/defender-parachute.riv', import.meta.url).href,
    parachutePlan,
    descentRoute(parachutePlan, 3.8, figureScales.defender),
    SWINGS_MAX,
    figureScales.defender,
  ),
  // The Sleeper drifts down like a falling leaf, slower (90 px/s for a 306px figure).
  sleeper: descentEntrance(
    new URL('../assets/rive/sleeper-drift.riv', import.meta.url).href,
    driftPlan,
    descentRoute(driftPlan, 3.1, figureScales.sleeper),
    SWINGS_MAX,
    figureScales.sleeper,
  ),
  // The Pod drops, speeding up from a quarter of its touchdown speed like
  // its spike, and its padding swallows the landing.
  pod: descentEntrance(
    new URL('../assets/rive/pod-drop.riv', import.meta.url).href,
    dropPlan,
    fallRoute(dropPlan, 0.25, figureScales.pod),
    FALLS_MAX,
    figureScales.pod,
  ),
} satisfies Partial<Record<Look, RiveEntrance>>

type RiveLook = keyof typeof entrances

function isRiveLook(look: Look): look is RiveLook {
  return look in entrances
}

/** A figure's Rive entrance, if it has one in the app. */
export function riveEntranceOf(look: Look): RiveEntrance | undefined {
  return isRiveLook(look) ? entrances[look] : undefined
}

/** Whether a part with this figure enters on Rive. Reduced motion: never — it simply appears. */
export function entersOnRive(look: Look): boolean {
  return isRiveLook(look) && !window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/**
 * Each Rive entrance, loaded once when the map first shows, so a part named
 * later starts at once rather than after the runtime and its file load.
 * Missing until loaded (an entrance then loads its own).
 */
export function useRiveEntranceFiles(): Partial<Record<Look, RiveFile>> {
  const { riveFile: lantern } = useRiveFile({ src: entrances.lantern.src })
  const { riveFile: sprout } = useRiveFile({ src: entrances.sprout.src })
  const { riveFile: curled } = useRiveFile({ src: entrances.curled.src })
  const { riveFile: selfhug } = useRiveFile({ src: entrances.selfhug.src })
  const { riveFile: stack } = useRiveFile({ src: entrances.stack.src })
  const { riveFile: ribbon } = useRiveFile({ src: entrances.ribbon.src })
  const { riveFile: shell } = useRiveFile({ src: entrances.shell.src })
  const { riveFile: kaleidoscope } = useRiveFile({ src: entrances.kaleidoscope.src })
  const { riveFile: map } = useRiveFile({ src: entrances.map.src })
  const { riveFile: doodle } = useRiveFile({ src: entrances.doodle.src })
  const { riveFile: defender } = useRiveFile({ src: entrances.defender.src })
  const { riveFile: sleeper } = useRiveFile({ src: entrances.sleeper.src })
  const { riveFile: pod } = useRiveFile({ src: entrances.pod.src })
  return useMemo(
    () => ({
      ...(lantern && { lantern }),
      ...(sprout && { sprout }),
      ...(curled && { curled }),
      ...(selfhug && { selfhug }),
      ...(stack && { stack }),
      ...(ribbon && { ribbon }),
      ...(shell && { shell }),
      ...(kaleidoscope && { kaleidoscope }),
      ...(map && { map }),
      ...(doodle && { doodle }),
      ...(defender && { defender }),
      ...(sleeper && { sleeper }),
      ...(pod && { pod }),
    }),
    [lantern, sprout, curled, selfhug, stack, ribbon, shell, kaleidoscope, map, doodle, defender, sleeper, pod],
  )
}
