import { Hono } from "hono";
import { inflateRawSync } from "zlib";
import { dirname, join } from "path";
import { promises as fs } from "fs";
import { fileURLToPath } from "url";

export const config = { maxDuration: 30 };

// ── Types ─────────────────────────────────────────────────────────────────────

interface GdeltEvent {
  id: string;
  lat: number;
  lon: number;
  category: "doom" | "bloom";
  theme?: "Diplomacy" | "Conflict" | "Econ" | "Environment" | "Humanitarian" | "Science";
  hopeScore?: number;
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

interface RelatedSignal {
  event: GdeltEvent;
  score: number;
  reasons: string[];
  probability?: number;
  channels?: string[];
}

interface SourceEvidence {
  url: string;
  domain: string;
  fetched: boolean;
  status: string;
  title?: string;
  excerpt?: string;
}

interface ProbeEntity {
  name: string;
  type: "actor" | "place" | "publisher" | "theme";
  salience: number;
  evidence: string[];
}

interface ImpactVector {
  key: "local" | "humanitarian" | "policy" | "finance" | "supplyChain" | "social";
  label: string;
  score: number;
  direction: "negative" | "mixed" | "positive";
  confidence: number;
  rationale: string;
}

interface HypothesisSeed {
  title: string;
  mechanism: string;
  confidence: number;
  evidenceFor: string[];
  evidenceAgainst: string[];
}

interface ActorGame {
  actor: string;
  incentives: string[];
  constraints: string[];
  likelyMoves: string[];
  decisionTraps: string[];
}

interface ModelPrediction {
  probability: number;
  label: "low" | "elevated" | "high";
  threshold: number;
  target: string;
  modelVersion: string;
  metrics?: Record<string, unknown>;
  drivers: Array<{ feature: string; contribution: number; direction: "raises" | "lowers" }>;
  limitations: string[];
}

interface ProbePack {
  selectedEvent: GdeltEvent;
  datasetUpdated?: string;
  source: SourceEvidence | null;
  relatedSignals: RelatedSignal[];
  prediction?: ModelPrediction;
  entities: ProbeEntity[];
  impactMap: ImpactVector[];
  hypotheses: HypothesisSeed[];
  actorGame: ActorGame[];
  watchlist: string[];
  evidenceGrade: {
    label: "thin" | "partial" | "strong";
    confidence: number;
    reasons: string[];
  };
  uncertaintyWarnings: string[];
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
const MODULE_DIR = dirname(fileURLToPath(import.meta.url));
const SOURCE_FETCH_TIMEOUT = 5_000;
const SOURCE_TEXT_LIMIT = 3_500;
const RELATED_SIGNAL_LIMIT = 12;

// ── In-memory cache ───────────────────────────────────────────────────────────

const cache = new Map<string, { data: GdeltEvent[]; ts: number }>();
const sourceEvidenceCache = new Map<string, { data: SourceEvidence; ts: number }>();
let modelCache: { data: any; ts: number } | null = null;

const ACTOR_STOPWORDS = new Set([
  "UNKNOWN", "GOVERNMENT", "MINISTRY", "STATE", "STATES", "UNITED", "NATIONAL",
  "INTERNATIONAL", "OFFICIAL", "OFFICIALS", "POLICE", "ADMINISTRATION",
  "PRESIDENT", "PRIME", "MINISTER", "CITY", "COUNTY", "LOCAL",
]);

const FINANCE_KEYWORDS = [
  "BANK", "MARKET", "STOCK", "BOND", "CURRENCY", "RATE", "INFLATION", "TREASURY",
  "SANCTION", "TRADE", "TARIFF", "OIL", "GAS", "LNG", "ENERGY", "PIPELINE",
  "SHIPPING", "PORT", "INSURANCE", "INVEST", "COMPANY", "EXPORT", "IMPORT",
];

const SUPPLY_CHAIN_KEYWORDS = [
  "PORT", "SHIPPING", "RAIL", "AIRPORT", "BORDER", "SEMICONDUCTOR", "CHIP",
  "OIL", "GAS", "LNG", "WHEAT", "GRAIN", "FOOD", "MEDICINE", "MINING",
  "FACTORY", "POWER", "ELECTRICITY", "CANAL", "ROUTE",
];

const TRAINING_THEMES = ["Diplomacy", "Conflict", "Econ", "Environment", "Humanitarian", "Science"] as const;
const TRAINING_CONTINENTS = ["Americas", "Europe", "Middle East", "Africa", "Asia", "Oceania", "Other"] as const;
const TRAINING_QUADS = [1, 2, 3, 4] as const;

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

async function resolveEventsJsonPath(): Promise<string> {
  const candidates = [
    join(process.cwd(), "public/data/events.json"),
    join(MODULE_DIR, "../public/data/events.json"),
  ];

  for (const path of candidates) {
    try {
      await fs.access(path);
      return path;
    } catch {
      // Try the next known runtime layout.
    }
  }

  return candidates[0];
}

async function loadEventDataset(): Promise<{ events: GdeltEvent[]; updated?: string }> {
  const jsonPath = await resolveEventsJsonPath();
  const jsonText = await fs.readFile(jsonPath, "utf8");
  const parsed = JSON.parse(jsonText);
  return {
    events: Array.isArray(parsed.events) ? parsed.events : [],
    updated: typeof parsed.updated === "string" ? parsed.updated : undefined,
  };
}

async function loadEscalationModel(): Promise<any | null> {
  if (modelCache && Date.now() - modelCache.ts < CACHE_TTL) return modelCache.data;

  const candidates = [
    join(process.cwd(), "public/data/escalation-model.json"),
    join(MODULE_DIR, "../public/data/escalation-model.json"),
  ];

  for (const path of candidates) {
    try {
      const text = await fs.readFile(path, "utf8");
      const data = JSON.parse(text);
      modelCache = { data, ts: Date.now() };
      return data;
    } catch {
      // Try the next runtime layout.
    }
  }

  return null;
}

function hostFromUrl(url: string | undefined): string {
  if (!url) return "";
  try {
    return new URL(url).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return "";
  }
}

function isSafeHttpUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return false;

