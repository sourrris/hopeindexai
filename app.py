"""
HopeForge: Doom vs. Bloom — Global Events Dashboard  (Folium Edition v2)
=========================================================================
Professional conflict tracker inspired by CFR, ACLED, and conflict.sbs.

  💀 Doom  (deep red)  = conflicts, protests, military action  [Goldstein ≤ 0]
  🌱 Bloom (cyan)      = cooperation, aid, peace, diplomacy    [Goldstein > 0]

Data:  GDELT Project (https://www.gdeltproject.org) — updates every 15 min
Run:   streamlit run app.py
"""

from __future__ import annotations

import datetime
import html as _html
import io
import zipfile
from concurrent.futures import ThreadPoolExecutor, as_completed

import folium
import pandas as pd
import plotly.graph_objects as go
import requests
import streamlit as st
from streamlit_folium import st_folium

# ─── Page config (must be the very first Streamlit call) ─────────────────────
st.set_page_config(
    page_title="HopeForge 🌍",
    page_icon="🌍",
    layout="wide",
    initial_sidebar_state="expanded",
    menu_items={"About": "HopeForge — Because the world isn't just burning."},
)

# ─── Global CSS — dark conflict-tracker aesthetic ────────────────────────────
st.markdown("""
<style>
/* ── Base ──────────────────────────────────────────── */
html,body,[data-testid="stAppViewContainer"]{background:#030b18 !important;}
[data-testid="stSidebar"]{background:#06101c !important;border-right:1px solid #0c1a28;}
[data-testid="stSidebar"] section{background:#06101c !important;}
section[data-testid="stSidebar"] *{color:#3a5e7a;}

/* ── Metric cards ──────────────────────────────────── */
[data-testid="metric-container"]{background:#071220;border:1px solid #0b1a2a;
border-radius:12px;padding:14px 18px !important;transition:border-color .2s;}
[data-testid="metric-container"]:hover{border-color:#162a40;}
[data-testid="stMetricValue"]{color:#cce0f8 !important;font-size:1.65rem !important;font-weight:800 !important;}
[data-testid="stMetricLabel"]{color:#1e3a52 !important;font-size:.8rem !important;}

/* ── Buttons ───────────────────────────────────────── */
button[kind="primary"]{background:linear-gradient(135deg,#0a2034,#0e2e48) !important;
border:1px solid #143854 !important;color:#4aaecc !important;}
button[kind="primary"]:hover{background:linear-gradient(135deg,#0e2e48,#163e5c) !important;}
a[data-testid="stLinkButton"]{background:#06101c !important;border:1px solid #0b1a2a !important;
color:#4aaecc !important;border-radius:8px !important;}

/* ── Folium iframe ─────────────────────────────────── */
iframe{border-radius:14px !important;border:1px solid #0b1a2a !important;
box-shadow:0 4px 30px rgba(0,0,0,.7) !important;}

/* ── Navbar ────────────────────────────────────────── */
.hf-nav{display:flex;align-items:center;justify-content:space-between;
flex-wrap:wrap;gap:12px;
background:linear-gradient(135deg,#020a18 0%,#050f1e 55%,#030810 100%);
border:1px solid #0b1a2a;border-radius:18px;padding:20px 28px;margin-bottom:14px;}
.hf-logo{font-size:clamp(1.5rem,3vw,2.4rem);font-weight:900;color:#b8d8f8;
letter-spacing:-.03em;margin:0;}
.hf-sub{color:#162432;font-size:.83rem;margin-top:3px;}
.hf-links{display:flex;gap:8px;flex-wrap:wrap;align-items:center;}
.hf-a{padding:6px 14px;border-radius:8px;border:1px solid #0b2030;background:#050e1a;
color:#2e6888;font-size:.78rem;font-weight:600;text-decoration:none;
transition:all .15s;display:inline-block;}
.hf-a:hover{border-color:#164860;color:#5ab4d4;background:#08162a;}

/* ── Live dot ──────────────────────────────────────── */
@keyframes blink{0%,100%{opacity:1;}50%{opacity:.3;}}
.live-dot{display:inline-block;width:7px;height:7px;border-radius:50%;
background:#00CED1;margin-right:5px;animation:blink 1.8s ease-in-out infinite;
vertical-align:middle;}

/* ── Hope gauge pulse bar ──────────────────────────── */
@keyframes hopeGlow{0%,100%{opacity:.25;}50%{opacity:1;}}
.hope-bar{height:3px;border-radius:2px;
background:linear-gradient(90deg,#00CED1,#00FFFF88,#00CED1);
animation:hopeGlow 2.4s ease-in-out infinite;margin-bottom:6px;}

/* ── Event detail card ─────────────────────────────── */
.ev-card{background:#050e1a;border:1px solid #0b1a2a;border-radius:14px;
padding:16px 20px;margin-top:6px;}
.ev-doom {border-left:4px solid #DC143C;}
.ev-bloom{border-left:4px solid #00CED1;}
.ev-tag  {font-size:.7rem;font-weight:700;letter-spacing:.06em;
text-transform:uppercase;margin-bottom:6px;}
.ev-body {color:#b8d0e8;font-size:.95rem;margin-bottom:5px;}
.ev-meta {color:#1e3a52;font-size:.82rem;line-height:1.9;}

/* ── Section label ─────────────────────────────────── */
.sec-lbl{color:#162a3c;font-size:.72rem;font-weight:700;
text-transform:uppercase;letter-spacing:.05em;margin-bottom:5px;}

/* ── Footer ────────────────────────────────────────── */
.hf-footer{color:#0e1e2c;font-size:.72rem;text-align:center;
margin-top:20px;padding-top:12px;border-top:1px solid #050e1a;}
.hf-footer a{color:#162840;}

/* ── Sidebar overrides ─────────────────────────────── */
div[data-testid="stCheckbox"] span{color:#2a5070 !important;}
div[data-testid="stSelectbox"] label{color:#2a5070 !important;}
[data-baseweb="select"]{background:#06101c !important;border-color:#0b1a2a !important;}
[data-baseweb="select"] *{color:#3a6282 !important;}
[data-testid="stSlider"] [data-baseweb="slider"] div{background:#163048 !important;}
</style>
""", unsafe_allow_html=True)


