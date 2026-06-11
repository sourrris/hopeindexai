import { mkdir, readFile, writeFile } from "fs/promises";
import { dirname } from "path";

interface TrainingRecord {
  recordId: string;
  event?: {
    occurredOn?: string;
    countryCode?: string;
    location?: string;
    rawActors?: string[];
    canonicalActors?: Array<{ rawName?: string; canonicalName?: string }>;
  };
}

interface AcledApiRow {
  event_id_cnty?: string;
  event_date?: string;
  year?: number | string;
  time_precision?: number | string;
  disorder_type?: string;
  event_type?: string;
  sub_event_type?: string;
  actor1?: string;
  assoc_actor_1?: string;
  inter1?: string | number;
  actor2?: string;
  assoc_actor_2?: string;
  inter2?: string | number;
  interaction?: string | number;
  civilian_targeting?: string;
  iso?: number | string;
  region?: string;
  country?: string;
  admin1?: string;
  admin2?: string;
  admin3?: string;
  location?: string;
  latitude?: number | string;
  longitude?: number | string;
  geo_precision?: number | string;
  source?: string;
  source_scale?: string;
  notes?: string;
  fatalities?: number | string;
  tags?: string;
  timestamp?: number | string;
}

interface AcledApiResponse {
  status?: number;
  success?: boolean;
  last_update?: number | null;
  count?: number | null;
  messages?: unknown[];
  data?: AcledApiRow[];
  filename?: string | null;
  data_query_restrictions?: Record<string, unknown>;
}

interface CompactAcledEvent {
  schemaVersion: "external-event.acled.v1";
  externalId: string;
  dataset: {
    sourceSystem: "acled";
    version: "api-live";
    license: "ACLED terms";
    sourceUrl: string;
  };
  event: {
    date: string;
    year: number | null;
    timePrecision: number | null;
    disorderType: string;
    eventType: string;
    subEventType: string;
    country: string;
    iso: number | null;
    region: string;
    admin1: string | null;
    admin2: string | null;
    admin3: string | null;
    locationName: string;
    coordinates: { lat: number | null; lon: number | null };
    geoPrecision: number | null;
    fatalities: number;
    civilianTargeting: string | null;
    tags: string | null;
    description: string;
  };
  actors: {
    actor1: string;
    assocActor1: string | null;
    inter1: string | null;
    actor2: string | null;
    assocActor2: string | null;
    inter2: string | null;
    interaction: string | null;
  };
  source: {
    sourceName: string | null;
    sourceScale: string | null;
    apiTimestamp: number | null;
  };
  matching: {
    countryKey: string;
    eventDay: number | null;
    actorTokens: string[];
    coordinateCell: string | null;
  };
}

interface QueryWindow {
  country: string;
  startDate: string;
  endDate: string;
}

interface QueryAuditRow {
  country: string;
  startDate: string;
  endDate: string;
  count: number | null;
  returned: number;
  splitDepth: number;
}

interface Profile {
  schemaVersion: "external-profile.acled.v1";
  generatedAt: string;
  mode: "training-record-window";
  sourcePath: string;
  outputPath: string;
  dataset: CompactAcledEvent["dataset"];
  authMethod: "oauth_password";
  recordsScanned: number;
  queryWindowsRequested: number;
  rows: number;
  dateRange: { min: string | null; max: string | null };
  totals: {
    fatalities: number;
    countries: number;
  };
  counts: {
    disorderType: Record<string, number>;
    eventType: Record<string, number>;
    country: Record<string, number>;
  };
  notes: string[];
}

