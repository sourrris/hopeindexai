import { Hono } from "hono";
import { inflateRawSync } from "zlib";

export const config = { maxDuration: 30 };

// ── Types ─────────────────────────────────────────────────────────────────────

interface GdeltEvent {
  id: string;
  lat: number;
  lon: number;
  category: "doom" | "bloom";
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

// ── GDELT column indices (0-indexed, 61 columns total) ────────────────────────
const COL = {
  GLOBALEVENTID: 0,
  SQLDATE: 1,
  ACTOR1NAME: 6,
  ACTOR2NAME: 16,
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

// ── Reference data ────────────────────────────────────────────────────────────

const QUAD_LABELS: Record<number, string> = {
  1: "Verbal Cooperation",
  2: "Material Cooperation",
  3: "Verbal Conflict",
  4: "Material Conflict",
};

const FIPS_CONTINENT: Record<string, string> = {
  // Americas
  US: "Americas", CA: "Americas", MX: "Americas",
  BR: "Americas", AR: "Americas", CO: "Americas", VE: "Americas",
  CL: "Americas", PE: "Americas", EC: "Americas", BO: "Americas",
  UY: "Americas", PY: "Americas", GY: "Americas", SR: "Americas",
  GT: "Americas", HO: "Americas", NU: "Americas", CS: "Americas", PM: "Americas",
  CU: "Americas", JM: "Americas", HA: "Americas", DR: "Americas",
  BB: "Americas", TD: "Americas", TT: "Americas",

  // Europe
  UK: "Europe", FR: "Europe", GM: "Europe", IT: "Europe", SP: "Europe",
  PO: "Europe", NL: "Europe", BE: "Europe", SW: "Europe", NO: "Europe",
  FI: "Europe", DA: "Europe", EI: "Europe",
  AU: "Europe", SZ: "Europe", PL: "Europe", HU: "Europe", EZ: "Europe", RO: "Europe",
  BU: "Europe", LO: "Europe", HR: "Europe", AL: "Europe",
  GK: "Europe", MT: "Europe", CY: "Europe",
  EN: "Europe", LG: "Europe", LH: "Europe",
  RS: "Europe", UP: "Europe", BL: "Europe", MD: "Europe",
  GG: "Europe", AM: "Europe", AJ: "Europe", RI: "Europe", SI: "Europe",

  // Middle East
  IS: "Middle East", JO: "Middle East", LB: "Middle East", SY: "Middle East",
  IZ: "Middle East", IR: "Middle East", SA: "Middle East",
  YM: "Middle East", KU: "Middle East", BA: "Middle East", QA: "Middle East",
  TC: "Middle East", MU: "Middle East", TU: "Middle East",
  WB: "Middle East", GZ: "Middle East",

  // Africa
  AG: "Africa", EG: "Africa", LY: "Africa", TS: "Africa", MO: "Africa",
  SU: "Africa", OD: "Africa", ET: "Africa", ER: "Africa", DJ: "Africa", SO: "Africa",
  KE: "Africa", UG: "Africa", TZ: "Africa", BI: "Africa", RW: "Africa",
  CG: "Africa", CF: "Africa", AO: "Africa",
  ZA: "Africa", MZ: "Africa", ZI: "Africa", ZM: "Africa",
  NI: "Africa", GH: "Africa", IV: "Africa",
  SL: "Africa", LI: "Africa", ML: "Africa", NG: "Africa",
  CM: "Africa", NA: "Africa", BC: "Africa", MG: "Africa", LS: "Africa", CD: "Africa",

  // Asia
  AF: "Asia", PK: "Asia", IN: "Asia", NP: "Asia", BT: "Asia",
  CE: "Asia", BM: "Asia", TH: "Asia", LA: "Asia",
  VM: "Asia", CB: "Asia", MY: "Asia", ID: "Asia",
  RP: "Asia", TW: "Asia", CH: "Asia", MN: "Asia",
  KS: "Asia", KN: "Asia", JA: "Asia",
  UZ: "Asia", KZ: "Asia", KG: "Asia", TI: "Asia", TX: "Asia",
  BD: "Asia", BX: "Asia",

  // Oceania
  AS: "Oceania", NZ: "Oceania", FJ: "Oceania", PP: "Oceania",
};

// ── Constants ─────────────────────────────────────────────────────────────────

const GDELT_BASE = "http://data.gdeltproject.org/gdeltv2/";
const MAX_POINTS = 1_500;
const ROWS_PER_FILE = 1_200;
const N_FILES = 10;
const CACHE_TTL = 15 * 60 * 1_000;
const FETCH_TIMEOUT = 10_000;

// ── In-memory cache ───────────────────────────────────────────────────────────

const cache = new Map<string, { data: GdeltEvent[]; ts: number }>();

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

function getRadius(g: number | null): number {
  if (g === null) return 2;
  return Math.min(7, Math.max(2, 2 + Math.abs(g) * 0.5));
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

      events.push({
        id: cols[COL.GLOBALEVENTID],
        lat, lon, category, goldstein, quadClass,
        quadLabel: QUAD_LABELS[quadClass ?? 0] ?? "Unknown",
        actor1: cols[COL.ACTOR1NAME]?.trim() || "Unknown",
        actor2: cols[COL.ACTOR2NAME]?.trim() || "Unknown",
        country,
        location: cols[COL.ACTIONGEO_FULLNAME]?.trim() ?? "",
        date: fmtDate(cols[COL.SQLDATE]),
        numMentions: parseInt(cols[COL.NUMMENTIONS], 10) || 0,
        avgTone: isFinite(parseFloat(cols[COL.AVGTONE]))
          ? parseFloat(cols[COL.AVGTONE]) : null,
        sourceUrl: cols[COL.SOURCEURL]?.trim() ?? "",
        markerRadius: getRadius(goldstein),
        severity: getSeverity(goldstein),
        continent: FIPS_CONTINENT[country] ?? "Other",
      });
    }

    return events;
  } catch {
    return [];
  }
}

