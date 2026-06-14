import { promises as fs } from "fs";
import { join } from "path";

const CONFIDENCE_LEVELS = new Set(["low", "medium", "high", "unknown"]);
const QUAL_LEVELS = new Set(["weak", "medium", "strong"]);

interface ValidationError {
  line: number;
  person_id?: string;
  message: string;
}

export function validateProfile(profile: any, lineNum: number): ValidationError[] {
  const errors: ValidationError[] = [];
  const addError = (msg: string) => errors.push({ line: lineNum, person_id: profile?.person_id || "unknown", message: msg });

  if (!profile || typeof profile !== "object") {
    addError("Profile must be a valid JSON object");
    return errors;
  }

  // 1. Core identifying info
  if (typeof profile.person_id !== "string" || !profile.person_id) addError("person_id is missing or not a string");
  if (typeof profile.name !== "string" || !profile.name) addError("name is missing or not a string");
  if (!Array.isArray(profile.aliases)) addError("aliases must be an array");
  if (profile.birth_year !== null && typeof profile.birth_year !== "number") addError("birth_year must be a number or null");
  if (profile.death_year !== null && typeof profile.death_year !== "number") addError("death_year must be a number or null");
  if (!Array.isArray(profile.countries_or_regions) || profile.countries_or_regions.length === 0) addError("countries_or_regions must be a non-empty array");
  if (typeof profile.era !== "string") addError("era must be a string");
  if (!Array.isArray(profile.roles) || profile.roles.length === 0) addError("roles must be a non-empty array");
  if (!Array.isArray(profile.domains)) addError("domains must be an array");
  if (typeof profile.priority_tier !== "number") addError("priority_tier must be a number");
  if (typeof profile.short_summary !== "string" || !profile.short_summary) addError("short_summary is missing or not a string");

  // 2. Timeline
  if (!Array.isArray(profile.timeline)) {
    addError("timeline must be an array");
  } else {
    profile.timeline.forEach((item: any, idx: number) => {
      if (typeof item !== "object" || !item) {
        addError(`timeline[${idx}] must be an object`);
        return;
      }
      if (!item.date_or_year) addError(`timeline[${idx}].date_or_year is missing`);
      if (!item.event) addError(`timeline[${idx}].event is missing`);
      if (!CONFIDENCE_LEVELS.has(item.importance)) addError(`timeline[${idx}].importance is invalid`);
      if (!Array.isArray(item.sources)) addError(`timeline[${idx}].sources must be an array`);
    });
  }

  // 3. Geopolitical Power Base & Constraints
  if (typeof profile.power_base !== "string" || !profile.power_base) addError("power_base is missing or not a string");
  if (!Array.isArray(profile.core_goals) || profile.core_goals.length === 0) addError("core_goals must be a non-empty array");
  if (!Array.isArray(profile.incentives)) addError("incentives must be an array");
  if (!Array.isArray(profile.constraints)) addError("constraints must be an array");
  if (!Array.isArray(profile.allies)) addError("allies must be an array");
  if (!Array.isArray(profile.rivals)) addError("rivals must be an array");
  if (!Array.isArray(profile.institutions_controlled_or_influenced)) addError("institutions_controlled_or_influenced must be an array");

  // 4. Ideology / Worldview
  if (typeof profile.ideology_or_worldview !== "object" || !profile.ideology_or_worldview) {
    addError("ideology_or_worldview is missing or not an object");
  } else {
    const iw = profile.ideology_or_worldview;
    if (typeof iw.summary !== "string" || !iw.summary) addError("ideology_or_worldview.summary is missing or not a string");
    if (!Array.isArray(iw.evidence)) addError("ideology_or_worldview.evidence must be an array");
    if (!CONFIDENCE_LEVELS.has(iw.confidence)) addError("ideology_or_worldview.confidence must be low/medium/high/unknown");
  }

  // 5. Decision & Behavioral Patterns
  if (!Array.isArray(profile.decision_patterns)) {
    addError("decision_patterns must be an array");
  } else {
    profile.decision_patterns.forEach((dp: any, idx: number) => {
      if (typeof dp !== "object" || !dp) {
        addError(`decision_patterns[${idx}] must be an object`);
        return;
      }
      if (typeof dp.pattern !== "string" || !dp.pattern) addError(`decision_patterns[${idx}].pattern is missing or not a string`);
      if (!Array.isArray(dp.examples)) addError(`decision_patterns[${idx}].examples must be an array`);
      if (!CONFIDENCE_LEVELS.has(dp.confidence)) addError(`decision_patterns[${idx}].confidence must be low/medium/high/unknown`);
    });
  }

  if (typeof profile.crisis_behavior !== "string" || !profile.crisis_behavior) addError("crisis_behavior is missing or not a string");
  if (typeof profile.negotiation_style !== "string" || !profile.negotiation_style) addError("negotiation_style is missing or not a string");

  // Behavior metrics
  const validMetrics = new Set(["low", "medium", "high", "unknown"]);
  if (!validMetrics.has(profile.risk_tolerance)) addError("risk_tolerance must be low/medium/high/unknown");
  if (!validMetrics.has(profile.centralization_preference)) addError("centralization_preference must be low/medium/high/unknown");
  if (!validMetrics.has(profile.conflict_preference)) addError("conflict_preference must be low/medium/high/unknown");
  if (!validMetrics.has(profile.institutional_respect)) addError("institutional_respect must be low/medium/high/unknown");
  if (!validMetrics.has(profile.coalition_dependency)) addError("coalition_dependency must be low/medium/high/unknown");
  if (!validMetrics.has(profile.populism_level)) addError("populism_level must be low/medium/high/unknown");
  if (!validMetrics.has(profile.technocratic_level)) addError("technocratic_level must be low/medium/high/unknown");

  // 6. Game Theory
  if (typeof profile.game_theory_profile !== "object" || !profile.game_theory_profile) {
    addError("game_theory_profile is missing or not an object");
  } else {
    const gt = profile.game_theory_profile;
    if (!Array.isArray(gt.main_players)) addError("game_theory_profile.main_players must be an array");
    if (!Array.isArray(gt.likely_objectives)) addError("game_theory_profile.likely_objectives must be an array");
    if (!Array.isArray(gt.payoffs)) addError("game_theory_profile.payoffs must be an array");
    if (!Array.isArray(gt.constraints)) addError("game_theory_profile.constraints must be an array");
    if (!Array.isArray(gt.common_strategic_moves)) addError("game_theory_profile.common_strategic_moves must be an array");
    if (!Array.isArray(gt.failure_modes)) addError("game_theory_profile.failure_modes must be an array");
  }

  // 7. Bayesian Assessment
  if (!Array.isArray(profile.bayesian_assessment)) {
    addError("bayesian_assessment must be an array");
  } else {
    profile.bayesian_assessment.forEach((ba: any, idx: number) => {
      if (typeof ba !== "object" || !ba) {
        addError(`bayesian_assessment[${idx}] must be an object`);
        return;
      }
      if (typeof ba.claim !== "string" || !ba.claim) addError(`bayesian_assessment[${idx}].claim is missing or not a string`);
      if (!CONFIDENCE_LEVELS.has(ba.prior_confidence)) addError(`bayesian_assessment[${idx}].prior_confidence must be low/medium/high/unknown`);
      if (!Array.isArray(ba.evidence)) addError(`bayesian_assessment[${idx}].evidence must be an array`);
      if (!CONFIDENCE_LEVELS.has(ba.posterior_confidence)) addError(`bayesian_assessment[${idx}].posterior_confidence must be low/medium/high/unknown`);
      if (typeof ba.what_would_change_this !== "string") addError(`bayesian_assessment[${idx}].what_would_change_this must be a string`);
    });
  }

  // 8. Historical Comparisons
  if (!Array.isArray(profile.historical_comparisons)) {
    addError("historical_comparisons must be an array");
  } else {
    profile.historical_comparisons.forEach((hc: any, idx: number) => {
      if (typeof hc !== "object" || !hc) {
        addError(`historical_comparisons[${idx}] must be an object`);
        return;
      }
      if (typeof hc.compared_to !== "string" || !hc.compared_to) addError(`historical_comparisons[${idx}].compared_to is missing or not a string`);
      if (!Array.isArray(hc.similarities)) addError(`historical_comparisons[${idx}].similarities must be an array`);
      if (!Array.isArray(hc.differences)) addError(`historical_comparisons[${idx}].differences must be an array`);
      if (!CONFIDENCE_LEVELS.has(hc.confidence)) addError(`historical_comparisons[${idx}].confidence must be low/medium/high/unknown`);
    });
  }

  // 9. Sources & Metadata
  if (typeof profile.source_quality !== "object" || !profile.source_quality) {
    addError("source_quality is missing or not an object");
  } else {
    const sq = profile.source_quality;
    if (!QUAL_LEVELS.has(sq.overall)) addError("source_quality.overall must be weak/medium/strong");
    if (typeof sq.notes !== "string") addError("source_quality.notes must be a string");
    if (typeof sq.source_count !== "number") addError("source_quality.source_count must be a number");
  }

  if (!Array.isArray(profile.sources) || profile.sources.length === 0) addError("sources must be a non-empty array");
  if (!Array.isArray(profile.research_gaps)) addError("research_gaps must be an array");
  if (typeof profile.created_at !== "string" || !profile.created_at) addError("created_at must be a string");
  if (typeof profile.updated_at !== "string" || !profile.updated_at) addError("updated_at must be a string");

  return errors;
}

