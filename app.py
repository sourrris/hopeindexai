"""
HopeForge: Doom vs. Bloom - Premium conflict dashboard.

Real-time GDELT tracker centered on the Iran-US-Israel theatre with a
glassmorphic interface layered on top of the existing data pipeline.
"""

from __future__ import annotations

import datetime
import html as _html
import io
import textwrap
import zipfile
from concurrent.futures import ThreadPoolExecutor, as_completed

import folium
import pandas as pd
import requests
import streamlit as st
from streamlit_folium import st_folium

# Page config must stay first so Streamlit initializes the wide shell correctly.
st.set_page_config(
    page_title="HopeForge",
    page_icon="🌍",
    layout="wide",
    initial_sidebar_state="expanded",
    menu_items={"About": "HopeForge - Doom vs. Bloom in real time."},
)


# Core palette keeps the existing Doom/Bloom semantics intact.
DOOM_FILL = "#DC143C"
DOOM_LINE = "#8B0000"
BLOOM_FILL = "#00CED1"
BLOOM_LINE = "#00FFFF"

MAX_MARKERS = 2_000
MAX_POINTS = 5_000
CACHE_TTL = 900
ROWS_PER_FILE = 1_200
N_FILES = 10
MAP_HEIGHT = 780

GDELT_BASE = "http://data.gdeltproject.org/gdeltv2/"
GDELT_LASTUPDATE = f"{GDELT_BASE}lastupdate.txt"

QUAD_LABELS: dict[int, str] = {
    1: "Verbal Cooperation",
    2: "Material Cooperation",
    3: "Verbal Conflict",
    4: "Material Conflict",
}

REGIONS: dict[str, tuple[float, float, int]] = {
    "Middle East (Default)": (32.0, 40.0, 5),
    "Global": (20.0, 10.0, 2),
    "Europe": (54.0, 15.0, 4),
    "East Asia": (35.0, 115.0, 4),
    "South Asia": (22.0, 80.0, 4),
    "Americas": (20.0, -80.0, 3),
    "Africa": (5.0, 25.0, 3),
}

GDELT_COLS: list[str] = [
    "GLOBALEVENTID",
    "SQLDATE",
    "MonthYear",
    "Year",
    "FractionDate",
    "Actor1Code",
    "Actor1Name",
    "Actor1CountryCode",
    "Actor1KnownGroupCode",
    "Actor1EthnicCode",
    "Actor1Religion1Code",
    "Actor1Religion2Code",
    "Actor1Type1Code",
    "Actor1Type2Code",
    "Actor1Type3Code",
    "Actor2Code",
    "Actor2Name",
    "Actor2CountryCode",
    "Actor2KnownGroupCode",
    "Actor2EthnicCode",
    "Actor2Religion1Code",
    "Actor2Religion2Code",
    "Actor2Type1Code",
    "Actor2Type2Code",
    "Actor2Type3Code",
    "IsRootEvent",
    "EventCode",
    "EventBaseCode",
    "EventRootCode",
    "QuadClass",
    "GoldsteinScale",
    "NumMentions",
    "NumSources",
    "NumArticles",
    "AvgTone",
    "Actor1Geo_Type",
    "Actor1Geo_FullName",
    "Actor1Geo_CountryCode",
    "Actor1Geo_ADM1Code",
    "Actor1Geo_ADM2Code",
    "Actor1Geo_Lat",
    "Actor1Geo_Long",
    "Actor1Geo_FeatureID",
    "Actor2Geo_Type",
    "Actor2Geo_FullName",
    "Actor2Geo_CountryCode",
    "Actor2Geo_ADM1Code",
    "Actor2Geo_ADM2Code",
    "Actor2Geo_Lat",
    "Actor2Geo_Long",
    "Actor2Geo_FeatureID",
    "ActionGeo_Type",
    "ActionGeo_FullName",
    "ActionGeo_CountryCode",
    "ActionGeo_ADM1Code",
    "ActionGeo_ADM2Code",
    "ActionGeo_Lat",
    "ActionGeo_Long",
    "ActionGeo_FeatureID",
    "DATEADDED",
    "SOURCEURL",
]


