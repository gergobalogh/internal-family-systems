import type {
  Action,
  Entry,
  LandscapeState,
  Layout,
  Link,
  Look,
  Mode,
  Part,
  Placement,
  Words,
} from './types'

export const HISTORY_LIMIT = 20
export const POSITION_MIN = 0.05
export const POSITION_MAX = 0.95
export const SCALE_MIN = 0.4
export const SCALE_MAX = 2.2
export const NAME_MAX_LENGTH = 40

export interface PartSeed {
  id: string
  name: string
  look: Look
  placement: Placement
}

export function createLandscape(seeds: PartSeed[]): LandscapeState {
  const parts: Record<string, Part> = {}
  const current: Layout = {}
  for (const seed of seeds) {
    parts[seed.id] = { id: seed.id, name: seed.name, look: seed.look, removed: false }
    current[seed.id] = clampPlacement(seed.placement)
  }
  return {
    parts,
    order: seeds.map((seed) => seed.id),
    layouts: { current, whatIf: null },
    links: {},
    mode: 'current',
    history: { current: [], whatIf: [] },
  }
}

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value))

export function clampPlacement(placement: Placement): Placement {
  return {
    x: clamp(placement.x, POSITION_MIN, POSITION_MAX),
    y: clamp(placement.y, POSITION_MIN, POSITION_MAX),
    scale: clamp(placement.scale, SCALE_MIN, SCALE_MAX),
  }
}

const samePlacement = (a: Placement, b: Placement) =>
  a.x === b.x && a.y === b.y && a.scale === b.scale

function sameLayout(a: Layout, b: Layout): boolean {
  const ids = Object.keys(a)
  return (
    ids.length === Object.keys(b).length &&
    ids.every((id) => b[id] !== undefined && samePlacement(a[id], b[id]))
  )
}

/** The layout for a mode; "What if" falls back to "How it is" before its fork. */
export function layoutFor(state: LandscapeState, mode: Mode): Layout {
  return mode === 'whatIf'
    ? (state.layouts.whatIf ?? state.layouts.current)
    : state.layouts.current
}

export interface VisiblePart {
  part: Part
  placement: Placement
}

/** Parts that are not removed, placed according to the active mode. */
export function visibleParts(state: LandscapeState): VisiblePart[] {
  const layout = layoutFor(state, state.mode)
  return state.order
    .map((id) => state.parts[id])
    .filter((part) => !part.removed)
    .map((part) => ({ part, placement: layout[part.id] }))
}

/** Links not taken down whose two parts are both on the map. */
export function visibleLinks(state: LandscapeState): Link[] {
  return Object.values(state.links).filter(
    (link) => !link.removed && link.between.every((id) => state.parts[id] && !state.parts[id].removed),
  )
}

/** Whether reverting `entry` would make a change the person can see. */
function isVisibleRevert(state: LandscapeState, entry: Entry): boolean {
  switch (entry.kind) {
    case 'place':
    case 'rename':
    case 'words':
      return !state.parts[entry.partId].removed
    case 'unlink':
      return state.links[entry.linkId].between.every((id) => !state.parts[id].removed)
    case 'remove':
    case 'reset':
      return true
  }
}

export function canUndo(state: LandscapeState): boolean {
  return state.history[state.mode].some((entry) => isVisibleRevert(state, entry))
}

function withLayout(state: LandscapeState, mode: Mode, layout: Layout): LandscapeState {
  return { ...state, layouts: { ...state.layouts, [mode]: layout } }
}

function withPart(state: LandscapeState, part: Part): LandscapeState {
  return { ...state, parts: { ...state.parts, [part.id]: part } }
}

/** The part with exactly these words (absent ones dropped). */
function withWords(part: Part, { voice, intent }: Words): Part {
  const { voice: _voice, intent: _intent, ...rest } = part
  return { ...rest, ...(voice !== undefined && { voice }), ...(intent !== undefined && { intent }) }
}

function withLink(state: LandscapeState, link: Link): LandscapeState {
  return { ...state, links: { ...state.links, [link.id]: link } }
}

function record(state: LandscapeState, entry: Entry): LandscapeState {
  const stack = [...state.history[state.mode], entry].slice(-HISTORY_LIMIT)
  return { ...state, history: { ...state.history, [state.mode]: stack } }
}

