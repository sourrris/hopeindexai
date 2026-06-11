import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import handler from "../api/index.ts";

type EventRow = {
  id?: string;
  date?: string;
  numMentions?: number;
  markerRadius?: number;
  surfaceScore?: number;
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
    : Array.from({ length: 50 }, (_, index) => 43100 + index);
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

  throw new Error(`Failed to start server. Tried ports ${ports[0]}-${ports[ports.length - 1]}. ${lastError}`);
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

async function main() {
  const { server, baseUrl } = await startSmokeServer();

  try {
    const status = await fetchJson(baseUrl, "/api/ai-status");
    assert(typeof status.ready === "boolean", "/api/ai-status must return a boolean ready field");

    const oneDay = await fetchJson(baseUrl, "/api/events?days=1");
    const sevenDays = await fetchJson(baseUrl, "/api/events?days=7");
    const riskChampion = await fetchJson(baseUrl, "/api/risk-champion");
    const riskWindows = await fetchJson(baseUrl, "/api/risk-windows?split=holdout_preliminary&limit=5");

    assert(Array.isArray(oneDay.events), "days=1 must return an events array");
    assert(Array.isArray(sevenDays.events), "days=7 must return an events array");
    assert(oneDay.count === oneDay.events.length, "days=1 count must match events length");
    assert(sevenDays.count === sevenDays.events.length, "days=7 count must match events length");
    assert(oneDay.events.length > 0, "days=1 should return at least one event from the static slice");
    assert(sevenDays.events.length >= oneDay.events.length, "days=7 should include at least as many events as days=1");

    assertSortedBySurface(oneDay.events, "days=1 events");
    assertSortedBySurface(sevenDays.events, "days=7 events");
    assert(typeof riskChampion.champion?.championId === "string", "/api/risk-champion must return a champion id");
    assert(Array.isArray(riskWindows.windows), "/api/risk-windows must return a windows array");
    assert(riskWindows.windows.length > 0, "/api/risk-windows should return at least one ranked window");

    console.log("HopeIndexAI API smoke test passed");
    console.log(`aiStatus.ready=${status.ready}`);
    console.log(`events.days1=${oneDay.events.length}`);
    console.log(`events.days7=${sevenDays.events.length}`);
    console.log(`riskChampion=${riskChampion.champion.championId}`);
    console.log(`riskWindows=${riskWindows.windows.length}`);
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
