import { promises as fs } from "fs";

type Theme = "Diplomacy" | "Conflict" | "Econ" | "Environment" | "Humanitarian" | "Science";

interface GdeltEvent {
  id: string;
  lat: number;
  lon: number;
  category: "doom" | "bloom";
  theme?: Theme;
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
}

interface TrainingRow {
  event: GdeltEvent;
  features: number[];
  label: number;
}

const MODEL_VERSION = "escalation-logreg-v1";
const HORIZON_DAYS = 3;
const MIN_DAILY_EVENTS = 20;
const EPOCHS = 1_200;
const LEARNING_RATE = 0.035;
const L2 = 0.001;

const THEMES = ["Diplomacy", "Conflict", "Econ", "Environment", "Humanitarian", "Science"] as const;
const CONTINENTS = ["Americas", "Europe", "Middle East", "Africa", "Asia", "Oceania", "Other"] as const;
const QUADS = [1, 2, 3, 4] as const;

const ACTOR_STOPWORDS = new Set([
  "UNKNOWN", "GOVERNMENT", "MINISTRY", "STATE", "STATES", "UNITED", "NATIONAL",
  "INTERNATIONAL", "OFFICIAL", "OFFICIALS", "POLICE", "ADMINISTRATION",
  "PRESIDENT", "PRIME", "MINISTER", "CITY", "COUNTY", "LOCAL",
]);

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
];

function sigmoid(z: number): number {
  if (z > 35) return 1;
  if (z < -35) return 0;
  return 1 / (1 + Math.exp(-z));
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
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

function relationStrength(a: GdeltEvent, b: GdeltEvent): number {
  let score = 0;
  if (a.country && a.country === b.country) score += 2;
  if (a.theme && a.theme === b.theme) score += 1;
  if (sharesActor(a, b)) score += 3;
  if (sourceHost(a.sourceUrl) && sourceHost(a.sourceUrl) === sourceHost(b.sourceUrl)) score += 1;
  if (Number.isFinite(a.lat) && Number.isFinite(a.lon) && Number.isFinite(b.lat) && Number.isFinite(b.lon) && distanceKm(a, b) <= 300) {
    score += 1;
  }
  return score;
}

function isEscalationEvent(e: GdeltEvent): boolean {
  return e.category === "doom" && (e.goldstein ?? 0) <= -7 && e.severity === "critical";
}

function hasFutureEscalation(target: GdeltEvent, events: GdeltEvent[]): number {
  const day = parseDay(target.date);
  if (!Number.isFinite(day)) return 0;

  for (const future of events) {
    if (future.id === target.id) continue;
    const futureDay = parseDay(future.date);
    if (!Number.isFinite(futureDay)) continue;
    const delta = futureDay - day;
    if (delta <= 0 || delta > HORIZON_DAYS) continue;
    if (!isEscalationEvent(future)) continue;
    if (relationStrength(target, future) >= 5) return 1;
  }

  return 0;
}

function subsetPast(target: GdeltEvent, events: GdeltEvent[], days: number): GdeltEvent[] {
  const day = parseDay(target.date);
  return events.filter((e) => {
    const d = parseDay(e.date);
    return Number.isFinite(d) && d < day && day - d <= days;
  });
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

function featuresFor(e: GdeltEvent, events: GdeltEvent[]): number[] {
  const past3 = subsetPast(e, events, 3);
  const past7 = subsetPast(e, events, 7);
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
  ];
}

function standardize(rows: TrainingRow[], trainRows: TrainingRow[]) {
  const means = FEATURE_NAMES.map((_, i) => trainRows.reduce((sum, row) => sum + row.features[i], 0) / trainRows.length);
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
  }

  return { weights, bias };
}

function predict(row: TrainingRow, weights: number[], bias: number): number {
  return sigmoid(bias + row.features.reduce((sum, value, i) => sum + value * weights[i], 0));
}

function auc(scored: Array<{ y: number; p: number }>): number {
  const sorted = [...scored].sort((a, b) => a.p - b.p);
  let rankSum = 0;
  let positives = 0;
  let negatives = 0;

  for (let i = 0; i < sorted.length; i++) {
    if (sorted[i].y === 1) {
      positives++;
      rankSum += i + 1;
    } else {
      negatives++;
    }
  }

  if (positives === 0 || negatives === 0) return 0.5;
  return (rankSum - positives * (positives + 1) / 2) / (positives * negatives);
}

function metrics(rows: TrainingRow[], weights: number[], bias: number, threshold: number) {
  const scored = rows.map((row) => ({ y: row.label, p: predict(row, weights, bias) }));
  let tp = 0, fp = 0, tn = 0, fn = 0;
  let brier = 0;
  let logloss = 0;

  for (const s of scored) {
    const pred = s.p >= threshold ? 1 : 0;
    if (pred === 1 && s.y === 1) tp++;
    else if (pred === 1 && s.y === 0) fp++;
    else if (pred === 0 && s.y === 0) tn++;
    else fn++;

    brier += (s.p - s.y) ** 2;
    logloss += -(s.y * Math.log(clamp(s.p, 1e-6, 1 - 1e-6)) + (1 - s.y) * Math.log(clamp(1 - s.p, 1e-6, 1 - 1e-6)));
  }

  const accuracy = (tp + tn) / Math.max(1, rows.length);
  const precision = tp / Math.max(1, tp + fp);
  const recall = tp / Math.max(1, tp + fn);
  const specificity = tn / Math.max(1, tn + fp);
  const f1 = 2 * precision * recall / Math.max(1e-9, precision + recall);
  const baseRate = scored.reduce((sum, s) => sum + s.y, 0) / Math.max(1, scored.length);

  return {
    samples: rows.length,
    positives: scored.filter((s) => s.y === 1).length,
    baseRate: round(baseRate),
    threshold: round(threshold),
    accuracy: round(accuracy),
    balancedAccuracy: round((recall + specificity) / 2),
    precision: round(precision),
    recall: round(recall),
    specificity: round(specificity),
    f1: round(f1),
    auc: round(auc(scored)),
    brier: round(brier / Math.max(1, rows.length)),
    logloss: round(logloss / Math.max(1, rows.length)),
    confusion: { tp, fp, tn, fn },
  };
}

