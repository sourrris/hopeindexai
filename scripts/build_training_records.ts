import { mkdir, readFile, writeFile } from "fs/promises";
import { dirname } from "path";

type LabelSource = "human" | "llm_article_review" | "bootstrap_current_rules";
type Severity = "low" | "medium" | "high" | "critical";
type TruthStatus = "source_checked_human" | "machine_reviewed" | "bootstrap" | "unverified";
type ExternalMatchStatus = "candidate_matches" | "no_candidates" | "no_country_mapping" | "no_temporal_overlap";

interface ExternalEvidenceMatch {
  sourceSystem: "ucdp_ged" | "ucdp_candidate";
  datasetVersion: string;
  evidenceTier: "external_curated";
  externalId: string;
  relId: string;
  score: number;
  confidence: "high" | "medium" | "low";
  reasons: string[];
  event: {
    dateStart: string;
    dateEnd: string;
    country: string;
    region: string;
    locationName: string;
    coordinates: { lat: number | null; lon: number | null };
    deathsBest: number;
    deathsHigh: number;
    deathsLow: number;
    civilianDeaths: number;
    typeOfViolence: number | null;
    typeLabel: string;
    conflictName: string;
    dyadName: string;
    sideA: string;
    sideB: string;
    headline: string | null;
  };
}

interface ExternalMatchRow {
  schemaVersion: "external-match.v1";
  recordId: string;
  rawEventIds: string[];
  sourceSystem: "ucdp_ged" | "ucdp_candidate";
  datasetVersion: string;
  status: ExternalMatchStatus;
  candidateCount: number;
  bestScore: number | null;
  matches: ExternalEvidenceMatch[];
  audit?: {
    notes?: string;
  };
}

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
  severity: Severity;
  continent: string;
  aiSummary?: string;
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
  labelVersion: "phase1.v1";
  labelSource: LabelSource;
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

interface TrainingRecord {
  schemaVersion: "training-record.v1";
  recordId: string;
  recordVersion: "phase2.records.v1";
  raw: {
    sourceSystem: "gdelt";
    rawEventIds: string[];
    duplicateOf: string | null;
    clusterKey: string | null;
    clusterSize: number;
  };
  source: {
    url: string;
    domain: string;
    checked: boolean;
    supportsClaim: boolean | null;
    supportStatus: "explicit" | "inferred_from_source_checked_human_review" | "not_assessed";
    evidenceGrade: string | null;
    caveatNotes: string | null;
  };
  event: {
    title: string;
    occurredOn: string;
    countryCode: string;
    continent: string;
    location: string;
    coordinates: { lat: number; lon: number };
    rawActors: string[];
    canonicalActors: Array<{
      rawName: string;
      canonicalName: string;
      resolutionStatus: "mapped_alias" | "raw_name_normalized";
      confidence: number;
    }>;
  };
  catalog: {
    category: "doom" | "bloom";
    theme: string;
    severity: Severity;
    eventType: string;
    quadClass: number | null;
    quadLabel: string;
    summary: string | null;
  };
  signals: {
    goldstein: number | null;
    avgTone: number | null;
    numMentions: number;
    hopeScore: number | null;
    markerRadius: number;
    surfaceScore: number | null;
    surfaceRank: number | null;
    surfaceBand: string | null;
    surfaceReasons: string[];
    surfaceModelProbability: number | null;
  };
  labels: {
    importance: {
      value: boolean;
      labelSource: LabelSource;
      humanReviewed: boolean;
      sourceChecked: boolean;
      reviewedBy: string;
      reviewedAt: string;
      previousLabelSource: string | null;
      rationale: string | null;
    };
    quality: {
      categoryCorrect: boolean;
      severityCorrect: boolean;
      summaryQuality: number | null;
    };
  };
  targets: {
    futureEscalation72h: {
      value: boolean;
      labelSource: "weak_future_gdelt_neighborhood";
      windowDays: 3;
      definition: string;
      confidence: number;
      supportingEventIds: string[];
    };
  };
  externalEvidence: {
    ucdpGed: {
      sourceSystem: "ucdp_ged";
      datasetVersion: "26.1";
      evidenceTier: "external_curated" | "no_direct_match" | "not_run";
      status: ExternalMatchStatus | "not_run";
      candidateCount: number;
      bestScore: number | null;
      matches: ExternalEvidenceMatch[];
      canUseAsOutcomeEvidence: boolean;
      canUseAsImportanceTruth: false;
      auditNotes: string;
    };
    ucdpCandidate: {
      sourceSystem: "ucdp_candidate";
      datasetVersion: "26.0.X";
      evidenceTier: "external_curated" | "no_direct_match" | "not_run";
      status: ExternalMatchStatus | "not_run";
      candidateCount: number;
      bestScore: number | null;
      matches: ExternalEvidenceMatch[];
      canUseAsOutcomeEvidence: boolean;
      canUseAsImportanceTruth: false;
      auditNotes: string;
    };
  };
  mlUse: {
    truthStatus: TruthStatus;
    canTrainImportance: boolean;
    canEvaluateImportance: boolean;
    canTrainWeakOutcome: boolean;
    canEvaluateOutcome: boolean;
    split: "unassigned";
    excludeReasons: string[];
  };
  audit: {
    builtBy: "scripts/build_training_records.ts";
    sourceEventPath: string;
    sourceLabelPath: string;
    labelVersion: string;
    notes: string | null;
  };
}

