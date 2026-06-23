import { mkdir, readFile, writeFile } from "fs/promises";
import { dirname } from "path";
import { stdin as input, stdout as output } from "process";
import readline from "readline/promises";

type LabelSource = "human" | "llm_article_review" | "bootstrap_current_rules";
type Severity = "low" | "medium" | "high" | "critical";
type ReviewQueueMode = "priority" | "uncertain" | "coverage";

interface GdeltEvent {
  id: string;
  category: "doom" | "bloom";
  theme?: string;
  hopeScore?: number;
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
  severity: Severity;
  continent: string;
  aiSummary?: string;
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
  labelVersion: "phase1.v1";
  labelSource: LabelSource;
  humanReviewed: boolean;
  reviewedBy: string;
  reviewedAt: string;
  labels: {
    important: boolean;
    categoryCorrect: boolean;
    severityCorrect: boolean;
    summaryQuality: number | null;
  };
  reviewContext?: Record<string, unknown>;
  notes?: string;
}

interface Args {
  force: boolean;
  fast: boolean;
  listOnly: boolean;
  limit: number;
  mode: ReviewQueueMode;
}

const EVENTS_PATH = "public/data/events.json";
const LABEL_PATH = "data/eval/phase1_labels.jsonl";
const MIN_HUMAN_LABELS_FOR_CLAIM = 100;
const HUMAN_REVIEW_VERSION = "phase1.human-cli.v2";
const REVIEW_ASSIGN_THRESHOLD = 72;
const REVIEW_WATCH_THRESHOLD = 52;

function envInt(name: string, fallback: number): number {
  const raw = process.env[name];
  if (raw === undefined || raw === "") return fallback;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed < 0) throw new Error(`${name} must be a non-negative integer.`);
  return parsed;
}

