import { promises as fs } from "fs";
import { dirname, join } from "path";
import { sourceTierFromUrl } from "../lib/source_credibility.ts";

// Scalable full-dataset trainer.
// Default learner is a pure TypeScript gradient-boosted tree ensemble so the
// repo avoids brittle native LightGBM/XGBoost builds while keeping the artifact
// shape compatible with the API/eval scoring paths.
// Writes a versioned model artifact to public/data/models/.

const MODEL_PREFIX = "escalation-model";
const MODEL_DIR = "public/data/models";
const CHAMPION_PATH = `${MODEL_DIR}/${MODEL_PREFIX}-champion.json`;
const PREVIOUS_PATH = `${MODEL_DIR}/${MODEL_PREFIX}-previous.json`;
const EPOCHS = 500;
const LEARNING_RATE = 0.05;
const L2 = 0.005;
const BATCH_SIZE = 256;
const GBDT_TREES = 80;
const GBDT_LEARNING_RATE = 0.025;
const GBDT_MAX_DEPTH = 3;
const GBDT_MIN_SAMPLES_LEAF = 8;
const GBDT_L2 = 1.0;
const GBDT_MAX_BINS = 24;
const GBDT_MAX_LEAF_VALUE = 5;
const QUALITY_GATE = { auc: 0.80, f1: 0.35 };
const TRAINING_SEED = 20260620;

type LearnerKind = "gbdt" | "logreg";

interface GdeltEvent {
  id: string;
  lat: number;
  lon: number;
  category: "doom" | "bloom";
  theme?: string;
  hopeScore?: number;
  goldstein: number | null;
  quadClass: number | null;
  quadLabel: string;
  actor1: string;
  actor2: string;
  country: string;
  location: string;
  date: string;
  numMentions: number;
  avgTone: number | null;
  sourceUrl: string;
  markerRadius: number;
  severity: "low" | "medium" | "high" | "critical";
  continent: string;
  surfaceClusterSize?: number;
}

interface SupervisedLabel {
  eventId: string;
  date: string;
  countryCode: string;
  label: 0 | 1;
  labelSource: string;
  confidence: number;
  deathsBest: number;
  deathsTotal: number;
}

interface TrainingRow {
  event: GdeltEvent;
  features: number[];
  label: number;
}

interface TreeNode {
  featureIndex?: number;
  threshold?: number;
  left?: TreeNode;
  right?: TreeNode;
  value?: number;
  gain?: number;
}

interface SplitCandidate {
  featureIndex: number;
  threshold: number;
  gain: number;
}

const THEMES = ["Diplomacy", "Conflict", "Econ", "Environment", "Humanitarian", "Science"] as const;
const CONTINENTS = ["Americas", "Europe", "Middle East", "Africa", "Asia", "Oceania", "Other"] as const;
const QUADS = [1, 2, 3, 4] as const;

const FEATURE_NAMES = [
  "goldstein",
  "abs_goldstein",
  "avg_tone",
  "mentions_log",
  "hope_score",
  "is_doom",
  "is_critical",
  "is_high",
  "lat_abs",
  "has_actor2",
  ...THEMES.map((theme) => `theme_${theme}`),
  ...CONTINENTS.map((continent) => `continent_${continent.replace(/\s+/g, "_")}`),
  ...QUADS.map((quad) => `quad_${quad}`),
  "country_past3_count_log",
  "country_past3_doom_ratio",
  "country_past3_min_goldstein",
  "country_past3_avg_tone",
  "actor_past7_count_log",
  "actor_past7_doom_ratio",
  "actor_past7_min_goldstein",
  "theme_country_past7_count_log",
  "same_source_past7_count_log",
  "nearby_past3_count_log",
  "num_mentions",
  "source_tier",
  "duplicate_cluster_size",
];

const ACTOR_STOPWORDS = new Set([
  "UNKNOWN", "GOVERNMENT", "MINISTRY", "STATE", "STATES", "UNITED", "NATIONAL",
  "INTERNATIONAL", "OFFICIAL", "OFFICIALS", "POLICE", "ADMINISTRATION",
  "PRESIDENT", "PRIME", "MINISTER", "CITY", "COUNTY", "LOCAL",
]);

function sigmoid(z: number): number {
  if (z > 35) return 1;
  if (z < -35) return 0;
  return 1 / (1 + Math.exp(-z));
}

