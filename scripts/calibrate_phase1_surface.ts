import { mkdir, readFile, writeFile } from "fs/promises";
import { dirname } from "path";

type Category = "doom" | "bloom";
type Severity = "low" | "medium" | "high" | "critical";

interface GdeltEvent {
  id: string;
  lat: number;
  lon: number;
  category: Category;
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
  severity: Severity;
  continent: string;
  surfaceScore?: number;
  surfaceRank?: number;
  surfaceBand?: "lead" | "watch" | "background";
  surfaceReasons?: string[];
  surfaceClusterKey?: string;
  surfaceClusterSize?: number;
  duplicateOf?: string | null;
  surfaceModelProbability?: number;
  surfaceRadius?: number;
}

interface Phase1Label {
  eventId: string;
  labelSource: "human" | "llm_article_review" | "bootstrap_current_rules";
  humanReviewed: boolean;
  labels: {
    important: boolean;
    categoryCorrect: boolean;
    severityCorrect: boolean;
    summaryQuality: number | null;
  };
}

interface ModelArtifact {
  version?: string;
  featureNames?: string[];
  preprocessing?: { means?: number[]; stds?: number[] };
  model?: { bias?: number; weights?: number[]; threshold?: number };
}

interface ScoredEvent {
  event: GdeltEvent;
  modelProbability: number;
  score: number;
  radius: number;
  band: "lead" | "watch" | "background";
  reasons: string[];
  penalties: string[];
  clusterKey: string;
  clusterSize: number;
  duplicateOf: string | null;
}

const EVENTS_PATH = "public/data/events.json";
const LABEL_PATH = "data/eval/phase1_labels.jsonl";
const MODEL_PATH = "public/data/escalation-model.json";
const POLICY_PATH = "public/data/surfacing-policy.json";
const REPORT_PATH = "data/eval/phase1_surface_report.json";

function printHelp() {
  console.log(`HopeIndexAI Phase 1 surfacing calibration

Usage:
  bun run surface:phase1

Scores all public events with the escalation model plus dedupe/source-quality
rules, updates public/data/events.json, writes public/data/surfacing-policy.json,
and writes data/eval/phase1_surface_report.json.
`);
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
];

const ACTOR_STOPWORDS = new Set([
  "UNKNOWN", "GOVERNMENT", "MINISTRY", "STATE", "STATES", "UNITED", "NATIONAL",
  "INTERNATIONAL", "OFFICIAL", "OFFICIALS", "POLICE", "ADMINISTRATION",
  "PRESIDENT", "PRIME", "MINISTER", "CITY", "COUNTY", "LOCAL",
]);

const STRATEGIC_TERMS = [
  "ISRAEL", "ISRAELI", "GAZA", "HAMAS", "LEBANON", "HEZBOLLAH", "IRAN", "IRANIAN",
  "RUSSIA", "RUSSIAN", "UKRAINE", "KYIV", "KIEV", "NATO", "CHINA", "CHINESE",
  "PAKISTAN", "TTP", "TALIBAN", "NORTH", "KOREA", "MILITARY", "MILITANT",
  "MISSILE", "DRONE", "FIGHTER", "NAVY", "SECURITY", "FORCE", "CEASEFIRE",
  "SANCTION", "EMBASSY", "AMBASSADOR", "BORDER", "CPEC", "HORMUZ",
];

const GOVERNANCE_TERMS = [
  "ICE", "DETENTION", "PROTEST", "PROTESTER", "REDISTRICTING", "ASSAULT", "WEAPONS",
  "RESERVATION", "FEDERAL", "COURT", "OPPOSITION", "ELECTION", "SETTLEMENT",
];

const LOCAL_CRIME_TERMS = [
  "murder", "homicide", "shooting", "trial", "sentenced", "drugs", "cash", "scam",
  "stalker", "wanted-criminal", "dog-attacks", "fire-update", "seize-firearms",
  "romance-scam", "double-murder", "murder-for-hire", "homicide-victim",
];

const ENTERTAINMENT_HISTORY_TERMS = [
  "netflix", "documentary", "film", "films", "star-wars", "goldderby", "pearl-harbor",
  "civil-war", "memorial-day", "interior-designers", "mandakini", "singhasan",
];