const RECORDS_PATH = "data/training/phase2_records.jsonl";
const OUTPUT_PATH = "data/external/acled/acled_events_compact.jsonl";
const PROFILE_PATH = "data/external/acled/acled_profile.json";
const SAMPLE_PATH = "data/external/acled/acled_events_sample.jsonl";
const AUDIT_PATH = "data/external/acled/acled_query_audit.json";
const API_BASE_URL = "https://acleddata.com/api/acled/read";
const TOKEN_URL = "https://acleddata.com/oauth/token";
const DOCS_URL = "https://acleddata.com/acled-api-documentation";
const FIELDS = [
  "event_id_cnty",
  "event_date",
  "year",
  "time_precision",
  "disorder_type",
  "event_type",
  "sub_event_type",
  "actor1",
  "assoc_actor_1",
  "inter1",
  "actor2",
  "assoc_actor_2",
  "inter2",
  "interaction",
  "civilian_targeting",
  "iso",
  "region",
  "country",
  "admin1",
  "admin2",
  "admin3",
  "location",
  "latitude",
  "longitude",
  "geo_precision",
  "source",
  "source_scale",
  "notes",
  "fatalities",
  "tags",
  "timestamp",
].join("|");
const DEFAULT_PADDING_DAYS = 7;
const MAX_ROWS_PER_QUERY = 5000;
const MAX_SPLIT_DEPTH = 8;

const COUNTRY_CODE_TO_ACLED: Record<string, string> = {
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
  US: "United States",
  YM: "Yemen",
};

const TOKEN_STOPWORDS = new Set([
  "AND", "THE", "FOR", "FROM", "WITH", "WITHOUT", "UNKNOWN", "GOVERNMENT",
  "GOVERNMENTS", "MILITARY", "FORCES", "ARMY", "POLICE", "CIVILIAN",
  "CIVILIANS", "STATE", "STATES", "UNITED", "NATIONAL", "LOCAL", "GROUP",
  "GROUPS", "OFFICER", "OFFICERS", "DEPUTY", "DEPUTIES", "CITY", "COUNTY",
  "MINISTER", "PRESIDENT", "OFFICIAL", "OFFICIALS", "PROTESTERS", "RIOTERS",
]);

