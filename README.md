# HopeIndexAI

Human-in-the-loop signal triage from noisy public data.

HopeIndexAI maps a small GDELT-style event slice, ranks which signals deserve attention, and keeps model output separate from source-checked human ground truth. It is a triage prototype, not a verified forecasting system.

In simple ML terms: the model is the student, and source-checked human labels are the answer key.

## Docs

- [docs/PHASES.md](./docs/PHASES.md) - step-by-step build plan and phase status.
- [docs/IDEA.md](./docs/IDEA.md) - bigger product idea and reasoning frame.
- [CASE_STUDY.md](./CASE_STUDY.md) - project story, tradeoffs, and interview narrative.
- [docs/ontology/README.md](./docs/ontology/README.md) - ontology notes and event mapping.

## Quick Start

```bash
git clone https://github.com/sourrrish/hopeindexai
cd hopeindexai
bun install
bun run dev
```

Open [http://localhost:3000](http://localhost:3000).

Optional AI analysis:

```bash
cp .env.example .env
# add ANTHROPIC_API_KEY to .env
bun run dev
```

## Commands

```bash
bun run dev                 # local app at http://localhost:3000
bun run typecheck           # TypeScript check
bun run test:smoke          # API smoke test
bun run ontology:validate   # ontology mapping validation
bun run eval:phase1         # baseline vs candidate eval
bun run test:all            # full lightweight quality gate
```

Phase 1 review loop:

```bash
bun run review:phase1:human -- --list
PHASE1_REVIEWER=your-name bun run review:phase1:human -- --limit=30
bun run eval:phase1
```

## Current Status

- 1,500 public event rows.
- 120 reviewed labels.
- 120 LLM/Codex-reviewed labels.
- 0 source-checked human labels.
- 100 source-checked human labels required before claiming model improvement.

The current metrics are useful for product triage, but they are not final proof. LLM-reviewed labels are like practice notes; source-checked human labels are the answer key.

## Architecture

```text
public/data/events.json
-> Hono API
-> event window filtering
-> surfaceScore sorting
-> React + Leaflet map
-> event detail and AI probe flow

data/eval/phase1_labels.jsonl
-> eval script
-> baseline vs candidate metrics
-> proof/no-proof report
```

Local development uses `server.ts`.
Vercel uses `api/index.ts` and static files from `public/`.

Root `index.html`/`app.js` and `public/index.html`/`public/app.js` must stay in sync:

```bash
bun run sync
```

## Data Attribution

Event data is sourced from the [GDELT Project](https://www.gdeltproject.org). HopeIndexAI is not affiliated with GDELT. Events are media-derived signals and should not be treated as independently verified ground truth.

## License

MIT
