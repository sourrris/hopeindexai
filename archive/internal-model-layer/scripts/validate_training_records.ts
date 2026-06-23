import { readFile } from "fs/promises";

type LabelSource = "human" | "llm_article_review" | "bootstrap_current_rules";
type TruthStatus = "source_checked_human" | "machine_reviewed" | "bootstrap" | "unverified";
type ExternalEvidenceTier = "external_curated" | "no_direct_match" | "not_run";
type ExternalMatchStatus = "candidate_matches" | "no_candidates" | "no_country_mapping" | "no_temporal_overlap" | "not_run";

interface GdeltEvent {
  id: string;
  sourceUrl: string;
  duplicateOf?: string | null;
}

interface Phase1Label {
  eventId: string;
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
}

interface TrainingRecord {
  schemaVersion: string;
  recordId: string;
  recordVersion: string;
  raw?: {
    sourceSystem?: string;
    rawEventIds?: string[];
    duplicateOf?: string | null;
    clusterKey?: string | null;
    clusterSize?: number;
  };
  source?: {
    url?: string;
    domain?: string;
    checked?: boolean;
    supportsClaim?: boolean | null;
    supportStatus?: string;
    evidenceGrade?: string | null;
  };
  event?: {
    title?: string;
    occurredOn?: string;
    countryCode?: string;
    continent?: string;
    location?: string;
    coordinates?: { lat?: number; lon?: number };
    rawActors?: string[];
    canonicalActors?: Array<{ rawName?: string; canonicalName?: string; confidence?: number }>;
  };
  catalog?: {
    category?: string;
    theme?: string;
    severity?: string;
    eventType?: string;
    quadClass?: number | null;
    quadLabel?: string;
  };
  signals?: {
    goldstein?: number | null;
    avgTone?: number | null;
    numMentions?: number;
    markerRadius?: number;
  };
  labels?: {
    importance?: {
      value?: boolean;
      labelSource?: LabelSource;
      humanReviewed?: boolean;
      sourceChecked?: boolean;
      reviewedBy?: string;
      reviewedAt?: string;
    };
    quality?: {
      categoryCorrect?: boolean;
      severityCorrect?: boolean;
      summaryQuality?: number | null;
    };
  };
  targets?: {
    futureEscalation72h?: {
      value?: boolean;
      labelSource?: string;
      windowDays?: number;
      confidence?: number;
      supportingEventIds?: string[];
    };
  };
  externalEvidence?: {
    ucdpGed?: {
      sourceSystem?: string;
      datasetVersion?: string;
      evidenceTier?: ExternalEvidenceTier;
      status?: ExternalMatchStatus;
      candidateCount?: number;
      bestScore?: number | null;
      matches?: Array<{
        sourceSystem?: string;
        datasetVersion?: string;
        evidenceTier?: string;
        externalId?: string;
        relId?: string;
        score?: number;
        confidence?: string;
        reasons?: string[];
        event?: {
          dateStart?: string;
          dateEnd?: string;
          country?: string;
          deathsBest?: number;
          typeLabel?: string;
        };
      }>;
      canUseAsOutcomeEvidence?: boolean;
      canUseAsImportanceTruth?: boolean;
      auditNotes?: string;
    };
    ucdpCandidate?: {
      sourceSystem?: string;
      datasetVersion?: string;
      evidenceTier?: ExternalEvidenceTier;
      status?: ExternalMatchStatus;
      candidateCount?: number;
      bestScore?: number | null;
      matches?: Array<{
        sourceSystem?: string;
        datasetVersion?: string;
        evidenceTier?: string;
        externalId?: string;
        relId?: string;
        score?: number;
        confidence?: string;
        reasons?: string[];
        event?: {
          dateStart?: string;
          dateEnd?: string;
          country?: string;
          deathsBest?: number;
          typeLabel?: string;
        };
      }>;
      canUseAsOutcomeEvidence?: boolean;
      canUseAsImportanceTruth?: boolean;
      auditNotes?: string;
    };
  };
  mlUse?: {
    truthStatus?: TruthStatus;
    canTrainImportance?: boolean;
    canEvaluateImportance?: boolean;
    canTrainWeakOutcome?: boolean;
    canEvaluateOutcome?: boolean;
    split?: string;
    excludeReasons?: string[];
  };
}