const EVENTS_PATH = "public/data/events.json";
const LABEL_PATH = "data/eval/phase1_labels.jsonl";
const OUTPUT_PATH = "data/training/phase2_records.jsonl";
const UCDP_GED_MATCH_PATH = "data/external/matches/phase2_ucdp_matches.jsonl";
const UCDP_CANDIDATE_MATCH_PATH = "data/external/matches/phase2_ucdp_candidate_matches.jsonl";
const RECORD_VERSION = "phase2.records.v1";

const ACTOR_STOPWORDS = new Set([
  "UNKNOWN", "GOVERNMENT", "MINISTRY", "STATE", "STATES", "UNITED", "NATIONAL",
  "INTERNATIONAL", "OFFICIAL", "OFFICIALS", "ADMINISTRATION", "PRESIDENT",
  "PRIME", "MINISTER", "CITY", "COUNTY", "LOCAL",
]);

const ACTOR_ALIASES: Record<string, string> = {
  "CHINA": "China",
  "CHINESE": "China",
  "HAMAS": "Hamas",
  "HEZBOLLAH": "Hezbollah",
  "IRAN": "Iran",
  "IRANIAN": "Iran",
  "ISRAEL": "Israel",
  "ISRAELI": "Israel",
  "LEBANON": "Lebanon",
  "NATO": "NATO",
  "PAKISTAN": "Pakistan",
  "RUSSIA": "Russia",
  "RUSSIAN": "Russia",
  "UKRAINE": "Ukraine",
  "UKRAINIAN": "Ukraine",
  "UNITED STATES": "United States",
  "US": "United States",
  "U.S.": "United States",
};

function printHelp() {
  console.log(`HopeIndexAI training record builder

Usage:
  bun run records:build

Reads:
  ${EVENTS_PATH}
  ${LABEL_PATH}
  ${UCDP_GED_MATCH_PATH} if present
  ${UCDP_CANDIDATE_MATCH_PATH} if present

Writes:
  ${OUTPUT_PATH}
`);
}

function round(n: number, digits = 4): number {
  if (!Number.isFinite(n)) return 0;
  return Number(n.toFixed(digits));
}

function readJsonl<T>(text: string): T[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, index) => {
      try {
        return JSON.parse(line) as T;
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        throw new Error(`Invalid JSONL on line ${index + 1}: ${message}`);
      }
    });
}

function writeJsonl(rows: unknown[]): string {
  return rows.map((row) => JSON.stringify(row)).join("\n") + "\n";
}

async function loadEvents(): Promise<GdeltEvent[]> {
  const parsed = JSON.parse(await readFile(EVENTS_PATH, "utf8"));
  if (!parsed || !Array.isArray(parsed.events)) {
    throw new Error(`${EVENTS_PATH} must contain an events array.`);
  }
  return parsed.events;
}

async function loadLabels(): Promise<Phase1Label[]> {
  const labels = readJsonl<Phase1Label>(await readFile(LABEL_PATH, "utf8"));
  const seen = new Set<string>();
  for (const label of labels) {
    if (seen.has(label.eventId)) throw new Error(`Duplicate label for event ${label.eventId}.`);
    seen.add(label.eventId);
  }
  return labels;
}

