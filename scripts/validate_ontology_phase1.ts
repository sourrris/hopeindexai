import { createHash } from "crypto";
import { promises as fs } from "fs";

type Category = "doom" | "bloom";

interface GdeltEventRow {
  id: string;
  lat: number;
  lon: number;
  category: Category;
  theme?: string;
  hopeScore?: number;
  goldstein: number | null;
  quadClass: number | null;
  quadLabel: string;
  actor1: string;
  actor2: string;
  country: string;
  location: string;
  date: string;
  numMentions: number;
  avgTone: number | null;
  sourceUrl: string;
  markerRadius: number;
  severity: string;
  continent: string;
}

const ONTOLOGY_ID = /^[a-z][a-z0-9]*(?::[a-z0-9][a-z0-9._-]*)+$/;
const GRID_SIZE = 0.08;

function slug(value: string | undefined): string {
  const normalized = (value ?? "")
    .trim()
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return normalized || "unknown";
}

function signedPart(value: number, digits = 4): string {
  const abs = Math.abs(value).toFixed(digits);
  return `${value < 0 ? "m" : "p"}${abs}`;
}

function gridPart(value: number): string {
  const rounded = Math.round(value / GRID_SIZE);
  return `${rounded < 0 ? "m" : "p"}${Math.abs(rounded)}`;
}

function shortHash(value: string): string {
  return createHash("sha256").update(value).digest("hex").slice(0, 16);
}

function eventId(row: GdeltEventRow): string {
  return `event:gdelt:${slug(row.id)}`;
}

function actorId(name: string | undefined): string {
  const value = (name ?? "").trim();
  if (!value || value.toLowerCase() === "unknown") return "actor:unknown";
  return `actor:gdelt-name:${slug(value)}`;
}

function locationId(row: GdeltEventRow): string {
  return `location:geo:${signedPart(row.lat)}:${signedPart(row.lon)}`;
}

function sourceId(row: GdeltEventRow): string {
  const url = (row.sourceUrl ?? "").trim();
  if (!url) return `source:unknown:${slug(row.id)}`;
  return `source:url:${shortHash(url)}`;
}

function clusterId(row: GdeltEventRow): string {
  const actorPrefix = slug((row.actor1 ?? "unknown").slice(0, 3));
  return [
    "cluster",
    "gdelt",
    slug(row.date),
    slug(row.theme ?? "unknown"),
    slug(row.country || "unknown"),
    gridPart(row.lat),
    gridPart(row.lon),
    actorPrefix
  ].join(":");
}

function domainFromUrl(url: string): string {
  try {
    return new URL(url).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return "";
  }
}

function readEvents(parsed: unknown): GdeltEventRow[] {
  if (Array.isArray(parsed)) return parsed as GdeltEventRow[];
  if (parsed && typeof parsed === "object" && Array.isArray((parsed as { events?: unknown }).events)) {
    return (parsed as { events: GdeltEventRow[] }).events;
  }
  throw new Error("public/data/events.json must be an array or an object with an events array.");
}

function assertOntologyId(id: string, label: string, failures: string[]) {
  if (!ONTOLOGY_ID.test(id)) failures.push(`${label} produced invalid ontology ID: ${id}`);
}

async function main() {
  const raw = await fs.readFile("public/data/events.json", "utf8");
  const events = readEvents(JSON.parse(raw));

  const failures: string[] = [];
  const actorIds = new Set<string>();
  const locationIds = new Set<string>();
  const sourceIds = new Set<string>();
  const clusterIds = new Set<string>();
  const sourceDomains = new Set<string>();

  let unknownActorRows = 0;
  let unknownSourceRows = 0;

  for (const row of events) {
    if (!row.id) failures.push("Event row is missing id.");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(row.date ?? "")) failures.push(`Event ${row.id} has invalid date: ${row.date}`);
    if (!Number.isFinite(row.lat) || !Number.isFinite(row.lon)) failures.push(`Event ${row.id} has invalid coordinates.`);
    if (!row.category || !["doom", "bloom"].includes(row.category)) failures.push(`Event ${row.id} has invalid category: ${row.category}`);

    const ids = {
      event: eventId(row),
      actor1: actorId(row.actor1),
      actor2: actorId(row.actor2),
      location: locationId(row),
      source: sourceId(row),
      cluster: clusterId(row)
    };

    assertOntologyId(ids.event, "event", failures);
    assertOntologyId(ids.actor1, "actor1", failures);
    assertOntologyId(ids.actor2, "actor2", failures);
    assertOntologyId(ids.location, "location", failures);
    assertOntologyId(ids.source, "source", failures);
    assertOntologyId(ids.cluster, "cluster", failures);

    actorIds.add(ids.actor1);
    actorIds.add(ids.actor2);
    locationIds.add(ids.location);
    sourceIds.add(ids.source);
    clusterIds.add(ids.cluster);

    if (ids.actor1 === "actor:unknown" && ids.actor2 === "actor:unknown") unknownActorRows++;
    if (ids.source.startsWith("source:unknown:")) unknownSourceRows++;

    const domain = domainFromUrl(row.sourceUrl ?? "");
    if (domain) sourceDomains.add(domain);
  }

  console.log("HopeIndexAI Ontology Phase 1 validation");
  console.log(`Events checked: ${events.length}`);
  console.log(`Actor IDs: ${actorIds.size}`);
  console.log(`Location IDs: ${locationIds.size}`);
  console.log(`Source IDs: ${sourceIds.size}`);
  console.log(`Source domains: ${sourceDomains.size}`);
  console.log(`Cluster IDs: ${clusterIds.size}`);
  console.log(`Rows with both actors unknown: ${unknownActorRows}`);
  console.log(`Rows with missing source URL: ${unknownSourceRows}`);

  if (failures.length > 0) {
    console.error("\nValidation failures:");
    for (const failure of failures.slice(0, 30)) console.error(`- ${failure}`);
    if (failures.length > 30) console.error(`- ...and ${failures.length - 30} more`);
    process.exit(1);
  }

  console.log("Result: every event row has ontology IDs for event, actors, location, source, and cluster.");
}

main().catch((err) => {
  console.error("HopeIndexAI Ontology Phase 1 validation failed:", err);
  process.exit(1);
});
