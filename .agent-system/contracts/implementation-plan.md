# Implementation Plan — Phase 1 Model Fix + UI Scope Clarity

## Acceptance criteria (observable)
1. `bun run labels:build` produces `data/training/supervised_labels.jsonl` that contains the UCDP-derived labels plus the 101 source-checked human labels from `data/eval/phase1_labels.jsonl`, with human labels taking precedence.
2. `pipeline/train_supervised.ts` emits a model whose `featureNames` match the 37-feature inference vector plus the 3 new features (`numMentions`, `sourceTier`, `duplicateClusterSize`) and no longer contains `ucdp_deaths_best_log` / `ucdp_confidence`.
3. `scripts/eval_phase1.ts`, `scripts/calibrate_phase1_surface.ts`, and `api/index.ts` all use the identical feature list and extraction logic.
4. `bun run train:supervised` writes `public/data/escalation-model-supervised.json`. If it passes the quality gate (test AUC >= 0.80 and test F1 >= 0.70) it is also copied to `data/models/escalation-model-supervised-latest.json` so the API serves it.
5. `bun run eval:phase1` loads the supervised model when available and produces `data/eval/phase1_report.json`.
6. `bun run surface:phase1` loads the supervised model and writes the enriched `public/data/events.json` plus `data/eval/phase1_surface_report.json`.
7. `app.js` / `public/app.js` display the model target name as a badge, show a plain-language scope note, and visually separate `surfaceScore` from model probability in `EventDetail`.
8. Root and public frontend files are identical after `bun run sync`.
9. `bun run test:all` passes.

## Files to change

### Model / pipeline
- `scripts/build_supervised_labels.ts` — add optional merge of source-checked human labels from `data/eval/phase1_labels.jsonl` into the generated `data/training/supervised_labels.jsonl`.
- `pipeline/train_supervised.ts` —
  - remove `ucdp_deaths_best_log` and `ucdp_confidence` from `FEATURE_NAMES` and `featuresFor`;
  - add `numMentions` (raw), `sourceTier`, and `duplicateClusterSize` to `FEATURE_NAMES` and `featuresFor`;
  - import/use `sourceTierFromUrl` from `lib/source_credibility.ts`;
  - copy the new model to `data/models/escalation-model-supervised-latest.json` when the quality gate passes.
- `lib/source_credibility.ts` — new helper `sourceTierFromUrl(url): 1 | 2 | 3` with a small curated domain list (tier-1 major outlets, tier-3 state/aggregator/farm, everything else tier-2).

### Eval / surface / API consumers
- `scripts/eval_phase1.ts` —
  - update `FEATURE_NAMES` to match the trainer;
  - update `featuresFor` to compute `numMentions`, `sourceTier`, `duplicateClusterSize`;
  - change `MODEL_PATH` resolution: prefer `public/data/escalation-model-supervised.json`, fall back to `public/data/escalation-model.json`.
- `scripts/calibrate_phase1_surface.ts` — same feature/model path updates as eval.
- `api/index.ts` —
  - update `modelFeaturesFor` with the new features;
  - update `loadEscalationModel` to also consider `public/data/escalation-model-supervised.json` with the same AUC/F1 quality gate.

### Frontend
- `app.js` —
  - replace the hard-coded "critical escalation risk in 72h" sub-label in `IntelPacket` with a dynamic scope line using `prediction.target` and a fixed plain-language explanation;
  - add a "Model scope" badge;
  - in `EventDetail`, split surface-score display from model-probability display and label each.
- `public/app.js` — mirror the same changes.

### Scripts / package.json
- No new package dependencies required.
- `package.json` `labels:build` already points to `scripts/build_supervised_labels.ts`.

## Invariants
- Feature name order must be identical across `train_supervised.ts`, `eval_phase1.ts`, `calibrate_phase1_surface.ts`, and `api/index.ts`.
- The old champion `public/data/escalation-model.json` is only overwritten if the new supervised model passes the quality gate; otherwise it remains the fallback.
- Root and public frontend pairs remain byte-identical after sync.
- No manual labels are marked `sourceChecked: true`.

## Sequence / checkpoints
1. **Build merged labels** — run `bun run labels:build` and verify the output contains the human-labeled event IDs with correct 0/1 labels.
2. **Add source-tier helper** — create `lib/source_credibility.ts` and a small unit-style smoke check (e.g., `reuters.com` -> 1, `presstv.ir` -> 3, unknown -> 2).
3. **Update trainer** — align features, remove leakage, add new features, add promotion copy to `data/models/escalation-model-supervised-latest.json`.
4. **Update consumers** — eval, surface, API feature lists and model path resolution.
5. **Train and evaluate** — run `bun run train:supervised`, `bun run eval:phase1`, `bun run surface:phase1`. Record metrics.
6. **Frontend scope clarity** — edit root `app.js`, run `bun run sync`, verify public copy matches.
7. **Quality gate** — run `bun run test:all`.

## Verification ladder
- `bun run labels:build` exits 0 and produces JSONL with >= 101 human label overrides.
- `bun run train:supervised` exits 0, writes `public/data/escalation-model-supervised.json`, and copies it to `data/models/escalation-model-supervised-latest.json` if AUC/F1 gate passes.
- `bun run eval:phase1` exits 0 and report JSON contains baseline and candidate metrics.
- `bun run surface:phase1` exits 0 and `public/data/events.json` events contain `surfaceModelProbability`.
- `bun run sync` exits 0 and `diff app.js public/app.js` is empty.
- `bun run test:all` exits 0.

## Rollback
- Restore `public/data/escalation-model-supervised.json` deletion is safe; API will fall back to `public/data/escalation-model.json`.
- If `data/models/escalation-model-supervised-latest.json` causes problems, delete it to force fallback.
- Frontend changes can be reverted by restoring `app.js`/`public/app.js` from git.
