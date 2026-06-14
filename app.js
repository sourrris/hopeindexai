// HopeIndexAI — React app (JSX, transpiled by Babel standalone)
// Data: GDELT Project  |  Map: Leaflet  |  Font: Geist

const { useState, useEffect, useRef, useMemo, useCallback } = React;

// ── Constants ─────────────────────────────────────────────────────────────────

const THEME_COLORS = {
  Diplomacy:     "#4F46E5",   // indigo
  Conflict:      "#EF4444",   // crimson red
  Econ:          "#D97706",   // deep amber
  Environment:   "#10B981",   // emerald green
  Humanitarian:  "#D946EF",   // vibrant magenta-pink
  Science:       "#06B6D4",   // bright cyan-teal
};

// CartoDB light tiles — forced white theme, noWrap prevents world repetition
const TILE_LIGHT = "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png";
const TILE_ATTR  = '© <a href="https://osm.org">OSM</a> © <a href="https://carto.com">CARTO</a>';

// Hard world bounds — no panning past the edge of the earth
const WORLD_BOUNDS = L.latLngBounds(L.latLng(-85, -180), L.latLng(85, 180));

const CONTINENTS  = ["All", "Americas", "Europe", "Middle East", "Africa", "Asia", "Oceania"];
const CATEGORIES  = ["All", "Diplomacy", "Conflict", "Econ", "Environment", "Humanitarian", "Science"];
const DAY_OPTIONS = [1, 3, 7, 30];
const DATA_SOURCES = [
  { value: "static", label: "Saved demo" },
  { value: "live", label: "Live feed" },
];
const RELATED_SIGNAL_MIN_SCORE = 42;

const GITHUB_URL = "https://github.com/sourrris/hopeindexai";
const ASSIGNMENT_STORAGE_KEY = "hopeindexai.assignmentDecisions.v1";

const ASSIGNMENT_THRESHOLDS = {
  assign: 72,
  watch: 52,
};

const RECOMMENDATION_META = {
  assign: { label: "Important", description: "Ask a person to check this source carefully." },
  watch: { label: "Watch", description: "Keep an eye on this until more evidence arrives." },
  dismiss: { label: "Ignore", description: "Treat this as weak or background noise for now." },
};

const DECISION_OPTIONS = [
  { value: "assign", label: "Important" },
  { value: "watch", label: "Watch" },
  { value: "dismiss", label: "Ignore" },
];

const QUEUE_MODES = [
  { value: "priority", label: "Priority" },
  { value: "uncertain", label: "Uncertain" },
  { value: "coverage", label: "Coverage gaps" },
];

const STRATEGIC_ACTORS = new Set([
  "US", "USA", "AMERICAN", "UNITED", "RUSSIA", "RUSSIAN", "UKRAINE", "KYIV", "KIEV",
  "NATO", "IRAN", "ISRAEL", "ISRAELI", "LEBANON", "HEZBOLLAH", "HAMAS", "CHINA",
  "CHINESE", "TAIWAN", "PAKISTAN", "INDIA", "TURKEY", "SYRIA", "GAZA",
]);

const RIPPLE_REGIONS = new Set(["Middle East", "Europe", "Africa", "Asia"]);

const ACTOR_STOPWORDS = new Set([
  "UNKNOWN", "GOVERNMENT", "MINISTRY", "STATE", "STATES", "UNITED", "NATIONAL",
  "INTERNATIONAL", "OFFICIAL", "OFFICIALS", "POLICE", "ADMINISTRATION",
  "PRESIDENT", "PRIME", "MINISTER", "CITY", "COUNTY", "LOCAL",
]);

function sourceHost(url) {
  if (!url) return "";
  try {
    return new URL(url).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return "";
  }
}

function actorTokens(event) {
  const raw = `${event.actor1 || ""} ${event.actor2 || ""}`.toUpperCase();
  return new Set(
    raw
      .split(/[^A-Z0-9]+/)
      .filter((token) => token.length > 2 && !ACTOR_STOPWORDS.has(token))
  );
}

function daysApart(a, b) {
  const aMs = Date.parse(a.date);
  const bMs = Date.parse(b.date);
  if (!Number.isFinite(aMs) || !Number.isFinite(bMs)) return null;
  return Math.abs(aMs - bMs) / 86400000;
}

function distanceKm(a, b) {
  if (![a.lat, a.lon, b.lat, b.lon].every(Number.isFinite)) return null;
  const toRad = (n) => n * Math.PI / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}

function eventTitle(event) {
  return event.actor1 !== "Unknown"
    ? `${event.actor1}${event.actor2 && event.actor2 !== "Unknown" ? " -> " + event.actor2 : ""}`
    : event.quadLabel;
}

function simpleEventTitle(event) {
  const title = eventTitle(event);
  const genericParts = [
    "ACTOR", "BUSINESS", "COMPANY", "MEDIA", "POLICE", "AUTHORITIES", "ADMINISTRATION",
    "COMMUNITY", "DETECTIVE", "FIGHTER", "PROTESTER", "RIOTER", "TEXAS", "FLORIDA",
    "AMERICAN", "UNITED KINGDOM", "UNITED STATES", "WRITER", "SAN DIEGO", "ASSAILANT",
    "POLICE PERSONNEL", "Material Conflict",
  ];
  if (genericParts.some((part) => title.includes(part)) || title.length < 5) {
    return `${event.theme || "Event"} signal in ${event.location || event.country || "unknown place"}`;
  }
  return title;
}

function eventTopicLabel(event) {
  if (event.theme === "Science" && event.quadClass === 4) return "Weak extracted topic";
  return event.theme || "Unclassified";
}

function gdeltClassExplanation(event) {
  if (event.quadClass === 4) {
    return "Raw GDELT bucket for physical/coercive actions. It is not specific enough to prove terrorism, war, or a real attack without source checking.";
  }
  if (event.quadClass === 3) {
    return "Raw GDELT bucket for verbal conflict such as accusations, warnings, threats, or criticism.";
  }
  if (event.quadClass === 2) {
    return "Raw GDELT bucket for material cooperation such as aid, agreements, visits, or concrete support.";
  }
  if (event.quadClass === 1) {
    return "Raw GDELT bucket for verbal cooperation such as statements, appeals, or diplomatic support.";
  }
  return "Raw GDELT bucket is missing or unknown.";
}

function simpleWarningText(warning) {
  return String(warning)
    .replace("Priority is close to an Assign/Watch/Dismiss threshold.", "The score is close to the line between choices.")
    .replace("Actor or event title is generic, so row parsing may be weak.", "The title is vague, so check the source carefully.")
    .replace("Single-mention signal; find another source before trusting it.", "Only one source mentioned this; look for another source.")
    .replace("GDELT rows are media-derived signals, not verified ground truth.", "This is a news-data signal, not confirmed truth.");
}

function eventSignalScore(event) {
  return Number.isFinite(event.surfaceScore) ? event.surfaceScore : null;
}

function formatSignalScore(event) {
  const score = eventSignalScore(event);
  return score === null ? "Unscored" : String(Math.round(score));
}

function rankSignalScore(event) {
  return eventSignalScore(event) ?? -Infinity;
}

function eventDisplayRadius(event) {
  return Number.isFinite(event.surfaceRadius) ? event.surfaceRadius : event.markerRadius;
}

function clampScore(value) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function severityPoints(severity) {
  if (severity === "critical") return 28;
  if (severity === "high") return 20;
  if (severity === "medium") return 11;
  return 4;
}

function hasStrategicActor(event) {
  return [...actorTokens(event)].some((token) => STRATEGIC_ACTORS.has(token));
}

function eventDangerScore(event) {
  const surface = eventSignalScore(event);
  const severity = event.severity === "critical" ? 16 : event.severity === "high" ? 11 : event.severity === "medium" ? 6 : 2;
  const conflict = event.quadClass === 4 ? 12 : event.quadClass === 3 ? 7 : 0;
  const goldstein = Number.isFinite(event.goldstein) ? Math.max(0, Math.abs(Math.min(0, event.goldstein)) * 2.2) : 0;
  const tone = Number.isFinite(event.avgTone) ? Math.max(0, Math.abs(Math.min(0, event.avgTone)) * 1.4) : 0;
  const mentions = Math.min(8, Math.log1p(Number(event.numMentions ?? 0)) * 1.7);
  const model = Number.isFinite(event.surfaceModelProbability) ? event.surfaceModelProbability * 6 : 0;
  return clampScore((surface ?? 0) * 0.22 + severity + conflict + goldstein + tone + mentions + model);
}

function eventRippleScore(event) {
  const reasons = event.surfaceReasons ?? [];
  let score = 8;
  if (hasStrategicActor(event)) score += 16;
  if (RIPPLE_REGIONS.has(event.continent)) score += 8;
  if (reasons.some((reason) => reason.includes("strategic actor"))) score += 12;
  if (reasons.some((reason) => reason.includes("high-risk regional"))) score += 10;
  if (reasons.some((reason) => reason.includes("diplomacy"))) score += 8;
  if (event.theme === "Conflict") score += 8;
  if (event.theme === "Humanitarian") score += 7;
  if (event.theme === "Econ") score += 12;
  if (event.actor1 !== "Unknown" && event.actor2 !== "Unknown" && event.actor1 !== event.actor2) score += 6;
  score += Math.min(7, Math.log1p(Number(event.surfaceClusterSize ?? 1)) * 2.4);
  score += Math.min(6, Math.log1p(Number(event.numMentions ?? 0)) * 1.2);
  return clampScore(score);
}

function eventMvpScore(event) {
  return clampScore(eventDangerScore(event) * 0.58 + eventRippleScore(event) * 0.42);
}

