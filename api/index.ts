import { Hono } from "hono";
import Anthropic from "@anthropic-ai/sdk";
import { inflateRawSync } from "zlib";
import { dirname, join } from "path";
import { promises as fs } from "fs";
import { fileURLToPath } from "url";

export const config = { maxDuration: 30 };

// ── Types ─────────────────────────────────────────────────────────────────────

type SurfaceBand = "lead" | "watch" | "background";
type EventClusterRole = "representative" | "member";
type UncertaintyLevel = "low" | "medium" | "high";
type ReviewQueueMode = "priority" | "uncertain" | "coverage";

interface SurfaceExplanation {
  score: number;
  band: SurfaceBand;
  label: string;
  summary: string;
  boosts: string[];
  penalties: string[];
  caveats: string[];
}

interface EventUncertainty {
  level: UncertaintyLevel;
  score: number;
  warnings: string[];
  confidenceDrivers: string[];
}

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
  surfaceScore?: number;
  surfaceRank?: number;
  surfaceBand?: string;
  surfaceReasons?: string[];
  surfaceClusterKey?: string;
  surfaceClusterSize?: number;
  surfaceModelProbability?: number;
  surfaceRadius?: number;
  duplicateOf?: string | null;
  surfaceExplanation?: SurfaceExplanation;
  uncertainty?: EventUncertainty;
  eventClusterId?: string;
  eventClusterSize?: number;
  eventClusterRole?: EventClusterRole;
  eventClusterReasons?: string[];
  activeLearningScore?: number;
  activeLearningReasons?: string[];
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

interface ReviewCopilot {
  bottomLine: string;
  whySurfaced: string[];
  whatToVerify: string[];
  uncertainty: string[];
  suggestedDecision: {
    decision: "assign" | "watch" | "dismiss";
    label: "Assign" | "Watch" | "Dismiss";
    confidence: number;
    rationale: string;
  };
  watchNext: string[];
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
  reviewCopilot: ReviewCopilot;
  evidenceGrade: {
    label: "thin" | "partial" | "strong";
    confidence: number;
    reasons: string[];
  };
  uncertaintyWarnings: string[];
}

interface RiskWindowRecord {
  recordId: string;
  window: {
    countryKey: string;
    country: string;
    region: string;
    month: string;
    predictionMadeAt: string;
    split: string;
  };
  features: Record<string, number | null | undefined>;
  labels: {
    currentMonthHasOrganizedViolence: boolean;
    currentMonthEvents: number;
    currentMonthDeathsBest: number;
    sourceChecked?: boolean;
    labelSource?: string;
  };
}

interface DeterministicRiskModel {
  kind: "deterministic_score";
  weights: {
    recency: number;
    recentDeaths: number;
    history: number;
    momentum: number;
    acledTrend: number;
    spillover: number;
    actorMemory: number;
    quietMax: number;
    quietDivisor: number;
  };
}

interface Phase1Label {
  eventId: string;
  labelSource?: string;
  humanReviewed?: boolean;
  reviewContext?: Record<string, unknown>;
  labels?: {
    important?: boolean;
    categoryCorrect?: boolean;
    severityCorrect?: boolean;
    summaryQuality?: number | null;
  };
}

interface ReviewQueueRow {
  event: GdeltEvent;
  rank: number;
  queueScore: number;
  mode: ReviewQueueMode;
  activeLearning: {
    score: number;
    reasons: string[];
    components: {
      priority: number;
      uncertainty: number;
      threshold: number;
      coverage: number;
    };
  };
}

// ── GDELT column indices (0-indexed, 61 columns total) ────────────────────────
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
const RELATED_SIGNAL_MIN_SCORE = 42;
const DAY_MS = 86_400_000;
const REVIEW_ASSIGN_THRESHOLD = 72;
const REVIEW_WATCH_THRESHOLD = 52;

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

const LOCAL_PUBLIC_SAFETY_TERMS = [
  "shark-attack", "shark attack", "attacked-while-fishing", "attacked while fishing",
  "dog-attack", "dog attack", "bear-attack", "bear attack", "crocodile", "alligator",
  "snakebite", "drowning", "rip-current", "rip current", "wildfire", "house-fire",
  "house fire", "dormitory-fire", "dormitory fire", "car-crash", "car crash",
  "plane-crash", "plane crash", "train-crash", "train crash", "fatal-crash",
  "fatal crash", "accident",
];

const SECURITY_SOURCE_TERMS = [
  "al qaida", "al qaeda", "al-qaida", "al-qaeda", "terror", "terrorist", "militant",
  "militia", "jihad", "hamas", "hezbollah", "isis", "islamic state", "taliban",
  "war crime", "armed group", "extremist", "radicalized", "bosnia",
];

const POLITICAL_SOURCE_TERMS = [
  "candidate", "congressional", "congress", "senate", "election", "campaign",
  "democrat", "republican", "minister", "parliament", "party", "government",
];

function sourceTextForEvent(url: string | undefined): string {
  if (!url) return "";
  try {
    const parsed = new URL(url);
    return `${parsed.hostname} ${parsed.pathname}`.toLowerCase().replace(/[-_]+/g, " ");
  } catch {
    return String(url).toLowerCase().replace(/[-_]+/g, " ");
  }
}

function hasLocalPublicSafetyPattern(event: Pick<GdeltEvent, "sourceUrl" | "actor1" | "actor2">): boolean {
  const text = `${sourceTextForEvent(event.sourceUrl)} ${event.actor1} ${event.actor2}`.toLowerCase();
  const strategic = hasStrategicActorText(event.actor1, event.actor2);
  return !strategic && LOCAL_PUBLIC_SAFETY_TERMS.some((term) => text.includes(term));
}

function classifyTheme(
  eventCode: string,
  actor1: string,
  actor2: string,
  quadClass: number | null,
  sourceUrl = ""
): NonNullable<GdeltEvent["theme"]> {
  const text = `${actor1} ${actor2}`.toUpperCase();
  const sourceText = sourceTextForEvent(sourceUrl);
  const combinedText = `${sourceText} ${text.toLowerCase()}`;

  if (LOCAL_PUBLIC_SAFETY_TERMS.some((term) => sourceText.includes(term))) return "Humanitarian";
  if (SECURITY_SOURCE_TERMS.some((term) => combinedText.includes(term))) return "Conflict";
  if (POLITICAL_SOURCE_TERMS.some((term) => combinedText.includes(term)) && quadClass !== 4) return "Diplomacy";

  const envKeywords = ["CLIMATE", "GREEN", "ENERGY", "ENVIRONMENT", "POLLUTION", "WIND", "SOLAR", "GAS", "OIL", "CARBON", "WATER"];
  if (envKeywords.some((kw) => text.includes(kw))) return "Environment";

  const techKeywords = ["UNIVERSITY", "SCIENTIST", "RESEARCH", "NASA", "TECH", "AI", "SEMICONDUCTOR", "CHIP", "SPACE", "SOFTWARE"];
  if (techKeywords.some((kw) => text.includes(kw)) && !POLITICAL_SOURCE_TERMS.some((term) => combinedText.includes(term))) return "Science";

  const humKeywords = ["REFUGEE", "HUMAN RIGHTS", "AID", "RED CROSS", "UNHCR", "DISASTER", "FLOOD", "EARTHQUAKE", "PROTESTER", "HUNGER"];
  if (eventCode.startsWith("07") || eventCode.startsWith("08") || humKeywords.some((kw) => text.includes(kw))) return "Humanitarian";

  const econKeywords = ["BANK", "TRADE", "MARKET", "ECONOMY", "IMF", "WTO", "SANCTION", "BUSINESS", "TARIFF", "FINANCE", "TREASURY"];
  if (eventCode.startsWith("06") || econKeywords.some((kw) => text.includes(kw))) return "Econ";

  const conflictCode =
    eventCode.startsWith("11") || eventCode.startsWith("12") ||
    eventCode.startsWith("13") || eventCode.startsWith("14") ||
    eventCode.startsWith("15") || eventCode.startsWith("16") ||
    eventCode.startsWith("17") || eventCode.startsWith("18") ||
    eventCode.startsWith("19") || eventCode.startsWith("20");
  if (conflictCode || quadClass === 3 || quadClass === 4) return "Conflict";

  return "Diplomacy";
}

