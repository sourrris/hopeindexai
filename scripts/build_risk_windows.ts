import { createReadStream, createWriteStream } from "fs";
import { mkdir, writeFile } from "fs/promises";
import { once } from "events";
import { dirname } from "path";
import { createInterface } from "readline";

type SourceSystem = "ucdp_ged" | "ucdp_candidate";
type Split = "train" | "validation" | "test" | "holdout_preliminary";

interface CompactConflictEvent {
  dataset: {
    sourceSystem: SourceSystem;
    version: string;
  };
  conflict: {
    typeLabel: string;
  };
  event: {
    dateStart: string;
    country: string;
    region: string;
    deaths: {
      best: number;
      civilians: number;
    };
  };
  matching: {
    countryKey: string;
    actorTokens: string[];
  };
}

interface MonthAgg {
  sourceSystems: Set<SourceSystem>;
  events: number;
  deathsBest: number;
  civilianDeaths: number;
  typeCounts: Map<string, number>;
  actorTokens: Set<string>;
}

interface CountryAgg {
  countryKey: string;
  country: string;
  region: string;
  months: Map<string, MonthAgg>;
}

interface AcledAggregateRow {
  event: {
    week: string;
    events: number;
    fatalities: number;
    disorderType: string | null;
    eventType: string | null;
  };
  matching: {
    countryKey: string;
  };
}

interface AcledMonthAgg {
  events: number;
  fatalities: number;
  politicalViolenceEvents: number;
  demonstrationEvents: number;
  strategicEvents: number;
}

interface RiskWindowRecord {
  schemaVersion: "risk-window.v1";
  recordId: string;
  recordVersion: "country-month-risk.2010.v1";
  window: {
    unit: "country_month";
    countryKey: string;
    country: string;
    region: string;
    month: string;
    predictionMadeAt: string;
    split: Split;
  };
  features: {
    past1mEvents: number;
    past1mDeathsBest: number;
    past1mCivilianDeaths: number;
    past3mEvents: number;
    past3mDeathsBest: number;
    past3mCivilianDeaths: number;
    past12mEvents: number;
    past12mDeathsBest: number;
    past12mCivilianDeaths: number;
    past12mActorTokenCount: number;
    past3mActorTokenCount: number;
    actorMemoryPersistence3m12m: number;
    monthsSinceLastEvent: number | null;
    eventMomentum3v12: number;
    deathMomentum3v12: number;
    stateBasedShare12m: number;
    nonStateShare12m: number;
    oneSidedShare12m: number;
    neighborPast1mEvents: number;
    neighborPast1mDeathsBest: number;
    neighborPast3mEvents: number;
    neighborPast3mDeathsBest: number;
    neighborEventMomentum3v12: number;
    acledPast1mEvents: number;
    acledPast1mFatalities: number;
    acledPast3mEvents: number;
    acledPast3mFatalities: number;
    acledPast12mEvents: number;
    acledPast12mFatalities: number;
    acledPoliticalViolenceShare12m: number;
    acledDemonstrationShare12m: number;
    acledEventMomentum3v12: number;
  };
  labels: {
    currentMonthHasOrganizedViolence: boolean;
    currentMonthEvents: number;
    currentMonthDeathsBest: number;
    currentMonthCivilianDeaths: number;
    currentMonthDeathBucket: "none" | "low" | "medium" | "high";
    labelSource: "ucdp_curated";
    sourceChecked: true;
  };
  mlUse: {
    canTrainOutcome: boolean;
    canEvaluateOutcome: boolean;
    canTrainImportance: false;
    importanceTruthStatus: "not_human_labeled";
    excludeReasons: string[];
  };
  provenance: {
    positiveSourceSystems: SourceSystem[];
    sourcePaths: string[];
    notes: string;
  };
}

interface ScoredRow {
  row: RiskWindowRecord;
  score: number;
}

const START_MONTH = "2010-01";
const END_MONTH_FALLBACK = "2026-05";
const RECORD_VERSION = "country-month-risk.2010.v1";
const SOURCE_PATHS = [
  "data/external/ucdp/ged_events_compact.jsonl",
  "data/external/ucdp_candidate/candidate_events_compact.jsonl",
];
const ACLED_AGGREGATE_PATH = "data/external/aceld/aceld_aggregates_compact.jsonl";
const OUTPUT_PATH = "data/training/risk_windows_country_month.jsonl";
const PROFILE_PATH = "data/training/risk_windows_country_month_profile.json";
const BASELINE_PATH = "data/eval/risk_windows_baseline_report.json";
const SAMPLE_PATH = "data/training/risk_windows_country_month_sample.jsonl";

