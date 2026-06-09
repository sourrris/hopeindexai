import { readFile, writeFile } from "fs/promises";

type Review = {
  id: string;
  important: boolean;
  categoryCorrect: boolean;
  severityCorrect: boolean;
  score: number;
  evidenceGrade: "thin" | "partial" | "strong";
  rationale: string;
};

type Phase1Label = {
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
};

type EventRow = {
  id: string;
  date: string;
  category: string;
  theme?: string;
  severity: string;
  goldstein: number | null;
  avgTone: number | null;
  numMentions: number;
  actor1: string;
  actor2: string;
  country: string;
  continent: string;
  sourceUrl: string;
};

const LABEL_PATH = "data/eval/phase1_labels.jsonl";
const EVENTS_PATH = "public/data/events.json";
const REVIEWER = "codex:gpt-5-intelligence-triage";

function printHelp() {
  console.log(`HopeIndexAI Phase 1 Codex review

Usage:
  bun run review:phase1:codex

Applies the built-in Codex intelligence-triage pass to Phase 1 labels.
It writes labelSource="llm_article_review" and humanReviewed=false.
Human-reviewed labels are preserved.
`);
}

const reviews: Review[] = [
  { id: "1306306477", important: true, categoryCorrect: true, severityCorrect: true, score: 92, evidenceGrade: "strong", rationale: "Israel-Hamas leadership strike affects an active war and negotiation incentives." },
  { id: "1306529040", important: true, categoryCorrect: true, severityCorrect: true, score: 88, evidenceGrade: "strong", rationale: "Reported Israeli strikes in Lebanon with fatalities are cross-border conflict signal." },
  { id: "1306696351", important: true, categoryCorrect: true, severityCorrect: true, score: 90, evidenceGrade: "strong", rationale: "Lebanese PM warning about Israeli escalation is a state-level conflict signal." },
  { id: "1306445276", important: true, categoryCorrect: true, severityCorrect: true, score: 85, evidenceGrade: "strong", rationale: "UN de-escalation call on Ukraine is a live international security signal." },
  { id: "1306668755", important: false, categoryCorrect: false, severityCorrect: false, score: 45, evidenceGrade: "partial", rationale: "Official briefing source is broad, but this extracted row is too generic to surface as a concrete material-conflict event." },
  { id: "1305740156", important: false, categoryCorrect: true, severityCorrect: false, score: 25, evidenceGrade: "strong", rationale: "Australian double-murder reward is serious local crime, not strategic public-interest signal for this product." },
  { id: "1306132828", important: false, categoryCorrect: true, severityCorrect: false, score: 35, evidenceGrade: "partial", rationale: "Media-criticism article around Gaza reporting is conflict discourse, not a fresh operational event." },
  { id: "1306306649", important: false, categoryCorrect: true, severityCorrect: false, score: 20, evidenceGrade: "strong", rationale: "Romance-scam arrest is local criminal enforcement, not geopolitical signal." },
  { id: "1305916173", important: false, categoryCorrect: false, severityCorrect: false, score: 5, evidenceGrade: "strong", rationale: "Entertainment article was mis-extracted as conflict." },
  { id: "1306093364", important: false, categoryCorrect: true, severityCorrect: false, score: 25, evidenceGrade: "strong", rationale: "Colorado shooting trial is local crime and not critical geopolitical signal." },
  { id: "1306579538", important: true, categoryCorrect: true, severityCorrect: false, score: 65, evidenceGrade: "partial", rationale: "Federal-local conflict around ICE detention protests is domestic governance signal, but not critical severity." },
  { id: "1306479871", important: false, categoryCorrect: true, severityCorrect: false, score: 35, evidenceGrade: "partial", rationale: "Broad neo-authoritarian-bloc analysis is not a discrete current event row." },
  { id: "1305803082", important: false, categoryCorrect: false, severityCorrect: false, score: 10, evidenceGrade: "strong", rationale: "Bulgarian fuel-price article was incorrectly mapped to Iran conflict." },
  { id: "1305718582", important: false, categoryCorrect: true, severityCorrect: false, score: 25, evidenceGrade: "strong", rationale: "Murder-for-hire arrest is local crime, not strategic signal." },
  { id: "1305740081", important: true, categoryCorrect: true, severityCorrect: true, score: 82, evidenceGrade: "strong", rationale: "Missiles near Azerbaijan embassy in Kyiv add diplomatic risk to Ukraine war." },
  { id: "1306056078", important: true, categoryCorrect: true, severityCorrect: false, score: 68, evidenceGrade: "partial", rationale: "Russian escalation rhetoric is watchlist-relevant, but article is analytical rather than a critical event." },
  { id: "1306184462", important: false, categoryCorrect: false, severityCorrect: false, score: 10, evidenceGrade: "strong", rationale: "Veteran home-building story is a human-interest article misread as conflict." },
  { id: "1306696358", important: true, categoryCorrect: true, severityCorrect: true, score: 92, evidenceGrade: "strong", rationale: "Strike killing a Gaza hospital department head is live humanitarian conflict signal." },
  { id: "1305915959", important: true, categoryCorrect: true, severityCorrect: true, score: 86, evidenceGrade: "strong", rationale: "North Korean missile activity is regional security signal." },
  { id: "1306132119", important: true, categoryCorrect: true, severityCorrect: true, score: 88, evidenceGrade: "strong", rationale: "Ceasefire-busting Middle East attacks affect conflict escalation and diplomacy." },
  { id: "1306617011", important: true, categoryCorrect: true, severityCorrect: true, score: 90, evidenceGrade: "strong", rationale: "Russian drone impact in Romania creates NATO-adjacent escalation risk." },
  { id: "1306734800", important: true, categoryCorrect: true, severityCorrect: false, score: 62, evidenceGrade: "strong", rationale: "Large anti-Netanyahu protest is politically relevant, but not a critical material-conflict event." },
  { id: "1306011426", important: true, categoryCorrect: false, severityCorrect: false, score: 61, evidenceGrade: "strong", rationale: "Iran internet restoration is civil-control signal, but the row direction is more de-escalatory than doom." },
  { id: "1306231264", important: false, categoryCorrect: true, severityCorrect: false, score: 10, evidenceGrade: "strong", rationale: "Netflix true-crime documentary is not current geopolitical signal." },
  { id: "1305718936", important: true, categoryCorrect: true, severityCorrect: true, score: 88, evidenceGrade: "thin", rationale: "Police storming opposition offices is state-repression signal despite source fetch timeout." },
  { id: "1306183860", important: true, categoryCorrect: true, severityCorrect: true, score: 93, evidenceGrade: "strong", rationale: "IDF airstrikes and Hezbollah drone surge are direct cross-border escalation." },
  { id: "1306306855", important: false, categoryCorrect: true, severityCorrect: true, score: 45, evidenceGrade: "strong", rationale: "Duplicate extraction from the same Hamas-leader strike story; cluster matters, this row should not surface separately." },
  { id: "1306528768", important: false, categoryCorrect: true, severityCorrect: false, score: 55, evidenceGrade: "strong", rationale: "Ghana-Malema diplomatic spat is public-interest context but below surfacing threshold." },
  { id: "1306055520", important: true, categoryCorrect: true, severityCorrect: false, score: 64, evidenceGrade: "strong", rationale: "US redistricting battle is governance risk signal, but not critical severity." },
  { id: "1306669838", important: true, categoryCorrect: true, severityCorrect: true, score: 85, evidenceGrade: "partial", rationale: "Claimed Russian advances are Ukraine-war battlefield signal; source framing needs caution." },
  { id: "1305740000", important: false, categoryCorrect: true, severityCorrect: false, score: 45, evidenceGrade: "strong", rationale: "Australian party-formation story is domestic politics and not high-signal for global event surfacing." },
  { id: "1306479693", important: true, categoryCorrect: true, severityCorrect: true, score: 75, evidenceGrade: "strong", rationale: "India-France multipolar-world cooperation is strategic diplomacy signal." },
  { id: "1306055788", important: true, categoryCorrect: false, severityCorrect: true, score: 70, evidenceGrade: "strong", rationale: "Synagogue terror-attack arrest is important, but the event is doom rather than bloom." },
  { id: "1305740458", important: false, categoryCorrect: true, severityCorrect: false, score: 35, evidenceGrade: "strong", rationale: "Duplicate Australian party-plan row; do not surface separately." },
  { id: "1306231388", important: false, categoryCorrect: true, severityCorrect: false, score: 40, evidenceGrade: "strong", rationale: "Laos cave rescue is humanitarian interest, but not strategic enough for this eval." },
  { id: "1305740457", important: false, categoryCorrect: true, severityCorrect: false, score: 35, evidenceGrade: "strong", rationale: "Duplicate Australian party-plan row; do not surface separately." },
  { id: "1305851420", important: true, categoryCorrect: true, severityCorrect: true, score: 80, evidenceGrade: "strong", rationale: "China-Pakistan CPEC advancement is strategic infrastructure diplomacy." },
  { id: "1306010628", important: true, categoryCorrect: true, severityCorrect: true, score: 82, evidenceGrade: "strong", rationale: "US-Iran talks under tension are high-stakes strategic diplomacy; this is the representative row for the source cluster." },
  { id: "1306011761", important: false, categoryCorrect: true, severityCorrect: true, score: 45, evidenceGrade: "strong", rationale: "Duplicate row from the same US-Iran talks article." },
  { id: "1306011835", important: false, categoryCorrect: true, severityCorrect: true, score: 45, evidenceGrade: "strong", rationale: "Duplicate row from the same US-Iran talks article." },
  { id: "1306011919", important: false, categoryCorrect: true, severityCorrect: true, score: 45, evidenceGrade: "strong", rationale: "Duplicate row from the same US-Iran talks article." },
  { id: "1306358950", important: true, categoryCorrect: true, severityCorrect: true, score: 65, evidenceGrade: "partial", rationale: "Belarus-China alignment against pressure is geopolitical bloc signal, with state-source caveat." },
  { id: "1306480430", important: false, categoryCorrect: true, severityCorrect: false, score: 55, evidenceGrade: "thin", rationale: "Zimbabwe software-skills MOU is constructive development news, but below high-signal threshold." },
  { id: "1306011040", important: false, categoryCorrect: true, severityCorrect: true, score: 45, evidenceGrade: "strong", rationale: "Duplicate row from the same US-Iran talks article." },
  { id: "1306011526", important: false, categoryCorrect: true, severityCorrect: true, score: 45, evidenceGrade: "strong", rationale: "Duplicate row from the same US-Iran talks article." },
  { id: "1306734775", important: true, categoryCorrect: true, severityCorrect: true, score: 85, evidenceGrade: "strong", rationale: "Trump Iran-deal conditions are strategic negotiation signal." },
  { id: "1306480335", important: false, categoryCorrect: true, severityCorrect: false, score: 25, evidenceGrade: "strong", rationale: "County opioid-settlement grants are local governance, not global event signal." },
  { id: "1306184245", important: false, categoryCorrect: true, severityCorrect: false, score: 40, evidenceGrade: "strong", rationale: "Duplicate/rescue-local Laos cave row below strategic threshold." },
  { id: "1306093419", important: false, categoryCorrect: false, severityCorrect: false, score: 30, evidenceGrade: "strong", rationale: "Australian broadcaster executive exit was misclassified as humanitarian bloom." },
  { id: "1305688260", important: false, categoryCorrect: false, severityCorrect: false, score: 40, evidenceGrade: "partial", rationale: "Opinion essay on German democracy is analysis, not a discrete bloom event." },
  { id: "1306479954", important: false, categoryCorrect: false, severityCorrect: false, score: 5, evidenceGrade: "strong", rationale: "Interior-design marketing article is extraction noise." },
  { id: "1306359374", important: false, categoryCorrect: false, severityCorrect: false, score: 55, evidenceGrade: "strong", rationale: "East Turkistan exile profile is relevant background, but not a current event to surface." },
  { id: "1306670028", important: false, categoryCorrect: false, severityCorrect: false, score: 30, evidenceGrade: "strong", rationale: "Connecticut political-column item is narrow domestic politics, not diplomacy bloom." },
  { id: "1306480107", important: false, categoryCorrect: false, severityCorrect: false, score: 35, evidenceGrade: "partial", rationale: "Duplicate broad neo-authoritarian-bloc analysis; not a concrete Philippine-China event." },
  { id: "1306480275", important: true, categoryCorrect: true, severityCorrect: true, score: 88, evidenceGrade: "strong", rationale: "Ukraine fighter-jet deal with Sweden/UK is strategic military-support signal." },
  { id: "1306734625", important: false, categoryCorrect: false, severityCorrect: false, score: 10, evidenceGrade: "strong", rationale: "Historical Blitz church story is not a current conflict event." },
  { id: "1306734846", important: true, categoryCorrect: true, severityCorrect: false, score: 62, evidenceGrade: "strong", rationale: "Nigerian troop ambush of terrorists is security signal, but one reported death is not critical severity." },
  { id: "1306734880", important: false, categoryCorrect: true, severityCorrect: false, score: 25, evidenceGrade: "strong", rationale: "Nigerian newspaper roundup is not a clean standalone event." },
  { id: "1306734891", important: false, categoryCorrect: true, severityCorrect: false, score: 45, evidenceGrade: "strong", rationale: "Duplicate of the Nigerian troop ambush source; cluster matters, this row should not surface separately." },
  { id: "1306715370", important: false, categoryCorrect: false, severityCorrect: false, score: 15, evidenceGrade: "strong", rationale: "Classroom immigration column is not a material conflict event." },
  { id: "1306696147", important: true, categoryCorrect: true, severityCorrect: true, score: 82, evidenceGrade: "strong", rationale: "Israeli strikes near a Lebanese heritage site are cross-border conflict signal." },
  { id: "1306669940", important: false, categoryCorrect: false, severityCorrect: false, score: 35, evidenceGrade: "strong", rationale: "Chad gender-wage-gap background is structural development context, not critical conflict." },
  { id: "1306641403", important: true, categoryCorrect: false, severityCorrect: false, score: 62, evidenceGrade: "strong", rationale: "Indian armed-forces preparedness is security-relevant, but not current material conflict." },
  { id: "1306641753", important: false, categoryCorrect: false, severityCorrect: false, score: 25, evidenceGrade: "strong", rationale: "Duplicate/noisy extraction from the India armed-forces preparedness article." },
  { id: "1306616527", important: false, categoryCorrect: true, severityCorrect: false, score: 25, evidenceGrade: "strong", rationale: "Wanted criminal shootout is local crime, not strategic conflict signal." },
  { id: "1306616618", important: false, categoryCorrect: false, severityCorrect: false, score: 5, evidenceGrade: "strong", rationale: "Film-editor memorial article is entertainment/culture noise for this event ontology." },
  { id: "1306616694", important: false, categoryCorrect: true, severityCorrect: false, score: 30, evidenceGrade: "strong", rationale: "Idaho wildfire update is local incident reporting, not critical global signal." },
  { id: "1306616743", important: true, categoryCorrect: true, severityCorrect: false, score: 70, evidenceGrade: "thin", rationale: "Chinese satellite support to Iran is strategically relevant, but the row is analytical and source fetch was blocked." },
  { id: "1306616880", important: false, categoryCorrect: true, severityCorrect: false, score: 45, evidenceGrade: "thin", rationale: "Duplicate/noisy row from the Chinese satellites-Iran analysis." },
  { id: "1306579378", important: true, categoryCorrect: true, severityCorrect: true, score: 82, evidenceGrade: "strong", rationale: "Israeli strikes damaging church and school in Lebanon are cross-border humanitarian-conflict signal." },
  { id: "1306528233", important: false, categoryCorrect: false, severityCorrect: false, score: 10, evidenceGrade: "strong", rationale: "Postal worker dog-attack rankings are extraction noise." },
  { id: "1306528470", important: false, categoryCorrect: true, severityCorrect: false, score: 25, evidenceGrade: "strong", rationale: "Toronto homicide identification is local crime, not critical geopolitical signal." },
  { id: "1306529011", important: false, categoryCorrect: true, severityCorrect: false, score: 58, evidenceGrade: "partial", rationale: "Lebanon war-and-peace opinion is relevant analysis but not a discrete event row to surface." },
  { id: "1306529135", important: false, categoryCorrect: true, severityCorrect: false, score: 35, evidenceGrade: "strong", rationale: "Cow-slaughter compliance filing is narrow legal-policy conflict, not critical signal." },
  { id: "1306479848", important: true, categoryCorrect: true, severityCorrect: true, score: 90, evidenceGrade: "strong", rationale: "US-Iran standoff at sea is a direct escalation-risk signal." },
  { id: "1306480261", important: true, categoryCorrect: true, severityCorrect: false, score: 65, evidenceGrade: "strong", rationale: "Taylor Swift concert-attack plot trial is public-security signal, but not a current critical event." },
  { id: "1306480284", important: false, categoryCorrect: true, severityCorrect: false, score: 45, evidenceGrade: "strong", rationale: "Single Dagestani soldier casualty in Ukraine is real conflict context but below surfacing threshold." },
  { id: "1306444826", important: false, categoryCorrect: true, severityCorrect: false, score: 35, evidenceGrade: "strong", rationale: "Bathurst lab/bomb-site raid is local criminal enforcement." },
  { id: "1306445038", important: false, categoryCorrect: true, severityCorrect: true, score: 55, evidenceGrade: "strong", rationale: "Duplicate source cluster for the US-Iran sea standoff; do not surface separately." },
  { id: "1306445244", important: true, categoryCorrect: true, severityCorrect: true, score: 90, evidenceGrade: "strong", rationale: "Russian drone hit in Romania is NATO-adjacent escalation signal." },
  { id: "1306407306", important: false, categoryCorrect: true, severityCorrect: false, score: 20, evidenceGrade: "strong", rationale: "Life sentence in a local murder case is not strategic event intelligence." },
  { id: "1306359192", important: true, categoryCorrect: true, severityCorrect: false, score: 60, evidenceGrade: "strong", rationale: "Assault-weapons-ban resistance is public-safety governance signal, but not critical severity." },
  { id: "1306306146", important: true, categoryCorrect: true, severityCorrect: true, score: 78, evidenceGrade: "partial", rationale: "Report alleging large militant presence in Nigeria is security-significant, but claim quality needs caution." },
  { id: "1306306896", important: false, categoryCorrect: true, severityCorrect: false, score: 50, evidenceGrade: "partial", rationale: "Speculative US-invasion article is watchlist material, not a confirmed event." },
  { id: "1306230855", important: true, categoryCorrect: true, severityCorrect: false, score: 65, evidenceGrade: "strong", rationale: "Federal raids on Mohawk reservation raise sovereignty and law-enforcement governance issues." },
  { id: "1306230901", important: false, categoryCorrect: true, severityCorrect: false, score: 25, evidenceGrade: "strong", rationale: "Stalking-related Chicago killing is local crime, not strategic signal." },
  { id: "1306231088", important: false, categoryCorrect: false, severityCorrect: false, score: 5, evidenceGrade: "strong", rationale: "Newsletter announcement is extraction noise." },
  { id: "1306231296", important: false, categoryCorrect: false, severityCorrect: false, score: 20, evidenceGrade: "strong", rationale: "Documentary interview was mis-extracted as international conflict." },
  { id: "1306183112", important: false, categoryCorrect: true, severityCorrect: false, score: 55, evidenceGrade: "strong", rationale: "Israeli domestic murder/community-violence story is serious but not strategic enough to surface globally." },
  { id: "1306183326", important: false, categoryCorrect: true, severityCorrect: false, score: 25, evidenceGrade: "strong", rationale: "Ontario firearms/drugs seizure is local policing." },
  { id: "1306183620", important: true, categoryCorrect: true, severityCorrect: false, score: 68, evidenceGrade: "strong", rationale: "ICE detention protests and hunger strike are domestic governance/human-rights signal, but not critical severity." },
  { id: "1306183791", important: false, categoryCorrect: true, severityCorrect: false, score: 45, evidenceGrade: "partial", rationale: "Iran-war opinion piece is not a discrete event row." },
  { id: "1306183837", important: false, categoryCorrect: true, severityCorrect: false, score: 45, evidenceGrade: "strong", rationale: "Duplicate/noisy row from the Israeli community-violence article." },
  { id: "1306183836", important: false, categoryCorrect: true, severityCorrect: false, score: 58, evidenceGrade: "strong", rationale: "Jordanian textbook controversy is relevant public diplomacy context but below surfacing threshold." },
  { id: "1306183960", important: true, categoryCorrect: true, severityCorrect: false, score: 72, evidenceGrade: "partial", rationale: "South Lebanon colonisation claim is strategically relevant, but source is analytical/opinion and not critical event severity." },
  { id: "1305688040", important: true, categoryCorrect: false, severityCorrect: true, score: 80, evidenceGrade: "strong", rationale: "Potential US-Iran deal details are high-stakes diplomacy, but current row direction should be bloom, not doom." },
  { id: "1305688099", important: false, categoryCorrect: true, severityCorrect: false, score: 35, evidenceGrade: "strong", rationale: "Abandoned-child burial permission is tragic humanitarian news, not geopolitical signal." },
  { id: "1305688220", important: true, categoryCorrect: false, severityCorrect: true, score: 80, evidenceGrade: "strong", rationale: "TTP Eid ceasefire amid violence is important security signal, but row direction is more de-escalatory than doom." },
  { id: "1305688344", important: false, categoryCorrect: true, severityCorrect: false, score: 40, evidenceGrade: "partial", rationale: "Iran negotiation opinion is not a discrete operational event." },
  { id: "1305688346", important: false, categoryCorrect: true, severityCorrect: false, score: 35, evidenceGrade: "partial", rationale: "Duplicate opinion row from the Iran negotiation article." },
  { id: "1305688424", important: true, categoryCorrect: false, severityCorrect: true, score: 82, evidenceGrade: "partial", rationale: "Reported Iran deal and Hormuz reopening would be strategically important, but direction should be bloom." },
  { id: "1305688455", important: false, categoryCorrect: false, severityCorrect: true, score: 50, evidenceGrade: "strong", rationale: "Duplicate row from the potential US-Iran deal source; important cluster but not separate surface item." },
  { id: "1305688523", important: false, categoryCorrect: true, severityCorrect: false, score: 35, evidenceGrade: "strong", rationale: "Texas school Bible/Quran controversy is culture-war politics, not critical event signal." },
  { id: "1305688623", important: false, categoryCorrect: true, severityCorrect: false, score: 35, evidenceGrade: "strong", rationale: "Duplicate abandoned-child burial row." },
  { id: "1305688624", important: false, categoryCorrect: true, severityCorrect: false, score: 35, evidenceGrade: "strong", rationale: "Duplicate abandoned-child burial row." },
  { id: "1305688675", important: false, categoryCorrect: false, severityCorrect: true, score: 50, evidenceGrade: "strong", rationale: "Duplicate TTP ceasefire row; source cluster matters but this row should not surface separately." },
  { id: "1305688771", important: false, categoryCorrect: true, severityCorrect: false, score: 35, evidenceGrade: "strong", rationale: "Duplicate Texas school culture-war row." },
  { id: "1305718549", important: false, categoryCorrect: false, severityCorrect: false, score: 10, evidenceGrade: "strong", rationale: "Civil War history feature is not a current material-conflict event." },
  { id: "1305718918", important: true, categoryCorrect: true, severityCorrect: true, score: 85, evidenceGrade: "strong", rationale: "European condemnation of Russia's Oreshnik use is Ukraine-war escalation/diplomacy signal." },
  { id: "1305718995", important: false, categoryCorrect: false, severityCorrect: false, score: 20, evidenceGrade: "strong", rationale: "Gold Star family memorial profile is not a current conflict event." },
  { id: "1305718996", important: false, categoryCorrect: false, severityCorrect: false, score: 20, evidenceGrade: "strong", rationale: "Duplicate Gold Star family memorial row." },
  { id: "1305740384", important: true, categoryCorrect: true, severityCorrect: true, score: 90, evidenceGrade: "strong", rationale: "Deadly Israeli strikes in Lebanon are direct cross-border conflict signal." },
  { id: "1305740385", important: false, categoryCorrect: true, severityCorrect: true, score: 55, evidenceGrade: "strong", rationale: "Duplicate row from the deadly Israeli strikes in Lebanon story." },
  { id: "1305740475", important: false, categoryCorrect: true, severityCorrect: true, score: 55, evidenceGrade: "strong", rationale: "Duplicate of the Kyiv missiles near Azerbaijan embassy story." },
  { id: "1305850627", important: false, categoryCorrect: true, severityCorrect: false, score: 30, evidenceGrade: "strong", rationale: "Traditional-ruler court dispute is local legal conflict." },
  { id: "1305851119", important: false, categoryCorrect: true, severityCorrect: false, score: 25, evidenceGrade: "strong", rationale: "Duplicate traditional-ruler court-dispute row." },
  { id: "1305851339", important: false, categoryCorrect: true, severityCorrect: false, score: 25, evidenceGrade: "strong", rationale: "Duplicate traditional-ruler court-dispute row." },
  { id: "1305851559", important: false, categoryCorrect: false, severityCorrect: false, score: 20, evidenceGrade: "partial", rationale: "Pearl Harbor survivor profile is historical/memorial context, not current conflict." },
  { id: "1305915828", important: false, categoryCorrect: false, severityCorrect: false, score: 50, evidenceGrade: "partial", rationale: "Gaza reconstruction analysis is relevant background, but this row is a noisy Iran-militia extraction." },
  { id: "1305915842", important: false, categoryCorrect: false, severityCorrect: false, score: 45, evidenceGrade: "partial", rationale: "Duplicate/noisy extraction from Gaza reconstruction analysis." },
];

