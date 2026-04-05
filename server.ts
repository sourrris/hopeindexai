import { app } from "./src/app";

// Static files — local dev only (Vercel serves these from public/)
app.get("/", async (c) => {
  const html = await Bun.file("index.html").text();
  return c.html(html);
});

app.get("/app.js", async (c) => {
  const js = await Bun.file("app.js").text();
  c.header("Content-Type", "application/javascript; charset=utf-8");
  return c.body(js);
});

const port = parseInt(process.env.PORT ?? "3000", 10);
console.log(`HopeIndexAI → http://localhost:${port}`);
export default { port, fetch: app.fetch };