function printHelp() {
  console.log(`HopeIndexAI risk-window builder

Usage:
  bun run risk:windows

Reads:
${SOURCE_PATHS.map((path) => `  ${path}`).join("\n")}
  ${ACLED_AGGREGATE_PATH} if present

Writes:
  ${OUTPUT_PATH}
  ${PROFILE_PATH}
  ${BASELINE_PATH}
  ${SAMPLE_PATH}
`);
}

function dateOnly(value: string | undefined): string {
  const match = String(value ?? "").match(/\d{4}-\d{2}-\d{2}/);
  return match ? match[0] : "";
}

function monthKey(date: string | undefined): string {
  const day = dateOnly(date);
  return day ? day.slice(0, 7) : "";
}

function monthIndex(month: string): number {
  const [year, m] = month.split("-").map(Number);
  return year * 12 + (m - 1);
}

function monthFromIndex(index: number): string {
  const year = Math.floor(index / 12);
  const month = index % 12 + 1;
  return `${year}-${String(month).padStart(2, "0")}`;
}

function addMonths(month: string, delta: number): string {
  return monthFromIndex(monthIndex(month) + delta);
}

function predictionMadeAt(month: string): string {
  return `${month}-01`;
}

function emptyAgg(): MonthAgg {
  return {
    sourceSystems: new Set(),
    events: 0,
    deathsBest: 0,
    civilianDeaths: 0,
    typeCounts: new Map(),
    actorTokens: new Set(),
  };
}

function emptyAcledAgg(): AcledMonthAgg {
  return {
    events: 0,
    fatalities: 0,
    politicalViolenceEvents: 0,
    demonstrationEvents: 0,
    strategicEvents: 0,
  };
}

function inc(map: Map<string, number>, key: string | number | null | undefined, amount = 1) {
  const normalized = String(key ?? "").trim() || "unknown";
  map.set(normalized, (map.get(normalized) ?? 0) + amount);
}

function addAgg(target: MonthAgg, source: MonthAgg) {
  for (const sourceSystem of source.sourceSystems) target.sourceSystems.add(sourceSystem);
  target.events += source.events;
  target.deathsBest += source.deathsBest;
  target.civilianDeaths += source.civilianDeaths;
  for (const [type, count] of source.typeCounts) inc(target.typeCounts, type, count);
  for (const token of source.actorTokens) target.actorTokens.add(token);
}

function addAcledAgg(target: AcledMonthAgg, source: AcledMonthAgg) {
  target.events += source.events;
  target.fatalities += source.fatalities;
  target.politicalViolenceEvents += source.politicalViolenceEvents;
  target.demonstrationEvents += source.demonstrationEvents;
  target.strategicEvents += source.strategicEvents;
}

function topEntries(map: Map<string, number>, limit: number): Record<string, number> {
  return Object.fromEntries([...map.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, limit));
}

function getOrCreateCountry(countries: Map<string, CountryAgg>, event: CompactConflictEvent): CountryAgg {
  const key = event.matching.countryKey;
  const existing = countries.get(key);
  if (existing) {
    existing.country = event.event.country || existing.country;
    existing.region = event.event.region || existing.region;
    return existing;
  }
  const created: CountryAgg = {
    countryKey: key,
    country: event.event.country,
    region: event.event.region,
    months: new Map(),
  };
  countries.set(key, created);
  return created;
}

function getOrCreateMonth(country: CountryAgg, month: string): MonthAgg {
  const existing = country.months.get(month);
  if (existing) return existing;
  const created = emptyAgg();
  country.months.set(month, created);
  return created;
}

function sourceSystemFromSchema(path: string, event: CompactConflictEvent): SourceSystem {
  if (event.dataset?.sourceSystem) return event.dataset.sourceSystem;
  return path.includes("ucdp_candidate") ? "ucdp_candidate" : "ucdp_ged";
}

