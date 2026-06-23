import { mkdir, writeFile } from "fs/promises";
import { createWriteStream } from "fs";
import { once } from "events";
import { dirname } from "path";

type CsvRow = string[];

interface CandidateRelease {
  version: string;
  label: string;
  url: string;
  localPath: string;
}

interface CompactUcdpCandidateEvent {
  schemaVersion: "external-event.ucdp-candidate.v1";
  externalId: string;
  relId: string;
  dataset: {
    sourceSystem: "ucdp_candidate";
    version: string;
    releaseLabel: string;
    license: "CC BY 4.0";
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
    articleRefs: string | null;
    office: string | null;
    date: string | null;
    headline: string | null;
    original: string | null;
  };
  matching: {
    countryKey: string;
    dateStartDay: number | null;
    dateEndDay: number | null;
    actorTokens: string[];
    coordinateCell: string | null;
  };
}

interface Profile {
  schemaVersion: "external-profile.ucdp-candidate.v1";
  generatedAt: string;
  sourcePaths: string[];
  outputPath: string;
  dataset: {
    sourceSystem: "ucdp_candidate";
    versions: string[];
    license: "CC BY 4.0";
    sourceUrls: string[];
    codebookUrl: string;
  };
  rows: number;
  columns: number;
  dateRange: { min: string | null; max: string | null };
  yearRange: { min: number | null; max: number | null };
  totals: {
    bestDeaths: number;
    civilianDeaths: number;
    rowsWithSourceArticle: number;
    rowsWithSourceHeadline: number;
  };
  counts: {
    release: Record<string, number>;
    typeOfViolence: Record<string, number>;
    region: Record<string, number>;
    countryTop20: Record<string, number>;
    monthTop20Recent: Record<string, number>;
  };
  notes: string[];
}

const RELEASES: CandidateRelease[] = [
  {
    version: "26.01.26.03",
    label: "January-March 2026",
    url: "https://ucdp.uu.se/downloads/candidateged/GEDEvent_v26_01_26_03.csv",
    localPath: "data/external/ucdp_candidate/GEDEvent_v26_01_26_03.csv",
  },
  {
    version: "26.0.4",
    label: "April 2026",
    url: "https://ucdp.uu.se/downloads/candidateged/GEDEvent_v26_0_4.csv",
    localPath: "data/external/ucdp_candidate/GEDEvent_v26_0_4.csv",
  },
];

const OUTPUT_PATH = "data/external/ucdp_candidate/candidate_events_compact.jsonl";
const PROFILE_PATH = "data/external/ucdp_candidate/candidate_profile.json";
const SAMPLE_PATH = "data/external/ucdp_candidate/candidate_events_sample.jsonl";
const CODEBOOK_URL = "https://ucdp.uu.se/downloads/candidateged/ucdp-candidate-codebook1.5.pdf";

const TYPE_LABELS: Record<number, string> = {
  1: "state_based_armed_conflict",
  2: "non_state_conflict",
  3: "one_sided_violence",
};

const TOKEN_STOPWORDS = new Set([
  "AND", "THE", "FOR", "FROM", "WITH", "WITHOUT", "UNKNOWN", "GOVERNMENT",
  "GOVERNMENTS", "MILITARY", "FORCES", "ARMY", "POLICE", "CIVILIAN",
  "CIVILIANS", "STATE", "STATES", "UNITED", "NATIONAL", "LOCAL", "GROUP",
  "GROUPS", "REBELS", "REBEL", "MILITIA", "MILITIAS", "OTHER", "SIDE",
]);

function printHelp() {
  console.log(`HopeIndexAI UCDP Candidate importer

Usage:
  bun run import:ucdp-candidate

Downloads if missing:
${RELEASES.map((release) => `  ${release.localPath}`).join("\n")}

Writes:
  ${OUTPUT_PATH}
  ${PROFILE_PATH}
  ${SAMPLE_PATH}
`);
}

async function ensureDownloaded(release: CandidateRelease) {
  if (await Bun.file(release.localPath).exists()) return;
  await mkdir(dirname(release.localPath), { recursive: true });
  const response = await fetch(release.url);
  if (!response.ok) throw new Error(`Failed to download ${release.url}: HTTP ${response.status}`);
  const text = await response.text();
  await writeFile(release.localPath, text);
}