const OPINION_TERMS = ["opinion", "column", "analysis", "ruthfullyyours"];

const BACKGROUND_NOISE_TERMS = [
  "weekly-newsletter", "newsletter", "fuel-in-bulgaria", "interior-designers",
  "head-of-news-to-exit", "committee-to-protect-journalists-key-source",
  "role-of-the-neo-authoritarian-bloc", "opioid-settlement", "cow-slaughter",
  "east-turkistan-prime-minister-exile", "veteran-in-new-york",
];

const DIRECT_EVENT_TERMS = [
  "strike", "strikes", "airstrike", "airstrikes", "missile", "missiles", "drone",
  "drones", "ceasefire", "standoff", "fighter-jets", "fighter", "iran-deal",
  "hormuz", "cpec", "militants", "militant", "terrorists", "troops", "raid",
  "raids", "opposition-party", "detention", "protests", "assault-weapons",
  "redistricting", "oreshnik", "north-korea-fires",
];

function round(n: number, digits = 4): number {
  if (!Number.isFinite(n)) return 0;
  return Number(n.toFixed(digits));
}

function sigmoid(z: number): number {
  if (z > 35) return 1;
  if (z < -35) return 0;
  return 1 / (1 + Math.exp(-z));
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

function readJsonl<T>(text: string): T[] {
  return text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean).map((line) => JSON.parse(line) as T);
}

function writePrettyJson(data: unknown): string {
  return JSON.stringify(data, null, 2) + "\n";
}

function writeCompactJson(data: unknown): string {
  return JSON.stringify(data);
}

function dayNumber(date: string): number {
  const ms = Date.parse(date);
  return Number.isFinite(ms) ? Math.floor(ms / 86_400_000) : Number.NaN;
}

function hostFromUrl(url: string | undefined): string {
  if (!url) return "";
  try {
    return new URL(url).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return "";
  }
}

function urlText(url: string | undefined): string {
  if (!url) return "";
  try {
    const parsed = new URL(url);
    return `${parsed.hostname} ${parsed.pathname}`.toLowerCase();
  } catch {
    return String(url).toLowerCase();
  }
}

function normalizedSourceKey(url: string | undefined): string {
  if (!url) return "";
  try {
    const parsed = new URL(url);
    return `${parsed.hostname.toLowerCase().replace(/^www\./, "")}${parsed.pathname.replace(/\/+$/, "")}`;
  } catch {
    return String(url ?? "").trim().toLowerCase();
  }
}

function actorText(event: GdeltEvent): string {
  return `${event.actor1 ?? ""} ${event.actor2 ?? ""} ${event.location ?? ""} ${event.country ?? ""}`.toUpperCase();
}

function actorTokens(event: GdeltEvent): Set<string> {
  const raw = `${event.actor1 ?? ""} ${event.actor2 ?? ""}`.toUpperCase();
  return new Set(
    raw
      .split(/[^A-Z0-9]+/)
      .filter((token) => token.length > 2 && !ACTOR_STOPWORDS.has(token))
  );
}

function sharesActor(a: GdeltEvent, b: GdeltEvent): boolean {
  const aTokens = actorTokens(a);
  if (aTokens.size === 0) return false;
  for (const token of actorTokens(b)) {
    if (aTokens.has(token)) return true;
  }
  return false;
}

