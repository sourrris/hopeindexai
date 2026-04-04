"""
HopeForge: Doom vs. Bloom — Global Events Dashboard
=====================================================
Visualizes real-time GDELT world events with a balanced, hopeful lens.
  Red  (Doom)  = conflicts, protests, military action
  Green (Bloom) = cooperation, aid, peace, diplomacy

Data:   GDELT Project (https://www.gdeltproject.org) — updates every 15 min
Run:    streamlit run app.py
Deploy: https://share.streamlit.io
"""

from __future__ import annotations

import datetime
import io
import zipfile
from concurrent.futures import ThreadPoolExecutor, as_completed

import pandas as pd
import plotly.graph_objects as go
import pydeck as pdk
import requests
import streamlit as st

# ─── Page config (must be the very first Streamlit call) ─────────────────────
st.set_page_config(
    page_title="HopeForge 🌍",
    page_icon="🌍",
    layout="wide",
    initial_sidebar_state="expanded",
    menu_items={"About": "HopeForge — Because the world isn't just burning."},
)

# ─── Constants ────────────────────────────────────────────────────────────────
DOOM_COLOR  = [220, 38, 38, 170]    # crimson-600
BLOOM_COLOR = [34, 197, 94, 170]    # emerald-500

MAX_POINTS    = 5_000   # hard cap on rendered events (performance)
CACHE_TTL     = 900     # seconds — matches GDELT's 15-min update cadence
ROWS_PER_FILE = 1_200   # rows sampled per GDELT file download
N_FILES       = 10      # snapshots stitched together per query
MAP_HEIGHT    = 660     # map height in pixels

GDELT_BASE       = "http://data.gdeltproject.org/gdeltv2/"
GDELT_LASTUPDATE = f"{GDELT_BASE}lastupdate.txt"

QUAD_LABELS: dict[int, str] = {
    1: "Verbal Cooperation",
    2: "Material Cooperation",
    3: "Verbal Conflict",
    4: "Material Conflict",
}

# ─── GDELT v2 event export schema ────────────────────────────────────────────
# 61 tab-separated columns, no header row in the raw CSV files.
# Full codebook: https://www.gdeltproject.org/data/documentation/GDELT-Event_Codebook-V2.0.pdf
GDELT_COLS: list[str] = [
    "GLOBALEVENTID", "SQLDATE", "MonthYear", "Year", "FractionDate",
    "Actor1Code", "Actor1Name", "Actor1CountryCode", "Actor1KnownGroupCode",
    "Actor1EthnicCode", "Actor1Religion1Code", "Actor1Religion2Code",
    "Actor1Type1Code", "Actor1Type2Code", "Actor1Type3Code",
    "Actor2Code", "Actor2Name", "Actor2CountryCode", "Actor2KnownGroupCode",
    "Actor2EthnicCode", "Actor2Religion1Code", "Actor2Religion2Code",
    "Actor2Type1Code", "Actor2Type2Code", "Actor2Type3Code",
    "IsRootEvent", "EventCode", "EventBaseCode", "EventRootCode",
    "QuadClass", "GoldsteinScale",
    "NumMentions", "NumSources", "NumArticles", "AvgTone",
    "Actor1Geo_Type", "Actor1Geo_FullName", "Actor1Geo_CountryCode",
    "Actor1Geo_ADM1Code", "Actor1Geo_ADM2Code",
    "Actor1Geo_Lat", "Actor1Geo_Long", "Actor1Geo_FeatureID",
    "Actor2Geo_Type", "Actor2Geo_FullName", "Actor2Geo_CountryCode",
    "Actor2Geo_ADM1Code", "Actor2Geo_ADM2Code",
    "Actor2Geo_Lat", "Actor2Geo_Long", "Actor2Geo_FeatureID",
    "ActionGeo_Type", "ActionGeo_FullName", "ActionGeo_CountryCode",
    "ActionGeo_ADM1Code", "ActionGeo_ADM2Code",
    "ActionGeo_Lat", "ActionGeo_Long", "ActionGeo_FeatureID",
    "DATEADDED", "SOURCEURL",
]

