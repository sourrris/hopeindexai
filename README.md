# 🌍 HopeForge: Doom vs. Bloom

> **The world isn't just burning.**
>
> A real-time global events dashboard that shows you *both sides* of the daily news — conflict and cooperation, tension and diplomacy, doom and bloom — visualised on a live world map powered by the GDELT Project.

[![Streamlit App](https://static.streamlit.io/badges/streamlit_badge_black_white.svg)](https://share.streamlit.io/sourrrish/hopeforge)
![Python](https://img.shields.io/badge/python-3.11+-blue.svg)
![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)
![GDELT](https://img.shields.io/badge/data-GDELT%20Project-orange.svg)

---

## ✨ UI Features & Inspiration (v2 — Folium Edition)

### Inspiration

The v2 redesign draws from professional conflict-tracking interfaces:

| Reference | What we borrowed |
|---|---|
| **ACLED** (acleddata.com) | Dark basemap, categorical marker colours, click-to-inspect panel |
| **CFR Global Conflict Tracker** | Minimal chrome, high-density markers, persistent event sidebar |
| **conflict.sbs** | "Both sides" framing, clean legend, news-source linking |

### Before → After

| Dimension | v1 (PyDeck) | v2 (Folium Edition) |
|---|---|---|
| **Map library** | PyDeck / deck.gl | Folium + Leaflet |
| **Base tiles** | Carto Dark Matter (WebGL) | Carto Dark Matter (Leaflet) |
| **Doom colour** | Crimson-600 `[220,38,38]` | Deep red `#DC143C` / border `#8B0000` |
| **Bloom colour** | Emerald-500 `[34,197,94]` | Cyan `#00CED1` / border `#00FFFF` |
| **Marker sizing** | `NumMentions` (media coverage) | `\|GoldsteinScale\|` (event severity) |
| **Click detection** | `on_select="rerun"` (Streamlit ≥1.30) | `st_folium` `last_object_clicked` |
| **Event panel** | Below the map | Right-side column, always visible |
| **Hope gauge** | Static gauge | Gauge + animated cyan pulse bar when Hope > 55% |
| **Region focus** | Globe-centred (lat=20, lon=10) | Default Middle East (lat=32, lon=40, zoom=5) |
| **Region nav** | — | Selectbox: Middle East / Global / Europe / Asia / Americas / Africa |
| **AI button** | — | Disabled placeholder (wired in future PR) |
| **Live indicator** | — | Animated blinking dot in navbar |
| **App background** | `#0f172a` slate | `#030b18` near-black void |
| **CSS scope** | Minimal | Full dark-system override (metrics, sidebar, iframes, buttons) |

### New Visual Design Choices

- **Colour semantics**: Red = instability / death, Cyan = cooperation / hope — inspired by geopolitical traffic-light conventions
- **Marker radius ∝ severity**: `abs(GoldsteinScale)` 0→10 mapped to 4→14 px — a peace deal and a massacre both have large markers; minor diplomatic notes are small dots
- **Layered dark palette**: 5 tonal steps from `#030b18` (map bg) → `#0b1a2a` (card border) → `#162a3c` (muted text) — reduces eye strain on extended use
- **Pulsing hope bar**: 3 px animated gradient line appears above the gauge only when Hope Score > 55%, rewarding positive data without cluttering the default view
- **XSS-safe rendering**: all GDELT actor names and locations escaped with `html.escape()` before injecting into tooltips and cards

---

## 📸 Screenshot

```
┌─────────────────────────────────────────────────────────────────────────┐
│  🌍 HopeForge  •  ●LIVE  •  Doom vs. Bloom — Real-time conflict tracker  │
│  [📡 GDELT Data]  [⭐ GitHub]                                             │
├────────────────┬────────────────┬──────────────────┬────────────────────┤
│  📊 4,821      │  💀 2,644       │  🌱 2,177         │  🌡️ Hope 45.1%    │
├────────────────────────────────────┬───────────────────────────────────┤
│                                    │  🌡️ Hope Pulse                    │
│   🗺️ Live Event Map                │  ▓▓▓░░░░░░░ 45.1%                │
│                                    │  Avg Goldstein: –0.83             │
│   [  CartoDB Dark Matter map  ]    ├───────────────────────────────────┤
│   🔴 Deep red  = Doom              │  🔍 Event Details                  │
│   🔵 Cyan      = Bloom             │  💀 MATERIAL CONFLICT              │
│   Marker size  = |Goldstein|       │  Israel → Hamas                   │
│                                    │  📍 Gaza Strip, Palestine          │
│                                    │  📅 Apr 04, 2026                  │
│                                    │  GS: –9.0 · Mentions: 847         │
│                                    │  [📰 Read Source Article]          │
│                                    │  [🤖 AI Analysis (coming soon)]    │
├────────────────────────────────────┴───────────────────────────────────┤
│  Built in one Sunday · Streamlit · Folium · Plotly · GDELT · GitHub ↗  │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## ✨ Features

| Feature | Details |
|---|---|
| 🗺️ **Folium Map** | CartoDB Dark Matter · up to 2,000 markers · click any dot for details |
| 🔴🔵 **Doom vs. Bloom** | Deep red (`#DC143C`) vs cyan (`#00CED1`) — Goldstein-classified |
| 📏 **Severity sizing** | Marker radius ∝ `\|GoldsteinScale\|` (4–14 px) |
| 🌡️ **Hope Meter** | Plotly gauge + pulsing cyan bar when Hope > 55% |
| 🗺️ **Region focus** | Quick-nav: Middle East (default) · Global · Europe · Asia · Americas · Africa |
| ⏱️ **Time window** | 7 / 30 / 180 days of GDELT history |
| 🔍 **Event panel** | Actor names · location · Goldstein score · source article link |
| 🤖 **AI button** | Disabled placeholder for future Anthropic SDK integration |
| ⚡ **Cached** | Parallel downloads, 15-min cache TTL |
| 🎉 **Confetti** | Balloons when hope score > 62% 🎈 |

---

## 🚀 Quick Start (Local)

```bash
# 1. Clone
git clone https://github.com/sourrrish/hopeforge
cd hopeforge

# 2. Install dependencies (Python 3.11+ recommended)
pip install -r requirements.txt

# 3. Run
streamlit run app.py
```

Open [http://localhost:8501](http://localhost:8501) — no API keys needed.

---

## ☁️ One-Click Deploy to Streamlit Community Cloud

1. Fork this repo on GitHub
2. Go to [share.streamlit.io](https://share.streamlit.io)
3. Click **New app** → select your fork → set main file to `app.py`
4. Click **Deploy** — done in ~60 seconds

No secrets are needed for core functionality. The app fetches GDELT data directly from their public HTTP server.

---

## 🧠 How It Works

### Data: GDELT Project
[GDELT](https://www.gdeltproject.org) monitors the world's broadcast, print, and web news in 100+ languages and publishes a new event export every **15 minutes**. Each row represents one news-reported interaction between two actors (countries, organisations, individuals) with rich metadata.

HopeForge downloads a sample of these 15-minute snapshots directly via HTTP — no authentication required.

### Classification: Goldstein Scale
The **Goldstein Stability Scale** (–10 to +10) rates every CAMEO event code for its theoretical impact on a country's stability. HopeForge uses it as the primary signal:

| Score | Meaning | Class |
|---|---|---|
| > 0 | Positive stability contribution | 🌱 **Bloom** (cyan `#00CED1`) |
| ≤ 0 | Negative or neutral | 💀 **Doom** (red `#DC143C`) |

When the Goldstein score is missing, QuadClass is used as fallback (1/2 = Bloom, 3/4 = Doom).

### Marker Sizing
In v2, marker radius is proportional to **`|GoldsteinScale|`** (event severity), not `NumMentions`. This means:
- A ceasefire agreement (+7.4) and an artillery strike (–8.0) both render as large, attention-grabbing markers
- Routine diplomatic consultations (+1.2) appear as small dots

### Map: Folium + Leaflet
Built with [Folium](https://python-visualization.github.io/folium/) (Python bindings for Leaflet.js). Two `FeatureGroup` layers share the same CartoDB Dark Matter basemap. The `streamlit-folium` bridge (`st_folium`) returns click coordinates, which are resolved to the nearest event row via Euclidean distance lookup.

### Sampling Strategy
GDELT publishes one file every 15 minutes. For a 7-day window that's 672 files. HopeForge samples **10 evenly-spaced noon-UTC snapshots** across the window and takes the **top 1,000 events by `NumMentions`** per layer for rendering — giving a statistically representative picture without saturating bandwidth.

---

## 📂 Project Structure

```
hopeforge/
├── app.py                   ← entire app (single file)
├── requirements.txt
├── .streamlit/
│   ├── config.toml          ← dark theme + server settings
│   └── secrets.toml         ← placeholder (no keys required)
└── README.md
```

---

## 🔧 Performance Notes

- **Cold start**: ~15–25 s for initial data load (10 parallel HTTP requests)
- **Warm**: instant (15-min TTL cache)
- **Memory**: < 50 MB for 5,000 events
- **Folium rendering**: 2,000 markers renders comfortably; `prefer_canvas=True` enables GPU compositing
- **Streamlit Cloud free tier**: works fine; may cold-start after inactivity

---

## 🗺️ Roadmap

- [ ] Claude AI event summaries (Anthropic SDK — AI button placeholder already in UI)
- [ ] Country-level aggregated heatmap view
- [ ] Export selected events as CSV
- [ ] Email / Slack digest bot
- [ ] "Hope streak" counter (days since hope > 50%)
- [ ] Animated time-lapse through the selected date range

---

## 📜 Data Attribution

Event data from the **[GDELT Project](https://www.gdeltproject.org)**, made available under an open license for research and journalism. HopeForge is not affiliated with GDELT. Events represent **media coverage**, not independently verified ground truth.

---

## 🤝 Contributing

PRs welcome. Keep it to one file (`app.py`). Run `streamlit run app.py` locally before submitting.

---

## 📄 License

MIT — do whatever you want, just keep the GDELT attribution.

---

## 💼 LinkedIn Post Template

> **I upgraded this in one Sunday:** HopeForge v2 🌍
>
> Rebuilt the conflict tracker from PyDeck → Folium with a full dark-system UI redesign. Now it actually looks like a pro geopolitical dashboard.
>
> 🔴 **Doom** = conflicts, protests, military action (Goldstein < 0)
> 🔵 **Bloom** = peace deals, aid, cooperation, diplomacy (Goldstein > 0)
>
> New in v2:
> - CartoDB Dark Matter + Folium CircleMarkers
> - Marker size ∝ event severity (|GoldsteinScale|)
> - Click-to-inspect event panel with source article link
> - Animated Hope Pulse gauge
> - Middle East default view + region quick-nav
>
> Powered by the GDELT Project (100+ languages, updates every 15 min) + Streamlit + Folium + Plotly.
>
> Live demo: [your-app.streamlit.app]
> GitHub: [github.com/sourrrish/hopeforge]
>
> Tech stack: Python · Streamlit · Folium · Plotly · GDELT
>
> #Python #Streamlit #DataViz #OpenData #Geopolitics #BuildInPublic

---

*Built with [Claude Code](https://claude.ai/claude-code) 🤖*
