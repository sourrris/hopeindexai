# HopeIndexAI Operations Runbook

## 1. Check system health

The fastest check is the API health endpoint:

```bash
curl http://localhost:3000/api/health
```

Expected response:

```json
{
  "status": "healthy",
  "timestamp": "...",
  "lastSuccessfulRun": { "timestamp": "...", "status": "ok" },
  "checks": [
    { "name": "ai_status", "passed": true, ... },
    { "name": "events", "passed": true, ... },
    { "name": "model", "passed": true, ... }
  ]
}
```

Status values:
- `healthy` — all critical checks passed.
- `degraded` — non-critical check failed (e.g., AI provider not configured).
- `unhealthy` — events or model could not load; investigate immediately.

Run the full monitoring check manually:

```bash
bun run monitor
```

Inspect recent alerts:

```bash
tail -n 20 data/alerts.jsonl
```

## 2. Rollback a model

If a newly promoted model behaves badly, restore the previous champion:

```bash
bun run ml:rollback
```

What it does:
- Copies `public/data/escalation-model-previous.json` over `public/data/escalation-model.json`.
- Logs the rollback to `data/models/promotion_log.jsonl`.

After rollback, restart the server or wait for the model cache TTL (5 minutes) to expire. Verify:

```bash
curl http://localhost:3000/api/probe?id=<event-id>&source=static | jq '.probe.prediction.modelVersion'
```

## 3. Investigate an alert

Common alerts and how to triage them:

### `/api/ai-status` not ready
- Check that LM Studio is running on `http://localhost:1234` OR that `ANTHROPIC_API_KEY` is set.
- AI analysis is optional; the rest of the pipeline works without it.

### Events missing `surfaceScore`
- Run `bun run surface:phase1` to recalibrate scores.
- Check `public/data/events.json` exists and is valid JSON.

### `surfaceModelProbability` drift >10%
- Compare the current distribution in `data/monitoring/baseline.json`.
- If the drift follows a real news cycle, update the baseline after review.
- If the drift looks like a bug, re-run `bun run surface:phase1` and check source URL reachability.

### Source URLs unreachable
- Many publishers block automated HEAD requests; a few failures are normal.
- If >50% of the sample fails, check network connectivity or GDELT schema changes.

### UCDP imports older than 30 days
- Run `bun run import:ucdp-candidate` (and `bun run import:ucdp` if you have the GED CSV).
- Verify profile files: `data/external/ucdp_candidate/candidate_profile.json` and `data/external/ucdp/ged_profile.json`.

## 4. Add a new external data source

1. **Create an import script** under `scripts/import_<source>.ts` that:
   - Fetches or reads the raw data.
   - Normalizes events into a compact JSONL format with fields matching `lib/ucdp.ts` expectations.
   - Writes to `data/external/<source>/<source>_events_compact.jsonl` and a `_profile.json` summary.

2. **Add matching logic** in `lib/ucdp.ts` or a new `lib/match_<source>.ts` if the source needs custom matching.

3. **Wire it into label building** in `scripts/build_supervised_labels.ts` by loading the new compact file and merging it into the UCDP index.

4. **Document the source** in this runbook and in `docs/EXTERNAL_EVIDENCE.md`.

5. **Validate** with:

```bash
bun run labels:build
bun run train:supervised
bun run eval:phase1
```

## 5. Retrain from reviewer feedback

When reviewers click "False positive", "False negative", or "Good call", feedback is appended to `data/feedback/decisions.jsonl`. To merge it into the model:

```bash
bun run ml:retrain-feedback
bun run surface:phase1
bun run eval:phase1
```

This merges the latest feedback decision per event with UCDP labels, retrains the supervised model, and promotes it if it passes the quality gate.

## 6. Weekly operational checklist

- [ ] `bun run monitor` reports `ok`.
- [ ] `bun run test:all` passes.
- [ ] `bun run eval:future-holdout` ran and report is in `data/eval/future_holdout_report.json`.
- [ ] UCDP Candidate/GED imports are recent (<30 days).
- [ ] `data/models/promotion_log.jsonl` reviewed for unexpected promotions.
- [ ] `data/alerts.jsonl` reviewed for warnings that need follow-up.
