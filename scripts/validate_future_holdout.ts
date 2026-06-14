import { promises as fs } from "fs";
import { dirname } from "path";
import {
  UcdpEvent,
  UcdpIndex,
  loadUcdpEvents,
  buildUcdpIndex,
  buildSupervisedLabel,
  SupervisedLabel,
} from "../lib/ucdp.ts";
import { sourceTierFromUrl } from "../lib/source_credibility.ts";

const DEFAULT_EVENTS_PATH = "data/holdout/events_7d.json";
const DEFAULT_DAYS = 7;
const UCDP_CANDIDATE_PATH = "data/external/ucdp_candidate/candidate_events_compact.jsonl";
const UCDP_GED_PATH = "data/external/ucdp/ged_events_compact.jsonl";
const CHAMPION_MODEL_PATH = "data/models/escalation-model-supervised-latest.json";
const FALLBACK_MODEL_PATH = "public/data/escalation-model.json";
const REPORT_PATH = "data/eval/future_holdout_report.json";
const DRIFT_LOG_PATH = "data/eval/drift_log.jsonl";

interface HoldoutEvent {
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
}

interface ModelArtifact {
  version?: string;
  target?: { name?: string; definition?: string };
  featureNames?: string[];
  preprocessing?: { means?: number[]; stds?: number[] };
  model?: { kind?: string; bias?: number; weights?: number[]; threshold?: number };
  metrics?: Record<string, any>;
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

function parseArgs(): {
  eventsPath: string;
  days: number;
  fetch: boolean;
  importUcdp: boolean;
  candidatePath: string;
  gedPath: string;
  modelPath: string | null;
  reportPath: string;
  driftLogPath: string;
  maxEvents: number;
} {
  const args = process.argv.slice(2);
  let eventsPath = DEFAULT_EVENTS_PATH;
  let days = DEFAULT_DAYS;
  let fetch = false;
  let importUcdp = false;
  let candidatePath = UCDP_CANDIDATE_PATH;
  let gedPath = UCDP_GED_PATH;
  let modelPath: string | null = null;
  let reportPath = REPORT_PATH;
  let driftLogPath = DRIFT_LOG_PATH;
  let maxEvents = 2_000;

  for (const arg of args) {
    if (arg.startsWith("--events=")) eventsPath = arg.slice("--events=".length);
    if (arg.startsWith("--days=")) days = parseInt(arg.slice("--days=".length), 10);
    if (arg === "--fetch") fetch = true;
    if (arg === "--import-ucdp") importUcdp = true;
    if (arg.startsWith("--candidate=")) candidatePath = arg.slice("--candidate=".length);
    if (arg.startsWith("--ged=")) gedPath = arg.slice("--ged=".length);
    if (arg.startsWith("--model=")) modelPath = arg.slice("--model=".length);
    if (arg.startsWith("--report=")) reportPath = arg.slice("--report=".length);
    if (arg.startsWith("--drift-log=")) driftLogPath = arg.slice("--drift-log=".length);
    if (arg.startsWith("--max-events=")) maxEvents = parseInt(arg.slice("--max-events=".length), 10);
  }

  return { eventsPath, days, fetch, importUcdp, candidatePath, gedPath, modelPath, reportPath, driftLogPath, maxEvents };
}

function formatDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function daysAgo(n: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - n);
  return formatDate(d);
}

async function runCommand(label: string, command: string[]): Promise<void> {
  console.log(`[holdout] ${label}: ${command.join(" ")}`);
  const proc = Bun.spawn(command, { stdout: "inherit", stderr: "inherit" });
  const exitCode = await proc.exited;
  if (exitCode !== 0) {
    throw new Error(`Command failed with exit code ${exitCode}: ${command.join(" ")}`);
  }
}