function revert(state: LandscapeState, entry: Entry): LandscapeState {
  switch (entry.kind) {
    case 'place': {
      const layout = layoutFor(state, state.mode)
      return withLayout(state, state.mode, { ...layout, [entry.partId]: entry.before })
    }
    case 'rename':
      return withPart(state, { ...state.parts[entry.partId], name: entry.before })
    case 'remove':
      return withPart(state, { ...state.parts[entry.partId], removed: false })
    case 'unlink':
      return withLink(state, { ...state.links[entry.linkId], removed: false })
    case 'words':
      return withPart(state, withWords(state.parts[entry.partId], entry.before))
    case 'reset':
      return withLayout(state, 'whatIf', entry.before)
  }
}

/**
 * Pops the active mode's stack. Entries whose revert would be invisible (e.g.
 * a move of a part since removed elsewhere) are applied and skipped past, so
 * one undo always changes something on screen.
 */
function undo(state: LandscapeState): LandscapeState {
  const stack = [...state.history[state.mode]]
  let next = state
  while (stack.length > 0) {
    const entry = stack.pop()!
    next = revert(next, entry)
    if (isVisibleRevert(next, entry)) break
  }
  return { ...next, history: { ...next.history, [state.mode]: stack } }
}

export function landscapeReducer(state: LandscapeState, action: Action): LandscapeState {
  switch (action.type) {
    case 'addPart': {
      const { id } = action.part
      if (state.parts[id]) return state
      // The name is kept verbatim: NAME_MAX_LENGTH bounds typed renames only.
      const placement = clampPlacement(action.placement)
      const whatIf = state.layouts.whatIf
      return {
        ...state,
        parts: { ...state.parts, [id]: { ...action.part, removed: false } },
        order: [...state.order, id],
        layouts: {
          current: { ...state.layouts.current, [id]: placement },
          whatIf: whatIf && { ...whatIf, [id]: placement },
        },
      }
    }

    case 'addLink': {
      if (state.links[action.link.id]) return state
      return withLink(state, { ...action.link, removed: false })
    }

    case 'unlink': {
      const link = state.links[action.linkId]
      if (!link || link.removed) return state
      return record(withLink(state, { ...link, removed: true }), { kind: 'unlink', linkId: link.id })
    }

    case 'setWords': {
      const part = state.parts[action.partId]
      if (!part) return state
      return withPart(state, withWords(part, action.words))
    }

    case 'clearWords': {
      const part = state.parts[action.partId]
      if (!part || part.removed || (part.voice === undefined && part.intent === undefined)) return state
      return record(withPart(state, withWords(part, {})), {
        kind: 'words',
        partId: part.id,
        before: { voice: part.voice, intent: part.intent },
      })
    }

    case 'enterWhatIf': {
      if (state.mode === 'whatIf') return state
      // Fork on first entry only; afterwards the "What if" layout is remembered.
      const whatIf = state.layouts.whatIf ?? { ...state.layouts.current }
      return { ...withLayout(state, 'whatIf', whatIf), mode: 'whatIf' }
    }

    case 'returnToCurrent':
      return state.mode === 'current' ? state : { ...state, mode: 'current' }

    case 'place': {
      const part = state.parts[action.partId]
      if (!part || part.removed) return state
      const layout = layoutFor(state, state.mode)
      const before = layout[action.partId]
      const placement = clampPlacement(action.placement)
      if (samePlacement(before, placement)) return state
      const next = withLayout(state, state.mode, { ...layout, [action.partId]: placement })
      return record(next, { kind: 'place', partId: action.partId, before })
    }

    case 'rename': {
      const part = state.parts[action.partId]
      const name = action.name.trim().slice(0, NAME_MAX_LENGTH)
      if (!part || part.removed || name === '' || name === part.name) return state
      return record(withPart(state, { ...part, name }), {
        kind: 'rename',
        partId: part.id,
        before: part.name,
      })
    }

    case 'remove': {
      const part = state.parts[action.partId]
      if (!part || part.removed) return state
      return record(withPart(state, { ...part, removed: true }), {
        kind: 'remove',
        partId: part.id,
      })
    }

    case 'resetWhatIf': {
      const whatIf = state.layouts.whatIf
      if (state.mode !== 'whatIf' || !whatIf) return state
      if (sameLayout(whatIf, state.layouts.current)) return state
      const next = withLayout(state, 'whatIf', { ...state.layouts.current })
      return record(next, { kind: 'reset', before: whatIf })
    }

    case 'undo':
      return undo(state)
  }
}
