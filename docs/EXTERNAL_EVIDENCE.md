# External Evidence Layer

HopeIndexAI should use external datasets as evidence, not as magic truth.

In simple ML terms:

```text
GDELT-style rows = noisy sensors
UCDP/ACLED/ICBe = curated reference books
human source-checks = answer key for our product labels
model = student
```

The Palantir-style product goal is an ontology-backed evidence workflow:

```text
messy public row
-> normalized event object
-> source and provenance
-> actor/location/time matching
-> external evidence candidates
-> human review for final product truth
-> model training and evaluation
```

## Current UCDP Import

Downloaded source:

```text
data/external/ucdp/GEDEvent_v26_1.csv
data/external/ucdp/ged261-csv.zip
```

Generated artifacts:

```text
data/external/ucdp/ged_events_compact.jsonl
data/external/ucdp/ged_profile.json
data/external/ucdp/ged_events_sample.jsonl
data/external/matches/phase2_ucdp_matches.jsonl
data/external/matches/phase2_ucdp_match_report.json
```

The raw CSV/ZIP and compact JSONL are large local artifacts and are ignored by git.

Build them with:

```bash
bun run import:ucdp
bun run records:build
bun run match:external
bun run records:build
bun run records:validate
```

Why the double `records:build`?

The matcher reads training records, writes UCDP match rows, then the second build attaches those match rows back into each training record.

## UCDP Profile

UCDP GED 26.1 currently profiles as:

```text
Rows: 417,968
Date range: 1989-01-01 to 2025-12-31
2025 events: 25,770
Best deaths total: 4,257,891
Civilian deaths total: 1,570,458
```

This is good historical organized-violence evidence.

It is not enough for live May 2026 labels because GED 26.1 ends on 2025-12-31.

## UCDP Candidate Profile

UCDP Candidate is the open row-level substitute for part of what we wanted from ACLED event data. It is not identical to ACLED: it focuses on organized lethal violence, not every protest, strategic development, or political disorder event.

Build it with:

```bash
bun run import:ucdp-candidate
bun run match:ucdp-candidate
bun run records:build
bun run records:validate
```

Generated artifacts:

```text
data/external/ucdp_candidate/candidate_events_compact.jsonl
data/external/ucdp_candidate/candidate_profile.json
data/external/ucdp_candidate/candidate_events_sample.jsonl
data/external/matches/phase2_ucdp_candidate_matches.jsonl
data/external/matches/phase2_ucdp_candidate_match_report.json
```

Current UCDP Candidate profile:

```text
Rows: 6,524
Versions: 26.01.26.03 and 26.0.4
Date range: 2026-01-01 to 2026-05-13
Best deaths total: 79,746
Civilian deaths total: 15,464
```

Current Phase 2 match result:

```text
Records checked: 120
Records with UCDP Candidate matches: 0
Status: 120 no_temporal_overlap
Training record date range: 2025-05-29 to 2026-05-31
UCDP Candidate date range: 2026-01-01 to 2026-05-13
```

Bayesian interpretation:

```text
Prior: UCDP Candidate might close the 2026 row-level evidence gap.
Evidence: it gives clean 2026 rows, but currently ends before the late-May demo slice.
Update: use it as an open curated feed, but do not expect it to validate every live GDELT row until the next monthly release or until the training slice is aligned to its coverage.
```

## Matching Rule

The matcher is conservative. It compares:

- date window
- country mapping
- location distance
- actor-token overlap
- event-type compatibility

A UCDP match becomes:

```json
{
  "externalEvidence": {
    "ucdpGed": {
      "evidenceTier": "external_curated",
      "canUseAsOutcomeEvidence": true,
      "canUseAsImportanceTruth": false
    }
  }
}
```

The guardrail matters: UCDP can say an organized-violence event happened, but it does not decide whether our product should mark the noisy public row as important. That importance label still needs human source-checking.

## Current Match Result

For the current 120 Phase 2 training records:

```text
UCDP candidate evidence records: 0
118 records: no temporal overlap
2 records: temporal overlap but no conservative UCDP candidate
```

Bayesian interpretation:

```text
The absence of a UCDP match is evidence about coverage, not proof the public row is false.
```

Game-theory interpretation:

```text
UCDP helps identify real violence patterns and actor dyads.
It does not by itself explain incentives, bargaining leverage, or likely next moves.
```

## Next Dataset Choice

Use UCDP GED for historical conflict training and outcome windows.

Use UCDP Candidate for open current row-level organized-violence evidence.

Use the 2010+ country-month risk-window builder for the first real ML backbone:

```bash
bun run risk:windows
```

Current result:

```text
Rows: 21,276
Countries: 108
ACLED aggregate country matches: 98
Range: 2010-01 to 2026-05
Positive rows: 7,394
Validation AP expanded baseline: 0.9598
Test AP expanded baseline: 0.9774
Validation AP logistic model: 0.9464
Test AP logistic model: 0.9722
```

This tells us the first model should not chase exact event prediction. It should try to beat a strong history/recency baseline on country-month risk ranking. The current logistic model does not beat that baseline on validation/test, so it should remain experimental.

Use ACLED aggregates for weekly trend features when row-level ACLED access is unavailable. If row-level ACLED access becomes available later, it is still the better near-live feed for political violence, demonstrations, strategic developments, and actor-location labels.

The repo now includes an ACLED importer:

```bash
ACLED_EMAIL=you@example.com \
ACLED_PASSWORD=... \
bun run import:acled
```

Important design choice:

```text
Do not download the whole world by default.
Pull only the country/date windows implied by training records.
```

Why?

```text
Training-grade evidence should be relevant, attributable, and cheap to re-run.
```

The importer reads `data/training/phase2_records.jsonl`, derives the countries and date windows that matter, requests only those ACLED slices, and recursively splits windows if any one query is too large.

If the local aggregate workbooks are already downloaded under `data/external/aceld`, use:

```bash
bun run import:aceld
```

This generates aggregate evidence artifacts from the downloaded workbooks without needing ACLED API credentials. These aggregate rows are useful for country/admin/week trend features, but they are not row-level event evidence.

Use ICBe later for crisis sequences and game-theory actor behavior.

Sources:

- UCDP downloads: https://ucdp.uu.se/downloads/
- ACLED codebook: https://acleddata.com/methodology/acled-codebook
- ACLED export: https://acleddata.com/conflict-data/data-export-tool
- ICBe: https://www.crisisevents.org/
