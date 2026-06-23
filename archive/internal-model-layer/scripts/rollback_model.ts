import { promises as fs } from "fs";

const CHAMPION_MODEL_PATH = "public/data/models/escalation-model-champion.json";
const PREVIOUS_MODEL_PATH = "public/data/models/escalation-model-previous.json";
const LEGACY_CHAMPION_MODEL_PATH = "public/data/escalation-model.json";
const LEGACY_PREVIOUS_MODEL_PATH = "public/data/escalation-model-previous.json";
const PROMOTION_LOG_PATH = "data/models/promotion_log.jsonl";

interface PromotionRecord {
  timestamp: string;
  action: "promote" | "rollback" | "dry_run" | "no_promotion";
  championPath: string;
  challengerPath?: string;
  previousPath?: string;
  reason?: string;
}

async function fileExists(path: string): Promise<boolean> {
  try {
    await fs.access(path);
    return true;
  } catch {
    return false;
  }
}

async function appendLog(record: PromotionRecord): Promise<void> {
  await fs.mkdir(PROMOTION_LOG_PATH.split("/").slice(0, -1).join("/") || ".", { recursive: true });
  await fs.appendFile(PROMOTION_LOG_PATH, JSON.stringify(record) + "\n");
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");

  const previousPath = await fileExists(PREVIOUS_MODEL_PATH) ? PREVIOUS_MODEL_PATH : LEGACY_PREVIOUS_MODEL_PATH;
  const championPath = await fileExists(PREVIOUS_MODEL_PATH) ? CHAMPION_MODEL_PATH : LEGACY_CHAMPION_MODEL_PATH;

  if (!(await fileExists(previousPath))) {
    console.error(`Rollback failed: no previous model at ${PREVIOUS_MODEL_PATH} or ${LEGACY_PREVIOUS_MODEL_PATH}.`);
    process.exit(1);
  }

  const previous = await fs.readFile(previousPath, "utf8");
  let previousVersion = "unknown";
  try {
    previousVersion = JSON.parse(previous).version ?? "unknown";
  } catch {
    // ignore
  }

  if (dryRun) {
    console.log(`DRY RUN: would copy ${previousPath} to ${championPath}`);
    return;
  }

  await fs.copyFile(previousPath, championPath);
  await appendLog({
    timestamp: new Date().toISOString(),
    action: "rollback",
    championPath,
    previousPath,
    reason: `Restored previous champion (${previousVersion}).`,
  });

  console.log(`Rollback complete: restored previous champion (${previousVersion}) to ${championPath}.`);
}

main().catch((err) => {
  console.error("Rollback failed:", err);
  process.exit(1);
});