function parseArgs(argv: string[]): Args {
  const args: Args = {
    force: false,
    fast: false,
    listOnly: false,
    limit: envInt("PHASE1_HUMAN_REVIEW_LIMIT", Number.MAX_SAFE_INTEGER),
    mode: "priority",
  };

  for (const arg of argv) {
    if (arg === "--force") args.force = true;
    else if (arg === "--fast") args.fast = true;
    else if (arg === "--list") args.listOnly = true;
    else if (arg.startsWith("--limit=")) {
      const parsed = Number.parseInt(arg.slice("--limit=".length), 10);
      if (!Number.isFinite(parsed) || parsed < 0) throw new Error("--limit must be a non-negative integer.");
      args.limit = parsed;
    } else if (arg.startsWith("--mode=")) {
      const mode = arg.slice("--mode=".length);
      if (mode !== "priority" && mode !== "uncertain" && mode !== "coverage") {
        throw new Error("--mode must be priority, uncertain, or coverage.");
      }
      args.mode = mode;
    } else if (arg === "-h" || arg === "--help") {
      printHelp();
      process.exit(0);
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return args;
}

function printHelp() {
  console.log(`HopeIndexAI Phase 1 human review

Usage:
  bun scripts/review_phase1_human.ts [--list] [--limit=20] [--mode=priority|uncertain|coverage] [--fast] [--force]

Options:
  --list       Show the review queue without changing labels.
  --limit=N    Review or list at most N labels.
  --mode=M     Queue strategy: priority, uncertain, or coverage.
  --fast       One-key accept/edit/skip mode. Accepting still requires source/context check.
  --force      Include labels that are already human-reviewed.

Environment:
  PHASE1_REVIEWER=name             Reviewer name written into reviewedBy.
  PHASE1_HUMAN_REVIEW_LIMIT=N      Default review limit.
`);
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

async function loadEventRows(): Promise<GdeltEvent[]> {
  const parsed = JSON.parse(await readFile(EVENTS_PATH, "utf8"));
  if (!parsed || !Array.isArray(parsed.events)) throw new Error(`${EVENTS_PATH} must contain an events array.`);
  return parsed.events;
}

async function loadLabels(): Promise<Phase1Label[]> {
  const labels = readJsonl<Phase1Label>(await readFile(LABEL_PATH, "utf8"));
  const seen = new Set<string>();
  for (const label of labels) {
    if (seen.has(label.eventId)) throw new Error(`Duplicate label for event ${label.eventId}.`);
    seen.add(label.eventId);
  }
  return labels;
}

function eventTitle(event: GdeltEvent): string {
  if (event.actor1 && event.actor1 !== "Unknown") {
    return `${event.actor1}${event.actor2 && event.actor2 !== "Unknown" ? ` -> ${event.actor2}` : ""}`;
  }
  return event.quadLabel;
}

function hostFromUrl(url: string | undefined): string {
  if (!url) return "";
  try {
    return new URL(url).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return "";
  }
}

function boolText(value: boolean): string {
  return value ? "yes" : "no";
}

function clipped(value: unknown, max = 240): string {
  const text = String(value ?? "").replace(/\s+/g, " ").trim();
  return text.length > max ? `${text.slice(0, max - 3)}...` : text;
}

function isSourceCheckedHumanLabel(label: Phase1Label): boolean {
  return label.labelSource === "human" &&
    label.humanReviewed === true &&
    label.reviewContext?.sourceChecked === true &&
    label.reviewContext?.sourceSupportsClaim !== false;
}

function isSourceCheckedHumanDecision(label: Phase1Label): boolean {
  return label.labelSource === "human" &&
    label.humanReviewed === true &&
    label.reviewContext?.sourceChecked === true;
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
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

function starterLabelForEvent(event: GdeltEvent): Phase1Label {
  const priority = surfacePriority(event);
  return {
    eventId: event.id,
    labelVersion: "phase1.v1",
    labelSource: "bootstrap_current_rules",
    humanReviewed: false,
    reviewedBy: "label-queue-bootstrap",
    reviewedAt: new Date(0).toISOString(),
    labels: {
      important: priority >= REVIEW_WATCH_THRESHOLD,
      categoryCorrect: true,
      severityCorrect: true,
      summaryQuality: event.aiSummary ? 3 : null,
    },
    reviewContext: {
      bootstrapReason: "Created only as a prior for human review; not source-checked ground truth.",
      date: event.date,
      title: eventTitle(event),
      country: event.country,
      continent: event.continent,
      theme: event.theme,
      category: event.category,
      severity: event.severity,
      sourceDomain: hostFromUrl(event.sourceUrl),
      sourceUrl: event.sourceUrl,
    },
    notes: "Bootstrap queue prior. A human must source-check before this can become training/eval truth.",
  };
}

function selectReviewQueue(labels: Phase1Label[], events: GdeltEvent[], eventsById: Map<string, GdeltEvent>, args: Args) {
  const labelById = new Map(labels.map((label, index) => [label.eventId, { label, index }]));
  const coverage = sourceCheckedCoverage(labels, eventsById);

  return events
    .map((event) => {
      const existing = labelById.get(event.id);
      const label = existing?.label ?? starterLabelForEvent(event);
      const components = activeLearningComponents(event, coverage);
      return {
        label,
        index: existing?.index ?? -1,
        event,
        queueScore: queueScoreForMode(args.mode, event, components),
        activeLearningReasons: activeLearningReasons(event, components),
      };
    })
    .filter(({ label }) => args.force || !isSourceCheckedHumanDecision(label))
    .filter(({ event }) => event.duplicateOf == null)
    .filter(({ event }) => event.eventClusterRole !== "member")
    .sort((a, b) =>
      b.queueScore - a.queueScore ||
      surfacePriority(b.event) - surfacePriority(a.event) ||
      Number(b.event.numMentions ?? 0) - Number(a.event.numMentions ?? 0)
    )
    .slice(0, args.limit);
}

function printEvent(row: { label: Phase1Label; event: GdeltEvent; queueScore?: number; activeLearningReasons?: string[] }, position: number, total: number, sourceCheckedCount: number) {
  const { label, event } = row;
  const context = label.reviewContext ?? {};

  console.log("\n" + "-".repeat(78));
  console.log(`Review ${position}/${total} | source-checked labels: ${sourceCheckedCount}/${MIN_HUMAN_LABELS_FOR_CLAIM}`);
  console.log(`ID: ${event.id}`);
  console.log(`Date: ${event.date}`);
  console.log(`Title: ${eventTitle(event)}`);
  console.log(`Location: ${event.location || event.country || "unknown"}`);
  console.log(`Country/continent: ${event.country || "n/a"} / ${event.continent || "n/a"}`);
  console.log(`Current category/theme/severity: ${event.category} / ${event.theme ?? "unknown"} / ${event.severity}`);
  console.log(`GDELT class: ${event.quadLabel} | Goldstein: ${event.goldstein ?? "n/a"} | Tone: ${event.avgTone ?? "n/a"} | Mentions: ${event.numMentions}`);
  if (typeof row.queueScore === "number") console.log(`Queue score: ${row.queueScore} | surface=${surfacePriority(event)} | uncertainty=${event.uncertainty?.score ?? "n/a"} | mode signal`);
  console.log(`Source: ${hostFromUrl(event.sourceUrl) || "unknown"} | ${event.sourceUrl || "no URL"}`);
  console.log(`Previous label: ${label.labelSource}, important=${boolText(label.labels.important)}, categoryCorrect=${boolText(label.labels.categoryCorrect)}, severityCorrect=${boolText(label.labels.severityCorrect)}`);

  if (row.activeLearningReasons?.length) console.log(`Why review now: ${row.activeLearningReasons.slice(0, 3).join(" | ")}`);
  if (typeof context.rationale === "string") console.log(`Prior rationale: ${clipped(context.rationale)}`);
  if (typeof context.importantRationale === "string") console.log(`Importance rationale: ${clipped(context.importantRationale)}`);
  if (event.aiSummary) console.log(`AI summary: ${clipped(event.aiSummary)}`);
}

async function askChoice(
  rl: readline.Interface,
  question: string,
  choices: Record<string, string>,
  defaultChoice?: string
): Promise<string> {
  const allowed = Object.keys(choices);
  while (true) {
    const answer = (await rl.question(question)).trim().toLowerCase();
    const normalized = answer || defaultChoice || "";
    if (normalized in choices) return choices[normalized];
    console.log(`Use one of: ${allowed.join(", ")}`);
  }
}

async function askImportant(rl: readline.Interface): Promise<boolean | "skip" | "quit"> {
  const choice = await askChoice(rl, "Important public/geopolitical event? [y/n/s skip/q quit] ", {
    y: "yes",
    yes: "yes",
    n: "no",
    no: "no",
    s: "skip",
    skip: "skip",
    q: "quit",
    quit: "quit",
  });

  if (choice === "skip" || choice === "quit") return choice;
  return choice === "yes";
}

async function askFastDecision(rl: readline.Interface): Promise<"accept" | "edit" | "skip" | "quit"> {
  const choice = await askChoice(rl, "Accept prior label after source/context check? [a accept/e edit/s skip/q quit] ", {
    a: "accept",
    accept: "accept",
    e: "edit",
    edit: "edit",
    s: "skip",
    skip: "skip",
    q: "quit",
    quit: "quit",
  });

  return choice as "accept" | "edit" | "skip" | "quit";
}

async function askSourceChecked(rl: readline.Interface): Promise<true | "skip" | "quit"> {
  const choice = await askChoice(rl, "Inspected source URL or enough source context? [y yes/n skip/q quit] ", {
    y: "yes",
    yes: "yes",
    n: "skip",
    no: "skip",
    s: "skip",
    skip: "skip",
    q: "quit",
    quit: "quit",
  });

  if (choice === "quit" || choice === "skip") return choice;
  return true;
}

async function askBoolean(rl: readline.Interface, question: string, current: boolean): Promise<boolean | "quit"> {
  const prompt = `${question} [${current ? "Y/n" : "y/N"}/q] `;
  const choice = await askChoice(rl, prompt, {
    y: "yes",
    yes: "yes",
    n: "no",
    no: "no",
    q: "quit",
    quit: "quit",
  }, current ? "y" : "n");

  if (choice === "quit") return "quit";
  return choice === "yes";
}

async function askSourceSupportsClaim(rl: readline.Interface): Promise<boolean | "quit"> {
  const choice = await askChoice(rl, "Does the checked source/context support this event row? [Y/n/q] ", {
    y: "yes",
    yes: "yes",
    n: "no",
    no: "no",
    q: "quit",
    quit: "quit",
  }, "y");

  if (choice === "quit") return "quit";
  return choice === "yes";
}

async function askSummaryQuality(rl: readline.Interface, event: GdeltEvent, current: number | null): Promise<number | null | "quit"> {
  if (!event.aiSummary) return null;

  while (true) {
    const prompt = current === null
      ? "AI summary quality? [1-5, blank for null, q quit] "
      : `AI summary quality? [1-5, blank keeps ${current}, q quit] `;
    const answer = (await rl.question(prompt)).trim().toLowerCase();
    if (!answer) return current;
    if (answer === "q" || answer === "quit") return "quit";

    const parsed = Number.parseInt(answer, 10);
    if (Number.isInteger(parsed) && parsed >= 1 && parsed <= 5) return parsed;
    console.log("Use 1, 2, 3, 4, 5, blank, or q.");
  }
}

function toHumanLabel(
  previous: Phase1Label,
  event: GdeltEvent,
  reviewer: string,
  answers: {
    important: boolean;
    categoryCorrect: boolean;
    severityCorrect: boolean;
    summaryQuality: number | null;
    sourceSupportsClaim: boolean;
    notes: string;
  }
): Phase1Label {
  const previousLabels = previous.labels;
  const previousLabelSource = previous.labelSource;
  const previousReviewedBy = previous.reviewedBy;

  return {
    ...previous,
    labelSource: "human",
    humanReviewed: true,
    reviewedBy: reviewer,
    reviewedAt: new Date().toISOString(),
    labels: {
      important: answers.important,
      categoryCorrect: answers.categoryCorrect,
      severityCorrect: answers.severityCorrect,
      summaryQuality: answers.summaryQuality,
    },
    reviewContext: {
      ...(previous.reviewContext ?? {}),
      humanReviewVersion: HUMAN_REVIEW_VERSION,
      sourceChecked: true,
      sourceSupportsClaim: answers.sourceSupportsClaim,
      outcomeReviewed: false,
      sourceCheckCriteria: "reviewer_inspected_source_url_or_enough_source_context",
      sourceCaveatNotes: answers.notes || null,
      previousLabelSource,
      previousReviewedBy,
      previousLabels,
      date: event.date,
      title: eventTitle(event),
      country: event.country,
      continent: event.continent,
      theme: event.theme,
      category: event.category,
      severity: event.severity,
      goldstein: event.goldstein,
      avgTone: event.avgTone,
      numMentions: event.numMentions,
      markerRadius: event.markerRadius,
      sourceDomain: hostFromUrl(event.sourceUrl),
      sourceUrl: event.sourceUrl,
    },
    notes: answers.notes
      ? `Human review: ${answers.notes}`
      : `Human-reviewed via review_phase1_human.ts. Previous label source: ${previousLabelSource}.`,
  };
}

async function saveLabels(labels: Phase1Label[]) {
  await mkdir(dirname(LABEL_PATH), { recursive: true });
  await writeFile(LABEL_PATH, writeJsonl(labels));
}

function saveLabelInMemory(labels: Phase1Label[], index: number, label: Phase1Label) {
  if (index >= 0) labels[index] = label;
  else labels.push(label);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const events = await loadEventRows();
  const eventsById = new Map(events.map((event) => [event.id, event]));
  const labels = await loadLabels();
  const queue = selectReviewQueue(labels, events, eventsById, args);
  const sourceCheckedStart = labels.filter(isSourceCheckedHumanLabel).length;

  if (args.listOnly) {
    console.log(`HopeIndexAI Phase 1 human review queue: ${queue.length} label(s) selected.`);
    console.log(`Mode: ${args.mode}`);
    console.log(`Source-checked human labels now: ${sourceCheckedStart}/${MIN_HUMAN_LABELS_FOR_CLAIM}`);
    for (const [i, row] of queue.entries()) {
      console.log(`${i + 1}. score=${row.queueScore} | ${row.event.id} | ${row.event.date} | ${eventTitle(row.event)} | ${row.event.country}/${row.event.continent} | prior=${row.label.labelSource} | ${row.activeLearningReasons[0] ?? "review candidate"}`);
    }
    return;
  }

  if (!input.isTTY || !output.isTTY) {
    throw new Error("Human review is interactive. Run with --list in non-interactive environments.");
  }

  if (queue.length === 0) {
    console.log("HopeIndexAI Phase 1 human review -> no labels selected.");
    return;
  }

  const reviewer = process.env.PHASE1_REVIEWER || process.env.USER || "local-human";
  const rl = readline.createInterface({ input, output });
  let reviewed = 0;
  let skipped = 0;
  let sourceCheckedCount = sourceCheckedStart;

  console.log("HopeIndexAI Phase 1 human review");
  console.log("Simple rule: the model is the student; these labels are the answer key.");
  console.log("Judge the real event, not whether the current model guessed well.");
  console.log("A label counts toward model-improvement proof only after source URL or enough source context was checked.");
  console.log("Useful questions: What happened? Is the evidence strong? Would a public-interest analyst care?");

  try {
    for (const [position, row] of queue.entries()) {
      printEvent(row, position + 1, queue.length, sourceCheckedCount);
      let sourceChecked = false;

      if (args.fast) {
        const decision = await askFastDecision(rl);
        if (decision === "quit") break;
        if (decision === "skip") {
          skipped++;
          continue;
        }

        const checked = await askSourceChecked(rl);
        if (checked === "quit") break;
        if (checked === "skip") {
          skipped++;
          continue;
        }
        sourceChecked = true;

        if (decision === "accept") {
          const sourceSupportsClaim = await askSourceSupportsClaim(rl);
          if (sourceSupportsClaim === "quit") break;
          const humanLabel = toHumanLabel(row.label, row.event, reviewer, {
            important: row.label.labels.important,
            categoryCorrect: row.label.labels.categoryCorrect,
            severityCorrect: row.label.labels.severityCorrect,
            summaryQuality: row.label.labels.summaryQuality,
            sourceSupportsClaim,
            notes: "Fast human review: accepted the prior label after checking the source URL or enough source context.",
          });
          saveLabelInMemory(labels, row.index, humanLabel);
          await saveLabels(labels);

          reviewed++;
          if (sourceSupportsClaim && !isSourceCheckedHumanLabel(row.label)) sourceCheckedCount++;
          console.log(`Saved source-checked human label ${reviewed}. Source-checked count: ${sourceCheckedCount}/${MIN_HUMAN_LABELS_FOR_CLAIM}`);
          continue;
        }
      }

      if (!sourceChecked) {
        const checked = await askSourceChecked(rl);
        if (checked === "quit") break;
        if (checked === "skip") {
          skipped++;
          continue;
        }
      }

      const important = await askImportant(rl);
      if (important === "quit") break;
      if (important === "skip") {
        skipped++;
        continue;
      }

      const sourceSupportsClaim = await askSourceSupportsClaim(rl);
      if (sourceSupportsClaim === "quit") break;

      const categoryCorrect = await askBoolean(rl, "Is the current doom/bloom category correct?", row.label.labels.categoryCorrect);
      if (categoryCorrect === "quit") break;

      const severityCorrect = await askBoolean(rl, "Is the current severity correct?", row.label.labels.severityCorrect);
      if (severityCorrect === "quit") break;

      const summaryQuality = await askSummaryQuality(rl, row.event, row.label.labels.summaryQuality);
      if (summaryQuality === "quit") break;

      const notes = (await rl.question("Notes, source caveats, or correction reason? [optional] ")).trim();

      const humanLabel = toHumanLabel(row.label, row.event, reviewer, {
        important,
        categoryCorrect,
        severityCorrect,
        summaryQuality,
        sourceSupportsClaim,
        notes,
      });
      saveLabelInMemory(labels, row.index, humanLabel);
      await saveLabels(labels);

      reviewed++;
      if (sourceSupportsClaim && !isSourceCheckedHumanLabel(row.label)) sourceCheckedCount++;
      console.log(`Saved source-checked human label ${reviewed}. Source-checked count: ${sourceCheckedCount}/${MIN_HUMAN_LABELS_FOR_CLAIM}`);
    }
  } finally {
    rl.close();
  }

  console.log(`HopeIndexAI Phase 1 human review -> reviewed ${reviewed}, skipped ${skipped}.`);
  console.log(`Updated ${LABEL_PATH}`);
  console.log("Run bun run eval:phase1 after reviewing labels.");
}

main().catch((err) => {
  console.error("HopeIndexAI Phase 1 human review failed:", err instanceof Error ? err.message : err);
  process.exit(1);
});
