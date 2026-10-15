import type { Mode } from '../model/types'

/** All on-screen wording in one place: short, calm, warm, non-clinical. */
export const copy = {
  modes: {
    current: {
      title: 'How it is',
      hint: 'Arrange these as they feel right now.',
    },
    whatIf: {
      title: 'What if…',
      hint: 'Try a different arrangement. How it is stays as it is.',
    },
  } satisfies Record<Mode, { title: string; hint: string }>,
  modeSwitch: 'Mode',
  undo: 'Undo',
  reset: 'Start over from how it is',
  hedge: 'one way to see this',
  rename: 'Rename',
  renameLabel: (name: string) => `New name for ${name}`,
  renamePlaceholder: 'What would you call it?',
  remove: 'Not one of my parts',
  /** Get to know it (docs/slice-4-handoff.md). Draft copy. */
  getToKnow: 'Get to know it',
  /** Clears a part's voice and intent from the map. Draft copy. */
  clearWords: 'Clear what it said',
  /** Before a part's intent, in its selected box. Draft copy. */
  intentLabel: 'might be trying to:',
  removed: 'Taken off the map.',
  empty: 'No parts on the map right now.',
  partLabel: (name: string) => `${name}, one way to see this`,
  partHint: 'Drag, or use the arrow keys, to move. Plus and minus change its size.',
  /** Conversation chrome. The guide's own lines live in src/conversation/script.ts. */
  talk: {
    label: 'Conversation',
    replyLabel: 'Your answer',
    send: 'Send',
    waiting: 'One moment…',
    /** Turn 4b: same weight as Send, never more — the app doesn't invite agreement. */
    noChanges: 'No changes',
    close: 'Close',
    closeLabel: 'Close the conversation',
    /** After the entry conversation (docs/slice-4-handoff.md). Draft copy. */
    notNow: 'Not now',
    letsTry: "Let's try",
    triedIt: "I've tried it",
    enough: "That's enough for now",
    support: 'Find support near you',
    supportLabel: 'Find support near you (opens a helpline directory in a new tab)',
  },
  /** The summary note a full conversation leaves on the map (MapNote). */
  note: {
    label: 'What the map shows, one way to see this',
    hint: 'Drag, or use the arrow keys, to move this note.',
  },
  /** The tension link between two parts (Turn 2's pairing). */
  link: {
    label: (a: string, b: string) => `${a} and ${b}, pulling in different directions, one way to see this`,
    words: 'pulling in different directions',
    remove: 'Remove this link',
    removed: 'Link taken down.',
  },
}