function round(n: number): number {
  return Number(n.toFixed(4));
}

function round6(n: number): number {
  return Number(n.toFixed(6));
}

function parseDay(date: string): number {
  const ms = Date.parse(date);
  return Number.isFinite(ms) ? Math.floor(ms / 86_400_000) : Number.NaN;
}

function actorTokens(e: GdeltEvent): Set<string> {
  const raw = `${e.actor1 ?? ""} ${e.actor2 ?? ""}`.toUpperCase();
  return new Set(
    raw
      .split(/[^A-Z0-9]+/)
      .filter((token) => token.length > 2 && !ACTOR_STOPWORDS.has(token))
  );
}

function sourceHost(url: string | undefined): string {
  if (!url) return "";
  try {
    return new URL(url).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return "";
  }
}

function distanceKm(a: GdeltEvent, b: GdeltEvent): number {
  const toRad = (n: number) => n * Math.PI / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}

function sharesActor(a: GdeltEvent, b: GdeltEvent): boolean {
  const aTokens = actorTokens(a);
  if (aTokens.size === 0) return false;
  for (const token of actorTokens(b)) {
    if (aTokens.has(token)) return true;
  }
  return false;
}

function buildDayIndex(events: GdeltEvent[]): Map<number, GdeltEvent[]> {
  const index = new Map<number, GdeltEvent[]>();
  for (const e of events) {
    const d = parseDay(e.date);
    if (!Number.isFinite(d)) continue;
    if (!index.has(d)) index.set(d, []);
    index.get(d)!.push(e);
  }
  return index;
}

function subsetPastIndexed(target: GdeltEvent, dayIndex: Map<number, GdeltEvent[]>, days: number): GdeltEvent[] {
  const day = parseDay(target.date);
  if (!Number.isFinite(day)) return [];
  const result: GdeltEvent[] = [];
  for (let d = day - days; d < day; d++) {
    const list = dayIndex.get(d);
    if (list) result.push(...list);
  }
  return result;
}

function doomRatio(events: GdeltEvent[]): number {
  return events.length ? events.filter((e) => e.category === "doom").length / events.length : 0;
}

function minGoldstein(events: GdeltEvent[]): number {
  const vals = events.map((e) => e.goldstein).filter((n): n is number => typeof n === "number" && Number.isFinite(n));
  return vals.length ? Math.min(...vals) : 0;
}

function avgTone(events: GdeltEvent[]): number {
  const vals = events.map((e) => e.avgTone).filter((n): n is number => typeof n === "number" && Number.isFinite(n));
  return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
}

function featuresFor(e: GdeltEvent, dayIndex: Map<number, GdeltEvent[]>): number[] {
  const past3 = subsetPastIndexed(e, dayIndex, 3);
  const past7 = subsetPastIndexed(e, dayIndex, 7);
  const countryPast3 = past3.filter((p) => p.country && p.country === e.country);
  const actorPast7 = past7.filter((p) => sharesActor(e, p));
  const themeCountryPast7 = past7.filter((p) => p.country === e.country && p.theme === e.theme);
  const host = sourceHost(e.sourceUrl);
  const sameSourcePast7 = host ? past7.filter((p) => sourceHost(p.sourceUrl) === host) : [];
  const nearbyPast3 = past3.filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lon) && distanceKm(e, p) <= 300);
  const continent = CONTINENTS.includes(e.continent as any) ? e.continent : "Other";

  return [
    e.goldstein ?? 0,
    Math.abs(e.goldstein ?? 0),
    e.avgTone ?? 0,
    Math.log1p(e.numMentions ?? 0),
    (e.hopeScore ?? 50) / 100,
    e.category === "doom" ? 1 : 0,
    e.severity === "critical" ? 1 : 0,
    e.severity === "high" ? 1 : 0,
    Math.abs(e.lat ?? 0) / 90,
    e.actor2 && e.actor2 !== "Unknown" ? 1 : 0,
    ...THEMES.map((theme) => e.theme === theme ? 1 : 0),
    ...CONTINENTS.map((c) => continent === c ? 1 : 0),
    ...QUADS.map((quad) => e.quadClass === quad ? 1 : 0),
    Math.log1p(countryPast3.length),
    doomRatio(countryPast3),
    minGoldstein(countryPast3),
    avgTone(countryPast3),
    Math.log1p(actorPast7.length),
    doomRatio(actorPast7),
    minGoldstein(actorPast7),
    Math.log1p(themeCountryPast7.length),
    Math.log1p(sameSourcePast7.length),
    Math.log1p(nearbyPast3.length),
    e.numMentions ?? 0,
    sourceTierFromUrl(e.sourceUrl),
    e.surfaceClusterSize ?? 1,
  ];
}

