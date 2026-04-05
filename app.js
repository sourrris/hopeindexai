// HopeIndexAI — React app (JSX, transpiled by Babel standalone)
// Data: GDELT Project  |  Map: Leaflet  |  Font: Geist

const { useState, useEffect, useRef, useMemo, useCallback } = React;

// ── Constants ─────────────────────────────────────────────────────────────────

const DOOM_COLORS = {
  low:      "#FF6B35",
  medium:   "#E0421A",
  high:     "#B81A1A",
  critical: "#7C0A1A",
};
const DOOM_STROKE  = "#DC143C";
const BLOOM_FILL   = "#06B6D4";
const BLOOM_STROKE = "#00E5FF";

const TILE_DARK  = "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png";
const TILE_LIGHT = "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png";
const TILE_ATTR  = '© <a href="https://osm.org">OpenStreetMap</a> © <a href="https://carto.com">CARTO</a>';

const CONTINENTS = ["All", "Americas", "Europe", "Middle East", "Africa", "Asia", "Oceania"];
const SEVERITIES = ["All", "Low", "Medium", "High", "Critical"];
const DAY_OPTIONS = [1, 3, 7, 30];

const GITHUB_URL = "https://github.com/sourrrish/hopeindexai";

// ── Icons (SVG inline) ────────────────────────────────────────────────────────

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

function TopBar({ eventCount }) {
  return (
    <header className="topbar" role="banner">
      <span className="topbar-brand">HopeIndexAI</span>

      <div className="topbar-center">
        <div className="live-badge" role="status" aria-label="Live data">
          <span className="live-dot" aria-hidden="true" />
          LIVE
        </div>
        {eventCount > 0 && (
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-muted)" }}>
            {eventCount.toLocaleString()} events
          </span>
        )}
      </div>

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
    </header>
  );
}

// ── Leaflet map ───────────────────────────────────────────────────────────────

function MapView({ events, selectedEvent, onSelectEvent }) {
  const containerRef = useRef(null);
  const mapRef       = useRef(null);
  const tileRef      = useRef(null);
  const layerRef     = useRef(null);

  // Init map once
  useEffect(() => {
    if (mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: [20, 10],
      zoom: 2,
      zoomControl: false,
      attributionControl: true,
    });

    L.control.zoom({ position: "bottomright" }).addTo(map);

    const addTile = (dark) => {
      if (tileRef.current) map.removeLayer(tileRef.current);
      tileRef.current = L.tileLayer(dark ? TILE_DARK : TILE_LIGHT, {
        attribution: TILE_ATTR,
        subdomains: "abcd",
        maxZoom: 19,
      }).addTo(map);
    };

    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    addTile(mq.matches);
    mq.addEventListener("change", (e) => addTile(e.matches));

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
    mapRef.current.setView([selectedEvent.lat, selectedEvent.lon], Math.max(mapRef.current.getZoom(), 6), {
      animate: true,
      duration: 0.6,
    });
  }, [selectedEvent]);

  // Redraw markers when events change
  useEffect(() => {
    if (!layerRef.current) return;
    layerRef.current.clearLayers();

    for (const ev of events) {
      const isDoom  = ev.category === "doom";
      const fill    = isDoom ? (DOOM_COLORS[ev.severity] ?? DOOM_COLORS.medium) : BLOOM_FILL;
      const stroke  = isDoom ? DOOM_STROKE : BLOOM_STROKE;
      const opacity = ev.severity === "low" ? 0.55 : ev.severity === "medium" ? 0.68 : 0.82;

      const marker = L.circleMarker([ev.lat, ev.lon], {
        radius:      ev.markerRadius,
        fillColor:   fill,
        color:       stroke,
        weight:      1,
        opacity:     0.9,
        fillOpacity: opacity,
      });

      const tip = ev.actor1 !== "Unknown"
        ? `${ev.actor1}${ev.actor2 !== "Unknown" ? " → " + ev.actor2 : ""}`
        : ev.quadLabel;

      marker.bindTooltip(`<span style="font-family:var(--font-mono);font-size:11px">${tip}<br/><span style="color:#888">${ev.location || ev.country}</span></span>`, {
        sticky: true,
        className: "leaflet-tooltip-plain",
      });

      marker.on("click", () => onSelectEvent(ev));
      layerRef.current.addLayer(marker);
    }
  }, [events, onSelectEvent]);

  return <div ref={containerRef} id="map" aria-label="Geopolitical event map" />;
}

