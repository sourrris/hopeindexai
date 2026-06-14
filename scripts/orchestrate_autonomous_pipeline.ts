import { promises as fs } from "fs";

// Autonomous ML improvement pipeline.
// Uses only open, no-key data sources: GDELT v2, UCDP GED, UCDP Candidate.
// Does NOT require human labeling or paid APIs.
//
// Steps:
//   1. Import/refresh UCDP GED and Candidate data.
//   2. (Optional) Fetch historical GDELT window if requested.
//   3. Build supervised labels from UCDP matches.
//   4. Train supervised escalation model.
//   5. Validate against quality gates.
//   6. Promote to champion if it beats the current model.

const CHAMPION_MODEL_PATH = "public/data/escalation-model.json";
const CHALLENGER_MODEL_PATH = "data/models/escalation-model-supervised-latest.json";

interface ModelArtifact {
  version?: string;
  trainedAt?: string;
  metrics?: {
    test?: { auc?: number; f1?: number };
  };
}

async function runCommand(label: string, command: string[]): Promise<{ ok: boolean; output: string }> {
  console.log(`\n[orchestrator] ${label}: ${command.join(" ")}`);
  const proc = Bun.spawn(command, {
    stdout: "pipe",
    stderr: "pipe",
  });
  const text = await new Response(proc.stdout).text();
  const err = await new Response(proc.stderr).text();
  const exitCode = await proc.exited;
  const combined = text + (err ? `\n${err}` : "");
  console.log(combined.slice(-800));
  return { ok: exitCode === 0, output: combined };
}

async function readJson(path: string): Promise<any> {
  return JSON.parse(await fs.readFile(path, "utf8"));
}

async function fileExists(path: string): Promise<boolean> {
  try {
    await fs.access(path);
    return true;
  } catch {
    return false;
  }
}

async function main() {
  const args = process.argv.slice(2);
  const fetchHistorical = args.includes("--fetch-historical");
  const startDate = args.find((a) => a.startsWith("--start="))?.slice("--start=".length);
  const days = parseInt(args.find((a) => a.startsWith("--days="))?.slice("--days=".length) ?? "30", 10);
  const promote = args.includes("--promote");

  const steps: { name: string; ok: boolean; detail?: string }[] = [];

  // 1. Import autonomous external sources
  const ucdp = await runCommand("Import UCDP GED", ["bun", "run", "import:ucdp"]);
  steps.push({ name: "import:ucdp", ok: ucdp.ok });

  const candidate = await runCommand("Import UCDP Candidate", ["bun", "run", "import:ucdp-candidate"]);
  steps.push({ name: "import:ucdp-candidate", ok: candidate.ok });

  // 2. Optional historical GDELT fetch
  if (fetchHistorical && startDate) {
    const hist = await runCommand("Fetch historical GDELT", [
      "bun", "run", "enrich:historical",
      `--start=${startDate}`,
      `--days=${days}`,
      "--output=data/training/historical_events.json",
    ]);
    steps.push({ name: "enrich:historical", ok: hist.ok, detail: `${startDate} +${days}d` });
  }

  // 3. Build supervised labels
  const labels = await runCommand("Build supervised labels", ["bun", "run", "labels:build"]);
  steps.push({ name: "labels:build", ok: labels.ok });

  // 4. Train supervised model (use historical data if available)
  const useHistorical = fetchHistorical || await fileExists("data/training/historical_events_2025_12.json");
  const trainCmd = useHistorical
    ? [
        "bun", "run", "train:supervised",
        "--events=data/training/historical_events_2025_12.json",
        "--labels=data/training/supervised_labels_2025_12.jsonl",
        "--output=data/models/escalation-model-supervised-latest.json",
        "--max-samples=5000",
      ]
    : ["bun", "run", "train:supervised"];
  const train = await runCommand("Train supervised model", trainCmd);
  steps.push({ name: "train:supervised", ok: train.ok });

  // 5. Validate quality gates
  let challenger: ModelArtifact | null = null;
  let champion: ModelArtifact | null = null;
  let beatsChampion = false;

  if (await fileExists(CHALLENGER_MODEL_PATH)) {
    challenger = await readJson(CHALLENGER_MODEL_PATH);
    const testAuc = challenger.metrics?.test?.auc ?? 0;
    const testF1 = challenger.metrics?.test?.f1 ?? 0;
    const passesGate = testAuc >= 0.80 && testF1 >= 0.70;
    steps.push({ name: "quality_gate", ok: passesGate, detail: `AUC=${testAuc}, F1=${testF1}` });

    if (passesGate && await fileExists(CHAMPION_MODEL_PATH)) {
      champion = await readJson(CHAMPION_MODEL_PATH);
      const champAuc = champion.metrics?.test?.auc ?? 0;
      beatsChampion = testAuc > champAuc;
      steps.push({ name: "beats_champion", ok: beatsChampion, detail: `challenger AUC ${testAuc} vs champion AUC ${champAuc}` });
    }
  }

  // 6. Promote if requested and passes gates
  if (promote && beatsChampion) {
    await fs.copyFile(CHALLENGER_MODEL_PATH, CHAMPION_MODEL_PATH);
    steps.push({ name: "promote", ok: true, detail: `copied ${CHALLENGER_MODEL_PATH} to ${CHAMPION_MODEL_PATH}` });
  }

  // Summary
  console.log("\n=== Autonomous Pipeline Summary ===");
  const passed = steps.filter((s) => s.ok).length;
  const failed = steps.filter((s) => !s.ok).length;
  for (const s of steps) {
    const status = s.ok ? "PASS" : "FAIL";
    console.log(`[${status}] ${s.name}${s.detail ? ` (${s.detail})` : ""}`);
  }
  console.log(`\n${passed} passed, ${failed} failed`);

  if (failed > 0) process.exit(1);
}

main().catch((err) => {
  console.error("Orchestrator failed:", err);
  process.exit(1);
});
