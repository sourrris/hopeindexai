import { promises as fs } from "fs";
import { join } from "path";
import { inflateRawSync } from "zlib";

// ── Types ─────────────────────────────────────────────────────────────────────

interface GdeltEvent {
  id: string;
  lat: number;
  lon: number;
  category: "doom" | "bloom";
  theme: "Diplomacy" | "Conflict" | "Econ" | "Environment" | "Humanitarian" | "Science";
  hopeScore: number;
  aiSummary?: string;
  aiReasoning?: string;
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

// ── Column Indices ────────────────────────────────────────────────────────────
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

// ── Ingestion Parameters ──────────────────────────────────────────────────────
const GDELT_BASE = "http://data.gdeltproject.org/gdeltv2/";
const DAYS_TO_FETCH = 7;
const N_FILES = 30; // 30 files over 7 days (much denser than before!)
const ROWS_PER_FILE = 2000;
const FETCH_TIMEOUT = 12000;

// ── Helpers ───────────────────────────────────────────────────────────────────

function gdeltUrls(days: number): string[] {
  const INTERVAL = 15 * 60 * 1000;
  const now = Date.now();
  const latest = Math.floor(now / INTERVAL) * INTERVAL - INTERVAL;
  const seen = new Set<string>();
  const urls: string[] = [];

  for (let i = 0; i < N_FILES; i++) {
    const offsetMs = days === 1
      ? i * INTERVAL
      : (days * i / (N_FILES - 1)) * 86_400_000;

    const t = new Date(Math.floor((latest - offsetMs) / INTERVAL) * INTERVAL);
    const yyyy = t.getUTCFullYear();
    const mm   = String(t.getUTCMonth() + 1).padStart(2, "0");
    const dd   = String(t.getUTCDate()).padStart(2, "0");
    const hh   = String(t.getUTCHours()).padStart(2, "0");
    const min  = String(t.getUTCMinutes()).padStart(2, "0");
    const url  = `${GDELT_BASE}${yyyy}${mm}${dd}${hh}${min}00.export.CSV.zip`;

    if (!seen.has(url)) {
      seen.add(url);
      urls.push(url);
    }
  }
  return urls;
}

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
  // Scale slightly with mentions weight (up to +4 extra radius)
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
  const compSize    = buf.readUInt32LE(18);
  const nameLen     = buf.readUInt16LE(26);
  const extraLen    = buf.readUInt16LE(28);
  const dataStart   = 30 + nameLen + extraLen;
  const compressed  = compSize > 0
    ? buf.subarray(dataStart, dataStart + compSize)
    : buf.subarray(dataStart);
  if (compression === 0) return compressed;
  if (compression === 8) return inflateRawSync(compressed);
  throw new Error(`Unsupported ZIP method: ${compression}`);
}

