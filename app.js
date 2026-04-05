// HopeIndexAI — React app (JSX, transpiled by Babel standalone)
// Data: GDELT Project  |  Map: Leaflet  |  Font: Geist

const { useState, useEffect, useRef, useMemo, useCallback } = React;

// ── Constants ─────────────────────────────────────────────────────────────────

const DOOM_COLORS = {
  low:      "#FF8C5A",
  medium:   "#E0421A",
  high:     "#B81A1A",
  critical: "#7C0A1A",
};
const DOOM_STROKE  = "#DC143C";
const BLOOM_FILL   = "#06B6D4";
const BLOOM_STROKE = "#00C8E8";

// CartoDB light tiles — forced white theme, noWrap prevents world repetition
const TILE_LIGHT = "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png";
const TILE_ATTR  = '© <a href="https://osm.org">OSM</a> © <a href="https://carto.com">CARTO</a>';

// Hard world bounds — no panning past the edge of the earth
const WORLD_BOUNDS = L.latLngBounds(L.latLng(-85, -220), L.latLng(85, 220));

const CONTINENTS  = ["All", "Americas", "Europe", "Middle East", "Africa", "Asia", "Oceania"];
const SEVERITIES  = ["All", "Low", "Medium", "High", "Critical"];
const DAY_OPTIONS = [1, 3, 7, 30];

const GITHUB_URL = "https://github.com/sourrrish/hopeindexai";

// ── Icons ─────────────────────────────────────────────────────────────────────

function IconGithub() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z" />
    </svg>
  );
}

function IconChevron({ open }) {
  return (
    <svg
      width="13" height="13" viewBox="0 0 24 24"
      fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
      style={{ transform: open ? "rotate(0deg)" : "rotate(180deg)", transition: "transform 0.2s" }}
      aria-hidden="true"
    >
      <polyline points="18 15 12 9 6 15" />
    </svg>
  );
}

function IconExternalLink() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
      <polyline points="15 3 21 3 21 9" />
      <line x1="10" y1="14" x2="21" y2="3" />
    </svg>
  );
}

// ── Top bar ───────────────────────────────────────────────────────────────────

