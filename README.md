# Internal Family Systems — inner landscape

Product concept: [project.md](project.md). What a person sees and does,
step by step: [docs/how-it-works.md](docs/how-it-works.md). Work in
progress: [PROJECT_BOARD.md](PROJECT_BOARD.md). The app is one walk in
three acts, from the story redesign
([docs/redesign/story-redesign.md](docs/redesign/story-redesign.md), Option
A): Act 1 meets who's here (Turn 3 asks who else, and it closes with "These
are the ones who came."), Act 2 sits with one part the person taps, Act 3
steps back for one "what if" at dusk, and the ending gives a picture to
keep. The meadow is then saved on the device, and a later visit opens on
it. After the walk there's no menu or mode: the parts keep their own few
controls, Undo waits in the corner, the app asks once when an edit changes
what the map says, and a safety pause covers the whole app. The earlier
slices it grew from: [slice 1](docs/slice-1-handoff.md)'s landscape,
[slice 2](docs/slice-2-handoff.md)'s Turns 0–2,
[slice 3](docs/slice-3-handoff.md)'s entry conversation and
[slice 4](docs/slice-4-handoff.md)'s after-conversation tools, most of
which the redesign moved into the walk or cut.
The conversation is one glass card under the house, per
[docs/input-choreography-plan.md](docs/input-choreography-plan.md).

```bash
npm install
cp .env.example .env   # add ANTHROPIC_API_KEY (or META_API_KEY), JEV_API_KEY and OPENAI_API_KEY
npm run dev            # http://localhost:5173
npm run build
npm run lint
```

Missing or failing AI never blocks the conversation: reflections fall back
to scripted lines, the toward-check takes the single-part path, Turn 3
moves nothing unless the answer matches a fixed list, and the risk check
falls back to the local phrase list. In
dev, `?ai=off` forces every AI call down its fallback path, and
`?jump=after` starts at Act 1's close of a scripted full run (two linked
parts) to try everything after the entry conversation; the two combine.
`?ai=scripted` answers every AI call on the device instead, with no model
call: the free-write's short clauses become feeling buttons, Turn 2 brings
a second part, and parts start in different places, so the whole walk can
be tried, on a phone too (`npm run dev -- --host`, then the laptop's
network address).

Every typed answer is screened before anything reads it: a local list of
risk phrases (`RISK_PHRASES` in `src/conversation/checks.ts`), then an AI
check: OpenAI moderation's self-harm scores and a JEV judgement, side by
side, either of which can pause. To re-check the thresholds against a set
of made-up answers (after OpenAI updates its moderation model, say), run
`node scripts/calibrate-risk.ts`. A hit drops the answer and shows a fixed pause card with a link to
an international helpline directory (`SUPPORT_URL` in
`src/ui/Conversation.tsx`); the guide stays quiet for the rest of the
session, and the map stays editable.

## Layout

- `src/model/` — framework-free state model: global part identity
  (name, removal) plus per-mode placements (the "what if" layout is Act
  3's dusk), with per-mode undo. `addPart` brings in conversation-named
  parts without an undo entry; a part's voice and intent (Act 2) belong to
  its identity, like its name.
- `src/conversation/` — the entry conversation: the pinned script
  (`script.ts`), the state machine and provenance record (`flow.ts`),
  answer lists and reflection checks (`checks.ts`), map distances
  (`geometry.ts`), the deterministic map summary (`summary.ts`), the
  browser side of the AI calls (`ai.ts`, `contract.ts`), and the dev-only
  jump to Act 1's close (`devJump.ts`), and the meadow saved in this
  browser's storage for the next visit (`saved.ts`, no account). After Go on, `flow.ts` runs Act 2
  (sitting with one part; its Fears question waits for a therapist's
  review and shows only with `?fears`, `features.ts`) and Act 3 (step
  back, then one "what if" with Go back / Keep it) and the ending (the
  picture itself is drawn in `src/ui/picture.ts`), then noticing, and the
  safety pause.
- `server/ai.ts` — the AI routes (`/api/reflect` → Claude, or Muse Spark
  when `META_API_KEY` is set, `/api/risk` → OpenAI moderation + JEV,
  `/api/figure` → one JEV request for figure + hidden kind,
  `/api/toward-check` → JEV, `/api/extract-name` → Claude or Muse Spark, and
  `/api/free-write` → JEV form reading + phrase lifting by Claude or Muse
  Spark), mounted on Vite's dev and preview servers. API keys are read here
  only and never reach the browser. `server/serve.ts` serves the same routes
  on their own, with a rate limit, for the test link on the VPS
  ([deploy/README.md](deploy/README.md): ifs.gergobalogh.me).
- `src/ui/` — the landscape (world → links → characters),
  the conversation card and its timing (`Conversation.tsx`,
  `useChoreography.ts`: send → ghost → the world waits → a new part walks
  in → next card), Act 2's camera and the part's speech (`useCamera.ts`,
  `Speech.tsx`), the part's box (`PartFigure.tsx`: tap the name to rename,
  the "…" for Change figure, Not one of my parts and Clear what it said),
  noticing edits once
  the person rests (`useNoticing.ts`), and the removal notice. UI wording
  lives in
  `src/ui/copy.ts`; the guide's lines live in `src/conversation/script.ts`.
- `src/analytics.ts` — Umami events: how far a visit gets through the
  walk, never what anyone wrote ([docs/analytics.md](docs/analytics.md)).
- `src/styles/` — palette tokens, and the dusk light of Act 3 and the
  ending (`[data-mode]`, `[data-beat]`).
- `art/prompts/`, `scripts/studio/`, `scripts/cutout-figures.py` — how the
  images are generated and prepared: [docs/image-generation.md](docs/image-generation.md).
- `art/rive/` — Rive scenes generated from Python (the Critic's walk, the
  Defender's parachute, the Sleeper's leaf drift, the Sprout's rise; shared
  helpers in `art/rive/rivegen.py`): how to make another entrance like them,
  [docs/rive-entrance-playbook.md](docs/rive-entrance-playbook.md); the ideas
  per character, [docs/character-entrances.md](docs/character-entrances.md).