async function fetchGdelt(days: number): Promise<GdeltEvent[]> {
  const urls = gdeltUrls(days);
  const results = await Promise.allSettled(urls.map(fetchOne));

  const seen = new Set<string>();
  const all: GdeltEvent[] = [];

  for (const r of results) {
    if (r.status !== "fulfilled") continue;
    for (const e of r.value) {
      if (!seen.has(e.id)) {
        seen.add(e.id);
        all.push(e);
      }
    }
  }

  all.sort((a, b) => b.markerRadius - a.markerRadius);
  return all.slice(0, MAX_POINTS);
}

// ── App ───────────────────────────────────────────────────────────────────────

export const app = new Hono();

const ENV_API_KEY = process.env.ANTHROPIC_API_KEY ?? "";

app.get("/api/ai-status", (c) => {
  return c.json({ ready: Boolean(ENV_API_KEY) });
});

app.get("/api/events", async (c) => {
  const days = Math.max(1, Math.min(30, parseInt(c.req.query("days") ?? "7", 10)));
  const key = `events:${days}`;
  const hit = cache.get(key);

  if (hit && Date.now() - hit.ts < CACHE_TTL) {
    c.header("X-Cache", "HIT");
    return c.json({ events: hit.data, count: hit.data.length });
  }

  try {
    const events = await fetchGdelt(days);
    cache.set(key, { data: events, ts: Date.now() });
    c.header("X-Cache", "MISS");
    return c.json({ events, count: events.length });
  } catch {
    return c.json({ error: "GDELT fetch failed", events: [], count: 0 }, 500);
  }
});

