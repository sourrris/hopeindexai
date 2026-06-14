import { promises as fs } from "fs";
import { dirname } from "path";

const DEFAULT_BASE_URL = "http://localhost:3000";
const DEFAULT_ALERTS_PATH = "data/alerts.jsonl";
const DEFAULT_BASELINE_PATH = "data/monitoring/baseline.json";
const DEFAULT_LAST_RUN_PATH = "data/monitoring/last_run.json";
const DEFAULT_INTERVAL_SECONDS = 0; // 0 = one-shot

interface CheckResult {
  name: string;
  passed: boolean;
  severity: "info" | "warning" | "critical";
  message: string;
  detail?: Record<string, unknown>;
}

interface AlertRecord {
  timestamp: string;
  severity: "info" | "warning" | "critical";
  check: string;
  message: string;
  detail?: Record<string, unknown>;
}

function parseArgs(): {
  baseUrl: string;
  intervalSeconds: number;
  alertsPath: string;
  baselinePath: string;
  lastRunPath: string;
} {
  const args = process.argv.slice(2);
  let baseUrl = DEFAULT_BASE_URL;
  let intervalSeconds = DEFAULT_INTERVAL_SECONDS;
  let alertsPath = DEFAULT_ALERTS_PATH;
  let baselinePath = DEFAULT_BASELINE_PATH;
  let lastRunPath = DEFAULT_LAST_RUN_PATH;

  for (const arg of args) {
    if (arg.startsWith("--base-url=")) baseUrl = arg.slice("--base-url=".length);
    if (arg.startsWith("--interval=")) intervalSeconds = parseInt(arg.slice("--interval=".length), 10);
    if (arg.startsWith("--alerts=")) alertsPath = arg.slice("--alerts=".length);
    if (arg.startsWith("--baseline=")) baselinePath = arg.slice("--baseline=".length);
    if (arg.startsWith("--last-run=")) lastRunPath = arg.slice("--last-run=".length);
  }

  return { baseUrl, intervalSeconds, alertsPath, baselinePath, lastRunPath };
}

async function readJson<T>(path: string): Promise<T | null> {
  try {
    return JSON.parse(await fs.readFile(path, "utf8"));
  } catch {
    return null;
  }
}

async function writeJson(path: string, data: unknown): Promise<void> {
  await fs.mkdir(dirname(path) || ".", { recursive: true });
  await fs.writeFile(path, JSON.stringify(data, null, 2));
}

async function appendAlert(path: string, record: AlertRecord): Promise<void> {
  await fs.mkdir(dirname(path) || ".", { recursive: true });
  await fs.appendFile(path, JSON.stringify(record) + "\n");
}

async function fetchWithTimeout(url: string, timeoutMs: number, init?: RequestInit): Promise<Response> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: ctrl.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function checkAiStatus(baseUrl: string): Promise<CheckResult> {
  try {
    const res = await fetchWithTimeout(`${baseUrl}/api/ai-status`, 5_000);
    const data = await res.json();
    if (res.ok && data.ready === true) {
      return { name: "ai_status", passed: true, severity: "info", message: "AI status reports ready." };
    }
    return { name: "ai_status", passed: false, severity: "warning", message: "AI status reports not ready.", detail: data };
  } catch (err: any) {
    return { name: "ai_status", passed: false, severity: "critical", message: `Failed to reach /api/ai-status: ${err.message}` };
  }
}

async function checkEvents(baseUrl: string): Promise<CheckResult> {
  try {
    const res = await fetchWithTimeout(`${baseUrl}/api/events?days=7`, 10_000);
    if (!res.ok) {
      return { name: "events", passed: false, severity: "critical", message: `/api/events returned HTTP ${res.status}.` };
    }
    const data = await res.json();
    const events = data.events ?? [];
    if (!Array.isArray(events) || events.length === 0) {
      return { name: "events", passed: false, severity: "critical", message: "No events returned." };
    }
    const scored = events.filter((e: any) => Number.isFinite(e.surfaceScore)).length;
    const ratio = scored / events.length;
    if (ratio < 0.95) {
      return { name: "events", passed: false, severity: "critical", message: `Only ${(ratio * 100).toFixed(1)}% of events have surfaceScore (need >95%).`, detail: { total: events.length, scored } };
    }
    return { name: "events", passed: true, severity: "info", message: `${events.length} events returned, ${(ratio * 100).toFixed(1)}% scored.`, detail: { total: events.length, scored } };
  } catch (err: any) {
    return { name: "events", passed: false, severity: "critical", message: `Failed to reach /api/events: ${err.message}` };
  }
}

