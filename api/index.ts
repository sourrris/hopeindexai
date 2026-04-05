import { app } from "../src/app";

export const config = { maxDuration: 30 };

// Node.js legacy handler (2-arg) — universally compatible with all Vercel runtimes.
// Hono expects a Web API Request, so we adapt from IncomingMessage manually.
export default async function handler(req: any, res: any): Promise<void> {
  try {
    const proto = (req.headers?.["x-forwarded-proto"] as string) || "https";
    const host = (req.headers?.["host"] as string) || "localhost";
    const url = new URL(req.url || "/", `${proto}://${host}`);

    const headers = new Headers();
    for (const [key, value] of Object.entries(req.headers || {})) {
      if (Array.isArray(value)) {
        for (const v of value) headers.append(key, String(v));
      } else if (value != null) {
        headers.set(key, String(value));
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
    console.error("Handler error:", err);
    if (!res.headersSent) {
      res.statusCode = 500;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ error: "Internal server error" }));
    }
  }
}