    const host = parsed.hostname.toLowerCase();
    if (
      host === "localhost" ||
      host.endsWith(".local") ||
      host === "0.0.0.0" ||
      host.startsWith("127.") ||
      host.startsWith("10.") ||
      host.startsWith("192.168.") ||
      host.startsWith("169.254.") ||
      /^172\.(1[6-9]|2\d|3[0-1])\./.test(host) ||
      host === "::1" ||
      host === "[::1]"
    ) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

function decodeHtmlEntities(text: string): string {
  const named: Record<string, string> = {
    amp: "&",
    apos: "'",
    gt: ">",
    lt: "<",
    nbsp: " ",
    quot: "\"",
  };

  return text.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (_, entity: string) => {
    const key = entity.toLowerCase();
    if (named[key]) return named[key];
    if (key.startsWith("#x")) {
      const value = Number.parseInt(key.slice(2), 16);
      return Number.isFinite(value) ? String.fromCodePoint(value) : "";
    }
    if (key.startsWith("#")) {
      const value = Number.parseInt(key.slice(1), 10);
      return Number.isFinite(value) ? String.fromCodePoint(value) : "";
    }
    return "";
  });
}

function htmlToText(html: string): string {
  return decodeHtmlEntities(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
      .replace(/<!--[\s\S]*?-->/g, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
  );
}

function extractTitle(html: string): string | undefined {
  const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1];
  if (!title) return undefined;
  return htmlToText(title).slice(0, 180);
}

async function fetchSourceEvidence(sourceUrl: string | undefined): Promise<SourceEvidence | null> {
  if (!sourceUrl) return null;

  const url = sourceUrl.trim();
  const cached = sourceEvidenceCache.get(url);
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    return cached.data;
  }

  const domain = hostFromUrl(url);
  if (!isSafeHttpUrl(url)) {
    return { url, domain, fetched: false, status: "Source URL was skipped because it is not a safe public HTTP(S) URL." };
  }

  let evidence: SourceEvidence;
  try {
    const res = await fetch(url, {
      headers: {
        accept: "text/html,application/xhtml+xml,text/plain;q=0.8,*/*;q=0.2",
        "user-agent": "HopeIndexAI/0.1 causal-analysis-bot",
      },
      signal: AbortSignal.timeout(SOURCE_FETCH_TIMEOUT),
    });

    if (!res.ok) {
      evidence = { url, domain, fetched: false, status: `Source fetch failed with HTTP ${res.status}.` };
      sourceEvidenceCache.set(url, { data: evidence, ts: Date.now() });
      return evidence;
    }

    const raw = await res.text();
    const clipped = raw.slice(0, 400_000);
    const text = htmlToText(clipped);

    if (!text) {
      evidence = { url, domain, fetched: false, status: "Source fetched, but no readable article text was extracted." };
      sourceEvidenceCache.set(url, { data: evidence, ts: Date.now() });
      return evidence;
    }

    evidence = {
      url,
      domain,
      fetched: true,
      status: "Source article text extracted.",
      title: extractTitle(clipped),
      excerpt: text.slice(0, SOURCE_TEXT_LIMIT),
    };
    sourceEvidenceCache.set(url, { data: evidence, ts: Date.now() });
    return evidence;
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown source fetch error";
    evidence = { url, domain, fetched: false, status: `Source fetch failed: ${msg}` };
    sourceEvidenceCache.set(url, { data: evidence, ts: Date.now() });
    return evidence;
  }
}

function actorTokens(e: GdeltEvent): Set<string> {
  const raw = `${e.actor1 ?? ""} ${e.actor2 ?? ""}`.toUpperCase();
  const tokens = raw
    .split(/[^A-Z0-9]+/)
    .filter((token) => token.length > 2 && !ACTOR_STOPWORDS.has(token));
  return new Set(tokens);
}

function daysApart(a: GdeltEvent, b: GdeltEvent): number | null {
  const aMs = Date.parse(a.date);
  const bMs = Date.parse(b.date);
  if (!Number.isFinite(aMs) || !Number.isFinite(bMs)) return null;
  return Math.abs(aMs - bMs) / 86_400_000;
}

function dayNumber(date: string): number {
  const ms = Date.parse(date);
  return Number.isFinite(ms) ? Math.floor(ms / 86_400_000) : Number.NaN;
}

function distanceKm(a: GdeltEvent, b: GdeltEvent): number | null {
  if (![a.lat, a.lon, b.lat, b.lon].every(Number.isFinite)) return null;
  const toRad = (n: number) => n * Math.PI / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}

function relationScore(target: GdeltEvent, candidate: GdeltEvent): RelatedSignal | null {
  if (target.id === candidate.id) return null;

  let score = 0;
  const reasons: string[] = [];
  const targetSource = hostFromUrl(target.sourceUrl);
  const candidateSource = hostFromUrl(candidate.sourceUrl);

  if (target.sourceUrl && candidate.sourceUrl && target.sourceUrl === candidate.sourceUrl) {
    score += 90;
    reasons.push("same source article");
  } else if (targetSource && candidateSource && targetSource === candidateSource) {
    score += 18;
    reasons.push(`same publisher (${targetSource})`);
  }

  const targetActors = actorTokens(target);
  const candidateActors = actorTokens(candidate);
  const sharedActors = [...targetActors].filter((token) => candidateActors.has(token));
  if (sharedActors.length > 0) {
    score += Math.min(45, sharedActors.length * 18);
    reasons.push(`shared actor/entity: ${sharedActors.slice(0, 3).join(", ")}`);
  }

  if (target.country && candidate.country && target.country === candidate.country) {
    score += 22;
    reasons.push(`same country (${target.country})`);
  }

  if (target.continent && candidate.continent && target.continent === candidate.continent) {
    score += 8;
  }

  if (target.theme && candidate.theme && target.theme === candidate.theme) {
    score += 14;
    reasons.push(`same theme (${target.theme})`);
  }

  if (target.quadClass !== null && target.quadClass === candidate.quadClass) {
    score += 8;
  }

  const days = daysApart(target, candidate);
  if (days !== null) {
    if (days <= 1) {
      score += 16;
      reasons.push("same 24h news cycle");
    } else if (days <= 7) {
      score += 11;
      reasons.push(`${Math.round(days)} days apart`);
    } else if (days <= 30) {
      score += 4;
    }
  }

  const km = distanceKm(target, candidate);
  if (km !== null) {
    if (km <= 50) {
      score += 18;
      reasons.push("nearby location");
    } else if (km <= 300) {
      score += 10;
      reasons.push(`regional proximity (${Math.round(km)} km)`);
    } else if (km <= 1_000) {
      score += 5;
    }
  }

  score += Math.min(10, Math.log10((candidate.numMentions ?? 0) + 1) * 4);

  if (score < 32 || reasons.length === 0) return null;
  return { event: candidate, score, reasons };
}

