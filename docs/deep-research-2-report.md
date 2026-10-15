# Deep Research 2 — Mappable UX: plain language → spatial attributes

Scope: Brief 2 ([research-briefs.md](../research-briefs.md) L21-31) for the visual IFS-inspired app in [project.md](../project.md). Greenfield: no implementation, schema, or test files exist; only the two docs above.

## 1. Everyday-words phrasing bank (Q1)

Map each spatial attribute to ordinary words. Grounding: IFS Parts Mapping worksheet uses plain words ("How far are you from that part?", "What is its role?"); project.md L31-37 target queries are already near-everyday.

| Attribute | Render channel | Everyday phrasings |
|---|---|---|
| Influence / size | scale, volume | "loudest lately", "takes up the most room/space", "hardest to ignore" |
| Centrality / closeness | position, distance from centre | "feels close", "off to the side", "how far does it feel?" |
| Allied | proximity, overlap | "on the same side", "team up", "go together" |
| In tension | separation, facing | "clash", "at odds", "pull in different directions" |
| Silenced / pushed aside | edge placement, small scale | "pushed aside", "drowned out", "rarely gets heard", "not been heard" |

Prefer size + vertical/centre-distance semantics over left/right placement: lateral good-is-right flips for left-handers (Casasanto) and RTL cultures (Maass & Russo), while vertical good-is-up is near-universal (Marmolejo-Ramos et al.). Caveat: the primary handedness/writing-direction papers were not opened (paywalled; snippets only).

## 2. Existing tools that map feelings/parts to space (Q2)

- **IFS Parts Mapping Exercise** (adapted Schwartz 1997; Cable Psychotherapy PDF — opened, quoted): 6Fs flow; spatial probe "How far are you from that part?"; role probe "What is its role? What is its purpose?"; fear probe "What is the Part afraid would happen if it stopped?" Everyday, non-clinical diction is the model.
- **Sociometry / sociogram** (Moreno; Wikipedia — opened): individuals as nodes, relationships as arcs; reveals alliances, subgroups, conflict. Classroom prompt "who wants to sit next to whom" is a direct closeness/tension elicitation model. Caution: psychodrama/sociometry needs trained facilitation and group context with a thin evidence base (Blatner; Springer EBP chapter) — do not lift sociogram wording wholesale into a solo 4-turn chatbot.
- **emBODY bodily-maps tool** (Nummenmaa et al. 2014, PNAS 111(2):646-651, DOI 10.1073/pnas.1321664111; PNAS URL 403, body inspected via PMC full text): n=701, 5 experiments; participants colour body silhouettes for increased/decreased activity. Emotions yield separable maps (72% one-out LDA; cross-experiment concordance rs=0.83 matching vs 0.52 mismatched; human recognition 46% vs 14% chance); West-European vs East-Asian maps similar (rs=0.70 vs 0.40 mismatched). Takeaway: spatial self-report of feeling is reliable and cross-culturally stable at the body level — supports asking spatial questions in plain words. Topography notes: head/upper-chest activation common; anger/happiness upper-limb activation, sadness limb deactivation; happiness whole-body enhancement.
- **OARS / Motivational Interviewing** (Universal Coach Institute — opened): Open questions, Affirmations, Reflective listening, Summaries. Reflect-then-confirm keeps mapping client-centred and non-leading (see §4).

Not inspected: an emotional-mapping facilitation PDF (image-only, no extractable text).

## 3. Sequencing: one mappable layer per turn (Q3)

Pattern (Scalarly conversational-AI design — opened): reflect understanding back before acting; users prefer a bot that asks one clarifying question over one that confidently does the wrong thing; progressive disclosure — start broad, add one layer per turn, drill deeper only as needed. Local constraints: ~3-4 turns of reflection + one focused question (project.md L7-9, L14-17); one visual surprise at a time, traces (movement/shadow/colour/silhouette) before named parts (L77-79).

Rule: each turn elicits exactly one new spatial attribute; never ask size + closeness + relationship in one turn.

## 4. Turn-by-turn attribute plan (deliverable)

Each turn = short reflection + one focused question (Mirror role early; Gentle-guide experiments deferred to later turns / Brief 3).

- **Turn 1 — Identity + influence/size.** Elicit: part names/words + which dominates. Render: first traces appear; relative scale. Example: "Which voice has been loudest lately? What does it keep saying?" → size/volume attribute, tentative identity + words + role seed.
- **Turn 2 — Centrality/closeness.** Elicit: near vs far for each named part. Render: distance from centre. Example: "Does that one feel close, or more off to the side?" Optionally: "How far does it feel right now?"
- **Turn 3 — Relationships (allied / in tension / silenced).** Elicit: pairwise links. Render: proximity/overlap (allied), separation (tension), edge + small (silenced). Examples (pick one per turn, not all): "Are any of these on the same side?" / "Do any two clash or pull in different directions?" / "Is there one that gets pushed aside?"
- **Turn 4 — Unheard + tentative confirmation.** Elicit: missing voice; confirm whole map as editable hypothesis. Render: faint trace for the unheard part; full landscape comes into focus. Examples: "Is there a part that rarely gets heard?" + confirmation (see §5).

Mapping rules (plain language → attributes): superlatives ("loudest", "most room") → largest size; "close/far/off to the side" → centrality; "same side/team up" → allied link; "clash/at odds" → tension link; "pushed aside/drowned out/rarely heard" → silenced flag + edge position; hedged or second-hand mentions → lower confidence. Caveat: size conflates volume/influence/distress, centrality conflates closeness/identification/frequency — record the source phrase, not just the number, so corrections stay meaningful. Current-vs-desired ambiguity (project.md L29) infects inferred attributes too: tag every attribute as current-state unless the user is explicitly imagining change.

