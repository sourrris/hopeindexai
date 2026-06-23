# HopeIndexAI Product Readiness Plan

This file answers one practical question:

```text
What is still remaining before HopeIndexAI feels focused, resume-ready, and interview-impressive?
```

The answer is not "add more features." The answer is to make the product simpler,
more honest, and easier to explain.

## Product Goal

HopeIndexAI is an AI-assisted stakeholder-importance queue for noisy public
conflict signals.

The product helps one person answer:

```text
Which public event rows look important to the country, person, agency, or
decision-maker I care about?
```

The product does not need to predict the world. It needs to rank noisy events,
make an explicit assumption about why the event may matter to a stakeholder,
show the evidence and uncertainty behind that assumption, and help a human audit
the highest-impact or least-certain calls.

In simple ML terms:

```text
raw event rows = noisy sensor readings
stakeholder = the viewpoint that defines "important"
model judgment = AI's current assumption about importance
human review = audit and calibration signal
evaluation report = test score for whether the assumptions are useful
```

The best version of this project is a focused AI triage system that explains its
importance assumptions, not a giant intelligence dashboard or a labeling factory.

## Best Part Of The Product

The strongest part is the assumption and evaluation discipline.

Most solo AI projects stop at:

```text
call an LLM -> show a cool summary
```

HopeIndexAI is stronger because it says:

```text
rank events -> state why they matter -> expose uncertainty -> audit the call
-> compare against baseline -> do not overclaim
```

That is the part interviewers should remember. The product has an AI judgment,
a stakeholder frame, an audit trail, a baseline, a report, a model card, and
guardrails that stop confident-sounding assumptions from becoming fake truth.

## MVP Scope

The MVP should be one clean workflow:

```text
Open app
-> choose or confirm the stakeholder frame
-> see ranked live stakeholder-importance queue
-> click one event
-> see source, stakeholder, reason, assumption, score, and uncertainty
-> choose Assign, Watch, or Dismiss
-> export/save the audit decision
-> view a simple evaluation snapshot
```

Anything outside that workflow is post-MVP.

The first MVP cut line is:

```text
If it does not help the reviewer decide "assign, watch, or dismiss" for one row,
hide it, move it to docs, or cut it from the first build.
```

In simple ML terms, the MVP is not trying to be a full prediction platform. It
is testing one useful loop:

```text
model ranks a noisy row -> model explains its assumption -> human audits it
-> evaluation checks whether that assumption pattern is useful
```

## MVP Screens

The solo-project UI should have only three main screens.

### 1. Review Queue

Purpose:

```text
Show the next events most likely to matter to the selected stakeholder.
```

Keep:

- Ranked event list.
- Stakeholder frame: country, person, agency, or decision-maker.
- One default queue mode: priority.
- One optional date range filter.
- Recommendation: `Assign`, `Watch`, or `Dismiss`.
- Score, uncertainty, source tier, and one short importance reason.

Remove or hide:

- Large decorative hero sections.
- Too many badges.
- Long explanations of basic UI.
- Region filter until the queue is already easy to use.
- Uncertain and coverage queue modes until priority mode feels excellent.
- Extra panels that do not help the reviewer choose the next event.

### 2. Event Review

Purpose:

```text
Help the human decide whether this event matters enough to inspect further.
```

Keep:

- Event title.
- Source link.
- Source caveat.
- Stakeholder frame.
- Why it surfaced for that stakeholder.
- Explicit model assumption.
- Model probability, clearly labeled as narrow UCDP organized-violence likelihood.
- Stakeholder importance score, clearly labeled as an AI judgment.
- Surface score, clearly labeled as triage rank.
- Human buttons: `Assign`, `Watch`, `Dismiss`.

Remove or hide by default:

- Related signals unless they directly explain the recommendation.
- Feedback buttons: `False positive`, `False negative`, `Good call`.
- Long AI essay output.
- Too many impact categories.
- Complex actor psychology sections unless the user expands "Analyst notes."
- Any metric that needs a paragraph to explain.

### 3. Evidence And Evaluation

Purpose:

```text
Show whether the project is honest and measurable, without making evaluation
part of the main review flow.
```

Keep:

- Number of events.
- Number of reviewed audit decisions.
- Number of source-checked audit labels.
- Number of stakeholder-importance audit decisions.
- Baseline F1 / precision / recall.
- Candidate model F1 / precision / recall.
- Calibration checks for high-confidence importance calls.
- Future holdout status.
- Clear warning if holdout AUC is not computable.

Remove or hide:

- Raw JSON-looking metrics in the UI.
- Internal training details that belong in docs or model card.
- Manual rerun controls unless they are clearly separated from the reviewer UI.

## Feature Decisions