function findRelatedSignals(target: GdeltEvent, events: GdeltEvent[]): RelatedSignal[] {
  return events
    .map((candidate) => relationScore(target, candidate))
    .filter((value): value is RelatedSignal => value !== null)
    .sort((a, b) => b.score - a.score)
    .slice(0, RELATED_SIGNAL_LIMIT);
}

function eventActors(e: GdeltEvent): string {
  if (e.actor1 && e.actor1 !== "Unknown") {
    return `${e.actor1}${e.actor2 && e.actor2 !== "Unknown" ? ` -> ${e.actor2}` : ""}`;
  }
  return "Unknown actors";
}

function fmtNum(n: number | null | undefined, digits = 1): string {
  return typeof n === "number" && Number.isFinite(n) ? n.toFixed(digits) : "n/a";
}

function formatEventForPrompt(e: GdeltEvent): string {
  return [
    `ID: ${e.id}`,
    `Date: ${e.date}`,
    `Theme: ${e.theme ?? "Unknown"}`,
    `Category: ${e.category === "doom" ? "negative/conflict signal" : "positive/cooperation signal"}`,
    `GDELT class: ${e.quadLabel}`,
    `Actors: ${eventActors(e)}`,
    `Location: ${e.location || e.country}`,
    `Country/continent: ${e.country || "n/a"} / ${e.continent || "n/a"}`,
    `Goldstein: ${fmtNum(e.goldstein)} (-10 to +10)`,
    `Average tone: ${fmtNum(e.avgTone, 2)}`,
    `Mentions: ${e.numMentions ?? 0}`,
    `Hope score: ${e.hopeScore ?? "n/a"}`,
    e.sourceUrl ? `Source URL: ${e.sourceUrl}` : "",
  ].filter(Boolean).join("\n");
}

function sigmoid(z: number): number {
  if (z > 35) return 1;
  if (z < -35) return 0;
  return 1 / (1 + Math.exp(-z));
}

function sharesActor(a: GdeltEvent, b: GdeltEvent): boolean {
  const aTokens = actorTokens(a);
  if (aTokens.size === 0) return false;
  for (const token of actorTokens(b)) {
    if (aTokens.has(token)) return true;
  }
  return false;
}

function pastEvents(target: GdeltEvent, events: GdeltEvent[], days: number): GdeltEvent[] {
  const targetDay = dayNumber(target.date);
  return events.filter((event) => {
    const eventDay = dayNumber(event.date);
    return Number.isFinite(eventDay) && eventDay < targetDay && targetDay - eventDay <= days;
  });
}

function eventDoomRatio(events: GdeltEvent[]): number {
  if (events.length === 0) return 0;
  return events.filter((event) => event.category === "doom").length / events.length;
}

function eventMinGoldstein(events: GdeltEvent[]): number {
  const vals = events.map((event) => event.goldstein).filter((n): n is number => typeof n === "number" && Number.isFinite(n));
  return vals.length ? Math.min(...vals) : 0;
}

function eventAvgTone(events: GdeltEvent[]): number {
  const vals = events.map((event) => event.avgTone).filter((n): n is number => typeof n === "number" && Number.isFinite(n));
  return vals.length ? vals.reduce((sum, value) => sum + value, 0) / vals.length : 0;
}

function modelFeaturesFor(e: GdeltEvent, events: GdeltEvent[]): number[] {
  const history3 = pastEvents(e, events, 3);
  const history7 = pastEvents(e, events, 7);
  const countryPast3 = history3.filter((p) => p.country && p.country === e.country);
  const actorPast7 = history7.filter((p) => sharesActor(e, p));
  const themeCountryPast7 = history7.filter((p) => p.country === e.country && p.theme === e.theme);
  const host = hostFromUrl(e.sourceUrl);
  const sameSourcePast7 = host ? history7.filter((p) => hostFromUrl(p.sourceUrl) === host) : [];
  const nearbyPast3 = history3.filter((p) => {
    const km = distanceKm(e, p);
    return km !== null && km <= 300;
  });
  const continent = TRAINING_CONTINENTS.includes(e.continent as any) ? e.continent : "Other";

  return [
    e.goldstein ?? 0,
    Math.abs(e.goldstein ?? 0),
    e.avgTone ?? 0,
    Math.log1p(e.numMentions ?? 0),
    (e.hopeScore ?? 50) / 100,
    e.category === "doom" ? 1 : 0,
    e.severity === "critical" ? 1 : 0,
    e.severity === "high" ? 1 : 0,
    Math.abs(e.lat ?? 0) / 90,
    e.actor2 && e.actor2 !== "Unknown" ? 1 : 0,
    ...TRAINING_THEMES.map((theme) => e.theme === theme ? 1 : 0),
    ...TRAINING_CONTINENTS.map((c) => continent === c ? 1 : 0),
    ...TRAINING_QUADS.map((quad) => e.quadClass === quad ? 1 : 0),
    Math.log1p(countryPast3.length),
    eventDoomRatio(countryPast3),
    eventMinGoldstein(countryPast3),
    eventAvgTone(countryPast3),
    Math.log1p(actorPast7.length),
    eventDoomRatio(actorPast7),
    eventMinGoldstein(actorPast7),
    Math.log1p(themeCountryPast7.length),
    Math.log1p(sameSourcePast7.length),
    Math.log1p(nearbyPast3.length),
  ];
}

