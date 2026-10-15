import { NAME_MAX_LENGTH } from '../model/landscape'
import type { Action, Placement } from '../model/types'
import { findWords, nameWords, namesIn, normalizeAnswer } from './checks'
import type { ParsedOp } from './contract'
import { samePlace, stepped } from './geometry'
import { script } from './script'

/**
 * Turn 4b's one correction round. The LLM only reads the person's words
 * into ops; this module decides what may be applied. Identity is exact:
 * every op must quote their words, and its target must be a part they named
 * word for word (or "it" when only one part is on the map). Anything that
 * doesn't verify goes to the map line instead of being guessed.
 */

export interface CorrectionPart {
  id: string
  name: string
  removed: boolean
  /** Where it is in "How it is" — corrections describe reality. */
  placement: Placement
}

export interface CorrectionLink {
  id: string
  between: [string, string]
  removed: boolean
}

/** What changed, for the provenance record (the caller adds source and confidence). */
export interface Change {
  subject: string
  attribute: 'name' | 'existence' | 'size' | 'placement' | 'pairing'
  value: string
}

export interface CorrectionOutcome {
  /** Ordinary undoable map actions, in order. */
  actions: Action[]
  /** Narration phrases for what was applied ("made ‘A’ smaller"). */
  applied: string[]
  /** Honest notes for what couldn't be ("already as small as it goes"). */
  notes: string[]
  changes: Change[]
  wish: boolean
  /**
   * The first wish that names no part, or names a part on the map: their
   * words, for the experiment invitation. A wish about a part no longer on
   * the map isn't kept.
   */
  firstWish: Wish | null
  unclear: boolean
}

export interface Wish {
  /** Their words, as typed. */
  quote: string
  /** The part it names, if it names exactly one. */
  partId: string | null
}

type Target = { kind: 'part'; part: CorrectionPart } | { kind: 'gone'; name: string } | { kind: 'unclear' }