function chooseThreshold(rows: TrainingRow[], weights: number[], bias: number): number {
  let best = { threshold: 0.5, score: -Infinity };
  for (let t = 0.1; t <= 0.9; t += 0.01) {
    const m = metrics(rows, weights, bias, t);
    const score = m.balancedAccuracy + m.f1 * 0.2;
    if (score > best.score) best = { threshold: t, score };
  }
  return best.threshold;
}

function calibration(rows: TrainingRow[], weights: number[], bias: number) {
  const bins = Array.from({ length: 10 }, (_, i) => ({
    bin: `${i / 10}-${(i + 1) / 10}`,
    count: 0,
    meanPrediction: 0,
    observedRate: 0,
  }));

  for (const row of rows) {
    const p = predict(row, weights, bias);
    const idx = Math.min(9, Math.floor(p * 10));
    bins[idx].count++;
    bins[idx].meanPrediction += p;
    bins[idx].observedRate += row.label;
  }

  return bins
    .filter((bin) => bin.count > 0)
    .map((bin) => ({
      ...bin,
      meanPrediction: round(bin.meanPrediction / bin.count),
      observedRate: round(bin.observedRate / bin.count),
    }));
}

function round(n: number): number {
  return Number(n.toFixed(4));
}

function coefficientTable(weights: number[]) {
  return FEATURE_NAMES.map((feature, i) => ({ feature, weight: round(weights[i]) }))
    .sort((a, b) => Math.abs(b.weight) - Math.abs(a.weight));
}

async function main() {
  const raw = JSON.parse(await fs.readFile("public/data/events.json", "utf8"));
  const allEvents: GdeltEvent[] = raw.events ?? [];
  const dailyCounts = new Map<string, number>();
  for (const e of allEvents) dailyCounts.set(e.date, (dailyCounts.get(e.date) ?? 0) + 1);

  const denseEvents = allEvents
    .filter((e) => Number.isFinite(parseDay(e.date)))
    .filter((e) => (dailyCounts.get(e.date) ?? 0) >= MIN_DAILY_EVENTS)
    .sort((a, b) => parseDay(a.date) - parseDay(b.date));

  const maxDay = Math.max(...denseEvents.map((e) => parseDay(e.date)));
  const labelable = denseEvents.filter((e) => parseDay(e.date) <= maxDay - HORIZON_DAYS);
  const rows: TrainingRow[] = labelable.map((event) => ({
    event,
    features: featuresFor(event, denseEvents),
    label: hasFutureEscalation(event, denseEvents),
  }));

  const uniqueDays = [...new Set(rows.map((row) => row.event.date))].sort();
  const splitDay = uniqueDays[Math.max(0, Math.ceil(uniqueDays.length * 0.7) - 1)];
  let trainRows = rows.filter((row) => row.event.date <= splitDay);
  let testRows = rows.filter((row) => row.event.date > splitDay);

  if (testRows.length < 30) {
    const split = Math.floor(rows.length * 0.75);
    trainRows = rows.slice(0, split);
    testRows = rows.slice(split);
  }

  const { means, stds } = standardize([...trainRows, ...testRows], trainRows);
  const { weights, bias } = trainLogReg(trainRows);
  const threshold = chooseThreshold(trainRows, weights, bias);
  const trainMetrics = metrics(trainRows, weights, bias, threshold);
  const testMetrics = metrics(testRows, weights, bias, threshold);

  const model = {
    version: MODEL_VERSION,
    trainedAt: new Date().toISOString(),
    target: {
      name: "future_escalation_72h",
      definition: "1 when a strongly related actor/country/theme neighborhood has a critical negative GDELT event within the next 72 hours.",
      horizonDays: HORIZON_DAYS,
      labelSource: "Weak labels derived from future GDELT rows in public/data/events.json.",
    },
    data: {
      sourceUpdated: raw.updated,
      totalEvents: allEvents.length,
      denseEvents: denseEvents.length,
      labelableEvents: rows.length,
      dailyMinEvents: MIN_DAILY_EVENTS,
      trainThroughDate: splitDay,
      trainSamples: trainRows.length,
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
      test: testMetrics,
      calibration: calibration(testRows, weights, bias),
      topCoefficients: coefficientTable(weights).slice(0, 14),
    },
    limitations: [
      "Labels are weak labels from GDELT, not human analyst ground truth.",
      "The current static dataset is small and time-compressed; more historical archives will improve stability.",
      "This predicts escalation risk for an event neighborhood, not exact causality or exact market movement.",
    ],
  };

  await fs.mkdir("public/data", { recursive: true });
  await fs.writeFile("public/data/escalation-model.json", JSON.stringify(model, null, 2));

  console.log("HopeIndexAI Training -> wrote public/data/escalation-model.json");
  console.log(JSON.stringify({
    train: trainMetrics,
    test: testMetrics,
    threshold: round(threshold),
    trainThroughDate: splitDay,
    labelableEvents: rows.length,
  }, null, 2));
}

main().catch((err) => {
  console.error("HopeIndexAI Training -> failed:", err);
  process.exit(1);
});