# Minimal column set forwarded to PyDeck (smaller payload = faster render)
_MAP_COLS = [
    "ActionGeo_Long", "ActionGeo_Lat", "radius",
    "Actor1Name", "Actor2Name", "quad_label",
    "GoldsteinScale", "ActionGeo_FullName",
    "GLOBALEVENTID", "SOURCEURL", "SQLDATE", "NumMentions",
]


# ─── Data layer ───────────────────────────────────────────────────────────────

def _gdelt_urls(days: int) -> list[str]:
    """
    Generate N_FILES GDELT v2 noon-UTC snapshot URLs evenly spread across `days`.

    Strategy: sample one file per step rather than downloading every 15-min file
    (which would be 672 files for 7 days). Keeps total download < 20 MB.
    """
    today = datetime.date.today()
    step  = max(1, days // N_FILES)
    return [
        f"{GDELT_BASE}"
        f"{(today - datetime.timedelta(days=i * step)).strftime('%Y%m%d')}"
        f"120000.export.CSV.zip"
        for i in range(N_FILES)
    ]


def _fetch_one(url: str) -> pd.DataFrame | None:
    """Download one GDELT v2 ZIP and return the first ROWS_PER_FILE rows, or None."""
    try:
        resp = requests.get(url, timeout=20)
        if resp.status_code != 200:
            return None
        with zipfile.ZipFile(io.BytesIO(resp.content)) as z:
            with z.open(z.namelist()[0]) as f:
                return pd.read_csv(
                    f,
                    sep="\t",
                    header=None,
                    names=GDELT_COLS,
                    nrows=ROWS_PER_FILE,
                    on_bad_lines="skip",
                    low_memory=False,
                    dtype=str,          # coerce to typed columns later in classify_events
                )
    except Exception:
        return None


def _fallback_fetch() -> pd.DataFrame | None:
    """
    Emergency fallback: parse lastupdate.txt to get the single most-recent
    GDELT export file and download it directly.
    """
    try:
        resp = requests.get(GDELT_LASTUPDATE, timeout=10)
        for line in resp.text.strip().splitlines():
            if ".export.CSV.zip" in line:
                return _fetch_one(line.strip().split()[-1])
    except Exception:
        pass
    return None


# ─── Alternative: official gdelt Python package ───────────────────────────────
# pip install gdelt
#
# import gdelt as gdelt_pkg
# gd = gdelt_pkg.gdelt(version=2)
# today = datetime.date.today().strftime("%Y %b %d")
# df = gd.Search([today, today], table="events", coverage=False)
#
# Notes:
#   coverage=False → fast: fetches only the single latest 15-min file
#   coverage=True  → slow: fetches every 15-min file in the date range
#                          (672 files for 7 days — not suitable for a web app)
# ─────────────────────────────────────────────────────────────────────────────


@st.cache_data(ttl=CACHE_TTL, show_spinner=False)
def fetch_gdelt_data(days: int) -> pd.DataFrame:
    """
    Fetch N_FILES GDELT v2 snapshots sampled across `days`, downloaded in
    parallel via ThreadPoolExecutor. Falls back to the latest snapshot file
    if all sampled URLs fail (e.g. GDELT outage or old files unavailable).
    """
    urls = _gdelt_urls(days)
    dfs: list[pd.DataFrame] = []

    # Parallel download — GDELT is fast on a good connection; 5 workers is safe
    with ThreadPoolExecutor(max_workers=5) as pool:
        futures = {pool.submit(_fetch_one, u): u for u in urls}
        for future in as_completed(futures):
            result = future.result()
            if result is not None and not result.empty:
                dfs.append(result)

    # Fallback if all sampled files failed (e.g. historic URLs not available)
    if not dfs:
        fallback = _fallback_fetch()
        if fallback is not None:
            dfs.append(fallback)

    if not dfs:
        return pd.DataFrame()

    combined = pd.concat(dfs, ignore_index=True)

    # Remove duplicate events that appear in multiple 15-min snapshots
    combined = combined.drop_duplicates(subset="GLOBALEVENTID", keep="first")

    # Stratified sample: preserve the doom/bloom ratio after dedup
    if len(combined) > MAX_POINTS:
        combined = combined.sample(MAX_POINTS, random_state=42)

    return combined.reset_index(drop=True)


def classify_events(df: pd.DataFrame) -> pd.DataFrame:
    """
    Tag each event as 'doom' or 'bloom':

      bloom → GoldsteinScale > 0  (positive global-stability contribution)
      doom  → GoldsteinScale ≤ 0  (negative or neutral)

    Fallback (when Goldstein is missing): QuadClass 1/2 → bloom, 3/4 → doom.
    Drops events without valid ActionGeo coordinates.
    """
    if df.empty:
        return df

    # Coerce raw strings to typed numeric values
    for col in ("GoldsteinScale", "QuadClass", "NumMentions", "ActionGeo_Lat", "ActionGeo_Long"):
        df[col] = pd.to_numeric(df[col], errors="coerce")

    # Keep only rows with usable map coordinates
    df = df.dropna(subset=["ActionGeo_Lat", "ActionGeo_Long"])
    df = df[
        df["ActionGeo_Lat"].between(-90, 90) &
        df["ActionGeo_Long"].between(-180, 180)
    ].copy()

    if df.empty:
        return df

    # ── Vectorised classification (no .apply() loop) ─────────────────────────
    df["category"] = "doom"                                          # default pessimistic
    df.loc[df["GoldsteinScale"] > 0, "category"] = "bloom"
    no_goldstein = df["GoldsteinScale"].isna()
    df.loc[no_goldstein & df["QuadClass"].isin([1.0, 2.0]), "category"] = "bloom"

    # ── Display helpers ───────────────────────────────────────────────────────
    df["Actor1Name"] = df["Actor1Name"].fillna("Unknown").str.strip().str.title()
    df["Actor2Name"] = df["Actor2Name"].fillna("Unknown").str.strip().str.title()
    df["quad_label"] = df["QuadClass"].map(QUAD_LABELS).fillna("Unknown Event")
    df["NumMentions"] = df["NumMentions"].fillna(1).clip(lower=1).astype(int)

    # Point radius: scale with media coverage (30 km base → 200 km max)
    p95 = float(df["NumMentions"].quantile(0.95))
    df["radius"] = (
        (df["NumMentions"].clip(upper=p95) / max(p95, 1)) * 170_000 + 30_000
    ).astype(int)

    return df.reset_index(drop=True)


# ─── UI components ────────────────────────────────────────────────────────────

def render_banner() -> None:
    st.markdown(
        """
        <div style="
            background: linear-gradient(135deg, #0f172a 0%, #1e293b 55%, #162032 100%);
            padding: 26px 34px;
            border-radius: 16px;
            margin-bottom: 20px;
            border: 1px solid #334155;
        ">
          <h1 style="color:#f1f5f9; margin:0;
                     font-size:clamp(1.8rem,3.5vw,2.8rem); letter-spacing:-0.02em;">
            🌍 HopeForge
          </h1>
          <p style="color:#94a3b8; margin:5px 0 0; font-size:clamp(0.9rem,1.8vw,1.1rem);">
            <em>Doom vs. Bloom — The world isn't just burning</em>
          </p>
          <p style="color:#475569; margin:10px 0 0; font-size:0.82rem; line-height:1.8;">
            Real-time global events from the
            <a href="https://www.gdeltproject.org" target="_blank"
               style="color:#60a5fa;">GDELT Project</a>
            &nbsp;·&nbsp; Classified by Goldstein Stability Scale
            &nbsp;·&nbsp; 🔴 Conflict &amp; tension
            &nbsp;·&nbsp; 🟢 Cooperation &amp; aid
            <br/>
            <a href="https://github.com/your-handle/hopeforge" target="_blank"
               style="color:#60a5fa;">⭐ Star on GitHub</a>
            &nbsp;·&nbsp; Data refreshes every 15 min
          </p>
        </div>
        """,
        unsafe_allow_html=True,
    )


def build_hope_gauge(df: pd.DataFrame) -> tuple[go.Figure, float, float]:
    """
    Build a Plotly gauge showing the Hope Score (% bloom events).
    Returns: (figure, hope_pct, avg_goldstein)
    """
    if df.empty:
        return go.Figure(), 50.0, 0.0

    bloom_n  = int((df["category"] == "bloom").sum())
    hope_pct = round(bloom_n / len(df) * 100, 1)
    avg_gs   = round(float(df["GoldsteinScale"].dropna().mean()), 2)

    # Colour the gauge bar by how hopeful the score is
    if hope_pct >= 55:
        bar_col = "#22c55e"   # green
    elif hope_pct >= 38:
        bar_col = "#f59e0b"   # amber
    else:
        bar_col = "#dc2626"   # red

    fig = go.Figure(go.Indicator(
        mode="gauge+number",
        value=hope_pct,
        number={"suffix": "%", "font": {"size": 42, "color": "#f1f5f9"}},
        title={"text": "Hope Score", "font": {"size": 15, "color": "#94a3b8"}},
        gauge={
            "axis": {
                "range": [0, 100],
                "dtick": 25,
                "tickcolor": "#475569",
                "tickfont": {"color": "#64748b", "size": 10},
            },
            "bar": {"color": bar_col, "thickness": 0.20},
            "bgcolor": "#0f172a",
            "borderwidth": 1,
            "bordercolor": "#334155",
            "steps": [
                {"range": [0,  38], "color": "rgba(220,38,38,0.15)"},
                {"range": [38, 55], "color": "rgba(245,158,11,0.15)"},
                {"range": [55,100], "color": "rgba(34,197,94,0.15)"},
            ],
            "threshold": {
                "line": {"color": "#f8fafc", "width": 2.5},
                "thickness": 0.80,
                "value": hope_pct,
            },
        },
    ))
    fig.update_layout(
        height=220,
        margin=dict(l=18, r=18, t=28, b=4),
        paper_bgcolor="rgba(0,0,0,0)",
        plot_bgcolor="rgba(0,0,0,0)",
    )
    return fig, hope_pct, avg_gs


def render_map(df: pd.DataFrame, show_doom: bool, show_bloom: bool):
    """
    Build and render a PyDeck ScatterplotLayer world map.

    Two layers: 'doom' (red) and 'bloom' (green), each independently togglable.
    Uses Carto Dark Matter map style — no Mapbox token required.
    on_select="rerun" triggers a Streamlit rerun on click, populating
    event.selection.objects with the clicked row's data.
    """
    tooltip = {
        "html": (
            "<div style='background:#1e293b; padding:10px 14px; border-radius:10px;"
            "border:1px solid #334155; font-family:system-ui,sans-serif; font-size:12px;'>"
            "<b style='color:#f1f5f9;'>{Actor1Name}</b>"
            "<span style='color:#475569;'> → </span>"
            "<b style='color:#f1f5f9;'>{Actor2Name}</b><br/>"
            "<span style='color:#94a3b8;'>{quad_label}</span><br/>"
            "<span style='color:#64748b;'>📍 {ActionGeo_FullName}</span><br/>"
            "<span style='color:#94a3b8;'>Goldstein: <b>{GoldsteinScale}</b>"
            "&ensp;·&ensp;Mentions: <b>{NumMentions}</b></span>"
            "</div>"
        ),
        "style": {"backgroundColor": "transparent"},
    }

    layers: list[pdk.Layer] = []

    for cat, color, layer_id, show in [
        ("doom",  DOOM_COLOR,  "doom",  show_doom),
        ("bloom", BLOOM_COLOR, "bloom", show_bloom),
    ]:
        if not show:
            continue
        sub = df[df["category"] == cat].copy()
        if sub.empty:
            continue
        # Ensure all expected columns exist before handing to PyDeck
        for col in _MAP_COLS:
            if col not in sub.columns:
                sub[col] = None
        layers.append(pdk.Layer(
            "ScatterplotLayer",
            id=layer_id,              # used as key in event.selection.objects
            data=sub[_MAP_COLS],
            get_position=["ActionGeo_Long", "ActionGeo_Lat"],
            get_fill_color=color,
            get_radius="radius",
            radius_scale=1,
            radius_min_pixels=3,      # always visible even when zoomed out
            radius_max_pixels=18,     # cap size to prevent giant blobs
            pickable=True,
            auto_highlight=True,
            highlight_color=[255, 255, 255, 90],
        ))

    deck = pdk.Deck(
        layers=layers,
        initial_view_state=pdk.ViewState(
            latitude=20, longitude=10, zoom=1.3,
            min_zoom=0.5, max_zoom=12,
        ),
        map_style="https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json",
        tooltip=tooltip,
    )

    return st.pydeck_chart(
        deck,
        on_select="rerun",              # rerun the script on click, pass selection state
        selection_mode="single-object", # only one event selected at a time
        height=MAP_HEIGHT,
        use_container_width=True,
    )


def render_event_panel(event) -> None:
    """
    Show metadata for the last clicked map event.
    `event` is the PydeckState returned by st.pydeck_chart (Streamlit ≥ 1.30).
    event.selection.objects is a dict[layer_id, list[row_dict]].
    """
    selected: dict | None = None

    try:
        objects = event.selection.objects          # e.g. {"doom": [{...}]}
        for layer_id in ("doom", "bloom"):
            rows = objects.get(layer_id) or []
            if rows:
                selected = rows[0]
                break
    except (AttributeError, TypeError, KeyError):
        pass

    if selected is None:
        st.markdown(
            "<p style='color:#475569; text-align:center; padding:16px;'>"
            "👆 Click any dot on the map to see event details"
            "</p>",
            unsafe_allow_html=True,
        )
        return

    # ── Determine display colour from Goldstein ───────────────────────────────
    gs_raw = selected.get("GoldsteinScale")
    try:
        gs = float(gs_raw)
    except (TypeError, ValueError):
        gs = None

    is_bloom = gs is not None and gs > 0
    accent   = "#22c55e" if is_bloom else "#dc2626"
    icon     = "🌱" if is_bloom else "💀"

    # ── Parse SQLDATE YYYYMMDD → human-readable ───────────────────────────────
    raw_date = selected.get("SQLDATE", "")
    try:
        fmt_date = datetime.datetime.strptime(
            str(int(float(raw_date))), "%Y%m%d"
        ).strftime("%b %d, %Y")
    except Exception:
        fmt_date = str(raw_date)

    st.markdown(
        f"""
        <div style="background:#1e293b; padding:18px 22px; border-radius:14px;
                    border-left:4px solid {accent}; margin-bottom:12px;">
          <div style="color:{accent}; font-size:0.8rem; font-weight:700;
                      letter-spacing:0.06em; text-transform:uppercase; margin-bottom:8px;">
            {icon} {selected.get("quad_label", "Event")}
          </div>
          <div style="color:#f1f5f9; font-size:1rem; margin-bottom:6px;">
            <b>{selected.get("Actor1Name", "—")}</b>
            <span style="color:#475569;"> → </span>
            <b>{selected.get("Actor2Name", "—")}</b>
          </div>
          <div style="color:#94a3b8; font-size:0.875rem; line-height:2.0;">
            📍 {selected.get("ActionGeo_FullName", "Unknown location")}<br/>
            📅 {fmt_date}<br/>
            Goldstein Scale: <b style="color:{accent};">{gs if gs is not None else "N/A"}</b>
            &ensp;·&ensp; Mentions: <b>{selected.get("NumMentions", "—")}</b>
          </div>
        </div>
        """,
        unsafe_allow_html=True,
    )

    src = selected.get("SOURCEURL", "")
    if isinstance(src, str) and src.startswith("http"):
        st.link_button("📰 Read Source Article", src, use_container_width=True)


# ─── Main ─────────────────────────────────────────────────────────────────────

def main() -> None:

    # ── Sidebar ──────────────────────────────────────────────────────────────
    with st.sidebar:
        st.markdown("## ⚙️ Controls")

        days = st.select_slider(
            "Time window",
            options=[7, 30, 180],
            value=7,
            format_func=lambda x: f"Last {x} days",
            help=(
                f"Samples {N_FILES} GDELT snapshots evenly across the window. "
                "Wider windows show longer-term patterns at slightly lower density."
            ),
        )

        st.markdown("---")
        st.markdown("**Event layers**")
        show_doom  = st.checkbox("💀 Doom  (conflict / tension)", value=True)
        show_bloom = st.checkbox("🌱 Bloom (cooperation / aid)",  value=True)

        st.markdown("---")
        if st.button("🔄 Refresh Data", use_container_width=True, type="primary"):
            st.cache_data.clear()
            st.session_state.pop("confetti_shown", None)
            st.rerun()

        st.caption(
            f"Cache: {CACHE_TTL // 60} min &nbsp;·&nbsp; "
            f"[GDELT Project](https://www.gdeltproject.org)"
        )

    # ── Banner ────────────────────────────────────────────────────────────────
    render_banner()

    # ── Fetch + classify data ─────────────────────────────────────────────────
    with st.spinner("🌐 Fetching global events from GDELT…"):
        raw_df = fetch_gdelt_data(days)

    if raw_df.empty:
        st.error(
            "⚠️ Could not retrieve GDELT data. The server may be temporarily unavailable. "
            "Please try refreshing, or visit [gdeltproject.org](https://www.gdeltproject.org)."
        )
        if st.button("↩️ Retry"):
            st.cache_data.clear()
            st.rerun()
        return

    df = classify_events(raw_df)

    if df.empty:
        st.warning(
            "Data loaded but no events with valid coordinates. "
            "Try a different time window."
        )
        return

    doom_n   = int((df["category"] == "doom").sum())
    bloom_n  = int((df["category"] == "bloom").sum())
    hope_pct = round(bloom_n / len(df) * 100, 1)

    # 🎉 Trigger confetti on unusually hopeful periods (once per session)
    if hope_pct > 62 and "confetti_shown" not in st.session_state:
        st.balloons()
        st.session_state["confetti_shown"] = True

    # ── Stats row ─────────────────────────────────────────────────────────────
    c1, c2, c3, c4 = st.columns(4)
    c1.metric("📊 Events",   f"{len(df):,}")
    c2.metric("💀 Doom",     f"{doom_n:,}")
    c3.metric("🌱 Bloom",    f"{bloom_n:,}")
    c4.metric("🌡️ Hope",     f"{hope_pct}%")

    st.markdown("")  # vertical spacer

    # ── Map (3 parts) + Hope gauge (1 part) ──────────────────────────────────
    map_col, gauge_col = st.columns([3, 1], gap="medium")

    with map_col:
        st.markdown("### 🗺️ Live Event Map")
        selection = render_map(df, show_doom, show_bloom)

    with gauge_col:
        st.markdown("### 🌡️ Hope Pulse")
        fig, _, avg_gs = build_hope_gauge(df)
        st.plotly_chart(fig, use_container_width=True)

        gs_color = "#22c55e" if avg_gs >= 0 else "#dc2626"
        st.markdown(
            f"<div style='text-align:center; padding:10px; background:#1e293b;"
            f"border-radius:10px; border:1px solid #334155; margin-top:-8px;'>"
            f"<div style='color:#64748b; font-size:0.75rem;'>Avg Goldstein</div>"
            f"<div style='color:{gs_color}; font-size:1.5rem; font-weight:700;'>{avg_gs:+.2f}</div>"
            f"<div style='color:#475569; font-size:0.7rem;'>–10 (war) → +10 (peace)</div>"
            f"</div>",
            unsafe_allow_html=True,
        )

    # ── Event detail panel ────────────────────────────────────────────────────
    st.markdown("---")
    st.markdown("### 🔍 Event Details")
    render_event_panel(selection)

    # ── Footer ────────────────────────────────────────────────────────────────
    st.markdown(
        "<div style='color:#334155; font-size:0.75rem; text-align:center; margin-top:28px;'>"
        "Built with Streamlit · GDELT · PyDeck · Plotly"
        "&nbsp;·&nbsp; HopeForge is not affiliated with the GDELT Project"
        "&nbsp;·&nbsp; Events represent media coverage, not ground truth"
        "</div>",
        unsafe_allow_html=True,
    )


if __name__ == "__main__":
    main()
