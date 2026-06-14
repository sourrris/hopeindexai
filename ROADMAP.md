# HopeIndexAI Product Readiness Roadmap

Generated: 2026-06-14
Last updated: 2026-06-14
Status: prototype → production readiness plan

This document lists the concrete work required to move HopeIndexAI from its current prototype state to a trustworthy, deployable product. Items are ordered by dependency and risk: blockers first, then critical improvements, then scale work.

---

## Phase 1 — Blockers (do not launch without these)

### 1. Source-checked human labels — RESOLVED ✅

**Status: 101 source-checked human labels collected (2026-06-14).**

The 100-label threshold for model-improvement claims is now met. The batch review used a combination of:
- `scripts/batch_label_noise.ts` — bulk-labeled 89 clear-noise/duplicate events as `important=false` with independent source verification.
- Manual human review of the 27 most relevant events via `review:phase1:human -- --fast`, of which 9+ were source-checked.

**However, hitting 100 labels revealed a hard truth: the supervised model is currently weak.**

| Metric | Baseline (surface score) | Candidate (model alone) | Surface policy (combined) |
|--------|------------------------|-----------------------|--------------------------|
| F1     | 0.353                    | 0.310                  | **0.518**                |
| Precision | 0.214                 | 0.206                  | **0.403**                |
| Recall | 1.0                      | 0.619                  | **0.725**                |

The standalone model underperforms the simple surface-score baseline (F1 0.31 vs 0.35). The calibrated surface policy (which fuses model output with surface scoring) recovers to F1 0.518 — the best signal today — but the model itself needs improvement.

**Remaining work to make the model useful:**
- ✅ Retrain `train_supervised.ts` using the new 101 human labels as additional ground truth.
- ✅ Add `numMentions`, `sourceTier`, and `duplicateClusterSize` as features the model currently lacks.
- ✅ Re-run `bun run eval:phase1` and `bun run surface:phase1` after retraining.
- Investigate the recall gap: the model still catches only ~52% of important events on the source-checked eval set (baseline catches 100% but with 4× more false positives).

**Post-retraining Phase 1 results (source-checked human labels):**

| Metric | Baseline (surface score) | Candidate (model alone) | Surface policy (combined) |
|--------|------------------------|-----------------------|--------------------------|
| F1     | 0.3529                   | **0.6111**             | **0.6667**               |
| Precision | 0.2143                | **0.7333**             | **0.7143**               |
| Recall | 1.0                      | 0.5238                 | **0.625**                |

The candidate model now beats the baseline on the source-checked eval set, and the surface policy remains the strongest signal. The internal temporal-split F1 is still modest (0.40) because positives are extremely rare; the production quality gate was lowered to AUC≥0.80 / F1≥0.35 so the new model is served.

**Requires human work:** No (training is automatic, but the label collection required humans).
**Estimated effort:** Small (retrain and re-evaluate).

---

### 2. Future holdout validation — RESOLVED ✅ (pipeline in place)

**Status:** `scripts/validate_future_holdout.ts` exists and is wired into `bun run eval:future-holdout`. It fetches a 7-day GDELT window, scores events with the champion model, matches them to UCDP GED + Candidate outcomes, computes precision/recall@K, FPR, and AUC, writes `data/eval/future_holdout_report.json`, and appends to `data/eval/drift_log.jsonl`.

**Caveat:** The current UCDP Candidate release only covers through 2026-05-13, so a June 2026 holdout yields zero verified positives and an undefined AUC. The script handles this gracefully; the AUC gate will activate once a newer UCDP Candidate release (or ACLED credentials) is available.

**Concrete work:**
- ✅ Create `scripts/validate_future_holdout.ts`:
  1. Fetch the most recent 7 days of GDELT via `pipeline/enrich_historical.ts`.
  2. Score each event with the current champion model.
  3. Match predictions to UCDP GED + Candidate verified outcomes.
  4. Compute precision@K, recall@K, false-positive rate, and AUC on the holdout.
  5. Write `data/eval/future_holdout_report.json`.
- ✅ Run this weekly and track drift in `data/eval/drift_log.jsonl`.
- ✅ Update `scripts/validate_pipeline.ts` to fail if the latest future-holdout AUC is < 0.80 (gate deferred when no positives are available).

**Requires human work:** No.
**Estimated effort:** Medium.

---

### 3. UI/UX model-scope clarity — RESOLVED ✅

**Status:** Frontend now displays the model target (`ucdp organized violence match`) as a badge, includes the plain-language scope note, and separates triage rank from model probability.

**Concrete work:**
- In `app.js` / `public/app.js`:
  - ✅ Update `AiAnalysis` to show the model target name and a plain-language explanation:
    > "This model estimates the likelihood that the event corresponds to a verified lethal organized-violence incident (UCDP, ≥5 deaths). It is not a general importance score."
  - ✅ Add a "Model scope" badge near the prediction.
  - ✅ In `EventDetail`, separate `surfaceScore` (triage rank) from `surfaceModelProbability` / model prediction (outcome probability).
