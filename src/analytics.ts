/**
 * Umami (self-hosted, umami.gergobalogh.me): how far a visit gets through
 * the walk, so we can see where people stop without watching them. Events
 * say what was done, never what anyone wrote: fixed labels and buckets
 * only, no words, no part names. The tracker tag is in index.html; its
 * `data-domains` keeps local runs out. The events and the funnel:
 * docs/analytics.md.
 */
import { useEffect, useRef } from 'react'
import type { Attribute, ConversationState } from './conversation/flow'

type EventData = Record<string, string | number>

declare global {
  interface Window {
    umami?: { track: (name: string, data?: EventData) => void }
  }
}

/** Sends one event. The tracker loads async; if it's blocked, the event is dropped and the app carries on. */
export function track(name: string, data?: EventData) {
  const send = () => {
    try {
      window.umami?.track(name, data)
    } catch {
      // Analytics never breaks the app.
    }
  }
  if (window.umami || document.readyState === 'complete') send()
  else addEventListener('load', send, { once: true })
}

const sent = new Set<string>()

/** Once per page view, by `key` (a funnel step counts a visit once). */
export function trackOnce(key: string, name: string, data?: EventData) {
  if (sent.has(key)) return
  sent.add(key)
  track(name, data)
}

// ---------- How far the visit got ----------

/** The rungs of the walk, in order; a later visit joins at `welcome`. */
const RUNGS = [
  'opened',
  'ready',
  'freewrite-sent',
  'part-1',
  'part-2',
  'part-3',
  'act1-done',
  'welcome',
  'act2-voice',
  'act2-intent',
  'act2-fears',
  'thanked',
  'act3',
  'whatif',
  'ending',
  'picture-kept',
  'done',
] as const
type Rung = (typeof RUNGS)[number]

let furthest = 0

function reach(rung: Rung) {
  furthest = Math.max(furthest, RUNGS.indexOf(rung))
}

const SECONDS: [number, string][] = [
  [2, '0-2s'],
  [5, '2-5s'],
  [10, '5-10s'],
  [30, '10-30s'],
]
const LEAVE_SECONDS: [number, string][] = [
  [10, '0-10s'],
  [30, '10-30s'],
  [60, '30s-1m'],
  [180, '1-3m'],
  [600, '3-10m'],
  [1800, '10-30m'],
]
const bucket = (seconds: number, buckets: [number, string][], over: string) => buckets.find(([max]) => seconds < max)?.[1] ?? over

/**
 * Where the visit stopped: each time the page is hidden (closed, left, or
 * switched away from), the furthest rung and how long it's been in view.
 * Sent again only when either changed, so per visit the last one counts.
 */
function reportLeave() {
  let visibleMs = 0
  let since: number | null = document.hidden ? null : 0
  let last = ''
  const leave = () => {
    if (since !== null) {
      visibleMs += performance.now() - since
      since = null
    }
    const data = { reached: RUNGS[furthest], seconds: bucket(visibleMs / 1000, LEAVE_SECONDS, '30m+') }
    const key = `${data.reached} ${data.seconds}`
    if (key !== last) {
      last = key
      track('walk-leave', data)
    }
  }
  const back = () => {
    if (!document.hidden && since === null) since = performance.now()
  }
  document.addEventListener('visibilitychange', () => (document.hidden ? leave() : back()))
  addEventListener('pagehide', leave)
  addEventListener('pageshow', back)
}

let started = false

/** Starts the leave reports; call once, before the app renders. */
export function startAnalytics() {
  if (started) return
  started = true
  reportLeave()
}

// ---------- Events from the walk ----------

const DAY_MS = 24 * 60 * 60 * 1000

/** A later visit, with the days since the meadow was last saved. */
export function trackReturn(savedAt: string, now = Date.now()) {
  const days = Math.floor((now - Date.parse(savedAt)) / DAY_MS)
  const label = Number.isNaN(days) ? 'unknown' : days < 1 ? 'same day' : days < 2 ? '1' : days < 4 ? '2-3' : days < 8 ? '4-7' : days < 15 ? '8-14' : days < 31 ? '15-30' : '30+'
  trackOnce('return-visit', 'return-visit', { days: label })
  reach('welcome')
}