function addEvent(countries: Map<string, CountryAgg>, path: string, event: CompactConflictEvent) {
  const month = monthKey(event.event.dateStart);
  if (!month || month < START_MONTH) return;

  const country = getOrCreateCountry(countries, event);
  const agg = getOrCreateMonth(country, month);
  const sourceSystem = sourceSystemFromSchema(path, event);
  agg.sourceSystems.add(sourceSystem);
  agg.events += 1;
  agg.deathsBest += Number(event.event.deaths.best) || 0;
  agg.civilianDeaths += Number(event.event.deaths.civilians) || 0;
  inc(agg.typeCounts, event.conflict.typeLabel);
  for (const token of event.matching.actorTokens ?? []) agg.actorTokens.add(token);
}

async function loadCountries(): Promise<{ countries: Map<string, CountryAgg>; maxMonth: string }> {
  const countries = new Map<string, CountryAgg>();
  let maxMonth = END_MONTH_FALLBACK;

  for (const path of SOURCE_PATHS) {
    const rl = createInterface({
      input: createReadStream(path, { encoding: "utf8" }),
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
        throw new Error(`Invalid JSONL in ${path} line ${lineNumber}: ${message}`);
      }
      const month = monthKey(event.event.dateStart);
      if (month > maxMonth) maxMonth = month;
      addEvent(countries, path, event);
    }
  }

  return { countries, maxMonth };
}

async function loadAcledAggregates(): Promise<Map<string, Map<string, AcledMonthAgg>>> {
  const byCountry = new Map<string, Map<string, AcledMonthAgg>>();
  if (!await Bun.file(ACLED_AGGREGATE_PATH).exists()) return byCountry;

  const rl = createInterface({
    input: createReadStream(ACLED_AGGREGATE_PATH, { encoding: "utf8" }),
    crlfDelay: Infinity,
  });

  let lineNumber = 0;
  for await (const line of rl) {
    lineNumber += 1;
    if (!line.trim()) continue;
    let row: AcledAggregateRow;
    try {
      row = JSON.parse(line) as AcledAggregateRow;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      throw new Error(`Invalid JSONL in ${ACLED_AGGREGATE_PATH} line ${lineNumber}: ${message}`);
    }

    const countryKey = row.matching?.countryKey;
    const month = monthKey(row.event?.week);
    if (!countryKey || !month || month < START_MONTH) continue;

    let countryMonths = byCountry.get(countryKey);
    if (!countryMonths) {
      countryMonths = new Map();
      byCountry.set(countryKey, countryMonths);
    }
    let agg = countryMonths.get(month);
    if (!agg) {
      agg = emptyAcledAgg();
      countryMonths.set(month, agg);
    }

    const events = Number(row.event.events) || 0;
    agg.events += events;
    agg.fatalities += Number(row.event.fatalities) || 0;
    const disorder = String(row.event.disorderType ?? "").toLowerCase();
    const eventType = String(row.event.eventType ?? "").toLowerCase();
    if (disorder.includes("political violence")) agg.politicalViolenceEvents += events;
    if (disorder.includes("demonstrations") || eventType.includes("protest") || eventType.includes("riot")) {
      agg.demonstrationEvents += events;
    }
    if (eventType.includes("strategic")) agg.strategicEvents += events;
  }

  return byCountry;
}

function buildRegionMonths(countries: Map<string, CountryAgg>): Map<string, Map<string, MonthAgg>> {
  const regions = new Map<string, Map<string, MonthAgg>>();
  for (const country of countries.values()) {
    let regionMonths = regions.get(country.region);
    if (!regionMonths) {
      regionMonths = new Map();
      regions.set(country.region, regionMonths);
    }
    for (const [month, agg] of country.months) {
      let regionAgg = regionMonths.get(month);
      if (!regionAgg) {
        regionAgg = emptyAgg();
        regionMonths.set(month, regionAgg);
      }
      addAgg(regionAgg, agg);
    }
  }
  return regions;
}

function sumAgg(country: CountryAgg, endExclusive: string, monthsBack: number): MonthAgg {
  const result = emptyAgg();
  const end = monthIndex(endExclusive);
  for (let i = end - monthsBack; i < end; i += 1) {
    const agg = country.months.get(monthFromIndex(i));
    if (!agg) continue;
    addAgg(result, agg);
  }
  return result;
}