async function predictEscalation(e: GdeltEvent, events: GdeltEvent[]): Promise<ModelPrediction | undefined> {
  const model = await loadEscalationModel();
  if (!model?.featureNames || !model?.preprocessing || !model?.model) return undefined;

  const raw = modelFeaturesFor(e, events);
  const means: number[] = model.preprocessing.means;
  const stds: number[] = model.preprocessing.stds;
  const weights: number[] = model.model.weights;
  const standardized = raw.map((value, i) => (value - (means[i] ?? 0)) / ((stds[i] || 1)));
  const logit = (model.model.bias ?? 0) + standardized.reduce((sum, value, i) => sum + value * (weights[i] ?? 0), 0);
  const probability = sigmoid(logit);
  const threshold = model.model.threshold ?? 0.5;
  const label: ModelPrediction["label"] =
    probability >= Math.min(0.78, threshold + 0.2) ? "high" :
      probability >= threshold ? "elevated" : "low";

  const drivers = standardized
    .map((value, i) => ({
      feature: model.featureNames[i] ?? `feature_${i}`,
      contribution: value * (weights[i] ?? 0),
      direction: value * (weights[i] ?? 0) >= 0 ? "raises" as const : "lowers" as const,
    }))
    .sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution))
    .slice(0, 6)
    .map((driver) => ({
      ...driver,
      contribution: Number(driver.contribution.toFixed(4)),
    }));

  return {
    probability,
    label,
    threshold,
    target: model.target?.name ?? "future_escalation_72h",
    modelVersion: model.version ?? "unknown",
    metrics: model.metrics?.test,
    drivers,
    limitations: model.limitations ?? [],
  };
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

function relationProbability(score: number): number {
  return clamp(1 / (1 + Math.exp(-(score - 55) / 18)), 0.05, 0.98);
}

function relationChannels(reasons: string[]): string[] {
  const channels = new Set<string>();
  for (const reason of reasons) {
    const lower = reason.toLowerCase();
    if (lower.includes("source") || lower.includes("publisher")) channels.add("source");
    if (lower.includes("actor") || lower.includes("entity")) channels.add("actor");
    if (lower.includes("country") || lower.includes("location") || lower.includes("proximity")) channels.add("geography");
    if (lower.includes("theme")) channels.add("theme");
    if (lower.includes("cycle") || lower.includes("days")) channels.add("time");
  }
  return [...channels];
}

function withSignalProbability(signal: RelatedSignal): RelatedSignal {
  return {
    ...signal,
    probability: relationProbability(signal.score),
    channels: relationChannels(signal.reasons),
  };
}

function eventText(e: GdeltEvent, source?: SourceEvidence | null): string {
  return [
    e.actor1,
    e.actor2,
    e.location,
    e.country,
    e.continent,
    e.theme,
    e.quadLabel,
    source?.title,
    source?.domain,
  ].filter(Boolean).join(" ").toUpperCase();
}

function hasAnyKeyword(text: string, keywords: string[]): boolean {
  return keywords.some((keyword) => text.includes(keyword));
}

function directionFromEvent(e: GdeltEvent): ImpactVector["direction"] {
  if (e.goldstein !== null) {
    if (e.goldstein <= -2) return "negative";
    if (e.goldstein >= 2) return "positive";
  }
  return "mixed";
}

function buildEntities(target: GdeltEvent, relatedSignals: RelatedSignal[], source: SourceEvidence | null): ProbeEntity[] {
  const entities = new Map<string, ProbeEntity>();

  const add = (name: string | undefined, type: ProbeEntity["type"], salience: number, evidence: string) => {
    const clean = (name ?? "").trim();
    if (!clean || clean === "Unknown") return;
    const key = `${type}:${clean.toUpperCase()}`;
    const existing = entities.get(key);
    if (existing) {
      existing.salience += salience;
      if (!existing.evidence.includes(evidence)) existing.evidence.push(evidence);
      return;
    }
    entities.set(key, { name: clean, type, salience, evidence: [evidence] });
  };

  add(target.actor1, "actor", 55, "selected event actor1");
  add(target.actor2, "actor", 45, "selected event actor2");
  add(target.location || target.country, "place", 35, "selected event location");
  add(target.theme, "theme", 25, "selected event theme");
  add(source?.domain, "publisher", 20, "source publisher");

  for (const signal of relatedSignals.slice(0, 8)) {
    const weight = Math.round((signal.probability ?? relationProbability(signal.score)) * 30);
    add(signal.event.actor1, "actor", weight, `related event ${signal.event.id}`);
    add(signal.event.actor2, "actor", Math.max(8, weight - 5), `related event ${signal.event.id}`);
    add(signal.event.location || signal.event.country, "place", Math.max(6, weight - 10), `related event ${signal.event.id}`);
  }

  return [...entities.values()]
    .map((entity) => ({ ...entity, salience: Math.round(clamp(entity.salience, 0, 100)) }))
    .sort((a, b) => b.salience - a.salience)
    .slice(0, 12);
}