function toNumber(value: string | undefined): number | null {
  const n = Number(String(value ?? "").trim());
  return Number.isFinite(n) ? n : null;
}

function toInt(value: string | undefined): number {
  const n = Number.parseInt(String(value ?? "").trim(), 10);
  return Number.isFinite(n) ? n : 0;
}

function compactText(value: string | undefined, maxLength = 600): string | null {
  const text = String(value ?? "").replace(/\s+/g, " ").trim();
  if (!text) return null;
  return text.length > maxLength ? `${text.slice(0, maxLength - 1)}...` : text;
}

function dateOnly(value: string | undefined): string {
  const text = String(value ?? "").trim();
  const match = text.match(/\d{4}-\d{2}-\d{2}/);
  return match ? match[0] : text;
}

function monthKey(date: string | undefined): string {
  const day = dateOnly(date);
  return /^\d{4}-\d{2}-\d{2}$/.test(day) ? day.slice(0, 7) : "unknown";
}

function dayNumber(date: string | undefined): number | null {
  const ms = Date.parse(dateOnly(date));
  if (!Number.isFinite(ms)) return null;
  return Math.floor(ms / 86_400_000);
}

function coordinateCell(lat: number | null, lon: number | null): string | null {
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  return `${Math.round(Number(lat) * 10) / 10},${Math.round(Number(lon) * 10) / 10}`;
}

function countryKey(country: string): string {
  return country.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
}

function actorTokens(...values: string[]): string[] {
  const tokens = new Set<string>();
  for (const value of values) {
    for (const token of value.toUpperCase().split(/[^A-Z0-9]+/)) {
      if (token.length < 3 || TOKEN_STOPWORDS.has(token)) continue;
      tokens.add(token);
    }
  }
  return [...tokens].sort();
}

function makeIndex(header: string[]): Map<string, number> {
  return new Map(header.map((name, index) => [name, index]));
}

function get(row: CsvRow, columns: Map<string, number>, name: string): string {
  const index = columns.get(name);
  return index === undefined ? "" : row[index] ?? "";
}

function inc(map: Map<string, number>, key: string | number | null | undefined) {
  const normalized = String(key ?? "").trim() || "unknown";
  map.set(normalized, (map.get(normalized) ?? 0) + 1);
}

function topEntries(map: Map<string, number>, limit: number): Record<string, number> {
  return Object.fromEntries([...map.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, limit));
}

function recentMonthEntries(map: Map<string, number>, limit: number): Record<string, number> {
  return Object.fromEntries([...map.entries()].sort((a, b) => b[0].localeCompare(a[0])).slice(0, limit));
}

function buildCompact(row: CsvRow, columns: Map<string, number>, release: CandidateRelease): CompactUcdpCandidateEvent {
  const typeOfViolence = toNumber(get(row, columns, "type_of_violence"));
  const lat = toNumber(get(row, columns, "latitude"));
  const lon = toNumber(get(row, columns, "longitude"));
  const country = get(row, columns, "country");
  const dateStart = dateOnly(get(row, columns, "date_start"));
  const dateEnd = dateOnly(get(row, columns, "date_end"));
  const sideA = get(row, columns, "side_a");
  const sideB = get(row, columns, "side_b");
  const dyadName = get(row, columns, "dyad_name");
  const conflictName = get(row, columns, "conflict_name");

  return {
    schemaVersion: "external-event.ucdp-candidate.v1",
    externalId: get(row, columns, "id"),
    relId: get(row, columns, "relid"),
    dataset: {
      sourceSystem: "ucdp_candidate",
      version: release.version,
      releaseLabel: release.label,
      license: "CC BY 4.0",
      sourceUrl: release.url,
    },
    conflict: {
      id: get(row, columns, "conflict_new_id"),
      name: conflictName,
      dyadId: get(row, columns, "dyad_new_id"),
      dyadName,
      typeOfViolence,
      typeLabel: TYPE_LABELS[Number(typeOfViolence)] ?? "unknown",
    },
    actors: {
      sideA,
      sideB,
    },
    event: {
      year: toNumber(get(row, columns, "year")),
      dateStart,
      dateEnd,
      country,
      countryId: toNumber(get(row, columns, "country_id")),
      region: get(row, columns, "region"),
      locationName: compactText(get(row, columns, "where_coordinates"), 160) ?? "",
      description: compactText(get(row, columns, "where_description"), 240) ?? "",
      coordinates: { lat, lon },
      deaths: {
        sideA: toInt(get(row, columns, "deaths_a")),
        sideB: toInt(get(row, columns, "deaths_b")),
        civilians: toInt(get(row, columns, "deaths_civilians")),
        unknown: toInt(get(row, columns, "deaths_unknown")),
        best: toInt(get(row, columns, "best")),
        high: toInt(get(row, columns, "high")),
        low: toInt(get(row, columns, "low")),
      },
    },
    source: {
      numberOfSources: toInt(get(row, columns, "number_of_sources")),
      articleRefs: compactText(get(row, columns, "source_article"), 160),
      office: compactText(get(row, columns, "source_office"), 160),
      date: compactText(get(row, columns, "source_date"), 160),
      headline: compactText(get(row, columns, "source_headline"), 240),
      original: compactText(get(row, columns, "source_original"), 240),
    },
    matching: {
      countryKey: countryKey(country),
      dateStartDay: dayNumber(dateStart),
      dateEndDay: dayNumber(dateEnd),
      actorTokens: actorTokens(sideA, sideB, dyadName, conflictName),
      coordinateCell: coordinateCell(lat, lon),
    },
  };
}