async function runValidation() {
  const filePath = join(process.cwd(), "data/profiles.jsonl");
  console.log(`Loading and validating profiles from: ${filePath}`);

  try {
    const data = await fs.readFile(filePath, "utf8");
    const lines = data.split("\n").filter(line => line.trim() !== "");
    let totalErrors = 0;

    console.log(`Found ${lines.length} profiles to validate.`);

    lines.forEach((line, index) => {
      const lineNum = index + 1;
      try {
        const profile = JSON.parse(line);
        const errors = validateProfile(profile, lineNum);
        if (errors.length > 0) {
          console.error(`\nLine ${lineNum} [${profile.person_id || "unknown"}]: ${errors.length} errors found:`);
          errors.forEach(err => console.error(`  - ${err.message}`));
          totalErrors += errors.length;
        } else {
          console.log(`Line ${lineNum} [${profile.person_id}]: PASSED`);
        }
      } catch (err: any) {
        console.error(`Line ${lineNum}: Invalid JSON syntax - ${err.message}`);
        totalErrors++;
      }
    });

    if (totalErrors > 0) {
      console.error(`\nValidation FAILED with ${totalErrors} total errors.`);
      process.exit(1);
    } else {
      console.log("\nAll profiles validated successfully. 100% schema conformance!");
      process.exit(0);
    }
  } catch (err: any) {
    if (err.code === "ENOENT") {
      console.log("No profiles found yet. Empty validation passed.");
      process.exit(0);
    }
    console.error("Fatal validation error:", err);
    process.exit(1);
  }
}

// Only run if executed directly
if (import.meta.main || require.main === module) {
  runValidation();
}