function buildImpactMap(target: GdeltEvent, relatedSignals: RelatedSignal[], source: SourceEvidence | null): ImpactVector[] {
  const text = eventText(target, source);
  const absGoldstein = Math.abs(target.goldstein ?? 0);
  const mentionBoost = Math.min(18, Math.log10((target.numMentions ?? 0) + 1) * 8);
  const relatedBoost = Math.min(16, relatedSignals.length * 2.2);
  const conflictBoost = target.category === "doom" ? 16 : -6;
  const direction = directionFromEvent(target);
  const financeRelevant = target.theme === "Econ" || hasAnyKeyword(text, FINANCE_KEYWORDS);
  const supplyRelevant = hasAnyKeyword(text, SUPPLY_CHAIN_KEYWORDS);

  const base = absGoldstein * 6 + mentionBoost + relatedBoost;
  const local = clamp(base + conflictBoost + (target.severity === "critical" ? 16 : 0), 0, 100);
  const humanitarian = clamp(base * 0.8 + (target.theme === "Humanitarian" ? 22 : 0) + (target.category === "doom" ? 14 : -4), 0, 100);
  const policy = clamp(base * 0.75 + (["Diplomacy", "Conflict", "Econ"].includes(target.theme ?? "") ? 18 : 4), 0, 100);
  const finance = clamp((financeRelevant ? 45 : 12) + mentionBoost + (target.category === "doom" ? 10 : 0) + relatedBoost * 0.5, 0, 100);
  const supplyChain = clamp((supplyRelevant ? 48 : 10) + mentionBoost + (target.category === "doom" ? 9 : 0), 0, 100);
  const social = clamp(base * 0.65 + (target.avgTone !== null && target.avgTone < -5 ? 18 : 5), 0, 100);
  const confidence = clamp(0.35 + relatedSignals.length * 0.035 + (source?.fetched ? 0.22 : 0) + Math.min(0.18, (target.numMentions ?? 0) / 300), 0.25, 0.88);

  return [
    {
      key: "local",
      label: "Local safety",
      score: Math.round(local),
      direction,
      confidence,
      rationale: "Driven by event severity, location specificity, media mentions, and nearby linked incidents.",
    },
    {
      key: "humanitarian",
      label: "Humanitarian stress",
      score: Math.round(humanitarian),
      direction: target.category === "doom" ? "negative" : "mixed",
      confidence: clamp(confidence - 0.04, 0.2, 0.85),
      rationale: "Higher when the event is hostile, severe, or connected to aid, civilian, refugee, disaster, or rights themes.",
    },
    {
      key: "policy",
      label: "Policy and diplomacy",
      score: Math.round(policy),
      direction,
      confidence: clamp(confidence + 0.03, 0.2, 0.9),
      rationale: "Uses actor type, CAMEO class, country, and same-theme signals to estimate official response pressure.",
    },
    {
      key: "finance",
      label: "Finance and markets",
      score: Math.round(finance),
      direction: financeRelevant ? direction : "mixed",
      confidence: financeRelevant ? clamp(confidence - 0.03, 0.2, 0.82) : 0.28,
      rationale: financeRelevant
        ? "Finance keywords or economic theme appear in the evidence pack."
        : "No direct market evidence in this pack; treat as a low-confidence spillover estimate.",
    },
    {
      key: "supplyChain",
      label: "Supply chain",
      score: Math.round(supplyChain),
      direction: supplyRelevant ? direction : "mixed",
      confidence: supplyRelevant ? clamp(confidence - 0.03, 0.2, 0.82) : 0.25,
      rationale: supplyRelevant
        ? "Supply-chain terms or strategic infrastructure appear in actors, location, theme, or source title."
        : "No direct supply-chain evidence in this pack.",
    },
    {
      key: "social",
      label: "Social narrative",
      score: Math.round(social),
      direction: target.avgTone !== null && target.avgTone < -2 ? "negative" : "mixed",
      confidence: clamp(confidence + 0.02, 0.2, 0.88),
      rationale: "Uses media tone, mentions, conflict class, and related-event density as a proxy for narrative intensity.",
    },
  ];
}

function buildHypotheses(target: GdeltEvent, relatedSignals: RelatedSignal[], source: SourceEvidence | null): HypothesisSeed[] {
  const sharedActorCount = relatedSignals.filter((signal) => signal.channels?.includes("actor")).length;
  const sameSourceCount = relatedSignals.filter((signal) => signal.channels?.includes("source")).length;
  const geoCount = relatedSignals.filter((signal) => signal.channels?.includes("geography")).length;
  const highConfidenceLinks = relatedSignals.filter((signal) => (signal.probability ?? 0) >= 0.7).length;
  const hasSource = Boolean(source?.fetched);
  const title = source?.title ? `Source title: ${source.title}` : "No article text extracted.";
  const baseConfidence = clamp(0.22 + sharedActorCount * 0.05 + geoCount * 0.035 + sameSourceCount * 0.045 + (hasSource ? 0.16 : 0), 0.2, 0.78);

  if (target.category === "doom") {
    return [
      {
        title: "Coercive pressure or retaliation",
        mechanism: "An actor uses force, threat, legal pressure, or disruption to change the opponent's behavior.",
        confidence: clamp(baseConfidence + (target.quadClass === 4 ? 0.08 : 0), 0.2, 0.84),
        evidenceFor: [
          `${target.quadLabel} with Goldstein ${fmtNum(target.goldstein)}.`,
          `${sharedActorCount} related signals share actor/entity channels.`,
          title,
        ],
        evidenceAgainst: [
          highConfidenceLinks < 2 ? "Few high-probability linked events; the pattern may be isolated." : "Linked-event pattern is present, but causality is still inferred.",
          !hasSource ? "No readable source text was available to verify motive." : "Source text may still represent one publisher's framing.",
        ],
      },
      {
        title: "Domestic or audience signaling",
        mechanism: "Leaders or institutions act visibly to satisfy domestic supporters, deter critics, or project control.",
        confidence: clamp(baseConfidence - 0.02 + Math.min(0.1, (target.numMentions ?? 0) / 500), 0.18, 0.78),
        evidenceFor: [
          `${target.numMentions ?? 0} media mentions make public signaling plausible.`,
          "Conflict events often create incentives to show resolve.",
        ],
        evidenceAgainst: [
          "GDELT actor labels do not reveal internal political incentives by themselves.",
          "Need official statements, polling, or local reporting to raise confidence.",
        ],
      },
      {
        title: "Escalation spillover from a connected cluster",
        mechanism: "A nearby or same-actor event changes expectations, prompting follow-on moves by governments, armed groups, markets, or communities.",
        confidence: clamp(0.18 + highConfidenceLinks * 0.07 + geoCount * 0.04, 0.15, 0.8),
        evidenceFor: [
          `${relatedSignals.length} related signals found in the local event graph.`,
          `${geoCount} related signals share geography channels.`,
        ],
        evidenceAgainst: [
          relatedSignals.length === 0 ? "No linked signals found." : "Related signals can be co-reported without being causal.",
          "Need a timeline with independent sources to prove sequence.",
        ],
      },
    ];
  }

  return [
    {
      title: "Bargaining or de-escalation move",
      mechanism: "Actors use cooperation, talks, aid, or concessions to lower risk or gain leverage without direct confrontation.",
      confidence: clamp(baseConfidence + (target.quadClass === 1 || target.quadClass === 2 ? 0.08 : 0), 0.2, 0.84),
      evidenceFor: [
        `${target.quadLabel} with Goldstein ${fmtNum(target.goldstein)}.`,
        `${sharedActorCount} linked actor/entity signals.`,
        title,
      ],
      evidenceAgainst: [
        "Cooperative language can be symbolic if no material follow-through appears.",
        "Need later events to confirm implementation.",
      ],
    },
    {
      title: "Economic or reputational incentive",
      mechanism: "Actors cooperate because the expected payoff in trade, legitimacy, investment, aid, or reputation exceeds the cost.",
      confidence: clamp(baseConfidence - 0.03 + (target.theme === "Econ" ? 0.14 : 0), 0.16, 0.78),
      evidenceFor: [
        target.theme === "Econ" ? "Event is classified as economic." : "Cooperation events often carry reputational payoffs.",
        `${target.numMentions ?? 0} media mentions indicate public visibility.`,
      ],
      evidenceAgainst: [
        "No direct balance-sheet, trade, or market data is present unless cited in the source article.",
        "Need implementation evidence, not just announcement evidence.",
      ],
    },
  ];
}

