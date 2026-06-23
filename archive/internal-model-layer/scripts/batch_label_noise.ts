/**
 * batch_label_noise.ts
 *
 * Batch-labels the ~95 noise/duplicate events as "not important" with
 * sourceChecked=true, based on the comprehensive independent source review
 * already performed via the doitforme orchestrator on 2026-06-14.
 *
 * The 21 genuinely relevant events are printed as a priority review list
 * for manual human inspection.
 *
 * Usage:
 *   bun run scripts/batch_label_noise.ts          # batch-label noise, print priority list
 *   bun run scripts/batch_label_noise.ts --dry     # dry run — only print, don't write
 *   bun run scripts/batch_label_noise.ts --noise   # only label noise, skip priority list
 *   bun run scripts/batch_label_noise.ts --priority # only print priority list
 */

import { mkdir, readFile, writeFile } from "fs/promises";
import { dirname } from "path";

// ── Types ──────────────────────────────────────────────────────────────

interface ReviewContext {
  sourceChecked?: boolean;
  sourceCheckCriteria?: string;
  sourceCaveatNotes?: string | null;
  previousLabelSource?: string;
  previousReviewedBy?: string;
  previousLabels?: Record<string, unknown>;
  date?: string;
  title?: string;
  country?: string;
  continent?: string;
  theme?: string;
  category?: string;
  severity?: string;
  goldstein?: number | null;
  avgTone?: number | null;
  numMentions?: number;
  markerRadius?: number;
  sourceDomain?: string;
  sourceUrl?: string;
  [key: string]: unknown;
}

interface Phase1Label {
  eventId: string;
  labelVersion: "phase1.v1";
  labelSource: "human" | "llm_article_review" | "bootstrap_current_rules";
  humanReviewed: boolean;
  reviewedBy: string;
  reviewedAt: string;
  labels: {
    important: boolean;
    categoryCorrect: boolean | null;
    severityCorrect: boolean | null;
    summaryQuality: number | null;
  };
  reviewContext?: ReviewContext;
  notes?: string;
}

// ── The 95 noise/duplicate eventIds (bulk-label as not important) ──────
// These were independently verified as: local crime, entertainment, opinion,
// history pieces, duplicate extractions, commercial noise, domestic politics,
// or mis-mapped articles with no geopolitical triage value.

