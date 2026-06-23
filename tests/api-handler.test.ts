import { afterAll, beforeAll, expect, test } from "bun:test";
import { createServer, type Server } from "node:http";

process.env.ANTHROPIC_API_KEY = "";

const { default: handler } = await import("../api/index.ts");

let server: Server;
let baseUrl = "";

beforeAll(async () => {
  server = createServer(async (req, res) => {
    req.headers["x-forwarded-proto"] = "http";
    req.headers["host"] = new URL(baseUrl).host;
    await handler(req, res);
  });

  await new Promise<void>((resolve) => {
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (typeof address !== "object" || address === null) {
        throw new Error("Expected server to listen on a TCP port");
      }
      baseUrl = `http://127.0.0.1:${address.port}`;
      resolve();
    });
  });
});

afterAll(async () => {
  await new Promise<void>((resolve, reject) => {
    server.close((err) => (err ? reject(err) : resolve()));
  });
});

test("Vercel handler forwards POST JSON bodies to Hono", async () => {
  const res = await fetch(`${baseUrl}/api/analyze`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      events: [{
        id: "event-1",
        lat: 40,
        lon: -74,
        category: "doom",
        goldstein: -5,
        quadClass: 4,
        quadLabel: "Material Conflict",
        actor1: "Actor One",
        actor2: "Actor Two",
        country: "US",
        location: "New York, United States",
        date: "2026-06-23",
        numMentions: 3,
        avgTone: -1.2,
        sourceUrl: "https://example.com/report",
        markerRadius: 4,
        severity: "high",
        continent: "Americas",
      }],
      mode: "detail",
    }),
  });

  const data = await res.json() as { error?: string };

  expect(res.status).toBe(400);
  expect(data.error).toContain("No Anthropic API key configured");
});

test("Vercel handler rejects invalid POST JSON bodies", async () => {
  const res = await fetch(`${baseUrl}/api/analyze`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{not-json",
  });

  const data = await res.json() as { error?: string };

  expect(res.status).toBe(400);
  expect(data.error).toBe("Invalid request body");
});
