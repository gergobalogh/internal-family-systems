import { createLandscape, landscapeReducer } from '../model/landscape'
import type { LandscapeState } from '../model/types'
import { conversationReducer, startConversation } from './flow'
import type { ConversationEvent, ConversationState } from './flow'

/**
 * DEV ONLY: `?jump=after` starts at the closing card of a full run — two
 * linked parts, an unheard part, and a Turn 4b wish — so everything after the
 * entry conversation (docs/slice-4-handoff.md) can be tried without typing
 * the whole run. Ignored in production.
 *
 * The run is played through the real reducers, with scripted AI results:
 * fallback reflections, a confident "frustrated" toward-check, and a parse
 * of the 4b answer as one wish. Nothing is invented that the flow wouldn't
 * decide itself.
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
  'the worry',
  'the quiet one',
  'I wish the worry were further away',
]

export function jumpToClosing(): { conversation: ConversationState; landscape: LandscapeState } {
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
        case 'centrality':
          feed({ type: 'centralityChecked', seq, result: null })
          break
        case 'corrections': {
          const quote = job.request.correction
          feed({ type: 'corrected', seq, ops: [{ kind: 'wish', quote, refersTo: 'the worry', newName: '' }] })
          break
        }
      }
    }
  }

  for (const text of ANSWERS) {
    feed({ type: 'answer', text })
    settle()
  }
  return { conversation, landscape }
}
