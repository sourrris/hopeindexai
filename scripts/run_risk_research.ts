import { createReadStream } from "fs";
import { appendFile, mkdir, readFile, writeFile } from "fs/promises";
import { createInterface } from "readline";
import { dirname } from "path";

type Split = "train" | "validation" | "test" | "holdout_preliminary";

interface RiskWindowRecord {
  recordId: string;
  window: { split: Split };
  features: Record<string, number | null>;
  labels: { currentMonthHasOrganizedViolence: boolean };
  mlUse: { canTrainOutcome: boolean; canEvaluateOutcome: boolean; excludeReasons: string[] };
}

interface Champion {
  championId: string;
  promotionGate: {
    requiredValidationAveragePrecisionGreaterThan: number;
    requiredTestAveragePrecisionGreaterThan: number;
    requiredTop10PrecisionNoRegression: boolean;
  };
  currentMetrics: {
    validationAveragePrecision: number;
    testAveragePrecision: number;
    holdoutPreliminaryAveragePrecision: number;
    validationTop10Precision: number;
    testTop10Precision: number;
  };
}

interface Variant {
  id: string;
  hypothesis: string;
  kind: "logistic";
  includeBaselinePrior: boolean;
  includePatterns: string[];
  excludePatterns: string[];
  learningRate: number;
  l2: number;
  epochs: number;
}

interface ScoreVariant {
  id: string;
  hypothesis: string;
  kind: "deterministic_score";
  weights: {
    recency: number;
    recentDeaths: number;
    history: number;
    momentum: number;
    acledTrend: number;
    spillover: number;
    actorMemory: number;
    quietMax: number;
    quietDivisor: number;
  };
}

interface ScoredRow {
  row: RiskWindowRecord;
  score: number;
}

const INPUT_PATH = "data/training/risk_windows_country_month.jsonl";
const CHAMPION_PATH = "data/models/risk_window_champion.json";
const LEDGER_PATH = "data/experiments/risk_research_ledger.jsonl";
const BEST_CHALLENGER_MODEL_PATH = "data/models/risk_window_challenger_best.json";
const BEST_CHALLENGER_REPORT_PATH = "data/eval/risk_window_challenger_best_report.json";
const CHAMPION_REPORT_PATH = "data/eval/risk_window_champion_report.json";

const VARIANTS: Variant[] = [
  {
    id: "logreg.baseline_prior.all.lr002_l2001",
    hypothesis: "A slower logistic learner using all features plus the baseline prior may learn conservative corrections.",
    kind: "logistic",
    includeBaselinePrior: true,
    includePatterns: [""],
    excludePatterns: [],
    learningRate: 0.02,
    l2: 0.001,
    epochs: 1_200,
  },
  {
    id: "logreg.baseline_prior.all.lr006_l2005",
    hypothesis: "A stronger regularized learner may avoid overfitting while using all feature families.",
    kind: "logistic",
    includeBaselinePrior: true,
    includePatterns: [""],
    excludePatterns: [],
    learningRate: 0.06,
    l2: 0.005,
    epochs: 900,
  },
  {
    id: "logreg.baseline_prior.no_acled",
    hypothesis: "ACLED aggregate trend features may add naming noise; removing them could improve historical generalization.",
    kind: "logistic",
    includeBaselinePrior: true,
    includePatterns: [""],
    excludePatterns: ["acled"],
    learningRate: 0.04,
    l2: 0.002,
    epochs: 900,
  },
  {
    id: "logreg.baseline_prior.memory_spillover_only",
    hypothesis: "The useful correction signal may be actor memory and regional spillover rather than raw event-count duplicates.",
    kind: "logistic",
    includeBaselinePrior: true,
    includePatterns: ["actor", "neighbor", "monthsSince"],
    excludePatterns: [],
    learningRate: 0.04,
    l2: 0.003,
    epochs: 900,
  },
  {
    id: "logreg.no_prior.all",
    hypothesis: "A model without the hand-built prior tests whether expanded features can stand alone.",
    kind: "logistic",
    includeBaselinePrior: false,
    includePatterns: [""],
    excludePatterns: [],
    learningRate: 0.04,
    l2: 0.002,
    epochs: 900,
  },
];

