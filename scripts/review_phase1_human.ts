import { mkdir, readFile, writeFile } from "fs/promises";
import { dirname } from "path";
import { stdin as input, stdout as output } from "process";
import readline from "readline/promises";

type LabelSource = "human" | "llm_article_review" | "bootstrap_current_rules";
type Severity = "low" | "medium" | "high" | "critical";

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
}

const EVENTS_PATH = "public/data/events.json";
const LABEL_PATH = "data/eval/phase1_labels.jsonl";
const MIN_HUMAN_LABELS_FOR_CLAIM = 100;

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
  };

  for (const arg of argv) {
    if (arg === "--force") args.force = true;
    else if (arg === "--fast") args.fast = true;
    else if (arg === "--list") args.listOnly = true;
    else if (arg.startsWith("--limit=")) {
      const parsed = Number.parseInt(arg.slice("--limit=".length), 10);
      if (!Number.isFinite(parsed) || parsed < 0) throw new Error("--limit must be a non-negative integer.");
      args.limit = parsed;
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
  bun scripts/review_phase1_human.ts [--list] [--limit=20] [--fast] [--force]

Options:
  --list       Show the review queue without changing labels.
  --limit=N    Review or list at most N labels.
  --fast       One-key accept/edit/skip mode for reviewing prior LLM/Codex labels.
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

async function loadEvents(): Promise<Map<string, GdeltEvent>> {
  const parsed = JSON.parse(await readFile(EVENTS_PATH, "utf8"));
  if (!parsed || !Array.isArray(parsed.events)) throw new Error(`${EVENTS_PATH} must contain an events array.`);
  return new Map(parsed.events.map((event: GdeltEvent) => [event.id, event]));
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

function selectReviewQueue(labels: Phase1Label[], eventsById: Map<string, GdeltEvent>, args: Args) {
  return labels
    .map((label, index) => ({ label, index, event: eventsById.get(label.eventId) }))
    .filter((row): row is { label: Phase1Label; index: number; event: GdeltEvent } => Boolean(row.event))
    .filter(({ label }) => args.force || !(label.labelSource === "human" && label.humanReviewed))
    .sort((a, b) => {
      const aRank = a.label.labelSource === "llm_article_review" ? 0 : a.label.labelSource === "bootstrap_current_rules" ? 1 : 2;
      const bRank = b.label.labelSource === "llm_article_review" ? 0 : b.label.labelSource === "bootstrap_current_rules" ? 1 : 2;
      return aRank - bRank;
    })
    .slice(0, args.limit);
}

function printEvent(row: { label: Phase1Label; event: GdeltEvent }, position: number, total: number, humanCount: number) {
  const { label, event } = row;
  const context = label.reviewContext ?? {};

  console.log("\n" + "-".repeat(78));
  console.log(`Review ${position}/${total} | human labels: ${humanCount}/${MIN_HUMAN_LABELS_FOR_CLAIM}`);
  console.log(`ID: ${event.id}`);
  console.log(`Date: ${event.date}`);
  console.log(`Title: ${eventTitle(event)}`);
  console.log(`Location: ${event.location || event.country || "unknown"}`);
  console.log(`Country/continent: ${event.country || "n/a"} / ${event.continent || "n/a"}`);
  console.log(`Current category/theme/severity: ${event.category} / ${event.theme ?? "unknown"} / ${event.severity}`);
  console.log(`GDELT class: ${event.quadLabel} | Goldstein: ${event.goldstein ?? "n/a"} | Tone: ${event.avgTone ?? "n/a"} | Mentions: ${event.numMentions}`);
  console.log(`Source: ${hostFromUrl(event.sourceUrl) || "unknown"} | ${event.sourceUrl || "no URL"}`);
  console.log(`Previous label: ${label.labelSource}, important=${boolText(label.labels.important)}, categoryCorrect=${boolText(label.labels.categoryCorrect)}, severityCorrect=${boolText(label.labels.severityCorrect)}`);

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
  const choice = await askChoice(rl, "Accept prior label? [a accept/e edit/s skip/q quit] ", {
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
      humanReviewVersion: "phase1.human-cli.v1",
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

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const eventsById = await loadEvents();
  const labels = await loadLabels();
  const queue = selectReviewQueue(labels, eventsById, args);
  const humanStart = labels.filter((label) => label.labelSource === "human" && label.humanReviewed).length;

  if (args.listOnly) {
    console.log(`HopeIndexAI Phase 1 human review queue: ${queue.length} label(s) selected.`);
    console.log(`Human-reviewed labels now: ${humanStart}/${MIN_HUMAN_LABELS_FOR_CLAIM}`);
    for (const [i, row] of queue.entries()) {
      console.log(`${i + 1}. ${row.event.id} | ${row.event.date} | ${eventTitle(row.event)} | ${row.event.country}/${row.event.continent} | prior=${row.label.labelSource}`);
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
  let humanCount = humanStart;

  console.log("HopeIndexAI Phase 1 human review");
  console.log("Simple rule: the model is the student; these labels are the answer key.");
  console.log("Judge the real event, not whether the current model guessed well.");
  console.log("Useful questions: What happened? Is the evidence strong? Would a public-interest analyst care?");

  try {
    for (const [position, row] of queue.entries()) {
      printEvent(row, position + 1, queue.length, humanCount);

      if (args.fast) {
        const decision = await askFastDecision(rl);
        if (decision === "quit") break;
        if (decision === "skip") {
          skipped++;
          continue;
        }

        if (decision === "accept") {
          labels[row.index] = toHumanLabel(row.label, row.event, reviewer, {
            important: row.label.labels.important,
            categoryCorrect: row.label.labels.categoryCorrect,
            severityCorrect: row.label.labels.severityCorrect,
            summaryQuality: row.label.labels.summaryQuality,
            notes: "Fast human review: accepted the prior label after checking event metadata, source domain, and rationale. Source article was not independently opened.",
          });
          await saveLabels(labels);

          reviewed++;
          if (!(row.label.labelSource === "human" && row.label.humanReviewed)) humanCount++;
          console.log(`Saved human label ${reviewed}. Human-reviewed count: ${humanCount}/${MIN_HUMAN_LABELS_FOR_CLAIM}`);
          continue;
        }
      }

      const important = await askImportant(rl);
      if (important === "quit") break;
      if (important === "skip") {
        skipped++;
        continue;
      }

      const categoryCorrect = await askBoolean(rl, "Is the current doom/bloom category correct?", row.label.labels.categoryCorrect);
      if (categoryCorrect === "quit") break;

      const severityCorrect = await askBoolean(rl, "Is the current severity correct?", row.label.labels.severityCorrect);
      if (severityCorrect === "quit") break;

      const summaryQuality = await askSummaryQuality(rl, row.event, row.label.labels.summaryQuality);
      if (summaryQuality === "quit") break;

      const notes = (await rl.question("Notes, source caveats, or correction reason? [optional] ")).trim();

      labels[row.index] = toHumanLabel(row.label, row.event, reviewer, {
        important,
        categoryCorrect,
        severityCorrect,
        summaryQuality,
        notes,
      });
      await saveLabels(labels);

      reviewed++;
      if (!(row.label.labelSource === "human" && row.label.humanReviewed)) humanCount++;
      console.log(`Saved human label ${reviewed}. Human-reviewed count: ${humanCount}/${MIN_HUMAN_LABELS_FOR_CLAIM}`);
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
