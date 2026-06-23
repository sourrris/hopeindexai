import { appendFile, mkdir, readFile, writeFile } from "fs/promises";
import { dirname } from "path";

interface BaselineSplit {
  split: "train" | "validation" | "test" | "holdout_preliminary";
  rows: number;
  positives: number;
  prevalence: number;
  averagePrecision: number;
  top5Pct: { precision: number; recall: number };
  top10Pct: { precision: number; recall: number };
  top20Pct: { precision: number; recall: number };
}

interface BaselineReport {
  schemaVersion: "risk-window-baseline-report.v1";
  generatedAt: string;
  datasetPath: string;
  task: string;
  baseline: {
    name: string;
    formula: string;
  };
  splits: BaselineSplit[];
}

const BASELINE_REPORT_PATH = "data/eval/risk_windows_baseline_report.json";
const MODEL_REPORT_PATH = "data/eval/risk_window_model_report.json";
const CHAMPION_PATH = "data/models/risk_window_champion.json";
const CHAMPION_REPORT_PATH = "data/eval/risk_window_champion_report.json";
const LEDGER_PATH = "data/experiments/risk_research_ledger.jsonl";

function printHelp() {
  console.log(`HopeIndexAI risk baseline champion initializer

Usage:
  bun run risk:baseline

Reads:
  ${BASELINE_REPORT_PATH}
  ${MODEL_REPORT_PATH} if present

Writes:
  ${CHAMPION_PATH}
  ${CHAMPION_REPORT_PATH}
  ${LEDGER_PATH}
`);
}

function bySplit(report: BaselineReport, split: BaselineSplit["split"]): BaselineSplit {
  const row = report.splits.find((item) => item.split === split);
  if (!row) throw new Error(`Missing ${split} split in ${BASELINE_REPORT_PATH}.`);
  return row;
}

async function optionalJson(path: string): Promise<unknown | null> {
  try {
    return JSON.parse(await readFile(path, "utf8"));
  } catch (err) {
    if (err && typeof err === "object" && "code" in err && err.code === "ENOENT") return null;
    throw err;
  }
}

async function main() {
  if (process.argv.includes("-h") || process.argv.includes("--help")) {
    printHelp();
    return;
  }

  const baselineReport = JSON.parse(await readFile(BASELINE_REPORT_PATH, "utf8")) as BaselineReport;
  const modelReport = await optionalJson(MODEL_REPORT_PATH);
  const validation = bySplit(baselineReport, "validation");
  const test = bySplit(baselineReport, "test");
  const holdout = bySplit(baselineReport, "holdout_preliminary");
  const generatedAt = new Date().toISOString();

  const champion = {
    schemaVersion: "risk-window-champion.v1",
    generatedAt,
    championId: "baseline.history_recency_momentum.v1",
    championType: "deterministic_baseline",
    status: "active_champion",
    modelPath: null,
    reportPath: CHAMPION_REPORT_PATH,
    datasetPath: baselineReport.datasetPath,
    scoreFunction: {
      name: baselineReport.baseline.name,
      formula: baselineReport.baseline.formula,
      implementation: "scripts/build_risk_windows.ts#baselineScore",
    },
    promotionGate: {
      requiredValidationAveragePrecisionGreaterThan: validation.averagePrecision,
      requiredTestAveragePrecisionGreaterThan: test.averagePrecision,
      requiredTop10PrecisionNoRegression: true,
      holdoutPreliminaryIsInformationalOnly: true,
    },
    currentMetrics: {
      validationAveragePrecision: validation.averagePrecision,
      testAveragePrecision: test.averagePrecision,
      holdoutPreliminaryAveragePrecision: holdout.averagePrecision,
      validationTop10Precision: validation.top10Pct.precision,
      testTop10Precision: test.top10Pct.precision,
    },
    notes: [
      "This deterministic baseline is the current champion because the first logistic model did not beat it on validation/test average precision.",
      "A future autoresearch challenger must improve validation and test AP without top-10 precision regression before promotion.",
    ],
  };

  const championReport = {
    schemaVersion: "risk-window-champion-report.v1",
    generatedAt,
    champion,
    baselineReport,
    latestChallengerReport: modelReport,
    decision: {
      promoted: true,
      reason: "Initialized baseline as champion before autoresearch. No challenger is promoted yet.",
    },
  };

  const ledgerRow = {
    schemaVersion: "risk-research-ledger-row.v1",
    experimentId: `risk-baseline-${generatedAt.replace(/[:.]/g, "-")}`,
    generatedAt,
    hypothesis: "A deterministic history/recency/momentum baseline is the first champion for country-month organized-violence risk ranking.",
    changedFiles: [BASELINE_REPORT_PATH, CHAMPION_PATH, CHAMPION_REPORT_PATH],
    command: "bun run risk:baseline",
    candidateType: "deterministic_baseline",
    decision: "accepted_as_initial_champion",
    metrics: champion.currentMetrics,
    notes: "This is the baseline that autoresearch challengers must beat.",
  };

  await mkdir(dirname(CHAMPION_PATH), { recursive: true });
  await mkdir(dirname(CHAMPION_REPORT_PATH), { recursive: true });
  await mkdir(dirname(LEDGER_PATH), { recursive: true });
  await writeFile(CHAMPION_PATH, `${JSON.stringify(champion, null, 2)}\n`);
  await writeFile(CHAMPION_REPORT_PATH, `${JSON.stringify(championReport, null, 2)}\n`);

  const existingLedger = await Bun.file(LEDGER_PATH).exists();
  await appendFile(LEDGER_PATH, `${JSON.stringify(ledgerRow)}\n`);

  console.log("HopeIndexAI risk baseline champion");
  console.log(`Champion: ${champion.championId}`);
  console.log(`Validation AP: ${validation.averagePrecision}`);
  console.log(`Test AP: ${test.averagePrecision}`);
  console.log(`2026 preliminary AP: ${holdout.averagePrecision}`);
  console.log(`Ledger: ${existingLedger ? "appended" : "created"}`);
  console.log(`Wrote ${CHAMPION_PATH}`);
  console.log(`Wrote ${CHAMPION_REPORT_PATH}`);
  console.log(`Wrote ${LEDGER_PATH}`);
}

main().catch((err) => {
  console.error("HopeIndexAI risk baseline champion failed:", err instanceof Error ? err.message : err);
  process.exit(1);
});
