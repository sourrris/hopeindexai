import { promises as fs } from "fs";

const EVENTS_PATH = "public/data/events.json";
const POLICY_PATH = "public/data/surfacing-policy.json";
const LABEL_PATH = "data/eval/phase1_labels.jsonl";
const MODEL_PATH = "public/data/escalation-model.json";

interface ValidationResult {
  name: string;
  passed: boolean;
  message: string;
  detail?: Record<string, unknown>;
}

async function readJson(path: string): Promise<any> {
  return JSON.parse(await fs.readFile(path, "utf8"));
}

async function readJsonl(path: string): Promise<any[]> {
  try {
    const text = await fs.readFile(path, "utf8");
    return text
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => JSON.parse(line));
  } catch {
    return [];
  }
}

function pearsonCorrelation(x: number[], y: number[]): number {
  const n = x.length;
  const sumX = x.reduce((a, b) => a + b, 0);
  const sumY = y.reduce((a, b) => a + b, 0);
  const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
  const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);
  const sumY2 = y.reduce((sum, yi) => sum + yi * yi, 0);
  const denom = Math.sqrt((n * sumX2 - sumX ** 2) * (n * sumY2 - sumY ** 2));
  if (denom === 0) return 0;
  return (n * sumXY - sumX * sumY) / denom;
}