/** The text as the person typed it, matched case-insensitively and as whole words. */
export function asTyped(text: string, wanted: string): string | null {
  const needle = wanted.trim().replace(/^["'‘’“”]+|["'‘’“”]+$/g, '').trim()
  if (needle === '') return null
  const fold = (value: string) => value.toLowerCase().replace(/[‘’]/g, "'")
  const isWordChar = (char: string | undefined) => char !== undefined && /[\p{L}\p{N}]/u.test(char)
  for (let start = 0; start + needle.length <= text.length; start++) {
    const candidate = text.slice(start, start + needle.length)
    if (fold(candidate) !== fold(needle)) continue
    if (isWordChar(text[start - 1]) || isWordChar(text[start + needle.length])) continue
    return candidate
  }
  return null
}

/** `words` without the last whole-word occurrence of `cut` (a rename's new name). */
function without(words: readonly string[], cut: readonly string[]): string[] {
  let last = -1
  for (let start = findWords(words, cut); start !== -1; start = findWords(words, cut, start + 1)) last = start
  return last === -1 ? [...words] : [...words.slice(0, last), ...words.slice(last + cut.length)]
}

function resolveTarget(op: ParsedOp, parts: readonly CorrectionPart[]): Target {
  const keys = [...new Set(parts.map((part) => nameWords(part.name).join(' ')))].filter(Boolean)
  const quoteWords = op.kind === 'rename' ? without(nameWords(op.quote), nameWords(op.newName)) : nameWords(op.quote)
  const found = namesIn(
    quoteWords,
    keys.map((key) => key.split(' ')),
  )
  // One instruction naming several parts ("make X and Y smaller") isn't split by guessing.
  if (found.length > 1) return { kind: 'unclear' }

  const visible = parts.filter((part) => !part.removed)
  if (normalizeAnswer(op.refersTo) === 'it') {
    return found.length === 0 && visible.length === 1 ? { kind: 'part', part: visible[0] } : { kind: 'unclear' }
  }
  // Missing, unknown, or descriptive ("the big one") references.
  if (found.length === 0) return { kind: 'unclear' }
  const key = keys[found[0]]
  if (nameWords(op.refersTo).join(' ') !== key) return { kind: 'unclear' }

  const named = parts.filter((part) => nameWords(part.name).join(' ') === key)
  const here = named.filter((part) => !part.removed)
  if (here.length === 1 && here.length === named.length) return { kind: 'part', part: here[0] }
  if (here.length === 0) return { kind: 'gone', name: named.at(-1)!.name }
  // Same-name parts, or a name both on and off the map.
  return { kind: 'unclear' }
}

export function applyCorrections(
  text: string,
  ops: readonly ParsedOp[],
  startingParts: readonly CorrectionPart[],
  startingLink: CorrectionLink | null,
): CorrectionOutcome {
  // Working copies: later ops see earlier ones ("rename X to Y and make Y smaller").
  const parts = startingParts.map((part) => ({ ...part }))
  const byId = new Map(parts.map((part) => [part.id, part]))
  const link = startingLink && { ...startingLink }
  const textWords = nameWords(text)
  const outcome: CorrectionOutcome = {
    actions: [],
    applied: [],
    notes: [],
    changes: [],
    wish: false,
    firstWish: null,
    unclear: ops.length === 0,
  }
  const done = script.done

  for (const op of ops) {
    const quoteWords = nameWords(op.quote)
    if (quoteWords.length === 0 || findWords(textWords, quoteWords) === -1) {
      outcome.unclear = true
      continue
    }
    if (op.kind === 'affirm') continue
    if (op.kind === 'wish') {
      outcome.wish = true
      if (!outcome.firstWish) {
        const target = resolveTarget(op, parts)
        const quote = asTyped(text, op.quote) ?? op.quote.trim()
        if (target.kind !== 'gone') outcome.firstWish = { quote, partId: target.kind === 'part' ? target.part.id : null }
      }
      continue
    }
    if (op.kind === 'unclear') {
      outcome.unclear = true
      continue
    }
    if (op.kind === 'unlink') {
      // Nothing drawn → nothing to apply: an endorsement of the map as it is.
      if (!link || link.removed || link.between.some((id) => byId.get(id)?.removed !== false)) continue
      const [a, b] = link.between.map((id) => byId.get(id)!.name)
      link.removed = true
      outcome.actions.push({ type: 'unlink', linkId: link.id })
      outcome.applied.push(done.unlinked(a, b))
      outcome.changes.push({ subject: 'conversation', attribute: 'pairing', value: 'taken down: not pulling apart' })
      continue
    }

    const target = resolveTarget(op, parts)
    if (target.kind === 'unclear') {
      outcome.unclear = true
      continue
    }
    if (target.kind === 'gone') {
      const note = done.gone(target.name)
      if (!outcome.notes.includes(note)) outcome.notes.push(note)
      continue
    }

    const { part } = target
    switch (op.kind) {
      case 'rename': {
        const typed = asTyped(text, op.newName)
        if (typed === null) {
          outcome.unclear = true
          break
        }
        // The ordinary rename action applies its 40-character backstop; narrate what the map holds.
        const name = typed.trim().slice(0, NAME_MAX_LENGTH)
        if (name === part.name) break
        outcome.actions.push({ type: 'rename', partId: part.id, name: typed })
        outcome.applied.push(done.renamed(part.name, name))
        outcome.changes.push({ subject: part.id, attribute: 'name', value: name })
        part.name = name
        break
      }
      case 'remove':
        outcome.actions.push({ type: 'remove', partId: part.id })
        outcome.applied.push(done.removed(part.name))
        outcome.changes.push({ subject: part.id, attribute: 'existence', value: 'removed' })
        part.removed = true
        break
      case 'bigger':
      case 'smaller':
      case 'closer':
      case 'further': {
        const next = stepped(part.placement, op.kind)
        if (samePlace(next, part.placement)) {
          outcome.notes.push(done.atLimit[op.kind](part.name))
          break
        }
        const resize = op.kind === 'bigger' || op.kind === 'smaller'
        outcome.actions.push({ type: 'place', partId: part.id, placement: next })
        outcome.applied.push(done[op.kind](part.name))
        outcome.changes.push({
          subject: part.id,
          attribute: resize ? 'size' : 'placement',
          value: op.kind === 'further' ? 'further out' : op.kind,
        })
        part.placement = next
        break
      }
    }
  }
  return outcome
}
