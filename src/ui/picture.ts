import { useEffect, useState } from 'react'
import duskPlate from '../assets/world/world-dusk-2752.webp'
import { quoted } from '../conversation/script'
import { entrySide, visibleParts } from '../model/landscape'
import type { LandscapeState, Look } from '../model/types'
import { copy } from './copy'
import { figureLayers } from './figureSources'

/**
 * The ending's picture to keep (frame A14): a postcard of the meadow at dusk,
 * everyone where they stand, with their names, the words of the part they sat
 * with, and the date. It's drawn on a canvas from the map (not a screenshot),
 * so it looks the same on any screen, and it never leaves the device: Keep
 * this picture saves it, or hands it to the phone's share sheet.
 */

export interface PostcardPart {
  look: Look
  x: number
  y: number
  scale: number
  /** Walked in from the right, so it faces left (as on the map). */
  mirrored: boolean
  /** Thanked in Act 2: it keeps its soft glow. */
  glow: boolean
}

export interface PostcardInput {
  parts: PostcardPart[]
  /** Quoted, left to right as they stand. */
  names: string[]
  /** The part they sat with, in their own words. */
  voice: string | null
  intent: string | null
}

/** What goes on the picture: the map as it is now. */
export function postcardOf(map: LandscapeState, thanked: readonly string[]): PostcardInput {
  const here = visibleParts(map)
  const left = [...here].sort((a, b) => a.placement.x - b.placement.x)
  // The words of the part they thanked, else of any part they sat with.
  const sat = here.find(({ part }) => thanked.includes(part.id) && part.voice) ?? here.find(({ part }) => part.voice)
  return {
    parts: here.map(({ part, placement }) => ({
      look: part.look,
      ...placement,
      mirrored: entrySide(map, part.id) === 'right',
      glow: thanked.includes(part.id),
    })),
    names: left.map(({ part }) => quoted(part.name)),
    voice: sat?.part.voice ?? null,
    intent: sat?.part.intent ?? null,
  }
}

// ---------- Drawing ----------

const CARD_W = 1200
const PAD = 44
const PICTURE_W = CARD_W - PAD * 2
const PICTURE_H = Math.round((PICTURE_W * 3) / 4)
/** The map is laid out on a 4:3 landscape, like a wide screen's, then scaled into the picture. */
const VIEW_W = 1200
const VIEW_H = 900
const K = PICTURE_W / VIEW_W
/** As in app.css: the plate's shape, a figure's size (18cqmin per unit of scale), its ground line. */
const PLATE_RATIO = 1.7917
const FIGURE = 0.18
const FEET = 0.95
/** Where the meadow meets the hills on the plate (the house's doorstep), as a fraction of its height. */
const HORIZON = 0.585

/** The plate's frame on a landscape of this size (app.css, .landscape and its tall-screen rule). */
function frameOf(width: number, height: number) {
  if (width / height < 0.9) {
    const h = height * 1.7
    return { w: h * PLATE_RATIO, h, top: height * 0.64 - h * HORIZON }
  }
  const w = Math.max(width, height * PLATE_RATIO)
  const h = Math.max(height, width / PLATE_RATIO)
  return { w, h, top: (height - h) * 0.5 }
}

/**
 * The screen the map was arranged on, carried into the picture. x stays a
 * fraction across. The meadow below the hills is stretched to the picture's,
 * so a part's feet keep their distance from the hills (a phone's tall screen
 * draws the meadow lower), and never land on the hills themselves. Sizes
 * follow the screen's height, but a phone's figures, sized to its narrow
 * width, aren't let shrink below 75% of a wide screen's.
 *
 * On the map a figure's box is centred on its point (app.css: the figure
 * sits inside its hit box), so its feet are below the point.
 */
function carried(screen: { width: number; height: number }) {
  const from = frameOf(screen.width, screen.height)
  const to = frameOf(VIEW_W, VIEW_H)
  const horizonFrom = (from.top + from.h * HORIZON) / screen.height
  const horizonTo = (to.top + to.h * HORIZON) / VIEW_H
  const stretch = (1 - horizonTo) / (1 - horizonFrom)
  const narrow = Math.min(screen.width, screen.height) / screen.height
  return {
    size: (scale: number) => scale * FIGURE * VIEW_H * Math.min(1, Math.max(0.75, narrow * stretch)),
    /** Where its feet go, as a fraction of the picture's height. */
    feet: (y: number, scale: number) => {
      const feet = y + ((FEET - 0.5) * scale * FIGURE * Math.min(screen.width, screen.height)) / screen.height
      return Math.max(horizonTo + 0.06, horizonTo + (feet - horizonFrom) * stretch)
    },
  }
}

const PAPER = '#fffaf2'
const INK = '#3a3340'
const INK_SOFT = '#5e5566'
const DISPLAY = "'Iowan Old Style', 'Palatino Linotype', Palatino, 'Book Antiqua', Georgia, serif"
const UI = "system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif"
/** The dusk light on the figures, as in "What if…". */
const DUSK_FILTER = 'saturate(0.88) brightness(0.93) hue-rotate(-6deg)'

