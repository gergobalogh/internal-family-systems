// Calibrate the Turn 0 form reading that chooses Turn 1's row.
//
//   npm run calibrate:turn1
//   npm run calibrate:turn1 -- several_feelings
//   npm run calibrate:turn1 -- phrases
//
// `phrases` checks Claude's phrase lifting instead (one call per free-write):
// the several-feelings corpus, through the app's own phrase check, since the
// choose row needs two phrases that survive it.
//
// Reads JEV_API_KEY and JEV_BASE_URL from .env, like the dev server. The
// corpus is deliberately messy: fragments, typos, context around feelings,
// and several-feeling answers where collapsing to one would lose a part.
import { loadEnv } from 'vite'
import { configFromEnv, liftFreeWritePhrases, readFreeWriteForm } from '../server/ai.ts'
import { nameWords, verifiedPhrases, wordRun } from '../src/conversation/checks.ts'
import { FREE_WRITE_FORM_LABELS } from '../src/conversation/contract.ts'
import type { FreeWriteFormLabel } from '../src/conversation/contract.ts'

const env = loadEnv('development', process.cwd(), '')
// Phrases come from Muse Spark when META_API_KEY is set, as in the app, else Claude.
const config = configFromEnv(env)
const liftingPhrases = process.argv[2] === 'phrases'
if (liftingPhrases ? !config.metaApiKey && !config.anthropicApiKey : !config.jevApiKey) {
  console.error(liftingPhrases ? 'Needs META_API_KEY or ANTHROPIC_API_KEY in .env.' : 'Needs JEV_API_KEY in .env.')
  process.exit(1)
}

const CORPUS: Record<FreeWriteFormLabel, string[]> = {
  one_feeling: [
    'just this constant worry about the meeting tomorrow, going round n round',
    'I feel so sad since dad moved away',
    'anger. mostly at my boss but honestly it follows me home',
    'not good enough not good enough not good enough, thats the loop',
    'i keep feeling judged whenever i open my mouth',
    'Lonely even when ppl are around',
    'there is this numb flat thing, like everything is behind glass',
    'exhausted... work, kids, house, all of it and i have nothing left',
    'The part yelling that I will mess up the presentation',
    'shame from what I said last night. still shame this morning',
    'I am nervous about the move and keep checking every detail',
    'grief, i guess. she died months ago but today its loud',
    'I want everyone happy with me and panic when they arent',
    'mostly irritated by every tiny noise today',
    'I feel invisible in my family',
    'scared to be seen trying in case i fail',
    'restless and keyed up — one buzzy feeling all day',
    'the quiet one who just wants everyone to leave me alone',
  ],
  several_feelings: [
    'angry at her but underneath that really sad',
    'work makes me anxious, and then I get mad at myself for being anxious',
    'half of me wants to go and another half is terrified to leave',
    'lonely + embarrassed that im lonely tbh',
    'I feel relieved the relationship ended and also heartbroken',
    'the critic keeps pushing while another bit of me is exhausted',
    'worry about money, anger at my brother, and this little spark of hope somehow',
    'idk, scared and weirdly excited at the same time',
    'one voice says hurry up. another says hide under the blankets',
    'mostly numb but then these flashes of rage',
    'ashamed of what happened; also resentful that I took all the blame',
    'I miss them and I am furious with them. both are true',
    'pressure to get it right / fear ill fail / wanting to just run away',
    'sad about mum, worried about the kids, annoyed at literally everyone',
    'there is a people pleasing part and a quiet NO behind it',
    'calm on the outside, panicking underneath, and the judge commenting on both',
    'I keep switching between hope that it works and dread that it wont',
    'guilt for saying no but relief that I finally did',
  ],
  situation: [
    'my landlord says we have to move by the end of the month',
    'three deadlines landed on friday and the client changed the brief again',
    'mum keeps calling while im trying to get the kids ready for school',
    'I have to decide whether to take the job in another city',
    'the car broke down and the repair is more than it is worth',
    'my partner and I keep having the same conversation about chores',
    'been awake since 4 and have a presentation at 9',
    'there are 200 emails and two people off sick',
    'I said yes to dinner with both families on the same night somehow',
    'the doctor wants me to come back for more tests next week',
    'moving house monday, boxes everywhere, movers havent confirmed',
    'my daughter starts a new school and the transport still isnt sorted',
    'I need to tell my manager I am leaving',
    'the roof is leaking into the spare room again',
    'we havent spoken since the argument on sunday',
    'I keep scrolling instead of starting the report',
    'rent, groceries, school forms. all due this week',
    'the team reorganized and now I report to someone new',
  ],
  little: [
    'idk',
    'not sure really',
    'everything',
    'a lot',
    'stuff',
    '...',
    'where do i even start',
    'same as usual',
    'nothing i can put into words',
    'meh',
    'yes',
    'today',
    'can we skip this',
    'asdf honestly',
    'too much',
    'no idea sorry',
    'all of it?',
    'I dont know yet',
  ],
}

/** The app's name cap (NAME_MAX_LENGTH in src/model/landscape.ts, which this script can't import). */
const NAME_MAX_LENGTH = 40

/** Several-feeling free-writes seen in real runs, for `phrases`. */
const SEEN_IN_RUNS = [
  // 2026-11-02: one lifted phrase was 42 characters, so Turn 1 showed no choices.
  "Work has been relentless and I keep lying awake replaying everything I said in meetings. Part of me says I'm not good enough and should push harder, and part of me just wants to hide under the covers and not deal with any of it.",
]