| Feature | Keep? | What It Should Do | Why |
| --- | --- | --- | --- |
| Stakeholder frame | Yes | Define who the event may matter to: country, person, agency, or decision-maker | Importance depends on viewpoint |
| Ranked event queue | Yes | Show the next rows likely to matter to the selected stakeholder | This is the core product |
| Assign / Watch / Dismiss | Yes | Capture the reviewer's triage decision | Makes the workflow concrete |
| Source link and source caveat | Yes | Force the user to inspect evidence | Prevents fake ground truth |
| Model probability | Yes, but narrow | Estimate UCDP organized-violence match likelihood | Useful only when scoped correctly |
| Stakeholder importance score | Yes | Estimate whether the event matters to the selected stakeholder | This is the main AI judgment |
| Surface score | Yes | Rank events for human audit | Best practical triage signal |
| Active learning queue modes | Post-MVP | Start with priority only; add Uncertain and Coverage later | Extra modes split attention before the core loop is proven |
| Reviewer Copilot | Post-MVP | Keep drafts and caveats out of the first screen | Helpful later, but it can make the MVP look like a chatbot |
| Map | Cut from first MVP | Keep geography as text for now | Nice context, but not needed to choose Assign, Watch, or Dismiss |
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
HopeIndexAI is an AI triage system that estimates whether noisy public conflict
signals matter to a chosen stakeholder, then exposes the evidence, assumptions,
and uncertainty for human audit.
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
- Remove the map from the first MVP UI; keep location as simple text.
- Hide region filters, Uncertain mode, and Coverage mode until priority mode is clear.
- Remove Reviewer Copilot from the first MVP UI.
- Collapse AI analysis, actor psychology, impact map, and long watchlist sections.
- Use one clear event detail layout:

```text
Title
Source
Recommendation
Why surfaced
Score + probability + uncertainty
Human decision buttons
```

Done when:

- A new user can understand the app in under 30 seconds.
- The first screen shows actual events, not a product explanation.
- The event detail panel fits the main decision without scrolling through many sections.
- The first MVP has no map, copilot, dashboard, or extra queue modes in the main path.

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

### Phase F: Grow Human Audit Labels

Goal:

```text
Make the calibration set less fragile.
```

Current state:

```text
101 source-checked human audit labels
21 positive
80 negative
```

Remaining:

- Grow to 300-500 source-checked audit labels.
- Balance audits across:
  - region,
  - source tier,
  - model confidence,
  - stakeholder type,
  - stakeholder-importance assumptions,
  - false positives,
  - false negatives,
  - high-uncertainty rows.

Done when:

- The model is evaluated on enough diverse audits that the result is harder to dismiss as lucky.
- The audit distribution is documented.

Proof:

```bash
bun run labels:queue
bun run review:phase1:human -- --mode=priority --limit=50
bun run records:build
bun run records:validate
bun run labels:build
bun run eval:phase1
```

### Phase G: Separate Reality, Violence, Importance, And Priority

Goal:

```text
Avoid mixing four different meanings of "important."
```

Current problem:

The product can accidentally combine:

- Event reality: did the event likely happen?
- UCDP organized lethal-violence match.
- Stakeholder importance: does this matter to the country, person, agency, or decision-maker?
- Review priority: should an analyst inspect this now?

Those are related, but not identical. In first-principles terms, reality is a
fact question, violence type is a classification question, stakeholder
importance is a judgment question, and review priority is a workflow question.

Remaining:

- Keep the current triage score as the product ranking.
- Add clearer language:

```text
eventReality = did the source-backed event likely happen?
modelProbability = organized-violence match likelihood
stakeholderImportance = AI assumption about why this matters to the selected stakeholder
surfaceScore = product triage priority
humanDecision = audit decision: assign, watch, dismiss, or correct the assumption
```

- Later, consider separate model heads:
  - `event_reality`
  - `organized_violence_match`
  - `stakeholder_importance`
  - `analyst_review_priority`

Done when:

- UI and docs never imply one score means everything.
- Interview story can explain why the targets differ in plain terms.

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
- Later, move feedback, audit labels, and review state out of JSONL/local browser storage.
- Add auth only when there are real users.

Done when:

- The product can preserve reviewer decisions across sessions and machines.
- There is a simple admin/export path for audit labels.

Proof:

```text
Reviewer can audit events, refresh the app, and keep the decisions.
```

## What To Cut From The Solo MVP

Cut or hide these until the core workflow is excellent:

- Full intelligence dashboard feel.
- Big hero copy.
- Long generated analysis blocks.
- Too many tabs.
- Too many metrics in the main screen.
- Map.
- Reviewer Copilot.
- Uncertain and Coverage queue modes.
- Region filters.
- False-positive / false-negative / good-call buttons in the main event view.
- Multi-domain geopolitical forecasting.
- Finance/market impact sections unless direct evidence exists.
- Any feature that does not help answer: "Does this row matter to this stakeholder,
  and should I inspect it now?"

## Resume-Ready Definition

The project is resume-ready when this is true:

```text
I can open the app, show the queue, inspect one event, explain the model target,
show the stakeholder-importance assumption, show source-checked audit labels,
show the eval report, and explain what evidence would make me trust or reject
the model.
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
I built HopeIndexAI as an AI triage system for noisy public conflict signals.
The hard part was not calling an AI model. The hard part was creating a workflow
where the AI makes an explicit assumption about why an event matters to a
selected stakeholder, exposes its evidence and uncertainty, and lets humans
audit the most important or uncertain calls.
```

Then say the honest limitation:

```text
The current evaluation is promising on source-checked Phase 1 audit labels, but
future-holdout AUC is not yet computable because the current holdout has zero
verified positives. So I treat it as an inspectable importance-ranking assistant,
not a verified forecasting system.
```

That answer is stronger than overclaiming.