async function loadExternalMatches(path: string): Promise<Map<string, ExternalMatchRow>> {
  try {
    const rows = readJsonl<ExternalMatchRow>(await readFile(path, "utf8"));
    const matches = new Map<string, ExternalMatchRow>();
    for (const row of rows) {
      if (row.schemaVersion !== "external-match.v1") {
        throw new Error(`Unsupported external match schema for ${row.recordId}.`);
      }
      if (matches.has(row.recordId)) throw new Error(`Duplicate external match row for ${row.recordId}.`);
      matches.set(row.recordId, row);
    }
    return matches;
  } catch (err) {
    if (err && typeof err === "object" && "code" in err && err.code === "ENOENT") {
      return new Map();
    }
    throw err;
  }
}

function hostFromUrl(url: string | undefined): string {
  if (!url) return "";
  try {
    return new URL(url).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return "";
  }
}

function slug(value: string | undefined): string {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "") || "unknown";
}

function titleCase(value: string): string {
  return value
    .toLowerCase()
    .split(/(\s+|-)/)
    .map((part) => /^[a-z]/.test(part) ? part[0].toUpperCase() + part.slice(1) : part)
    .join("");
}

function eventTitle(event: GdeltEvent): string {
  if (event.actor1 && event.actor1 !== "Unknown") {
    return `${event.actor1}${event.actor2 && event.actor2 !== "Unknown" ? ` -> ${event.actor2}` : ""}`;
  }
  return event.quadLabel;
}

