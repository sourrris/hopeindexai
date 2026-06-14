import { promises as fs } from "fs";
import { inflateRawSync } from "zlib";

// Fetch historical GDELT v2 15-minute export files for a date range.
// This is autonomous: GDELT v2 files are public and require no API key.
//
// Usage:
//   bun run enrich:historical -- --start=2025-10-01 --days=90 --output=data/training/historical_events.json
//
// The script writes a JSON file with the same shape as public/data/events.json.

interface GdeltEvent {
  id: string;
  lat: number;
  lon: number;
  category: "doom" | "bloom";
  theme: "Diplomacy" | "Conflict" | "Econ" | "Environment" | "Humanitarian" | "Science";
  hopeScore: number;
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

const COL = {
  GLOBALEVENTID: 0,
  SQLDATE: 1,
  ACTOR1NAME: 6,
  ACTOR2NAME: 16,
  EVENTCODE: 26,
  QUADCLASS: 29,
  GOLDSTEINSCALE: 30,
  NUMMENTIONS: 31,
  AVGTONE: 34,
  ACTIONGEO_FULLNAME: 52,
  ACTIONGEO_COUNTRYCODE: 53,
  ACTIONGEO_LAT: 56,
  ACTIONGEO_LONG: 57,
  SOURCEURL: 60,
} as const;

const QUAD_LABELS: Record<number, string> = {
  1: "Verbal Cooperation",
  2: "Material Cooperation",
  3: "Verbal Conflict",
  4: "Material Conflict",
};

const FIPS_CONTINENT: Record<string, string> = {
  US: "Americas", CA: "Americas", MX: "Americas", BR: "Americas", AR: "Americas", CO: "Americas", VE: "Americas",
  CL: "Americas", PE: "Americas", EC: "Americas", BO: "Americas", UY: "Americas", PY: "Americas", GY: "Americas",
  SR: "Americas", GT: "Americas", HO: "Americas", NU: "Americas", CS: "Americas", PM: "Americas", CU: "Americas",
  JM: "Americas", HA: "Americas", DR: "Americas", BB: "Americas", TD: "Americas", TT: "Americas",
  UK: "Europe", FR: "Europe", GM: "Europe", IT: "Europe", SP: "Europe", PO: "Europe", NL: "Europe", BE: "Europe",
  SW: "Europe", NO: "Europe", FI: "Europe", DA: "Europe", EI: "Europe", AU: "Europe", SZ: "Europe", PL: "Europe",
  HU: "Europe", EZ: "Europe", RO: "Europe", BU: "Europe", LO: "Europe", HR: "Europe", AL: "Europe", GK: "Europe",
  MT: "Europe", CY: "Europe", EN: "Europe", LG: "Europe", LH: "Europe", RS: "Europe", UP: "Europe", BL: "Europe",
  MD: "Europe", GG: "Europe", AM: "Europe", AJ: "Europe", RI: "Europe", SI: "Europe",
  IS: "Middle East", JO: "Middle East", LB: "Middle East", SY: "Middle East", IZ: "Middle East", IR: "Middle East",
  SA: "Middle East", YM: "Middle East", KU: "Middle East", BA: "Middle East", QA: "Middle East", TC: "Middle East",
  MU: "Middle East", TU: "Middle East", WB: "Middle East", GZ: "Middle East",
  AG: "Africa", EG: "Africa", LY: "Africa", TS: "Africa", MO: "Africa", SU: "Africa", OD: "Africa", ET: "Africa",
  ER: "Africa", DJ: "Africa", SO: "Africa", KE: "Africa", UG: "Africa", TZ: "Africa", BI: "Africa", RW: "Africa",
  CG: "Africa", CF: "Africa", AO: "Africa", ZA: "Africa", MZ: "Africa", ZI: "Africa", ZM: "Africa", NI: "Africa",
  GH: "Africa", IV: "Africa", SL: "Africa", LI: "Africa", ML: "Africa", NG: "Africa", CM: "Africa", NA: "Africa",
  BC: "Africa", MG: "Africa", LS: "Africa", CD: "Africa",
  AF: "Asia", PK: "Asia", IN: "Asia", NP: "Asia", BT: "Asia", CE: "Asia", BM: "Asia", TH: "Asia", LA: "Asia",
  VM: "Asia", CB: "Asia", MY: "Asia", ID: "Asia", RP: "Asia", TW: "Asia", CH: "Asia", MN: "Asia", KS: "Asia",
  KN: "Asia", JA: "Asia", UZ: "Asia", KZ: "Asia", KG: "Asia", TI: "Asia", TX: "Asia", BD: "Asia", BX: "Asia",
  AS: "Oceania", NZ: "Oceania", FJ: "Oceania", PP: "Oceania",
};

const FETCH_TIMEOUT = 20000;
const ROWS_PER_FILE = 2000;

function getSeverity(g: number | null): GdeltEvent["severity"] {
  if (g === null) return "low";
  const a = Math.abs(g);
  if (a < 2) return "low";
  if (a < 5) return "medium";
  if (a < 8) return "high";
  return "critical";
}

function getRadius(g: number | null, mentions: number): number {
  const baseRad = g === null ? 2 : Math.min(8, Math.max(2, 2 + Math.abs(g) * 0.6));
  const mentionsBonus = Math.min(4, Math.log10(mentions + 1) * 1.5);
  return parseFloat((baseRad + mentionsBonus).toFixed(1));
}

function fmtDate(s: string): string {
  if (!s || s.length < 8) return s ?? "";
  return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`;
}

function unzipFirst(buf: Buffer): Buffer {
  if (buf.readUInt32LE(0) !== 0x04034b50) throw new Error("Not a ZIP file");
  const compression = buf.readUInt16LE(8);
  const compSize = buf.readUInt32LE(18);
  const nameLen = buf.readUInt16LE(26);
  const extraLen = buf.readUInt16LE(28);
  const dataStart = 30 + nameLen + extraLen;
  const compressed = compSize > 0
    ? buf.subarray(dataStart, dataStart + compSize)
    : buf.subarray(dataStart);
  if (compression === 0) return compressed;
  if (compression === 8) return inflateRawSync(compressed);
  throw new Error(`Unsupported ZIP method: ${compression}`);
}

function classifyTheme(
  eventCode: string,
  actor1: string,
  actor2: string,
  quadClass: number | null
): GdeltEvent["theme"] {
  const text = `${actor1} ${actor2}`.toUpperCase();
  const envKeywords = ["CLIMATE", "GREEN", "ENERGY", "ENVIRONMENT", "POLLUTION", "ECOLOGY", "WIND", "SOLAR", "GAS", "OIL", "CARBON", "EMISSION", "COP2", "WILDLIFE", "FOREST", "WATER"];
  if (envKeywords.some((kw) => text.includes(kw))) return "Environment";
  const techKeywords = ["UNIVERSITY", "SCIENTIST", "RESEARCH", "NASA", "CERN", "TECH", "AI", "SEMICONDUCTOR", "CHIP", "ROBOT", "SPACE", "SOFTWARE", "INNOVATION", "PATENT"];
  if (techKeywords.some((kw) => text.includes(kw))) return "Science";
  const humKeywords = ["REFUGEE", "HUMAN RIGHTS", "AID", "RED CROSS", "UNHCR", "AMNESTY", "DISASTER", "FLOOD", "EARTHQUAKE", "FACTION", "PROTESTER", "HUNGER", "POVERTY", "CHARITY"];
  const isAidCode = eventCode.startsWith("07") || eventCode.startsWith("08");
  if (isAidCode || humKeywords.some((kw) => text.includes(kw))) return "Humanitarian";
  const econKeywords = ["BANK", "TRADE", "MARKET", "MINISTRY OF FINANCE", "ECONOMY", "IMF", "WTO", "SANCTION", "BUSINESS", "TARIFF", "INDUSTRY", "INVEST", "FINANCE", "TREASURY"];
  const isEconCode = eventCode.startsWith("06");
  if (isEconCode || econKeywords.some((kw) => text.includes(kw))) return "Econ";
  const isConflictCode =
    eventCode.startsWith("11") || eventCode.startsWith("12") ||
    eventCode.startsWith("13") || eventCode.startsWith("14") ||
    eventCode.startsWith("15") || eventCode.startsWith("16") ||
    eventCode.startsWith("17") || eventCode.startsWith("18") ||
    eventCode.startsWith("19") || eventCode.startsWith("20");
  if (isConflictCode || quadClass === 3 || quadClass === 4) return "Conflict";
  return "Diplomacy";
}

function calculateHopeScore(
  goldstein: number | null,
  avgTone: number | null,
  theme: GdeltEvent["theme"]
): number {
  let score = 50;
  if (goldstein !== null) score += goldstein * 2.5;
  if (avgTone !== null) score += avgTone * 1.5;
  switch (theme) {
    case "Science": score += 12; break;
    case "Humanitarian": score += 8; break;
    case "Environment": score += goldstein && goldstein > 0 ? 10 : -4; break;
    case "Diplomacy": if (goldstein && goldstein > 0) score += 6; break;
    case "Econ": if (goldstein && goldstein > 0) score += 4; break;
    case "Conflict": score -= 15; break;
  }
  return Math.min(100, Math.max(0, Math.round(score)));
}

function parseLine(cols: string[]): GdeltEvent | null {
  if (cols.length < 61) return null;

  const lat = parseFloat(cols[COL.ACTIONGEO_LAT]);
  const lon = parseFloat(cols[COL.ACTIONGEO_LONG]);
  if (!isFinite(lat) || !isFinite(lon) || (lat === 0 && lon === 0)) return null;

  const rawG = parseFloat(cols[COL.GOLDSTEINSCALE]);
  const rawQ = parseInt(cols[COL.QUADCLASS], 10);
  const goldstein = isFinite(rawG) ? rawG : null;
  const quadClass = isFinite(rawQ) ? rawQ : null;

  const category: GdeltEvent["category"] =
    goldstein !== null
      ? goldstein > 0 ? "bloom" : "doom"
      : quadClass === 1 || quadClass === 2 ? "bloom" : "doom";

  const country = cols[COL.ACTIONGEO_COUNTRYCODE]?.trim() ?? "";
  const actor1 = cols[COL.ACTOR1NAME]?.trim() || "Unknown";
  const actor2 = cols[COL.ACTOR2NAME]?.trim() || "Unknown";
  const eventCode = cols[COL.EVENTCODE]?.trim() || "";
  const theme = classifyTheme(eventCode, actor1, actor2, quadClass);
  const numMentions = parseInt(cols[COL.NUMMENTIONS], 10) || 0;

  return {
    id: cols[COL.GLOBALEVENTID],
    lat, lon, category, theme,
    hopeScore: calculateHopeScore(goldstein, parseFloat(cols[COL.AVGTONE]), theme),
    goldstein, quadClass,
    quadLabel: QUAD_LABELS[quadClass ?? 0] ?? "Unknown",
    actor1, actor2, country,
    location: cols[COL.ACTIONGEO_FULLNAME]?.trim() ?? "",
    date: fmtDate(cols[COL.SQLDATE]),
    numMentions,
    avgTone: isFinite(parseFloat(cols[COL.AVGTONE])) ? parseFloat(cols[COL.AVGTONE]) : null,
    sourceUrl: cols[COL.SOURCEURL]?.trim() ?? "",
    markerRadius: getRadius(goldstein, numMentions),
    severity: getSeverity(goldstein),
    continent: FIPS_CONTINENT[country] ?? "Other",
  };
}

async function fetchOne(url: string): Promise<GdeltEvent[]> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(FETCH_TIMEOUT) });
    if (!res.ok) return [];

    const buf = Buffer.from(await res.arrayBuffer());
    const csvBytes = unzipFirst(buf);
    const text = csvBytes.toString("utf8");
    const lines = text.split("\n");

    const events: GdeltEvent[] = [];
    for (let i = 0; i < Math.min(lines.length, ROWS_PER_FILE); i++) {
      const event = parseLine(lines[i].split("\t"));
      if (event) events.push(event);
    }
    return events;
  } catch {
    return [];
  }
}

function deduplicateEvents(events: GdeltEvent[]): GdeltEvent[] {
  const GRID_SIZE = 0.08;
  const clusters = new Map<string, GdeltEvent[]>();

  for (const e of events) {
    const gridLat = Math.round(e.lat / GRID_SIZE);
    const gridLon = Math.round(e.lon / GRID_SIZE);
    const actorPrefix = e.actor1 ? e.actor1.slice(0, 3).toUpperCase() : "UNK";
    const key = `${e.date}:${e.theme}:${gridLat}:${gridLon}:${actorPrefix}`;
    if (!clusters.has(key)) clusters.set(key, []);
    clusters.get(key)!.push(e);
  }

  const deduplicated: GdeltEvent[] = [];
  for (const clusterEvents of clusters.values()) {
    if (clusterEvents.length === 0) continue;
    clusterEvents.sort((a, b) => b.numMentions - a.numMentions);
    const representative = { ...clusterEvents[0] };

    let totalMentions = 0;
    let sumTone = 0;
    let toneCount = 0;
    for (const ce of clusterEvents) {
      totalMentions += ce.numMentions;
      if (ce.avgTone !== null) {
        sumTone += ce.avgTone;
        toneCount++;
      }
    }
    representative.numMentions = totalMentions;
    representative.avgTone = toneCount > 0 ? parseFloat((sumTone / toneCount).toFixed(2)) : representative.avgTone;
    representative.markerRadius = getRadius(representative.goldstein, totalMentions);
    deduplicated.push(representative);
  }

  return deduplicated;
}

function parseArgs(): { startDate: string; days: number; output: string; filesPerDay: number } {
  const args = process.argv.slice(2);
  let startDate = "";
  let days = 30;
  let output = "data/training/historical_events.json";
  let filesPerDay = 4;

  for (const arg of args) {
    if (arg.startsWith("--start=")) startDate = arg.slice("--start=".length);
    if (arg.startsWith("--days=")) days = parseInt(arg.slice("--days=".length), 10);
    if (arg.startsWith("--output=")) output = arg.slice("--output=".length);
    if (arg.startsWith("--files-per-day=")) filesPerDay = parseInt(arg.slice("--files-per-day=".length), 10);
  }

  if (!startDate || !/^\d{4}-\d{2}-\d{2}$/.test(startDate)) {
    console.error("Usage: bun run enrich:historical -- --start=YYYY-MM-DD --days=N [--output=path] [--files-per-day=N]");
    process.exit(1);
  }

  return { startDate, days, output, filesPerDay };
}

function gdeltUrlsForRange(startDate: string, days: number, filesPerDay: number): string[] {
  const startMs = Date.parse(startDate);
  if (!Number.isFinite(startMs)) throw new Error(`Invalid start date: ${startDate}`);

  const INTERVAL = 15 * 60 * 1000;
  const urls: string[] = [];
  const seen = new Set<string>();

  for (let d = 0; d < days; d++) {
    const dayMs = startMs + d * 86_400_000;
    for (let f = 0; f < filesPerDay; f++) {
      const offsetMs = f * (24 / filesPerDay) * 3_600_000;
      const t = new Date(Math.floor((dayMs + offsetMs) / INTERVAL) * INTERVAL);
      const yyyy = t.getUTCFullYear();
      const mm = String(t.getUTCMonth() + 1).padStart(2, "0");
      const dd = String(t.getUTCDate()).padStart(2, "0");
      const hh = String(t.getUTCHours()).padStart(2, "0");
      const min = String(t.getUTCMinutes()).padStart(2, "0");
      const url = `http://data.gdeltproject.org/gdeltv2/${yyyy}${mm}${dd}${hh}${min}00.export.CSV.zip`;
      if (!seen.has(url)) {
        seen.add(url);
        urls.push(url);
      }
    }
  }

  return urls;
}

async function main() {
  const { startDate, days, output, filesPerDay } = parseArgs();
  const urls = gdeltUrlsForRange(startDate, days, filesPerDay);

  console.log(`Fetching ${urls.length} GDELT v2 files from ${startDate} for ${days} days...`);

  const allEvents: GdeltEvent[] = [];
  let fetched = 0;
  for (const url of urls) {
    const events = await fetchOne(url);
    if (events.length > 0) {
      allEvents.push(...events);
      fetched++;
    }
  }

  console.log(`Fetched ${fetched}/${urls.length} files, ${allEvents.length} raw events`);

  const deduplicated = deduplicateEvents(allEvents);
  console.log(`Deduplicated to ${deduplicated.length} events`);

  await fs.mkdir(output.split("/").slice(0, -1).join("/") || ".", { recursive: true });
  await fs.writeFile(
    output,
    JSON.stringify({ updated: new Date().toISOString(), count: deduplicated.length, events: deduplicated }, null, 2)
  );

  console.log(`Wrote ${output}`);
}

main().catch((err) => {
  console.error("Historical enrichment failed:", err);
  process.exit(1);
});
