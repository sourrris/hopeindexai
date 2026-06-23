import { createReadStream } from "fs";
import { mkdir, readFile, writeFile } from "fs/promises";
import { createInterface } from "readline";
import { dirname } from "path";

type Split = "train" | "validation" | "test" | "holdout_preliminary";

interface RiskWindowRecord {
  recordId: string;
  window: {
    split: Split;
    countryKey: string;
    month: string;
  };
  features: Record<string, number | null>;
  labels: {
    currentMonthHasOrganizedViolence: boolean;
  };
  mlUse: {
    canTrainOutcome: boolean;
    canEvaluateOutcome: boolean;
    excludeReasons: string[];
  };
}

interface ScoredRow {
  row: RiskWindowRecord;
  score: number;
}

const INPUT_PATH = "data/training/risk_windows_country_month.jsonl";
const BASELINE_PATH = "data/eval/risk_windows_baseline_report.json";
const MODEL_PATH = "data/models/risk_window_logreg_model.json";
const REPORT_PATH = "data/eval/risk_window_model_report.json";
const MODEL_VERSION = "risk-window-logreg-v1";
const EPOCHS = 900;
const LEARNING_RATE = 0.04;
const L2 = 0.002;

function printHelp() {
  console.log(`HopeIndexAI risk-window model trainer

Usage:
  bun run risk:train

Reads:
  ${INPUT_PATH}
  ${BASELINE_PATH}

Writes:
  ${MODEL_PATH}
  ${REPORT_PATH}
`);
}

function sigmoid(z: number): number {
  if (z > 35) return 1;
  if (z < -35) return 0;
  return 1 / (1 + Math.exp(-z));
}

function featureValue(value: number | null | undefined): number {
  if (value === null || value === undefined) return 0;
  return Number.isFinite(value) ? Number(value) : 0;
}

function label(row: RiskWindowRecord): number {
  return row.labels.currentMonthHasOrganizedViolence ? 1 : 0;
}

async function readRows(): Promise<RiskWindowRecord[]> {
  const rows: RiskWindowRecord[] = [];
  const rl = createInterface({
    input: createReadStream(INPUT_PATH, { encoding: "utf8" }),
    crlfDelay: Infinity,
  });

  let lineNumber = 0;
  for await (const line of rl) {
    lineNumber += 1;
    if (!line.trim()) continue;
    try {
      rows.push(JSON.parse(line) as RiskWindowRecord);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      throw new Error(`Invalid JSONL in ${INPUT_PATH} line ${lineNumber}: ${message}`);
    }
  }
  return rows;
}

function baselineScore(row: RiskWindowRecord): number {
  const f = row.features;
  const recency = Math.log1p(featureValue(f.past1mEvents)) * 1.5;
  const recentDeaths = Math.log1p(featureValue(f.past3mDeathsBest));
  const history = Math.log1p(featureValue(f.past12mEvents)) * 0.6;
  const momentum = Math.max(0, featureValue(f.eventMomentum3v12)) * 0.25;
  const acledTrend = Math.log1p(featureValue(f.acledPast3mEvents)) * 0.18;
  const spillover = Math.log1p(featureValue(f.neighborPast3mDeathsBest)) * 0.08;
  const actorMemory = Math.log1p(featureValue(f.past3mActorTokenCount)) * 0.12;
  const monthsSince = f.monthsSinceLastEvent;
  const quietPenalty = monthsSince === null || monthsSince === undefined
    ? -1
    : -Math.min(1.5, featureValue(monthsSince) / 24);
  return recency + recentDeaths + history + momentum + acledTrend + spillover + actorMemory + quietPenalty;
}

function selectFeatureNames(rows: RiskWindowRecord[]): string[] {
  const names = new Set<string>();
  for (const row of rows) {
    for (const key of Object.keys(row.features)) names.add(key);
  }
  names.add("baselineHistoryScore");
  return [...names].sort();
}

function vector(row: RiskWindowRecord, featureNames: string[]): number[] {
  return featureNames.map((name) => name === "baselineHistoryScore" ? baselineScore(row) : featureValue(row.features[name]));
}

function standardize(
  rows: RiskWindowRecord[],
  trainRows: RiskWindowRecord[],
  featureNames: string[]
) {
  const trainVectors = trainRows.map((row) => vector(row, featureNames));
  const means = featureNames.map((_, i) => trainVectors.reduce((sum, values) => sum + values[i], 0) / trainVectors.length);
  const stds = featureNames.map((_, i) => {
    const variance = trainVectors.reduce((sum, values) => sum + (values[i] - means[i]) ** 2, 0) / trainVectors.length;
    return Math.sqrt(variance) || 1;
  });
  const standardized = new Map<string, number[]>();
  for (const row of rows) {
    const values = vector(row, featureNames);
    standardized.set(row.recordId, values.map((value, i) => (value - means[i]) / stds[i]));
  }
  return { means, stds, standardized };
}