function TopBar({ doomCount, bloomCount }) {
  const total = doomCount + bloomCount;
  return (
    <header className="topbar" role="banner">
      <span className="topbar-brand">
        HopeIndex<span className="brand-suffix">AI</span>
      </span>

      <div className="topbar-center">
        <div className="live-badge" role="status" aria-label="Live data feed">
          <span className="live-dot" aria-hidden="true" />
          LIVE
        </div>
        {total > 0 && (
          <div className="topbar-stats">
            <span className="stat-pill doom">
              <span className="stat-dot doom" aria-hidden="true" />
              {doomCount.toLocaleString()} conflict
            </span>
            <span className="stat-pill bloom">
              <span className="stat-dot bloom" aria-hidden="true" />
              {bloomCount.toLocaleString()} coop.
            </span>
          </div>
        )}
      </div>

      <div className="topbar-right">
        <a
          href={GITHUB_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="gh-btn"
          aria-label="View HopeIndexAI on GitHub"
        >
          <IconGithub />
          HopeIndexAI
        </a>
      </div>
    </header>
  );
}

// ── Leaflet map ───────────────────────────────────────────────────────────────

// Creates a DivIcon for each event.
// pulse=true only for the top 5 doom events — keeps the page snappy.
function makeMarkerIcon(ev, pulse = false) {
  const isDoom  = ev.category === "doom";
  const r       = ev.markerRadius;
  const size    = r * 2;
  const fill    = isDoom ? (DOOM_COLORS[ev.severity] ?? DOOM_COLORS.medium) : BLOOM_FILL;
  const stroke  = isDoom ? DOOM_STROKE : BLOOM_STROKE;
  const isPulse = pulse;
  const opacity = ev.severity === "low" ? 0.55 : ev.severity === "medium" ? 0.70 : 0.88;
  const pad     = isPulse ? 8 : 0;
  const total   = size + pad * 2;

  const ringHtml = isPulse
    ? `<div class="dm-ring ${ev.category}" style="
         position:absolute;
         top:${pad}px;left:${pad}px;
         width:${size}px;height:${size}px;
       "></div>`
    : "";

  const html = `
    <div style="position:relative;width:${total}px;height:${total}px;">
      ${ringHtml}
      <div class="dm-core" style="
        position:absolute;
        top:${pad}px;left:${pad}px;
        width:${size}px;height:${size}px;
        background:${fill};
        border:1.5px solid ${stroke};
        opacity:${opacity};
      "></div>
    </div>
  `;

  return L.marker([ev.lat, ev.lon], {
    icon: L.divIcon({
      html,
      className:  "dm-icon",
      iconSize:   [total, total],
      iconAnchor: [total / 2, total / 2],
    }),
    zIndexOffset: ev.severity === "critical" ? 800
                : ev.severity === "high"     ? 600
                : isDoom                     ? 400 : 200,
  });
}

function MapView({ events, selectedEvent, onSelectEvent }) {
  const containerRef = useRef(null);
  const mapRef       = useRef(null);
  const tileRef      = useRef(null);
  const layerRef     = useRef(null);

  // Init map once
  useEffect(() => {
    if (mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: [22, 12],
      zoom: 2,
      minZoom: 2,            // can't zoom out past one world
      maxZoom: 14,
      maxBounds: WORLD_BOUNDS,
      maxBoundsViscosity: 1.0,
      zoomControl: false,
      attributionControl: true,
    });

    L.control.zoom({ position: "bottomright" }).addTo(map);

    const addTile = () => {
      if (tileRef.current) map.removeLayer(tileRef.current);
      tileRef.current = L.tileLayer(TILE_LIGHT, {
        attribution: TILE_ATTR,
        subdomains: "abcd",
        maxZoom: 19,
        noWrap: true,        // prevents world-tile repetition
      }).addTo(map);
    };
    addTile();

    layerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Pan to selected event
  useEffect(() => {
    if (!selectedEvent || !mapRef.current) return;
    mapRef.current.setView(
      [selectedEvent.lat, selectedEvent.lon],
      Math.max(mapRef.current.getZoom(), 6),
      { animate: true, duration: 0.6 }
    );
  }, [selectedEvent]);

  // Redraw markers when events change
  useEffect(() => {
    if (!layerRef.current) return;
    layerRef.current.clearLayers();

    // Pulse only the 5 highest-severity doom events — keeps rendering fast
    const topDoomIds = new Set(
      events
        .filter((e) => e.category === "doom")
        .sort((a, b) => b.markerRadius - a.markerRadius)
        .slice(0, 5)
        .map((e) => e.id)
    );

    for (const ev of events) {
      const marker = makeMarkerIcon(ev, topDoomIds.has(ev.id));

      const actorLine = ev.actor1 !== "Unknown"
        ? `${ev.actor1}${ev.actor2 !== "Unknown" ? " → " + ev.actor2 : ""}`
        : ev.quadLabel;

      marker.bindTooltip(
        `<strong>${actorLine}</strong><br/>${ev.location || ev.country}`,
        { sticky: true, direction: "top" }
      );

      marker.on("click", () => onSelectEvent(ev));
      layerRef.current.addLayer(marker);
    }
  }, [events, onSelectEvent]);

  return <div ref={containerRef} id="map" aria-label="Geopolitical event map" />;
}

// ── Map legend ────────────────────────────────────────────────────────────────

function MapLegend() {
  return (
    <div className="map-legend" aria-label="Map legend">
      <div className="legend-row">
        <span className="legend-swatch" style={{ background: "#DC143C" }} />
        Conflict
      </div>
      <div className="legend-row">
        <span className="legend-swatch" style={{ background: "#06B6D4" }} />
        Cooperation
      </div>
      <div className="legend-row" style={{ marginTop: 4, color: "var(--text-muted)", fontSize: 9 }}>
        Ring = high / critical
      </div>
    </div>
  );
}

// ── Filter panel ──────────────────────────────────────────────────────────────

function FilterPanel({ filters, onFilter, filteredEvents, selectedEvent, onSelectEvent, loading }) {
  const [open,  setOpen]  = useState(true);
  const [limit, setLimit] = useState(120);

  const visible = useMemo(() => filteredEvents.slice(0, limit), [filteredEvents, limit]);

  const setDays      = (d) => onFilter({ ...filters, days: d });
  const setContinent = (c) => onFilter({ ...filters, continent: c });
  const setSeverity  = (s) => onFilter({ ...filters, severity:  s });

  return (
    <aside className={`filter-panel${open ? "" : " collapsed"}`} aria-label="Event filters">
      <div className="filter-head" onClick={() => setOpen(!open)} aria-expanded={open}>
        <div className="filter-head-left">
          {open && <span className="filter-label">Filters</span>}
          {open && (
            <span className="filter-count-badge" aria-live="polite">
              {loading ? "…" : filteredEvents.length.toLocaleString()}
            </span>
          )}
        </div>
        <button className="filter-toggle-btn" aria-label={open ? "Collapse" : "Expand"}>
          <IconChevron open={open} />
        </button>
      </div>

      <div className="filter-body">
        <div className="filter-group">
          <div className="filter-group-label">Range</div>
          <div className="chip-row">
            {DAY_OPTIONS.map((d) => (
              <button
                key={d}
                className={`chip${filters.days === d ? " on" : ""}`}
                onClick={() => setDays(d)}
                aria-pressed={filters.days === d}
              >{d}d</button>
            ))}
          </div>
        </div>

        <div className="filter-group">
          <div className="filter-group-label">Region</div>
          <div className="chip-row">
            {CONTINENTS.map((c) => (
              <button
                key={c}
                className={`chip${filters.continent === c ? " on" : ""}`}
                onClick={() => setContinent(c)}
                aria-pressed={filters.continent === c}
              >{c}</button>
            ))}
          </div>
        </div>

        <div className="filter-group">
          <div className="filter-group-label">Severity</div>
          <div className="chip-row">
            {SEVERITIES.map((s) => (
              <button
                key={s}
                className={`chip${filters.severity === s ? " on" : ""}`}
                onClick={() => setSeverity(s)}
                aria-pressed={filters.severity === s}
              >{s}</button>
            ))}
          </div>
        </div>

        {filteredEvents.length > 0 && (
          <>
            <div className="elist-header" aria-live="polite">
              {Math.min(limit, filteredEvents.length)} of {filteredEvents.length.toLocaleString()}
            </div>
            <div className="elist" role="list">
              {visible.map((ev) => (
                <EventRow
                  key={ev.id}
                  event={ev}
                  selected={selectedEvent?.id === ev.id}
                  onClick={() => onSelectEvent(ev)}
                />
              ))}
            </div>
            {filteredEvents.length > limit && (
              <button className="load-more" onClick={() => setLimit((l) => l + 120)}>
                + {(filteredEvents.length - limit).toLocaleString()} more
              </button>
            )}
          </>
        )}
      </div>
    </aside>
  );
}

function EventRow({ event, selected, onClick }) {
  const title = event.actor1 !== "Unknown"
    ? `${event.actor1}${event.actor2 !== "Unknown" ? " → " + event.actor2 : ""}`
    : event.quadLabel;

  return (
    <div
      className={`erow${selected ? " sel" : ""}`}
      onClick={onClick}
      role="listitem"
      tabIndex={0}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onClick()}
      aria-selected={selected}
    >
      <span className={`edot ${event.category}`} aria-hidden="true" />
      <div className="erow-body">
        <div className="erow-title" title={title}>{title}</div>
        <div className="erow-meta">{event.location || event.country} · {event.date}</div>
      </div>
      <span className={`sev-badge sev-${event.severity}`}>{event.severity}</span>
    </div>
  );
}

// ── Event detail ──────────────────────────────────────────────────────────────

function EventDetail({ event, onClose }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const goldsteinPct = event.goldstein !== null
    ? ((event.goldstein + 10) / 20) * 100 : 50;

  const title = event.actor1 !== "Unknown"
    ? `${event.actor1}${event.actor2 !== "Unknown" ? " → " + event.actor2 : ""}`
    : event.quadLabel;

  return (
    <>
      <div className="detail-backdrop" onClick={onClose} aria-hidden="true" />
      <section className="detail-panel" role="dialog" aria-modal="true" aria-label="Event detail">
        <div className={`detail-bar ${event.category}`} />
        <button className="detail-close" onClick={onClose} aria-label="Close">✕</button>

        <div className="detail-body">
          <div className={`detail-cat ${event.category}`}>
            {event.category === "doom" ? "Conflict" : "Cooperation"} · {event.quadLabel}
          </div>
          <h2 className="detail-title">{title}</h2>

          <div className="detail-fields">
            {event.actor1 !== "Unknown" && (
              <div>
                <div className="dfield-label">Actors</div>
                <div className="dfield-val">
                  {event.actor1}{event.actor2 !== "Unknown" && <> → {event.actor2}</>}
                </div>
              </div>
            )}
            <div>
              <div className="dfield-label">Location</div>
              <div className="dfield-val">{event.location || event.country}</div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-muted)", marginTop: 2 }}>
                {event.lat.toFixed(3)}, {event.lon.toFixed(3)}
              </div>
            </div>
            <div>
              <div className="dfield-label">Date</div>
              <div className="dfield-val">{event.date}</div>
            </div>
            <div>
              <div className="dfield-label">
                Goldstein Scale
                <span style={{ color: "var(--text-muted)", fontWeight: 400, marginLeft: 6 }}>
                  {event.goldstein !== null ? event.goldstein.toFixed(1) : "n/a"} / ±10
                </span>
              </div>
              <span className={`sev-badge sev-${event.severity}`} style={{ display: "inline-block", marginBottom: 6 }}>
                {event.severity}
              </span>
              {event.goldstein !== null && (
                <div className="goldstein-track">
                  <div className={`goldstein-fill ${event.category}`} style={{ width: `${goldsteinPct}%` }} />
                </div>
              )}
            </div>
            {event.numMentions > 0 && (
              <div>
                <div className="dfield-label">Coverage</div>
                <div className="dfield-val">{event.numMentions.toLocaleString()} mentions</div>
              </div>
            )}
            {event.avgTone !== null && (
              <div>
                <div className="dfield-label">Average Tone</div>
                <div className="dfield-val" style={{ color: event.avgTone < 0 ? "var(--doom-mid)" : "var(--bloom)" }}>
                  {event.avgTone.toFixed(2)}
                </div>
              </div>
            )}
          </div>

          {event.sourceUrl && (
            <a href={event.sourceUrl} target="_blank" rel="noopener noreferrer" className="detail-link">
              Source Article <IconExternalLink />
            </a>
          )}
        </div>
      </section>
    </>
  );
}

