# HopeIndexAI

AI-assisted stakeholder-importance triage for public conflict signals.

HopeIndexAI is an AI triage system that estimates whether noisy public conflict
signals matter to a chosen stakeholder, then exposes the evidence, assumptions,
and uncertainty for human audit.

It helps OSINT watch analysts rank noisy public event rows and decide which few deserve deeper investigation for a country, agency, person, or watch analyst. It is deliberately scoped to **conflict and lethal-violence risk signals** (UCDP-organized-violence patterns), not broad world prediction. It keeps model output separate from source-checked audit evidence.

In simple ML terms: the model makes an importance assumption, and source-checked human audit labels help calibrate whether that assumption was useful.

## Docs

- [docs/PHASES.md](./docs/PHASES.md) - step-by-step build plan and phase status.
- [docs/PRODUCT_READINESS_PLAN.md](./docs/PRODUCT_READINESS_PLAN.md) - remaining product phases, MVP scope, and UI simplification plan.
- [docs/IDEA.md](./docs/IDEA.md) - bigger product idea and reasoning frame.
- [docs/TRAINING_RECORDS.md](./docs/TRAINING_RECORDS.md) - training-grade record format and guardrails.
- [docs/EXTERNAL_EVIDENCE.md](./docs/EXTERNAL_EVIDENCE.md) - UCDP import, matching, and external-evidence guardrails.
- [docs/model-card.md](./docs/model-card.md) - intended use, training data, performance, and limitations.
- [docs/runbook.md](./docs/runbook.md) - health checks, rollback, alert investigation, and operational tasks.
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
# Start LM Studio locally on http://localhost:1234
# or set ANTHROPIC_API_KEY as a fallback in .env
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
bun run labels:queue        # build durable active-learning reviewer queue
bun run labels:build        # export training/eval labels from source-checked reviews
bun run import:ucdp         # normalize local UCDP GED CSV into compact evidence
bun run match:external      # match training records against external evidence
bun run surface:phase1      # refresh surfacing, clustering, uncertainty, and review queue fields
bun run eval:phase1         # baseline vs candidate eval
bun run test:all            # full lightweight quality gate
```

Phase 1 review loop:

```bash
bun run labels:queue
bun run review:phase1:human -- --list --mode=priority
PHASE1_REVIEWER=your-name bun run review:phase1:human -- --mode=priority --limit=30
bun run records:build
bun run records:validate
bun run labels:build
bun run eval:phase1
```

## Current Status

- Live GDELT event rows are the default app input.
- 1,500 checked-in event rows remain as the offline evaluation/training slice.
- 120 reviewed labels.
- 19 LLM-reviewed labels.
- 101 source-checked human audit labels.
- Model retrained on the 101 source-checked audit labels; candidate now beats the baseline on the source-checked eval set.
- Positioned as a conflict/death-risk triage assistant, not a broad world-prediction tool.

The current metrics are useful for product triage, but they are not final proof. LLM-reviewed labels are practice notes; source-checked human audit labels are the calibration set for checking model assumptions.

## Assignment Queue

The default workflow is built around one watch-analyst decision for **conflict and organized-violence signals**:

```text
Does this public event matter to the selected stakeholder enough to assign for deeper investigation?
```

The UI recommends `Assign`, `Watch`, or `Dismiss` from the existing `surfaceScore` thresholds and lets the analyst save local prototype notes in the browser. The stakeholder frame explains why the row may matter, but it does not change ranking yet. Exported notes are not source-checked audit labels and do not modify eval files.

The queue now uses active learning modes:

- `Priority` finds high-value rows that are not already source-checked.
- `Uncertain` finds rows where a human answer would reduce model confusion.
- `Coverage gaps` finds under-reviewed regions, themes, or sources.

In simple ML terms: clustering prevents auditing the same incident twice, uncertainty says how shaky the row is, and active learning picks useful rows for checking the model's assumptions.

The durable reviewer queue lives at `data/labeling/reviewer_queue.jsonl` and is built with:

```bash
bun run labels:queue -- --mode=priority --limit=100
```

The best source strategy for this project is:

- Use GDELT/public event rows for discovery because they are broad, current, and already linked to source URLs.
- Use the article/source URL as the required human source check before any label becomes a source-checked audit label.
- Use UCDP GED and UCDP Candidate as open curated conflict evidence when coverage overlaps the row.
- Use local ACLED aggregate workbooks as trend/context evidence when available, not as row-level label truth.
- Treat YouTube, X/Twitter, and other social posts as leads only unless the content is public, attributable, independently checkable, and allowed by the platform terms.

The Reviewer Copilot prepares the review packet for that decision. It explains why the event surfaced, what stakeholder-importance assumption is being made, what a human should verify, what uncertainty remains, and what to watch next. When LM Studio is running on localhost:1234 (or an Anthropic API key is configured as fallback), it can draft a short review note, but that note is assistant text only. It is not evidence, not an audit label, and not source-checked ground truth.

## Architecture

```text
Live GDELT feed
-> Hono API
-> event window filtering
-> surfaceScore sorting
-> assignment queue
-> React + Leaflet map context
-> event detail and AI probe flow

public/data/events.json
-> offline evaluation/training slice
-> repeatable local and CI checks

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