if (liftingPhrases) {
  const texts = [...CORPUS.several_feelings, ...SEEN_IN_RUNS]
  const lifted: Array<{ text: string; phrases: string[] | null; ms: number }> = []
  const lift = async (text: string) => {
    const start = performance.now()
    try {
      lifted.push({ text, phrases: await liftFreeWritePhrases(config, { freeWrite: text }), ms: performance.now() - start })
    } catch (error) {
      console.warn(`Failed: ${error instanceof Error ? error.message : 'unknown error'}`)
      lifted.push({ text, phrases: null, ms: performance.now() - start })
    }
  }
  for (let at = 0; at < texts.length; at += 4) await Promise.all(texts.slice(at, at + 4).map(lift))

  let rows = 0
  let tooLong = 0
  let notTheirs = 0
  for (const { text, phrases } of lifted) {
    const kept = verifiedPhrases(text, phrases, NAME_MAX_LENGTH)
    if (kept.length >= 2) rows++
    const dropped = (phrases ?? []).flatMap((phrase) => {
      const run = wordRun(text, nameWords(phrase))
      if (!run) return [`${JSON.stringify(phrase)} not word for word`]
      if (run.text.length > NAME_MAX_LENGTH) return [`${JSON.stringify(phrase)} ${run.text.length} characters`]
      return []
    })
    tooLong += dropped.filter((reason) => reason.endsWith('characters')).length
    notTheirs += dropped.filter((reason) => reason.endsWith('word for word')).length
    const mark = phrases === null ? '!' : kept.length >= 2 ? '✓' : '✗'
    console.log(`\n${mark} ${JSON.stringify(text.length > 90 ? `${text.slice(0, 90)}…` : text)}`)
    console.log(`  kept: ${kept.map((phrase) => `‘${phrase}’`).join(' · ') || '(none)'}`)
    if (dropped.length) console.log(`  dropped: ${dropped.join('; ')}`)
  }
  const times = lifted.map(({ ms }) => ms).sort((a, b) => a - b)
  console.log(`\n${rows} of ${lifted.length} keep two or more phrases (a choose row).`)
  console.log(`Dropped: ${tooLong} over ${NAME_MAX_LENGTH} characters, ${notTheirs} not word for word.`)
  console.log(`Median ${Math.round(times[Math.floor(times.length / 2)])} ms; slowest ${Math.round(times.at(-1) ?? 0)} ms.`)
  process.exit(0)
}

const picked = process.argv[2] as FreeWriteFormLabel | undefined
if (picked && !FREE_WRITE_FORM_LABELS.includes(picked)) {
  console.error(`Unknown label ${JSON.stringify(picked)}; use ${FREE_WRITE_FORM_LABELS.join(', ')}.`)
  process.exit(1)
}

interface Case {
  expected: FreeWriteFormLabel
  text: string
}

const cases: Case[] = (picked ? [picked] : FREE_WRITE_FORM_LABELS).flatMap((expected) =>
  CORPUS[expected].map((text) => ({ expected, text })),
)
const concurrency = 4
const results: Array<{
  expected: FreeWriteFormLabel
  actual: FreeWriteFormLabel | null
  probability: number | null
  probabilities: Record<FreeWriteFormLabel, number> | null
  text: string
  ms: number
}> = []

async function read(one: Case) {
  const start = performance.now()
  try {
    const result = await readFreeWriteForm(config, { freeWrite: one.text })
    results.push({
      ...one,
      actual: result?.label ?? null,
      probability: result ? result.probabilities[result.label] : null,
      probabilities: result?.probabilities ?? null,
      ms: performance.now() - start,
    })
  } catch (error) {
    console.warn(`Failed: ${error instanceof Error ? error.message : 'unknown error'}`)
    results.push({ ...one, actual: null, probability: null, probabilities: null, ms: performance.now() - start })
  }
}

for (let at = 0; at < cases.length; at += concurrency) {
  await Promise.all(cases.slice(at, at + concurrency).map(read))
  console.log(`Read ${Math.min(at + concurrency, cases.length)} / ${cases.length}`)
}

const matrix = Object.fromEntries(
  FREE_WRITE_FORM_LABELS.map((expected) => [
    expected,
    Object.fromEntries([...FREE_WRITE_FORM_LABELS, 'failed'].map((actual) => [actual, 0])),
  ]),
) as Record<FreeWriteFormLabel, Record<FreeWriteFormLabel | 'failed', number>>

for (const result of results) matrix[result.expected][result.actual ?? 'failed']++

console.log('\nConfusion matrix (rows expected, columns returned)')
console.log(['expected'.padEnd(20), ...FREE_WRITE_FORM_LABELS.map((label) => label.slice(0, 8).padStart(9)), 'failed'.padStart(9)].join(''))
for (const expected of FREE_WRITE_FORM_LABELS) {
  console.log(
    [expected.padEnd(20), ...FREE_WRITE_FORM_LABELS.map((actual) => String(matrix[expected][actual]).padStart(9)), String(matrix[expected].failed).padStart(9)].join(''),
  )
}

const wrong = results.filter((result) => result.actual !== result.expected)
for (const result of wrong) {
  const confidence = result.probability === null ? '-' : result.probability.toFixed(3)
  console.log(`\n✗ ${result.expected} → ${result.actual ?? 'failed'} (${confidence})\n  ${JSON.stringify(result.text)}`)
  if (result.probabilities) console.log(`  ${JSON.stringify(result.probabilities)}`)
}

const costly = results.filter((result) => result.expected === 'several_feelings' && result.actual === 'one_feeling')
const times = results.map(({ ms }) => ms).sort((a, b) => a - b)
console.log(`\n${results.length - wrong.length} of ${results.length} as expected.`)
console.log(`Several incorrectly collapsed to one: ${costly.length}.`)
console.log(`Median ${Math.round(times[Math.floor(times.length / 2)])} ms; slowest ${Math.round(times.at(-1) ?? 0)} ms.`)
