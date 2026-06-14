# HopeIndexAI Product Readiness Roadmap

Generated: 2026-06-14
Status: prototype → production readiness plan

This document lists the concrete work required to move HopeIndexAI from its current prototype state to a trustworthy, deployable product. Items are ordered by dependency and risk: blockers first, then critical improvements, then scale work.

---

## Phase 1 — Blockers (do not launch without these)

### 1. Source-checked human labels (96 more)

**Why it blocks launch:** `AGENTS.md` and the surfacing policy forbid any model-improvement claim until at least 100 source-checked human labels exist. The current dataset has 4.

**Concrete work:**
- Run the existing review CLI daily:
  ```bash
  PHASE1_REVIEWER=your-name bun run review:phase1:human -- --fast
  ```
- Create `scripts/select_review_candidates.ts` to rank events for review using:
  - Proximity to the 52/72 decision thresholds.
  - Disagreement between the supervised model and surface score.
  - Underrepresented countries/themes (coverage gap analysis).
  - High-confidence positives that need spot-checking.
- Target 5–10 labels per day for 2–3 weeks.
- Re-run `bun run surface:phase1` and `bun run eval:phase1` after reaching 100 labels.

**Requires human work:** Yes.
**Estimated effort:** Medium.

---

### 2. Future holdout validation

**Why it blocks launch:** The supervised model reports AUC 0.995 and F1 0.914, but those metrics are from a temporal split inside Dec 2025. The product will serve events from May/June 2026, which the model never saw. Real-world performance is unknown.

**Concrete work:**
- Create `scripts/validate_future_holdout.ts`:
  1. Fetch the most recent 7 days of GDELT via `pipeline/enrich_historical.ts`.
  2. Score each event with the current champion model.
  3. Wait for the next UCDP Candidate release (or use ACLED if credentials are available).
  4. Match predictions to verified outcomes.
  5. Compute precision@K, recall@K, false-positive rate, and AUC on the holdout.
  6. Write `data/eval/future_holdout_report.json`.
- Run this weekly and track drift in `data/eval/drift_log.jsonl`.
- Update `scripts/validate_pipeline.ts` to fail if the latest future-holdout AUC is < 0.80.

**Requires human work:** No.
**Estimated effort:** Medium.

---

### 3. UI/UX model-scope clarity

**Why it blocks launch:** The API now serves a model trained on `ucdp_organized_violence_match`, but the UI still says "Future critical escalation risk." Users will misinterpret predictions.

**Concrete work:**
- In `app.js` / `public/app.js`:
  - Update `AiAnalysis` to show the model target name and a plain-language explanation:
    > "This model estimates the likelihood that the event corresponds to a verified lethal organized-violence incident (UCDP, ≥5 deaths). It is not a general importance score."
  - Add a "Model scope" badge near the prediction.
  - In `EventDetail`, separate `surfaceScore` (triage rank) from `surfaceModelProbability` / model prediction (outcome probability).
- In `api/index.ts`:
  - Update probe text generation to use `prediction.target` instead of hard-coded "Future critical escalation risk."
- Sync root and public copies with `bun run sync`.

**Requires human work:** No.
**Estimated effort:** Small.

---

## Phase 2 — Critical (should have before real users)

### 4. Production monitoring and alerting

**Why:** A deployed model can degrade silently due to source outages, data drift, or GDELT schema changes.

**Concrete work:**
- Create `scripts/monitor_pipeline.ts` that runs every hour and checks:
  - `GET /api/ai-status` returns `ready: true` within 5 seconds.
  - `GET /api/events?days=7` returns events and >95% have `surfaceScore`.
  - `surfaceModelProbability` distribution has not shifted >10% from the baseline.
  - A sample of source URLs are reachable (HTTP 200 or expected redirect).
  - Recent UCDP imports completed without errors.
- Write alerts to `data/alerts.jsonl`.
- Add `GET /api/health` in `api/index.ts` that returns health status and last successful pipeline run.

**Requires human work:** No.
**Estimated effort:** Medium.

---

### 5. Automated model promotion gate and rollback

**Why:** Promotion is currently manual (`bun run ml:autonomous -- --promote`). A production system needs an automated gate and a safe rollback path.

**Concrete work:**
- Extend `scripts/orchestrate_autonomous_pipeline.ts`:
  - Add `--dry-run` mode.
  - Compare challenger vs champion on the **same** future holdout set.
  - Promotion rule: challenger AUC ≥ champion AUC + 0.02 **and** challenger F1 ≥ champion F1 + 0.02.
  - On promotion, copy current champion to `public/data/escalation-model-previous.json` before overwriting.
- Create `scripts/rollback_model.ts` to swap `escalation-model-previous.json` back to champion.
- Log every promotion/rollback to `data/models/promotion_log.jsonl`.

**Requires human work:** No.
**Estimated effort:** Medium.

---

### 6. Data quality at ingestion

**Why:** Many GDELT rows have noisy actor strings (`TELUGU`, `NETFLIX -> TEXAS`) and no explicit title. The UI currently derives titles from `actor1 -> actor2`, which looks broken for noisy rows.