async function validate(): Promise<ValidationResult[]> {
  const results: ValidationResult[] = [];

  // Load data
  let events: any[] = [];
  let policy: any = {};
  let labels: any[] = [];
  let model: any = {};

  try {
    const eventsData = await readJson(EVENTS_PATH);
    events = eventsData.events ?? [];
  } catch (err: any) {
    results.push({ name: "events_load", passed: false, message: `Could not load ${EVENTS_PATH}: ${err.message}` });
    return results;
  }

  try {
    policy = await readJson(POLICY_PATH);
  } catch {
    results.push({ name: "policy_load", passed: false, message: `Could not load ${POLICY_PATH}` });
  }

  try {
    labels = await readJsonl(LABEL_PATH);
  } catch (err: any) {
    results.push({ name: "labels_load", passed: false, message: `Could not load ${LABEL_PATH}: ${err.message}` });
  }

  try {
    model = await readJson(MODEL_PATH);
  } catch (err: any) {
    results.push({ name: "model_load", passed: false, message: `Could not load ${MODEL_PATH}: ${err.message}` });
  }

  // 1. Events must have real model probabilities, not a systematic score/100 rescaling.
  const scoredEvents = events.filter((e) => Number.isFinite(e.surfaceScore) && Number.isFinite(e.surfaceModelProbability));
  const fakeProbEvents = scoredEvents.filter((e) => {
    const expected = Math.round((e.surfaceScore / 100) * 10000) / 10000;
    return Math.abs(e.surfaceModelProbability - expected) < 0.0001;
  });
  const fakeRatio = fakeProbEvents.length / Math.max(1, scoredEvents.length);
  results.push({
    name: "real_model_probability",
    passed: fakeRatio < 0.10,
    message: fakeRatio < 0.10
      ? `surfaceModelProbability is not a simple score/100 rescaling (${(fakeRatio * 100).toFixed(1)}% coincidental matches).`
      : `${(fakeRatio * 100).toFixed(1)}% of events have surfaceModelProbability == surfaceScore/100 (systematic fake probability).`,
    detail: { checked: scoredEvents.length, fake: fakeProbEvents.length, ratio: fakeRatio, examples: fakeProbEvents.slice(0, 3).map((e) => e.id) },
  });

  // 2. Top-end score discrimination: fewer than 5% of events should be score=100.
  const score100 = scoredEvents.filter((e) => e.surfaceScore === 100);
  const score100Ratio = score100.length / Math.max(1, scoredEvents.length);
  results.push({
    name: "score_100_inflation",
    passed: score100Ratio <= 0.05,
    message: score100Ratio <= 0.05
      ? `Only ${(score100Ratio * 100).toFixed(1)}% of events have surfaceScore=100.`
      : `${(score100Ratio * 100).toFixed(1)}% of events have surfaceScore=100 (max cap inflation).`,
    detail: { count: score100.length, ratio: score100Ratio },
  });

  // 3. Correlation between surfaceScore and model probability should be high.
  const scores = scoredEvents.map((e) => e.surfaceScore / 100);
  const probs = scoredEvents.map((e) => e.surfaceModelProbability);
  const correlation = pearsonCorrelation(scores, probs);
  results.push({
    name: "score_prob_correlation",
    passed: correlation >= 0.80,
    message: correlation >= 0.80
      ? `surfaceScore/modelProbability correlation is ${correlation.toFixed(3)}.`
      : `surfaceScore/modelProbability correlation is ${correlation.toFixed(3)} (rules dominate model).`,
    detail: { correlation },
  });

  // 4. Human label threshold for improvement claims.
  const sourceCheckedHuman = labels.filter(
    (l) => l.labelSource === "human" && l.reviewContext?.sourceChecked === true
  ).length;
  results.push({
    name: "human_label_minimum",
    passed: sourceCheckedHuman >= 100,
    message: sourceCheckedHuman >= 100
      ? `${sourceCheckedHuman} source-checked human labels available.`
      : `Only ${sourceCheckedHuman} source-checked human labels; need 100 before improvement claims.`,
    detail: { sourceCheckedHuman, totalLabels: labels.length },
  });

  // 5. Model quality gate. Prefer supervised model if present, else champion.
  let modelToCheck = model;
  let modelPath = MODEL_PATH;
  try {
    const supervised = await readJson("data/models/escalation-model-supervised-latest.json");
    if (supervised?.metrics?.test?.auc) {
      modelToCheck = supervised;
      modelPath = "data/models/escalation-model-supervised-latest.json";
    }
  } catch {
    // keep champion
  }
  const testAuc = modelToCheck.metrics?.test?.auc;
  const testF1 = modelToCheck.metrics?.test?.f1;
  results.push({
    name: "model_quality_gate",
    passed: testAuc >= 0.80 && testF1 >= 0.70,
    message: testAuc >= 0.80 && testF1 >= 0.70
      ? `Escalation model meets quality gate (AUC=${testAuc}, F1=${testF1}) from ${modelPath}.`
      : `Escalation model below quality gate (AUC=${testAuc}, F1=${testF1}); target AUC>=0.80, F1>=0.70.`,
    detail: { testAuc, testF1, modelPath },
  });

  // 6. Policy label source must be honest.
  const labelSource = policy.labelSource;
  results.push({
    name: "policy_label_source",
    passed: labelSource !== "provisional_non_human" || sourceCheckedHuman < 100,
    message: labelSource === "provisional_non_human"
      ? "Policy correctly reports provisional_non_human label source."
      : `Policy label source is ${labelSource}.`,
    detail: { labelSource },
  });

  // 7. No events without surfaceScore should be presented as scored.
  const unscored = events.filter((e) => !Number.isFinite(e.surfaceScore));
  results.push({
    name: "unscored_events",
    passed: unscored.length === 0,
    message: unscored.length === 0
      ? "All events have a surfaceScore."
      : `${unscored.length} events lack surfaceScore and must display as Unscored in the UI.`,
    detail: { unscoredCount: unscored.length },
  });

  return results;
}

async function main() {
  const results = await validate();
  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;

  console.log("HopeIndexAI pipeline validation\n");
  for (const r of results) {
    const status = r.passed ? "PASS" : "FAIL";
    console.log(`[${status}] ${r.name}: ${r.message}`);
    if (r.detail) console.log(`         ${JSON.stringify(r.detail)}`);
  }
  console.log(`\n${passed} passed, ${failed} failed`);

  if (failed > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Validation failed with error:", err);
  process.exit(1);
});
