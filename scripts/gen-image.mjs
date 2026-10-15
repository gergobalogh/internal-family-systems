#!/usr/bin/env node
// Generate or edit one image with Gemini's image model ("Nano Banana").
//
//   node scripts/gen-image.mjs --prompt art/prompts/style.md --prompt art/prompts/world-day.md \
//     --aspect 16:9 --out art/out/world-day-1.png
//   node scripts/gen-image.mjs --prompt art/prompts/world-dusk.md --in art/out/world-day-1.png \
//     --out art/out/world-dusk-1.png
//   node scripts/gen-image.mjs --list-models
//
// Prompt files are concatenated in order. `--in` images are sent as references
// (for edits like "same scene at dusk"). Reads GEMINI_API_KEY from .env.local.
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, extname } from 'node:path'
import { parseArgs } from 'node:util'

const API = 'https://generativelanguage.googleapis.com/v1beta'
const MODEL = process.env.GEMINI_IMAGE_MODEL ?? 'gemini-nano-banana-2.1'
const MIME = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp' }

const { values } = parseArgs({
  options: {
    prompt: { type: 'string', multiple: true, default: [] },
    in: { type: 'string', multiple: true, default: [] },
    out: { type: 'string' },
    aspect: { type: 'string' },
    'list-models': { type: 'boolean' },
  },
})

try {
  process.loadEnvFile('.env.local')
} catch {
  // Fall back to the environment.
}
if (!process.env.GEMINI_API_KEY) fail('GEMINI_API_KEY is missing — add it to .env.local')
const headers = { 'x-goog-api-key': process.env.GEMINI_API_KEY, 'content-type': 'application/json' }

if (values['list-models']) {
  const res = await fetch(`${API}/models?pageSize=200`, { headers })
  const json = await res.json()
  if (!res.ok) fail(`${res.status} ${JSON.stringify(json.error ?? json)}`)
  for (const model of json.models ?? []) {
    if (/image|banana/i.test(model.name)) console.log(model.name, '—', model.displayName)
  }
  process.exit(0)
}

if (values.prompt.length === 0 || !values.out) fail('Need at least one --prompt and an --out path')

const text = (await Promise.all(values.prompt.map((path) => readFile(path, 'utf8')))).join('\n\n')
const references = await Promise.all(
  values.in.map(async (path) => ({
    inline_data: {
      mime_type: MIME[extname(path).toLowerCase()] ?? 'image/png',
      data: (await readFile(path)).toString('base64'),
    },
  })),
)

const res = await fetch(`${API}/models/${MODEL}:generateContent`, {
  method: 'POST',
  headers,
  body: JSON.stringify({
    contents: [{ parts: [{ text }, ...references] }],
    generationConfig: {
      responseModalities: ['IMAGE'],
      ...(values.aspect && { imageConfig: { aspectRatio: values.aspect } }),
    },
  }),
})
const json = await res.json()
if (!res.ok) fail(`${res.status} ${JSON.stringify(json.error ?? json, null, 2)}`)

const parts = json.candidates?.[0]?.content?.parts ?? []
const image = parts.map((part) => part.inlineData ?? part.inline_data).find(Boolean)
if (!image) fail(`No image returned: ${JSON.stringify(json.candidates?.[0] ?? json).slice(0, 1500)}`)

await mkdir(dirname(values.out), { recursive: true })
await writeFile(values.out, Buffer.from(image.data, 'base64'))
console.log('wrote', values.out)

function fail(message) {
  console.error(message)
  process.exit(1)
}