// Heuristic Thematic Classification based on Cameo Code, Actors & Source URL
function classifyTheme(
  eventCode: string,
  actor1: string,
  actor2: string,
  quadClass: number | null
): GdeltEvent["theme"] {
  const text = `${actor1} ${actor2}`.toUpperCase();

  // 1. Energy & Environment (Keywords search)
  const envKeywords = ["CLIMATE", "GREEN", "ENERGY", "ENVIRONMENT", "POLLUTION", "ECOLOGY", "WIND", "SOLAR", "GAS", "OIL", "CARBON", "EMISSION", "COP2", "WILDLIFE", "FOREST", "WATER"];
  if (envKeywords.some(kw => text.includes(kw))) {
    return "Environment";
  }

  // 2. Science & Technology
  const techKeywords = ["UNIVERSITY", "SCIENTIST", "RESEARCH", "NASA", "CERN", "TECH", "AI", "SEMICONDUCTOR", "CHIP", "ROBOT", "SPACE", "SOFTWARE", "INNOVATION", "PATENT"];
  if (techKeywords.some(kw => text.includes(kw))) {
    return "Science";
  }

  // 3. Humanitarian & Rights
  const humKeywords = ["REFUGEE", "HUMAN RIGHTS", "AID", "RED CROSS", "UNHCR", "AMNESTY", "DISASTER", "FLOOD", "EARTHQUAKE", "FACTION", "PROTESTER", "HUNGER", "POVERTY", "CHARITY"];
  const isAidCode = eventCode.startsWith("07") || eventCode.startsWith("08"); // Provide aid / yield
  if (isAidCode || humKeywords.some(kw => text.includes(kw))) {
    return "Humanitarian";
  }

  // 4. Trade & Economics
  const econKeywords = ["BANK", "TRADE", "MARKET", "MINISTRY OF FINANCE", "ECONOMY", "IMF", "WTO", "SANCTION", "BUSINESS", "TARIFF", "INDUSTRY", "INVEST", "FINANCE", "TREASURY"];
  const isEconCode = eventCode.startsWith("06"); // Dispute / negotiate economic
  if (isEconCode || econKeywords.some(kw => text.includes(kw))) {
    return "Econ";
  }

  // 5. Conflict & Security
  const isConflictCode =
    eventCode.startsWith("11") || eventCode.startsWith("12") ||
    eventCode.startsWith("13") || eventCode.startsWith("14") ||
    eventCode.startsWith("15") || eventCode.startsWith("16") ||
    eventCode.startsWith("17") || eventCode.startsWith("18") ||
    eventCode.startsWith("19") || eventCode.startsWith("20");
  if (isConflictCode || quadClass === 3 || quadClass === 4) {
    return "Conflict";
  }

  // 6. Diplomacy (Default fallback for cooperative/neutral, or Cameo 01-05)
  return "Diplomacy";
}

// Heuristic scoring of net forward-looking constructive progress (0 - 100)
function calculateHopeScore(
  goldstein: number | null,
  avgTone: number | null,
  theme: GdeltEvent["theme"]
): number {
  let score = 50; // base score

  // 1. Goldstein contribution (ranges -10 to +10, maps to -25 to +25 points)
  if (goldstein !== null) {
    score += goldstein * 2.5;
  }

  // 2. Average Tone contribution (ranges -10 to +10, maps to -15 to +15 points)
  if (avgTone !== null) {
    score += avgTone * 1.5;
  }

  // 3. Category Adjustments
  switch (theme) {
    case "Science":
      score += 12; // Science & discovery is highly hopeful
      break;
    case "Humanitarian":
      score += 8;  // Aid and rights are very constructive
      break;
    case "Environment":
      // Cooperative climate acts are very hopeful
      if (goldstein && goldstein > 0) score += 10;
      else score -= 4; // disputes are slightly discouraging
      break;
    case "Diplomacy":
      if (goldstein && goldstein > 0) score += 6;
      break;
    case "Econ":
      if (goldstein && goldstein > 0) score += 4;
      break;
    case "Conflict":
      score -= 15; // conflicts reduce hope
      break;
  }

  // Clamp strictly between 0 and 100
  return Math.min(100, Math.max(0, Math.round(score)));
}

// Fetch a single GDELT zip and parse it
async function fetchOne(url: string): Promise<GdeltEvent[]> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(FETCH_TIMEOUT) });
    if (!res.ok) return [];

    const buf = Buffer.from(await res.arrayBuffer());
    const csvBytes = unzipFirst(buf);
    const text = csvBytes.toString("utf8");
    const lines = text.split("\n");

    const events: GdeltEvent[] = [];
    const limit = Math.min(lines.length, ROWS_PER_FILE);

    for (let i = 0; i < limit; i++) {
      const cols = lines[i].split("\t");
      if (cols.length < 61) continue;

      const lat = parseFloat(cols[COL.ACTIONGEO_LAT]);
      const lon = parseFloat(cols[COL.ACTIONGEO_LONG]);
      if (!isFinite(lat) || !isFinite(lon) || (lat === 0 && lon === 0)) continue;

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
      const hopeScore = calculateHopeScore(goldstein, parseFloat(cols[COL.AVGTONE]), theme);
      const numMentions = parseInt(cols[COL.NUMMENTIONS], 10) || 0;

      events.push({
        id: cols[COL.GLOBALEVENTID],
        lat, lon, category, theme, hopeScore,
        goldstein, quadClass,
        quadLabel: QUAD_LABELS[quadClass ?? 0] ?? "Unknown",
        actor1, actor2, country,
        location: cols[COL.ACTIONGEO_FULLNAME]?.trim() ?? "",
        date: fmtDate(cols[COL.SQLDATE]),
        numMentions,
        avgTone: isFinite(parseFloat(cols[COL.AVGTONE]))
          ? parseFloat(cols[COL.AVGTONE]) : null,
        sourceUrl: cols[COL.SOURCEURL]?.trim() ?? "",
        markerRadius: getRadius(goldstein, numMentions),
        severity: getSeverity(goldstein),
        continent: FIPS_CONTINENT[country] ?? "Other",
      });
    }

    return events;
  } catch (err) {
    // console.error(`Error fetching file: ${url}`, err);
    return [];
  }
}