function buildActorGame(target: GdeltEvent, relatedSignals: RelatedSignal[]): ActorGame[] {
  const actors = [target.actor1, target.actor2].filter((actor) => actor && actor !== "Unknown");
  const uniqueActors = [...new Set(actors)].slice(0, 2);
  const conflict = target.category === "doom";
  const linkedActorEvents = (actor: string) =>
    relatedSignals.filter((signal) => eventActors(signal.event).toUpperCase().includes(actor.toUpperCase())).length;

  return uniqueActors.map((actor, idx) => {
    const count = linkedActorEvents(actor);
    return {
      actor,
      incentives: conflict
        ? [
          idx === 0 ? "Increase leverage over the opposing side." : "Reduce exposure while avoiding visible weakness.",
          "Shape the public narrative before rivals do.",
          count > 0 ? `Respond to a cluster of ${count} linked actor events.` : "Prevent the event from being interpreted as isolated weakness.",
        ]
        : [
          "Capture diplomatic, economic, or reputational upside.",
          "Keep optionality while signaling cooperation.",
          count > 0 ? `Use the linked event pattern to reinforce credibility.` : "Turn a single event into a broader trust signal.",
        ],
      constraints: [
        "Public statements can lock the actor into a position.",
        "Overreaction can create second-order costs.",
        "Incomplete information makes opponent intent hard to read.",
      ],
      likelyMoves: conflict
        ? ["Issue justification or denial.", "Increase security posture.", "Test whether the opponent escalates or backs down."]
        : ["Announce follow-up talks or implementation steps.", "Seek third-party validation.", "Frame the event as momentum."],
      decisionTraps: conflict
        ? ["Loss aversion", "retaliation spiral", "audience-cost pressure"]
        : ["Symbolic agreement without execution", "overconfidence", "misreading weak signals as commitment"],
    };
  });
}

function buildWatchlist(target: GdeltEvent, impactMap: ImpactVector[], relatedSignals: RelatedSignal[]): string[] {
  const strongestImpact = [...impactMap].sort((a, b) => b.score - a.score)[0];
  const highProbLinks = relatedSignals.filter((signal) => (signal.probability ?? 0) >= 0.7).length;
  const watchlist = [
    `New same-actor events involving ${eventActors(target)} within 24-72 hours.`,
    `A shift in Goldstein score or average tone for ${target.location || target.country}.`,
    "Official statements that confirm motive, denial, retaliation, or implementation.",
    "Independent local reporting that confirms casualties, arrests, disruption, or material follow-through.",
  ];

  if (strongestImpact) {
    watchlist.push(`The highest current impact vector is ${strongestImpact.label}; monitor evidence that raises or lowers that path.`);
  }
  if (highProbLinks > 0) {
    watchlist.push(`${highProbLinks} high-probability linked events; watch whether the cluster grows or fades.`);
  }
  if (impactMap.some((impact) => impact.key === "finance" && impact.score >= 45)) {
    watchlist.push("Market-sensitive follow-through: sanctions, trade restrictions, energy prices, company exposure, shipping, insurance, or currency stress.");
  }
  if (impactMap.some((impact) => impact.key === "supplyChain" && impact.score >= 45)) {
    watchlist.push("Operational follow-through: ports, routes, energy flows, border crossings, logistics, or strategic inputs.");
  }

  return watchlist.slice(0, 8);
}

function buildEvidenceGrade(target: GdeltEvent, source: SourceEvidence | null, relatedSignals: RelatedSignal[]): ProbePack["evidenceGrade"] {
  let confidence = 0.25;
  const reasons: string[] = [];

  if (source?.fetched) {
    confidence += 0.25;
    reasons.push("Readable source article extracted.");
  } else if (source) {
    reasons.push(source.status);
  } else {
    reasons.push("No source URL available.");
  }

  if ((target.numMentions ?? 0) >= 20) {
    confidence += 0.12;
    reasons.push(`${target.numMentions} media mentions.`);
  } else {
    reasons.push("Low media-mention count.");
  }

  const highProbLinks = relatedSignals.filter((signal) => (signal.probability ?? 0) >= 0.7).length;
  if (highProbLinks >= 3) {
    confidence += 0.18;
    reasons.push(`${highProbLinks} high-probability linked signals.`);
  } else if (relatedSignals.length > 0) {
    confidence += 0.08;
    reasons.push(`${relatedSignals.length} related signals, but few are high-confidence.`);
  } else {
    reasons.push("No strong linked-event pattern.");
  }

  confidence = clamp(confidence, 0.1, 0.9);
  const label = confidence >= 0.68 ? "strong" : confidence >= 0.42 ? "partial" : "thin";
  return { label, confidence, reasons };
}

function buildUncertaintyWarnings(source: SourceEvidence | null, relatedSignals: RelatedSignal[], impactMap: ImpactVector[]): string[] {
  const warnings = [
    "GDELT rows are media-derived signals, not verified ground truth.",
    "Related-event probability means pattern similarity, not proven causation.",
  ];

  if (!source?.fetched) {
    warnings.push("The source article could not be read, so motive and context confidence are lower.");
  }
  if (relatedSignals.length < 3) {
    warnings.push("The linked-event graph is sparse; avoid overfitting one event.");
  }
  if (impactMap.some((impact) => impact.key === "finance" && impact.confidence < 0.35 && impact.score > 30)) {
    warnings.push("Finance impact is mostly inferred; no direct market evidence appears in this pack.");
  }

  return warnings;
}