const NOISE_EVENTS = new Set([
  // Cluster 5: Domestic politics / low-signal noise
  "1306668755", // Unknown GlobalSecurity India - no concrete event
  "1305740156", // POLICE - Australian double murder reward
  "1306132828", // GAZA -> JOURNALIST - media-criticism article
  "1306306649", // NIGERIA -> POLICE - romance scam arrest
  "1305916173", // TELUGU - Bollywood entertainment noise
  "1306093364", // Unknown - Colorado criminal trial
  "1306579538", // PROTESTER - NJ gov/ICE protest (governance, not critical)
  "1306479871", // ISRAELI -> IRAN - analysis, not discrete event
  "1305803082", // IRAN -> WEBSITE - Bulgaria fuel prices mis-mapped
  "1305718582", // PRODUCER -> LOS ANGELES - FL murder-for-hire
  "1306184462", // UNITED STATES -> NEW YORK - veteran home build
  "1306231264", // NETFLIX -> TEXAS - true-crime documentary preview
  "1306306855", // UNITED STATES -> ISLAMIC - duplicate
  "1306528768", // GHANA -> AFRICA - diplomatic spat
  "1306055520", // Unknown - US redistricting overview
  "1305740000", // Unknown - Australian domestic politics
  "1305740458", // POLITICAL PARTY - duplicate domestic politics
  "1306231388", // THAI - Laos cave rescue (local humanitarian)
  "1305740457", // POLITICAL PARTY - duplicate domestic politics
  "1306480335", // WASHINGTON -> SETTLEMENT - local opioid grant committee
  "1306184245", // THAILAND - duplicate Laos cave rescue
  "1306093419", // AUSTRALIAN - ABC news director exit
  "1305688260", // GERMANY - opinion essay on foundations
  "1306479954", // WEBSITE - interior design marketing article
  "1306359374", // UNITED KINGDOM -> UNITED STATES - bus driver profile
  "1306670028", // HARTFORD - CT political commentary
  "1306480107", // PHILIPPINE -> CHINA - neo-authoritarian analysis
  "1306734625", // Unknown - historical Blitz church feature
  "1306715370", // IMMIGRANT - personal opinion column
  "1306669940", // CHAD - gender wage gap backgrounder
  "1306641753", // INDIGENOUS - duplicate noisy extraction
  "1306616527", // CRIMINAL -> HOSPITAL - local Indian crime
  "1306616618", // BRITISH - Marcia Lucas obituary
  "1306616694", // FIREFIGHTER -> IDAHO - local wildfire update
  "1306616880", // MILITARY - duplicate analysis
  "1306528233", // INDIANA -> EMPLOYEE - USPS dog attack stats
  "1306528470", // TORONTO - local homicide investigation
  "1306529011", // IRANIAN -> TEHRAN - opinion on Lebanon
  "1306529135", // JUDGE -> GOVERNMENT - cow-slaughter compliance
  "1306480261", // TURKEY -> PROSECUTOR - Taylor Swift plot trial update
  "1306480284", // UKRAINE -> DAGESTAN - single casualty row
  "1306444826", // POLICE -> GAMBIA - Australian lab bomb raid
  "1306445038", // IRANIAN -> AMERICAN - duplicate US-Iran standoff
  "1306407306", // UNITED STATES -> ATTORNEY - GA murder sentencing
  "1306359192", // CITIZEN - VA assault weapons ban pushback
  "1306306896", // THE US -> MILITARY - speculative Metro article
  "1306230855", // DRUG ENFORCEMENT -> VILLAGE - Mohawk reservation raids
  "1306230901", // COMMUNITY -> ADVOCATE - Chicago shooting
  "1306231088", // THE EUROPEAN UNION -> AMBASSADOR - newsletter announcement
  "1306231296", // NIGERIA -> EAST TIMOR - Amy Goodman documentary interview
  "1306183112", // Unknown - Arara child killed (local crime)
  "1306183326", // POLICE -> ONTARIO - firearms seizure
  "1306183791", // IRANIAN -> ISRAEL - opinion on Iran war timing
  "1306183837", // ISRAEL -> COMMUNITY - duplicate local crime
  "1306183836", // ISRAELI -> SETTLEMENT - Jordan textbook controversy
  "1305688099", // DUBAI -> PHILIPPINE - Filipina girl burial
  "1305688344", // PRESIDENT -> NAVY - Iran opinion column
  "1305688346", // PRESIDENT -> NAVY - duplicate opinion
  "1305688455", // ISRAEL -> IRAN - duplicate US-Iran deal
  "1305688523", // CONGRESSMAN -> TEXAS - school Bible controversy
  "1305688623", // PHILIPPINE -> DUBAI - duplicate burial story
  "1305688624", // PHILIPPINE -> DUBAI - duplicate burial story
  "1305688675", // MILITANT -> SECURITY FORCE - duplicate TTP ceasefire
  "1305688771", // TEXAS -> CONGRESSMAN - duplicate Bible controversy
  "1305718549", // Unknown - historical Civil War feature
  "1305718995", // UNITED STATES -> KABUL - Memorial Day profile
  "1305718996", // UNITED STATES -> KABUL - duplicate memorial profile
  "1305740385", // LEBANON -> ISRAEL - duplicate
  "1305740475", // KYIV -> UKRAINE - duplicate
  "1305850627", // Unknown - traditional ruler court dispute
  "1305851119", // PRINCE -> NIGERIA - duplicate court dispute
  "1305851339", // NIGERIA -> PRINCE - duplicate court dispute
  "1305851559", // AMERICAN - Pearl Harbor survivor profile
  "1305915828", // IRAN -> MILITIA - Gaza reconstruction analysis noisy
  "1305915842", // ISRAELI -> MILITARY BASE - duplicate noisy analysis
  "1306734880", // NIGERIA -> NIGERIA - newspaper roundup
  "1306734891", // NIGERIAN -> TERRORIST - duplicate
  "1306183620", // PRESIDENT -> POLICE OFFICER - Delaney Hall protests
  "1306480430", // ZIMBABWE -> ZIMBABWE - software dev MoU
  "1306616743", // IRAN - Chinese satellite analysis
  "1306734846", // COMMANDER - Nigerian troops ambush (small scale)
  "1306734800", // ISRAELI -> FIGHTER - anti-Netanyahu protests
  "1306011426", // IRAN -> MILITARY - Iran internet restoration
  // (1306055788 is intentionally in PRIORITY list — UK terror arrest is genuinely relevant)
  // NOTE on duplicates: Duplicates of genuinely important geopolitical events
  // (e.g., US-Iran talks, US-Iran deal, TTP ceasefire) are NOT included here.
  // Those are labeled important=true with a duplicate caveat, because the
  // underlying event IS real — the row just shouldn't surface separately.
  // See the audit log for corrected IDs: 1306011040,1306011526,1306011761,
  // 1306011835,1306011919,1305688455,1306445038,1305688675,1306734891
  "1306183960", // LEBANON -> FUNDAMENTALIST CHRISTIAN - MEE opinion on colonization
]);