const SCORE_VARIANTS: ScoreVariant[] = [
  {
    id: "score.baseline_formula_replay",
    hypothesis: "Replay the champion formula inside the research loop as a control.",
    kind: "deterministic_score",
    weights: { recency: 1.5, recentDeaths: 1, history: 0.6, momentum: 0.25, acledTrend: 0.18, spillover: 0.08, actorMemory: 0.12, quietMax: 1.5, quietDivisor: 24 },
  },
  {
    id: "score.recency_heavy",
    hypothesis: "Recent local violence may dominate long historical averages.",
    kind: "deterministic_score",
    weights: { recency: 1.9, recentDeaths: 0.9, history: 0.35, momentum: 0.2, acledTrend: 0.1, spillover: 0.06, actorMemory: 0.08, quietMax: 1.5, quietDivisor: 18 },
  },
  {
    id: "score.death_heavy",
    hypothesis: "Recent deaths may rank severe continuation risk better than event counts.",
    kind: "deterministic_score",
    weights: { recency: 1.2, recentDeaths: 1.35, history: 0.5, momentum: 0.2, acledTrend: 0.08, spillover: 0.08, actorMemory: 0.08, quietMax: 1.5, quietDivisor: 24 },
  },
  {
    id: "score.actor_memory_heavy",
    hypothesis: "Persistent actor ecosystems may identify repeat conflict risk better than generic country history.",
    kind: "deterministic_score",
    weights: { recency: 1.35, recentDeaths: 0.9, history: 0.55, momentum: 0.18, acledTrend: 0.08, spillover: 0.08, actorMemory: 0.35, quietMax: 1.5, quietDivisor: 24 },
  },
  {
    id: "score.spillover_heavy",
    hypothesis: "Regional spillover may improve early warning in countries with quiet recent local history.",
    kind: "deterministic_score",
    weights: { recency: 1.25, recentDeaths: 0.9, history: 0.55, momentum: 0.18, acledTrend: 0.08, spillover: 0.28, actorMemory: 0.12, quietMax: 1.25, quietDivisor: 20 },
  },
  {
    id: "score.acled_light",
    hypothesis: "ACLED aggregate features may help but should be downweighted because labels are UCDP outcomes.",
    kind: "deterministic_score",
    weights: { recency: 1.5, recentDeaths: 1, history: 0.6, momentum: 0.25, acledTrend: 0.04, spillover: 0.08, actorMemory: 0.12, quietMax: 1.5, quietDivisor: 24 },
  },
  {
    id: "score.acled_zero",
    hypothesis: "Removing ACLED aggregate trend features tests whether they add noise for UCDP outcome ranking.",
    kind: "deterministic_score",
    weights: { recency: 1.5, recentDeaths: 1, history: 0.6, momentum: 0.25, acledTrend: 0, spillover: 0.08, actorMemory: 0.12, quietMax: 1.5, quietDivisor: 24 },
  },
  {
    id: "score.quiet_penalty_strong",
    hypothesis: "Countries with long quiet periods should be penalized more strongly to reduce false positives.",
    kind: "deterministic_score",
    weights: { recency: 1.45, recentDeaths: 1, history: 0.55, momentum: 0.22, acledTrend: 0.08, spillover: 0.06, actorMemory: 0.1, quietMax: 2.2, quietDivisor: 12 },
  },
  {
    id: "score.history_heavy",
    hypothesis: "Long historical conflict inertia may matter more than short-term month-to-month volatility.",
    kind: "deterministic_score",
    weights: { recency: 1.1, recentDeaths: 0.8, history: 1.0, momentum: 0.1, acledTrend: 0.08, spillover: 0.06, actorMemory: 0.16, quietMax: 1.5, quietDivisor: 24 },
  },
  {
    id: "score.history_heavier",
    hypothesis: "Even stronger long-run conflict inertia may further improve stable country-month ranking.",
    kind: "deterministic_score",
    weights: { recency: 0.9, recentDeaths: 0.7, history: 1.25, momentum: 0.06, acledTrend: 0.05, spillover: 0.04, actorMemory: 0.18, quietMax: 1.5, quietDivisor: 24 },
  },
  {
    id: "score.history_actor_blend",
    hypothesis: "Long-run country inertia plus persistent actor ecosystems may be the cleanest non-overfit signal.",
    kind: "deterministic_score",
    weights: { recency: 1.0, recentDeaths: 0.75, history: 1.1, momentum: 0.08, acledTrend: 0.05, spillover: 0.04, actorMemory: 0.3, quietMax: 1.5, quietDivisor: 24 },
  },
  {
    id: "score.history_no_acled",
    hypothesis: "The promoted history-heavy score may improve further without ACLED aggregate noise.",
    kind: "deterministic_score",
    weights: { recency: 1.1, recentDeaths: 0.8, history: 1.0, momentum: 0.1, acledTrend: 0, spillover: 0.06, actorMemory: 0.16, quietMax: 1.5, quietDivisor: 24 },
  },
  {
    id: "score.history_more_spillover",
    hypothesis: "Long history plus modest regional spillover may help rank emerging risk in quiet countries.",
    kind: "deterministic_score",
    weights: { recency: 1.0, recentDeaths: 0.75, history: 1.05, momentum: 0.08, acledTrend: 0.04, spillover: 0.16, actorMemory: 0.16, quietMax: 1.4, quietDivisor: 24 },
  },
  {
    id: "score.history_weaker_quiet_penalty",
    hypothesis: "A weaker quiet penalty may avoid suppressing historically risky countries after brief lulls.",
    kind: "deterministic_score",
    weights: { recency: 1.05, recentDeaths: 0.75, history: 1.1, momentum: 0.08, acledTrend: 0.05, spillover: 0.05, actorMemory: 0.18, quietMax: 1.0, quietDivisor: 30 },
  },
];

