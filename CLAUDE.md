# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Local dev (requires Bun)
bun install
bun run dev        # starts server at http://localhost:3000

# Alternative without Bun
npm install hono fflate
npx tsx server.ts

# Vercel deployment is automatic on push to main
```

There are no test, lint, or build commands — the project has no test suite, no linter config, and no frontend build step.

## Architecture

### Two execution environments

| Context | Entry point | Static files | API routing |
|---------|-------------|--------------|-------------|
| Local (Bun) | `server.ts` | Served inline by `server.ts` | `src/app.ts` |
| Vercel | `api/index.ts` | `public/` via Vercel CDN | `src/app.ts` |

`server.ts` is Bun-only (uses `Bun.file()`). `api/index.ts` is the Vercel serverless function — it adapts Node.js `IncomingMessage`/`ServerResponse` to a Web API `Request`/`Response` before calling `app.fetch()`.

### File duality: root vs `public/`

`index.html` + `app.js` (project root) are used for local dev.  
`public/index.html` + `public/app.js` are served by Vercel in production.

These two pairs are **identical** and must be kept in sync manually.

### Backend: `src/app.ts`

Single Hono app file. Three routes:

- `GET /api/ai-status` — returns `{ ready: boolean }` based on whether `ANTHROPIC_API_KEY` env var is set
- `GET /api/events?days=1-30` — fetches 10 GDELT v2 export ZIP files in parallel, decompresses with `fflate.unzipSync`, parses tab-separated CSV, and returns up to 1,500 events sorted by severity. Has a 15-minute in-memory cache keyed by `days`.
- `POST /api/analyze` — calls Claude (`claude-sonnet-4-6`) with GDELT event data. API key comes from `ANTHROPIC_API_KEY` env var; client can supply a fallback via request body `apiKey`.

GDELT data model: events are classified as `doom` (negative Goldstein scale) or `bloom` (positive). GDELT uses FIPS country codes (not ISO), so the `FIPS_CONTINENT` map in `src/app.ts` handles the country→continent mapping — key differences from ISO include: `UK` (not GB), `JA` (not JP), `RS`=Russia (not Serbia), `CH`=China.

### Frontend: `public/app.js`

React 18 + Leaflet, loaded entirely from CDN. **No build step** — JSX is transpiled by Babel standalone at runtime in the browser. No npm imports, no bundler.

Component tree:
```
App                  — state: events, filters, selected, loading, error
├── TopBar           — doom/bloom counts
├── MapView          — Leaflet map with CircleMarkers; top 5 doom events get SVG pulse rings
├── FilterPanel      — category/continent/severity chips + scrollable event list
├── MapLegend
└── EventDetail      — slide-in panel; calls /api/analyze for AI briefing
```

Filtering is client-side (`useMemo` on `filteredEvents`). Only the `days` filter triggers a new API fetch. Continent and severity filters work on already-fetched events.

### Vercel config (`vercel.json`)

All `/api/*` requests are rewritten to `api/index.ts`. Static files in `public/` are served directly. The function gets 30s max duration.

### Environment variable

`ANTHROPIC_API_KEY` — set in `.env` for local dev, or in Vercel project settings for production. The app works without it (AI analysis section shows a setup prompt instead).