function standardize(rows: TrainingRow[], trainRows: TrainingRow[]) {
  const means = FEATURE_NAMES.map((_, i) =>
    trainRows.reduce((sum, row) => sum + row.features[i], 0) / trainRows.length
  );
  const stds = FEATURE_NAMES.map((_, i) => {
    const variance = trainRows.reduce((sum, row) => sum + (row.features[i] - means[i]) ** 2, 0) / trainRows.length;
    return Math.sqrt(variance) || 1;
  });

  for (const row of rows) {
    row.features = row.features.map((v, i) => (v - means[i]) / stds[i]);
  }

  return { means, stds };
}

function createSeededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

function shuffle<T>(arr: T[], random: () => number): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function trainMiniBatch(rows: TrainingRow[], epochs: number, lr: number, l2: number, batchSize: number) {
  const positive = rows.filter((r) => r.label === 1).length;
  const negative = rows.length - positive;
  const posWeight = rows.length / (2 * Math.max(1, positive));
  const negWeight = rows.length / (2 * Math.max(1, negative));

  const weights = Array(FEATURE_NAMES.length).fill(0);
  let bias = Math.log((positive + 1) / (negative + 1));
  const random = createSeededRandom(TRAINING_SEED);

  for (let epoch = 0; epoch < epochs; epoch++) {
    const shuffled = shuffle(rows, random);
    for (let i = 0; i < shuffled.length; i += batchSize) {
      const batch = shuffled.slice(i, i + batchSize);
      const grads = Array(FEATURE_NAMES.length).fill(0);
      let biasGrad = 0;

      for (const row of batch) {
        const z = bias + row.features.reduce((sum, v, j) => sum + v * weights[j], 0);
        const p = sigmoid(z);
        const weight = row.label === 1 ? posWeight : negWeight;
        const err = (p - row.label) * weight;
        biasGrad += err;
        for (let j = 0; j < weights.length; j++) {
          grads[j] += err * row.features[j];
        }
      }

      bias -= lr * (biasGrad / batch.length);
      for (let j = 0; j < weights.length; j++) {
        const penalty = l2 * weights[j];
        weights[j] -= lr * (grads[j] / batch.length + penalty);
      }
    }
  }

  return { weights, bias };
}

function logregLogit(features: number[], weights: number[], bias: number): number {
  return bias + features.reduce((sum, v, i) => sum + v * weights[i], 0);
}

function logregProbability(features: number[], weights: number[], bias: number): number {
  return sigmoid(logregLogit(features, weights, bias));
}

function treeValue(node: TreeNode, features: number[]): number {
  if (typeof node.value === "number") return node.value;
  const index = node.featureIndex ?? -1;
  const threshold = node.threshold ?? 0;
  if (index < 0) return 0;
  return features[index] <= threshold
    ? treeValue(node.left ?? { value: 0 }, features)
    : treeValue(node.right ?? { value: 0 }, features);
}

