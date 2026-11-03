import type { Look } from '../model/types'

/** All on-screen wording in one place: short, calm, warm, non-clinical. */
export const copy = {
  undo: 'Undo',
  /** Rename: the selected part's name is the button. */
  rename: (name: string) => `Rename ${name}`,
  /** The "…" on a selected part: Change figure and Not one of my parts. */
  more: (name: string) => `More for ${name}`,
  /** Size in the part's box, also in Act 3's "what if": the same step as the plus and minus keys. Draft copy. */
  smaller: 'Smaller',
  larger: 'Larger',
  sizeLabel: (name: string) => `Size of ${name}`,
  /** JEV's pick is an interpretation; the person has the last word on how a part looks. Draft copy. */
  changeFigure: 'Change figure',
  figureChoices: (name: string) => `Figures for ${name}`,
  keepFigure: 'Keep this one',
  /** Each figure by what it looks like, never by a role ("the Critic"): the person decides what it means. */
  figureLabels: {
    lantern: 'A figure holding a lantern',
    sprout: 'A figure with a sprout on its head, holding a flower',
    sleeper: 'A figure asleep on a cushion',
    defender: 'A figure with its arms spread wide',
    pod: 'A figure wrapped in a soft pod',
    curled: 'A figure hugging its knees',
    selfhug: 'A figure hugging itself',
    ribbon: 'A figure twirling a ribbon',
    kaleidoscope: 'A figure looking through a kaleidoscope',
    stack: 'A figure balancing a stack of blocks',
    map: 'A figure reading a map',
    doodle: 'A figure drawing',
    shell: 'A figure holding a shell',
  } satisfies Record<Look, string>,
  renameLabel: (name: string) => `New name for ${name}`,
  renamePlaceholder: 'What would you call it?',
  remove: 'Not one of my parts',
  /** Behind the "…" when a part has words: clears its voice and intent from the map (Undo brings them back). Draft copy. */
  clearWords: 'Clear what it said',
  /** Before a part's intent, in its selected box. Draft copy. */
  intentLabel: 'might be trying to:',
  /** The ending's picture to keep, for screen readers. Draft copy. */
  postcardAlt: (names: readonly string[], date: string) => `A picture of your meadow at dusk, with ${names.join(', ')}, ${date}`,
  removed: 'Taken off the map.',
  empty: 'No parts on the map right now.',
  /** A figure offered at Act 2's first question. Draft copy. */
  offeredLabel: (name: string) => `Give ${name} your attention`,
  partHint: 'Drag, or use the arrow keys, to move. Plus and minus change its size.',
  /** Conversation chrome. The guide's own lines live in src/conversation/script.ts. */
  talk: {
    label: 'Conversation',
    replyLabel: 'Your answer',
    /** The group of choice buttons copied from the free-write (Turn 1 and Turn 3). */
    feelingChoices: 'Feelings mentioned in your words',
    send: 'Send',
    waiting: 'One moment…',
    /** Turn 3's quiet way out, beside Send: "You also mentioned these…" and the quieter question. Draft copy. */
    noOneElse: 'No one else',
    quieterNo: "I don't think so",
    /** Act 1's close: on to Act 2. Draft copy. */
    goOn: 'Go on',
    /** Act 2: Fears' way out (it goes on to the thanks), and the thanks. Draft copy. */
    skipFears: 'Skip',
    notYet: 'Not yet',
    thankIt: 'Thank it',
    /** Act 3: the step back, and the "what if" at dusk. Draft copy. */
    thatsHowItIs: "That's how it is",
    goBack: 'Go back',
    keepIt: 'Keep it',
    done: 'Done',
    keepPicture: 'Keep this picture',
    someoneNew: 'Someone new',
    startOver: 'Start over',
    welcomeChoices: 'Who to sit with',
    close: 'Close',
    closeLabel: 'Close the conversation',
    notNow: 'Not now',
    /** Noticing's way out: it won't ask about this part again, so not "Not now". Draft copy. */
    skip: 'Skip this one',
    enough: "That's enough for now",
    support: 'Find support near you',
    supportLabel: 'Find support near you (opens a helpline directory in a new tab)',
  },
  /** The tension link between two parts (Turn 2's pairing). */
  link: {
    label: (a: string, b: string) => `${a} and ${b}, pulling in different directions`,
    words: 'pulling in different directions',
    remove: 'Remove this link',
    removed: 'Link taken down.',
  },
}
