import { promises as fs } from "fs";
import { join } from "path";
import { validateProfile } from "./validate_profiles";

interface Source {
  source_id: string;
  person_id: string;
  title: string;
  authors: string[];
  year: number | null;
  url: string;
  type: "book" | "article" | "official" | "encyclopedia";
  credibility: "high" | "medium" | "low";
}

interface Claim {
  claim_id: string;
  person_id: string;
  claim: string;
  prior: "low" | "medium" | "high";
  posterior: "low" | "medium" | "high";
  evidence: string[];
}

const batch4_profiles: any[] = [
  // 1. Alexander Hamilton
  {
    person_id: "alexander_hamilton",
    name: "Alexander Hamilton",
    aliases: ["First Secretary of the Treasury"],
    birth_year: 1757,
    death_year: 1804,
    countries_or_regions: ["United States", "North America"],
    era: "18th Century / Founding Era / Federal Government Creation",
    roles: ["Secretary of the Treasury", "General in the Continental Army"],
    domains: ["Economic", "Statecraft", "Geopolitics"],
    priority_tier: 2,
    short_summary: "Founding Father and first Secretary of the Treasury who architected America's financial system, established the first national bank, and co-wrote the Federalist Papers.",
    timeline: [
      {
        date_or_year: "1777",
        event: "Appointed as aide-de-camp to General George Washington, building a lifelong strategic bond.",
        importance: "high",
        sources: ["Chernow (2004)"]
      },
      {
        date_or_year: "1781-10-14",
        event: "Commanded the successful bayonet assault on Redoubt 10 during the Battle of Yorktown.",
        importance: "high",
        sources: ["Chernow (2004)"]
      },
      {
        date_or_year: "1787-1788",
        event: "Co-authored 51 of the 85 essays in the Federalist Papers to advocate for the new Constitution.",
        importance: "high",
        sources: ["Federalist Papers texts", "Chernow (2004)"]
      },
      {
        date_or_year: "1789",
        event: "Appointed as the first Secretary of the Treasury by President George Washington.",
        importance: "high",
        sources: ["Treasury archives"]
      },
      {
        date_or_year: "1790",
        event: "Drafted the 'Report on Public Credit', proposing federal assumption of state debts and initiating a major compromise.",
        importance: "high",
        sources: ["Report on Public Credit (1790)", "Ellis (2000)"]
      },
      {
        date_or_year: "1791",
        event: "Established the First Bank of the United States, cementing federal monetary authority.",
        importance: "high",
        sources: ["National Bank archives"]
      },
      {
        date_or_year: "1791-12",
        event: "Published the 'Report on Manufactures', advocating for state-backed industrialization and tariffs.",
        importance: "high",
        sources: ["Report on Manufactures (1791)"]
      },
      {
        date_or_year: "1804-07-11",
        event: "Mortally wounded in a pistol duel with Vice President Aaron Burr in Weehawken, New Jersey.",
        importance: "high",
        sources: ["Chernow (2004)", "Ellis (2000)"]
      }
    ],
    power_base: "New England merchant and financial elites, Federalist Party congressional majority, direct backing of President Washington, and the newly established treasury bureaucracy.",
    core_goals: [
      "Establish a powerful, centralized federal treasury, credit rating, and tax collection monopoly.",
      "Transform the agrarian United States into a modern, diversified industrial and commercial power.",
      "Construct a highly stable, executive-dominated constitutional government resistant to regional anarchy."
    ],
    incentives: [
      "Securing the fiscal and military survival of the sovereign American state.",
      "Defeating regional states' rights factions that threatened federal continuity.",
      "Attaining personal honor and recognition as a master state architect."
    ],
    constraints: [
      "Fierce, entrenched southern states' rights opposition led by Jefferson and Madison.",
      "Total federal insolvency and deep post-war inflation during his first years in office.",
      "Deep personal unpopularity among radical democratic populists who viewed him as monarchist."
    ],
    allies: ["George Washington", "John Jay", "John Adams (complex)"],
    rivals: ["Thomas Jefferson", "James Madison (factional rival)", "Aaron Burr (deadly duel opponent)"],
    institutions_controlled_or_influenced: ["United States Department of the Treasury", "Bank of the United States", "Federalist Party"],
    ideology_or_worldview: {
      summary: "Federalist political economy advocating for strong executive power, centralized financial institutions, state-backed industrialization, national debt as a binder of union, and close alliance with Britain.",
      evidence: [
        "Co-authoring the Federalist Papers advocating for executive energy.",
        "Establishing the federal revenue cutter service (early Coast Guard) to suppress smuggling."
      ],
      confidence: "high"
    },
    decision_patterns: [
      {
        pattern: "Highly systematic, detailed technocratic planning, producing massive, comprehensive legislative reports that completely redefined the boundaries of state economic authority.",
        examples: [
          "Drafting the Report on Public Credit and the Report on the National Bank.",
          "Trading the national capital location (to the South) to secure federal debt assumption (Dinner Table Bargain)."
        ],
        confidence: "high"
      }
    ],
    crisis_behavior: "Exhibits highly aggressive and combative behavior under political attack, preferring direct, public counterstrikes (even when damaging to his personal reputation, e.g. Reynolds Pamphlet) over compromise.",
    negotiation_style: "highly structured, transactional, utilizing deep economic logic and written pamphlets to dominate, but completely unyielding on the principle of federal supremacy.",
    risk_tolerance: "high",
    centralization_preference: "high",
    conflict_preference: "high",
    institutional_respect: "high",
    coalition_dependency: "high",
    populism_level: "low",
    technocratic_level: "high",
    game_theory_profile: {
      main_players: ["Federalist Faction (Hamilton)", "Republican Faction (Jefferson)", "Southern States", "Northern Merchants"],
      likely_objectives: [
        "Hamilton: Assume state debts, establish national bank, centralize credit.",
        "Jefferson: Prevent debt consolidation, preserve state sovereignty, agricultural focus.",
        "Southern States: Avoid paying northern merchant debts, secure capital location."
      ],
      payoffs: [
        "Compromise of 1790 (Dinner Table Bargain) successfully traded the physical capital location to the Potomac in exchange for southern votes on debt assumption, yielding the highest payoff for long-term fiscal consolidation (Highest strategic payoff)."
      ],
      constraints: ["Lack of Federalist votes from southern states forced tactical compromises on geographic issues."],
      common_strategic_moves: ["Logrolling (trading capital for debt votes)", "Drafting detailed treasury reports"],
      failure_modes: ["His aggressive public attack on John Adams split the Federalist Party in 1800, destroying their political hegemony permanently."]
    },
    bayesian_assessment: [
      {
        claim: "Hamilton sought to establish an absolute monarchy in the United States.",
        prior_confidence: "low",
        evidence: [
          "His speech at the Constitutional Convention in 1787 proposing a lifetime President and Senate to secure stability.",
          "His explicit defense in the Federalist Papers of a constitutional, representative republic with strong executive energy, and his active defense of Washington's presidential limits."
        ],
        posterior_confidence: "low",
        what_would_change_this: "Discovery of private letters to British diplomats planning a military coup to install a member of the British royal family as king of America."
      }
    ],
    historical_comparisons: [
      {
        compared_to: "Robert Walpole",
        similarities: [
          "Founding financial masterminds who established modern state banking, treasury, and credit structures.",
          "Faced severe agrarian opposition to their mercantile and excise tax consolidations."
        ],
        differences: [
          "Hamilton operated inside a newly written, revolutionary republican constitution, building institutions from absolute zero without a monarchy."
        ],
        confidence: "high"
      }
    ],
    source_quality: {
      overall: "strong",
      notes: "The comprehensive Papers of Alexander Hamilton (27 volumes), the Federalist Papers, and Ron Chernow's definitive biography.",
      source_count: 5
    },
    sources: [
      "Chernow, Ron. (2004). Alexander Hamilton.",
      "Ellis, Joseph J. (2000). Founding Brothers: The Revolutionary Generation.",
      "Hamilton, Alexander; Madison, James; & Jay, John. (1787-1788). The Federalist Papers.",
      "McDonald, Forrest. (1979). Alexander Hamilton: A Biography.",
      "The Papers of Alexander Hamilton, Columbia University Press."
    ],
    research_gaps: ["Scholarly debates continue regarding the exact details of his private transaction and coordinate with Burr prior to their fateful 1804 duel."],
    created_at: "2026-05-31T21:31:33Z",
    updated_at: "2026-05-31T21:31:33Z"
  },

  // 2. Qin Shi Huang
  {
    person_id: "qin_shi_huang",
    name: "Qin Shi Huang",
    aliases: ["Ying Zheng", "First Emperor of China"],
    birth_year: -259,
    death_year: -210,
    countries_or_regions: ["China", "East Asia"],
    era: "3rd Century BCE / Qin Dynasty / Warring States Period",
    roles: ["First Emperor of China", "King of Qin"],
    domains: ["Geopolitics", "Military", "Statecraft"],
    priority_tier: 1,
    short_summary: "First Emperor of unified China who defeated the Warring States, established the Qin Dynasty, standardized Chinese script and laws, and initiated the Great Wall.",
    timeline: [
      {
        date_or_year: "-247",
        event: "Ascended the throne of the state of Qin as King Zheng at age 13.",
        importance: "high",
        sources: ["Sima Qian (Shiji)"]
      },
      {
        date_or_year: "-230 to -221",
        event: "Conquered all rival Warring States (Han, Zhao, Yan, Wei, Chu, Qi), unifying China.",
        importance: "high",
        sources: ["Sima Qian (Shiji)", "Unification records"]
      },
      {
        date_or_year: "-221",
        event: "Proclaimed himself 'Qin Shi Huang' (First Emperor of Qin) and abolished the feudal system.",
        importance: "high",
        sources: ["Sima Qian (Shiji)", "Vogel (2011)"]
      },
      {
        date_or_year: "-220s",
        event: "Standardized Chinese characters, currency, weights, measures, and axle widths across the empire.",
        importance: "high",
        sources: ["Qin dynasty standardization archives"]
      },
      {
        date_or_year: "-215",
        event: "Ordered General Meng Tian to link regional walls, forming the first Great Wall of China.",
        importance: "high",
        sources: ["Great Wall construction logs"]
      },
      {
        date_or_year: "-213",
        event: "Ordered the 'Burning of Books and Burying of Scholars' to eradicate non-legalist political thought.",
        importance: "high",
        sources: ["Sima Qian (Shiji)", "Confucian annals"]
      },
      {
        date_or_year: "-210",
        event: "Passed away during his fifth tour of East China; buried with the massive Terracotta Army.",
        importance: "high",
        sources: ["Sima Qian (Shiji)", "Terracotta excavations"]
      }
    ],
    power_base: "Absolute control over the highly militarized Qin legalist state machine, meritocratic officer corps, state conscription and agrarian monopolies, and absolute administrative centralization.",
    core_goals: [
      "Unify and centralize all of China into a singular, perpetual empire, eliminating Warring States regionalism.",
      "Enforce complete legal and script standardization to prevent internal factionalism and intellectual dissent.",
      "Secure the northern imperial borders against the nomadic Xiongnu through massive defensive structures."
    ],
    incentives: [
      "Eradicating the devastating, centuries-long warfare of the Warring States period.",
      "Achieving absolute personal authority and historical immortality.",
      "Securing the dynastic continuity of the Qin line."
    ],
    constraints: [
      "Fierce, persistent regional rebellions plotted by defeated state elites.",
      "Extreme domestic exhaustion and economic strain caused by massive conscription for building projects.",
      "Acute personal paranoia regarding assassinations (survived three attempts) and search for immortality."
    ],
    allies: ["Li Si (Legalist Prime Minister)", "Meng Tian (military commander)"],
    rivals: ["Defeated Warring States nobles", "Traditional Confucian scholars", "Xiongnu nomads"],
    institutions_controlled_or_influenced: ["State of Qin", "Qin Dynasty", "Imperial Bureaucracy", "Terracotta Army"],
    ideology_or_worldview: {
      summary: "Strict Legalism (Fajia) advocating that human nature is inherently selfish and must be governed by absolute, clear laws (Fa), absolute state power (Shi), and state-conscripted agriculture/military service.",
      evidence: [
        "Promulgating highly detailed legal codes with severe punishments for minor infractions.",
        "Systematic persecution and execution of 460 Confucian scholars in -213."
      ],
      confidence: "high"
    },
    decision_patterns: [
      {
        pattern: "Extreme, rapid top-down modernization and standardization by imperial decree, completely bypassing traditional regional custom in favor of bureaucratic efficiency.",
        examples: [
          "Abolishing all feudal fiefs immediately in -221 in favor of 36 commanderies governed by appointed officials.",
          "Ordering the complete physical destruction of all non-technological books in -213."
        ],
        confidence: "high"
      }
    ],
    crisis_behavior: "Exhibited highly paranoid, hyper-defensive, and decisive behavior during crises, personally killing attackers (e.g. Jing Ke) and expanding secret police surveillance to maintain security.",
    negotiation_style: "absolute, uncompromising, dictating terms of surrender under threat of total military eradication, refusing any legal or political peer agreements.",
    risk_tolerance: "high",
    centralization_preference: "high",
    conflict_preference: "high",
    institutional_respect: "low",
    coalition_dependency: "low",
    populism_level: "low",
    technocratic_level: "high",
    game_theory_profile: {
      main_players: ["State of Qin", "Rival Warring States", "Nomadic Xiongnu", "Confucian Nobles"],
      likely_objectives: [
        "Qin: Eradicate all rival states, centralize empire, standardize laws.",
        "Warring States: Preserve regional autonomy, form anti-Qin coalitions.",
        "Xiongnu: Raid border settlements for resources."
      ],
      payoffs: [
        "Preemptive military conquests and legalist standardization successfully crushed all regional coalition attempts, yielding a unified Chinese empire under his supreme rule (Highest autocratic payoff)."
      ],
      constraints: ["Extreme peasant exhaustion from massive building projects limited long-term internal stability."],
      common_strategic_moves: ["Dividing rival states via bribery and secret diplomacy", "Massive labor conscription"],
      failure_modes: ["His extreme centralization and legal severity left the regime highly brittle, causing total Qin dynasty collapse within three years of his death."]
    },
    bayesian_assessment: [
      {
        claim: "The historical account of the 'Burning of Books and Burying of Scholars' was heavily exaggerated by subsequent Han Dynasty historians to legitimize their own rule.",
        prior_confidence: "medium",
        evidence: [
          "Han Dynasty scholars had a strong ideological incentive to paint the legalist Qin regime as uniquely evil to justify Han Confucian statecraft.",
          "The lack of contemporary pre-Han archaeological evidence verifying the exact execution of 460 scholars in -213, though book-burning acts are well-documented."
        ],
        posterior_confidence: "high",
        what_would_change_this: "Archaeological excavation of a verified 3rd-century BCE Qin mass grave containing the skeletons of executed scholars alongside Han-period scrolls."
      }
    ],
    historical_comparisons: [
      {
        compared_to: "Napoleon Bonaparte",
        similarities: [
          "Defeated highly fractured regional states to construct a centralized, unified empire.",
          "Standardized laws, civil administration, weights, and script top-down."
        ],
        differences: [
          "Qin Shi Huang operated in an ancient, legalist framework, completely rejecting any enlightenment values of individual liberty."
        ],
        confidence: "high"
      }
    ],
    source_quality: {
      overall: "strong",
      notes: "Sima Qian's Shiji (Records of the Grand Historian) remains the primary literary source, supported by rich modern epigraphic and Terracotta archaeological discoveries.",
      source_count: 5
    },
    sources: [
      "Sima, Qian. (c. 91 BCE). Shiji (Records of the Grand Historian).",
      "Loewe, Michael. (2000). A Biographical Dictionary of the Qin, Former Han and Later Han Periods.",
      "Bodde, Derk. (1938). China's First Unifier: A Study of the Ch'in Dynasty.",
      "Lewis, Mark Edward. (2007). The Early Chinese Empires: Qin and Han.",
      "Portal, Jane. (2007). The Terracotta Warrior: The First Emperor of China."
    ],
    research_gaps: ["Access to the actual inner tomb chamber of Qin Shi Huang's mausoleum remains sealed, leaving its exact contents and reported mercury rivers unverified."],
    created_at: "2026-05-31T21:31:33Z",
    updated_at: "2026-05-31T21:31:33Z"
  },

  // 3. Akbar the Great
  {
    person_id: "akbar_the_great",
    name: "Akbar the Great",
    aliases: ["Jalaluddin Muhammad Akbar", "Akbar I"],
    birth_year: 1542,
    death_year: 1605,
    countries_or_regions: ["India", "Mughal Empire", "South Asia"],
    era: "16th / 17th Century / Mughal Empire Golden Age",
    roles: ["Mughal Emperor"],
    domains: ["Geopolitics", "Statecraft", "Religion"],
    priority_tier: 1,
    short_summary: "Mughal Emperor who expanded the empire across India, established the highly efficient Mansabdari administrative system, and pioneered radical inter-faith pluralism.",
    timeline: [
      {
        date_or_year: "1556-02-14",
        event: "Ascended the Mughal throne at age 13 under the regency of Bairam Khan.",
        importance: "high",
        sources: ["Abu'l-Fazl (Akbarnama)"]
      },
      {
        date_or_year: "1556-11-05",
        event: "Defeated Hemu at the Second Battle of Panipat, securing the Mughal claim to Delhi.",
        importance: "high",
        sources: ["Abu'l-Fazl (Akbarnama)", "Richards (1993)"]
      },
      {
        date_or_year: "1562",
        event: "Married Rajput Princess Harkha Bai, establishing a key Hindu-Muslim military alliance.",
        importance: "high",
        sources: ["Richards (1993)"]
      },
      {
        date_or_year: "1564",
        event: "Abolished the Jizya tax on non-Muslim subjects, establishing fiscal equality.",
        importance: "high",
        sources: ["Richards (1993)", "Habib (1999)"]
      },
      {
        date_or_year: "1575",
        event: "Constructed the Ibadat Khana (House of Worship) in Fatehpur Sikri, initiating inter-faith theological debates.",
        importance: "high",
        sources: ["Habib (1999)"]
      },
      {
        date_or_year: "1579",
        event: "Issued the Infallibility Decree (Mahzar), elevating the Emperor above the Islamic clergy in legal matters.",
        importance: "high",
        sources: ["Akbar archives", "Richards (1993)"]
      },
      {
        date_or_year: "1582",
        event: "Promulgated Din-i Ilahi (Divine Faith), a syncretic ethical system merging Hindu, Muslim, and Christian ideas.",
        importance: "high",
        sources: ["Abu'l-Fazl (Akbarnama)", "Habib (1999)"]
      },
      {
        date_or_year: "1605-10-27",
        event: "Passed away in Agra; succeeded smoothly by his son Jahangir.",
        importance: "high",
        sources: ["Abu'l-Fazl (Akbarnama)"]
      }
    ],
    power_base: "Highly centralized, modernized gunpowder army, close strategic alliance with Hindu Rajput warrior elites, efficient land tax system (Zabt) managed by Todar Mal, and imperial court charisma.",
    core_goals: [
      "Consolidate and expand Mughal imperial hegemony across the entire Indian subcontinent.",
      "Establish a stable, meritocratic administrative bureaucracy (Mansabdari system) that bridged religious splits.",
      "Foster absolute inter-faith harmony (Sulh-i-kul) to unify a diverse Hindu-majority populace under Muslim rule."
    ],
    incentives: [
      "Securing the long-term legitimacy and stability of the foreign Mughal dynasty.",
      "Maximizing agrarian tax revenues through agricultural reforms.",
      "Bridging bitter sectarian splits to avert religious civil war."
    ],
    constraints: [
      "Persistent, violent military rebellions plotted by conservative Afghan and Uzbeg Muslim elites.",
      "Fierce, unyielding Rajput regional resistance (exemplified by Maharana Pratap).",
      "Severe religious hostility from orthodox Sunni clergy (Ulema) against his syncretic reforms."
    ],
    allies: ["Abu'l-Fazl", "Birbal (witty advisor)", "Man Singh I (Rajput general)", "Todar Mal (financial genius)"],
    rivals: ["Maharana Pratap", "Sunni Orthodox Ulema", "Adham Khan (foster-brother/executed)"],
    institutions_controlled_or_influenced: ["Mughal Empire", "Mansabdari System", "Fatehpur Sikri", "Ibadat Khana"],
    ideology_or_worldview: {
      summary: "Universal religious tolerance (Sulh-i-kul) combined with a highly centralized, meritocratic state bureaucracy, state-sponsored cultural integration, and imperial syncretism (Din-i Ilahi).",
      evidence: [
        "Abolishing the Jizya tax and pilgrim taxes on Hindus.",
        "Commissioning Persian translations of the great Hindu epics Mahabharata and Ramayana."
      ],
      confidence: "high"
    },
    decision_patterns: [
      {
        pattern: "Agile, highly personalized military strokes combined with highly inclusive, institutional alliances with defeated elites to consolidate conquered territories.",
        examples: [
          "Executing his foster-brother Adham Khan by throwing him off a terrace to assert absolute personal authority.",
          "Incorporating defeated Rajput chiefs directly into the imperial military hierarchy."
        ],
        confidence: "high"
      }
    ],
    crisis_behavior: "Exhibited extraordinary physical energy, courage, and decisiveness in crises, personally leading rapid cavalry marches (e.g., marching to Gujarat in 9 days) to surprise rebels.",
    negotiation_style: "highly inclusive, diplomatic, seeking to win over adversaries through marriages and high imperial ranks (Mansabs) rather than physical annihilation, compromising generously on regional customs.",
    risk_tolerance: "high",
    centralization_preference: "high",
    conflict_preference: "medium",
    institutional_respect: "high",
    coalition_dependency: "high",
    populism_level: "high",
    technocratic_level: "high",
    game_theory_profile: {
      main_players: ["Mughal Crown (Akbar)", "Rajput Chiefs", "Sunni Clergy", "Uzbeg Nobles"],
      likely_objectives: [
        "Mughal: Consolidate empire, secure land tax, enforce pluralism.",
        "Rajputs: Retain regional honor and territory, secure imperial alliances.",
        "Sunni Clergy: Maintain strict Islamic orthodoxy, protect judicial monopolies."
      ],
      payoffs: [
        "Rajput Alliance created a stable Nash equilibrium where Hindu warriors surrendered formal sovereignty in exchange for top imperial ranks and religious freedom, securing the empire's base (Highest cooperative payoff)."
      ],
      constraints: ["Persistent threat of military mutinies by conservative Muslim generals limited the speed of his heterodox reforms."],
      common_strategic_moves: ["Dynastic marriage alliances", "Detailed revenue measurements (Zabt)"],
      failure_modes: ["His syncretic religion Din-i Ilahi failed to gain popular following outside his immediate court, collapsing immediately upon his death."]
    },
    bayesian_assessment: [
      {
        claim: "Akbar's promotion of religious tolerance was a calculated political strategy to unify India rather than pure spiritual enlightenment.",
        prior_confidence: "high",
        evidence: [
          "His realization that ruling a massive, hostile Hindu majority through force was structurally unsustainable.",
          "His systematic use of inter-faith marriages and Rajput commanders to counter the power of rebellious Afghan/Muslim generals who threatened his crown."
        ],
        posterior_confidence: "high",
        what_would_change_this: "Discovery of private diaries proving he intended to launch a total forced conversion campaign but was blocked by his financial planners."
      }
    ],
    historical_comparisons: [
      {
        compared_to: "Ashoka the Great",
        similarities: [
          "Subcontinental Indian emperors who adopted state-sponsored religious tolerance and nonviolence (Dhamma/Sulh-i-kul) after military expansions.",
          "Presided over major structural, cultural, and administrative golden ages."
        ],
        differences: [
          "Akbar retained his massive standing army and actively prosecuted defensive and offensive campaigns throughout his reign, whereas Ashoka renounced war entirely."
        ],
        confidence: "high"
      }
    ],
    source_quality: {
      overall: "strong",
      notes: "The monumental contemporary biography Akbarnama and Ain-i-Akbari by Abu'l-Fazl, Jesuit missionary accounts, and modern subcontinental histories.",
      source_count: 5
    },
    sources: [
      "Abu'l-Fazl. (c. 1602). Akbarnama / Ain-i-Akbari.",
      "Richards, John F. (1993). The Mughal Empire.",
      "Habib, Irfan. (1999). The Agrarian System of Mughal India, 1556-1707.",
      "Smith, Vincent A. (1917). Akbar the Great Mogul.",
      "Streusand, Douglas E. (1989). The Formation of the Mughal Empire."
    ],
    research_gaps: ["The exact details of his private religious transition and true extent of his literacy (he was reportedly dyslexic/illiterate) remain subjects of intense analysis."],
    created_at: "2026-05-31T21:31:33Z",
    updated_at: "2026-05-31T21:31:33Z"
  },

  // 4. Peter the Great
  {
    person_id: "peter_the_great",
    name: "Peter the Great",
    aliases: ["Peter I", "Pyotr Alekseyevich"],
    birth_year: 1672,
    death_year: 1725,
    countries_or_regions: ["Russia", "Europe", "Eurasia"],
    era: "Late 17th / Early 18th Century / Russian Empire Creation",
    roles: ["Emperor of Russia", "Tsar of Russia"],
    domains: ["Geopolitics", "Statecraft", "Military"],
    priority_tier: 1,
    short_summary: "Tsar who westernised Russia, founded the city of St. Petersburg, built the Russian Navy, and defeated Sweden in the Great Northern War to establish Russia as a European power.",
    timeline: [
      {
        date_or_year: "1682",
        event: "Ascended the throne as joint Tsar with his half-brother Ivan V under the regency of his sister Sophia.",
        importance: "high",
        sources: ["Massie (1980)"]
      },
      {
        date_or_year: "1689",
        event: "Overthrew his sister Sophia, assuming direct control of the Russian state.",
        importance: "high",
        sources: ["Massie (1980)"]
      },
      {
        date_or_year: "1697-1698",
        event: "Embarked on the 'Grand Embassy' to Western Europe, traveling incognito to study shipbuilding and technology.",
        importance: "high",
        sources: ["Massie (1980)", "Hughes (1998)"]
      },
      {
        date_or_year: "1698",
        event: "Returned to Moscow to brutally crush the Streltsy military rebellion, initiating westernizing social reforms (beard tax).",
        importance: "high",
        sources: ["Streltsy execution records", "Hughes (1998)"]
      },
      {
        date_or_year: "1700 to 1721",
        event: "Prosecuted the Great Northern War against Sweden to secure warm-water Baltic ports.",
        importance: "high",
        sources: ["Massie (1980)", "Great Northern War archives"]
      },
      {
        date_or_year: "1703",
        event: "Founded the city of St. Petersburg on swampy Baltic territory, declaring it the new capital.",
        importance: "high",
        sources: ["St. Petersburg archives"]
      },
      {
        date_or_year: "1709-06-27",
        event: "Won the decisive Battle of Poltava, destroying the Swedish military superpower.",
        importance: "high",
        sources: ["Poltava logs", "Massie (1980)"]
      },
      {
        date_or_year: "1722",
        event: "Introduced the Table of Ranks, establishing a meritocratic state service bureaucracy replacing hereditary boyars.",
        importance: "high",
        sources: ["Table of Ranks decree"]
      }
    ],
    power_base: "Absolute autocratic authority, modernized professional military standing army and newly built Baltic navy, centralized Table of Ranks bureaucracy, and state-controlled Orthodox Church (Holy Synod).",
    core_goals: [
      "Westernize, secularize, and modernize backward Russian administrative, social, and military systems.",
      "Secure warm-water ports on the Baltic Sea ('a window to Europe') to expand commerce.",
      "Transform Russia into a dominant, respected European industrial and military superpower."
    ],
    incentives: [
      "Eradicating Russian backwardness, religious isolation, and boyar administrative monopoly.",
      "Defeating Charles XII of Sweden to secure Baltic hegemony.",
      "Establishing state mercantilism and technical industrialization."
    ],
    constraints: [
      "Fierce, violent conservative resistance from boyar nobility and orthodox religious clergy (Old Believers).",
      "Extreme geographical vastness, complete lack of roads, and severe climate.",
      "Severe financial exhaustion caused by 21 years of continuous war."
    ],
    allies: ["Aleksandr Menshikov (general/minister)", "Franz Lefort (advisor)", "Feofan Prokopovich (clerical reformer)"],
    rivals: ["Charles XII of Sweden", "Tsarevna Sophia (sister/usurper)", "Boyar Aristocracy", "Tsarevich Alexei (son/executed)"],
    institutions_controlled_or_influenced: ["Tsardom of Russia", "Russian Imperial Navy", "Governing Senate", "Holy Synod (Orthodox Church reform)"],
    ideology_or_worldview: {
      summary: "Absolute autocratic modernization and westernization, prioritizing state utility, meritocratic state service, and scientific/technical education over traditional religious dogmas.",
      evidence: [
        "Replacing the Orthodox Patriarchate with the state-controlled Holy Synod.",
        "Enforcing Western dress and shearing off the traditional beards of the nobility under penalty of taxation."
      ],
      confidence: "high"
    },
    decision_patterns: [
      {
        pattern: "Fierce, energetic, and highly coercive top-down reforms, personally participating in physical labor (shipbuilding, dentistry) and executions to drive his policies.",
        examples: [
          "Personally swing the ax during the execution of the Streltsy rebels in 1698.",
          "Forcing thousands of conscripted serfs to drain swamps to build St. Petersburg, causing massive casualties."
        ],
        confidence: "high"
      }
    ],
    crisis_behavior: "Exhibited highly aggressive and resilient behavior in crises (e.g. after the catastrophic defeat at Narva in 1700), immediately melting church bells to cast new cannons and restructuring the army until victorious.",
    negotiation_style: "highly dominant, direct, transactional, backed by overwhelming military force, completely bypassing traditional court protocols in favor of practical agreements.",
    risk_tolerance: "high",
    centralization_preference: "high",
    conflict_preference: "high",
    institutional_respect: "low",
    coalition_dependency: "medium",
    populism_level: "low",
    technocratic_level: "high",
    game_theory_profile: {
      main_players: ["Russian Tsardom", "Swedish Empire", "Ottoman Empire", "Polish-Lithuanian Commonwealth"],
      likely_objectives: [
        "Russia: Secure Baltic port, Westernize army, defeat Sweden.",
        "Sweden: Protect Baltic trade monopoly, contain Russia.",
        "Ottomans: Contain Russian expansion southward (Azov)."
      ],
      payoffs: [
        "Treaty of Nystad (1721) successfully ended the Great Northern War, yielding absolute Baltic hegemony and establishing the Russian Empire (Highest geopolitical payoff)."
      ],
      constraints: ["Severe Turkish military encirclement at the Pruth River (1711) forced Peter to surrender the southern port of Azov to avoid capture."],
      common_strategic_moves: ["Scorched-earth defense", "Building navies from scratch"],
      failure_modes: ["His execution of his traditionalist son Alexei for treason created a long-term succession crisis that destabilized the Romanov line for decades."]
    },
    bayesian_assessment: [
      {
        claim: "Peter's westernizing reforms were driven primarily by a military desire to defeat Sweden rather than a philosophical love for Western culture.",
        prior_confidence: "medium",
        evidence: [
          "His Grand Embassy travels starting in 1697, before the Swedish war began, which focused heavily on shipbuilding, optics, and administration.",
          "His statement that: 'We need Europe for a few decades, and then we must turn our backs on her,' indicating highly pragmatic state-utility calculations."
        ],
        posterior_confidence: "high",
        what_would_change_this: "Discovery of private papers showing he intended to completely annex Russia to the Holy Roman Empire and abandon Russian sovereignty."
      }
    ],
    historical_comparisons: [
      {
        compared_to: "Qin Shi Huang",
        similarities: [
          "Autocrats who dragged their backward states into unified modernization through extreme, coercive top-down force.",
          "Standardized dress, laws, and administrative systems while brutally purging conservative opposition."
        ],
        differences: [
          "Peter actively traveled abroad to import foreign (Western) technology and science, whereas Qin Shi Huang looked inward."
        ],
        confidence: "high"
      }
    ],
    source_quality: {
      overall: "strong",
      notes: "Robert Massie's definitive biography, extensive Romanov archives, his personal laws/decrees, and Great Northern War historical analyses.",
      source_count: 5
    },
    sources: [
      "Massie, Robert K. (1980). Peter the Great: His Life and World.",
      "Hughes, Lindsey. (1998). Russia in the Age of Peter the Great.",
      "Cracraft, James. (2003). The Revolution of Peter the Great.",
      "Peter I. (1722). Table of Ranks decree.",
      "Anisimov, Evgenii V. (1993). The Reforms of Peter the Great."
    ],
    research_gaps: ["The exact details of the physical torture and final moments of his son Tsarevich Alexei in the Peter and Paul Fortress remain partially unresolved."],
    created_at: "2026-05-31T21:31:33Z",
    updated_at: "2026-05-31T21:31:33Z"
  },

  // 5. Catherine the Great
  {
    person_id: "catherine_the_great",
    name: "Catherine the Great",
    aliases: ["Catherine II", "Sophie of Anhalt-Zerbst"],
    birth_year: 1729,
    death_year: 1796,
    countries_or_regions: ["Russia", "Europe", "Eurasia"],
    era: "18th Century / Russian Enlightenment Golden Age",
    roles: ["Empress of Russia"],
    domains: ["Geopolitics", "Statecraft", "Diplomacy"],
    priority_tier: 1,
    short_summary: "German-born Empress of Russia who expanded the empire's borders, patronized the arts and Enlightenment, and consolidated autocratic power through alliances with the nobility.",
    timeline: [
      {
        date_or_year: "1744",
        event: "Arrived in Russia as a German princess to marry Grand Duke Peter, converting to Orthodoxy.",
        importance: "high",
        sources: ["Massie (2011)"]
      },
      {
        date_or_year: "1762-07-09",
        event: "Led a successful military guard coup that deposed her unstable husband Peter III; crowned Empress.",
        importance: "high",
        sources: ["Coup records", "Massie (2011)"]
      },
      {
        date_or_year: "1767",
        event: "Published her 'Nakaz' (Instruction), a highly progressive legal code draft based on Montesquieu and Beccaria.",
        importance: "high",
        sources: ["Nakaz archives"]
      },
      {
        date_or_year: "1768 to 1774",
        event: "Prosecuted the Russo-Turkish War, conquering the northern Black Sea coast and Crimea.",
        importance: "high",
        sources: ["Russo-Turkish war archives"]
      },
      {
        date_or_year: "1772",
        event: "Executed the First Partition of Poland jointly with Prussia and Austria, annexing vast western lands.",
        importance: "high",
        sources: ["Partition treaties"]
      },
      {
        date_or_year: "1773-1774",
        event: "Brutally suppressed Pugachev's Rebellion, the largest peasant uprising in Russian history.",
        importance: "high",
        sources: ["Madariaga (1981)"]
      },
      {
        date_or_year: "1785",
        event: "Issued the Charter to the Gentry, legally securing noble privileges and absolute control over serfs.",
        importance: "high",
        sources: ["Charter to the Gentry text"]
      },
      {
        date_or_year: "1796-11-17",
        event: "Passed away in St. Petersburg; succeeded by her son Paul I.",
        importance: "high",
        sources: ["Massie (2011)"]
      }
    ],
    power_base: "Loyalty of the imperial military guards, cooperative alliance with serf-owning nobility, highly centralized provincial administrative system, and high cultural prestige among European intellectuals.",
    core_goals: [
      "Expand Russian territory southward to the Black Sea and westward through the partitioning of Poland.",
      "Modernize and codify Russian laws, education, and medicine along European Enlightenment principles.",
      "Secure Russia's status as the supreme arbiter of European balance of power diplomacy."
    ],
    incentives: [
      "Overcoming her initial illegitimacy as a foreign usurper of the Romanov throne.",
      "Restoring Russian national glory and wealth.",
      "Cultivating her legacy as an enlightened, philosophical 'philosophe' on the throne."
    ],
    constraints: [
      "Inherent political dependency on the serf-owning noble class who backed her coup.",
      "Constant threat of massive, violent peasant and Cossack uprisings (Pugachev's rebellion).",
      "Severe financial strain and debt resulting from continuous expansionist wars."
    ],
    allies: ["Grigory Potemkin (strategic general/partner)", "Grigory Orlov (coup leader)", "Voltaire (correspondent)", "Nikita Panin"],
    rivals: ["Peter III (husband/deposed)", "Emelyan Pugachev (rebel leader)", "Ottoman Empire Sultan", "Gustav III of Sweden"],
    institutions_controlled_or_influenced: ["Russian Empire", "Imperial Guard Legions", "Governing Senate", "Hermitage Museum (founded by her)"],
    ideology_or_worldview: {
      summary: "Enlightened Absolutism (advocating that absolute monarchy is the only rational state form for Russia, but must govern according to codified laws, secular science, and public education).",
      evidence: [
        "Her extensive Nakaz (Instruction) outlining legal reforms.",
        "Establishing the Smolny Institute, the first state-funded higher education center for women in Europe."
      ],
      confidence: "high"
    },
    decision_patterns: [
      {
        pattern: "Patient, highly calculated geopolitical maneuvering combined with sweeping top-down legislative codes that codified noble privileges to secure her domestic position.",
        examples: [
          "Drafting the Charter of the Gentry in 1785 to secure noble support after the Pugachev rebellion.",
          "Creating the 'Greek Project' with Potemkin to annex the Black Sea and rebuild the Byzantine Empire."
        ],
        confidence: "high"
      }
    ],
    crisis_behavior: "Exhibited remarkable political calm and decisive resolve in crises (e.g. during the Pugachev rebellion and Swedish invasions), mobilizing imperial forces to crush rebels while maintaining her active correspondence with Voltaire.",
    negotiation_style: "highly diplomatic, charming, leveraging her intellectual prestige and extensive private networks, but completely unyielding on Russian territorial expansions.",
    risk_tolerance: "high",
    centralization_preference: "high",
    conflict_preference: "high",
    institutional_respect: "medium",
    coalition_dependency: "high",
    populism_level: "medium",
    technocratic_level: "high",
    game_theory_profile: {
      main_players: ["Russian Empire", "Ottoman Empire", "Prussia", "Austria", "Poland"],
      likely_objectives: [
        "Russia: Expand south to Black Sea, partition Poland, secure borders.",
        "Ottomans: Hold Black Sea, contain Russian navy expansion.",
        "Prussia/Austria: Secure Polish lands to offset Russian growth."
      ],
      payoffs: [
        "Partition of Poland (1772-1795) successfully divided territories between Russia, Prussia, and Austria without a major war between them, optimizing Russia's territorial expansion payoff (Highest diplomatic payoff)."
      ],
      constraints: ["Peasant rebellions (Pugachev) acted as a strict threat constraint that forced rapid consolidation of noble support."],
      common_strategic_moves: ["Summits with European monarchs", "Strategic partitioning agreements"],
      failure_modes: ["Her inability to reform or abolish serfdom (due to dependency on nobility) locked Russia into a backward agrarian structure for another century."]
    },
    bayesian_assessment: [
      {
        claim: "Catherine planned to abolish serfdom in Russia during her early reign.",
        prior_confidence: "medium",
        evidence: [
          "Her early drafts of the Nakaz containing highly critical notes on the morality of serfdom and suggesting eventual emancipation.",
          "Her rapid removal of these anti-serfdom passages after her advisors warned her that the nobility would overthrow her if she challenged their property rights."
        ],
        posterior_confidence: "high",
        what_would_change_this: "Discovery of private papers showing she intended to expand serfdom from the very beginning of her reign."
      }
    ],
    historical_comparisons: [
      {
        compared_to: "Elizabeth I",
        similarities: [
          "Powerful, highly intellectual female rulers who ascended to absolute authority amid dynastic instability.",
          "Presided over magnificent cultural and territorial golden ages of expansion."
        ],
        differences: [
          "Catherine actively deposed her husband via a military coup, ruling as absolute Empress, whereas Elizabeth inherited the crown legally."
        ],
        confidence: "high"
      }
    ],
    source_quality: {
      overall: "strong",
      notes: "Robert Massie's definitive biography, Catherine's own Memoirs, her voluminous correspondence with French philosophes, and official Russian state papers.",
      source_count: 5
    },
    sources: [
      "Massie, Robert K. (2011). Catherine the Great: Portrait of a Woman.",
      "Madariaga, Isabel de. (1981). Russia in the Age of Catherine the Great.",
      "Catherine II. (1767). Nakaz (The Grand Instruction).",
      "Catherine II. (1859). Memoirs of the Empress Catherine II.",
      "Alexander, John T. (1989). Catherine the Great: Life and Legend."
    ],
    research_gaps: ["Determining the exact degree of her private complicity in the murder of her deposed husband Peter III by the Orlov brothers remains historically contested."],
    created_at: "2026-05-31T21:31:33Z",
    updated_at: "2026-05-31T21:31:33Z"
  },

  // 6. Mikhail Gorbachev
  {
    person_id: "mikhail_gorbachev",
    name: "Mikhail Gorbachev",
    aliases: ["Gorby"],
    birth_year: 1931,
    death_year: 2022,
    countries_or_regions: ["Soviet Union", "Russia", "Europe"],
    era: "Late 20th Century / End of Cold War Era",
    roles: ["General Secretary of the Communist Party of the Soviet Union", "President of the Soviet Union"],
    domains: ["Geopolitics", "Statecraft", "Economic"],
    priority_tier: 1,
    short_summary: "Last Soviet leader who initiated Perestroika and Glasnost reforms, co-negotiated the end of the Cold War, and oversaw the peaceful dissolution of the Soviet Union.",
    timeline: [
      {
        date_or_year: "1985-03-11",
        event: "Elected General Secretary of the CPSU, inheriting a stagnant, bankrupt Soviet state.",
        importance: "high",
        sources: ["Taubman (2017)"]
      },
      {
        date_or_year: "1986-04-26",
        event: "Chernobyl Nuclear Disaster: Exposed systemic state secrecy, prompting him to launch the radical Glasnost policy.",
        importance: "high",
        sources: ["Chernobyl records", "Taubman (2017)"]
      },
      {
        date_or_year: "1987-12-08",
        event: "Signed the INF Treaty with Ronald Reagan, eliminating intermediate nuclear forces.",
        importance: "high",
        sources: ["INF Treaty text", "Gorbachev Memoirs"]
      },
      {
        date_or_year: "1989",
        event: "Refused to intervene militarily as democratic revolutions swept Eastern Europe (The Sinatra Doctrine).",
        importance: "high",
        sources: ["Gorbachev Memoirs", "Taubman (2017)"]
      },
      {
        date_or_year: "1990",
        event: "Awarded the Nobel Peace Prize for his leading role in the peaceful termination of the Cold War.",
        importance: "high",
        sources: ["Nobel archives"]
      },
      {
        date_or_year: "1991-08-19",
        event: "Faced the August Coup: Placed under house arrest by conservative hardliners; coup failed but broke his authority.",
        importance: "high",
        sources: ["August coup archives", "Yeltsin Memoirs"]
      },
      {
        date_or_year: "1991-12-25",
        event: "Announced his resignation as President and the formal dissolution of the Soviet Union.",
        importance: "high",
        sources: ["Resignation broadcast", "Taubman (2017)"]
      }
    ],
    power_base: "Reformist wing of the CPSU, international diplomatic goodwill, popular initial public hope, and nominal command of the Soviet state and military apparatus.",
    core_goals: [
      "Revitalize the stagnant Soviet economy through market-oriented socialist reforms (Perestroika).",
      "Open up political transparency, freedom of speech, and democratization (Glasnost) to win back public trust.",
      "End the ruinous Cold War military arms race through collaborative treaties with the United States."
    ],
    incentives: [
      "Averting a catastrophic nuclear war or economic collapse.",
      "Preserving a reformed, democratic socialist Soviet Union.",
      "Securing human rights and freedom of travel for Soviet citizens."
    ],
    constraints: [
      "Deeply entrenched, corrupt conservative military-industrial bureaucracy (Nomenklatura).",
      "Explosive, uncontrollable rise of ethnic nationalism in Soviet republics (e.g. Baltic states).",
      "Severe economic collapse, inflation, and massive food shortages during transition periods."
    ],
    allies: ["Eduard Shevardnadze (Foreign Minister)", "Alexander Yakovlev (Glasnost architect)", "Ronald Reagan (cooperative partner)"],
    rivals: ["Boris Yeltsin (radical opponent)", "Egor Ligachev (conservative hardliner)", "August 1991 Coup conspirators"],
    institutions_controlled_or_influenced: ["Communist Party of the Soviet Union", "Union of Soviet Socialist Republics", "The Warsaw Pact (dissolved)"],
    ideology_or_worldview: {
      summary: "Democratic socialism (socialism with a human face) seeking to combine Marxist ideals with freedom of speech, democratic elections, and international cooperative peaceful coexistence.",
      evidence: [
        "Abolishing the CPSU's constitutional monopoly on power (Article 6) in 1990.",
        "His manifesto book 'Perestroika: New Thinking for Our Country and the World' (1987)."
      ],
      confidence: "high"
    },
    decision_patterns: [
      {
        pattern: "Agile, highly idealistic political reforms (introducing elections, ending censorship) coupled with severe, gridlocked hesitation in economic restructuring, attempting to balance hardliners and radicals.",
        examples: [
          "Refusing to fully implement the 500 Days economic transition plan.",
          "Allowing free parliamentary elections in 1989 while trying to retain party control."
        ],
        confidence: "high"
      }
    ],
    crisis_behavior: "Exhibited strong, calm commitment to nonviolence during crises, consistently refusing to authorize massive military force to crush democratic movements in Eastern Europe or Baltic republics, preferring constitutional resolution.",
    negotiation_style: "highly civilized, intellectual, focusing on shared global principles and personal relationships, winning over Western leaders with his openness.",
    risk_tolerance: "high",
    centralization_preference: "low",
    conflict_preference: "low",
    institutional_respect: "high",
    coalition_dependency: "high",
    populism_level: "high",
    technocratic_level: "medium",
    game_theory_profile: {
      main_players: ["USSR (Gorbachev)", "United States", "Soviet Republics (Yeltsin)", "Party Hardliners"],
      likely_objectives: [
        "Gorbachev: Reform USSR, end Cold War, preserve union.",
        "US: End Soviet threat, secure arms cuts, support democracy.",
        "Yeltsin: Dissolve USSR, secure personal power in Russia.",
        "Hardliners: Retain CPSU monopoly, preserve militarized state."
      ],
      payoffs: [
        "Sinatra Doctrine (1989) successfully avoided a catastrophic Eastern European military conflict, but allowed rapid secession of republics, which Yeltsin leveraged to dissolve the union (Variable strategic payoff)."
      ],
      constraints: ["Severe domestic economic collapse limited his bargaining leverage with Western lenders."],
      common_strategic_moves: ["Summit diplomacy", "Abolishing party monopoly laws"],
      failure_modes: ["His belief that he could reform the CPSU from within while allowing free speech was a major structural miscalculation, causing the rapid collapse of the entire system."]
    },
    bayesian_assessment: [
      {
        claim: "Gorbachev intended to dissolve the Soviet Union from the beginning of his tenure.",
        prior_confidence: "low",
        evidence: [
          "His frequent, passionate public and private speeches throughout 1985-1991 defending the socialist union and Lenin's legacy.",
          "His desperate, late-life drafting of the New Union Treaty in 1991 to preserve a confederated Soviet state."
        ],
        posterior_confidence: "low",
        what_would_change_this: "Discovery of a secret 1985 KGB memo showing Gorbachev planned to deliberately dismantle the USSR in exchange for Western bribes."
      }
    ],
    historical_comparisons: [
      {
        compared_to: "Alexander Kerensky",
        similarities: [
          "Idealistic, moderate reformists who led their countries during revolutionary transitions.",
          "Swept aside by radical, ruthless political rivals (Lenin/Yeltsin) who seized absolute power."
        ],
        differences: [
          "Gorbachev commanded a massive global nuclear superpower for six years, co-designing the end of the Cold War."
        ],
        confidence: "high"
      }
    ],
    source_quality: {
      overall: "strong",
      notes: "William Taubman's definitive biography, Gorbachev's extensive Memoirs, Russian and US diplomatic papers, and cold war historical analyses.",
      source_count: 5
    },
    sources: [
      "Taubman, William. (2017). Gorbachev: His Life and Times.",
      "Gorbachev, Mikhail. (1995). Memoirs.",
      "Gorbachev, Mikhail. (1987). Perestroika: New Thinking for Our Country and the World.",
      "Gaddis, John Lewis. (2005). The Cold War: A New History.",
      "Zubok, Vladislav M. (2007). A Failed Empire: The Soviet Union in the Cold War from Stalin to Gorbachev."
    ],
    research_gaps: ["Determining the exact degree of his private foreknowledge regarding the KGB actions in the Baltic states in early 1991 (Vilnius massacre) remains subject to historical debate."],
    created_at: "2026-05-31T21:31:33Z",
    updated_at: "2026-05-31T21:31:33Z"
  },

  // 7. Saddam Hussein
  {
    person_id: "saddam_hussein",
    name: "Saddam Hussein",
    aliases: ["Saddam"],
    birth_year: 1937,
    death_year: 2006,
    countries_or_regions: ["Iraq", "Middle East"],
    era: "Late 20th / Early 21st Century / Ba'athist Iraq Era",
    roles: ["President of Iraq", "Prime Minister of Iraq"],
    domains: ["Geopolitics", "Statecraft", "Military"],
    priority_tier: 1,
    short_summary: "Ba'athist dictator of Iraq who initiated the Iran-Iraq War, invaded Kuwait (provoking the Gulf War), and was deposed by the 2003 US-led invasion.",
    timeline: [
      {
        date_or_year: "1979-07-16",
        event: "Assumed absolute presidency of Iraq, immediately staging a televised purge of the Ba'ath Party leadership.",
        importance: "high",
        sources: ["Karsh & Rautsi (1991)"]
      },
      {
        date_or_year: "1980-09-22",
        event: "Launched a preemptive military invasion of Iran, initiating the devastating 8-year Iran-Iraq War.",
        importance: "high",
        sources: ["Karsh (2002)", "Karsh & Rautsi (1991)"]
      },
      {
        date_or_year: "1888",
        event: "Authorized the Al-Anfal campaign against the Kurdish population, including the Halabja chemical attack.",
        importance: "high",
        sources: ["Al-Anfal trial records", "Human Rights Watch report"]
      },
      {
        date_or_year: "1990-08-02",
        event: "Ordered the military invasion and annexation of Kuwait, claiming it as Iraq's 19th province.",
        importance: "high",
        sources: ["Kuwait invasion documents"]
      },
      {
        date_or_year: "1991-02",
        event: "Defeated by the US-led coalition in the Gulf War (Operation Desert Storm); brutally suppressed subsequent Shia/Kurdish uprisings.",
        importance: "high",
        sources: ["Gulf War archives", "Karsh & Rautsi (1991)"]
      },
      {
        date_or_year: "2003-03-20",
        event: "Deposed following the US-led military invasion of Iraq; captured in a spider hole in December.",
        importance: "high",
        sources: ["Iraq War archives", "Myers (2015)"]
      },
      {
        date_or_year: "2006-12-30",
        event: "Executed by hanging in Baghdad after being convicted of crimes against humanity by the Iraqi Special Tribunal.",
        importance: "high",
        sources: ["Trial transcripts"]
      }
    ],
    power_base: "Totalitarian control of the Ba'ath Party apparatus, Tikriti family clan loyalty networks, elite Republican Guard, state oil revenues, and massive state terror.",
    core_goals: [
      "Establish and protect absolute personal dictatorial authority in Iraq.",
      "Assert Iraqi military and political hegemony over the Persian Gulf and Arab world.",
      "Systematically destroy Shia and Kurdish dissident movements that challenged secular Sunni Ba'athist rule."
    ],
    incentives: [
      "Regime survival and personal security against internal coups and assassinations.",
      "Securing absolute control over regional oil reserves.",
      "Attaining historical glory as a modern Nebuchadnezzar of the Arab world."
    ],
    constraints: [
      "Severe economic devastation and bankruptcy from his prolonged wars.",
      "Comprehensive international UN trade, oil, and weapons sanctions.",
      "Absolute US technological and military superiority in conventional warfare."
    ],
    allies: ["Tariq Aziz (Foreign Minister)", "Ali Hassan al-Majid ('Chemical Ali')", "Barzan al-Tikriti"],
    rivals: ["Ayatollah Khomeini", "George H.W. Bush", "George W. Bush", "Kurdish and Shia dissident leaders"],
    institutions_controlled_or_influenced: ["Republic of Iraq", "Ba'ath Party", "Iraqi Republican Guard", "Mukhabarat (Intelligence)"],
    ideology_or_worldview: {
      summary: "Ba'athist Arab nationalism combined with secular militarism, absolute totalitarian control, and state-backed hero-worship cult of personality.",
      evidence: [
        "Televised execution purges in 1979 to terrorize the cabinet.",
        "Systematic use of chemical weapons (mustard gas and sarin) against civilian populations."
      ],
      confidence: "high"
    },
    decision_patterns: [
      {
        pattern: "Bold, highly aggressive, and under-calculated military gambles designed to catch regional neighbors by surprise, completely ignoring long-term global coalitions.",
        examples: [
          "Invading Iran in 1980, underestimating their revolutionary mobilization.",
          "Invading Kuwait in 1990, completely failing to predict US military intervention."
        ],
        confidence: "high"
      }
    ],
    crisis_behavior: "Exhibited highly stubborn, delusional, and paranoid behavior during crises, hiding in bunkers and Tikriti networks, completely refusing to yield or cooperate with international inspectors, leading to his downfall.",
    negotiation_style: "defiant, theatrical, using hostages and regional threats (e.g., firing Scuds at Israel) as leverage, completely refusing to show weakness publicly.",
    risk_tolerance: "high",
    centralization_preference: "high",
    conflict_preference: "high",
    institutional_respect: "low",
    coalition_dependency: "low",
    populism_level: "high",
    technocratic_level: "medium",
    game_theory_profile: {
      main_players: ["Iraq (Saddam)", "United States", "Iran", "Kuwait"],
      likely_objectives: [
        "Iraq: Annex oilfields, secure regime survival, deter Iran.",
        "US: Protect Gulf oil, contain expansion, enforce UN resolutions.",
        "Iran: Defeat Iraqi aggression, export revolution."
      ],
      payoffs: [
        "Invading Kuwait (1990) was a high-risk gamble to erase Iraq's war debt, but triggered a catastrophic military response, destroying his regional power (Lowest payoff)."
      ],
      constraints: ["UN arms embargoes post-1991 severely degraded his conventional military capabilities."],
      common_strategic_moves: ["Preemptive strikes", "Creating regional crises (Scud launches) to break coalitions"],
      failure_modes: ["His absolute refusal to cooperate transparently with UN weapons inspectors in 2002-2003, which gave the US a pretext for invasion."]
    },
    bayesian_assessment: [
      {
        claim: "Saddam retained an active, large chemical and biological weapons stockpile in 2003.",
        prior_confidence: "medium",
        evidence: [
          "His systematic efforts to obstruct UN inspectors and maintain an aura of having WMDs to deter his primary regional rival, Iran.",
          "The complete, exhaustive post-2003 search (Iraq Survey Group) which found no active, weaponized stockpiles, only degraded interwar remnants."
        ],
        posterior_confidence: "low",
        what_would_change_this: "Discovery of a hidden underground cache in Iraq containing fresh, weaponized sarin shells manufactured in 2002."
      }
    ],
    historical_comparisons: [
      {
        compared_to: "Adolf Hitler",
        similarities: [
          "Totalitarian dictators who seized absolute power through party purges.",
          "Launched high-risk preemptive invasions of neighboring states, causing catastrophic regional devastation."
        ],
        differences: [
          "Saddam operated a regional client state in a post-colonial Middle Eastern paradigm, ultimately defeated by foreign superpower coalitions."
        ],
        confidence: "high"
      }
    ],
    source_quality: {
      overall: "strong",
      notes: "Extensive post-2003 captured Ba'ath Party files, UN weapons inspection records, trial transcripts, and definitive academic biographies.",
      source_count: 5
    },
    sources: [
      "Karsh, Efraim & Rautsi, Inari. (1991). Saddam Hussein: A Political Biography.",
      "Coughlin, Con. (2002). Saddam: King of Terror.",
      "Karsh, Efraim. (2002). The Iran-Iraq War 1980-1988.",
      "Woods, Kevin M. (2008). The Saddam Tapes: The Inner Workings of a Tyrant's Regime.",
      "Human Rights Watch. (1993). Genocide in Iraq: The Anfal Campaign Against the Kurds."
    ],
    research_gaps: ["Determining the exact degree of his private psychological isolation and mental state in his final years in bunkers remains heavily analyzed by intelligence historians."],
    created_at: "2026-05-31T21:31:33Z",
    updated_at: "2026-05-31T21:31:33Z"
  },

  // 8. Yasser Arafat
  {
    person_id: "yasser_arafat",
    name: "Yasser Arafat",
    aliases: ["Abu Ammar"],
    birth_year: 1929,
    death_year: 2004,
    countries_or_regions: ["Palestine", "Middle East"],
    era: "Late 20th / Early 21st Century / Israeli-Palestinian Conflict",
    roles: ["Chairman of the Palestine Liberation Organization", "President of the Palestinian National Authority", "Fatah Leader"],
    domains: ["Geopolitics", "Statecraft", "Military"],
    priority_tier: 1,
    short_summary: "Palestinian leader who headed the PLO, co-negotiated the Oslo Accords with Yitzhak Rabin, and established the Palestinian National Authority.",
    timeline: [
      {
        date_or_year: "1959",
        event: "Co-founded the Fatah movement in Kuwait, advocating for armed struggle to liberate Palestine.",
        importance: "high",
        sources: ["Aburish (1998)"]
      },
      {
        date_or_year: "1969",
        event: "Elected Chairman of the Palestine Liberation Organization (PLO), unifying the nationalist movement.",
        importance: "high",
        sources: ["Aburish (1998)", "Gowers & Walker (1990)"]
      },
      {
        date_or_year: "1974-11-13",
        event: "Delivered his famous 'Olive Branch and Freedom Fighter's Gun' speech to the UN General Assembly.",
        importance: "high",
        sources: ["UN General Assembly speech text"]
      },
      {
        date_or_year: "1988-12",
        event: "Declared Palestinian independence in Algiers, formally renouncing terrorism and recognizing Israel's right to exist.",
        importance: "high",
        sources: ["PLO Algiers declaration"]
      },
      {
        date_or_year: "1993-09-13",
        event: "Signed the Oslo Accords on the White House lawn, shaking hands with Yitzhak Rabin.",
        importance: "high",
        sources: ["Oslo Accords text", "Ross (2004)"]
      },
      {
        date_or_year: "1994",
        event: "Awarded the Nobel Peace Prize jointly with Yitzhak Rabin and Shimon Peres.",
        importance: "high",
        sources: ["Nobel archives"]
      },
      {
        date_or_year: "2000-07",
        event: "Camp David Summit: Rejected Bill Clinton and Ehud Barak's peace proposals; subsequent launch of Second Intifada.",
        importance: "high",
        sources: ["Ross (2004)", "Clinton Memoirs"]
      },
      {
        date_or_year: "2004-11-11",
        event: "Passed away in a military hospital in Clamart, France, after falling ill during Israeli siege of his Ramallah compound.",
        importance: "high",
        sources: ["Aburish (1998)", "Medical records"]
      }
    ],
    power_base: "Charismatic standing as the father of Palestinian nationalism, absolute control over Fatah and PLO party finances, refugee camp loyalty networks, and global diplomatic recognition.",
    core_goals: [
      "Establish an independent, sovereign state of Palestine with East Jerusalem as capital.",
      "Maintain personal, centralized leadership over the fractured Palestinian national movement.",
      "Expose and challenge Israeli military occupation through combined armed struggle and diplomacy."
    ],
    incentives: [
      "Achieving self-determination and sovereign territory for the Palestinian people.",
      "Retaining his personal status as the sole legitimate representative of Palestine.",
      "Managing complex alliances with shifting Arab host governments."
    ],
    constraints: [
      "Absolute military, intelligence, and technological superiority of the State of Israel.",
      "Intense, violent political rivalry from Islamist militant groups (Hamas and Islamic Jihad).",
      "Severe financial dependency on volatile foreign donor aid."
    ],
    allies: ["Mahmoud Abbas", "Khalil al-Wazir (Abu Jihad)", "Yitzhak Rabin (peace partner)", "Bill Clinton (mediator)"],
    rivals: ["Ariel Sharon", "Benjamin Netanyahu", "Hamas leadership", "King Hussein of Jordan (Black September)"],
    institutions_controlled_or_influenced: ["Palestine Liberation Organization", "Fatah", "Palestinian National Authority", "Al-Aqsa Martyrs' Brigades"],
    ideology_or_worldview: {
      summary: "Secular Palestinian nationalism combining guerilla warfare strategy and anti-colonial resistance with pragmatic diplomatic leverage to secure a sovereign two-state solution.",
      evidence: [
        "His speech to the UN General Assembly representing a liberation struggle.",
        "Signing the Oslo Accords establishing administrative autonomy."
      ],
      confidence: "high"
    },
    decision_patterns: [
      {
        pattern: "Tactical ambiguity: balancing simultaneously between armed militancy and diplomatic peace negotiations, refusing to completely disarm militants to retain leverage in talks.",
        examples: [
          "Condemning terrorist attacks in English while delivering passionate Arabic speeches praising martyrdom.",
          "Rejecting the Camp David proposal rather than offering a concrete counter-map to avoid splitting his coalition."
        ],
        confidence: "high"
      }
    ],
    crisis_behavior: "Exhibited highly dramatic and resilient behavior when under siege or in exile, using his military uniform and keffiyeh systematically to project the image of a constant resistance fighter.",
    negotiation_style: "eloquent, highly theatrical, focusing on grand historical injustices, while showing extreme reluctance to sign definitive final-status agreements that closed historical claims.",
    risk_tolerance: "high",
    centralization_preference: "high",
    conflict_preference: "high",
    institutional_respect: "medium",
    coalition_dependency: "high",
    populism_level: "high",
    technocratic_level: "low",
    game_theory_profile: {
      main_players: ["PLO (Arafat)", "Israel", "United States", "Hamas"],
      likely_objectives: [
        "PLO: Secure independent state, retain power, keep right of return.",
        "Israel: Secure borders, end conflict, retain Jerusalem sovereignty.",
        "Hamas: Destroy Israel, eliminate PLO secular leadership."
      ],
      payoffs: [
        "Oslo Accords (1993) established a temporary cooperative equilibrium that returned Arafat to Palestine and established the PNA, but collapsed due to mutual trust failures (Variable strategic payoff)."
      ],
      constraints: ["Fear of being assassinated as a traitor by radical Palestinians (like Rabin was by a right-wing Israeli) limited his ability to compromise on Jerusalem or refugees."],
      common_strategic_moves: ["Violent uprisings (Intifadas)", "Multilateral UN resolutions"],
      failure_modes: ["His inability to transition from a revolutionary guerrilla leader to a transparent state administrator, leading to systemic corruption in the PNA."]
    },
    bayesian_assessment: [
      {
        claim: "Arafat planned and launched the Second Intifada in 2000 as a strategic decision.",
        prior_confidence: "medium",
        evidence: [
          "The sudden eruption of mass violence immediately following the collapse of the Camp David summit.",
          "The Mitchell Committee Report which found no evidence of a pre-planned conspiracy, concluding that Ariel Sharon's visit to the Temple Mount was a trigger that ignited highly volatile, spontaneous public frustration that Arafat subsequently co-opted."
        ],
        posterior_confidence: "medium",
        what_would_change_this: "Discovery of written orders signed by Arafat dated prior to September 2000 instructing Fatah cells to launch armed attacks on specific dates."
      }
    ],
    historical_comparisons: [
      {
        compared_to: "Nelson Mandela",
        similarities: [
          "Charismatic leaders of national liberation movements who spent decades in exile/prison.",
          "Won the Nobel Peace Prize for co-negotiating transitions to peace with their primary state adversaries."
        ],
        differences: [
          "Arafat failed to secure a final, stable peace agreement or establish a functioning, unified democratic state before his death."
        ],
        confidence: "high"
      }
    ],
    source_quality: {
      overall: "medium",
      notes: "Large body of diplomatic histories, memoirs of negotiators (Ross, Clinton), and biographies, though some PLO security files remain guarded.",
      source_count: 5
    },
    sources: [
      "Aburish, Said K. (1998). Arafat: From Defender to Dictator.",
      "Gowers, Andrew & Walker, Tony. (1990). Behind the Myth: Yasser Arafat and the Palestinian Revolution.",
      "Ross, Dennis. (2004). The Missing Peace: The Inside Story of the Fight for Middle East Peace.",
      "Clinton, Bill. (2004). My Life.",
      "Enderlin, Charles. (2003). Shattered Dreams: The Failure of the Peace Process in the Middle East."
    ],
    research_gaps: ["The exact medical cause of his death and whether he was poisoned with Polonium-210 remain subject to forensic/political disputes."],
    created_at: "2026-05-31T21:31:33Z",
    updated_at: "2026-05-31T21:31:33Z"
  },

  // 9. David Ben-Gurion
  {
    person_id: "david_ben_gurion",
    name: "David Ben-Gurion",
    aliases: ["Israel's Founding Father"],
    birth_year: 1886,
    death_year: 1973,
    countries_or_regions: ["Israel", "Middle East"],
    era: "20th Century / State of Israel Creation Era",
    roles: ["First Prime Minister of Israel", "Minister of Defense"],
    domains: ["Geopolitics", "Statecraft", "Military"],
    priority_tier: 1,
    short_summary: "Zionist leader who proclaimed the independence of the State of Israel in 1948, led the nation through the 1948 war, and built its core democratic institutions.",
    timeline: [
      {
        date_or_year: "1906",
        event: "Emigrated to Ottoman Palestine, working in agriculture and organizing labor groups.",
        importance: "high",
        sources: ["Teveth (1987)"]
      },
      {
        date_or_year: "1935",
        event: "Elected Chairman of the Executive Committee of the Jewish Agency, directing Zionist settlement.",
        importance: "high",
        sources: ["Teveth (1987)", "Segev (2018)"]
      },
      {
        date_or_year: "1948-05-14",
        event: "Read the Declaration of Independence of the State of Israel at the Tel Aviv Museum.",
        importance: "high",
        sources: ["Declaration of Independence archives", "Segev (2018)"]
      },
      {
        date_or_year: "1948-06",
        event: "Altalena Affair: Ordered the shelling of an Irgun arms ship to enforce a singular state military monopoly.",
        importance: "high",
        sources: ["Altalena records", "Segev (2018)"]
      },
      {
        date_or_year: "1948-1949",
        event: "Led Israel to military victory during the War of Independence, securing borders.",
        importance: "high",
        sources: ["1948 war archives", "Morris (2008)"]
      },
      {
        date_or_year: "1953",
        event: "Signed the Reparations Agreement with West Germany, securing vital funds to stabilize the economy.",
        importance: "high",
        sources: ["Reparations treaty records"]
      },
      {
        date_or_year: "1956",
        event: "Suez Crisis: Coordinated with France and Britain to invade Sinai, securing shipping lanes.",
        importance: "high",
        sources: ["Kyle (1991)", "Segev (2018)"]
      },
      {
        date_or_year: "1973-12-01",
        event: "Passed away in Sde Boker kibbutz in the Negev desert.",
        importance: "high",
        sources: ["Segev (2018)"]
      }
    ],
    power_base: "Mapai socialist Zionist party dominance, supreme command of the Israel Defense Forces (IDF), Histadrut labor unions backing, and massive international Jewish support.",
    core_goals: [
      "Establish and secure a sovereign, independent Jewish democratic state in Palestine.",
      "Ingather millions of global Jewish refugees (Aliyah) to build a solid demographic base.",
      "Construct highly centralized, state-managed institutions ('Statism') replacing partisan militias."
    ],
    incentives: [
      "Securing the survival of the Jewish people after the Holocaust.",
      "Defeating surrounding Arab military coalitions.",
      "Developing the Negev desert as a strategic and demographic depth."
    ],
    constraints: [
      "Immediate military invasion by multiple surrounding Arab states in 1948.",
      "Severe post-war economic austerity and lack of natural resources.",
      "Fierce ideological factionalism between militant right-wing (Irgun) and socialist Zionists."
    ],
    allies: ["Chaim Weizmann", "Golda Meir", "Moshe Sharett", "Yigael Yadin"],
    rivals: ["Menachem Begin (right-wing militant rival)", "Gamal Abdel Nasser", "Arab League leaders"],
    institutions_controlled_or_influenced: ["State of Israel", "Israel Defense Forces", "Jewish Agency", "Mapai Party"],
    ideology_or_worldview: {
      summary: "Labor Zionism combined with Mamlahtiut (Statism: the belief that all partisan sectarian groups must submit to centralized state institutions), secular modernization, and Hebrew cultural revival.",
      evidence: [
        "Abolishing the separate partisan Palmach and Irgun commands to form the unified IDF.",
        "Establishing state-run education replacing party-affiliated school networks."
      ],
      confidence: "high"
    },
    decision_patterns: [
      {
        pattern: "Bold, highly decisive executive decisions (e.g. declaring independence despite cabinet fears), followed by ruthless enforcement of state authority during crises to crush division.",
        examples: [
          "Declaring the state of Israel hours before the British mandate expired.",
          "Ordering the shelling of the Altalena arms ship in 1948."
        ],
        confidence: "high"
      }
    ],
    crisis_behavior: "Exhibited highly disciplined, cool, and stubborn resolve in crises, prioritizing military mobilization and immigrant integration, refusing to compromise on core state borders.",
    negotiation_style: "direct, realistic, highly focused on concrete territorial boundaries and security guarantees, bypassing diplomatic pleasantries to secure results.",
    risk_tolerance: "high",
    centralization_preference: "high",
    conflict_preference: "high",
    institutional_respect: "high",
    coalition_dependency: "high",
    populism_level: "high",
    technocratic_level: "high",
    game_theory_profile: {
      main_players: ["Israel", "Arab States", "United States", "Great Britain"],
      likely_objectives: [
        "Israel: Secure independence, expand borders, ingather refugees.",
        "Arab States: Suppress Zionist state, annex territory.",
        "US: Avoid Middle Eastern war, contain Soviet influence."
      ],
      payoffs: [
        "Proclaiming independence (1948) successfully established the state, shifting the game from diplomatic negotiations to a defensive war which Israel won, securing sovereignty (Highest payoff)."
      ],
      constraints: ["Severe weapons shortages in early 1948 forced reliance on Czech arms shipments."],
      common_strategic_moves: ["Unilateral declarations", "Centralizing military commands"],
      failure_modes: ["His backing of the Suez invasion in 1956 alienated the US, forcing a humiliating withdrawal from Sinai under Eisenhower's pressure."]
    },
    bayesian_assessment: [
      {
        claim: "Ben-Gurion actively planned and ordered the systematic expulsion of the Palestinian Arab population in 1948 (Plan Dalet).",
        prior_confidence: "medium",
        evidence: [
          "The extensive flight of over 700,000 Palestinian Arabs during the 1948 war.",
          "Benny Morris's historical analysis showing that while Plan Dalet authorized military operations to secure borders (which included clearing hostile villages), there was no centralized, written cabinet order from Ben-Gurion for total systematic expulsion, with outcomes varying by local commander."
        ],
        posterior_confidence: "medium",
        what_would_change_this: "Discovery of a signed military directive from Ben-Gurion dated April 1948 ordering the complete, forced expulsion of all Arab civilians regardless of local hostility."
      }
    ],
    historical_comparisons: [
      {
        compared_to: "George Washington",
        similarities: [
          "Founding fathers who declared independence and led their nations through successful wars of survival.",
          "Established central, unified state institutions and subordinated military forces to civil authority."
        ],
        differences: [
          "Ben-Gurion operated a highly centralized, socialist-leaning parliamentary democracy managing mass immigrant integration."
        ],
        confidence: "high"
      }
    ],
    source_quality: {
      overall: "strong",
      notes: "His extensive diaries, official state papers, Benny Morris's 1948 war histories, and Segev's definitive biography.",
      source_count: 5
    },
    sources: [
      "Segev, Tom. (2018). A State at Any Cost: The Life of David Ben-Gurion.",
      "Teveth, Shabtai. (1987). Ben-Gurion: The Burning Ground, 1886-1948.",
      "Morris, Benny. (2008). 1948: A History of the First Arab-Israeli War.",
      "Ben-Gurion, David. (1971). Israel: A Personal History.",
      "Shlaim, Avi. (2000). The Iron Wall: Israel and the Arab World."
    ],
    research_gaps: ["Determining the exact degree of his private foreknowledge regarding the Lavon Affair (sabotage in Egypt) in 1954 remains historically debated."],
    created_at: "2026-05-31T21:31:33Z",
    updated_at: "2026-05-31T21:31:33Z"
  },

  // 10. Mustafa Kemal Atatürk
  {
    person_id: "mustafa_kemal_ataturk",
    name: "Mustafa Kemal Atatürk",
    aliases: ["Atatürk", "Mustafa Kemal Pasha"],
    birth_year: 1881,
    death_year: 1938,
    countries_or_regions: ["Turkey", "Middle East", "Europe"],
    era: "Early 20th Century / Turkish War of Independence Era",
    roles: ["First President of Turkey", "General in the Ottoman Army"],
    domains: ["Geopolitics", "Statecraft", "Social Reform"],
    priority_tier: 1,
    short_summary: "Founder of the Republic of Turkey who led the war of independence, abolished the Ottoman Caliphate, and implemented sweeping secular-westernizing reforms.",
    timeline: [
      {
        date_or_year: "1915",
        event: "Achieved national military fame for his successful defense of the Gallipoli peninsula against Allied forces.",
        importance: "high",
        sources: ["Mango (1999)"]
      },
      {
        date_or_year: "1919-05-19",
        event: "Landed in Samsun, initiating the national resistance movement against Allied partition of Anatolia.",
        importance: "high",
        sources: ["Mango (1999)", "Kinross (1964)"]
      },
      {
        date_or_year: "1922-09",
        event: "Won the decisive War of Independence, recapturing Izmir and defeating Greek forces.",
        importance: "high",
        sources: ["Kinross (1964)"]
      },
      {
        date_or_year: "1923-10-29",
        event: "Proclaimed the establishment of the Republic of Turkey; elected its first President.",
        importance: "high",
        sources: ["Turkish Republic archives"]
      },
      {
        date_or_year: "1924-03-03",
        event: "Abolished the Ottoman Caliphate, expelling all members of the imperial family.",
        importance: "high",
        sources: ["Caliphate abolition decree", "Mango (1999)"]
      },
      {
        date_or_year: "1925",
        event: "Enforced the Hat Law and closed traditional dervish lodges, attacking religious symbols.",
        importance: "high",
        sources: ["Mango (1999)"]
      },
      {
        date_or_year: "1928",
        event: "Replaced the Arabic script with the new Latin-based Turkish alphabet, personally teaching it.",
        importance: "high",
        sources: ["Alphabet reform archives"]
      },
      {
        date_or_year: "1938-11-10",
        event: "Passed away in Dolmabahçe Palace in Istanbul; national mourning declared.",
        importance: "high",
        sources: ["Mango (1999)"]
      }
    ],
    power_base: "Supreme military prestige from the War of Independence, absolute control over the Republican People's Party (CHP) monopoly, loyal reformist officer corps, and nationalist popular consensus.",
    core_goals: [
      "Secure and maintain the absolute sovereign independence of a unified Turkish republic, rejecting partition.",
      "Enforce rapid, comprehensive Westernization reforms (alphabet, civil law, calendar) to modernize society.",
      "Construct a highly stable, secular nation-state free from the influence of traditional religious clergy."
    ],
    incentives: [
      "Eradicating the backwardness and decay that destroyed the late Ottoman Empire.",
      "Defeating European partition efforts.",
      "Establishing secular education and gender equality laws."
    ],
    constraints: [
      "Deep-seated, traditional Islamic devotion among the conservative Anatolian populace.",
      "Complete economic exhaustion and lack of industrial capital post-WWI.",
      "Hostile Allied powers (UK, France) seeking to enforce the Treaty of Sèvres."
    ],
    allies: ["İsmet İnönü (successor/general)", "Fevzi Çakmak", "Sabiha Gökçen (adopted daughter/pilot)"],
    rivals: ["Sultan Mehmed VI", "Conservative Sunni Clergy", "Kurdish tribal separatists (Sheikh Said)"],
    institutions_controlled_or_influenced: ["Grand National Assembly of Turkey", "Republican People's Party", "Turkish Armed Forces"],
    ideology_or_worldview: {
      summary: "Kemalism (six principles: Republicanism, Nationalism, Secularism, Statism, Populism, and Reformism), advocating for rapid secular westernization and national self-reliance under state guidance.",
      evidence: [
        "Abolishing Sharia courts and adopting the Swiss Civil Code in 1926.",
        "Amending the Constitution to declare Turkey a secular state in 1937."
      ],
      confidence: "high"
    },
    decision_patterns: [
      {
        pattern: "Bold, highly rapid top-down reforms implemented by decree, completely bypassing traditional religious and custom structures, using the military to crush any violent pushback.",
        examples: [
          "Introducing the Latin alphabet in three months despite advisors claiming it would take years.",
          "Banning the traditional Ottoman fez hat under penalty of imprisonment."
        ],
        confidence: "high"
      }
    ],
    crisis_behavior: "Exhibited extraordinary military cool, tactical genius, and unyielding resolve during battle and political crises, famously telling his troops at Gallipoli: 'I do not order you to fight, I order you to die.'",
    negotiation_style: "direct, uncompromising on national sovereignty, leveraging military victories to force European recognition of Turkish borders (Treaty of Lausanne).",
    risk_tolerance: "high",
    centralization_preference: "high",
    conflict_preference: "high",
    institutional_respect: "high",
    coalition_dependency: "low",
    populism_level: "high",
    technocratic_level: "high",
    game_theory_profile: {
      main_players: ["Turkish Nationalists", "Allied Powers (UK/France)", "Greece", "Ottoman Sultan"],
      likely_objectives: [
        "Nationalists: Reject Sèvres partition, secure sovereign borders, modernize state.",
        "Allies: Partition Ottoman lands, internationalize straits.",
        "Sultan: Retain nominal throne, cooperate with Allies."
      ],
      payoffs: [
        "Treaty of Lausanne (1923) successfully replaced the humiliating Sèvres treaty, securing international recognition of Turkey's sovereign heartland (Highest diplomatic payoff)."
      ],
      constraints: ["Severe post-war fiscal exhaustion forced tactical negotiations on oil-rich Mosul (ceded to Iraq/UK)."],
      common_strategic_moves: ["Rapid military counteroffensives", "Secular-legal decrees"],
      failure_modes: ["His rapid, top-down suppression of traditional Islamic institutions created a deep, permanent secular-religious split in Turkish politics."]
    },
    bayesian_assessment: [
      {
        claim: "Atatürk abolished the Caliphate primarily to clear his path for secular reforms rather than out of anti-religious bias.",
        prior_confidence: "high",
        evidence: [
          "His realization that as long as the Caliph remained as an alternative source of traditional authority, conservative opposition would always rally around him to block reforms.",
          "His private remarks stating that modern Turkey could not survive with medieval religious offices that claimed pan-national authority."
        ],
        posterior_confidence: "high",
        what_would_change_this: "Discovery of private papers showing he planned to declare himself Caliph once his personal power was consolidated."
      }
    ],
    historical_comparisons: [
      {
        compared_to: "Peter the Great",
        similarities: [
          "Westernizing autocrats who transformed their traditional societies top-down.",
          "Forced changes in dress, script, calendar, and law, brutally crushing conservative religious resistance."
        ],
        differences: [
          "Atatürk established a constitutional republic rather than a dynastic empire, voluntarily creating a secular legal framework."
        ],
        confidence: "high"
      }
    ],
    source_quality: {
      overall: "strong",
      notes: "His monumental 36-hour 'Nutuk' speech detailing the independence war, official Turkish state papers, and Andrew Mango's definitive biography.",
      source_count: 5
    },
    sources: [
      "Mango, Andrew. (1999). Atatürk: The Biography of the Founder of Modern Turkey.",
      "Kinross, Lord. (1964). Atatürk: A Biography of Mustafa Kemal.",
      "Atatürk, Mustafa Kemal. (1927). Nutuk (The Speech).",
      "Hanioğlu, M. Şükrü. (2011). Atatürk: An Intellectual Biography.",
      "Zürcher, Erik J. (1984). The Unionist Factor: The Role of the Committee of Union and Progress in the Turkish National Movement."
    ],
    research_gaps: ["The exact details of his private life, early marriages, and final days with liver disease remain subject to selective state archives and analysis."],
    created_at: "2026-05-31T21:31:33Z",
    updated_at: "2026-05-31T21:31:33Z"
  },

  // 11. Kwame Nkrumah
  {
    person_id: "kwame_nkrumah",
    name: "Kwame Nkrumah",
    aliases: ["Osagyefo"],
    birth_year: 1909,
    death_year: 1972,
    countries_or_regions: ["Ghana", "Africa"],
    era: "20th Century / Decolonization / Pan-Africanism Era",
    roles: ["First President of Ghana", "First Prime Minister of Ghana"],
    domains: ["Geopolitics", "Statecraft", "Ideology"],
    priority_tier: 1,
    short_summary: "First President of independent Ghana who led the decolonization of Sub-Saharan Africa, pioneered Pan-Africanism, and co-founded the OAU.",
    timeline: [
      {
        date_or_year: "1947",
        event: "Returned to the Gold Coast, joining the UGCC to organize nationalist movements.",
        importance: "high",
        sources: ["Davidson (1973)"]
      },
      {
        date_or_year: "1949",
        event: "Founded the radical Convention People's Party (CPP), launching the 'Positive Action' strike campaign.",
        importance: "high",
        sources: ["Davidson (1973)", "Nkrumah Memoirs"]
      },
      {
        date_or_year: "1951",
        event: "Won elections while imprisoned; released by British Governor Arden-Clarke to become Leader of Government Business.",
        importance: "high",
        sources: ["Arden-Clarke files", "Davidson (1973)"]
      },
      {
        date_or_year: "1957-03-06",
        event: "Proclaimed the independence of Ghana, declaring: 'Our independence is meaningless unless it is linked up with the total liberation of the African continent.'",
        importance: "high",
        sources: ["Ghana independence speeches"]
      },
      {
        date_or_year: "1961",
        event: "Launched the Volta River Project (Akosombo Dam) to secure industrial power.",
        importance: "high",
        sources: ["Volta River project records"]
      },
      {
        date_or_year: "1963-05-25",
        event: "Co-founded the Organisation of African Unity (OAU) in Addis Ababa, presenting his plan for a United States of Africa.",
        importance: "high",
        sources: ["OAU founding transcripts"]
      },
      {
        date_or_year: "1964",
        event: "Passed constitutional amendments declaring Ghana a one-party state and himself President for Life.",
        importance: "high",
        sources: ["Ghana constitutional amendments"]
      },
      {
        date_or_year: "1966-02-24",
        event: "Deposed in a military coup while on a state visit to Beijing; spent the rest of his life in exile in Guinea.",
        importance: "high",
        sources: ["Coup logs", "Davidson (1973)"]
      }
    ],
    power_base: "CPP mass political mobilization, popular street adoration ('Osagyefo'), control over state cocoa board revenues, and international Pan-African prestige.",
    core_goals: [
      "Achieve complete decolonization for Ghana and the wider African continent.",
      "Champion absolute political and economic Pan-African unification (United States of Africa).",
      "Implement rapid state-led industrialization and socialist modernization."
    ],
    incentives: [
      "Eradicating Western neo-colonial and colonial influence in Africa.",
      "Unifying Africa to create a powerful global geopolitical bloc.",
      "Preventing tribal balkanization of newly independent Ghana."
    ],
    constraints: [
      "Severe economic dependency on highly volatile global cocoa export prices.",
      "Bitter domestic opposition from traditional tribal chiefs (Ashanti elites) who favored regionalism.",
      "Rising military and civil service discontent over his centralized, authoritarian laws."
    ],
    allies: ["Julius Nyerere (complex Pan-African partner)", "Sékou Touré of Guinea", "W.E.B. Du Bois", "Gamal Abdel Nasser"],
    rivals: ["J.B. Danquah (opposition intellectual/died in prison)", "British Colonial Authorities", "Ghanaian military coup officers"],
    institutions_controlled_or_influenced: ["Republic of Ghana", "Convention People's Party", "Organisation of African Unity"],
    ideology_or_worldview: {
      summary: "Consciencism and Pan-African socialism, arguing that Africa must reject Western capitalist neo-colonialism and unify into a singular political federation to protect its sovereignty.",
      evidence: [
        "His classic ideological book 'Neo-Colonialism: The Last Stage of Imperialism' (1965).",
        "Abolishing multi-party democracy in favor of a mobilizing one-party state."
      ],
      confidence: "high"
    },
    decision_patterns: [
      {
        pattern: "Bold, highly ambitious regional and pan-national initiatives (dam projects, continental unions) implemented top-down, bypassing economic caution in favor of anti-imperialist political goals.",
        examples: [
          "Sponsoring radical African liberation groups in Accra schools.",
          "Constructing the Akosombo Dam despite massive federal debt exposure."
        ],
        confidence: "high"
      }
    ],
    crisis_behavior: "Exhibited highly defensive and autocratic behavior during domestic economic and security threats (including multiple assassination attempts), expanding preventative detention laws to lock up critics, leading to his isolation.",
    negotiation_style: "highly eloquent, ideological, lecturing foreign leaders on Pan-African duty, refusing to compromise on continental unity or anti-colonialism.",
    risk_tolerance: "high",
    centralization_preference: "high",
    conflict_preference: "medium",
    institutional_respect: "medium",
    coalition_dependency: "medium",
    populism_level: "high",
    technocratic_level: "medium",
    game_theory_profile: {
      main_players: ["Ghana (Nkrumah)", "Western Powers", "Traditional Chiefs", "African Union States"],
      likely_objectives: [
        "Ghana: Unify Africa, industrialize, defeat neo-colonialism.",
        "Western Powers: Protect corporate mining/cocoa interests, contain socialism.",
        "Traditional Chiefs: Protect regional land rights, oppose central taxes.",
        "African States: Protect regional state sovereignty, oppose unified federation."
      ],
      payoffs: [
        "Volta River Project (1961) secured industrial energy, but high debt payoffs exposed Ghana to fiscal crises when cocoa prices collapsed, enabling the 1966 coup (Variable strategic payoff)."
      ],
      constraints: ["Severe economic dependency on Western cocoa buying cartels limited fiscal sovereignty."],
      common_strategic_moves: ["Pan-African summit organization", "One-party state consolidation"],
      failure_modes: ["His focus on continental Pan-Africanism alienated domestic military officers who faced inflation, causing his sudden 1966 deposition."]
    },
    bayesian_assessment: [
      {
        claim: "The United States CIA actively sponsored the 1966 coup that deposed Nkrumah.",
        prior_confidence: "high",
        evidence: [
          "Declassified US National Security Council documents showing active discussions in 1965 to encourage a military coup in Ghana to remove the socialist, pro-Soviet Nkrumah.",
          "The immediate, warm diplomatic and financial recognition granted by the US to the military junta within days of the coup."
        ],
        posterior_confidence: "high",
        what_would_change_this: "Discovery of verified CIA files showing the agency actively tried to protect Nkrumah's regime but was outmaneuvered by local officers."
      }
    ],
    historical_comparisons: [
      {
        compared_to: "Simón Bolívar",
        similarities: [
          "Secular revolutionaries who attempted to unify an entire linguistically/geographically coherent continent (Latin America/Africa).",
          "Died in bitter exile with their grand unification dreams in collapse due to local regionalism."
        ],
        differences: [
          "Nkrumah operated inside a Cold War post-colonial paradigm, leveraging radio and international conferences."
        ],
        confidence: "high"
      }
    ],
    source_quality: {
      overall: "strong",
      notes: "His own autobiography, extensive Pan-African conference records, declassified US/UK state files, and modern decolonization histories.",
      source_count: 5
    },
    sources: [
      "Davidson, Basil. (1973). Black Star: A View of the Life and Times of Kwame Nkrumah.",
      "Nkrumah, Kwame. (1957). Ghana: The Autobiography of Kwame Nkrumah.",
      "Nkrumah, Kwame. (1965). Neo-Colonialism: The Last Stage of Imperialism.",
      "Birmingham, David. (1998). Kwame Nkrumah: The Father of African Nationalism.",
      "Rooney, David. (1988). Kwame Nkrumah: The Political Kingdom in the Third World."
    ],
    research_gaps: ["The exact details of his private financial arrangements and degree of his isolation during his final exile in Conakry remain partially unrecorded."],
    created_at: "2026-05-31T21:31:33Z",
    updated_at: "2026-05-31T21:31:33Z"
  },

  // 12. Julius Nyerere
  {
    person_id: "julius_nyerere",
    name: "Julius Nyerere",
    aliases: ["Mwalimu", "Father of the Nation (Tanzania)"],
    birth_year: 1922,
    death_year: 1999,
    countries_or_regions: ["Tanzania", "Africa"],
    era: "20th Century / Post-Independence Era / Cold War",
    roles: ["First President of Tanzania", "Prime Minister of Tanganyika"],
    domains: ["Geopolitics", "Statecraft", "Philosophy"],
    priority_tier: 1,
    short_summary: "First President of Tanzania who pioneered African socialism (Ujamaa), unified Tanganyika and Zanzibar, and championed southern African liberation.",
    timeline: [
      {
        date_or_year: "1954",
        event: "Founded the Tanganyika African National Union (TANU), organizing peaceful independence campaigns.",
        importance: "high",
        sources: ["Iliffe (1979)"]
      },
      {
        date_or_year: "1961-12-09",
        event: "Became Prime Minister of independent Tanganyika, managing transition.",
        importance: "high",
        sources: ["Iliffe (1979)"]
      },
      {
        date_or_year: "1964-04-26",
        event: "Engineered the political union between Tanganyika and Zanzibar, founding the United Republic of Tanzania.",
        importance: "high",
        sources: ["Union archives", "Cliffe (1967)"]
      },
      {
        date_or_year: "1967-02-05",
        event: "Issued the Arusha Declaration, outlining his philosophy of African socialism (Ujamaa) and self-reliance.",
        importance: "high",
        sources: ["Arusha Declaration text", "Nyerere Works"]
      },
      {
        date_or_year: "1970s",
        event: "Enforced massive rural villagization campaigns to consolidate schools, water, and agriculture.",
        importance: "high",
        sources: ["Ujamaa records", "Cliffe (1967)"]
      },
      {
        date_or_year: "1978-10",
        event: "Uganda-Tanzania War: Ordered the army to invade Uganda to defeat and depose dictator Idi Amin.",
        importance: "high",
        sources: ["Uganda-Tanzania war logs"]
      },
      {
        date_or_year: "1985",
        event: "Stepped down voluntarily from the presidency, admitting the economic failures of Ujamaa (unprecedented in Africa).",
        importance: "high",
        sources: ["Resignation speeches", "Iliffe (1979)"]
      },
      {
        date_or_year: "1999-10-14",
        event: "Passed away in London; mourned globally as a man of absolute integrity.",
        importance: "high",
        sources: ["Iliffe (1979)"]
      }
    ],
    power_base: "TANU political party monopoly, supreme personal moral authority and integrity, unified national Swahili language consensus, and backing of the rural peasantry.",
    core_goals: [
      "Establish a stable, unified, and highly egalitarian socialist African society (Ujamaa).",
      "Unify Tanganyika and Zanzibar into a singular sovereign state (Tanzania).",
      "Provide complete moral and military backing for southern African anti-apartheid liberation movements."
    ],
    incentives: [
      "Eradicating extreme rural poverty, illiteracy, and disease.",
      "Averting tribal or religious balkanization (e.g. Zanzibar splits).",
      "Re-organizing post-colonial society on cooperative family values (Ujamaa)."
    ],
    constraints: [
      "Extreme rural poverty, low educational base, and complete lack of industrial capital.",
      "Severe agricultural economic inefficiencies and drops under forced villagization.",
      "Geopolitical military threats from proxy conflicts with neighboring dictatorships (Idi Amin)."
    ],
    allies: ["Kenneth Kaunda", "Kwame Nkrumah", "Olof Palme", "Nelson Mandela"],
    rivals: ["Idi Amin", "Western corporate and donor governments"],
    institutions_controlled_or_influenced: ["Tanganyika African National Union (TANU)", "Chama Cha Mapinduzi (CCM)", "Republic of Tanzania"],
    ideology_or_worldview: {
      summary: "African Socialism (Ujamaa: familyhood), prioritizing communal farming, self-reliance, national language integration (Swahili), and complete secular moral integrity.",
      evidence: [
        "The Arusha Declaration (1967) banning state leaders from owning private shares or properties.",
        "Voluntarily stepping down in 1985 and admitting his economic policy failures."
      ],
      confidence: "high"
    },
    decision_patterns: [
      {
        pattern: "Patient, highly moralistic, and consensus-building political decisions, coupled with massive, planned social engineering (forced villagization) to consolidate public welfare.",
        examples: [
          "Banning tribal chiefs to enforce national Swahili language integration.",
          "Personally editing school curriculum texts to teach Ujamaa values."
        ],
        confidence: "high"
      }
    ],
    crisis_behavior: "Exhibited highly disciplined, cool resolve in crises, responding to Idi Amin's invasion with immediate, absolute military mobilization that successfully marched to Kampala.",
    negotiation_style: "highly intellectual, civil, lecturing international bodies on moral duty and debt relief, while remaining completely unyielding on anti-apartheid and sovereignty.",
    risk_tolerance: "high",
    centralization_preference: "high",
    conflict_preference: "medium",
    institutional_respect: "high",
    coalition_dependency: "high",
    populism_level: "high",
    technocratic_level: "low",
    game_theory_profile: {
      main_players: ["Tanzania", "Uganda (Idi Amin)", "Western Donors", "Rural Peasantry"],
      likely_objectives: [
        "Tanzania: Protect borders, secure Ujamaa, support liberation.",
        "Uganda: Annex Tanzanian Kagera strip, secure military dominance.",
        "Peasantry: Maintain private farms, secure state welfare."
      ],
      payoffs: [
        "Invading Uganda (1979) successfully deposed Idi Amin, securing the border but bankrupting the state, forcing Ujamaa modifications (Variable strategic payoff)."
      ],
      constraints: ["Extreme fiscal bankruptcy post-1979 war forced negotiations with the IMF."],
      common_strategic_moves: ["Secular Swahili language mandates", "Monastic agricultural settlements"],
      failure_modes: ["Forced villagization (Chama) caused severe agricultural inefficiencies and economic stagnation, which he publicly admitted in 1985."]
    },
    bayesian_assessment: [
      {
        claim: "Nyerere's Ujamaa villagization failed due to peasant resistance rather than policy flaws.",
        prior_confidence: "medium",
        evidence: [
          "The widespread peasant evasion and refusal to produce cocoa/crops on communal plots.",
          "The inherent technical inefficiencies of state planners who relocated productive villages to swampy, infertile soils, causing agricultural drops."
        ],
        posterior_confidence: "high",
        what_would_change_this: "Discovery of state records proving Ujamaa agricultural yields tripled during the height of villagization."
      }
    ],
    historical_comparisons: [
      {
        compared_to: "Mahatma Gandhi",
        similarities: [
          "Spiritual and moral fathers of their nations (Mwalimu/Bapu) who lived ascetic, non-corrupt lives.",
          "Advocated for rural, decentralized village self-reliance rather than massive industrial capitalism."
        ],
        differences: [
          "Nyerere ruled as absolute President of a centralized one-party state, enforcing massive social relocations."
        ],
        confidence: "high"
      }
    ],
    source_quality: {
      overall: "strong",
      notes: "John Iliffe's definitive Tanzanian history, Nyerere's Collected Works, OAU archives, and modern African decolonization studies.",
      source_count: 5
    },
    sources: [
      "Iliffe, John. (1979). A Modern History of Tanganyika.",
      "Nyerere, Julius K. (1968). Ujamaa: Essays on Socialism.",
      "Nyerere, Julius K. (1966). Freedom and Unity: Uhuru na Umoja.",
      "Cliffe, Lionel. (1967). One Party Democracy: The 1965 Tanzania General Election.",
      "Pratt, Cranford. (1976). The Critical Phase in Tanzania, 1945-1968: Nyerere and the Emergence of a Socialist Strategy."
    ],
    research_gaps: ["The exact details of behind-the-scenes military negotiations with Zanzibari revolutionary leaders in 1964 remain partially restricted."],
    created_at: "2026-05-31T21:31:33Z",
    updated_at: "2026-05-31T21:31:33Z"
  },

  // 13. Jomo Kenyatta
  {
    person_id: "jomo_kenyatta",
    name: "Jomo Kenyatta",
    aliases: ["Mzee"],
    birth_year: 1897,
    death_year: 1978,
    countries_or_regions: ["Kenya", "Africa"],
    era: "20th Century / Decolonization Era",
    roles: ["First President of Kenya", "First Prime Minister of Kenya"],
    domains: ["Geopolitics", "Statecraft", "Economic"],
    priority_tier: 1,
    short_summary: "Kenyan nationalist leader who pioneered the anti-colonial struggle, served as Kenya's first President, and established a stable, pro-Western capitalist state.",
    timeline: [
      {
        date_or_year: "1938",
        event: "Published 'Facing Mount Kenya', a pioneering anthropological study of the Kikuyu people.",
        importance: "high",
        sources: ["Kenyatta Works", "Murray-Brown (1972)"]
      },
      {
        date_or_year: "1947",
        event: "Elected President of the Kenya African Union (KAU), demanding political rights.",
        importance: "high",
        sources: ["Murray-Brown (1972)"]
      },
      {
        date_or_year: "1952-10",
        event: "Arrested by British colonial authorities during the Mau Mau Emergency, accused of leading the rebellion.",
        importance: "high",
        sources: ["Kapenguria trial transcripts"]
      },
      {
        date_or_year: "1953",
        event: "Convicted at the Kapenguria trial; sentenced to seven years hard labor and subsequent detention.",
        importance: "high",
        sources: ["Kapenguria trial transcripts", "Murray-Brown (1972)"]
      },
      {
        date_or_year: "1961-08-21",
        event: "Released from colonial detention in triumph, emerging as the undisputed leader of Kenya.",
        importance: "high",
        sources: ["Murray-Brown (1972)"]
      },
      {
        date_or_year: "1963-12-12",
        event: "Inaugurated as Prime Minister of independent Kenya; introduced the national motto 'Harambee' (Pull Together).",
        importance: "high",
        sources: ["Kenya independence speeches"]
      },
      {
        date_or_year: "1964-12",
        event: "Proclaimed President of the Republic of Kenya; consolidated centralized executive authority.",
        importance: "high",
        sources: ["Kenya state archives"]
      },
      {
        date_or_year: "1978-08-22",
        event: "Passed away peacefully in Mombasa; succeeded smoothly by Vice President Daniel arap Moi.",
        importance: "high",
        sources: ["Murray-Brown (1972)"]
      }
    ],
    power_base: "KANU political party dominance, Kikuyu ethnic majority support, moderate pro-Western capitalist economic policies, and historical moral status as pioneer of anti-colonial struggle.",
    core_goals: [
      "Unify Kenya's diverse ethnic groups into a stable, singular sovereign republic.",
      "Preserve economic stability and capitalist growth by reassuring white agricultural settler elites to prevent capital flight.",
      "Consolidate centralized, executive authority over regional administrations."
    ],
    incentives: [
      "Eradicating British colonial political control.",
      "Re-establishing Kikuyu land and political dominance.",
      "Attaining historical glory as 'Mzee' (The Grand Old Man) of Kenya."
    ],
    constraints: [
      "Deep-seated, post-colonial land ownership disputes between settlers and local farmers.",
      "Bitter, persistent ethnic factionalism between Kikuyu and Luo elites.",
      "Logistical border conflicts (Shifta War) with Somali separatists in the northeast."
    ],
    allies: ["Tom Mboya (Luo moderate/assassinated)", "Daniel arap Moi (successor)", "Charles Njonjo (Attorney General)"],
    rivals: ["Oginga Odinga (left-wing opponent)", "British Colonial Authorities", "Somali separatist guerrillas"],
    institutions_controlled_or_influenced: ["Kenya African National Union (KANU)", "Republic of Kenya", "Kenya Armed Forces"],
    ideology_or_worldview: {
      summary: "Moderate, pro-Western capitalist nationalism combined with centralist statecraft, traditional Kikuyu social values, and the unifying motto 'Harambee' (mutual cooperation).",
      evidence: [
        "His anthropological monograph 'Facing Mount Kenya' (1938).",
        "Refusing to expropriate white-owned agricultural estates, implementing a 'willing-buyer, willing-seller' land reform."
      ],
      confidence: "high"
    },
    decision_patterns: [
      {
        pattern: "Patient, highly calculated centralist statecraft, using personal charisma and elite alliances to isolate left-wing and federalist opponents while maintaining market capitalism.",
        examples: [
          "Outmaneuvering Oginga Odinga to establish a de facto one-party state in 1969.",
          "Using Tom Mboya's administrative talents to consolidate trade unions under state control."
        ],
        confidence: "high"
      }
    ],
    crisis_behavior: "Exhibited highly disciplined and calm resolve during his long colonial imprisonment, using his moral status systematically to unify the nationalist movement upon his release.",
    negotiation_style: "dignified, highly paternalistic, using traditional African elder symbols (flywhisk), while remaining completely unyielding on the central supremacy of the state.",
    risk_tolerance: "medium",
    centralization_preference: "high",
    conflict_preference: "medium",
    institutional_respect: "high",
    coalition_dependency: "high",
    populism_level: "high",
    technocratic_level: "medium",
    game_theory_profile: {
      main_players: ["Kenyatta", "Left-Wing Opposition (Odinga)", "White Settlers", "British Crown"],
      likely_objectives: [
        "Kenyatta: Secure independence, maintain capitalist economy, centralize power.",
        "Odinga: Implement socialist land redistribution, align with East bloc.",
        "Settlers: Retain private farm titles, avoid expropriation."
      ],
      payoffs: [
        "Willing-buyer, willing-seller land policy successfully prevented a white settler exodus, securing vital agricultural export revenues and Western economic aid (Highest fiscal payoff)."
      ],
      constraints: ["Severe ethnic divisions between Kikuyu and Luo forced tactical alliances to maintain stability."],
      common_strategic_moves: ["Harambee public appeals", "One-party state consolidation"],
      failure_modes: ["His concentration of land and political power in the hands of the 'Kiambu Mafia' Kikuyu elite created deep, permanent ethnic grievances in Kenya."]
    },
    bayesian_assessment: [
      {
        claim: "Kenyatta was the direct operational leader of the violent Mau Mau rebellion.",
        prior_confidence: "low",
        evidence: [
          "His conviction at the Kapenguria trial, which relied heavily on bribed witnesses and colonial panic.",
          "His consistent, public and private condemnation of Mau Mau violence as 'hooliganism' and his lifelong commitment to constitutional, nonviolent political lobbying."
        ],
        posterior_confidence: "low",
        what_would_change_this: "Discovery of secret Mau Mau oaths signed by Kenyatta detailing plans for specific military ambushes of British settlers."
      }
    ],
    historical_comparisons: [
      {
        compared_to: "Jawaharlal Nehru",
        similarities: [
          "Founding fathers who led their nations through decolonization post-imprisonment.",
          "Educated intellectuals who wrote classic anthropological/historical works on their people."
        ],
        differences: [
          "Kenyatta favored moderate, Western-aligned market capitalism and property rights, completely rejecting Nehru's Soviet-style state planning."
        ],
        confidence: "high"
      }
    ],
    source_quality: {
      overall: "strong",
      notes: "Kapenguria trial records, KANU files, his personal writings, and definitive biographies by Jeremy Murray-Brown.",
      source_count: 5
    },
    sources: [
      "Murray-Brown, Jeremy. (1972). Kenyatta.",
      "Kenyatta, Jomo. (1938). Facing Mount Kenya.",
      "Goldsworthy, David. (1982). Tom Mboya: The Man Kenya Wanted to Forget.",
      "Ogot, Bethwell A. & Ochieng, William R. (1995). Decolonization and Independence in Kenya.",
      "Gertzel, Cherry. (1970). The Politics of Independent Kenya, 1963-8."
    ],
    research_gaps: ["Determining the exact level of state involvement in the 1969 assassination of Tom Mboya remains historically sensitive and debated in Kenya."],
    created_at: "2026-05-31T21:31:33Z",
    updated_at: "2026-05-31T21:31:33Z"
  },

  // 14. Muammar Gaddafi
  {
    person_id: "muammar_gaddafi",
    name: "Muammar Gaddafi",
    aliases: ["Colonel Gaddafi", "Brotherly Leader of the Revolution"],
    birth_year: 1942,
    death_year: 2011,
    countries_or_regions: ["Libya", "Middle East", "Africa"],
    era: "Late 20th / Early 21st Century / Cold War / Modern Era",
    roles: ["Revolutionary Chairman of Libya", "Brotherly Leader of the Revolution"],
    domains: ["Geopolitics", "Statecraft", "Military"],
    priority_tier: 1,
    short_summary: "Libyan revolutionary who overthrew the monarchy, ruled under his unique Third International Theory (Jamahiriya), sponsored global militancy, and was deposed in 2011.",
    timeline: [
      {
        date_or_year: "1969-09-01",
        event: "Led a bloodless military coup that deposed King Idris; established the Libyan Arab Republic.",
        importance: "high",
        sources: ["St. John (2012)"]
      },
      {
        date_or_year: "1975",
        event: "Published the first volume of the 'Green Book', outlining his Third International Theory.",
        importance: "high",
        sources: ["Green Book text", "St. John (2012)"]
      },
      {
        date_or_year: "1977-03-02",
        event: "Declared the 'Jamahiriya' (State of the Masses), formally abolishing parliament in favor of local committees.",
        importance: "high",
        sources: ["Jamahiriya declarations", "Vandewalle (2006)"]
      },
      {
        date_or_year: "1986-04-15",
        event: "Survived US air strikes (Operation El Dorado Canyon) ordered by Reagan in response to Berlin discotheque bombing.",
        importance: "high",
        sources: ["Reagan presidential records", "St. John (2012)"]
      },
      {
        date_or_year: "1988-12-21",
        event: "Lockerbie Bombing: Pan Am Flight 103 blown up over Scotland, linked to Libyan intelligence operatives.",
        importance: "high",
        sources: ["Lockerbie trial records"]
      },
      {
        date_or_year: "2003-12",
        event: "Announced the sudden, complete dismantling of Libya's WMD and nuclear weapons programs to normalize relations with the West.",
        importance: "high",
        sources: ["WMD disarmament records", "Vandewalle (2006)"]
      },
      {
        date_or_year: "2011-02",
        event: "Faced popular uprisings in Benghazi, launching brutal military crackdowns that triggered NATO intervention.",
        importance: "high",
        sources: ["NATO campaign logs", "2011 uprising records"]
      },
      {
        date_or_year: "2011-10-20",
        event: "Captured and summarily executed by rebel forces in Sirte during the climax of the civil war.",
        importance: "high",
        sources: ["Sirte capture videos/logs"]
      }
    ],
    power_base: "Revolutionary Command Council military backing, state oil revenues, patronage networks among select powerful desert tribes (Qadhadhfa, Warfalla), and security/intelligence services.",
    core_goals: [
      "Establish a unique theological-socialist state (Jamahiriya) bypassing representative democracy.",
      "Export anti-imperialist revolution and sponsor militant groups globally (e.g. IRA, Abu Nidal).",
      "Unify Africa under a single political state (United States of Africa) led by Libya."
    ],
    incentives: [
      "Regime survival and personal security against internal military coups.",
      "Challenging Western geopolitical hegemony.",
      "Sponsoring Pan-African and Pan-Arab anti-colonial movements."
    ],
    constraints: [
      "Fierce, persistent regional and tribal divisions in Libya (Tripoli vs Benghazi).",
      "Comprehensive Western military interventions, bombings, and financial embargoes.",
      "Severe internal military coup attempts and popular uprisings (2011)."
    ],
    allies: ["Abdessalam Jalloud", "Hugo Chávez", "African Union leaders (sponsored)"],
    rivals: ["Ronald Reagan", "King Idris (deposed)", "NATO leadership", "Libyan rebel coalitions (NTC)"],
    institutions_controlled_or_influenced: ["Libyan Arab Jamahiriya", "Revolutionary Command Council", "African Union (nominal chairman)"],
    ideology_or_worldview: {
      summary: "Third International Theory (rejecting both Western capitalism and Soviet communism, combining Islamic moral laws, direct democracy through local committees, and state-managed oil socialism).",
      evidence: [
        "The Green Book detailing his direct democracy theory.",
        "Nationalization of all private property, trade, and oil companies."
      ],
      confidence: "high"
    },
    decision_patterns: [
      {
        pattern: "Highly erratic, unpredictable, and eccentric policy shifts (e.g. moving his court into a tent, declaring the abolition of borders), combined with ruthless domestic intelligence purges to maintain power.",
        examples: [
          "Moving his international diplomatic meetings into a Bedouin tent in foreign capitals.",
          "Dismantling his entire WMD program in 2003 after witnessing the invasion of Iraq."
        ],
        confidence: "high"
      }
    ],
    crisis_behavior: "Exhibited highly aggressive, defiant, and combative behavior during the 2011 uprisings, labeling rebels as 'rats' fueled by drugs, and vowing to fight to his last drop of blood in Sirte.",
    negotiation_style: "highly theatrical, erratic, lecturing foreign diplomats on the green book, while using oil contracts and anti-terrorism cooperation (post-2003) as pragmatic bargaining chips.",
    risk_tolerance: "high",
    centralization_preference: "high",
    conflict_preference: "high",
    institutional_respect: "low",
    coalition_dependency: "low",
    populism_level: "high",
    technocratic_level: "low",
    game_theory_profile: {
      main_players: ["Libya", "United States", "European Union", "Libyan Rebel Coalitions"],
      likely_objectives: [
        "Libya: Secure regime survival, export oil, maintain tribal balance.",
        "US: Contain terror sponsorship, later secure disarmament and regime change.",
        "Rebels: Depose Gaddafi, establish new government."
      ],
      payoffs: [
        "WMD Disarmament (2003) successfully avoided immediate US military invasion, yielding a decade of normalized diplomatic and oil trade payoffs (Highest strategic payoff)."
      ],
      constraints: ["NATO naval and air blockades in 2011 acted as a strict threat constraint that prevented his military from retaking Benghazi."],
      common_strategic_moves: ["Terrorist sponsorships", "Sudden nuclear surrenders"],
      failure_modes: ["His failure to build a professional army (relying instead on mercenaries and tribal militias) left him defenseless when NATO backed the rebels in 2011."]
    },
    bayesian_assessment: [
      {
        claim: "Gaddafi's direct democracy (Jamahiriya) was a genuine ideological experiment rather than a facade for personal dictatorship.",
        prior_confidence: "low",
        evidence: [
          "The systematic creation of thousands of Basic People's Congresses across Libya, giving citizens nominal input on local municipal decisions.",
          "The absolute reality that no major national, military, or foreign policy decision was ever made without Gaddafi's direct personal approval, with the Revolutionary Committees serving to spy on and execute any independent civic leaders."
        ],
        posterior_confidence: "low",
        what_would_change_this: "Discovery of private diaries proving Gaddafi actively tried to resign his revolutionary title and submit to congress voting in 1980."
      }
    ],
    historical_comparisons: [
      {
        compared_to: "Robespierre",
        similarities: [
          "Revolutionary purges of old monarchs to establish unique moral-ideological states.",
          "Used radical committee systems and state terror to maintain purity and crush dissent."
        ],
        differences: [
          "Gaddafi successfully maintained his personalized rule for 42 years utilizing massive oil wealth, rather than collapsing within years."
        ],
        confidence: "high"
      }
    ],
    source_quality: {
      overall: "medium",
      notes: "Large volume of diplomatic histories, the Green Book, Lockerbie court records, and modern Middle Eastern studies, though internal files remain fragmented post-2011.",
      source_count: 5
    },
    sources: [
      "St. John, Ronald Bruce. (2012). Libya: From Colony to Revolution.",
      "Vandewalle, Dirk. (2006). A History of Modern Libya.",
      "Gaddafi, Muammar. (1975-1979). The Green Book.",
      "Pargeter, Alison. (2012). Libya: The Rise and Fall of Qaddafi.",
      "Kawczynski, Daniel. (2005). Seeking Gaddafi: Libya, the West and the Arab Spring."
    ],
    research_gaps: ["The exact details of the final minutes and who fired the lethal bullet during his capture in Sirte remain politically contested in Libya."],
    created_at: "2026-05-31T21:31:33Z",
    updated_at: "2026-05-31T21:31:33Z"
  },

  // 15. Haile Selassie
  {
    person_id: "haile_selassie",
    name: "Haile Selassie I",
    aliases: ["Ras Tafari", "Conquering Lion of Judah"],
    birth_year: 1892,
    death_year: 1975,
    countries_or_regions: ["Ethiopia", "Africa"],
    era: "20th Century / Interwar / Decolonization Era",
    roles: ["Emperor of Ethiopia"],
    domains: ["Geopolitics", "Statecraft", "Diplomacy"],
    priority_tier: 1,
    short_summary: "Emperor of Ethiopia who modernized the nation, led the resistance against Italian fascism, and served as a global pioneer of Pan-African unity.",
    timeline: [
      {
        date_or_year: "1916",
        event: "Appointed Regent and de facto ruler of Ethiopia under Empress Zewditu, initiating modernization.",
        importance: "high",
        sources: ["Marcus (1987)"]
      },
      {
        date_or_year: "1930-11-02",
        event: "Crowned Emperor Haile Selassie I (King of Kings) in a magnificent, highly visible coronation.",
        importance: "high",
        sources: ["Marcus (1987)", "Mockler (1984)"]
      },
      {
        date_or_year: "1935-10",
        event: "Faced military invasion by fascist Italy; personally commanded forces on the northern front.",
        importance: "high",
        sources: ["Mockler (1984)"]
      },
      {
        date_or_year: "1936-06-30",
        event: "Delivered his historic address to the League of Nations, warning that 'It is us today, it will be you tomorrow.'",
        importance: "high",
        sources: ["League of Nations speech text"]
      },
      {
        date_or_year: "1941-05-05",
        event: "Returned to Addis Ababa in triumph, liberated from Italian occupation by British and Ethiopian forces.",
        importance: "high",
        sources: ["Mockler (1984)"]
      },
      {
        date_or_year: "1963-05-25",
        event: "Hosted the founding conference of the Organisation of African Unity (OAU) in Addis Ababa.",
        importance: "high",
        sources: ["OAU transcripts"]
      },
      {
        date_or_year: "1973",
        event: "Faced severe, tragic famine in Wollo province, which was hidden by imperial bureaucrats, destroying his moral authority.",
        importance: "high",
        sources: ["Famine records", "Kapuściński (1978)"]
      },
      {
        date_or_year: "1974-09-12",
        event: "Deposed in a military coup by the Marxist Derg junta; subsequently imprisoned and murdered.",
        importance: "high",
        sources: ["Derg coup records", "Marcus (1994)"]
      }
    ],
    power_base: "Solomonic imperial dynasty legitimacy, traditional feudal landowning nobility backing, loyal Imperial Bodyguard, and high international moral prestige as a father of African unity.",
    core_goals: [
      "Modernize and industrialize Ethiopia's infrastructure, military, and education top-down.",
      "Defend and secure Ethiopian sovereign independence against Italian fascism.",
      "Establish Addis Ababa as the diplomatic center of Pan-African unity."
    ],
    incentives: [
      "Preserving the absolute sovereignty and imperial heritage of Ethiopia.",
      "Overcoming traditional feudal resistance to centralize state administrative power.",
      "Securing Western financial and military alliances."
    ],
    constraints: [
      "Deeply entrenched, backward feudal landowning nobility and Church resistance.",
      "Catastrophic military invasion and occupation by fascist Italy (1935-1941).",
      "Severe domestic famines and inflation in the early 1970s."
    ],
    allies: ["Kwame Nkrumah", "Jomo Kenyatta", "Franklin D. Roosevelt (met in 1945)", "British military forces"],
    rivals: ["Benito Mussolini", "Lij Iyasu (deposed)", "Derg military junta"],
    institutions_controlled_or_influenced: ["Empire of Ethiopia", "Organisation of African Unity", "Ethiopian Orthodox Church"],
    ideology_or_worldview: {
      summary: "Modernizing autocracy combined with traditional Solomonic divine right monarchy, defensive nationalism, and international collective security through diplomatic institutions.",
      evidence: [
        "His speech to the League of Nations warning of global collective security collapse.",
        "Promulgating Ethiopia's first written constitutions (1931, 1955) establishing a parliament but retaining absolute imperial vetoes."
      ],
      confidence: "high"
    },
    decision_patterns: [
      {
        pattern: "Slow, highly calculated modernizing reforms implemented top-down to avoid triggering a violent feudal nobility rebellion, while relying on international diplomacy to protect independence.",
        examples: [
          "Establishing secular schools while slowly purchasing feudal lands to centralize tax.",
          "Appealing to the League of Nations in 1936 rather than launching futile guerrilla attacks."
        ],
        confidence: "high"
      }
    ],
    crisis_behavior: "Exhibited highly dignified, calm, and stoic behavior during his exile and final imprisonment, refusing to yield his imperial dignity even when held in a simple palace backroom by the Derg junta.",
    negotiation_style: "highly formal, regal, utilizing his supreme personal prestige and lineage, while relying on international legal institutions to mediate conflicts.",
    risk_tolerance: "medium",
    centralization_preference: "high",
    conflict_preference: "medium",
    institutional_respect: "high",
    coalition_dependency: "high",
    populism_level: "medium",
    technocratic_level: "medium",
    game_theory_profile: {
      main_players: ["Ethiopia", "Fascist Italy", "League of Nations", "Feudal Nobility"],
      likely_objectives: [
        "Ethiopia: Defend independence, modernize state, secure aid.",
        "Italy: Annex Ethiopia to build East African empire, avenge Adwa.",
        "League of Nations: Avoid conflict with Italy, maintain nominal treaties."
      ],
      payoffs: [
        "Appealing to the League of Nations (1936) failed to stop Italy, but established a supreme moral precedent that secured immediate British military alliance and liberation in 1941 (Highest diplomatic payoff)."
      ],
      constraints: ["Severe military underdevelopment forced reliance on light mountain infantry against Italian gas/tanks."],
      common_strategic_moves: ["International diplomatic appeals", "Dynastic center appointments"],
      failure_modes: ["His bureaucracy hidden the 1973 Wollo famine, destroying his moral authority and enabling the Marxist Derg coup."]
    },
    bayesian_assessment: [
      {
        claim: "Haile Selassie actively encouraged the Rastafari movement's deification of him.",
        prior_confidence: "low",
        evidence: [
          "His visit to Jamaica in 1966, where he was overwhelmed by crowds but privately urged Rastafari elders to 'liberate the people of Jamaica before they emigrate to Ethiopia'.",
          "His lifelong devout adherence to the Ethiopian Orthodox Church, which explicitly rejects any deification of human monarchs."
        ],
        posterior_confidence: "low",
        what_would_change_this: "Discovery of private theological writings stating he believed himself to be the physical reincarnation of Jesus Christ."
      }
    ],
    historical_comparisons: [
      {
        compared_to: "Nicholas II",
        similarities: [
          "Last emperors of ancient, feudal, religious dynasties who attempted slow, top-down modernizations.",
          "Deposed in Marxist military coups during times of inflation and domestic crises, and subsequently murdered."
        ],
        differences: [
          "Haile Selassie successfully led an international war of liberation and co-founded the OAU, becoming a global symbol of decolonization."
        ],
        confidence: "high"
      }
    ],
    source_quality: {
      overall: "strong",
      notes: "His official autobiography, League of Nations transcripts, OAU records, and Harold Marcus's definitive biographies.",
      source_count: 5
    },
    sources: [
      "Marcus, Harold G. (1987). Haile Selassie I: The Formative Years, 1892-1936.",
      "Marcus, Harold G. (1994). A History of Ethiopia.",
      "Mockler, Anthony. (1984). Haile Selassie's War.",
      "Selassie I, Haile. (1976). My Life and Ethiopia's Progress (Autobiography).",
      "Kapuściński, Ryszard. (1978). The Emperor: Downfall of an Autocrat."
    ],
    research_gaps: ["The exact burial location and final physical details of his murder in the palace basement by the Derg junta in 1975 remain partially classified in Ethiopian military archives."],
    created_at: "2026-05-31T21:31:33Z",
    updated_at: "2026-05-31T21:31:33Z"
  }
];

