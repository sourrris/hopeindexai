import { mkdir, readFile, writeFile } from "fs/promises";
import { dirname } from "path";

type ReviewQueueMode = "priority" | "uncertain" | "coverage";
type LabelSource = "human" | "llm_article_review" | "bootstrap_current_rules";

interface GdeltEvent {
  id: string;
  date: string;
  category: "doom" | "bloom";
  theme?: string;
  actor1: string;
  actor2: string;
  country: string;
  continent: string;
  location: string;
  sourceUrl: string;
  quadLabel: string;
  goldstein: number | null;
  avgTone: number | null;
  numMentions: number;
  markerRadius: number;
  severity: "low" | "medium" | "high" | "critical";
  surfaceScore?: number;
  surfaceRank?: number;
  surfaceBand?: string;
  surfaceModelProbability?: number;
  duplicateOf?: string | null;
  eventClusterId?: string;
  eventClusterSize?: number;
  eventClusterRole?: "representative" | "member";
  uncertainty?: {
    level?: "low" | "medium" | "high";
    score?: number;
    warnings?: string[];
    confidenceDrivers?: string[];
  };
  activeLearningScore?: number;
  activeLearningReasons?: string[];
}

interface Phase1Label {
  eventId: string;
  labelSource: LabelSource;
  humanReviewed: boolean;
  labels: {
    important: boolean;
    categoryCorrect: boolean;
    severityCorrect: boolean;
    summaryQuality: number | null;
  };
  reviewContext?: Record<string, unknown>;
}

interface QueueRow {
  schemaVersion: "labeling-queue.v1";
  rank: number;
  mode: ReviewQueueMode;
  queueScore: number;
  eventId: string;
  event: {
    date: string;
    title: string;
    country: string;
    continent: string;
    location: string;
    theme: string | null;
    category: "doom" | "bloom";
    severity: string;
    sourceDomain: string;
    sourceUrl: string;
  };
  signals: {
    surfaceScore: number;
    surfaceRank: number | null;
    surfaceBand: string | null;
    modelProbability: number | null;
    uncertaintyScore: number;
    uncertaintyLevel: string | null;
    numMentions: number;
    goldstein: number | null;
    avgTone: number | null;
  };
  activeLearning: {
    reasons: string[];
    components: {
      priority: number;
      uncertainty: number;
      threshold: number;
      coverage: number;
    };
  };
  currentLabel: {
    labelSource: LabelSource | "none";
    humanReviewed: boolean;
    sourceChecked: boolean;
    important: boolean | null;
  };
  sourceCheck: {
    required: true;
    primarySourceUrl: string;
    primarySourceDomain: string;
    recommendedOpenSources: string[];
    decisionFields: string[];
  };
}

const EVENTS_PATH = "public/data/events.json";
const LABEL_PATH = "data/eval/phase1_labels.jsonl";
const DEFAULT_OUTPUT_PATH = "data/labeling/reviewer_queue.jsonl";
const DEFAULT_PROFILE_PATH = "data/labeling/reviewer_queue_profile.json";
const REVIEW_ASSIGN_THRESHOLD = 72;
const REVIEW_WATCH_THRESHOLD = 52;