function distanceKm(a: GdeltEvent, b: GdeltEvent): number | null {
  if (![a.lat, a.lon, b.lat, b.lon].every(Number.isFinite)) return null;
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

function pastEvents(target: GdeltEvent, events: GdeltEvent[], days: number): GdeltEvent[] {
  const targetDay = dayNumber(target.date);
  return events.filter((event) => {
    const eventDay = dayNumber(event.date);
    return Number.isFinite(eventDay) && eventDay < targetDay && targetDay - eventDay <= days;
  });
}

function doomRatio(events: GdeltEvent[]): number {
  return events.length ? events.filter((event) => event.category === "doom").length / events.length : 0;
}

function minGoldstein(events: GdeltEvent[]): number {
  const values = events
    .map((event) => event.goldstein)
    .filter((value): value is number => typeof value === "number" && Number.isFinite(value));
  return values.length ? Math.min(...values) : 0;
}

function avgTone(events: GdeltEvent[]): number {
  const values = events
    .map((event) => event.avgTone)
    .filter((value): value is number => typeof value === "number" && Number.isFinite(value));
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
}

function featuresFor(event: GdeltEvent, events: GdeltEvent[]): number[] {
  const history3 = pastEvents(event, events, 3);
  const history7 = pastEvents(event, events, 7);
  const countryPast3 = history3.filter((p) => p.country && p.country === event.country);
  const actorPast7 = history7.filter((p) => sharesActor(event, p));
  const themeCountryPast7 = history7.filter((p) => p.country === event.country && p.theme === event.theme);
  const host = hostFromUrl(event.sourceUrl);
  const sameSourcePast7 = host ? history7.filter((p) => hostFromUrl(p.sourceUrl) === host) : [];
  const nearbyPast3 = history3.filter((p) => {
    const km = distanceKm(event, p);
    return km !== null && km <= 300;
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
  ];
}

function modelProbability(event: GdeltEvent, events: GdeltEvent[], model: ModelArtifact | null): number {
  if (!model?.featureNames || !model.preprocessing || !model.model) return 0.5;
  const mismatch =
    model.featureNames.length !== FEATURE_NAMES.length ||
    model.featureNames.some((name, index) => name !== FEATURE_NAMES[index]);
  if (mismatch) throw new Error(`${MODEL_PATH} featureNames do not match surfacing feature order.`);

  const raw = featuresFor(event, events);
  const means = model.preprocessing.means ?? [];
  const stds = model.preprocessing.stds ?? [];
  const weights = model.model.weights ?? [];
  const standardized = raw.map((value, index) => (value - (means[index] ?? 0)) / (stds[index] || 1));
  const logit = (model.model.bias ?? 0) + standardized.reduce((sum, value, index) => sum + value * (weights[index] ?? 0), 0);
  return sigmoid(logit);
}

function hasAny(haystack: string, needles: string[]): boolean {
  return needles.some((needle) => haystack.includes(needle.toLowerCase()));
}

function hasStrategicActor(event: GdeltEvent): boolean {
  const text = `${event.actor1 ?? ""} ${event.actor2 ?? ""}`.toUpperCase();
  return STRATEGIC_TERMS.some((term) => text.includes(term));
}

function hasGovernanceActor(event: GdeltEvent): boolean {
  const text = `${actorText(event)} ${urlText(event.sourceUrl)}`.toUpperCase();
  return GOVERNANCE_TERMS.some((term) => text.includes(term));
}

function baseImportanceScore(event: GdeltEvent): number {
  const goldstein = Math.min(1, Math.abs(event.goldstein ?? 0) / 10);
  const mentions = Math.min(1, Math.log1p(event.numMentions ?? 0) / Math.log1p(150));
  const severity = event.severity === "critical" ? 1 : event.severity === "high" ? 0.72 : event.severity === "medium" ? 0.38 : 0.18;
  return goldstein * 14 + mentions * 14 + severity * 8;
}

function duplicateRank(event: GdeltEvent, cluster: GdeltEvent[]): number {
  const sorted = [...cluster].sort(compareClusterRepresentative);
  return sorted.findIndex((candidate) => candidate.id === event.id);
}

function compareClusterRepresentative(a: GdeltEvent, b: GdeltEvent): number {
  const scoreDiff = baseImportanceScore(b) - baseImportanceScore(a);
  if (Math.abs(scoreDiff) > 0.001) return scoreDiff;
  const mentionDiff = Number(b.numMentions ?? 0) - Number(a.numMentions ?? 0);
  if (mentionDiff !== 0) return mentionDiff;
  return String(a.id).localeCompare(String(b.id));
}

function eventTitle(event: GdeltEvent): string {
  return event.actor1 && event.actor1 !== "Unknown"
    ? `${event.actor1}${event.actor2 && event.actor2 !== "Unknown" ? ` -> ${event.actor2}` : ""}`
    : event.quadLabel;
}

function isGenericEventTitle(event: GdeltEvent): boolean {
  const title = eventTitle(event);
  if (event.actor1 === "Unknown") return true;
  if (["Material Conflict", "Verbal Conflict", "Material Cooperation", "Verbal Cooperation"].includes(title)) return true;
  if (event.actor2 === "WEBSITE") return true;
  const words = title.split(/\s+->\s+|\s+/).filter(Boolean);
  return words.length === 1 && ["COMMANDER", "CITIZEN", "AUSTRALIAN", "WEBSITE", "BRITISH"].includes(words[0]);
}

function scoreSurfaceEvent(event: GdeltEvent, events: GdeltEvent[], model: ModelArtifact | null, clusters: Map<string, GdeltEvent[]>): ScoredEvent {
  const reasons: string[] = [];
  const penalties: string[] = [];
  const text = urlText(event.sourceUrl);
  const strategic = hasStrategicActor(event) || hasAny(text, ["ukraine", "iran", "israel", "lebanon", "north-korea", "hormuz", "fighter-jets", "cpec", "ceasefire", "drone", "missile"]);
  const governance = hasGovernanceActor(event);
  const directEvent = hasAny(text, DIRECT_EVENT_TERMS);
  const localCrime = hasAny(text, LOCAL_CRIME_TERMS) && !strategic;
  const entertainmentHistory = hasAny(text, ENTERTAINMENT_HISTORY_TERMS);
  const backgroundNoise = hasAny(text, BACKGROUND_NOISE_TERMS);
  const opinion = hasAny(text, OPINION_TERMS);
  const genericTitle = isGenericEventTitle(event);
  const localNews = hasAny(text, ["/local-news/", "/news/local-news/", "local3news.com", "observer-reporter.com/news/local-news", "edmontonsun.com/news/local-news"]);
  const clusterKey = normalizedSourceKey(event.sourceUrl) || event.id;
  const cluster = clusters.get(clusterKey) ?? [event];
  const rank = duplicateRank(event, cluster);
  const duplicateOf = rank > 0
    ? [...cluster].sort(compareClusterRepresentative)[0]?.id ?? null
    : null;
  const probability = modelProbability(event, events, model);

  let score = 18 + probability * 42 + baseImportanceScore(event);

  if (strategic) {
    score += 18;
    reasons.push("strategic actor or theater");
  }
  if (directEvent) {
    score += 9;
    reasons.push("direct event wording");
  }
  if (governance) {
    score += 10;
    reasons.push("governance or public-safety signal");
  }
  if (event.theme === "Diplomacy" && event.category === "bloom" && event.numMentions >= 25) {
    score += 8;
    reasons.push("high-mention diplomacy");
  }
  if (event.theme === "Humanitarian" && event.numMentions >= 20) {
    score += 6;
    reasons.push("humanitarian/public-safety signal");
  }
  if (event.continent === "Middle East" && strategic) {
    score += 4;
    reasons.push("high-risk regional context");
  }
  if (event.numMentions <= 1 && !strategic && !governance) {
    score -= 12;
    penalties.push("single-mention weak signal");
  }
  if (localCrime) {
    score -= 30;
    penalties.push("local crime pattern");
  }
  if (genericTitle && !directEvent) {
    score -= 28;
    penalties.push("generic GDELT extraction");
  }
  if (entertainmentHistory) {
    score -= 42;
    penalties.push("entertainment/history extraction noise");
  }
  if (backgroundNoise) {
    score -= 34;
    penalties.push("background or source-mismatch article");
  }
  if (localNews && !directEvent && !strategic) {
    score -= 26;
    penalties.push("local-news source pattern");
  }
  if (opinion && !strategic) {
    score -= 16;
    penalties.push("opinion/background article");
  } else if (opinion) {
    score -= 8;
    penalties.push("analysis/opinion source");
  }
  if (rank > 0) {
    score -= rank === 1 ? 36 : 46;
    penalties.push("duplicate source row");
  }
  if (event.actor1 === event.actor2 && event.actor1 !== "Unknown") {
    score -= 6;
    penalties.push("same actor on both sides");
  }

  score = clamp(score, 0, 100);
  if (reasons.length === 0) reasons.push("GDELT/model signal only");
  const band = score >= 72 ? "lead" : score >= 52 ? "watch" : "background";
  const radius = round(3 + (score / 100) * 8, 1);

  return {
    event,
    modelProbability: probability,
    score: round(score, 2),
    radius,
    band,
    reasons: [...reasons, ...penalties.map((penalty) => `penalty: ${penalty}`)].slice(0, 5),
    penalties,
    clusterKey,
    clusterSize: cluster.length,
    duplicateOf,
  };
}

function baselineScore(event: GdeltEvent): number {
  const absGoldstein = Math.abs(event.goldstein ?? 0);
  const mentionBoost = Math.log1p(event.numMentions ?? 0) * 1.8;
  const severityBoost = event.severity === "critical" ? 2.5 : event.severity === "high" ? 1.4 : 0;
  const conflictBoost = event.category === "doom" ? 0.4 : 0;
  return absGoldstein + mentionBoost + severityBoost + conflictBoost;
}

function binaryMetrics(rows: Array<{ actual: boolean; predicted: boolean }>) {
  let tp = 0;
  let fp = 0;
  let tn = 0;
  let fn = 0;

  for (const row of rows) {
    if (row.predicted && row.actual) tp++;
    else if (row.predicted && !row.actual) fp++;
    else if (!row.predicted && !row.actual) tn++;
    else fn++;
  }

  const positives = tp + fn;
  const negatives = tn + fp;
  const predictedPositive = tp + fp;
  const precision = tp / Math.max(1, predictedPositive);
  const recall = tp / Math.max(1, positives);
  const specificity = tn / Math.max(1, negatives);
  const f1 = 2 * precision * recall / Math.max(1e-9, precision + recall);

  return {
    samples: rows.length,
    positives,
    negatives,
    predictedPositive,
    accuracy: round((tp + tn) / Math.max(1, rows.length)),
    balancedAccuracy: round((recall + specificity) / 2),
    precision: round(precision),
    recall: round(recall),
    specificity: round(specificity),
    f1: round(f1),
    falseAlarmRate: round(fp / Math.max(1, predictedPositive)),
    missRate: round(fn / Math.max(1, positives)),
    confusion: { tp, fp, tn, fn },
  };
}

function chooseThreshold(rows: Array<{ actual: boolean; score: number }>) {
  let best = { threshold: 50, metrics: binaryMetrics(rows.map((row) => ({ actual: row.actual, predicted: row.score >= 50 }))) };

  for (let threshold = 20; threshold <= 90; threshold += 1) {
    const metrics = binaryMetrics(rows.map((row) => ({ actual: row.actual, predicted: row.score >= threshold })));
    const better =
      metrics.f1 > best.metrics.f1 + 1e-9 ||
      (metrics.f1 === best.metrics.f1 && metrics.precision > best.metrics.precision) ||
      (metrics.f1 === best.metrics.f1 && metrics.precision === best.metrics.precision && metrics.predictedPositive < best.metrics.predictedPositive);
    if (better) best = { threshold, metrics };
  }

  return best;
}

function precisionAtK(rows: Array<{ actual: boolean; score: number }>, k: number): number {
  const top = [...rows].sort((a, b) => b.score - a.score).slice(0, k);
  return round(top.filter((row) => row.actual).length / Math.max(1, top.length));
}

function causeBuckets(rows: Array<{ scored: ScoredEvent; actual: boolean; predicted: boolean }>) {
  const buckets: Record<string, number> = {};
  for (const row of rows) {
    const causes = row.scored.penalties.length ? row.scored.penalties : row.scored.reasons;
    for (const cause of causes) buckets[cause] = (buckets[cause] ?? 0) + 1;
  }
  return Object.fromEntries(Object.entries(buckets).sort((a, b) => b[1] - a[1]));
}

function errorExamples(rows: Array<{ scored: ScoredEvent; actual: boolean; predicted: boolean }>, kind: "falsePositive" | "falseNegative") {
  return rows
    .filter((row) => kind === "falsePositive" ? row.predicted && !row.actual : !row.predicted && row.actual)
    .sort((a, b) => kind === "falsePositive" ? b.scored.score - a.scored.score : a.scored.score - b.scored.score)
    .slice(0, 12)
    .map((row) => ({
      id: row.scored.event.id,
      date: row.scored.event.date,
      title: eventTitle(row.scored.event),
      sourceDomain: hostFromUrl(row.scored.event.sourceUrl),
      score: row.scored.score,
      modelProbability: round(row.scored.modelProbability),
      reasons: row.scored.reasons,
      sourceUrl: row.scored.event.sourceUrl,
    }));
}

async function main() {
  const args = process.argv.slice(2);
  if (args.includes("-h") || args.includes("--help")) {
    printHelp();
    return;
  }
  if (args.length > 0) throw new Error(`Unknown argument(s): ${args.join(" ")}`);

  const parsedEvents = JSON.parse(await readFile(EVENTS_PATH, "utf8"));
  const events: GdeltEvent[] = Array.isArray(parsedEvents.events) ? parsedEvents.events : [];
  const labels = readJsonl<Phase1Label>(await readFile(LABEL_PATH, "utf8"));
  const labelById = new Map(labels.map((label) => [label.eventId, label]));
  const model: ModelArtifact | null = JSON.parse(await readFile(MODEL_PATH, "utf8"));

  const clusters = new Map<string, GdeltEvent[]>();
  for (const event of events) {
    const key = normalizedSourceKey(event.sourceUrl) || event.id;
    const existing = clusters.get(key) ?? [];
    existing.push(event);
    clusters.set(key, existing);
  }

  const scored = events.map((event) => scoreSurfaceEvent(event, events, model, clusters));
  scored.sort((a, b) => b.score - a.score || Number(b.event.numMentions ?? 0) - Number(a.event.numMentions ?? 0));

  const evalRows = scored
    .map((row) => ({ scored: row, label: labelById.get(row.event.id) }))
    .filter((row): row is { scored: ScoredEvent; label: Phase1Label } => Boolean(row.label));

  const threshold = chooseThreshold(evalRows.map((row) => ({ actual: row.label.labels.important, score: row.scored.score })));
  const thresholdValue = threshold.threshold;
  const surfaceEvalRows = evalRows.map((row) => ({
    scored: row.scored,
    actual: row.label.labels.important,
    predicted: row.scored.score >= thresholdValue,
  }));

  const baselineRows = evalRows.map((row) => ({
    actual: row.label.labels.important,
    predicted: row.scored.event.markerRadius >= 8.5 || baselineScore(row.scored.event) >= 16,
  }));
  const modelThreshold = model?.model?.threshold ?? 0.5;
  const candidateRows = evalRows.map((row) => ({
    actual: row.label.labels.important,
    predicted: row.scored.modelProbability >= modelThreshold,
  }));

  const rankedEvents = scored.map((row, index) => ({
    ...row.event,
    surfaceScore: row.score,
    surfaceRank: index + 1,
    surfaceBand: row.band,
    surfaceReasons: row.reasons,
    surfaceClusterKey: row.clusterKey,
    surfaceClusterSize: row.clusterSize,
    duplicateOf: row.duplicateOf,
    surfaceModelProbability: round(row.modelProbability),
    surfaceRadius: row.radius,
  }));

  const metrics = {
    labels: {
      rows: evalRows.length,
      sourceCounts: labels.reduce<Record<string, number>>((acc, label) => {
        acc[label.labelSource] = (acc[label.labelSource] ?? 0) + 1;
        return acc;
      }, {}),
      humanReviewedRows: labels.filter((label) => label.labelSource === "human" && label.humanReviewed).length,
    },
    baseline: binaryMetrics(baselineRows),
    candidateModel: binaryMetrics(candidateRows),
    surfacePolicy: threshold.metrics,
    precisionAt: {
      top10: precisionAtK(evalRows.map((row) => ({ actual: row.label.labels.important, score: row.scored.score })), 10),
      top25: precisionAtK(evalRows.map((row) => ({ actual: row.label.labels.important, score: row.scored.score })), 25),
      top50: precisionAtK(evalRows.map((row) => ({ actual: row.label.labels.important, score: row.scored.score })), 50),
    },
  };

  const falsePositives = surfaceEvalRows.filter((row) => row.predicted && !row.actual);
  const falseNegatives = surfaceEvalRows.filter((row) => !row.predicted && row.actual);

  const policy = {
    version: "phase1-surfacing-policy-v1",
    generatedAt: new Date().toISOString(),
    labelSource: metrics.labels.humanReviewedRows >= 100 ? "human" : "provisional_non_human",
    threshold: thresholdValue,
    bandCutoffs: {
      lead: 72,
      watch: 52,
    },
    model: {
      source: MODEL_PATH,
      version: model?.version ?? "unknown",
      threshold: modelThreshold,
    },
    rules: {
      boosts: [
        "strategic actor or theater",
        "governance or public-safety signal",
        "high-mention diplomacy",
        "humanitarian/public-safety signal",
      ],
      penalties: [
        "duplicate source row",
        "local crime pattern",
        "entertainment/history extraction noise",
        "opinion/background article",
        "single-mention weak signal",
      ],
    },
    metrics,
    warning: "This policy is calibrated on Codex/LLM-reviewed labels unless at least 100 human labels are present. It improves product triage but is not a final scientific claim.",
  };

  const report = {
    generatedAt: policy.generatedAt,
    policyPath: POLICY_PATH,
    eventPath: EVENTS_PATH,
    reportPath: REPORT_PATH,
    threshold: thresholdValue,
    metrics,
    errorAnalysis: {
      falsePositiveCount: falsePositives.length,
      falseNegativeCount: falseNegatives.length,
      falsePositiveCauses: causeBuckets(falsePositives),
      falseNegativeCauses: causeBuckets(falseNegatives),
      topFalsePositives: errorExamples(surfaceEvalRows, "falsePositive"),
      topFalseNegatives: errorExamples(surfaceEvalRows, "falseNegative"),
    },
    topSurfacedEvents: rankedEvents.slice(0, 25).map((event) => ({
      id: event.id,
      date: event.date,
      title: eventTitle(event),
      surfaceScore: event.surfaceScore,
      band: event.surfaceBand,
      sourceDomain: hostFromUrl(event.sourceUrl),
      reasons: event.surfaceReasons,
      sourceUrl: event.sourceUrl,
    })),
  };

  parsedEvents.events = rankedEvents;
  parsedEvents.surfacingPolicy = {
    version: policy.version,
    generatedAt: policy.generatedAt,
    threshold: policy.threshold,
    warning: policy.warning,
  };

  await writeFile(EVENTS_PATH, writeCompactJson(parsedEvents));
  await mkdir(dirname(POLICY_PATH), { recursive: true });
  await writeFile(POLICY_PATH, writePrettyJson(policy));
  await mkdir(dirname(REPORT_PATH), { recursive: true });
  await writeFile(REPORT_PATH, writePrettyJson(report));

  console.log("HopeIndexAI Phase 1 surfacing calibration");
  console.log(`Events scored: ${events.length}`);
  console.log(`Eval labels: ${evalRows.length}`);
  console.log(`Chosen threshold: ${thresholdValue}`);
  console.log(`Baseline F1: ${metrics.baseline.f1}, precision: ${metrics.baseline.precision}, recall: ${metrics.baseline.recall}`);
  console.log(`Candidate model F1: ${metrics.candidateModel.f1}, precision: ${metrics.candidateModel.precision}, recall: ${metrics.candidateModel.recall}`);
  console.log(`Surface policy F1: ${metrics.surfacePolicy.f1}, precision: ${metrics.surfacePolicy.precision}, recall: ${metrics.surfacePolicy.recall}`);
  console.log(`Wrote ${POLICY_PATH}`);
  console.log(`Wrote ${REPORT_PATH}`);
  console.log(`Updated ${EVENTS_PATH}`);
}

main().catch((err) => {
  console.error("HopeIndexAI Phase 1 surfacing calibration failed:", err);
  process.exit(1);
});
