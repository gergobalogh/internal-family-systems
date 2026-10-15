/** "current" is shown as "How it is"; "whatIf" as "What if…". */
export type Mode = 'current' | 'whatIf'

/** Which sculpted figure stands for a part; consistent across modes and scales. */
export type Look = 'lantern' | 'sprout' | 'sleeper'

/**
 * A part's identity. Shared by both modes: renaming or removing a part is a
 * correction of the map, never a "What if" experiment.
 */
export interface Part {
  id: string
  name: string
  look: Look
  /** Tombstone — a removed part keeps its placements so undo can restore it. */
  removed: boolean
  /** Get to know it: what the part would say, in the person's words. */
  voice?: string
  /** …and what it might be trying to do for them, in their words. */
  intent?: string
}

/** A part's words from Get to know it; each is the person's answer, verbatim. */
export type Words = Pick<Part, 'voice' | 'intent'>

/** Where a part sits in one mode. x/y are normalized to the landscape (0–1). */
export interface Placement {
  x: number
  y: number
  scale: number
}

export type Layout = Record<string, Placement>

/**
 * A relationship the conversation recorded between two parts (today only
 * Turn 2's "pulling in different directions"). Shared by both modes, like a
 * part's identity. Drawn while both parts are on the map.
 */
export interface Link {
  id: string
  between: [string, string]
  /** Tombstone — explicitly taken down; undo brings it back. */
  removed: boolean
}

/** Inverse of one mutation, recorded on the stack of the mode it was made in. */
export type Entry =
  | { kind: 'place'; partId: string; before: Placement }
  | { kind: 'rename'; partId: string; before: string }
  | { kind: 'remove'; partId: string }
  | { kind: 'unlink'; linkId: string }
  | { kind: 'words'; partId: string; before: Words }
  | { kind: 'reset'; before: Layout }

export interface LandscapeState {
  parts: Record<string, Part>
  /** Stable display and tab order. */
  order: string[]
  layouts: {
    current: Layout
    /** Null until "What if" is first entered; independent of `current` after that. */
    whatIf: Layout | null
  }
  links: Record<string, Link>
  mode: Mode
  history: Record<Mode, Entry[]>
}

export type Action =
  /**
   * A part comes into existence from the person's own words (the entry
   * conversation), not from a map gesture: it records no undo entry, and
   * lands at the same spot in both layouts.
   */
  | { type: 'addPart'; part: Omit<Part, 'removed'>; placement: Placement }
  /** Like addPart, a link comes from the conversation: no undo entry. */
  | { type: 'addLink'; link: Omit<Link, 'removed'> }
  /**
   * A part's words, from the conversation (Get to know it): no undo entry.
   * Replaces both — a new voice starts without the old intent.
   */
  | { type: 'setWords'; partId: string; words: Words }
  /** The person clears a part's words from the map: undoable. */
  | { type: 'clearWords'; partId: string }
  | { type: 'unlink'; linkId: string }
  | { type: 'enterWhatIf' }
  | { type: 'returnToCurrent' }
  | { type: 'place'; partId: string; placement: Placement }
  | { type: 'rename'; partId: string; name: string }
  | { type: 'remove'; partId: string }
  | { type: 'resetWhatIf' }
  | { type: 'undo' }
