import { createReadStream } from "fs";
import { mkdir, readFile, writeFile } from "fs/promises";
import { createInterface } from "readline";
import { dirname } from "path";

interface TrainingRecord {
  recordId: string;
  raw?: { rawEventIds?: string[] };
  event?: {
    occurredOn?: string;
    countryCode?: string;
    location?: string;
    coordinates?: { lat?: number; lon?: number };
    rawActors?: string[];
    canonicalActors?: Array<{ rawName?: string; canonicalName?: string }>;
  };
  catalog?: { theme?: string; eventType?: string; quadLabel?: string };
}

interface CompactUcdpEvent {
  schemaVersion: "external-event.ucdp-ged.v1";
  externalId: string;
  relId: string;
  dataset: {
    sourceSystem: "ucdp_ged";
    version: "26.1";
  };
  conflict: {
    name: string;
    dyadName: string;
    typeOfViolence: number | null;
    typeLabel: string;
  };
  actors: {
    sideA: string;
    sideB: string;
  };
  event: {
    dateStart: string;
    dateEnd: string;
    country: string;
    region: string;
    locationName: string;
    description: string;
    coordinates: { lat: number | null; lon: number | null };
    deaths: { best: number; high: number; low: number; civilians: number };
  };
  source: {
    numberOfSources: number;
    headline: string | null;
    original: string | null;
  };
  matching: {
    countryKey: string;
    dateStartDay: number | null;
    dateEndDay: number | null;
    actorTokens: string[];
  };
}

interface ExternalMatchCandidate {
  sourceSystem: "ucdp_ged";
  datasetVersion: "26.1";
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
  sourceSystem: "ucdp_ged";
  datasetVersion: "26.1";
  status: "candidate_matches" | "no_candidates" | "no_country_mapping" | "no_temporal_overlap";
  candidateCount: number;
  bestScore: number | null;
  matches: ExternalMatchCandidate[];
  audit: {
    builtBy: "scripts/match_external_events.ts";
    sourceRecordPath: string;
    sourceExternalPath: string;
    dateWindowDays: number;
    minScore: number;
    notes: string;
  };
}

interface UcdpProfile {
  dateRange?: { min?: string | null; max?: string | null };
  rows?: number;
}

const RECORDS_PATH = "data/training/phase2_records.jsonl";
const EXTERNAL_PATH = "data/external/ucdp/ged_events_compact.jsonl";
const PROFILE_PATH = "data/external/ucdp/ged_profile.json";
const OUTPUT_PATH = "data/external/matches/phase2_ucdp_matches.jsonl";
const REPORT_PATH = "data/external/matches/phase2_ucdp_match_report.json";
const DATE_WINDOW_DAYS = 3;
const MIN_SCORE = 0.55;
const MAX_MATCHES_PER_RECORD = 5;

const COUNTRY_CODE_TO_UCDP: Record<string, string> = {
  AF: "Afghanistan",
  AS: "Australia",
  BA: "Bahrain",
  BM: "Myanmar",
  CE: "Sri Lanka",
  CH: "China",
  EG: "Egypt",
  ET: "Ethiopia",
  IN: "India",
  IR: "Iran",
  IS: "Israel",
  IZ: "Iraq",
  JO: "Jordan",
  KS: "South Korea",
  LE: "Lebanon",
  LY: "Libya",
  ML: "Mali",
  NI: "Nigeria",
  PK: "Pakistan",
  RS: "Russia",
  RW: "Rwanda",
  SF: "South Africa",
  SY: "Syria",
  TU: "Turkey",
  UP: "Ukraine",
  US: "United States of America",
  YM: "Yemen",
};

const TOKEN_STOPWORDS = new Set([
  "AND", "THE", "FOR", "FROM", "WITH", "WITHOUT", "UNKNOWN", "GOVERNMENT",
  "GOVERNMENTS", "MILITARY", "FORCES", "ARMY", "POLICE", "CIVILIAN",
  "CIVILIANS", "STATE", "STATES", "UNITED", "NATIONAL", "LOCAL", "GROUP",
  "GROUPS", "OFFICER", "OFFICERS", "DEPUTY", "DEPUTIES", "CITY", "COUNTY",
  "MINISTER", "PRESIDENT", "OFFICIAL", "OFFICIALS",
]);

