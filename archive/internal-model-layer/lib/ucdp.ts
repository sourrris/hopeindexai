// Helpers for working with UCDP GED and UCDP Candidate data.
// These sources are fully autonomous: public CSV URLs, no API key.

export interface UcdpEvent {
  schemaVersion: string;
  externalId: string;
  relId: string;
  dataset: {
    sourceSystem: "ucdp_ged" | "ucdp_candidate";
    version: string;
    license: string;
    sourceUrl: string;
  };
  conflict: {
    id: string;
    name: string;
    dyadId: string;
    dyadName: string;
    typeOfViolence: number;
    typeLabel: string;
  };
  actors: {
    sideA: string;
    sideB: string;
  };
  event: {
    year: number;
    dateStart: string;
    dateEnd: string;
    country: string;
    countryId: number;
    region: string;
    locationName: string;
    description: string;
    coordinates: { lat: number; lon: number } | null;
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
    dateStartDay: number;
    dateEndDay: number;
    actorTokens: string[];
    coordinateCell: string | null;
  };
}

export interface UcdpMatch {
  eventId: string;
  ucdpEvent: UcdpEvent;
  score: number;
  distanceKm: number | null;
  dayDelta: number;
}

export interface SupervisedLabel {
  eventId: string;
  date: string;
  countryCode: string;
  label: 0 | 1;
  labelSource: "ucdp_ged" | "ucdp_candidate" | "ucdp_merged" | "ucdp_negative" | "phase1_human";
  confidence: number;
  matches: UcdpMatch[];
  deathsBest: number;
  deathsTotal: number;
}

const GDELT_TO_UCDP_COUNTRY: Record<string, string> = {
  AF: "Afghanistan",
  AG: "Algeria",
  AO: "Angola",
  AR: "Argentina",
  AS: "Australia",
  BA: "Bahrain",
  BC: "Botswana",
  BD: "Bangladesh",
  BE: "Belgium",
  BM: "Myanmar",
  BN: "Bahrain",
  BR: "Brazil",
  BU: "Bulgaria",
  BY: "Belarus",
  CB: "Cambodia",
  CD: "DR Congo",
  CE: "Sri Lanka",
  CF: "Central African Republic",
  CG: "Congo",
  CH: "China",
  CI: "Chile",
  CM: "Cameroon",
  CO: "Colombia",
  CS: "Costa Rica",
  CU: "Cuba",
  CY: "Cyprus",
  DA: "Denmark",
  DJ: "Djibouti",
  DR: "Dominican Republic",
  EG: "Egypt",
  ET: "Ethiopia",
  FR: "France",
  GA: "Gambia",
  GB: "United Kingdom",
  GH: "Ghana",
  GM: "Germany",
  GR: "Greece",
  GT: "Guatemala",
  GY: "Guyana",
  HK: "Hong Kong",
  HR: "Croatia",
  HU: "Hungary",
  ID: "Indonesia",
  IN: "India",
  IR: "Iran",
  IS: "Israel",
  IT: "Italy",
  IZ: "Iraq",
  JA: "Japan",
  JO: "Jordan",
  KE: "Kenya",
  KG: "Kyrgyzstan",
  KN: "North Korea",
  KS: "South Korea",
  KU: "Kuwait",
  KZ: "Kazakhstan",
  LA: "Laos",
  LE: "Lebanon",
  LY: "Libya",
  MA: "Morocco",
  MD: "Moldova",
  MG: "Mongolia",
  ML: "Mali",
  MO: "Morocco",
  MR: "Mauritania",
  MX: "Mexico",
  MY: "Malaysia",
  MZ: "Mozambique",
  NI: "Nigeria",
  NL: "Netherlands",
  NO: "Norway",
  NP: "Nepal",
  NZ: "New Zealand",
  PK: "Pakistan",
  PL: "Poland",
  QA: "Qatar",
  RO: "Romania",
  RS: "Russia",
  RW: "Rwanda",
  SA: "Saudi Arabia",
  SF: "South Africa",
  SL: "Sierra Leone",
  SO: "Somalia",
  SP: "Spain",
  SR: "Serbia",
  SU: "Sudan",
  SV: "El Salvador",
  SW: "Sweden",
  SY: "Syria",
  SZ: "Switzerland",
  TD: "Chad",
  TH: "Thailand",
  TI: "Tajikistan",
  TK: "Turkmenistan",
  TN: "Tunisia",
  TR: "Turkey",
  TS: "Tunisia",
  TT: "Trinidad and Tobago",
  TU: "Turkey",
  TW: "Taiwan",
  TX: "Turkmenistan",
  TZ: "Tanzania",
  UA: "Ukraine",
  UG: "Uganda",
  UK: "United Kingdom",
  UP: "Ukraine",
  US: "United States of America",
  UZ: "Uzbekistan",
  VE: "Venezuela",
  VM: "Vietnam",
  YE: "Yemen",
  YM: "Yemen",
  ZA: "Zambia",
  ZI: "Zimbabwe",
};

