import { describe, expect, it } from 'vitest'
import { demoParts } from './demo'
import {
  HISTORY_LIMIT,
  SCALE_MAX,
  canUndo,
  createLandscape,
  landscapeReducer,
  layoutFor,
  visibleParts,
} from './landscape'
import type { Action, LandscapeState } from './types'

const start = () => createLandscape(demoParts)
const run = (state: LandscapeState, ...actions: Action[]) =>
  actions.reduce(landscapeReducer, state)

const place = (partId: string, x: number, y: number, scale: number): Action => ({
  type: 'place',
  partId,
  placement: { x, y, scale },
})
const enter: Action = { type: 'enterWhatIf' }
const back: Action = { type: 'returnToCurrent' }
const undo: Action = { type: 'undo' }

const visibleIds = (state: LandscapeState) => visibleParts(state).map((v) => v.part.id)

describe('modes', () => {
  it('starts in "How it is" with all parts visible', () => {
    const state = start()
    expect(state.mode).toBe('current')
    expect(visibleIds(state)).toEqual(['critic', 'people-pleaser', 'exhausted-one'])
  })

  it('forks "What if" from "How it is" on first entry', () => {
    const state = run(start(), place('critic', 0.5, 0.5, 1), enter)
    expect(state.mode).toBe('whatIf')
    expect(state.layouts.whatIf).toEqual(state.layouts.current)
  })

  it('leaves "How it is" untouched after ten "What if" edits', () => {
    const before = run(start(), place('critic', 0.4, 0.4, 1.2))
    const snapshot = structuredClone(before.layouts.current)
    const after = run(
      before,
      enter,
      place('exhausted-one', 0.5, 0.5, 1),
      place('critic', 0.1, 0.1, 0.5),
      place('people-pleaser', 0.9, 0.2, 2),
      place('critic', 0.3, 0.7, 1.5),
      place('exhausted-one', 0.6, 0.4, 2),
      undo,
      place('people-pleaser', 0.2, 0.2, 0.8),
      { type: 'resetWhatIf' },
      place('critic', 0.8, 0.8, 0.9),
      place('exhausted-one', 0.5, 0.45, 1.9),
      back,
    )
    expect(after.mode).toBe('current')
    expect(after.layouts.current).toEqual(snapshot)
  })

  it('remembers the "What if" layout across re-entry', () => {
    const state = run(start(), enter, place('exhausted-one', 0.5, 0.5, 1), back, enter)
    expect(layoutFor(state, 'whatIf')['exhausted-one']).toEqual({ x: 0.5, y: 0.5, scale: 1 })
  })

  it('keeps layouts independent after the fork', () => {
    const state = run(start(), enter, back, place('critic', 0.3, 0.3, 0.6), enter)
    expect(layoutFor(state, 'whatIf').critic).toEqual(demoParts[0].placement)
  })

  it('resets "What if" from "How it is", undoably', () => {
    const edited = run(start(), enter, place('critic', 0.2, 0.2, 0.5))
    const reset = run(edited, { type: 'resetWhatIf' })
    expect(reset.layouts.whatIf).toEqual(reset.layouts.current)
    expect(run(reset, undo).layouts.whatIf).toEqual(edited.layouts.whatIf)
  })

  it('ignores reset when nothing differs', () => {
    const state = run(start(), enter)
    expect(run(state, { type: 'resetWhatIf' })).toBe(state)
  })
})

