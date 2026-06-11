# HopeIndexAI Case Study

## Human-in-the-loop geopolitical event triage

HopeIndexAI is an intelligence triage prototype for noisy public event data. It ingests a small GDELT-style event slice, maps events globally, ranks which signals deserve attention, and keeps model output separate from source-checked human ground truth.

For the step-by-step build plan, see [docs/PHASES.md](./docs/PHASES.md). For the bigger product idea, see [docs/IDEA.md](./docs/IDEA.md).

The product question is not "can an AI summarize world news?" The useful question is:

> Given many noisy event rows, which few should an analyst inspect first?

That framing matters because GDELT rows are media-derived signals, not verified truth. Actor names are messy, rows duplicate the same article, local crime can look like strategic conflict, and historical or entertainment articles can be misclassified as current events. The system is designed around that uncertainty instead of hiding it.

## User workflow

The target user is an analyst or operator who needs a fast first pass over public geopolitical signals.

1. Load a recent event slice.
2. Filter by region and theme.
3. Inspect surfaced lead and watch events first.
4. Open an event detail panel for source context, related signals, and AI-assisted analysis.
5. Mark source-checked labels during review so the ranking system can be evaluated later.

In simple ML terms, the model is the student and the labels are the answer key. HopeIndexAI does not let model-reviewed labels count as final proof. The Phase 1 report refuses to claim improvement until at least 100 source-checked human labels exist.

## Architecture

```text
public/data/events.json
-> Hono API
-> event window filtering
-> surfacing score sort
-> React + Leaflet map
-> event detail and AI probe flow

data/eval/phase1_labels.jsonl
-> eval script
-> baseline vs candidate metrics
-> report with proof/no-proof verdict

public/data/escalation-model.json
-> model probability
-> surfacing calibration
-> surfaceScore, surfaceBand, surfaceReasons

data/training/phase2_records.jsonl
-> source, actor, label, and weak outcome guardrails
-> UCDP external evidence status
-> future model training inputs
```

Two runtime paths are supported:

- Local development uses `server.ts` to serve static files and route API requests.
- Vercel uses `api/index.ts` as the serverless API handler and serves `public/` files directly.

The frontend intentionally has no build step yet. Root `app.js` and `public/app.js` are duplicated and kept in sync because local Bun serving and Vercel static serving use different file roots.

## Ranking and evaluation

The baseline, `v0`, is the older GDELT-style heuristic: severe Goldstein scores, media mentions, and marker radius.

The candidate, `v1`, uses a stored escalation model plus surfacing rules. The current surfacing policy adds:

- Boosts for strategic actors, high-risk theaters, governance/public-safety signals, and high-mention diplomacy.
- Penalties for duplicate source rows, local crime patterns, entertainment/history extraction noise, opinion/background articles, and single-mention weak signals.

Current Phase 1 report:

- 1,500 public events.
- 120 reviewed labels.
- 116 LLM/Codex-reviewed labels.
- 4 source-checked human labels.
- Improvement claim blocked until 100 source-checked human labels exist.

That is an important engineering choice. It prevents the project from claiming scientific progress from weak evidence.

## What worked

The app now has a repeatable evaluation loop:

```bash
bun run review:phase1:codex
bun run eval:phase1
bun run surface:phase1
```

The project also has a training-record layer:

```bash
bun run records:build
bun run records:validate
```

This converts labelled public rows into catalogue records with source, actor, label, weak outcome, and ML-use guardrails.

The next layer is external evidence:

```bash
bun run import:ucdp
bun run match:external
```

This imports UCDP GED as curated historical conflict evidence and records whether each training row has a plausible external match. The current result is useful but modest: UCDP GED 26.1 ends on 2025-12-31, while most current demo rows are May 2026, so the matcher correctly reports no UCDP candidates for the current Phase 2 records.

The ontology validator also checks that every public event can map into the core world model:

```bash
bun run ontology:validate
```

The API smoke test verifies that the serverless handler starts, returns AI status, serves event windows, and preserves the surfacing sort order:

```bash
bun run test:smoke
```

## Current limitations

- The event dataset is a static 1,500-row public slice.
- The label set has only 4 source-checked human-reviewed rows so far.
- The first external dataset, UCDP GED 26.1, is historical and ends before the current demo slice.
- GDELT country codes are FIPS-like, not ISO, so geography requires explicit mapping.
- Actor resolution is still weak; examples like `ISRAEL`, `ISRAELI`, and `GOVERNMENT` are not merged into canonical actors.
- The frontend is still prototype-style React from CDN with runtime Babel.
- The project is not a verified forecasting system. It is a triage and evaluation workflow.

## Next engineering steps

1. Keep `data/training/phase2_records.jsonl` generated and validated.
2. Review the next 30 labels by hand after opening the source URL or enough source context.
3. Rerun `bun run records:build`, `bun run records:validate`, and `bun run eval:phase1`.
4. Repeat until 100 source-checked human labels exist.
5. Move storage and ingestion work into Phase 3 after the record loop is working.

## Interview narrative

The concise story:

> I built a human-in-the-loop event triage workflow for noisy geopolitical data. The hard part was not calling an AI model. The hard part was separating useful signals from duplicated, misclassified, and weak evidence, then refusing to claim model improvement until source-checked human labels exist.

The tradeoff:

> I kept the app simple enough to ship, then added measurement before scaling. That means the current system is honest but incomplete: it can triage events and report provisional metrics, but it cannot claim final ML improvement until humans source-check the answer key.
