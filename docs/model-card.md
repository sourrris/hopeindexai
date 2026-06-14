# HopeIndexAI Model Card

## Model identifier

- **Name:** HopeIndexAI escalation supervised model
- **Version:** `escalation-logreg-supervised-v1`
- **Target:** `ucdp_organized_violence_match`
- **Artifact:** `data/models/escalation-model-supervised-latest.json` / `public/data/escalation-model-supervised.json`
- **Type:** Logistic regression (pure TypeScript/Bun implementation)

## Intended use

This model is a triage aid for OSINT watch analysts. It estimates the probability that a noisy public GDELT event row corresponds to a verified lethal organized-violence incident recorded by UCDP (≥5 deaths). It is meant to help humans prioritize which event rows deserve source-checked review, not to predict the future or replace human judgment.

Appropriate use:
- Ranking recent public conflict signals for analyst review.
- Flagging rows that look like UCDP-pattern organized violence.
- Supporting the "Assign / Watch / Dismiss" triage workflow.

Inappropriate use:
- General geopolitical forecasting (elections, markets, diplomacy outcomes).
- Sole basis for policy, legal, or safety-critical decisions without source verification.
- Predicting non-violent events (humanitarian, economic, environmental).

## Training data

- **Primary source:** GDELT v2 15-minute export files (public event rows).
- **Outcome labels:** UCDP GED 26.1 + UCDP Candidate releases, matched to GDELT rows within ±3 days and 300 km with a fuzzy actor/country/spatial score.
- **Human labels:** 101 source-checked Phase 1 human labels (`data/eval/phase1_labels.jsonl`) merged into the supervised training set, with human labels taking precedence over UCDP-derived labels.
- **Positive definition:** An event matches a UCDP organized-violence incident with `deaths.best >= 5` OR is human-labeled `important=true`.
- **Features:** 40 features including Goldstein scale, tone, mentions, source tier, temporal/geographic context, actor overlap, and duplicate cluster size.

## Performance

Metrics are reported on internal temporal splits and on the source-checked human Phase 1 eval set. They should be treated as provisional until validated on a future holdout with verified outcomes.

### Internal temporal split (latest training run)

| Split | AUC | F1 | Precision | Recall |
|-------|-----|----|-----------|--------|
| Train | 0.986 | 0.485 | 0.471 | 0.500 |
| Validation | 0.780 | 0.400 | 0.500 | 0.333 |
| Test | 0.916 | 0.400 | 0.333 | 0.500 |

### Source-checked human Phase 1 eval

| System | F1 | Precision | Recall |
|--------|----|-----------|--------|
| Baseline (surface score) | 0.353 | 0.214 | 1.000 |
| Candidate model | 0.731 | 0.613 | 0.905 |
| Surface policy (combined) | 0.667 | 0.714 | 0.625 |

The candidate model currently beats the simple baseline on the source-checked eval set. The surface policy remains the strongest combined signal.

### Future holdout

A future holdout validation pipeline exists (`bun run eval:future-holdout`), but the current UCDP Candidate release does not yet cover the most recent holdout window, so holdout AUC is not yet computable. The holdout gate activates automatically when verified positives are available.

## Known limitations and biases

- **Narrow scope:** Only organized lethal violence patterns are modeled. Diplomacy, humanitarian crises, economic shocks, and environmental disasters are explicitly out of scope.
- **Label mismatch:** UCDP labels reflect verified lethal violence, while Phase 1 human labels reflect "important." The merged training set conflates these two notions.
- **Rare positives:** Positives are extremely rare (≈1-2% of labeled events), making recall and F1 unstable on small splits.
- **Source bias:** `sourceTier` is a small curated domain list. It underweights state media/aggregators but cannot fully correct for source reliability.
- **Geographic bias:** UCDP coverage and GDELT coverage vary by region. The model will underperform where either data source is sparse.
- **Temporal drift:** The model is trained on historical GDELT/UCDP windows. Real-world performance on future events must be confirmed by the holdout pipeline.
- **Leakage removed:** Earlier versions used UCDP death counts as features. The current model does not use those leakage features at inference time.

## How to retrain

```bash
bun run labels:build          # merge UCDP + human labels
bun run train:supervised      # train new challenger
bun run eval:phase1           # evaluate against source-checked labels
bun run surface:phase1        # refresh surfacing scores
```

## Responsible use

This is an AI-assisted triage prototype, not verified ground truth. Every surfaced event should be source-checked by a human before it is treated as evidence.
