# UCDP GED 26.1

UCDP GED is used as historical organized-violence evidence.

Source:

```text
https://ucdp.uu.se/downloads/
https://ucdp.uu.se/downloads/ged/ged261-csv.zip
```

Local raw files:

```text
GEDEvent_v26_1.csv
ged261-csv.zip
```

These are ignored by git.

Generated commit-friendly files:

```text
ged_profile.json
ged_events_sample.jsonl
```

Generated local-only file:

```text
ged_events_compact.jsonl
```

Regenerate:

```bash
bun run import:ucdp
```

Current profile:

```text
Rows: 417,968
Date range: 1989-01-01 to 2025-12-31
Best deaths total: 4,257,891
Civilian deaths total: 1,570,458
```

Important guardrail:

UCDP evidence can support historical conflict context and outcome evidence. It cannot become final HopeIndexAI importance truth without source-checked human review.
