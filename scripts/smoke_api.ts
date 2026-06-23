import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { readFileSync } from "node:fs";
import handler from "../api/index.ts";

type EventRow = {
  id?: string;
  date?: string;
  numMentions?: number;
  markerRadius?: number;
  surfaceScore?: number;
  surfaceExplanation?: unknown;
  uncertainty?: unknown;
  duplicateOf?: string | null;
  eventClusterRole?: string;
};

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function surfaceSortScore(event: EventRow): number {
  return Number.isFinite(event.surfaceScore)
    ? Number(event.surfaceScore)
    : Number(event.markerRadius ?? 0);
}

async function fetchJson(baseUrl: string, path: string): Promise<any> {
  const response = await fetch(`${baseUrl}${path}`);
  assert(response.ok, `${path} returned HTTP ${response.status}`);
  return response.json();
}

function createSmokeServer(): Server {
  return createServer(async (req, res) => {
    req.headers["x-forwarded-proto"] = "http";

    try {
      await handler(req, res);
    } catch (err) {
      if (!res.headersSent) {
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: String(err) }));
      }
    }
  });
}

async function listen(server: Server, port: number): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const onError = (err: Error) => {
      server.off("listening", onListening);
      reject(err);
    };
    const onListening = () => {
      server.off("error", onError);
      resolve();
    };

    server.once("error", onError);
    server.once("listening", onListening);
    server.listen(port, "127.0.0.1");
  });
}

async function startSmokeServer(): Promise<{ server: Server; baseUrl: string }> {
  const envPort = Number.parseInt(process.env.SMOKE_API_PORT ?? "", 10);
  const ports = Number.isFinite(envPort) && envPort > 0
    ? [envPort]
    : [0];
  let lastError = "";

  for (const port of ports) {
    const server = createSmokeServer();
    try {
      await listen(server, port);
      const address = server.address() as AddressInfo;
      return { server, baseUrl: `http://127.0.0.1:${address.port}` };
    } catch (err) {
      const error = err as Error & { code?: string };
      lastError = error.message;
      if (error.code !== "EADDRINUSE" && error.code !== "EACCES") throw err;
    }
  }

  const portLabel = ports[0] === 0 ? "an ephemeral port" : `${ports[0]}-${ports[ports.length - 1]}`;
  throw new Error(`Failed to start server. Tried ${portLabel}. ${lastError}`);
}

function assertSortedBySurface(events: EventRow[], label: string): void {
  for (let i = 1; i < events.length; i++) {
    const prev = events[i - 1];
    const current = events[i];
    const prevScore = surfaceSortScore(prev);
    const currentScore = surfaceSortScore(current);

    assert(
      prevScore > currentScore ||
        (prevScore === currentScore && Number(prev.numMentions ?? 0) >= Number(current.numMentions ?? 0)),
      `${label} is not sorted by surface score at index ${i}`
    );
  }
}

function sourceCheckedHumanIds(): Set<string> {
  try {
    const rows = readFileSync("data/eval/phase1_labels.jsonl", "utf8")
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => JSON.parse(line));
    return new Set(
      rows
        .filter((row) =>
          row.labelSource === "human" &&
          row.humanReviewed === true &&
          row.reviewContext?.sourceChecked === true
        )
        .map((row) => row.eventId)
    );
  } catch {
    return new Set();
  }
}