function printHelp() {
  console.log(`HopeIndexAI external event matcher

Usage:
  bun run match:external

Reads:
  ${RECORDS_PATH}
  ${EXTERNAL_PATH}
  ${PROFILE_PATH}

Writes:
  ${OUTPUT_PATH}
  ${REPORT_PATH}
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

function writeJsonl(rows: unknown[]): string {
  return rows.map((row) => JSON.stringify(row)).join("\n") + "\n";
}

function dayNumber(date: string | undefined): number | null {
  const ms = Date.parse(String(date ?? ""));
  if (!Number.isFinite(ms)) return null;
  return Math.floor(ms / 86_400_000);
}

function countryKey(country: string): string {
  return country.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
}

function recordCountryKey(record: TrainingRecord): string | null {
  const code = String(record.event?.countryCode ?? "").trim().toUpperCase();
  const mapped = COUNTRY_CODE_TO_UCDP[code];
  if (mapped) return countryKey(mapped);
  const location = String(record.event?.location ?? "");
  const tail = location.split(",").map((part) => part.trim()).filter(Boolean).at(-1);
  return tail ? countryKey(tail) : null;
}

function actorTokens(record: TrainingRecord): Set<string> {
  const values = [
    ...(record.event?.rawActors ?? []),
    ...(record.event?.canonicalActors ?? []).flatMap((actor) => [actor.rawName ?? "", actor.canonicalName ?? ""]),
  ];
  const tokens = new Set<string>();
  for (const value of values) {
    for (const token of String(value).toUpperCase().split(/[^A-Z0-9]+/)) {
      if (token.length < 3 || TOKEN_STOPWORDS.has(token)) continue;
      tokens.add(token);
    }
  }
  return tokens;
}

function sharedActorTokens(recordTokens: Set<string>, externalTokens: string[]): string[] {
  return externalTokens.filter((token) => recordTokens.has(token));
}

function dateDistanceDays(recordDay: number | null, external: CompactUcdpEvent): number | null {
  if (recordDay === null || external.matching.dateStartDay === null || external.matching.dateEndDay === null) return null;
  if (recordDay >= external.matching.dateStartDay && recordDay <= external.matching.dateEndDay) return 0;
  if (recordDay < external.matching.dateStartDay) return external.matching.dateStartDay - recordDay;
  return recordDay - external.matching.dateEndDay;
}

function haversineKm(aLat?: number, aLon?: number, bLat?: number | null, bLon?: number | null): number | null {
  if (!Number.isFinite(aLat) || !Number.isFinite(aLon) || !Number.isFinite(bLat) || !Number.isFinite(bLon)) return null;
  const toRad = (degrees: number) => degrees * Math.PI / 180;
  const r = 6371;
  const dLat = toRad(Number(bLat) - Number(aLat));
  const dLon = toRad(Number(bLon) - Number(aLon));
  const lat1 = toRad(Number(aLat));
  const lat2 = toRad(Number(bLat));
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * r * Math.asin(Math.sqrt(h));
}

function isConflictRecord(record: TrainingRecord): boolean {
  const text = `${record.catalog?.theme ?? ""} ${record.catalog?.eventType ?? ""} ${record.catalog?.quadLabel ?? ""}`.toLowerCase();
  return text.includes("conflict") || text.includes("material_conflict") || text.includes("violence");
}

function round(n: number, digits = 4): number {
  return Number(n.toFixed(digits));
}

function confidence(score: number): ExternalMatchCandidate["confidence"] {
  if (score >= 0.8) return "high";
  if (score >= 0.65) return "medium";
  return "low";
}

function scoreCandidate(record: TrainingRecord, external: CompactUcdpEvent, targetCountryKey: string): ExternalMatchCandidate | null {
  const recordDay = dayNumber(record.event?.occurredOn);
  const dayDistance = dateDistanceDays(recordDay, external);
  if (dayDistance === null || dayDistance > DATE_WINDOW_DAYS) return null;
  if (external.matching.countryKey !== targetCountryKey) return null;

  const reasons: string[] = [];
  let score = 0;

  const dateScore = 0.35 * (1 - dayDistance / (DATE_WINDOW_DAYS + 1));
  score += dateScore;
  reasons.push(dayDistance === 0 ? "same event date window" : `within ${dayDistance} day(s)`);

  score += 0.18;
  reasons.push(`same country (${external.event.country})`);

  const distance = haversineKm(
    record.event?.coordinates?.lat,
    record.event?.coordinates?.lon,
    external.event.coordinates.lat,
    external.event.coordinates.lon
  );
  if (distance !== null && distance <= 75) {
    score += 0.2;
    reasons.push(`nearby location (${Math.round(distance)} km)`);
  } else if (distance !== null && distance <= 250) {
    score += 0.12;
    reasons.push(`same theater (${Math.round(distance)} km)`);
  } else if (distance !== null) {
    score += 0.04;
    reasons.push(`distant same-country location (${Math.round(distance)} km)`);
  }

  const shared = sharedActorTokens(actorTokens(record), external.matching.actorTokens);
  if (shared.length > 0) {
    score += Math.min(0.22, 0.1 + shared.length * 0.06);
    reasons.push(`shared actor token(s): ${shared.slice(0, 5).join(", ")}`);
  }

  if (isConflictRecord(record) && external.conflict.typeOfViolence !== null) {
    score += 0.05;
    reasons.push(`compatible organized-violence type (${external.conflict.typeLabel})`);
  }

  const rounded = round(Math.min(1, score), 4);
  if (rounded < MIN_SCORE) return null;

  return {
    sourceSystem: "ucdp_ged",
    datasetVersion: "26.1",
    evidenceTier: "external_curated",
    externalId: external.externalId,
    relId: external.relId,
    score: rounded,
    confidence: confidence(rounded),
    reasons,
    event: {
      dateStart: external.event.dateStart,
      dateEnd: external.event.dateEnd,
      country: external.event.country,
      region: external.event.region,
      locationName: external.event.locationName || external.event.description,
      coordinates: external.event.coordinates,
      deathsBest: external.event.deaths.best,
      deathsHigh: external.event.deaths.high,
      deathsLow: external.event.deaths.low,
      civilianDeaths: external.event.deaths.civilians,
      typeOfViolence: external.conflict.typeOfViolence,
      typeLabel: external.conflict.typeLabel,
      conflictName: external.conflict.name,
      dyadName: external.conflict.dyadName,
      sideA: external.actors.sideA,
      sideB: external.actors.sideB,
      headline: external.source.headline ?? external.source.original,
    },
  };
}

function makeEmptyRow(record: TrainingRecord, status: ExternalMatchRow["status"], notes: string): ExternalMatchRow {
  return {
    schemaVersion: "external-match.v1",
    recordId: record.recordId,
    rawEventIds: record.raw?.rawEventIds ?? [],
    sourceSystem: "ucdp_ged",
    datasetVersion: "26.1",
    status,
    candidateCount: 0,
    bestScore: null,
    matches: [],
    audit: {
      builtBy: "scripts/match_external_events.ts",
      sourceRecordPath: RECORDS_PATH,
      sourceExternalPath: EXTERNAL_PATH,
      dateWindowDays: DATE_WINDOW_DAYS,
      minScore: MIN_SCORE,
      notes,
    },
  };
}

async function loadExternalCandidates(countryKeys: Set<string>, minDay: number, maxDay: number): Promise<CompactUcdpEvent[]> {
  const candidates: CompactUcdpEvent[] = [];
  const rl = createInterface({
    input: createReadStream(EXTERNAL_PATH, { encoding: "utf8" }),
    crlfDelay: Infinity,
  });

  let lineNumber = 0;
  for await (const line of rl) {
    lineNumber += 1;
    if (!line.trim()) continue;
    let row: CompactUcdpEvent;
    try {
      row = JSON.parse(line) as CompactUcdpEvent;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      throw new Error(`Invalid compact UCDP JSONL line ${lineNumber}: ${message}`);
    }
    if (!countryKeys.has(row.matching.countryKey)) continue;
    const start = row.matching.dateStartDay;
    const end = row.matching.dateEndDay;
    if (start === null || end === null) continue;
    if (end < minDay || start > maxDay) continue;
    candidates.push(row);
  }

  return candidates;
}

async function main() {
  if (process.argv.includes("-h") || process.argv.includes("--help")) {
    printHelp();
    return;
  }

  const [records, profile] = await Promise.all([
    readFile(RECORDS_PATH, "utf8").then((text) => readJsonl<TrainingRecord>(text)),
    readFile(PROFILE_PATH, "utf8").then((text) => JSON.parse(text) as UcdpProfile),
  ]);

  const recordDays = records.map((record) => dayNumber(record.event?.occurredOn)).filter((day): day is number => day !== null);
  const minRecordDay = Math.min(...recordDays);
  const maxRecordDay = Math.max(...recordDays);
  const profileMinDay = dayNumber(profile.dateRange?.min ?? undefined);
  const profileMaxDay = dayNumber(profile.dateRange?.max ?? undefined);
  const outputRows: ExternalMatchRow[] = [];

  const noTemporalOverlap = profileMinDay === null ||
    profileMaxDay === null ||
    minRecordDay > profileMaxDay + DATE_WINDOW_DAYS ||
    maxRecordDay < profileMinDay - DATE_WINDOW_DAYS;

  if (noTemporalOverlap) {
    const externalMax = profile.dateRange?.max ?? "unknown";
    for (const record of records) {
      outputRows.push(makeEmptyRow(
        record,
        "no_temporal_overlap",
        `UCDP GED 26.1 date range ends at ${externalMax}; record date is ${record.event?.occurredOn ?? "unknown"}.`
      ));
    }
  } else {
    const countryKeysByRecord = new Map<string, string | null>();
    const countryKeys = new Set<string>();
    for (const record of records) {
      const key = recordCountryKey(record);
      countryKeysByRecord.set(record.recordId, key);
      if (key) countryKeys.add(key);
    }

    const candidates = await loadExternalCandidates(
      countryKeys,
      minRecordDay - DATE_WINDOW_DAYS,
      maxRecordDay + DATE_WINDOW_DAYS
    );

    for (const record of records) {
      const recordDay = dayNumber(record.event?.occurredOn);
      if (
        recordDay === null ||
        profileMinDay === null ||
        profileMaxDay === null ||
        recordDay > profileMaxDay + DATE_WINDOW_DAYS ||
        recordDay < profileMinDay - DATE_WINDOW_DAYS
      ) {
        outputRows.push(makeEmptyRow(
          record,
          "no_temporal_overlap",
          `UCDP GED 26.1 date range ends at ${profile.dateRange?.max ?? "unknown"}; record date is ${record.event?.occurredOn ?? "unknown"}.`
        ));
        continue;
      }

      const key = countryKeysByRecord.get(record.recordId) ?? null;
      if (!key) {
        outputRows.push(makeEmptyRow(record, "no_country_mapping", "No country mapping from the GDELT-style country code to UCDP country name."));
        continue;
      }

      const matches = candidates
        .filter((candidate) => candidate.matching.countryKey === key)
        .map((candidate) => scoreCandidate(record, candidate, key))
        .filter((candidate): candidate is ExternalMatchCandidate => candidate !== null)
        .sort((a, b) => b.score - a.score || b.event.deathsBest - a.event.deathsBest)
        .slice(0, MAX_MATCHES_PER_RECORD);

      outputRows.push({
        schemaVersion: "external-match.v1",
        recordId: record.recordId,
        rawEventIds: record.raw?.rawEventIds ?? [],
        sourceSystem: "ucdp_ged",
        datasetVersion: "26.1",
        status: matches.length > 0 ? "candidate_matches" : "no_candidates",
        candidateCount: matches.length,
        bestScore: matches[0]?.score ?? null,
        matches,
        audit: {
          builtBy: "scripts/match_external_events.ts",
          sourceRecordPath: RECORDS_PATH,
          sourceExternalPath: EXTERNAL_PATH,
          dateWindowDays: DATE_WINDOW_DAYS,
          minScore: MIN_SCORE,
          notes: matches.length > 0
            ? "Candidate external evidence found. It supports curated conflict evidence only; it does not create source-checked human importance truth."
            : "No UCDP candidate met the conservative date/country/location/actor/type score threshold.",
        },
      });
    }
  }

  await mkdir(dirname(OUTPUT_PATH), { recursive: true });
  await writeFile(OUTPUT_PATH, writeJsonl(outputRows));

  const report = {
    schemaVersion: "external-match-report.v1",
    generatedAt: new Date().toISOString(),
    sourceRecordPath: RECORDS_PATH,
    sourceExternalPath: EXTERNAL_PATH,
    outputPath: OUTPUT_PATH,
    externalRowsAvailable: profile.rows ?? null,
    recordDateRange: {
      min: new Date(minRecordDay * 86_400_000).toISOString().slice(0, 10),
      max: new Date(maxRecordDay * 86_400_000).toISOString().slice(0, 10),
    },
    externalDateRange: profile.dateRange ?? null,
    dateWindowDays: DATE_WINDOW_DAYS,
    minScore: MIN_SCORE,
    recordsChecked: records.length,
    statuses: outputRows.reduce<Record<string, number>>((acc, row) => {
      acc[row.status] = (acc[row.status] ?? 0) + 1;
      return acc;
    }, {}),
    recordsWithCandidateMatches: outputRows.filter((row) => row.matches.length > 0).length,
    bestScore: outputRows.reduce<number | null>((best, row) => {
      if (row.bestScore === null) return best;
      return best === null ? row.bestScore : Math.max(best, row.bestScore);
    }, null),
    notes: [
      "External matches are evidence candidates. They do not change source-checked human label counts.",
      "Current public demo rows are May 2026, while UCDP GED 26.1 ends on 2025-12-31; no direct matches are expected for this slice.",
    ],
  };

  await writeFile(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`);

  console.log("HopeIndexAI external event matching");
  console.log(`Records checked: ${records.length}`);
  console.log(`Records with UCDP candidates: ${report.recordsWithCandidateMatches}`);
  console.log(`Statuses: ${JSON.stringify(report.statuses)}`);
  console.log(`Wrote ${OUTPUT_PATH}`);
  console.log(`Wrote ${REPORT_PATH}`);
}

main().catch((err) => {
  console.error("HopeIndexAI external event matching failed:", err instanceof Error ? err.message : err);
  process.exit(1);
});
