import { promises as fs } from "fs";
import { dirname, join } from "path";
import { sourceTierFromUrl } from "../lib/source_credibility.ts";

// Scalable full-dataset logistic regression trainer.
// Removes the 5,000-sample cap, uses mini-batch SGD, and reports feature importance.
// Writes a versioned model artifact to public/data/models/.

const MODEL_PREFIX = "escalation-model";
const MODEL_DIR = "public/data/models";
const CHAMPION_PATH = `${MODEL_DIR}/${MODEL_PREFIX}-champion.json`;
const EPOCHS = 500;
const LEARNING_RATE = 0.05;
const L2 = 0.005;
const BATCH_SIZE = 256;
const QUALITY_GATE = { auc: 0.80, f1: 0.35 };

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

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
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

  for (let epoch = 0; epoch < epochs; epoch++) {
    const shuffled = shuffle(rows);
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

function chooseThreshold(rows: TrainingRow[], weights: number[], bias: number): number {
  let best = 0.5;
  let bestF1 = 0;
  for (let t = 0.05; t <= 0.95; t += 0.01) {
    let tp = 0, fp = 0, fn = 0;
    for (const row of rows) {
      const z = bias + row.features.reduce((sum, v, i) => sum + v * weights[i], 0);
      const p = sigmoid(z);
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

function metrics(rows: TrainingRow[], weights: number[], bias: number, threshold: number) {
  let tp = 0, fp = 0, tn = 0, fn = 0;
  const probs: number[] = [];
  const actuals: number[] = [];

  for (const row of rows) {
    const z = bias + row.features.reduce((sum, v, i) => sum + v * weights[i], 0);
    const p = sigmoid(z);
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
  if (posProbs.length > MAX_AUC_SAMPLES) posProbs = shuffle(posProbs).slice(0, MAX_AUC_SAMPLES);
  if (negProbs.length > MAX_AUC_SAMPLES) negProbs = shuffle(negProbs).slice(0, MAX_AUC_SAMPLES);
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

  console.log(`[train_full] Training mini-batch logistic regression (${EPOCHS} epochs, batch ${BATCH_SIZE})...`);
  const { weights, bias } = trainMiniBatch(trainRows, EPOCHS, LEARNING_RATE, L2, BATCH_SIZE);

  console.log("[train_full] Choosing threshold and computing metrics...");
  const threshold = chooseThreshold(valRows, weights, bias);

  const trainMetrics = metrics(trainRows, weights, bias, threshold);
  const valMetrics = metrics(valRows, weights, bias, threshold);
  const testMetrics = metrics(testRows, weights, bias, threshold);

  // Feature importance = |weight * std| so it reflects input-scale contribution.
  const featureImportance = FEATURE_NAMES
    .map((name, i) => ({ name, importance: Math.abs(weights[i] * stds[i]) }))
    .sort((a, b) => b.importance - a.importance);

  const versionedPath = outputPath ?? (await nextVersionedPath());
  const versionMatch = versionedPath.match(/v(\d+)\.json$/);
  const versionNumber = versionMatch ? versionMatch[1] : "0";

  const model = {
    version: `escalation-logreg-full-v${versionNumber}`,
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
    featureNames: FEATURE_NAMES,
    preprocessing: { means: means.map(round), stds: stds.map(round) },
    model: {
      kind: "logistic_regression",
      bias: round(bias),
      weights: weights.map(round),
      threshold: round(threshold),
      l2: L2,
      epochs: EPOCHS,
      batchSize: BATCH_SIZE,
    },
    metrics: { train: trainMetrics, val: valMetrics, test: testMetrics },
    featureImportance,
    limitations: [
      "Pure-JS mini-batch logistic regression is an interim scalable learner; LightGBM/XGBoost is the planned production learner.",
      "Training labels mix UCDP organized-violence matches with human importance judgments.",
      "UCDP covers organized lethal violence only; other signal types are out of scope.",
    ],
  };

  await fs.mkdir(dirname(versionedPath) || ".", { recursive: true });
  await fs.writeFile(versionedPath, JSON.stringify(model, null, 2));
  console.log(`[train_full] Wrote ${versionedPath}`);

  const passesGate = testMetrics.auc >= QUALITY_GATE.auc && testMetrics.f1 >= QUALITY_GATE.f1;
  if (passesGate) {
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
