import type { PartSeed } from './landscape'

/**
 * Slice 1's placeholder landscape, now only the fixture for
 * landscape.test.ts. The real cast comes out of the entry conversation;
 * three parts is illustrative, not a product rule.
 * Meaning is carried by size and distance from centre, not left/right.
 * Positions put the figures on the meadow plate's ground, around its pool of
 * light (lower than the frame's middle).
 */
export const demoParts: PartSeed[] = [
  {
    id: 'critic',
    name: 'The Critic',
    look: 'lantern',
    placement: { x: 0.47, y: 0.58, scale: 1.8 },
  },
  {
    id: 'people-pleaser',
    name: 'The People-Pleaser',
    look: 'sprout',
    placement: { x: 0.68, y: 0.68, scale: 1.1 },
  },
  {
    id: 'exhausted-one',
    name: 'The Exhausted One',
    look: 'sleeper',
    placement: { x: 0.15, y: 0.84, scale: 0.8 },
  },
]
