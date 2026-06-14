import { promises as fs } from "fs";

const MODEL_VERSION = "escalation-logreg-supervised-v1";
const EPOCHS = 1_200;
const LEARNING_RATE = 0.035;
const L2 = 0.01; // Slightly stronger regularization for stability
const MAX_TRAINING_SAMPLES = 15_000; // Cap to keep feature extraction/train fast

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
  surfaceScore?: number;
  surfaceModelProbability?: number;
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
  "ucdp_deaths_best_log",
  "ucdp_confidence",
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

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
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

function subsetPast(target: GdeltEvent, events: GdeltEvent[], days: number): GdeltEvent[] {
  const day = parseDay(target.date);
  return events.filter((e) => {
    const d = parseDay(e.date);
    return Number.isFinite(d) && d < day && day - d <= days;
  });
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

function subsetPastIndexed(
  target: GdeltEvent,
  dayIndex: Map<number, GdeltEvent[]>,
  days: number
): GdeltEvent[] {
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
  if (events.length === 0) return 0;
  return events.filter((e) => e.category === "doom").length / events.length;
}

function minGoldstein(events: GdeltEvent[]): number {
  const vals = events.map((e) => e.goldstein).filter((n): n is number => typeof n === "number" && Number.isFinite(n));
  return vals.length ? Math.min(...vals) : 0;
}

function avgTone(events: GdeltEvent[]): number {
  const vals = events.map((e) => e.avgTone).filter((n): n is number => typeof n === "number" && Number.isFinite(n));
  return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
}

function featuresFor(
  e: GdeltEvent,
  events: GdeltEvent[],
  dayIndex: Map<number, GdeltEvent[]>,
  label?: SupervisedLabel
): number[] {
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
    Math.log1p((label?.deathsBest ?? 0) + 1),
    label?.confidence ?? 0,
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
    row.features = row.features.map((value, i) => (value - means[i]) / stds[i]);
  }

  return { means, stds };
}