function calculateHopeScore(
  goldstein: number | null,
  avgTone: number | null,
  theme: NonNullable<GdeltEvent["theme"]>
): number {
  let score = 50;
  if (goldstein !== null) score += goldstein * 2.5;
  if (avgTone !== null) score += avgTone * 1.5;
  if (theme === "Science") score += 12;
  if (theme === "Humanitarian") score += 8;
  if (theme === "Conflict") score -= 15;
  if ((theme === "Diplomacy" || theme === "Econ" || theme === "Environment") && (goldstein ?? 0) > 0) score += 6;
  return Math.round(clamp(score, 0, 100));
}

function hasStrategicActorText(actor1: string, actor2: string): boolean {
  const text = `${actor1} ${actor2}`.toUpperCase();
  return [
    "US", "UNITED STATES", "RUSSIA", "UKRAINE", "NATO", "IRAN", "ISRAEL",
    "GAZA", "CHINA", "TAIWAN", "PAKISTAN", "INDIA", "TURKEY", "SYRIA",
  ].some((token) => text.includes(token));
}

function liveSurfaceMetadata(event: GdeltEvent): Pick<GdeltEvent, "surfaceScore" | "surfaceBand" | "surfaceReasons" | "surfaceRadius" | "surfaceModelProbability"> {
  const reasons: string[] = [];
  const mentions = Number(event.numMentions ?? 0);
  const absGoldstein = Math.abs(Number(event.goldstein ?? 0));
  const negativeTone = Number.isFinite(event.avgTone) ? Math.max(0, -Number(event.avgTone)) : 0;
  const localPublicSafety = hasLocalPublicSafetyPattern(event);
  let score = 16;

  if (event.severity === "critical") {
    score += 28;
    reasons.push("critical severity");
  } else if (event.severity === "high") {
    score += 20;
    reasons.push("high severity");
  } else if (event.severity === "medium") {
    score += 11;
  }

  if (event.quadClass === 4) {
    score += 18;
    reasons.push("material conflict signal");
  } else if (event.quadClass === 3) {
    score += 10;
    reasons.push("verbal conflict signal");
  } else if (event.quadClass === 1 || event.quadClass === 2) {
    score += 6;
    reasons.push("cooperation signal");
  }

  score += Math.min(16, Math.log1p(mentions) * 4);
  score += Math.min(12, absGoldstein * 1.2);
  score += Math.min(8, negativeTone);

  if (hasStrategicActorText(event.actor1, event.actor2)) {
    score += 12;
    reasons.push("strategic actor or theater");
  }
  if (["Conflict", "Humanitarian", "Econ"].includes(event.theme ?? "")) score += 5;
  if (mentions <= 1) reasons.push("penalty: single-mention weak signal");
  if (event.actor1 === "Unknown" || event.actor2 === "Unknown") reasons.push("penalty: generic GDELT extraction");
  if (localPublicSafety) {
    score -= 42;
    reasons.push("penalty: local public-safety/accident pattern");
  }

  const surfaceScore = Math.round(clamp(score, 0, 100));
  return {
    surfaceScore,
    surfaceBand: surfaceBandForScore(surfaceScore),
    surfaceReasons: reasons.length ? reasons : ["GDELT/model signal only"],
    surfaceRadius: Math.max(3, Math.min(11, Math.round(surfaceScore / 10))),
    surfaceModelProbability: Number((surfaceScore / 100).toFixed(4)),
  };
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

function surfaceSortScore(event: any): number {
  return Number.isFinite(event?.surfaceScore) ? Number(event.surfaceScore) : Number(event?.markerRadius ?? 0);
}

async function resolveDataPath(relativePath: string): Promise<string> {
  const resolved = await tryResolveDataPath(relativePath);
  if (resolved) return resolved;

  return join(process.cwd(), relativePath);
}

async function tryResolveDataPath(relativePath: string): Promise<string | null> {
  const candidates = [
    join(process.cwd(), relativePath),
    join(MODULE_DIR, "..", relativePath),
  ];

  for (const path of candidates) {
    try {
      await fs.access(path);
      return path;
    } catch {
      // Try the next known runtime layout.
    }
  }

  return null;
}

async function resolveFirstDataPath(relativePaths: string[]): Promise<{ relativePath: string; path: string }> {
  for (const relativePath of relativePaths) {
    const path = await tryResolveDataPath(relativePath);
    if (path) return { relativePath, path };
  }

  throw new Error(`Missing data file. Tried: ${relativePaths.join(", ")}`);
}

async function readJsonFile<T>(relativePath: string): Promise<T> {
  const path = await resolveDataPath(relativePath);
  const text = await fs.readFile(path, "utf8");
  return JSON.parse(text) as T;
}

function featureNumber(record: RiskWindowRecord, key: string): number {
  const value = record.features?.[key];
  return Number.isFinite(value) ? Number(value) : 0;
}

function deterministicRiskScore(record: RiskWindowRecord, model: DeterministicRiskModel): number {
  const weights = model.weights;
  const monthsSinceLastEvent = record.features?.monthsSinceLastEvent;
  const quietPenalty = Number.isFinite(monthsSinceLastEvent)
    ? -Math.min(weights.quietMax, Number(monthsSinceLastEvent) / weights.quietDivisor)
    : -weights.quietMax;

  return (
    Math.log1p(featureNumber(record, "past1mEvents")) * weights.recency +
    Math.log1p(featureNumber(record, "past3mDeathsBest")) * weights.recentDeaths +
    Math.log1p(featureNumber(record, "past12mEvents")) * weights.history +
    Math.max(0, featureNumber(record, "eventMomentum3v12")) * weights.momentum +
    Math.log1p(featureNumber(record, "acledPast3mEvents")) * weights.acledTrend +
    Math.log1p(featureNumber(record, "neighborPast3mDeathsBest")) * weights.spillover +
    Math.log1p(featureNumber(record, "past3mActorTokenCount")) * weights.actorMemory +
    quietPenalty
  );
}

function riskWindowDrivers(record: RiskWindowRecord): Array<{ label: string; value: string }> {
  const f = record.features ?? {};
  return [
    { label: "Past 1m UCDP events", value: String(f.past1mEvents ?? 0) },
    { label: "Past 3m deaths", value: String(f.past3mDeathsBest ?? 0) },
    { label: "Past 12m events", value: String(f.past12mEvents ?? 0) },
    { label: "ACLED 3m events", value: String(f.acledPast3mEvents ?? 0) },
    { label: "Neighbor 3m deaths", value: String(f.neighborPast3mDeathsBest ?? 0) },
    { label: "Actor memory tokens", value: String(f.past3mActorTokenCount ?? 0) },
    { label: "Months since last event", value: f.monthsSinceLastEvent == null ? "none" : String(f.monthsSinceLastEvent) },
  ];
}

function publicRiskWindow(record: RiskWindowRecord, score: number, rank: number) {
  return {
    recordId: record.recordId,
    rank,
    riskScore: Number(score.toFixed(3)),
    country: record.window.country,
    countryKey: record.window.countryKey,
    region: record.window.region,
    month: record.window.month,
    predictionMadeAt: record.window.predictionMadeAt,
    split: record.window.split,
    actual: {
      organizedViolence: Boolean(record.labels?.currentMonthHasOrganizedViolence),
      events: Number(record.labels?.currentMonthEvents ?? 0),
      deathsBest: Number(record.labels?.currentMonthDeathsBest ?? 0),
      sourceChecked: Boolean(record.labels?.sourceChecked),
      labelSource: record.labels?.labelSource ?? "unknown",
    },
    drivers: riskWindowDrivers(record),
    features: {
      past1mEvents: featureNumber(record, "past1mEvents"),
      past3mDeathsBest: featureNumber(record, "past3mDeathsBest"),
      past12mEvents: featureNumber(record, "past12mEvents"),
      eventMomentum3v12: featureNumber(record, "eventMomentum3v12"),
      acledPast3mEvents: featureNumber(record, "acledPast3mEvents"),
      neighborPast3mDeathsBest: featureNumber(record, "neighborPast3mDeathsBest"),
      past3mActorTokenCount: featureNumber(record, "past3mActorTokenCount"),
      monthsSinceLastEvent: record.features?.monthsSinceLastEvent ?? null,
    },
  };
}

async function loadRiskChampion() {
  const champion = await readJsonFile<any>("data/models/risk_window_champion.json");
  const modelPath = typeof champion.modelPath === "string"
    ? champion.modelPath
    : "data/models/risk_window_challenger_best.json";
  const reportPath = typeof champion.reportPath === "string"
    ? champion.reportPath
    : "data/eval/risk_window_challenger_best_report.json";

  const [model, latestResearch] = await Promise.all([
    readJsonFile<DeterministicRiskModel>(modelPath),
    readJsonFile<any>(reportPath).catch(() => null),
  ]);

  return { champion, model, latestResearch };
}

function parseEventDateMs(date: unknown): number | null {
  if (typeof date !== "string") return null;
  const match = date.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const ms = Date.UTC(year, month - 1, day);
  if (!Number.isFinite(ms)) return null;

  return new Date(ms).toISOString().slice(0, 10) === date ? ms : null;
}

function filterEventsByDatasetWindow(events: GdeltEvent[], days: number): GdeltEvent[] {
  const datedEvents = events
    .map((event) => ({ event, ms: parseEventDateMs(event.date) }))
    .filter((row): row is { event: GdeltEvent; ms: number } => row.ms !== null);

  if (datedEvents.length === 0) return events;

  const latestMs = Math.max(...datedEvents.map((row) => row.ms));
  const cutoffMs = latestMs - Math.max(0, days - 1) * DAY_MS;
  return datedEvents
    .filter((row) => row.ms >= cutoffMs && row.ms <= latestMs)
    .map((row) => row.event);
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

function readJsonl<T>(text: string): T[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line) as T);
}