async function buildProbePack(inputEvent: GdeltEvent, fetchSource = true): Promise<ProbePack> {
  const dataset = await loadEventDataset().catch(() => ({ events: [] as GdeltEvent[], updated: undefined as string | undefined }));
  const datasetEvent = dataset.events.find((candidate) => candidate.id === inputEvent.id);
  const selectedEvent = datasetEvent ? { ...datasetEvent, ...inputEvent } : inputEvent;
  const corpus = dataset.events.length > 0 ? dataset.events : [selectedEvent];
  const source = fetchSource ? await fetchSourceEvidence(selectedEvent.sourceUrl) : null;
  const relatedSignals = findRelatedSignals(selectedEvent, corpus).map(withSignalProbability);
  const impactMap = buildImpactMap(selectedEvent, relatedSignals, source);
  const prediction = await predictEscalation(selectedEvent, corpus);

  return {
    selectedEvent,
    datasetUpdated: dataset.updated,
    source,
    relatedSignals,
    prediction,
    entities: buildEntities(selectedEvent, relatedSignals, source),
    impactMap,
    hypotheses: buildHypotheses(selectedEvent, relatedSignals, source),
    actorGame: buildActorGame(selectedEvent, relatedSignals),
    watchlist: buildWatchlist(selectedEvent, impactMap, relatedSignals),
    evidenceGrade: buildEvidenceGrade(selectedEvent, source, relatedSignals),
    uncertaintyWarnings: buildUncertaintyWarnings(source, relatedSignals, impactMap),
  };
}

function publicProbePack(pack: ProbePack) {
  return {
    ...pack,
    source: pack.source ? {
      url: pack.source.url,
      domain: pack.source.domain,
      fetched: pack.source.fetched,
      status: pack.source.status,
      title: pack.source.title,
    } : null,
    relatedSignals: pack.relatedSignals.slice(0, 8).map((signal) => ({
      event: signal.event,
      score: Math.round(signal.score),
      probability: Number(((signal.probability ?? relationProbability(signal.score)) * 100).toFixed(0)),
      channels: signal.channels ?? relationChannels(signal.reasons),
      reasons: signal.reasons,
    })),
    prediction: pack.prediction ? {
      ...pack.prediction,
      probability: Number((pack.prediction.probability * 100).toFixed(0)),
      threshold: Number((pack.prediction.threshold * 100).toFixed(0)),
      metrics: pack.prediction.metrics,
    } : undefined,
    impactMap: pack.impactMap.map((impact) => ({
      ...impact,
      confidence: Number((impact.confidence * 100).toFixed(0)),
    })),
    hypotheses: pack.hypotheses.map((hypothesis) => ({
      ...hypothesis,
      confidence: Number((hypothesis.confidence * 100).toFixed(0)),
    })),
    evidenceGrade: {
      ...pack.evidenceGrade,
      confidence: Number((pack.evidenceGrade.confidence * 100).toFixed(0)),
    },
  };
}

function formatProbeForPrompt(pack: ProbePack): string {
  const related = pack.relatedSignals.length > 0
    ? pack.relatedSignals.map((signal, idx) => {
      const r = signal.event;
      return [
        `${idx + 1}. p_link=${Math.round((signal.probability ?? 0) * 100)}% | ${r.date} | ${r.theme ?? "Unknown"} | ${r.quadLabel}`,
        `Actors: ${eventActors(r)}`,
        `Location: ${r.location || r.country}`,
        `Goldstein: ${fmtNum(r.goldstein)} | Tone: ${fmtNum(r.avgTone, 2)} | Mentions: ${r.numMentions ?? 0}`,
        `Channels: ${(signal.channels ?? []).join(", ") || "n/a"}`,
        `Why linked: ${signal.reasons.join("; ")}`,
        r.sourceUrl ? `Source: ${r.sourceUrl}` : "",
      ].filter(Boolean).join(" | ");
    }).join("\n")
    : "No strong related events found in the local GDELT corpus.";

  const sourceBlock = pack.source
    ? [
      `URL: ${pack.source.url}`,
      `Domain: ${pack.source.domain || "n/a"}`,
      `Status: ${pack.source.status}`,
      pack.source.title ? `Title: ${pack.source.title}` : "",
      pack.source.excerpt ? `Article excerpt:\n${pack.source.excerpt}` : "",
    ].filter(Boolean).join("\n")
    : "No source URL was available for this event.";

  const impact = pack.impactMap.map((item) =>
    `- ${item.label}: score ${item.score}/100, direction ${item.direction}, confidence ${Math.round(item.confidence * 100)}%. ${item.rationale}`
  ).join("\n");

  const hypotheses = pack.hypotheses.map((h) =>
    `- ${h.title} (${Math.round(h.confidence * 100)}%): ${h.mechanism}\n  For: ${h.evidenceFor.join(" | ")}\n  Against/missing: ${h.evidenceAgainst.join(" | ")}`
  ).join("\n");

  const game = pack.actorGame.map((g) =>
    `- ${g.actor}\n  Incentives: ${g.incentives.join(" | ")}\n  Constraints: ${g.constraints.join(" | ")}\n  Likely moves: ${g.likelyMoves.join(" | ")}\n  Decision traps: ${g.decisionTraps.join(" | ")}`
  ).join("\n");

  return [
    `SELECTED EVENT\n${formatEventForPrompt(pack.selectedEvent)}`,
    pack.prediction
      ? `TRAINED MODEL PREDICTION\nFuture critical escalation risk: ${Math.round(pack.prediction.probability * 100)}% (${pack.prediction.label}). Threshold: ${Math.round(pack.prediction.threshold * 100)}%. Model: ${pack.prediction.modelVersion}. Held-out metrics: ${JSON.stringify(pack.prediction.metrics ?? {})}. Top drivers: ${pack.prediction.drivers.map((d) => `${d.feature} ${d.direction} risk (${d.contribution})`).join(" | ")}`
      : "TRAINED MODEL PREDICTION\nNo trained model artifact found.",
    `SOURCE ARTICLE EVIDENCE\n${sourceBlock}`,
    `EVIDENCE GRADE\n${pack.evidenceGrade.label} (${Math.round(pack.evidenceGrade.confidence * 100)}%): ${pack.evidenceGrade.reasons.join(" | ")}`,
    `ENTITIES\n${pack.entities.map((e) => `- ${e.name} (${e.type}, salience ${e.salience}): ${e.evidence.join(" | ")}`).join("\n")}`,
    `RELATED GDELT SIGNALS\n${related}`,
    `DETERMINISTIC IMPACT MAP\n${impact}`,
    `HYPOTHESIS SEEDS\n${hypotheses}`,
    `ACTOR GAME MODEL\n${game || "No named actors available."}`,
    `WATCHLIST\n${pack.watchlist.map((item) => `- ${item}`).join("\n")}`,
    `UNCERTAINTY WARNINGS\n${pack.uncertaintyWarnings.map((item) => `- ${item}`).join("\n")}`,
    `DATASET UPDATED\n${pack.datasetUpdated ?? "unknown"}`,
  ].join("\n\n");
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
const ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-6";

app.get("/api/ai-status", (c) => {
  return c.json({ ready: Boolean(ENV_API_KEY) });
});

app.get("/api/events", async (c) => {
  const days = Math.max(1, Math.min(30, parseInt(c.req.query("days") ?? "7", 10)));

  try {
    const dataset = await loadEventDataset();
    let events = dataset.events;

    // Filter events by day cutoff if requested < 7 days
    if (days < 7) {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - days);
      const cutoffStr = cutoff.toISOString().split("T")[0]; // YYYY-MM-DD
      events = events.filter((e: any) => e.date >= cutoffStr);
    }

    c.header("X-Cache", "STATIC");
    return c.json({ events, count: events.length, updated: dataset.updated });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("API -> Failed to read events.json:", msg);
    return c.json({ error: "Failed to load pre-enriched event dataset", events: [], count: 0 }, 500);
  }
});