function trainLogReg(
  trainRows: RiskWindowRecord[],
  standardized: Map<string, number[]>,
  featureNames: string[]
) {
  const positive = trainRows.filter((row) => label(row) === 1).length;
  const negative = trainRows.length - positive;
  const posWeight = trainRows.length / (2 * Math.max(1, positive));
  const negWeight = trainRows.length / (2 * Math.max(1, negative));
  const weights = Array(featureNames.length).fill(0);
  let bias = Math.log((positive + 1) / (negative + 1));

  for (let epoch = 0; epoch < EPOCHS; epoch += 1) {
    const grad = Array(featureNames.length).fill(0);
    let biasGrad = 0;

    for (const row of trainRows) {
      const values = standardized.get(row.recordId);
      if (!values) throw new Error(`Missing standardized vector for ${row.recordId}`);
      const z = bias + values.reduce((sum, value, i) => sum + value * weights[i], 0);
      const y = label(row);
      const p = sigmoid(z);
      const sampleWeight = y === 1 ? posWeight : negWeight;
      const err = (p - y) * sampleWeight;
      biasGrad += err;
      for (let i = 0; i < weights.length; i += 1) grad[i] += err * values[i];
    }

    bias -= LEARNING_RATE * biasGrad / trainRows.length;
    for (let i = 0; i < weights.length; i += 1) {
      const l2Grad = L2 * weights[i];
      weights[i] -= LEARNING_RATE * (grad[i] / trainRows.length + l2Grad);
    }
  }

  return { weights, bias, positive, negative };
}

function modelScore(row: RiskWindowRecord, standardized: Map<string, number[]>, weights: number[], bias: number): number {
  const values = standardized.get(row.recordId);
  if (!values) throw new Error(`Missing standardized vector for ${row.recordId}`);
  return sigmoid(bias + values.reduce((sum, value, i) => sum + value * weights[i], 0));
}

function averagePrecision(scored: ScoredRow[]): number {
  const sorted = [...scored].sort((a, b) => b.score - a.score);
  const positives = sorted.filter((item) => label(item.row) === 1).length;
  if (positives === 0) return 0;
  let seenPositive = 0;
  let precisionSum = 0;
  sorted.forEach((item, index) => {
    if (label(item.row) === 0) return;
    seenPositive += 1;
    precisionSum += seenPositive / (index + 1);
  });
  return precisionSum / positives;
}

function precisionRecallAtFraction(scored: ScoredRow[], fraction: number) {
  const sorted = [...scored].sort((a, b) => b.score - a.score);
  const k = Math.max(1, Math.round(sorted.length * fraction));
  const selected = sorted.slice(0, k);
  const positives = sorted.filter((item) => label(item.row) === 1).length;
  const selectedPositive = selected.filter((item) => label(item.row) === 1).length;
  return {
    fraction,
    selected: k,
    precision: Number((selectedPositive / k).toFixed(4)),
    recall: positives > 0 ? Number((selectedPositive / positives).toFixed(4)) : 0,
  };
}

function brier(scored: ScoredRow[]): number {
  if (scored.length === 0) return 0;
  const total = scored.reduce((sum, item) => {
    const err = item.score - label(item.row);
    return sum + err * err;
  }, 0);
  return total / scored.length;
}

function evaluateRows(rows: RiskWindowRecord[], scoreFn: (row: RiskWindowRecord) => number, scoreIsProbability: boolean) {
  const scored = rows.map((row) => ({ row, score: scoreFn(row) }));
  const positives = rows.filter((row) => label(row) === 1).length;
  return {
    rows: rows.length,
    positives,
    prevalence: rows.length > 0 ? Number((positives / rows.length).toFixed(4)) : 0,
    averagePrecision: Number(averagePrecision(scored).toFixed(4)),
    brier: scoreIsProbability ? Number(brier(scored).toFixed(4)) : null,
    top5Pct: precisionRecallAtFraction(scored, 0.05),
    top10Pct: precisionRecallAtFraction(scored, 0.1),
    top20Pct: precisionRecallAtFraction(scored, 0.2),
  };
}