def inject_global_styles() -> None:
    """Override Streamlit chrome so the app reads like a bespoke product, not a stock app."""
    st.markdown(
        """
        <style>
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&family=Space+Grotesk:wght@500;700&display=swap');

        :root {
          --hf-bg: #0A0A0A;
          --hf-panel: rgba(15, 23, 42, 0.75);
          --hf-panel-strong: rgba(9, 14, 27, 0.88);
          --hf-border: rgba(255, 255, 255, 0.08);
          --hf-border-neon: rgba(0, 255, 255, 0.18);
          --hf-text: #E2E8F0;
          --hf-muted: #94A3B8;
          --hf-dim: #64748B;
          --hf-shadow: 0 24px 120px rgba(0, 0, 0, 0.42);
          --hf-radius-xl: 28px;
          --hf-radius-lg: 22px;
          --hf-bloom-glow: 0 0 36px rgba(0, 255, 255, 0.24);
          --hf-doom-glow: 0 0 30px rgba(220, 20, 60, 0.18);
        }

        /* Base shell: hide Streamlit chrome and build a dark atmospheric stage. */
        html, body, [data-testid="stAppViewContainer"], .stApp {
          background:
            radial-gradient(circle at top left, rgba(220,20,60,0.10), transparent 28%),
            radial-gradient(circle at top right, rgba(0,255,255,0.11), transparent 24%),
            linear-gradient(180deg, #020304 0%, #07090D 32%, #0A0A0A 100%) !important;
          color: var(--hf-text) !important;
          font-family: "IBM Plex Sans", sans-serif !important;
        }

        header[data-testid="stHeader"],
        [data-testid="stToolbar"],
        [data-testid="stDecoration"],
        footer,
        #MainMenu {
          display: none !important;
        }

        .block-container,
        [data-testid="stAppViewBlockContainer"] {
          max-width: 100% !important;
          padding-top: 8.4rem !important;
          padding-right: 1.25rem !important;
          padding-bottom: 2rem !important;
          padding-left: 1.25rem !important;
        }

        /* Desktop control cockpit: move the native sidebar into a fixed glass panel. */
        section[data-testid="stSidebar"] {
          position: fixed !important;
          top: 6.55rem !important;
          right: 1.25rem !important;
          left: auto !important;
          bottom: 1.25rem !important;
          width: min(360px, calc(100vw - 2.5rem)) !important;
          min-width: min(360px, calc(100vw - 2.5rem)) !important;
          background: var(--hf-panel) !important;
          border: 1px solid var(--hf-border-neon) !important;
          border-radius: var(--hf-radius-xl) !important;
          box-shadow: var(--hf-shadow), var(--hf-bloom-glow) !important;
          backdrop-filter: blur(18px) saturate(140%) !important;
          -webkit-backdrop-filter: blur(18px) saturate(140%) !important;
          overflow: hidden !important;
          z-index: 50 !important;
        }

        section[data-testid="stSidebar"] > div,
        section[data-testid="stSidebar"] > div > div,
        section[data-testid="stSidebar"] [data-testid="stSidebarUserContent"] {
          background: transparent !important;
        }

        [data-testid="collapsedControl"] {
          display: none !important;
        }

        [data-testid="stSidebarContent"] {
          padding: 1.2rem 1rem 1rem !important;
        }

        /* Native widgets keep behavior, but the skin is rewritten to match the glass cockpit. */
        [data-testid="stSidebar"] * {
          color: var(--hf-text) !important;
          font-family: "IBM Plex Sans", sans-serif !important;
        }

        [data-testid="stSidebar"] label,
        [data-testid="stSidebar"] p,
        [data-testid="stSidebar"] span {
          color: var(--hf-text) !important;
        }

        [data-testid="stSidebar"] [data-baseweb="select"],
        [data-testid="stSidebar"] [data-baseweb="base-input"],
        [data-testid="stSidebar"] div[data-baseweb="select"] > div {
          background: rgba(15, 23, 42, 0.58) !important;
          border: 1px solid rgba(148, 163, 184, 0.24) !important;
          border-radius: 18px !important;
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.05) !important;
        }

        [data-testid="stSidebar"] [data-baseweb="slider"] [role="slider"] {
          background: linear-gradient(135deg, #0ea5e9, #00FFFF) !important;
          box-shadow: 0 0 18px rgba(0,255,255,0.38) !important;
        }

        [data-testid="stSidebar"] [data-baseweb="slider"] > div > div > div {
          background: rgba(51, 65, 85, 0.58) !important;
        }

        [data-testid="stSidebar"] [data-testid="stCheckbox"] label {
          background: rgba(15, 23, 42, 0.42);
          border: 1px solid rgba(148, 163, 184, 0.18);
          border-radius: 16px;
          padding: 0.45rem 0.7rem;
        }

        button[kind="primary"] {
          background: linear-gradient(135deg, rgba(9,14,27,0.95), rgba(16,185,129,0.05), rgba(0,255,255,0.18)) !important;
          border: 1px solid rgba(0,255,255,0.28) !important;
          color: #E6FDFF !important;
          border-radius: 999px !important;
          min-height: 2.85rem !important;
          box-shadow: 0 0 28px rgba(0,255,255,0.18) !important;
        }

        button[kind="secondary"] {
          background: rgba(15, 23, 42, 0.58) !important;
          border: 1px solid rgba(148, 163, 184, 0.22) !important;
          color: var(--hf-text) !important;
          border-radius: 999px !important;
        }

        button:hover {
          transform: translateY(-1px);
        }

        /* Map container gets a cinematic frame while keeping the Folium payload unchanged. */
        iframe {
          border-radius: 34px !important;
          border: 1px solid rgba(255,255,255,0.08) !important;
          box-shadow: 0 22px 80px rgba(0,0,0,0.44) !important;
          overflow: hidden !important;
        }

        .leaflet-control-zoom a {
          background: rgba(9, 14, 27, 0.88) !important;
          color: #E2E8F0 !important;
          border-color: rgba(148,163,184,0.18) !important;
        }

        .leaflet-control-attribution {
          background: rgba(9, 14, 27, 0.72) !important;
          color: #94A3B8 !important;
          backdrop-filter: blur(14px) !important;
        }

        .leaflet-tooltip {
          background: rgba(9, 14, 27, 0.92) !important;
          color: #E2E8F0 !important;
          border: 1px solid rgba(0,255,255,0.16) !important;
          border-radius: 16px !important;
          box-shadow: 0 16px 48px rgba(0,0,0,0.36) !important;
        }

        .leaflet-tooltip-top:before,
        .leaflet-tooltip-bottom:before,
        .leaflet-tooltip-left:before,
        .leaflet-tooltip-right:before {
          border-top-color: rgba(9, 14, 27, 0.92) !important;
          border-bottom-color: rgba(9, 14, 27, 0.92) !important;
        }

        .hf-navbar {
          position: fixed;
          top: 1rem;
          left: 1.25rem;
          right: 1.25rem;
          z-index: 60;
          border-radius: var(--hf-radius-xl);
          border: 1px solid rgba(255, 255, 255, 0.08);
          background: linear-gradient(135deg, rgba(9,14,27,0.88), rgba(17,24,39,0.82));
          backdrop-filter: blur(18px) saturate(150%);
          -webkit-backdrop-filter: blur(18px) saturate(150%);
          box-shadow: var(--hf-shadow);
          overflow: hidden;
        }

        .hf-navbar-inner {
          position: relative;
          z-index: 10;
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          justify-content: space-between;
          gap: 1rem;
          padding: 1rem 1.25rem;
        }

        .hf-navbar::before {
          content: "";
          position: absolute;
          inset: 0;
          pointer-events: none;
          background:
            linear-gradient(90deg, rgba(220,20,60,0.12), transparent 30%),
            linear-gradient(90deg, transparent 62%, rgba(0,255,255,0.13));
        }

        .hf-brand-lockup {
          display: flex;
          align-items: center;
          gap: 0.9rem;
          min-width: 15rem;
        }

        .hf-brand-mark {
          width: 2.7rem;
          height: 2.7rem;
          border-radius: 14px;
          border: 1px solid rgba(255,255,255,0.12);
          background: linear-gradient(180deg, rgba(255,255,255,0.05), rgba(255,255,255,0.01));
          display: inline-flex;
          align-items: center;
          justify-content: center;
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.08);
        }

        .hf-brand-wordmark {
          font-family: "Space Grotesk", sans-serif;
          font-weight: 700;
          font-size: clamp(1.55rem, 2.2vw, 2.1rem);
          line-height: 1;
          letter-spacing: -0.04em;
          color: #F8FAFC;
        }

        .hf-brand-tag {
          color: var(--hf-muted);
          font-size: 0.86rem;
          letter-spacing: 0.02em;
        }

        .hf-live-dot {
          display: inline-block;
          width: 0.58rem;
          height: 0.58rem;
          border-radius: 999px;
          background: #00FFFF;
          margin-right: 0.45rem;
          box-shadow: 0 0 18px rgba(0,255,255,0.75);
          animation: hfPulse 1.9s ease-in-out infinite;
        }

        .hf-stat-pill,
        .hf-chip,
        .hf-link-chip {
          border: 1px solid rgba(148,163,184,0.16);
          background: rgba(15, 23, 42, 0.48);
          backdrop-filter: blur(12px);
          border-radius: 999px;
        }

        .hf-stat-pill {
          padding: 0.55rem 0.85rem;
          min-width: 7.1rem;
          transition: transform 160ms ease, border-color 160ms ease, box-shadow 160ms ease;
        }

        .hf-stat-pill:hover,
        .hf-link-chip:hover,
        .hf-card-lift:hover {
          transform: translateY(-2px);
          border-color: rgba(0,255,255,0.24);
          box-shadow: 0 14px 36px rgba(0,0,0,0.24);
        }

        .hf-stat-label {
          color: var(--hf-muted);
          font-size: 0.68rem;
          text-transform: uppercase;
          letter-spacing: 0.08em;
        }

        .hf-stat-value {
          color: var(--hf-text);
          font-size: 1rem;
          font-weight: 700;
          line-height: 1.2;
        }

        .hf-chip {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem 0.8rem;
          color: var(--hf-text);
          font-size: 0.8rem;
        }

        .hf-link-chip {
          display: inline-flex;
          align-items: center;
          gap: 0.55rem;
          padding: 0.55rem 0.85rem;
          color: #E2E8F0 !important;
          text-decoration: none !important;
          transition: transform 160ms ease, border-color 160ms ease, background 160ms ease;
        }

        .hf-link-chip--doom:hover {
          border-color: rgba(220,20,60,0.28);
          box-shadow: var(--hf-doom-glow);
        }

        .hf-link-chip--bloom:hover {
          border-color: rgba(0,255,255,0.28);
          box-shadow: var(--hf-bloom-glow);
        }

        .hf-stat-row,
        .hf-link-row,
        .hf-meta-row,
        .hf-overlay-top,
        .hf-hope-main,
        .hf-hope-bands,
        .hf-hope-spark-head,
        .hf-event-head,
        .hf-event-grid {
          display: flex;
          flex-wrap: wrap;
          gap: 0.75rem;
        }

        .hf-stat-row,
        .hf-link-row {
          align-items: center;
        }

        .hf-meta-row {
          margin-bottom: 1rem;
          align-items: center;
        }

        .hf-hope-main {
          align-items: center;
        }

        .hf-hope-ring {
          position: relative;
          width: 9.2rem;
          height: 9.2rem;
          flex: 0 0 9.2rem;
        }

        .hf-hope-ring-track,
        .hf-hope-ring-fill {
          position: absolute;
          inset: 0;
          border-radius: 999px;
        }

        .hf-hope-ring-track {
          background:
            radial-gradient(circle at center, transparent 58%, rgba(71,85,105,0.34) 59%, rgba(71,85,105,0.34) 67%, transparent 68%);
        }

        .hf-hope-ring-fill {
          display: flex;
          align-items: center;
          justify-content: center;
          background:
            radial-gradient(circle at center, rgba(9,14,27,0.92) 0 55%, transparent 56%),
            conic-gradient(var(--hf-ring-color, #00FFFF) calc(var(--hf-ring-progress, 50) * 1%), rgba(71,85,105,0.24) 0);
          box-shadow: inset 0 0 0 1px rgba(255,255,255,0.06);
        }

        .hf-hope-ring-core {
          width: 62%;
          height: 62%;
          border-radius: 999px;
          background: rgba(9,14,27,0.96);
          border: 1px solid rgba(255,255,255,0.05);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
        }

        .hf-hope-info {
          flex: 1 1 10rem;
          min-width: 0;
        }

        .hf-info-card,
        .hf-spark-card,
        .hf-event-card,
        .hf-event-cell {
          border-radius: 1.4rem;
          border: 1px solid rgba(255,255,255,0.08);
          background: rgba(2, 6, 23, 0.28);
        }

        .hf-info-card,
        .hf-spark-card,
        .hf-event-card,
        .hf-event-cell {
          padding: 1rem;
        }

        .hf-band-label {
          flex: 1 1 0;
          min-width: 5rem;
          font-size: 0.75rem;
          color: var(--hf-muted);
        }

        .hf-overlay-top,
        .hf-hope-spark-head,
        .hf-event-head {
          align-items: flex-start;
          justify-content: space-between;
        }

        .hf-overline {
          font-size: 0.72rem;
          text-transform: uppercase;
          letter-spacing: 0.18em;
          color: var(--hf-muted);
        }

        .hf-overlay-badge {
          border-radius: 999px;
          border: 1px solid rgba(255,255,255,0.1);
          padding: 0.35rem 0.75rem;
          font-size: 0.72rem;
          text-transform: uppercase;
          letter-spacing: 0.2em;
          color: var(--hf-text);
        }

        .hf-event-grid {
          margin-top: 1rem;
        }

        .hf-event-cell {
          flex: 1 1 calc(50% - 0.75rem);
          min-width: 9rem;
        }

        .hf-event-actions {
          margin-top: 1rem;
          display: grid;
          gap: 0.75rem;
        }

        .hf-event-actors {
          margin-top: 1rem;
        }

        .hf-event-direction {
          margin: 0.35rem 0;
          font-size: 0.78rem;
          text-transform: uppercase;
          letter-spacing: 0.18em;
        }

        .hf-value-lg {
          font-size: 2rem;
          font-weight: 700;
          line-height: 1;
          color: var(--hf-text);
        }

        .hf-value-md {
          font-size: 1.05rem;
          font-weight: 600;
          line-height: 1.35;
          color: var(--hf-text);
        }

        .hf-body-sm {
          font-size: 0.9rem;
          line-height: 1.6;
          color: var(--hf-text);
        }

        .hf-text-muted {
          color: var(--hf-muted);
        }

        .hf-sparkline {
          margin-top: 0.85rem;
          border-radius: 1rem;
          border: 1px solid rgba(255,255,255,0.06);
          background: rgba(0,0,0,0.16);
          padding: 0.55rem 0.6rem;
        }

        /* Overlay cards are fixed on desktop so the map feels like a dashboard stage. */
        .hf-hope-overlay,
        .hf-event-drawer {
          position: fixed;
          z-index: 45;
          border-radius: var(--hf-radius-lg);
          border: 1px solid rgba(255,255,255,0.08);
          background: linear-gradient(180deg, rgba(9,14,27,0.86), rgba(15,23,42,0.76));
          backdrop-filter: blur(20px) saturate(145%);
          -webkit-backdrop-filter: blur(20px) saturate(145%);
          box-shadow: var(--hf-shadow);
          overflow: hidden;
        }

        .hf-hope-overlay {
          top: 7.25rem;
          left: 1.25rem;
          width: min(320px, calc(100vw - 2.5rem));
        }

        .hf-hope-overlay.is-glowing {
          box-shadow: var(--hf-shadow), var(--hf-bloom-glow);
          animation: hfGlowShift 2.8s ease-in-out infinite;
        }

        .hf-event-drawer {
          right: 1.25rem;
          bottom: 1.25rem;
          width: min(360px, calc(100vw - 2.5rem));
          max-height: min(420px, calc(100vh - 31rem));
          transform: translateX(110%);
          opacity: 0;
          pointer-events: none;
          transition: transform 260ms ease, opacity 260ms ease, box-shadow 260ms ease;
        }

        .hf-event-drawer.is-open,
        .hf-event-drawer.is-placeholder {
          transform: translateX(0);
          opacity: 1;
          pointer-events: auto;
        }

        .hf-event-drawer.is-open {
          box-shadow: var(--hf-shadow), var(--hf-doom-glow);
        }

        .hf-overlay-eyebrow {
          color: var(--hf-muted);
          font-size: 0.7rem;
          text-transform: uppercase;
          letter-spacing: 0.12em;
        }

        .hf-overlay-title {
          font-family: "Space Grotesk", sans-serif;
          font-size: 1.1rem;
          font-weight: 700;
          line-height: 1.15;
          color: var(--hf-text);
        }

        .hf-progress-rail {
          height: 0.3rem;
          border-radius: 999px;
          background: rgba(51, 65, 85, 0.75);
          overflow: hidden;
        }

        .hf-progress-fill {
          height: 100%;
          border-radius: 999px;
          background: linear-gradient(90deg, #DC143C 0%, #F59E0B 48%, #00FFFF 100%);
        }

        .hf-event-btn {
          display: inline-flex;
          justify-content: center;
          align-items: center;
          width: 100%;
          min-height: 2.85rem;
          border-radius: 999px;
          text-decoration: none;
          font-weight: 600;
          transition: transform 160ms ease, border-color 160ms ease;
        }

        .hf-event-btn:hover {
          transform: translateY(-1px);
        }

        .hf-event-btn--primary {
          color: #E2E8F0;
          border: 1px solid rgba(0,255,255,0.25);
          background: linear-gradient(135deg, rgba(0,255,255,0.12), rgba(15,23,42,0.5));
          box-shadow: var(--hf-bloom-glow);
        }

        .hf-event-btn--disabled {
          color: var(--hf-muted);
          border: 1px solid rgba(148,163,184,0.16);
          background: rgba(15,23,42,0.44);
          cursor: not-allowed;
        }

        .hf-footer {
          color: var(--hf-muted);
          font-size: 0.82rem;
          padding: 1rem 0 0;
        }

        .hf-footer a {
          color: #7DD3FC;
          text-decoration: none;
        }

        .hf-divider {
          height: 1px;
          background: linear-gradient(90deg, rgba(255,255,255,0.04), rgba(0,255,255,0.24), rgba(255,255,255,0.04));
        }

        .hf-side-kicker {
          color: #7DD3FC;
          font-size: 0.72rem;
          font-weight: 700;
          letter-spacing: 0.16em;
          text-transform: uppercase;
        }

        .hf-side-title {
          font-family: "Space Grotesk", sans-serif;
          font-size: 1.2rem;
          font-weight: 700;
          color: var(--hf-text);
        }

        .hf-side-note {
          color: var(--hf-muted);
          font-size: 0.82rem;
          line-height: 1.55;
        }

        .hf-side-space-sm {
          margin-top: 0.5rem;
        }

        .hf-side-space-md {
          margin-top: 0.75rem;
        }

        .hf-legend-card {
          padding: 0.95rem 1rem;
          border-radius: 20px;
          border: 1px solid rgba(148,163,184,0.14);
          background: rgba(9,14,27,0.42);
        }

        .hf-legend-list {
          margin-top: 0.75rem;
          display: grid;
          gap: 0.7rem;
          font-size: 0.92rem;
          color: var(--hf-text);
        }

        .hf-legend-item {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .hf-legend-dot {
          display: inline-block;
          width: 10px;
          height: 10px;
          border-radius: 999px;
          flex: 0 0 10px;
        }

        .hf-legend-note {
          margin-top: 0.1rem;
          font-size: 0.75rem;
          color: var(--hf-dim);
        }

        @keyframes hfPulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.45; transform: scale(0.9); }
        }

        @keyframes hfGlowShift {
          0%, 100% { box-shadow: var(--hf-shadow), 0 0 18px rgba(0,255,255,0.18); }
          50% { box-shadow: var(--hf-shadow), 0 0 44px rgba(0,255,255,0.34); }
        }

        /* Mobile fallback: return to a vertical product layout instead of forcing desktop overlays. */
        @media (max-width: 1100px) {
          .block-container,
          [data-testid="stAppViewBlockContainer"] {
            padding-top: 7rem !important;
            padding-right: 0.85rem !important;
            padding-left: 0.85rem !important;
          }

          .hf-navbar {
            left: 0.85rem;
            right: 0.85rem;
          }

          .hf-navbar-inner {
            padding: 0.95rem;
          }

          .hf-hope-overlay,
          .hf-event-drawer {
            position: static;
            width: 100%;
            max-height: none;
            margin-bottom: 1rem;
            transform: none;
            opacity: 1;
            pointer-events: auto;
          }

          section[data-testid="stSidebar"] {
            position: relative !important;
            top: auto !important;
            right: auto !important;
            bottom: auto !important;
            width: 100% !important;
            min-width: 100% !important;
            margin-top: 1rem !important;
            border-radius: var(--hf-radius-lg) !important;
          }

          .hf-stat-row,
          .hf-link-row,
          .hf-overlay-top,
          .hf-event-head {
            width: 100%;
          }

          .hf-event-cell {
            flex-basis: 100%;
          }

          .hf-hope-ring {
            margin: 0 auto;
          }

          .hf-brand-lockup {
            min-width: 0;
          }

          [data-testid="collapsedControl"] {
            display: flex !important;
          }
        }
        </style>
        """,
        unsafe_allow_html=True,
    )