function eventImpactChannels(event) {
  const channels = [];
  if (event.theme === "Conflict" || event.quadClass === 4) channels.push("security");
  if (event.theme === "Humanitarian" || (event.surfaceReasons ?? []).some((reason) => reason.includes("humanitarian"))) channels.push("humanitarian");
  if (event.theme === "Diplomacy" || (event.surfaceReasons ?? []).some((reason) => reason.includes("diplomacy"))) channels.push("diplomacy");
  if (event.theme === "Econ" || /\b(TANKER|OIL|GAS|PORT|SHIPPING|MARKET|BANK|TRADE)\b/i.test(`${event.actor1} ${event.actor2} ${event.location}`)) channels.push("markets/supply");
  if ((event.surfaceReasons ?? []).some((reason) => reason.includes("public-safety") || reason.includes("governance"))) channels.push("governance");
  return channels.length ? channels.slice(0, 4) : ["monitor"];
}

function eventWhy(event) {
  const reasons = [];
  if (event.severity === "critical" || event.severity === "high") reasons.push(`${event.severity} severity`);
  if (event.quadClass === 4) reasons.push("material conflict signal");
  if (hasStrategicActor(event)) reasons.push("strategic actor involved");
  if ((event.surfaceReasons ?? []).some((reason) => reason.includes("high-risk regional"))) reasons.push("high-risk region");
  if (Number(event.numMentions ?? 0) >= 20) reasons.push(`${event.numMentions} media mentions`);
  if (Number(event.surfaceClusterSize ?? 0) > 1) reasons.push(`${event.surfaceClusterSize} related source rows`);
  return reasons.length ? reasons.slice(0, 5) : ["ranked by event severity, source signal, and model surface score"];
}

function assignmentPriority(event) {
  return clampScore(Number.isFinite(event.surfaceScore) ? event.surfaceScore : eventMvpScore(event));
}

function assignmentRecommendation(priority) {
  if (priority >= ASSIGNMENT_THRESHOLDS.assign) return "assign";
  if (priority >= ASSIGNMENT_THRESHOLDS.watch) return "watch";
  return "dismiss";
}

function displayReason(reason) {
  if (!reason) return "";
  return reason.startsWith("penalty: ")
    ? `Caveat: ${reason.slice("penalty: ".length)}`
    : reason;
}

function surfaceBandLabel(band) {
  if (band === "lead") return "Likely high-importance lead";
  if (band === "watch") return "Worth monitoring";
  return "Background or weak signal";
}

function eventSurfaceExplanation(event) {
  if (event.surfaceExplanation) return event.surfaceExplanation;
  const score = assignmentPriority(event);
  const band = score >= ASSIGNMENT_THRESHOLDS.assign ? "lead" : score >= ASSIGNMENT_THRESHOLDS.watch ? "watch" : "background";
  const boosts = (event.surfaceReasons ?? []).filter((reason) => !reason.startsWith("penalty: ")).map(displayReason);
  const penalties = (event.surfaceReasons ?? []).filter((reason) => reason.startsWith("penalty: ")).map((reason) => reason.slice("penalty: ".length));
  const caveats = assignmentWarnings(event);

  return {
    score,
    band,
    label: surfaceBandLabel(band),
    summary: `${surfaceBandLabel(band)} at ${score}/100.`,
    boosts,
    penalties,
    caveats,
  };
}

function eventUncertainty(event) {
  if (event.uncertainty) return event.uncertainty;
  const warnings = assignmentWarnings(event);
  const thresholdDistance = Math.min(
    Math.abs(assignmentPriority(event) - ASSIGNMENT_THRESHOLDS.assign),
    Math.abs(assignmentPriority(event) - ASSIGNMENT_THRESHOLDS.watch)
  );
  let score = 18 + warnings.length * 12;
  if (thresholdDistance <= 5) score += 14;
  if (Number(event.numMentions ?? 0) >= 20) score -= 6;
  score = clampScore(score);
  return {
    level: score >= 66 ? "high" : score >= 38 ? "medium" : "low",
    score,
    warnings,
    confidenceDrivers: [
      event.sourceUrl ? "Source URL is present." : null,
      Number(event.numMentions ?? 0) >= 20 ? `${event.numMentions} media mentions.` : null,
      Number(event.eventClusterSize ?? 0) > 1 ? `${event.eventClusterSize} likely incident-cluster rows.` : null,
    ].filter(Boolean),
  };
}

function assignmentReasonCodes(event) {
  const explanation = eventSurfaceExplanation(event);
  const surfaced = [
    ...(explanation.boosts ?? []),
    ...(explanation.penalties ?? []).map((penalty) => `Caveat: ${penalty}`),
  ].filter(Boolean);
  const fallback = eventWhy(event);
  return [...new Set([...surfaced, ...fallback])].slice(0, 7);
}

function assignmentWarnings(event) {
  const warnings = [];
  const reasons = (event.surfaceReasons ?? []).join(" ").toLowerCase();

  if (!event.sourceUrl) warnings.push("No source URL attached to this public row.");
  if (event.duplicateOf) warnings.push(`Duplicate row. Review representative event ${event.duplicateOf}.`);
  if (Number(event.numMentions ?? 0) <= 1) warnings.push("Single-mention signal; corroboration is weak.");
  if (reasons.includes("generic gdelt extraction")) warnings.push("Generic GDELT extraction may have weak actor or event parsing.");
  if (reasons.includes("background or source-mismatch")) warnings.push("Possible background article or source mismatch.");
  if (reasons.includes("local crime")) warnings.push("May be local crime rather than strategic geopolitical signal.");
  if (reasons.includes("entertainment/history")) warnings.push("May be entertainment or historical extraction noise.");
  if (reasons.includes("opinion/background")) warnings.push("Opinion or background source; avoid treating interpretation as fact.");
  if (event.eventClusterRole === "member") warnings.push("Likely same-incident cluster member; review the representative first.");
  if (event.uncertainty?.warnings?.length) warnings.push(...event.uncertainty.warnings);

  return [...new Set(warnings)].slice(0, 5);
}

function assignmentEvidenceGrade(event, warnings) {
  const hasSource = Boolean(event.sourceUrl);
  const mentions = Number(event.numMentions ?? 0);
  const severeWarning = warnings.some((warning) =>
    warning.includes("Duplicate") ||
    warning.includes("Generic") ||
    warning.includes("source mismatch") ||
    warning.includes("local crime") ||
    warning.includes("entertainment")
  );

  if (!hasSource || mentions <= 1 || severeWarning) return "thin";
  if (mentions >= 20 && Number(event.surfaceClusterSize ?? 0) > 1) return "strong";
  if (mentions >= 10 && !warnings.length) return "strong";
  return "partial";
}

function fallbackActiveLearning(event) {
  const priority = assignmentPriority(event);
  const uncertainty = eventUncertainty(event);
  const thresholdDistance = Math.min(
    Math.abs(priority - ASSIGNMENT_THRESHOLDS.assign),
    Math.abs(priority - ASSIGNMENT_THRESHOLDS.watch)
  );
  const score = clampScore(priority * 0.5 + uncertainty.score * 0.3 + Math.max(0, 16 - thresholdDistance * 1.8));
  return {
    score,
    reasons: [
      priority >= ASSIGNMENT_THRESHOLDS.assign ? "High-priority surfaced lead." : "Useful row for queue calibration.",
      uncertainty.score >= 66 ? "High uncertainty needs source checking." : null,
    ].filter(Boolean),
    components: { priority, uncertainty: uncertainty.score, threshold: Math.max(0, Math.round(16 - thresholdDistance * 1.8)), coverage: 0 },
  };
}

function assignmentPacket(event, queueMeta = {}) {
  const priority = assignmentPriority(event);
  const recommendation = assignmentRecommendation(priority);
  const warnings = assignmentWarnings(event);
  const activeLearning = queueMeta.activeLearning ?? fallbackActiveLearning(event);

  return {
    event,
    rank: queueMeta.rank,
    queueScore: queueMeta.queueScore ?? activeLearning.score,
    queueMode: queueMeta.mode ?? "priority",
    activeLearning,
    priority,
    recommendation,
    evidenceGrade: assignmentEvidenceGrade(event, warnings),
    danger: eventDangerScore(event),
    ripple: eventRippleScore(event),
    channels: eventImpactChannels(event),
    reasonCodes: assignmentReasonCodes(event),
    warnings,
    uncertainty: eventUncertainty(event),
    surfaceExplanation: eventSurfaceExplanation(event),
  };
}

