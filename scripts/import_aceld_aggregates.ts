import { execFileSync } from "child_process";
import { mkdir, readdir, writeFile } from "fs/promises";
import { basename, dirname, join } from "path";

interface AggregateRow {
  schemaVersion: "external-event.acled-aggregate.v1";
  externalId: string;
  dataset: {
    sourceSystem: "acled_aggregate";
    version: "as-of-2026-06-05";
    license: "ACLED terms";
    sourcePath: string;
  };
  event: {
    week: string;
    region: string;
    country: string;
    admin1: string | null;
    disorderType: string | null;
    eventType: string | null;
    subEventType: string | null;
    events: number;
    fatalities: number;
    populationExposure: number | null;
    centroid: { lat: number | null; lon: number | null };
  };
  matching: {
    countryKey: string;
    weekDay: number | null;
    coordinateCell: string | null;
  };
}

interface Profile {
  schemaVersion: "external-profile.acled-aggregate.v1";
  generatedAt: string;
  sourceDir: string;
  outputPath: string;
  rows: number;
  files: Array<{ path: string; rows: number }>;
  dateRange: { min: string | null; max: string | null };
  totals: {
    events: number;
    fatalities: number;
    countries: number;
  };
  counts: {
    countryTop50: Record<string, number>;
    disorderType: Record<string, number>;
    eventType: Record<string, number>;
  };
  notes: string[];
}

const SOURCE_DIR = "data/external/aceld";
const OUTPUT_PATH = "data/external/aceld/aceld_aggregates_compact.jsonl";
const PROFILE_PATH = "data/external/aceld/aceld_aggregates_profile.json";
const SAMPLE_PATH = "data/external/aceld/aceld_aggregates_sample.jsonl";
const XLSX_SHEET_PATH = "xl/worksheets/sheet1.xml";
const XLSX_STRINGS_PATH = "xl/sharedStrings.xml";

const REGIONAL_FILE_RE = /_aggregated_data_up_to_week_of-\d{4}-\d{2}-\d{2}\.xlsx$/;

function printHelp() {
  console.log(`HopeIndexAI local ACLED aggregate importer

Usage:
  bun run import:aceld

Reads:
  ${SOURCE_DIR}/*_aggregated_data_up_to_week_of-*.xlsx

Writes:
  ${OUTPUT_PATH}
  ${PROFILE_PATH}
  ${SAMPLE_PATH}

Note:
  The folder is named "aceld" in this repo, but the source is ACLED aggregate data.
`);
}

function unzipText(filePath: string, innerPath: string): string {
  return execFileSync("unzip", ["-p", filePath, innerPath], {
    encoding: "utf8",
    maxBuffer: 512 * 1024 * 1024,
  });
}

function decodeXml(value: string): string {
  return value
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, "\"")
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

function stripTags(value: string): string {
  return decodeXml(value.replace(/<[^>]*>/g, ""));
}

function parseSharedStrings(xml: string): string[] {
  const values: string[] = [];
  for (const match of xml.matchAll(/<si>(.*?)<\/si>/gs)) {
    const text = [...match[1].matchAll(/<t[^>]*>(.*?)<\/t>/gs)].map((part) => stripTags(part[1])).join("");
    values.push(text);
  }
  return values;
}

function columnIndex(ref: string): number {
  const letters = ref.match(/^[A-Z]+/)?.[0] ?? "";
  let index = 0;
  for (const letter of letters) {
    index = index * 26 + letter.charCodeAt(0) - 64;
  }
  return index - 1;
}

function excelDate(serial: string): string {
  const days = Number(serial);
  if (!Number.isFinite(days)) return serial;
  const utc = Date.UTC(1899, 11, 30) + Math.round(days) * 86_400_000;
  return new Date(utc).toISOString().slice(0, 10);
}

function toNumber(value: string | null | undefined): number | null {
  const n = Number(String(value ?? "").trim());
  return Number.isFinite(n) ? n : null;
}

function toInt(value: string | null | undefined): number {
  const n = Number.parseInt(String(value ?? "").trim(), 10);
  return Number.isFinite(n) ? n : 0;
}

