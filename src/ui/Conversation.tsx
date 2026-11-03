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
type CardActions = Pick<
  Talk,
  'answer' | 'choose' | 'goOn' | 'dismiss' | 'decline' | 'accept' | 'tried' | 'keepTrying' | 'thank'
>

interface ConversationProps {
  state: ConversationState
  /** Index of the first line of the card on screen, or null for none (see useChoreography). */
  shown: number | null
  phase: Phase
  /** A part is walking in: the card steps back and a quiet "One moment…" waits in its place. */
  steppedBack: boolean
  actions: CardActions
}

/** Phrases copied from the free-write, offered as buttons: Turn 1's choose row, or Turn 3's leftovers. */
function choicesFor(state: ConversationState): string[] {
  if (state.step === 'loudest' && state.turn1?.kind === 'choose') return state.turn1.phrases
  if (state.step === 'alsoHere') return state.alsoHere
  return []
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
export function Conversation({ state, shown, phase, steppedBack, actions }: ConversationProps) {
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
          {steppedBack && (
            <p className="card-pill" aria-hidden="true">
              {copy.talk.waiting}
            </p>
          )}
          <Card
            key={shown}
            lines={lines}
            step={state.step}
            choices={choicesFor(state)}
            phase={phase}
            away={steppedBack}
            current={current}
            actions={actions}
          />
        </div>
      )}
    </>
  )
}

interface CardProps {
  lines: Line[]
  /** The conversation's step when this card appeared. */
  step: Step
  /** Free-write phrases to tap, as the card first showed them. */
  choices: string[]
  phase: Phase
  /** Stepped back while a part walks in. */
  away: boolean
  /** This card is the conversation's current one, and settled on screen. */
  current: boolean
  actions: CardActions
}

function Card({ lines, step: stepNow, choices: choicesNow, phase, away, current, actions }: CardProps) {
  // The card keeps its own shape while it ghosts: no layout jump.
  const [step] = useState(stepNow)
  const [choices] = useState(choicesNow)
  const cardRef = useRef<HTMLElement>(null)
  const slim = step === 'trying'

  return (
    <section
      ref={cardRef}
      className={`card${slim ? ' card--slim' : ''}${step === 'choose' ? ' card--choose' : ''}${phase === 'waiting' ? ' is-waiting' : ''}${phase === 'arriving' || away ? ' is-away' : ''}`}
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
        <Reply step={step} choices={choices} phase={phase} away={away} interactive={current} cardRef={cardRef} actions={actions} />
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
          {step === 'nothingMoved' && (
            <>
              <button type="button" className="card__button card__button--quiet" disabled={!current} onClick={actions.keepTrying}>
                {copy.talk.keepTrying}
              </button>
              <button type="button" className="card__button card__button--quiet" disabled={!current} onClick={actions.decline}>
                {copy.talk.finishUntried}
              </button>
            </>
          )}
          {step === 'paused' && (
            <a className="card__button" href={SUPPORT_URL} target="_blank" rel="noopener noreferrer" aria-label={copy.talk.supportLabel}>
              {copy.talk.support}
            </a>
          )}
          {step === 'gathered' && (
            <button type="button" className="card__button" disabled={!current} onClick={actions.goOn}>
              {copy.talk.goOn}
            </button>
          )}
          {/* Act 2's first question: the figures are the buttons; this is the way out. */}
          {step === 'choose' && (
            <button type="button" className="card__button card__button--quiet" disabled={!current} onClick={actions.decline}>
              {copy.talk.notNow}
            </button>
          )}
          {step === 'thanks' && (
            <>
              <button type="button" className="card__button card__button--quiet" disabled={!current} onClick={actions.decline}>
                {copy.talk.notYet}
              </button>
              <button type="button" className="card__button" disabled={!current} onClick={actions.thank}>
                {copy.talk.thankIt}
              </button>
            </>
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
  choices: string[]
  phase: Phase
  away: boolean
  interactive: boolean
  cardRef: RefObject<HTMLElement | null>
  actions: CardActions
}

/** The field and its buttons, for a question that waits for a typed answer. */
function Reply({ step, choices, phase, away, interactive, cardRef, actions }: ReplyProps) {
  const [draft, setDraft] = useState('')
  const fieldRef = useRef<HTMLTextAreaElement>(null)
  const fieldId = useId()

  /** The line break about to be typed came from Shift+Enter. */
  const shiftBreak = useRef(false)

  // A new question takes focus only if the person isn't busy on the map —
  // or just asked for this card (Get to know it, or the figure they tapped
  // at Act 2, which the camera is now on). Layout effect: the old
  // card's field (still focused, so a phone keyboard stays up) is removed in
  // this same commit, and refocusing in the same task is what keeps that
  // keyboard up; a phone won't raise it outside a tap.
  useLayoutEffect(() => {
    const active = document.activeElement
    const idle =
      !active ||
      active === document.body ||
      cardRef.current?.contains(active) ||
      (active instanceof HTMLElement && (active.dataset.opensCard !== undefined || active.closest('.part.is-focus') !== null))
    if (interactive && idle) fieldRef.current?.focus()
  }, [interactive, cardRef])

  // A part walking in gets the whole meadow: on a phone the keyboard goes
  // down with the card (it would cover the meadow), and the next card's
  // field is a tap away.
  useLayoutEffect(() => {
    if (away && document.activeElement === fieldRef.current) fieldRef.current?.blur()
  }, [away])

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
    step === 'alsoHere'
        ? { label: copy.talk.noOneElse, onClick: () => submit(copy.talk.noOneElse) }
        : step === 'quieter'
          ? { label: copy.talk.quieterNo, onClick: () => submit(copy.talk.quieterNo) }
          : step === 'intent'
        ? { label: copy.talk.enough, onClick: actions.decline }
        : step === 'fears'
          ? { label: copy.talk.skipFears, onClick: actions.decline }
        : step === 'noticing'
          ? { label: copy.talk.skip, onClick: actions.decline }
          : step === 'newPart' || step === 'experiment' || step === 'voice'
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
      {choices.length > 0 && (
        <div className="card__choices" role="group" aria-label={copy.talk.feelingChoices}>
          {choices.map((phrase) => (
            <button
              key={phrase}
              type="button"
              className="card__button card__button--quiet card__choice"
              disabled={!interactive}
              onMouseDown={keepFocus}
              onClick={() => actions.choose(phrase)}
            >
              {`‘${phrase}’`}
            </button>
          ))}
        </div>
      )}
      <label className="visually-hidden" htmlFor={fieldId}>
        {copy.talk.replyLabel}
      </label>
      <textarea
        id={fieldId}
        ref={fieldRef}
        className="card__field"
        rows={step === 'freeWrite' ? 3 : step === 'voice' || step === 'intent' || step === 'fears' || step === 'experiment' ? 2 : 1}
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