# ─── Constants ────────────────────────────────────────────────────────────────
DOOM_FILL   = "#DC143C"   # crimson marker fill
DOOM_LINE   = "#8B0000"   # dark red marker border
BLOOM_FILL  = "#00CED1"   # dark turquoise marker fill
BLOOM_LINE  = "#00FFFF"   # cyan marker border

MAX_MARKERS   = 2_000   # Folium rendering cap (1 k per layer)
MAX_POINTS    = 5_000   # total GDELT sample cap
CACHE_TTL     = 900     # 15-min cache matches GDELT update cadence
ROWS_PER_FILE = 1_200
N_FILES       = 10
MAP_HEIGHT    = 560

GDELT_BASE       = "http://data.gdeltproject.org/gdeltv2/"
GDELT_LASTUPDATE = f"{GDELT_BASE}lastupdate.txt"

QUAD_LABELS: dict[int, str] = {
    1: "Verbal Cooperation",
    2: "Material Cooperation",
    3: "Verbal Conflict",
    4: "Material Conflict",
}

# Region quick-nav: name → (lat, lon, zoom)
REGIONS: dict[str, tuple[float, float, int]] = {
    "🌍 Middle East (Default)": (32.0,  40.0, 5),
    "🌐 Global":                (20.0,  10.0, 2),
    "🇪🇺 Europe":              (54.0,  15.0, 4),
    "🌏 East Asia":             (35.0, 115.0, 4),
    "🌏 South Asia":            (22.0,  80.0, 4),
    "🌎 Americas":              (20.0, -80.0, 3),
    "🌍 Africa":                 (5.0,  25.0, 3),
}


# ─── GDELT v2 event export schema ─────────────────────────────────────────────
# 61 tab-separated columns; no header row in the raw CSV files.
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


# ─── Data layer ───────────────────────────────────────────────────────────────

