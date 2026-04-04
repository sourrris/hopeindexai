# 🌍 HopeForge: Doom vs. Bloom

> **The world isn't just burning.**
>
> A real-time global events dashboard that shows you *both sides* of the daily news — conflict and cooperation, tension and diplomacy, doom and bloom — visualised on a live world map powered by the GDELT Project.

[![Streamlit App](https://static.streamlit.io/badges/streamlit_badge_black_white.svg)](https://share.streamlit.io/your-handle/hopeforge)
![Python](https://img.shields.io/badge/python-3.11+-blue.svg)
![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)
![GDELT](https://img.shields.io/badge/data-GDELT%20Project-orange.svg)

---

## 📸 Screenshot

<!-- Replace with a real screenshot after deploying -->
```
┌─────────────────────────────────────────────────────────┐
│  🌍 HopeForge                                           │
│  Doom vs. Bloom — The world isn't just burning          │
├──────────────────────────────────────┬──────────────────┤
│                                      │  🌡️ Hope Pulse   │
│   [  Live Event Map  ]               │                  │
│   Red  = conflict (Doom)             │   ◯ 58.2%        │
│   Green = cooperation (Bloom)        │                  │
│                                      │  Avg Goldstein   │
│                                      │     +0.84        │
├──────────────────────────────────────┴──────────────────┤
│  🔍 Event Details: Click any dot to inspect             │
└─────────────────────────────────────────────────────────┘
```

---

## ✨ Features

| Feature | Details |
|---|---|
| 🗺️ **Live World Map** | PyDeck ScatterplotLayer — 5,000 events, click any dot for details |
| 🔴🟢 **Doom vs. Bloom** | Goldstein Scale classification of every event |
| 🌡️ **Hope Meter** | Plotly gauge showing % positive events + avg stability score |
| ⏱️ **Time Window** | Slide across 7 / 30 / 180 days of GDELT history |
| 🔍 **Event Panel** | Actor names, location, Goldstein score, source article link |
| ⚡ **Fast + Cached** | Parallel downloads, 15-min cache TTL |
| 🎉 **Confetti** | Balloons when hope score > 62% 🎈 |
| 🌑 **Dark theme** | Slate/emerald palette throughout |

---

## 🚀 Quick Start (Local)

```bash
# 1. Clone
git clone https://github.com/your-handle/hopeforge
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
| > 0 | Positive stability contribution | 🌱 **Bloom** (green) |
| ≤ 0 | Negative or neutral | 💀 **Doom** (red) |

When the Goldstein score is missing, QuadClass is used as fallback (1/2 = Bloom, 3/4 = Doom).

### Sampling Strategy
GDELT publishes one file every 15 minutes. For a 7-day window that's 672 files — far too many to download in a web app. HopeForge instead samples **10 evenly-spaced noon-UTC snapshots** across the selected window, giving a statistically representative picture without saturating bandwidth. Each query downloads < 20 MB and completes in under 20 seconds.

### Map
Built with [PyDeck](https://deckgl.readthedocs.io/en/latest/) (deck.gl bindings for Python). Two `ScatterplotLayer` instances share the same view — one red (Doom), one green (Bloom). Point radius scales with `NumMentions` (media coverage intensity). The Carto Dark Matter base map requires **no Mapbox token**.

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
- **Streamlit Cloud free tier**: works fine; may cold-start after inactivity

---

## 🗺️ Roadmap

- [ ] Claude AI event summaries (Anthropic SDK — architecture already in place)
- [ ] Country-level aggregated heatmap view
- [ ] Export selected events as CSV
- [ ] Email / Slack digest bot
- [ ] "Hope streak" counter (days since hope > 50%)

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

> **I built this in one Sunday:** HopeForge 🌍
>
> Doomscrolling fatigue is real. So I built a dashboard that shows BOTH sides of global news — not just the fires.
>
> 🔴 **Doom** = conflicts, protests, military action (Goldstein < 0)
> 🟢 **Bloom** = peace deals, aid, cooperation, diplomacy (Goldstein > 0)
>
> Powered by the GDELT Project (monitors 100+ languages, updates every 15 min) + Streamlit + PyDeck.
>
> Live demo: [your-app.streamlit.app]
> GitHub: [github.com/your-handle/hopeforge]
>
> Tech stack: Python · Streamlit · PyDeck · Plotly · GDELT
>
> What's your hope score today? 🌡️
>
> #Python #Streamlit #DataViz #OpenData #Geopolitics #BuildInPublic

---

*Built with [Claude Code](https://claude.ai/claude-code) 🤖*
