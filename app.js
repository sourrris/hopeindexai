// HopeIndexAI — React app (JSX, transpiled by Babel standalone)
// Data: GDELT Project  |  Font: Geist

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

const DAY_OPTIONS = [1, 3, 7, 30];
const DEFAULT_DATA_SOURCE = "live";
const RELATED_SIGNAL_MIN_SCORE = 42;

const GITHUB_URL = "https://github.com/sourrris/hopeindexai";
const ASSIGNMENT_STORAGE_KEY = "hopeindexai.assignmentDecisions.v1";

const ASSIGNMENT_THRESHOLDS = {
  assign: 72,
  watch: 52,
};

const RECOMMENDATION_META = {
  assign: { label: "Assign", description: "Ask a person to check this source carefully." },
  watch: { label: "Watch", description: "Keep an eye on this until more evidence arrives." },
  dismiss: { label: "Dismiss", description: "Treat this as weak or background noise for now." },
};

const DECISION_OPTIONS = [
  { value: "assign", label: "Assign" },
  { value: "watch", label: "Watch" },
  { value: "dismiss", label: "Dismiss" },
];

const STAKEHOLDER_FRAMES = [
  {
    value: "Country",
    label: "Country",
    description: "Assume the reviewer cares about national stability, security, and diplomatic consequences.",
    focus: "national stability and policy risk",
  },
  {
    value: "Agency",
    label: "Agency",
    description: "Assume the reviewer cares about what an institution may need to monitor, verify, or respond to.",
    focus: "institutional action and verification need",
  },
  {
    value: "Person",
    label: "Person",
    description: "Assume the reviewer cares about impact on a named person, leader, decision-maker, or exposed public figure.",
    focus: "personal exposure and decision pressure",
  },
  {
    value: "Watch analyst",
    label: "Watch analyst",
    description: "Assume the reviewer cares about whether this row deserves scarce analyst attention now.",
    focus: "review priority under uncertainty",
  },
];

const PROOF_METRICS = [
  { label: "Audit set", value: "101 labels", note: "source-checked by humans" },
  { label: "Model F1", value: "0.75", note: "candidate on Phase 1" },
  { label: "Baseline F1", value: "0.35", note: "simple surface rule" },
  { label: "Future holdout", value: "AUC n/a", note: "zero verified positives" },
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
  if (event.title && event.title.trim().length > 0) {
    return event.title.trim();
  }
  return event.actor1 !== "Unknown"
    ? `${event.actor1}${event.actor2 && event.actor2 !== "Unknown" ? " -> " + event.actor2 : ""}`
    : event.quadLabel;
}

function formatModelTarget(target) {
  if (!target) return "Model prediction";
  return String(target).replace(/_/g, " ");
}

const TIER_1_DOMAINS = new Set([
  "reuters.com", "apnews.com", "afp.com", "france24.com", "bbc.com", "bbc.co.uk",
  "nytimes.com", "washingtonpost.com", "wsj.com", "ft.com", "theguardian.com",
  "economist.com", "bloomberg.com", "aljazeera.com", "dw.com", "npr.org", "pbs.org",
  "politico.com", "axios.com", "cbsnews.com", "nbcnews.com", "abcnews.go.com",
  "cnn.com", "usatoday.com", "latimes.com", "time.com", "foreignpolicy.com", "irinnews.org",
]);

const TIER_3_DOMAINS = new Set([
  "presstv.ir", "sana.sy", "rt.com", "rttnews.com", "russiaherald.com", "caribbeanherald.com",
  "tass.com", "xinhuanet.com", "globaltimes.cn", "chinadaily.com.cn", "sputniknews.com",
  "telesurenglish.net", "prensa-latina.cu", "newkerala.com", "freepressjournal.in",
  "promptnewsonline.com", "sofiaglobe.com", "azertag.az", "albawaba.com", "globalsecurity.org",
  "wandtv.com", "wpbf.com", "local3news.com", "mandurahmail.com.au", "newcastleherald.com.au",
  "harrowtimes.co.uk", "cbs19.tv", "9news.com", "nypost.com",
]);

function hostFromUrl(url) {
  try {
    return new URL(url).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return "";
  }
}

function sourceTierForUrl(url) {
  const host = hostFromUrl(url);
  if (!host) return 2;
  if (TIER_1_DOMAINS.has(host)) return 1;
  if (TIER_3_DOMAINS.has(host)) return 3;
  return 2;
}

