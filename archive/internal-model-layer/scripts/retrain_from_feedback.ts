import { promises as fs } from "fs";
import { dirname } from "path";

const FEEDBACK_PATH = "data/feedback/decisions.jsonl";
const UCDP_LABELS_PATH = "data/training/supervised_labels.jsonl";
const MERGED_LABELS_PATH = "data/training/supervised_labels_merged.jsonl";
const EVENTS_PATH = "public/data/events.json";
const MODEL_OUTPUT = "data/models/escalation-model-supervised-latest.json";

interface FeedbackDecision {
  timestamp: string;
  eventId: string;
  decision: "false_positive" | "false_negative" | "good_call";
  note?: string;
  source?: string;
}

interface SupervisedLabel {
  eventId: string;
  date: string;
  countryCode: string;
  label: 0 | 1;
  labelSource: string;
  confidence: number;
  matches: any[];
  deathsBest: number;
  deathsTotal: number;
}

async function readJsonl<T>(path: string): Promise<T[]> {
  try {
    const text = await fs.readFile(path, "utf8");
    return text
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => JSON.parse(line) as T);
  } catch (err: any) {
    if (err.code === "ENOENT") return [];
    throw err;
  }
}

async function loadEventsById(path: string): Promise<Map<string, any>> {
  try {
    const text = await fs.readFile(path, "utf8");
    const parsed = JSON.parse(text);
    const events = Array.isArray(parsed.events) ? parsed.events : [];
    return new Map(events.map((e: any) => [String(e.id), e]));
  } catch {
    return new Map();
  }
}

function latestDecisionPerEvent(decisions: FeedbackDecision[]): FeedbackDecision[] {
  const byId = new Map<string, FeedbackDecision>();
  for (const d of decisions) {
    const existing = byId.get(d.eventId);
    if (!existing || d.timestamp > existing.timestamp) {
      byId.set(d.eventId, d);
    }
  }
  return Array.from(byId.values());
}

function decisionToLabel(decision: FeedbackDecision, event?: any): 0 | 1 | null {
  if (decision.decision === "false_positive") return 0;
  if (decision.decision === "false_negative") return 1;
  // good_call: confirm the current surfacing decision
  if (!event) return null;
  const band = event.surfaceBand ?? "background";
  return band === "lead" || band === "watch" ? 1 : 0;
}

async function runCommand(label: string, command: string[]): Promise<void> {
  console.log(`[retrain] ${label}: ${command.join(" ")}`);
  const proc = Bun.spawn(command, { stdout: "inherit", stderr: "inherit" });
  const exitCode = await proc.exited;
  if (exitCode !== 0) {
    throw new Error(`Command failed with exit code ${exitCode}: ${command.join(" ")}`);
  }
}

async function main() {
  const feedback = await readJsonl<FeedbackDecision>(FEEDBACK_PATH);
  if (feedback.length === 0) {
    console.log("No feedback decisions found; nothing to merge.");
    return;
  }

  const latest = latestDecisionPerEvent(feedback);
  const eventsById = await loadEventsById(EVENTS_PATH);

  const ucdpLabels = await readJsonl<SupervisedLabel>(UCDP_LABELS_PATH);
  const labelById = new Map<string, SupervisedLabel>(ucdpLabels.map((l) => [l.eventId, l]));

  let mergedCount = 0;
  for (const d of latest) {
    const event = eventsById.get(d.eventId);
    const label = decisionToLabel(d, event);
    if (label === null) continue;

    const existing = labelById.get(d.eventId);
    const base = existing ?? {
      eventId: d.eventId,
      date: event?.date ?? "",
      countryCode: event?.country ?? "",
      label: 0,
      labelSource: "ucdp_negative",
      confidence: 0,
      matches: [],
      deathsBest: 0,
      deathsTotal: 0,
    };

    labelById.set(d.eventId, {
      ...base,
      label,
      labelSource: "phase1_feedback" as any,
      confidence: 1,
    });
    mergedCount++;
  }

  const merged = Array.from(labelById.values()).sort((a, b) => a.date.localeCompare(b.date));

  await fs.mkdir(dirname(MERGED_LABELS_PATH) || ".", { recursive: true });
  await fs.writeFile(MERGED_LABELS_PATH, merged.map((l) => JSON.stringify(l)).join("\n") + "\n");

  console.log(`[retrain] Merged ${merged.length} labels (${mergedCount} feedback overrides).`);

  await runCommand("Train supervised model from merged labels", [
    "bun", "pipeline/train_supervised.ts",
    `--labels=${MERGED_LABELS_PATH}`,
    `--output=${MODEL_OUTPUT}`,
  ]);

  console.log("[retrain] Retraining complete. Run `bun run surface:phase1` and `bun run eval:phase1` to refresh reports.");
}

main().catch((err) => {
  console.error("Feedback retrain failed:", err);
  process.exit(1);
});