def _gdelt_urls(days: int) -> list[str]:
    """
    Generate N_FILES GDELT v2 noon-UTC snapshot URLs evenly spread across `days`.
    Samples one file per step — keeps total download < 20 MB.
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
                    f, sep="\t", header=None, names=GDELT_COLS,
                    nrows=ROWS_PER_FILE, on_bad_lines="skip",
                    low_memory=False, dtype=str,
                )
    except Exception:
        return None


def _fallback_fetch() -> pd.DataFrame | None:
    """Emergency fallback: parse lastupdate.txt for the most-recent GDELT file."""
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
    """
    Fetch N_FILES GDELT v2 snapshots across `days` in parallel.
    Falls back to the latest single snapshot on failure.
    """
    urls = _gdelt_urls(days)
    dfs: list[pd.DataFrame] = []

    with ThreadPoolExecutor(max_workers=5) as pool:
        futures = {pool.submit(_fetch_one, u): u for u in urls}
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
    Tag each event as 'doom' or 'bloom' by GoldsteinScale.
    Adds `marker_r` (4–14 px) scaled by |GoldsteinScale| for Folium rendering.
    """
    if df.empty:
        return df

    for col in ("GoldsteinScale", "QuadClass", "NumMentions", "ActionGeo_Lat", "ActionGeo_Long"):
        df[col] = pd.to_numeric(df[col], errors="coerce")

    df = df.dropna(subset=["ActionGeo_Lat", "ActionGeo_Long"])
    df = df[
        df["ActionGeo_Lat"].between(-90, 90) &
        df["ActionGeo_Long"].between(-180, 180)
    ].copy()

    if df.empty:
        return df

    # Vectorised classification (no .apply() loop)
    df["category"] = "doom"
    df.loc[df["GoldsteinScale"] > 0, "category"] = "bloom"
    no_gs = df["GoldsteinScale"].isna()
    df.loc[no_gs & df["QuadClass"].isin([1.0, 2.0]), "category"] = "bloom"

    df["Actor1Name"] = df["Actor1Name"].fillna("Unknown").str.strip().str.title()
    df["Actor2Name"] = df["Actor2Name"].fillna("Unknown").str.strip().str.title()
    df["quad_label"] = df["QuadClass"].map(QUAD_LABELS).fillna("Unknown Event")
    df["NumMentions"] = df["NumMentions"].fillna(1).clip(lower=1).astype(int)

    # Folium marker radius: 4–14 px proportional to |GoldsteinScale|
    gs_abs = df["GoldsteinScale"].abs().fillna(1.0)
    gs_p95 = float(gs_abs.quantile(0.95)) or 1.0
    df["marker_r"] = (gs_abs.clip(upper=gs_p95) / gs_p95 * 10.0 + 4.0).round(1)

    return df.reset_index(drop=True)


# ─── UI components ────────────────────────────────────────────────────────────

def render_navbar() -> None:
    """Top navbar: logo, live indicator, GDELT + GitHub links."""
    st.markdown(
        """<div class="hf-nav">
          <div>
            <div class="hf-logo">🌍 HopeForge</div>
            <div class="hf-sub">
              <span class="live-dot"></span>LIVE
              &nbsp;·&nbsp; Doom vs. Bloom — Real-time global conflict tracker
              &nbsp;·&nbsp; Powered by GDELT · updates every 15 min
            </div>
          </div>
          <div class="hf-links">
            <a class="hf-a" href="https://www.gdeltproject.org" target="_blank">📡 GDELT Data</a>
            <a class="hf-a" href="https://github.com/sourrrish/hopeforge" target="_blank">⭐ GitHub</a>
          </div>
        </div>""",
        unsafe_allow_html=True,
    )


