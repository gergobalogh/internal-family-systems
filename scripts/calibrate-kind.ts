// Calibrate the hidden part-kind reading that chooses each starting ring.
//
//   npm run calibrate:kind
//   npm run calibrate:kind -- guards
//
// This calls the same combined figure + kind JEV request as the app. The
// corpus mixes names with surrounding context because vague names are common.
import { loadEnv } from 'vite'
import { readFigureAndKind } from '../server/ai.ts'
import { PART_KIND_LABELS } from '../src/conversation/contract.ts'
import type { PartKind } from '../src/conversation/contract.ts'

const env = loadEnv('development', process.cwd(), '')
const config = {
  jevApiKey: env.JEV_API_KEY,
  jevBaseUrl: env.JEV_BASE_URL || 'https://api.typesafe.ai',
}
if (!config.jevApiKey) {
  console.error('Needs JEV_API_KEY in .env.')
  process.exit(1)
}

interface Example {
  name: string
  freeWrite: string
}

const CORPUS: Record<PartKind, Example[]> = {
  guards: [
    { name: 'the critic', freeWrite: 'The critic says nothing I do is good enough and keeps pushing me.' },
    { name: 'the planner', freeWrite: 'I rehearse every possible outcome so I will not be caught out.' },
    { name: 'the one who has to get it right', freeWrite: 'Mistakes feel impossible, so I check everything three times.' },
    { name: 'my anger', freeWrite: 'My anger jumps in when someone talks down to me.' },
    { name: 'the people pleaser', freeWrite: 'I keep everyone happy so they do not get upset with me.' },
    { name: 'the controller', freeWrite: 'I need everything organised or I start to panic.' },
    { name: 'the worrier', freeWrite: 'It runs through what might go wrong so I can be ready.' },
    { name: 'the pusher', freeWrite: 'It will not let me rest until the work is perfect.' },
    { name: 'the one who says no', freeWrite: 'It gets fierce when people cross my boundaries.' },
    { name: 'hyper-alert me', freeWrite: 'Always scanning the room to make sure nothing bad happens.' },
  ],
  escapes: [
    { name: 'the scroller', freeWrite: 'I disappear into my phone whenever the feelings start.' },
    { name: 'the numb one', freeWrite: 'It turns everything off when life is too much.' },
    { name: 'the procrastinator', freeWrite: 'I avoid starting because I cannot face the pressure.' },
    { name: 'the one who checks out', freeWrite: 'When conflict starts I go blank and leave in my head.' },
    { name: 'the bingeing part', freeWrite: 'It eats until I cannot feel the loneliness for a while.' },
    { name: 'the daydreamer', freeWrite: 'It escapes into stories when the present hurts.' },
    { name: 'the shutdown', freeWrite: 'I shut off and stop responding when overwhelmed.' },
    { name: 'the avoider', freeWrite: 'It finds ten other jobs instead of opening the email.' },
    { name: 'the one who sleeps all day', freeWrite: 'Sleeping is how I get away from what I feel.' },
    { name: 'the disappearing act', freeWrite: 'I withdraw from everyone before they can see me struggling.' },
  ],
  hurts: [
    { name: 'the shame', freeWrite: 'I feel defective and want to hide after what happened.' },
    { name: 'the scared kid', freeWrite: 'A little scared part thinks everyone will leave.' },
    { name: 'the sadness', freeWrite: 'I miss my dad and the sadness is heavy today.' },
    { name: 'not good enough', freeWrite: 'That not-good-enough feeling sits in my chest.' },
    { name: 'the lonely one', freeWrite: 'It feels alone even when friends are nearby.' },
    { name: 'grief', freeWrite: 'Grief about losing her keeps washing over me.' },
    { name: 'the frightened part', freeWrite: 'It is afraid I will be rejected.' },
    { name: 'the failure', freeWrite: 'I feel like a failure after the interview.' },
    { name: 'the exhausted one', freeWrite: 'It has carried too much for too long and has nothing left.' },
    { name: 'the hurt little me', freeWrite: 'It still hurts from being laughed at back then.' },
  ],
  other: [
    { name: 'the playful one', freeWrite: 'It wants to make a blanket fort and laugh.' },
    { name: 'my creative side', freeWrite: 'I want to paint without needing it to be useful.' },
    { name: 'hope', freeWrite: 'There is still a little hope that things can change.' },
    { name: 'the curious one', freeWrite: 'It wonders what would happen if I tried.' },
    { name: 'the calm part', freeWrite: 'Some of me feels calm and steady.' },
    { name: 'joy', freeWrite: 'Joy showed up when I saw the first flowers.' },
    { name: 'the singer', freeWrite: 'It loves singing in the kitchen just because.' },
    { name: 'the explorer', freeWrite: 'It wants to see somewhere new and have an adventure.' },
    { name: 'something', freeWrite: 'There is something here but I cannot tell what it is.' },
    { name: 'me', freeWrite: 'I do not have more words for it yet.' },
  ],
}