function trainLogReg(rows: TrainingRow[]) {
  const positive = rows.filter((r) => r.label === 1).length;
  const negative = rows.length - positive;
  const posWeight = rows.length / (2 * Math.max(1, positive));
  const negWeight = rows.length / (2 * Math.max(1, negative));
  const weights = Array(FEATURE_NAMES.length).fill(0);
  let bias = Math.log((positive + 1) / (negative + 1));

  const logInterval = Math.max(1, Math.floor(EPOCHS / 10));
  for (let epoch = 0; epoch < EPOCHS; epoch++) {
    const grad = Array(FEATURE_NAMES.length).fill(0);
    let biasGrad = 0;

    for (const row of rows) {
      const z = bias + row.features.reduce((sum, value, i) => sum + value * weights[i], 0);
      const p = sigmoid(z);
      const sampleWeight = row.label === 1 ? posWeight : negWeight;
      const err = (p - row.label) * sampleWeight;
      biasGrad += err;
      for (let i = 0; i < weights.length; i++) grad[i] += err * row.features[i];
    }

    bias -= LEARNING_RATE * biasGrad / rows.length;
    for (let i = 0; i < weights.length; i++) {
      const penalty = L2 * weights[i];
      weights[i] -= LEARNING_RATE * (grad[i] / rows.length + penalty);
    }

    if (epoch % logInterval === 0) {
      console.log(`  epoch ${epoch}/${EPOCHS}`);
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
      const z = bias + row.features.reduce((sum, value, i) => sum + value * weights[i], 0);
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
    const z = bias + row.features.reduce((sum, value, i) => sum + value * weights[i], 0);
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
  const recall = tp + fn === 0 ? 0 : tp / (tp + fn);
  const specificity = tn + fp === 0 ? 0 : tn / (tn + fp);
  const f1 = precision + recall === 0 ? 0 : (2 * precision * recall) / (precision + recall);

  // AUC by Mann-Whitney U with sampling for large sets
  let posProbs = probs.filter((_, i) => actuals[i] === 1);
  let negProbs = probs.filter((_, i) => actuals[i] === 0);
  const MAX_AUC_SAMPLES = 5_000;
  if (posProbs.length > MAX_AUC_SAMPLES) {
    posProbs = posProbs.sort(() => Math.random() - 0.5).slice(0, MAX_AUC_SAMPLES);
  }
  if (negProbs.length > MAX_AUC_SAMPLES) {
    negProbs = negProbs.sort(() => Math.random() - 0.5).slice(0, MAX_AUC_SAMPLES);
  }
  let concordant = 0;
  let ties = 0;
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

function parseArgs(): { eventsPath: string; labelsPath: string; outputPath: string; maxSamples: number } {
  const args = process.argv.slice(2);
  let eventsPath = "public/data/events.json";
  let labelsPath = "data/training/supervised_labels.jsonl";
  let outputPath = "public/data/escalation-model-supervised.json";
  let maxSamples = MAX_TRAINING_SAMPLES;

  for (const arg of args) {
    if (arg.startsWith("--events=")) eventsPath = arg.slice("--events=".length);
    if (arg.startsWith("--labels=")) labelsPath = arg.slice("--labels=".length);
    if (arg.startsWith("--output=")) outputPath = arg.slice("--output=".length);
    if (arg.startsWith("--max-samples=")) maxSamples = parseInt(arg.slice("--max-samples=".length), 10);
  }

  return { eventsPath, labelsPath, outputPath, maxSamples };
}

async function main() {
  const { eventsPath, labelsPath, outputPath, maxSamples } = parseArgs();
  console.log(`Loading events from ${eventsPath}...`);
  const raw = JSON.parse(await fs.readFile(eventsPath, "utf8"));
  const allEvents: GdeltEvent[] = raw.events ?? [];
  console.log(`Loaded ${allEvents.length} events.`);

  let labels: SupervisedLabel[] = [];
  try {
    const text = await fs.readFile(labelsPath, "utf8");
    labels = text
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => JSON.parse(line));
  } catch (err: any) {
    if (err.code !== "ENOENT") throw err;
    console.error(`No supervised labels found at ${labelsPath}. Run: bun run labels:build`);
    process.exit(1);
  }
  console.log(`Loaded ${labels.length} supervised labels.`);

  const labelById = new Map(labels.map((l) => [l.eventId, l]));

  // Only train on events that have a supervised label and enough history
  let labeledEvents = allEvents.filter((e) => labelById.has(e.id));
  labeledEvents.sort((a, b) => parseDay(a.date) - parseDay(b.date));

  if (labeledEvents.length < 100) {
    console.error(`Only ${labeledEvents.length} labeled events; need at least 100 to train.`);
    process.exit(1);
  }

  // Sample if too many labeled events. For very imbalanced data, balance the
  // training set by using all positives and an equal number of negatives.
  const positives = labeledEvents.filter((e) => labelById.get(e.id)!.label === 1);
  const negatives = labeledEvents.filter((e) => labelById.get(e.id)!.label === 0);
  const sampleCap = Math.min(maxSamples, MAX_TRAINING_SAMPLES);

  if (labeledEvents.length > sampleCap || positives.length < negatives.length / 5) {
    // Balance: use all positives up to cap/2, fill rest with negatives
    const targetPos = Math.min(positives.length, Math.floor(sampleCap / 2));
    const targetNeg = Math.min(negatives.length, sampleCap - targetPos);

    function sampleOrdered(events: GdeltEvent[], target: number): GdeltEvent[] {
      if (events.length <= target) return events;
      const step = events.length / target;
      const sampled: GdeltEvent[] = [];
      for (let i = 0; i < target; i++) {
        sampled.push(events[Math.floor(i * step)]);
      }
      return sampled;
    }

    labeledEvents = [...sampleOrdered(positives, targetPos), ...sampleOrdered(negatives, targetNeg)];
    labeledEvents.sort((a, b) => parseDay(a.date) - parseDay(b.date));
    console.log(`Sampled to ${labeledEvents.length} events (${targetPos} pos, ${targetNeg} neg) for training.`);
  }

  console.log("Building day index...");
  const dayIndex = buildDayIndex(allEvents);

  console.log("Extracting features...");
  const rows: TrainingRow[] = [];
  for (let i = 0; i < labeledEvents.length; i++) {
    const event = labeledEvents[i];
    if (i % 1000 === 0) console.log(`  ${i}/${labeledEvents.length}`);
    rows.push({
      event,
      features: featuresFor(event, allEvents, dayIndex, labelById.get(event.id)),
      label: labelById.get(event.id)!.label,
    });
  }

  // Temporal split: 60% train, 20% validation, 20% test
  const n = rows.length;
  const trainEnd = Math.floor(n * 0.6);
  const valEnd = Math.floor(n * 0.8);
  const trainRows = rows.slice(0, trainEnd);
  const valRows = rows.slice(trainEnd, valEnd);
  const testRows = rows.slice(valEnd);

  console.log("Standardizing features...");
  const { means, stds } = standardize([...trainRows, ...valRows, ...testRows], trainRows);

  console.log(`Training logistic regression on ${trainRows.length} rows...`);
  const { weights, bias } = trainLogReg(trainRows);

  console.log("Choosing threshold and computing metrics...");
  const threshold = chooseThreshold(valRows, weights, bias);

  const trainMetrics = metrics(trainRows, weights, bias, threshold);
  const valMetrics = metrics(valRows, weights, bias, threshold);
  const testMetrics = metrics(testRows, weights, bias, threshold);

  const model = {
    version: MODEL_VERSION,
    trainedAt: new Date().toISOString(),
    target: {
      name: "ucdp_organized_violence_match",
      definition: "1 when the GDELT event matches a lethal UCDP organized-violence event within +/-3 days and 300 km.",
      horizonDays: 0,
      labelSource: "UCDP GED + Candidate autonomous matching. Not human-reviewed importance.",
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
    },
    metrics: {
      train: trainMetrics,
      val: valMetrics,
      test: testMetrics,
    },
    limitations: [
      "Labels are UCDP matches, not human analyst importance judgments.",
      "UCDP covers organized lethal violence only; diplomacy/economy/humanitarian signals may be underrepresented.",
      "Temporal split is used, but evaluation is still internal to the same data epoch.",
    ],
  };

  await fs.mkdir(outputPath.split("/").slice(0, -1).join("/") || ".", { recursive: true });
  await fs.writeFile(outputPath, JSON.stringify(model, null, 2));

  console.log(`HopeIndexAI Supervised Training -> wrote ${outputPath}`);
  console.log(JSON.stringify({ train: trainMetrics, val: valMetrics, test: testMetrics }, null, 2));
}

main().catch((err) => {
  console.error("HopeIndexAI Supervised Training -> failed:", err);
  process.exit(1);
});
