import { promises as fs } from "fs";
import {
  UcdpEvent,
  UcdpIndex,
  loadUcdpEvents,
  buildUcdpIndex,
  buildSupervisedLabel,
  SupervisedLabel,
} from "../lib/ucdp.ts";

const DEFAULT_EVENTS_PATH = "public/data/events.json";
const UCDP_GED_PATH = "data/external/ucdp/ged_events_compact.jsonl";
const UCDP_CANDIDATE_PATH = "data/external/ucdp_candidate/candidate_events_compact.jsonl";
const DEFAULT_HUMAN_LABELS_PATH = "data/eval/phase1_labels.jsonl";
const DEFAULT_OUTPUT_PATH = "data/training/supervised_labels.jsonl";
const DEFAULT_PROFILE_PATH = "data/training/supervised_labels_profile.json";

interface Phase1Label {
  eventId: string;
  labelSource: "human" | "llm_article_review" | "bootstrap_current_rules";
  humanReviewed: boolean;
  labels: { important: boolean };
  reviewContext?: { sourceChecked?: boolean };
}

interface GdeltEventMinimal {
  id: string;
  date: string;
  country: string;
  lat: number;
  lon: number;
  actor1: string;
  actor2: string;
  surfaceScore?: number;
  surfaceModelProbability?: number;
}

async function readEvents(path: string): Promise<GdeltEventMinimal[]> {
  const raw = JSON.parse(await fs.readFile(path, "utf8"));
  return (raw.events ?? []).map((e: any) => ({
    id: String(e.id),
    date: String(e.date),
    country: String(e.country ?? ""),
    lat: Number(e.lat),
    lon: Number(e.lon),
    actor1: String(e.actor1 ?? ""),
    actor2: String(e.actor2 ?? ""),
    surfaceScore: e.surfaceScore,
    surfaceModelProbability: e.surfaceModelProbability,
  }));
}

async function readUcdp(path: string): Promise<UcdpEvent[]> {
  try {
    const text = await fs.readFile(path, "utf8");
    return loadUcdpEvents(path, text);
  } catch (err: any) {
    if (err.code === "ENOENT") {
      console.warn(`UCDP file not found: ${path}; run bun run import:ucdp or import:ucdp-candidate first.`);
      return [];
    }
    throw err;
  }
}

function parseArgs(): { input: string; humanLabels: string; output: string; profile: string } {
  const args = process.argv.slice(2);
  let input = DEFAULT_EVENTS_PATH;
  let humanLabels = DEFAULT_HUMAN_LABELS_PATH;
  let output = DEFAULT_OUTPUT_PATH;
  let profile = DEFAULT_PROFILE_PATH;

  for (const arg of args) {
    if (arg.startsWith("--input=")) input = arg.slice("--input=".length);
    if (arg.startsWith("--human-labels=")) humanLabels = arg.slice("--human-labels=".length);
    if (arg.startsWith("--output=")) output = arg.slice("--output=".length);
    if (arg.startsWith("--profile=")) profile = arg.slice("--profile=".length);
  }

  return { input, humanLabels, output, profile };
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

async function main() {
  const { input, humanLabels: humanLabelsPath, output, profile: profilePath } = parseArgs();
  const events = await readEvents(input);
  const eventById = new Map(events.map((e) => [e.id, e]));
  const gedEvents = await readUcdp(UCDP_GED_PATH);
  const candidateEvents = await readUcdp(UCDP_CANDIDATE_PATH);
  const allUcdp = [...gedEvents, ...candidateEvents];
  const ucdpIndex: UcdpIndex = buildUcdpIndex(allUcdp);

  console.log(`Building supervised labels for ${events.length} GDELT events using ${allUcdp.length} UCDP events...`);

  const SIGNIFICANT_DEATH_THRESHOLD = 5;

  const labelsById = new Map<string, SupervisedLabel>();
  for (const event of events) {
    const label = buildSupervisedLabel(event, ucdpIndex, {
      dateWindowDays: 3,
      maxDistanceKm: 300,
      minScore: 0.35,
      significantDeathThreshold: SIGNIFICANT_DEATH_THRESHOLD,
    });
    labelsById.set(label.eventId, label);
  }

  // Merge source-checked human labels from Phase 1, taking precedence over UCDP-derived labels.
  const humanLabels = await readJsonl<Phase1Label>(humanLabelsPath);
  let mergedHumanCount = 0;
  for (const h of humanLabels) {
    if (h.labelSource !== "human" || !h.humanReviewed || !h.reviewContext?.sourceChecked) continue;
    const event = eventById.get(h.eventId);
    if (!event) continue;
    labelsById.set(h.eventId, {
      eventId: h.eventId,
      date: event.date,
      countryCode: event.country,
      label: h.labels.important ? 1 : 0,
      labelSource: "phase1_human",
      confidence: 1,
      matches: [],
      deathsBest: 0,
      deathsTotal: 0,
    });
    mergedHumanCount++;
  }

  const labels = Array.from(labelsById.values());
  labels.sort((a, b) => a.date.localeCompare(b.date));

  await fs.mkdir(output.split("/").slice(0, -1).join("/") || ".", { recursive: true });
  await fs.writeFile(output, labels.map((l) => JSON.stringify(l)).join("\n") + "\n");

  const positives = labels.filter((l) => l.label === 1).length;
  const negatives = labels.filter((l) => l.label === 0).length;
  const bySource: Record<string, number> = {};
  for (const l of labels) {
    bySource[l.labelSource] = (bySource[l.labelSource] ?? 0) + 1;
  }

  const profile = {
    generatedAt: new Date().toISOString(),
    total: labels.length,
    positives,
    negatives,
    positiveRate: labels.length > 0 ? positives / labels.length : 0,
    bySource,
    mergedHumanLabels: mergedHumanCount,
    outputPath: output,
    note: `Labels derived from UCDP GED + Candidate matches, overwritten by source-checked Phase 1 human labels. Positive = matched UCDP event with deaths >= ${SIGNIFICANT_DEATH_THRESHOLD} within +/-3 days and 300 km, or human-labeled important. Negative = no/low-death UCDP match or human-labeled not important.`,
  };

  await fs.writeFile(profilePath, JSON.stringify(profile, null, 2));

  console.log("HopeIndexAI supervised labels built");
  console.log(JSON.stringify(profile, null, 2));
}

main().catch((err) => {
  console.error("Failed to build supervised labels:", err);
  process.exit(1);
});