async function parseCsvFile(path: string, onRow: (row: CsvRow, index: number) => void | Promise<void>, afterChunk?: () => Promise<void>) {
  const stream = Bun.file(path).stream();
  const decoder = new TextDecoder();
  let field = "";
  let row: CsvRow = [];
  let inQuotes = false;
  let maybeClosingQuote = false;
  let lastWasCr = false;
  let rowIndex = 0;

  const endField = () => {
    row.push(field);
    field = "";
  };

  const endRow = () => {
    endField();
    const completed = row;
    row = [];
    field = "";
    return onRow(completed, rowIndex++);
  };

  const consumeUnquoted = (ch: string) => {
    if (lastWasCr) {
      if (ch === "\n") {
        lastWasCr = false;
        return;
      }
      lastWasCr = false;
    }
    if (ch === ",") {
      endField();
      return;
    }
    if (ch === "\r") {
      lastWasCr = true;
      void endRow();
      return;
    }
    if (ch === "\n") {
      void endRow();
      return;
    }
    if (ch === "\"" && field.length === 0) {
      inQuotes = true;
      return;
    }
    field += ch;
  };

  const consume = (ch: string) => {
    if (inQuotes) {
      if (maybeClosingQuote) {
        if (ch === "\"") {
          field += "\"";
          maybeClosingQuote = false;
          return;
        }
        inQuotes = false;
        maybeClosingQuote = false;
        consumeUnquoted(ch);
        return;
      }
      if (ch === "\"") {
        maybeClosingQuote = true;
        return;
      }
      field += ch;
      return;
    }
    consumeUnquoted(ch);
  };

  const reader = stream.getReader();
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const text = decoder.decode(value, { stream: true });
    for (let i = 0; i < text.length; i += 1) consume(text[i]);
    if (afterChunk) await afterChunk();
  }

  const tail = decoder.decode();
  for (let i = 0; i < tail.length; i += 1) consume(tail[i]);
  if (maybeClosingQuote) {
    inQuotes = false;
    maybeClosingQuote = false;
  }
  if (field.length > 0 || row.length > 0) await endRow();
}