function actorTokens(event: GdeltEvent): Set<string> {
  const raw = `${event.actor1 ?? ""} ${event.actor2 ?? ""}`.toUpperCase();
  return new Set(
    raw
      .split(/[^A-Z0-9.]+/)
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

function parseDay(date: string): number {
  const ms = Date.parse(date);
  return Number.isFinite(ms) ? Math.floor(ms / 86_400_000) : Number.NaN;
}

function isEscalatoryFutureEvent(event: GdeltEvent): boolean {
  return event.category === "doom" &&
    (
      event.severity === "critical" ||
      event.severity === "high" ||
      (event.goldstein ?? 0) <= -7 ||
      event.quadClass === 4
    );
}

function futureEscalationTarget(target: GdeltEvent, events: GdeltEvent[]): TrainingRecord["targets"]["futureEscalation72h"] {
  const targetDay = parseDay(target.date);
  const related = events
    .filter((event) => {
      if (event.id === target.id || !isEscalatoryFutureEvent(event)) return false;
      const day = parseDay(event.date);
      if (!Number.isFinite(targetDay) || !Number.isFinite(day)) return false;
      if (day <= targetDay || day - targetDay > 3) return false;

      const sameCountry = Boolean(target.country && event.country === target.country);
      const sameTheme = Boolean(target.theme && event.theme === target.theme);
      return sharesActor(target, event) || (sameCountry && (sameTheme || event.theme === "Conflict"));
    })
    .sort((a, b) =>
      Math.abs(b.goldstein ?? 0) - Math.abs(a.goldstein ?? 0) ||
      Number(b.numMentions ?? 0) - Number(a.numMentions ?? 0)
    );

  const supportingEventIds = related.slice(0, 8).map((event) => event.id);

  return {
    value: related.length > 0,
    labelSource: "weak_future_gdelt_neighborhood",
    windowDays: 3,
    definition: "A related high-risk negative public event appears within the next 72 hours by shared actor or same country/theme neighborhood.",
    confidence: related.length > 0 ? round(Math.min(0.65, 0.35 + related.length * 0.05), 2) : 0.25,
    supportingEventIds,
  };
}

function isSourceCheckedHumanLabel(label: Phase1Label): boolean {
  return label.labelSource === "human" &&
    label.humanReviewed === true &&
    label.reviewContext?.sourceChecked === true &&
    label.reviewContext?.sourceSupportsClaim !== false;
}

function truthStatus(label: Phase1Label): TruthStatus {
  if (isSourceCheckedHumanLabel(label)) return "source_checked_human";
  if (label.labelSource === "llm_article_review") return "machine_reviewed";
  if (label.labelSource === "bootstrap_current_rules") return "bootstrap";
  return "unverified";
}

function sourceEvidenceGrade(label: Phase1Label): string | null {
  const grade = label.reviewContext?.evidenceGrade;
  return typeof grade === "string" ? grade : null;
}

function labelRationale(label: Phase1Label): string | null {
  const context = label.reviewContext ?? {};
  for (const key of ["rationale", "importantRationale", "codexSourceRationale"]) {
    const value = context[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return null;
}

function previousLabelSource(label: Phase1Label): string | null {
  const previous = label.reviewContext?.previousLabelSource;
  return typeof previous === "string" ? previous : null;
}

function canonicalActors(event: GdeltEvent): TrainingRecord["event"]["canonicalActors"] {
  const rawActors = [event.actor1, event.actor2]
    .map((actor) => (actor ?? "").trim())
    .filter((actor) => actor && actor.toLowerCase() !== "unknown");

  const seen = new Set<string>();
  const actors: TrainingRecord["event"]["canonicalActors"] = [];

  for (const rawName of rawActors) {
    const key = rawName.toUpperCase().replace(/\s+/g, " ");
    const mapped = ACTOR_ALIASES[key];
    const canonicalName = mapped ?? titleCase(rawName);
    const dedupeKey = canonicalName.toLowerCase();
    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);

    actors.push({
      rawName,
      canonicalName,
      resolutionStatus: mapped ? "mapped_alias" : "raw_name_normalized",
      confidence: mapped ? 0.85 : 0.45,
    });
  }

  return actors;
}

function eventType(event: GdeltEvent): string {
  if (event.quadLabel) return slug(event.quadLabel);
  if (event.theme) return slug(event.theme);
  return "unknown";
}

function sourceSupport(label: Phase1Label): Pick<TrainingRecord["source"], "checked" | "supportsClaim" | "supportStatus"> {
  const checked = label.reviewContext?.sourceChecked === true;
  const explicitSupportsClaim = label.reviewContext?.sourceSupportsClaim;
  if (checked && typeof explicitSupportsClaim === "boolean") {
    return {
      checked,
      supportsClaim: explicitSupportsClaim,
      supportStatus: "explicit",
    };
  }
  if (isSourceCheckedHumanLabel(label)) {
    return {
      checked,
      supportsClaim: true,
      supportStatus: "inferred_from_source_checked_human_review",
    };
  }
  return {
    checked,
    supportsClaim: null,
    supportStatus: "not_assessed",
  };
}

function excludeReasons(event: GdeltEvent, label: Phase1Label, actors: TrainingRecord["event"]["canonicalActors"]): string[] {
  const reasons: string[] = [];
  if (!isSourceCheckedHumanLabel(label)) reasons.push("not_source_checked_human_label");
  if (label.reviewContext?.sourceSupportsClaim === false) reasons.push("source_does_not_support_claim");
  if (!event.sourceUrl) reasons.push("missing_source_url");
  if (event.duplicateOf) reasons.push("duplicate_public_row");
  if (actors.length === 0) reasons.push("missing_actor_resolution");
  return reasons;
}

function canUseForImportanceTruth(event: GdeltEvent, label: Phase1Label, actors: TrainingRecord["event"]["canonicalActors"]): boolean {
  return isSourceCheckedHumanLabel(label) &&
    Boolean(event.sourceUrl) &&
    !event.duplicateOf &&
    actors.length > 0;
}

function evidenceBlock(
  match: ExternalMatchRow | undefined,
  sourceSystem: "ucdp_ged",
  datasetVersion: "26.1",
  notRunNotes: string,
  defaultNotes: string
): TrainingRecord["externalEvidence"]["ucdpGed"];
function evidenceBlock(
  match: ExternalMatchRow | undefined,
  sourceSystem: "ucdp_candidate",
  datasetVersion: "26.0.X",
  notRunNotes: string,
  defaultNotes: string
): TrainingRecord["externalEvidence"]["ucdpCandidate"];
function evidenceBlock(
  match: ExternalMatchRow | undefined,
  sourceSystem: "ucdp_ged" | "ucdp_candidate",
  datasetVersion: "26.1" | "26.0.X",
  notRunNotes: string,
  defaultNotes: string
): TrainingRecord["externalEvidence"]["ucdpGed"] | TrainingRecord["externalEvidence"]["ucdpCandidate"] {
  const hasMatch = Boolean(match && match.matches.length > 0);
  const bestScore = match?.bestScore ?? null;
  return {
    sourceSystem,
    datasetVersion,
    evidenceTier: hasMatch ? "external_curated" as const : match ? "no_direct_match" as const : "not_run" as const,
    status: match?.status ?? "not_run" as const,
    candidateCount: match?.candidateCount ?? 0,
    bestScore,
    matches: match?.matches ?? [],
    canUseAsOutcomeEvidence: hasMatch && Number(bestScore ?? 0) >= 0.65,
    canUseAsImportanceTruth: false as const,
    auditNotes: match?.audit?.notes ?? (match ? defaultNotes : notRunNotes),
  } as TrainingRecord["externalEvidence"]["ucdpGed"] | TrainingRecord["externalEvidence"]["ucdpCandidate"];
}

function externalEvidence(gedMatch: ExternalMatchRow | undefined, candidateMatch: ExternalMatchRow | undefined): TrainingRecord["externalEvidence"] {
  return {
    ucdpGed: evidenceBlock(
      gedMatch,
      "ucdp_ged",
      "26.1",
      "Run bun run import:ucdp, bun run match:external, then bun run records:build to attach UCDP GED evidence candidates.",
      "External UCDP GED evidence is attached as curated conflict evidence, not final importance truth."
    ),
    ucdpCandidate: evidenceBlock(
      candidateMatch,
      "ucdp_candidate",
      "26.0.X",
      "Run bun run import:ucdp-candidate, bun run match:ucdp-candidate, then bun run records:build to attach current UCDP Candidate evidence.",
      "External UCDP Candidate evidence is attached as current curated conflict evidence, not final importance truth."
    ),
  };
}

function buildRecord(
  event: GdeltEvent,
  label: Phase1Label,
  events: GdeltEvent[],
  gedMatch: ExternalMatchRow | undefined,
  candidateMatch: ExternalMatchRow | undefined
): TrainingRecord {
  const actors = canonicalActors(event);
  const source = sourceSupport(label);
  const canUseImportance = canUseForImportanceTruth(event, label, actors);
  const context = label.reviewContext ?? {};

  return {
    schemaVersion: "training-record.v1",
    recordId: `training:phase2:${slug(event.id)}`,
    recordVersion: RECORD_VERSION,
    raw: {
      sourceSystem: "gdelt",
      rawEventIds: [event.id],
      duplicateOf: event.duplicateOf ?? null,
      clusterKey: event.surfaceClusterKey ?? null,
      clusterSize: Number.isFinite(event.surfaceClusterSize) ? Number(event.surfaceClusterSize) : 1,
    },
    source: {
      url: event.sourceUrl ?? "",
      domain: hostFromUrl(event.sourceUrl),
      checked: source.checked,
      supportsClaim: source.supportsClaim,
      supportStatus: source.supportStatus,
      evidenceGrade: sourceEvidenceGrade(label),
      caveatNotes: typeof context.sourceCaveatNotes === "string" ? context.sourceCaveatNotes : null,
    },
    event: {
      title: eventTitle(event),
      occurredOn: event.date,
      countryCode: event.country,
      continent: event.continent,
      location: event.location || event.country,
      coordinates: { lat: event.lat, lon: event.lon },
      rawActors: [event.actor1, event.actor2].filter((actor) => actor && actor !== "Unknown"),
      canonicalActors: actors,
    },
    catalog: {
      category: event.category,
      theme: event.theme ?? "Unknown",
      severity: event.severity,
      eventType: eventType(event),
      quadClass: event.quadClass,
      quadLabel: event.quadLabel,
      summary: event.aiSummary ?? null,
    },
    signals: {
      goldstein: event.goldstein,
      avgTone: event.avgTone,
      numMentions: event.numMentions,
      hopeScore: Number.isFinite(event.hopeScore) ? Number(event.hopeScore) : null,
      markerRadius: event.markerRadius,
      surfaceScore: Number.isFinite(event.surfaceScore) ? Number(event.surfaceScore) : null,
      surfaceRank: Number.isFinite(event.surfaceRank) ? Number(event.surfaceRank) : null,
      surfaceBand: event.surfaceBand ?? null,
      surfaceReasons: Array.isArray(event.surfaceReasons) ? event.surfaceReasons : [],
      surfaceModelProbability: Number.isFinite(event.surfaceModelProbability) ? Number(event.surfaceModelProbability) : null,
    },
    labels: {
      importance: {
        value: label.labels.important,
        labelSource: label.labelSource,
        humanReviewed: label.humanReviewed,
        sourceChecked: label.reviewContext?.sourceChecked === true,
        reviewedBy: label.reviewedBy,
        reviewedAt: label.reviewedAt,
        previousLabelSource: previousLabelSource(label),
        rationale: labelRationale(label),
      },
      quality: {
        categoryCorrect: label.labels.categoryCorrect,
        severityCorrect: label.labels.severityCorrect,
        summaryQuality: label.labels.summaryQuality,
      },
    },
    targets: {
      futureEscalation72h: futureEscalationTarget(event, events),
    },
    externalEvidence: externalEvidence(gedMatch, candidateMatch),
    mlUse: {
      truthStatus: truthStatus(label),
      canTrainImportance: canUseImportance,
      canEvaluateImportance: canUseImportance,
      canTrainWeakOutcome: true,
      canEvaluateOutcome: false,
      split: "unassigned",
      excludeReasons: excludeReasons(event, label, actors),
    },
    audit: {
      builtBy: "scripts/build_training_records.ts",
      sourceEventPath: EVENTS_PATH,
      sourceLabelPath: LABEL_PATH,
      labelVersion: label.labelVersion,
      notes: label.notes ?? null,
    },
  };
}

async function main() {
  if (process.argv.includes("-h") || process.argv.includes("--help")) {
    printHelp();
    return;
  }

  const events = await loadEvents();
  const labels = await loadLabels();
  const gedMatches = await loadExternalMatches(UCDP_GED_MATCH_PATH);
  const candidateMatches = await loadExternalMatches(UCDP_CANDIDATE_MATCH_PATH);
  const eventsById = new Map(events.map((event) => [event.id, event]));
  const records: TrainingRecord[] = [];
  const missingEventIds: string[] = [];

  for (const label of labels) {
    const event = eventsById.get(label.eventId);
    if (!event) {
      missingEventIds.push(label.eventId);
      continue;
    }
    const recordId = `training:phase2:${slug(event.id)}`;
    records.push(buildRecord(event, label, events, gedMatches.get(recordId), candidateMatches.get(recordId)));
  }

  await mkdir(dirname(OUTPUT_PATH), { recursive: true });
  await writeFile(OUTPUT_PATH, writeJsonl(records));

  const trainingGrade = records.filter((record) => record.mlUse.canTrainImportance).length;
  const sourceCheckedHuman = records.filter((record) => record.mlUse.truthStatus === "source_checked_human").length;
  const weakOutcomePositive = records.filter((record) => record.targets.futureEscalation72h.value).length;
  const ucdpCandidateMatches = records.filter((record) => record.externalEvidence.ucdpGed.matches.length > 0).length;
  const ucdpCandidateEvidenceMatches = records.filter((record) => record.externalEvidence.ucdpCandidate.matches.length > 0).length;
  const ucdpEvidenceStatus = gedMatches.size > 0 ? "attached" : "not_run";
  const ucdpCandidateEvidenceStatus = candidateMatches.size > 0 ? "attached" : "not_run";

  console.log("HopeIndexAI training records build");
  console.log(`Labels read: ${labels.length}`);
  console.log(`Records written: ${records.length}`);
  console.log(`Training-grade importance records: ${trainingGrade}`);
  console.log(`Source-checked human records: ${sourceCheckedHuman}`);
  console.log(`Weak future-escalation positives: ${weakOutcomePositive}`);
  console.log(`UCDP GED external evidence: ${ucdpEvidenceStatus}, candidates on ${ucdpCandidateMatches} records`);
  console.log(`UCDP Candidate external evidence: ${ucdpCandidateEvidenceStatus}, candidates on ${ucdpCandidateEvidenceMatches} records`);
  if (missingEventIds.length > 0) {
    console.warn(`Missing event rows: ${missingEventIds.length}`);
  }
  console.log(`Wrote ${OUTPUT_PATH}`);
}

main().catch((err) => {
  console.error("HopeIndexAI training records build failed:", err instanceof Error ? err.message : err);
  process.exit(1);
});
