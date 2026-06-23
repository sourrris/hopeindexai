/**
 * Local test server that replicates Vercel's Node.js runtime behaviour.
 * Calls api/index.ts handler and passes (IncomingMessage, ServerResponse).
 *
 * Usage:  bun test-handler.mjs        ← preferred (Bun handles .ts imports)
 *   OR:   bun run test:vercel         ← via package.json script
 */
import { createServer } from "node:http";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Dynamically import the handler (tsx handles the TypeScript)
const { default: handler } = await import(resolve(__dirname, "api/index.ts"));

const PORT = 3001;

const server = createServer(async (req, res) => {
  // Simulate Vercel's x-forwarded-proto / host headers
  req.headers["x-forwarded-proto"] = "http";
  req.headers["host"] = `localhost:${PORT}`;

  try {
    await handler(req, res);
  } catch (err) {
    console.error("Uncaught handler error:", err);
    if (!res.headersSent) {
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: String(err) }));
    }
  }
});

server.listen(PORT, () => {
  console.log(`Test server running at http://localhost:${PORT}`);
  console.log("Try: curl http://localhost:3001/api/ai-status");
  console.log("     curl 'http://localhost:3001/api/events?days=1'");
});