// ── Clustering & Deduplication Engine ───────────────────────────────────────

function deduplicateEvents(events: GdeltEvent[]): GdeltEvent[] {
  console.log(`Pipeline -> Deduplicating ${events.length} parsed events...`);

  // Grid size for clustering (0.08 degrees is approx. 8-9 kilometers)
  const GRID_SIZE = 0.08;
  const clusters = new Map<string, GdeltEvent[]>();

  for (const e of events) {
    const gridLat = Math.round(e.lat / GRID_SIZE);
    const gridLon = Math.round(e.lon / GRID_SIZE);

    // Group by Date + Theme + Grid Location + (Actor1 name first letter to avoid combining totally distinct entities)
    const actorPrefix = e.actor1 ? e.actor1.slice(0, 3).toUpperCase() : "UNK";
    const key = `${e.date}:${e.theme}:${gridLat}:${gridLon}:${actorPrefix}`;

    if (!clusters.has(key)) {
      clusters.set(key, []);
    }
    clusters.get(key)!.push(e);
  }

  const deduplicated: GdeltEvent[] = [];

  for (const [key, clusterEvents] of clusters.entries()) {
    if (clusterEvents.length === 0) continue;

    // Sort by numMentions descending to pick the most prominent event
    clusterEvents.sort((a, b) => b.numMentions - a.numMentions);

    // The main event of the cluster
    const representative = { ...clusterEvents[0] };

    // Aggregate data from all duplicate events in this cluster
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
    // Recompute radius based on the combined mentions weight
    representative.markerRadius = getRadius(representative.goldstein, totalMentions);

    deduplicated.push(representative);
  }

  console.log(`Pipeline -> Deduplication finished. Retained ${deduplicated.length} clean event clusters.`);
  return deduplicated;
}

// ── Optional LLM Enrichment via Claude ───────────────────────────────────────