function parseArgs(argv: string[]) {
  const args = {
    input: EVENTS_PATH,
    labels: LABEL_PATH,
    output: DEFAULT_OUTPUT_PATH,
    profile: DEFAULT_PROFILE_PATH,
    mode: "priority" as ReviewQueueMode,
    limit: 100,
  };

  for (const arg of argv) {
    if (arg === "-h" || arg === "--help") {
      printHelp();
      process.exit(0);
    } else if (arg.startsWith("--input=")) {
      args.input = arg.slice("--input=".length);
    } else if (arg.startsWith("--labels=")) {
      args.labels = arg.slice("--labels=".length);
    } else if (arg.startsWith("--output=")) {
      args.output = arg.slice("--output=".length);
    } else if (arg.startsWith("--profile=")) {
      args.profile = arg.slice("--profile=".length);
    } else if (arg.startsWith("--limit=")) {
      const parsed = Number.parseInt(arg.slice("--limit=".length), 10);
      if (!Number.isInteger(parsed) || parsed < 1 || parsed > 1000) throw new Error("--limit must be an integer from 1 to 1000.");
      args.limit = parsed;
    } else if (arg.startsWith("--mode=")) {
      const mode = arg.slice("--mode=".length);
      if (mode !== "priority" && mode !== "uncertain" && mode !== "coverage") throw new Error("--mode must be priority, uncertain, or coverage.");
      args.mode = mode;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return args;
}

function printHelp() {
  console.log(`HopeIndexAI reviewer labeling queue

Usage:
  bun scripts/build_labeling_queue.ts [--mode=priority|uncertain|coverage] [--limit=100]

Writes:
  data/labeling/reviewer_queue.jsonl
  data/labeling/reviewer_queue_profile.json

This script selects high-value events for source-checked human labeling. It does
not create human labels and does not change training/eval truth.
`);
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
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

async function readEvents(path: string): Promise<GdeltEvent[]> {
  const parsed = JSON.parse(await readFile(path, "utf8"));
  if (!Array.isArray(parsed.events)) throw new Error(`${path} must contain an events array.`);
  return parsed.events;
}

async function readLabels(path: string): Promise<Phase1Label[]> {
  try {
    return readJsonl<Phase1Label>(await readFile(path, "utf8"));
  } catch (err: any) {
    if (err.code === "ENOENT") return [];
    throw err;
  }
}

function isSourceCheckedHumanLabel(label: Phase1Label | undefined): boolean {
  return label?.labelSource === "human" &&
    label.humanReviewed === true &&
    label.reviewContext?.sourceChecked === true &&
    label.reviewContext?.sourceSupportsClaim !== false;
}

function isSourceCheckedHumanDecision(label: Phase1Label | undefined): boolean {
  return label?.labelSource === "human" &&
    label.humanReviewed === true &&
    label.reviewContext?.sourceChecked === true;
}

function eventTitle(event: GdeltEvent): string {
  if (event.actor1 && event.actor1 !== "Unknown") {
    return `${event.actor1}${event.actor2 && event.actor2 !== "Unknown" ? ` -> ${event.actor2}` : ""}`;
  }
  return event.quadLabel;
}

function surfacePriority(event: GdeltEvent): number {
  return Math.round(clamp(
    Number.isFinite(event.surfaceScore) ? Number(event.surfaceScore) : Number(event.markerRadius ?? 0),
    0,
    100
  ));
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

function coverageGapScore(event: GdeltEvent, coverage: ReturnType<typeof sourceCheckedCoverage>): number {
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
  const priority = surfacePriority(event);
  const uncertainty = Math.round(clamp(Number(event.uncertainty?.score ?? 50), 0, 100));
  const threshold = Math.round(clamp(
    16 - Math.min(Math.abs(priority - REVIEW_ASSIGN_THRESHOLD), Math.abs(priority - REVIEW_WATCH_THRESHOLD)) * 1.8,
    0,
    16
  ));
  const coverageScore = coverageGapScore(event, coverage);

  return { priority, uncertainty, threshold, coverage: coverageScore };
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
  return Math.round(clamp(Number.isFinite(event.activeLearningScore) ? Number(event.activeLearningScore) : base, 0, 100));
}

function activeLearningReasons(event: GdeltEvent, components: ReturnType<typeof activeLearningComponents>): string[] {
  const reasons = [
    components.priority >= REVIEW_ASSIGN_THRESHOLD
      ? "High-priority surfaced lead."
      : components.priority >= REVIEW_WATCH_THRESHOLD
      ? "Near the Watch/Assign decision band."
      : "Background row may still teach the filter.",
    components.threshold > 0 ? "Close to a review threshold, so a human label is informative." : null,
    components.uncertainty >= 66 ? "High uncertainty needs source checking." : components.uncertainty >= 38 ? "Medium uncertainty can improve calibration." : null,
    components.priority >= REVIEW_WATCH_THRESHOLD && event.uncertainty?.level === "high" ? "Important-looking row with shaky evidence." : null,
    components.coverage > 10 ? "Under-reviewed region/theme/source coverage gap." : components.coverage > 0 ? "Adds some coverage diversity." : null,
  ].filter((reason): reason is string => Boolean(reason));

  return [...new Set([...(event.activeLearningReasons ?? []), ...reasons])].slice(0, 6);
}

function recommendedOpenSources(event: GdeltEvent): string[] {
  const sources = ["primary article URL"];
  if (event.theme === "Conflict" || event.category === "doom") {
    sources.push("UCDP Candidate/GED match when date coverage exists");
  }
  sources.push("second reputable news or official source when the primary article is blocked");
  return sources;
}

function buildRows(events: GdeltEvent[], labels: Phase1Label[], mode: ReviewQueueMode, limit: number): QueueRow[] {
  const eventsById = new Map(events.map((event) => [event.id, event]));
  const labelsById = new Map(labels.map((label) => [label.eventId, label]));
  const coverage = sourceCheckedCoverage(labels, eventsById);

  return events
    .filter((event) => !isSourceCheckedHumanDecision(labelsById.get(event.id)))
    .filter((event) => event.duplicateOf == null)
    .filter((event) => event.eventClusterRole !== "member")
    .map((event) => {
      const label = labelsById.get(event.id);
      const labelSource: LabelSource | "none" = label?.labelSource ?? "none";
      const components = activeLearningComponents(event, coverage);
      const queueScore = queueScoreForMode(mode, event, components);
      const sourceDomain = hostFromUrl(event.sourceUrl);
      return {
        schemaVersion: "labeling-queue.v1" as const,
        rank: 0,
        mode,
        queueScore,
        eventId: event.id,
        event: {
          date: event.date,
          title: eventTitle(event),
          country: event.country,
          continent: event.continent,
          location: event.location,
          theme: event.theme ?? null,
          category: event.category,
          severity: event.severity,
          sourceDomain,
          sourceUrl: event.sourceUrl,
        },
        signals: {
          surfaceScore: surfacePriority(event),
          surfaceRank: Number.isFinite(event.surfaceRank) ? Number(event.surfaceRank) : null,
          surfaceBand: event.surfaceBand ?? null,
          modelProbability: Number.isFinite(event.surfaceModelProbability) ? Number(event.surfaceModelProbability) : null,
          uncertaintyScore: components.uncertainty,
          uncertaintyLevel: event.uncertainty?.level ?? null,
          numMentions: event.numMentions,
          goldstein: event.goldstein,
          avgTone: event.avgTone,
        },
        activeLearning: {
          reasons: activeLearningReasons(event, components),
          components,
        },
        currentLabel: {
          labelSource,
          humanReviewed: label?.humanReviewed ?? false,
          sourceChecked: label?.reviewContext?.sourceChecked === true,
          important: label?.labels?.important ?? null,
        },
        sourceCheck: {
          required: true as const,
          primarySourceUrl: event.sourceUrl,
          primarySourceDomain: sourceDomain,
          recommendedOpenSources: recommendedOpenSources(event),
          decisionFields: [
            "important",
            "sourceSupportsClaim",
            "categoryCorrect",
            "severityCorrect",
            "summaryQuality",
            "notes",
          ],
        },
      };
    })
    .sort((a, b) =>
      b.queueScore - a.queueScore ||
      b.signals.surfaceScore - a.signals.surfaceScore ||
      b.signals.numMentions - a.signals.numMentions
    )
    .slice(0, limit)
    .map((row, index) => ({ ...row, rank: index + 1 }));
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const events = await readEvents(args.input);
  const labels = await readLabels(args.labels);
  const rows = buildRows(events, labels, args.mode, args.limit);

  await mkdir(dirname(args.output), { recursive: true });
  await writeFile(args.output, writeJsonl(rows));

  const profile = {
    schemaVersion: "labeling-queue-profile.v1",
    generatedAt: new Date().toISOString(),
    mode: args.mode,
    inputPath: args.input,
    labelPath: args.labels,
    outputPath: args.output,
    totalEvents: events.length,
    totalLabels: labels.length,
    sourceCheckedHumanLabels: labels.filter(isSourceCheckedHumanLabel).length,
    returned: rows.length,
    topQueueScore: rows[0]?.queueScore ?? null,
    sourceStrategy: {
      discovery: "GDELT/public event rows find candidates, but they are noisy sensors.",
      primaryReviewEvidence: "Reviewer opens the source URL or enough source context before a label can become ground truth.",
      curatedConflictEvidence: "UCDP GED and UCDP Candidate are preferred open curated conflict evidence when their date coverage overlaps the event.",
      optionalContext: "ACLED aggregates can provide trend context when local workbooks exist, but they are not row-level label truth.",
      avoidedForTruth: "YouTube, X/Twitter, and generic social posts can be leads, but use them only as context unless the source is public, attributable, and independently checkable.",
    },
    nextCommands: [
      `bun run review:phase1:human -- --mode=${args.mode} --limit=30`,
      "bun run records:build",
      "bun run records:validate",
      "bun run labels:build",
      "bun run eval:phase1",
    ],
  };

  await mkdir(dirname(args.profile), { recursive: true });
  await writeFile(args.profile, JSON.stringify(profile, null, 2) + "\n");

  console.log("HopeIndexAI reviewer labeling queue built");
  console.log(JSON.stringify(profile, null, 2));
}

main().catch((err) => {
  console.error("Failed to build reviewer labeling queue:", err instanceof Error ? err.message : err);
  process.exit(1);
});
