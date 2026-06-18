# Implementation Plan — Scalable Learner Upgrade

## Investigation outcome
- `lightgbm` and `xgboost` npm packages exist, but both are native Node addons (`cmake-js`/`node-addon-api` or `nan`/`bindings`) and add deployment/build risk for Bun/Vercel.
- Existing scoring paths assumed `model.model.weights` + `bias` in `api/index.ts`, `scripts/eval_phase1.ts`, `scripts/calibrate_phase1_surface.ts`, and `scripts/validate_future_holdout.ts`.
- The safest production-compatible upgrade is a pure-TypeScript gradient-boosted tree artifact plus shared scoring helper that supports both legacy logistic and new tree artifacts.

## Design
1. Add `lib/escalation_model.ts` to centralize model scoring, threshold lookup, and local driver extraction.
2. Extend `pipeline/train_full.ts` to default to `--learner=gbdt`:
   - train a logistic linear base for stable ranking;
   - fit shallow Newton-style gradient-boosted trees to residual gradients;
   - emit `model.kind = "gradient_boosted_trees"`, `linearBase`, `trees`, `learningRate`, and feature importance;
   - keep `--learner=logreg` as a fallback.
3. Update API/eval/surface/holdout scoring to call the shared helper.
4. Retrain, promote only if AUC/F1 gate passes, then refresh surfacing scores and docs.

## Invariants
- Feature order remains unchanged.
- Artifact retains `featureNames`, `preprocessing`, `target`, `metrics`, `limitations`, and `featureImportance`.
- Legacy logistic artifacts still score correctly.
- No new native or paid dependencies.

## Verification ladder
1. `bun run typecheck`
2. `bun run train:full`
3. `bun run eval:phase1`
4. `bun run surface:phase1`
5. `bun run eval:future-holdout`
6. `bun run test:all && bun run pipeline:validate`

## Rollback
- Restore `public/data/models/escalation-model-champion.json` from a previous versioned artifact or run `bun run train:full -- --learner=logreg` / existing rollback scripts.
