// HopeIndexAI — React app (JSX, transpiled by Babel standalone)
// Data: GDELT Project  |  Map: Leaflet  |  Font: Geist

const { useState, useEffect, useRef, useMemo, useCallback } = React;

// ── Constants ─────────────────────────────────────────────────────────────────

const THEME_COLORS = {
  Diplomacy:     "#4F46E5",   // indigo
  Conflict:      "#EF4444",   // crimson red
  Econ:          "#D97706",   // deep amber
  Environment:   "#10B981",   // emerald green
  Humanitarian:  "#D946EF",   // vibrant magenta-pink
  Science:       "#06B6D4",   // bright cyan-teal
};

// CartoDB light tiles — forced white theme, noWrap prevents world repetition
const TILE_LIGHT = "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png";
const TILE_ATTR  = '© <a href="https://osm.org">OSM</a> © <a href="https://carto.com">CARTO</a>';

// Hard world bounds — no panning past the edge of the earth
const WORLD_BOUNDS = L.latLngBounds(L.latLng(-85, -220), L.latLng(85, 220));

const CONTINENTS  = ["All", "Americas", "Europe", "Middle East", "Africa", "Asia", "Oceania"];
const CATEGORIES  = ["All", "Diplomacy", "Conflict", "Econ", "Environment", "Humanitarian", "Science"];
const DAY_OPTIONS = [1, 3, 7, 30];

const GITHUB_URL = "https://github.com/sourrris/hopeindexai";

const ACTOR_STOPWORDS = new Set([
  "UNKNOWN", "GOVERNMENT", "MINISTRY", "STATE", "STATES", "UNITED", "NATIONAL",
  "INTERNATIONAL", "OFFICIAL", "OFFICIALS", "POLICE", "ADMINISTRATION",
  "PRESIDENT", "PRIME", "MINISTER", "CITY", "COUNTY", "LOCAL",
]);

function sourceHost(url) {
  if (!url) return "";
  try {
    return new URL(url).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return "";
  }
}

function actorTokens(event) {
  const raw = `${event.actor1 || ""} ${event.actor2 || ""}`.toUpperCase();
  return new Set(
    raw
      .split(/[^A-Z0-9]+/)
      .filter((token) => token.length > 2 && !ACTOR_STOPWORDS.has(token))
  );
}

function daysApart(a, b) {
  const aMs = Date.parse(a.date);
  const bMs = Date.parse(b.date);
  if (!Number.isFinite(aMs) || !Number.isFinite(bMs)) return null;
  return Math.abs(aMs - bMs) / 86400000;
}

function distanceKm(a, b) {
  if (![a.lat, a.lon, b.lat, b.lon].every(Number.isFinite)) return null;
  const toRad = (n) => n * Math.PI / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}

function eventTitle(event) {
  return event.actor1 !== "Unknown"
    ? `${event.actor1}${event.actor2 && event.actor2 !== "Unknown" ? " -> " + event.actor2 : ""}`
    : event.quadLabel;
}

function scoreRelatedSignal(target, candidate) {
  if (!target || !candidate || target.id === candidate.id) return null;

  let score = 0;
  const reasons = [];
  const targetHost = sourceHost(target.sourceUrl);
  const candidateHost = sourceHost(candidate.sourceUrl);

  if (target.sourceUrl && candidate.sourceUrl && target.sourceUrl === candidate.sourceUrl) {
    score += 90;
    reasons.push("same source article");
  } else if (targetHost && candidateHost && targetHost === candidateHost) {
    score += 18;
    reasons.push(`same publisher: ${targetHost}`);
  }

  const sharedActors = [...actorTokens(target)].filter((token) => actorTokens(candidate).has(token));
  if (sharedActors.length) {
    score += Math.min(45, sharedActors.length * 18);
    reasons.push(`shared actor: ${sharedActors.slice(0, 3).join(", ")}`);
  }

  if (target.country && candidate.country && target.country === candidate.country) {
    score += 22;
    reasons.push(`same country: ${target.country}`);
  }

  if (target.continent && candidate.continent && target.continent === candidate.continent) score += 8;

  if (target.theme && candidate.theme && target.theme === candidate.theme) {
    score += 14;
    reasons.push(`same theme: ${target.theme}`);
  }

  if (target.quadClass !== null && target.quadClass === candidate.quadClass) score += 8;

  const days = daysApart(target, candidate);
  if (days !== null) {
    if (days <= 1) {
      score += 16;
      reasons.push("same 24h cycle");
    } else if (days <= 7) {
      score += 11;
      reasons.push(`${Math.round(days)} days apart`);
    } else if (days <= 30) {
      score += 4;
    }
  }

  const km = distanceKm(target, candidate);
  if (km !== null) {
    if (km <= 50) {
      score += 18;
      reasons.push("nearby location");
    } else if (km <= 300) {
      score += 10;
      reasons.push(`${Math.round(km)} km away`);
    } else if (km <= 1000) {
      score += 5;
    }
  }

  score += Math.min(10, Math.log10((candidate.numMentions || 0) + 1) * 4);

  if (score < 32 || !reasons.length) return null;
  return { event: candidate, score, reasons };
}