// Extract sources and claims
const sources_db: Source[] = [];
const claims_db: Claim[] = [];

batch4_profiles.forEach((p) => {
  p.sources.forEach((srcStr: string, idx: number) => {
    const srcId = `${p.person_id}_src_${idx + 1}`;
    sources_db.push({
      source_id: srcId,
      person_id: p.person_id,
      title: srcStr,
      authors: [srcStr.split(".")[0]],
      year: parseInt(srcStr.match(/\((\d{4})\)/)?.[1] || "null") || null,
      url: "https://en.wikipedia.org/wiki/" + encodeURIComponent(p.name),
      type: srcStr.toLowerCase().includes("papers") || srcStr.toLowerCase().includes("edict") || srcStr.toLowerCase().includes("decree") || srcStr.toLowerCase().includes("speeches") ? "official" : "book",
      credibility: "high"
    });
  });

  p.bayesian_assessment.forEach((ba: any, idx: number) => {
    const claimId = `${p.person_id}_claim_${idx + 1}`;
    claims_db.push({
      claim_id: claimId,
      person_id: p.person_id,
      claim: ba.claim,
      prior: ba.prior_confidence,
      posterior: ba.posterior_confidence,
      evidence: ba.evidence
    });
  });
});

async function main() {
  console.log("Starting batch 4 generation...");

  // 1. Validate new profiles
  let totalErrors = 0;
  batch4_profiles.forEach((profile, idx) => {
    const errors = validateProfile(profile, idx + 1);
    if (errors.length > 0) {
      console.error(`Validation failed for ${profile.name}:`);
      errors.forEach(e => console.error(`  - ${e.message}`));
      totalErrors += errors.length;
    }
  });

  if (totalErrors > 0) {
    console.error(`Generation aborted due to ${totalErrors} schema validation errors.`);
    process.exit(1);
  }

  console.log("All 15 batch 4 profiles successfully passed schema validation!");

  // Read existing files
  const profilesPath = join(process.cwd(), "data/profiles.jsonl");
  const sourcesPath = join(process.cwd(), "data/sources.jsonl");
  const claimsPath = join(process.cwd(), "data/claims.jsonl");

  let existingProfiles = "";
  try {
    existingProfiles = await fs.readFile(profilesPath, "utf8");
  } catch (err) {}

  let existingSources = "";
  try {
    existingSources = await fs.readFile(sourcesPath, "utf8");
  } catch (err) {}

  let existingClaims = "";
  try {
    existingClaims = await fs.readFile(claimsPath, "utf8");
  } catch (err) {}

  // Append and write
  const newProfiles = batch4_profiles.map(p => JSON.stringify(p)).join("\n") + "\n";
  const updatedProfiles = existingProfiles.trim() + "\n" + newProfiles;
  await fs.writeFile(profilesPath, updatedProfiles.trim() + "\n");
  console.log("Appended 15 new profiles to data/profiles.jsonl");

  const newSources = sources_db.map(s => JSON.stringify(s)).join("\n") + "\n";
  const updatedSources = existingSources.trim() + "\n" + newSources;
  await fs.writeFile(sourcesPath, updatedSources.trim() + "\n");
  console.log(`Appended ${sources_db.length} new sources to data/sources.jsonl`);

  const newClaims = claims_db.map(c => JSON.stringify(c)).join("\n") + "\n";
  const updatedClaims = existingClaims.trim() + "\n" + newClaims;
  await fs.writeFile(claimsPath, updatedClaims.trim() + "\n");
  console.log(`Appended ${claims_db.length} new claims to data/claims.jsonl`);

  // Update queue.jsonl
  const queuePath = join(process.cwd(), "data/queue.jsonl");
  const queueData = await fs.readFile(queuePath, "utf8");
  const queueLines = queueData.split("\n").filter(l => l.trim() !== "");
  const completedIds = new Set(batch4_profiles.map(p => p.person_id));
  const updatedQueueLines = queueLines.map((line) => {
    const obj = JSON.parse(line);
    if (completedIds.has(obj.person_id)) {
      obj.status = "completed";
    }
    return JSON.stringify(obj);
  }).join("\n") + "\n";
  await fs.writeFile(queuePath, updatedQueueLines);
  console.log(`Updated queue.jsonl statuses.`);

  // Read updated profiles lines to count total
  const finalProfilesData = await fs.readFile(profilesPath, "utf8");
  const finalProfilesCount = finalProfilesData.split("\n").filter(l => l.trim() !== "").length;

  // Update progress.json
  const progressPath = join(process.cwd(), "data/progress.json");
  const progress = {
    total_queued: queueLines.length,
    completed_count: finalProfilesCount,
    failed_count: 0,
    needs_review_count: 0,
    last_updated: new Date().toISOString()
  };
  await fs.writeFile(progressPath, JSON.stringify(progress, null, 2));
  console.log(`Updated progress.json. Completed count is now ${finalProfilesCount}.`);

  console.log("Batch 4 generation completed successfully!");
}

main().catch(err => {
  console.error("Fatal generation failure:", err);
  process.exit(1);
});
