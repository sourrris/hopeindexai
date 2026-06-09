# AGENTS.md

This file gives coding-agent guidance for working in this repository.

## Product frame

HopeIndexAI is a human-in-the-loop geopolitical event triage prototype. It takes noisy public event rows, maps them, ranks which signals deserve attention, and measures whether that ranking beats a baseline. Do not describe it as a verified forecasting system.

In simple ML terms: the model is the student, and human labels are the answer key. LLM/Codex-reviewed labels are useful for triage, but only human-reviewed labels can support a real improvement claim.

## Commands

```bash
# Local dev
bun install
bun run dev        # starts server at http://localhost:3000

# Review checks
bun run typecheck
bun run test:smoke
bun run ontology:validate
bun run eval:phase1
bun run test:all

# Phase 1 review/eval loop
bun run review:phase1:codex
bun run review:phase1:human -- --list
PHASE1_REVIEWER=your-name bun run review:phase1:human -- --fast
bun run surface:phase1

# Alternative without Bun
npm install hono
npx tsx server.ts
```

There is no frontend build step and no linter config. The current lightweight quality gate is `bun run test:all`, which runs TypeScript checking, API smoke testing, ontology validation, and Phase 1 eval.

## Architecture

### Two execution environments

| Context | Entry point | Static files | API routing |
|---------|-------------|--------------|-------------|
| Local Bun | `server.ts` | root `index.html` + `app.js` | `api/index.ts` |
| Vercel | `api/index.ts` | `public/` via Vercel CDN | `api/index.ts` |

`server.ts` is Bun-only because it uses `Bun.file()` for local static files. `api/index.ts` exports the Hono app and the Vercel handler. The handler adapts Node.js `IncomingMessage`/`ServerResponse` to a Web API `Request`/`Response` before calling `app.fetch()`.

### File duality: root vs `public/`

`index.html` + `app.js` are used for local dev.
`public/index.html` + `public/app.js` are served by Vercel in production.

These two pairs must stay identical. Use:

```bash
bun run sync
```

or edit both copies carefully.

### Backend: `api/index.ts`

Single Hono app file. Main routes:

- `GET /api/ai-status` returns `{ ready: boolean }` based on `ANTHROPIC_API_KEY`.
- `GET /api/events?days=1-30` reads `public/data/events.json`, filters relative to the latest event date in the dataset, sorts by `surfaceScore` and mentions, and returns a static enriched event slice.
- `GET /api/probe?id=...` builds an evidence pack for one event: source evidence, related signals, model prediction, entities, impact map, hypotheses, actor game, watchlist, and uncertainty warnings.
- `POST /api/analyze` calls Anthropic with an evidence-bound prompt. It uses `ANTHROPIC_API_KEY` from the server or a client-supplied fallback key.

The source file still contains older GDELT ZIP parsing helpers, but the review-facing API path now serves the checked-in static event dataset.

GDELT country codes are FIPS-like, not ISO. The `FIPS_CONTINENT` map handles important differences, for example `UK` is United Kingdom, `JA` is Japan, `RS` is Russia, and `CH` is China.

### Frontend: `app.js` and `public/app.js`

React 18 + Leaflet are loaded from CDN. JSX is transpiled by Babel standalone at runtime in the browser. No npm imports, bundler, or frontend build step are used.

Component tree:

```text
App
TopBar
MapView
FilterPanel
MapLegend
EventDetail
AiAnalysis
```

Filtering is client-side except for the `days` filter, which triggers a new `/api/events` request. Event ordering should use `surfaceScore` where present, with `markerRadius` as a fallback.

### Eval and surfacing

- Labels live in `data/eval/phase1_labels.jsonl`.
- Reports are generated at `data/eval/phase1_report.json` and `data/eval/phase1_surface_report.json`.
- The surfacing policy lives in `public/data/surfacing-policy.json`.
- `public/data/events.json` includes `surfaceScore`, `surfaceRank`, `surfaceBand`, `surfaceReasons`, duplicate metadata, and model probability fields.

The report must not claim model improvement until at least 100 labels are human-reviewed.

## Review notes

- Keep root/public frontend files in sync.
- Keep claims modest: this is a triage workflow, not verified ground truth.
- Prefer small tests around API behavior, date-window filtering, event ordering, and eval verdicts.
- Do not mark labels as `humanReviewed: true` unless a person has actually reviewed the source context.
