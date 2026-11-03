# Analytics: the test link

Umami 3.4, self-hosted at https://umami.gergobalogh.me, website
`internal-family-systems` for `ifs.gergobalogh.me` (`8be15a69-36f5-4bc4-bed7-5378d6a71f40`, created
2026-11-03 on the user's yes). Instead of a watched
five-person test (the user's choice, 2026-11-03), the walk reports how far
each visit gets, so we can see where people stop.

Events say what was done, never what anyone wrote: no words, no part
names, only fixed labels and buckets (`src/analytics.ts`). The tracker tag
is in `index.html`: `data-domains="ifs.gergobalogh.me"` keeps local runs
and previews out, and `data-exclude-search` / `data-exclude-hash` keep the
URL's query and hash out.

Not live yet: the events go live when the website exists in Umami, its id
is in `index.html`, and the build is on the VPS. Write that time here.

## Where people stop

Once real visits arrive:

```bash
python3 ~/.claude/skills/umami/scripts/dropoff.py --spec docs/funnels/walk.json
python3 ~/.claude/skills/umami/scripts/dropoff.py --spec docs/funnels/act2.json
```

`walk-leave` carries each visit's furthest rung, so the report also shows
where visits ended and after how long. The rungs, in order: `opened`,
`ready`, `freewrite-sent`, `part-1`, `part-2`, `part-3`, `act1-done`,
`welcome` (a later visit starts here), `act2-voice`, `act2-intent`,
`act2-fears`, `thanked`, `act3`, `whatif`, `ending`, `picture-kept`,
`done`.

Funnels, to save in Umami on the user's yes (window 60 minutes):

| Funnel | Spec | Steps |
|---|---|---|
| The walk | `docs/funnels/walk.json` | page → `freewrite-sent` → `part-arrived` n=1 → `act1-done` → `act3` → `ending-reached` → `picture-kept` |
| Act 2 | `docs/funnels/act2.json` | `act1-done` → `act2-start` how=chosen → `act2-answer` voice → `act2-answer` intent → `thanked` |

Coming back is `return-visit`, read on its own (a later visit is a new
Umami visit): how many, and after how many days.

## Events

| Event | Data | When |
|---|---|---|
| `walk-ready` | `seconds`: from the navigation (`0-2s`, `2-5s`, `5-10s`, `10-30s`, `30s+`) | The first card is on screen |
| `freewrite-sent` | | The free-write was sent |
| `part-arrived` | `n`: 1, 2, 3… | A part joined the map on a first visit (once per number) |
| `act1-done` | | "These are the ones who came." |
| `act2-start` | `how`: `chosen`, `not now`, `someone new`, `nobody offered` | Act 2 began, was declined, or had nobody to offer |
| `act2-answer` | `question`: `voice`, `intent`, `fears` | A question about the part was answered (not skipped) |
| `thanked` | | Thank it |
| `act3` | | "Step back and look at all of them." |
| `part-moved` | `when`: `act3`, `dusk`, `after the walk`, `during the walk` | A part moved or resized by hand (once per `when`): `after the walk` is the unasked kind |
| `whatif` | `choice`: `keep it`, `go back` | The dusk "what if" |
| `ending-reached` | | The ending card |
| `picture-kept` | | The picture was saved or shared |
| `done` | | Done, at the ending |
| `part-edited` | `action`: `rename`, `change figure`, `remove`, `clear words` | A part's own controls (once per action) |
| `return-visit` | `days` since the meadow was last saved: `same day`, `1`, `2-3`, `4-7`, `8-14`, `15-30`, `30+` | A later visit opened on the saved meadow |
| `start-over` | | Start over, confirmed |
| `safety-pause` | `how`: `answer, phrase`, `answer, check`, `name, phrase`, `name, check` | The pause card came (risk language in an answer or a new name) |
| `ai-fallback` | `route`: `reflect`, `free-write`, `risk`, `figure`, `extract-name`, `toward-check`; `why`: `timeout`, `limit`, `unavailable`, `error` | An AI call failed and the app used its fixed lines (once per route per view) |
| `walk-leave` | `reached`: the furthest rung; `seconds` in view (`0-10s` … `30m+`) | The tab was hidden or closed (sent again only if either changed) |

Every event is once per page view, except `walk-leave`.

## Checked

2026-11-03, on the build served locally with Umami blocked and a
stand-in tracker recording each event, every /api call scripted: two
whole walks with a later visit (the tap and quieter paths) sent the
events above in order, ending with `walk-leave` `done`; a later visit
sent `return-visit` `same day`; the safety cases sent `safety-pause`
`name, phrase` and `name, check`, and a failed risk check
`ai-fallback` `risk` `unavailable`. No event carried any words.

## Changes to compare

| Live (UTC) | Change | Step to watch |
|---|---|---|
