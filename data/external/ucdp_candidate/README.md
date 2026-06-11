# UCDP Candidate

UCDP Candidate is used as current row-level organized-violence evidence.

Source:

```text
https://ucdp.uu.se/downloads/
https://ucdp.uu.se/downloads/candidateged/GEDEvent_v26_01_26_03.csv
https://ucdp.uu.se/downloads/candidateged/GEDEvent_v26_0_4.csv
```

Generated commit-friendly files:

```text
candidate_profile.json
candidate_events_sample.jsonl
```

Generated local-only file:

```text
candidate_events_compact.jsonl
```

Regenerate:

```bash
bun run import:ucdp-candidate
bun run match:ucdp-candidate
bun run records:build
bun run records:validate
```

Current profile:

```text
Rows: 6,524
Date range: 2026-01-01 to 2026-05-13
Best deaths total: 79,746
Civilian deaths total: 15,464
```

Current Phase 2 match result:

```text
Records checked: 120
Records with UCDP Candidate matches: 0
Reason: the current training slice runs as late as 2026-05-31, while Candidate currently ends at 2026-05-13.
```

Guardrail:

UCDP Candidate can support current organized-violence outcome evidence. It cannot become final HopeIndexAI importance truth without source-checked human review.
