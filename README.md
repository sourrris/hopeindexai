# HopeIndexAI

Real-time geopolitical event intelligence. Live GDELT data classified into conflict and cooperation, mapped globally, filterable by region and severity.

## Stack

- **Frontend** — React 18 (CDN), Leaflet, Geist font, system dark/light
- **Backend** — Bun + Hono (TypeScript), GDELT proxy with 15-min cache
- **Data** — [GDELT Project](https://www.gdeltproject.org) v2 export stream

## Quick start

```bash
git clone https://github.com/sourrrish/hopeindexai
cd hopeindexai
bun install
bun run dev
```

Open [http://localhost:3000](http://localhost:3000).

**Node.js alternative** (no Bun):

```bash
npm install hono fflate
npx tsx server.ts
```

## AI analysis

The AI panel at the bottom of the app accepts an [Anthropic API key](https://console.anthropic.com). Your key is transmitted directly to Anthropic in your session — it is never stored or logged by the server. To get a key:

1. Sign up at [console.anthropic.com](https://console.anthropic.com)
2. Create an API key under **API Keys**
3. Paste it into the input field in the app

## Data attribution

Event data is sourced from the **[GDELT Project](https://www.gdeltproject.org)**. HopeIndexAI is not affiliated with GDELT. Events reflect media-reported incidents and should not be treated as independently verified ground truth.

## License

MIT
