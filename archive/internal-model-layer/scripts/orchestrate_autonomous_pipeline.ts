import { promises as fs } from "fs";
import { dirname } from "path";

// Autonomous ML improvement pipeline with promotion gate and rollback support.
// Uses only open, no-key data sources: GDELT v2, UCDP GED, UCDP Candidate.
// Does NOT require human labeling or paid APIs.

const CHAMPION_MODEL_PATH = "public/data/escalation-model.json";
const PREVIOUS_MODEL_PATH = "public/data/escalation-model-previous.json";
const CHALLENGER_MODEL_PATH = "data/models/escalation-model-supervised-latest.json";
const HOLDOUT_EVENTS_PATH = "data/holdout/events_7d.json";
const PROMOTION_LOG_PATH = "data/models/promotion_log.jsonl";
const HOLDOUT_REPORT_DIR = "data/holdout";

interface ModelArtifact {
  version?: string;
  trainedAt?: string;
  metrics?: {
    test?: { auc?: number; f1?: number };
  };
}

interface HoldoutMetrics {
  auc?: number | null;
  f1?: number;
  precision?: number;
  recall?: number;
  fpr?: number;
  samples?: number;
  positives?: number;
  negatives?: number;
}

interface PromotionRecord {
  timestamp: string;
  action: "promote" | "rollback" | "dry_run" | "no_promotion";
  championPath: string;
  challengerPath?: string;
  previousPath?: string;
  reason?: string;
  challengerMetrics?: { source: string; holdout?: HoldoutMetrics; test?: ModelArtifact["metrics"]["test"] };
  championMetrics?: { source: string; holdout?: HoldoutMetrics; test?: ModelArtifact["metrics"]["test"] };
}

async function readJson(path: string): Promise<any> {
  return JSON.parse(await fs.readFile(path, "utf8"));
}

async function writeJson(path: string, data: unknown): Promise<void> {
  await fs.mkdir(dirname(path) || ".", { recursive: true });
  await fs.writeFile(path, JSON.stringify(data, null, 2));
}

async function appendLog(record: PromotionRecord): Promise<void> {
  await fs.mkdir(dirname(PROMOTION_LOG_PATH) || ".", { recursive: true });
  await fs.appendFile(PROMOTION_LOG_PATH, JSON.stringify(record) + "\n");
}

async function fileExists(path: string): Promise<boolean> {
  try {
    await fs.access(path);
    return true;
  } catch {
    return false;
  }
}

async function runCommand(label: string, command: string[]): Promise<{ ok: boolean; output: string }> {
  console.log(`\n[orchestrator] ${label}: ${command.join(" ")}`);
  const proc = Bun.spawn(command, { stdout: "pipe", stderr: "pipe" });
  const text = await new Response(proc.stdout).text();
  const err = await new Response(proc.stderr).text();
  const exitCode = await proc.exited;
  const combined = text + (err ? `\n${err}` : "");
  console.log(combined.slice(-800));
  return { ok: exitCode === 0, output: combined };
}

async function evaluateOnHoldout(modelPath: string, reportPath: string): Promise<HoldoutMetrics | null> {
  if (!(await fileExists(HOLDOUT_EVENTS_PATH))) return null;
  await fs.mkdir(dirname(reportPath) || ".", { recursive: true });
  const ok = await runCommand("Evaluate on future holdout", [
    "bun", "scripts/validate_future_holdout.ts",
    `--events=${HOLDOUT_EVENTS_PATH}`,
    `--model=${modelPath}`,
    `--report=${reportPath}`,
    "--max-events=2000",
  ]);
  if (!ok.ok) {
    console.warn("[orchestrator] Holdout evaluation failed; will fall back to test metrics.");
    return null;
  }
  const report = await readJson(reportPath);
  return {
    auc: report?.metrics?.auc ?? null,
    f1: report?.metrics?.f1 ?? 0,
    precision: report?.metrics?.precision ?? 0,
    recall: report?.metrics?.recall ?? 0,
    fpr: report?.metrics?.fpr ?? 0,
    samples: report?.metrics?.samples ?? 0,
    positives: report?.labelCounts?.positives ?? 0,
    negatives: report?.labelCounts?.negatives ?? 0,
  };
}

function testMetrics(model: ModelArtifact | null): { auc: number; f1: number } {
  return {
    auc: model?.metrics?.test?.auc ?? 0,
    f1: model?.metrics?.test?.f1 ?? 0,
  };
}

