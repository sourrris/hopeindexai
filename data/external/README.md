# External Evidence

This folder is for external, source-attributed datasets used to check noisy HopeIndexAI event rows.

The rule is simple:

```text
External curated data can support evidence.
It cannot replace source-checked human HopeIndexAI labels.
```

Current dataset:

- `ucdp/` - UCDP GED 26.1 historical organized-violence events.
- `ucdp_candidate/` - UCDP Candidate 2026 monthly row-level organized-violence events.
- `aceld/` - local ACLED aggregate workbooks and generated compact aggregate artifacts.

Current match artifacts:

- `matches/phase2_ucdp_matches.jsonl` - one UCDP match-status row per Phase 2 training record.
- `matches/phase2_ucdp_match_report.json` - aggregate match report.
- `matches/phase2_ucdp_candidate_matches.jsonl` - one UCDP Candidate match-status row per Phase 2 training record.
- `matches/phase2_ucdp_candidate_match_report.json` - aggregate Candidate match report.

Large raw/derived files such as CSV, ZIP, and compact JSONL are ignored by git.
