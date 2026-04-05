import { app } from "../src/app";

export const config = { maxDuration: 30 };

// Forbidden request headers that Node.js undici rejects when constructing a Request
const FORBIDDEN = new Set([
  "host", "connection", "keep-alive", "transfer-encoding", "te",
  "trailer", "upgrade", "accept-encoding", "content-length",
  "access-control-request-headers", "access-control-request-method",
  "accept-charset", "cookie2", "date", "dnt", "expect", "origin", "via",
]);

// Node.js legacy handler (2-arg) — universally compatible with all Vercel runtimes.
// Hono expects a Web API Request, so we adapt from IncomingMessage manually.
export default async function handler(req: any, res: any): Promise<void> {
  try {
    const rawProto = req.headers?.["x-forwarded-proto"];
    const proto = (Array.isArray(rawProto) ? rawProto[0] : rawProto || "https").split(",")[0].trim();
    const rawHost = req.headers?.["host"];
    const host = (Array.isArray(rawHost) ? rawHost[0] : rawHost || "localhost").split(",")[0].trim();
    const url = new URL(req.url || "/", `${proto}://${host}`);

    // Only pass safe, non-forbidden headers to avoid undici TypeError
    const headers = new Headers();
    for (const [key, value] of Object.entries(req.headers || {})) {
      const k = key.toLowerCase();
      if (FORBIDDEN.has(k) || k.startsWith("proxy-") || k.startsWith(":")) continue;
      if (Array.isArray(value)) {
        for (const v of value) headers.append(k, String(v));
      } else if (value != null) {
        headers.set(k, String(value));
      }
    }

    const webReq = new Request(url.toString(), {
      method: req.method || "GET",
      headers,
    });

    const webRes = await app.fetch(webReq);

    res.statusCode = webRes.status;
    webRes.headers.forEach((value: string, key: string) => {
      res.setHeader(key, value);
    });
    const body = Buffer.from(await webRes.arrayBuffer());
    res.end(body);
  } catch (err) {
    const msg = err instanceof Error ? `${err.name}: ${err.message}` : String(err);
    console.error("Handler error:", msg);
    if (!res.headersSent) {
      res.statusCode = 500;
      res.setHeader("Content-Type", "application/json");
      // Include error detail temporarily so we can diagnose if this persists
      res.end(JSON.stringify({ error: msg }));
    }
  }
}
