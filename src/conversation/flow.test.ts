import { describe, expect, it } from 'vitest'
import { createLandscape } from '../model/landscape'
import type { FreeWriteAnalysis, FreeWriteFormLabel, PartKind, PartKindChoice } from './contract'
import { conversationReducer, startConversation } from './flow'
import type { ConversationState } from './flow'
import { bucketOf, radiusOf } from './geometry'
import { script } from './script'

const map = createLandscape([])

function form(label: FreeWriteFormLabel, probability = 0.95): FreeWriteAnalysis['form'] {
  const rest = (1 - probability) / 3
  return {
    label,
    probabilities: {
      one_feeling: label === 'one_feeling' ? probability : rest,
      several_feelings: label === 'several_feelings' ? probability : rest,
      situation: label === 'situation' ? probability : rest,
      little: label === 'little' ? probability : rest,
    },
  }
}

function kindChoice(label: PartKind, probability = 0.95): PartKindChoice {
  const rest = (1 - probability) / 3
  return {
    label,
    probabilities: {
      guards: label === 'guards' ? probability : rest,
      escapes: label === 'escapes' ? probability : rest,
      hurts: label === 'hurts' ? probability : rest,
      other: label === 'other' ? probability : rest,
    },
  }
}

function send(state: ConversationState, event: Parameters<typeof conversationReducer>[1]) {
  return conversationReducer(state, event)
}

function afterTurn0(freeWrite: string, result: FreeWriteAnalysis | null) {
  let state = startConversation()
  state = send(state, { type: 'answer', text: freeWrite, map })
  expect(state.pending?.kind).toBe('risk')
  state = send(state, { type: 'riskChecked', seq: state.pending!.seq, atRisk: false, map })
  expect(state.pending?.kind).toBe('freeWrite')
  state = send(state, { type: 'freeWriteRead', seq: state.pending!.seq, result, map })
  expect(state.pending?.kind).toBe('reflect')
  state = send(state, { type: 'reflected', seq: state.pending!.seq, text: null, map })
  expect(state.step).toBe('loudest')
  return state
}

describe('Turn 1 rows', () => {
  it('offers several verified free-write phrases as choices', () => {
    const freeWrite = 'I feel angry at her but underneath that really sad.'
    let state = afterTurn0(freeWrite, {
      form: form('several_feelings'),
      phrases: ['angry at her', 'really sad'],
    })

    expect(state.turn1).toEqual({
      kind: 'choose',
      question: script.chooseFeeling,
      phrases: ['angry at her', 'really sad'],
    })

    state = send(state, { type: 'turn1Choice', phrase: 'really sad', map })
    expect(state.answers.loudest).toBe('really sad')
    expect(state.turn1Name).toEqual({ name: 'really sad', source: freeWrite })
    expect(state.pending).toMatchObject({ kind: 'figure', extract: false })

    state = send(state, { type: 'figured', seq: state.pending!.seq, result: null, extracted: null, map })
    expect(state.parts[0].name).toBe('really sad')
    expect(state.turn1Name).toBeNull()
    expect(state.record.find((entry) => entry.subject === 'part-1' && entry.attribute === 'name')).toMatchObject({
      value: 'really sad',
      source: freeWrite,
      confidence: { tag: 'high' },
    })
    expect(state.pending).toMatchObject({ kind: 'reflect', request: { turn: 2, loudest: 'really sad' } })
  })

  it('confirms one lifted phrase without sending yes through name extraction', () => {
    const freeWrite = 'It is this constant worry about tomorrow.'
    let state = afterTurn0(freeWrite, { form: form('one_feeling'), phrases: ['constant worry'] })
    expect(state.turn1?.question).toBe(script.confirmFeeling('constant worry'))

    state = send(state, { type: 'answer', text: 'yes', map })
    expect(state.pending).toMatchObject({
      kind: 'figure',
      extract: false,
      request: { name: 'constant worry' },
    })
  })

  it('asks for another name after a bare no to confirmation', () => {
    let state = afterTurn0('Mostly shame today.', { form: form('one_feeling'), phrases: ['shame'] })
    state = send(state, { type: 'answer', text: 'no', map })
    expect(state.pending).toBeNull()
    expect(state.step).toBe('loudest')
    expect(state.asked).toBe(script.nameSomethingElse)
    expect(state.turn1).toEqual({ kind: 'name', question: script.nameSomethingElse, phrases: [] })
  })

  it('rejects a phrase that is not a verbatim run in the free-write', () => {
    const state = afterTurn0('I have this buzzy worried feeling.', {
      form: form('one_feeling'),
      phrases: ['anxiety'],
    })
    expect(state.turn1).toEqual({ kind: 'name', question: script.nameThatFeeling, phrases: [] })
  })

  it('falls back to the current question when the reading is unavailable or below threshold', () => {
    expect(afterTurn0('Work is a lot.', null).turn1).toEqual({
      kind: 'default',
      question: script.loudest,
      phrases: [],
    })
    expect(
      afterTurn0('Happy and sad.', { form: form('several_feelings', 0.56), phrases: ['Happy', 'sad'] }).turn1,
    ).toEqual({ kind: 'default', question: script.loudest, phrases: [] })
  })
})

describe('part kind starting spots', () => {
  it.each([
    ['guards', 'close'],
    ['escapes', 'middle'],
    ['hurts', 'far'],
  ] as const)('places a confident %s reading in the %s ring', (kind, bucket) => {
    let state = afterTurn0('This constant feeling is here.', { form: form('one_feeling'), phrases: ['feeling'] })
    state = send(state, { type: 'answer', text: 'yes', map })
    state = send(state, {
      type: 'figured',
      seq: state.pending!.seq,
      result: { figure: null, kind: kindChoice(kind) },
      extracted: null,
      map,
    })

    expect(state.parts[0].kind).toBe(kind)
    expect(bucketOf(radiusOf(state.parts[0].placement))).toBe(bucket)
    expect(state.record.find((entry) => entry.attribute === 'kind')).toMatchObject({
      subject: 'part-1',
      value: kind,
      confidence: { tag: 'jev', probability: 0.95 },
    })
  })

  it('keeps other, low-confidence, and failed readings in a neutral starting spot', () => {
    const cases = [kindChoice('other'), kindChoice('guards', 0.6), null]
    for (const kind of cases) {
      let state = afterTurn0('This constant feeling is here.', { form: form('one_feeling'), phrases: ['feeling'] })
      state = send(state, { type: 'answer', text: 'yes', map })
      state = send(state, {
        type: 'figured',
        seq: state.pending!.seq,
        result: kind === null ? null : { figure: null, kind },
        extracted: null,
        map,
      })

      expect(bucketOf(radiusOf(state.parts[0].placement))).toBe('middle')
      expect(state.parts[0].kind).toBe(kind?.label === 'other' ? 'other' : null)
    }
  })
})
