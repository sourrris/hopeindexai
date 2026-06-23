import { createReadStream, createWriteStream } from "fs";
import { mkdir, writeFile } from "fs/promises";
import { once } from "events";
import { dirname } from "path";
import { createInterface } from "readline";

type SourceSystem = "ucdp_ged" | "ucdp_candidate";

interface CompactConflictEvent {
  schemaVersion: "external-event.ucdp-ged.v1" | "external-event.ucdp-candidate.v1";
  externalId: string;
  relId: string;
  dataset: {
    sourceSystem: SourceSystem;
    version: string;
    license: string;
    sourceUrl: string;
  };
  conflict: {
    id: string;
    name: string;
    dyadId: string;
    dyadName: string;
    typeOfViolence: number | null;
    typeLabel: string;
  };
  actors: {
    sideA: string;
    sideB: string;
  };
  event: {
    year: number | null;
    dateStart: string;
    dateEnd: string;
    country: string;
    countryId: number | null;
    region: string;
    locationName: string;
    description: string;
    coordinates: { lat: number | null; lon: number | null };
    deaths: {
      sideA: number;
      sideB: number;
      civilians: number;
      unknown: number;
      best: number;
      high: number;
      low: number;
    };
  };
  source: {
    numberOfSources: number;
    headline: string | null;
    original: string | null;
  };
  matching: {
    countryKey: string;
    actorTokens: string[];
    coordinateCell: string | null;
  };
}

interface HistoricalConflictRecord {
  schemaVersion: "historical-conflict-record.v1";
  recordId: string;
  recordVersion: "historical-conflict.2010.v1";
  source: {
    sourceSystem: SourceSystem;
    datasetVersion: string;
    externalId: string;
    relId: string;
    license: string;
    sourceUrl: string;
    sourceCount: number;
    evidenceTier: "external_curated";
  };
  event: {
    dateStart: string;
    dateEnd: string;
    year: number;
    country: string;
    countryId: number | null;
    region: string;
    locationName: string;
    description: string;
    coordinates: { lat: number | null; lon: number | null };
    actors: {
      sideA: string;
      sideB: string;
      actorTokens: string[];
    };
  };
  catalog: {
    taskFamily: "organized_violence_outcome";
    typeOfViolence: number | null;
    typeLabel: string;
    conflictId: string;
    conflictName: string;
    dyadId: string;
    dyadName: string;
  };
  labels: {
    organizedViolenceEvent: {
      value: true;
      labelSource: "ucdp_curated";
      sourceChecked: true;
      canTrainOutcome: boolean;
      canEvaluateOutcome: boolean;
    };
    deathsBest: number;
    civilianDeaths: number;
  };
  mlUse: {
    canTrainOrganizedViolenceOutcome: boolean;
    canEvaluateOrganizedViolenceOutcome: boolean;
    canTrainImportance: false;
    importanceTruthStatus: "not_human_labeled";
    split: "unassigned";
    excludeReasons: string[];
  };
}

interface SourceConfig {
  path: string;
  sourceSystem: SourceSystem;
}

const START_DATE = "2010-01-01";
const RECORD_VERSION = "historical-conflict.2010.v1";
const SOURCES: SourceConfig[] = [
  { path: "data/external/ucdp/ged_events_compact.jsonl", sourceSystem: "ucdp_ged" },
  { path: "data/external/ucdp_candidate/candidate_events_compact.jsonl", sourceSystem: "ucdp_candidate" },
];
const OUTPUT_PATH = "data/training/historical_conflict_records.jsonl";
const PROFILE_PATH = "data/training/historical_conflict_profile.json";
const SAMPLE_PATH = "data/training/historical_conflict_records_sample.jsonl";

function printHelp() {
  console.log(`HopeIndexAI historical conflict record builder

Usage:
  bun run records:historical-conflict

Reads:
${SOURCES.map((source) => `  ${source.path}`).join("\n")}

Writes:
  ${OUTPUT_PATH}
  ${PROFILE_PATH}
  ${SAMPLE_PATH}
`);
}

function dateOnly(value: string | undefined): string {
  const match = String(value ?? "").match(/\d{4}-\d{2}-\d{2}/);
  return match ? match[0] : "";
}