function sumRegionExcludingCountry(
  regionMonths: Map<string, Map<string, MonthAgg>>,
  country: CountryAgg,
  endExclusive: string,
  monthsBack: number
): MonthAgg {
  const regionWindow = emptyAgg();
  const countryWindow = sumAgg(country, endExclusive, monthsBack);
  const months = regionMonths.get(country.region);
  if (!months) return regionWindow;

  const end = monthIndex(endExclusive);
  for (let i = end - monthsBack; i < end; i += 1) {
    const agg = months.get(monthFromIndex(i));
    if (!agg) continue;
    addAgg(regionWindow, agg);
  }

  regionWindow.events = Math.max(0, regionWindow.events - countryWindow.events);
  regionWindow.deathsBest = Math.max(0, regionWindow.deathsBest - countryWindow.deathsBest);
  regionWindow.civilianDeaths = Math.max(0, regionWindow.civilianDeaths - countryWindow.civilianDeaths);
  return regionWindow;
}

function sumAcledAgg(
  acledByCountry: Map<string, Map<string, AcledMonthAgg>>,
  countryKey: string,
  endExclusive: string,
  monthsBack: number
): AcledMonthAgg {
  const result = emptyAcledAgg();
  const countryMonths = acledByCountry.get(countryKey);
  if (!countryMonths) return result;
  const end = monthIndex(endExclusive);
  for (let i = end - monthsBack; i < end; i += 1) {
    const agg = countryMonths.get(monthFromIndex(i));
    if (!agg) continue;
    addAcledAgg(result, agg);
  }
  return result;
}

function monthsSinceLastEvent(country: CountryAgg, month: string): number | null {
  const current = monthIndex(month);
  for (let i = current - 1; i >= monthIndex(START_MONTH); i -= 1) {
    if ((country.months.get(monthFromIndex(i))?.events ?? 0) > 0) return current - i;
  }
  return null;
}

function share(typeCounts: Map<string, number>, key: string, total: number): number {
  if (total <= 0) return 0;
  return Number(((typeCounts.get(key) ?? 0) / total).toFixed(4));
}

function deathBucket(deaths: number): RiskWindowRecord["labels"]["currentMonthDeathBucket"] {
  if (deaths <= 0) return "none";
  if (deaths < 10) return "low";
  if (deaths < 100) return "medium";
  return "high";
}

function splitForMonth(month: string): Split {
  if (month <= "2022-12") return "train";
  if (month <= "2024-12") return "validation";
  if (month <= "2025-12") return "test";
  return "holdout_preliminary";
}