// ── Filter panel ──────────────────────────────────────────────────────────────

function FilterPanel({ filters, onFilter, filteredEvents, selectedEvent, onSelectEvent, loading }) {
  const [open, setOpen]    = useState(true);
  const [limit, setLimit]  = useState(120);

  const visibleEvents = useMemo(() => filteredEvents.slice(0, limit), [filteredEvents, limit]);

  function setDays(d) { onFilter({ ...filters, days: d }); }
  function setContinent(c) { onFilter({ ...filters, continent: c }); }
  function setSeverity(s)  { onFilter({ ...filters, severity: s });  }

  return (
    <aside className={`filter-panel${open ? "" : " collapsed"}`} aria-label="Event filters">
      <div className="filter-head" onClick={() => setOpen(!open)} aria-expanded={open}>
        <div className="filter-head-left">
          <span className="filter-label">{open ? "Filters" : ""}</span>
          {open && (
            <span className="filter-count-badge" aria-live="polite">
              {loading ? "…" : filteredEvents.length.toLocaleString()}
            </span>
          )}
        </div>
        <button className="filter-toggle-btn" aria-label={open ? "Collapse filters" : "Expand filters"}>
          <IconChevron open={open} />
        </button>
      </div>

      <div className="filter-body">
        {/* Days */}
        <div className="filter-group">
          <div className="filter-group-label">Range</div>
          <div className="chip-row">
            {DAY_OPTIONS.map((d) => (
              <button
                key={d}
                className={`chip${filters.days === d ? " on" : ""}`}
                onClick={() => setDays(d)}
                aria-pressed={filters.days === d}
              >
                {d}d
              </button>
            ))}
          </div>
        </div>

        {/* Continent */}
        <div className="filter-group">
          <div className="filter-group-label">Region</div>
          <div className="chip-row">
            {CONTINENTS.map((c) => (
              <button
                key={c}
                className={`chip${filters.continent === c ? " on" : ""}`}
                onClick={() => setContinent(c)}
                aria-pressed={filters.continent === c}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        {/* Severity */}
        <div className="filter-group">
          <div className="filter-group-label">Severity</div>
          <div className="chip-row">
            {SEVERITIES.map((s) => (
              <button
                key={s}
                className={`chip${filters.severity === s ? " on" : ""}`}
                onClick={() => setSeverity(s)}
                aria-pressed={filters.severity === s}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Event list */}
        {filteredEvents.length > 0 && (
          <>
            <div className="elist-header" aria-live="polite">
              Showing {Math.min(limit, filteredEvents.length)} of {filteredEvents.length.toLocaleString()}
            </div>
            <div className="elist" role="list">
              {visibleEvents.map((ev) => (
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

// ── Event detail panel ────────────────────────────────────────────────────────

function EventDetail({ event, onClose }) {
  // Trap focus + Escape
  useEffect(() => {
    function onKey(e) { if (e.key === "Escape") onClose(); }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const goldsteinPct = event.goldstein !== null
    ? ((event.goldstein + 10) / 20) * 100
    : 50;

  const title = event.actor1 !== "Unknown"
    ? `${event.actor1}${event.actor2 !== "Unknown" ? " → " + event.actor2 : ""}`
    : event.quadLabel;

  return (
    <>
      <div className="detail-backdrop" onClick={onClose} aria-hidden="true" />
      <section className="detail-panel" role="dialog" aria-modal="true" aria-label="Event detail">
        <div className={`detail-bar ${event.category}`} />
        <button className="detail-close" onClick={onClose} aria-label="Close detail">✕</button>

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
                  {event.actor1}
                  {event.actor2 !== "Unknown" && <> → {event.actor2}</>}
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
              <div className={`sev-badge sev-${event.severity}`} style={{ display: "inline-block" }}>
                {event.severity}
              </div>
              {event.goldstein !== null && (
                <div className="goldstein-track">
                  <div
                    className={`goldstein-fill ${event.category}`}
                    style={{ width: `${goldsteinPct}%` }}
                  />
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
            <a
              href={event.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="detail-link"
            >
              Source Article <IconExternalLink />
            </a>
          )}
        </div>
      </section>
    </>
  );
}

// ── AI section ────────────────────────────────────────────────────────────────

function AiSection({ filteredEvents }) {
  const [apiKey,    setApiKey]    = useState("");
  const [result,    setResult]    = useState("");
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState("");

  const hasKey = apiKey.trim().length > 0;

  async function analyze() {
    setLoading(true);
    setError("");
    setResult("");

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          apiKey: apiKey.trim(),
          events: filteredEvents,
        }),
        signal: AbortSignal.timeout(35_000),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      setResult(data.analysis ?? "");
    } catch (err) {
      setError(err.message ?? "Analysis failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="ai-section" aria-label="AI analysis">
      <div className="ai-inner">
        <input
          className="ai-key"
          type="password"
          placeholder="sk-ant-… — Anthropic API key for AI analysis"
          value={apiKey}
          onChange={(e) => { setApiKey(e.target.value); setResult(""); setError(""); }}
          aria-label="Anthropic API key"
          spellCheck={false}
          autoComplete="off"
        />

        {hasKey ? (
          <button
            className="ai-btn"
            onClick={analyze}
            disabled={loading || filteredEvents.length === 0}
            aria-busy={loading}
          >
            {loading ? "Analyzing…" : "Analyze"}
          </button>
        ) : (
          <p className="ai-hint">
            AI-powered pattern analysis available with your own API key.{" "}
            <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer">
              Setup guide →
            </a>
          </p>
        )}
      </div>

      {(result || error) && (
        <div className="ai-result-wrap">
          {error  && <div className="ai-error">{error}</div>}
          {result && <div className="ai-result">{result}</div>}
        </div>
      )}
    </section>
  );
}

// ── Loading / error overlays ──────────────────────────────────────────────────

function LoadingOverlay({ slow }) {
  return (
    <div className="loading-overlay" role="status" aria-live="polite">
      <div className="loading-box">
        <div className="spinner" aria-hidden="true" />
        <div className="loading-text">
          {slow ? "Still fetching GDELT data…" : "Fetching events…"}
        </div>
        {slow && (
          <div style={{ fontSize: 10, color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
            GDELT servers can be slow — up to 10 s per file
          </div>
        )}
      </div>
    </div>
  );
}

function ErrorToast({ message, onDismiss }) {
  return (
    <div className="error-toast" role="alert">
      <span style={{ flex: 1 }}>{message}</span>
      <button className="error-dismiss" onClick={onDismiss} aria-label="Dismiss error">✕</button>
    </div>
  );
}

// ── Root app ──────────────────────────────────────────────────────────────────

function App() {
  const [events,   setEvents]   = useState([]);
  const [filters,  setFilters]  = useState({ days: 7, continent: "All", severity: "All" });
  const [selected, setSelected] = useState(null);
  const [loading,  setLoading]  = useState(false);
  const [slowLoad, setSlowLoad] = useState(false);
  const [error,    setError]    = useState("");

  // Fetch when days change (server-side filter)
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
      .catch((err) => {
        if (!cancelled) setError(err.message ?? "Failed to load events.");
      })
      .finally(() => {
        if (!cancelled) { setLoading(false); setSlowLoad(false); }
        clearTimeout(slowTimer);
      });

    return () => { cancelled = true; clearTimeout(slowTimer); };
  }, [filters.days]);

  // Client-side filtering for continent + severity
  const filteredEvents = useMemo(() => {
    return events.filter((e) => {
      if (filters.continent !== "All" && e.continent !== filters.continent) return false;
      if (filters.severity  !== "All" && e.severity.toLowerCase() !== filters.severity.toLowerCase()) return false;
      return true;
    });
  }, [events, filters.continent, filters.severity]);

  const handleSelectEvent = useCallback((ev) => {
    setSelected((prev) => (prev?.id === ev.id ? null : ev));
  }, []);

  const handleFilter = useCallback((next) => {
    setFilters(next);
    setSelected(null);
  }, []);

  return (
    <>
      <TopBar eventCount={filteredEvents.length} />

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
        {selected && (
          <EventDetail
            event={selected}
            onClose={() => setSelected(null)}
          />
        )}
      </main>

      <AiSection filteredEvents={filteredEvents} />

      {loading && <LoadingOverlay slow={slowLoad} />}
      {error    && <ErrorToast message={error} onDismiss={() => setError("")} />}
    </>
  );
}

// ── Mount ─────────────────────────────────────────────────────────────────────

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