const picked = process.argv[2] as PartKind | undefined
if (picked && !PART_KIND_LABELS.includes(picked)) {
  console.error(`Unknown label ${JSON.stringify(picked)}; use ${PART_KIND_LABELS.join(', ')}.`)
  process.exit(1)
}

const cases = (picked ? [picked] : PART_KIND_LABELS).flatMap((expected) =>
  CORPUS[expected].map((example) => ({ expected, ...example })),
)
const results: Array<{
  expected: PartKind
  actual: PartKind | null
  probability: number | null
  probabilities: Record<PartKind, number> | null
  name: string
  ms: number
}> = []

async function read(one: (typeof cases)[number]) {
  const start = performance.now()
  try {
    const result = await readFigureAndKind(config, {
      name: one.name,
      question: 'Which feeling has been loudest lately — what would you call it?',
      freeWrite: one.freeWrite,
    })
    const kind = result?.kind ?? null
    results.push({
      ...one,
      actual: kind?.label ?? null,
      probability: kind ? kind.probabilities[kind.label] : null,
      probabilities: kind?.probabilities ?? null,
      ms: performance.now() - start,
    })
  } catch (error) {
    console.warn(`Failed: ${error instanceof Error ? error.message : 'unknown error'}`)
    results.push({ ...one, actual: null, probability: null, probabilities: null, ms: performance.now() - start })
  }
}

const concurrency = 4
for (let at = 0; at < cases.length; at += concurrency) {
  await Promise.all(cases.slice(at, at + concurrency).map(read))
  console.log(`Read ${Math.min(at + concurrency, cases.length)} / ${cases.length}`)
}

const matrix = Object.fromEntries(
  PART_KIND_LABELS.map((expected) => [
    expected,
    Object.fromEntries([...PART_KIND_LABELS, 'failed'].map((actual) => [actual, 0])),
  ]),
) as Record<PartKind, Record<PartKind | 'failed', number>>
for (const result of results) matrix[result.expected][result.actual ?? 'failed']++

console.log('\nConfusion matrix (rows expected, columns returned)')
console.log(['expected'.padEnd(12), ...PART_KIND_LABELS.map((label) => label.padStart(9)), 'failed'.padStart(9)].join(''))
for (const expected of PART_KIND_LABELS) {
  console.log(
    [expected.padEnd(12), ...PART_KIND_LABELS.map((actual) => String(matrix[expected][actual]).padStart(9)), String(matrix[expected].failed).padStart(9)].join(''),
  )
}

const wrong = results.filter((result) => result.actual !== result.expected)
for (const result of wrong) {
  const confidence = result.probability === null ? '-' : result.probability.toFixed(3)
  console.log(`\n✗ ${result.expected} → ${result.actual ?? 'failed'} (${confidence})\n  ${JSON.stringify(result.name)}`)
  if (result.probabilities) console.log(`  ${JSON.stringify(result.probabilities)}`)
}

const actedWrong = wrong.filter((result) => (result.probability ?? 0) >= 0.7)
const times = results.map(({ ms }) => ms).sort((a, b) => a - b)
console.log(`\n${results.length - wrong.length} of ${results.length} as expected.`)
console.log(`Wrong readings above the app's 0.70 action threshold: ${actedWrong.length}.`)
console.log(`Median ${Math.round(times[Math.floor(times.length / 2)])} ms; slowest ${Math.round(times.at(-1) ?? 0)} ms.`)