async function loadPhase1Labels(): Promise<Phase1Label[]> {
  try {
    const path = await resolveDataPath("data/eval/phase1_labels.jsonl");
    return readJsonl<Phase1Label>(await fs.readFile(path, "utf8"));
  } catch {
    return [];
  }
}

function isSourceCheckedHumanLabel(label: Phase1Label | undefined): boolean {
  return label?.labelSource === "human" &&
    label.humanReviewed === true &&
    label.reviewContext?.sourceChecked === true;
}

function surfaceBandForScore(score: number): SurfaceBand {
  if (score >= REVIEW_ASSIGN_THRESHOLD) return "lead";
  if (score >= REVIEW_WATCH_THRESHOLD) return "watch";
  return "background";
}

function surfaceBandLabel(band: SurfaceBand): string {
  if (band === "lead") return "Likely high-importance lead";
  if (band === "watch") return "Worth monitoring";
  return "Background or weak signal";
}

function normalizedSurfaceBand(event: GdeltEvent): SurfaceBand {
  if (event.surfaceBand === "lead" || event.surfaceBand === "watch" || event.surfaceBand === "background") {
    return event.surfaceBand;
  }
  return surfaceBandForScore(surfaceSortScore(event));
}

function cleanSurfaceReason(reason: string): string {
  return reason.startsWith("penalty: ") ? reason.slice("penalty: ".length) : reason;
}

function fallbackSurfaceExplanation(event: GdeltEvent): SurfaceExplanation {
  const score = Math.round(clamp(surfaceSortScore(event), 0, 100));
  const band = normalizedSurfaceBand(event);
  const boosts = (event.surfaceReasons ?? [])
    .filter((reason) => !reason.startsWith("penalty: "))
    .map(cleanSurfaceReason);
  const penalties = (event.surfaceReasons ?? [])
    .filter((reason) => reason.startsWith("penalty: "))
    .map(cleanSurfaceReason);
  const caveats = [
    !event.sourceUrl ? "No source URL attached." : null,
    event.duplicateOf ? `Duplicate source row; representative is ${event.duplicateOf}.` : null,
    Number(event.numMentions ?? 0) <= 1 ? "Single-mention row; corroboration is weak." : null,
    event.actor1 === "Unknown" || event.actor2 === "Unknown" ? "Actor extraction is missing or generic." : null,
    ...penalties
      .filter((penalty) => /source-mismatch|background|local crime|public-safety|accident|entertainment|history|opinion/i.test(penalty))
      .map((penalty) => `Caveat: ${penalty}.`),
  ].filter((item): item is string => Boolean(item));

  return {
    score,
    band,
    label: surfaceBandLabel(band),
    summary: `${surfaceBandLabel(band)} at ${score}/100; ${boosts[0] ?? "ranked by model and row metadata"}.`,
    boosts: boosts.slice(0, 6),
    penalties: penalties.slice(0, 6),
    caveats: [...new Set(caveats)].slice(0, 6),
  };
}

function fallbackEventUncertainty(event: GdeltEvent): EventUncertainty {
  let score = 18;
  const warnings: string[] = [];
  const confidenceDrivers: string[] = [];
  const priority = surfaceSortScore(event);
  const thresholdDistance = Math.min(Math.abs(priority - REVIEW_ASSIGN_THRESHOLD), Math.abs(priority - REVIEW_WATCH_THRESHOLD));
  const reasons = (event.surfaceReasons ?? []).join(" ").toLowerCase();

  if (event.sourceUrl) confidenceDrivers.push("Source URL is present.");
  else {
    score += 24;
    warnings.push("No source URL attached.");
  }

  if (Number(event.numMentions ?? 0) <= 1) {
    score += 18;
    warnings.push("Single-mention signal; find another source before trusting it.");
  } else if (Number(event.numMentions ?? 0) >= 20) {
    score -= 6;
    confidenceDrivers.push(`${event.numMentions} media mentions.`);
  }

  if (event.duplicateOf) {
    score += 20;
    warnings.push(`Duplicate source row; review representative ${event.duplicateOf}.`);
  }
  if (event.eventClusterRole === "member") {
    score += 12;
    warnings.push("Likely same-incident cluster member; review cluster representative first.");
  } else if (Number(event.eventClusterSize ?? 0) > 1) {
    score -= 5;
    confidenceDrivers.push(`${event.eventClusterSize} likely incident-cluster rows.`);
  }
  if (event.actor1 === "Unknown" || event.actor2 === "Unknown") {
    score += 13;
    warnings.push("Actor extraction is missing or generic.");
  }
  if (/source-mismatch|background|local crime|public-safety|accident|entertainment|history|opinion/.test(reasons)) {
    score += 17;
    warnings.push("Surfacing policy found source-quality or row-quality caveats.");
  }
  if (thresholdDistance <= 5) {
    score += 14;
    warnings.push("Priority is close to an Assign/Watch/Dismiss threshold.");
  } else {
    confidenceDrivers.push("Priority is not close to a review threshold.");
  }

  score = Math.round(clamp(score, 0, 100));
  const level: UncertaintyLevel = score >= 66 ? "high" : score >= 38 ? "medium" : "low";

  return {
    level,
    score,
    warnings: [...new Set(warnings)].slice(0, 6),
    confidenceDrivers: [...new Set(confidenceDrivers)].slice(0, 6),
  };
}

function ensureReviewMetadata(event: GdeltEvent): GdeltEvent {
  const surfaceExplanation = event.surfaceExplanation ?? fallbackSurfaceExplanation(event);
  const uncertainty = event.uncertainty ?? fallbackEventUncertainty(event);
  return {
    ...event,
    surfaceExplanation,
    uncertainty,
    eventClusterId: event.eventClusterId ?? `incident-${event.id}`,
    eventClusterSize: event.eventClusterSize ?? 1,
    eventClusterRole: event.eventClusterRole ?? "representative",
    eventClusterReasons: event.eventClusterReasons ?? ["No likely same-incident rows found."],
  };
}

function sourceCheckedCoverage(labels: Phase1Label[], eventsById: Map<string, GdeltEvent>) {
  const sourceCheckedEventIds = new Set<string>();
  const continentCounts = new Map<string, number>();
  const themeCounts = new Map<string, number>();
  const domainCounts = new Map<string, number>();

  for (const label of labels) {
    if (!isSourceCheckedHumanLabel(label)) continue;
    const event = eventsById.get(label.eventId);
    if (!event) continue;
    sourceCheckedEventIds.add(label.eventId);
    continentCounts.set(event.continent, (continentCounts.get(event.continent) ?? 0) + 1);
    if (event.theme) themeCounts.set(event.theme, (themeCounts.get(event.theme) ?? 0) + 1);
    const domain = hostFromUrl(event.sourceUrl);
    if (domain) domainCounts.set(domain, (domainCounts.get(domain) ?? 0) + 1);
  }

  return { sourceCheckedEventIds, continentCounts, themeCounts, domainCounts };
}