/** Each figure's footprint, as fractions of its box (app.css, "Footprint per figure"). */
const SHADOW: Partial<Record<Look, { x?: number; w: number }>> = {
  lantern: { x: 0.42, w: 0.38 },
  sleeper: { x: 0.52, w: 0.8 },
  defender: { w: 0.45 },
  pod: { w: 0.45 },
  curled: { w: 0.57 },
  selfhug: { x: 0.49, w: 0.41 },
  ribbon: { x: 0.64, w: 0.37 },
  kaleidoscope: { x: 0.4, w: 0.44 },
  stack: { w: 0.42 },
  map: { x: 0.48, w: 0.5 },
  doodle: { w: 0.65 },
  shell: { x: 0.44, w: 0.49 },
}

const loaded = new Map<string, Promise<HTMLImageElement>>()
function image(src: string): Promise<HTMLImageElement> {
  let found = loaded.get(src)
  if (!found) {
    const img = new Image()
    img.src = src
    found = img.decode().then(() => img)
    loaded.set(src, found)
  }
  return found
}

/** Lines of text that fit `width`, at most `max` of them (the last one cut short with "…"). */
function wrap(ctx: CanvasRenderingContext2D, text: string, width: number, max: number): string[] {
  const lines: string[] = []
  let line = ''
  for (const word of text.split(/\s+/).filter(Boolean)) {
    const next = line ? `${line} ${word}` : word
    if (ctx.measureText(next).width <= width || !line) line = next
    else {
      lines.push(line)
      line = word
    }
  }
  if (line) lines.push(line)
  if (lines.length <= max) return lines
  let last = lines[max - 1]
  while (last && ctx.measureText(`${last}…`).width > width) last = last.slice(0, -1).trimEnd()
  return [...lines.slice(0, max - 1), `${last}…`]
}

/** Names in a row, " · " between them, wrapping between names rather than inside one where it can. */
function wrapNames(ctx: CanvasRenderingContext2D, names: readonly string[], width: number, max: number): string[] {
  const lines: string[] = []
  let line = ''
  for (const name of names) {
    const next = line ? `${line} · ${name}` : name
    if (ctx.measureText(next).width <= width) line = next
    else if (ctx.measureText(name).width <= width) {
      if (line) lines.push(line)
      line = name
    } else {
      // A name too long for a line of its own: word by word.
      const words = wrap(ctx, next, width, Infinity)
      lines.push(...words.slice(0, -1))
      line = words.at(-1) ?? ''
    }
  }
  if (line) lines.push(line)
  return lines.length <= max ? lines : wrap(ctx, lines.join(' '), width, max)
}

function glow(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, colour: string, alpha: number) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r)
  g.addColorStop(0, `rgba(${colour}, ${alpha})`)
  g.addColorStop(1, `rgba(${colour}, 0)`)
  ctx.fillStyle = g
  ctx.fillRect(x - r, y - r, r * 2, r * 2)
}

async function drawMeadow(ctx: CanvasRenderingContext2D, parts: PostcardPart[], screen: { width: number; height: number }) {
  const [plate, ...layers] = await Promise.all([
    image(duskPlate),
    ...parts.map((part) => Promise.all(figureLayers(part.look).map(image))),
  ])
  ctx.save()
  ctx.beginPath()
  ctx.rect(PAD, PAD, PICTURE_W, PICTURE_H)
  ctx.clip()
  ctx.translate(PAD, PAD)
  ctx.scale(K, K)

  // The plate covers the landscape, anchored 60% across (app.css, .landscape).
  const frame = frameOf(VIEW_W, VIEW_H)
  ctx.drawImage(plate, (VIEW_W - frame.w) * 0.6, frame.top, frame.w, frame.h)
  const from = carried(screen)

  // Larger parts stand behind smaller ones, as on the map.
  const order = parts.map((part, i) => ({ part, layers: layers[i] })).sort((a, b) => b.part.scale - a.part.scale)
  for (const { part, layers: figure } of order) {
    const d = from.size(part.scale)
    // The origin at the top centre of its box, its feet on their ground line.
    ctx.save()
    ctx.translate(part.x * VIEW_W, from.feet(part.y, part.scale) * VIEW_H - FEET * d)
    if (part.mirrored) ctx.scale(-1, 1)
    // Its shadow: an ellipse 8% of the box tall, centred on the ground line.
    const shadow = SHADOW[part.look] ?? { w: 0.5 }
    ctx.save()
    ctx.translate(-d / 2 + (shadow.x ?? 0.5) * d, FEET * d)
    ctx.scale((shadow.w * d) / 2, 0.04 * d)
    glow(ctx, 0, 0, 1, '52, 44, 40', 0.42)
    ctx.restore()
    if (part.glow) glow(ctx, 0, d * 0.55, d * 0.7, '255, 214, 150', 0.7)
    ctx.filter = DUSK_FILTER
    for (const layer of figure) ctx.drawImage(layer, -d / 2, 0, d, d)
    ctx.filter = 'none'
    // The Lantern's light, as at dusk on the map.
    if (part.look === 'lantern') {
      ctx.globalCompositeOperation = 'screen'
      glow(ctx, -d / 2 + 0.718 * d, 0.408 * d, 0.15 * d, '255, 214, 140', 0.7)
      ctx.globalCompositeOperation = 'source-over'
    }
    ctx.restore()
  }

  // A soft, warm vignette, like the map's atmosphere.
  const v = ctx.createRadialGradient(VIEW_W / 2, VIEW_H / 2, VIEW_H * 0.45, VIEW_W / 2, VIEW_H / 2, VIEW_W * 0.75)
  v.addColorStop(0, 'rgba(60, 40, 70, 0)')
  v.addColorStop(1, 'rgba(60, 40, 70, 0.22)')
  ctx.fillStyle = v
  ctx.fillRect(0, 0, VIEW_W, VIEW_H)
  ctx.restore()
}

