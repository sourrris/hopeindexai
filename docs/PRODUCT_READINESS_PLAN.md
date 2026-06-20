# HopeIndexAI Product Readiness Plan

This file answers one practical question:

```text
What is still remaining before HopeIndexAI feels focused, resume-ready, and interview-impressive?
```

The answer is not "add more features." The answer is to make the product simpler,
more honest, and easier to explain.

## Product Goal

HopeIndexAI is an AI-assisted review queue for noisy public conflict signals.

The product helps one person answer:

```text
Which public event rows should I inspect first?
```

The product does not need to predict the world. It needs to rank noisy events,
show why each event surfaced, help a human check the source, and measure whether
the ranking is better than a simple baseline.

In simple ML terms:

```text
raw event rows = noisy sensor readings
source-checked human labels = answer key
model score = student's guess
evaluation report = test score
```

The best version of this project is a tight human-in-the-loop ML system, not a
giant intelligence dashboard.

## Best Part Of The Product

The strongest part is the evaluation discipline.

Most solo AI projects stop at:

```text
call an LLM -> show a cool summary
```

HopeIndexAI is stronger because it says:

```text
rank events -> source-check labels -> compare against baseline -> do not overclaim
```

That is the part interviewers should remember. The product has an answer key,
a baseline, a model, a report, a model card, and guardrails that stop weak labels
from becoming fake truth.

## MVP Scope

The MVP should be one clean workflow:

```text
Open app
-> see ranked event queue
-> click one event
-> see source, reason, score, uncertainty, and similar signals
-> choose Assign, Watch, or Dismiss
-> export/save human review
-> rerun eval to see whether the model improved
```

Anything outside that workflow is secondary.

## MVP Screens

The solo-project UI should have only three main screens.

### 1. Review Queue

Purpose:

```text
Show the next best events to inspect.
```

Keep:

- Ranked event list.
- Simple filters: date range, region, queue mode.
- Recommendation: `Assign`, `Watch`, or `Dismiss`.
- Score, uncertainty, source tier, and one short reason.

Remove or hide:

- Large decorative hero sections.
- Too many badges.
- Long explanations of basic UI.
- Extra panels that do not help the reviewer choose the next event.

### 2. Event Review

Purpose:

```text
Help the human decide whether this event deserves deeper investigation.
```

Keep:

- Event title.
- Source link.
- Source caveat.
- Why it surfaced.
- Model probability, clearly labeled as narrow UCDP organized-violence likelihood.
- Surface score, clearly labeled as triage rank.
- Related signals.
- Human buttons: `Assign`, `Watch`, `Dismiss`.
- Feedback buttons: `False positive`, `False negative`, `Good call`.

Remove or hide by default:

- Long AI essay output.
- Too many impact categories.
- Complex actor psychology sections unless the user expands "Analyst notes."
- Any metric that needs a paragraph to explain.

### 3. Evidence And Evaluation

Purpose:

```text
Show whether the project is honest and measurable.
```

Keep:

- Number of events.
- Number of reviewed labels.
- Number of source-checked human labels.
- Baseline F1 / precision / recall.
- Candidate model F1 / precision / recall.
- Future holdout status.
- Clear warning if holdout AUC is not computable.

Remove or hide:

- Raw JSON-looking metrics in the UI.
- Internal training details that belong in docs or model card.

## Feature Decisions

| Feature | Keep? | What It Should Do | Why |
| --- | --- | --- | --- |
| Ranked event queue | Yes | Show the next rows worth checking | This is the core product |
| Assign / Watch / Dismiss | Yes | Capture the reviewer's triage decision | Makes the workflow concrete |
| Source link and source caveat | Yes | Force the user to inspect evidence | Prevents fake ground truth |
| Model probability | Yes, but narrow | Estimate UCDP organized-violence match likelihood | Useful only when scoped correctly |
| Surface score | Yes | Rank events for human review | Best practical triage signal |
| Active learning queue modes | Yes, but simplify | Priority, Uncertain, Coverage | Helps choose useful labels |
| Reviewer Copilot | Yes, collapsed by default | Draft checks and caveats | Helpful, but should not dominate UI |
| Map | Optional | Provide geographic context | Nice, but not the main workflow |
| Risk-window model | Docs/demo only for now | Show longer-term country-month research | Impressive but not MVP |
| Long AI analysis | Hide by default | Expand only when needed | Too much noise for solo-product UI |
| Large dashboards | No for MVP | Avoid clutter | Makes the app feel unfocused |
| Multi-task forecasting | No for MVP | Defer humanitarian/economic/disaster heads | Current data does not support it yet |

## Remaining Phases

### Phase A: Clean The Story

Goal:

```text
Make every doc tell the same truth.
```

Remaining:

- Update stale docs that still say there are only 4 source-checked labels.
- Align `README.md`, `CASE_STUDY.md`, `docs/PHASES.md`, and `docs/model-card.md`.
- Make the product sentence identical everywhere:

```text
HopeIndexAI is a human-in-the-loop triage system for noisy public conflict signals.
```

Done when:

- No doc claims old label counts.
- No doc says this is general geopolitical forecasting.
- The case study explains the current 101-label state and the holdout limitation.

Proof:

```bash
rg "4 source-checked|forecasting system|blocked until 100" README.md CASE_STUDY.md docs
```

### Phase B: Simplify The UI

Goal:

```text
Make the app feel like a focused review tool, not a busy dashboard.
```

Remaining:

- Make Review Queue the default first screen.
- Reduce visible text above the queue.
- Move map into a secondary tab or side panel.
- Collapse AI analysis, actor psychology, impact map, and long watchlist sections.
- Use one clear event detail layout:

```text
Title
Source
Recommendation
Why surfaced
Score + probability + uncertainty
Related signals
Human decision buttons
```

Done when:

- A new user can understand the app in under 30 seconds.
- The first screen shows actual events, not a product explanation.
- The event detail panel fits the main decision without scrolling through many sections.

Proof:

```bash
bun run dev
```

Then inspect the UI manually at:

```text
http://localhost:3000
```

### Phase C: Add CI Quality Gate

Status:

```text
Done for the MVP quality gate.
```

Goal:

```text
Make GitHub enforce the same checks that pass locally.
```

Done:

- GitHub Actions runs on pull requests and pushes.
- The quality gate runs:

```bash
bun install
bun run typecheck
bun test
bun run test:smoke
bun run records:validate
bun run pipeline:validate
```

Keep watching:

- GitHub should continue to show a passing `Quality Gate` check.
- A broken typecheck, API smoke test, or pipeline validation should block merge.
- Scheduled enrichment should publish a pull request instead of pushing directly to protected `main`.

Proof:

```text
GitHub Actions `Quality Gate` run passes on the default branch.
```

### Phase D: Make Training Reproducible

Status:

```text
Done for current full-training path.
```

Goal:

```text
Make model training rerunnable and explainable.
```

Done:

- `pipeline/train_full.ts` uses seeded shuffling for training.
- The current champion model artifact records seed `20260620`.
- The model card documents the seed and training command.

Keep watching:

- Running the same training command twice with the same inputs gives stable metrics.
- Future training scripts should not add unseeded randomness.

Proof:

```bash
bun run labels:build
bun run train:full
bun run eval:phase1
```

### Phase E: Build A Real Future Holdout

Goal:

```text
Prove the model works on newer unseen examples.
```

Current issue:

The future holdout report exists, but it has zero verified positives. That means
future-holdout AUC is not computable.

In simple ML terms:

```text
The final exam had no positive examples, so it cannot test whether the model catches positives.
```

Remaining:

- Create or fetch a holdout window that overlaps UCDP Candidate/GED coverage.
- Or wait for a newer UCDP Candidate release and rerun the holdout.
- Report precision@K and recall@K, not just AUC.

Done when:

- Future holdout has verified positives.
- The report shows model performance on unseen data.
- The docs clearly say whether the model passed or failed.

Proof:

```bash
bun run eval:future-holdout
```

### Phase F: Grow Human Labels

Goal:

```text
Make the answer key less fragile.
```

Current state:

```text
101 source-checked human labels
21 positive
80 negative
```

Remaining:

- Grow to 300-500 source-checked labels.
- Balance labels across:
  - region,
  - source tier,
  - model confidence,
  - false positives,
  - false negatives,
  - high-uncertainty rows.

Done when:

- The model is evaluated on enough diverse labels that the result is harder to dismiss as lucky.
- The label distribution is documented.

Proof:

```bash
bun run labels:queue
bun run review:phase1:human -- --mode=priority --limit=50
bun run records:build
bun run records:validate
bun run labels:build
bun run eval:phase1
```

### Phase G: Separate Two Label Targets

Goal:

```text
Avoid mixing two different meanings of "important."
```

Current problem:

The model target combines:

- UCDP organized lethal-violence match.
- Human label: important for triage.

Those are related, but not identical.

Remaining:

- Keep the current triage score as the product ranking.
- Add clearer language:

```text
modelProbability = organized-violence match likelihood
surfaceScore = product triage priority
humanDecision = should an analyst inspect this further?
```

- Later, consider separate model heads:
  - `organized_violence_match`
  - `analyst_triage_importance`

Done when:

- UI and docs never imply one score means everything.
- Interview story can explain why the targets differ.

Proof:

```bash
rg "importance score|risk score|probability" app.js public/app.js README.md docs
```

### Phase H: Production Storage Later

Goal:

```text
Only add real storage when the solo MVP is already clear.
```

Remaining:

- Do not rush into a database before the workflow is simple.
- Later, move feedback, labels, and review state out of JSONL/local browser storage.
- Add auth only when there are real users.

Done when:

- The product can preserve reviewer decisions across sessions and machines.
- There is a simple admin/export path for labels.

Proof:

```text
Reviewer can label events, refresh the app, and keep the decisions.
```

## What To Cut From The Solo MVP

Cut or hide these until the core workflow is excellent:

- Full intelligence dashboard feel.
- Big hero copy.
- Long generated analysis blocks.
- Too many tabs.
- Too many metrics in the main screen.
- Multi-domain geopolitical forecasting.
- Finance/market impact sections unless direct evidence exists.
- Any feature that does not help answer: "Should I inspect this row?"

## Resume-Ready Definition

The project is resume-ready when this is true:

```text
I can open the app, show the queue, inspect one event, explain the model target,
show source-checked labels, show the eval report, and explain what evidence
would make me trust or reject the model.
```

Minimum checklist:

- Docs are consistent.
- UI is simplified.
- CI passes on GitHub.
- Current model card matches current reports.
- Phase 1 eval is fresh.
- Future holdout limitation is explicit.
- No feature claims general forecasting.

## Interview Pitch

Use this:

```text
I built HopeIndexAI as a human-in-the-loop triage system for noisy public conflict
signals. The hard part was not calling an AI model. The hard part was creating a
workflow where public event rows are ranked, source-checked, labeled by humans,
compared against a baseline, and prevented from becoming fake ground truth.
```

Then say the honest limitation:

```text
The model is promising on source-checked Phase 1 labels, but future-holdout AUC
is not yet computable because the current holdout has zero verified positives.
So I treat it as a triage assistant, not a verified forecasting system.
```

That answer is stronger than overclaiming.