def build_folium_map(
    df: pd.DataFrame,
    show_doom: bool,
    show_bloom: bool,
    center: tuple[float, float, int],
    map_key: str,
) -> dict:
    """
    Build a Folium CartoDB Dark Matter map with two CircleMarker layers.
    Doom = deep red (#DC143C), Bloom = cyan (#00CED1).
    Marker radius ∝ |GoldsteinScale| (4–14 px).
    Returns the st_folium result dict for click-event handling.
    """
    lat, lon, zoom = center

    m = folium.Map(
        location=[lat, lon],
        zoom_start=zoom,
        tiles="CartoDB dark_matter",
        prefer_canvas=True,   # GPU canvas — faster for many markers
        control_scale=True,
    )

    doom_group  = folium.FeatureGroup(name="💀 Doom",  show=show_doom)
    bloom_group = folium.FeatureGroup(name="🌱 Bloom", show=show_bloom)

    # Prioritise high-media-coverage events within the marker cap
    half     = MAX_MARKERS // 2
    doom_df  = (df[df["category"] == "doom" ].nlargest(half, "NumMentions")
                if show_doom  else pd.DataFrame())
    bloom_df = (df[df["category"] == "bloom"].nlargest(half, "NumMentions")
                if show_bloom else pd.DataFrame())

    for frame, group, fill_c, line_c in [
        (doom_df,  doom_group,  DOOM_FILL,  DOOM_LINE),
        (bloom_df, bloom_group, BLOOM_FILL, BLOOM_LINE),
    ]:
        for t in frame.itertuples(index=False):
            ql   = _html.escape(str(getattr(t, "quad_label",        "Event")))
            a1   = _html.escape(str(getattr(t, "Actor1Name",         "—")))
            a2   = _html.escape(str(getattr(t, "Actor2Name",         "—")))
            loc  = _html.escape(str(getattr(t, "ActionGeo_FullName", "Unknown"))[:52])
            r    = float(getattr(t, "marker_r", 5.0))
            lat_ = float(getattr(t, "ActionGeo_Lat",  0))
            lon_ = float(getattr(t, "ActionGeo_Long", 0))

            try:
                gs_str = f"{float(getattr(t, 'GoldsteinScale', 0) or 0):+.1f}"
            except (TypeError, ValueError):
                gs_str = "n/a"

            tip = folium.Tooltip(
                f"<div style='font:12px/1.6 system-ui,sans-serif;"
                f"padding:5px 3px;min-width:190px;'>"
                f"<b style='color:{fill_c};'>{ql}</b><br>"
                f"<span style='color:#c0d8f0;'>{a1}"
                f" <span style='color:#1e3448;'>→</span> {a2}</span><br>"
                f"<span style='color:#2a4a64;'>📍 {loc}</span><br>"
                f"<span style='color:#162a3c;'>GS {gs_str}</span>"
                f"</div>",
                sticky=False,
            )

            folium.CircleMarker(
                location=[lat_, lon_],
                radius=r,
                color=line_c,
                fill=True,
                fill_color=fill_c,
                fill_opacity=0.78,
                weight=1.5,
                tooltip=tip,
            ).add_to(group)

    doom_group.add_to(m)
    bloom_group.add_to(m)
    folium.LayerControl(collapsed=True, position="topright").add_to(m)

    return st_folium(m, key=map_key, height=MAP_HEIGHT, use_container_width=True)


def get_selected_event(map_data: dict | None, df: pd.DataFrame) -> dict | None:
    """
    Resolve the last-clicked marker to a df row via nearest lat/lon distance.
    Persisted in session_state so it survives sidebar-triggered re-runs.
    """
    if map_data:
        clicked = map_data.get("last_object_clicked")
        if isinstance(clicked, dict):
            clat = clicked.get("lat")
            clon = clicked.get("lng")
            if clat is not None and clon is not None:
                dists = (df["ActionGeo_Lat"] - clat) ** 2 + (df["ActionGeo_Long"] - clon) ** 2
                row   = df.loc[dists.idxmin()].to_dict()
                st.session_state["_hf_ev"] = row

    return st.session_state.get("_hf_ev")


