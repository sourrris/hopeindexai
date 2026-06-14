import { promises as fs } from "fs";

const HEALTH_URL = process.env.HEALTH_URL ?? "http://localhost:3000/api/health";

async function httpHealthCheck(): Promise<{ ok: boolean; message: string; detail?: any }> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(HEALTH_URL, { signal: controller.signal });
    clearTimeout(timeout);
    const body = await res.json();
    if (!res.ok) {
      return { ok: false, message: `Health endpoint returned ${res.status}`, detail: body };
    }
    const failed = body.checks?.filter((c: any) => !c.passed) ?? [];
    if (failed.length > 0) {
      return { ok: false, message: `${failed.length} health check(s) failed`, detail: failed };
    }
    return { ok: true, message: `Health endpoint is healthy (${body.status})`, detail: body };
  } catch (err: any) {
    return { ok: false, message: `Health check request failed: ${err.message}`, detail: { url: HEALTH_URL } };
  }
}

async function modelVersionCheck(): Promise<{ ok: boolean; message: string; detail?: any }> {
  const championPath = "public/data/models/escalation-model-champion.json";
  try {
    const text = await fs.readFile(championPath, "utf8");
    const model = JSON.parse(text);
    if (!model.version) {
      return { ok: false, message: "Champion model missing version field", detail: { championPath } };
    }
    if (model.metrics?.test?.auc == null || model.metrics?.test?.f1 == null) {
      return { ok: false, message: "Champion model missing test metrics", detail: { version: model.version } };
    }
    const auc = model.metrics.test.auc;
    const f1 = model.metrics.test.f1;
    const passes = auc >= 0.80 && f1 >= 0.35;
    return {
      ok: passes,
      message: passes
        ? `Champion model ${model.version} meets quality gate (AUC=${auc}, F1=${f1}).`
        : `Champion model ${model.version} below quality gate (AUC=${auc}, F1=${f1}).`,
      detail: { version: model.version, auc, f1 },
    };
  } catch (err: any) {
    return { ok: false, message: `Could not load champion model: ${err.message}`, detail: { championPath } };
  }
}

async function main() {
  console.log("HopeIndexAI pre-deploy check\n");

  const checks = [
    await modelVersionCheck(),
    await httpHealthCheck(),
  ];

  let allOk = true;
  for (const check of checks) {
    const status = check.ok ? "PASS" : "FAIL";
    console.log(`[${status}] ${check.message}`);
    if (check.detail) console.log(`        ${JSON.stringify(check.detail)}`);
    if (!check.ok) allOk = false;
  }

  if (!allOk) {
    console.log("\nDeployment blocked: fix the failed checks above.");
    process.exit(1);
  }
  console.log("\nPre-deploy checks passed.");
}

main().catch((err) => {
  console.error("Pre-deploy check failed with error:", err);
  process.exit(1);
});
