# Internal Family Systems — inner landscape

Product concept: [project.md](project.md). What a person sees and does,
step by step: [docs/how-it-works.md](docs/how-it-works.md). Work in
progress: [PROJECT_BOARD.md](PROJECT_BOARD.md). Current slice:
[docs/slice-4-handoff.md](docs/slice-4-handoff.md) — after the map is the
person's: one invited "What if" experiment, "Get to know it" (a part's voice
and what it might be trying to do), a question when a "How it is" edit
changes what the map says, and a safety pause across the whole app. It
builds on [slice 3](docs/slice-3-handoff.md)'s whole entry conversation
(Turns 0–4: centrality, the unheard part, a confirmation with one
correction round), [slice 2](docs/slice-2-handoff.md)'s Turns 0–2 and
[slice 1](docs/slice-1-handoff.md)'s "How it is" / "What if…" landscape.
The conversation is one glass card under the house, per
[docs/input-choreography-plan.md](docs/input-choreography-plan.md).

```bash
npm install
cp .env.example .env   # add ANTHROPIC_API_KEY, JEV_API_KEY and OPENAI_API_KEY
npm run dev            # http://localhost:5173
npm run build
npm run lint
```

Missing or failing AI never blocks the conversation: reflections fall back
to scripted lines, the toward-check takes the single-part path, Turn 3
moves nothing unless the answer matches a fixed list, an unparsed
correction points to the map instead (so the experiment invitation is the
generic one), and the risk check falls back to the local phrase list. In
dev, `?ai=off` forces every AI call down its fallback path, and
`?jump=after` starts at the closing card of a scripted full run (two linked
parts, an unheard part, a wish) to try everything after the entry
conversation; the two combine.

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
  (name, removal) plus per-mode placements, with per-mode undo.
  `addPart` brings in conversation-named parts without an undo entry; a
  part's voice and intent ("Get to know it") belong to its identity, like
  its name.
- `src/conversation/` — the entry conversation: the pinned script
  (`script.ts`), the state machine and provenance record (`flow.ts`),
  answer lists and reflection checks (`checks.ts`), map distances
  (`geometry.ts`), the deterministic Turn 4 summary (`summary.ts`),
  verifying and applying parsed corrections (`corrections.ts`), the
  browser side of the AI calls (`ai.ts`, `contract.ts`), and the dev-only
  jump to closing (`devJump.ts`). After closing, `flow.ts` also runs the
  invitation and experiment, Get to know it, noticing, and the safety
  pause.
- `server/ai.ts` — the AI routes (`/api/reflect` and `/api/corrections` →
  Claude, `/api/risk` → OpenAI moderation + JEV, `/api/toward-check` and
  `/api/centrality` → JEV),
  mounted on Vite's dev and preview servers. API keys are read here only
  and never reach the browser; any other host needs the same five routes.
- `src/ui/` — the landscape (world → links → characters → mode frame),
  the conversation card and its timing (`Conversation.tsx`,
  `useChoreography.ts`: send → ghost → the world waits → a new part walks
  in → next card), the map note (the summary a finished conversation
  leaves on the map, kept true to it in either mode), noticing "How it is"
  edits once the person rests (`useNoticing.ts`), mode bar, and removal
  notice. UI wording lives in
  `src/ui/copy.ts`; the guide's lines live in `src/conversation/script.ts`.
- `src/styles/` — palette tokens and the two mode themes (`[data-mode]`).
- `art/prompts/`, `scripts/studio/`, `scripts/cutout-figures.py` — how the
  images are generated and prepared: [docs/image-generation.md](docs/image-generation.md).
- `art/rive/` — Rive scenes generated from Python (the Critic's walk, the
  Defender's parachute, the Sleeper's leaf drift, the Sprout's rise; shared
  helpers in `art/rive/rivegen.py`): how to make another entrance like them,
  [docs/rive-entrance-playbook.md](docs/rive-entrance-playbook.md); the ideas
  per character, [docs/character-entrances.md](docs/character-entrances.md).