def build_hope_gauge(df: pd.DataFrame) -> tuple[go.Figure, float, float]:
    """
    Plotly gauge showing Hope Score (% Bloom events).
    Returns (figure, hope_pct, avg_goldstein).
    """
    if df.empty:
        return go.Figure(), 50.0, 0.0

    bloom_n  = int((df["category"] == "bloom").sum())
    hope_pct = round(bloom_n / len(df) * 100, 1)
    avg_gs   = round(float(df["GoldsteinScale"].dropna().mean()), 2)

    bar_col = (
        BLOOM_FILL if hope_pct >= 55
        else "#d4a017" if hope_pct >= 38
        else DOOM_FILL
    )

    fig = go.Figure(go.Indicator(
        mode="gauge+number",
        value=hope_pct,
        number={"suffix": "%", "font": {"size": 38, "color": "#b8d0f0"}},
        title={"text": "Hope Score", "font": {"size": 13, "color": "#1e3a52"}},
        gauge={
            "axis": {
                "range": [0, 100], "dtick": 25,
                "tickcolor": "#0b1828",
                "tickfont": {"color": "#162a3c", "size": 9},
            },
            "bar": {"color": bar_col, "thickness": 0.22},
            "bgcolor": "#030b18",
            "borderwidth": 1, "bordercolor": "#0b1828",
            "steps": [
                {"range": [0,  38], "color": "rgba(220,20,60,.09)"},
                {"range": [38, 55], "color": "rgba(212,160,23,.09)"},
                {"range": [55,100], "color": "rgba(0,206,209,.09)"},
            ],
            "threshold": {
                "line": {"color": bar_col, "width": 3},
                "thickness": 0.85, "value": hope_pct,
            },
        },
    ))
    fig.update_layout(
        height=210,
        margin=dict(l=14, r=14, t=26, b=4),
        paper_bgcolor="rgba(0,0,0,0)",
        plot_bgcolor="rgba(0,0,0,0)",
    )
    return fig, hope_pct, avg_gs


def render_event_card(event: dict | None) -> None:
    """
    Right-side event detail card.
    Shows actor names, location, date, Goldstein score, source link,
    and a disabled AI-analysis button (placeholder for future integration).
    """
    if event is None:
        st.markdown(
            "<div class='ev-card' style='text-align:center;color:#162a3c;padding:22px 16px;'>"
            "👆 Click any marker on the map to inspect the event"
            "</div>",
            unsafe_allow_html=True,
        )
        return

    gs_raw = event.get("GoldsteinScale")
    try:
        gs = float(gs_raw)
    except (TypeError, ValueError):
        gs = None

    is_bloom = gs is not None and gs > 0
    fill_c   = BLOOM_FILL if is_bloom else DOOM_FILL
    card_cls = "ev-bloom" if is_bloom else "ev-doom"
    icon     = "🌱" if is_bloom else "💀"

    ql       = _html.escape(str(event.get("quad_label",        "Event")))
    a1       = _html.escape(str(event.get("Actor1Name",         "—")))
    a2       = _html.escape(str(event.get("Actor2Name",         "—")))
    loc      = _html.escape(str(event.get("ActionGeo_FullName", "Unknown location")))
    mentions = event.get("NumMentions", "—")
    gs_str   = f"{gs:+.1f}" if gs is not None else "N/A"

    raw_date = event.get("SQLDATE", "")
    try:
        fmt_date = datetime.datetime.strptime(
            str(int(float(raw_date))), "%Y%m%d"
        ).strftime("%b %d, %Y")
    except Exception:
        fmt_date = str(raw_date)

    st.markdown(
        f"""<div class="ev-card {card_cls}">
          <div class="ev-tag" style="color:{fill_c};">{icon} {ql}</div>
          <div class="ev-body">
            <b>{a1}</b>
            <span style="color:#162030;"> → </span>
            <b>{a2}</b>
          </div>
          <div class="ev-meta">
            📍 {loc}<br>
            📅 {fmt_date}<br>
            Goldstein: <b style="color:{fill_c};">{gs_str}</b>
            &ensp;·&ensp; Mentions: <b>{mentions}</b>
          </div>
        </div>""",
        unsafe_allow_html=True,
    )

    src = event.get("SOURCEURL", "")
    if isinstance(src, str) and src.startswith("http"):
        st.link_button("📰 Read Source Article", src, use_container_width=True)

    # AI analysis placeholder — wired to Anthropic SDK in a future PR
    st.button("🤖 AI Analysis  (coming soon)", disabled=True, use_container_width=True)


# ─── Main ─────────────────────────────────────────────────────────────────────