async function enrichWithLLM(events: GdeltEvent[]): Promise<GdeltEvent[]> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.log("Pipeline -> ANTHROPIC_API_KEY not found. Skipping optional LLM enrichment.");
    return events;
  }

  // Sort by mentions descending and grab the top 35 most prominent global events
  const eligible = [...events];
  eligible.sort((a, b) => b.numMentions - a.numMentions);
  const topEvents = eligible.slice(0, 35);
  const remaining = eligible.slice(35);

  console.log(`Pipeline -> Enriching top ${topEvents.length} global events with Claude 3.5 Haiku/Sonnet...`);

  // Batch process in groups of 5 to avoid API rate limit triggers
  const batchSize = 5;
  for (let i = 0; i < topEvents.length; i += batchSize) {
    const batch = topEvents.slice(i, i + batchSize);

    await Promise.all(batch.map(async (e) => {
      try {
        const actors = e.actor1 !== "Unknown"
          ? `${e.actor1}${e.actor2 !== "Unknown" ? ` and ${e.actor2}` : ""}`
          : "geopolitical actors";

        const prompt = `Analyze this reported event and output a JSON object containing:
1. "aiSummary": A extremely concise, high-impact one-sentence news summary (max 18 words) written in a standard objective press style. Avoid repeating the raw columns directly, write a highly coherent sentence.
2. "hopeScore": An integer from 0 to 100 representing how constructively this event moves humanity forward (e.g. diplomacy, discoveries, aid, green agreements = 70-100; conflicts, trade wars, energy crises = 0-40).
3. "aiReasoning": A single sentence explanation of the Hope Score logic.

Event details:
- Theme: ${e.theme}
- Actors: ${actors}
- Location: ${e.location} (${e.country})
- Date: ${e.date}
- Goldstein: ${e.goldstein}
- Average Tone: ${e.avgTone}
- GDELT classification: ${e.quadLabel}

Output ONLY valid raw JSON with keys: "aiSummary", "hopeScore", "aiReasoning". Keep it compact, no markdown wrapping.`;

        const res = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "x-api-key": apiKey,
            "anthropic-version": "2023-06-01",
            "content-type": "application/json",
          },
          body: JSON.stringify({
            model: "claude-3-5-haiku-20241022",
            max_tokens: 250,
            messages: [{ role: "user", content: prompt }],
          }),
          signal: AbortSignal.timeout(15000),
        });

        if (res.ok) {
          const data = await res.json() as any;
          const text = data.content?.[0]?.text?.trim() ?? "";
          // Extract JSON if wrapped in code blocks
          const jsonStr = text.startsWith("{") ? text : text.substring(text.indexOf("{"), text.lastIndexOf("}") + 1);
          const parsed = JSON.parse(jsonStr);

          if (parsed.aiSummary) e.aiSummary = parsed.aiSummary;
          if (parsed.hopeScore !== undefined) e.hopeScore = Math.min(100, Math.max(0, parseInt(parsed.hopeScore)));
          if (parsed.aiReasoning) e.aiReasoning = parsed.aiReasoning;
        }
      } catch (err) {
        console.error(`LLM enrichment failed for event ID ${e.id}:`, err);
      }
    }));

    // Small delay between batches
    await new Promise(r => setTimeout(r, 600));
  }

  // Reassemble the complete list and sort by radius/mentions
  const merged = [...topEvents, ...remaining];
  merged.sort((a, b) => b.markerRadius - a.markerRadius);
  return merged;
}

// ── Main Pipeline ─────────────────────────────────────────────────────────────

async function runPipeline() {
  console.log("HopeIndexAI Pipeline -> Starting data ingestion...");
  const startTime = Date.now();

  try {
    // 1. Generate GDELT archive URLs
    const urls = gdeltUrls(DAYS_TO_FETCH);
    console.log(`Pipeline -> Fetching ${urls.length} GDELT archives in parallel...`);

    // 2. Fetch and parse GDELT archives in parallel
    const results = await Promise.allSettled(urls.map(fetchOne));
    const allEvents: GdeltEvent[] = [];
    const seen = new Set<string>();

    for (const r of results) {
      if (r.status !== "fulfilled") continue;
      for (const e of r.value) {
        if (!seen.has(e.id)) {
          seen.add(e.id);
          allEvents.push(e);
        }
      }
    }

    console.log(`Pipeline -> Downloaded and parsed ${allEvents.length} raw events.`);

    if (allEvents.length === 0) {
      throw new Error("No events fetched from GDELT archives. Pipeline aborted.");
    }

    // 3. Run semantic clustering and deduplication
    const deduplicated = deduplicateEvents(allEvents);

    // 4. Run LLM Enrichment for top global events
    const enriched = await enrichWithLLM(deduplicated);

    // 5. Sort final list and slice to limit size
    enriched.sort((a, b) => b.markerRadius - a.markerRadius);
    const finalEvents = enriched.slice(0, 1500);

    // 6. Ensure directories exist
    await fs.mkdir("public/data", { recursive: true });

    // 7. Write to static JSON files
    const outputPath = "public/data/events.json";
    await fs.writeFile(outputPath, JSON.stringify({ events: finalEvents, count: finalEvents.length, updated: new Date().toISOString() }));
    console.log(`Pipeline -> Enriched dataset written successfully to: ${outputPath} (${finalEvents.length} clusters)`);

    // 8. Run synchronization script to copy files
    const syncProcess = Bun.spawn(["bun", "scripts/sync.ts"]);
    await syncProcess.exited;

    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`HopeIndexAI Pipeline -> Completed successfully in ${duration} seconds.`);
  } catch (error) {
    console.error("HopeIndexAI Pipeline -> Fatal pipeline failure:", error);
    process.exit(1);
  }
}

runPipeline();