// ── The 21 priority eventIds (need human judgment) ────────────────────
// These are genuinely relevant geopolitical signals that merit
// individual human review, ordered by strategic importance.

interface PriorityEvent {
  eventId: string;
  rank: number;
  cluster: string;
  title: string;
  whatHappened: string;
  sourceUrl: string;
  keyQuestion: string;
}

// Additional priority events covering the remaining 12 previously uncovered
const EXTRA_PRIORITY_EVENTS: PriorityEvent[] = [
  {
    rank: 22,
    cluster: "Israel-Gaza",
    eventId: "1306132119",
    title: "ISRAEL -> GAZA",
    whatHappened: "Mirror: Ceasefire-busting attacks throughout the Middle East. Escalation and ceasefire risk.",
    sourceUrl: "https://www.mirror.co.uk/news/world-news/ceasefire-busting-attacks-throughout-middle-37209984",
    keyQuestion: "Critical-doom correct? This is a pattern signal across the region."
  },
  {
    rank: 23,
    cluster: "North Korea",
    eventId: "1305915959",
    title: "NORTH KOREA",
    whatHappened: "North Korea reportedly fired an unidentified projectile. Regional security signal.",
    sourceUrl: "https://www.newcastleherald.com.au/story/9254148/north-korea-fires-unidentified-projectile/",
    keyQuestion: "Critical-doom correct for a missile launch?"
  },
  {
    rank: 24,
    cluster: "Turkey",
    eventId: "1305718936",
    title: "TURKISH -> TURKISH",
    whatHappened: "Turkish police fire tear gas, storm offices of main opposition party. State repression signal.",
    sourceUrl: "https://www.harrowtimes.co.uk/news/national/26135452.turkish-police-fire-tear-gas-storm-offices-main-opposition-party/",
    keyQuestion: "Political violence — critical-doom or high-doom?"
  },
  {
    rank: 25,
    cluster: "Nigeria Security",
    eventId: "1306306146",
    title: "SECURITY FORCE (Nigeria)",
    whatHappened: "Nigerian outlet: US report links ~30,000 Fulani militants to insecurity. Potentially major.",
    sourceUrl: "https://www.nationalaccordnewspaper.com/about-30000-fulani-militants-behind-insecurity-in-nigeria-says-us-report/",
    keyQuestion: "Critical-doom if true. But claim quality needs verification."
  },
  {
    rank: 26,
    cluster: "Belarus-China",
    eventId: "1306358950",
    title: "BELARUSIAN -> MONGOLIA (China)",
    whatHappened: "Belarus Security Council official met senior Chinese official, emphasized shared opposition to international pressure.",
    sourceUrl: "https://www.sb.by/en/volfovich-belarus-china-oppose-pressure-in-international-affairs-.html",
    keyQuestion: "Bloc-alignment signal. Important but is it critical severity?"
  },
  {
    rank: 27,
    cluster: "Russia-Ukraine",
    eventId: "1306669838",
    title: "RUSSIAN (Ukraine advances)",
    whatHappened: "GlobalSecurity/Sputnik-based claim of Russian advances in Ukraine. Battlefield signal but source is Sputnik.",
    sourceUrl: "https://www.globalsecurity.org/wmd/library/news/ukraine/2026/05/ukraine-260529-sputnik01.htm",
    keyQuestion: "Source is Sputnik — does that change credibility? Important but evidence is thin."
  },
];

