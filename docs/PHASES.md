# HopeIndexAI Phased Roadmap

This roadmap turns HopeIndexAI from a small event map into a continuously learning intelligence system.

The core idea is simple: do not scale to huge data first. First build a clean machine that can understand events, actors, sources, predictions, and feedback. Then scale the amount of data.

## North Star

HopeIndexAI should answer:

- What happened?
- Who are the important actors?
- What incentives and constraints do those actors have?
- What might happen next?
- What evidence supports that view?
- Was the prediction useful after the fact?

Target architecture:

```text
raw events
-> cleaned events
-> deduped clusters
-> resolved actors
-> source credibility
-> historical actor context
-> risk prediction
-> analyst/user feedback
-> improved model
```

## Phase 0: Current State

Goal: Understand what exists today.

Current assets:

- React + Leaflet event map.
- `/api/events` serving static enriched GDELT-style events.
- `public/data/events.json` with 1,500 events.
- `public/data/escalation-model.json` with a logistic regression escalation model.
- `data/profiles.jsonl` with 90 historical/public actor profiles.
- `data/sources.jsonl`, `data/claims.jsonl`, and queue/progress files for research tracking.

Current limits:

- 1,500 events is too small for serious ML.
- Static JSON is fine for demo, not for historical scale.
- Historical profiles are not yet connected to event analysis.
- Source metadata needs stronger validation.
- Entity names are messy, for example `ISRAEL`, `ISRAELI`, `GOVERNMENT`, and `THE US`.
- Current labels are weak labels from future GDELT rows, not human-confirmed ground truth.

Done means:

- Existing files are validated.
- The team understands what is demo-grade versus production-grade.

## Phase 1: Ontology Foundation

Goal: Define the real-world objects the system understands.

In simple terms, an ontology is the map of the real world inside the app. Instead of only storing rows, the system knows about actors, events, sources, locations, claims, predictions, and feedback.

Core object types:

```text
Actor
Event
EventCluster
Location
Source
Claim
Prediction
AnalystAssessment
ActorProfile
Watchlist
```

Key links:

```text
Actor -> participates in -> Event
Event -> belongs to -> EventCluster
Event -> occurs at -> Location
Event -> reported by -> Source
Prediction -> explains -> Event or EventCluster
AnalystAssessment -> evaluates -> Prediction
ActorProfile -> describes -> Actor
Claim -> supported by -> Source
```

Deliverables:

- Add ontology schema files.
- Define IDs and relationships.
- Decide required fields for each object type.
- Document how event rows map into ontology objects.

Phase 1 implementation:

- Schemas live in `schemas/ontology/v1/`.
- Developer guide lives in `docs/ontology/README.md`.
- Current GDELT row mapping lives in `docs/ontology/gdelt-event-mapping.md`.
- Validation command: `bun run ontology:validate`.

Done means:

- A new developer can look at the schema and understand the world model.
- Every event can be mapped to actors, location, source, and cluster.

## Phase 2: Data Storage Upgrade

Goal: Stop treating browser JSON as the main data store.

Recommended local structure:

```text
data/raw/          original downloaded archives and source records
data/processed/    cleaned and normalized events
data/features/     ML-ready feature tables
data/models/       trained model artifacts
data/feedback/     user and analyst corrections
public/data/       small browser-ready slices only
```

Recommended storage:

- Keep JSON for small browser files.
- Use JSONL for append-only logs.
- Use DuckDB or Parquet for large historical event data.

Why this matters:

- The browser should load only what it needs.
- Training needs more history than the UI needs.
- Raw data must be preserved so mistakes can be fixed later.

Deliverables:

- Create folder structure.
- Define file naming conventions.
- Add scripts that separate raw, processed, features, models, and public slices.

Done means:

- `public/data/events.json` is no longer the source of truth.
- The app can still load a small fast slice.
- ML scripts can train from processed historical data.

## Phase 3: Event Ingestion Pipeline

Goal: Move from 1,500 static events to repeatable event collection.

Pipeline:

```text
fetch GDELT archives
-> parse rows
-> normalize fields
-> filter invalid records
-> dedupe repeated articles/events
-> classify theme
-> score severity
-> save processed events
-> export small public slice
```

Scale milestones:

```text
10k events      pipeline sanity check
100k events     useful product testing
1M events       real model training begins
10M events      serious backtesting
100M+ events    warehouse-scale architecture
```

Do not target billions until the model proves value at smaller scale.

Deliverables:

- Ingestion script can fetch a date range.
- Deduplication logic exists.
- Processed output is stable and documented.
- Public export keeps only the needed fields.

Done means:

- Re-running ingestion produces the same kind of output.
- The app can load a recent slice while ML can access a larger history.

## Phase 4: Entity Resolution

Goal: Teach the system that messy names can refer to the same real actor.

Examples:

```text
ISRAEL
ISRAELI
Israeli government
IDF
Netanyahu administration
```

These should be linked with confidence, not treated as totally separate actors.

Deliverables:

- Create actor alias tables.
- Add country and organization mappings.
- Add confidence scores for actor matching.
- Connect matched actors to `ActorProfile` records when possible.

Done means:

- Event actors resolve to stable actor IDs.
- The model can count actor history correctly.
- The UI can show cleaner actor names.

## Phase 5: Source Quality And Claims

Goal: Make confidence follow evidence.

Current issue:

- Many source rows are structurally valid but not evidence-strong enough.
- Some book entries point to Wikipedia URLs.
- Some source URLs are empty.

Source quality ladder:

```text
official / primary source       strongest
academic source or serious book strong
major news archive              medium to strong
Wikipedia                       useful pointer, not final evidence
unknown blog                    weak
```

Every important claim should have:

```text
claim
source IDs
evidence summary
confidence
what would change the confidence
```

Deliverables:

- Add a source validator.
- Flag empty URLs and placeholder URLs.
- Add claim-to-source references.
- Mark weak claims as `needs_review`.

Done means:

- Confidence labels are evidence-driven.
- Weak or unsourced claims are visible instead of hidden.

## Phase 6: Connect Actor Profiles To Events

Goal: Use historical actor context inside event analysis.

Example:

```text
Event: Israeli military action in Gaza
Matched actor: Israel
Actor profile context:
  - security incentives
  - domestic pressure
  - deterrence logic
  - historical escalation patterns
Prediction:
  - 72h escalation risk
  - reasons and uncertainty
```

Why this matters:

- Events alone say what happened.
- Actor profiles help explain why it may have happened and what the actor may do next.

Deliverables:

- Match event actors to profile IDs.
- Add actor priors to `/api/probe` or `/api/analyze`.
- Show evidence and confidence in the UI.

Done means:

- Briefings include actor incentives, constraints, and likely moves.
- The app separates fact from interpretation.

## Phase 7: Feedback Loop And Continuous Learning

Goal: Let the system learn from corrections.

Feedback actions:

```text
Useful
Not useful
Wrong actor
Wrong severity
False alarm
Missed escalation
Needs source check
```

Storage:

```text
data/feedback/assessments.jsonl
```

Learning loop:

```text
new events
-> predictions
-> user/analyst feedback
-> evaluation dataset
-> retrain candidate model
-> compare against current model
-> deploy only if better
```

Important rule:

Do not let the model update itself blindly. Continuous learning needs review gates, otherwise the system can learn bad habits from noisy feedback.

Deliverables:

- Add feedback API route.
- Add feedback buttons in the event detail panel.
- Store feedback as append-only JSONL.
- Build an evaluation script that reads feedback.

Done means:

- Every prediction can be judged after the fact.
- The model has a path to improve from real usage.

## Phase 8: Model Improvement

Goal: Improve prediction quality while keeping the model explainable.

Model sequence:

```text
v1 logistic regression baseline
v2 gradient boosting / tree model
v3 temporal sequence features
v4 graph features from actor-event networks
v5 LLM-assisted explanation, not raw prediction
```

Metrics to track:

```text
precision
recall
false alarms
missed escalations
AUC
calibration
performance by region
performance by event type
```

Plain meaning:

- Precision: when the system warns, how often is it right?
- Recall: of real escalations, how many did it catch?
- Calibration: when it says 70 percent risk, does that happen about 70 percent of the time?

Deliverables:

- Add evaluation reports.
- Compare old model versus new model before replacing.
- Track metrics by region and event type.

Done means:

- A model update must prove it is better before deployment.
- The team can see where the model performs poorly.

## Phase 9: Analyst Workflow

Goal: Make the product operational, not just informational.

Workflow:

```text
see global map
-> open risky cluster
-> read source-backed brief
-> inspect actor incentives
-> compare similar historical cases
-> mark assessment
-> add to watchlist
-> track over 72 hours
```

Deliverables:

- Event cluster view.
- Watchlist.
- Assessment history.
- Source evidence panel.
- Historical comparison panel.

Done means:

- A user can make and track a real intelligence judgment inside the app.

## Phase 10: Scale And Production Readiness

Goal: Scale only after the data and learning loop work.

Scale path:

```text
1,500 events     demo
100k events      better product testing
1M events        real model training
10M events       serious backtesting
100M+ events     dedicated warehouse
billions         only after proven value
```

Production concerns:

- Data versioning.
- Backfills.
- Model registry.
- Access control.
- Audit logs.
- Monitoring.
- Cost controls.
- Reproducible training.

Done means:

- Larger data volume improves the model instead of adding noise.
- The app can explain where every prediction came from.

## Immediate Next Steps

Recommended implementation order:

```text
1. Add ontology schema files.
2. Add source validator.
3. Add event storage structure.
4. Add actor alias/entity resolution layer.
5. Connect profiles to event analysis.
6. Add feedback capture.
7. Retrain model with richer features.
```

## Decision Rule

When choosing what to build next, use this rule:

```text
If it improves evidence, entity clarity, feedback, or evaluation, do it early.
If it only adds more data volume, do it after the pipeline is trustworthy.
```

Bayesian summary:

```text
Prior: more data will improve the model.
Evidence: noisy data, weak labels, and messy entities can hurt the model.
Updated belief: better structured and better labeled data should come before massive scale.
```

Game-theory summary:

```text
The product should not only ask what happened.
It should ask what each actor wants, what limits them, what move they may make next, and what evidence would prove us wrong.
```