function readAssignmentDecisions() {
  try {
    const raw = localStorage.getItem(ASSIGNMENT_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    return Object.fromEntries(
      Object.entries(parsed).filter(([, record]) =>
        record &&
        typeof record === "object" &&
        ["assign", "watch", "dismiss"].includes(record.decision)
      )
    );
  } catch {
    return {};
  }
}

function writeAssignmentDecisions(decisions) {
  try {
    localStorage.setItem(ASSIGNMENT_STORAGE_KEY, JSON.stringify(decisions));
  } catch {
    // Local storage can be disabled; the UI still works for the current session.
  }
}

function downloadAssignmentDecisions(decisions) {
  const rows = Object.values(decisions)
    .filter(Boolean)
    .sort((a, b) => String(a.decidedAt).localeCompare(String(b.decidedAt)));
  const payload = {
    exportVersion: "hopeindexai.assignmentDecisions.v1",
    exportedAt: new Date().toISOString(),
    storageKey: ASSIGNMENT_STORAGE_KEY,
    warning: "Prototype review notes only. These are not source-checked human ground-truth labels and do not modify eval files.",
    decisions: rows,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `hopeindexai-assignment-decisions-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function scoreRelatedSignal(target, candidate) {
  if (!target || !candidate || target.id === candidate.id) return null;

  let score = 0;
  const reasons = [];
  const contextReasons = [];
  const targetHost = sourceHost(target.sourceUrl);
  const candidateHost = sourceHost(candidate.sourceUrl);
  const days = daysApart(target, candidate);
  let hasAnchor = false;

  if (target.sourceUrl && candidate.sourceUrl && target.sourceUrl === candidate.sourceUrl) {
    score += 90;
    hasAnchor = true;
    reasons.push("same source article");
  } else if (targetHost && candidateHost && targetHost === candidateHost && days !== null && days <= 2) {
    score += 10;
    contextReasons.push(`same publisher: ${targetHost}`);
  }

  const sharedActors = [...actorTokens(target)].filter((token) => actorTokens(candidate).has(token));
  if (sharedActors.length) {
    score += Math.min(54, sharedActors.length * 36);
    hasAnchor = true;
    reasons.push(`shared actor: ${sharedActors.slice(0, 3).join(", ")}`);
  }

  if (target.country && candidate.country && target.country === candidate.country) {
    score += 8;
    contextReasons.push(`same country: ${target.country}`);
  }

  if (target.continent && candidate.continent && target.continent === candidate.continent) score += 2;

  if (target.theme && candidate.theme && target.theme === candidate.theme) {
    score += 6;
    contextReasons.push(`same theme: ${target.theme}`);
  }

  if (target.quadClass !== null && target.quadClass === candidate.quadClass) score += 3;

  if (days !== null) {
    if (days <= 1) {
      score += 4;
      contextReasons.push("same 24h cycle");
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
      reasons.push(`nearby location: ${Math.round(km)} km`);
    } else if (km <= 300 && days !== null && days <= 2) {
      score += 8;
      contextReasons.push(`${Math.round(km)} km away`);
    }
  }

  score += Math.min(10, Math.log10((candidate.numMentions || 0) + 1) * 4);

  if (!hasAnchor || score < RELATED_SIGNAL_MIN_SCORE || !reasons.length) return null;
  return { event: candidate, score, reasons: [...reasons, ...contextReasons].slice(0, 4) };
}

function findRelatedSignals(target, events, limit = 6) {
  return events
    .map((candidate) => scoreRelatedSignal(target, candidate))
    .filter(Boolean)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

// ── Icons ─────────────────────────────────────────────────────────────────────

function IconGithub() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z" />
    </svg>
  );
}

function IconChevron({ open }) {
  return (
    <svg
      width="13" height="13" viewBox="0 0 24 24"
      fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
      style={{ transform: open ? "rotate(0deg)" : "rotate(180deg)", transition: "transform 0.2s" }}
      aria-hidden="true"
    >
      <polyline points="18 15 12 9 6 15" />
    </svg>
  );
}

function IconExternalLink() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
      <polyline points="15 3 21 3 21 9" />
      <line x1="10" y1="14" x2="21" y2="3" />
    </svg>
  );
}

// ── Top bar ───────────────────────────────────────────────────────────────────

function TopBar({ globalHopeAverage, eventCount, activeView, onViewChange, dataSource }) {
  return (
    <header className="topbar" role="banner">
      <span className="topbar-brand">
        HopeIndex<span className="brand-suffix">AI</span>
      </span>

      <div className="topbar-center">
        <div className="view-tabs" role="tablist" aria-label="HopeIndex views">
          <button
            type="button"
            role="tab"
            aria-selected={activeView === "queue"}
            className={"view-tab" + (activeView === "queue" ? " on" : "")}
            onClick={() => onViewChange("queue")}
          >
            Review List
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeView === "events"}
            className={"view-tab" + (activeView === "events" ? " on" : "")}
            onClick={() => onViewChange("events")}
          >
            Map
          </button>
        </div>
        <div className="live-badge" role="status" aria-label={dataSource === "live" ? "Live GDELT feed loaded" : "Saved demo data loaded"}>
          <span className="live-dot" aria-hidden="true" />
          {dataSource === "live" ? "LIVE" : "DEMO"}
        </div>
        {eventCount > 0 && (
          <div className="topbar-stats">
            <span className="stat-pill hope">
              <span className="stat-dot hope" aria-hidden="true" />
              Average signal: {globalHopeAverage.toFixed(1)}/100
            </span>
            <span style={{ fontSize: 10, fontFamily: "var(--font-mono)", color: "var(--text-sec)", marginLeft: 2 }}>
              ({eventCount.toLocaleString()} rows)
            </span>
          </div>
        )}
      </div>

      <div className="topbar-right">
        <a
          href={GITHUB_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="gh-btn"
          aria-label="View HopeIndexAI on GitHub"
        >
          <IconGithub />
          HopeIndexAI
        </a>
      </div>
    </header>
  );
}

// ── Leaflet map ───────────────────────────────────────────────────────────────

function MapView({ events, selectedEvent, onSelectEvent }) {
  const containerRef = useRef(null);
  const mapRef       = useRef(null);
  const tileRef      = useRef(null);
  const layerRef     = useRef(null);

  // Init map once
  useEffect(() => {
    if (mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: [22, 12],
      zoom: 2,
      minZoom: 2,            // can't zoom out past one world
      maxZoom: 14,
      maxBounds: WORLD_BOUNDS,
      maxBoundsViscosity: 1.0,
      zoomControl: false,
      attributionControl: true,
    });

    L.control.zoom({ position: "bottomright" }).addTo(map);

    const addTile = () => {
      if (tileRef.current) map.removeLayer(tileRef.current);
      tileRef.current = L.tileLayer(TILE_LIGHT, {
        attribution: TILE_ATTR,
        subdomains: "abcd",
        maxZoom: 19,
        bounds: WORLD_BOUNDS,
        noWrap: true,        // prevents world-tile repetition
      }).addTo(map);
    };
    addTile();

    layerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Pan to selected event
  useEffect(() => {
    if (!selectedEvent || !mapRef.current) return;
    mapRef.current.setView(
      [selectedEvent.lat, selectedEvent.lon],
      Math.max(mapRef.current.getZoom(), 6),
      { animate: true, duration: 0.6 }
    );
  }, [selectedEvent]);

  // Redraw markers when events change
  useEffect(() => {
    if (!layerRef.current) return;
    layerRef.current.clearLayers();

    // Sort ascending so most significant render on top in SVG layer order
    const sorted = [...events].sort((a, b) => rankSignalScore(a) - rankSignalScore(b));

    // Top 5 surfaced events get an SVG pulse ring colored by theme
    const topEventIds = new Set(
      events
        .sort((a, b) => rankSignalScore(b) - rankSignalScore(a))
        .slice(0, 5)
        .map((e) => e.id)
    );

    for (const ev of sorted) {
      const fill    = THEME_COLORS[ev.theme] || "#4F46E5";
      const stroke  = "#FFFFFF";
      const opacity = ev.severity === "low" ? 0.60 : ev.severity === "medium" ? 0.76 : 0.90;
      const radius  = eventDisplayRadius(ev);

      const marker = L.circleMarker([ev.lat, ev.lon], {
        radius,
        fillColor:   fill,
        color:       stroke,
        weight:      1.5,
        fillOpacity: opacity,
      });

      const actorLine = ev.actor1 !== "Unknown"
        ? `${ev.actor1}${ev.actor2 !== "Unknown" ? " → " + ev.actor2 : ""}`
        : ev.quadLabel;

      marker.bindTooltip(
        `<strong>[${ev.theme}] ${actorLine}</strong><br/>${ev.location || ev.country}<br/>Signal: <strong>${formatSignalScore(ev)}</strong>`,
        { sticky: true, direction: "top", html: true }
      );
      marker.on("click", () => onSelectEvent(ev));
      layerRef.current.addLayer(marker);

      // Pulse ring: second circleMarker, transparent fill, animated via CSS
      if (topEventIds.has(ev.id)) {
        const ring = L.circleMarker([ev.lat, ev.lon], {
          radius,
          fillColor:   "transparent",
          color:       fill,
          weight:      1.8,
          fillOpacity: 0,
          className:   "pulse-ring-svg",
        });
        layerRef.current.addLayer(ring);
      }
    }
  }, [events, onSelectEvent]);

  return <div ref={containerRef} id="map" aria-label="Geopolitical event map" />;
}

// ── Map legend ────────────────────────────────────────────────────────────────

function MapLegend() {
  return (
    <div className="map-legend" aria-label="Map legend">
      {Object.entries(THEME_COLORS).map(([name, color]) => (
        <div className="legend-row" key={name}>
          <span className="legend-swatch" style={{ background: color }} />
          {name}
        </div>
      ))}
      <div className="legend-row" style={{ marginTop: 4, color: "var(--text-muted)", fontSize: 9 }}>
        Ring = Top significance
      </div>
    </div>
  );
}

// ── Filter panel ──────────────────────────────────────────────────────────────

function FilterPanel({ filters, onFilter, filteredEvents, selectedEvent, onSelectEvent, loading }) {
  const [open,  setOpen]  = useState(true);
  const [limit, setLimit] = useState(120);

  const visible = useMemo(() => filteredEvents.slice(0, limit), [filteredEvents, limit]);

  const setDays      = (d) => onFilter({ ...filters, days: d });
  const setContinent = (c) => onFilter({ ...filters, continent: c });
  const setCategory  = (cat) => onFilter({ ...filters, category: cat });
  const setSource    = (source) => onFilter({ ...filters, source });

  return (
    <aside className={`filter-panel${open ? "" : " collapsed"}`} aria-label="Event filters">
      <div className="filter-head" onClick={() => setOpen(!open)} aria-expanded={open}>
        <div className="filter-head-left">
          {open && <span className="filter-label">Filters</span>}
          {open && (
            <span className="filter-count-badge" aria-live="polite">
              {loading ? "…" : filteredEvents.length.toLocaleString()}
            </span>
          )}
        </div>
        <button className="filter-toggle-btn" aria-label={open ? "Collapse" : "Expand"}>
          <IconChevron open={open} />
        </button>
      </div>

      <div className="filter-body">
        <div className="filter-group">
          <div className="filter-group-label">Data</div>
          <div className="chip-row">
            {DATA_SOURCES.map((source) => (
              <button
                key={source.value}
                className={`chip${filters.source === source.value ? " on" : ""}`}
                onClick={() => setSource(source.value)}
                aria-pressed={filters.source === source.value}
              >{source.label}</button>
            ))}
          </div>
        </div>

        <div className="filter-group">
          <div className="filter-group-label">Range</div>
          <div className="chip-row">
            {DAY_OPTIONS.map((d) => (
              <button
                key={d}
                className={`chip${filters.days === d ? " on" : ""}`}
                onClick={() => setDays(d)}
                aria-pressed={filters.days === d}
              >{d}d</button>
            ))}
          </div>
        </div>

        <div className="filter-group">
          <div className="filter-group-label">Region</div>
          <div className="chip-row">
            {CONTINENTS.map((c) => (
              <button
                key={c}
                className={`chip${filters.continent === c ? " on" : ""}`}
                onClick={() => setContinent(c)}
                aria-pressed={filters.continent === c}
              >{c}</button>
            ))}
          </div>
        </div>

        <div className="filter-group">
          <div className="filter-group-label">Category</div>
          <div className="chip-row">
            {CATEGORIES.map((cat) => {
              const isOn = filters.category === cat;
              return (
                <button
                  key={cat}
                  className={`chip${isOn ? " on" : ""}`}
                  onClick={() => setCategory(cat)}
                  aria-pressed={isOn}
                  style={isOn && cat !== "All" ? { background: THEME_COLORS[cat], borderColor: THEME_COLORS[cat] } : {}}
                >{cat}</button>
              );
            })}
          </div>
        </div>

        {filteredEvents.length > 0 && (
          <>
            <div className="elist-header" aria-live="polite">
              {Math.min(limit, filteredEvents.length)} of {filteredEvents.length.toLocaleString()}
            </div>
            <div className="elist" role="list">
              {visible.map((ev) => (
                <EventRow
                  key={ev.id}
                  event={ev}
                  selected={selectedEvent?.id === ev.id}
                  onClick={() => onSelectEvent(ev)}
                />
              ))}
            </div>
            {filteredEvents.length > limit && (
              <button className="load-more" onClick={() => setLimit((l) => l + 120)}>
                + {(filteredEvents.length - limit).toLocaleString()} more
              </button>
            )}
          </>
        )}
      </div>
    </aside>
  );
}

function EventRow({ event, selected, onClick }) {
  const title = eventTitle(event);
  const signalScore = eventSignalScore(event);
  const scoreLabel = formatSignalScore(event);
  const hasScore = signalScore !== null;

  const scoreColor = !hasScore ? "#6B7280" : signalScore >= 72 ? "#DC2626" : signalScore >= 52 ? "#D97706" : "#6B7280";
  const scoreBg    = !hasScore ? "rgba(107,114,128,.12)" : signalScore >= 72 ? "rgba(239,68,68,.12)" : signalScore >= 52 ? "rgba(245,158,11,.12)" : "rgba(107,114,128,.12)";

  return (
    <div
      className={`erow${selected ? " sel" : ""}`}
      onClick={onClick}
      role="listitem"
      tabIndex={0}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onClick()}
      aria-selected={selected}
    >
      <span className={`edot ${event.theme}`} aria-hidden="true" style={{ background: THEME_COLORS[event.theme] || "#4F46E5" }} />
      <div className="erow-body">
        <div className="erow-title" title={title}>{title}</div>
        <div className="erow-meta">{event.location || event.country} · {event.date}</div>
      </div>
      <span className="hope-badge" title={event.surfaceReasons?.[0] || "Signal score"} style={{
        fontSize: "10px",
        fontFamily: "var(--font-mono)",
        fontWeight: "700",
        padding: "2px 6px",
        borderRadius: "4px",
        background: scoreBg,
        color: scoreColor,
        marginLeft: "8px",
        flexShrink: 0
      }}>
        {scoreLabel}
      </span>
    </div>
  );
}

// ── AI analysis ───────────────────────────────────────────────────────────────

function AiAnalysis({ event, apiKey }) {
  const [analysis, setAnalysis] = useState("");
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");

  const run = useCallback(async () => {
    setLoading(true);
    setError("");
    setAnalysis("");
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey, events: [event], mode: "detail" }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setAnalysis(data.analysis ?? "");
    } catch (err) {
      setError(err.message ?? "Analysis failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [event, apiKey]);

  return (
    <div className="ai-section">
      <div className="ai-section-header">
        <span className="ai-section-label">Causal Intelligence Probe</span>
        {!analysis && !loading && (
          <button className="ai-run-btn" onClick={run} disabled={loading}>
            Run Deep Probe
          </button>
        )}
        {analysis && (
          <button className="ai-rerun-btn" onClick={run} disabled={loading} aria-label="Re-run analysis">
            ↺
          </button>
        )}
      </div>
      {loading && (
        <div className="ai-thinking">
          <span className="ai-thinking-dot" />
          Building evidence pack and related signals...
        </div>
      )}
      {error && <div className="ai-error">{error}</div>}
      {analysis && <div className="ai-output">{analysis}</div>}
    </div>
  );
}

function LinkedSignals({ event, events, onSelectEvent }) {
  const related = useMemo(() => findRelatedSignals(event, events), [event, events]);

  if (!related.length) return null;

  return (
    <div className="linked-signals">
      <div className="linked-signals-head">
          <div>
            <div className="linked-signals-label">Linked Signals</div>
            <div className="linked-signals-sub">Only rows with a shared source, actor, or nearby same-week location</div>
        </div>
        <span className="linked-signals-count">{related.length}</span>
      </div>

      <div className="linked-signals-list">
        {related.map((signal) => {
          const rel = signal.event;
          const color = THEME_COLORS[rel.theme] || "#4F46E5";
          return (
            <button
              key={rel.id}
              type="button"
              className="linked-signal"
              onClick={() => onSelectEvent(rel)}
            >
              <span className="linked-signal-dot" style={{ background: color }} aria-hidden="true" />
              <span className="linked-signal-main">
                <span className="linked-signal-title">{eventTitle(rel)}</span>
                <span className="linked-signal-meta">{rel.date} · {rel.location || rel.country}</span>
                <span className="linked-signal-reason">{signal.reasons.join(" · ")}</span>
              </span>
              <span className="linked-signal-score">{Math.round(signal.score)}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function IntelPacket({ event, dataSource }) {
  const [probe, setProbe] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!event?.id) return;
    const ctrl = new AbortController();
    setProbe(null);
    setError("");
    setLoading(true);

    fetch(`/api/probe?id=${encodeURIComponent(event.id)}&source=${dataSource ?? "static"}`, { signal: ctrl.signal })
      .then((r) => r.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setProbe(data.probe ?? null);
      })
      .catch((err) => {
        if (err.name !== "AbortError") setError(err.message ?? "Probe failed.");
      })
      .finally(() => {
        if (!ctrl.signal.aborted) setLoading(false);
      });

    return () => ctrl.abort();
  }, [event?.id]);

  if (loading) {
    return (
      <div className="intel-packet">
        <div className="intel-head">
          <div className="intel-label">Intel Packet</div>
          <span className="intel-status">Building</span>
        </div>
        <div className="intel-muted">Linking evidence, actors, impact paths, and watch signals...</div>
      </div>
    );
  }

  if (error || !probe) {
    return (
      <div className="intel-packet">
        <div className="intel-head">
          <div className="intel-label">Intel Packet</div>
          <span className="intel-status weak">Thin</span>
        </div>
        <div className="intel-muted">{error || "No probe available."}</div>
      </div>
    );
  }

  const topImpacts = [...(probe.impactMap || [])].sort((a, b) => b.score - a.score).slice(0, 4);
  const topHypotheses = (probe.hypotheses || []).slice(0, 2);
  const topActor = probe.actorGame?.[0];
  const prediction = probe.prediction;

  return (
    <div className="intel-packet">
      <div className="intel-head">
        <div>
          <div className="intel-label">Intel Packet</div>
          <div className="intel-sub">
            {probe.source?.title || probe.source?.domain || "GDELT evidence graph"}
          </div>
        </div>
        <span className={`intel-status ${probe.evidenceGrade?.label || "partial"}`}>
          {probe.evidenceGrade?.label || "partial"} {probe.evidenceGrade?.confidence ?? "--"}%
        </span>
      </div>

      {prediction && (
        <div className="intel-block model-prediction">
          <div className="intel-block-label">Trained Prediction</div>
          <div className="model-risk-head">
            <div>
              <div className={`model-risk-value ${prediction.label}`}>{Math.round(prediction.probability * 100)}%</div>
              <div className="model-risk-sub">critical escalation risk in 72h</div>
            </div>
            <div className="model-metrics">
              <span>Test AUC {Math.round((prediction.metrics?.auc || 0) * 100)}%</span>
              <span>Accuracy {Math.round((prediction.metrics?.accuracy || 0) * 100)}%</span>
            </div>
          </div>
          <div className="model-driver-list">
            {(prediction.drivers || []).slice(0, 4).map((driver) => (
              <div className="model-driver" key={driver.feature}>
                <span>{driver.feature.replaceAll("_", " ")}</span>
                <strong>{driver.direction}</strong>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="intel-grid">
        <div className="intel-block">
          <div className="intel-block-label">Impact Map</div>
          <div className="impact-bars">
            {topImpacts.map((impact) => (
              <div className="impact-row" key={impact.key}>
                <div className="impact-row-top">
                  <span>{impact.label}</span>
                  <span>{impact.score}</span>
                </div>
	                <div className="impact-track" aria-hidden="true">
	                  <span
	                    className={`impact-fill ${impact.direction}`}
	                    style={{ width: `${Math.max(4, Math.min(100, impact.score))}%` }}
	                  />
	                </div>
	                <div className="intel-muted" style={{ marginTop: 6 }}>{impact.rationale}</div>
	              </div>
            ))}
          </div>
        </div>

        <div className="intel-block">
          <div className="intel-block-label">Cause Hypotheses</div>
          <div className="hypothesis-list">
            {topHypotheses.map((hypothesis) => (
              <div className="hypothesis-row" key={hypothesis.title}>
                <span>{hypothesis.title}</span>
                <strong>{hypothesis.confidence}%</strong>
              </div>
            ))}
          </div>
        </div>
      </div>

      {topActor && (
        <div className="intel-block actor-game">
          <div className="intel-block-label">Actor Game</div>
          <div className="actor-game-title">{topActor.actor}</div>
          <div className="actor-game-line">{topActor.incentives?.[0]}</div>
          <div className="actor-game-line muted">{topActor.decisionTraps?.join(", ")}</div>
        </div>
      )}

      <div className="intel-block watchlist">
        <div className="intel-block-label">Watchlist</div>
        {(probe.watchlist || []).slice(0, 4).map((item) => (
          <div className="watch-item" key={item}>{item}</div>
        ))}
      </div>

      {!!probe.uncertaintyWarnings?.length && (
        <div className="intel-warning">{probe.uncertaintyWarnings[0]}</div>
      )}
    </div>
  );
}

// ── Event detail ──────────────────────────────────────────────────────────────

function EventDetail({ event, events, onClose, onSelectEvent, apiKey, aiReady, dataSource }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const title = eventTitle(event);

  const hopeScore = event.hopeScore ?? 50;
  const strokeDash = (hopeScore / 100) * 125.6; // circumference (2 * PI * R where R=20 is 125.6)

  return (
    <>
      <div className="detail-backdrop" onClick={onClose} aria-hidden="true" />
      <section className="detail-panel" role="dialog" aria-modal="true" aria-label="Event detail">
        <div className={`detail-bar ${event.theme}`} style={{ background: THEME_COLORS[event.theme] || "#4F46E5" }} />
        <button className="detail-close" onClick={onClose} aria-label="Close">✕</button>

        <div className="detail-body">
          <div className={`detail-cat ${event.theme}`} style={{ color: THEME_COLORS[event.theme] || "#4F46E5" }}>
            Topic estimate: {eventTopicLabel(event)} · Raw GDELT: {event.quadLabel}
          </div>
          <div className="intel-muted" style={{ marginTop: -8, marginBottom: 14 }}>
            {gdeltClassExplanation(event)}
          </div>
          <h2 className="detail-title">{title}</h2>

          {/* Pre-generated AI Summary Card */}
          {event.aiSummary && (
            <div className="ai-summary-box">
              <div className="ai-summary-title">
                <span className="ai-summary-sparkle" style={{ background: THEME_COLORS[event.theme] }} />
                AI Summary
              </div>
              <div className="ai-summary-text">{event.aiSummary}</div>
              {event.aiReasoning && (
                <div className="ai-summary-reasoning">
                  <strong>Assessment:</strong> {event.aiReasoning}
                </div>
              )}
            </div>
          )}

          {/* Signal triage gauge */}
          <div style={{ marginBottom: 24 }}>
            <div className="dfield-label">Signal Triage Analysis</div>
            <div className="hope-gauge-container">
              <div className="hope-gauge-circle">
                <svg className="hope-gauge-svg" viewBox="0 0 48 48">
                  <circle className="hope-gauge-bg" cx="24" cy="24" r="20" />
                  <circle
                    className="hope-gauge-fill"
                    cx="24"
                    cy="24"
                    r="20"
                    strokeDasharray={`${strokeDash} 125.6`}
                    style={{ stroke: THEME_COLORS[event.theme] || "#4F46E5" }}
                  />
                </svg>
                <span className="hope-gauge-value">{hopeScore}</span>
              </div>
              <div className="hope-gauge-body">
                <div className="hope-gauge-title" style={{ color: THEME_COLORS[event.theme] }}>
                  {hopeScore >= 70 ? "Constructive Signal" : hopeScore < 40 ? "High-Risk Signal" : "Mixed Signal"}
                </div>
                <div className="hope-gauge-desc">
                  Triage score combining event tone, severity, coverage, and surfacing context. It is a ranking aid, not certainty.
                </div>
              </div>
            </div>
          </div>

          <div className="detail-fields">
            {event.actor1 !== "Unknown" && (
              <div>
                <div className="dfield-label">Actors</div>
                <div className="dfield-val">
                  {event.actor1}{event.actor2 !== "Unknown" && <> → {event.actor2}</>}
                </div>
              </div>
            )}
            <div>
              <div className="dfield-label">Location</div>
              <div className="dfield-val">{event.location || event.country}</div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-muted)", marginTop: 2 }}>
                {event.lat.toFixed(4)}, {event.lon.toFixed(4)}
              </div>
            </div>
            <div>
              <div className="dfield-label">Date</div>
              <div className="dfield-val">{event.date}</div>
            </div>

            <div style={{ display: "flex", gap: "20px" }}>
              <div style={{ flex: 1 }}>
                <div className="dfield-label">Goldstein Scale</div>
                <div className="dfield-val">{event.goldstein !== null ? event.goldstein.toFixed(1) : "n/a"}</div>
              </div>
              <div style={{ flex: 1 }}>
                <div className="dfield-label">Average Tone</div>
                <div className="dfield-val" style={{ color: event.avgTone < 0 ? "var(--theme-conflict)" : "var(--theme-science)" }}>
                  {event.avgTone !== null ? event.avgTone.toFixed(2) : "n/a"}
                </div>
              </div>
            </div>

            {event.numMentions > 0 && (
              <div>
                <div className="dfield-label">Coverage Significance</div>
                <div className="dfield-val">{event.numMentions.toLocaleString()} media mentions</div>
              </div>
            )}
          </div>

          {event.sourceUrl && (
            <a href={event.sourceUrl} target="_blank" rel="noopener noreferrer" className="detail-link">
              Source Article <IconExternalLink />
            </a>
          )}

          <IntelPacket event={event} dataSource={dataSource} />

          <LinkedSignals event={event} events={events} onSelectEvent={onSelectEvent} />

          <div className="ai-divider" />

          {aiReady ? (
            <AiAnalysis event={event} apiKey={apiKey} />
          ) : (
            <div className="ai-no-key">
              <div className="ai-no-key-eyebrow">On-Demand Causal Probe</div>
              <div className="ai-no-key-heading">Unlock evidence-linked event probes.</div>
              <div className="ai-no-key-body">
                Use LM Studio on localhost:1234 (default) or connect an Anthropic API key to fetch source evidence,
                connect related events, and generate cause hypotheses, actor incentives, impact paths, and
                evidence-bounded scenario outlooks.
              </div>
              <a
                href={GITHUB_URL + "#ai-analysis"}
                target="_blank"
                rel="noopener noreferrer"
                className="ai-setup-link"
              >
                Setup guide →
              </a>
            </div>
          )}
        </div>
      </section>
    </>
  );
}

// ── Risk windows ─────────────────────────────────────────────────────────────

function pct(value) {
  return Number.isFinite(value) ? `${(value * 100).toFixed(1)}%` : "n/a";
}

function metricValue(value) {
  return Number.isFinite(value) ? value.toFixed(4) : "n/a";
}

function RiskWindowsView() {
  const [champion, setChampion] = useState(null);
  const [windows, setWindows] = useState([]);
  const [selectedWindow, setSelectedWindow] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");

    Promise.all([
      fetch("/api/risk-champion").then((r) => r.json()),
      fetch("/api/risk-windows?split=holdout_preliminary&limit=40").then((r) => r.json()),
    ])
      .then(([championData, windowData]) => {
        if (cancelled) return;
        if (championData.error) throw new Error(championData.error);
        if (windowData.error) throw new Error(windowData.error);
        const nextWindows = windowData.windows ?? [];
        setChampion(championData);
        setWindows(nextWindows);
        setSelectedWindow(nextWindows[0] ?? null);
      })
      .catch((err) => { if (!cancelled) setError(err.message ?? "Failed to load risk windows."); })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, []);

  const metrics = champion?.champion?.currentMetrics ?? {};
  const gate = champion?.champion?.promotionGate ?? {};
  const bestChallenger = champion?.latestResearch?.bestChallenger;

  return (
    <section className="risk-view" aria-label="Risk windows">
      <div className="risk-head">
        <div>
          <div className="risk-kicker">Country-month triage</div>
          <h1>Ranked windows that deserve analyst attention</h1>
          <p>
            The model sees only prior months. It ranks messy country-month records before the answer key arrives.
          </p>
        </div>
        <div className="risk-model-card">
          <div className="risk-card-label">Active champion</div>
          <div className="risk-champion-id">{champion?.champion?.championId ?? "loading"}</div>
          <div className="risk-card-note">{champion?.caveat ?? "Loading model evidence."}</div>
        </div>
      </div>

      {error && <div className="risk-error" role="alert">{error}</div>}

      <div className="risk-metrics">
        <div className="risk-metric">
          <span>Validation AP</span>
          <strong>{metricValue(metrics.validationAveragePrecision)}</strong>
        </div>
        <div className="risk-metric">
          <span>Test AP</span>
          <strong>{metricValue(metrics.testAveragePrecision)}</strong>
        </div>
        <div className="risk-metric">
          <span>2026 prelim AP</span>
          <strong>{metricValue(metrics.holdoutPreliminaryAveragePrecision)}</strong>
        </div>
        <div className="risk-metric">
          <span>Top 10 precision</span>
          <strong>{pct(metrics.testTop10Precision)}</strong>
        </div>
        <div className="risk-metric wide">
          <span>Promotion rule</span>
          <strong>
            Beat validation {metricValue(gate.requiredValidationAveragePrecisionGreaterThan)} and test {metricValue(gate.requiredTestAveragePrecisionGreaterThan)}
          </strong>
        </div>
      </div>

      {bestChallenger && (
        <div className="risk-research-strip">
          <span>Latest challenger: <strong>{bestChallenger.id}</strong></span>
          <span>validation {metricValue(bestChallenger.validationAveragePrecision)}</span>
          <span>test {metricValue(bestChallenger.testAveragePrecision)}</span>
          <span className={bestChallenger.promoted ? "promoted" : "held"}>{bestChallenger.promoted ? "promoted" : "held back"}</span>
        </div>
      )}

      <div className="risk-grid">
        <div className="risk-table-wrap">
          <div className="risk-section-head">
            <span>Top 2026 preliminary windows</span>
            <span>{loading ? "loading" : `${windows.length} shown`}</span>
          </div>
          <div className="risk-table" role="table" aria-label="Ranked risk windows">
            <div className="risk-row risk-row-head" role="row">
              <span>Rank</span>
              <span>Country-month</span>
              <span>Score</span>
              <span>Observed</span>
            </div>
            {windows.map((item) => (
              <button
                type="button"
                key={item.recordId}
                className={"risk-row" + (selectedWindow?.recordId === item.recordId ? " selected" : "")}
                onClick={() => setSelectedWindow(item)}
                role="row"
              >
                <span>#{item.rank}</span>
                <span>
                  <strong>{item.country}</strong>
                  <em>{item.month} · {item.region}</em>
                </span>
                <span>{item.riskScore.toFixed(3)}</span>
                <span className={item.actual.organizedViolence ? "hit" : "miss"}>
                  {item.actual.organizedViolence ? `${item.actual.events} events` : "not yet"}
                </span>
              </button>
            ))}
          </div>
        </div>

        <aside className="risk-detail-card">
          {selectedWindow ? (
            <>
              <div className="risk-section-head">
                <span>Why this ranked high</span>
                <span>#{selectedWindow.rank}</span>
              </div>
              <h2>{selectedWindow.country} · {selectedWindow.month}</h2>
              <div className="risk-score-big">{selectedWindow.riskScore.toFixed(3)}</div>
              <div className="risk-outcome">
                <span>Observed answer key</span>
                <strong>
                  {selectedWindow.actual.organizedViolence
                    ? `${selectedWindow.actual.events} events, ${selectedWindow.actual.deathsBest} deaths`
                    : "No organized violence in current label snapshot"}
                </strong>
              </div>
              <div className="risk-driver-list">
                {selectedWindow.drivers.map((driver) => (
                  <div className="risk-driver" key={driver.label}>
                    <span>{driver.label}</span>
                    <strong>{driver.value}</strong>
                  </div>
                ))}
              </div>
              <p className="risk-caveat">
                If a high-ranked row is marked "not yet," treat that as an analyst review queue item, not proof the model failed. Current-year labels can arrive late.
              </p>
            </>
          ) : (
            <div className="risk-empty">Select a row to inspect its evidence.</div>
          )}
        </aside>
      </div>
    </section>
  );
}

// ── Assignment queue ─────────────────────────────────────────────────────────

function ScoreBar({ label, value, tone }) {
  return (
    <div className="scorebar">
      <div className="scorebar-head">
        <span>{label}</span>
        <strong>{value}</strong>
      </div>
      <div className="scorebar-track">
        <div className={"scorebar-fill " + (tone || "")} style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

function QueueFilterGroup({ label, options, value, onChange, colorize }) {
  return (
    <div className="queue-filter-group">
      <span>{label}</span>
      <div className="chip-row">
        {options.map((option) => {
          const isOn = value === option;
          return (
            <button
              type="button"
              key={option}
              className={`chip${isOn ? " on" : ""}`}
              onClick={() => onChange(option)}
              aria-pressed={isOn}
              style={isOn && colorize && option !== "All" ? { background: THEME_COLORS[option], borderColor: THEME_COLORS[option] } : {}}
            >
              {typeof option === "number" ? `${option}d` : option}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function QueueModeGroup({ value, onChange }) {
  return (
    <div className="queue-filter-group queue-mode-group">
      <span>Queue mode</span>
      <div className="chip-row">
        {QUEUE_MODES.map((mode) => {
          const isOn = value === mode.value;
          return (
            <button
              type="button"
              key={mode.value}
              className={`chip${isOn ? " on" : ""}`}
              onClick={() => onChange(mode.value)}
              aria-pressed={isOn}
            >
              {mode.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function QueueFilterBar({ filters, onFilter, loading, resultCount, decisionCount, onExport, queueMode, onQueueMode }) {
  const setDays = (days) => onFilter({ ...filters, days });
  const setContinent = (continent) => onFilter({ ...filters, continent });
  const setCategory = (category) => onFilter({ ...filters, category });
  const setSource = (source) => onFilter({ ...filters, source });

  return (
    <div className="queue-filter-bar" aria-label="Assignment queue filters">
      <QueueFilterGroup label="Data" options={DATA_SOURCES.map((source) => source.label)} value={DATA_SOURCES.find((source) => source.value === filters.source)?.label ?? "Saved demo"} onChange={(label) => setSource(DATA_SOURCES.find((source) => source.label === label)?.value ?? "static")} />
      <QueueFilterGroup label="Range" options={DAY_OPTIONS} value={filters.days} onChange={setDays} />
      <QueueFilterGroup label="Region" options={CONTINENTS} value={filters.continent} onChange={setContinent} />
      <QueueFilterGroup label="Topic" options={CATEGORIES} value={filters.category} onChange={setCategory} colorize />
      <div className="queue-export-box">
        <span>{loading ? "loading" : `${resultCount} best picks`} · {decisionCount} saved choices</span>
        <button type="button" onClick={onExport} disabled={decisionCount === 0}>
          Download choices
        </button>
      </div>
    </div>
  );
}

function ReviewerCopilotPanel({ event, apiKey, aiReady }) {
  const [probe, setProbe] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [draftNote, setDraftNote] = useState("");
  const [draftLoading, setDraftLoading] = useState(false);
  const [draftError, setDraftError] = useState("");

  useEffect(() => {
    if (!event?.id) return;
    const ctrl = new AbortController();
    setProbe(null);
    setError("");
    setDraftNote("");
    setDraftError("");
    setLoading(true);

    fetch(`/api/probe?id=${encodeURIComponent(event.id)}`, { signal: ctrl.signal })
      .then((r) => r.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setProbe(data.probe ?? null);
      })
      .catch((err) => {
        if (err.name !== "AbortError") setError(err.message ?? "Copilot failed.");
      })
      .finally(() => {
        if (!ctrl.signal.aborted) setLoading(false);
      });

    return () => ctrl.abort();
  }, [event?.id]);

  const draftReviewNote = useCallback(async () => {
    if (!event) return;
    setDraftLoading(true);
    setDraftError("");
    setDraftNote("");

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey, events: [event], mode: "review_note" }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setDraftNote(data.analysis ?? "");
    } catch (err) {
      setDraftError(err.message ?? "Draft note failed.");
    } finally {
      setDraftLoading(false);
    }
  }, [event, apiKey]);

  if (loading) {
    return (
      <div className="copilot-panel">
        <div className="copilot-head">
          <div>
            <div className="brief-label">Reviewer Copilot</div>
            <p>Preparing source checks, uncertainty, and next review steps.</p>
          </div>
          <span className="copilot-badge">Building</span>
        </div>
      </div>
    );
  }

  if (error || !probe?.reviewCopilot) {
    return (
      <div className="copilot-panel">
        <div className="copilot-head">
          <div>
            <div className="brief-label">Reviewer Copilot</div>
            <p>{error || "No copilot packet available for this event."}</p>
          </div>
          <span className="copilot-badge weak">Thin</span>
        </div>
      </div>
    );
  }

  const copilot = probe.reviewCopilot;
  const suggested = copilot.suggestedDecision;
  const probeEvent = probe.selectedEvent ?? event;
  const surfaceExplanation = eventSurfaceExplanation(probeEvent);
  const uncertainty = eventUncertainty(probeEvent);

  return (
    <div className="copilot-panel">
      <div className="copilot-head">
        <div>
          <div className="brief-label">Reviewer Copilot</div>
          <p>{copilot.bottomLine}</p>
        </div>
        <span className={`copilot-badge ${suggested.decision}`}>
          {suggested.label} · {suggested.confidence}%
        </span>
      </div>

      <div className="copilot-decision">
        <strong>{suggested.label}</strong>
        <span>{suggested.rationale}</span>
      </div>

      <div className="copilot-meta-row">
        <div>
          <span>Surface</span>
          <strong>{surfaceExplanation.label}</strong>
          <small>{surfaceExplanation.score}/100 model priority</small>
        </div>
        <div>
          <span>Uncertainty</span>
          <strong className={`uncertainty-${uncertainty.level}`}>{uncertainty.level}</strong>
          <small>{uncertainty.score}/100 row shakiness</small>
        </div>
        <div>
          <span>Incident cluster</span>
          <strong>{probeEvent.eventClusterRole ?? "representative"}</strong>
          <small>{Number(probeEvent.eventClusterSize ?? 1).toLocaleString()} row(s)</small>
        </div>
      </div>

      <div className="copilot-grid">
        <div className="copilot-section">
          <div className="brief-label">Why surfaced</div>
          <ul className="why-list">
            {copilot.whySurfaced.map((item) => <li key={item}>{item}</li>)}
          </ul>
        </div>

        <div className="copilot-section">
          <div className="brief-label">What to verify</div>
          <ul className="why-list">
            {copilot.whatToVerify.map((item) => <li key={item}>{item}</li>)}
          </ul>
        </div>
      </div>

      <div className="copilot-section">
        <div className="brief-label">Uncertainty</div>
        <ul className="warning-list">
          {copilot.uncertainty.map((item) => <li key={item}>{item}</li>)}
        </ul>
      </div>

      <div className="copilot-section">
        <div className="brief-label">Watch next</div>
        <ul className="why-list">
          {copilot.watchNext.slice(0, 4).map((item) => <li key={item}>{item}</li>)}
        </ul>
      </div>

      <div className="copilot-note-box">
        <div className="copilot-note-head">
          <div>
            <div className="brief-label">Draft review note</div>
            <p>LLM drafting is assistant text only. It is not evidence and cannot make a label source-checked.</p>
          </div>
          {aiReady && (
            <button type="button" onClick={draftReviewNote} disabled={draftLoading}>
              {draftLoading ? "Drafting..." : draftNote ? "Re-draft" : "Draft note"}
            </button>
          )}
        </div>
        {!aiReady && (
          <p className="quiet-note">Use LM Studio on localhost:1234 or add an Anthropic API key to draft a short note. The deterministic copilot still works without one.</p>
        )}
        {draftError && <div className="ai-error">{draftError}</div>}
        {draftNote && <div className="ai-output copilot-draft">{draftNote}</div>}
      </div>
    </div>
  );
}

function GlobalRiskQueue({ events, loading, selectedEvent, onFocusEvent, onOpenMap, filters, onFilter, apiKey, aiReady }) {
  const [decisionById, setDecisionById] = useState(readAssignmentDecisions);
  const [queueMode, setQueueMode] = useState("priority");
  const [reviewQueue, setReviewQueue] = useState(null);
  const [queueMeta, setQueueMeta] = useState(null);
  const [queueLoading, setQueueLoading] = useState(false);
  const [queueError, setQueueError] = useState("");

  useEffect(() => {
    writeAssignmentDecisions(decisionById);
  }, [decisionById]);

  useEffect(() => {
    const ctrl = new AbortController();
    setQueueLoading(true);
    setQueueError("");

    fetch(`/api/review-queue?days=${filters.days}&limit=80&mode=${queueMode}&source=${filters.source ?? "static"}`, { signal: ctrl.signal })
      .then((r) => r.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setReviewQueue(Array.isArray(data.queue) ? data.queue : []);
        setQueueMeta({ counts: data.counts, strategy: data.strategy, caveat: data.caveat });
      })
      .catch((err) => {
        if (err.name !== "AbortError") {
          setQueueError(err.message ?? "Failed to load active-learning queue.");
          setReviewQueue(null);
          setQueueMeta(null);
        }
      })
      .finally(() => {
        if (!ctrl.signal.aborted) setQueueLoading(false);
      });

    return () => ctrl.abort();
  }, [filters.days, filters.source, queueMode]);

  const rankedEvents = useMemo(() => {
    const packets = Array.isArray(reviewQueue)
      ? reviewQueue.map((row) => assignmentPacket(row.event, row))
      : [...events]
          .filter((event) => event.duplicateOf == null && event.eventClusterRole !== "member")
          .map(assignmentPacket)
          .sort((a, b) =>
            b.priority - a.priority ||
            b.ripple - a.ripple ||
            Number(b.event.numMentions ?? 0) - Number(a.event.numMentions ?? 0)
          );

    return packets
      .filter((item) => {
        if (filters.continent !== "All" && item.event.continent !== filters.continent) return false;
        if (filters.category !== "All" && item.event.theme !== filters.category) return false;
        return true;
      })
      .slice(0, 10);
  }, [events, filters.continent, filters.category, reviewQueue]);

  const selected = selectedEvent
    ? rankedEvents.find((item) => item.event.id === selectedEvent.id) ?? rankedEvents[0]
    : rankedEvents[0];

  useEffect(() => {
    const selectedStillVisible = selectedEvent && rankedEvents.some((item) => item.event.id === selectedEvent.id);
    if ((!selectedEvent || !selectedStillVisible) && rankedEvents[0]) onFocusEvent(rankedEvents[0].event);
  }, [rankedEvents, selectedEvent, onFocusEvent]);

  const selectedDecision = selected ? decisionById[selected.event.id] : null;
  const decisionCount = Object.keys(decisionById).length;

  const setDecision = (nextDecision) => {
    if (!selected) return;
    const event = selected.event;
    const decisionLabel = DECISION_OPTIONS.find((option) => option.value === nextDecision)?.label ?? nextDecision;

    setDecisionById((prev) => ({
      ...prev,
      [event.id]: {
        eventId: event.id,
        decision: nextDecision,
        decisionLabel,
        decidedAt: new Date().toISOString(),
        noteType: "prototype_review_note_not_source_checked_ground_truth",
        recommendation: selected.recommendation,
        recommendationLabel: RECOMMENDATION_META[selected.recommendation].label,
        priority: selected.priority,
        queueScore: selected.queueScore,
        activeLearningReasons: selected.activeLearning?.reasons ?? [],
        evidenceGrade: selected.evidenceGrade,
        eventSummary: {
          title: eventTitle(event),
          date: event.date,
          location: event.location || event.country,
          country: event.country,
          continent: event.continent,
          theme: event.theme,
          sourceUrl: event.sourceUrl,
          eventClusterId: event.eventClusterId,
          eventClusterRole: event.eventClusterRole,
        },
      },
    }));
  };

  const exportDecisions = () => {
    downloadAssignmentDecisions(decisionById);
  };

  return (
    <section className="queue-view" aria-label="Assignment queue">
      <div className="queue-hero">
        <div>
          <div className="risk-kicker">Simple review workflow</div>
          <h1>Pick a news signal to check</h1>
          <p>The app sorts noisy public news rows. Your job is simple: read one, open the source, then choose Important, Watch, or Ignore.</p>
        </div>
        <div className="flow-strip" aria-label="Assignment workflow">
          <span>1 Pick</span>
          <span>2 Check source</span>
          <span>3 Choose</span>
        </div>
      </div>

      <QueueFilterBar
        filters={filters}
        onFilter={onFilter}
        loading={loading || queueLoading}
        resultCount={rankedEvents.length}
        decisionCount={decisionCount}
        onExport={exportDecisions}
        queueMode={queueMode}
        onQueueMode={setQueueMode}
      />

      {queueError && (
        <div className={`queue-strategy-strip${queueError ? " error" : ""}`}>
          {queueError}
        </div>
      )}

      <div className="queue-grid">
        <div className="queue-list-panel">
          <div className="risk-section-head">
            <span>Top things to check</span>
            <span>{loading || queueLoading ? "loading" : `${rankedEvents.length} shown`}</span>
          </div>
          <div className="queue-list">
            {rankedEvents.length === 0 && (
              <div className="queue-empty">
                No assignment candidates match the current filters.
              </div>
            )}
            {rankedEvents.map((item, index) => {
              const rowDecision = decisionById[item.event.id];
              return (
                <button
                  type="button"
                  key={item.event.id}
                  className={"queue-item" + (selected?.event.id === item.event.id ? " selected" : "")}
                  onClick={() => onFocusEvent(item.event)}
                >
                  <span className="queue-rank">#{item.rank ?? index + 1}</span>
                  <span className="queue-main">
                    <strong>{simpleEventTitle(item.event)}</strong>
                    <em>{item.event.location || item.event.country} · {item.event.date}</em>
                    <em>{item.surfaceExplanation?.label ?? "Needs source checking"}</em>
                    {rowDecision && <em>Local decision: {rowDecision.decisionLabel}</em>}
                  </span>
                  <span className={`recommendation-pill ${item.recommendation}`}>
                    {RECOMMENDATION_META[item.recommendation].label}
                  </span>
                  <span className="queue-scores">
                    <b>{item.priority}</b>
                    <small>signal score</small>
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <aside className="brief-panel">
          {selected ? (
            <>
              <div className="brief-topline">
                <div>
                  <div className="risk-kicker">Selected signal</div>
                  <h2>{simpleEventTitle(selected.event)}</h2>
                  <p>{selected.event.location || selected.event.country} · {selected.event.date}</p>
                </div>
                <div className={`priority-badge recommendation-badge ${selected.recommendation}`}>
                  <span>Suggested choice</span>
                  <strong>{RECOMMENDATION_META[selected.recommendation].label}</strong>
                  <small>{selected.priority}/100</small>
                </div>
              </div>

              <p className="assignment-reco-copy">
                {RECOMMENDATION_META[selected.recommendation].description} This is a helper guess, not verified truth.
              </p>

              <div className="active-learning-box">
                <div className="brief-label">What the app thinks</div>
                <strong>{selected.priority}/100 signal score</strong>
                <p>
                  {selected.surfaceExplanation?.label ?? "This may be useful."} Higher scores mean "check sooner," not "definitely true."
                </p>
                <div className="component-row">
                  <span>{selected.event.theme}</span>
                  <span>{selected.uncertainty.level} uncertainty</span>
                  <span>{selected.evidenceGrade} evidence</span>
                </div>
              </div>

              <div className="assignment-summary">
                <div>
                  <span>Evidence</span>
                  <strong className={`evidence-grade ${selected.evidenceGrade}`}>{selected.evidenceGrade}</strong>
                </div>
                <div>
                  <span>Uncertainty</span>
                  <strong className={`uncertainty-${selected.uncertainty.level}`}>{selected.uncertainty.level}</strong>
                </div>
                <div>
                  <span>Source</span>
                  <strong>{sourceHost(selected.event.sourceUrl) || "none"}</strong>
                </div>
                <div>
                  <span>Mentions</span>
                  <strong>{Number(selected.event.numMentions ?? 0).toLocaleString()}</strong>
                </div>
              </div>

              <div className="brief-section">
                <div className="brief-label">Could affect</div>
                <div className="channel-row">
                  {selected.channels.map((channel) => <span key={channel}>{channel}</span>)}
                </div>
              </div>

              <div className="brief-section">
                <div className="brief-label">Why it is on the list</div>
                <ul className="why-list">
                  {selected.reasonCodes.slice(0, 4).map((reason) => <li key={reason}>{reason}</li>)}
                </ul>
              </div>

              <div className="brief-section">
                <div className="brief-label">Check before trusting</div>
                {selected.uncertainty.warnings.length > 0 ? (
                  <ul className="warning-list">
                    {selected.uncertainty.warnings.slice(0, 3).map((warning) => <li key={warning}>{simpleWarningText(warning)}</li>)}
                  </ul>
                ) : (
                  <p className="quiet-note">Open the source and check that the event, place, date, and actors match this row.</p>
                )}
              </div>

              <div className="brief-facts">
                <div><span>Topic</span><strong>{selected.event.theme}</strong></div>
                <div><span>Goldstein</span><strong>{Number.isFinite(selected.event.goldstein) ? selected.event.goldstein.toFixed(1) : "n/a"}</strong></div>
                <div><span>Tone</span><strong>{Number.isFinite(selected.event.avgTone) ? selected.event.avgTone.toFixed(2) : "n/a"}</strong></div>
                <div><span>Mentions</span><strong>{Number(selected.event.numMentions ?? 0).toLocaleString()}</strong></div>
              </div>

              <div className="decision-box">
                <div className="brief-label">Your choice</div>
                <div className="decision-row">
                  {DECISION_OPTIONS.map((option) => (
                    <button
                      type="button"
                      key={option.value}
                      className={selectedDecision?.decision === option.value ? "on" : ""}
                      onClick={() => setDecision(option.value)}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
                <p>
                  {selectedDecision
                    ? `Marked as ${selectedDecision.decisionLabel} at ${new Date(selectedDecision.decidedAt).toLocaleString()}. This is saved only in your browser.`
                    : "Choose after checking the source. This does not change the real eval labels."}
                </p>
              </div>

              <div className="brief-actions">
                {selected.event.sourceUrl && (
                  <a href={selected.event.sourceUrl} target="_blank" rel="noopener noreferrer">
                    Open source <IconExternalLink />
                  </a>
                )}
                <button type="button" onClick={() => { onFocusEvent(selected.event); onOpenMap(); }}>
                  Open on map
                </button>
              </div>
            </>
          ) : (
            <div className="risk-empty">Loading the assignment queue.</div>
          )}
        </aside>
      </div>
    </section>
  );
}

// ── Loading + error ───────────────────────────────────────────────────────────

function LoadingOverlay({ slow }) {
  return (
    <div className="loading-overlay" role="status" aria-live="polite">
      <div className="loading-box">
        <div className="loading-wordmark">
          HopeIndex<span className="wm-suffix">AI</span>
        </div>
        <div className="loading-bar">
          <div className="loading-bar-fill" />
        </div>
        <div className="loading-label">
          {slow ? "Reading GDELT cluster index..." : "Syncing dynamic geopolitical events"}
        </div>
        {slow && (
          <div className="loading-sub">Sub-50ms static Edge CDN response times</div>
        )}
      </div>
    </div>
  );
}

function ErrorToast({ message, onDismiss }) {
  return (
    <div className="error-toast" role="alert">
      <span style={{ flex: 1 }}>{message}</span>
      <button className="error-dismiss" onClick={onDismiss} aria-label="Dismiss">✕</button>
    </div>
  );
}

// ── Root ──────────────────────────────────────────────────────────────────────

function App() {
  const [view,     setView]     = useState(() => {
    if (window.location.hash === "#events") return "events";
    if (window.location.hash === "#risk") return "risk";
    return "queue";
  });
  const [events,   setEvents]   = useState([]);
  const [filters,  setFilters]  = useState({ days: 7, continent: "All", category: "All", source: "static" });
  const [selected, setSelected] = useState(null);
  const [loading,  setLoading]  = useState(false);
  const [slowLoad, setSlowLoad] = useState(false);
  const [error,    setError]    = useState("");
  const [apiKey,   setApiKey]   = useState(() => sessionStorage.getItem("hope_api_key") ?? "");
  const [aiReady,  setAiReady]  = useState(false);
  const [liveRefreshTick, setLiveRefreshTick] = useState(0);

  // Check once whether the server has an API key configured
  useEffect(() => {
    fetch("/api/ai-status")
      .then((r) => r.json())
      .then((d) => setAiReady(d.ready || Boolean(apiKey)))
      .catch(() => setAiReady(Boolean(apiKey)));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const syncHashView = () => {
      if (window.location.hash === "#events") setView("events");
      else if (window.location.hash === "#risk") setView("risk");
      else setView("queue");
    };
    window.addEventListener("hashchange", syncHashView);
    return () => window.removeEventListener("hashchange", syncHashView);
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setSlowLoad(false);
    setError("");

    const slowTimer = setTimeout(() => { if (!cancelled) setSlowLoad(true); }, 5_000);

    fetch(`/api/events?days=${filters.days}&source=${filters.source}`)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        if (data.error) throw new Error(data.error);
        setEvents(data.events ?? []);
      })
      .catch((err) => { if (!cancelled) setError(err.message ?? "Failed to load events."); })
      .finally(() => {
        if (!cancelled) { setLoading(false); setSlowLoad(false); }
        clearTimeout(slowTimer);
      });

    return () => { cancelled = true; clearTimeout(slowTimer); };
  }, [filters.days, filters.source, liveRefreshTick]);

  useEffect(() => {
    if (filters.source !== "live") return undefined;
    const timer = setInterval(() => setLiveRefreshTick((tick) => tick + 1), 5 * 60 * 1000);
    return () => clearInterval(timer);
  }, [filters.source]);

  const filteredEvents = useMemo(() => events
    .filter((e) => {
      if (filters.continent !== "All" && e.continent !== filters.continent) return false;
      if (filters.category !== "All" && e.theme !== filters.category) return false;
      return true;
    })
    .sort((a, b) =>
      rankSignalScore(b) - rankSignalScore(a) ||
      Number(b.numMentions ?? 0) - Number(a.numMentions ?? 0)
    ), [events, filters.continent, filters.category]);

  const { globalHopeAverage, eventCount } = useMemo(() => {
    const validEvents = filteredEvents.filter((event) => Number.isFinite(eventSignalScore(event)));
    const sum = validEvents.reduce((acc, curr) => acc + eventSignalScore(curr), 0);
    const avg = validEvents.length > 0 ? sum / validEvents.length : 50;
    return {
      globalHopeAverage: avg,
      eventCount: filteredEvents.length,
    };
  }, [filteredEvents]);

  const handleSelectEvent = useCallback((ev) => {
    setSelected((prev) => (prev?.id === ev.id ? null : ev));
  }, []);

  const handleFocusEvent = useCallback((ev) => {
    setSelected(ev);
  }, []);

  const handleFilter = useCallback((next) => {
    setFilters(next);
    setSelected(null);
  }, []);

  const handleViewChange = useCallback((nextView) => {
    setView(nextView);
    const hash = nextView === "events" ? "#events" : nextView === "risk" ? "#risk" : "#queue";
    window.history.replaceState(null, "", hash);
    setSelected(null);
  }, []);

  return (
    <>
      <TopBar
        globalHopeAverage={globalHopeAverage}
        eventCount={eventCount}
        activeView={view}
        onViewChange={handleViewChange}
        dataSource={filters.source}
      />

      <main className="app-main">
        {view === "queue" ? (
          <GlobalRiskQueue
            events={filteredEvents}
            loading={loading}
            selectedEvent={selected}
            onFocusEvent={handleFocusEvent}
            onOpenMap={() => {
              setView("events");
              window.history.replaceState(null, "", "#events");
            }}
            filters={filters}
            onFilter={handleFilter}
            apiKey={apiKey}
            aiReady={aiReady}
          />
        ) : view === "events" ? (
          <>
            <MapView
              events={filteredEvents}
              selectedEvent={selected}
              onSelectEvent={handleSelectEvent}
            />
            <FilterPanel
              filters={filters}
              onFilter={handleFilter}
              filteredEvents={filteredEvents}
              selectedEvent={selected}
              onSelectEvent={handleSelectEvent}
              loading={loading}
            />
            <MapLegend />
            {selected && (
              <EventDetail
                event={selected}
                events={events}
                onClose={() => setSelected(null)}
                onSelectEvent={handleSelectEvent}
                apiKey={apiKey}
                aiReady={aiReady}
                dataSource={filters.source}
              />
            )}
          </>
        ) : (
          <RiskWindowsView />
        )}
      </main>

      <footer className="app-footer">
        <a href={GITHUB_URL + "#ai-analysis"} target="_blank" rel="noopener noreferrer">
          AI analysis — setup guide →
        </a>
      </footer>

      {loading && <LoadingOverlay slow={slowLoad} />}
      {error    && <ErrorToast message={error} onDismiss={() => setError("")} />}
    </>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
