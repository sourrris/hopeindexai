# HopeIndexAI Case Study

## Stakeholder-importance OSINT assignment triage

HopeIndexAI is an AI triage system that estimates whether noisy public conflict
signals matter to a chosen stakeholder, then exposes the evidence, assumptions,
and uncertainty for human audit.

It ingests live and offline GDELT-style event rows, ranks which public signals deserve deeper investigation for a country, agency, person, or watch analyst, and keeps model output separate from source-checked audit evidence.

For the step-by-step build plan, see [docs/PHASES.md](./docs/PHASES.md). For the bigger product idea, see [docs/IDEA.md](./docs/IDEA.md).

The product question is not "can an AI summarize world news?" The useful question is:

> Given many noisy event rows, which few look important to the stakeholder an analyst cares about?

For V1, the target user is an OSINT watch analyst and the core decision is:

> Does this public event matter enough to assign for deeper investigation?

That framing matters because GDELT rows are media-derived signals, not verified truth. Actor names are messy, rows duplicate the same article, local crime can look like strategic conflict, and historical or entertainment articles can be misclassified as current events. The system is designed around that uncertainty instead of hiding it.

## User workflow

The target user is an OSINT watch analyst who needs a fast first pass over public geopolitical signals.

1. Load a recent event slice.
2. Filter by region and theme.
3. Start with the assignment queue.
4. Inspect recommendation, stakeholder frame, source caveats, related signals, and reason codes.
5. Mark a local prototype decision: `Assign`, `Watch`, or `Dismiss`.
6. Separately mark source-checked audit labels during review so the ranking system can be evaluated later.

In simple ML terms, the model makes an importance assumption and source-checked human audit labels calibrate whether that assumption was useful. HopeIndexAI does not let model-reviewed labels count as final proof. The Phase 1 report now has 101 source-checked human audit labels, so it can compare the candidate against the baseline on that calibration set.

## Architecture

```text
public/data/events.json
-> Hono API
-> event window filtering
-> surfacing score sort
-> assignment queue
-> React + Leaflet map context
-> event detail and AI probe flow

data/eval/phase1_labels.jsonl
-> eval script
-> baseline vs candidate metrics
-> report with proof/no-proof verdict

public/data/escalation-model.json
-> UCDP organized-violence match probability
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
- 19 LLM-reviewed labels.
- 101 source-checked human audit labels.
- 21 positive and 80 negative source-checked human audit labels.
- Candidate model beats the baseline on the source-checked Phase 1 eval set.
- Future-holdout AUC is not yet computable because the current holdout has zero verified positives.

That is an important engineering choice. It makes the claim narrower: the candidate improved on the current source-checked Phase 1 audit set, while future performance is still unproven.

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

This imports UCDP GED as curated historical conflict evidence and records whether each training row has a plausible external match. The current result is useful but modest: UCDP GED 26.1 ends on 2025-12-31, while the offline Phase 2 evaluation records are from May 2026, so the matcher correctly reports no UCDP candidates for those records.

The ontology validator also checks that every public event can map into the core world model:

```bash
bun run ontology:validate
```

The API smoke test verifies that the serverless handler starts, returns AI status, serves event windows, and preserves the surfacing sort order:

```bash
bun run test:smoke
```

The V1 UI makes the assignment decision explicit. Local browser decisions are exportable prototype notes, but they are not source-checked audit labels and do not modify eval files.

## Current limitations

- The app now uses the live GDELT feed by default, while evaluation still depends on a fixed 1,500-row offline slice.
- The audit set has 101 source-checked human-reviewed rows, which is enough for a first measured comparison but still small for a rare-event ML task.
- The first external dataset, UCDP GED 26.1, is historical and ends before the current offline evaluation slice.
- GDELT country codes are FIPS-like, not ISO, so geography requires explicit mapping.
- Actor resolution is still weak; examples like `ISRAEL`, `ISRAELI`, and `GOVERNMENT` are not merged into canonical actors.
- The frontend is still prototype-style React from CDN with runtime Babel.
- The project is a triage and evaluation workflow, not proof that future events can be predicted.

## Next engineering steps

1. Keep `data/training/phase2_records.jsonl` generated and validated.
2. Grow the audit set toward 300-500 source-checked rows after opening the source URL or enough source context.
3. Rerun `bun run records:build`, `bun run records:validate`, and `bun run eval:phase1`.
4. Rerun `bun run eval:future-holdout` when the holdout has verified positives.
5. Move storage and ingestion work into Phase 3 after the record loop is working.

## Interview narrative

The concise story:

> I built an AI-assisted OSINT assignment workflow for noisy geopolitical data. The hard part was not calling an AI model. The hard part was making the AI state why an event may matter to a chosen stakeholder, then refusing to claim model improvement until source-checked human audit labels support the assumption.

The tradeoff:

> I kept the app simple enough to ship, then added measurement before scaling. That means the current system is honest but incomplete: it can triage events and report measured Phase 1 metrics, but it still needs a future holdout with verified positives before I trust the model on new data.