/** Draws the postcard, dated `date`, from a map arranged on `screen`; resolves to a PNG. */
export async function drawPostcard(input: PostcardInput, date: string, screen: { width: number; height: number }): Promise<Blob> {
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('no 2d canvas')

  // Lay the caption out first, so the card is as tall as it needs.
  const textW = PICTURE_W
  const namesFont = `44px ${DISPLAY}`
  const wordsFont = `italic 40px ${DISPLAY}`
  const dateFont = `32px ${UI}`
  ctx.font = namesFont
  const names = wrapNames(ctx, input.names, textW, 3)
  ctx.font = wordsFont
  const words = [
    ...(input.voice ? wrap(ctx, `“${input.voice}”`, textW, 3) : []),
    ...(input.voice && input.intent ? wrap(ctx, `${copy.intentLabel} ${input.intent}`, textW, 2) : []),
  ]
  const top = PAD + PICTURE_H + 34
  const wordsTop = top + names.length * 58 + 6
  const dateTop = wordsTop + words.length * 54 + 22
  canvas.width = CARD_W
  canvas.height = dateTop + 40 + PAD

  ctx.fillStyle = PAPER
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  await drawMeadow(ctx, input.parts, screen)

  ctx.textBaseline = 'top'
  ctx.fillStyle = INK
  ctx.font = namesFont
  names.forEach((line, i) => ctx.fillText(line, PAD, top + i * 58))
  ctx.fillStyle = INK_SOFT
  ctx.font = wordsFont
  words.forEach((line, i) => ctx.fillText(line, PAD, wordsTop + i * 54))
  ctx.font = dateFont
  ctx.textAlign = 'right'
  ctx.fillText(date, CARD_W - PAD, dateTop)

  return new Promise((resolve, reject) => canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('no picture'))), 'image/png'))
}

// ---------- On screen, and kept ----------

export interface Picture {
  url: string
  file: File
  alt: string
}

/** The picture for `input`, redrawn when the map under it changes; null while it's drawn. */
export function usePicture(input: PostcardInput | null): Picture | null {
  const key = input ? JSON.stringify(input) : null
  const [made, setMade] = useState<(Picture & { key: string }) | null>(null)
  useEffect(() => {
    if (!key) return
    const wanted: PostcardInput = JSON.parse(key)
    const now = new Date()
    const date = now.toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' })
    const pad = (n: number) => String(n).padStart(2, '0')
    const day = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
    // The landscape the map was arranged on (the whole window).
    const landscape = document.querySelector('.landscape')?.getBoundingClientRect()
    const screen = landscape?.width ? landscape : { width: window.innerWidth, height: window.innerHeight }
    let current = true
    let url: string | null = null
    drawPostcard(wanted, date, screen).then(
      (blob) => {
        if (!current) return
        url = URL.createObjectURL(blob)
        const file = new File([blob], `meadow-${day}.png`, { type: 'image/png' })
        setMade({ key, url, file, alt: copy.postcardAlt(wanted.names, date) })
      },
      () => {},
    )
    return () => {
      current = false
      if (url) URL.revokeObjectURL(url)
    }
  }, [key])
  return made && made.key === key ? made : null
}

/**
 * Keep this picture: on a phone, the share sheet (where "Save Image" lives);
 * elsewhere, a download. Must run inside the tap, before anything awaits.
 * Resolves to whether it was kept (closing the share sheet isn't).
 */
export async function keepPicture({ file, url }: Picture): Promise<boolean> {
  const phone = window.matchMedia('(pointer: coarse)').matches
  if (phone && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file] })
      return true
    } catch {
      return false
    }
  }
  const link = document.createElement('a')
  link.href = url
  link.download = file.name
  document.body.append(link)
  link.click()
  link.remove()
  return true
}