function readJsonl<T>(text: string): T[] {
  return text.split(/\r?\n/).filter(Boolean).map((line) => JSON.parse(line) as T);
}

function writeJsonl(rows: unknown[]): string {
  return rows.map((row) => JSON.stringify(row)).join("\n") + "\n";
}

function eventTitle(event: EventRow): string {
  return event.actor1 && event.actor1 !== "Unknown"
    ? `${event.actor1}${event.actor2 && event.actor2 !== "Unknown" ? ` -> ${event.actor2}` : ""}`
    : "Unknown";
}

function hostFromUrl(url: string): string {
  try {
    return new URL(url).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return "";
  }
}

async function main() {
  const args = process.argv.slice(2);
  if (args.includes("-h") || args.includes("--help")) {
    printHelp();
    return;
  }
  if (args.length > 0) throw new Error(`Unknown argument(s): ${args.join(" ")}`);

  const labels = readJsonl<Phase1Label>(await readFile(LABEL_PATH, "utf8"));
  const eventsRaw = JSON.parse(await readFile(EVENTS_PATH, "utf8"));
  const events = new Map((eventsRaw.events as EventRow[]).map((event) => [event.id, event]));
  const reviewById = new Map(reviews.map((review) => [review.id, review]));

  if (reviewById.size !== reviews.length) throw new Error("Duplicate review IDs found.");
  for (const label of labels) {
    if (!reviewById.has(label.eventId)) throw new Error(`Missing review for event ${label.eventId}`);
  }

  let applied = 0;
  let skippedHuman = 0;
  const now = new Date().toISOString();
  const next = labels.map((label) => {
    if (label.labelSource === "human" && label.humanReviewed) {
      skippedHuman++;
      return label;
    }

    const review = reviewById.get(label.eventId);
    const event = events.get(label.eventId);
    if (!review || !event) return label;

    applied++;
    return {
      ...label,
      labelSource: "llm_article_review",
      humanReviewed: false,
      reviewedBy: REVIEWER,
      reviewedAt: now,
      labels: {
        important: review.important,
        categoryCorrect: review.categoryCorrect,
        severityCorrect: review.severityCorrect,
        summaryQuality: label.labels.summaryQuality,
      },
      reviewContext: {
        ...(label.reviewContext ?? {}),
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
        sourceDomain: hostFromUrl(event.sourceUrl),
        sourceUrl: event.sourceUrl,
        codexReviewVersion: "phase1.codex-intel-triage.v1",
        codexImportanceScore: review.score,
        evidenceGrade: review.evidenceGrade,
        rationale: review.rationale,
        intelligenceLens: "Surface state-level conflict, strategic diplomacy, governance risk, and high-impact public safety; suppress local-only crime, entertainment/history noise, weak extraction, and duplicate source rows.",
      },
      notes: "Codex intelligence-triage review. Useful as provisional labels, but not human-reviewed ground truth.",
    } satisfies Phase1Label;
  });

  await writeFile(LABEL_PATH, writeJsonl(next));
  console.log(`Applied Codex Phase 1 review to ${applied} labels.`);
  if (skippedHuman > 0) console.log(`Skipped ${skippedHuman} human-reviewed labels.`);
  console.log(`Updated ${LABEL_PATH}`);
}

main().catch((err) => {
  console.error("Failed to apply Codex Phase 1 review:", err);
  process.exit(1);
});
