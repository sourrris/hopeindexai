# Training Records

This folder contains generated training-record JSONL files.

Current file:

- `phase2_records.jsonl` - one catalogue record per matched Phase 1 label.
- `risk_windows_country_month.jsonl` - local-only 2010+ country-month outcome-risk rows.
- `risk_windows_country_month_profile.json` - small profile for the country-month risk dataset.
- `risk_windows_country_month_sample.jsonl` - small sample of positive risk-window rows.

Build and validate:

```bash
bun run records:build
bun run records:validate
```

Attach external UCDP evidence status when the local UCDP import exists:

```bash
bun run import:ucdp
bun run match:external
bun run records:build
bun run records:validate
```

Only records with `mlUse.truthStatus: "source_checked_human"` can become final importance training/evaluation truth. Weak future-window targets are useful for experiments, but they are not proof.

External evidence such as `externalEvidence.ucdpGed` is also not final importance truth. It is curated context that can update confidence and support future outcome work.

## 2010+ Risk Windows

Build the historical risk-window table with:

```bash
bun run risk:windows
bun run risk:train
```

This uses UCDP GED plus UCDP Candidate to create country-month rows from 2010 onward.

In simple ML terms:

```text
features = what happened in the previous 1/3/12 months
label = did organized violence happen in this country this month?
```

This is not the same as HopeIndexAI importance truth. It is an outcome-risk dataset. It can teach a model country-level conflict risk, while human-reviewed `phase2_records.jsonl` teaches product triage importance.

Current model status:

```text
Small logistic model trained: yes
Promoted as better than baseline: no
Reason: it does not beat the simple history baseline on validation/test average precision.
```

Initialize or refresh the current champion baseline with:

```bash
bun run risk:baseline
```

Champion artifacts:

```text
data/models/risk_window_champion.json
data/eval/risk_window_champion_report.json
data/experiments/risk_research_ledger.jsonl
```

Current promotion gate:

```text
validation AP must exceed 0.9613
test AP must exceed 0.9799
top-10 precision must not regress
```

Run bounded autoresearch challengers with:

```bash
bun run risk:research
```

The bounded loop now includes deterministic score variants and logistic variants. Current champion:

```text
variant: score.history_heavier
validation AP: 0.9613
test AP: 0.9799
2026 preliminary AP: 0.7373
decision: promoted
```
