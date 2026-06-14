# Task Contract — HopeIndexAI Roadmap Sprint (Phase 1 remaining)

## Outcome
Close Phase 1 Blocker #1 (model fix) and Blocker #3 (UI model-scope clarity) so the supervised model is retrained on the 101 source-checked human labels, uses the missing features `numMentions`, `sourceTier`, and `duplicateClusterSize`, and the product honestly communicates that the model predicts UCDP-organized-violence matches, not generic importance.

## Scope
1. **Model retraining (Blocker #1)**
   - Update `pipeline/train_supervised.ts` to include the 101 source-checked human labels in the training set.
   - Add `numMentions`, `sourceTier`, and `duplicateClusterSize` as model features.
   - Retrain and write the new champion model to `public/data/escalation-model-champion.json`.
   - Run `bun run eval:phase1` and `bun run surface:phase1`.
   - Record before/after metrics; target: candidate model F1 ≥ baseline F1 (0.35) and surface policy remains the best signal.

2. **UI/UX model-scope clarity (Blocker #3)**
   - Update `AiAnalysis` in `app.js` / `public/app.js` to display the model target name and a plain-language scope explanation.
   - Add a "Model scope" badge near the prediction.
   - In `EventDetail`, visually separate `surfaceScore` (triage rank) from `surfaceModelProbability` / model prediction.
   - Update `api/index.ts` probe text generation to use `prediction.target` instead of hard-coded "Future critical escalation risk."
   - Sync root and public frontend copies with `bun run sync`.

## Non-goals
- No new data-source ingestion beyond the existing labels and event dataset.
- No change to the product name or overall marketing copy.
- No manual source-checking of labels (already complete).
- No future-holdout validation (Blocker #2) or monitoring/rollback work (Phase 2) — those follow this task.

## Constraints
- Keep the root and public frontend files identical.
- Do not claim model improvement unless the evaluation report supports it.
- Preserve existing API shapes; additive changes only.
- Must pass `bun run test:all` before completion.

## Risk classification
- Model retraining: **Medium** (multi-file behavioral change, changes champion artifact).
- UI scope clarity: **Small** (localized frontend copy).

## Acceptance evidence
- `bun run eval:phase1` runs without error and emits `data/eval/phase1_report.json`.
- `bun run surface:phase1` runs without error and emits `data/eval/phase1_surface_report.json`.
- `pipeline/train_supervised.ts` references the three new features and the 101-label training path.
- `app.js` / `public/app.js` show the model-scope badge and explanation, and separate `surfaceScore` from model probability.
- `api/index.ts` probe text uses the dynamic target label.
- `bun run test:all` passes.