async function main() {
  if (process.argv.includes("-h") || process.argv.includes("--help")) {
    printHelp();
    return;
  }

  await mkdir(dirname(OUTPUT_PATH), { recursive: true });
  for (const release of RELEASES) await ensureDownloaded(release);

  const output = createWriteStream(OUTPUT_PATH, { encoding: "utf8" });
  const sample: CompactUcdpCandidateEvent[] = [];

  let columnCount = 0;
  let rows = 0;
  let minDate: string | null = null;
  let maxDate: string | null = null;
  let minYear: number | null = null;
  let maxYear: number | null = null;
  let bestDeaths = 0;
  let civilianDeaths = 0;
  let rowsWithSourceArticle = 0;
  let rowsWithSourceHeadline = 0;
  const byRelease = new Map<string, number>();
  const byType = new Map<string, number>();
  const byRegion = new Map<string, number>();
  const byCountry = new Map<string, number>();
  const byMonth = new Map<string, number>();
  let pendingDrain: Promise<void> | null = null;
  let waitingForDrain = false;

  for (const release of RELEASES) {
    let columns: Map<string, number> | null = null;
    await parseCsvFile(release.localPath, (row, index) => {
      if (index === 0) {
        columns = makeIndex(row);
        columnCount = Math.max(columnCount, row.length);
        return;
      }
      if (!columns) throw new Error(`Missing UCDP Candidate CSV header in ${release.localPath}.`);
      const event = buildCompact(row, columns, release);
      rows += 1;

      if (event.event.dateStart && (!minDate || event.event.dateStart < minDate)) minDate = event.event.dateStart;
      if (event.event.dateEnd && (!maxDate || event.event.dateEnd > maxDate)) maxDate = event.event.dateEnd;
      if (event.event.year !== null && (!minYear || event.event.year < minYear)) minYear = event.event.year;
      if (event.event.year !== null && (!maxYear || event.event.year > maxYear)) maxYear = event.event.year;
      bestDeaths += event.event.deaths.best;
      civilianDeaths += event.event.deaths.civilians;
      if (event.source.articleRefs) rowsWithSourceArticle += 1;
      if (event.source.headline) rowsWithSourceHeadline += 1;
      inc(byRelease, release.version);
      inc(byType, event.conflict.typeOfViolence ?? "unknown");
      inc(byRegion, event.event.region);
      inc(byCountry, event.event.country);
      inc(byMonth, monthKey(event.event.dateStart));

      if (sample.length < 25) sample.push(event);

      if (!output.write(`${JSON.stringify(event)}\n`) && !waitingForDrain) {
        waitingForDrain = true;
        pendingDrain = once(output, "drain").then(() => {
          waitingForDrain = false;
          pendingDrain = null;
        });
      }
    }, async () => {
      if (pendingDrain) await pendingDrain;
    });
  }

  if (pendingDrain) await pendingDrain;
  output.end();
  await once(output, "finish");

  const profile: Profile = {
    schemaVersion: "external-profile.ucdp-candidate.v1",
    generatedAt: new Date().toISOString(),
    sourcePaths: RELEASES.map((release) => release.localPath),
    outputPath: OUTPUT_PATH,
    dataset: {
      sourceSystem: "ucdp_candidate",
      versions: RELEASES.map((release) => release.version),
      license: "CC BY 4.0",
      sourceUrls: RELEASES.map((release) => release.url),
      codebookUrl: CODEBOOK_URL,
    },
    rows,
    columns: columnCount,
    dateRange: { min: minDate, max: maxDate },
    yearRange: { min: minYear, max: maxYear },
    totals: {
      bestDeaths,
      civilianDeaths,
      rowsWithSourceArticle,
      rowsWithSourceHeadline,
    },
    counts: {
      release: topEntries(byRelease, 10),
      typeOfViolence: topEntries(byType, 10),
      region: topEntries(byRegion, 20),
      countryTop20: topEntries(byCountry, 20),
      monthTop20Recent: recentMonthEntries(byMonth, 20),
    },
    notes: [
      "UCDP Candidate is monthly curated candidate event evidence for organized lethal violence, not final HopeIndexAI importance truth.",
      "It is useful for current row-level outcome evidence where annual UCDP GED has not yet caught up.",
    ],
  };

  await writeFile(PROFILE_PATH, `${JSON.stringify(profile, null, 2)}\n`);
  await writeFile(SAMPLE_PATH, sample.map((event) => JSON.stringify(event)).join("\n") + "\n");

  console.log("HopeIndexAI UCDP Candidate import");
  console.log(`Rows imported: ${rows}`);
  console.log(`Date range: ${minDate ?? "n/a"} to ${maxDate ?? "n/a"}`);
  console.log(`Best deaths total: ${bestDeaths}`);
  console.log(`Civilian deaths total: ${civilianDeaths}`);
  console.log(`Wrote ${OUTPUT_PATH}`);
  console.log(`Wrote ${PROFILE_PATH}`);
  console.log(`Wrote ${SAMPLE_PATH}`);
}

main().catch((err) => {
  console.error("HopeIndexAI UCDP Candidate import failed:", err instanceof Error ? err.message : err);
  process.exit(1);
});