// ── Loading + error ───────────────────────────────────────────────────────────

function LoadingOverlay({ slow }) {
  return (
    <div className="loading-overlay" role="status" aria-live="polite">
      <div className="loading-box">
        <div className="loading-wordmark">
          HopeIndex<span className="wm-suffix">AI</span>
        </div>
        <div className="loading-bar">
          <div className="loading-bar-fill" />
        </div>
        <div className="loading-label">
          {slow ? "GDELT data — almost there" : "Syncing live events"}
        </div>
        {slow && (
          <div className="loading-sub">Up to 10 s per file · cached 15 min</div>
        )}
      </div>
    </div>
  );
}

function ErrorToast({ message, onDismiss }) {
  return (
    <div className="error-toast" role="alert">
      <span style={{ flex: 1 }}>{message}</span>
      <button className="error-dismiss" onClick={onDismiss} aria-label="Dismiss">✕</button>
    </div>
  );
}

// ── Root ──────────────────────────────────────────────────────────────────────

function App() {
  const [events,   setEvents]   = useState([]);
  const [filters,  setFilters]  = useState({ days: 7, continent: "All", severity: "All" });
  const [selected, setSelected] = useState(null);
  const [loading,  setLoading]  = useState(false);
  const [slowLoad, setSlowLoad] = useState(false);
  const [error,    setError]    = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setSlowLoad(false);
    setError("");

    const slowTimer = setTimeout(() => { if (!cancelled) setSlowLoad(true); }, 5_000);

    fetch(`/api/events?days=${filters.days}`)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        if (data.error) throw new Error(data.error);
        setEvents(data.events ?? []);
      })
      .catch((err) => { if (!cancelled) setError(err.message ?? "Failed to load events."); })
      .finally(() => {
        if (!cancelled) { setLoading(false); setSlowLoad(false); }
        clearTimeout(slowTimer);
      });

    return () => { cancelled = true; clearTimeout(slowTimer); };
  }, [filters.days]);

  const filteredEvents = useMemo(() => events.filter((e) => {
    if (filters.continent !== "All" && e.continent !== filters.continent) return false;
    if (filters.severity  !== "All" && e.severity.toLowerCase() !== filters.severity.toLowerCase()) return false;
    return true;
  }), [events, filters.continent, filters.severity]);

  const { doomCount, bloomCount } = useMemo(() => ({
    doomCount:  filteredEvents.filter((e) => e.category === "doom").length,
    bloomCount: filteredEvents.filter((e) => e.category === "bloom").length,
  }), [filteredEvents]);

  const handleSelectEvent = useCallback((ev) => {
    setSelected((prev) => (prev?.id === ev.id ? null : ev));
  }, []);

  const handleFilter = useCallback((next) => {
    setFilters(next);
    setSelected(null);
  }, []);

  return (
    <>
      <TopBar doomCount={doomCount} bloomCount={bloomCount} />

      <main className="app-main">
        <MapView
          events={filteredEvents}
          selectedEvent={selected}
          onSelectEvent={handleSelectEvent}
        />
        <FilterPanel
          filters={filters}
          onFilter={handleFilter}
          filteredEvents={filteredEvents}
          selectedEvent={selected}
          onSelectEvent={handleSelectEvent}
          loading={loading}
        />
        <MapLegend />
        {selected && (
          <EventDetail event={selected} onClose={() => setSelected(null)} />
        )}
      </main>

      {loading && <LoadingOverlay slow={slowLoad} />}
      {error    && <ErrorToast message={error} onDismiss={() => setError("")} />}
    </>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