function findRelatedSignals(target, events, limit = 6) {
  return events
    .map((candidate) => scoreRelatedSignal(target, candidate))
    .filter(Boolean)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

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

function TopBar({ globalHopeAverage, eventCount }) {
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
        {eventCount > 0 && (
          <div className="topbar-stats">
            <span className="stat-pill hope">
              <span className="stat-dot hope" aria-hidden="true" />
              Global Hope Index: {globalHopeAverage.toFixed(1)}/100
            </span>
            <span style={{ fontSize: 10, fontFamily: "var(--font-mono)", color: "var(--text-sec)", marginLeft: 2 }}>
              ({eventCount.toLocaleString()} events clustered)
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

    // Sort ascending so most significant render on top in SVG layer order
    const sorted = [...events].sort((a, b) => a.markerRadius - b.markerRadius);

    // Top 5 highest-mentions events get an SVG pulse ring colored by theme
    const topEventIds = new Set(
      events
        .sort((a, b) => b.markerRadius - a.markerRadius)
        .slice(0, 5)
        .map((e) => e.id)
    );

    for (const ev of sorted) {
      const fill    = THEME_COLORS[ev.theme] || "#4F46E5";
      const stroke  = "#FFFFFF";
      const opacity = ev.severity === "low" ? 0.60 : ev.severity === "medium" ? 0.76 : 0.90;

      const marker = L.circleMarker([ev.lat, ev.lon], {
        radius:      ev.markerRadius,
        fillColor:   fill,
        color:       stroke,
        weight:      1.5,
        fillOpacity: opacity,
      });

      const actorLine = ev.actor1 !== "Unknown"
        ? `${ev.actor1}${ev.actor2 !== "Unknown" ? " → " + ev.actor2 : ""}`
        : ev.quadLabel;

      marker.bindTooltip(
        `<strong>[${ev.theme}] ${actorLine}</strong><br/>${ev.location || ev.country}<br/>Hope Index: <strong>${ev.hopeScore}</strong>`,
        { sticky: true, direction: "top", html: true }
      );
      marker.on("click", () => onSelectEvent(ev));
      layerRef.current.addLayer(marker);

      // Pulse ring: second circleMarker, transparent fill, animated via CSS
      if (topEventIds.has(ev.id)) {
        const ring = L.circleMarker([ev.lat, ev.lon], {
          radius:      ev.markerRadius,
          fillColor:   "transparent",
          color:       fill,
          weight:      1.8,
          fillOpacity: 0,
          className:   "pulse-ring-svg",
        });
        layerRef.current.addLayer(ring);
      }
    }
  }, [events, onSelectEvent]);

  return <div ref={containerRef} id="map" aria-label="Geopolitical event map" />;
}

// ── Map legend ────────────────────────────────────────────────────────────────

function MapLegend() {
  return (
    <div className="map-legend" aria-label="Map legend">
      {Object.entries(THEME_COLORS).map(([name, color]) => (
        <div className="legend-row" key={name}>
          <span className="legend-swatch" style={{ background: color }} />
          {name}
        </div>
      ))}
      <div className="legend-row" style={{ marginTop: 4, color: "var(--text-muted)", fontSize: 9 }}>
        Ring = Top significance
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
  const setCategory  = (cat) => onFilter({ ...filters, category: cat });

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
          <div className="filter-group-label">Category</div>
          <div className="chip-row">
            {CATEGORIES.map((cat) => {
              const isOn = filters.category === cat;
              return (
                <button
                  key={cat}
                  className={`chip${isOn ? " on" : ""}`}
                  onClick={() => setCategory(cat)}
                  aria-pressed={isOn}
                  style={isOn && cat !== "All" ? { background: THEME_COLORS[cat], borderColor: THEME_COLORS[cat] } : {}}
                >{cat}</button>
              );
            })}
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
  const title = eventTitle(event);

  const scoreColor = event.hopeScore >= 70 ? "#16A34A" : event.hopeScore < 40 ? "#DC2626" : "#D97706";
  const scoreBg    = event.hopeScore >= 70 ? "rgba(34,197,94,.12)" : event.hopeScore < 40 ? "rgba(239,68,68,.12)" : "rgba(245,158,11,.12)";

  return (
    <div
      className={`erow${selected ? " sel" : ""}`}
      onClick={onClick}
      role="listitem"
      tabIndex={0}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onClick()}
      aria-selected={selected}
    >
      <span className={`edot ${event.theme}`} aria-hidden="true" style={{ background: THEME_COLORS[event.theme] || "#4F46E5" }} />
      <div className="erow-body">
        <div className="erow-title" title={title}>{title}</div>
        <div className="erow-meta">{event.location || event.country} · {event.date}</div>
      </div>
      <span className="hope-badge" style={{
        fontSize: "10px",
        fontFamily: "var(--font-mono)",
        fontWeight: "700",
        padding: "2px 6px",
        borderRadius: "4px",
        background: scoreBg,
        color: scoreColor,
        marginLeft: "8px",
        flexShrink: 0
      }}>
        {event.hopeScore}
      </span>
    </div>
  );
}

// ── AI analysis ───────────────────────────────────────────────────────────────

function AiAnalysis({ event, apiKey }) {
  const [analysis, setAnalysis] = useState("");
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");

  const run = useCallback(async () => {
    setLoading(true);
    setError("");
    setAnalysis("");
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey, events: [event], mode: "detail" }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setAnalysis(data.analysis ?? "");
    } catch (err) {
      setError(err.message ?? "Analysis failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [event, apiKey]);

  return (
    <div className="ai-section">
      <div className="ai-section-header">
        <span className="ai-section-label">Causal Intelligence Probe</span>
        {!analysis && !loading && (
          <button className="ai-run-btn" onClick={run} disabled={loading}>
            Run Deep Probe
          </button>
        )}
        {analysis && (
          <button className="ai-rerun-btn" onClick={run} disabled={loading} aria-label="Re-run analysis">
            ↺
          </button>
        )}
      </div>
      {loading && (
        <div className="ai-thinking">
          <span className="ai-thinking-dot" />
          Building evidence pack and related signals...
        </div>
      )}
      {error && <div className="ai-error">{error}</div>}
      {analysis && <div className="ai-output">{analysis}</div>}
    </div>
  );
}

function LinkedSignals({ event, events, onSelectEvent }) {
  const related = useMemo(() => findRelatedSignals(event, events), [event, events]);

  if (!related.length) return null;

  return (
    <div className="linked-signals">
      <div className="linked-signals-head">
        <div>
          <div className="linked-signals-label">Linked Signals</div>
          <div className="linked-signals-sub">Same actors, source, location, theme, or timing</div>
        </div>
        <span className="linked-signals-count">{related.length}</span>
      </div>

      <div className="linked-signals-list">
        {related.map((signal) => {
          const rel = signal.event;
          const color = THEME_COLORS[rel.theme] || "#4F46E5";
          return (
            <button
              key={rel.id}
              type="button"
              className="linked-signal"
              onClick={() => onSelectEvent(rel)}
            >
              <span className="linked-signal-dot" style={{ background: color }} aria-hidden="true" />
              <span className="linked-signal-main">
                <span className="linked-signal-title">{eventTitle(rel)}</span>
                <span className="linked-signal-meta">{rel.date} · {rel.location || rel.country}</span>
                <span className="linked-signal-reason">{signal.reasons[0]}</span>
              </span>
              <span className="linked-signal-score">{Math.round(signal.score)}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function IntelPacket({ event }) {
  const [probe, setProbe] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!event?.id) return;
    const ctrl = new AbortController();
    setProbe(null);
    setError("");
    setLoading(true);

    fetch(`/api/probe?id=${encodeURIComponent(event.id)}`, { signal: ctrl.signal })
      .then((r) => r.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setProbe(data.probe ?? null);
      })
      .catch((err) => {
        if (err.name !== "AbortError") setError(err.message ?? "Probe failed.");
      })
      .finally(() => {
        if (!ctrl.signal.aborted) setLoading(false);
      });

    return () => ctrl.abort();
  }, [event?.id]);

  if (loading) {
    return (
      <div className="intel-packet">
        <div className="intel-head">
          <div className="intel-label">Intel Packet</div>
          <span className="intel-status">Building</span>
        </div>
        <div className="intel-muted">Linking evidence, actors, impact paths, and watch signals...</div>
      </div>
    );
  }

  if (error || !probe) {
    return (
      <div className="intel-packet">
        <div className="intel-head">
          <div className="intel-label">Intel Packet</div>
          <span className="intel-status weak">Thin</span>
        </div>
        <div className="intel-muted">{error || "No probe available."}</div>
      </div>
    );
  }

  const topImpacts = [...(probe.impactMap || [])].sort((a, b) => b.score - a.score).slice(0, 4);
  const topHypotheses = (probe.hypotheses || []).slice(0, 2);
  const topActor = probe.actorGame?.[0];
  const prediction = probe.prediction;

  return (
    <div className="intel-packet">
      <div className="intel-head">
        <div>
          <div className="intel-label">Intel Packet</div>
          <div className="intel-sub">
            {probe.source?.title || probe.source?.domain || "GDELT evidence graph"}
          </div>
        </div>
        <span className={`intel-status ${probe.evidenceGrade?.label || "partial"}`}>
          {probe.evidenceGrade?.label || "partial"} {probe.evidenceGrade?.confidence ?? "--"}%
        </span>
      </div>

      {prediction && (
        <div className="intel-block model-prediction">
          <div className="intel-block-label">Trained Prediction</div>
          <div className="model-risk-head">
            <div>
              <div className={`model-risk-value ${prediction.label}`}>{prediction.probability}%</div>
              <div className="model-risk-sub">critical escalation risk in 72h</div>
            </div>
            <div className="model-metrics">
              <span>Test AUC {Math.round((prediction.metrics?.auc || 0) * 100)}%</span>
              <span>Accuracy {Math.round((prediction.metrics?.accuracy || 0) * 100)}%</span>
            </div>
          </div>
          <div className="model-driver-list">
            {(prediction.drivers || []).slice(0, 4).map((driver) => (
              <div className="model-driver" key={driver.feature}>
                <span>{driver.feature.replaceAll("_", " ")}</span>
                <strong>{driver.direction}</strong>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="intel-grid">
        <div className="intel-block">
          <div className="intel-block-label">Impact Map</div>
          <div className="impact-bars">
            {topImpacts.map((impact) => (
              <div className="impact-row" key={impact.key}>
                <div className="impact-row-top">
                  <span>{impact.label}</span>
                  <span>{impact.score}</span>
                </div>
                <div className="impact-track" aria-hidden="true">
                  <span
                    className={`impact-fill ${impact.direction}`}
                    style={{ width: `${Math.max(4, Math.min(100, impact.score))}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="intel-block">
          <div className="intel-block-label">Cause Hypotheses</div>
          <div className="hypothesis-list">
            {topHypotheses.map((hypothesis) => (
              <div className="hypothesis-row" key={hypothesis.title}>
                <span>{hypothesis.title}</span>
                <strong>{hypothesis.confidence}%</strong>
              </div>
            ))}
          </div>
        </div>
      </div>

      {topActor && (
        <div className="intel-block actor-game">
          <div className="intel-block-label">Actor Game</div>
          <div className="actor-game-title">{topActor.actor}</div>
          <div className="actor-game-line">{topActor.incentives?.[0]}</div>
          <div className="actor-game-line muted">{topActor.decisionTraps?.join(", ")}</div>
        </div>
      )}

      <div className="intel-block watchlist">
        <div className="intel-block-label">Watchlist</div>
        {(probe.watchlist || []).slice(0, 4).map((item) => (
          <div className="watch-item" key={item}>{item}</div>
        ))}
      </div>

      {!!probe.uncertaintyWarnings?.length && (
        <div className="intel-warning">{probe.uncertaintyWarnings[0]}</div>
      )}
    </div>
  );
}

// ── Event detail ──────────────────────────────────────────────────────────────

function EventDetail({ event, events, onClose, onSelectEvent, apiKey, aiReady }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const title = eventTitle(event);

  const hopeScore = event.hopeScore ?? 50;
  const strokeDash = (hopeScore / 100) * 125.6; // circumference (2 * PI * R where R=20 is 125.6)

  return (
    <>
      <div className="detail-backdrop" onClick={onClose} aria-hidden="true" />
      <section className="detail-panel" role="dialog" aria-modal="true" aria-label="Event detail">
        <div className={`detail-bar ${event.theme}`} style={{ background: THEME_COLORS[event.theme] || "#4F46E5" }} />
        <button className="detail-close" onClick={onClose} aria-label="Close">✕</button>

        <div className="detail-body">
          <div className={`detail-cat ${event.theme}`} style={{ color: THEME_COLORS[event.theme] || "#4F46E5" }}>
            {event.theme} · {event.quadLabel}
          </div>
          <h2 className="detail-title">{title}</h2>

          {/* Pre-generated AI Summary Card */}
          {event.aiSummary && (
            <div className="ai-summary-box">
              <div className="ai-summary-title">
                <span className="ai-summary-sparkle" style={{ background: THEME_COLORS[event.theme] }} />
                AI Summary
              </div>
              <div className="ai-summary-text">{event.aiSummary}</div>
              {event.aiReasoning && (
                <div className="ai-summary-reasoning">
                  <strong>Assessment:</strong> {event.aiReasoning}
                </div>
              )}
            </div>
          )}

          {/* Hope Index Gauge */}
          <div style={{ marginBottom: 24 }}>
            <div className="dfield-label">Hope Index Analysis</div>
            <div className="hope-gauge-container">
              <div className="hope-gauge-circle">
                <svg className="hope-gauge-svg" viewBox="0 0 48 48">
                  <circle className="hope-gauge-bg" cx="24" cy="24" r="20" />
                  <circle
                    className="hope-gauge-fill"
                    cx="24"
                    cy="24"
                    r="20"
                    strokeDasharray={`${strokeDash} 125.6`}
                    style={{ stroke: THEME_COLORS[event.theme] || "#4F46E5" }}
                  />
                </svg>
                <span className="hope-gauge-value">{hopeScore}</span>
              </div>
              <div className="hope-gauge-body">
                <div className="hope-gauge-title" style={{ color: THEME_COLORS[event.theme] }}>
                  {hopeScore >= 70 ? "Constructive Growth" : hopeScore < 40 ? "Destructive Conflict" : "Moderate Transition"}
                </div>
                <div className="hope-gauge-desc">
                  Calculated dynamic index representing long-term structural progress, cooperative dialogue, and future outlook impact.
                </div>
              </div>
            </div>
          </div>

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
                {event.lat.toFixed(4)}, {event.lon.toFixed(4)}
              </div>
            </div>
            <div>
              <div className="dfield-label">Date</div>
              <div className="dfield-val">{event.date}</div>
            </div>

            <div style={{ display: "flex", gap: "20px" }}>
              <div style={{ flex: 1 }}>
                <div className="dfield-label">Goldstein Scale</div>
                <div className="dfield-val">{event.goldstein !== null ? event.goldstein.toFixed(1) : "n/a"}</div>
              </div>
              <div style={{ flex: 1 }}>
                <div className="dfield-label">Average Tone</div>
                <div className="dfield-val" style={{ color: event.avgTone < 0 ? "var(--theme-conflict)" : "var(--theme-science)" }}>
                  {event.avgTone !== null ? event.avgTone.toFixed(2) : "n/a"}
                </div>
              </div>
            </div>

            {event.numMentions > 0 && (
              <div>
                <div className="dfield-label">Coverage Significance</div>
                <div className="dfield-val">{event.numMentions.toLocaleString()} media mentions</div>
              </div>
            )}
          </div>

          {event.sourceUrl && (
            <a href={event.sourceUrl} target="_blank" rel="noopener noreferrer" className="detail-link">
              Source Article <IconExternalLink />
            </a>
          )}

          <IntelPacket event={event} />

          <LinkedSignals event={event} events={events} onSelectEvent={onSelectEvent} />

          <div className="ai-divider" />

          {aiReady ? (
            <AiAnalysis event={event} apiKey={apiKey} />
          ) : (
            <div className="ai-no-key">
              <div className="ai-no-key-eyebrow">On-Demand Causal Probe</div>
              <div className="ai-no-key-heading">Unlock evidence-linked event probes.</div>
              <div className="ai-no-key-body">
                Connect an Anthropic API key to fetch source evidence, connect related events, and generate cause hypotheses,
                actor incentives, impact paths, and calibrated next-step forecasts.
              </div>
              <a
                href={GITHUB_URL + "#ai-analysis"}
                target="_blank"
                rel="noopener noreferrer"
                className="ai-setup-link"
              >
                Setup guide →
              </a>
            </div>
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
          {slow ? "Reading GDELT cluster index..." : "Syncing dynamic geopolitical events"}
        </div>
        {slow && (
          <div className="loading-sub">Sub-50ms static Edge CDN response times</div>
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
  const [filters,  setFilters]  = useState({ days: 7, continent: "All", category: "All" });
  const [selected, setSelected] = useState(null);
  const [loading,  setLoading]  = useState(false);
  const [slowLoad, setSlowLoad] = useState(false);
  const [error,    setError]    = useState("");
  const [apiKey,   setApiKey]   = useState(() => sessionStorage.getItem("hope_api_key") ?? "");
  const [aiReady,  setAiReady]  = useState(false);

  // Check once whether the server has an API key configured
  useEffect(() => {
    fetch("/api/ai-status")
      .then((r) => r.json())
      .then((d) => setAiReady(d.ready || Boolean(apiKey)))
      .catch(() => setAiReady(Boolean(apiKey)));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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
    if (filters.category !== "All" && e.theme !== filters.category) return false;
    return true;
  }), [events, filters.continent, filters.category]);

  const { globalHopeAverage, eventCount } = useMemo(() => {
    const validEvents = filteredEvents.filter((e) => e.hopeScore !== undefined);
    const sum = validEvents.reduce((acc, curr) => acc + curr.hopeScore, 0);
    const avg = validEvents.length > 0 ? sum / validEvents.length : 50;
    return {
      globalHopeAverage: avg,
      eventCount: filteredEvents.length,
    };
  }, [filteredEvents]);

  const handleSelectEvent = useCallback((ev) => {
    setSelected((prev) => (prev?.id === ev.id ? null : ev));
  }, []);

  const handleFilter = useCallback((next) => {
    setFilters(next);
    setSelected(null);
  }, []);

  return (
    <>
      <TopBar globalHopeAverage={globalHopeAverage} eventCount={eventCount} />

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
          <EventDetail
            event={selected}
            events={events}
            onClose={() => setSelected(null)}
            onSelectEvent={handleSelectEvent}
            apiKey={apiKey}
            aiReady={aiReady}
          />
        )}
      </main>

      <footer className="app-footer">
        <a href={GITHUB_URL + "#ai-analysis"} target="_blank" rel="noopener noreferrer">
          AI analysis — setup guide →
        </a>
      </footer>

      {loading && <LoadingOverlay slow={slowLoad} />}
      {error    && <ErrorToast message={error} onDismiss={() => setError("")} />}
    </>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
