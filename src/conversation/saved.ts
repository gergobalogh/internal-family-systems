import { createLandscape } from '../model/landscape'
import { LOOKS } from '../model/types'
import type { LandscapeState, Look } from '../model/types'
import { PART_KIND_LABELS } from './contract'
import type { PartKind } from './contract'

/**
 * The meadow, saved on this device for the next visit (Option A step 7,
 * docs/redesign/story-redesign.md): who's there (names, figures, places,
 * sizes, the link between two), each part's words, and two hidden facts the
 * guide needs to stay as careful as the first visit (a part read as hurting,
 * and Turn 3's quieter part, aren't offered to sit with). Nothing else: not
 * the free-write, the other answers, or the record. It lives in this
 * browser's storage only, and "Start over" clears it.
 */

const KEY = 'inner-landscape.meadow'
const VERSION = 1

export interface SavedPart {
  id: string
  name: string
  look: Look
  x: number
  y: number
  scale: number
  voice?: string
  intent?: string
  /** Hidden: how the part was read when it arrived (never shown). */
  kind: PartKind | null
  /** Hidden: Turn 3's quieter part, the one that rarely gets heard. */
  quieter: boolean
}

export interface SavedMeadow {
  version: typeof VERSION
  savedAt: string
  parts: SavedPart[]
  links: { id: string; between: [string, string] }[]
}

/** What the conversation knows about each part that the map doesn't. */
export interface Hidden {
  kinds: Record<string, PartKind | null>
  quieter: string | null
}

/** The meadow as it is now, in "How it is", or null when nobody's on it. */
export function meadowOf(map: LandscapeState, hidden: Hidden, now: Date): SavedMeadow | null {
  const parts: SavedPart[] = map.order
    .map((id) => map.parts[id])
    .filter((part) => !part.removed && map.layouts.current[part.id])
    .map((part) => ({
      id: part.id,
      name: part.name,
      look: part.look,
      ...map.layouts.current[part.id],
      ...(part.voice ? { voice: part.voice } : {}),
      ...(part.intent ? { intent: part.intent } : {}),
      kind: hidden.kinds[part.id] ?? null,
      quieter: hidden.quieter === part.id,
    }))
  if (parts.length === 0) return null
  const here = new Set(parts.map((part) => part.id))
  const links = Object.values(map.links)
    .filter((link) => !link.removed && link.between.every((id) => here.has(id)))
    .map(({ id, between }) => ({ id, between }))
  return { version: VERSION, savedAt: now.toISOString(), parts, links }
}

/** Saves the meadow, or forgets it when nobody's left. Storage can be full or blocked: then nothing is saved. */
export function saveMeadow(meadow: SavedMeadow | null) {
  try {
    if (meadow) localStorage.setItem(KEY, JSON.stringify(meadow))
    else localStorage.removeItem(KEY)
  } catch {
    // Private mode or full storage: the visit goes on, unsaved.
  }
}

export function forgetMeadow() {
  try {
    localStorage.removeItem(KEY)
  } catch {
    // Nothing to forget.
  }
}

const isText = (value: unknown): value is string => typeof value === 'string'
const isNumber = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value)

function readPart(value: unknown): SavedPart | null {
  if (!value || typeof value !== 'object') return null
  const part = value as Record<string, unknown>
  if (!isText(part.id) || !isText(part.name) || !LOOKS.includes(part.look as Look)) return null
  if (!isNumber(part.x) || !isNumber(part.y) || !isNumber(part.scale)) return null
  const kind = PART_KIND_LABELS.includes(part.kind as PartKind) ? (part.kind as PartKind) : null
  return {
    id: part.id,
    name: part.name,
    look: part.look as Look,
    x: part.x,
    y: part.y,
    scale: part.scale,
    ...(isText(part.voice) ? { voice: part.voice } : {}),
    ...(isText(part.intent) ? { intent: part.intent } : {}),
    kind,
    quieter: part.quieter === true,
  }
}

/** The saved meadow, or null when there's none (or it can't be read: then the visit starts fresh). */
export function loadMeadow(): SavedMeadow | null {
  let raw: string | null = null
  try {
    raw = localStorage.getItem(KEY)
  } catch {
    return null
  }
  if (!raw) return null
  try {
    const data = JSON.parse(raw) as Record<string, unknown>
    if (data.version !== VERSION || !Array.isArray(data.parts)) return null
    const parts = data.parts.map(readPart)
    if (parts.length === 0 || parts.some((part) => part === null)) return null
    const read = parts as SavedPart[]
    // Each part keeps its own figure: two alike would mean the save is damaged.
    if (new Set(read.map((part) => part.look)).size !== read.length) return null
    if (new Set(read.map((part) => part.id)).size !== read.length) return null
    const here = new Set(read.map((part) => part.id))
    const links = (Array.isArray(data.links) ? data.links : []).filter(
      (link): link is SavedMeadow['links'][number] =>
        !!link &&
        isText(link.id) &&
        Array.isArray(link.between) &&
        link.between.length === 2 &&
        link.between.every((id: unknown) => isText(id) && here.has(id)),
    )
    return { version: VERSION, savedAt: isText(data.savedAt) ? data.savedAt : '', parts: read, links }
  } catch {
    return null
  }
}

/** The map a saved meadow opens on: "How it is", nothing to undo yet. */
export function landscapeOf(saved: SavedMeadow): LandscapeState {
  const map = createLandscape(saved.parts.map(({ id, name, look, x, y, scale }) => ({ id, name, look, placement: { x, y, scale } })))
  for (const part of saved.parts) {
    if (part.voice) map.parts[part.id].voice = part.voice
    if (part.intent) map.parts[part.id].intent = part.intent
  }
  map.links = Object.fromEntries(saved.links.map((link) => [link.id, { ...link, removed: false }]))
  return map
}