async function fetchHoldoutEvents(outputPath: string, days: number): Promise<void> {
  const start = daysAgo(days);
  await fs.mkdir(dirname(outputPath) || ".", { recursive: true });
  await runCommand("Fetch GDELT holdout window", [
    "bun", "pipeline/enrich_historical.ts",
    `--start=${start}`,
    `--days=${days}`,
    `--output=${outputPath}`,
    "--files-per-day=4",
  ]);
}

async function importUcdpData(): Promise<void> {
  await runCommand("Import UCDP Candidate", ["bun", "run", "import:ucdp-candidate"]);
  try {
    await runCommand("Import UCDP GED", ["bun", "run", "import:ucdp"]);
  } catch {
    console.log("[holdout] UCDP GED import skipped or failed (historical only).");
  }
}

async function loadHoldoutEvents(path: string): Promise<{ events: HoldoutEvent[]; updated?: string; count?: number }> {
  const text = await fs.readFile(path, "utf8");
  const parsed = JSON.parse(text);
  if (!parsed || !Array.isArray(parsed.events)) {
    throw new Error(`${path} must contain an events array.`);
  }
  return { events: parsed.events, updated: parsed.updated, count: parsed.count };
}

async function readJsonl<T>(path: string): Promise<T[]> {
  try {
    const text = await fs.readFile(path, "utf8");
    return text
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => JSON.parse(line) as T);
  } catch (err: any) {
    if (err.code === "ENOENT") return [];
    throw err;
  }
}

async function loadModel(preferredPath: string | null): Promise<{ model: ModelArtifact; path: string }> {
  for (const path of [preferredPath, CHAMPION_MODEL_PATH, FALLBACK_MODEL_PATH].filter(Boolean) as string[]) {
    try {
      const data = JSON.parse(await fs.readFile(path, "utf8"));
      return { model: data, path };
    } catch {
      // try next path
    }
  }
  throw new Error("Could not load a champion model. Train or promote a model first.");
}

function parseDay(date: string): number {
  const ms = Date.parse(date);
  return Number.isFinite(ms) ? Math.floor(ms / 86_400_000) : Number.NaN;
}

function sampleOrdered<T>(items: T[], target: number): T[] {
  if (items.length <= target) return items;
  const step = items.length / target;
  const sampled: T[] = [];
  for (let i = 0; i < target; i++) {
    sampled.push(items[Math.floor(i * step)]);
  }
  return sampled;
}

function actorTokens(e: HoldoutEvent): Set<string> {
  const raw = `${e.actor1 ?? ""} ${e.actor2 ?? ""}`.toUpperCase();
  return new Set(
    raw
      .split(/[^A-Z0-9]+/)
      .filter((token) => token.length > 2 && !ACTOR_STOPWORDS.has(token))
  );
}

function sharesActor(a: HoldoutEvent, b: HoldoutEvent): boolean {
  const aTokens = actorTokens(a);
  if (aTokens.size === 0) return false;
  for (const token of actorTokens(b)) {
    if (aTokens.has(token)) return true;
  }
  return false;
}