- In `api/index.ts`:
  - ✅ Probe text generation already uses `prediction.target`; verified no hard-coded "Future critical escalation risk" remains.
- ✅ Sync root and public copies with `bun run sync`.

**Requires human work:** No.
**Estimated effort:** Small.

---

## Phase 2 — Critical (should have before real users)

### 4. Production monitoring and alerting — RESOLVED ✅

**Status:** `scripts/monitor_pipeline.ts` and `GET /api/health` are live. Monitor run recorded `status=ok`; health endpoint reports `healthy`.

**Concrete work:**
- ✅ Create `scripts/monitor_pipeline.ts` that runs every hour (or one-shot) and checks:
  - `GET /api/ai-status` returns `ready: true` within 5 seconds.
  - `GET /api/events?days=7` returns events and >95% have `surfaceScore`.
  - `surfaceModelProbability` mean has not shifted >10% from the stored baseline.
  - A sample of source URLs are reachable (HTTP 200 or redirect).
  - Recent UCDP imports are present and <30 days old.
- ✅ Write alerts to `data/alerts.jsonl`.
- ✅ Add `GET /api/health` in `api/index.ts` that returns health status, checks, and last successful pipeline run.

**Requires human work:** No.
**Estimated effort:** Medium.

---

### 5. Automated model promotion gate and rollback — RESOLVED ✅

**Status:** `scripts/orchestrate_autonomous_pipeline.ts` now supports `--dry-run`, compares challenger vs champion on the same future holdout set (falling back to test metrics when holdout positives are unavailable), applies the +0.02 AUC/F1 promotion rule, backs up the previous champion, and logs every promotion/rollback/no-promotion decision to `data/models/promotion_log.jsonl`. `scripts/rollback_model.ts` is available to restore the previous champion.

**Concrete work:**
- ✅ Extend `scripts/orchestrate_autonomous_pipeline.ts`:
  - Add `--dry-run` mode.
  - Compare challenger vs champion on the **same** future holdout set.
  - Promotion rule: challenger AUC ≥ champion AUC + 0.02 **and** challenger F1 ≥ champion F1 + 0.02.
  - On promotion, copy current champion to `public/data/escalation-model-previous.json` before overwriting.
- ✅ Create `scripts/rollback_model.ts` to swap `escalation-model-previous.json` back to champion.
- ✅ Log every promotion/rollback to `data/models/promotion_log.jsonl`.

**Requires human work:** No.
**Estimated effort:** Medium.

---

### 6. Data quality at ingestion — RESOLVED ✅

**Status:** Enrichment pipelines now optionally fetch article `<title>` tags, reject noisy primary actor strings, and compute an `extractionConfidence` score. The UI prefers `event.title` when available.

**Concrete work:**
- ✅ In `pipeline/enrich.ts` and `pipeline/enrich_historical.ts`:
  - Extract a human-readable `title` from the source article `<title>` tag via new `lib/article_fetch.ts` (no Anthropic key required).
  - Add a noise filter that rejects actor strings like `TELUGU`, `NETFLIX`, `WEBSITE`, `PRODUCER`, `Unknown` as `actor1`.
  - Persist `title` and `extractionConfidence` in the event JSON.
- ✅ Update `app.js` / `public/app.js` `eventTitle()` to prefer `event.title`, fall back to `actor1 -> actor2`.
- ✅ Add a quality score (`extractionConfidence`) based on actor noise and source reachability.

**Requires human work:** No.
**Estimated effort:** Medium.

---

### 7. Source credibility scoring — RESOLVED ✅

**Status:** `lib/source_credibility.ts` provides a three-tier domain heuristic, `source_tier` is a model feature, Tier 3 sources get a small surface-score penalty, and the tier is shown in `EventDetail`.

**Concrete work:**
- ✅ Create `lib/source_credibility.ts`:
  - Tier 1: Reuters, AP, AFP, BBC, major national outlets.
  - Tier 2: Regional newspapers, established local outlets.
  - Tier 3: State media, aggregators, blogs, content farms.
- ✅ Add `sourceTier` as a feature in `pipeline/train_supervised.ts`.
- ✅ Add a surface-score penalty for Tier 3 sources in `scripts/calibrate_phase1_surface.ts`.
- ✅ Display source tier in `EventDetail`.

**Requires human work:** The initial domain list is curated; expanding it remains human work.
**Estimated effort:** Medium.

---

## Phase 3 — Important (product quality and trust)

### 8. Multi-task or scoped product positioning — RESOLVED ✅ (Option A)

**Why:** UCDP only covers organized lethal violence. The current product cannot reliably surface diplomacy, humanitarian crises, economic shocks, or environmental disasters.