app.get("/api/probe", async (c) => {
  const id = c.req.query("id")?.trim();
  if (!id) {
    return c.json({ error: "Missing event id" }, 400);
  }

  try {
    const dataset = await loadEventDataset();
    const event = dataset.events.find((candidate) => candidate.id === id);
    if (!event) {
      return c.json({ error: "Event not found" }, 404);
    }

    const pack = await buildProbePack(event, true);
    return c.json({ probe: publicProbePack(pack) });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("API -> Failed to build probe:", msg);
    return c.json({ error: `Failed to build intelligence probe: ${msg}` }, 500);
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
    `You are a causal intelligence analyst. Treat GDELT rows and news articles as noisy ` +
    `evidence, not guaranteed ground truth. Use Bayesian reasoning: separate prior belief, ` +
    `new evidence, alternative hypotheses, and confidence. Use game theory: actors, ` +
    `incentives, constraints, likely moves, and second-order reactions. Also analyze human ` +
    `decision psychology: fear, retaliation, status, bargaining leverage, loss aversion, ` +
    `domestic audience pressure, and information gaps. Be direct, evidence-bound, and ` +
    `honest about uncertainty. If evidence is weak, say so. Never invent facts, market ` +
    `moves, casualties, or causal links that are not supported by the evidence pack.`;

  let userPrompt: string;
  let probePack: ProbePack | null = null;

  if (mode === "detail" && events.length === 1) {
    probePack = await buildProbePack(events[0], true);

    userPrompt =
      `Build a research-level intelligence probe for this selected event.\n\n` +
      `IMPORTANT LIMITS:\n` +
      `- GDELT is media-derived and noisy. The article source may also be biased or incomplete.\n` +
      `- Your confidence numbers are analytic probabilities, not guarantees.\n` +
      `- If finance, market, or local-impact evidence is missing, say "no direct evidence in this pack" and infer carefully.\n\n` +
      `INTELLIGENCE PACK\n${formatProbeForPrompt(probePack)}\n\n` +
      `Output in concise Markdown with exactly these sections:\n` +
      `## Bottom line\n` +
      `One clear paragraph: what likely happened, why it matters, and your confidence.\n\n` +
      `## Evidence used\n` +
      `Bullets for source article, GDELT metadata, and related signals. State data quality problems.\n\n` +
      `## Cause hypotheses\n` +
      `Give 2-4 competing hypotheses. For each: mechanism, evidence for, evidence against/missing, confidence percent.\n\n` +
      `## Actor psychology and game theory\n` +
      `Explain incentives, fears, leverage, audience costs, bargaining position, and likely decision traps.\n\n` +
      `## What happens next\n` +
      `Forecast 24-72 hours, 1-2 weeks, and 1-3 months. Include probability ranges and triggers that would change the forecast.\n\n` +
      `## Impact map\n` +
      `Separate local safety/humanitarian, policy/diplomacy, finance/markets/supply chains, social psychology/media narrative.\n\n` +
      `## Linked events\n` +
      `Explain how the related GDELT events may connect. Do not force a connection if the relationship is weak.\n\n` +
      `## Watchlist\n` +
      `Give concrete signals to monitor next.`;
  } else {
    const top = events.slice(0, 50);
    const lines = top.map(
      (e) =>
        `[${e.date}] ${e.category.toUpperCase()} | ${e.quadLabel} | ` +
        `${e.actor1} -> ${e.actor2} | ${e.location} | ` +
        `Goldstein: ${e.goldstein?.toFixed(1) ?? "n/a"} | Mentions: ${e.numMentions}`
    );
    userPrompt =
      `Analyze the following ${top.length} events (from ${events.length} total) from the ` +
      `GDELT Project and deliver a concise causal intelligence briefing. Identify key ` +
      `patterns, escalation clusters, cooperation clusters, incentives, and likely next moves. ` +
      `Separate evidence from inference and include confidence where useful.\n\n` +
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
        model: ANTHROPIC_MODEL,
        max_tokens: mode === "detail" ? 2_200 : 1_200,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: userPrompt }],
      }),
      signal: AbortSignal.timeout(24_000),
    });

    if (!res.ok) {
      const msg = await res.text().catch(() => res.statusText);
      return c.json({ error: `Anthropic API error (${res.status}): ${msg}` }, 502);
    }

    const data = (await res.json()) as {
      content?: Array<{ type: string; text: string }>;
    };
    const analysis = data.content?.find((b) => b.type === "text")?.text ?? "";
    return c.json({
      analysis,
      evidence: probePack ? publicProbePack(probePack) : undefined,
    });
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

    const hasBody = req.method && !["GET", "HEAD"].includes(req.method);
    const requestInit: RequestInit & { duplex?: "half" } = {
      method: req.method || "GET",
      headers,
      body: hasBody ? req : undefined,
      duplex: hasBody ? "half" : undefined,
    };

    const webReq = new Request(url.toString(), requestInit);

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
