import curled from '../assets/figures/figure-curled.webp'
import curledBlink from '../assets/figures/figure-curled-blink.webp'
import defender from '../assets/figures/figure-defender.webp'
import defenderBlink from '../assets/figures/figure-defender-blink.webp'
import doodle from '../assets/figures/figure-doodle.webp'
import doodleBlink from '../assets/figures/figure-doodle-blink.webp'
import kaleidoscope from '../assets/figures/figure-kaleidoscope.webp'
import lanternArm from '../assets/figures/figure-lantern-arm.webp'
import lanternBase from '../assets/figures/figure-lantern-base.webp'
import lanternBlink from '../assets/figures/figure-lantern-blink.webp'
import map from '../assets/figures/figure-map.webp'
import mapBlink from '../assets/figures/figure-map-blink.webp'
import pod from '../assets/figures/figure-pod.webp'
import podBlink from '../assets/figures/figure-pod-blink.webp'
import ribbon from '../assets/figures/figure-ribbon.webp'
import ribbonBlink from '../assets/figures/figure-ribbon-blink.webp'
import selfhug from '../assets/figures/figure-selfhug.webp'
import selfhugBlink from '../assets/figures/figure-selfhug-blink.webp'
import shell from '../assets/figures/figure-shell.webp'
import sleeper from '../assets/figures/figure-sleeper.webp'
import sleeperBlink from '../assets/figures/figure-sleeper-blink.webp'
import sprout from '../assets/figures/figure-sprout.webp'
import sproutBlink from '../assets/figures/figure-sprout-blink.webp'
import stack from '../assets/figures/figure-stack.webp'
import stackBlink from '../assets/figures/figure-stack-blink.webp'
import type { Look } from '../model/types'

export { lanternArm }

/**
 * Sculpted figures for parts: felted, tactile, gentle — never photoreal, never
 * a villain or a joke. Each pose hints at a strategy (watching, offering,
 * resting) without declaring what the part "is". All share one square box at
 * a common scale, feet on a ground line at 95% of its height
 * (scripts/cutout-figures.py for the first three, scripts/app-figures.py for
 * the rest, sized to the same felt area).
 */
export const figureSources: Record<Look, string> = {
  lantern: lanternBase,
  sprout,
  sleeper,
  defender,
  pod,
  curled,
  selfhug,
  ribbon,
  kaleidoscope,
  stack,
  map,
  doodle,
  shell,
}
/** Closed-eye overlays. The Kaleidoscope's scope hides the eye it would close, and Shell's are shut. */
export const blinkSources: Partial<Record<Look, string>> = {
  lantern: lanternBlink,
  sprout: sproutBlink,
  sleeper: sleeperBlink,
  defender: defenderBlink,
  pod: podBlink,
  curled: curledBlink,
  selfhug: selfhugBlink,
  ribbon: ribbonBlink,
  stack: stackBlink,
  map: mapBlink,
  doodle: doodleBlink,
}

/** A figure's still layers, back to front (the Lantern's arm over its body): for drawing it elsewhere, like the picture to keep. */
export const figureLayers = (look: Look): string[] => (look === 'lantern' ? [figureSources.lantern, lanternArm] : [figureSources[look]])