function maybeText(value: string | null | undefined): string | null {
  const text = String(value ?? "").trim();
  return text ? text : null;
}

function countryKey(country: string): string {
  return country.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
}

function dayNumber(date: string): number | null {
  const ms = Date.parse(date);
  if (!Number.isFinite(ms)) return null;
  return Math.floor(ms / 86_400_000);
}

function coordinateCell(lat: number | null, lon: number | null): string | null {
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  return `${Math.round(Number(lat) * 10) / 10},${Math.round(Number(lon) * 10) / 10}`;
}

function getCellValue(cellXml: string, sharedStrings: string[]): string | null {
  const value = cellXml.match(/<v>(.*?)<\/v>/s)?.[1];
  if (value === undefined) return null;
  if (/\bt="s"/.test(cellXml)) return sharedStrings[Number(value)] ?? "";
  return decodeXml(value);
}

function parseRows(sheetXml: string, sharedStrings: string[]): string[][] {
  const rows: string[][] = [];
  for (const rowMatch of sheetXml.matchAll(/<row\b[^>]*>(.*?)<\/row>/gs)) {
    const cells: string[] = [];
    for (const cellMatch of rowMatch[1].matchAll(/<c\b([^>]*)>(.*?)<\/c>|<c\b([^>]*)\/>/gs)) {
      const attrs = cellMatch[1] ?? cellMatch[3] ?? "";
      const ref = attrs.match(/\br="([^"]+)"/)?.[1] ?? "";
      if (!ref) continue;
      cells[columnIndex(ref)] = getCellValue(cellMatch[0], sharedStrings) ?? "";
    }
    rows.push(cells);
  }
  return rows;
}

function makeIndex(header: string[]): Map<string, number> {
  return new Map(header.map((name, index) => [name.trim().toUpperCase(), index]));
}

function get(row: string[], columns: Map<string, number>, name: string): string {
  const index = columns.get(name);
  return index === undefined ? "" : row[index] ?? "";
}

function buildAggregateRow(row: string[], columns: Map<string, number>, sourcePath: string): AggregateRow {
  const week = excelDate(get(row, columns, "WEEK"));
  const country = get(row, columns, "COUNTRY");
  const admin1 = maybeText(get(row, columns, "ADMIN1"));
  const eventType = maybeText(get(row, columns, "EVENT_TYPE"));
  const subEventType = maybeText(get(row, columns, "SUB_EVENT_TYPE"));
  const disorderType = maybeText(get(row, columns, "DISORDER_TYPE"));
  const lat = toNumber(get(row, columns, "CENTROID_LATITUDE"));
  const lon = toNumber(get(row, columns, "CENTROID_LONGITUDE"));
  const id = get(row, columns, "ID") || [country, admin1, week, eventType, subEventType].join(":");

  return {
    schemaVersion: "external-event.acled-aggregate.v1",
    externalId: `acled-agg:${id}:${week}:${eventType ?? "unknown"}:${subEventType ?? "unknown"}`,
    dataset: {
      sourceSystem: "acled_aggregate",
      version: "as-of-2026-06-05",
      license: "ACLED terms",
      sourcePath,
    },
    event: {
      week,
      region: get(row, columns, "REGION"),
      country,
      admin1,
      disorderType,
      eventType,
      subEventType,
      events: toInt(get(row, columns, "EVENTS")),
      fatalities: toInt(get(row, columns, "FATALITIES")),
      populationExposure: toNumber(get(row, columns, "POPULATION_EXPOSURE")),
      centroid: { lat, lon },
    },
    matching: {
      countryKey: countryKey(country),
      weekDay: dayNumber(week),
      coordinateCell: coordinateCell(lat, lon),
    },
  };
}

function writeJsonl(rows: unknown[]): string {
  return rows.map((row) => JSON.stringify(row)).join("\n") + "\n";
}

function inc(map: Map<string, number>, key: string | null | undefined, by = 1) {
  const normalized = String(key ?? "").trim() || "unknown";
  map.set(normalized, (map.get(normalized) ?? 0) + by);
}

function topEntries(map: Map<string, number>, limit: number): Record<string, number> {
  return Object.fromEntries([...map.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, limit));
}

