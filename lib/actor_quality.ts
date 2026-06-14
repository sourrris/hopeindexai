/**
 * Actor / extraction quality helpers for GDELT event ingestion.
 */

const NOISY_ACTOR_TOKENS = new Set([
  "TELUGU", "NETFLIX", "WEBSITE", "PRODUCER", "Unknown", "UNKNOWN",
  "ACTOR", "BUSINESS", "COMPANY", "MEDIA", "AUTHORITIES", "ADMINISTRATION",
  "COMMUNITY", "DETECTIVE", "FIGHTER", "PROTESTER", "RIOTER", "ASSAILANT",
]);

const GENERIC_ACTOR_TOKENS = new Set([
  "GOVERNMENT", "MINISTRY", "STATE", "STATES", "OFFICIAL", "OFFICIALS",
  "POLICE", "PRESIDENT", "PRIME", "MINISTER", "CITIZEN", "CIVILIAN",
]);

export function isNoisyActor(actor: string | undefined): boolean {
  if (!actor || actor === "Unknown") return true;
  const upper = actor.toUpperCase();
  if (NOISY_ACTOR_TOKENS.has(upper)) return true;
  if (upper.split(/[^A-Z0-9]+/).some((token) => NOISY_ACTOR_TOKENS.has(token))) return true;
  return false;
}

export function isGenericActor(actor: string | undefined): boolean {
  if (!actor || actor === "Unknown") return true;
  const upper = actor.toUpperCase();
  if (GENERIC_ACTOR_TOKENS.has(upper)) return true;
  return upper.split(/[^A-Z0-9]+/).some((token) => GENERIC_ACTOR_TOKENS.has(token));
}

export interface ExtractionConfidenceInput {
  actor1: string;
  actor2: string;
  sourceUrl?: string;
  title?: string;
  sourceReachable?: boolean;
}

export function computeExtractionConfidence(input: ExtractionConfidenceInput): number {
  let score = 1.0;

  if (isNoisyActor(input.actor1)) score -= 0.35;
  else if (isGenericActor(input.actor1)) score -= 0.15;

  if (isNoisyActor(input.actor2)) score -= 0.25;
  else if (isGenericActor(input.actor2)) score -= 0.10;

  if (!input.sourceUrl || !input.sourceUrl.startsWith("http")) {
    score -= 0.20;
  } else if (input.sourceReachable === false) {
    score -= 0.10;
  } else if (input.sourceReachable === true) {
    score += 0.05;
  }

  if (input.title && input.title.length > 5) {
    score += 0.10;
  } else {
    score -= 0.05;
  }

  return Math.max(0, Math.min(1, Number(score.toFixed(3))));
}