function buildRecord(
  country: CountryAgg,
  month: string,
  regionMonths: Map<string, Map<string, MonthAgg>>,
  acledByCountry: Map<string, Map<string, AcledMonthAgg>>
): RiskWindowRecord {
  const past1 = sumAgg(country, month, 1);
  const past3 = sumAgg(country, month, 3);
  const past12 = sumAgg(country, month, 12);
  const neighborPast1 = sumRegionExcludingCountry(regionMonths, country, month, 1);
  const neighborPast3 = sumRegionExcludingCountry(regionMonths, country, month, 3);
  const neighborPast12 = sumRegionExcludingCountry(regionMonths, country, month, 12);
  const acledPast1 = sumAcledAgg(acledByCountry, country.countryKey, month, 1);
  const acledPast3 = sumAcledAgg(acledByCountry, country.countryKey, month, 3);
  const acledPast12 = sumAcledAgg(acledByCountry, country.countryKey, month, 12);
  const current = country.months.get(month) ?? emptyAgg();
  const enoughHistory = monthIndex(month) - monthIndex(START_MONTH) >= 12;
  const sinceLast = monthsSinceLastEvent(country, month);
  const excludeReasons: string[] = [];
  if (!enoughHistory) excludeReasons.push("less_than_12_months_history");
  if (splitForMonth(month) === "holdout_preliminary") excludeReasons.push("candidate_2026_preliminary_not_final_test");
  if (!acledByCountry.has(country.countryKey)) excludeReasons.push("missing_acled_aggregate_country_match");

  return {
    schemaVersion: "risk-window.v1",
    recordId: `risk:country_month:${country.countryKey}:${month}`,
    recordVersion: RECORD_VERSION,
    window: {
      unit: "country_month",
      countryKey: country.countryKey,
      country: country.country,
      region: country.region,
      month,
      predictionMadeAt: predictionMadeAt(month),
      split: splitForMonth(month),
    },
    features: {
      past1mEvents: past1.events,
      past1mDeathsBest: past1.deathsBest,
      past1mCivilianDeaths: past1.civilianDeaths,
      past3mEvents: past3.events,
      past3mDeathsBest: past3.deathsBest,
      past3mCivilianDeaths: past3.civilianDeaths,
      past12mEvents: past12.events,
      past12mDeathsBest: past12.deathsBest,
      past12mCivilianDeaths: past12.civilianDeaths,
      past12mActorTokenCount: past12.actorTokens.size,
      past3mActorTokenCount: past3.actorTokens.size,
      actorMemoryPersistence3m12m: past12.actorTokens.size > 0
        ? Number((past3.actorTokens.size / past12.actorTokens.size).toFixed(4))
        : 0,
      monthsSinceLastEvent: sinceLast,
      eventMomentum3v12: Number((past3.events / 3 - past12.events / 12).toFixed(4)),
      deathMomentum3v12: Number((past3.deathsBest / 3 - past12.deathsBest / 12).toFixed(4)),
      stateBasedShare12m: share(past12.typeCounts, "state_based_armed_conflict", past12.events),
      nonStateShare12m: share(past12.typeCounts, "non_state_conflict", past12.events),
      oneSidedShare12m: share(past12.typeCounts, "one_sided_violence", past12.events),
      neighborPast1mEvents: neighborPast1.events,
      neighborPast1mDeathsBest: neighborPast1.deathsBest,
      neighborPast3mEvents: neighborPast3.events,
      neighborPast3mDeathsBest: neighborPast3.deathsBest,
      neighborEventMomentum3v12: Number((neighborPast3.events / 3 - neighborPast12.events / 12).toFixed(4)),
      acledPast1mEvents: acledPast1.events,
      acledPast1mFatalities: acledPast1.fatalities,
      acledPast3mEvents: acledPast3.events,
      acledPast3mFatalities: acledPast3.fatalities,
      acledPast12mEvents: acledPast12.events,
      acledPast12mFatalities: acledPast12.fatalities,
      acledPoliticalViolenceShare12m: acledPast12.events > 0
        ? Number((acledPast12.politicalViolenceEvents / acledPast12.events).toFixed(4))
        : 0,
      acledDemonstrationShare12m: acledPast12.events > 0
        ? Number((acledPast12.demonstrationEvents / acledPast12.events).toFixed(4))
        : 0,
      acledEventMomentum3v12: Number((acledPast3.events / 3 - acledPast12.events / 12).toFixed(4)),
    },
    labels: {
      currentMonthHasOrganizedViolence: current.events > 0,
      currentMonthEvents: current.events,
      currentMonthDeathsBest: current.deathsBest,
      currentMonthCivilianDeaths: current.civilianDeaths,
      currentMonthDeathBucket: deathBucket(current.deathsBest),
      labelSource: "ucdp_curated",
      sourceChecked: true,
    },
    mlUse: {
      canTrainOutcome: enoughHistory && splitForMonth(month) === "train",
      canEvaluateOutcome: enoughHistory && (splitForMonth(month) === "validation" || splitForMonth(month) === "test"),
      canTrainImportance: false,
      importanceTruthStatus: "not_human_labeled",
      excludeReasons,
    },
    provenance: {
      positiveSourceSystems: [...current.sourceSystems].sort(),
      sourcePaths: [...SOURCE_PATHS, ACLED_AGGREGATE_PATH],
      notes: "Country-month risk row. Features use only prior months; labels use the current month. ACLED aggregate features are trends only, not labels.",
    },
  };
}

function baselineScore(row: RiskWindowRecord): number {
  const recency = Math.log1p(row.features.past1mEvents) * 1.5;
  const recentDeaths = Math.log1p(row.features.past3mDeathsBest);
  const history = Math.log1p(row.features.past12mEvents) * 0.6;
  const momentum = Math.max(0, row.features.eventMomentum3v12) * 0.25;
  const acledTrend = Math.log1p(row.features.acledPast3mEvents) * 0.18;
  const spillover = Math.log1p(row.features.neighborPast3mDeathsBest) * 0.08;
  const actorMemory = Math.log1p(row.features.past3mActorTokenCount) * 0.12;
  const quietPenalty = row.features.monthsSinceLastEvent === null
    ? -1
    : -Math.min(1.5, row.features.monthsSinceLastEvent / 24);
  return recency + recentDeaths + history + momentum + acledTrend + spillover + actorMemory + quietPenalty;
}