async function importWorkbook(filePath: string): Promise<AggregateRow[]> {
  const sharedStrings = parseSharedStrings(unzipText(filePath, XLSX_STRINGS_PATH));
  const rows = parseRows(unzipText(filePath, XLSX_SHEET_PATH), sharedStrings);
  if (rows.length < 2) return [];

  const columns = makeIndex(rows[0]);
  const required = ["WEEK", "REGION", "COUNTRY", "ADMIN1", "EVENT_TYPE", "SUB_EVENT_TYPE", "EVENTS", "FATALITIES", "DISORDER_TYPE", "ID", "CENTROID_LATITUDE", "CENTROID_LONGITUDE"];
  const missing = required.filter((name) => !columns.has(name));
  if (missing.length > 0) throw new Error(`${filePath} is missing required columns: ${missing.join(", ")}`);

  return rows.slice(1).filter((row) => row.some(Boolean)).map((row) => buildAggregateRow(row, columns, filePath));
}

async function main() {
  if (process.argv.includes("--help") || process.argv.includes("-h")) {
    printHelp();
    return;
  }

  const files = (await readdir(SOURCE_DIR))
    .filter((name) => REGIONAL_FILE_RE.test(name))
    .map((name) => join(SOURCE_DIR, name))
    .sort();

  if (files.length === 0) {
    throw new Error(`No ACLED aggregate workbooks found in ${SOURCE_DIR}`);
  }

  const allRows: AggregateRow[] = [];
  const fileSummaries: Profile["files"] = [];

  for (const file of files) {
    const rows = await importWorkbook(file);
    allRows.push(...rows);
    fileSummaries.push({ path: file, rows: rows.length });
    console.log(`Imported ${rows.length.toLocaleString()} rows from ${basename(file)}`);
  }

  allRows.sort((a, b) => a.externalId.localeCompare(b.externalId));

  const countryCounts = new Map<string, number>();
  const disorderCounts = new Map<string, number>();
  const eventCounts = new Map<string, number>();
  let events = 0;
  let fatalities = 0;
  let minDate: string | null = null;
  let maxDate: string | null = null;

  for (const row of allRows) {
    events += row.event.events;
    fatalities += row.event.fatalities;
    if (!minDate || row.event.week < minDate) minDate = row.event.week;
    if (!maxDate || row.event.week > maxDate) maxDate = row.event.week;
    inc(countryCounts, row.event.country, row.event.events);
    inc(disorderCounts, row.event.disorderType, row.event.events);
    inc(eventCounts, row.event.eventType, row.event.events);
  }

  const profile: Profile = {
    schemaVersion: "external-profile.acled-aggregate.v1",
    generatedAt: new Date().toISOString(),
    sourceDir: SOURCE_DIR,
    outputPath: OUTPUT_PATH,
    rows: allRows.length,
    files: fileSummaries,
    dateRange: { min: minDate, max: maxDate },
    totals: {
      events,
      fatalities,
      countries: countryCounts.size,
    },
    counts: {
      countryTop50: topEntries(countryCounts, 50),
      disorderType: topEntries(disorderCounts, 50),
      eventType: topEntries(eventCounts, 50),
    },
    notes: [
      "These are ACLED aggregate rows, not row-level event records.",
      "Use them for country/admin/week trend features and weak external context.",
      "Do not treat aggregate rows as source-checked ground-truth labels for individual HopeIndexAI events.",
    ],
  };

  await mkdir(dirname(OUTPUT_PATH), { recursive: true });
  await writeFile(OUTPUT_PATH, writeJsonl(allRows));
  await writeFile(PROFILE_PATH, JSON.stringify(profile, null, 2) + "\n");
  await writeFile(SAMPLE_PATH, writeJsonl(allRows.slice(0, Math.min(50, allRows.length))));

  console.log(JSON.stringify({
    ok: true,
    rows: allRows.length,
    files: files.length,
    dateRange: profile.dateRange,
    totals: profile.totals,
    outputPath: OUTPUT_PATH,
  }, null, 2));
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exitCode = 1;
});