describe('undo', () => {
  it('restores the exact prior position and size', () => {
    const before = run(start(), enter)
    const after = run(before, place('exhausted-one', 0.5, 0.5, 1.4), undo)
    expect(after.layouts.whatIf).toEqual(before.layouts.whatIf)
  })

  it('works in "How it is" too', () => {
    const before = start()
    const after = run(before, place('critic', 0.5, 0.5, 0.9), undo)
    expect(after.layouts.current).toEqual(before.layouts.current)
  })

  it('is multi-level', () => {
    const before = run(start(), enter)
    const after = run(
      before,
      place('critic', 0.2, 0.2, 1),
      place('critic', 0.3, 0.3, 1),
      place('people-pleaser', 0.4, 0.4, 1),
      undo,
      undo,
      undo,
    )
    expect(after.layouts.whatIf).toEqual(before.layouts.whatIf)
    expect(canUndo(after)).toBe(false)
  })

  it('keeps a separate stack per mode', () => {
    const state = run(start(), place('critic', 0.3, 0.3, 1), enter, place('critic', 0.7, 0.7, 1))
    const undone = run(state, undo, undo)
    expect(undone.layouts.current.critic).toEqual({ x: 0.3, y: 0.3, scale: 1 })
    expect(undone.layouts.whatIf!.critic).toEqual({ x: 0.3, y: 0.3, scale: 1 })
    expect(canUndo(undone)).toBe(false)
    expect(canUndo(run(undone, back))).toBe(true)
  })

  it(`caps each stack at ${HISTORY_LIMIT} steps`, () => {
    let state = start()
    for (let i = 0; i < HISTORY_LIMIT + 5; i++) {
      state = run(state, place('critic', 0.1 + i * 0.01, 0.5, 1))
    }
    expect(state.history.current).toHaveLength(HISTORY_LIMIT)
  })

  it('records nothing for a no-op move', () => {
    const state = start()
    const same = run(state, { type: 'place', partId: 'critic', placement: demoParts[0].placement })
    expect(same).toBe(state)
  })

  it('clamps placements into the landscape', () => {
    const state = run(start(), place('critic', -1, 2, 99))
    expect(state.layouts.current.critic).toEqual({ x: 0.05, y: 0.95, scale: SCALE_MAX })
  })
})

describe('rename and remove', () => {
  it('renames globally and persists across mode flips', () => {
    const state = run(start(), enter, { type: 'rename', partId: 'critic', name: '  The Judge ' }, back)
    expect(state.parts.critic.name).toBe('The Judge')
    expect(run(state, enter).parts.critic.name).toBe('The Judge')
  })

  it('ignores empty renames', () => {
    const state = start()
    expect(run(state, { type: 'rename', partId: 'critic', name: '   ' })).toBe(state)
  })

  it('undoes a rename', () => {
    const state = run(start(), { type: 'rename', partId: 'critic', name: 'The Judge' }, undo)
    expect(state.parts.critic.name).toBe('The Critic')
  })

  it('removes a part from both modes, and it stays removed', () => {
    const state = run(start(), enter, { type: 'remove', partId: 'critic' })
    expect(visibleIds(state)).not.toContain('critic')
    const flipped = run(state, back, enter, back)
    expect(visibleIds(flipped)).not.toContain('critic')
    expect(run(flipped, place('critic', 0.5, 0.5, 1))).toBe(flipped)
  })

  it('removing before the fork keeps the part out of "What if"', () => {
    const state = run(start(), { type: 'remove', partId: 'critic' }, enter)
    expect(visibleIds(state)).not.toContain('critic')
  })

  it('undoing a removal restores the part where it was in both modes', () => {
    const moved = run(start(), place('critic', 0.3, 0.3, 1), enter, place('critic', 0.7, 0.7, 1.5))
    const restored = run(moved, { type: 'remove', partId: 'critic' }, undo)
    expect(visibleIds(restored)).toContain('critic')
    expect(restored.layouts.whatIf!.critic).toEqual({ x: 0.7, y: 0.7, scale: 1.5 })
    expect(run(restored, back).layouts.current.critic).toEqual({ x: 0.3, y: 0.3, scale: 1 })
  })

  it('skips past undo steps for a part removed in the other mode', () => {
    const state = run(
      start(),
      enter,
      place('people-pleaser', 0.4, 0.4, 1),
      place('critic', 0.2, 0.2, 1),
      back,
      { type: 'remove', partId: 'critic' },
      enter,
    )
    const undone = run(state, undo)
    expect(undone.layouts.whatIf!['people-pleaser']).toEqual(demoParts[1].placement)
    expect(canUndo(undone)).toBe(false)
  })

  it('reports nothing to undo when only invisible steps remain', () => {
    const state = run(
      start(),
      enter,
      place('critic', 0.2, 0.2, 1),
      back,
      { type: 'remove', partId: 'critic' },
      enter,
    )
    expect(canUndo(state)).toBe(false)
  })
})
