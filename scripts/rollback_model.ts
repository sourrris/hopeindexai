import { promises as fs } from "fs";

const CHAMPION_MODEL_PATH = "public/data/escalation-model.json";
const PREVIOUS_MODEL_PATH = "public/data/escalation-model-previous.json";
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

  if (!(await fileExists(PREVIOUS_MODEL_PATH))) {
    console.error(`Rollback failed: no previous model at ${PREVIOUS_MODEL_PATH}.`);
    process.exit(1);
  }

  const previous = await fs.readFile(PREVIOUS_MODEL_PATH, "utf8");
  let previousVersion = "unknown";
  try {
    previousVersion = JSON.parse(previous).version ?? "unknown";
  } catch {
    // ignore
  }

  if (dryRun) {
    console.log(`DRY RUN: would copy ${PREVIOUS_MODEL_PATH} to ${CHAMPION_MODEL_PATH}`);
    return;
  }

  await fs.copyFile(PREVIOUS_MODEL_PATH, CHAMPION_MODEL_PATH);
  await appendLog({
    timestamp: new Date().toISOString(),
    action: "rollback",
    championPath: CHAMPION_MODEL_PATH,
    previousPath: PREVIOUS_MODEL_PATH,
    reason: `Restored previous champion (${previousVersion}).`,
  });

  console.log(`Rollback complete: restored previous champion (${previousVersion}) to ${CHAMPION_MODEL_PATH}.`);
}

main().catch((err) => {
  console.error("Rollback failed:", err);
  process.exit(1);
});