function printHelp() {
  console.log(`HopeIndexAI bounded risk autoresearch

Usage:
  bun run risk:research

Reads:
  ${INPUT_PATH}
  ${CHAMPION_PATH}

Writes/appends:
  ${LEDGER_PATH}
  ${BEST_CHALLENGER_MODEL_PATH}
  ${BEST_CHALLENGER_REPORT_PATH}
  ${CHAMPION_PATH} only if a challenger passes the promotion gate
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

function baselineScore(row: RiskWindowRecord): number {
  return weightedScore(row, SCORE_VARIANTS[0].weights);
}

function weightedScore(row: RiskWindowRecord, weights: ScoreVariant["weights"]): number {
  const f = row.features;
  const recency = Math.log1p(featureValue(f.past1mEvents)) * weights.recency;
  const recentDeaths = Math.log1p(featureValue(f.past3mDeathsBest)) * weights.recentDeaths;
  const history = Math.log1p(featureValue(f.past12mEvents)) * weights.history;
  const momentum = Math.max(0, featureValue(f.eventMomentum3v12)) * weights.momentum;
  const acledTrend = Math.log1p(featureValue(f.acledPast3mEvents)) * weights.acledTrend;
  const spillover = Math.log1p(featureValue(f.neighborPast3mDeathsBest)) * weights.spillover;
  const actorMemory = Math.log1p(featureValue(f.past3mActorTokenCount)) * weights.actorMemory;
  const monthsSince = f.monthsSinceLastEvent;
  const quietPenalty = monthsSince === null || monthsSince === undefined
    ? -1
    : -Math.min(weights.quietMax, featureValue(monthsSince) / weights.quietDivisor);
  return recency + recentDeaths + history + momentum + acledTrend + spillover + actorMemory + quietPenalty;
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

function allBaseFeatureNames(rows: RiskWindowRecord[]): string[] {
  const names = new Set<string>();
  for (const row of rows) for (const key of Object.keys(row.features)) names.add(key);
  return [...names].sort();
}

function selectedFeatureNames(rows: RiskWindowRecord[], variant: Variant): string[] {
  const names = allBaseFeatureNames(rows).filter((name) => {
    const lower = name.toLowerCase();
    const included = variant.includePatterns.includes("") ||
      variant.includePatterns.some((pattern) => lower.includes(pattern.toLowerCase()));
    const excluded = variant.excludePatterns.some((pattern) => lower.includes(pattern.toLowerCase()));
    return included && !excluded;
  });
  if (variant.includeBaselinePrior) names.unshift("baselineHistoryScore");
  return [...new Set(names)];
}

function vector(row: RiskWindowRecord, names: string[]): number[] {
  return names.map((name) => name === "baselineHistoryScore" ? baselineScore(row) : featureValue(row.features[name]));
}

function standardize(rows: RiskWindowRecord[], trainRows: RiskWindowRecord[], names: string[]) {
  const trainVectors = trainRows.map((row) => vector(row, names));
  const means = names.map((_, i) => trainVectors.reduce((sum, values) => sum + values[i], 0) / trainVectors.length);
  const stds = names.map((_, i) => {
    const variance = trainVectors.reduce((sum, values) => sum + (values[i] - means[i]) ** 2, 0) / trainVectors.length;
    return Math.sqrt(variance) || 1;
  });
  const standardized = new Map<string, number[]>();
  for (const row of rows) {
    const values = vector(row, names);
    standardized.set(row.recordId, values.map((value, i) => (value - means[i]) / stds[i]));
  }
  return { means, stds, standardized };
}

function trainLogReg(rows: RiskWindowRecord[], standardized: Map<string, number[]>, names: string[], variant: Variant) {
  const positive = rows.filter((row) => label(row) === 1).length;
  const negative = rows.length - positive;
  const posWeight = rows.length / (2 * Math.max(1, positive));
  const negWeight = rows.length / (2 * Math.max(1, negative));
  const weights = Array(names.length).fill(0);
  let bias = Math.log((positive + 1) / (negative + 1));

  for (let epoch = 0; epoch < variant.epochs; epoch += 1) {
    const grad = Array(names.length).fill(0);
    let biasGrad = 0;
    for (const row of rows) {
      const values = standardized.get(row.recordId);
      if (!values) throw new Error(`Missing vector for ${row.recordId}`);
      const y = label(row);
      const p = sigmoid(bias + values.reduce((sum, value, i) => sum + value * weights[i], 0));
      const err = (p - y) * (y === 1 ? posWeight : negWeight);
      biasGrad += err;
      for (let i = 0; i < weights.length; i += 1) grad[i] += err * values[i];
    }
    bias -= variant.learningRate * biasGrad / rows.length;
    for (let i = 0; i < weights.length; i += 1) {
      weights[i] -= variant.learningRate * (grad[i] / rows.length + variant.l2 * weights[i]);
    }
  }

  return { weights, bias, positive, negative };
}

function score(row: RiskWindowRecord, standardized: Map<string, number[]>, weights: number[], bias: number): number {
  const values = standardized.get(row.recordId);
  if (!values) throw new Error(`Missing vector for ${row.recordId}`);
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
    precision: Number((selectedPositive / k).toFixed(4)),
    recall: positives > 0 ? Number((selectedPositive / positives).toFixed(4)) : 0,
  };
}

function evaluate(rows: RiskWindowRecord[], scoreFn: (row: RiskWindowRecord) => number) {
  const scored = rows.map((row) => ({ row, score: scoreFn(row) }));
  const positives = rows.filter((row) => label(row) === 1).length;
  return {
    rows: rows.length,
    positives,
    averagePrecision: Number(averagePrecision(scored).toFixed(4)),
    top10Pct: precisionRecallAtFraction(scored, 0.1),
    top20Pct: precisionRecallAtFraction(scored, 0.2),
  };
}

function passesGate(report: any, champion: Champion): boolean {
  if (report.splits.validation.averagePrecision <= champion.promotionGate.requiredValidationAveragePrecisionGreaterThan) return false;
  if (report.splits.test.averagePrecision <= champion.promotionGate.requiredTestAveragePrecisionGreaterThan) return false;
  if (!champion.promotionGate.requiredTop10PrecisionNoRegression) return true;
  const noTop10Regression = report.splits.validation.top10Pct.precision >= champion.currentMetrics.validationTop10Precision &&
    report.splits.test.top10Pct.precision >= champion.currentMetrics.testTop10Precision;
  const trainValidationGap = report.splits.train.averagePrecision - report.splits.validation.averagePrecision;
  const noLargeOverfitGap = trainValidationGap <= 0.05;
  const holdoutNotCatastrophic = report.splits.holdout_preliminary.averagePrecision >=
    champion.currentMetrics.holdoutPreliminaryAveragePrecision - 0.03;
  return noTop10Regression && noLargeOverfitGap && holdoutNotCatastrophic;
}

function topWeights(names: string[], weights: number[], limit: number) {
  return names
    .map((feature, index) => ({ feature, weight: Number(weights[index].toFixed(4)) }))
    .sort((a, b) => Math.abs(b.weight) - Math.abs(a.weight))
    .slice(0, limit);
}

async function main() {
  if (process.argv.includes("-h") || process.argv.includes("--help")) {
    printHelp();
    return;
  }

  const [rows, champion] = await Promise.all([
    readRows(),
    readFile(CHAMPION_PATH, "utf8").then((text) => JSON.parse(text) as Champion),
  ]);
  const trainRows = rows.filter((row) => row.mlUse.canTrainOutcome);
  const validationRows = rows.filter((row) => row.window.split === "validation" && row.mlUse.canEvaluateOutcome);
  const testRows = rows.filter((row) => row.window.split === "test" && row.mlUse.canEvaluateOutcome);
  const holdoutRows = rows.filter((row) => row.window.split === "holdout_preliminary" && !row.mlUse.excludeReasons.includes("less_than_12_months_history"));

  const generatedAt = new Date().toISOString();
  const reports: any[] = [];

  for (const variant of SCORE_VARIANTS) {
    const scoreFn = (row: RiskWindowRecord) => weightedScore(row, variant.weights);
    const report: any = {
      schemaVersion: "risk-research-challenger-report.v1",
      generatedAt,
      variant,
      model: {
        kind: variant.kind,
        scoreFunction: "weighted_deterministic_risk_score",
        weights: variant.weights,
      },
      splits: {
        train: evaluate(trainRows, scoreFn),
        validation: evaluate(validationRows, scoreFn),
        test: evaluate(testRows, scoreFn),
        holdout_preliminary: evaluate(holdoutRows, scoreFn),
      },
      topWeights: Object.entries(variant.weights).map(([feature, weight]) => ({ feature, weight })),
    };
    report.promoted = passesGate(report, champion);
    reports.push(report);

    const ledgerRow = {
      schemaVersion: "risk-research-ledger-row.v1",
      experimentId: `${variant.id}-${generatedAt.replace(/[:.]/g, "-")}`,
      generatedAt,
      hypothesis: variant.hypothesis,
      command: "bun run risk:research",
      candidateType: variant.kind,
      variant,
      decision: report.promoted ? "promoted" : "rejected",
      metrics: {
        validationAveragePrecision: report.splits.validation.averagePrecision,
        testAveragePrecision: report.splits.test.averagePrecision,
        holdoutPreliminaryAveragePrecision: report.splits.holdout_preliminary.averagePrecision,
        validationTop10Precision: report.splits.validation.top10Pct.precision,
        testTop10Precision: report.splits.test.top10Pct.precision,
      },
      championGate: champion.promotionGate,
      notes: report.promoted
        ? "Challenger passed the champion gate."
        : "Challenger failed the champion gate and was not promoted.",
    };
    await mkdir(dirname(LEDGER_PATH), { recursive: true });
    await appendFile(LEDGER_PATH, `${JSON.stringify(ledgerRow)}\n`);
  }

  for (const variant of VARIANTS) {
    const featureNames = selectedFeatureNames(rows, variant);
    const { means, stds, standardized } = standardize(rows, trainRows, featureNames);
    const trained = trainLogReg(trainRows, standardized, featureNames, variant);
    const scoreFn = (row: RiskWindowRecord) => score(row, standardized, trained.weights, trained.bias);
    const report: any = {
      schemaVersion: "risk-research-challenger-report.v1",
      generatedAt,
      variant,
      model: {
        featureNames,
        means,
        stds,
        weights: trained.weights,
        bias: trained.bias,
        trainPositives: trained.positive,
        trainNegatives: trained.negative,
      },
      splits: {
        train: evaluate(trainRows, scoreFn),
        validation: evaluate(validationRows, scoreFn),
        test: evaluate(testRows, scoreFn),
        holdout_preliminary: evaluate(holdoutRows, scoreFn),
      },
      topWeights: topWeights(featureNames, trained.weights, 12),
    };
    report.promoted = passesGate(report, champion);
    reports.push(report);

    const ledgerRow = {
      schemaVersion: "risk-research-ledger-row.v1",
      experimentId: `${variant.id}-${generatedAt.replace(/[:.]/g, "-")}`,
      generatedAt,
      hypothesis: variant.hypothesis,
      command: "bun run risk:research",
      candidateType: variant.kind,
      variant,
      decision: report.promoted ? "promoted" : "rejected",
      metrics: {
        validationAveragePrecision: report.splits.validation.averagePrecision,
        testAveragePrecision: report.splits.test.averagePrecision,
        holdoutPreliminaryAveragePrecision: report.splits.holdout_preliminary.averagePrecision,
        validationTop10Precision: report.splits.validation.top10Pct.precision,
        testTop10Precision: report.splits.test.top10Pct.precision,
      },
      championGate: champion.promotionGate,
      notes: report.promoted
        ? "Challenger passed the champion gate."
        : "Challenger failed the champion gate and was not promoted.",
    };
    await mkdir(dirname(LEDGER_PATH), { recursive: true });
    await appendFile(LEDGER_PATH, `${JSON.stringify(ledgerRow)}\n`);
  }

  const eligibleReports = reports.some((report) => report.promoted)
    ? reports.filter((report) => report.promoted)
    : reports;
  const best = eligibleReports.sort((a, b) =>
    b.splits.validation.averagePrecision - a.splits.validation.averagePrecision ||
    b.splits.test.averagePrecision - a.splits.test.averagePrecision
  )[0];

  const bestReport = {
    schemaVersion: "risk-research-run-report.v1",
    generatedAt,
    championBefore: champion,
    variantsTried: reports.length,
    bestChallenger: {
      variant: best.variant,
      splits: best.splits,
      topWeights: best.topWeights,
      promoted: best.promoted,
    },
    allVariantSummaries: reports.map((report) => ({
      id: report.variant.id,
      validationAveragePrecision: report.splits.validation.averagePrecision,
      testAveragePrecision: report.splits.test.averagePrecision,
      holdoutPreliminaryAveragePrecision: report.splits.holdout_preliminary.averagePrecision,
      validationTop10Precision: report.splits.validation.top10Pct.precision,
      testTop10Precision: report.splits.test.top10Pct.precision,
      promoted: report.promoted,
    })),
    decision: best.promoted
      ? "Promoted best challenger to champion."
      : "No challenger beat the champion gate.",
  };

  await mkdir(dirname(BEST_CHALLENGER_MODEL_PATH), { recursive: true });
  await mkdir(dirname(BEST_CHALLENGER_REPORT_PATH), { recursive: true });
  await writeFile(BEST_CHALLENGER_MODEL_PATH, `${JSON.stringify(best.model, null, 2)}\n`);
  await writeFile(BEST_CHALLENGER_REPORT_PATH, `${JSON.stringify(bestReport, null, 2)}\n`);

  if (best.promoted) {
    const updatedChampion = {
      schemaVersion: "risk-window-champion.v1",
      generatedAt,
      championId: best.variant.id,
      championType: best.variant.kind,
      status: "active_champion",
      modelPath: BEST_CHALLENGER_MODEL_PATH,
      reportPath: BEST_CHALLENGER_REPORT_PATH,
      datasetPath: INPUT_PATH,
      promotionGate: {
        requiredValidationAveragePrecisionGreaterThan: best.splits.validation.averagePrecision,
        requiredTestAveragePrecisionGreaterThan: best.splits.test.averagePrecision,
        requiredTop10PrecisionNoRegression: true,
        holdoutPreliminaryIsInformationalOnly: true,
      },
      currentMetrics: {
        validationAveragePrecision: best.splits.validation.averagePrecision,
        testAveragePrecision: best.splits.test.averagePrecision,
        holdoutPreliminaryAveragePrecision: best.splits.holdout_preliminary.averagePrecision,
        validationTop10Precision: best.splits.validation.top10Pct.precision,
        testTop10Precision: best.splits.test.top10Pct.precision,
      },
      notes: ["Promoted by bounded autoresearch after passing validation/test gate."],
    };
    await writeFile(CHAMPION_PATH, `${JSON.stringify(updatedChampion, null, 2)}\n`);
    await writeFile(CHAMPION_REPORT_PATH, `${JSON.stringify(bestReport, null, 2)}\n`);
  }

  console.log("HopeIndexAI bounded risk autoresearch");
  console.log(`Variants tried: ${reports.length}`);
  console.log(`Best: ${best.variant.id}`);
  console.log(`Best validation AP: ${best.splits.validation.averagePrecision}`);
  console.log(`Best test AP: ${best.splits.test.averagePrecision}`);
  console.log(`Promoted: ${best.promoted ? "yes" : "no"}`);
  console.log(`Wrote ${BEST_CHALLENGER_REPORT_PATH}`);
  console.log(`Appended ${LEDGER_PATH}`);
}

main().catch((err) => {
  console.error("HopeIndexAI bounded risk autoresearch failed:", err instanceof Error ? err.message : err);
  process.exit(1);
});