**Concrete work:**
- In `pipeline/enrich.ts` and `pipeline/enrich_historical.ts`:
  - Extract a human-readable `title` from the source article `<title>` tag (reuse LLM-enrichment fetch path without requiring Anthropic).
  - Add a noise filter that flags or rejects actor strings like `TELUGU`, `NETFLIX`, `WEBSITE`, `PRODUCER`, `Unknown`.
  - Persist `title` in the event JSON.
- Update `app.js` `eventTitle()` to prefer `event.title`, fall back to `actor1 -> actor2`.
- Add a quality score (`extractionConfidence`) based on actor noise and source reachability.

**Requires human work:** No.
**Estimated effort:** Medium.

---

### 7. Source credibility scoring

**Why:** The model currently treats all publishers equally. State media, aggregators, and wire services should not have equal weight.

**Concrete work:**
- Create `lib/source_credibility.ts`:
  - Tier 1: Reuters, AP, AFP, BBC, major national outlets.
  - Tier 2: Regional newspapers, established local outlets.
  - Tier 3: State media, aggregators, blogs, content farms.
- Add `sourceTier` as a feature in `pipeline/train_supervised.ts`.
- Add a surface-score penalty for Tier 3 sources in `scripts/calibrate_phase1_surface.ts`.
- Display source tier in `EventDetail`.

**Requires human work:** Yes, to curate the domain list.
**Estimated effort:** Medium.

---

## Phase 3 — Important (product quality and trust)

### 8. Multi-task or scoped product positioning

**Why:** UCDP only covers organized lethal violence. The current product cannot reliably surface diplomacy, humanitarian crises, economic shocks, or environmental disasters.

**Concrete work:**
- Option A (recommended for speed): keep the narrow scope and market HopeIndexAI as a **conflict/death-risk triage assistant**.
- Option B (long-term): build separate prediction heads:
  - Head 1: lethal organized violence (UCDP) — done.
  - Head 2: humanitarian/disaster signals — train on GDELT + ReliefWeb/UN OCHA feeds.
  - Head 3: economic/governance risk — train on GDELT + World Bank/IMF alerts.
- If Option B, create `pipeline/train_multitask.ts` and a combined inference path.

**Requires human work:** Depends on scope; Option B needs domain curation.
**Estimated effort:** Large.

---

### 9. User feedback loop

**Why:** Reviewers will find false positives and negatives. That signal must improve the model.

**Concrete work:**
- Add UI buttons in `app.js`: "False positive", "False negative", "Good call".
- Persist feedback to `data/feedback/decisions.jsonl`.
- Create `scripts/retrain_from_feedback.ts` that merges feedback with UCDP labels and retrains.
- Run feedback retrain weekly.

**Requires human work:** Yes, reviewers click buttons.
**Estimated effort:** Medium.

---

### 10. Model cards and runbooks

**Why:** Users and auditors need to understand what the model does, its limitations, and how to operate it.

**Concrete work:**
- Create `docs/model-card.md`:
  - Intended use.
  - Training data (GDELT + UCDP GED/Candidate).
  - Performance on test and future holdout.
  - Known limitations and biases.
- Create `docs/runbook.md`:
  - How to check health.
  - How to rollback a model.
  - How to investigate an alert.
  - How to add a new external data source.

**Requires human work:** Yes, to write and review.
**Estimated effort:** Small.

---

## Phase 4 — Scale (before high traffic)

### 11. Scalable learner

**Why:** `train_supervised.ts` samples 5,000 rows because full historical GDELT datasets are too large for the current pure-JS logistic regression. A product should train on everything.

**Concrete work:**
- Replace the custom logistic regression with **LightGBM** or **XGBoost** (Node/Bun bindings available).
- Train on the full historical dataset (80k+ events).
- Add feature importance reporting to the model artifact.
- Maintain AUC ≥ 0.95 on future holdout.

**Requires human work:** No.
**Estimated effort:** Large.

---

### 12. Model versioning and CI/CD

**Why:** The API currently loads whatever champion file is on disk. Production needs reproducible deployments and versioned artifacts.

**Concrete work:**
- Store versioned models in `public/data/models/`:
  - `escalation-model-v{N}.json`
  - `escalation-model-champion.json` (symlink or copy)
- Add a `modelVersion` query parameter to `/api/probe`.
- Add CI step: `bun run test:all && bun run pipeline:validate` on every PR.
- Add deployment check: fail deploy if `pipeline:validate` fails.

**Requires human work:** No.
**Estimated effort:** Medium.

---

## Recommended 2-Week Sprint Plan

### Week 1
- [ ] Source-checked human labels: reach 50.
- [ ] Create `scripts/select_review_candidates.ts` for active learning.
- [ ] Update UI to show model scope and uncertainty.
- [ ] Add source credibility tier list (`lib/source_credibility.ts`).

### Week 2
- [ ] Source-checked human labels: reach 100.
- [ ] Create `scripts/validate_future_holdout.ts` and run first holdout report.
- [ ] Create `scripts/monitor_pipeline.ts` and `GET /api/health`.
- [ ] Write `docs/model-card.md` and `docs/runbook.md`.

---

## Honest Product Positioning

Even after completing this roadmap, HopeIndexAI should be positioned as:

> **AI-assisted triage for public conflict signals.** It surfaces events that match verified lethal-violence patterns so human reviewers spend time on the right stories. It is not a general geopolitical forecasting system and does not predict markets, elections, or non-violent outcomes.

That framing matches the data and the model's actual capabilities.
