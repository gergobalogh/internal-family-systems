import type { Look, Mode } from '../model/types'

/** All on-screen wording in one place: short, calm, warm, non-clinical. */
export const copy = {
  modes: {
    current: {
      title: 'How it is',
      /** What size and place mean, from the moment the map is handed over. Draft copy. */
      hint: 'Size shows how much space a part takes up. Nearer the light, the closer it feels.',
    },
    whatIf: {
      title: 'What if…',
      hint: 'Try a different arrangement. How it is stays as it is.',
    },
  } satisfies Record<Mode, { title: string; hint: string }>,
  modeSwitch: 'Mode',
  undo: 'Undo',
  reset: 'Start over from how it is',
  /** In the top bar after the conversation, "How it is" only. Draft copy. */
  addPart: 'Add a part',
  /** In the top bar after a full run, "What if…" only. Draft copy. */
  tryExperiment: 'Try an experiment',
  hedge: 'one way to see this',
  rename: 'Rename',
  /** Size in the part's box, in both modes: the same step as the plus and minus keys. Draft copy. */
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
  /** In "What if…", in place of Rename, Not one of my parts and Clear what it said: experiments never change who a part is. Draft copy. */
  changeInHowItIs: 'To rename or remove it, go back to How it is.',
  /** Get to know it (docs/slice-4-handoff.md). Draft copy. */
  getToKnow: 'Get to know it',
  /** Clears a part's voice and intent from the map. Draft copy. */
  clearWords: 'Clear what it said',
  /** Before a part's intent, in its selected box. Draft copy. */
  intentLabel: 'might be trying to:',
  /** The ending's picture to keep, for screen readers. Draft copy. */
  postcardAlt: (names: readonly string[], date: string) => `A picture of your meadow at dusk, with ${names.join(', ')}, ${date}`,
  removed: 'Taken off the map.',
  empty: 'No parts on the map right now.',
  partLabel: (name: string) => `${name}, one way to see this`,
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
    /** After the entry conversation (docs/slice-4-handoff.md). Draft copy. */
    notNow: 'Not now',
    letsTry: "Let's try",
    triedIt: "I've tried it",
    /** After "Nothing's moved yet". Draft copy. */
    keepTrying: 'Keep trying',
    finishUntried: 'Finish without changes',
    /** Noticing's way out: it won't ask about this part again, so not "Not now". Draft copy. */
    skip: 'Skip this one',
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
    /** In "What if…", in place of Remove this link. Draft copy. */
    removeInHowItIs: 'To take it down, go back to How it is.',
    removed: 'Link taken down.',
  },
}
