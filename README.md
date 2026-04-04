# HopeForge

> The world is not just burning. It is negotiating, stabilizing, escalating, and healing in real time.

HopeForge is a real-time geopolitical dashboard built with Streamlit, Folium, and the [GDELT Project](https://www.gdeltproject.org). It tracks conflict-coded and cooperation-coded events on a live dark map, classifies them into **Doom** vs **Bloom**, and surfaces a **Hope Meter** centered on the Middle East by default.

[![Streamlit App](https://static.streamlit.io/badges/streamlit_badge_black_white.svg)](https://share.streamlit.io/sourrrish/hopeforge)
![Python](https://img.shields.io/badge/python-3.11+-blue.svg)
![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)
![GDELT](https://img.shields.io/badge/data-GDELT%20Project-orange.svg)

## Premium UI Redesign - Glassmorphism + Tailwind

The current release is a full frontend redesign of the original Streamlit app. The backend logic is unchanged: it still fetches public GDELT exports, classifies events with Goldstein + QuadClass, renders the same Folium map centered on `lat=32`, `lon=40`, `zoom=5`, and preserves click-to-inspect behavior, the Hope Meter concept, the region selector, and the disabled AI placeholder.

The difference is the interface:

- A fixed glassmorphic navbar with an inline SVG HopeForge mark and live stat pills
- A full-bleed dark Folium stage instead of a boxed Streamlit layout
- A floating desktop control cockpit built from the native Streamlit sidebar
- A custom Hope overlay with a circular gauge and sparkline
- A right-side event drawer that feels like a premium dashboard instead of a default column
- Tailwind CSS loaded via CDN for custom HTML fragments, with Streamlit widgets restyled via CSS overrides

### Before vs After

| Area | Previous UI | Premium redesign |
|---|---|---|
| Overall feel | Standard Streamlit dashboard | Dark, cinematic glass dashboard |
| Navigation | In-page card header | Fixed top navbar with SVG branding |
| Controls | Left sidebar | Floating glass cockpit on desktop, stacked mobile fallback |
| Map presentation | Embedded map in a column layout | Full-bleed hero map with overlay cards |
| Hope Meter | Plotly gauge in right column | Custom SVG gauge plus sparkline overlay |
| Event details | Static right column card | Fixed slide-in drawer with premium CTA styling |
| Styling approach | Handwritten CSS only | Handwritten CSS + Tailwind CDN + Streamlit overrides |

### Design Notes

- Background: deep near-black `#0A0A0A` with subtle red/cyan atmospheric gradients
- Glass cards: `rgba(15,23,42,0.75)` with strong blur and neon borders
- Doom accent: `#DC143C`
- Bloom accent: `#00FFFF`
- No new heavy frontend libraries were added; Tailwind comes from the CDN and everything else stays in the existing Python stack

## Features

- **Real-time GDELT ingestion** with cached parallel fetches
- **Doom vs Bloom classification** using Goldstein scale with QuadClass fallback
- **Folium dark map** with red and cyan circle markers sized by `|GoldsteinScale|`
- **Middle East default focus** centered on the Iran-US-Israel theatre
- **Hope Meter overlay** with score, Goldstein average, and daily sparkline
- **Layer toggles** for Doom and Bloom
- **Region selector** for Global, Europe, Asia, Americas, and Africa
- **Clickable event drawer** with actor names, location, date, score, coverage, and source link
- **AI action placeholder** preserved as a premium disabled CTA

## Quick Start

```bash
git clone https://github.com/sourrrish/hopeforge
cd hopeforge
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
streamlit run app.py
```

Open [http://localhost:8501](http://localhost:8501).

## Configuration

The redesigned UI expects:

- `streamlit>=1.56.0` so `st.html(..., unsafe_allow_javascript=True)` can load the Tailwind CDN
- `.streamlit/config.toml` to keep the base theme dark under the custom CSS shell
- no API keys for core functionality

## How It Works

### Data

HopeForge reads public GDELT v2 event export snapshots. It samples 10 evenly spaced noon UTC files across the selected time window, reads a limited slice of each archive, deduplicates events by `GLOBALEVENTID`, and caches the result for 15 minutes.

### Classification

Events are tagged as:

- **Bloom** when `GoldsteinScale > 0`
- **Doom** when `GoldsteinScale <= 0`
- **Bloom** as a fallback if Goldstein is missing and `QuadClass` is `1` or `2`

Marker radius still scales from `4px` to `14px` based on `abs(GoldsteinScale)`.

### UI Composition

The redesign uses a layered approach:

- Streamlit for app state, widgets, reruns, and layout primitives
- Folium for the dark interactive map
- Tailwind CDN for utility styling inside injected HTML blocks
- Custom CSS overrides to restyle the native Streamlit sidebar and widgets

## Project Structure

```text
hopeforge/
├── app.py
├── README.md
├── requirements.txt
└── .streamlit/
    ├── config.toml
    └── secrets.toml
```

## Deployment

### Streamlit Community Cloud

1. Fork the repository
2. Create a new app at [share.streamlit.io](https://share.streamlit.io)
3. Point it at `app.py`
4. Deploy

No secrets are required for the default experience.

## Roadmap

- Functional AI event analysis behind an optional API key
- Country-level aggregation views
- Export selected event windows
- Automated digests and alerts
- Time-lapse playback across the selected GDELT range

## LinkedIn Post Template

> I redesigned **HopeForge** into a premium 2026-style geopolitical dashboard.
>
> It still runs on the same GDELT + Streamlit backend, but the frontend now looks like a serious conflict-tracker product instead of a stock Streamlit app.
>
> What changed:
> - full glassmorphic dark UI
> - fixed navbar with custom SVG branding
> - full-bleed Folium map
> - floating control cockpit
> - custom Hope Meter with sparkline
> - slide-in event drawer for clicked stories
>
> What did not change:
> - same GDELT pipeline
> - same Doom vs Bloom classification
> - same Middle East default focus
> - same lightweight Python stack
>
> Stack: Python, Streamlit, Folium, Tailwind CDN, GDELT
>
> Demo: [your-app-url]
> Repo: [github.com/sourrrish/hopeforge](https://github.com/sourrrish/hopeforge)
>
> #Python #Streamlit #DataViz #Geopolitics #OpenData #BuildInPublic

## Data Attribution

Event data comes from the **[GDELT Project](https://www.gdeltproject.org)**. HopeForge is not affiliated with GDELT. The dashboard visualizes media-reported events and should not be treated as independently verified ground truth.

## License

MIT