function topWeights(featureNames: string[], weights: number[], limit: number) {
  return featureNames
    .map((feature, index) => ({ feature, weight: Number(weights[index].toFixed(4)) }))
    .sort((a, b) => Math.abs(b.weight) - Math.abs(a.weight))
    .slice(0, limit);
}

async function main() {
  if (process.argv.includes("-h") || process.argv.includes("--help")) {
    printHelp();
    return;
  }

  const rows = await readRows();
  const trainRows = rows.filter((row) => row.mlUse.canTrainOutcome);
  const validationRows = rows.filter((row) => row.window.split === "validation" && row.mlUse.canEvaluateOutcome);
  const testRows = rows.filter((row) => row.window.split === "test" && row.mlUse.canEvaluateOutcome);
  const holdoutRows = rows.filter((row) => row.window.split === "holdout_preliminary" && !row.mlUse.excludeReasons.includes("less_than_12_months_history"));

  if (trainRows.length === 0) throw new Error("No trainable risk-window rows found. Run bun run risk:windows first.");

  const featureNames = selectFeatureNames(rows);
  const { means, stds, standardized } = standardize(rows, trainRows, featureNames);
  const trained = trainLogReg(trainRows, standardized, featureNames);
  const modelScoreFn = (row: RiskWindowRecord) => modelScore(row, standardized, trained.weights, trained.bias);

  const splitRows: Array<[Split, RiskWindowRecord[]]> = [
    ["train", trainRows],
    ["validation", validationRows],
    ["test", testRows],
    ["holdout_preliminary", holdoutRows],
  ];

  const baselineReport = await readFile(BASELINE_PATH, "utf8")
    .then((text) => JSON.parse(text))
    .catch(() => null);

  const report = {
    schemaVersion: "risk-window-model-report.v1",
    generatedAt: new Date().toISOString(),
    modelVersion: MODEL_VERSION,
    datasetPath: INPUT_PATH,
    baselinePath: BASELINE_PATH,
    modelPath: MODEL_PATH,
    algorithm: {
      name: "weighted_l2_logistic_regression",
      epochs: EPOCHS,
      learningRate: LEARNING_RATE,
      l2: L2,
      featureCount: featureNames.length,
      trainPositives: trained.positive,
      trainNegatives: trained.negative,
    },
    splits: Object.fromEntries(splitRows.map(([split, splitData]) => {
      const model = evaluateRows(splitData, modelScoreFn, true);
      const baseline = evaluateRows(splitData, baselineScore, false);
      return [split, {
        model,
        baseline,
        averagePrecisionDelta: Number((model.averagePrecision - baseline.averagePrecision).toFixed(4)),
        top10PrecisionDelta: Number((model.top10Pct.precision - baseline.top10Pct.precision).toFixed(4)),
      }];
    })),
    previousBaselineReport: baselineReport?.splits ?? null,
    topWeights: topWeights(featureNames, trained.weights, 20),
    notes: [
      "This is the first small transparent model, not a production forecaster.",
      "The simple baseline score is included as a prior feature, so the model learns corrections rather than ignoring a strong historical prior.",
      "It predicts UCDP organized-violence outcome risk at country-month level, not HopeIndexAI importance labels.",
      "Validation/test deltas against the dumb history baseline matter more than train performance.",
    ],
  };

  const model = {
    schemaVersion: "risk-window-logreg-model.v1",
    generatedAt: report.generatedAt,
    modelVersion: MODEL_VERSION,
    featureNames,
    means,
    stds,
    weights: trained.weights,
    bias: trained.bias,
    training: report.algorithm,
  };

  await mkdir(dirname(MODEL_PATH), { recursive: true });
  await mkdir(dirname(REPORT_PATH), { recursive: true });
  await writeFile(MODEL_PATH, `${JSON.stringify(model, null, 2)}\n`);
  await writeFile(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`);

  console.log("HopeIndexAI risk-window model training");
  console.log(`Train rows: ${trainRows.length}`);
  console.log(`Features: ${featureNames.length}`);
  for (const split of ["validation", "test", "holdout_preliminary"] as const) {
    const metrics = report.splits[split];
    console.log(`${split}: model AP=${metrics.model.averagePrecision}, baseline AP=${metrics.baseline.averagePrecision}, delta=${metrics.averagePrecisionDelta}`);
  }
  console.log(`Wrote ${MODEL_PATH}`);
  console.log(`Wrote ${REPORT_PATH}`);
}

main().catch((err) => {
  console.error("HopeIndexAI risk-window model training failed:", err instanceof Error ? err.message : err);
  process.exit(1);
});