function sourceTierLabel(tier) {
  if (tier === 1) return "Tier 1 — trusted major outlet";
  if (tier === 3) return "Tier 3 — state/aggregator/farm";
  return "Tier 2 — regional/unknown";
}

function modelProbabilityPct(event) {
  return Number.isFinite(event.surfaceModelProbability)
    ? `${Math.round(event.surfaceModelProbability * 100)}%`
    : "n/a";
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
    warning: "Prototype review notes only. These are not source-checked audit labels and do not modify eval files.",
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

function TopBar({ dataSource }) {
  const isLive = dataSource === "live";
  return (
    <header className="topbar" role="banner">
      <span className="topbar-brand">
        HopeIndex<span className="brand-suffix">AI</span>
      </span>

      <div className="topbar-center">
        <div className="product-mode">Model-Guided Review</div>
        <div className="live-badge" role="status" aria-label={isLive ? "Live GDELT feed loaded" : "Offline evaluation data loaded"}>
          <span className="live-dot" aria-hidden="true" />
          {isLive ? "LIVE" : "OFFLINE"}
        </div>
        <div className="topbar-proof">101 audit labels · model F1 0.75 · baseline F1 0.35 · holdout AUC unavailable</div>
      </div>
    </header>
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
      <div className="ai-scope-note" style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 10, lineHeight: 1.4 }}>
        Model scope: estimates the likelihood that this event corresponds to a verified lethal organized-violence incident (UCDP, >=5 deaths). Not a general triage-priority score.
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

    fetch(`/api/probe?id=${encodeURIComponent(event.id)}&source=${dataSource ?? DEFAULT_DATA_SOURCE}`, { signal: ctrl.signal })
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
          <div className="intel-block-label">
            Trained Prediction
            <span className="model-scope-badge" title="What the model is predicting">
              {formatModelTarget(prediction.target)}
            </span>
          </div>
          <div className="model-risk-head">
            <div>
              <div className={`model-risk-value ${prediction.label}`}>{Math.round(prediction.probability * 100)}%</div>
              <div className="model-risk-sub">{formatModelTarget(prediction.target)}</div>
            </div>
            <div className="model-metrics">
              <span>Test AUC {Math.round((prediction.metrics?.auc || 0) * 100)}%</span>
              <span>Accuracy {Math.round((prediction.metrics?.accuracy || 0) * 100)}%</span>
            </div>
          </div>
          <div className="model-scope-note" style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 8, lineHeight: 1.4 }}>
            This model estimates the likelihood that the event corresponds to a verified lethal organized-violence incident (UCDP, >=5 deaths). It is not the same as triage priority.
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

            {typeof event.surfaceScore === "number" && (
              <div style={{ display: "flex", gap: "20px" }}>
                <div style={{ flex: 1 }}>
                  <div className="dfield-label">Triage Rank</div>
                  <div className="dfield-val">#{event.surfaceRank} · {event.surfaceBand} · {event.surfaceScore}/100</div>
                  <div className="intel-muted">Surface score is a ranking aid, not a probability.</div>
                </div>
                <div style={{ flex: 1 }}>
                  <div className="dfield-label">Model Probability</div>
                  <div className="dfield-val">{Math.round((event.surfaceModelProbability ?? 0) * 100)}%</div>
                  <div className="intel-muted">UCDP organized-violence match likelihood.</div>
                </div>
              </div>
            )}
          </div>

          {event.sourceUrl && (
            <a href={event.sourceUrl} target="_blank" rel="noopener noreferrer" className="detail-link">
              Source Article <IconExternalLink />
            </a>
          )}

          <div className="detail-fields" style={{ marginTop: -12 }}>
            <div style={{ display: "flex", gap: "20px" }}>
              <div style={{ flex: 1 }}>
                <div className="dfield-label">Source Credibility</div>
                <div className="dfield-val">{sourceTierLabel(sourceTierForUrl(event.sourceUrl))}</div>
              </div>
              {typeof event.extractionConfidence === "number" && (
                <div style={{ flex: 1 }}>
                  <div className="dfield-label">Extraction Confidence</div>
                  <div className="dfield-val">{Math.round(event.extractionConfidence * 100)}%</div>
                </div>
              )}
            </div>
          </div>

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
            The model sees only prior months. It ranks messy country-month records before the observed outcome arrives.
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
                <span>Observed outcome</span>
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