function averagePrecision(scored: ScoredRow[]): number {
  const sorted = [...scored].sort((a, b) => b.score - a.score);
  const positives = sorted.filter((item) => item.row.labels.currentMonthHasOrganizedViolence).length;
  if (positives === 0) return 0;
  let seenPositive = 0;
  let precisionSum = 0;
  sorted.forEach((item, index) => {
    if (!item.row.labels.currentMonthHasOrganizedViolence) return;
    seenPositive += 1;
    precisionSum += seenPositive / (index + 1);
  });
  return precisionSum / positives;
}

function precisionRecallAtFraction(scored: ScoredRow[], fraction: number) {
  const sorted = [...scored].sort((a, b) => b.score - a.score);
  const k = Math.max(1, Math.round(sorted.length * fraction));
  const selected = sorted.slice(0, k);
  const positives = sorted.filter((item) => item.row.labels.currentMonthHasOrganizedViolence).length;
  const selectedPositive = selected.filter((item) => item.row.labels.currentMonthHasOrganizedViolence).length;
  return {
    fraction,
    selected: k,
    precision: Number((selectedPositive / k).toFixed(4)),
    recall: positives > 0 ? Number((selectedPositive / positives).toFixed(4)) : 0,
  };
}

function evaluateSplit(records: RiskWindowRecord[], split: Split) {
  const rows = records.filter((row) => row.window.split === split && !row.mlUse.excludeReasons.includes("less_than_12_months_history"));
  const scored = rows.map((row) => ({ row, score: baselineScore(row) }));
  const positives = rows.filter((row) => row.labels.currentMonthHasOrganizedViolence).length;
  const deaths = rows.reduce((sum, row) => sum + row.labels.currentMonthDeathsBest, 0);
  return {
    split,
    rows: rows.length,
    positives,
    prevalence: rows.length > 0 ? Number((positives / rows.length).toFixed(4)) : 0,
    deathsBest: deaths,
    averagePrecision: Number(averagePrecision(scored).toFixed(4)),
    top5Pct: precisionRecallAtFraction(scored, 0.05),
    top10Pct: precisionRecallAtFraction(scored, 0.1),
    top20Pct: precisionRecallAtFraction(scored, 0.2),
  };
}

async function writeJsonlStream(records: RiskWindowRecord[]) {
  const output = createWriteStream(OUTPUT_PATH, { encoding: "utf8" });
  let pendingDrain: Promise<void> | null = null;
  let waitingForDrain = false;

  for (const record of records) {
    if (!output.write(`${JSON.stringify(record)}\n`) && !waitingForDrain) {
      waitingForDrain = true;
      pendingDrain = once(output, "drain").then(() => {
        waitingForDrain = false;
        pendingDrain = null;
      });
    }
    if (pendingDrain) await pendingDrain;
  }

  output.end();
  await once(output, "finish");
}

