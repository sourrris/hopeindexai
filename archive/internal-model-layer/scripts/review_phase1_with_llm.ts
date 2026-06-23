import { mkdir, readFile, writeFile } from "fs/promises";
import { dirname } from "path";

type LabelSource = "human" | "llm_article_review" | "bootstrap_current_rules";
type EvidenceGrade = "thin" | "partial" | "strong";

interface GdeltEvent {
  id: string;
  category: "doom" | "bloom";
  theme?: string;
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
  severity: "low" | "medium" | "high" | "critical";
  continent: string;
  aiSummary?: string;
}

interface Phase1Label {
  eventId: string;
  labelVersion: "phase1.v1";
  labelSource: LabelSource;
  humanReviewed: boolean;
  reviewedBy: string;
  reviewedAt: string;
  labels: {
    important: boolean;
    categoryCorrect: boolean;
    severityCorrect: boolean;
    summaryQuality: number | null;
  };
  reviewContext?: Record<string, unknown>;
  notes?: string;
}

interface SourceEvidence {
  url: string;
  domain: string;
  fetched: boolean;
  status: string;
  title?: string;
  excerpt?: string;
}

interface LlmReview {
  important: boolean;
  categoryCorrect: boolean;
  severityCorrect: boolean;
  summaryQuality: number | null;
  confidence: number;
  evidenceGrade: EvidenceGrade;
  rationale: string;
  importantRationale: string;
  categoryRationale: string;
  severityRationale: string;
}

const EVENTS_PATH = "public/data/events.json";
const LABEL_PATH = "data/eval/phase1_labels.jsonl";
const ERRORS_PATH = "data/eval/phase1_llm_review_errors.jsonl";
const DEFAULT_MODEL = "claude-3-5-haiku-20241022";
const FETCH_TIMEOUT = 10_000;
const ARTICLE_LIMIT = 4_500;

function envInt(name: string, fallback: number): number {
  const raw = process.env[name];
  if (raw === undefined || raw === "") return fallback;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed < 0) throw new Error(`${name} must be a non-negative integer.`);
  return parsed;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function hostFromUrl(url: string | undefined): string {
  if (!url) return "";
  try {
    return new URL(url).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return "";
  }
}

function isSafeHttpUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return false;
    const host = parsed.hostname.toLowerCase();
    return !(
      host === "localhost" ||
      host.endsWith(".local") ||
      host === "0.0.0.0" ||
      host.startsWith("127.") ||
      host.startsWith("10.") ||
      host.startsWith("192.168.") ||
      host.startsWith("169.254.") ||
      /^172\.(1[6-9]|2\d|3[0-1])\./.test(host) ||
      host === "::1" ||
      host === "[::1]"
    );
  } catch {
    return false;
  }
}

function decodeHtmlEntities(text: string): string {
  const named: Record<string, string> = {
    amp: "&",
    apos: "'",
    gt: ">",
    lt: "<",
    nbsp: " ",
    quot: "\"",
  };

  return text.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (_, entity: string) => {
    const key = entity.toLowerCase();
    if (named[key]) return named[key];
    if (key.startsWith("#x")) {
      const value = Number.parseInt(key.slice(2), 16);
      return Number.isFinite(value) ? String.fromCodePoint(value) : "";
    }
    if (key.startsWith("#")) {
      const value = Number.parseInt(key.slice(1), 10);
      return Number.isFinite(value) ? String.fromCodePoint(value) : "";
    }
    return "";
  });
}

function htmlToText(html: string): string {
  return decodeHtmlEntities(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
      .replace(/<!--[\s\S]*?-->/g, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
  );
}

function extractTitle(html: string): string | undefined {
  const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1];
  return title ? htmlToText(title).slice(0, 180) : undefined;
}

async function fetchSourceEvidence(sourceUrl: string | undefined): Promise<SourceEvidence> {
  const url = (sourceUrl ?? "").trim();
  const domain = hostFromUrl(url);
  if (!url) return { url, domain, fetched: false, status: "No source URL on event." };
  if (!isSafeHttpUrl(url)) return { url, domain, fetched: false, status: "Skipped unsafe or non-public source URL." };

  try {
    const response = await fetch(url, {
      headers: {
        accept: "text/html,application/xhtml+xml,text/plain;q=0.8,*/*;q=0.2",
        "user-agent": "HopeIndexAI/0.1 phase1-eval-review-bot",
      },
      signal: AbortSignal.timeout(FETCH_TIMEOUT),
    });

    if (!response.ok) {
      return { url, domain, fetched: false, status: `Source fetch failed with HTTP ${response.status}.` };
    }

    const raw = await response.text();
    const clipped = raw.slice(0, 400_000);
    const text = htmlToText(clipped);
    if (!text) return { url, domain, fetched: false, status: "Source fetched, but no readable text was extracted." };

    return {
      url,
      domain,
      fetched: true,
      status: "Source article text extracted.",
      title: extractTitle(clipped),
      excerpt: text.slice(0, ARTICLE_LIMIT),
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { url, domain, fetched: false, status: `Source fetch failed: ${msg}` };
  }
}

function readJsonl<T>(text: string): T[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, index) => {
      try {
        return JSON.parse(line) as T;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        throw new Error(`Invalid JSONL on line ${index + 1}: ${msg}`);
      }
    });
}