function reviewCoverageGapScore(event: GdeltEvent, coverage: ReturnType<typeof sourceCheckedCoverage>): number {
  const continentCount = coverage.continentCounts.get(event.continent) ?? 0;
  const themeCount = event.theme ? coverage.themeCounts.get(event.theme) ?? 0 : 0;
  const domain = hostFromUrl(event.sourceUrl);
  const domainCount = domain ? coverage.domainCounts.get(domain) ?? 0 : 0;

  return Math.round(clamp(
    clamp(10 - continentCount * 1.6, 0, 10) +
    clamp(8 - themeCount * 1.5, 0, 8) +
    (domain && domainCount === 0 ? 5 : 0),
    0,
    25
  ));
}

function activeLearningComponents(event: GdeltEvent, coverage: ReturnType<typeof sourceCheckedCoverage>) {
  const priority = Math.round(clamp(surfaceSortScore(event), 0, 100));
  const uncertainty = Math.round(clamp(event.uncertainty?.score ?? 50, 0, 100));
  const threshold = Math.round(clamp(
    16 - Math.min(Math.abs(priority - REVIEW_ASSIGN_THRESHOLD), Math.abs(priority - REVIEW_WATCH_THRESHOLD)) * 1.8,
    0,
    16
  ));
  const coverageScore = reviewCoverageGapScore(event, coverage);

  return { priority, uncertainty, threshold, coverage: coverageScore };
}

function buildActiveLearningReasons(event: GdeltEvent, components: ReturnType<typeof activeLearningComponents>): string[] {
  const reasons = [
    components.priority >= REVIEW_ASSIGN_THRESHOLD
      ? "High-priority surfaced lead."
      : components.priority >= REVIEW_WATCH_THRESHOLD
      ? "Near the Watch/Assign decision band."
      : "Background row may still teach the filter.",
    components.threshold > 0 ? "Close to a review threshold, so a human label is informative." : null,
    components.uncertainty >= 66 ? "High uncertainty needs source checking." : components.uncertainty >= 38 ? "Medium uncertainty can improve calibration." : null,
    components.priority >= REVIEW_WATCH_THRESHOLD && event.uncertainty?.level === "high" ? "Important-looking row with shaky evidence." : null,
    components.coverage > 10 ? "Under-reviewed region/theme/source coverage gap." : components.coverage > 0 ? "Adds coverage diversity." : null,
    event.duplicateOf || event.eventClusterRole === "member" ? "Cluster member or duplicate; review the representative instead." : null,
  ].filter((reason): reason is string => Boolean(reason));

  return [...new Set([...(event.activeLearningReasons ?? []), ...reasons])].slice(0, 6);
}

function queueScoreForMode(mode: ReviewQueueMode, event: GdeltEvent, components: ReturnType<typeof activeLearningComponents>): number {
  const thinImportant = components.priority >= REVIEW_WATCH_THRESHOLD && event.uncertainty?.level === "high" ? 14 : 0;
  const base = components.priority * 0.42 + components.uncertainty * 0.24 + components.threshold + components.coverage + thinImportant;

  if (mode === "uncertain") {
    return Math.round(clamp(components.uncertainty * 0.55 + components.threshold * 1.6 + components.priority * 0.22 + thinImportant, 0, 100));
  }
  if (mode === "coverage") {
    return Math.round(clamp(components.coverage * 2.5 + components.priority * 0.28 + components.uncertainty * 0.18, 0, 100));
  }
  return Math.round(clamp(event.activeLearningScore ?? base, 0, 100));
}