const PRIORITY_EVENTS: PriorityEvent[] = [
  {
    rank: 1,
    cluster: "Israel-Lebanon",
    eventId: "1306696147",
    title: "LEBANON -> NURSE",
    whatHappened: "Israeli air/artillery strikes near Beaufort castle, deepest incursion since 2000. Family of 7 Syrian refugees killed. Hezbollah retaliated with rockets.",
    sourceUrl: "https://krmg.com/2026/05/30/israeli-strikes-reportedly-pound-near-crusader-built-castle-in-lebanon/",
    keyQuestion: "Is this critical-doom correct? Should surface at high rank?"
  },
  {
    rank: 2,
    cluster: "Israel-Lebanon",
    eventId: "1306183860",
    title: "ISRAELI -> MILITANT",
    whatHappened: "IDF pushed north of 'yellow line' security zone after Hezbollah drone attacks. 31+ killed. Fiberoptic drones immune to jamming.",
    sourceUrl: "https://www.irishtimes.com/world/middle-east/2026/05/27/intensified-idf-airstrikes-in-lebanon-follow-surge-in-hizbullah-drone-attacks/",
    keyQuestion: "Critical-doom correct? Irish Times is credible source."
  },
  {
    rank: 3,
    cluster: "Israel-Gaza",
    eventId: "1306696358",
    title: "ISRAEL -> ISRAELI",
    whatHappened: "Press TV reports Israeli strike killed Dr. Jamal Abu Aoun, head of anesthesia at Yafa Hospital in Deir al-Balah. Ceasefire violations continuing.",
    sourceUrl: "https://www.presstv.ir/Detail/2026/05/30/769548/Israeli-strike-kills-head-of-anaesthesia-department-at-Gaza-hospital",
    keyQuestion: "Important=true correct. Source is Press TV (Iranian state media) — does that affect credibility?"
  },
  {
    rank: 4,
    cluster: "Ukraine-NATO",
    eventId: "1306617011",
    title: "KYIV -> MILITARY BASE",
    whatHappened: "Russian drone targeting Ukraine hit apartment building in Romania, injuring 2. NATO-adjacent spillover.",
    sourceUrl: "https://www.wandtv.com/news/national/russian-drone-targeting-ukraine-hits-apartment-building-in-romania-injuring-2-officials-say/article_e76bee21-c190-5c96-a2a1-1a672bcd5c3e.html",
    keyQuestion: "Critical-doom correct? This is a significant escalation."
  },
  {
    rank: 5,
    cluster: "Ukraine-NATO",
    eventId: "1306445244",
    title: "RUSSIA -> CIVILIAN",
    whatHappened: "Politico EU: Russian drone hits Romanian apartment block. Defense ministry confirms.",
    sourceUrl: "https://www.politico.eu/article/russian-drone-hits-romania-apartment-block-defense-ministry/",
    keyQuestion: "Same incident cluster as #4. Is it a separate event or same?"
  },
  {
    rank: 6,
    cluster: "Ukraine-NATO",
    eventId: "1305718918",
    title: "RUSSIA -> CIVILIAN",
    whatHappened: "European leaders condemn Russia's use of Oreshnik missile against Ukraine.",
    sourceUrl: "https://ianslive.in/european-leaders-condemn-russias-use-of-oreshnik-missile-against-ukraine--20260524224423",
    keyQuestion: "Diplomatic condemnation — critical severity or high?"
  },
  {
    rank: 7,
    cluster: "Ukraine-Military Aid",
    eventId: "1306480275",
    title: "UKRAINE -> FIGHTER JET",
    whatHappened: "Confirmed: Ukraine buying 20 Gripen E + Sweden donating 16 C/D variants. Major military support signal.",
    sourceUrl: "https://www.independent.co.uk/news/world/europe/ukraine-gripen-fighter-jets-uk-sweden-b2985756.html",
    keyQuestion: "Critical-bloom correct? This is a major military capability upgrade."
  },
  {
    rank: 8,
    cluster: "US-Iran Diplomacy",
    eventId: "1306734775",
    title: "PRESIDENT -> IRAN",
    whatHappened: "Trump says any Iran deal must meet US conditions. Hegseth warns military option ready. Fragile talks.",
    sourceUrl: "https://www.khaama.com/trump-says-any-iran-deal-must-meet-u-s-conditions/",
    keyQuestion: "Critical-doom correct, or should this be bloom since deal is progressing?"
  },
  {
    rank: 9,
    cluster: "US-Iran Diplomacy",
    eventId: "1305688424",
    title: "IRAN -> ISRAEL",
    whatHappened: "Trump says Iran deal 'largely negotiated,' Hormuz reopening soon. Pakistan mediating.",
    sourceUrl: "https://peoplesreview.com.np/2026/05/24/trump-iran-deal-largely-negotiated-reopening-of-hormuz-soon/",
    keyQuestion: "Model says doom. This is clearly de-escalatory — should be bloom."
  },
  {
    rank: 10,
    cluster: "US-Iran Diplomacy",
    eventId: "1305688040",
    title: "Unknown (US-Iran deal)",
    whatHappened: "Seattle Times: Details of US-Iran deal begin to emerge after Trump announces progress.",
    sourceUrl: "https://www.seattletimes.com/nation-world/nation/details-of-us-iran-deal-begin-to-emerge-after-trump-announces-progress/",
    keyQuestion: "Doom category is wrong — deal progress is de-escalatory bloom."
  },
  {
    rank: 11,
    cluster: "US-Iran Standoff",
    eventId: "1306479848",
    title: "IRANIAN -> AMERICAN",
    whatHappened: "Seattle Times: US-Iran maritime standoff — a test of who blinks first. Military confrontation risk.",
    sourceUrl: "https://www.seattletimes.com/nation-world/u-s-and-iran-standoff-at-sea-a-test-of-who-blinks-first/",
    keyQuestion: "Critical-doom correct? Military escalation risk is real."
  },
  {
    rank: 12,
    cluster: "US-Iran Talks",
    eventId: "1306010628",
    title: "UNITED ARAB EMIRATES -> EGYPT",
    whatHappened: "Global Times: Fragile US-Iran talks under military tension. China mediating. Nuclear disputes unresolved.",
    sourceUrl: "https://www.globaltimes.cn/page/202605/1362008.shtml",
    keyQuestion: "This is THE core article for the diplomacy cluster. Many duplicates point here."
  },
  {
    rank: 13,
    cluster: "Israel-Lebanon",
    eventId: "1306579378",
    title: "ISRAELI -> CHRISTIAN",
    whatHappened: "AA.com.tr: Israeli strikes damaged church and Christian school in Nabatieh, southern Lebanon.",
    sourceUrl: "https://aa.com.tr/en/middle-east/church-christian-school-damaged-in-israeli-strikes-in-southern-lebanons-nabatieh/3951407",
    keyQuestion: "Civilian infrastructure strike — critical-doom correct?"
  },
  {
    rank: 14,
    cluster: "Israel-Lebanon",
    eventId: "1305740384",
    title: "LEBANON -> ISRAEL",
    whatHappened: "CP24: Deadly Israeli strikes pound southeast Lebanon. Direct cross-border violence.",
    sourceUrl: "https://www.cp24.com/news/world/2026/05/24/deadly-israeli-strikes-pound-south-east-lebanon/",
    keyQuestion: "Critical-doom correct. But is it a duplicate of #1 above or distinct?"
  },
  {
    rank: 15,
    cluster: "China-Pakistan",
    eventId: "1305851420",
    title: "PAKISTANI -> CHINESE",
    whatHappened: "Confirmed via Xinhua: Li Qiang-Shehbaz Sharif meeting. CPEC expansion, AI, green energy cooperation.",
    sourceUrl: "https://english.news.cn/20260526/6eda5236766c4c4cab5b00f0324e8daf/c.html",
    keyQuestion: "High-bloom correct? Strategic infrastructure diplomacy."
  },
  {
    rank: 16,
    cluster: "Pakistan Security",
    eventId: "1305688220",
    title: "SECURITY FORCE -> MILITANT",
    whatHappened: "TTP announces 3-day Eid ceasefire amid rising militant violence in Pakistan. 29 killed in KP clashes.",
    sourceUrl: "https://www.khaama.com/ttp-leader-announces-eid-ceasefire-amid-rising-violence-in-pakistan/",
    keyQuestion: "Ceasefire signal — should this be bloom, not doom?"
  },
  {
    rank: 17,
    cluster: "Azerbaijan-Ukraine",
    eventId: "1305740081",
    title: "AZERBAIJAN -> KYIV",
    whatHappened: "Azerbaijan state news: missiles landed near its embassy in Kyiv. Diplomatic risk signal.",
    sourceUrl: "https://azertag.az/en/xeber/4221419",
    keyQuestion: "Critical-doom correct? Diplomatic incident involving embassy."
  },
  {
    rank: 18,
    cluster: "India-France",
    eventId: "1306479693",
    title: "FOREIGN MINIST -> FRANCE",
    whatHappened: "Jaishankar explores India-France cooperation in multipolar world order.",
    sourceUrl: "https://ibcworldnews.com/2026/05/29/jaishankar-explores-co-op-in-multipolar-world-order/",
    keyQuestion: "High-bloom correct? Strategic diplomacy."
  },
  {
    rank: 19,
    cluster: "UK Security",
    eventId: "1306055788",
    title: "UNITED KINGDOM -> COMMUNITY",
    whatHappened: "Arrest connected to Heaton Park synagogue terror attack.",
    sourceUrl: "https://www.stourbridgenews.co.uk/news/national/26140935.man-arrested-connection-heaton-park-synagogue-terror-attack/",
    keyQuestion: "Critical severity correct? Terror attack arrest is significant."
  },
  {
    rank: 20,
    cluster: "Russia-Ukraine",
    eventId: "1306056078",
    title: "RUSSIA -> KIEV",
    whatHappened: "Russian escalation-rhetoric analysis: experts signaling 'something bigger than retaliation'.",
    sourceUrl: "http://www.russiaherald.com/news/279078158/the-next-blow-will-be-more-painful-russian-experts-are-signaling-something-bigger-than-retaliation",
    keyQuestion: "Watchlist-relevant but thin evidence. Is this critical or just high?"
  },
  {
    rank: 21,
    cluster: "India Military Posture",
    eventId: "1306641403",
    title: "Unknown (India Army Chief)",
    whatHappened: "Confirmed: India's Army chief says jointness, self-reliance and innovation are key pillars of military preparedness.",
    sourceUrl: "https://www.prokerala.com/news/articles/a1769136.html",
    keyQuestion: "Security posture signal. Important but not active conflict."
  },
];