export function gdeltCountryToUcdp(countryCode: string): string | null {
  return GDELT_TO_UCDP_COUNTRY[countryCode.toUpperCase()] ?? null;
}

export function countryKey(country: string): string {
  return country.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
}

export function dayNumber(date: string): number | null {
  const ms = Date.parse(date);
  return Number.isFinite(ms) ? Math.floor(ms / 86_400_000) : null;
}

export function distanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const toRad = (n: number) => n * Math.PI / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a1 = toRad(lat1);
  const a2 = toRad(lat2);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a1) * Math.cos(a2) * Math.sin(dLon / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}

export function actorTokens(text: string): Set<string> {
  const stopwords = new Set([
    "AND", "THE", "FOR", "FROM", "WITH", "WITHOUT", "UNKNOWN", "GOVERNMENT",
    "GOVERNMENTS", "MILITARY", "FORCES", "ARMY", "POLICE", "CIVILIAN",
    "CIVILIANS", "STATE", "STATES", "UNITED", "NATIONAL", "LOCAL", "GROUP",
    "GROUPS", "OFFICER", "OFFICERS", "DEPUTY", "DEPUTIES", "CITY", "COUNTY",
    "MINISTER", "PRESIDENT", "OFFICIAL", "OFFICIALS", "OF", "IN", "ON", "AT",
  ]);
  return new Set(
    text
      .toUpperCase()
      .split(/[^A-Z0-9]+/)
      .filter((token) => token.length > 2 && !stopwords.has(token))
  );
}

export function loadUcdpEvents(path: string, text: string): UcdpEvent[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, index) => {
      try {
        return JSON.parse(line) as UcdpEvent;
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        throw new Error(`Invalid JSONL in ${path} on line ${index + 1}: ${message}`);
      }
    });
}

export interface UcdpIndex {
  byCountry: Map<string, UcdpEvent[]>;
  byCountryAndDay: Map<string, UcdpEvent[]>;
}

export function buildUcdpIndex(ucdpEvents: UcdpEvent[]): UcdpIndex {
  const byCountry = new Map<string, UcdpEvent[]>();
  const byCountryAndDay = new Map<string, UcdpEvent[]>();

  for (const ucdp of ucdpEvents) {
    const country = ucdp.matching.countryKey;
    if (!byCountry.has(country)) byCountry.set(country, []);
    byCountry.get(country)!.push(ucdp);

    // Index by each day in the event's date range (usually 1 day)
    for (let d = ucdp.matching.dateStartDay; d <= ucdp.matching.dateEndDay; d++) {
      const key = `${country}:${d}`;
      if (!byCountryAndDay.has(key)) byCountryAndDay.set(key, []);
      byCountryAndDay.get(key)!.push(ucdp);
    }
  }

  return { byCountry, byCountryAndDay };
}

