# Training-Grade Records

HopeIndexAI should not train directly on `public/data/events.json`.

That file is a browser slice of noisy public event rows. A training-grade record is the cleaner object we are willing to let a model learn from or be tested against.

In simple ML terms:

```text
raw event rows = noisy sensor readings
training records = cleaned study cards
source-checked human labels = answer key
weak future labels = practice targets
model = student
```

## Goal

The goal is to catalogue messy world data into records that answer:

- What happened?
- Who were the actors?
- Where and when did it happen?
- Which source supports the row?
- Did a human check the source context?
- Did the event matter for triage?
- What happened in the next outcome window?
- Is this row safe for training or evaluation?

## Pipeline Shape

```text
public/data/events.json
-> data/labeling/reviewer_queue.jsonl
-> data/eval/phase1_labels.jsonl
-> records builder
-> data/training/phase2_records.jsonl
-> optional external evidence match rows
-> records validator
-> future model training/evaluation
```

First-principles rule:

```text
Do not let the model learn from rows whose truth status is unclear.
```

Bayesian translation:

```text
The raw event score is a prior guess.
Source evidence and human review update that guess.
Only high-quality updates should become final evaluation truth.
```

Game-theory translation:

```text
An event matters when it changes an actor's incentives, constraints, leverage, or likely next move.
```

## Record File

Generated records live at:

```text
data/training/phase2_records.jsonl
```

Build them with:

```bash
bun run labels:queue
bun run records:build
```

Validate them with:

```bash
bun run records:validate
```

## Truth Status

Each record has `mlUse.truthStatus`.

Valid values:

- `source_checked_human` - a person reviewed the source URL or enough source context.
- `machine_reviewed` - Codex/LLM reviewed it; useful for triage, not final truth.
- `bootstrap` - generated from current rules; useful for wiring, not final truth.
- `unverified` - present, but not enough review context.

Only `source_checked_human` records can set:

```json
{
  "mlUse": {
    "canTrainImportance": true,
    "canEvaluateImportance": true
  }
}
```

That is the core guardrail. The model is the student, so the student cannot write its own answer key.

## Weak Outcome Targets

The builder also creates a weak target:

```text
futureEscalation72h
```

This asks whether a related high-risk negative public event appears within the next 72 hours. It is useful for prototype forecasting experiments, but it is derived from future GDELT-style rows, so it is not final proof.

Weak outcome targets may be used for exploration:

```json
{
  "mlUse": {
    "canTrainWeakOutcome": true
  }
}
```

They must not be used as final evaluation truth:

```json
{
  "mlUse": {
    "canEvaluateOutcome": false
  }
}
```

## 2010+ Risk-Window Dataset

For a real ML backbone, we now use country-month risk windows instead of trying to predict exact news events.

Build:

```bash
bun run risk:windows
bun run risk:train
bun run risk:baseline
```

Outputs:

```text
data/training/risk_windows_country_month.jsonl
data/training/risk_windows_country_month_profile.json
data/training/risk_windows_country_month_sample.jsonl
data/eval/risk_windows_baseline_report.json
data/models/risk_window_logreg_model.json
data/eval/risk_window_model_report.json
data/models/risk_window_champion.json
data/eval/risk_window_champion_report.json
data/experiments/risk_research_ledger.jsonl
```

The large JSONL is local-only. The profile and baseline report are commit-friendly.

Each row asks:

```text
Given this country's previous 1/3/12 months of organized-violence history,
did organized violence happen in the current month?
```

Current generated profile:

```text
Rows: 21,276
Countries: 108
ACLED aggregate country matches: 98
Month range: 2010-01 to 2026-05
Positive rows: 7,394
Trainable outcome rows: 15,552
Evaluable outcome rows: 3,888
```

Feature families:

```text
UCDP country history
UCDP neighbor-region spillover
UCDP actor memory
ACLED aggregate trend/context features
```

Splits:

```text
train: 2011-01 to 2022-12
validation: 2023-01 to 2024-12
test: 2025-01 to 2025-12
holdout_preliminary: 2026-01 to 2026-05
```

The 2026 rows use UCDP Candidate, so they are useful as a preliminary holdout, not a final test set.

Current dumb baseline:

```text
Score = recent events + recent deaths + 12-month history + momentum - quiet penalty
```

Baseline report:

```text
validation average precision: 0.9595
test average precision: 0.9779
2026 preliminary average precision: 0.7296
```

Current expanded-feature baseline and logistic model:

```text
Expanded baseline validation AP: 0.9598
Expanded baseline test AP: 0.9774
Expanded baseline 2026 preliminary AP: 0.7297

Logistic validation AP: 0.9464
Logistic test AP: 0.9722
Logistic 2026 preliminary AP: 0.7367
```

Decision:

```text
Do not promote the logistic model yet.
It improves the preliminary 2026 holdout slightly, but loses to the baseline on validation and test.
```

Current champion:

```text
champion: score.history_heavier
type: deterministic score
validation AP: 0.9613
test AP: 0.9799
2026 preliminary AP: 0.7373
```

Autoresearch promotion gate:

```text
challenger validation AP > 0.9613
challenger test AP > 0.9799
top-10 precision must not regress
2026 preliminary holdout is informational only
```

Bounded autoresearch:

```bash
bun run risk:research
```

Current bounded autoresearch result:

```text
variants tried in latest run: 19
best challenger: score.history_heavier
best validation AP: 0.9613
best test AP: 0.9799
decision: promoted
```

This is the intended behavior. Autoresearch is allowed to generate challengers, but the metric gate decides whether anything is promoted.

Interpretation:

```text
The useful signal was not a bigger learned model.
It was a simpler scoring formula that gives more weight to long-run conflict inertia and less weight to short-term noise.
```

Bayesian interpretation:

```text
Prior violence history is already very predictive.
A learned model must beat this baseline before it earns trust.
```

Game-theory interpretation:

```text
Conflict actors, grievances, and capabilities persist over time.
So the strongest first signal is not a single article; it is the recent local history of the game board.
```

## External Evidence

Records can also carry:

```text
externalEvidence.ucdpGed
```

Populate it with:

```bash
bun run import:ucdp
bun run match:external
bun run records:build
```

The field answers whether a curated external dataset overlaps this row in time, place, actor, and event type.

The important guardrail is:

```json
{
  "externalEvidence": {
    "ucdpGed": {
      "canUseAsImportanceTruth": false
    }
  }
}
```

UCDP can help us learn whether organized violence happened near the row. It does not decide whether the row deserves HopeIndexAI's product label of "important." That still requires human source-checking.

Bayesian translation:

```text
An external match updates our belief.
It does not replace the answer key.
```

Game-theory translation:

```text
External evidence helps identify the board state.
Human review still decides whether the move matters for this product.
```

## Current Limitation

The Phase 1 human review CLI records `sourceChecked` and now asks whether the checked source/context supports the event row. Older labels without that field are treated as source-supported for backward compatibility. New labels with `sourceSupportsClaim: false` remain auditable, but they are excluded from train/eval truth.

Human review stores these explicit fields:

```json
{
  "sourceSupportsClaim": true,
  "actorResolutionCorrect": true,
  "eventTypeCorrect": true,
  "outcomeReviewed": false
}
```
