import { useId, useLayoutEffect, useRef, useState } from 'react'
import type { ChangeEvent, KeyboardEvent, MouseEvent, RefObject } from 'react'
import { ANSWERED_STEPS } from '../conversation/flow'
import type { ConversationState, Line, Step } from '../conversation/flow'
import type { Talk } from '../conversation/useConversation'
import { copy } from './copy'
import type { Phase } from './useChoreography'

/** The safety path's link: an international directory of helplines (checked reachable 2026-10-15). */
export const SUPPORT_URL = 'https://findahelpline.com/'

/** What the person can do on a card, from the conversation hook. */
type CardActions = Pick<Talk, 'answer' | 'noChanges' | 'dismiss' | 'decline' | 'accept' | 'tried'>

interface ConversationProps {
  state: ConversationState
  /** Index of the first line of the card on screen, or null for none (see useChoreography). */
  shown: number | null
  phase: Phase
  actions: CardActions
}

/** The guide's lines on a card: from its first line up to the person's answer. */
function cardLines(lines: readonly Line[], start: number | null): Line[] {
  const card: Line[] = []
  if (start === null) return card
  for (const line of lines.slice(start)) {
    if (line.speaker === 'person') break
    card.push(line)
  }
  return card
}

/**
 * The conversation as one glass card under the house
 * (docs/input-choreography-plan.md): the reflection and the current
 * question together, then the field. No history — past answers are
 * reachable through the map (rename, remove), never a hidden transcript.
 * After the entry conversation the same card carries the guide's
 * invitations and questions (docs/slice-4-handoff.md), or nothing at all.
 */
export function Conversation({ state, shown, phase, actions }: ConversationProps) {
  const lines = cardLines(state.lines, shown)
  const current = shown === state.card && phase === 'card'
  // Announced underneath any animation: the wait, then each new card.
  const announcement = shown === null ? '' : phase === 'card' ? lines.map((line) => line.text).join(' ') : copy.talk.waiting

  return (
    <>
      <p className="visually-hidden" aria-live="polite">
        {announcement}
      </p>
      {shown !== null && (
        <div className="card-slot">
          <Card key={shown} lines={lines} step={state.step} phase={phase} current={current} actions={actions} />
        </div>
      )}
    </>
  )
}

interface CardProps {
  lines: Line[]
  /** The conversation's step when this card appeared. */
  step: Step
  phase: Phase
  /** This card is the conversation's current one, and settled on screen. */
  current: boolean
  actions: CardActions
}

function Card({ lines, step: stepNow, phase, current, actions }: CardProps) {
  // The card keeps its own shape while it ghosts: no layout jump.
  const [step] = useState(stepNow)
  const cardRef = useRef<HTMLElement>(null)
  const slim = step === 'trying'

  return (
    <section
      ref={cardRef}
      className={`card${slim ? ' card--slim' : ''}${phase === 'waiting' ? ' is-waiting' : ''}${phase === 'arriving' ? ' is-away' : ''}`}
      aria-label={copy.talk.label}
      aria-busy={phase !== 'card'}
    >
      <div className="card__lines">
        {lines.map((line) => (
          <p key={line.id} className="card__line">
            {line.text}
          </p>
        ))}
      </div>

      {ANSWERED_STEPS.includes(step) ? (
        <Reply step={step} phase={phase} interactive={current} cardRef={cardRef} actions={actions} />
      ) : (
        <div className="card__actions">
          {step === 'invite' && (
            <>
              {/* Equal weight: the app doesn't lean toward yes. */}
              <button type="button" className="card__button card__button--quiet" disabled={!current} onClick={actions.decline}>
                {copy.talk.notNow}
              </button>
              <button type="button" className="card__button card__button--quiet" disabled={!current} onClick={actions.accept}>
                {copy.talk.letsTry}
              </button>
            </>
          )}
          {step === 'trying' && (
            <button type="button" className="card__button card__button--quiet" disabled={!current} onClick={actions.tried}>
              {copy.talk.triedIt}
            </button>
          )}
          {step === 'paused' && (
            <a className="card__button" href={SUPPORT_URL} target="_blank" rel="noopener noreferrer" aria-label={copy.talk.supportLabel}>
              {copy.talk.support}
            </a>
          )}
          {(step === 'closed' || step === 'paused') && (
            <button type="button" className="card__button card__button--quiet" aria-label={copy.talk.closeLabel} onClick={actions.dismiss}>
              {copy.talk.close}
            </button>
          )}
        </div>
      )}
    </section>
  )
}

