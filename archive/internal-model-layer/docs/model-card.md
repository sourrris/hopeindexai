# HopeIndexAI Model Card

## Model identifier

- **Name:** HopeIndexAI escalation supervised model
- **Version:** `escalation-gbdt-full-v4`
- **Target:** `ucdp_organized_violence_match`
- **Artifact:** `public/data/models/escalation-model-champion.json` (versioned source: `public/data/models/escalation-model-v4.json`)
- **Type:** Gradient-boosted shallow trees with a logistic linear base (pure TypeScript/Bun implementation; no native LightGBM/XGBoost addon required)

## Intended use

HopeIndexAI is an AI triage system that estimates whether noisy public conflict
signals matter to a chosen stakeholder, then exposes the evidence, assumptions,
and uncertainty for human audit.

This model is a triage aid for OSINT watch analysts. It estimates the probability that a noisy public GDELT event row corresponds to a verified lethal organized-violence incident recorded by UCDP (>=5 deaths). It is not yet a stakeholder-specific importance model. It helps humans prioritize which event rows deserve source-checked audit, not predict the future or replace human judgment.

Appropriate use:
- Ranking recent public conflict signals for analyst audit.
- Flagging rows that look like UCDP-pattern organized violence.
- Supporting the "Assign / Watch / Dismiss" triage workflow.

Inappropriate use:
- Broad geopolitical prediction (elections, markets, diplomacy outcomes).
- Sole basis for policy, legal, or safety-critical decisions without source verification.
- Predicting non-violent events (humanitarian, economic, environmental).

## Training data

- **Primary source:** GDELT v2 15-minute export files (public event rows).
- **Outcome labels:** UCDP GED 26.1 + UCDP Candidate releases, matched to GDELT rows within ±3 days and 300 km with a fuzzy actor/country/spatial score.
- **Human audit labels:** 101 source-checked Phase 1 human labels (`data/eval/phase1_labels.jsonl`) merged into the supervised training set, with human labels taking precedence over UCDP-derived labels.
- **Positive definition:** An event matches a UCDP organized-violence incident with `deaths.best >= 5` OR is human-labeled `important=true`.
- **Features:** 40 features including Goldstein scale, tone, mentions, source tier, temporal/geographic context, actor overlap, and duplicate cluster size.

## Training run

- **Command:** `bun run labels:build && bun run train:full`
- **Seed:** `20260620`
- **Reproducibility:** Mini-batch shuffling and AUC downsampling use the fixed seed, so the same inputs should produce stable model metrics.

## Performance

Metrics are reported on internal temporal splits and on the source-checked human Phase 1 eval set. They should be treated as provisional until validated on a future holdout with verified outcomes.

### Internal temporal split (latest training run)

| Split | AUC | F1 | Precision | Recall |
|-------|-----|----|-----------|--------|
| Train | 0.997 | 0.593 | 0.421 | 1.000 |
| Validation | 0.797 | 0.444 | 0.333 | 0.667 |
| Test | 0.905 | 0.400 | 0.333 | 0.500 |

### Source-checked human Phase 1 eval

| System | F1 | Precision | Recall |
|--------|----|-----------|--------|
| Baseline (surface score) | 0.353 | 0.214 | 1.000 |
| Candidate model | 0.750 | 0.667 | 0.857 |
| Surface policy (combined) | 0.639 | 0.719 | 0.575 |

The candidate model currently beats the simple baseline on the source-checked audit eval set. The surface policy remains the product triage ranking, while the model probability is the narrower UCDP organized-violence match estimate.

### Future holdout

A future holdout validation pipeline exists (`bun run eval:future-holdout`), but the current report has zero verified positives, so holdout AUC is not yet computable. The holdout gate activates automatically when verified positives are available.

## Known limitations and biases

- **Narrow scope:** Only organized lethal violence patterns are modeled. Diplomacy, humanitarian crises, economic shocks, and environmental disasters are explicitly out of scope.
- **Label mismatch:** UCDP labels reflect verified lethal violence, while Phase 1 human audit labels reflect "important." The merged training set conflates these two notions.
- **Rare positives:** Positives are extremely rare (≈1-2% of labeled events), making recall and F1 unstable on small splits.
- **Source bias:** `sourceTier` is a small curated domain list. It underweights state media/aggregators but cannot fully correct for source reliability.
- **Geographic bias:** UCDP coverage and GDELT coverage vary by region. The model will underperform where either data source is sparse.
- **Temporal drift:** The model is trained on historical GDELT/UCDP windows. Real-world performance on future events must be confirmed by the holdout pipeline.
- **Leakage removed:** Earlier versions used UCDP death counts as features. The current model does not use those leakage features at inference time.

## How to retrain

```bash
bun run labels:build          # merge UCDP + human labels
bun run train:full            # train new versioned GBDT challenger/champion
bun run eval:phase1           # evaluate against source-checked audit labels
bun run surface:phase1        # refresh surfacing scores
```

## Responsible use

This is an AI-assisted triage prototype, not verified ground truth. Every surfaced event should be source-checked by a human before it is treated as evidence.
