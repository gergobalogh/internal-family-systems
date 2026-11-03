import { createLandscape, landscapeReducer } from '../model/landscape'
import { LOOKS } from '../model/types'
import type { LandscapeState, Look } from '../model/types'
import { conversationReducer, startConversation } from './flow'
import type { ConversationEvent, ConversationState } from './flow'
import type { PartKind } from './contract'

/**
 * DEV ONLY: `?jump=after` starts at Act 1's close of a full run — two
 * linked parts, "These are the ones who came." and Go on — so everything
 * after the entry conversation (docs/slice-4-handoff.md) can be tried
 * without typing the whole run. Ignored in production.
 *
 * The run is played through the real reducers, with scripted AI results:
 * fallback reflections, a confident "frustrated" toward-check, and the
 * figures JEV picks for these names. Nothing is invented that the flow
 * wouldn't decide itself.
 */
export const jumpRequested =
  import.meta.env.DEV && new URLSearchParams(window.location.search).get('jump') === 'after'

/** An event before the map snapshot is attached. */
type WithoutMap<E> = E extends unknown ? Omit<E, 'map'> : never

const ANSWERS = [
  'Work has been a lot lately, and I keep replaying everything I said in meetings.',
  'the worry',
  "honestly I can't stand it",
  'the one who yells',
  // Turn 3, the quieter question: nobody.
  'no',
]

/** What JEV picks for the scripted names (Map, Defender). */
const FIGURES: Record<string, Look> = { 'the worry': 'map', 'the one who yells': 'defender' }

const certain = (look: Look) => ({
  label: look,
  probabilities: Object.fromEntries(LOOKS.map((each) => [each, each === look ? 1 : 0])) as Record<Look, number>,
})

const certainKind = (kind: PartKind) => ({
  label: kind,
  probabilities: { guards: kind === 'guards' ? 1 : 0, escapes: kind === 'escapes' ? 1 : 0, hurts: kind === 'hurts' ? 1 : 0, other: kind === 'other' ? 1 : 0 },
})

export function jumpToClose(): { conversation: ConversationState; landscape: LandscapeState } {
  let conversation = startConversation()
  let landscape = createLandscape([])

  const feed = (event: WithoutMap<ConversationEvent>) => {
    const applied = conversation.effects.length
    conversation = conversationReducer(conversation, { ...event, map: landscape } as ConversationEvent)
    for (const action of conversation.effects.slice(applied)) landscape = landscapeReducer(landscape, action)
  }

  /** Resolves whatever the flow is waiting on, as scripted. */
  const settle = () => {
    for (let job = conversation.pending; job; job = conversation.pending) {
      const { seq } = job
      switch (job.kind) {
        case 'freeWrite':
          feed({ type: 'freeWriteRead', seq, result: null })
          break
        case 'risk':
          feed({ type: 'riskChecked', seq, atRisk: false })
          break
        case 'reflect':
          feed({ type: 'reflected', seq, text: null })
          break
        case 'towardCheck':
          feed({
            type: 'towardChecked',
            seq,
            result: {
              label: 'frustrated_critical',
              probabilities: { warm_curious: 0.04, frustrated_critical: 0.92, unclear: 0.04 },
            },
          })
          break
        case 'figure':
          // Scripted pass-through: short names come back unchanged.
          feed({
            type: 'figured',
            seq,
            result: { figure: certain(FIGURES[job.request.name]), kind: certainKind('guards') },
            extracted: job.request.name,
          })
          break
      }
    }
  }

  for (const text of ANSWERS) {
    feed({ type: 'answer', text })
    settle()
  }
  return { conversation, landscape }
}