function writeJsonl(rows: unknown[]): string {
  return rows.map((row) => JSON.stringify(row)).join("\n") + "\n";
}

async function loadEvents(): Promise<Map<string, GdeltEvent>> {
  const parsed = JSON.parse(await readFile(EVENTS_PATH, "utf8"));
  if (!parsed || !Array.isArray(parsed.events)) throw new Error(`${EVENTS_PATH} must contain an events array.`);
  return new Map(parsed.events.map((event: GdeltEvent) => [event.id, event]));
}

async function loadLabels(): Promise<Phase1Label[]> {
  return readJsonl<Phase1Label>(await readFile(LABEL_PATH, "utf8"));
}

function eventTitle(event: GdeltEvent): string {
  if (event.actor1 && event.actor1 !== "Unknown") {
    return `${event.actor1}${event.actor2 && event.actor2 !== "Unknown" ? ` -> ${event.actor2}` : ""}`;
  }
  return event.quadLabel;
}

function buildPrompt(event: GdeltEvent, source: SourceEvidence): string {
  return `You are reviewing one HopeIndexAI Phase 1 eval label.

Use the article language when available, but do not blindly trust dramatic wording. GDELT is noisy.

Return ONLY valid raw JSON with these keys:
{
  "important": boolean,
  "categoryCorrect": boolean,
  "severityCorrect": boolean,
  "summaryQuality": number | null,
  "confidence": number,
  "evidenceGrade": "thin" | "partial" | "strong",
  "rationale": string,
  "importantRationale": string,
  "categoryRationale": string,
  "severityRationale": string
}

Label meanings:
- important: true if this should be surfaced as an important geopolitical/public-interest event; false if it is narrow, repetitive, weakly evidenced, or mostly noise.
- categoryCorrect: true if doom/bloom matches the article. Doom means harm, conflict, coercion, risk, repression, disaster, or escalation. Bloom means cooperation, aid, discovery, de-escalation, constructive agreement, or useful progress.
- severityCorrect: true if low/medium/high/critical is reasonable. Critical should involve major violence, state-level escalation, major humanitarian stress, disaster, or broad geopolitical consequence. Do not mark critical correct just because the Goldstein score is extreme.
- summaryQuality: null if no AI summary is provided; otherwise 1-5.
- confidence: 0 to 1.
- rationale fields: short paraphrases. Do not copy long article text.

Event:
- ID: ${event.id}
- Date: ${event.date}
- Title from actors: ${eventTitle(event)}
- Location: ${event.location || event.country}
- Country/continent: ${event.country || "n/a"} / ${event.continent || "n/a"}
- Current category: ${event.category}
- Theme: ${event.theme ?? "unknown"}
- Current severity: ${event.severity}
- GDELT class: ${event.quadLabel}
- Goldstein: ${event.goldstein ?? "n/a"}
- Average tone: ${event.avgTone ?? "n/a"}
- Mentions: ${event.numMentions ?? 0}
- Marker radius: ${event.markerRadius ?? "n/a"}
- AI summary: ${event.aiSummary ?? "none"}
- Source URL: ${source.url || "none"}

Source:
- Domain: ${source.domain || "unknown"}
- Fetch status: ${source.status}
- Title: ${source.title ?? "unknown"}
- Excerpt: ${source.excerpt ?? "No readable source text available."}`;
}

function extractJsonObject(text: string): unknown {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error(`LLM response did not contain a JSON object: ${text.slice(0, 200)}`);
  }
  return JSON.parse(text.slice(start, end + 1));
}

function validateReview(value: unknown): LlmReview {
  const row = value as LlmReview;
  if (!row || typeof row !== "object") throw new Error("LLM review must be an object.");
  if (typeof row.important !== "boolean") throw new Error("LLM review important must be boolean.");
  if (typeof row.categoryCorrect !== "boolean") throw new Error("LLM review categoryCorrect must be boolean.");
  if (typeof row.severityCorrect !== "boolean") throw new Error("LLM review severityCorrect must be boolean.");
  if (row.summaryQuality !== null && (typeof row.summaryQuality !== "number" || row.summaryQuality < 1 || row.summaryQuality > 5)) {
    throw new Error("LLM review summaryQuality must be null or 1-5.");
  }
  if (typeof row.confidence !== "number" || row.confidence < 0 || row.confidence > 1) {
    throw new Error("LLM review confidence must be 0-1.");
  }
  if (!["thin", "partial", "strong"].includes(row.evidenceGrade)) {
    throw new Error("LLM review evidenceGrade must be thin, partial, or strong.");
  }

  return {
    important: row.important,
    categoryCorrect: row.categoryCorrect,
    severityCorrect: row.severityCorrect,
    summaryQuality: row.summaryQuality,
    confidence: Number(row.confidence.toFixed(3)),
    evidenceGrade: row.evidenceGrade,
    rationale: String(row.rationale ?? "").slice(0, 500),
    importantRationale: String(row.importantRationale ?? "").slice(0, 500),
    categoryRationale: String(row.categoryRationale ?? "").slice(0, 500),
    severityRationale: String(row.severityRationale ?? "").slice(0, 500),
  };
}

