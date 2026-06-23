import { readFile, writeFile } from "fs/promises";

type EvidenceGrade = "thin" | "partial" | "strong";

interface Phase1Label {
  eventId: string;
  labelVersion: "phase1.v1";
  labelSource: "human" | "llm_article_review" | "bootstrap_current_rules";
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

interface CodexSourceReview {
  eventId: string;
  sourceStatus: string;
  articleSummary: string;
  important: boolean;
  categoryCorrect: boolean;
  severityCorrect: boolean;
  evidenceGrade: EvidenceGrade;
  rationale: string;
}

const LABEL_PATH = "data/eval/phase1_labels.jsonl";
const REVIEW_PATH = "data/eval/phase1_codex_source_reviews.jsonl";
const REVIEW_VERSION = "phase1.codex-source-review.v1";
const REVIEWER = "codex:gpt-5-source-triage-subagents";

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

function validateReview(review: CodexSourceReview): CodexSourceReview {
  if (!review.eventId || typeof review.eventId !== "string") throw new Error("Review missing eventId.");
  if (typeof review.sourceStatus !== "string") throw new Error(`Review ${review.eventId} missing sourceStatus.`);
  if (typeof review.articleSummary !== "string") throw new Error(`Review ${review.eventId} missing articleSummary.`);
  if (typeof review.important !== "boolean") throw new Error(`Review ${review.eventId} important must be boolean.`);
  if (typeof review.categoryCorrect !== "boolean") throw new Error(`Review ${review.eventId} categoryCorrect must be boolean.`);
  if (typeof review.severityCorrect !== "boolean") throw new Error(`Review ${review.eventId} severityCorrect must be boolean.`);
  if (!["thin", "partial", "strong"].includes(review.evidenceGrade)) {
    throw new Error(`Review ${review.eventId} evidenceGrade must be thin, partial, or strong.`);
  }
  if (typeof review.rationale !== "string") throw new Error(`Review ${review.eventId} missing rationale.`);
  return review;
}

async function main() {
  const labels = readJsonl<Phase1Label>(await readFile(LABEL_PATH, "utf8"));
  const reviews = readJsonl<CodexSourceReview>(await readFile(REVIEW_PATH, "utf8")).map(validateReview);
  const reviewById = new Map<string, CodexSourceReview>();

  for (const review of reviews) {
    if (reviewById.has(review.eventId)) throw new Error(`Duplicate Codex source review for ${review.eventId}.`);
    reviewById.set(review.eventId, review);
  }

  let applied = 0;
  let preservedHuman = 0;
  const missing: string[] = [];
  const reviewedAt = new Date().toISOString();

  const next = labels.map((label) => {
    if (label.labelSource === "human" && label.humanReviewed) {
      preservedHuman++;
      return label;
    }

    const review = reviewById.get(label.eventId);
    if (!review) {
      missing.push(label.eventId);
      return label;
    }

    applied++;
    return {
      ...label,
      labelSource: "llm_article_review",
      humanReviewed: false,
      reviewedBy: REVIEWER,
      reviewedAt,
      labels: {
        important: review.important,
        categoryCorrect: review.categoryCorrect,
        severityCorrect: review.severityCorrect,
        summaryQuality: label.labels.summaryQuality,
      },
      reviewContext: {
        ...(label.reviewContext ?? {}),
        codexSourceReviewVersion: REVIEW_VERSION,
        codexSourceStatus: review.sourceStatus,
        codexArticleSummary: review.articleSummary,
        codexSourceRationale: review.rationale,
        evidenceGrade: review.evidenceGrade,
        rationale: review.rationale,
      },
      notes: "Codex source review. Useful for triage, but not human-reviewed ground truth.",
    } satisfies Phase1Label;
  });

  if (missing.length > 0) {
    throw new Error(`Missing Codex source reviews for ${missing.length} non-human label(s): ${missing.join(", ")}`);
  }

  await writeFile(LABEL_PATH, writeJsonl(next));
  console.log(`Applied Codex source reviews to ${applied} non-human labels.`);
  console.log(`Preserved ${preservedHuman} human-reviewed labels.`);
  console.log(`Updated ${LABEL_PATH}`);
}

main().catch((err) => {
  console.error("Failed to apply Codex source reviews:", err);
  process.exit(1);
});