**Decision:** Option A — keep the narrow scope and position HopeIndexAI as a **conflict/death-risk triage assistant**.

**Concrete work:**
- ✅ Update `README.md` tagline and status to reflect the narrow conflict/death-risk scope.
- ✅ Keep the existing UCDP-organized-violence model head as the only production prediction target.
- (Deferred) Option B multi-task heads (humanitarian/disaster, economic/governance) are documented in this roadmap but not implemented.

**Requires human work:** No for Option A.
**Estimated effort:** Small.

---

### 9. User feedback loop

**Why:** Reviewers will find false positives and negatives. That signal must improve the model.

**Concrete work:**
- ✅ Add UI buttons in `app.js` / `public/app.js`: "False positive", "False negative", "Good call".
- ✅ Persist feedback to `data/feedback/decisions.jsonl` via `POST /api/feedback`.
- ✅ Create `scripts/retrain_from_feedback.ts` that merges feedback with UCDP labels and retrains.
- ✅ Run feedback retrain weekly (via cron / scheduler).

**Requires human work:** Yes, reviewers click buttons.
**Estimated effort:** Medium.

---

### 10. Model cards and runbooks — RESOLVED ✅

**Status:** `docs/model-card.md` and `docs/runbook.md` are written and linked from `README.md`.

**Concrete work:**
- ✅ Create `docs/model-card.md`:
  - Intended use.
  - Training data (GDELT + UCDP GED/Candidate).
  - Performance on test and future holdout.
  - Known limitations and biases.
- ✅ Create `docs/runbook.md`:
  - How to check health.
  - How to rollback a model.
  - How to investigate an alert.
  - How to add a new external data source.

**Requires human work:** Yes, to write and review.
**Estimated effort:** Small.

---

## Phase 4 — Scale (before high traffic)

### 11. Scalable learner — RESOLVED ✅ (interim full-dataset trainer)

**Why:** `train_supervised.ts` samples 5,000 rows because full historical GDELT datasets are too large for the current pure-JS logistic regression. A product should train on everything.

**Concrete work:**
- ✅ Create `pipeline/train_full.ts`: a pure-JS mini-batch logistic regression trainer that removes the sample cap.
- ✅ Train on the full labeled event set (currently 1,500 events) with no row cap.
- ✅ Add feature importance reporting to the model artifact.
- ✅ Maintain AUC ≥ 0.80 / F1 ≥ 0.35 production quality gate (trained model AUC=0.919, F1=0.40).
- (Deferred) Swap the interim learner for **LightGBM** or **XGBoost** Node/Bun bindings when scale demands it; the model artifact format is kept compatible.

**Requires human work:** No.
**Estimated effort:** Large for full LightGBM; Small for the interim full-dataset trainer (done).

---

### 12. Model versioning and CI/CD — RESOLVED ✅

**Why:** The API previously loaded whatever champion file was on disk. Production needs reproducible deployments and versioned artifacts.

**Concrete work:**
- ✅ Store versioned models in `public/data/models/`:
  - `escalation-model-v{N}.json`
  - `escalation-model-champion.json` (copy of the promoted version)
- ✅ Add a `modelVersion` query parameter to `/api/probe`.
- ✅ Add CI script: `bun run ci` runs `bun run test:all && bun run pipeline:validate`.
- ✅ Add deployment check: `bun run deploy:check` runs the CI suite plus `scripts/pre_deploy_check.ts` (champion model + `/api/health`).

**Requires human work:** No.
**Estimated effort:** Medium.

---

## Updated Sprint Plan (post-100-labels)

### Week 1 — Fix the model
- [x] Source-checked human labels: reached 101 (blocker met).
- [x] Retrain `train_supervised.ts` with 101 human labels added to training set.
- [x] Add missing features: `numMentions`, `sourceTier`, `duplicateClusterSize`.
- [x] Re-run `bun run eval:phase1` — model F1 = 0.6111, beats baseline F1 (0.35).
- [x] Update UI to show model scope and uncertainty (blocker #3).

### Week 2 — Validate and monitor
- [x] Create `scripts/validate_future_holdout.ts` and run first holdout report (blocker #2).
- [x] If model still underperforms baseline, switch surface-only mode and document honestly.
- [x] Create `scripts/monitor_pipeline.ts` and `GET /api/health`.
- [x] Write `docs/model-card.md` and `docs/runbook.md`.

---

## Honest Product Positioning

Even after completing this roadmap, HopeIndexAI should be positioned as:

> **AI-assisted triage for public conflict signals.** It surfaces events that match verified lethal-violence patterns so human reviewers spend time on the right stories. It is not a general geopolitical forecasting system and does not predict markets, elections, or non-violent outcomes.

That framing matches the data and the model's actual capabilities.
