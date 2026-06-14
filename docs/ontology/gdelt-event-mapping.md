# GDELT Event Row Mapping

This document explains how each current `public/data/events.json` row maps into the Phase 1 ontology.

The first-principles rule is: do not let one flat row do every job. A row describes an event, but it also contains actors, a location, a source, and cluster signals. Those become separate objects so ML features can reuse them later.

## Current Row Shape

Each event row currently has fields like:

```text
id, date, actor1, actor2, location, country, lat, lon,
sourceUrl, category, theme, goldstein, quadClass, avgTone,
numMentions, hopeScore, severity, continent
```

## Event Mapping

| Current field | Ontology target |
| --- | --- |
| `id` | `Event.sourceEventId`, with ontology ID `event:gdelt:{id}` |
| `date` | `Event.occurredOn` |
| `category` | `Event.category` |
| `theme` | `Event.theme` |
| `goldstein` | `Event.signals.goldstein` |
| `quadClass` | `Event.signals.quadClass` |
| `quadLabel` | `Event.signals.quadLabel` |
| `avgTone` | `Event.signals.avgTone` |
| `numMentions` | `Event.signals.numMentions` |
| `hopeScore` | `Event.signals.hopeScore` |
| `severity` | `Event.signals.severity` |
| Entire row | `Event.sourceRow` for traceability |

## Actor Mapping

| Current field | Ontology target |
| --- | --- |
| `actor1` | `Actor` and `Event.actorRoles[]` with role `actor1` |
| `actor2` | `Actor` and `Event.actorRoles[]` with role `actor2` |

Actor ID rule:

```text
actor:gdelt-name:{slug(raw_actor_name)}
```

If the name is missing or `Unknown`, use:

```text
actor:unknown
```

This is intentionally conservative. Phase 4 will resolve aliases like `ISRAEL`, `ISRAELI`, and `Israeli government` into stronger canonical actor IDs.

## Location Mapping

| Current field | Ontology target |
| --- | --- |
| `location` | `Location.rawName` and `Location.label` |
| `country` | `Location.fipsCountryCode` |
| `continent` | `Location.continent` |
| `lat`, `lon` | `Location.lat`, `Location.lon` |

Coordinate location ID rule:

```text
location:geo:{signed_lat_4dp}:{signed_lon_4dp}
```

Examples:

```text
location:geo:p31.4167:p34.3333
location:geo:m33.8688:p151.2093
```

## Source Mapping

| Current field | Ontology target |
| --- | --- |
| `sourceUrl` | `Source.url` |
| URL hostname | `Source.domain` |

Source ID rule:

```text
source:url:{first_16_chars_of_sha256(sourceUrl)}
```

If `sourceUrl` is empty, create an explicit unknown source:

```text
source:unknown:{event_id}
```

This keeps the graph complete while making weak evidence visible.

## Cluster Mapping

The current ingestion pipeline already deduplicates rows using this idea:

```text
date + theme + grid location + actor prefix
```

Phase 1 keeps that as the first cluster method:

```text
cluster:gdelt:{date}:{theme_slug}:{country}:{grid_lat}:{grid_lon}:{actor_prefix}
```

Where:

- `grid_lat = round(lat / 0.08)`
- `grid_lon = round(lon / 0.08)`
- `actor_prefix = first three characters of actor1, slugged`
- `clusterMethod = gdelt-grid-v1`

The current public file stores representative events, not the full raw member list. So today the cluster can start with:

```text
memberEventIds = [event:gdelt:{id}]
representativeEventId = event:gdelt:{id}
```

Later ingestion phases can attach all duplicate raw rows to the same cluster.

## Relationship Output

For every current event row, create these minimum relationships:

```text
Actor participates_in Event
Event belongs_to EventCluster
Event occurs_at Location
Event reported_by Source
```

This is the minimum graph needed before better ML features. The model can then ask questions like:

- Has this actor been involved in similar events recently?
- Is this source usually strong or weak evidence?
- Is this location seeing repeated escalation?
- Does the cluster represent one isolated event or a broader pattern?

## Known Phase 1 Limits

- GDELT actor names are raw strings, not resolved entities.
- The public event slice does not preserve every raw duplicate row.
- Source credibility is not fully validated yet.
- Current labels are weak labels, not human-confirmed outcomes.
- Unknown actor/source objects are allowed, but should lower confidence.