function shouldPromote(
  challenger: ModelArtifact,
  champion: ModelArtifact | null,
  challengerHoldout: HoldoutMetrics | null,
  championHoldout: HoldoutMetrics | null
): { promote: boolean; reason: string; details: Record<string, unknown> } {
  const champTest = testMetrics(champion);
  const challTest = testMetrics(challenger);

  // Prefer holdout metrics when both models have them on the same holdout set.
  if (challengerHoldout && championHoldout && typeof challengerHoldout.auc === "number" && typeof championHoldout.auc === "number") {
    const aucDelta = challengerHoldout.auc - championHoldout.auc;
    const f1Delta = challengerHoldout.f1 - championHoldout.f1;
    const promote = aucDelta >= 0.02 && f1Delta >= 0.02;
    return {
      promote,
      reason: promote
        ? `Holdout AUC improved by ${aucDelta.toFixed(3)} and F1 by ${f1Delta.toFixed(3)}.`
        : `Holdout AUC delta ${aucDelta.toFixed(3)} / F1 delta ${f1Delta.toFixed(3)} did not meet +0.02/+0.02 gate.`,
      details: { comparison: "holdout", challengerHoldout, championHoldout, aucDelta, f1Delta },
    };
  }

  // Fallback to internal test metrics if holdout is not available or has no positives.
  const aucDelta = challTest.auc - champTest.auc;
  const f1Delta = challTest.f1 - champTest.f1;
  const promote = aucDelta >= 0.02 && f1Delta >= 0.02;
  return {
    promote,
    reason: promote
      ? `Test AUC improved by ${aucDelta.toFixed(3)} and F1 by ${f1Delta.toFixed(3)}.`
      : `Test AUC delta ${aucDelta.toFixed(3)} / F1 delta ${f1Delta.toFixed(3)} did not meet +0.02/+0.02 gate.`,
    details: { comparison: "test", challengerTest: challTest, championTest: champTest, aucDelta, f1Delta },
  };
}