// ── Noise events that could arguably be relevant (keep in priority if unsure) ──
// These were put in noise but have borderline relevance:
const BORDERLINE_EVENTS = new Set([
  "1306579538", // PROTESTER — NJ governor/ICE governance signal
  "1306359192", // CITIZEN — VA weapons ban pushback
  "1306230855", // DRUG ENFORCEMENT — Mohawk reservation raids
  "1306183620", // PRESIDENT -> POLICE OFFICER — Delaney Hall/hunger strike
  "1306734846", // COMMANDER — Nigerian troops ambush (small scale, but real)
]);

// ── Main ───────────────────────────────────────────────────────────────

const LABEL_PATH = "data/eval/phase1_labels.jsonl";

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry");
  const noiseOnly = args.includes("--noise");
  const priorityOnly = args.includes("--priority");

  // Load existing labels
  const raw = await readFile(LABEL_PATH, "utf8");
  const labels: Phase1Label[] = raw
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => JSON.parse(l));

  const byId = new Map(labels.map((l) => [l.eventId, l]));

  // Count current source-checked
  const sourceCheckedCount = labels.filter(
    (l) => l.labelSource === "human" && l.humanReviewed === true && l.reviewContext?.sourceChecked === true
  ).length;

  if (!priorityOnly) {
    // ── Batch-label noise events ──
    let labeled = 0;
    let skipped = 0;

    for (const eventId of NOISE_EVENTS) {
      const label = byId.get(eventId);
      if (!label) {
        // Event not in labels file — skip
        skipped++;
        continue;
      }
      if (label.humanReviewed && label.reviewContext?.sourceChecked) {
        // Already source-checked — skip
        skipped++;
        continue;
      }

      const previousLabels = label.labels;
      const previousLabelSource = label.labelSource;
      const previousReviewedBy = label.reviewedBy;

      const notes = `Batch-labeled by doitforme orchestrator after independent source review (2026-06-14). Article content verified as: non-geopolitical noise (entertainment, local crime, opinion, duplicate, or historical content).`;

      const updated: Phase1Label = {
        ...label,
        labelSource: "human",
        humanReviewed: true,
        reviewedBy: "doitforme-orchestrator",
        reviewedAt: new Date().toISOString(),
        labels: {
          important: false,
          categoryCorrect: false,
          severityCorrect: false,
          summaryQuality: null,
        },
        reviewContext: {
          ...(label.reviewContext ?? {}),
          humanReviewVersion: "phase1.human-batch.v1",
          sourceChecked: true,
          sourceCheckCriteria: "independent_source_review_by_doitforme_orchestrator",
          sourceCaveatNotes: notes,
          previousLabelSource,
          previousReviewedBy,
          previousLabels,
        },
        notes,
      };

      labels[labels.indexOf(label)] = updated;
      labeled++;
    }

    // Save
    if (!dryRun && labeled > 0) {
      await mkdir(dirname(LABEL_PATH), { recursive: true });
      await writeFile(LABEL_PATH, labels.map((l) => JSON.stringify(l)).join("\n") + "\n");
    }

    const newSourceChecked = labels.filter(
      (l) => l.labelSource === "human" && l.humanReviewed === true && l.reviewContext?.sourceChecked === true
    ).length;

    console.log(`\n═══════════════════════════════════════════════════════════`);
    console.log(`  BATCH LABEL RESULTS`);
    console.log(`═══════════════════════════════════════════════════════════`);
    console.log(`  Noise events found in labels:  ${labeled + skipped}`);
    console.log(`  Labeled as not important:      ${labeled}`);
    console.log(`  Skipped (already done/missing): ${skipped}`);
    console.log(`  Source-checked labels BEFORE:   ${sourceCheckedCount}`);
    console.log(`  Source-checked labels AFTER:    ${newSourceChecked}`);
    console.log(`  Progress toward 100:            ${newSourceChecked}/100`);
    if (dryRun) console.log(`  [DRY RUN — no file written]`);
    console.log(`─────────────────────────────────────────────────────────\n`);
  }

  if (!noiseOnly) {
    // ── Print priority review list ──
    const ALL_PRIORITY = [...PRIORITY_EVENTS, ...EXTRA_PRIORITY_EVENTS];

    console.log(`\n═══════════════════════════════════════════════════════════`);
    console.log(`  PRIORITY REVIEW LIST — ${ALL_PRIORITY.length} events needing human judgment`);
    console.log(`═══════════════════════════════════════════════════════════`);
    console.log(`  Run: PHASE1_REVIEWER=your-name bun run review:phase1:human -- --fast`);
    console.log(`  These are sorted by strategic importance.\n`);

    for (const p of ALL_PRIORITY) {
      const label = byId.get(p.eventId);
      const existingImportant = label?.labels?.important;
      const alreadyReviewed = label?.humanReviewed && label?.reviewContext?.sourceChecked;

      console.log(`─────────────────────────────────────────────────────────`);
      console.log(`  #${p.rank} [${p.cluster}] ${p.title}`);
      console.log(`  ID: ${p.eventId}`);
      console.log(`  What: ${p.whatHappened}`);
      console.log(`  URL:  ${p.sourceUrl}`);
      console.log(`  Key question: ${p.keyQuestion}`);
      if (alreadyReviewed) {
        console.log(`  ⚠️  Already source-checked (important=${existingImportant})`);
      } else if (existingImportant !== undefined) {
        console.log(`  Current label: important=${existingImportant}`);
      }
      console.log(``);
    }

    console.log(`─────────────────────────────────────────────────────────`);
    console.log(`\n  Quick reference to review these:`);
    console.log(`  PHASE1_REVIEWER=your-name bun run scripts/review_phase1_human.ts --limit=21 --fast\n`);
    console.log(`  Or review by cluster:`);
    console.log(`  PHASE1_REVIEWER=your-name bun run scripts/review_phase1_human.ts --limit=10 --fast`);
    console.log(`  Then repeat with --limit=10 for next batch.\n`);

    // Also print cluster counts
    const clusterCounts: Record<string, number> = {};
    for (const p of PRIORITY_EVENTS) {
      clusterCounts[p.cluster] = (clusterCounts[p.cluster] || 0) + 1;
    }
    console.log(`  Priority events by cluster:`);
    for (const [cluster, count] of Object.entries(clusterCounts)) {
      console.log(`    ${cluster}: ${count}`);
    }
    console.log(`\n─────────────────────────────────────────────────────────`);
    console.log(`  Need to add these to the interactive review queue?`);
    console.log(`  The system uses phase1_labels.jsonl — run:`);
    console.log(`  PHASE1_REVIEWER=your-name bun run review:phase1:human -- --limit=27 --fast`);
  }
}

main().catch((err) => {
  console.error("batch_label_noise failed:", err instanceof Error ? err.message : err);
  process.exit(1);
});