export function matchEventToUcdp(
  event: {
    id: string;
    date: string;
    country: string;
    lat: number;
    lon: number;
    actor1: string;
    actor2: string;
  },
  ucdpEvents: UcdpEvent[] | UcdpIndex,
  options: {
    dateWindowDays?: number;
    maxDistanceKm?: number;
    minScore?: number;
  } = {}
): UcdpMatch[] {
  const { dateWindowDays = 3, maxDistanceKm = 300, minScore = 0.25 } = options;

  const ucdpCountry = gdeltCountryToUcdp(event.country);
  if (!ucdpCountry) return [];
  const targetCountryKey = countryKey(ucdpCountry);

  const eventDay = dayNumber(event.date);
  if (eventDay === null) return [];

  const eventActorTokens = actorTokens(`${event.actor1} ${event.actor2}`);

  // Use index if available, otherwise fall back to full scan.
  let candidates: UcdpEvent[];
  if (Array.isArray(ucdpEvents)) {
    candidates = ucdpEvents.filter((u) => u.matching.countryKey === targetCountryKey);
  } else {
    const candidateSet = new Set<UcdpEvent>();
    for (let d = eventDay - dateWindowDays; d <= eventDay + dateWindowDays; d++) {
      const key = `${targetCountryKey}:${d}`;
      const dayEvents = ucdpEvents.byCountryAndDay.get(key);
      if (dayEvents) {
        for (const u of dayEvents) candidateSet.add(u);
      }
    }
    candidates = [...candidateSet];
  }

  const matches: UcdpMatch[] = [];
  for (const ucdp of candidates) {
    const dayDelta = Math.min(
      Math.abs(eventDay - ucdp.matching.dateStartDay),
      Math.abs(eventDay - ucdp.matching.dateEndDay)
    );
    if (dayDelta > dateWindowDays) continue;

    const coords = ucdp.event.coordinates;
    let distanceKmValue: number | null = null;
    if (coords && Number.isFinite(event.lat) && Number.isFinite(event.lon)) {
      distanceKmValue = distanceKm(event.lat, event.lon, coords.lat, coords.lon);
      if (distanceKmValue > maxDistanceKm) continue;
    }

    // Score: temporal + spatial + actor overlap
    let score = 0;
    score += Math.max(0, 1 - dayDelta / dateWindowDays) * 0.35;
    if (distanceKmValue !== null) {
      score += Math.max(0, 1 - distanceKmValue / maxDistanceKm) * 0.35;
    } else {
      score += 0.10; // same country only
    }

    const ucdpActors = actorTokens(`${ucdp.actors.sideA} ${ucdp.actors.sideB}`);
    let sharedActors = 0;
    for (const token of ucdpActors) {
      if (eventActorTokens.has(token)) sharedActors++;
    }
    const actorOverlap = sharedActors / Math.max(1, Math.min(eventActorTokens.size, ucdpActors.size));
    score += actorOverlap * 0.30;

    if (score < minScore) continue;

    matches.push({
      eventId: event.id,
      ucdpEvent: ucdp,
      score,
      distanceKm: distanceKmValue,
      dayDelta,
    });
  }

  return matches.sort((a, b) => b.score - a.score);
}

export function buildSupervisedLabel(
  event: {
    id: string;
    date: string;
    country: string;
    lat: number;
    lon: number;
    actor1: string;
    actor2: string;
  },
  ucdpEvents: UcdpEvent[] | UcdpIndex,
  options?: {
    dateWindowDays?: number;
    maxDistanceKm?: number;
    minScore?: number;
    significantDeathThreshold?: number;
  }
): SupervisedLabel | null {
  const { significantDeathThreshold = 5 } = options ?? {};
  const matches = matchEventToUcdp(event, ucdpEvents, options);

  // If no UCDP match, label as negative (background noise / non-lethal event).
  if (matches.length === 0) {
    return {
      eventId: event.id,
      date: event.date,
      countryCode: event.country,
      label: 0,
      labelSource: "ucdp_negative",
      confidence: 0,
      matches: [],
      deathsBest: 0,
      deathsTotal: 0,
    };
  }

  const best = matches[0];
  const deathsBest = best.ucdpEvent.event.deaths.best;
  const deathsTotal = matches.reduce((sum, m) => sum + m.ucdpEvent.event.deaths.best, 0);

  // Positive only for significant lethal events (deaths >= threshold).
  // Low-death UCDP matches are treated as negative to avoid surfacing
  // every minor clash as a lead.
  return {
    eventId: event.id,
    date: event.date,
    countryCode: event.country,
    label: deathsBest >= significantDeathThreshold ? 1 : 0,
    labelSource: best.ucdpEvent.dataset.sourceSystem,
    confidence: best.score,
    matches: matches.slice(0, 5),
    deathsBest,
    deathsTotal,
  };
}
