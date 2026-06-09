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
}

interface Phase1Label {
  eventId: string;
  labelVersion: "phase1.v1";
  labelSource: "human" | "llm_article_review" | "bootstrap_current_rules";
  humanReviewed: boolean;
  reviewedBy: string;
  reviewedAt: string;
  labels: {
    important: boolean;
    categoryCorrect: boolean;
    severityCorrect: boolean;
    summaryQuality: number | null;
  };
  reviewContext?: Record<string, unknown>;
  notes?: string;
}

interface ModelArtifact {
  version?: string;
  target?: { name?: string; definition?: string; labelSource?: string };
  featureNames?: string[];
  preprocessing?: { means?: number[]; stds?: number[] };
  model?: { bias?: number; weights?: number[]; threshold?: number };
  metrics?: Record<string, unknown>;
  limitations?: string[];
}

interface ScoredRow {
  event: GdeltEvent;
  label: Phase1Label;
  baseline: { score: number; prediction: boolean };
  candidate?: { score: number; prediction: boolean };
}

const EVENTS_PATH = "public/data/events.json";
const MODEL_PATH = "public/data/escalation-model.json";
const LABEL_PATH = "data/eval/phase1_labels.jsonl";
const REPORT_PATH = "data/eval/phase1_report.json";
const MIN_HUMAN_LABELS_FOR_CLAIM = 100;

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

function sharesActor(a: GdeltEvent, b: GdeltEvent): boolean {
  const tokens = actorTokens(a);
  if (tokens.size === 0) return false;
  for (const token of actorTokens(b)) {
    if (tokens.has(token)) return true;
  }
  return false;
}

function hostFromUrl(url: string | undefined): string {
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

function pastEvents(target: GdeltEvent, events: GdeltEvent[], days: number): GdeltEvent[] {
  const targetDay = parseDay(target.date);
  return events.filter((event) => {
    const eventDay = parseDay(event.date);
    return Number.isFinite(eventDay) && eventDay < targetDay && targetDay - eventDay <= days;
  });
}

function doomRatio(events: GdeltEvent[]): number {
  if (events.length === 0) return 0;
  return events.filter((event) => event.category === "doom").length / events.length;
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
  const past3 = pastEvents(event, events, 3);
  const past7 = pastEvents(event, events, 7);
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
  ];
}

function readJsonl(text: string): unknown[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, index) => {
      try {
        return JSON.parse(line);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        throw new Error(`Invalid JSONL on line ${index + 1}: ${msg}`);
      }
    });
}

function validateLabel(value: unknown, index: number): Phase1Label {
  const row = value as Phase1Label;
  const prefix = `Label line ${index + 1}`;
  if (!row || typeof row !== "object") throw new Error(`${prefix} must be an object.`);
  if (!row.eventId || typeof row.eventId !== "string") throw new Error(`${prefix} is missing eventId.`);
  if (row.labelVersion !== "phase1.v1") throw new Error(`${prefix} has unsupported labelVersion.`);
  if (row.labelSource !== "human" && row.labelSource !== "llm_article_review" && row.labelSource !== "bootstrap_current_rules") {
    throw new Error(`${prefix} has unsupported labelSource.`);
  }
  if (typeof row.humanReviewed !== "boolean") throw new Error(`${prefix} is missing humanReviewed.`);
  if (row.labelSource === "human" && row.humanReviewed !== true) {
    throw new Error(`${prefix} has labelSource=human but humanReviewed is not true.`);
  }
  if (row.labelSource !== "human" && row.humanReviewed === true) {
    throw new Error(`${prefix} marks non-human labels as humanReviewed.`);
  }
  if (!row.labels || typeof row.labels !== "object") throw new Error(`${prefix} is missing labels.`);
  if (typeof row.labels.important !== "boolean") throw new Error(`${prefix} labels.important must be boolean.`);
  if (typeof row.labels.categoryCorrect !== "boolean") throw new Error(`${prefix} labels.categoryCorrect must be boolean.`);
  if (typeof row.labels.severityCorrect !== "boolean") throw new Error(`${prefix} labels.severityCorrect must be boolean.`);
  if (row.labels.summaryQuality !== null) {
    if (typeof row.labels.summaryQuality !== "number" || row.labels.summaryQuality < 1 || row.labels.summaryQuality > 5) {
      throw new Error(`${prefix} labels.summaryQuality must be null or a 1-5 number.`);
    }
  }
  return row;
}