async function callAnthropic(prompt: string, apiKey: string, model: string): Promise<LlmReview> {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model,
      max_tokens: 600,
      temperature: 0,
      messages: [{ role: "user", content: prompt }],
    }),
    signal: AbortSignal.timeout(30_000),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`Anthropic review failed with HTTP ${response.status}: ${text.slice(0, 300)}`);
  }

  const data = await response.json() as any;
  const text = Array.isArray(data.content)
    ? data.content.map((part: any) => part?.text ?? "").join("\n").trim()
    : "";
  return validateReview(extractJsonObject(text));
}

function reviewToLabel(previous: Phase1Label, event: GdeltEvent, source: SourceEvidence, review: LlmReview, model: string): Phase1Label {
  return {
    ...previous,
    labelSource: "llm_article_review",
    humanReviewed: false,
    reviewedBy: `anthropic:${model}`,
    reviewedAt: new Date().toISOString(),
    labels: {
      important: review.important,
      categoryCorrect: review.categoryCorrect,
      severityCorrect: review.severityCorrect,
      summaryQuality: review.summaryQuality,
    },
    reviewContext: {
      ...(previous.reviewContext ?? {}),
      date: event.date,
      title: eventTitle(event),
      country: event.country,
      continent: event.continent,
      theme: event.theme,
      category: event.category,
      severity: event.severity,
      goldstein: event.goldstein,
      avgTone: event.avgTone,
      numMentions: event.numMentions,
      markerRadius: event.markerRadius,
      sourceDomain: source.domain,
      sourceUrl: source.url,
      sourceFetched: source.fetched,
      sourceStatus: source.status,
      sourceTitle: source.title,
      llmModel: model,
      llmConfidence: review.confidence,
      evidenceGrade: review.evidenceGrade,
      rationale: review.rationale,
      importantRationale: review.importantRationale,
      categoryRationale: review.categoryRationale,
      severityRationale: review.severityRationale,
    },
    notes: "LLM article review. Useful for triage, but not a human-reviewed ground-truth label.",
  };
}

async function main() {
  const limit = envInt("PHASE1_REVIEW_LIMIT", Number.MAX_SAFE_INTEGER);
  const force = process.env.PHASE1_REVIEW_FORCE === "1";
  const model = process.env.ANTHROPIC_REVIEW_MODEL ?? process.env.ANTHROPIC_MODEL ?? DEFAULT_MODEL;
  const apiKey = process.env.ANTHROPIC_API_KEY ?? "";

  const eventsById = await loadEvents();
  const labels = await loadLabels();
  const reviewIndexes = labels
    .map((label, index) => ({ label, index }))
    .filter(({ label }) => label.labelSource !== "human")
    .filter(({ label }) => force || label.labelSource !== "llm_article_review")
    .filter(({ label }) => eventsById.has(label.eventId))
    .slice(0, limit);

  if (reviewIndexes.length === 0) {
    console.log("HopeIndexAI Phase 1 LLM review -> no labels selected.");
    return;
  }

  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY is required for LLM article review.");
  }

  const errors: unknown[] = [];
  let reviewed = 0;

  for (const { label, index } of reviewIndexes) {
    const event = eventsById.get(label.eventId);
    if (!event) continue;

    try {
      const source = await fetchSourceEvidence(event.sourceUrl);
      const review = await callAnthropic(buildPrompt(event, source), apiKey, model);
      labels[index] = reviewToLabel(label, event, source, review, model);
      reviewed++;
      console.log(`Reviewed ${reviewed}/${reviewIndexes.length}: ${event.id}`);
      await sleep(250);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      errors.push({
        eventId: event.id,
        sourceUrl: event.sourceUrl,
        error: message,
        failedAt: new Date().toISOString(),
      });
      console.warn(`Review failed for ${event.id}: ${message}`);
    }
  }

  await mkdir(dirname(LABEL_PATH), { recursive: true });
  await writeFile(LABEL_PATH, writeJsonl(labels));
  await writeFile(ERRORS_PATH, errors.length ? writeJsonl(errors) : "");

  console.log(`HopeIndexAI Phase 1 LLM review -> reviewed ${reviewed}/${reviewIndexes.length} labels.`);
  console.log(`Updated ${LABEL_PATH}`);
  if (errors.length > 0) console.log(`Review errors written to ${ERRORS_PATH}`);
}

main().catch((err) => {
  console.error("HopeIndexAI Phase 1 LLM review failed:", err);
  process.exit(1);
});