Alternative framing to consider: a single spatial snapshot misses temporal dynamics (timeline/trajectory, emotion-wheel, calendar viz literature). If Turn 4 feels crowded, elicit change-over-time ("has that shifted lately?") instead of a fourth spatial layer. No direct empirical comparison of spatial-vs-timeline elicitation for parts-work was found (adjacent viz literature only).

## 5. Confirming a mapping without leading (Q4)

- Use OARS reflect-then-confirm: mirror the user's own words, then offer the mapping as a candidate with an explicit correction affordance — never a bare "right?".
- Good: "Sounds like the critic is loudest and something quieter gets drowned out — close, or is it more…?" / "One way I'm seeing this is [map]; what would you change?"
- Why: validation-heavy AI drift harms vulnerable users (PsychToday drift piece; MIT-OpenAI heavy-use finding); "— right?" invites acquiescence. Every confirmation must make correction easy (rename/correct/remove; project.md L96-99; tentative identity + confidence L105-108).

## 6. Anti-patterns

- **Form-like interrogation:** rigid multi-slot sequences ("Rate size 1-5, then closeness 1-5…") — users reject rigid sequences (Scalarly). Fix: one natural question per turn, reflection first.
- **Double-barrelled questions:** "Is the critic loud and close?" — unmappable (which attribute does "yes" bind?). Fix: one open question at a time (OARS).
- **Confident labelling without check:** asserting the map as fact. Fix: clarify over confident-wrong (Scalarly); tentative + correctable.
- **Clinical/diagnostic wording:** diagnosing or naming disorders. Fix: everyday words (far, role, afraid — Parts Mapping model); non-therapist boundaries per Brief 1.
- **Freezing the map as territory:** treating positions/sizes as fixed truth. Reification risk (YorkU/Carveth: self-as-thing metaphors need deliteralization; project.md L63, L55/L67 never-villainize): therapy expands cognitive maps and escapes narrow paths (Beiruter/Aru & Kabrel) — the layout must stay fluid and remappable. Every mapped attribute reads as an editable hypothesis.
- **Villain/monster-ifying difficult parts** (project.md L55, L67): never darkness/menace/coldness as shorthand; reduced-motion safe (L81).

## 7. Unresolved / carried gaps

- Primary Casasanto (handedness) and Maass & Russo (writing-direction) papers unopened (paywalled; snippets only) — lateral-placement caution is provisional.
- No direct spatial-vs-timeline elicitation comparison for parts-work.
- PNAS URL 403 bypassed via PMC full text (same DOI) — resolved, not a gap.
- Emotional-mapping facilitation PDF image-only, no extractable text.
- Dependency: Brief 1 elicitation patterns and Brief 3 transition/experiment wording arrive separately; synthesis (order 1→2→3) produces the final 4-turn script.

## 8. Verification pass (2026-10-12)

Five unclear citations checked against opened sources:

- **Blatner — CONFIRMED.** blatner.com-hosted Vander May paper (ed. Blatner): psychodrama "designed to be used in group settings"; "requires extensive training… sizeable emotional, financial and time investment"; "actively suicidal or homicidal does not usually benefit." Supports "needs trained facilitation and group context." URL: https://www.blatner.com/adam/pdntbk/vandrmyadeux.html
- **Springer EBP chapter — PROVISIONAL (snippet-verified, full text paywalled).** Ch. 10 "Creating an Evidence Base for Social Work, Group Work, and Psychodrama" (DOI 10.1007/978-981-33-6342-7_10); two independent snippets quote it noting evidence limitations (Kellermann review; Kipper & Ritchie 2003 "data were insufficient"; Rawlinson 2000 "some research evidence"). Claim direction supported; page-level detail unverified.
- **PsychToday drift piece — CONFIRMED verbatim.** "Hidden Mental Health Dangers of AI Chatbots" (Urban Survival, Sept 2025): "Unchecked validation or AI 'sycophancy': Over-agreeability reinforces unhealthy or distorted beliefs." URL: https://www.psychologytoday.com/us/blog/urban-survival/202509/hidden-mental-health-dangers-of-artificial-intelligence-chatbots
- **MIT-OpenAI heavy-use finding — CONFIRMED with nuances.** Fang et al. 2025, arXiv:2503.17473 (abstract fetched): 4-week RCT, n=981, >300k messages; voluntary heavier use → worse loneliness/socialization/dependence outcomes. Nuances: preprint (v2 Oct 2025); heavy use was self-selected, not randomized; no significant mode (text vs voice) effects — the PsychToday piece's "voice mode" framing is looser than the paper.
- **YorkU/Carveth — CONFIRMED.** Carveth (York Univ., Glendon) "Metaphor" paper (PDF text extracted): self-as-thing is "a metaphorical equation calling for analytic deliteralization rather than reification." Supports the reification anti-pattern. URL: http://www.yorku.ca/dcarveth/metaphor.pdf
- **Cable Parts Mapping "opened" claim — CONFIRMED.** Worksheet PDF fetched; contains the full 6 F's with the quoted probes ("How far are you from that part?", "What is its role? What is its purpose?", "What is the Part afraid would happen if it stopped…?"); adapted from R. C. Schwartz (1997). URL: https://cablepsychotherapy.com/wp-content/uploads/2024/12/IFS-Parts-Mapping-Worksheet.pdf

Net: no conclusion downgrades; only Springer-EBP page detail stays provisional. Not checked: Beiruter/Aru & Kabrel (cognitive-maps claim, §6) — still open.