function isSourceCheckedHumanLabel(label: Phase1Label): boolean {
  return label.labelSource === "human" &&
    label.humanReviewed === true &&
    label.reviewContext?.sourceChecked === true;
}

async function loadEvents(): Promise<{ events: GdeltEvent[]; updated?: string; count?: number }> {
  const parsed = JSON.parse(await readFile(EVENTS_PATH, "utf8"));
  if (!parsed || !Array.isArray(parsed.events)) throw new Error(`${EVENTS_PATH} must contain an events array.`);
  return { events: parsed.events, updated: parsed.updated, count: parsed.count };
}

async function loadModel(): Promise<ModelArtifact | null> {
  try {
    return JSON.parse(await readFile(MODEL_PATH, "utf8"));
  } catch {
    return null;
  }
}

async function loadLabels(): Promise<Phase1Label[]> {
  const raw = await readFile(LABEL_PATH, "utf8");
  const rows = readJsonl(raw).map(validateLabel);
  const seen = new Set<string>();
  for (const row of rows) {
    if (seen.has(row.eventId)) throw new Error(`Duplicate label for event ${row.eventId}.`);
    seen.add(row.eventId);
  }
  return rows;
}

function baselineScore(event: GdeltEvent): number {
  const absGoldstein = Math.abs(event.goldstein ?? 0);
  const mentionBoost = Math.log1p(event.numMentions ?? 0) * 1.8;
  const severityBoost = event.severity === "critical" ? 2.5 : event.severity === "high" ? 1.4 : 0;
  const conflictBoost = event.category === "doom" ? 0.4 : 0;
  return round(absGoldstein + mentionBoost + severityBoost + conflictBoost);
}

function baselinePrediction(event: GdeltEvent): { score: number; prediction: boolean } {
  const score = baselineScore(event);
  return {
    score,
    prediction: event.markerRadius >= 8.5 || score >= 16,
  };
}

function candidatePrediction(event: GdeltEvent, events: GdeltEvent[], model: ModelArtifact | null): { score: number; prediction: boolean } | undefined {
  if (!model?.featureNames || !model.preprocessing || !model.model) return undefined;

  const featureMismatch =
    model.featureNames.length !== FEATURE_NAMES.length ||
    model.featureNames.some((name, index) => name !== FEATURE_NAMES[index]);
  if (featureMismatch) {
    throw new Error(`${MODEL_PATH} featureNames do not match the Phase 1 evaluator feature order.`);
  }

  const raw = featuresFor(event, events);
  const means = model.preprocessing.means ?? [];
  const stds = model.preprocessing.stds ?? [];
  const weights = model.model.weights ?? [];
  const standardized = raw.map((value, index) => (value - (means[index] ?? 0)) / (stds[index] || 1));
  const logit = (model.model.bias ?? 0) + standardized.reduce((sum, value, index) => sum + value * (weights[index] ?? 0), 0);
  const probability = sigmoid(logit);
  const threshold = model.model.threshold ?? 0.5;

  return {
    score: round(probability),
    prediction: probability >= threshold,
  };
}

