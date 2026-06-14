# HopeIndexAI — Repository Profile

## Project overview
Human-in-the-loop geopolitical event triage prototype. Serves a static enriched event dataset via a Hono API and a React+Leaflet frontend. Trains supervised and surface-scoring models on GDELT + UCDP data and reports Phase 1 evaluation metrics.

## Technology stack
- **Language:** TypeScript (ES2022)
- **Runtime:** Bun (Node 24.x engine declared)
- **Backend framework:** Hono v4 (`api/index.ts`)
- **Frontend:** React 18 + Leaflet loaded from CDN; Babel standalone transpiles JSX in browser (no build step)
- **Package manager:** Bun

## Project structure
- `api/index.ts` — Hono app + Vercel adapter
- `server.ts` — local Bun static server
- `pipeline/` — enrichment and training scripts (`enrich.ts`, `enrich_historical.ts`, `train.ts`, `train_supervised.ts`)
- `scripts/` — eval, review, import, validation, and monitoring scripts
- `lib/` — shared helpers (e.g., `ucdp.ts`)
- `test/` — minimal test files (`local-inference.test.ts`, `ui-inspection.mjs`)
- `public/data/` — static event dataset and champion model served in production
- `data/` — labels, eval reports, UCDP imports, training records
- `docs/` — product docs and runbooks

## Common commands
```bash
# Install dependencies
bun install

# Local dev
bun run dev

# Quality gate
bun run test:all

# Type checking
bun run typecheck

# API smoke test
bun run test:smoke

# Ontology / eval
bun run ontology:validate
bun run eval:phase1

# Sync root frontend files to public/
bun run sync

# Training / surfacing
bun run train:supervised
bun run surface:phase1
bun run ml:autonomous
```

## Conventions
- Root `index.html` + `app.js` must stay identical to `public/index.html` + `public/app.js`; use `bun run sync`.
- Claims about model improvement must be backed by at least 100 source-checked human labels (`reviewContext.sourceChecked: true`).
- GDELT country codes are FIPS-like, not ISO.
