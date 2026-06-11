# HopeIndexAI Phases

This file is the build plan.

Keep it simple: the phase doc should answer what we are doing now, what comes next, and what proof says a phase is done. The bigger product idea lives in [IDEA.md](./IDEA.md). The project story lives in [CASE_STUDY.md](../CASE_STUDY.md).

## Current Rule

HopeIndexAI is a triage prototype, not a verified forecasting system.

In simple ML terms: the model is the student, and source-checked human labels are the answer key. LLM/Codex labels are useful practice notes, but only source-checked human-reviewed labels can prove improvement.

The V1 target user is an OSINT watch analyst. The main product decision is whether a noisy public event should be assigned for deeper investigation.

## Phase Status

| Phase | Name | Status | Proof |
| --- | --- | --- | --- |
| 0 | Baseline audit | Done | App and data shape are documented |
| 1 | Measured MVP | Active | `bun run test:all` passes |
| 2 | Training-grade records | Active | Validated records, external evidence status, plus 100 source-checked human labels |
| 3 | Storage and ingestion | Planned | Public data becomes an export |
| 4 | Entity resolution | Backlog | Messy actors map to stable IDs |
| 5 | Source and claim quality | Backlog | Important claims have evidence |
| 6 | Actor context in probes | Backlog | Probes use actor profiles carefully |
| 7 | Feedback loop | Backlog | User feedback feeds eval data |
| 8 | Model upgrades | Later | New model beats baseline on source-checked human labels |
| 9 | Production scale | Later | More data improves measured performance |

## How To Update Phases

When a phase changes:

1. Update the status table.
2. Update the phase notes below.
3. Add the proof: command, report, or artifact.

Do not mark a phase done because it feels done. Mark it done when the proof exists.

## Phase 0: Baseline Audit

Status: Done.

Goal: Understand what exists before adding complexity.

Done now:

- React + Leaflet map exists.
- Hono API exists in `api/index.ts`.
- Static event data exists in `public/data/events.json`.
- Local Bun and Vercel paths are documented.
- Ontology docs and validation scripts exist.

Proof:

```bash
bun run dev
```

## Phase 1: Measured MVP

Status: Active.

Goal: Make the prototype measurable before claiming it improved.

Built now:

- `/api/events` serves the checked-in event slice.
- Event windows filter relative to the latest date in the dataset.
- Event order uses `surfaceScore`, with `markerRadius` as fallback.
- The default UI is an assignment queue with `Assign`, `Watch`, and `Dismiss` prototype decisions.
- Ontology validation exists.
- API smoke testing exists.
- TypeScript checking exists.
- Phase 1 eval exists.

Current evidence:

```text
Events: 1,500
Labels: 120
Source-checked human labels: 4
LLM/Codex-reviewed labels: 116
Source-checked human labels needed for improvement claim: 100
```

Done means:

- `bun run test:all` passes.
- The eval report says whether improvement can or cannot be claimed.
- No non-human label is marked `humanReviewed: true`.
- Improvement claims require at least 100 source-checked human labels with `reviewContext.sourceChecked: true`.
- Local browser assignment notes are not source-checked ground truth and do not update eval labels.
- Root and `public/` frontend files stay in sync.

Proof:

```bash
bun run test:all
```

## Phase 2: Training-Grade Records

Status: Active.

Goal: Build the real answer key and the record layer a future model can learn from.

Why it matters:

- Without training-grade records, the model learns from noisy browser rows.
- Without source-checked human labels, we have a demo and provisional metrics.
- With validated records and source-checked human labels, we can test whether the ranking truly beats the baseline.
- With external evidence candidates, we can compare noisy rows against curated world-event datasets without calling them final product truth.

Step-by-step:

1. Build training records from public events and Phase 1 labels.
2. Validate that only source-checked human labels can become final importance truth.
3. Import UCDP GED as historical organized-violence evidence.
4. Match training records against external evidence by date, country, location, actor, and type.
5. Review 20 to 30 more labels by hand after opening the source URL or enough source context.
6. Rebuild records and rerun eval.
7. Repeat until 100 source-checked human labels exist.

Commands:

```bash
bun run records:build
bun run records:validate
bun run import:ucdp
bun run match:external
bun run records:build
bun run records:validate
bun run review:phase1:human -- --list
PHASE1_REVIEWER=your-name bun run review:phase1:human -- --limit=30
bun run records:build
bun run records:validate
bun run eval:phase1
```

Done means:

- `data/training/phase2_records.jsonl` exists and validates.
- `data/external/matches/phase2_ucdp_matches.jsonl` records UCDP match status where the local UCDP import exists.
- At least 100 labels have `labelSource: "human"`, `humanReviewed: true`, and `reviewContext.sourceChecked: true`.
- The reviewer actually checked the event/source context.
- Weak future-window targets are not treated as final evaluation truth.
- External evidence is not treated as final importance truth.
- `bun run eval:phase1` reports against source-checked human labels.

## Phase 3: Storage And Ingestion

Status: Planned.

Goal: Stop treating `public/data/events.json` as the source of truth.

Why it matters:

- The browser needs a small fast file.
- Training and evaluation need larger historical data.
- Raw data must stay available so mistakes can be fixed later.

Step-by-step:

1. Create a processed-data folder structure.
2. Keep public browser data as an export only.
3. Add a repeatable ingestion script for GDELT-style rows by date range.
4. Add repeatable external evidence imports for datasets such as UCDP, ACLED, and ICBe.
5. Add deterministic dedupe and public-slice export.

Target structure:

```text
data/raw/
data/processed/
data/features/
data/models/
data/feedback/
public/data/
```

Done means:

- `public/data/events.json` is generated from processed data.
- Re-running ingestion creates stable output.
- The app still loads quickly.

## Backlog Phases

Phase 4: Entity resolution.
Map messy names like `ISRAEL`, `ISRAELI`, `IDF`, and `Israeli government` to stable actor IDs.

Phase 5: Source and claim quality.
Validate URLs, flag weak sources, and connect important claims to evidence.

Phase 6: Actor context in probes.
Use actor profiles for incentives and constraints, while labeling that context as interpretation.

Phase 7: Feedback loop.
Let users mark wrong actor, wrong severity, false alarm, missed escalation, and source-check issues.

Phase 8: Model upgrades.
Try better models only after the human label loop is trustworthy.

Phase 9: Production scale.
Scale data volume only after more data improves measured performance.

## Next Three Moves

Do these before adding new big features:

1. Keep `data/training/phase2_records.jsonl` generated and validated.
2. Keep UCDP profile and match status generated when the local UCDP files exist.
3. Source-check and human-review the next 30 labels.
4. Rerun `bun run records:build`, `bun run records:validate`, and `bun run eval:phase1`.

## Decision Rule

```text
Evidence first.
Entity clarity second.
Scale third.
```

Bayesian translation: start with the belief that more data helps, then update that belief when noisy labels, duplicate rows, or bad actor names hurt quality.

Game-theory translation: ask what each actor wants, what limits them, and what move would make sense only if their incentives are different from our current guess.