function binaryMetrics(rows: ScoredRow[], key: "baseline" | "candidate") {
  let tp = 0;
  let fp = 0;
  let tn = 0;
  let fn = 0;
  let scored = 0;

  for (const row of rows) {
    const pred = key === "baseline" ? row.baseline.prediction : row.candidate?.prediction;
    if (typeof pred !== "boolean") continue;
    scored++;
    const actual = row.label.labels.important;
    if (pred && actual) tp++;
    else if (pred && !actual) fp++;
    else if (!pred && !actual) tn++;
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
    samples: scored,
    positives,
    negatives,
    predictedPositive,
    baseRate: round(positives / Math.max(1, scored)),
    accuracy: round((tp + tn) / Math.max(1, scored)),
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

function labelQuality(rows: ScoredRow[]) {
  const summaryRows = rows.filter((row) => row.label.labels.summaryQuality !== null);
  return {
    categoryAccuracy: round(rows.filter((row) => row.label.labels.categoryCorrect).length / Math.max(1, rows.length)),
    severityAccuracy: round(rows.filter((row) => row.label.labels.severityCorrect).length / Math.max(1, rows.length)),
    summaryQuality: {
      samples: summaryRows.length,
      average: summaryRows.length
        ? round(summaryRows.reduce((sum, row) => sum + (row.label.labels.summaryQuality ?? 0), 0) / summaryRows.length)
        : null,
    },
  };
}

function eventTitle(event: GdeltEvent): string {
  if (event.actor1 && event.actor1 !== "Unknown") {
    return `${event.actor1}${event.actor2 && event.actor2 !== "Unknown" ? ` -> ${event.actor2}` : ""}`;
  }
  return event.quadLabel;
}

function errorExamples(rows: ScoredRow[], key: "baseline" | "candidate", kind: "falsePositive" | "falseNegative") {
  return rows
    .filter((row) => {
      const pred = key === "baseline" ? row.baseline.prediction : row.candidate?.prediction;
      if (typeof pred !== "boolean") return false;
      const actual = row.label.labels.important;
      return kind === "falsePositive" ? pred && !actual : !pred && actual;
    })
    .sort((a, b) => {
      const aScore = key === "baseline" ? a.baseline.score : a.candidate?.score ?? 0;
      const bScore = key === "baseline" ? b.baseline.score : b.candidate?.score ?? 0;
      return kind === "falsePositive" ? bScore - aScore : aScore - bScore;
    })
    .slice(0, 10)
    .map((row) => ({
      id: row.event.id,
      date: row.event.date,
      title: eventTitle(row.event),
      country: row.event.country,
      continent: row.event.continent,
      theme: row.event.theme,
      severity: row.event.severity,
      goldstein: row.event.goldstein,
      numMentions: row.event.numMentions,
      score: key === "baseline" ? row.baseline.score : row.candidate?.score,
      sourceUrl: row.event.sourceUrl,
      labelImportant: row.label.labels.important,
    }));
}

function buildVerdict(
  sourceCheckedHumanRows: ScoredRow[],
  evaluatedRows: ScoredRow[],
  primaryTruthSource: Phase1Label["labelSource"],
  baseline: ReturnType<typeof binaryMetrics>,
  candidate?: ReturnType<typeof binaryMetrics>
) {
  if (sourceCheckedHumanRows.length < MIN_HUMAN_LABELS_FOR_CLAIM) {
    const sourceDescription = primaryTruthSource === "human"
      ? "source-checked human labels"
      : primaryTruthSource === "llm_article_review"
      ? "LLM-reviewed article labels"
      : "bootstrap labels";
    return {
      status: "not_enough_human_labels",
      canClaimImprovement: false,
      text: `No human model improvement claim yet: only ${sourceCheckedHumanRows.length} source-checked human labels found, and Phase 1 requires at least ${MIN_HUMAN_LABELS_FOR_CLAIM}. The current metrics use ${sourceDescription} on ${evaluatedRows.length} rows.`,
    };
  }

  if (!candidate) {
    return {
      status: "candidate_unavailable",
      canClaimImprovement: false,
      text: "No model improvement claim: the candidate model artifact was unavailable or could not score the eval rows.",
    };
  }

  const f1Gain = candidate.f1 - baseline.f1;
  const falseAlarmChange = candidate.falseAlarmRate - baseline.falseAlarmRate;
  const improved = f1Gain >= 0.03 && falseAlarmChange <= 0.02;

  return {
    status: improved ? "candidate_beats_baseline" : "candidate_does_not_beat_baseline",
    canClaimImprovement: improved,
    f1Gain: round(f1Gain),
    falseAlarmChange: round(falseAlarmChange),
    text: improved
      ? "Candidate beats the baseline on source-checked human Phase 1 labels. It is reasonable to say the measured model improved on this eval set."
      : "No model improvement claim: the candidate did not beat the baseline by the Phase 1 rule.",
  };
}

async function main() {
  const dataset = await loadEvents();
  const eventsById = new Map(dataset.events.map((event) => [event.id, event]));
  const model = await loadModel();
  const labels = await loadLabels();

  const missingEventIds: string[] = [];
  const scoredRows: ScoredRow[] = [];

  for (const label of labels) {
    const event = eventsById.get(label.eventId);
    if (!event) {
      missingEventIds.push(label.eventId);
      continue;
    }

    scoredRows.push({
      event,
      label,
      baseline: baselinePrediction(event),
      candidate: candidatePrediction(event, dataset.events, model),
    });
  }

  const humanRows = scoredRows.filter((row) => row.label.labelSource === "human" && row.label.humanReviewed);
  const sourceCheckedHumanRows = humanRows.filter((row) => isSourceCheckedHumanLabel(row.label));
  const uncheckedHumanRows = humanRows.filter((row) => !isSourceCheckedHumanLabel(row.label));
  const llmRows = scoredRows.filter((row) => row.label.labelSource === "llm_article_review");
  const bootstrapRows = scoredRows.filter((row) => row.label.labelSource === "bootstrap_current_rules");
  const primaryRows = sourceCheckedHumanRows.length > 0 ? sourceCheckedHumanRows : llmRows.length > 0 ? llmRows : scoredRows;
  const primaryTruthSource = sourceCheckedHumanRows.length > 0 ? "human" : llmRows.length > 0 ? "llm_article_review" : "bootstrap_current_rules";
  const baseline = binaryMetrics(primaryRows, "baseline");
  const candidate = model ? binaryMetrics(primaryRows, "candidate") : undefined;
  const verdict = buildVerdict(sourceCheckedHumanRows, primaryRows, primaryTruthSource, baseline, candidate);

  const report = {
    generatedAt: new Date().toISOString(),
    phase: "phase1_measured_mvp",
    paths: {
      events: EVENTS_PATH,
      labels: LABEL_PATH,
      model: MODEL_PATH,
      report: REPORT_PATH,
    },
    data: {
      eventsUpdated: dataset.updated,
      eventCount: dataset.events.length,
      labelRows: labels.length,
      matchedLabelRows: scoredRows.length,
      missingEventIds,
      humanReviewedRows: humanRows.length,
      sourceCheckedHumanRows: sourceCheckedHumanRows.length,
      uncheckedHumanReviewedRows: uncheckedHumanRows.length,
      llmReviewedRows: llmRows.length,
      bootstrapRows: bootstrapRows.length,
      primaryTruthSource,
      minHumanLabelsForImprovementClaim: MIN_HUMAN_LABELS_FOR_CLAIM,
      minSourceCheckedHumanLabelsForImprovementClaim: MIN_HUMAN_LABELS_FOR_CLAIM,
    },
    definitions: {
      baseline: "v0 current surfacing heuristic: Goldstein strength, media mentions, severity, and marker radius.",
      candidate: model
        ? `v1 stored escalation model: ${model.version ?? "unknown"}`
        : "v1 stored escalation model unavailable.",
      importantLabel: "Human answer to: should this event be surfaced as important in the app?",
      warning: "LLM-reviewed and bootstrap labels are useful for triage, but only source-checked human labels can prove that the model improved.",
    },
    baseline: {
      name: "v0_current_gdelt_goldstein_surface_score",
      metrics: baseline,
      topFalsePositives: errorExamples(primaryRows, "baseline", "falsePositive"),
      topFalseNegatives: errorExamples(primaryRows, "baseline", "falseNegative"),
    },
    candidate: candidate ? {
      name: model?.version ?? "unknown_candidate",
      target: model?.target,
      modelWeakLabelSource: model?.target?.labelSource,
      threshold: model?.model?.threshold ?? 0.5,
      metrics: candidate,
      modelTestMetricsFromTraining: model?.metrics?.test,
      topFalsePositives: errorExamples(primaryRows, "candidate", "falsePositive"),
      topFalseNegatives: errorExamples(primaryRows, "candidate", "falseNegative"),
    } : null,
    labelQuality: labelQuality(primaryRows),
    verdict,
  };

  await mkdir(dirname(REPORT_PATH), { recursive: true });
  await writeFile(REPORT_PATH, JSON.stringify(report, null, 2));

  console.log("HopeIndexAI Phase 1 eval");
  console.log(`Labels: ${labels.length} total, ${humanRows.length} human-reviewed (${sourceCheckedHumanRows.length} source-checked, ${uncheckedHumanRows.length} unchecked), ${llmRows.length} LLM-reviewed, ${bootstrapRows.length} bootstrap`);
  console.log(`Primary truth source: ${primaryTruthSource}`);
  console.log(`Baseline F1: ${baseline.f1}, precision: ${baseline.precision}, recall: ${baseline.recall}`);
  if (candidate) {
    console.log(`Candidate F1: ${candidate.f1}, precision: ${candidate.precision}, recall: ${candidate.recall}`);
  }
  console.log(`Verdict: ${verdict.text}`);
  console.log(`Wrote ${REPORT_PATH}`);

  if (missingEventIds.length > 0) {
    console.warn(`Warning: ${missingEventIds.length} labels did not match events in ${EVENTS_PATH}.`);
  }
}

main().catch((err) => {
  console.error("HopeIndexAI Phase 1 eval failed:", err);
  process.exit(1);
});