function yearFromDate(date: string): number {
  const year = Number(date.slice(0, 4));
  return Number.isFinite(year) ? year : 0;
}

function slug(value: string | undefined): string {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "") || "unknown";
}

function inc(map: Map<string, number>, key: string | number | null | undefined) {
  const normalized = String(key ?? "").trim() || "unknown";
  map.set(normalized, (map.get(normalized) ?? 0) + 1);
}

function topEntries(map: Map<string, number>, limit: number): Record<string, number> {
  return Object.fromEntries([...map.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, limit));
}

function recentYearEntries(map: Map<string, number>, limit: number): Record<string, number> {
  return Object.fromEntries([...map.entries()].sort((a, b) => Number(b[0]) - Number(a[0])).slice(0, limit));
}

function buildRecord(event: CompactConflictEvent): HistoricalConflictRecord {
  const dateStart = dateOnly(event.event.dateStart);
  const dateEnd = dateOnly(event.event.dateEnd) || dateStart;
  const year = event.event.year ?? yearFromDate(dateStart);
  const excludeReasons: string[] = [];
  if (!Number.isFinite(event.event.coordinates.lat) || !Number.isFinite(event.event.coordinates.lon)) {
    excludeReasons.push("missing_coordinates");
  }
  if (event.event.deaths.best <= 0) excludeReasons.push("non_lethal_or_zero_best_deaths");

  return {
    schemaVersion: "historical-conflict-record.v1",
    recordId: `historical:${event.dataset.sourceSystem}:${slug(event.externalId || event.relId)}`,
    recordVersion: RECORD_VERSION,
    source: {
      sourceSystem: event.dataset.sourceSystem,
      datasetVersion: event.dataset.version,
      externalId: event.externalId,
      relId: event.relId,
      license: event.dataset.license,
      sourceUrl: event.dataset.sourceUrl,
      sourceCount: event.source.numberOfSources,
      evidenceTier: "external_curated",
    },
    event: {
      dateStart,
      dateEnd,
      year,
      country: event.event.country,
      countryId: event.event.countryId,
      region: event.event.region,
      locationName: event.event.locationName,
      description: event.event.description,
      coordinates: event.event.coordinates,
      actors: {
        sideA: event.actors.sideA,
        sideB: event.actors.sideB,
        actorTokens: event.matching.actorTokens,
      },
    },
    catalog: {
      taskFamily: "organized_violence_outcome",
      typeOfViolence: event.conflict.typeOfViolence,
      typeLabel: event.conflict.typeLabel,
      conflictId: event.conflict.id,
      conflictName: event.conflict.name,
      dyadId: event.conflict.dyadId,
      dyadName: event.conflict.dyadName,
    },
    labels: {
      organizedViolenceEvent: {
        value: true,
        labelSource: "ucdp_curated",
        sourceChecked: true,
        canTrainOutcome: excludeReasons.length === 0,
        canEvaluateOutcome: excludeReasons.length === 0,
      },
      deathsBest: event.event.deaths.best,
      civilianDeaths: event.event.deaths.civilians,
    },
    mlUse: {
      canTrainOrganizedViolenceOutcome: excludeReasons.length === 0,
      canEvaluateOrganizedViolenceOutcome: excludeReasons.length === 0,
      canTrainImportance: false,
      importanceTruthStatus: "not_human_labeled",
      split: "unassigned",
      excludeReasons,
    },
  };
}

async function processSource(
  source: SourceConfig,
  onRecord: (record: HistoricalConflictRecord) => Promise<void> | void
) {
  const rl = createInterface({
    input: createReadStream(source.path, { encoding: "utf8" }),
    crlfDelay: Infinity,
  });

  let lineNumber = 0;
  for await (const line of rl) {
    lineNumber += 1;
    if (!line.trim()) continue;
    let event: CompactConflictEvent;
    try {
      event = JSON.parse(line) as CompactConflictEvent;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      throw new Error(`Invalid JSONL in ${source.path} line ${lineNumber}: ${message}`);
    }
    if (event.dataset.sourceSystem !== source.sourceSystem) continue;
    const dateStart = dateOnly(event.event.dateStart);
    if (!dateStart || dateStart < START_DATE) continue;
    await onRecord(buildRecord(event));
  }
}