/** Why the safety pause came: the reason in the record, as a fixed label. */
const PAUSES: Record<string, string> = {
  'paused: risk phrase': 'answer, phrase',
  'paused: risk check': 'answer, check',
  'paused: risk phrase in a name': 'name, phrase',
  'paused: risk check on a name': 'name, check',
}

/** How Act 2 began: a part chosen, someone new (a later visit), Not now, or nobody to offer. */
const SIT_WITH = ['chosen', 'someone new', 'not now', 'nobody offered']

/** One new line in the walk's record, read for its attribute and fixed values only (never the words). */
function fromRecord(entry: Attribute) {
  switch (entry.attribute) {
    case 'voice':
    case 'intent':
    case 'fears':
      trackOnce(`act2-${entry.attribute}`, 'act2-answer', { question: entry.attribute })
      reach(`act2-${entry.attribute}`)
      return
    case 'sitWith':
      // The app's own labels only, so a label that ever carried words couldn't slip out.
      trackOnce('act2-start', 'act2-start', { how: SIT_WITH.includes(String(entry.value)) ? String(entry.value) : 'other' })
      return
    case 'thanks':
      trackOnce('thanked', 'thanked')
      reach('thanked')
      return
    case 'experiment':
      trackOnce('whatif', 'whatif', { choice: entry.value === 'went back' ? 'go back' : 'keep it' })
      return
    case 'ending':
      if (entry.value === 'picture kept') {
        trackOnce('picture-kept', 'picture-kept')
        reach('picture-kept')
      } else if (entry.value === 'done') {
        trackOnce('done', 'done')
        reach('done')
      }
      return
    case 'safety': {
      const how = PAUSES[String(entry.value)]
      if (how) trackOnce('safety-pause', 'safety-pause', { how })
      return
    }
  }
}

/**
 * Reads the walk as it goes and sends its steps: the first card on screen,
 * the free-write sent, each part arriving, Act 1's close, Act 2's answers
 * and thanks, Act 3, the "what if", the ending and the picture kept.
 */
export function useWalkAnalytics(state: ConversationState, cardShown: boolean) {
  useEffect(() => {
    if (!cardShown) return
    trackOnce('ready', 'walk-ready', { seconds: bucket(performance.now() / 1000, SECONDS, '30s+') })
    reach('ready')
  }, [cardShown])

  // New lines in the record (a later visit's opening record is already old news).
  // First: a tap that both notes something and moves the walk on (Keep it,
  // then the ending) sends them in that order, as a funnel reads them.
  const read = useRef(state.record.length)
  const { record } = state
  useEffect(() => {
    for (const entry of record.slice(read.current)) fromRecord(entry)
    read.current = record.length
  }, [record])

  const { step, returning, answers } = state
  const freeWritten = answers.freeWrite !== undefined
  useEffect(() => {
    if (freeWritten) {
      trackOnce('freewrite-sent', 'freewrite-sent')
      reach('freewrite-sent')
    }
  }, [freeWritten])

  useEffect(() => {
    if (step === 'gathered') {
      trackOnce('act1-done', 'act1-done')
      reach('act1-done')
    } else if (step === 'stepBack') {
      trackOnce('act3', 'act3')
      reach('act3')
    } else if (step === 'dusk') {
      reach('whatif')
    } else if (step === 'ending') {
      trackOnce('ending', 'ending-reached')
      reach('ending')
    }
  }, [step])

  // Each part arriving on the first visit (a later visit's someone new is in act2-start).
  const parts = state.parts.length
  useEffect(() => {
    if (returning) return
    for (let n = 1; n <= parts; n++) {
      trackOnce(`part-${n}`, 'part-arrived', { n })
      reach(n >= 3 ? 'part-3' : n === 2 ? 'part-2' : 'part-1')
    }
  }, [parts, returning])

}

/** The person moved or resized a part by hand: in Act 3 (asked), at dusk, or any other time (unasked). */
export function trackMoved(step: ConversationState['step'], handedOver: boolean) {
  const when = step === 'stepBack' ? 'act3' : step === 'dusk' ? 'dusk' : handedOver ? 'after the walk' : 'during the walk'
  trackOnce(`moved ${when}`, 'part-moved', { when })
}

/** One of a part's own controls, once each per view. */
export function trackEdited(action: 'rename' | 'change figure' | 'remove' | 'clear words') {
  trackOnce(`edited ${action}`, 'part-edited', { action })
}