async function checkProbabilityDrift(baseUrl: string, baselinePath: string): Promise<CheckResult> {
  try {
    const res = await fetchWithTimeout(`${baseUrl}/api/events?days=7`, 10_000);
    const data = await res.json();
    const events = (data.events ?? []) as any[];
    const probs = events
      .map((e) => Number(e.surfaceModelProbability))
      .filter((p) => Number.isFinite(p));
    if (probs.length === 0) {
      return { name: "probability_drift", passed: false, severity: "warning", message: "No surfaceModelProbability values available for drift check." };
    }
    const currentMean = probs.reduce((a, b) => a + b, 0) / probs.length;

    const baseline = await readJson<{ mean: number; generatedAt: string }>(baselinePath);
    if (!baseline || typeof baseline.mean !== "number") {
      await writeJson(baselinePath, { mean: currentMean, generatedAt: new Date().toISOString() });
      return { name: "probability_drift", passed: true, severity: "info", message: `Initialized probability baseline at ${currentMean.toFixed(4)}.`, detail: { currentMean } };
    }

    const shift = baseline.mean === 0 ? (currentMean === 0 ? 0 : 1) : Math.abs(currentMean - baseline.mean) / baseline.mean;
    if (shift > 0.10) {
      return {
        name: "probability_drift",
        passed: false,
        severity: "warning",
        message: `surfaceModelProbability mean shifted ${(shift * 100).toFixed(1)}% (baseline ${baseline.mean.toFixed(4)}, current ${currentMean.toFixed(4)}).`,
        detail: { baselineMean: baseline.mean, currentMean, shift },
      };
    }
    return {
      name: "probability_drift",
      passed: true,
      severity: "info",
      message: `surfaceModelProbability mean stable (${(shift * 100).toFixed(1)}% shift).`,
      detail: { baselineMean: baseline.mean, currentMean, shift },
    };
  } catch (err: any) {
    return { name: "probability_drift", passed: false, severity: "warning", message: `Drift check failed: ${err.message}` };
  }
}

async function checkSourceUrls(baseUrl: string): Promise<CheckResult> {
  try {
    const res = await fetchWithTimeout(`${baseUrl}/api/events?days=7`, 10_000);
    const data = await res.json();
    const events = (data.events ?? []) as any[];
    const withUrls = events.filter((e) => typeof e.sourceUrl === "string" && e.sourceUrl.startsWith("http"));
    const sample = withUrls.slice(0, 10);
    if (sample.length === 0) {
      return { name: "source_urls", passed: false, severity: "warning", message: "No source URLs to sample." };
    }

    let reachable = 0;
    const results: { url: string; status: number | string }[] = [];
    for (const e of sample) {
      try {
        const headRes = await fetchWithTimeout(e.sourceUrl, 5_000, { method: "HEAD", redirect: "follow" });
        reachable++;
        results.push({ url: e.sourceUrl, status: headRes.status });
      } catch (err: any) {
        results.push({ url: e.sourceUrl, status: err.name === "AbortError" ? "timeout" : "error" });
      }
    }
    const ratio = reachable / sample.length;
    if (ratio < 0.5) {
      return { name: "source_urls", passed: false, severity: "warning", message: `Only ${(ratio * 100).toFixed(0)}% of sampled source URLs reachable.`, detail: { sample: results } };
    }
    return { name: "source_urls", passed: true, severity: "info", message: `${(ratio * 100).toFixed(0)}% of sampled source URLs reachable.`, detail: { sample: results } };
  } catch (err: any) {
    return { name: "source_urls", passed: false, severity: "warning", message: `Source URL check failed: ${err.message}` };
  }
}