async function main() {
  const args = process.argv.slice(2);
  const fetchHistorical = args.includes("--fetch-historical");
  const startDate = args.find((a) => a.startsWith("--start="))?.slice("--start=".length);
  const days = parseInt(args.find((a) => a.startsWith("--days="))?.slice("--days=".length) ?? "30", 10);
  const promote = args.includes("--promote");
  const dryRun = args.includes("--dry-run");
  const skipHoldout = args.includes("--skip-holdout");

  const steps: { name: string; ok: boolean; detail?: string }[] = [];

  // 1. Import autonomous external sources
  const ucdp = await runCommand("Import UCDP GED", ["bun", "run", "import:ucdp"]);
  steps.push({ name: "import:ucdp", ok: ucdp.ok });

  const candidate = await runCommand("Import UCDP Candidate", ["bun", "run", "import:ucdp-candidate"]);
  steps.push({ name: "import:ucdp-candidate", ok: candidate.ok });

  // 2. Optional historical GDELT fetch
  if (fetchHistorical && startDate) {
    const hist = await runCommand("Fetch historical GDELT", [
      "bun", "run", "enrich:historical",
      `--start=${startDate}`,
      `--days=${days}`,
      "--output=data/training/historical_events.json",
    ]);
    steps.push({ name: "enrich:historical", ok: hist.ok, detail: `${startDate} +${days}d` });
  }

  // 3. Build supervised labels
  const labels = await runCommand("Build supervised labels", ["bun", "run", "labels:build"]);
  steps.push({ name: "labels:build", ok: labels.ok });

  // 4. Train supervised model (use historical data only when explicitly requested)
  const useHistorical = fetchHistorical;
  const trainCmd = useHistorical
    ? [
        "bun", "run", "train:supervised",
        "--events=data/training/historical_events_2025_12.json",
        "--labels=data/training/supervised_labels_2025_12.jsonl",
        "--output=data/models/escalation-model-supervised-latest.json",
        "--max-samples=5000",
      ]
    : ["bun", "run", "train:supervised"];
  const train = await runCommand("Train supervised model", trainCmd);
  steps.push({ name: "train:supervised", ok: train.ok });

  // 5. Validate quality gates and compare against champion.
  let challenger: ModelArtifact | null = null;
  let champion: ModelArtifact | null = null;
  let shouldPromoteFlag = false;
  let promotionReason = "";
  let comparisonDetails: Record<string, unknown> = {};
  let challengerHoldout: HoldoutMetrics | null = null;
  let championHoldout: HoldoutMetrics | null = null;

  if (await fileExists(CHALLENGER_MODEL_PATH)) {
    challenger = await readJson(CHALLENGER_MODEL_PATH);
    const testAuc = challenger.metrics?.test?.auc ?? 0;
    const testF1 = challenger.metrics?.test?.f1 ?? 0;
    const passesGate = testAuc >= 0.80 && testF1 >= 0.35;
    steps.push({ name: "quality_gate", ok: passesGate, detail: `AUC=${testAuc}, F1=${testF1}` });

    if (passesGate) {
      if (!skipHoldout) {
        challengerHoldout = await evaluateOnHoldout(CHALLENGER_MODEL_PATH, `${HOLDOUT_REPORT_DIR}/challenger_report.json`);
        if (await fileExists(CHAMPION_MODEL_PATH)) {
          championHoldout = await evaluateOnHoldout(CHAMPION_MODEL_PATH, `${HOLDOUT_REPORT_DIR}/champion_report.json`);
        }
      }

      champion = await fileExists(CHAMPION_MODEL_PATH) ? await readJson(CHAMPION_MODEL_PATH) : null;
      const decision = shouldPromote(challenger, champion, challengerHoldout, championHoldout);
      shouldPromoteFlag = decision.promote;
      promotionReason = decision.reason;
      comparisonDetails = decision.details;
      steps.push({ name: "promotion_gate", ok: shouldPromoteFlag, detail: promotionReason });
    }
  }

  // 6. Promote (or dry-run) if gate passes.
  if (promote && shouldPromoteFlag) {
    if (dryRun) {
      console.log(`\n[orchestrator] DRY RUN: would copy ${CHALLENGER_MODEL_PATH} to ${CHAMPION_MODEL_PATH}`);
      steps.push({ name: "promote", ok: true, detail: "dry run - no files changed" });
      await appendLog({
        timestamp: new Date().toISOString(),
        action: "dry_run",
        championPath: CHAMPION_MODEL_PATH,
        challengerPath: CHALLENGER_MODEL_PATH,
        previousPath: PREVIOUS_MODEL_PATH,
        reason: promotionReason,
        challengerMetrics: { source: "mixed", holdout: challengerHoldout ?? undefined, test: testMetrics(challenger) },
        championMetrics: { source: "mixed", holdout: championHoldout ?? undefined, test: testMetrics(champion) },
      });
    } else {
      if (await fileExists(CHAMPION_MODEL_PATH)) {
        await fs.copyFile(CHAMPION_MODEL_PATH, PREVIOUS_MODEL_PATH);
      }
      await fs.copyFile(CHALLENGER_MODEL_PATH, CHAMPION_MODEL_PATH);
      steps.push({ name: "promote", ok: true, detail: `copied ${CHALLENGER_MODEL_PATH} to ${CHAMPION_MODEL_PATH}; previous champion saved to ${PREVIOUS_MODEL_PATH}` });
      await appendLog({
        timestamp: new Date().toISOString(),
        action: "promote",
        championPath: CHAMPION_MODEL_PATH,
        challengerPath: CHALLENGER_MODEL_PATH,
        previousPath: PREVIOUS_MODEL_PATH,
        reason: promotionReason,
        challengerMetrics: { source: "mixed", holdout: challengerHoldout ?? undefined, test: testMetrics(challenger) },
        championMetrics: { source: "mixed", holdout: championHoldout ?? undefined, test: testMetrics(champion) },
      });
    }
  } else if (promote && !shouldPromoteFlag) {
    await appendLog({
      timestamp: new Date().toISOString(),
      action: "no_promotion",
      championPath: CHAMPION_MODEL_PATH,
      challengerPath: CHALLENGER_MODEL_PATH,
      reason: promotionReason,
      challengerMetrics: { source: "mixed", holdout: challengerHoldout ?? undefined, test: testMetrics(challenger) },
      championMetrics: { source: "mixed", holdout: championHoldout ?? undefined, test: testMetrics(champion) },
    });
    console.log(`\n[orchestrator] Promotion skipped: ${promotionReason}`);
  }

  // Summary
  console.log("\n=== Autonomous Pipeline Summary ===");
  const passed = steps.filter((s) => s.ok).length;
  const failed = steps.filter((s) => !s.ok).length;
  for (const s of steps) {
    const status = s.ok ? "PASS" : "FAIL";
    console.log(`[${status}] ${s.name}${s.detail ? ` (${s.detail})` : ""}`);
  }
  console.log(`\n${passed} passed, ${failed} failed`);
  if (comparisonDetails && Object.keys(comparisonDetails).length > 0) {
    console.log("Comparison details:", JSON.stringify(comparisonDetails, null, 2));
  }

  const hardFailures = steps.filter((s) => !s.ok && s.name !== "promotion_gate").length;
  if (hardFailures > 0) process.exit(1);
}

main().catch((err) => {
  console.error("Orchestrator failed:", err);
  process.exit(1);
});