async function main() {
  if (process.argv.includes("-h") || process.argv.includes("--help")) {
    printHelp();
    return;
  }

  await mkdir(dirname(OUTPUT_PATH), { recursive: true });
  const output = createWriteStream(OUTPUT_PATH, { encoding: "utf8" });

  const sample: HistoricalConflictRecord[] = [];
  let rows = 0;
  let trainableRows = 0;
  let minDate: string | null = null;
  let maxDate: string | null = null;
  let bestDeaths = 0;
  let civilianDeaths = 0;
  const bySource = new Map<string, number>();
  const byYear = new Map<string, number>();
  const byRegion = new Map<string, number>();
  const byCountry = new Map<string, number>();
  const byType = new Map<string, number>();
  const excludeReasons = new Map<string, number>();
  let pendingDrain: Promise<void> | null = null;
  let waitingForDrain = false;

  for (const source of SOURCES) {
    await processSource(source, async (record) => {
      rows += 1;
      if (record.mlUse.canTrainOrganizedViolenceOutcome) trainableRows += 1;
      if (!minDate || record.event.dateStart < minDate) minDate = record.event.dateStart;
      if (!maxDate || record.event.dateEnd > maxDate) maxDate = record.event.dateEnd;
      bestDeaths += record.labels.deathsBest;
      civilianDeaths += record.labels.civilianDeaths;
      inc(bySource, record.source.sourceSystem);
      inc(byYear, record.event.year);
      inc(byRegion, record.event.region);
      inc(byCountry, record.event.country);
      inc(byType, record.catalog.typeLabel);
      for (const reason of record.mlUse.excludeReasons) inc(excludeReasons, reason);
      if (sample.length < 30 && record.event.year >= 2025) sample.push(record);

      if (!output.write(`${JSON.stringify(record)}\n`) && !waitingForDrain) {
        waitingForDrain = true;
        pendingDrain = once(output, "drain").then(() => {
          waitingForDrain = false;
          pendingDrain = null;
        });
      }
      if (pendingDrain) await pendingDrain;
    });
  }

  if (pendingDrain) await pendingDrain;
  output.end();
  await once(output, "finish");

  const profile = {
    schemaVersion: "historical-conflict-profile.v1",
    generatedAt: new Date().toISOString(),
    recordVersion: RECORD_VERSION,
    startDate: START_DATE,
    sourcePaths: SOURCES.map((source) => source.path),
    outputPath: OUTPUT_PATH,
    rows,
    trainableOutcomeRows: trainableRows,
    dateRange: { min: minDate, max: maxDate },
    totals: { bestDeaths, civilianDeaths },
    counts: {
      sourceSystem: topEntries(bySource, 10),
      typeLabel: topEntries(byType, 10),
      region: topEntries(byRegion, 20),
      countryTop25: topEntries(byCountry, 25),
      yearRecent: recentYearEntries(byYear, 25),
      excludeReasons: topEntries(excludeReasons, 20),
    },
    notes: [
      "These are positive curated organized-violence outcome records from UCDP, not human-labeled HopeIndexAI importance records.",
      "A classifier still needs negative/control examples, for example country-day or country-month windows with no UCDP event.",
    ],
  };

  await writeFile(PROFILE_PATH, `${JSON.stringify(profile, null, 2)}\n`);
  await writeFile(SAMPLE_PATH, sample.map((record) => JSON.stringify(record)).join("\n") + "\n");

  console.log("HopeIndexAI historical conflict records build");
  console.log(`Start date: ${START_DATE}`);
  console.log(`Rows written: ${rows}`);
  console.log(`Trainable outcome rows: ${trainableRows}`);
  console.log(`Date range: ${minDate ?? "n/a"} to ${maxDate ?? "n/a"}`);
  console.log(`Best deaths total: ${bestDeaths}`);
  console.log(`Civilian deaths total: ${civilianDeaths}`);
  console.log(`Wrote ${OUTPUT_PATH}`);
  console.log(`Wrote ${PROFILE_PATH}`);
  console.log(`Wrote ${SAMPLE_PATH}`);
}

main().catch((err) => {
  console.error("HopeIndexAI historical conflict records build failed:", err instanceof Error ? err.message : err);
  process.exit(1);
});