function gbdtProbability(
  features: number[],
  model: { baseScore: number; learningRate: number; trees: TreeNode[]; linearBase?: { bias: number; weights: number[] } }
): number {
  const linearLogit = model.linearBase ? logregLogit(features, model.linearBase.weights, model.linearBase.bias) : 0;
  const logit = model.baseScore + linearLogit + model.trees.reduce((sum, tree) => sum + model.learningRate * treeValue(tree, features), 0);
  return sigmoid(logit);
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

function splitThresholds(rows: TrainingRow[], indices: number[], featureIndex: number): number[] {
  const values = indices
    .map((index) => rows[index].features[featureIndex])
    .filter((value) => Number.isFinite(value))
    .sort((a, b) => a - b);
  const unique = Array.from(new Set(values));
  if (unique.length <= 1) return [];

  const bins = Math.min(GBDT_MAX_BINS, unique.length - 1);
  const thresholds = new Set<number>();
  for (let bin = 1; bin <= bins; bin++) {
    const q = Math.floor((bin * unique.length) / (bins + 1));
    const rightIndex = Math.min(unique.length - 1, Math.max(1, q));
    const left = unique[rightIndex - 1];
    const right = unique[rightIndex];
    if (right > left) thresholds.add((left + right) / 2);
  }
  return [...thresholds];
}

function splitGain(leftG: number, leftH: number, rightG: number, rightH: number, totalG: number, totalH: number): number {
  return (leftG ** 2) / (leftH + GBDT_L2) +
    (rightG ** 2) / (rightH + GBDT_L2) -
    (totalG ** 2) / (totalH + GBDT_L2);
}

function findBestSplit(
  rows: TrainingRow[],
  indices: number[],
  gradients: number[],
  hessians: number[],
  totalG: number,
  totalH: number
): SplitCandidate | null {
  let best: SplitCandidate | null = null;

  for (let featureIndex = 0; featureIndex < FEATURE_NAMES.length; featureIndex++) {
    const thresholds = splitThresholds(rows, indices, featureIndex);
    for (const threshold of thresholds) {
      let leftG = 0;
      let leftH = 0;
      let leftCount = 0;
      for (const index of indices) {
        if (rows[index].features[featureIndex] <= threshold) {
          leftG += gradients[index];
          leftH += hessians[index];
          leftCount++;
        }
      }
      const rightCount = indices.length - leftCount;
      if (leftCount < GBDT_MIN_SAMPLES_LEAF || rightCount < GBDT_MIN_SAMPLES_LEAF) continue;
      const rightG = totalG - leftG;
      const rightH = totalH - leftH;
      const gain = splitGain(leftG, leftH, rightG, rightH, totalG, totalH);
      if (!best || gain > best.gain) best = { featureIndex, threshold, gain };
    }
  }

  return best && best.gain > 1e-8 ? best : null;
}

function buildTree(
  rows: TrainingRow[],
  indices: number[],
  gradients: number[],
  hessians: number[],
  depth: number,
  featureGains: number[]
): TreeNode {
  const totalG = indices.reduce((sum, index) => sum + gradients[index], 0);
  const totalH = indices.reduce((sum, index) => sum + hessians[index], 0);
  const leafValue = clamp(totalG / (totalH + GBDT_L2), -GBDT_MAX_LEAF_VALUE, GBDT_MAX_LEAF_VALUE);

  if (depth >= GBDT_MAX_DEPTH || indices.length < GBDT_MIN_SAMPLES_LEAF * 2) {
    return { value: leafValue };
  }

  const split = findBestSplit(rows, indices, gradients, hessians, totalG, totalH);
  if (!split) return { value: leafValue };

  const leftIndices: number[] = [];
  const rightIndices: number[] = [];
  for (const index of indices) {
    if (rows[index].features[split.featureIndex] <= split.threshold) leftIndices.push(index);
    else rightIndices.push(index);
  }
  if (leftIndices.length < GBDT_MIN_SAMPLES_LEAF || rightIndices.length < GBDT_MIN_SAMPLES_LEAF) {
    return { value: leafValue };
  }

  featureGains[split.featureIndex] += split.gain;
  return {
    featureIndex: split.featureIndex,
    threshold: split.threshold,
    gain: split.gain,
    left: buildTree(rows, leftIndices, gradients, hessians, depth + 1, featureGains),
    right: buildTree(rows, rightIndices, gradients, hessians, depth + 1, featureGains),
  };
}

function roundTree(node: TreeNode): TreeNode {
  if (typeof node.value === "number") return { value: round6(node.value) };
  return {
    featureIndex: node.featureIndex,
    threshold: round6(node.threshold ?? 0),
    gain: round6(node.gain ?? 0),
    left: node.left ? roundTree(node.left) : { value: 0 },
    right: node.right ? roundTree(node.right) : { value: 0 },
  };
}

function trainGbdt(rows: TrainingRow[], initialScores?: number[]) {
  const positive = rows.filter((r) => r.label === 1).length;
  const negative = rows.length - positive;
  const posWeight = rows.length / (2 * Math.max(1, positive));
  const negWeight = rows.length / (2 * Math.max(1, negative));
  const baseScore = initialScores ? 0 : Math.log((positive + 1) / (negative + 1));
  const scores = initialScores ? [...initialScores] : Array(rows.length).fill(baseScore);
  const trees: TreeNode[] = [];
  const featureGains = Array(FEATURE_NAMES.length).fill(0);
  const allIndices = rows.map((_, index) => index);

  for (let iteration = 0; iteration < GBDT_TREES; iteration++) {
    const gradients = Array(rows.length).fill(0);
    const hessians = Array(rows.length).fill(0);
    for (let i = 0; i < rows.length; i++) {
      const p = sigmoid(scores[i]);
      const weight = rows[i].label === 1 ? posWeight : negWeight;
      gradients[i] = weight * (rows[i].label - p);
      hessians[i] = Math.max(1e-6, weight * p * (1 - p));
    }

    const tree = buildTree(rows, allIndices, gradients, hessians, 0, featureGains);
    trees.push(tree);
    for (let i = 0; i < rows.length; i++) {
      scores[i] += GBDT_LEARNING_RATE * treeValue(tree, rows[i].features);
    }
  }

  return {
    baseScore,
    learningRate: GBDT_LEARNING_RATE,
    trees,
    roundedTrees: trees.map(roundTree),
    featureGains,
  };
}

function chooseThreshold(rows: TrainingRow[], predict: (features: number[]) => number): number {
  let best = 0.5;
  let bestF1 = 0;
  for (let t = 0.05; t <= 0.95; t += 0.01) {
    let tp = 0, fp = 0, fn = 0;
    for (const row of rows) {
      const p = predict(row.features);
      const pred = p >= t ? 1 : 0;
      if (pred === 1 && row.label === 1) tp++;
      else if (pred === 1 && row.label === 0) fp++;
      else if (pred === 0 && row.label === 1) fn++;
    }
    const f1 = tp + fp + fn === 0 ? 0 : (2 * tp) / (2 * tp + fp + fn);
    if (f1 > bestF1) {
      bestF1 = f1;
      best = t;
    }
  }
  return best;
}

function metrics(rows: TrainingRow[], predict: (features: number[]) => number, threshold: number) {
  let tp = 0, fp = 0, tn = 0, fn = 0;
  const probs: number[] = [];
  const actuals: number[] = [];

  for (const row of rows) {
    const p = predict(row.features);
    const pred = p >= threshold ? 1 : 0;
    probs.push(p);
    actuals.push(row.label);
    if (pred === 1 && row.label === 1) tp++;
    else if (pred === 1 && row.label === 0) fp++;
    else if (pred === 0 && row.label === 1) fn++;
    else if (pred === 0 && row.label === 0) tn++;
  }

  const positives = tp + fn;
  const negatives = tn + fp;
  const accuracy = (tp + tn) / rows.length;
  const precision = tp + fp === 0 ? 0 : tp / (tp + fp);
  const recall = positives === 0 ? 0 : tp / positives;
  const specificity = negatives === 0 ? 0 : tn / negatives;
  const f1 = precision + recall === 0 ? 0 : (2 * precision * recall) / (precision + recall);

  let posProbs = probs.filter((_, i) => actuals[i] === 1);
  let negProbs = probs.filter((_, i) => actuals[i] === 0);
  const MAX_AUC_SAMPLES = 5_000;
  const random = createSeededRandom(TRAINING_SEED + rows.length);
  if (posProbs.length > MAX_AUC_SAMPLES) posProbs = shuffle(posProbs, random).slice(0, MAX_AUC_SAMPLES);
  if (negProbs.length > MAX_AUC_SAMPLES) negProbs = shuffle(negProbs, random).slice(0, MAX_AUC_SAMPLES);
  let concordant = 0, ties = 0;
  for (const pp of posProbs) {
    for (const np of negProbs) {
      if (pp > np) concordant++;
      else if (pp === np) ties++;
    }
  }
  const auc = (concordant + ties / 2) / (posProbs.length * negProbs.length || 1);

  return {
    samples: rows.length,
    positives,
    negatives,
    baseRate: positives / rows.length,
    threshold,
    accuracy,
    precision,
    recall,
    specificity,
    f1,
    auc,
    confusion: { tp, fp, tn, fn },
  };
}

async function nextVersionedPath(): Promise<string> {
  await fs.mkdir(MODEL_DIR, { recursive: true });
  const files = await fs.readdir(MODEL_DIR).catch(() => [] as string[]);
  const versions = files
    .map((f) => f.match(new RegExp(`^${MODEL_PREFIX}-v(\\d+)\\.json$`)))
    .filter(Boolean)
    .map((m) => parseInt(m![1], 10));
  const next = (versions.length ? Math.max(...versions) : 0) + 1;
  return `${MODEL_DIR}/${MODEL_PREFIX}-v${next}.json`;
}

async function main() {
  const args = process.argv.slice(2);
  const eventsPath = args.find((a) => a.startsWith("--events="))?.slice("--events=".length) ?? "public/data/events.json";
  const labelsPath = args.find((a) => a.startsWith("--labels="))?.slice("--labels=".length) ?? "data/training/supervised_labels.jsonl";
  const outputPath = args.find((a) => a.startsWith("--output="))?.slice("--output=".length);
  const learner = (args.find((a) => a.startsWith("--learner="))?.slice("--learner=".length) ?? "gbdt") as LearnerKind;
  if (!(["gbdt", "logreg"] as LearnerKind[]).includes(learner)) {
    console.error(`[train_full] Unsupported --learner=${learner}. Use --learner=gbdt or --learner=logreg.`);
    process.exit(1);
  }

  console.log(`[train_full] Loading events from ${eventsPath}...`);
  const raw = JSON.parse(await fs.readFile(eventsPath, "utf8"));
  const allEvents: GdeltEvent[] = raw.events ?? [];
  console.log(`[train_full] Loaded ${allEvents.length} events.`);

  let labels: SupervisedLabel[] = [];
  try {
    const text = await fs.readFile(labelsPath, "utf8");
    labels = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean).map((l) => JSON.parse(l));
  } catch (err: any) {
    if (err.code !== "ENOENT") throw err;
    console.error(`[train_full] No labels at ${labelsPath}. Run: bun run labels:build`);
    process.exit(1);
  }
  console.log(`[train_full] Loaded ${labels.length} labels.`);

  const labelById = new Map(labels.map((l) => [l.eventId, l]));
  let labeledEvents = allEvents.filter((e) => labelById.has(e.id));
  labeledEvents.sort((a, b) => parseDay(a.date) - parseDay(b.date));

  if (labeledEvents.length < 100) {
    console.error(`[train_full] Only ${labeledEvents.length} labeled events; need at least 100.`);
    process.exit(1);
  }

  console.log(`[train_full] Training on ${labeledEvents.length} labeled events.`);

  const dayIndex = buildDayIndex(allEvents);
  const rows: TrainingRow[] = labeledEvents.map((event) => ({
    event,
    features: featuresFor(event, dayIndex),
    label: labelById.get(event.id)!.label,
  }));

  const n = rows.length;
  const trainEnd = Math.floor(n * 0.7);
  const valEnd = Math.floor(n * 0.85);
  const trainRows = rows.slice(0, trainEnd);
  const valRows = rows.slice(trainEnd, valEnd);
  const testRows = rows.slice(valEnd);

  console.log("[train_full] Standardizing features...");
  const { means, stds } = standardize([...trainRows, ...valRows, ...testRows], trainRows);

  console.log(`[train_full] Training ${learner === "gbdt" ? "gradient-boosted trees" : "mini-batch logistic regression"}...`);
  let predict: (features: number[]) => number;
  let modelBody: Record<string, unknown>;
  let learnerVersionName: string;
  let featureImportance: Array<{ name: string; importance: number }>;

  if (learner === "gbdt") {
    // Initialize from the stable linear learner, then fit shallow trees to the
    // remaining logistic-loss gradients. This keeps ranking quality from the
    // current model while adding non-linear corrections.
    const linearBase = trainMiniBatch(trainRows, EPOCHS, LEARNING_RATE, L2, BATCH_SIZE);
    const initialScores = trainRows.map((row) => logregLogit(row.features, linearBase.weights, linearBase.bias));
    const boosted = trainGbdt(trainRows, initialScores);
    const boostedWithLinearBase = { ...boosted, linearBase };
    predict = (features) => gbdtProbability(features, boostedWithLinearBase);
    learnerVersionName = "escalation-gbdt-full";
    modelBody = {
      kind: "gradient_boosted_trees",
      baseScore: round6(boosted.baseScore),
      linearBase: {
        bias: round(linearBase.bias),
        weights: linearBase.weights.map(round),
      },
      learningRate: boosted.learningRate,
      trees: boosted.roundedTrees,
      threshold: 0.5,
      iterations: GBDT_TREES,
      maxDepth: GBDT_MAX_DEPTH,
      minSamplesLeaf: GBDT_MIN_SAMPLES_LEAF,
      maxBins: GBDT_MAX_BINS,
      l2: GBDT_L2,
    };
    featureImportance = FEATURE_NAMES
      .map((name, i) => ({ name, importance: round6(boosted.featureGains[i] ?? 0) }))
      .sort((a, b) => b.importance - a.importance);
  } else {
    const { weights, bias } = trainMiniBatch(trainRows, EPOCHS, LEARNING_RATE, L2, BATCH_SIZE);
    predict = (features) => logregProbability(features, weights, bias);
    learnerVersionName = "escalation-logreg-full";
    modelBody = {
      kind: "logistic_regression",
      bias: round(bias),
      weights: weights.map(round),
      threshold: 0.5,
      l2: L2,
      epochs: EPOCHS,
      batchSize: BATCH_SIZE,
    };
    // Feature importance = |weight * std| so it reflects input-scale contribution.
    featureImportance = FEATURE_NAMES
      .map((name, i) => ({ name, importance: Math.abs(weights[i] * stds[i]) }))
      .sort((a, b) => b.importance - a.importance);
  }

  console.log("[train_full] Choosing threshold and computing metrics...");
  const threshold = chooseThreshold(valRows, predict);
  modelBody.threshold = round(threshold);

  const trainMetrics = metrics(trainRows, predict, threshold);
  const valMetrics = metrics(valRows, predict, threshold);
  const testMetrics = metrics(testRows, predict, threshold);

  const versionedPath = outputPath ?? (await nextVersionedPath());
  const versionMatch = versionedPath.match(/v(\d+)\.json$/);
  const versionNumber = versionMatch ? versionMatch[1] : "0";

  const model = {
    version: `${learnerVersionName}-v${versionNumber}`,
    trainedAt: new Date().toISOString(),
    target: {
      name: "ucdp_organized_violence_match",
      definition: "1 when the GDELT event matches a lethal UCDP organized-violence event within +/-3 days and 300 km, or is human-labeled important.",
      horizonDays: 0,
      labelSource: "UCDP GED + Candidate + source-checked Phase 1 human labels.",
    },
    data: {
      sourceUpdated: raw.updated,
      totalEvents: allEvents.length,
      labeledEvents: labeledEvents.length,
      trainSamples: trainRows.length,
      valSamples: valRows.length,
      testSamples: testRows.length,
    },
    training: {
      seed: TRAINING_SEED,
      learner,
      command: "bun run labels:build && bun run train:full",
    },
    featureNames: FEATURE_NAMES,
    preprocessing: { means: means.map(round), stds: stds.map(round) },
    model: modelBody,
    metrics: { train: trainMetrics, val: valMetrics, test: testMetrics },
    featureImportance,
    limitations: [
      learner === "gbdt"
        ? "Pure-TypeScript gradient-boosted trees approximate a LightGBM/XGBoost-class learner without native build dependencies."
        : "Pure-JS mini-batch logistic regression is retained as a fallback learner.",
      "Training labels mix UCDP organized-violence matches with human importance judgments.",
      "UCDP covers organized lethal violence only; other signal types are out of scope.",
    ],
  };

  await fs.mkdir(dirname(versionedPath) || ".", { recursive: true });
  await fs.writeFile(versionedPath, JSON.stringify(model, null, 2));
  console.log(`[train_full] Wrote ${versionedPath}`);

  const passesGate = testMetrics.auc >= QUALITY_GATE.auc && testMetrics.f1 >= QUALITY_GATE.f1;
  if (passesGate) {
    try {
      await fs.copyFile(CHAMPION_PATH, PREVIOUS_PATH);
      console.log(`[train_full] Backed up previous champion to ${PREVIOUS_PATH}`);
    } catch {
      // No prior champion yet.
    }
    await fs.copyFile(versionedPath, CHAMPION_PATH);
    console.log(`[train_full] Promoted to champion ${CHAMPION_PATH} (AUC ${testMetrics.auc}, F1 ${testMetrics.f1})`);
  } else {
    console.log(`[train_full] Did not promote (AUC ${testMetrics.auc}, F1 ${testMetrics.f1} below gate)`);
  }

  console.log(JSON.stringify({ train: trainMetrics, val: valMetrics, test: testMetrics }, null, 2));
}

main().catch((err) => {
  console.error("[train_full] failed:", err);
  process.exit(1);
});
