# HopeIndexAI

Real-time geopolitical event intelligence. Live GDELT data classified into conflict and cooperation, mapped globally, filterable by region and severity. Click any event for an AI-powered briefing covering economic ripple effects, cultural impact, and escalation outlook.

## Stack

- **Frontend** — React 18 (CDN), Leaflet, Geist font
- **Backend** — Bun + Hono (TypeScript), GDELT proxy with 15-min cache
- **AI** — Claude (Anthropic) via server-side key, never exposed to the browser
- **Data** — [GDELT Project](https://www.gdeltproject.org) v2 export stream

## Quick start

```bash
git clone https://github.com/sourrrish/hopeindexai
cd hopeindexai
bun install
```

Copy the example env file and add your key (see [AI analysis](#ai-analysis) below):

```bash
cp .env.example .env
```

Then start the server:

```bash
bun run dev
```

Open [http://localhost:3000](http://localhost:3000).

**Node.js alternative** (no Bun):

```bash
npm install hono fflate
npx tsx server.ts
```

---

## AI analysis

HopeIndexAI uses Claude to generate expert geopolitical briefings for individual events — covering immediate context, economic implications, cultural impact, and regional ripple effects.

### Setup

1. Sign up at [console.anthropic.com](https://console.anthropic.com)
2. Go to **API Keys** and create a new key
3. Open your `.env` file and set:

```env
ANTHROPIC_API_KEY=sk-ant-your-key-here
```

4. Restart the server (`bun run dev`)

That's it. Click any event on the map to open the detail panel, then hit **Analyze Event**.

### How it works

The key lives on the server — it is never sent to the browser or logged. When you click **Analyze Event**, the frontend calls `/api/analyze`, the server reads `ANTHROPIC_API_KEY` from the environment, and returns the analysis. The key never leaves your machine.

---

## Data attribution

Event data is sourced from the **[GDELT Project](https://www.gdeltproject.org)**. HopeIndexAI is not affiliated with GDELT. Events reflect media-reported incidents and should not be treated as independently verified ground truth.

## License

MIT