function distanceKm(a: HoldoutEvent, b: HoldoutEvent): number {
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

function pastEvents(target: HoldoutEvent, events: HoldoutEvent[], days: number): HoldoutEvent[] {
  const targetDay = parseDay(target.date);
  return events.filter((event) => {
    const eventDay = parseDay(event.date);
    return Number.isFinite(eventDay) && eventDay < targetDay && targetDay - eventDay <= days;
  });
}

function buildDayIndex(events: HoldoutEvent[]): Map<number, HoldoutEvent[]> {
  const index = new Map<number, HoldoutEvent[]>();
  for (const e of events) {
    const d = parseDay(e.date);
    if (!Number.isFinite(d)) continue;
    if (!index.has(d)) index.set(d, []);
    index.get(d)!.push(e);
  }
  return index;
}

function subsetPastIndexed(
  target: HoldoutEvent,
  dayIndex: Map<number, HoldoutEvent[]>,
  days: number
): HoldoutEvent[] {
  const day = parseDay(target.date);
  if (!Number.isFinite(day)) return [];
  const result: HoldoutEvent[] = [];
  for (let d = day - days; d < day; d++) {
    const list = dayIndex.get(d);
    if (list) result.push(...list);
  }
  return result;
}

function hostFromUrl(url: string | undefined): string {
  if (!url) return "";
  try {
    return new URL(url).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return "";
  }
}

function doomRatio(events: HoldoutEvent[]): number {
  return events.length ? events.filter((e) => e.category === "doom").length / events.length : 0;
}

function minGoldstein(events: HoldoutEvent[]): number {
  const vals = events.map((e) => e.goldstein).filter((n): n is number => typeof n === "number" && Number.isFinite(n));
  return vals.length ? Math.min(...vals) : 0;
}

function avgTone(events: HoldoutEvent[]): number {
  const vals = events.map((e) => e.avgTone).filter((n): n is number => typeof n === "number" && Number.isFinite(n));
  return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
}

function featuresFor(event: HoldoutEvent, dayIndex: Map<number, HoldoutEvent[]>): number[] {
  const past3 = subsetPastIndexed(event, dayIndex, 3);
  const past7 = subsetPastIndexed(event, dayIndex, 7);
  const countryPast3 = past3.filter((p) => p.country && p.country === event.country);
  const actorPast7 = past7.filter((p) => sharesActor(event, p));
  const themeCountryPast7 = past7.filter((p) => p.country === event.country && p.theme === event.theme);
  const host = hostFromUrl(event.sourceUrl);
  const sameSourcePast7 = host ? past7.filter((p) => hostFromUrl(p.sourceUrl) === host) : [];
  const nearbyPast3 = past3.filter((p) => {
    if (![event.lat, event.lon, p.lat, p.lon].every(Number.isFinite)) return false;
    return distanceKm(event, p) <= 300;
  });
  const continent = CONTINENTS.includes(event.continent as any) ? event.continent : "Other";

  return [
    event.goldstein ?? 0,
    Math.abs(event.goldstein ?? 0),
    event.avgTone ?? 0,
    Math.log1p(event.numMentions ?? 0),
    (event.hopeScore ?? 50) / 100,
    event.category === "doom" ? 1 : 0,
    event.severity === "critical" ? 1 : 0,
    event.severity === "high" ? 1 : 0,
    Math.abs(event.lat ?? 0) / 90,
    event.actor2 && event.actor2 !== "Unknown" ? 1 : 0,
    ...THEMES.map((theme) => event.theme === theme ? 1 : 0),
    ...CONTINENTS.map((c) => continent === c ? 1 : 0),
    ...QUADS.map((quad) => event.quadClass === quad ? 1 : 0),
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
    event.numMentions ?? 0,
    sourceTierFromUrl(event.sourceUrl),
    1, // holdout events are not deduplicated; default cluster size
  ];
}

function sigmoid(z: number): number {
  if (z > 35) return 1;
  if (z < -35) return 0;
  return 1 / (1 + Math.exp(-z));
}

function scoreEvent(event: HoldoutEvent, dayIndex: Map<number, HoldoutEvent[]>, model: ModelArtifact): { probability: number; prediction: boolean } {
  const means = model.preprocessing?.means ?? [];
  const stds = model.preprocessing?.stds ?? [];
  const weights = model.model?.weights ?? [];
  const bias = model.model?.bias ?? 0;
  const threshold = model.model?.threshold ?? 0.5;

  const raw = featuresFor(event, dayIndex);
  const standardized = raw.map((v, i) => (v - (means[i] ?? 0)) / (stds[i] || 1));
  const logit = bias + standardized.reduce((sum, v, i) => sum + v * (weights[i] ?? 0), 0);
  const probability = sigmoid(logit);
  return { probability: Number(probability.toFixed(4)), prediction: probability >= threshold };
}

function computeMetrics(probs: number[], labels: number[], threshold: number) {
  let tp = 0, fp = 0, tn = 0, fn = 0;
  for (let i = 0; i < probs.length; i++) {
    const pred = probs[i] >= threshold ? 1 : 0;
    if (pred === 1 && labels[i] === 1) tp++;
    else if (pred === 1 && labels[i] === 0) fp++;
    else if (pred === 0 && labels[i] === 1) fn++;
    else if (pred === 0 && labels[i] === 0) tn++;
  }

  const positives = tp + fn;
  const negatives = tn + fp;
  const accuracy = (tp + tn) / Math.max(1, probs.length);
  const precision = tp + fp === 0 ? 0 : tp / (tp + fp);
  const recall = positives === 0 ? 0 : tp / positives;
  const specificity = negatives === 0 ? 0 : tn / negatives;
  const f1 = precision + recall === 0 ? 0 : (2 * precision * recall) / (precision + recall);
  const fpr = negatives === 0 ? 0 : fp / negatives;

  let auc: number | null = null;
  const posProbs = probs.filter((_, i) => labels[i] === 1);
  const negProbs = probs.filter((_, i) => labels[i] === 0);
  if (posProbs.length > 0 && negProbs.length > 0) {
    const MAX_AUC_SAMPLES = 5_000;
    let sampledPos = posProbs;
    let sampledNeg = negProbs;
    if (sampledPos.length > MAX_AUC_SAMPLES) {
      sampledPos = sampledPos.sort(() => Math.random() - 0.5).slice(0, MAX_AUC_SAMPLES);
    }
    if (sampledNeg.length > MAX_AUC_SAMPLES) {
      sampledNeg = sampledNeg.sort(() => Math.random() - 0.5).slice(0, MAX_AUC_SAMPLES);
    }
    let concordant = 0;
    let ties = 0;
    for (const pp of sampledPos) {
      for (const np of sampledNeg) {
        if (pp > np) concordant++;
        else if (pp === np) ties++;
      }
    }
    auc = (concordant + ties / 2) / (sampledPos.length * sampledNeg.length);
  }

  return { samples: probs.length, positives, negatives, baseRate: positives / Math.max(1, probs.length), threshold, accuracy, precision, recall, specificity, f1, fpr, auc };
}

function precisionAtK(sortedLabels: number[], k: number): number {
  const top = sortedLabels.slice(0, k);
  return top.filter((l) => l === 1).length / Math.max(1, top.length);
}

function recallAtK(sortedLabels: number[], k: number, positives: number): number {
  const top = sortedLabels.slice(0, k);
  return top.filter((l) => l === 1).length / Math.max(1, positives);
}

async function main() {
  const args = parseArgs();

  if (args.importUcdp) {
    await importUcdpData();
  }

  if (args.fetch) {
    await fetchHoldoutEvents(args.eventsPath, args.days);
  }

  let { events, updated, count } = await loadHoldoutEvents(args.eventsPath);
  console.log(`[holdout] Loaded ${events.length} holdout events${updated ? ` (updated ${updated})` : ""}.`);

  if (events.length > args.maxEvents) {
    events = sampleOrdered(events, args.maxEvents);
    console.log(`[holdout] Sampled to ${events.length} events for scoring.`);
  }

  // Load UCDP outcomes.
  const candidateText = await fs.readFile(args.candidatePath, "utf8").catch(() => "");
  const candidates: UcdpEvent[] = candidateText ? loadUcdpEvents(args.candidatePath, candidateText) : [];
  const gedText = await fs.readFile(args.gedPath, "utf8").catch(() => "");
  const ged: UcdpEvent[] = gedText ? loadUcdpEvents(args.gedPath, gedText) : [];
  const ucdpIndex: UcdpIndex = buildUcdpIndex([...ged, ...candidates]);
  console.log(`[holdout] UCDP index: ${ged.length} GED + ${candidates.length} candidate events.`);

  // Build labels.
  const labels: SupervisedLabel[] = events.map((event) =>
    buildSupervisedLabel(
      { id: event.id, date: event.date, country: event.country, lat: event.lat, lon: event.lon, actor1: event.actor1, actor2: event.actor2 },
      ucdpIndex,
      { dateWindowDays: 3, maxDistanceKm: 300, minScore: 0.35, significantDeathThreshold: 5 }
    )
  );
  const labelValues = labels.map((l) => l.label);
  const positives = labelValues.filter((l) => l === 1).length;
  const negatives = labelValues.filter((l) => l === 0).length;
  console.log(`[holdout] Labels: ${positives} positive, ${negatives} negative.`);

  // Load champion model.
  const { model, path: modelPath } = await loadModel(args.modelPath);
  if (!model.featureNames || model.featureNames.length !== FEATURE_NAMES.length ||
      model.featureNames.some((name, i) => name !== FEATURE_NAMES[i])) {
    throw new Error(`Model featureNames do not match the holdout validator feature order.`);
  }
  console.log(`[holdout] Loaded model ${model.version ?? "unknown"} from ${modelPath}.`);

  // Score events.
  const dayIndex = buildDayIndex(events);
  const scored = events.map((event, i) => ({
    event,
    label: labelValues[i],
    ...scoreEvent(event, dayIndex, model),
  }));

  const probs = scored.map((s) => s.probability);
  const metrics = computeMetrics(probs, labelValues, model.model?.threshold ?? 0.5);

  const sortedByProb = scored.slice().sort((a, b) => b.probability - a.probability);
  const sortedLabels = sortedByProb.map((s) => s.label);
  const kValues = [10, 50, 100, sortedLabels.length].filter((k, i, arr) => k > 0 && arr.indexOf(k) === i);
  const precisionRecallAtK = kValues.map((k) => ({
    k,
    precision: precisionAtK(sortedLabels, k),
    recall: recallAtK(sortedLabels, k, metrics.positives),
  }));

  const report = {
    generatedAt: new Date().toISOString(),
    window: {
      days: args.days,
      eventCount: events.length,
      eventsUpdated: updated,
      eventsReportedCount: count,
      startDate: events.length ? events.reduce((min, e) => e.date < min ? e.date : min, events[0].date) : null,
      endDate: events.length ? events.reduce((max, e) => e.date > max ? e.date : max, events[0].date) : null,
    },
    model: {
      path: modelPath,
      version: model.version ?? "unknown",
      target: model.target?.name ?? "unknown",
      threshold: model.model?.threshold ?? 0.5,
    },
    labelCounts: { positives, negatives, baseRate: positives / Math.max(1, events.length) },
    metrics,
    precisionRecallAtK,
    notes: [
      "Holdout labels are derived from UCDP GED + Candidate matches (deaths >= 5 within +/-3 days and 300 km).",
      "UCDP Candidate releases may not yet cover the holdout window; positives can be zero until a new release is imported.",
    ],
  };

  await fs.mkdir(dirname(args.reportPath) || ".", { recursive: true });
  await fs.writeFile(args.reportPath, JSON.stringify(report, null, 2));

  const driftEntry = {
    generatedAt: report.generatedAt,
    eventCount: events.length,
    positives,
    negatives,
    auc: metrics.auc,
    f1: metrics.f1,
    modelVersion: model.version ?? "unknown",
    modelPath,
  };
  await fs.mkdir(dirname(args.driftLogPath) || ".", { recursive: true });
  await fs.appendFile(args.driftLogPath, JSON.stringify(driftEntry) + "\n");

  console.log("\nHopeIndexAI future holdout validation");
  console.log(JSON.stringify({
    events: events.length,
    positives,
    negatives,
    auc: metrics.auc,
    f1: metrics.f1,
    precision: metrics.precision,
    recall: metrics.recall,
    fpr: metrics.fpr,
  }, null, 2));
  console.log(`Wrote ${args.reportPath}`);
  console.log(`Appended drift entry to ${args.driftLogPath}`);
}

main().catch((err) => {
  console.error("Future holdout validation failed:", err);
  process.exit(1);
});