def render_html(markup: str) -> None:
    """Render HTML fragments without sending them through Markdown parsing first."""
    st.html(textwrap.dedent(markup).strip())


def _gdelt_urls(days: int) -> list[str]:
    """
    Generate N_FILES GDELT v2 noon-UTC snapshot URLs evenly spread across `days`.
    Samples one file per step and keeps total download volume manageable.
    """
    today = datetime.date.today()
    step = max(1, days // N_FILES)
    return [
        f"{GDELT_BASE}"
        f"{(today - datetime.timedelta(days=i * step)).strftime('%Y%m%d')}"
        f"120000.export.CSV.zip"
        for i in range(N_FILES)
    ]


def _fetch_one(url: str) -> pd.DataFrame | None:
    """Download one GDELT ZIP and return the first ROWS_PER_FILE rows, or None."""
    try:
        resp = requests.get(url, timeout=20)
        if resp.status_code != 200:
            return None
        with zipfile.ZipFile(io.BytesIO(resp.content)) as zf:
            with zf.open(zf.namelist()[0]) as data_file:
                return pd.read_csv(
                    data_file,
                    sep="\t",
                    header=None,
                    names=GDELT_COLS,
                    nrows=ROWS_PER_FILE,
                    on_bad_lines="skip",
                    low_memory=False,
                    dtype=str,
                )
    except Exception:
        return None


def _fallback_fetch() -> pd.DataFrame | None:
    """Fallback to the latest published export if the sampled window fails completely."""
    try:
        resp = requests.get(GDELT_LASTUPDATE, timeout=10)
        for line in resp.text.strip().splitlines():
            if ".export.CSV.zip" in line:
                return _fetch_one(line.strip().split()[-1])
    except Exception:
        pass
    return None


@st.cache_data(ttl=CACHE_TTL, show_spinner=False)
def fetch_gdelt_data(days: int) -> pd.DataFrame:
    """Fetch N_FILES snapshots in parallel and deduplicate them by global event id."""
    urls = _gdelt_urls(days)
    dfs: list[pd.DataFrame] = []

    with ThreadPoolExecutor(max_workers=5) as pool:
        futures = {pool.submit(_fetch_one, url): url for url in urls}
        for future in as_completed(futures):
            result = future.result()
            if result is not None and not result.empty:
                dfs.append(result)

    if not dfs:
        fallback = _fallback_fetch()
        if fallback is not None:
            dfs.append(fallback)

    if not dfs:
        return pd.DataFrame()

    combined = pd.concat(dfs, ignore_index=True)
    combined = combined.drop_duplicates(subset="GLOBALEVENTID", keep="first")

    if len(combined) > MAX_POINTS:
        combined = combined.sample(MAX_POINTS, random_state=42)

    return combined.reset_index(drop=True)


def classify_events(df: pd.DataFrame) -> pd.DataFrame:
    """
    Tag events as Doom or Bloom and preserve the existing radius scaling.
    The redesign is purely presentational, so the classification rules stay unchanged.
    """
    if df.empty:
        return df

    for col in (
        "GoldsteinScale",
        "QuadClass",
        "NumMentions",
        "ActionGeo_Lat",
        "ActionGeo_Long",
    ):
        df[col] = pd.to_numeric(df[col], errors="coerce")

    df = df.dropna(subset=["ActionGeo_Lat", "ActionGeo_Long"])
    df = df[
        df["ActionGeo_Lat"].between(-90, 90)
        & df["ActionGeo_Long"].between(-180, 180)
    ].copy()

    if df.empty:
        return df

    df["category"] = "doom"
    df.loc[df["GoldsteinScale"] > 0, "category"] = "bloom"
    no_gs = df["GoldsteinScale"].isna()
    df.loc[no_gs & df["QuadClass"].isin([1.0, 2.0]), "category"] = "bloom"

    df["Actor1Name"] = df["Actor1Name"].fillna("Unknown").str.strip().str.title()
    df["Actor2Name"] = df["Actor2Name"].fillna("Unknown").str.strip().str.title()
    df["quad_label"] = df["QuadClass"].map(QUAD_LABELS).fillna("Unknown Event")
    df["NumMentions"] = df["NumMentions"].fillna(1).clip(lower=1).astype(int)

    gs_abs = df["GoldsteinScale"].abs().fillna(1.0)
    gs_p95 = float(gs_abs.quantile(0.95)) or 1.0
    df["marker_r"] = (gs_abs.clip(upper=gs_p95) / gs_p95 * 10.0 + 4.0).round(1)

    return df.reset_index(drop=True)


def format_sql_date(raw_date: object) -> str:
    """Convert GDELT SQLDATE values into a UI-friendly label."""
    try:
        return datetime.datetime.strptime(str(int(float(raw_date))), "%Y%m%d").strftime(
            "%b %d, %Y"
        )
    except Exception:
        return str(raw_date)


def compute_hope_stats(df: pd.DataFrame) -> dict[str, float | int]:
    """Centralize the core UI metrics so every surface reports the same numbers."""
    total = int(len(df))
    doom_n = int((df["category"] == "doom").sum())
    bloom_n = int((df["category"] == "bloom").sum())
    hope_pct = round((bloom_n / total) * 100, 1) if total else 50.0
    avg_gs = round(float(df["GoldsteinScale"].dropna().mean()), 2) if total else 0.0
    return {
        "total": total,
        "doom": doom_n,
        "bloom": bloom_n,
        "hope_pct": hope_pct,
        "avg_gs": avg_gs,
    }


def build_daily_hope_series(df: pd.DataFrame) -> pd.Series:
    """Aggregate Bloom share by day so the overlay can show direction, not just a snapshot."""
    if df.empty:
        return pd.Series([50.0], index=["Now"], dtype=float)

    daily = (
        df.assign(
            sql_date=df["SQLDATE"].astype(str).str[:8],
            is_bloom=(df["category"] == "bloom").astype(float),
        )
        .groupby("sql_date")["is_bloom"]
        .mean()
        .mul(100)
        .round(1)
        .sort_index()
    )

    if daily.empty:
        return pd.Series([50.0], index=["Now"], dtype=float)

    return daily.tail(12)


def sparkline_points(values: list[float], width: int = 210, height: int = 52, padding: int = 6) -> str:
    """Translate a simple value list into SVG polyline coordinates."""
    if not values:
        values = [50.0, 50.0]
    if len(values) == 1:
        values = values * 2

    min_v = min(values)
    max_v = max(values)
    span = max(max_v - min_v, 1.0)
    usable_w = max(width - padding * 2, 1)
    usable_h = max(height - padding * 2, 1)

    points: list[str] = []
    for idx, value in enumerate(values):
        x = padding + (usable_w * idx / (len(values) - 1))
        normalized = (value - min_v) / span
        y = padding + (usable_h - usable_h * normalized)
        points.append(f"{x:.1f},{y:.1f}")
    return " ".join(points)


def hope_tone(hope_pct: float) -> tuple[str, str, str]:
    """Map the Hope score into copy and color used across the overlay and stat pills."""
    if hope_pct >= 55:
        return BLOOM_FILL, "Bloom dominant", "Hope is outpacing conflict in the sampled window."
    if hope_pct >= 38:
        return "#F59E0B", "Balanced tension", "The signal is mixed and moving in both directions."
    return DOOM_FILL, "Doom dominant", "Conflict-coded events currently outweigh cooperative ones."


def sparkline_path(values: list[float], width: int = 210, height: int = 52, padding: int = 6) -> str:
    """Translate a value list into an SVG path string."""
    if not values:
        values = [50.0, 50.0]
    if len(values) == 1:
        values = values * 2

    min_v = min(values)
    max_v = max(values)
    span = max(max_v - min_v, 1.0)
    usable_w = max(width - padding * 2, 1)
    usable_h = max(height - padding * 2, 1)

    segments: list[str] = []
    for idx, value in enumerate(values):
        x = padding + (usable_w * idx / (len(values) - 1))
        normalized = (value - min_v) / span
        y = padding + (usable_h - usable_h * normalized)
        prefix = "M" if idx == 0 else "L"
        segments.append(f"{prefix}{x:.1f},{y:.1f}")
    return " ".join(segments)


def render_navbar(stats: dict[str, float | int]) -> None:
    """Render the fixed top navigation bar with brand, stat pills, and quick links."""
    hope_pct = float(stats["hope_pct"])
    accent, _, _ = hope_tone(hope_pct)
    render_html(
        f"""
        <div class="hf-navbar">
          <div class="hf-navbar-inner">
            <div class="hf-brand-lockup">
              <div class="hf-brand-mark" aria-hidden="true">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <rect x="4.5" y="4.5" width="15" height="15" rx="5" stroke="rgba(248,250,252,0.82)" stroke-width="1.2"></rect>
                  <path d="M9 8V16" stroke="rgba(248,250,252,0.82)" stroke-width="1.3" stroke-linecap="round"></path>
                  <path d="M15 8V16" stroke="rgba(248,250,252,0.82)" stroke-width="1.3" stroke-linecap="round"></path>
                  <path d="M9 12H15" stroke="rgba(248,250,252,0.82)" stroke-width="1.3" stroke-linecap="round"></path>
                </svg>
              </div>
              <div>
                <div class="hf-brand-wordmark">HopeForge</div>
                <div class="hf-brand-tag">
                  <span class="hf-live-dot"></span>
                  Doom vs Bloom • Real-time GDELT
                </div>
              </div>
            </div>

            <div class="hf-stat-row">
              <div class="hf-stat-pill hf-card-lift">
                <div class="hf-stat-label">Events</div>
                <div class="hf-stat-value">{int(stats["total"]):,}</div>
              </div>
              <div class="hf-stat-pill hf-card-lift">
                <div class="hf-stat-label">Doom</div>
                <div class="hf-stat-value" style="color:{DOOM_FILL};">{int(stats["doom"]):,}</div>
              </div>
              <div class="hf-stat-pill hf-card-lift">
                <div class="hf-stat-label">Bloom</div>
                <div class="hf-stat-value" style="color:{BLOOM_FILL};">{int(stats["bloom"]):,}</div>
              </div>
              <div class="hf-stat-pill hf-card-lift" style="border-color:{accent}33;">
                <div class="hf-stat-label">Hope</div>
                <div class="hf-stat-value" style="color:{accent};">{hope_pct:.1f}%</div>
              </div>
            </div>

            <div class="hf-link-row">
              <a class="hf-link-chip hf-link-chip--bloom" href="https://www.gdeltproject.org" target="_blank" rel="noreferrer">
                GDELT feed
              </a>
              <a class="hf-link-chip hf-link-chip--doom" href="https://github.com/sourrrish/hopeforge" target="_blank" rel="noreferrer">
                GitHub
              </a>
            </div>
          </div>
        </div>
        """,
    )


def render_scene_meta(region_name: str, days: int, total_events: int) -> None:
    """Add a compact metadata strip above the map to orient the user immediately."""
    render_html(
        f"""
        <div class="hf-meta-row">
          <div class="hf-chip">Conflict theatre: <strong>{_html.escape(region_name)}</strong></div>
          <div class="hf-chip">Window: <strong>Last {days} days</strong></div>
          <div class="hf-chip">Marker cap: <strong>{MAX_MARKERS:,}</strong></div>
          <div class="hf-chip">Live sample: <strong>{total_events:,} events</strong></div>
        </div>
        """,
    )


def build_folium_map(
    df: pd.DataFrame,
    show_doom: bool,
    show_bloom: bool,
    center: tuple[float, float, int],
    map_key: str,
) -> dict:
    """
    Build the Folium map with the existing marker colors and size logic.
    Only the layout chrome changes; the map data and center stay the same.
    """
    lat, lon, zoom = center

    m = folium.Map(
        location=[lat, lon],
        zoom_start=zoom,
        tiles="CartoDB dark_matter",
        prefer_canvas=True,
        control_scale=True,
    )

    doom_group = folium.FeatureGroup(name="Doom", show=show_doom)
    bloom_group = folium.FeatureGroup(name="Bloom", show=show_bloom)

    half = MAX_MARKERS // 2
    doom_df = (
        df[df["category"] == "doom"].nlargest(half, "NumMentions")
        if show_doom
        else pd.DataFrame()
    )
    bloom_df = (
        df[df["category"] == "bloom"].nlargest(half, "NumMentions")
        if show_bloom
        else pd.DataFrame()
    )

    for frame, group, fill_c, line_c in [
        (doom_df, doom_group, DOOM_FILL, DOOM_LINE),
        (bloom_df, bloom_group, BLOOM_FILL, BLOOM_LINE),
    ]:
        for row in frame.itertuples(index=False):
            ql = _html.escape(str(getattr(row, "quad_label", "Event")))
            actor_1 = _html.escape(str(getattr(row, "Actor1Name", "Unknown")))
            actor_2 = _html.escape(str(getattr(row, "Actor2Name", "Unknown")))
            loc = _html.escape(str(getattr(row, "ActionGeo_FullName", "Unknown"))[:52])
            radius = float(getattr(row, "marker_r", 5.0))
            lat_ = float(getattr(row, "ActionGeo_Lat", 0.0))
            lon_ = float(getattr(row, "ActionGeo_Long", 0.0))

            try:
                gs_str = f"{float(getattr(row, 'GoldsteinScale', 0) or 0):+.1f}"
            except (TypeError, ValueError):
                gs_str = "n/a"

            tooltip = folium.Tooltip(
                f"<div style='font:12px/1.6 IBM Plex Sans, sans-serif;padding:6px 4px;min-width:200px;'>"
                f"<b style='color:{fill_c};'>{ql}</b><br>"
                f"<span style='color:#E2E8F0;'>{actor_1} <span style='color:#64748B;'>to</span> {actor_2}</span><br>"
                f"<span style='color:#94A3B8;'>Location: {loc}</span><br>"
                f"<span style='color:#7DD3FC;'>Goldstein {gs_str}</span>"
                f"</div>",
                sticky=False,
            )

            folium.CircleMarker(
                location=[lat_, lon_],
                radius=radius,
                color=line_c,
                fill=True,
                fill_color=fill_c,
                fill_opacity=0.8,
                weight=1.5,
                tooltip=tooltip,
            ).add_to(group)

    doom_group.add_to(m)
    bloom_group.add_to(m)

    return st_folium(m, key=map_key, height=MAP_HEIGHT, use_container_width=True)


def get_selected_event(map_data: dict | None, df: pd.DataFrame) -> dict | None:
    """Resolve the last clicked marker to the nearest event and persist it across reruns."""
    if map_data:
        clicked = map_data.get("last_object_clicked")
        if isinstance(clicked, dict):
            clat = clicked.get("lat")
            clon = clicked.get("lng")
            if clat is not None and clon is not None:
                dists = (df["ActionGeo_Lat"] - clat) ** 2 + (df["ActionGeo_Long"] - clon) ** 2
                row = df.loc[dists.idxmin()].to_dict()
                st.session_state["_hf_ev"] = row

    return st.session_state.get("_hf_ev")


def build_hope_overlay_html(df: pd.DataFrame, stats: dict[str, float | int], days: int) -> str:
    """Render the custom Hope gauge and sparkline as inline SVG inside a glass card."""
    daily = build_daily_hope_series(df)
    values = [float(v) for v in daily.tolist()]
    accent, tone_label, tone_copy = hope_tone(float(stats["hope_pct"]))
    progress = max(0.0, min(float(stats["hope_pct"]), 100.0))
    progress_width = max(progress, 4.0)
    spark_path = sparkline_path(values)
    latest_delta = 0.0 if len(values) < 2 else values[-1] - values[0]
    delta_color = BLOOM_FILL if latest_delta >= 0 else DOOM_FILL
    pulse_class = "is-glowing" if progress > 55 else ""
    safe_dates = " - ".join([_html.escape(str(daily.index[0])), _html.escape(str(daily.index[-1]))])

    return f"""
    <div class="hf-hope-overlay {pulse_class}">
      <div style="padding:1.25rem;">
        <div class="hf-overlay-top">
          <div>
            <div class="hf-overlay-eyebrow">Hope meter</div>
            <div class="hf-overlay-title">Doom vs Bloom pulse</div>
          </div>
          <div class="hf-overlay-badge">
            Last {days}d
          </div>
        </div>

        <div class="hf-hope-main" style="margin-top:1rem;">
          <div class="hf-hope-ring">
            <div class="hf-hope-ring-track"></div>
            <div class="hf-hope-ring-fill" style="--hf-ring-progress:{progress:.1f};--hf-ring-color:{accent};">
              <div class="hf-hope-ring-core">
                <div class="hf-value-lg">{progress:.1f}%</div>
                <div class="hf-overline" style="margin-top:0.45rem;color:{accent};">
                  {tone_label}
                </div>
              </div>
            </div>
          </div>

          <div class="hf-hope-info">
            <div class="hf-info-card">
              <div class="hf-overline">Goldstein average</div>
              <div class="hf-value-lg" style="margin-top:0.55rem;color:{accent};">{float(stats["avg_gs"]):+.2f}</div>
              <div class="hf-body-sm" style="margin-top:0.65rem;color:var(--hf-muted);">{tone_copy}</div>
            </div>
          </div>
        </div>

        <div style="margin-top:1rem;">
          <div class="hf-progress-rail">
            <div class="hf-progress-fill" style="width:{progress_width:.1f}%"></div>
          </div>
          <div class="hf-hope-bands" style="margin-top:0.45rem;">
            <span class="hf-band-label">Doom pressure</span>
            <span class="hf-band-label" style="text-align:center;">Balanced</span>
            <span class="hf-band-label" style="text-align:right;">Bloom momentum</span>
          </div>
        </div>

        <div class="hf-spark-card" style="margin-top:1.15rem;">
          <div class="hf-hope-spark-head">
            <div>
              <div class="hf-overline">Sparkline</div>
              <div class="hf-body-sm hf-text-muted" style="margin-top:0.3rem;">Daily Bloom share across the sampled window</div>
            </div>
            <div class="hf-value-md" style="color:{delta_color};">{latest_delta:+.1f} pts</div>
          </div>
          <div class="hf-sparkline">
            <svg viewBox="0 0 210 52" width="100%" height="56" preserveAspectRatio="none">
              <path
                d="{spark_path}"
                fill="none"
                stroke="{accent}"
                stroke-width="3"
                stroke-linecap="round"
                stroke-linejoin="round"
                style="filter: drop-shadow(0 0 10px {accent});"
              ></path>
            </svg>
          </div>
          <div class="hf-overline" style="margin-top:0.55rem;color:var(--hf-dim);letter-spacing:0.08em;">
            {safe_dates}
          </div>
        </div>
      </div>
    </div>
    """


def build_event_drawer_html(event: dict | None) -> str:
    """Render the right-side event drawer as custom HTML so it can animate independently."""
    if event is None:
        return """
        <div class="hf-event-drawer is-placeholder">
          <div style="padding:1.25rem;">
            <div class="hf-overlay-eyebrow">Event drawer</div>
            <div class="hf-overlay-title" style="margin-top:0.45rem;">Click a marker to inspect the story behind it</div>
            <div class="hf-event-card" style="margin-top:1rem;">
              <div class="hf-body-sm hf-text-muted">
                The map stays uncluttered until you select an event. Once you click a marker,
                this drawer expands with location, date, Goldstein score, source link, and the
                premium AI action placeholder.
              </div>
            </div>
          </div>
        </div>
        """

    gs_raw = event.get("GoldsteinScale")
    try:
        gs = float(gs_raw)
    except (TypeError, ValueError):
        gs = None

    is_bloom = gs is not None and gs > 0
    accent = BLOOM_FILL if is_bloom else DOOM_FILL
    tone = "Bloom event" if is_bloom else "Doom event"
    quad_label = _html.escape(str(event.get("quad_label", "Event")))
    actor_1 = _html.escape(str(event.get("Actor1Name", "Unknown")))
    actor_2 = _html.escape(str(event.get("Actor2Name", "Unknown")))
    location = _html.escape(str(event.get("ActionGeo_FullName", "Unknown location")))
    mentions = _html.escape(str(event.get("NumMentions", "N/A")))
    sources = _html.escape(str(event.get("NumSources", "N/A")))
    gs_str = f"{gs:+.1f}" if gs is not None else "N/A"
    date_label = _html.escape(format_sql_date(event.get("SQLDATE", "")))

    source_url = str(event.get("SOURCEURL", "") or "")
    safe_href = _html.escape(source_url, quote=True)
    link_markup = (
        f'<a class="hf-event-btn hf-event-btn--primary" href="{safe_href}" target="_blank" rel="noreferrer">Read source article</a>'
        if source_url.startswith("http")
        else '<div class="hf-event-btn hf-event-btn--disabled">Source URL unavailable</div>'
    )

    return f"""
    <div class="hf-event-drawer is-open">
      <div style="padding:1.25rem;">
        <div class="hf-event-head">
          <div>
            <div class="hf-overlay-eyebrow">Event drawer</div>
            <div class="hf-overlay-title" style="margin-top:0.45rem;">{quad_label}</div>
          </div>
          <div class="hf-overlay-badge" style="border-color:{accent}55;color:{accent};">
            {tone}
          </div>
        </div>

        <div class="hf-event-card hf-event-actors">
          <div class="hf-overline">Actors</div>
          <div class="hf-value-md" style="margin-top:0.65rem;">{actor_1}</div>
          <div class="hf-event-direction" style="color:{accent};">to</div>
          <div class="hf-value-md">{actor_2}</div>
        </div>

        <div class="hf-event-grid">
          <div class="hf-event-cell">
            <div class="hf-overline" style="color:var(--hf-dim);">Location</div>
            <div class="hf-body-sm" style="margin-top:0.55rem;">{location}</div>
          </div>
          <div class="hf-event-cell">
            <div class="hf-overline" style="color:var(--hf-dim);">Date</div>
            <div class="hf-body-sm" style="margin-top:0.55rem;">{date_label}</div>
          </div>
          <div class="hf-event-cell">
            <div class="hf-overline" style="color:var(--hf-dim);">Goldstein</div>
            <div class="hf-value-md" style="margin-top:0.55rem;color:{accent};">{gs_str}</div>
          </div>
          <div class="hf-event-cell">
            <div class="hf-overline" style="color:var(--hf-dim);">Coverage</div>
            <div class="hf-body-sm" style="margin-top:0.55rem;">Mentions {mentions}<br>Sources {sources}</div>
          </div>
        </div>

        <div class="hf-event-actions">
          {link_markup}
          <button class="hf-event-btn hf-event-btn--disabled" disabled>
            AI analysis coming soon
          </button>
        </div>
      </div>
    </div>
    """


def render_footer() -> None:
    """Keep attribution visible without reintroducing Streamlit-like footer chrome."""
    render_html(
        """
        <div class="hf-footer">
          HopeForge runs on Streamlit, Folium, and the GDELT Project.
          Events reflect media coverage, not independently verified ground truth.
          <a href="https://github.com/sourrrish/hopeforge" target="_blank" rel="noreferrer">Open the repo</a>.
        </div>
        """
    )


def main() -> None:
    """Compose the premium frontend shell around the unchanged data pipeline."""
    inject_global_styles()

    with st.sidebar:
        render_html(
            """
            <div class="hf-side-kicker">Control cockpit</div>
            <div class="hf-side-title hf-side-space-sm">Filters, legend, and feed controls</div>
            <div class="hf-side-note hf-side-space-sm">
              Native widgets stay in Streamlit so every toggle still reruns the app normally,
              but the sidebar is visually recast as a floating glass command panel.
            </div>
            """
        )

        render_html('<div class="hf-divider my-4"></div>')

        render_html(
            '<div class="hf-side-kicker" style="letter-spacing:0.12em;">Time window</div>',
        )
        days = st.select_slider(
            "time_window",
            options=[7, 30, 180],
            value=st.session_state.get("days", 7),
            format_func=lambda value: f"Last {value} days",
            label_visibility="collapsed",
            help=f"Samples {N_FILES} GDELT snapshots evenly across the selected window.",
        )
        st.session_state["days"] = days

        render_html('<div class="hf-divider my-4"></div>')

        render_html(
            '<div class="hf-side-kicker" style="letter-spacing:0.12em;">Theatre focus</div>',
        )
        region_name = st.selectbox(
            "Region",
            options=list(REGIONS.keys()),
            index=0,
            label_visibility="collapsed",
        )
        center = REGIONS[region_name]

        render_html('<div class="hf-divider my-4"></div>')

        render_html(
            '<div class="hf-side-kicker" style="letter-spacing:0.12em;">Event layers</div>',
        )
        show_doom = st.checkbox("Doom (conflict, tension, military action)", value=True)
        show_bloom = st.checkbox("Bloom (cooperation, aid, diplomacy)", value=True)

        render_html('<div class="hf-divider my-4"></div>')
        render_html(
            """
            <div class="hf-legend-card">
              <div class="hf-side-kicker" style="letter-spacing:0.12em;">Legend</div>
              <div class="hf-legend-list">
                <div class="hf-legend-item">
                  <span class="hf-legend-dot" style="background:#DC143C;box-shadow:0 0 14px rgba(220,20,60,0.5);"></span>
                  <span>Doom markers represent conflict-coded events.</span>
                </div>
                <div class="hf-legend-item">
                  <span class="hf-legend-dot" style="background:#00FFFF;box-shadow:0 0 16px rgba(0,255,255,0.55);"></span>
                  <span>Bloom markers represent cooperation-coded events.</span>
                </div>
                <div class="hf-legend-note">Marker radius stays proportional to |GoldsteinScale|.</div>
              </div>
            </div>
            """
        )

        render_html("<div style='height:0.75rem;'></div>")

        if st.button("Refresh data", use_container_width=True, type="primary"):
            st.cache_data.clear()
            st.session_state.pop("celebration_shown", None)
            st.session_state.pop("_hf_ev", None)
            st.session_state.pop("_hf_map_key", None)
            st.rerun()

        render_html(
            f"""
            <div class="hf-side-note hf-side-space-md">
              Cache: {CACHE_TTL // 60} minutes<br>
              Feed cadence: GDELT updates roughly every 15 minutes
            </div>
            """
        )

    with st.spinner("Fetching real-time conflict and cooperation events from GDELT..."):
        raw_df = fetch_gdelt_data(days)

    if raw_df.empty:
        st.error(
            "Could not retrieve GDELT data. The public export may be temporarily unavailable."
        )
        if st.button("Retry feed", type="primary"):
            st.cache_data.clear()
            st.rerun()
        return

    df = classify_events(raw_df)

    if df.empty:
        st.warning("Data loaded but no events carried valid coordinates in this sample.")
        return

    stats = compute_hope_stats(df)
    hope_pct = float(stats["hope_pct"])

    # One celebratory effect is enough when the signal becomes unusually hopeful.
    if hope_pct > 80 and "celebration_shown" not in st.session_state:
        st.balloons()
        st.session_state["celebration_shown"] = True

    current_ctx = f"{region_name}|{days}"
    if st.session_state.get("_hf_map_key") != current_ctx:
        st.session_state.pop("_hf_ev", None)
        st.session_state["_hf_map_key"] = current_ctx

    render_navbar(stats)
    render_scene_meta(region_name, days, int(stats["total"]))
    render_html(build_hope_overlay_html(df, stats, days))

    map_key = f"hf_{region_name}_{days}"
    map_data = build_folium_map(df, show_doom, show_bloom, center, map_key)
    selected_event = get_selected_event(map_data, df)
    render_html(build_event_drawer_html(selected_event))

    render_footer()


if __name__ == "__main__":
    main()