async function main() {
  if (process.argv.includes("-h") || process.argv.includes("--help")) {
    printHelp();
    return;
  }

  const [{ countries, maxMonth }, acledByCountry] = await Promise.all([
    loadCountries(),
    loadAcledAggregates(),
  ]);
  const regionMonths = buildRegionMonths(countries);
  const endMonth = maxMonth || END_MONTH_FALLBACK;
  const records: RiskWindowRecord[] = [];
  const byRegion = new Map<string, number>();
  const byCountry = new Map<string, number>();
  const bySplit = new Map<string, number>();
  const byMonth = new Map<string, number>();

  for (const country of [...countries.values()].sort((a, b) => a.countryKey.localeCompare(b.countryKey))) {
    for (let i = monthIndex(START_MONTH); i <= monthIndex(endMonth); i += 1) {
      const month = monthFromIndex(i);
      const record = buildRecord(country, month, regionMonths, acledByCountry);
      records.push(record);
      inc(byRegion, record.window.region);
      inc(byCountry, record.window.country);
      inc(bySplit, record.window.split);
      inc(byMonth, month);
    }
  }

  await mkdir(dirname(OUTPUT_PATH), { recursive: true });
  await mkdir(dirname(BASELINE_PATH), { recursive: true });
  await writeJsonlStream(records);

  const positiveRows = records.filter((row) => row.labels.currentMonthHasOrganizedViolence).length;
  const profile = {
    schemaVersion: "risk-window-profile.v1",
    generatedAt: new Date().toISOString(),
    recordVersion: RECORD_VERSION,
    startMonth: START_MONTH,
    endMonth,
    sourcePaths: [...SOURCE_PATHS, ACLED_AGGREGATE_PATH],
    outputPath: OUTPUT_PATH,
    rows: records.length,
    countries: countries.size,
    acledAggregateCountriesMatched: [...countries.keys()].filter((key) => acledByCountry.has(key)).length,
    featureFamilies: [
      "ucdp_country_history",
      "ucdp_neighbor_region_spillover",
      "ucdp_actor_memory",
      "acled_aggregate_trends",
    ],
    positiveRows,
    prevalence: Number((positiveRows / Math.max(1, records.length)).toFixed(4)),
    trainableOutcomeRows: records.filter((row) => row.mlUse.canTrainOutcome).length,
    evaluableOutcomeRows: records.filter((row) => row.mlUse.canEvaluateOutcome).length,
    counts: {
      split: topEntries(bySplit, 10),
      region: topEntries(byRegion, 20),
      countryTop25: topEntries(byCountry, 25),
      monthRecent: Object.fromEntries([...byMonth.entries()].sort((a, b) => b[0].localeCompare(a[0])).slice(0, 24)),
    },
    notes: [
      "Each row is a country-month prediction problem: features are prior-month history, labels are current-month UCDP organized-violence outcomes.",
      "This is an outcome-risk dataset, not HopeIndexAI importance-label truth.",
      "Rows from 2026 use UCDP Candidate and are marked holdout_preliminary because Candidate releases can revise.",
      "ACLED aggregate features are trend/context features only; UCDP remains the outcome label source.",
    ],
  };

  const baselineReport = {
    schemaVersion: "risk-window-baseline-report.v1",
    generatedAt: new Date().toISOString(),
    datasetPath: OUTPUT_PATH,
    task: "Rank country-month windows by organized-violence risk using only prior UCDP history.",
    baseline: {
      name: "history_recency_momentum_score",
      formula: "log UCDP past-1m events + log UCDP past-3m deaths + log UCDP past-12m events + UCDP momentum + light ACLED trend + light neighbor spillover + light actor memory - quiet penalty",
    },
    splits: [
      evaluateSplit(records, "train"),
      evaluateSplit(records, "validation"),
      evaluateSplit(records, "test"),
      evaluateSplit(records, "holdout_preliminary"),
    ],
    notes: [
      "Average precision and top-percentile precision/recall are better than accuracy for this sparse risk-ranking task.",
      "This is the dumb baseline a learned model must beat before we trust it.",
    ],
  };

  const sample = records
    .filter((row) => row.window.month >= "2025-01" && row.labels.currentMonthHasOrganizedViolence)
    .slice(0, 40);

  await writeFile(PROFILE_PATH, `${JSON.stringify(profile, null, 2)}\n`);
  await writeFile(BASELINE_PATH, `${JSON.stringify(baselineReport, null, 2)}\n`);
  await writeFile(SAMPLE_PATH, sample.map((row) => JSON.stringify(row)).join("\n") + "\n");

  console.log("HopeIndexAI risk-window dataset build");
  console.log(`Rows written: ${records.length}`);
  console.log(`Countries: ${countries.size}`);
  console.log(`Month range: ${START_MONTH} to ${endMonth}`);
  console.log(`Positive rows: ${positiveRows}`);
  console.log(`Trainable outcome rows: ${profile.trainableOutcomeRows}`);
  console.log(`Evaluable outcome rows: ${profile.evaluableOutcomeRows}`);
  for (const split of baselineReport.splits) {
    console.log(`${split.split}: AP=${split.averagePrecision}, top10 precision=${split.top10Pct.precision}, top10 recall=${split.top10Pct.recall}`);
  }
  console.log(`Wrote ${OUTPUT_PATH}`);
  console.log(`Wrote ${PROFILE_PATH}`);
  console.log(`Wrote ${BASELINE_PATH}`);
}

main().catch((err) => {
  console.error("HopeIndexAI risk-window build failed:", err instanceof Error ? err.message : err);
  process.exit(1);
});