interface ReplyProps {
  step: Step
  phase: Phase
  interactive: boolean
  cardRef: RefObject<HTMLElement | null>
  actions: CardActions
}

/** The field and its buttons, for a question that waits for a typed answer. */
function Reply({ step, phase, interactive, cardRef, actions }: ReplyProps) {
  const [draft, setDraft] = useState('')
  const fieldRef = useRef<HTMLTextAreaElement>(null)
  const fieldId = useId()

  /** The line break about to be typed came from Shift+Enter. */
  const shiftBreak = useRef(false)

  // A new question takes focus only if the person isn't busy on the map —
  // or just asked for this card (Get to know it). Layout effect: the old
  // card's field (still focused, so a phone keyboard stays up) is removed in
  // this same commit, and refocusing in the same task is what keeps that
  // keyboard up; a phone won't raise it outside a tap.
  useLayoutEffect(() => {
    const active = document.activeElement
    const idle =
      !active ||
      active === document.body ||
      cardRef.current?.contains(active) ||
      (active instanceof HTMLElement && active.dataset.opensCard !== undefined)
    if (interactive && idle) fieldRef.current?.focus()
  }, [interactive, cardRef])

  // The sent answer stays in the ghosted field while the world waits.
  const submit = (text: string) => {
    if (interactive) actions.answer(text)
  }

  // Enter sends; Shift+Enter adds a line.
  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key !== 'Enter' || event.nativeEvent.isComposing) return
    shiftBreak.current = event.shiftKey
    if (event.shiftKey) return
    event.preventDefault()
    submit(draft)
  }

  // Phone keyboards don't always report Enter as a key: a line break typed
  // without Shift sends too, without the break.
  const onChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    const field = event.target
    const { inputType } = event.nativeEvent as InputEvent
    const typedBreak = (inputType === 'insertLineBreak' || inputType === 'insertParagraph') && !shiftBreak.current
    shiftBreak.current = false
    if (!typedBreak) {
      setDraft(field.value)
      return
    }
    const at = field.selectionStart
    const text = field.value.slice(0, at - 1) + field.value.slice(at)
    setDraft(text)
    submit(text)
  }

  // Tapping a button keeps focus in the field, so a phone keyboard stays up.
  const keepFocus = (event: MouseEvent) => event.preventDefault()

  /** The quiet way out beside Send, at the same weight (never more). */
  const aside =
    step === 'confirm'
      ? { label: copy.talk.noChanges, onClick: () => actions.noChanges(copy.talk.noChanges) }
      : step === 'intent'
        ? { label: copy.talk.enough, onClick: actions.decline }
        : step === 'experiment' || step === 'voice' || step === 'noticing'
          ? { label: copy.talk.notNow, onClick: actions.decline }
          : null

  return (
    <form
      className="card__reply"
      onSubmit={(event) => {
        event.preventDefault()
        submit(draft)
      }}
    >
      <label className="visually-hidden" htmlFor={fieldId}>
        {copy.talk.replyLabel}
      </label>
      <textarea
        id={fieldId}
        ref={fieldRef}
        className="card__field"
        rows={step === 'freeWrite' ? 3 : step === 'voice' || step === 'intent' || step === 'experiment' ? 2 : 1}
        enterKeyHint="send"
        value={draft}
        // Read-only, not disabled, while waiting: it keeps focus, so a
        // phone keyboard stays up for the next question.
        readOnly={!interactive}
        onChange={onChange}
        onKeyDown={onKeyDown}
      />
      <div className="card__actions">
        {aside && (
          <button
            type="button"
            className="card__button card__button--quiet"
            disabled={!interactive}
            onMouseDown={keepFocus}
            onClick={aside.onClick}
          >
            {aside.label}
          </button>
        )}
        <button type="submit" className="card__button" disabled={!interactive} onMouseDown={keepFocus}>
          {phase === 'card' ? copy.talk.send : copy.talk.waiting}
        </button>
      </div>
    </form>
  )
}