async function main() {
  const { server, baseUrl } = await startSmokeServer();

  try {
    const status = await fetchJson(baseUrl, "/api/ai-status");
    assert(typeof status.ready === "boolean", "/api/ai-status must return a boolean ready field");

    const oneDay = await fetchJson(baseUrl, "/api/events?days=1");
    const sevenDays = await fetchJson(baseUrl, "/api/events?days=7");
    const reviewQueue = await fetchJson(baseUrl, "/api/review-queue?days=7&limit=25&mode=priority");

    assert(Array.isArray(oneDay.events), "days=1 must return an events array");
    assert(Array.isArray(sevenDays.events), "days=7 must return an events array");
    assert(oneDay.source === "live", "/api/events default source must be live");
    assert(sevenDays.source === "live", "/api/events default source must be live");
    assert(reviewQueue.source === "live", "/api/review-queue default source must be live");
    assert(oneDay.count === oneDay.events.length, "days=1 count must match events length");
    assert(sevenDays.count === sevenDays.events.length, "days=7 count must match events length");
    assert(oneDay.events.length > 0, "days=1 should return at least one event from the live feed");
    assert(sevenDays.events.length >= oneDay.events.length, "days=7 should include at least as many events as days=1");
    assert(typeof oneDay.events[0].surfaceExplanation?.summary === "string", "/api/events must return surfaceExplanation");
    assert(typeof oneDay.events[0].uncertainty?.level === "string", "/api/events must return uncertainty");
    assert(typeof oneDay.events[0].eventClusterId === "string", "/api/events must return eventClusterId");

    assertSortedBySurface(oneDay.events, "days=1 events");
    assertSortedBySurface(sevenDays.events, "days=7 events");
    assert(Array.isArray(reviewQueue.queue), "/api/review-queue must return a queue array");
    assert(reviewQueue.queue.length > 0, "/api/review-queue should return review candidates");
    assert(reviewQueue.counts?.returned === reviewQueue.queue.length, "/api/review-queue returned count must match");
    assert(typeof reviewQueue.strategy?.mode === "string", "/api/review-queue must return strategy mode");
    assert(typeof reviewQueue.caveat === "string", "/api/review-queue must return caveat");

    const checkedIds = sourceCheckedHumanIds();
    for (const row of reviewQueue.queue) {
      assert(row.event?.duplicateOf == null, "/api/review-queue must exclude duplicate source rows");
      assert(row.event?.eventClusterRole !== "member", "/api/review-queue must exclude incident cluster members");
      assert(!checkedIds.has(row.event?.id), "/api/review-queue must exclude source-checked human labels");
      assert(typeof row.activeLearning?.score === "number", "/api/review-queue rows must include activeLearning score");
      assert(Array.isArray(row.activeLearning?.reasons), "/api/review-queue rows must include activeLearning reasons");
    }

    const invalidQueueDays = await fetch(`${baseUrl}/api/review-queue?days=abc&limit=10`);
    assert(invalidQueueDays.status === 400, "/api/review-queue invalid days must return HTTP 400");
    const invalidQueueLimit = await fetch(`${baseUrl}/api/review-queue?days=7&limit=0`);
    assert(invalidQueueLimit.status === 400, "/api/review-queue invalid limit must return HTTP 400");
    const invalidQueueMode = await fetch(`${baseUrl}/api/review-queue?days=7&limit=10&mode=nope`);
    assert(invalidQueueMode.status === 400, "/api/review-queue invalid mode must return HTTP 400");

    const missingProbe = await fetch(`${baseUrl}/api/probe`);
    assert(missingProbe.status === 400, "/api/probe without id must return HTTP 400");

    const invalidProbe = await fetch(`${baseUrl}/api/probe?id=missing-event-id`);
    assert(invalidProbe.status === 404, "/api/probe with unknown id must return HTTP 404");

    const probe = await fetchJson(baseUrl, `/api/probe?days=1&id=${encodeURIComponent(oneDay.events[0].id)}`);
    assert(typeof probe.probe?.selectedEvent?.surfaceExplanation?.summary === "string", "/api/probe must return selectedEvent.surfaceExplanation");
    assert(typeof probe.probe?.selectedEvent?.uncertainty?.level === "string", "/api/probe must return selectedEvent.uncertainty");
    assert(typeof probe.probe?.reviewCopilot?.bottomLine === "string", "/api/probe must return reviewCopilot.bottomLine");
    assert(Array.isArray(probe.probe.reviewCopilot.whySurfaced), "/api/probe must return reviewCopilot.whySurfaced");
    assert(Array.isArray(probe.probe.reviewCopilot.whatToVerify), "/api/probe must return reviewCopilot.whatToVerify");
    assert(Array.isArray(probe.probe.reviewCopilot.uncertainty), "/api/probe must return reviewCopilot.uncertainty");
    assert(Array.isArray(probe.probe.reviewCopilot.watchNext), "/api/probe must return reviewCopilot.watchNext");
    assert(
      ["assign", "watch", "dismiss"].includes(probe.probe.reviewCopilot.suggestedDecision?.decision),
      "/api/probe must return a valid reviewCopilot.suggestedDecision"
    );

    if (!status.ready) {
      const reviewNote = await fetch(`${baseUrl}/api/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ events: [oneDay.events[0]], mode: "review_note" }),
      });
      const reviewNoteBody = await reviewNote.json();
      assert(reviewNote.status === 400, "/api/analyze review_note must fail cleanly without an API key");
      assert(typeof reviewNoteBody.error === "string", "/api/analyze review_note no-key response must include an error");
    }

    console.log("HopeIndexAI API smoke test passed");
    console.log(`aiStatus.ready=${status.ready}`);
    console.log(`events.days1=${oneDay.events.length}`);
    console.log(`events.days7=${sevenDays.events.length}`);
    console.log(`reviewQueue=${reviewQueue.queue.length}`);
    console.log(`probe.reviewCopilot=${probe.probe.reviewCopilot.suggestedDecision.label}`);
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close((err) => err ? reject(err) : resolve());
    });
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
