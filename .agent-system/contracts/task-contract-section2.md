# Task Contract — Section 2: Future Holdout Validation

## Outcome
Implement a future holdout validation pipeline so HopeIndexAI can measure whether the champion escalation model generalizes to events it has never seen (May/June 2026) against verified outcomes.

## Scope
1. Create `scripts/validate_future_holdout.ts` that:
   - Fetches the most recent 7 days of GDELT using the existing `pipeline/enrich_historical.ts` path.
   - Scores each fetched event with the current champion model (`data/models/escalation-model-supervised-latest.json`, falling back to `public/data/escalation-model.json`).
   - Matches predictions to verified outcomes using existing UCDP candidate import + match utilities (or ACLED if available).
   - Computes precision@K, recall@K, false-positive rate, and AUC on the holdout.
   - Writes `data/eval/future_holdout_report.json`.
2. On each run, append a drift record to `data/eval/drift_log.jsonl`.
3. Update `scripts/validate_pipeline.ts` to fail if the latest future-holdout AUC is < 0.80.

## Non-goals
- No new external paid API dependencies.
- No change to the training pipeline.
- No UI changes.

## Constraints
- Reuse existing enrichment, import, and matching code where possible.
- Must pass `bun run test:all` and `bun run pipeline:validate`.
- Keep the script idempotent and safe to run manually or on a schedule.

## Risk classification
**Medium** — adds a new eval script, may fetch external data, and changes pipeline validation gate.

## Acceptance evidence
- `bun run scripts/validate_future_holdout.ts` exits 0 and writes `data/eval/future_holdout_report.json`.
- `data/eval/drift_log.jsonl` contains a new entry after the run.
- `bun run pipeline:validate` passes and includes a holdout AUC gate check.
- `bun run test:all` passes.