function printHelp() {
  console.log(`HopeIndexAI ACLED importer

Usage:
  ACLED_EMAIL=you@example.com ACLED_PASSWORD=... bun run import:acled

Reads:
  ${RECORDS_PATH}

Writes:
  ${OUTPUT_PATH}
  ${PROFILE_PATH}
  ${SAMPLE_PATH}
  ${AUDIT_PATH}

Optional env:
  ACLED_WINDOW_DAYS=7      Pad each training-record country/date window.
  ACLED_SINCE=YYYY-MM-DD   Clamp earliest requested date.
  ACLED_UNTIL=YYYY-MM-DD   Clamp latest requested date.
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

function toNumber(value: unknown): number | null {
  const n = Number(String(value ?? "").trim());
  return Number.isFinite(n) ? n : null;
}

function toInt(value: unknown): number {
  const n = Number.parseInt(String(value ?? "").trim(), 10);
  return Number.isFinite(n) ? n : 0;
}

function dateOnly(value: unknown): string {
  const text = String(value ?? "").trim();
  const match = text.match(/^\d{4}-\d{2}-\d{2}/);
  return match ? match[0] : text;
}

function dayNumber(date: string | undefined): number | null {
  const ms = Date.parse(String(date ?? ""));
  if (!Number.isFinite(ms)) return null;
  return Math.floor(ms / 86_400_000);
}

function dateFromDay(day: number): string {
  return new Date(day * 86_400_000).toISOString().slice(0, 10);
}

function compactText(value: unknown, maxLength = 600): string | null {
  const text = String(value ?? "").replace(/\s+/g, " ").trim();
  if (!text) return null;
  return text.length > maxLength ? `${text.slice(0, maxLength - 1)}...` : text;
}

function maybeText(value: unknown): string | null {
  const text = String(value ?? "").replace(/\s+/g, " ").trim();
  return text ? text : null;
}

function countryKey(country: string): string {
  return country.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
}

function coordinateCell(lat: number | null, lon: number | null): string | null {
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  return `${Math.round(Number(lat) * 10) / 10},${Math.round(Number(lon) * 10) / 10}`;
}

function actorTokens(...values: Array<string | null | undefined>): string[] {
  const tokens = new Set<string>();
  for (const value of values) {
    for (const token of String(value ?? "").toUpperCase().split(/[^A-Z0-9]+/)) {
      if (token.length < 3 || TOKEN_STOPWORDS.has(token)) continue;
      tokens.add(token);
    }
  }
  return [...tokens].sort();
}

function inc(map: Map<string, number>, key: string | null | undefined) {
  const normalized = String(key ?? "").trim() || "unknown";
  map.set(normalized, (map.get(normalized) ?? 0) + 1);
}

function topEntries(map: Map<string, number>): Record<string, number> {
  return Object.fromEntries([...map.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])));
}

async function fetchToken(email: string, password: string): Promise<string> {
  const body = new URLSearchParams({
    username: email,
    password,
    grant_type: "password",
    client_id: "acled",
    scope: "authenticated",
  });

  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  if (!response.ok) {
    throw new Error(`ACLED token request failed: ${response.status} ${response.statusText}`);
  }

  const payload = await response.json() as { access_token?: string };
  const token = String(payload.access_token ?? "").trim();
  if (!token) throw new Error("ACLED token response did not include an access token");
  return token;
}

function countryFromRecord(record: TrainingRecord): string | null {
  const code = String(record.event?.countryCode ?? "").trim().toUpperCase();
  if (COUNTRY_CODE_TO_ACLED[code]) return COUNTRY_CODE_TO_ACLED[code];
  const tail = String(record.event?.location ?? "").split(",").map((part) => part.trim()).filter(Boolean).at(-1);
  return tail || null;
}

function buildQueryWindows(records: TrainingRecord[], paddingDays: number, minDayClamp: number | null, maxDayClamp: number | null): QueryWindow[] {
  const grouped = new Map<string, { minDay: number; maxDay: number }>();

  for (const record of records) {
    const country = countryFromRecord(record);
    const eventDay = dayNumber(record.event?.occurredOn);
    if (!country || eventDay === null) continue;
    const minDay = minDayClamp === null ? eventDay - paddingDays : Math.max(eventDay - paddingDays, minDayClamp);
    const maxDay = maxDayClamp === null ? eventDay + paddingDays : Math.min(eventDay + paddingDays, maxDayClamp);
    const existing = grouped.get(country);
    if (!existing) {
      grouped.set(country, { minDay, maxDay });
    } else {
      existing.minDay = Math.min(existing.minDay, minDay);
      existing.maxDay = Math.max(existing.maxDay, maxDay);
    }
  }

  return [...grouped.entries()]
    .map(([country, range]) => ({
      country,
      startDate: dateFromDay(range.minDay),
      endDate: dateFromDay(range.maxDay),
    }))
    .sort((a, b) => a.country.localeCompare(b.country));
}

function buildParams(window: QueryWindow): URLSearchParams {
  const params = new URLSearchParams();
  params.set("_format", "json");
  params.set("with_total", "true");
  params.set("inter_num", "0");
  params.set("fields", FIELDS);
  params.set("country", window.country);
  params.append("event_date", window.startDate);
  params.append("event_date_where", ">=");
  params.append("event_date", window.endDate);
  params.append("event_date_where", "<=");
  return params;
}

async function fetchWindow(token: string, window: QueryWindow): Promise<AcledApiResponse> {
  const url = `${API_BASE_URL}?${buildParams(window).toString()}`;
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`ACLED data request failed for ${window.country} ${window.startDate}..${window.endDate}: ${response.status} ${response.statusText} ${body.slice(0, 240)}`);
  }

  return await response.json() as AcledApiResponse;
}

function splitWindow(window: QueryWindow): [QueryWindow, QueryWindow] {
  const startDay = dayNumber(window.startDate);
  const endDay = dayNumber(window.endDate);
  if (startDay === null || endDay === null || startDay >= endDay) {
    throw new Error(`Cannot split invalid ACLED query window ${window.country} ${window.startDate}..${window.endDate}`);
  }
  const middle = Math.floor((startDay + endDay) / 2);
  return [
    { country: window.country, startDate: window.startDate, endDate: dateFromDay(middle) },
    { country: window.country, startDate: dateFromDay(middle + 1), endDate: window.endDate },
  ];
}

async function fetchWindowRecursive(
  token: string,
  window: QueryWindow,
  depth: number,
  audit: QueryAuditRow[],
): Promise<AcledApiRow[]> {
  const payload = await fetchWindow(token, window);
  const rows = Array.isArray(payload.data) ? payload.data : [];
  const count = typeof payload.count === "number" ? payload.count : null;

  audit.push({
    country: window.country,
    startDate: window.startDate,
    endDate: window.endDate,
    count,
    returned: rows.length,
    splitDepth: depth,
  });

  if (count !== null && count > MAX_ROWS_PER_QUERY) {
    if (depth >= MAX_SPLIT_DEPTH || window.startDate === window.endDate) {
      throw new Error(`ACLED query window still exceeds ${MAX_ROWS_PER_QUERY} rows at max split depth: ${window.country} ${window.startDate}..${window.endDate} count=${count}`);
    }
    const [left, right] = splitWindow(window);
    const leftRows = await fetchWindowRecursive(token, left, depth + 1, audit);
    const rightRows = await fetchWindowRecursive(token, right, depth + 1, audit);
    return [...leftRows, ...rightRows];
  }

  return rows;
}

function compactRow(row: AcledApiRow): CompactAcledEvent {
  const country = String(row.country ?? "").trim();
  const lat = toNumber(row.latitude);
  const lon = toNumber(row.longitude);
  const eventDate = dateOnly(row.event_date);
  const actor1 = String(row.actor1 ?? "").trim();
  const actor2 = maybeText(row.actor2);
  const assocActor1 = maybeText(row.assoc_actor_1);
  const assocActor2 = maybeText(row.assoc_actor_2);
  const notes = compactText(row.notes, 700) ?? "";

  return {
    schemaVersion: "external-event.acled.v1",
    externalId: String(row.event_id_cnty ?? "").trim(),
    dataset: {
      sourceSystem: "acled",
      version: "api-live",
      license: "ACLED terms",
      sourceUrl: DOCS_URL,
    },
    event: {
      date: eventDate,
      year: toNumber(row.year),
      timePrecision: toNumber(row.time_precision),
      disorderType: String(row.disorder_type ?? "").trim(),
      eventType: String(row.event_type ?? "").trim(),
      subEventType: String(row.sub_event_type ?? "").trim(),
      country,
      iso: toNumber(row.iso),
      region: String(row.region ?? "").trim(),
      admin1: maybeText(row.admin1),
      admin2: maybeText(row.admin2),
      admin3: maybeText(row.admin3),
      locationName: String(row.location ?? "").trim(),
      coordinates: { lat, lon },
      geoPrecision: toNumber(row.geo_precision),
      fatalities: toInt(row.fatalities),
      civilianTargeting: maybeText(row.civilian_targeting),
      tags: maybeText(row.tags),
      description: notes,
    },
    actors: {
      actor1,
      assocActor1,
      inter1: maybeText(row.inter1),
      actor2,
      assocActor2,
      inter2: maybeText(row.inter2),
      interaction: maybeText(row.interaction),
    },
    source: {
      sourceName: maybeText(row.source),
      sourceScale: maybeText(row.source_scale),
      apiTimestamp: toNumber(row.timestamp),
    },
    matching: {
      countryKey: countryKey(country),
      eventDay: dayNumber(eventDate),
      actorTokens: actorTokens(actor1, assocActor1, actor2, assocActor2),
      coordinateCell: coordinateCell(lat, lon),
    },
  };
}

function uniqueByExternalId(rows: CompactAcledEvent[]): CompactAcledEvent[] {
  const deduped = new Map<string, CompactAcledEvent>();
  for (const row of rows) deduped.set(row.externalId, row);
  return [...deduped.values()].sort((a, b) => a.externalId.localeCompare(b.externalId));
}

async function main() {
  if (process.argv.includes("--help") || process.argv.includes("-h")) {
    printHelp();
    return;
  }

  const email = String(process.env.ACLED_EMAIL ?? "").trim();
  const password = String(process.env.ACLED_PASSWORD ?? "").trim();
  if (!email || !password) {
    throw new Error("ACLED_EMAIL and ACLED_PASSWORD are required. ACLED uses myACLED account credentials for OAuth access.");
  }

  const paddingDays = Number.parseInt(String(process.env.ACLED_WINDOW_DAYS ?? DEFAULT_PADDING_DAYS), 10);
  if (!Number.isFinite(paddingDays) || paddingDays < 0) {
    throw new Error("ACLED_WINDOW_DAYS must be a non-negative integer");
  }

  const sinceClamp = String(process.env.ACLED_SINCE ?? "").trim();
  const untilClamp = String(process.env.ACLED_UNTIL ?? "").trim();
  const minDayClamp = sinceClamp ? dayNumber(sinceClamp) : null;
  const maxDayClamp = untilClamp ? dayNumber(untilClamp) : null;
  if (sinceClamp && minDayClamp === null) throw new Error(`Invalid ACLED_SINCE date: ${sinceClamp}`);
  if (untilClamp && maxDayClamp === null) throw new Error(`Invalid ACLED_UNTIL date: ${untilClamp}`);

  const records = readJsonl<TrainingRecord>(await readFile(RECORDS_PATH, "utf8"));
  const windows = buildQueryWindows(records, paddingDays, minDayClamp, maxDayClamp);
  if (windows.length === 0) {
    throw new Error(`No country/date windows could be derived from ${RECORDS_PATH}`);
  }

  const token = await fetchToken(email, password);
  const audit: QueryAuditRow[] = [];
  const rawRows: AcledApiRow[] = [];

  for (const window of windows) {
    rawRows.push(...await fetchWindowRecursive(token, window, 0, audit));
  }

  const compactRows = uniqueByExternalId(rawRows.map(compactRow));

  const disorderCounts = new Map<string, number>();
  const eventCounts = new Map<string, number>();
  const countryCounts = new Map<string, number>();
  let minDate: string | null = null;
  let maxDate: string | null = null;
  let fatalities = 0;

  for (const row of compactRows) {
    fatalities += row.event.fatalities;
    if (!minDate || row.event.date < minDate) minDate = row.event.date;
    if (!maxDate || row.event.date > maxDate) maxDate = row.event.date;
    inc(disorderCounts, row.event.disorderType);
    inc(eventCounts, row.event.eventType);
    inc(countryCounts, row.event.country);
  }

  const profile: Profile = {
    schemaVersion: "external-profile.acled.v1",
    generatedAt: new Date().toISOString(),
    mode: "training-record-window",
    sourcePath: RECORDS_PATH,
    outputPath: OUTPUT_PATH,
    dataset: {
      sourceSystem: "acled",
      version: "api-live",
      license: "ACLED terms",
      sourceUrl: DOCS_URL,
    },
    authMethod: "oauth_password",
    recordsScanned: records.length,
    queryWindowsRequested: windows.length,
    rows: compactRows.length,
    dateRange: { min: minDate, max: maxDate },
    totals: {
      fatalities,
      countries: Object.keys(topEntries(countryCounts)).length,
    },
    counts: {
      disorderType: topEntries(disorderCounts),
      eventType: topEntries(eventCounts),
      country: topEntries(countryCounts),
    },
    notes: [
      "ACLED data were requested only for country/date windows implied by current training records.",
      "Windows are recursively split by date when the API reports more than 5000 rows for a single request.",
      "This keeps evidence collection focused on label support instead of pulling unrelated global volume.",
    ],
  };

  await mkdir(dirname(OUTPUT_PATH), { recursive: true });
  await writeFile(OUTPUT_PATH, writeJsonl(compactRows));
  await writeFile(PROFILE_PATH, JSON.stringify(profile, null, 2) + "\n");
  await writeFile(SAMPLE_PATH, writeJsonl(compactRows.slice(0, Math.min(50, compactRows.length))));
  await writeFile(AUDIT_PATH, JSON.stringify(audit, null, 2) + "\n");

  console.log(JSON.stringify({
    ok: true,
    windows: windows.length,
    rows: compactRows.length,
    dateRange: profile.dateRange,
    outputPath: OUTPUT_PATH,
  }, null, 2));
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exitCode = 1;
});
