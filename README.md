# HopeIndexAI

Human-in-the-loop OSINT assignment triage from noisy public data.

HopeIndexAI helps OSINT watch analysts rank noisy public event rows and decide which few deserve deeper investigation. It keeps model output separate from source-checked human ground truth. It is a triage prototype, not a verified forecasting system.

In simple ML terms: the model is the student, and source-checked human labels are the answer key.

## Docs

- [docs/PHASES.md](./docs/PHASES.md) - step-by-step build plan and phase status.
- [docs/IDEA.md](./docs/IDEA.md) - bigger product idea and reasoning frame.
- [docs/TRAINING_RECORDS.md](./docs/TRAINING_RECORDS.md) - training-grade record format and guardrails.
- [docs/EXTERNAL_EVIDENCE.md](./docs/EXTERNAL_EVIDENCE.md) - UCDP import, matching, and external-evidence guardrails.
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
bun run records:build       # build training-grade record drafts
bun run records:validate    # validate training record guardrails
bun run import:ucdp         # normalize local UCDP GED CSV into compact evidence
bun run match:external      # match training records against external evidence
bun run surface:phase1      # refresh surfacing, clustering, uncertainty, and review queue fields
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
- 116 LLM/Codex-reviewed labels.
- 4 source-checked human labels.
- 100 source-checked human labels required before claiming model improvement.

The current metrics are useful for product triage, but they are not final proof. LLM-reviewed labels are like practice notes; source-checked human labels are the answer key.

## Assignment Queue

The default workflow is built around one watch-analyst decision:

```text
Should this public event be assigned for deeper investigation?
```

The UI recommends `Assign`, `Watch`, or `Dismiss` from the existing `surfaceScore` thresholds and lets the analyst save local prototype notes in the browser. Those exported notes are not source-checked human ground truth and do not modify eval files.

The queue now uses active learning modes:

- `Priority` finds high-value rows that are not already source-checked.
- `Uncertain` finds rows where a human answer would reduce model confusion.
- `Coverage gaps` finds under-reviewed regions, themes, or sources.

In simple ML terms: clustering prevents grading the same incident twice, uncertainty says how shaky the row is, and active learning picks the next homework examples that can improve the answer key fastest.

The Reviewer Copilot prepares the review packet for that decision. It explains why the event surfaced, what a human should verify, what uncertainty remains, and what to watch next. When an Anthropic API key is configured, it can draft a short review note, but that note is assistant text only. It is not evidence, not a human label, and not source-checked ground truth.

## Architecture

```text
public/data/events.json
-> Hono API
-> event window filtering
-> surfaceScore sorting
-> assignment queue
-> React + Leaflet map context
-> event detail and AI probe flow

data/eval/phase1_labels.jsonl
-> eval script
-> baseline vs candidate metrics
-> proof/no-proof report

data/training/phase2_records.jsonl
-> training record validator
-> source/actor/label/outcome guardrails
-> optional UCDP external evidence candidates
-> future model training inputs
```

Local development uses `server.ts`.
Vercel uses `api/index.ts` and static files from `public/`.

Root `index.html`/`app.js` and `public/index.html`/`public/app.js` must stay in sync:

```bash
bun run sync
```

## Data Attribution

Event data is sourced from the [GDELT Project](https://www.gdeltproject.org). HopeIndexAI is not affiliated with GDELT. Events are media-derived signals and should not be treated as independently verified ground truth.

Historical conflict evidence can be imported from the [UCDP GED dataset](https://ucdp.uu.se/downloads/). UCDP evidence is curated organized-violence context, not a replacement for source-checked human HopeIndexAI labels.

## License

MIT