function daysSince(iso: string): number {
  const then = Date.parse(iso);
  if (!Number.isFinite(then)) return Number.POSITIVE_INFINITY;
  return (Date.now() - then) / (86_400_000);
}

async function checkUcdpImports(): Promise<CheckResult> {
  const profiles = [
    { path: "data/external/ucdp_candidate/candidate_profile.json", name: "UCDP Candidate" },
    { path: "data/external/ucdp/ged_profile.json", name: "UCDP GED" },
  ];
  const results: { name: string; ageDays: number; ok: boolean }[] = [];
  let allOk = true;
  for (const p of profiles) {
    const profile = await readJson<{ generatedAt?: string }>(p.path);
    const age = profile?.generatedAt ? daysSince(profile.generatedAt) : Number.POSITIVE_INFINITY;
    const ok = profile?.generatedAt !== undefined && age <= 30;
    results.push({ name: p.name, ageDays: age, ok });
    if (!ok) allOk = false;
  }
  if (allOk) {
    return { name: "ucdp_imports", passed: true, severity: "info", message: "UCDP imports are present and recent (<30 days).", detail: { profiles: results } };
  }
  return { name: "ucdp_imports", passed: false, severity: "warning", message: "One or more UCDP imports are missing or older than 30 days.", detail: { profiles: results } };
}

async function runChecks(args: ReturnType<typeof parseArgs>): Promise<CheckResult[]> {
  const [aiStatus, events, drift, sourceUrls, ucdpImports] = await Promise.all([
    checkAiStatus(args.baseUrl),
    checkEvents(args.baseUrl),
    checkProbabilityDrift(args.baseUrl, args.baselinePath),
    checkSourceUrls(args.baseUrl),
    checkUcdpImports(),
  ]);
  return [aiStatus, events, drift, sourceUrls, ucdpImports];
}

async function runOnce(args: ReturnType<typeof parseArgs>): Promise<boolean> {
  const timestamp = new Date().toISOString();
  const checks = await runChecks(args);
  const criticalFailures = checks.filter((c) => !c.passed && c.severity === "critical");
  const warnings = checks.filter((c) => !c.passed && c.severity === "warning");
  const overall = criticalFailures.length > 0 ? "critical" : warnings.length > 0 ? "warning" : "ok";

  for (const check of checks) {
    if (!check.passed) {
      await appendAlert(args.alertsPath, {
        timestamp,
        severity: check.severity,
        check: check.name,
        message: check.message,
        detail: check.detail,
      });
    }
  }

  await appendAlert(args.alertsPath, {
    timestamp,
    severity: overall === "ok" ? "info" : overall === "warning" ? "warning" : "critical",
    check: "monitor_run",
    message: `Monitor run completed with status ${overall}.`,
    detail: {
      totalChecks: checks.length,
      passed: checks.filter((c) => c.passed).length,
      failed: checks.filter((c) => !c.passed).length,
      checks: checks.map((c) => ({ name: c.name, passed: c.passed, severity: c.severity, message: c.message })),
    },
  });

  await writeJson(args.lastRunPath, {
    timestamp,
    status: overall,
    checks: checks.map((c) => ({ name: c.name, passed: c.passed, severity: c.severity, message: c.message })),
  });

  console.log(`[monitor] ${timestamp} status=${overall}`);
  for (const c of checks) {
    const icon = c.passed ? "✓" : "✗";
    console.log(`  ${icon} ${c.name}: ${c.message}`);
  }

  return criticalFailures.length === 0;
}

async function main() {
  const args = parseArgs();

  if (args.intervalSeconds > 0) {
    console.log(`[monitor] Running every ${args.intervalSeconds}s. Press Ctrl+C to stop.`);
    for (;;) {
      await runOnce(args);
      await new Promise((resolve) => setTimeout(resolve, args.intervalSeconds * 1000));
    }
  } else {
    const ok = await runOnce(args);
    if (!ok) process.exit(1);
  }
}

main().catch((err) => {
  console.error("Monitor failed:", err);
  process.exit(1);
});
