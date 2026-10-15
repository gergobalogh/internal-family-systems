# Brief 3 — Uncertainty framing + Mirror→Guide transition: research output

Date: 2026-10-12. Status: done (direct research, same method as Brief 1).

Question: how to present AI interpretations of inner life as tentative,
editable hypotheses, and when to shift from reflecting to gently guiding.

## Sources actually read

| # | Source | Quality |
|---|--------|---------|
| T1 | [UC Irvine — Steyvers et al., Nature Machine Intelligence](https://news.uci.edu/2025/01/22/uc-irvine-study-finds-mismatch-between-human-perception-and-reliability-of-ai-assisted-language-tools/) — n=301; users overestimate LLM accuracy; uncertainty phrasing improves calibration + discrimination; longer explanations inflate confidence without improving accuracy | university summary of peer-reviewed |
| T2 | [Psychwire — Change Talk and Sustain Talk (Miller/Moyers)](https://psychwire.com/free-resources/expert-insights/resource-uxteij/change-talk-and-sustain-talk) — DARN-CATs; change:sustain ratio predicts outcomes (Magill 2018); reflecting change talk → more change talk; advising without permission → more sustain talk (Moyers 2009) | practitioner summary of peer-reviewed |
| T3 | [SelectRehab — Motivational Interviewing (MI overview PDF)](https://www.selectrehab.com/pdfs/motivational_interviewing.pdf) — Elicit-Provide-Elicit / "persuade with permission"; "is it okay if…?"; permission "respects and supports patient autonomy… increasing trust" | clinical training doc (fetched PDF) |
| T4 | [Attrill — Resilient conversations: UX patterns for AI](https://medium.com/@think_ui/designing-for-resilient-conversations-ux-design-patterns-for-ai-interfaces-727d6ce74f15) — editable outputs, manual override, mode switching, threaded context, confidence indicators, "just enough reasoning" | practitioner essay (fetched) |
| T5 | UCSF Hospital Handbook MI chapter — permission wordings ("would it be alright if…", "are you open to one thought…?", "can I share one piece of information with you?"); page 403'd, snippets only | snippet (authoritative host) |
| T6 | Over-hedging risk (faithful-uncertainty literature): excessive hedging → frustration + distrust; Apple HIG (Edit/Undo/Retry near output preserves agency); MS HAI guidelines (reversible actions) | snippets, multiply corroborated |

Reused: Brief 1 S6 (Clean outcome question "what would you like to have
happen?"), S2 pacing caveat; Brief 2 §4 current-state tagging, §5
reflect-then-confirm.

## Answers to the brief's five questions

### 1. Hedging and attribution phrasing

Match language to confidence — "by modifying the language of LLM responses to
better reflect model confidence, users… are better able to discriminate
between correct and incorrect answers" (T1). Working set:

- Attribution: "in your words…", "you called it [X]", "what I'm hearing is…"
- Hedge: "it sounds like…", "one way to see this…", "I might be off, but…",
  "correct me if…"
- Keep hedged turns SHORT: "participants had higher confidence in longer
  explanations… even when the extra length didn't improve accuracy" (T1).
  Verbosity masquerades as certainty — the opposite of the intent.

### 2. Showing low confidence without undermining trust

Convert low-confidence assertions into questions: "I'm least sure about [X]
— is it more A or B, or neither?" Pair every uncertain claim with a visible
correction affordance (T4: confidence indicators + editable outputs). Avoid
percentages (false precision) and avoid hedging everything (T6: over-hedging
→ frustration + distrust). Rule: hedge the interpretation, never the
invitation to correct — "what would you change?" is always stated plainly.

### 3. Separating current-state edits from desired-state experiments

Recommendation: explicit labeled modes + separate thread, not implicit
inference.

- Two modes, always labeled: **"How it is"** (current) vs **"What if"**
  (desired). Mode switching "match[es] task mindset" (T4).
- Desired-state play happens in a visually distinct "What if" thread/canvas
  with one-tap return and instant undo (T4: threaded context "isolate[s]
  goals"; editable outputs; manual override; T6: reversible actions).
- Language gate: current-state uses attribution hedges (Q1); desired-state
  opens only via the Clean outcome question — "what would you like to have
  happen?" (Brief 1 S6) — plus conditional framing ("if [X] had more room,
  what might shift?").
- Default every inferred attribute to current-state unless the user is
  explicitly imagining change (Brief 2 §4 rule, kept).

### 4. When the app has "earned the right" to suggest an experiment

Readiness signals (adapted from MI; all four must hold before the first
invitation):

1. User emits **preparatory change talk** (DARN: desire "I want…", ability
   "I could…", reasons, need "something has to change") — "weighing change"
   (T2).
2. **No sustain-talk dominance** in the latest turn ("I can't…", "that's
   just how I am"); sustain dominance predicts worse outcomes (T2).
3. At least one **correction/confirmation loop completed** — the user has
   exercised edit authority, proving editable-hypothesis framing landed.
4. Map is stable: **2+ parts named in the user's own words.**

Invitation wording follows Elicit-Provide-Elicit (T3): elicit what they know
→ provide-with-permission → elicit their response. Template:

> "You've tried [their words]. Would it be alright if we tried something
> tiny — move [X] somewhere it feels better and notice what shifts? You can
> undo it instantly. … What was that like?"

Never before late turn 3; default stays Mirror. If sustain talk follows,
drop back to reflecting — "advising without permission" increases sustain
talk (T2, Moyers 2009).

### 5. Responding to correction or rejection

- Accept immediately, visibly, without defending the old reading: "Thanks —
  fixing that: [X] is [corrected]. Anything else off?" (T4: "editable
  results encourage correction, refinement, and collaboration").
- Re-reflect in their corrected words next turn (T2: reflecting the user's
  language shapes what follows).
- If they reject a whole part: remove it, confirm removal, never argue for
  it ("manual override… preserve[s] autonomy", T4). A rejected
  interpretation that lingers on screen teaches the user corrections don't
  work.
- Log the source phrase with the correction (Brief 2 §4: record the phrase,
  not just the number) so re-inference doesn't resurrect it.

## Deliverable

**Phrasing toolkit** — hedges/attribution (Q1), low-confidence → question
(Q2), EPE experiment invitation (Q4), correction script (Q5). Full set above.

**Current-vs-desired pattern** — labeled "How it is" / "What if" modes;
"What if" thread with one-tap return + instant undo; Clean outcome question
as the language gate; current-state default tagging (Q3).

**Transition criteria** — four readiness signals + EPE invitation template +
Mirror fallback on sustain talk (Q4). Earliest: late turn 3 / post-
visualization; default: stay Mirror.

## Caveats

- T1/T2 findings come from factual-QA and addiction-counseling contexts;
  transfer to parts-work visualization is reasoned, not directly tested.
- UCSF permission wordings (T5) and over-hedging/undo guidelines (T6) are
  snippet-sourced; direction multiply corroborated, exact text not
  page-verified.
- Change-talk detection in 3–4 short turns is ambitious: treat signals 1–2
  as "present / not observed" rather than scored ratios.