function GlobalRiskQueue({ events, loading, selectedEvent, onFocusEvent, filters }) {
  const [decisionById, setDecisionById] = useState(readAssignmentDecisions);
  const [reviewQueue, setReviewQueue] = useState(null);
  const [queueLoading, setQueueLoading] = useState(false);
  const [queueError, setQueueError] = useState("");
  const [stakeholderFrame, setStakeholderFrame] = useState("Country");

  useEffect(() => {
    writeAssignmentDecisions(decisionById);
  }, [decisionById]);

  useEffect(() => {
    const ctrl = new AbortController();
    setQueueLoading(true);
    setQueueError("");

    fetch(`/api/review-queue?days=${filters.days}&limit=80&mode=priority&source=${filters.source ?? DEFAULT_DATA_SOURCE}`, { signal: ctrl.signal })
      .then((r) => r.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setReviewQueue(Array.isArray(data.queue) ? data.queue : []);
      })
      .catch((err) => {
        if (err.name !== "AbortError") {
          setQueueError(err.message ?? "Failed to load active-learning queue.");
          setReviewQueue(null);
        }
      })
      .finally(() => {
        if (!ctrl.signal.aborted) setQueueLoading(false);
      });

    return () => ctrl.abort();
  }, [filters.days, filters.source]);

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
      .slice(0, 10);
  }, [events, reviewQueue]);

  const selected = selectedEvent
    ? rankedEvents.find((item) => item.event.id === selectedEvent.id) ?? rankedEvents[0]
    : rankedEvents[0];

  useEffect(() => {
    const selectedStillVisible = selectedEvent && rankedEvents.some((item) => item.event.id === selectedEvent.id);
    if ((!selectedEvent || !selectedStillVisible) && rankedEvents[0]) onFocusEvent(rankedEvents[0].event);
  }, [rankedEvents, selectedEvent, onFocusEvent]);

  const selectedDecision = selected ? decisionById[selected.event.id] : null;
  const decisionCount = Object.keys(decisionById).length;
  const stakeholderMeta = STAKEHOLDER_FRAMES.find((frame) => frame.value === stakeholderFrame) ?? STAKEHOLDER_FRAMES[0];

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
    <section className="review-view" aria-label="Model-guided review">
      <div className="review-hero">
        <div>
          <div className="risk-kicker">Review queue</div>
          <h1>Next public conflict signals to audit</h1>
          <div className="queue-filter-group">
            <span>Stakeholder frame</span>
            <div className="chip-row">
              {STAKEHOLDER_FRAMES.map((frame) => {
                const isOn = stakeholderFrame === frame.value;
                return (
                  <button
                    type="button"
                    key={frame.value}
                    className={`chip${isOn ? " on" : ""}`}
                    onClick={() => setStakeholderFrame(frame.value)}
                    aria-pressed={isOn}
                  >
                    {frame.label}
                  </button>
                );
              })}
            </div>
            <small>{stakeholderMeta.description}</small>
          </div>
        </div>
        <div className="proof-strip" aria-label="Evaluation proof">
          {PROOF_METRICS.map((metric) => (
            <div className="proof-card" key={metric.label}>
              <span>{metric.label}</span>
              <strong>{metric.value}</strong>
              <small>{metric.note}</small>
            </div>
          ))}
        </div>
      </div>

      {queueError && <div className="review-error">{queueError}</div>}

      <div className="review-layout">
        <section className="review-list-panel" aria-label="Next events to review">
          <div className="review-section-head">
            <span>Next events likely to matter to: {stakeholderMeta.label}</span>
            <span>{loading || queueLoading ? "loading" : `${rankedEvents.length} shown`}</span>
          </div>

          <div className="review-list">
            {rankedEvents.length === 0 && (
              <div className="queue-empty">No review candidates match the current data window.</div>
            )}
            {rankedEvents.map((item, index) => {
              const rowDecision = decisionById[item.event.id];
              return (
                <button
                  type="button"
                  key={item.event.id}
                  className={"review-row" + (selected?.event.id === item.event.id ? " selected" : "")}
                  onClick={() => onFocusEvent(item.event)}
                >
                  <span className="review-rank">#{item.rank ?? index + 1}</span>
                  <span className="review-row-main">
                    <strong>{simpleEventTitle(item.event)}</strong>
                    <em>{item.event.location || item.event.country} · {item.event.date}</em>
                    <small>{rowDecision ? `Marked ${rowDecision.decisionLabel}` : item.surfaceExplanation?.label ?? "Needs source checking"}</small>
                  </span>
                  <span className={`recommendation-pill ${item.recommendation}`}>
                    {RECOMMENDATION_META[item.recommendation].label}
                  </span>
                  <span className="review-score">
                    <b>{item.priority}</b>
                    <small>priority</small>
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        <aside className="review-decision-panel" aria-label="Selected event review">
          {selected ? (
            <>
              <div className="selected-event-head">
                <div>
                  <div className="risk-kicker">Recommended: {RECOMMENDATION_META[selected.recommendation].label}</div>
                  <h2>{simpleEventTitle(selected.event)}</h2>
                  <p>{selected.event.location || selected.event.country} · {selected.event.date}</p>
                </div>
                <div className={`decision-stamp ${selected.recommendation}`}>
                  <span>{RECOMMENDATION_META[selected.recommendation].label}</span>
                  <strong>{selected.priority}</strong>
                </div>
              </div>

              <div className="review-metric-grid">
                <div>
                  <span>Triage priority</span>
                  <strong>{selected.priority}/100</strong>
                  <small>what to inspect first</small>
                </div>
                <div>
                  <span>Stakeholder frame</span>
                  <strong>{stakeholderMeta.label}</strong>
                  <small>{stakeholderMeta.focus}</small>
                </div>
                <div>
                  <span>Model probability</span>
                  <strong>{modelProbabilityPct(selected.event)}</strong>
                  <small>UCDP organized-violence match</small>
                </div>
                <div>
                  <span>Source</span>
                  <strong>{sourceHost(selected.event.sourceUrl) || "unknown"}</strong>
                  <small>{sourceTierLabel(sourceTierForUrl(selected.event.sourceUrl))}</small>
                </div>
                <div>
                  <span>Uncertainty</span>
                  <strong className={`uncertainty-${selected.uncertainty.level}`}>{selected.uncertainty.level}</strong>
                  <small>{selected.evidenceGrade} evidence</small>
                </div>
              </div>

              <div className="decision-box minimal-decision-box">
                <div className="brief-label">Human decision</div>
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
                    ? `Saved locally as ${selectedDecision.decisionLabel}. This is still not a source-checked audit label.`
                    : "Decide only after checking the source. This saves a prototype audit note in your browser."}
                </p>
              </div>

              <div className="review-actions">
                {selected.event.sourceUrl && (
                  <a href={selected.event.sourceUrl} target="_blank" rel="noopener noreferrer">
                    Open source <IconExternalLink />
                  </a>
                )}
                {decisionCount > 0 && (
                  <button type="button" onClick={exportDecisions}>
                    Download choices
                  </button>
                )}
              </div>

              <div className="review-block">
                <div className="brief-label">Why this may matter to {stakeholderMeta.label}</div>
                <ul className="why-list">
                  {selected.reasonCodes.slice(0, 4).map((reason) => <li key={reason}>{reason}</li>)}
                </ul>
              </div>

              <div className="review-block">
                <div className="brief-label">Check before trusting</div>
                {selected.uncertainty.warnings.length > 0 ? (
                  <ul className="warning-list">
                    {selected.uncertainty.warnings.slice(0, 3).map((warning) => <li key={warning}>{simpleWarningText(warning)}</li>)}
                  </ul>
                ) : (
                  <p className="quiet-note">Open the source and verify the event, place, date, and actors before treating this as evidence.</p>
                )}
              </div>
            </>
          ) : (
            <div className="risk-empty">Loading the next event to review.</div>
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
          <div className="loading-sub">Fetching the live GDELT event feed</div>
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
  const [events,   setEvents]   = useState([]);
  const [filters] = useState({ days: 7, source: DEFAULT_DATA_SOURCE });
  const [selected, setSelected] = useState(null);
  const [loading,  setLoading]  = useState(false);
  const [slowLoad, setSlowLoad] = useState(false);
  const [error,    setError]    = useState("");
  const [liveRefreshTick, setLiveRefreshTick] = useState(0);

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
    .sort((a, b) =>
      rankSignalScore(b) - rankSignalScore(a) ||
      Number(b.numMentions ?? 0) - Number(a.numMentions ?? 0)
    ), [events]);

  const handleFocusEvent = useCallback((ev) => {
    setSelected(ev);
  }, []);

  return (
    <>
      <TopBar
        dataSource={filters.source}
      />

      <main className="app-main">
        <GlobalRiskQueue
          events={filteredEvents}
          loading={loading}
          selectedEvent={selected}
          onFocusEvent={handleFocusEvent}
          filters={filters}
        />
      </main>

      {loading && <LoadingOverlay slow={slowLoad} />}
      {error    && <ErrorToast message={error} onDismiss={() => setError("")} />}
    </>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