app.post("/api/analyze", async (c) => {
  let body: { apiKey?: string; events?: GdeltEvent[]; mode?: string };
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "Invalid request body" }, 400);
  }

  const { apiKey: clientKey, events, mode } = body;
  const apiKey = (typeof clientKey === "string" && clientKey.startsWith("sk-ant"))
    ? clientKey
    : ENV_API_KEY;

  if (!apiKey) {
    return c.json({
      error: "No Anthropic API key configured. Add ANTHROPIC_API_KEY to your .env file — see the setup guide in the README.",
    }, 400);
  }
  if (!Array.isArray(events) || events.length === 0) {
    return c.json({ error: "No events provided" }, 400);
  }

  const SYSTEM_PROMPT =
    `You are a senior international geopolitical analyst with deep expertise in global ` +
    `economics, regional security, and cross-cultural dynamics. Your assessments are ` +
    `precise, evidence-based, and free from political or ideological bias. ` +
    `When analyzing events you consider: (1) the immediate geopolitical context and ` +
    `the actors involved, (2) economic ripple effects — trade flows, market exposure, ` +
    `sanctions risk, supply chains, (3) cultural and humanitarian dimensions, ` +
    `(4) cascading consequences for neighboring regions and the broader international ` +
    `order, and (5) escalation or de-escalation signals. Be concise, direct, and ` +
    `analytically rigorous. Avoid speculation beyond what the data supports.`;

  let userPrompt: string;

  if (mode === "detail" && events.length === 1) {
    const e = events[0];
    const actors = e.actor1 !== "Unknown"
      ? `${e.actor1}${e.actor2 !== "Unknown" ? ` → ${e.actor2}` : ""}`
      : "Unknown actors";

    userPrompt =
      `Analyze the following geopolitical event reported by GDELT:\n\n` +
      `Type: ${e.category === "doom" ? "Conflict / Hostile Action" : "Cooperation / Positive Engagement"}\n` +
      `Classification: ${e.quadLabel}\n` +
      `Actors: ${actors}\n` +
      `Location: ${e.location || e.country}\n` +
      `Date: ${e.date}\n` +
      `Goldstein Scale: ${e.goldstein !== null ? e.goldstein.toFixed(1) : "n/a"} (range −10 to +10)\n` +
      `Severity: ${e.severity}\n` +
      `Media Coverage: ${e.numMentions} mentions\n` +
      `Average Tone: ${e.avgTone !== null ? e.avgTone.toFixed(2) : "n/a"}\n` +
      (e.sourceUrl ? `Source: ${e.sourceUrl}\n` : "") +
      `\nProvide a structured briefing covering:\n` +
      `1. Immediate significance and context\n` +
      `2. Economic implications — trade, markets, investment exposure\n` +
      `3. Cultural and humanitarian dimensions\n` +
      `4. Regional and global ripple effects\n` +
      `5. Escalation or resolution outlook\n\nAnalysis:`;
  } else {
    const top = events.slice(0, 50);
    const lines = top.map(
      (e) =>
        `[${e.date}] ${e.category.toUpperCase()} | ${e.quadLabel} | ` +
        `${e.actor1} → ${e.actor2} | ${e.location} | ` +
        `Goldstein: ${e.goldstein?.toFixed(1) ?? "n/a"} | Mentions: ${e.numMentions}`
    );
    userPrompt =
      `Analyze the following ${top.length} events (from ${events.length} total) from the ` +
      `GDELT Project and deliver a concise global intelligence briefing. Identify key ` +
      `patterns, escalation clusters, areas of cooperation, and notable regional dynamics.\n\n` +
      `Events:\n${lines.join("\n")}\n\nBriefing:`;
  }

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 1_024,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: userPrompt }],
      }),
      signal: AbortSignal.timeout(30_000),
    });

    if (!res.ok) {
      const msg = await res.text().catch(() => res.statusText);
      return c.json({ error: `Anthropic API error (${res.status}): ${msg}` }, 502);
    }

    const data = (await res.json()) as {
      content?: Array<{ type: string; text: string }>;
    };
    const analysis = data.content?.find((b) => b.type === "text")?.text ?? "";
    return c.json({ analysis });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return c.json({ error: `Analysis failed: ${msg}` }, 500);
  }
});

// ── Vercel handler ────────────────────────────────────────────────────────────

// Forbidden request headers that Node.js undici rejects when constructing a Request
const FORBIDDEN = new Set([
  "host", "connection", "keep-alive", "transfer-encoding", "te",
  "trailer", "upgrade", "accept-encoding", "content-length",
  "access-control-request-headers", "access-control-request-method",
  "accept-charset", "cookie2", "date", "dnt", "expect", "origin", "via",
]);

export default async function handler(req: any, res: any): Promise<void> {
  try {
    const rawProto = req.headers?.["x-forwarded-proto"];
    const proto = (Array.isArray(rawProto) ? rawProto[0] : rawProto || "https").split(",")[0].trim();
    const rawHost = req.headers?.["host"];
    const host = (Array.isArray(rawHost) ? rawHost[0] : rawHost || "localhost").split(",")[0].trim();
    const url = new URL(req.url || "/", `${proto}://${host}`);

    const headers = new Headers();
    for (const [key, value] of Object.entries(req.headers || {})) {
      const k = key.toLowerCase();
      if (FORBIDDEN.has(k) || k.startsWith("proxy-") || k.startsWith(":")) continue;
      if (Array.isArray(value)) {
        for (const v of value) headers.append(k, String(v));
      } else if (value != null) {
        headers.set(k, String(value));
      }
    }

    const webReq = new Request(url.toString(), {
      method: req.method || "GET",
      headers,
    });

    const webRes = await app.fetch(webReq);

    res.statusCode = webRes.status;
    webRes.headers.forEach((value: string, key: string) => {
      res.setHeader(key, value);
    });
    const body = Buffer.from(await webRes.arrayBuffer());
    res.end(body);
  } catch (err) {
    const msg = err instanceof Error ? `${err.name}: ${err.message}` : String(err);
    console.error("Handler error:", msg);
    if (!res.headersSent) {
      res.statusCode = 500;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ error: msg }));
    }
  }
}