def main() -> None:

    # ── Sidebar ──────────────────────────────────────────────────────────────
    with st.sidebar:
        st.markdown(
            "<div style='color:#1a3a52;font-size:.72rem;font-weight:700;"
            "text-transform:uppercase;letter-spacing:.06em;margin-bottom:10px;'>"
            "⚙️ Controls</div>",
            unsafe_allow_html=True,
        )

        # ── Time window ───────────────────────────────────────────────────────
        st.markdown(
            "<div style='color:#162c42;font-size:.7rem;margin-bottom:3px;'>"
            "⏱ TIME WINDOW</div>",
            unsafe_allow_html=True,
        )
        days = st.select_slider(
            "time_window",
            options=[7, 30, 180],
            value=st.session_state.get("days", 7),
            format_func=lambda x: f"Last {x} days",
            label_visibility="collapsed",
            help=f"Samples {N_FILES} GDELT snapshots evenly across the window.",
        )
        st.session_state["days"] = days

        st.markdown("<div style='height:8px;'></div>", unsafe_allow_html=True)

        # ── Region focus ──────────────────────────────────────────────────────
        st.markdown(
            "<div style='color:#162c42;font-size:.7rem;margin-bottom:3px;'>"
            "🗺️ REGION FOCUS</div>",
            unsafe_allow_html=True,
        )
        region_name = st.selectbox(
            "Region",
            options=list(REGIONS.keys()),
            index=0,
            label_visibility="collapsed",
        )
        center = REGIONS[region_name]

        st.markdown(
            "<hr style='border:none;border-top:1px solid #0b1a28;margin:10px 0;'>",
            unsafe_allow_html=True,
        )

        # ── Layer toggles ─────────────────────────────────────────────────────
        st.markdown(
            "<div style='color:#162c42;font-size:.7rem;margin-bottom:5px;'>"
            "🔘 EVENT LAYERS</div>",
            unsafe_allow_html=True,
        )
        show_doom  = st.checkbox("💀 Doom  (conflict · tension)", value=True)
        show_bloom = st.checkbox("🌱 Bloom (cooperation · aid)",  value=True)

        st.markdown(
            "<hr style='border:none;border-top:1px solid #0b1a28;margin:10px 0;'>",
            unsafe_allow_html=True,
        )

        # ── Legend ────────────────────────────────────────────────────────────
        st.markdown(
            "<div style='background:#040c18;border:1px solid #0a1826;border-radius:10px;"
            "padding:10px 13px;'>"
            "<div style='color:#162840;font-size:.68rem;font-weight:700;text-transform:uppercase;"
            "letter-spacing:.05em;margin-bottom:7px;'>Map Legend</div>"
            "<div style='font-size:.78rem;line-height:2.2;color:#1e3a52;'>"
            "<span style='display:inline-block;width:9px;height:9px;border-radius:50%;"
            "background:#DC143C;margin-right:6px;vertical-align:middle;'></span>"
            "Doom — GoldsteinScale ≤ 0<br>"
            "<span style='display:inline-block;width:9px;height:9px;border-radius:50%;"
            "background:#00CED1;margin-right:6px;vertical-align:middle;'></span>"
            "Bloom — GoldsteinScale > 0<br>"
            "<span style='color:#0e1e2c;font-size:.68rem;'>Marker size ∝ |Goldstein|</span>"
            "</div></div>",
            unsafe_allow_html=True,
        )

        st.markdown("<div style='height:12px;'></div>", unsafe_allow_html=True)

        if st.button("🔄 Refresh Data", use_container_width=True, type="primary"):
            st.cache_data.clear()
            st.session_state.pop("confetti_shown", None)
            st.session_state.pop("_hf_ev", None)
            st.session_state.pop("_hf_map_key", None)
            st.rerun()

        st.caption(
            f"Cache {CACHE_TTL // 60} min &nbsp;·&nbsp; "
            f"[GDELT Project](https://www.gdeltproject.org)"
        )

    # ── Fetch + classify data ─────────────────────────────────────────────────
    with st.spinner("🌐 Fetching global events from GDELT…"):
        raw_df = fetch_gdelt_data(days)

    if raw_df.empty:
        st.error(
            "⚠️ Could not retrieve GDELT data. The server may be temporarily unavailable. "
            "Try refreshing, or visit [gdeltproject.org](https://www.gdeltproject.org)."
        )
        if st.button("↩️ Retry"):
            st.cache_data.clear()
            st.rerun()
        return

    df = classify_events(raw_df)

    if df.empty:
        st.warning("Data loaded but no events with valid coordinates. Try a wider time window.")
        return

    doom_n   = int((df["category"] == "doom").sum())
    bloom_n  = int((df["category"] == "bloom").sum())
    hope_pct = round(bloom_n / len(df) * 100, 1)

    # 🎉 Balloons on unusually hopeful periods (once per session)
    if hope_pct > 62 and "confetti_shown" not in st.session_state:
        st.balloons()
        st.session_state["confetti_shown"] = True

    # Reset event selection when region or time window changes
    current_ctx = f"{region_name}|{days}"
    if st.session_state.get("_hf_map_key") != current_ctx:
        st.session_state.pop("_hf_ev", None)
        st.session_state["_hf_map_key"] = current_ctx

    # ── Navbar ────────────────────────────────────────────────────────────────
    render_navbar()

    # ── Stats strip ───────────────────────────────────────────────────────────
    c1, c2, c3, c4 = st.columns(4)
    c1.metric("📊 Events",  f"{len(df):,}")
    c2.metric("💀 Doom",    f"{doom_n:,}")
    c3.metric("🌱 Bloom",   f"{bloom_n:,}")
    c4.metric("🌡️ Hope",   f"{hope_pct}%")

    st.markdown("<div style='height:8px;'></div>", unsafe_allow_html=True)

    # ── Map (3 parts) + right panel (2 parts) ────────────────────────────────
    map_col, right_col = st.columns([3, 2], gap="medium")

    with map_col:
        st.markdown(
            f"<div class='sec-lbl'>🗺️ Live Event Map"
            f" <span style='color:#0e1e2c;'>— top {MAX_MARKERS:,} events by media coverage</span>"
            f"</div>",
            unsafe_allow_html=True,
        )
        map_key  = f"hf_{region_name}_{days}"
        map_data = build_folium_map(df, show_doom, show_bloom, center, map_key)
        selected = get_selected_event(map_data, df)

    with right_col:
        # ── Hope Gauge ────────────────────────────────────────────────────────
        st.markdown("<div class='sec-lbl'>🌡️ Hope Pulse</div>", unsafe_allow_html=True)

        if hope_pct > 55:
            # Animated cyan pulse bar — signals an unusually hopeful period
            st.markdown("<div class='hope-bar'></div>", unsafe_allow_html=True)

        fig, _, avg_gs = build_hope_gauge(df)
        st.plotly_chart(fig, use_container_width=True)

        gs_color = BLOOM_FILL if avg_gs >= 0 else DOOM_FILL
        st.markdown(
            f"<div style='text-align:center;padding:8px 12px;background:#040c18;"
            f"border-radius:10px;border:1px solid #0a1826;"
            f"margin-top:-12px;margin-bottom:14px;'>"
            f"<div style='color:#162840;font-size:.7rem;'>Avg Goldstein Scale</div>"
            f"<div style='color:{gs_color};font-size:1.4rem;font-weight:800;'>{avg_gs:+.2f}</div>"
            f"<div style='color:#0c1826;font-size:.66rem;'>–10 full war → +10 full peace</div>"
            f"</div>",
            unsafe_allow_html=True,
        )

        # ── Event Details ─────────────────────────────────────────────────────
        st.markdown("<div class='sec-lbl'>🔍 Event Details</div>", unsafe_allow_html=True)
        render_event_card(selected)

    # ── Footer ────────────────────────────────────────────────────────────────
    st.markdown(
        "<div class='hf-footer'>"
        "Built in one Sunday"
        " &nbsp;·&nbsp; Streamlit · Folium · Plotly · GDELT"
        " &nbsp;·&nbsp; "
        "<a href='https://github.com/sourrrish/hopeforge' target='_blank'>GitHub ↗</a>"
        " &nbsp;·&nbsp; Events represent media coverage, not verified ground truth"
        "</div>",
        unsafe_allow_html=True,
    )


if __name__ == "__main__":
    main()
