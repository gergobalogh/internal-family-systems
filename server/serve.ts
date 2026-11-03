/**
 * The AI routes on their own, for a host without Vite (the VPS): Caddy
 * serves the built app from dist/ and sends /api/* here (deploy/ifs.caddy).
 * Listens on 127.0.0.1 only, so only Caddy reaches it.
 *
 *   node --env-file=.env server/serve.ts        PORT defaults to 8785
 *
 * Keys come from the environment (see `configFromEnv` in ai.ts). The routes
 * have no login, so two limits keep a public test link from running up a
 * bill: each visitor's address gets a number of AI calls an hour, and the
 * whole site a number a day. Over a limit the answer is 429, and the app
 * carries on with its fixed lines, as it does when the AI is down.
 */
import { createServer } from 'node:http'
import { configFromEnv, createHandler } from './ai.ts'

const PORT = Number(process.env.PORT) || 8785
/** A whole walk makes about 30 AI calls; this allows several an hour per visitor. */
const PER_VISITOR_HOUR = Number(process.env.AI_CALLS_PER_VISITOR_HOUR) || 200
/** Every visitor together, per day (UTC): a ceiling on what a day can cost. */
const PER_DAY = Number(process.env.AI_CALLS_PER_DAY) || 2000
const HOUR_MS = 60 * 60 * 1000

const config = configFromEnv(process.env)
const handle = createHandler(config)

const visitors = new Map<string, number[]>()
let day = ''
let today = 0

/** Whether this visitor may make another AI call now; counts it if so. */
function allowed(visitor: string, now: number): boolean {
  const date = new Date(now).toISOString().slice(0, 10)
  if (date !== day) {
    day = date
    today = 0
    visitors.clear()
  }
  const recent = (visitors.get(visitor) ?? []).filter((at) => now - at < HOUR_MS)
  if (recent.length >= PER_VISITOR_HOUR || today >= PER_DAY) {
    visitors.set(visitor, recent)
    return false
  }
  recent.push(now)
  visitors.set(visitor, recent)
  today++
  return true
}

const server = createServer((req, res) => {
  // Caddy sets X-Forwarded-For to the visitor's address (it trusts no incoming one).
  const forwarded = req.headers['x-forwarded-for']
  const visitor = (typeof forwarded === 'string' ? forwarded.split(',')[0].trim() : '') || req.socket.remoteAddress || 'unknown'
  if (req.method === 'POST' && req.url?.startsWith('/api/') && !allowed(visitor, Date.now())) {
    res.statusCode = 429
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify({ error: 'too many requests' }))
    return
  }
  void handle(req, res, () => {
    res.statusCode = 404
    res.end()
  })
})

server.listen(PORT, '127.0.0.1', () => {
  const words = config.metaApiKey ? 'Muse Spark' : config.anthropicApiKey ? 'Claude' : 'none (fixed lines)'
  const has = (key: string | undefined) => (key ? 'on' : 'off')
  console.log(
    `[ai] listening on 127.0.0.1:${PORT}; words: ${words}; JEV ${has(config.jevApiKey)}; ` +
      `OpenAI moderation ${has(config.openaiApiKey)}; limits ${PER_VISITOR_HOUR}/visitor/hour, ${PER_DAY}/day`,
  )
})
