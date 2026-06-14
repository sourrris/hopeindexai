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
const DEFAULT_OUTPUT_PATH = "data/training/supervised_labels.jsonl";
const DEFAULT_PROFILE_PATH = "data/training/supervised_labels_profile.json";

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

function parseArgs(): { input: string; output: string; profile: string } {
  const args = process.argv.slice(2);
  let input = DEFAULT_EVENTS_PATH;
  let output = DEFAULT_OUTPUT_PATH;
  let profile = DEFAULT_PROFILE_PATH;

  for (const arg of args) {
    if (arg.startsWith("--input=")) input = arg.slice("--input=".length);
    if (arg.startsWith("--output=")) output = arg.slice("--output=".length);
    if (arg.startsWith("--profile=")) profile = arg.slice("--profile=".length);
  }

  return { input, output, profile };
}

async function main() {
  const { input, output, profile: profilePath } = parseArgs();
  const events = await readEvents(input);
  const gedEvents = await readUcdp(UCDP_GED_PATH);
  const candidateEvents = await readUcdp(UCDP_CANDIDATE_PATH);
  const allUcdp = [...gedEvents, ...candidateEvents];
  const ucdpIndex: UcdpIndex = buildUcdpIndex(allUcdp);

  console.log(`Building supervised labels for ${events.length} GDELT events using ${allUcdp.length} UCDP events...`);

  const SIGNIFICANT_DEATH_THRESHOLD = 5;

  const labels: SupervisedLabel[] = [];
  for (const event of events) {
    const label = buildSupervisedLabel(event, ucdpIndex, {
      dateWindowDays: 3,
      maxDistanceKm: 300,
      minScore: 0.35,
      significantDeathThreshold: SIGNIFICANT_DEATH_THRESHOLD,
    });
    labels.push(label);
  }

  // Sort by date
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
    outputPath: output,
    note: `Labels derived from UCDP GED + Candidate matches. Positive = matched UCDP event with deaths >= ${SIGNIFICANT_DEATH_THRESHOLD} within +/-3 days and 300 km. Negative = no match or low-death match.`,
  };

  await fs.writeFile(profilePath, JSON.stringify(profile, null, 2));

  console.log("HopeIndexAI supervised labels built");
  console.log(JSON.stringify(profile, null, 2));
}

main().catch((err) => {
  console.error("Failed to build supervised labels:", err);
  process.exit(1);
});