const EVENTS_PATH = "public/data/events.json";
const LABEL_PATH = "data/eval/phase1_labels.jsonl";
const RECORDS_PATH = "data/training/phase2_records.jsonl";
const RECORD_ID = /^training:phase2:[a-z0-9_]+$/;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function printHelp() {
  console.log(`HopeIndexAI training records validator

Usage:
  bun run records:validate

Reads:
  ${RECORDS_PATH}
  ${EVENTS_PATH}
  ${LABEL_PATH}
`);
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

async function loadEvents(): Promise<Map<string, GdeltEvent>> {
  const parsed = JSON.parse(await readFile(EVENTS_PATH, "utf8"));
  if (!parsed || !Array.isArray(parsed.events)) {
    throw new Error(`${EVENTS_PATH} must contain an events array.`);
  }
  return new Map(parsed.events.map((event: GdeltEvent) => [event.id, event]));
}

async function loadLabels(): Promise<Map<string, Phase1Label>> {
  const labels = readJsonl<Phase1Label>(await readFile(LABEL_PATH, "utf8"));
  return new Map(labels.map((label) => [label.eventId, label]));
}

function hostFromUrl(url: string | undefined): string {
  if (!url) return "";
  try {
    return new URL(url).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return "";
  }
}

function isSourceCheckedHumanLabel(label: Phase1Label | undefined): boolean {
  return label?.labelSource === "human" &&
    label.humanReviewed === true &&
    label.reviewContext?.sourceChecked === true &&
    label.reviewContext?.sourceSupportsClaim !== false;
}

function expectedTruthStatus(label: Phase1Label | undefined): TruthStatus {
  if (isSourceCheckedHumanLabel(label)) return "source_checked_human";
  if (label?.labelSource === "llm_article_review") return "machine_reviewed";
  if (label?.labelSource === "bootstrap_current_rules") return "bootstrap";
  return "unverified";
}

function fail(failures: string[], record: TrainingRecord, message: string) {
  failures.push(`${record.recordId || "unknown-record"}: ${message}`);
}

function validateExternalEvidenceBlock(
  failures: string[],
  record: TrainingRecord,
  block: TrainingRecord["externalEvidence"]["ucdpGed"] | TrainingRecord["externalEvidence"]["ucdpCandidate"] | undefined,
  key: "ucdpGed" | "ucdpCandidate",
  expectedSourceSystem: "ucdp_ged" | "ucdp_candidate",
  expectedVersion: "26.1" | "26.0.X"
) {
  const label = `externalEvidence.${key}`;
  if (!block) {
    fail(failures, record, `${label} is required.`);
    return;
  }

  const matches = block.matches ?? [];
  if (block.sourceSystem !== expectedSourceSystem) fail(failures, record, `${label}.sourceSystem must be ${expectedSourceSystem}.`);
  if (block.datasetVersion !== expectedVersion) fail(failures, record, `${label}.datasetVersion must be ${expectedVersion}.`);
  if (!["external_curated", "no_direct_match", "not_run"].includes(String(block.evidenceTier))) {
    fail(failures, record, `${label}.evidenceTier is invalid.`);
  }
  if (!["candidate_matches", "no_candidates", "no_country_mapping", "no_temporal_overlap", "not_run"].includes(String(block.status))) {
    fail(failures, record, `${label}.status is invalid.`);
  }
  if (!Number.isInteger(block.candidateCount) || Number(block.candidateCount) < 0) {
    fail(failures, record, `${label}.candidateCount must be a non-negative integer.`);
  }
  if (block.bestScore !== null && (!Number.isFinite(block.bestScore) || Number(block.bestScore) < 0 || Number(block.bestScore) > 1)) {
    fail(failures, record, `${label}.bestScore must be null or between 0 and 1.`);
  }
  if (!Array.isArray(matches)) fail(failures, record, `${label}.matches must be an array.`);
  if (block.evidenceTier === "external_curated" && matches.length === 0) {
    fail(failures, record, `${label} external_curated evidence requires at least one match.`);
  }
  if (block.status === "candidate_matches" && matches.length === 0) {
    fail(failures, record, `${label} candidate_matches status requires at least one match.`);
  }
  if (block.status !== "candidate_matches" && matches.length > 0) {
    fail(failures, record, `${label} matches can only be present with candidate_matches status.`);
  }
  if (block.canUseAsImportanceTruth !== false) {
    fail(failures, record, `${label} cannot become final importance truth.`);
  }
  if (typeof block.canUseAsOutcomeEvidence !== "boolean") {
    fail(failures, record, `${label}.canUseAsOutcomeEvidence must be boolean.`);
  }
  if (!block.auditNotes) fail(failures, record, `${label}.auditNotes is required.`);

  for (const match of matches) {
    if (match.sourceSystem !== expectedSourceSystem) fail(failures, record, `${label} match sourceSystem must be ${expectedSourceSystem}.`);
    if (expectedSourceSystem === "ucdp_ged" && match.datasetVersion !== "26.1") fail(failures, record, `${label} match datasetVersion must be 26.1.`);
    if (expectedSourceSystem === "ucdp_candidate" && !String(match.datasetVersion ?? "").startsWith("26.")) {
      fail(failures, record, `${label} match datasetVersion must be a UCDP Candidate 26.x version.`);
    }
    if (match.evidenceTier !== "external_curated") fail(failures, record, `${label} match evidenceTier must be external_curated.`);
    if (!match.externalId) fail(failures, record, `${label} match externalId is required.`);
    if (!Number.isFinite(match.score) || Number(match.score) < 0 || Number(match.score) > 1) {
      fail(failures, record, `${label} match score must be between 0 and 1.`);
    }
    if (!match.event?.dateStart || !ISO_DATE.test(match.event.dateStart)) fail(failures, record, `${label} match dateStart must be YYYY-MM-DD.`);
    if (!match.event?.dateEnd || !ISO_DATE.test(match.event.dateEnd)) fail(failures, record, `${label} match dateEnd must be YYYY-MM-DD.`);
    if (!match.event?.country) fail(failures, record, `${label} match country is required.`);
  }
}

function validateRecord(
  record: TrainingRecord,
  index: number,
  eventsById: Map<string, GdeltEvent>,
  labelsById: Map<string, Phase1Label>,
  seenRecordIds: Set<string>,
  failures: string[]
) {
  if (record.schemaVersion !== "training-record.v1") fail(failures, record, "unsupported schemaVersion.");
  if (record.recordVersion !== "phase2.records.v1") fail(failures, record, "unsupported recordVersion.");
  if (!record.recordId || !RECORD_ID.test(record.recordId)) fail(failures, record, "invalid recordId.");
  if (record.recordId && seenRecordIds.has(record.recordId)) fail(failures, record, "duplicate recordId.");
  if (record.recordId) seenRecordIds.add(record.recordId);

  const rawEventIds = record.raw?.rawEventIds ?? [];
  if (!Array.isArray(rawEventIds) || rawEventIds.length === 0) fail(failures, record, "raw.rawEventIds must contain at least one event id.");
  if (record.raw?.sourceSystem !== "gdelt") fail(failures, record, "raw.sourceSystem must be gdelt.");
  if (!Number.isInteger(record.raw?.clusterSize) || Number(record.raw?.clusterSize) < 1) fail(failures, record, "raw.clusterSize must be a positive integer.");

  const eventId = rawEventIds[0];
  const event = eventsById.get(eventId);
  const label = labelsById.get(eventId);
  if (!event) fail(failures, record, `raw event ${eventId} is missing from ${EVENTS_PATH}.`);
  if (!label) fail(failures, record, `label ${eventId} is missing from ${LABEL_PATH}.`);

  if (!record.event?.title) fail(failures, record, "event.title is required.");
  if (!record.event?.occurredOn || !ISO_DATE.test(record.event.occurredOn)) fail(failures, record, "event.occurredOn must be YYYY-MM-DD.");
  const lat = record.event?.coordinates?.lat;
  const lon = record.event?.coordinates?.lon;
  if (!Number.isFinite(lat) || Number(lat) < -90 || Number(lat) > 90) fail(failures, record, "event.coordinates.lat is invalid.");
  if (!Number.isFinite(lon) || Number(lon) < -180 || Number(lon) > 180) fail(failures, record, "event.coordinates.lon is invalid.");

  const canonicalActors = record.event?.canonicalActors ?? [];
  if (!Array.isArray(canonicalActors)) fail(failures, record, "event.canonicalActors must be an array.");
  for (const actor of canonicalActors) {
    if (!actor.rawName || !actor.canonicalName) fail(failures, record, "canonical actor is missing names.");
    if (!Number.isFinite(actor.confidence) || Number(actor.confidence) < 0 || Number(actor.confidence) > 1) {
      fail(failures, record, "canonical actor confidence must be between 0 and 1.");
    }
  }

  if (event && record.source?.url !== event.sourceUrl) fail(failures, record, "source.url does not match source event.");
  if (event && record.source?.domain !== hostFromUrl(event.sourceUrl)) fail(failures, record, "source.domain does not match source URL.");
  if (record.source?.checked === true && typeof record.source.supportsClaim !== "boolean") fail(failures, record, "checked source must have a support assessment.");
  if (record.source?.supportsClaim === true && record.source.checked !== true) fail(failures, record, "source cannot support claim unless it was checked.");

  if (label) {
    if (record.labels?.importance?.value !== label.labels.important) fail(failures, record, "importance label does not match source label.");
    if (record.labels?.importance?.labelSource !== label.labelSource) fail(failures, record, "labelSource does not match source label.");
    if (record.labels?.importance?.humanReviewed !== label.humanReviewed) fail(failures, record, "humanReviewed does not match source label.");
    if (record.labels?.quality?.categoryCorrect !== label.labels.categoryCorrect) fail(failures, record, "categoryCorrect does not match source label.");
    if (record.labels?.quality?.severityCorrect !== label.labels.severityCorrect) fail(failures, record, "severityCorrect does not match source label.");
    if (record.labels?.quality?.summaryQuality !== label.labels.summaryQuality) fail(failures, record, "summaryQuality does not match source label.");
    if (record.labels?.importance?.sourceChecked !== (label.reviewContext?.sourceChecked === true)) fail(failures, record, "sourceChecked does not match source label.");

    const expected = expectedTruthStatus(label);
    if (record.mlUse?.truthStatus !== expected) fail(failures, record, `truthStatus should be ${expected}.`);
  }

  const target = record.targets?.futureEscalation72h;
  if (typeof target?.value !== "boolean") fail(failures, record, "futureEscalation72h.value must be boolean.");
  if (target?.labelSource !== "weak_future_gdelt_neighborhood") fail(failures, record, "futureEscalation72h.labelSource must be weak_future_gdelt_neighborhood.");
  if (target?.windowDays !== 3) fail(failures, record, "futureEscalation72h.windowDays must be 3.");
  if (!Number.isFinite(target?.confidence) || Number(target?.confidence) < 0 || Number(target?.confidence) > 1) {
    fail(failures, record, "futureEscalation72h.confidence must be between 0 and 1.");
  }
  for (const supportingId of target?.supportingEventIds ?? []) {
    if (!eventsById.has(supportingId)) fail(failures, record, `futureEscalation72h supporting event ${supportingId} is missing.`);
  }

  validateExternalEvidenceBlock(failures, record, record.externalEvidence?.ucdpGed, "ucdpGed", "ucdp_ged", "26.1");
  validateExternalEvidenceBlock(failures, record, record.externalEvidence?.ucdpCandidate, "ucdpCandidate", "ucdp_candidate", "26.0.X");

  const canTrainImportance = record.mlUse?.canTrainImportance === true;
  const canEvaluateImportance = record.mlUse?.canEvaluateImportance === true;
  const sourceCheckedHuman = isSourceCheckedHumanLabel(label);
  const duplicate = Boolean(event?.duplicateOf);

  if (canEvaluateImportance && !canTrainImportance) fail(failures, record, "canEvaluateImportance cannot be true when canTrainImportance is false.");
  if ((canTrainImportance || canEvaluateImportance) && !sourceCheckedHuman) {
    fail(failures, record, "importance training/eval truth requires source-checked human label.");
  }
  if ((canTrainImportance || canEvaluateImportance) && record.source?.supportsClaim !== true) {
    fail(failures, record, "importance training/eval truth requires source.supportsClaim=true.");
  }
  if ((canTrainImportance || canEvaluateImportance) && duplicate) fail(failures, record, "duplicate public row cannot be final importance truth.");
  if ((canTrainImportance || canEvaluateImportance) && canonicalActors.length === 0) fail(failures, record, "importance truth requires at least one canonical actor.");
  if (typeof record.mlUse?.canTrainWeakOutcome !== "boolean") fail(failures, record, "canTrainWeakOutcome must be boolean.");
  if (record.mlUse?.canEvaluateOutcome === true) fail(failures, record, "weak outcome targets cannot be final evaluation truth.");
  if (record.mlUse?.split !== "unassigned") fail(failures, record, "split must remain unassigned until a deterministic splitter exists.");

  if (index === -1) fail(failures, record, "unreachable validator state.");
}

async function main() {
  if (process.argv.includes("-h") || process.argv.includes("--help")) {
    printHelp();
    return;
  }

  const [eventsById, labelsById, records] = await Promise.all([
    loadEvents(),
    loadLabels(),
    readFile(RECORDS_PATH, "utf8").then((text) => readJsonl<TrainingRecord>(text)),
  ]);

  const failures: string[] = [];
  const seenRecordIds = new Set<string>();

  records.forEach((record, index) => validateRecord(record, index, eventsById, labelsById, seenRecordIds, failures));

  const sourceCheckedHuman = records.filter((record) => record.mlUse?.truthStatus === "source_checked_human").length;
  const trainingGradeImportance = records.filter((record) => record.mlUse?.canTrainImportance === true).length;
  const machineReviewed = records.filter((record) => record.mlUse?.truthStatus === "machine_reviewed").length;
  const weakOutcomePositive = records.filter((record) => record.targets?.futureEscalation72h?.value === true).length;
  const ucdpCandidateMatches = records.filter((record) => (record.externalEvidence?.ucdpGed?.matches ?? []).length > 0).length;
  const ucdpCurrentCandidateMatches = records.filter((record) => (record.externalEvidence?.ucdpCandidate?.matches ?? []).length > 0).length;

  console.log("HopeIndexAI training records validation");
  console.log(`Records checked: ${records.length}`);
  console.log(`Source-checked human records: ${sourceCheckedHuman}`);
  console.log(`Training-grade importance records: ${trainingGradeImportance}`);
  console.log(`Machine-reviewed records: ${machineReviewed}`);
  console.log(`Weak future-escalation positives: ${weakOutcomePositive}`);
  console.log(`UCDP GED candidate evidence records: ${ucdpCandidateMatches}`);
  console.log(`UCDP current Candidate evidence records: ${ucdpCurrentCandidateMatches}`);

  if (failures.length > 0) {
    console.error("\nValidation failures:");
    for (const failure of failures.slice(0, 40)) console.error(`- ${failure}`);
    if (failures.length > 40) console.error(`- ...and ${failures.length - 40} more`);
    process.exit(1);
  }

  console.log("Result: training records are structurally valid and preserve the human-truth guardrail.");
}

main().catch((err) => {
  console.error("HopeIndexAI training records validation failed:", err instanceof Error ? err.message : err);
  process.exit(1);
});
