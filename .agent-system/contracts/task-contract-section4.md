# Task Contract — Section 4: Production Monitoring and Alerting

## Outcome
Add lightweight production monitoring so the team can detect model/pipeline degradation and a `/api/health` endpoint for quick status checks.

## Scope
1. Create `scripts/monitor_pipeline.ts` that performs one-shot (or hourly looping) checks and writes alerts to `data/alerts.jsonl`:
   - `GET /api/ai-status` returns `ready: true` within 5 seconds.
   - `GET /api/events?days=7` returns events and >95% have `surfaceScore`.
   - Mean `surfaceModelProbability` has not shifted >10% from a stored baseline.
   - A sample of source URLs are reachable (HTTP 200 or redirect).
   - Recent UCDP imports have completed (candidate + GED profile files exist and are recent).
2. Add `GET /api/health` in `api/index.ts` that returns a JSON health summary and the timestamp of the last successful pipeline run.
3. Add a `monitor` script to `package.json`.

## Non-goals
- No pager/SMS integration.
- No long-term time-series database.
- No UI changes.

## Constraints
- Keep checks fast (< 30s total).
- Use only built-in fetch/Bun APIs; no new dependencies.
- Must pass `bun run test:all` and `bun run pipeline:validate`.

## Risk classification
**Medium** — touches the running API and adds alerting behavior.

## Acceptance evidence
- `bun run monitor` exits 0 when healthy and writes a normal status record to `data/alerts.jsonl`.
- `bun run monitor` exits non-zero and writes alert records when checks fail (can be demonstrated by pointing at a bad URL).
- `GET /api/health` returns JSON with `status`, `checks`, and `lastSuccessfulRun`.
- `bun run test:all` passes.