function buildReviewQueueRows(events: GdeltEvent[], labels: Phase1Label[], mode: ReviewQueueMode, limit: number): { rows: ReviewQueueRow[]; counts: Record<string, number> } {
  const eventsById = new Map(events.map((event) => [event.id, event]));
  const labelById = new Map(labels.map((label) => [label.eventId, label]));
  const coverage = sourceCheckedCoverage(labels, eventsById);
  const candidates = events
    .map(ensureReviewMetadata)
    .filter((event) => !isSourceCheckedHumanLabel(labelById.get(event.id)))
    .filter((event) => event.duplicateOf == null)
    .filter((event) => event.eventClusterRole !== "member");

  const rows = candidates
    .map((event) => {
      const components = activeLearningComponents(event, coverage);
      const queueScore = queueScoreForMode(mode, event, components);
      return {
        event,
        rank: 0,
        queueScore,
        mode,
        activeLearning: {
          score: queueScore,
          reasons: buildActiveLearningReasons(event, components),
          components,
        },
      };
    })
    .sort((a, b) =>
      b.queueScore - a.queueScore ||
      surfaceSortScore(b.event) - surfaceSortScore(a.event) ||
      Number(b.event.numMentions ?? 0) - Number(a.event.numMentions ?? 0)
    )
    .slice(0, limit)
    .map((row, index) => ({ ...row, rank: index + 1 }));

  return {
    rows,
    counts: {
      totalEvents: events.length,
      candidates: candidates.length,
      returned: rows.length,
      sourceCheckedHumanLabels: coverage.sourceCheckedEventIds.size,
      excludedDuplicates: events.filter((event) => event.duplicateOf != null).length,
      excludedClusterMembers: events.filter((event) => event.eventClusterRole === "member").length,
    },
  };
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
  const contextReasons: string[] = [];
  const targetSource = hostFromUrl(target.sourceUrl);
  const candidateSource = hostFromUrl(candidate.sourceUrl);
  const days = daysApart(target, candidate);
  let hasAnchor = false;

  if (target.sourceUrl && candidate.sourceUrl && target.sourceUrl === candidate.sourceUrl) {
    score += 90;
    hasAnchor = true;
    reasons.push("same source article");
  } else if (targetSource && candidateSource && targetSource === candidateSource && days !== null && days <= 2) {
    score += 10;
    contextReasons.push(`same publisher (${targetSource})`);
  }

  const targetActors = actorTokens(target);
  const candidateActors = actorTokens(candidate);
  const sharedActors = [...targetActors].filter((token) => candidateActors.has(token));
  if (sharedActors.length > 0) {
    score += Math.min(54, sharedActors.length * 36);
    hasAnchor = true;
    reasons.push(`shared actor/entity: ${sharedActors.slice(0, 3).join(", ")}`);
  }

  if (target.country && candidate.country && target.country === candidate.country) {
    score += 8;
    contextReasons.push(`same country (${target.country})`);
  }

  if (target.continent && candidate.continent && target.continent === candidate.continent) {
    score += 2;
  }

  if (target.theme && candidate.theme && target.theme === candidate.theme) {
    score += 6;
    contextReasons.push(`same theme (${target.theme})`);
  }

  if (target.quadClass !== null && target.quadClass === candidate.quadClass) {
    score += 3;
  }

  if (days !== null) {
    if (days <= 1) {
      score += 4;
      contextReasons.push("same 24h news cycle");
    } else if (days <= 7) {
      score += 2;
      contextReasons.push(`${Math.round(days)} days apart`);
    } else if (days <= 30) {
      score += 1;
    }
  }

  const km = distanceKm(target, candidate);
  if (km !== null) {
    if (km <= 50 && (days === null || days <= 7)) {
      score += 26;
      hasAnchor = true;
      reasons.push(`nearby location (${Math.round(km)} km)`);
    } else if (km <= 300 && days !== null && days <= 2) {
      score += 8;
      contextReasons.push(`regional proximity (${Math.round(km)} km)`);
    }
  }

  score += Math.min(10, Math.log10((candidate.numMentions ?? 0) + 1) * 4);

  if (!hasAnchor || score < RELATED_SIGNAL_MIN_SCORE || reasons.length === 0) return null;
  return { event: candidate, score, reasons: [...reasons, ...contextReasons].slice(0, 4) };
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
  const goldsteinPoints = absGoldstein * 6;
  const sourceConfidence = source?.fetched ? 0.22 : 0;
  const mentionConfidence = Math.min(0.18, (target.numMentions ?? 0) / 300);

  const base = goldsteinPoints + mentionBoost + relatedBoost;
  const local = clamp(base + conflictBoost + (target.severity === "critical" ? 16 : 0), 0, 100);
  const humanitarian = clamp(base * 0.8 + (target.theme === "Humanitarian" ? 22 : 0) + (target.category === "doom" ? 14 : -4), 0, 100);
  const policy = clamp(base * 0.75 + (["Diplomacy", "Conflict", "Econ"].includes(target.theme ?? "") ? 18 : 4), 0, 100);
  const finance = clamp((financeRelevant ? 45 : 12) + mentionBoost + (target.category === "doom" ? 10 : 0) + relatedBoost * 0.5, 0, 100);
  const supplyChain = clamp((supplyRelevant ? 48 : 10) + mentionBoost + (target.category === "doom" ? 9 : 0), 0, 100);
  const social = clamp(base * 0.65 + (target.avgTone !== null && target.avgTone < -5 ? 18 : 5), 0, 100);
  const confidence = clamp(0.35 + relatedSignals.length * 0.035 + sourceConfidence + mentionConfidence, 0.25, 0.88);
  const scoreInputs = `Inputs: |Goldstein| ${fmtNum(absGoldstein)} -> ${fmtNum(goldsteinPoints)} pts; mentions ${target.numMentions ?? 0} -> ${fmtNum(mentionBoost)} pts; strong links ${relatedSignals.length} -> ${fmtNum(relatedBoost)} pts.`;
  const confidenceInputs = `Confidence starts at 35%, plus source ${source?.fetched ? "+22%" : "+0%"} and mentions +${Math.round(mentionConfidence * 100)}%.`;

  return [
    {
      key: "local",
      label: "Local safety",
      score: Math.round(local),
      direction,
      confidence,
      rationale: `${scoreInputs} Local safety also adds ${target.category === "doom" ? "+16" : "-6"} for negative direction and ${target.severity === "critical" ? "+16" : "+0"} for critical severity. ${confidenceInputs}`,
    },
    {
      key: "humanitarian",
      label: "Humanitarian stress",
      score: Math.round(humanitarian),
      direction: target.category === "doom" ? "negative" : "mixed",
      confidence: clamp(confidence - 0.04, 0.2, 0.85),
      rationale: `${scoreInputs} Humanitarian stress uses 80% of base, then ${target.theme === "Humanitarian" ? "+22 for humanitarian theme" : "+0 theme boost"} and ${target.category === "doom" ? "+14 for harm/risk direction" : "-4 because direction is not harmful"}.`,
    },
    {
      key: "policy",
      label: "Policy and diplomacy",
      score: Math.round(policy),
      direction,
      confidence: clamp(confidence + 0.03, 0.2, 0.9),
      rationale: `${scoreInputs} Policy impact uses 75% of base, then ${["Diplomacy", "Conflict", "Econ"].includes(target.theme ?? "") ? "+18 because the topic can affect official decisions" : "+4 because topic evidence is weak"}. Raw GDELT class is ${target.quadLabel}, which is only a coarse bucket.`,
    },
    {
      key: "finance",
      label: "Finance and markets",
      score: Math.round(finance),
      direction: financeRelevant ? direction : "mixed",
      confidence: financeRelevant ? clamp(confidence - 0.03, 0.2, 0.82) : 0.28,
      rationale: financeRelevant
        ? `Finance/economic keyword evidence found. Score adds base 45, mentions ${fmtNum(mentionBoost)}, harm/risk ${target.category === "doom" ? "+10" : "+0"}, and link boost ${fmtNum(relatedBoost * 0.5)}.`
        : `No direct market evidence in this pack. Score is mostly a low-confidence baseline plus mentions ${fmtNum(mentionBoost)} and harm/risk ${target.category === "doom" ? "+10" : "+0"}.`,
    },
    {
      key: "supplyChain",
      label: "Supply chain",
      score: Math.round(supplyChain),
      direction: supplyRelevant ? direction : "mixed",
      confidence: supplyRelevant ? clamp(confidence - 0.03, 0.2, 0.82) : 0.25,
      rationale: supplyRelevant
        ? `Supply-chain or infrastructure keyword evidence found. Score adds base 48, mentions ${fmtNum(mentionBoost)}, and harm/risk ${target.category === "doom" ? "+9" : "+0"}.`
        : `No direct supply-chain evidence in this pack. Score is a low baseline plus mentions ${fmtNum(mentionBoost)} and harm/risk ${target.category === "doom" ? "+9" : "+0"}.`,
    },
    {
      key: "social",
      label: "Social narrative",
      score: Math.round(social),
      direction: target.avgTone !== null && target.avgTone < -2 ? "negative" : "mixed",
      confidence: clamp(confidence + 0.02, 0.2, 0.88),
      rationale: `${scoreInputs} Social narrative uses 65% of base, then ${target.avgTone !== null && target.avgTone < -5 ? "+18 because average tone is strongly negative" : "+5 because tone is not strongly negative"}.`,
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

function uniqueStrings(items: Array<string | null | undefined>, limit: number): string[] {
  const out: string[] = [];
  const seen = new Set<string>();

  for (const item of items) {
    const clean = item?.trim();
    if (!clean) continue;
    const key = clean.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(clean);
    if (out.length >= limit) break;
  }

  return out;
}

function displaySurfaceReason(reason: string): string {
  return reason.startsWith("penalty: ")
    ? `Caveat: ${reason.slice("penalty: ".length)}`
    : reason;
}

function reviewDecision(priority: number): ReviewCopilot["suggestedDecision"]["decision"] {
  if (priority >= REVIEW_ASSIGN_THRESHOLD) return "assign";
  if (priority >= REVIEW_WATCH_THRESHOLD) return "watch";
  return "dismiss";
}

function reviewDecisionLabel(decision: ReviewCopilot["suggestedDecision"]["decision"]): ReviewCopilot["suggestedDecision"]["label"] {
  if (decision === "assign") return "Assign";
  if (decision === "watch") return "Watch";
  return "Dismiss";
}

function reviewDecisionDescription(decision: ReviewCopilot["suggestedDecision"]["decision"]): string {
  if (decision === "assign") return "assign for deeper investigation";
  if (decision === "watch") return "watch for corroboration or follow-through";
  return "dismiss as background unless new evidence appears";
}

function buildWhySurfaced(target: GdeltEvent, prediction: ModelPrediction | undefined, relatedSignals: RelatedSignal[]): string[] {
  const structuredReasons = target.surfaceExplanation
    ? [
        ...target.surfaceExplanation.boosts,
        ...target.surfaceExplanation.penalties.map((penalty) => `Caveat: ${penalty}`),
        ...target.surfaceExplanation.caveats,
      ]
    : (target.surfaceReasons ?? []).map(displaySurfaceReason);

  return uniqueStrings([
    ...structuredReasons,
    target.severity === "critical" || target.severity === "high" ? `${target.severity} severity signal` : null,
    target.quadClass === 4 ? "material conflict event class" : null,
    target.quadClass === 1 || target.quadClass === 2 ? "cooperation event class" : null,
    Number(target.numMentions ?? 0) >= 20 ? `${target.numMentions} media mentions` : null,
    Number(target.surfaceClusterSize ?? 0) > 1 ? `${target.surfaceClusterSize} related source rows in this cluster` : null,
    prediction ? `trained model estimates ${Math.round(prediction.probability * 100)}% ${prediction.target} risk` : null,
    relatedSignals.length > 0 ? `${relatedSignals.length} related signals in the local event graph` : null,
    target.sourceUrl ? `source domain: ${hostFromUrl(target.sourceUrl) || "available"}` : "no source URL attached",
  ], 7);
}

function buildWhatToVerify(target: GdeltEvent, source: SourceEvidence | null, relatedSignals: RelatedSignal[]): string[] {
  const actorCheck = target.actor1 === "Unknown" || target.actor2 === "Unknown"
    ? "Resolve missing or generic actor fields before treating the row as a clean event."
    : `Confirm the source really describes ${eventActors(target)}, not only background context.`;

  return uniqueStrings([
    target.sourceUrl
      ? "Open the source and confirm the event, date, location, and actors match the row."
      : "Find an independent source because this row has no source URL.",
    source?.fetched
      ? "Check whether the extracted source title and text support the selected event."
      : source?.status || "Source text was not available, so verify with outside context before labeling.",
    actorCheck,
    Number(target.numMentions ?? 0) <= 1
      ? "Find a second independent report because the mention count is very low."
      : "Check whether high media coverage is original reporting or copied coverage of the same article.",
    relatedSignals.length > 0
      ? "Decide whether linked signals are the same incident, follow-on events, or unrelated co-reporting."
      : "Look for nearby or same-actor follow-up events before assuming this is isolated.",
    "Only mark a label source-checked after a human has inspected enough source context.",
  ], 6);
}

function buildReviewUncertainty(target: GdeltEvent, pack: {
  source: SourceEvidence | null;
  relatedSignals: RelatedSignal[];
  impactMap: ImpactVector[];
  evidenceGrade: ProbePack["evidenceGrade"];
}): string[] {
  return uniqueStrings([
    target.uncertainty ? `Event uncertainty is ${target.uncertainty.level} at ${target.uncertainty.score}/100.` : null,
    ...(target.uncertainty?.warnings ?? []),
    `Evidence grade is ${pack.evidenceGrade.label} at ${Math.round(pack.evidenceGrade.confidence * 100)}%.`,
    ...pack.evidenceGrade.reasons,
    ...buildUncertaintyWarnings(pack.source, pack.relatedSignals, pack.impactMap),
    target.duplicateOf ? `This row is marked as a duplicate of ${target.duplicateOf}.` : null,
    target.eventClusterRole === "member" ? `This row is a member of ${target.eventClusterId}; review the representative first.` : null,
    (target.surfaceReasons ?? []).some((reason) => reason.toLowerCase().includes("source-mismatch"))
      ? "Surfacing policy flagged possible source mismatch."
      : null,
  ], 6);
}

function buildReviewWatchNext(target: GdeltEvent, actorGame: ActorGame[], watchlist: string[], relatedSignals: RelatedSignal[]): string[] {
  const topActor = actorGame[0];
  return uniqueStrings([
    ...watchlist,
    topActor?.likelyMoves?.[0] ? `${topActor.actor} likely move to watch: ${topActor.likelyMoves[0]}` : null,
    topActor?.decisionTraps?.[0] ? `Decision trap to watch: ${topActor.decisionTraps[0]}.` : null,
    relatedSignals.some((signal) => (signal.probability ?? 0) >= 0.7)
      ? "If high-probability links grow over the next 24-72 hours, raise review priority."
      : "If no corroborating signal appears, lower confidence in the row.",
  ], 6);
}

function buildReviewCopilot(
  target: GdeltEvent,
  source: SourceEvidence | null,
  relatedSignals: RelatedSignal[],
  prediction: ModelPrediction | undefined,
  impactMap: ImpactVector[],
  actorGame: ActorGame[],
  watchlist: string[],
  evidenceGrade: ProbePack["evidenceGrade"]
): ReviewCopilot {
  const priority = Math.round(clamp(surfaceSortScore(target), 0, 100));
  const decision = reviewDecision(priority);
  const label = reviewDecisionLabel(decision);
  const boundary = decision === "assign" ? REVIEW_ASSIGN_THRESHOLD : REVIEW_WATCH_THRESHOLD;
  const thresholdMargin = decision === "watch"
    ? Math.min(priority - REVIEW_WATCH_THRESHOLD, REVIEW_ASSIGN_THRESHOLD - priority)
    : Math.abs(priority - boundary);
  const confidence = Math.round(clamp(
    42 + Math.max(0, thresholdMargin) * 0.65 + evidenceGrade.confidence * 28 + Math.min(8, relatedSignals.length),
    28,
    88
  ));
  const location = target.location || target.country || "unknown location";
  const evidenceWord = evidenceGrade.label === "strong" ? "well-supported" : evidenceGrade.label === "partial" ? "partly supported" : "thin";
  const bottomLine =
    `${label}: ${eventActors(target)} in ${location} is a ${target.severity} ${target.theme ?? "event"} signal with priority ${priority}/100. ` +
    `Treat the evidence as ${evidenceWord}; this is a review aid, not source-checked ground truth.`;

  return {
    bottomLine,
    whySurfaced: buildWhySurfaced(target, prediction, relatedSignals),
    whatToVerify: buildWhatToVerify(target, source, relatedSignals),
    uncertainty: buildReviewUncertainty(target, { source, relatedSignals, impactMap, evidenceGrade }),
    suggestedDecision: {
      decision,
      label,
      confidence,
      rationale: `Priority ${priority}/100 maps to ${reviewDecisionDescription(decision)}. Evidence grade is ${evidenceGrade.label}, so a human should verify the source before this becomes an answer-key label.`,
    },
    watchNext: buildReviewWatchNext(target, actorGame, watchlist, relatedSignals),
  };
}

async function buildProbePack(
  inputEvent: GdeltEvent,
  fetchSource = true,
  datasetOverride?: { events: GdeltEvent[]; updated?: string }
): Promise<ProbePack> {
  const dataset = datasetOverride ?? await loadEventDataset().catch(() => ({ events: [] as GdeltEvent[], updated: undefined as string | undefined }));
  const datasetEvent = dataset.events.find((candidate) => candidate.id === inputEvent.id);
  const selectedEvent = ensureReviewMetadata(datasetEvent ? { ...datasetEvent, ...inputEvent } : inputEvent);
  const corpus = dataset.events.length > 0 ? dataset.events.map(ensureReviewMetadata) : [selectedEvent];
  const source = fetchSource ? await fetchSourceEvidence(selectedEvent.sourceUrl) : null;
  const relatedSignals = findRelatedSignals(selectedEvent, corpus).map(withSignalProbability);
  const impactMap = buildImpactMap(selectedEvent, relatedSignals, source);
  const prediction = await predictEscalation(selectedEvent, corpus);
  const actorGame = buildActorGame(selectedEvent, relatedSignals);
  const watchlist = buildWatchlist(selectedEvent, impactMap, relatedSignals);
  const evidenceGrade = buildEvidenceGrade(selectedEvent, source, relatedSignals);

  return {
    selectedEvent,
    datasetUpdated: dataset.updated,
    source,
    relatedSignals,
    prediction,
    entities: buildEntities(selectedEvent, relatedSignals, source),
    impactMap,
    hypotheses: buildHypotheses(selectedEvent, relatedSignals, source),
    actorGame,
    watchlist,
    reviewCopilot: buildReviewCopilot(selectedEvent, source, relatedSignals, prediction, impactMap, actorGame, watchlist, evidenceGrade),
    evidenceGrade,
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

  const copilot = pack.reviewCopilot
    ? [
      `Bottom line: ${pack.reviewCopilot.bottomLine}`,
      `Suggested decision: ${pack.reviewCopilot.suggestedDecision.label} (${pack.reviewCopilot.suggestedDecision.confidence}% confidence)`,
      `Rationale: ${pack.reviewCopilot.suggestedDecision.rationale}`,
      `Why surfaced: ${pack.reviewCopilot.whySurfaced.join(" | ")}`,
      `Human verification tasks: ${pack.reviewCopilot.whatToVerify.join(" | ")}`,
      `Uncertainty: ${pack.reviewCopilot.uncertainty.join(" | ")}`,
    ].join("\n")
    : "No reviewer copilot packet available.";

  const surface = pack.selectedEvent.surfaceExplanation
    ? [
      `Surface label: ${pack.selectedEvent.surfaceExplanation.label}`,
      `Surface summary: ${pack.selectedEvent.surfaceExplanation.summary}`,
      `Boosts: ${pack.selectedEvent.surfaceExplanation.boosts.join(" | ") || "none"}`,
      `Penalties: ${pack.selectedEvent.surfaceExplanation.penalties.join(" | ") || "none"}`,
      `Caveats: ${pack.selectedEvent.surfaceExplanation.caveats.join(" | ") || "none"}`,
    ].join("\n")
    : "No structured surface explanation available.";

  const uncertainty = pack.selectedEvent.uncertainty
    ? [
      `Level: ${pack.selectedEvent.uncertainty.level}`,
      `Score: ${pack.selectedEvent.uncertainty.score}/100`,
      `Warnings: ${pack.selectedEvent.uncertainty.warnings.join(" | ") || "none"}`,
      `Confidence drivers: ${pack.selectedEvent.uncertainty.confidenceDrivers.join(" | ") || "none"}`,
    ].join("\n")
    : "No structured uncertainty object available.";

  return [
    `SELECTED EVENT\n${formatEventForPrompt(pack.selectedEvent)}`,
    `SURFACING EXPLANATION\n${surface}`,
    `ROW UNCERTAINTY\n${uncertainty}`,
    pack.prediction
      ? `TRAINED MODEL PREDICTION\nFuture critical escalation risk: ${Math.round(pack.prediction.probability * 100)}% (${pack.prediction.label}). Threshold: ${Math.round(pack.prediction.threshold * 100)}%. Model: ${pack.prediction.modelVersion}. Held-out metrics: ${JSON.stringify(pack.prediction.metrics ?? {})}. Top drivers: ${pack.prediction.drivers.map((d) => `${d.feature} ${d.direction} risk (${d.contribution})`).join(" | ")}`
      : "TRAINED MODEL PREDICTION\nNo trained model artifact found.",
    `REVIEWER COPILOT\n${copilot}`,
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
      const actor1 = cols[COL.ACTOR1NAME]?.trim() || "Unknown";
      const actor2 = cols[COL.ACTOR2NAME]?.trim() || "Unknown";
      const avgTone = isFinite(parseFloat(cols[COL.AVGTONE]))
        ? parseFloat(cols[COL.AVGTONE])
        : null;
      const eventCode = cols[COL.EVENTCODE]?.trim() || "";
      const sourceUrl = cols[COL.SOURCEURL]?.trim() ?? "";
      const theme = classifyTheme(eventCode, actor1, actor2, quadClass, sourceUrl);
      const numMentions = parseInt(cols[COL.NUMMENTIONS], 10) || 0;

      const event: GdeltEvent = {
        id: cols[COL.GLOBALEVENTID],
        lat, lon, category, theme,
        hopeScore: calculateHopeScore(goldstein, avgTone, theme),
        goldstein, quadClass,
        quadLabel: QUAD_LABELS[quadClass ?? 0] ?? "Unknown",
        actor1,
        actor2,
        country,
        location: cols[COL.ACTIONGEO_FULLNAME]?.trim() ?? "",
        date: fmtDate(cols[COL.SQLDATE]),
        numMentions,
        avgTone,
        sourceUrl,
        markerRadius: getRadius(goldstein),
        severity: getSeverity(goldstein),
        continent: FIPS_CONTINENT[country] ?? "Other",
      };

      events.push({ ...event, ...liveSurfaceMetadata(event) });
    }

    return events;
  } catch {
    return [];
  }
}

async function fetchGdelt(days: number): Promise<GdeltEvent[]> {
  const cacheKey = `gdelt-live:${days}`;
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.ts < CACHE_TTL) return cached.data;

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

  all.sort((a, b) =>
    surfaceSortScore(b) - surfaceSortScore(a) ||
    Number(b.numMentions ?? 0) - Number(a.numMentions ?? 0)
  );
  const data = all.slice(0, MAX_POINTS).map(ensureReviewMetadata);
  cache.set(cacheKey, { data, ts: Date.now() });
  return data;
}

type EventSource = "static" | "live";

function eventSourceFromQuery(raw: string | undefined | null): EventSource {
  return raw === "live" ? "live" : "static";
}

async function loadEventsForSource(source: EventSource, days: number): Promise<{ events: GdeltEvent[]; updated?: string; source: EventSource }> {
  if (source === "live") {
    const events = await fetchGdelt(days);
    return { events, updated: new Date().toISOString(), source };
  }

  const dataset = await loadEventDataset();
  return {
    events: filterEventsByDatasetWindow(dataset.events, days).map(ensureReviewMetadata),
    updated: dataset.updated,
    source,
  };
}

// ── App ───────────────────────────────────────────────────────────────────────

export const app = new Hono();

const ENV_API_KEY = process.env.ANTHROPIC_API_KEY ?? "";
const DEFAULT_LM_STUDIO_BASE_URL = "http://localhost:1234";
const DEFAULT_LM_STUDIO_API_KEY = "lmstudio";
const DEFAULT_LM_STUDIO_MODEL = "ibm/granite-4-micro";

interface InferenceTarget {
  provider: "lm-studio" | "anthropic";
  baseUrl: string;
  apiKey: string;
  model: string;
}

export function resolveInferenceTarget({
  apiKey,
  env = process.env,
}: {
  apiKey?: string;
  env?: NodeJS.ProcessEnv;
} = {}): InferenceTarget {
  const explicitAnthropicKey = (apiKey ?? "").trim();
  const anthropicKey = explicitAnthropicKey.startsWith("sk-ant")
    ? explicitAnthropicKey
    : (env.ANTHROPIC_API_KEY ?? "").trim();
  const localBaseUrl = (env.LM_STUDIO_BASE_URL ?? DEFAULT_LM_STUDIO_BASE_URL).trim();
  const localApiKey = (env.LM_STUDIO_API_KEY ?? DEFAULT_LM_STUDIO_API_KEY).trim();
  const localModel = (env.LM_STUDIO_MODEL ?? DEFAULT_LM_STUDIO_MODEL).trim();
  const localDisabled = env.LM_STUDIO_BASE_URL === "" || env.LM_STUDIO_BASE_URL === "disabled";

  if (!localDisabled && localBaseUrl) {
    return {
      provider: "lm-studio",
      baseUrl: localBaseUrl,
      apiKey: localApiKey || DEFAULT_LM_STUDIO_API_KEY,
      model: localModel || DEFAULT_LM_STUDIO_MODEL,
    };
  }

  return {
    provider: "anthropic",
    baseUrl: "https://api.anthropic.com",
    apiKey: anthropicKey || "",
    model: env.ANTHROPIC_MODEL ?? "claude-sonnet-4-6",
  };
}

function extractText(content: Array<{ type?: string; text?: string }> | undefined): string {
  return (content ?? [])
    .filter((part) => part?.type === "text" && typeof part.text === "string")
    .map((part) => part.text ?? "")
    .join("\n")
    .trim();
}

async function callInference(target: InferenceTarget, systemPrompt: string, userPrompt: string, maxTokens: number) {
  const client = new Anthropic({
    baseURL: target.baseUrl,
    apiKey: target.apiKey || "lmstudio",
  });

  const response = await client.messages.create({
    model: target.model,
    max_tokens: maxTokens,
    system: systemPrompt,
    messages: [{ role: "user", content: userPrompt }],
  });

  return extractText(response.content as Array<{ type?: string; text?: string }>) || "";
}

app.get("/api/ai-status", (c) => {
  const target = resolveInferenceTarget({ env: process.env });
  return c.json({ ready: target.provider === "lm-studio" || Boolean(target.apiKey) });
});

app.get("/api/events", async (c) => {
  const requestedDays = Number.parseInt(c.req.query("days") ?? "7", 10);
  const days = Number.isFinite(requestedDays) ? Math.max(1, Math.min(30, requestedDays)) : 7;
  const source = eventSourceFromQuery(c.req.query("source"));

  try {
    const dataset = await loadEventsForSource(source, days);
    let events = dataset.events;

    events = [...events].sort((a: any, b: any) =>
      surfaceSortScore(b) - surfaceSortScore(a) ||
      Number(b.numMentions ?? 0) - Number(a.numMentions ?? 0)
    );

    c.header("X-Cache", source === "live" ? "LIVE-GDELT" : "STATIC");
    return c.json({ events, count: events.length, updated: dataset.updated, source });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("API -> Failed to load events:", msg);
    return c.json({ error: source === "live" ? "Failed to load live GDELT feed" : "Failed to load pre-enriched event dataset", events: [], count: 0, source }, 500);
  }
});

app.get("/api/review-queue", async (c) => {
  const rawDays = c.req.query("days") ?? "7";
  const rawLimit = c.req.query("limit") ?? "50";
  const rawMode = c.req.query("mode") ?? "priority";
  const source = eventSourceFromQuery(c.req.query("source"));
  const days = Number.parseInt(rawDays, 10);
  const limit = Number.parseInt(rawLimit, 10);

  if (!Number.isInteger(days) || String(days) !== rawDays || days < 1 || days > 30) {
    return c.json({ error: "Invalid days. Use an integer from 1 to 30." }, 400);
  }
  if (!Number.isInteger(limit) || String(limit) !== rawLimit || limit < 1 || limit > 100) {
    return c.json({ error: "Invalid limit. Use an integer from 1 to 100." }, 400);
  }
  if (rawMode !== "priority" && rawMode !== "uncertain" && rawMode !== "coverage") {
    return c.json({ error: "Invalid mode. Use priority, uncertain, or coverage." }, 400);
  }

  try {
    const dataset = await loadEventsForSource(source, days);
    const labels = source === "live" ? [] : await loadPhase1Labels();
    const events = dataset.events.map(ensureReviewMetadata);
    const { rows, counts } = buildReviewQueueRows(events, labels, rawMode, limit);

    return c.json({
      queue: rows,
      counts,
      source,
      updated: dataset.updated,
      strategy: {
        mode: rawMode,
        days,
        limit,
        ranking: rawMode === "priority"
          ? "Prioritize high-value rows that are not source-checked and are not duplicate/cluster members."
          : rawMode === "uncertain"
          ? "Prioritize rows where a human label would reduce uncertainty near a review threshold."
          : "Prioritize under-reviewed regions, themes, and source domains.",
      },
      caveat: source === "live"
        ? "Live GDELT rows are a moving news-data feed. They are classified heuristically and still require human source checking."
        : "Active learning chooses useful rows for human source-checking. It does not create ground truth and never marks labels humanReviewed or sourceChecked.",
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("API -> Failed to build review queue:", msg);
    return c.json({ error: `Failed to build review queue: ${msg}`, queue: [] }, 500);
  }
});

app.get("/api/risk-champion", async (c) => {
  try {
    const { champion, model, latestResearch } = await loadRiskChampion();
    return c.json({
      champion,
      model: {
        kind: model.kind,
        weights: model.weights,
      },
      latestResearch: latestResearch
        ? {
            generatedAt: latestResearch.generatedAt,
            variantsTried: latestResearch.variantsTried,
            bestChallenger: latestResearch.bestChallenger
              ? {
                  id: latestResearch.bestChallenger.variant?.id,
                  hypothesis: latestResearch.bestChallenger.variant?.hypothesis,
                  promoted: Boolean(latestResearch.bestChallenger.promoted),
                  validationAveragePrecision: latestResearch.bestChallenger.splits?.validation?.averagePrecision,
                  testAveragePrecision: latestResearch.bestChallenger.splits?.test?.averagePrecision,
                  holdoutPreliminaryAveragePrecision: latestResearch.bestChallenger.splits?.holdout_preliminary?.averagePrecision,
                }
              : null,
          }
        : null,
      caveat: "This is an analyst triage ranker. 2026 holdout labels are preliminary and can lag real events.",
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("API -> Failed to load risk champion:", msg);
    return c.json({ error: `Failed to load risk champion: ${msg}` }, 500);
  }
});

app.get("/api/risk-windows", async (c) => {
  const split = c.req.query("split")?.trim() || "holdout_preliminary";
  const requestedLimit = Number.parseInt(c.req.query("limit") ?? "25", 10);
  const limit = Number.isFinite(requestedLimit) ? Math.max(1, Math.min(200, requestedLimit)) : 25;

  try {
    const { champion, model } = await loadRiskChampion();
    const datasetPath = typeof champion.datasetPath === "string"
      ? champion.datasetPath
      : "data/training/risk_windows_country_month.jsonl";
    const dataset = await resolveFirstDataPath([
      datasetPath,
      "data/training/risk_windows_country_month_sample.jsonl",
    ]);
    const text = await fs.readFile(dataset.path, "utf8");
    const ranked: Array<{ record: RiskWindowRecord; score: number }> = [];

    for (const line of text.split(/\r?\n/)) {
      if (!line.trim()) continue;
      const record = JSON.parse(line) as RiskWindowRecord;
      if (record.window?.split !== split) continue;
      ranked.push({ record, score: deterministicRiskScore(record, model) });
    }

    ranked.sort((a, b) =>
      b.score - a.score ||
      Number(b.record.labels?.currentMonthEvents ?? 0) - Number(a.record.labels?.currentMonthEvents ?? 0)
    );

    const windows = ranked.slice(0, limit).map((item, index) => publicRiskWindow(item.record, item.score, index + 1));
    return c.json({
      split,
      count: ranked.length,
      returned: windows.length,
      championId: champion.championId,
      datasetPath: dataset.relativePath,
      usingSampleDataset: dataset.relativePath !== datasetPath,
      windows,
      caveat: dataset.relativePath !== datasetPath
        ? "Showing committed sample rows because the full generated risk-window dataset is local-only. Run bun run risk:windows to rebuild the full file."
        : split === "holdout_preliminary"
        ? "Preliminary holdout labels are useful for smoke checks, but late-arriving conflict records can turn apparent misses into hits."
        : "These rows are historical evaluation windows with source-checked UCDP-style labels.",
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("API -> Failed to load risk windows:", msg);
    return c.json({ error: `Failed to load risk windows: ${msg}`, windows: [], count: 0 }, 500);
  }
});

app.get("/api/probe", async (c) => {
  const id = c.req.query("id")?.trim();
  const source = eventSourceFromQuery(c.req.query("source"));
  const requestedDays = Number.parseInt(c.req.query("days") ?? "7", 10);
  const days = Number.isFinite(requestedDays) ? Math.max(1, Math.min(30, requestedDays)) : 7;
  if (!id) {
    return c.json({ error: "Missing event id" }, 400);
  }

  try {
    const dataset = await loadEventsForSource(source, days);
    const event = dataset.events.find((candidate) => candidate.id === id);
    if (!event) {
      return c.json({ error: "Event not found" }, 404);
    }

    const pack = await buildProbePack(event, true, dataset);
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
  const explicitAnthropicKey = typeof clientKey === "string" && clientKey.startsWith("sk-ant") ? clientKey : "";

  if (!explicitAnthropicKey && !ENV_API_KEY) {
    // LM Studio is the default local inference path, so we do not require an API key here.
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

  if ((mode === "detail" || mode === "review_note") && events.length === 1) {
    probePack = await buildProbePack(events[0], true);

    if (mode === "review_note") {
      userPrompt =
        `Draft a short reviewer note for a human analyst deciding whether this public event should be assigned, watched, or dismissed.\n\n` +
        `IMPORTANT LIMITS:\n` +
        `- This is assistant drafting, not evidence and not a source-checked human label.\n` +
        `- Do not say the event is verified unless the evidence pack proves it.\n` +
        `- Keep the note grounded in the source, GDELT metadata, related signals, and reviewer copilot packet.\n` +
        `- Separate what is known from what is inferred.\n\n` +
        `INTELLIGENCE PACK\n${formatProbeForPrompt(probePack)}\n\n` +
        `Output concise Markdown with exactly these sections:\n` +
        `## Draft review note\n` +
        `2-4 sentences explaining why the event deserves assign/watch/dismiss attention.\n\n` +
        `## Evidence to check\n` +
        `3 bullets the human should verify before marking any source-checked label.\n\n` +
        `## Decision caveat\n` +
        `One sentence reminding the reviewer this AI note is not ground truth.`;
    } else {
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
        `Give scenario outlooks for 24-72 hours, 1-2 weeks, and 1-3 months. Include probability ranges and triggers that would change your assessment.\n\n` +
        `## Impact map\n` +
        `Separate local safety/humanitarian, policy/diplomacy, finance/markets/supply chains, social psychology/media narrative.\n\n` +
        `## Linked events\n` +
        `Explain how the related GDELT events may connect. Do not force a connection if the relationship is weak.\n\n` +
        `## Watchlist\n` +
        `Give concrete signals to monitor next.`;
    }
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

  const maxTokens = mode === "detail" ? 2_200 : mode === "review_note" ? 700 : 1_200;

  try {
    const primaryTarget = resolveInferenceTarget({
      apiKey: explicitAnthropicKey || ENV_API_KEY || undefined,
      env: process.env,
    });

    let analysis = "";

    try {
      analysis = await callInference(primaryTarget, SYSTEM_PROMPT, userPrompt, maxTokens);
    } catch (primaryError) {
      const fallbackTarget = resolveInferenceTarget({
        apiKey: explicitAnthropicKey || ENV_API_KEY || undefined,
        env: {
          ...process.env,
          LM_STUDIO_BASE_URL: "",
          LM_STUDIO_API_KEY: "",
          LM_STUDIO_MODEL: "",
        },
      });

      if (primaryTarget.provider === "lm-studio" && fallbackTarget.provider === "anthropic" && fallbackTarget.apiKey) {
        analysis = await callInference(fallbackTarget, SYSTEM_PROMPT, userPrompt, maxTokens);
      } else {
        throw primaryError;
      }
    }

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
