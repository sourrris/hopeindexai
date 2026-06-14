# HopeIndexAI Ontology Foundation

Phase 1 defines the basic world model for HopeIndexAI.

In simple terms, the ontology is the list of "things" the system understands and how those things connect. This matters for machine learning because a model can only learn patterns from stable inputs. If `ISRAEL`, `ISRAELI`, and `Israeli government` are treated as unrelated strings forever, the model starts from noisy evidence.

## Schema Files

- `schemas/ontology/v1/ontology.schema.json` defines the main object types and relationships.
- `schemas/ontology/v1/gdelt-public-events.schema.json` defines the current `public/data/events.json` slice.

## Core Objects

| Object | Plain meaning | ID prefix | Required links |
| --- | --- | --- | --- |
| `Actor` | A person, state, group, institution, company, or unknown participant. | `actor:` | Optional `ActorProfile` |
| `Event` | One reported thing that happened. | `event:` | Actors, location, source, cluster |
| `EventCluster` | A bundle of event rows that probably describe the same situation. | `cluster:` | Member events |
| `Location` | Where an event happened. | `location:` | Events that occur there |
| `Source` | Evidence item, article, book, official record, archive, or unknown source. | `source:` | Claims or events it supports |
| `Claim` | A statement that should be supported by evidence. | `claim:` | Source IDs |
| `Prediction` | A model output about what may happen next. | `prediction:` | Event, cluster, actor, or watchlist target |
| `AnalystAssessment` | Human feedback about a prediction. | `assessment:` | Prediction |
| `ActorProfile` | Historical or current background about an actor. | `profile:` | Actor and sources |
| `Watchlist` | A saved set of actors, places, or patterns to monitor. | `watchlist:` | Actors or clusters when applicable |

## ID Rules

IDs are stable, typed, lowercase strings. The type prefix is part of the ID because it prevents accidental collisions.

Rules:

- Use the format `type:namespace:value`.
- Keep labels out of IDs when the label can change.
- Use deterministic hashes for URLs or long evidence strings.
- Do not reuse an ID for a different real-world object.
- If a field is unknown, create an explicit unknown object instead of dropping the relationship.

Phase 1 deterministic IDs:

| Object | ID rule |
| --- | --- |
| Event | `event:gdelt:{GLOBALEVENTID}` |
| Actor from GDELT name | `actor:gdelt-name:{slug(raw_actor_name)}` |
| Unknown actor | `actor:unknown` |
| Coordinate location | `location:geo:{signed_lat_4dp}:{signed_lon_4dp}` |
| Article source URL | `source:url:{sha256(url)[0..16]}` |
| Missing source URL | `source:unknown:{event_id}` |
| Current GDELT cluster | `cluster:gdelt:{date}:{theme}:{country}:{grid_lat}:{grid_lon}:{actor_prefix}` |
| Historical profile | `profile:historical-person:{person_id}` |
| Historical person actor | `actor:historical-person:{person_id}` |
| Claim from profile data | `claim:profile:{claim_id}` |

Coordinates use `p` and `m` instead of `+` and `-`, for example `p31.4167` or `m74.0060`.

## Relationships

Relationships are edges in the graph. A relationship should usually have a confidence score, because early data is noisy.

| Link | Relationship type |
| --- | --- |
| Actor -> participates in -> Event | `participates_in` |
| Event -> belongs to -> EventCluster | `belongs_to` |
| Event -> occurs at -> Location | `occurs_at` |
| Event -> reported by -> Source | `reported_by` |
| Prediction -> explains -> Event or EventCluster | `explains` |
| AnalystAssessment -> evaluates -> Prediction | `evaluates` |
| ActorProfile -> describes -> Actor | `describes` |
| Claim -> supported by -> Source | `supports` |

## Bayesian Fields

Bayesian thinking means the system should say how strongly it believes something and what evidence would change that view.

Phase 1 uses:

- `confidence`: numeric 0 to 1 for object and relationship quality.
- `priorConfidence`: belief before adding the latest evidence.
- `posteriorConfidence`: belief after adding the latest evidence.
- `evidenceSourceIds`: source IDs that justify the object or relationship.

## Game Theory Fields

Game theory starts from actors, incentives, constraints, and likely moves. `ActorProfile` keeps those fields close to the actor so future analysis can ask: "Given this actor's incentives and constraints, what move is rational?"

Phase 1 keeps:

- `incentives`
- `constraints`
- `likelyMoves`
- `riskTolerance`
- `gameTheoryProfile`

## Validation

Run:

```bash
bun run ontology:validate
```

This checks that the current `public/data/events.json` rows can be mapped to ontology IDs for actors, locations, sources, and clusters.
