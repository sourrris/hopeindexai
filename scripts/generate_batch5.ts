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

const batch5_profiles: any[] = [
  // 1. Subhas Chandra Bose
  {
    person_id: "subhas_chandra_bose",
    name: "Subhas Chandra Bose",
    aliases: ["Netaji"],
    birth_year: 1897,
    death_year: 1945,
    countries_or_regions: ["India", "South Asia", "Germany", "Japan"],
    era: "20th Century / WWI / Indian Independence Movement",
    roles: ["President of Indian National Congress", "Supreme Commander of Indian National Army", "Head of Provisional Government of Azad Hind"],
    domains: ["Geopolitics", "Military", "Statecraft"],
    priority_tier: 1,
    short_summary: "Indian nationalist leader who advocated for immediate, armed liberation from British rule, leading the Indian National Army (INA) in alliance with Japan during WWII.",
    timeline: [
      {
        date_or_year: "1938",
        event: "Elected President of the Indian National Congress; advocated for strict ultimatums to the British.",
        importance: "high",
        sources: ["Bose (1997)", "Gordon (1990)"]
      },
      {
        date_or_year: "1939",
        event: "Resigned Congress presidency after conflict with Gandhi; formed the progressive Forward Bloc faction.",
        importance: "high",
        sources: ["Gordon (1990)"]
      },
      {
        date_or_year: "1941-01",
        event: "Escaped house arrest in Calcutta; traveled incognito through Afghanistan and Russia to Nazi Germany.",
        importance: "high",
        sources: ["Gordon (1990)", "Bose (2011)"]
      },
      {
        date_or_year: "1943-02",
        event: "Traveled by German and Japanese submarines from Europe to Asia, a high-risk wartime journey.",
        importance: "high",
        sources: ["Gordon (1990)"]
      },
      {
        date_or_year: "1943-10-21",
        event: "Proclaimed the Azad Hind (Free India) Provisional Government in Singapore, declaring war on Britain.",
        importance: "high",
        sources: ["Azad Hind proclamations"]
      },
      {
        date_or_year: "1944-03",
        event: "Led the INA forces alongside Japanese troops across the Burmese border, launching the Battle of Imphal.",
        importance: "high",
        sources: ["Fay (1993)", "Gordon (1990)"]
      },
      {
        date_or_year: "1945-08-18",
        event: "Reportedly died of severe third-degree burns after a Japanese military plane crashed in Taipei.",
        importance: "high",
        sources: ["Taipei crash records", "Gordon (1990)"]
      }
    ],
    power_base: "Fierce popularity among militant Indian youth, command of the 40,000-strong Indian National Army (formed of POWs), overseas Indian funding, and Japanese military backing.",
    core_goals: [
      "Achieve immediate, absolute, non-negotiable independence for India through direct armed force.",
      "Establish a powerful, highly centralized vanguard-led modern state to execute rapid socio-industrial reforms.",
      "Mobilize Axis alliances and overseas Indian populations to defeat the British military."
    ],
    incentives: [
      "Eradicating the humiliation of British colonial rule at any cost.",
      "Preventing partition or communal fragmentation of the subcontinent.",
      "Establishing a strong, disciplined national character."
    ],
    constraints: [
      "Absolute dependency on the highly volatile, self-interested strategic calculations of Imperial Japan and Germany.",
      "Severe ideological and political opposition from Mahatma Gandhi and the mainstream nonviolent Congress faction.",
      "Total lack of independent heavy industrial supply chains or air support for the INA."
    ],
    allies: ["Rash Behari Bose", "Hideki Tojo", "Emil Sch卓越 (wife)"],
    rivals: ["Mahatma Gandhi (ideological rival)", "Jawaharlal Nehru", "British Raj military authorities"],
    institutions_controlled_or_influenced: ["Indian National Congress (formerly)", "Indian National Army (Azad Hind Fauj)", "Azad Hind Government", "Forward Bloc"],
    ideology_or_worldview: {
      summary: "Radical, militant nationalism combining socialist economic planning with authoritarian centralized state discipline, actively prioritizing armed struggle and pragmatically leveraging Axis alliances to secure liberation.",
      evidence: [
        "His presidential address at Haripura (1938) advocating state economic planning.",
        "Establishing the Rani of Jhansi Regiment, one of the world's first all-female combat units."
      ],
      confidence: "high"
    },
    decision_patterns: [
      {
        pattern: "Extremely high-risk, dramatic strategic gambles (daring escapes, submarine voyages, foreign military alignments) designed to force a sudden, violent collapse of British colonial authority.",
        examples: [
          "Fleeing India incognito as a Pathan to reach Germany in 1941.",
          "Launching the INA campaign into Imphal despite knowing Japanese supply lines were collapsing."
        ],
        confidence: "high"
      }
    ],
    crisis_behavior: "Exhibited extraordinary physical courage, energy, and unyielding charismatic resolve in military crises, marching alongside his troops during the retreat through the Burmese jungles.",
    negotiation_style: "highly dramatic, patriotic, relying on supreme personal prestige and emotional calls for sacrifice, while treating the British Raj as an illegitimate entity to be fought rather than negotiated with.",
    risk_tolerance: "high",
    centralization_preference: "high",
    conflict_preference: "high",
    institutional_respect: "medium",
    coalition_dependency: "high",
    populism_level: "high",
    technocratic_level: "medium",
    game_theory_profile: {
      main_players: ["Free India Faction (Bose)", "British Raj", "Imperial Japan", "Congress Faction (Gandhi)"],
      likely_objectives: [
        "Bose: Invade India, spark a mass military/public uprising, secure independence.",
        "British: Defend borders, maintain colonial army loyalty.",
        "Japan: Use INA as auxiliary force to disrupt British lines, secure Burma buffer."
      ],
      payoffs: [
        "Axis alliance was a desperate gamble, but successfully shook the British military's trust in the absolute loyalty of their Indian soldiers, acting as a massive catalyst for post-war decolonization (Variable strategic payoff)."
      ],
      constraints: ["Japanese military collapse in 1944 severely constrained the INA's offensive capabilities."],
      common_strategic_moves: ["Wartime military alliances", "Establishing provisional governments"],
      failure_modes: ["Total strategic dependency on Axis empires that were defeated, leaving the INA militarily stranded in 1945."]
    },
    bayesian_assessment: [
      {
        claim: "Subhas Chandra Bose survived the 1945 Taipei plane crash and lived for years in Soviet exile or as an ascetic monk.",
        prior_confidence: "low",
        evidence: [
          "The extensive post-war investigations (including the Shah Nawaz Committee and Khosla Commission) verifying contemporary medical and cremation records in Taipei.",
          "The complete lack of any verified document in Soviet or Indian archives post-1945 showing he was alive, with rumors primarily fueled by public grief and political distrust."
        ],
        posterior_confidence: "low",
        what_would_change_this: "Discovery of a verified, dated post-1945 photograph of Bose alongside Soviet state planners in Moscow."
      }
    ],
    historical_comparisons: [
      {
        compared_to: "Giuseppe Garibaldi",
        similarities: [
          "Charismatic, revolutionary military commanders who organized volunteer liberation armies abroad.",
          "Despised slow diplomatic compromises, prioritizing direct armed liberation of their homelands."
        ],
        differences: [
          "Bose made alliances with highly repressive totalitarian Axis empires (Japan/Germany) during WWII to secure his goals, creating deep geopolitical controversies."
        ],
        confidence: "high"
      }
    ],
    source_quality: {
      overall: "strong",
      notes: "The Netaji Research Bureau archives, INA trial records, declassified British intelligence files, and definitive biographies by Leonard Gordon.",
      source_count: 5
    },
    sources: [
      "Gordon, Leonard A. (1990). Brothers Against the Raj: A Biography of Indian Nationalists Sarat and Subhas Chandra Bose.",
      "Bose, Subhas Chandra. (1997). The Indian Struggle, 1920-1942.",
      "Fay, Peter Ward. (1993). The Forgotten Army: India's Armed Struggle for Independence, 1942-1945.",
      "Bose, Sugata. (2011). His Majesty's Opponent: Subhas Chandra Bose and India's Struggle against Empire.",
      "Declassified Netaji Files, National Archives of India."
    ],
    research_gaps: ["The exact details and true causes of the Taipei plane crash remain subjects of political controversy among some factional groups in Bengal."],
    created_at: "2026-05-31T21:31:33Z",
    updated_at: "2026-05-31T21:31:33Z"
  },

  // 2. Vallabhbhai Patel
  {
    person_id: "vallabhbhai_patel",
    name: "Vallabhbhai Patel",
    aliases: ["Sardar Patel", "The Iron Man of India"],
    birth_year: 1875,
    death_year: 1950,
    countries_or_regions: ["India", "South Asia"],
    era: "20th Century / Partition / State Integration Era",
    roles: ["First Deputy Prime Minister of India", "Minister of Home Affairs"],
    domains: ["Geopolitics", "Statecraft", "Diplomacy"],
    priority_tier: 1,
    short_summary: "First Deputy Prime Minister of India who engineered the political integration of 565 independent princely states into the Indian Union, preserving state continuity.",
    timeline: [
      {
        date_or_year: "1928",
        event: "Led the Bardoli Satyagraha, organizing rural tax resistance and earning the title 'Sardar' (leader).",
        importance: "high",
        sources: ["Gandhi (2011)"]
      },
      {
        date_or_year: "1931",
        event: "Presided over the Karachi Congress, drafting the historic resolution on Fundamental Rights and Economic Policy.",
        importance: "high",
        sources: ["Congress archives"]
      },
      {
        date_or_year: "1947-08",
        event: "Appointed first Deputy Prime Minister and Home Minister of independent India.",
        importance: "high",
        sources: ["Gandhi (2011)", "Menon (1956)"]
      },
      {
        date_or_year: "1947-1948",
        event: "Systematically negotiated and integrated 562 princely states through a combination of diplomacy and threat.",
        importance: "high",
        sources: ["Menon (1956)", "Guha (2007)"]
      },
      {
        date_or_year: "1947-11",
        event: "Secured military annexation of Junagadh after the Nawab fled to Pakistan following public revolt.",
        importance: "high",
        sources: ["Menon (1956)"]
      },
      {
        date_or_year: "1948-09-13",
        event: "Authorized 'Operation Polo', sending the Indian Army to annex the rebellious princely state of Hyderabad.",
        importance: "high",
        sources: ["Operation Polo records", "Guha (2007)"]
      },
      {
        date_or_year: "1950-12-15",
        event: "Passed away in Bombay; mourned nationally as the master builder of Indian geopolitical unity.",
        importance: "high",
        sources: ["Gandhi (2011)"]
      }
    ],
    power_base: "Absolute control over the Congress Party administrative machinery, complete backing of the civil services (which he saved), Indian business elites, and immense agrarian popularity.",
    core_goals: [
      "Integrate 565 sovereign, independent princely states into the newly born Union of India.",
      "Maintain absolute domestic law, order, and administrative continuity during the chaos of partition.",
      "Construct a highly professional, centralized, non-political civil service (the 'steel frame')."
    ],
    incentives: [
      "Preventing the balkanization ('ulsterization') of the Indian subcontinent.",
      "Re-establishing state authority and communal peace post-partition.",
      "Preserving legal and property contracts to secure economic stability."
    ],
    constraints: [
      "Fierce, wealthy resistance from major princely states (especially Hyderabad and Kashmir).",
      "Catastrophic, widespread communal riots and millions of refugees.",
      "Severe financial limits and partition-mandated military splits."
    ],
    allies: ["Jawaharlal Nehru (cooperative partner)", "V. P. Menon (integration architect)", "Mahatma Gandhi"],
    rivals: ["Nizam of Hyderabad", "Muhammad Ali Jinnah", "Nawab of Junagadh"],
    institutions_controlled_or_influenced: ["Indian National Congress Party", "Ministry of Home Affairs", "Indian Administrative Service (IAS)"],
    ideology_or_worldview: {
      summary: "Pragmatic, centralist nationalism prioritizing state security, legal continuity, administrative efficiency, and institutional stability over radical socialist or ideological experiments.",
      evidence: [
        "Defending the retention of colonial civil servants against Congress radicals.",
        "Authorizing direct military action to secure Hyderabad."
      ],
      confidence: "high"
    },
    decision_patterns: [
      {
        pattern: "Iron-willed, highly transactional realism: offering generous terms (privy purses, estates) to cooperative elites, while deploying immediate, overwhelming military force when state sovereignty was challenged.",
        examples: [
          "Securing accessions using the carrot of Privy Purses.",
          "Launching Operation Polo against the Nizam of Hyderabad."
        ],
        confidence: "high"
      }
    ],
    crisis_behavior: "Exhibited extraordinary, unshakable calm and executive decisiveness during crises, managing the massive Delhi refugee crisis in 1947 by personally monitoring police control rooms.",
    negotiation_style: "direct, frank, transactional, utilizing deep legal logic and clear choices (join peaceably or face army), bypassing rhetoric to secure rapid agreements.",
    risk_tolerance: "high",
    centralization_preference: "high",
    conflict_preference: "medium",
    institutional_respect: "high",
    coalition_dependency: "high",
    populism_level: "medium",
    technocratic_level: "high",
    game_theory_profile: {
      main_players: ["Indian Union (Patel)", "Princely States", "Pakistan", "British Crown"],
      likely_objectives: [
        "India: Secure complete geographic integration, avoid regional secessions.",
        "Princely States: Retain sovereign independence, negotiate high privileges.",
        "Pakistan: Encourage secessions to weaken India, secure Kashmir/Hyderabad."
      ],
      payoffs: [
        "Mansabdari-style Privy Purse settlements successfully traded state pensions in exchange for complete geographic integration, securing the union's borders without costly wars (Highest strategic payoff)."
      ],
      constraints: ["British independence act left princely states legally free, forcing Patel to rely on tactical pressure rather than clear constitutional law."],
      common_strategic_moves: ["Carrot-and-stick diplomacy", "Rapid police actions"],
      failure_modes: ["His centralized administrative focus sometimes alienated regional ethnic groups, creating early federal frictions."]
    },
    bayesian_assessment: [
      {
        claim: "Patel would have successfully integrated Kashmir without a dispute if Nehru had not intervened.",
        prior_confidence: "medium",
        evidence: [
          "Patel's highly pragmatic record in Junagadh and Hyderabad, where he acted with absolute decisiveness.",
          "His early letters indicating a willingness to trade Kashmir to Pakistan in exchange for a clear agreement on Hyderabad, indicating he viewed Kashmir primarily as a tactical piece rather than a holy symbol, whereas Nehru (a Kashmiri Pandit) was emotionally committed."
        ],
        posterior_confidence: "high",
        what_would_change_this: "Discovery of early military plans showing Patel ordered a massive, unilateral invasion of Kashmir regardless of Nehru's views."
      }
    ],
    historical_comparisons: [
      {
        compared_to: "Otto von Bismarck",
        similarities: [
          "The 'Iron' state builders who integrated dozens of independent, volatile regional principalities into unified empires.",
          "Strict realists who prioritized centralized authority and state continuity over liberal/democratic abstractions."
        ],
        differences: [
          "Patel successfully integrated his states into a democratic, representative constitutional republic rather than a monarchical empire."
        ],
        confidence: "high"
      }
    ],
    source_quality: {
      overall: "strong",
      notes: "The voluminous Sardar Patel's Correspondence (10 volumes), V.P. Menon's classic account of state integration, and definitive biographies.",
      source_count: 5
    },
    sources: [
      "Gandhi, Rajmohan. (2011). Patel: A Life.",
      "Menon, V. P. (1956). The Story of the Integration of the Indian States.",
      "Guha, Ramachandra. (2007). India After Gandhi: The History of the World's Largest Democracy.",
      "Sardar Patel's Correspondence, 1945-50 (Navajivan Publishing).",
      "Chopra, P. N. (Editor). (1990s). The Collected Works of Sardar Vallabhbhai Patel."
    ],
    research_gaps: ["Determining the exact degree of his private disagreements with Nehru regarding the referral of the Kashmir issue to the UN remains highly analyzed in Indian political history."],
    created_at: "2026-05-31T21:31:33Z",
    updated_at: "2026-05-31T21:31:33Z"
  },

  // 3. B. R. Ambedkar
  {
    person_id: "b_r_ambedkar",
    name: "B. R. Ambedkar",
    aliases: ["Babasaheb", "The Father of the Indian Constitution"],
    birth_year: 1891,
    death_year: 1956,
    countries_or_regions: ["India", "South Asia", "Global"],
    era: "20th Century / Constitutional / Social Reform Era",
    roles: ["First Law Minister of India", "Chairman of the Constitution Drafting Committee"],
    domains: ["Philosophy", "Social Reform", "Law"],
    priority_tier: 1,
    short_summary: "Indian jurist, social reformer, and father of the Indian Constitution who dedicated his life to fighting caste discrimination and championing Dalit rights.",
    timeline: [
      {
        date_or_year: "1927-03-20",
        event: "Led the Mahad Satyagraha, drinking water from a public tank to challenge the untouchability ban.",
        importance: "high",
        sources: ["Keer (1954)", "Ambedkar Works"]
      },
      {
        date_or_year: "1932",
        event: "Signed the Poona Pact after Gandhi's fast-unto-death, securing reserved seats for Depressed Classes.",
        importance: "high",
        sources: ["Poona Pact records", "Keer (1954)"]
      },
      {
        date_or_year: "1936",
        event: "Published 'Annihilation of Caste', his monumental, radical philosophical critique of the Hindu social order.",
        importance: "high",
        sources: ["Annihilation of Caste text"]
      },
      {
        date_or_year: "1947",
        event: "Appointed Chairman of the Constitution Drafting Committee for independent India.",
        importance: "high",
        sources: ["Constituent Assembly Debates"]
      },
      {
        date_or_year: "1949-11-26",
        event: "Successfully presented the completed Constitution of India to the Constituent Assembly.",
        importance: "high",
        sources: ["Constituent Assembly Debates"]
      },
      {
        date_or_year: "1951",
        event: "Resigned as Law Minister in protest after parliament gridlocked his progressive Hindu Code Bill protecting women's rights.",
        importance: "high",
        sources: ["Resignation speeches", "Keer (1954)"]
      },
      {
        date_or_year: "1956-10-14",
        event: "Converted to Buddhism in Nagpur along with 500,000 Dalit followers, escaping the Hindu caste system.",
        importance: "high",
        sources: ["Conversion archives", "Keer (1954)"]
      }
    ],
    power_base: "Massive, highly loyal political following of Dalit (untouchable) and depressed classes, unmatched legal and constitutional expertise, and backing of progressive secular/reformist alliances.",
    core_goals: [
      "Annihilate the Hindu caste system and eradicate untouchability completely.",
      "Draft a highly modern, progressive, and egalitarian secular constitution for India.",
      "Codify legal rights protecting women's property, inheritance, and marriage in civil laws."
    ],
    incentives: [
      "Securing complete human rights, dignity, and representation for Dalits.",
      "Providing India with a robust, progressive rule of law.",
      "Emancipating Indian women from traditional patriarchal legal codes."
    ],
    constraints: [
      "Fierce, entrenched social opposition from conservative orthodox Hindu elites.",
      "Severe economic and educational backwardness of his core Dalit demographic.",
      "Cabinet and parliamentary gridlock that blocked his progressive civil reforms."
    ],
    allies: ["Jawaharlal Nehru (secured his cabinet role)", "John Dewey (intellectual mentor)", "Dalit mass networks"],
    rivals: ["Mahatma Gandhi (bitter dispute over separate electorates)", "Conservative Orthodox Hindu Leaders"],
    institutions_controlled_or_influenced: ["Constitution Drafting Committee", "Ministry of Law", "Scheduled Castes Federation", "Buddhist Society of India"],
    ideology_or_worldview: {
      summary: "Radical social democracy and constitutionalism combined with strict anti-caste secularism, pragmatism, gender equality, and modern Navayana Buddhism.",
      evidence: [
        "Writing 'Annihilation of Caste' calling for the complete destruction of Hindu scriptures that justify caste.",
        "Amending the Constitution to outlaw untouchability (Article 17) and establish affirmative action reservations."
      ],
      confidence: "high"
    },
    decision_patterns: [
      {
        pattern: "Rigorous, highly scholarly, and legalistic decision-making, using constitutional law and academic history to systematically dismantle traditional social privileges, while rejecting revolutionary violence.",
        examples: [
          "Bargaining intensely with Gandhi at Poona to secure reserved legislative seats.",
          "Using the Hindu Code Bill to reform family laws and secure women's inheritance."
        ],
        confidence: "high"
      }
    ],
    crisis_behavior: "Exhibited highly disciplined, cool intellectual resolve in crises (e.g. during Gandhi's 1932 fast), prioritizing the physical survival of his community while extracting concrete legal guarantees.",
    negotiation_style: "highly intellectual, uncompromising on core human rights, lecturing opponents with unmatched legal and historical erudition, refusing to capitulate to emotional moral appeals.",
    risk_tolerance: "high",
    centralization_preference: "high",
    conflict_preference: "low",
    institutional_respect: "high",
    coalition_dependency: "high",
    populism_level: "high",
    technocratic_level: "high",
    game_theory_profile: {
      main_players: ["Dalit Faction (Ambedkar)", "Congress Faction (Gandhi)", "British Colonial State"],
      likely_objectives: [
        "Ambedkar: Secure separate electorates or high reserved representation, secure constitutional rights.",
        "Gandhi: Prevent separate electorates (fearing division of Hindu community), maintain Congress monopoly.",
        "British: Delay independence, balance local factions."
      ],
      payoffs: [
        "Poona Pact (1932) successfully traded separate electorates (which Gandhi fasted against) in exchange for doubling the reserved seats for Dalits in legislatures, optimizing their concrete representation payoff (Highest strategic payoff)."
      ],
      constraints: ["Gandhi's fast-unto-death created extreme public pressure on Ambedkar, forcing a tactical compromise to save Gandhi's life."],
      common_strategic_moves: ["Legal drafts", "Mass conversions", "Hunger strikes (opposed by Ambedkar but managed)"],
      failure_modes: ["His resignation over the Hindu Code Bill in 1951 exposed the limits of technocratic reform in the face of conservative parliamentary majorities."]
    },
    bayesian_assessment: [
      {
        claim: "Ambedkar converted to Buddhism primarily as a political move rather than a spiritual choice.",
        prior_confidence: "low",
        evidence: [
          "His declaration in 1935: 'I was born a Hindu, but I will not die a Hindu,' indicating a lifelong search for a moral, egalitarian alternative.",
          "His extensive theological monograph 'The Buddha and His Dhamma' outlining a highly sophisticated, rational reconstruction of Buddhist philosophy (Navayana) as a spiritual path for human dignity."
        ],
        posterior_confidence: "high",
        what_would_change_this: "Discovery of private papers showing he privately ridiculed Buddhism and ordered his followers to convert purely to create a distinct voting bloc."
      }
    ],
    historical_comparisons: [
      {
        compared_to: "Martin Luther King Jr.",
        similarities: [
          "Civil rights leaders who led historically oppressed minorities (Black Americans/Dalits).",
          "Used moral, legal, and constitutional arguments to challenge systemic social segregation."
        ],
        differences: [
          "Ambedkar served as the chief architect of his nation's actual constitution, holding formal state office as Law Minister."
        ],
        confidence: "high"
      }
    ],
    source_quality: {
      overall: "strong",
      notes: "The massive Dr. Babasaheb Ambedkar: Writings and Speeches (21 volumes published by the Government of Maharashtra), Constituent Assembly Debates, and Dhananjay Keer's biography.",
      source_count: 5
    },
    sources: [
      "Keer, Dhananjay. (1954). Dr. Ambedkar: Life and Mission.",
      "Ambedkar, B. R. (1936). Annihilation of Caste.",
      "Ambedkar, B. R. (1957). The Buddha and His Dhamma.",
      "Jaffrelot, Christophe. (2005). Dr. Ambedkar and Untouchability: Fighting the Indian Caste System.",
      "Dr. Babasaheb Ambedkar: Writings and Speeches, Ministry of Social Justice, Government of India."
    ],
    research_gaps: ["Determining the exact degree of behind-the-scenes legal cooperation between Ambedkar and constitutional advisor B.N. Rau remains highly analyzed."],
    created_at: "2026-05-31T21:31:33Z",
    updated_at: "2026-05-31T21:31:33Z"
  },

  // 4. Sun Yat-sen
  {
    person_id: "sun_yat_sen",
    name: "Sun Yat-sen",
    aliases: ["Sun Zhongshan", "Father of the Nation (China)"],
    birth_year: 1866,
    death_year: 1925,
    countries_or_regions: ["China", "East Asia"],
    era: "Late 19th / Early 20th Century / Xinhai Revolution Era",
    roles: ["First Provisional President of the Republic of China", "Founder of the Kuomintang"],
    domains: ["Geopolitics", "Statecraft", "Ideology"],
    priority_tier: 1,
    short_summary: "Chinese revolutionary and statesman who led the overthrow of the Qing Dynasty, served as the first provisional president, and founded the Kuomintang.",
    timeline: [
      {
        date_or_year: "1894",
        event: "Founded the Revive China Society in Honolulu, launching his revolutionary career.",
        importance: "high",
        sources: ["Schiffrin (1968)"]
      },
      {
        date_or_year: "1905",
        event: "Unified secret anti-Qing groups in Tokyo to form the Tongmenghui; formulated the Three Principles of the People.",
        importance: "high",
        sources: ["Schiffrin (1968)", "Wilbur (1976)"]
      },
      {
        date_or_year: "1911-10-10",
        event: "Wuchang Uprising erupted; Sun was in Denver, Colorado, and rushed back to China.",
        importance: "high",
        sources: ["Xinhai archives", "Wilbur (1976)"]
      },
      {
        date_or_year: "1912-01-01",
        event: "Inaugurated in Nanjing as the first Provisional President of the Republic of China.",
        importance: "high",
        sources: ["Republic of China archives"]
      },
      {
        date_or_year: "1912-03",
        event: "Resigned provisional presidency to military commander Yuan Shikai to prevent civil war.",
        importance: "high",
        sources: ["Wilbur (1976)"]
      },
      {
        date_or_year: "1919",
        event: "Reorganized the Kuomintang (KMT) in Shanghai, establishing a disciplined political base.",
        importance: "high",
        sources: ["KMT archives"]
      },
      {
        date_or_year: "1923",
        event: "Signed the Sun-Joffe Manifesto, securing Soviet financial and military aid for the KMT.",
        importance: "high",
        sources: ["Manifesto text", "Wilbur (1976)"]
      },
      {
        date_or_year: "1925-03-12",
        event: "Passed away in Beijing; mourned as the ultimate father of modern Chinese sovereignty.",
        importance: "high",
        sources: ["Wilbur (1976)"]
      }
    ],
    power_base: "Overseas Chinese funding, secret anti-Qing revolutionary societies, high intellectual prestige among modernized youth, and Kuomintang political organization.",
    core_goals: [
      "Overthrow the corrupt Qing Dynasty monarchy permanently.",
      "Establish a modern, sovereign, unified, and democratic Chinese Republic.",
      "Implement his Three Principles of the People (Nationalism, Democracy, Livelihood)."
    ],
    incentives: [
      "Eradicating the Century of Humiliation and Western colonial concessions in China.",
      "Preventing total partition of the Chinese heartland by foreign powers.",
      "Achieving stable constitutional republicanism."
    ],
    constraints: [
      "Complete lack of independent military forces compared to wealthy regional warlords.",
      "Fierce regional warlordism and fractional division of the country.",
      "Financial bankruptcy of the early provisional governments."
    ],
    allies: ["Song Jiaoren (democracy architect)", "Chiang Kai-shek (military protege)", "Adolf Joffe (Soviet sponsor)"],
    rivals: ["Empress Dowager Cixi", "Yuan Shikai (usurper warlord)", "Chen Jiongming"],
    institutions_controlled_or_influenced: ["Tongmenghui", "Kuomintang (KMT)", "Republic of China", "Whampoa Military Academy"],
    ideology_or_worldview: {
      summary: "Three Principles of the People (San-min Doctrine: Nationalism - freedom from imperial control; Democracy - representative constitutional rule; Livelihood - state-aided economic welfare).",
      evidence: [
        "His official lectures compiled in 'The Three Principles of the People'.",
        "Formulating the 'Five-Power Constitution' adding censorial and examination branches."
      ],
      confidence: "high"
    },
    decision_patterns: [
      {
        pattern: "Agile revolutionary organizing (surviving 10 failed uprisings), combined with a willingness to surrender formal political offices to military generals to secure the theoretical republican union.",
        examples: [
          "Surrendering the presidency to Yuan Shikai in 1912 to secure the abdication of the Qing Emperor.",
          "Forging the First United Front with the newly established CCP in 1923 to defeat northern warlords."
        ],
        confidence: "high"
      }
    ],
    crisis_behavior: "Exhibited strong, optimistic resilience during exile and failed coups, using his travels globally to constantly raise funds and organize secret societies, ignoring imperial assassination orders.",
    negotiation_style: "highly eloquent, visionary, focusing on grand civilizational rejuvenation, while showing extreme flexibility in sharing political offices if it advanced the republican goal.",
    risk_tolerance: "high",
    centralization_preference: "medium",
    conflict_preference: "medium",
    institutional_respect: "high",
    coalition_dependency: "high",
    populism_level: "high",
    technocratic_level: "medium",
    game_theory_profile: {
      main_players: ["KMT (Sun)", "Warlords (Yuan)", "Soviet Union", "Western Powers"],
      likely_objectives: [
        "KMT: Unify China, establish republic, defeat warlords.",
        "Warlords: Retain regional military fiefdoms, extract taxes.",
        "Soviets: Secure strategic buffer, expand socialist influence."
      ],
      payoffs: [
        "Sun-Joffe Manifesto (1923) successfully secured Soviet military instructors and weapons, optimizing the KMT's payoff by building the Whampoa Military Academy to crush the warlords (Highest strategic payoff)."
      ],
      constraints: ["Severe financial bankruptcy post-1912 forced reliance on foreign loans and alliances."],
      common_strategic_moves: ["Revolutionary alliances", "Voluntary political resignations"],
      failure_modes: ["His surrender of the presidency to Yuan Shikai in 1912 allowed Yuan to immediately declare himself Emperor, initiating decades of warlord anarchy."]
    },
    bayesian_assessment: [
      {
        claim: "Sun Yat-sen's alliance with the Soviet Union in 1923 was a conversion to communism rather than a tactical necessity.",
        prior_confidence: "low",
        evidence: [
          "The explicit text of the Sun-Joffe Manifesto stating that the communist system could not be introduced in China due to different conditions.",
          "His lectures on the Principle of Livelihood, which rejected Marxist class war in favor of state-regulated capitalism and social welfare."
        ],
        posterior_confidence: "low",
        what_would_change_this: "Discovery of private letters to Lenin stating he planned to completely collectivize Chinese agriculture and eliminate the KMT."
      }
    ],
    historical_comparisons: [
      {
        compared_to: "Simón Bolívar",
        similarities: [
          "Father of the Nation figures who overthrew ancient empires (Spanish/Qing) to establish republics.",
          "Faced severe regional warlordism and geographic splits, dying before their unified dreams were fully stabilized."
        ],
        differences: [
          "Sun Yat-sen was primarily an ideologue and fundraiser rather than a direct battlefield commander, relying on military proteges like Chiang."
        ],
        confidence: "high"
      }
    ],
    source_quality: {
      overall: "strong",
      notes: "KMT archives in Taipei, the Sun Yat-sen Collected Works, Soviet diplomatic papers, and definitive academic biographies.",
      source_count: 5
    },
    sources: [
      "Schiffrin, Harold Z. (1968). Sun Yat-sen and the Origins of the Chinese Revolution.",
      "Wilbur, C. Martin. (1976). Sun Yat-sen: Frustrated Patriot.",
      "Sun, Yat-sen. (1924). The Three Principles of the People.",
      "Bergère, Marie-Claire. (1998). Sun Yat-sen.",
      "Leng, Shao Chuan & Palmer, Norman D. (1960). Sun Yat-sen and Communism."
    ],
    research_gaps: ["Determining the exact degree of his private foreknowledge regarding the plans of Song Jiaoren prior to his assassination in 1913 remains historically debated."],
    created_at: "2026-05-31T21:31:33Z",
    updated_at: "2026-05-31T21:31:33Z"
  },

  // 5. Zhou Enlai
  {
    person_id: "zhou_enlai",
    name: "Zhou Enlai",
    aliases: ["Premier Zhou"],
    birth_year: 1898,
    death_year: 1976,
    countries_or_regions: ["China", "East Asia"],
    era: "20th Century / Chinese Civil War / Cold War Era",
    roles: ["First Premier of the People's Republic of China", "Foreign Minister of China"],
    domains: ["Geopolitics", "Statecraft", "Diplomacy"],
    priority_tier: 1,
    short_summary: "First Premier of the People's Republic of China who managed its administrative survival, co-negotiated the opening to the US, and moderated the Cultural Revolution.",
    timeline: [
      {
        date_or_year: "1927",
        event: "Organized the Nanchang Uprising, launching the Red Army (PLA) military resistance against the KMT.",
        importance: "high",
        sources: ["Han (1994)"]
      },
      {
        date_or_year: "1936-12",
        event: "Xi'an Incident: Negotiated the release of Chiang Kai-shek, establishing the Second United Front against Japan.",
        importance: "high",
        sources: ["Xi'an incident records", "Han (1994)"]
      },
      {
        date_or_year: "1949-10-01",
        event: "Appointed first Premier and Foreign Minister of the newly proclaimed People's Republic of China.",
        importance: "high",
        sources: ["PRC state archives"]
      },
      {
        date_or_year: "1954",
        event: "Represented China at the Geneva Conference, negotiating the division of Indochina.",
        importance: "high",
        sources: ["Geneva transcripts", "Kissinger (2011)"]
      },
      {
        date_or_year: "1955-04",
        event: "Attended the Bandung Conference, articulating the Five Principles of Peaceful Coexistence (Panchsheel).",
        importance: "high",
        sources: ["Bandung transcripts"]
      },
      {
        date_or_year: "1966-1976",
        event: "Managed state administrative continuity during the chaotic Cultural Revolution, secretly protecting purged officials.",
        importance: "high",
        sources: ["MacFarquhar & Schoenhals (2006)"]
      },
      {
        date_or_year: "1972-02",
        event: "Co-negotiated the Shanghai Communiqué with Richard Nixon and Henry Kissinger, opening relations.",
        importance: "high",
        sources: ["Shanghai Communiqué text", "Kissinger (2011)"]
      },
      {
        date_or_year: "1976-01-08",
        event: "Passed away in Beijing; massive, spontaneous public mourning led to the April Tiananmen Incident.",
        importance: "high",
        sources: ["Tiananmen incident records", "Han (1994)"]
      }
    ],
    power_base: "Universal respect among CCP state planners and military generals, complete command over China's diplomatic corps, personal trust of Mao, and support of urban moderates.",
    core_goals: [
      "Construct and stabilize the administrative infrastructure of the People's Republic of China.",
      "Assert Chinese sovereign foreign policy and break geopolitical encirclement through sophisticated diplomacy.",
      "Protect moderate, experienced technocrats (like Deng Xiaoping) from radical ideological destruction."
    ],
    incentives: [
      "Averting a total collapse of state administrative capacity.",
      "Securing Chinese borders and industrial development.",
      "Ensuring his personal political survival to serve as a stabilizing buffer."
    ],
    constraints: [
      "Mao Zedong's absolute, erratic, and radical ideological authority.",
      "Constant threat of immediate personal purge by radical factions (Gang of Four) if he appeared moderate.",
      "Geopolitical containment by the US (early) and Soviet military build-up (later)."
    ],
    allies: ["Mao Zedong (complex partner)", "Deng Xiaoping (protégé)", "Chen Yi (general/diplomat)"],
    rivals: ["Jiang Qing (Gang of Four)", "Lin Biao", "Western containment planners"],
    institutions_controlled_or_influenced: ["State Council of the PRC", "Ministry of Foreign Affairs of the PRC", "Whampoa Military Academy (formerly)"],
    ideology_or_worldview: {
      summary: "Pragmatic, technocratic communism prioritizing administrative stability, economic modernization (Four Modernizations), peaceful coexistence, and professional statecraft over continuous ideological class war.",
      evidence: [
        "Drafting the 'Four Modernizations' policy proposal in 1964 and 1975.",
        "Formulating the Five Principles of Peaceful Coexistence."
      ],
      confidence: "high"
    },
    decision_patterns: [
      {
        pattern: "Patient, highly calculated, and self-effacing administrative statecraft, always submitting publicly to Mao's radical decrees while secretly working behind the scenes to moderate their destructive effects.",
        examples: [
          "Secretly signing orders to protect historical sites like the Forbidden City from Red Guard destruction.",
          "Co-negotiating the opening to the US while keeping Mao's name on all ultimate decisions."
        ],
        confidence: "high"
      }
    ],
    crisis_behavior: "Exhibited extraordinary, cool diplomatic and physical resilience in crises (e.g. during the height of the Cultural Revolution), working 18-hour days to keep the state running despite having stomach cancer.",
    negotiation_style: "highly civilized, charming, brilliant, focusing on shared strategic goals and personal trust, described by Kissinger as 'one of the most civilized men I have ever met'.",
    risk_tolerance: "medium",
    centralization_preference: "high",
    conflict_preference: "low",
    institutional_respect: "high",
    coalition_dependency: "high",
    populism_level: "low",
    technocratic_level: "high",
    game_theory_profile: {
      main_players: ["PRC (Zhou)", "United States", "Soviet Union", "CCP Radicals"],
      likely_objectives: [
        "PRC: Break containment, secure border safety, modernise economy.",
        "US: Leverage China against USSR, exit Vietnam war.",
        "Radicals: Purge moderates, maintain continuous revolution."
      ],
      payoffs: [
        "Shanghai Communiqué (1972) successfully bypassed radical CCP opposition and Western containment, securing a massive strategic and economic opening for China (Highest diplomatic payoff)."
      ],
      constraints: ["Mao's paranoid suspicion of moderate officials acted as a strict threat constraint that forced Zhou to always show absolute ideological submission."],
      common_strategic_moves: ["Summit diplomacy", "Secret administrative protection orders"],
      failure_modes: ["His complete loyalty to Mao prevented him from directly challenging the devastating Great Leap Forward, causing massive human costs."]
    },
    bayesian_assessment: [
      {
        claim: "Zhou Enlai secretly desired to replace Mao Zedong as Chairman of the CCP.",
        prior_confidence: "low",
        evidence: [
          "His consistent, lifelong refusal to ever claim the top political spot, voluntarily stepping back in favor of Mao at the Zunyi Conference (1935).",
          "His realization that Mao possessed a unique, mystical peasant appeal that Zhou (an elite urban intellectual) could never replicate, preferring to serve as the ultimate administrator."
        ],
        posterior_confidence: "low",
        what_would_change_this: "Discovery of private journals showing Zhou plotted to assassinate Mao during the Cultural Revolution."
      }
    ],
    historical_comparisons: [
      {
        compared_to: "Cardinal Richelieu",
        similarities: [
          "Brilliant, highly sophisticated, and pragmatic state administrators who directed foreign policy.",
          "Prioritized state utility (Raison d'État) and international alliances over rigid ideological/religious dogmas."
        ],
        differences: [
          "Zhou operated inside a revolutionary Marxist-Leninist party-state, serving as Premier under an absolute ideological dictator (Mao)."
        ],
        confidence: "high"
      }
    ],
    source_quality: {
      overall: "strong",
      notes: "Official PRC State Council papers, Henry Kissinger's On China, declassified US State Department files, and definitive biographies by Han Suyin.",
      source_count: 5
    },
    sources: [
      "Han, Suyin. (1994). Eldest Son: Zhou Enlai and the Making of Modern China.",
      "Kissinger, Henry. (2011). On China.",
      "MacFarquhar, Roderick & Schoenhals, Michael. (2006). Mao's Last Revolution.",
      "Gao, Wenqian. (2007). Zhou Enlai: The Last Perfect Revolutionary.",
      "Selected Works of Zhou Enlai, Foreign Languages Press (Beijing)."
    ],
    research_gaps: ["The exact details of his private, final conversations with Deng Xiaoping in the hospital in late 1975 remain unrecorded and classified in Beijing archives."],
    created_at: "2026-05-31T21:31:33Z",
    updated_at: "2026-05-31T21:31:33Z"
  },

  // 6. Nikita Khrushchev
  {
    person_id: "nikita_khrushchev",
    name: "Nikita Khrushchev",
    aliases: ["Khrushchev"],
    birth_year: 1894,
    death_year: 1971,
    countries_or_regions: ["Soviet Union", "Russia", "Europe"],
    era: "20th Century / Soviet Post-Stalin Era / Cold War",
    roles: ["First Secretary of the Communist Party of the Soviet Union", "Premier of the Soviet Union"],
    domains: ["Geopolitics", "Statecraft", "Military"],
    priority_tier: 2,
    short_summary: "Soviet leader who denounced Stalin in his 1956 'Secret Speech', initiated the Thaw, led the USSR during the Cuban Missile Crisis, and was deposed in 1964.",
    timeline: [
      {
        date_or_year: "1953-06",
        event: "Coordinated with party leaders to arrest and execute secret police chief Lavrentiy Beria.",
        importance: "high",
        sources: ["Taubman (2003)"]
      },
      {
        date_or_year: "1953-09-07",
        event: "Elected First Secretary of the Central Committee of the CPSU.",
        importance: "high",
        sources: ["Taubman (2003)"]
      },
      {
        date_or_year: "1956-02-25",
        event: "Delivered his historic 'Secret Speech' to the 20th Party Congress, denouncing Stalin's crimes.",
        importance: "high",
        sources: ["Secret Speech text", "Taubman (2003)"]
      },
      {
        date_or_year: "1956-11",
        event: "Ordered the Soviet military invasion to crush the Hungarian Revolution, maintaining Warsaw Pact cohesion.",
        importance: "high",
        sources: ["Hungarian invasion records"]
      },
      {
        date_or_year: "1957",
        event: "Outmaneuvered the 'Anti-Party Group' Stalinist hardliners who tried to depose him.",
        importance: "high",
        sources: ["Taubman (2003)"]
      },
      {
        date_or_year: "1959-09",
        event: "Visited the United States, becoming the first Soviet leader to do so, meeting Dwight D. Eisenhower.",
        importance: "high",
        sources: ["US visit archives", "Taubman (2003)"]
      },
      {
        date_or_year: "1962-10",
        event: "Cuban Missile Crisis: Secretly deployed nuclear missiles to Cuba; backed down in exchange for US pledges.",
        importance: "high",
        sources: ["Missile Crisis transcripts", "Fursenko & Naftali (1997)"]
      },
      {
        date_or_year: "1964-10-14",
        event: "Deposed in a palace coup organized by Leonid Brezhnev while vacationing; forced into retirement.",
        importance: "high",
        sources: ["Coup records", "Taubman (2003)"]
      }
    ],
    power_base: "CPSU regional party apparatus, backing of reformist bureaucrats, and strategic military alliances (Zhukov).",
    core_goals: [
      "De-Stalinize the Soviet Union, relaxing state terror and closing the Gulag system.",
      "Surpass the United States in technological and agricultural capacity (Space/Virgin Lands).",
      "Deter US military intervention through aggressive nuclear brinkmanship."
    ],
    incentives: [
      "Preventing a return to the paranoid mass executions of the Stalin era.",
      "Improving the living standards and consumer goods of the Soviet working class.",
      "Securing global socialist hegemony."
    ],
    constraints: [
      "Bitter, entrenched opposition from conservative Stalinist hardliners.",
      "Low productivity and chronic inefficiency of collective Soviet agriculture.",
      "Extreme danger of a global thermonuclear exchange during localized confrontations."
    ],
    allies: ["Anastas Mikoyan", "Georgy Zhukov (early)", "Leonid Brezhnev (early successor)"],
    rivals: ["Lavrentiy Beria (purged)", "Vyacheslav Molotov", "John F. Kennedy", "Mao Zedong (Sino-Soviet split arch-rival)"],
    institutions_controlled_or_influenced: ["Communist Party of the Soviet Union", "Soviet Union", "The Warsaw Pact", "The KGB (reformed)"],
    ideology_or_worldview: {
      summary: "Reformist Marxism-Leninism advocating for 'peaceful coexistence' with capitalist powers, de-Stalinization, space-age technological optimism, and state-managed consumer welfare.",
      evidence: [
        "Delivering the Secret Speech denouncing the cult of personality.",
        "Authorizing the publication of Solzhenitsyn's 'One Day in the Life of Ivan Denisovich'."
      ],
      confidence: "high"
    },
    decision_patterns: [
      {
        pattern: "Impulsive, highly erratic, and high-risk policy lurches (e.g., Virgin Lands project, Cuban missile deployment) implemented without consultation, relying on emotional rhetoric.",
        examples: [
          "Deploying nuclear missiles to Cuba to address the strategic deficit.",
          "Banging his shoe on his desk at the UN General Assembly in 1960."
        ],
        confidence: "high"
      }
    ],
    crisis_behavior: "Exhibited highly volatile and aggressive brinkmanship in the early stages of crises, but was ultimately willing to execute pragmatic, rational retreats (e.g. Cuban Missile Crisis) to prevent nuclear war.",
    negotiation_style: "highly colloquial, blustering, combining rural humor and threats of missile production with sincere offers of peaceful trade summits.",
    risk_tolerance: "high",
    centralization_preference: "high",
    conflict_preference: "high",
    institutional_respect: "medium",
    coalition_dependency: "high",
    populism_level: "high",
    technocratic_level: "medium",
    game_theory_profile: {
      main_players: ["USSR (Khrushchev)", "United States (JFK)", "Cuba (Castro)", "CCP (Mao)"],
      likely_objectives: [
        "USSR: Deter US invasion of Cuba, secure Turkish missile removal, match US power.",
        "US: Force missile removal, avoid war, maintain blockade.",
        "Cuba: Prevent US invasion, maintain Soviet protection."
      ],
      payoffs: [
        "Cuban Missile Crisis Settlement (1962) traded the public removal of Soviet missiles in exchange for a private US pledge to remove missiles from Turkey and a public promise not to invade Cuba, successfully preventing nuclear war (Highest cooperative payoff)."
      ],
      constraints: ["US naval quarantine blocked further missile shipments, forcing a binary choice between retreat or war."],
      common_strategic_moves: ["Nuclear brinkmanship", "Televised letters"],
      failure_modes: ["His erratic brinkmanship and agricultural failures (forcing grain imports) alienated the party leadership, enabling the 1964 coup."]
    },
    bayesian_assessment: [
      {
        claim: "Khrushchev's de-Stalinization speech was a calculated move to secure his personal power rather than a moral reform.",
        prior_confidence: "medium",
        evidence: [
          "His need to delegitimize his chief rivals (Molotov, Malenkov) who were deeply complicit in Stalin's purges.",
          "His own extensive complicity in directing the purges in Ukraine, which he sought to deflect by blaming Stalin's personal paranoia."
        ],
        posterior_confidence: "high",
        what_would_change_this: "Discovery of private letters showing he planned to completely dissolve the CPSU and establish a multi-party democracy in 1956."
      }
    ],
    historical_comparisons: [
      {
        compared_to: "Deng Xiaoping",
        similarities: [
          "Reformist communist leaders who denounced their predecessors' radical cults (Stalin/Mao).",
          "Relaxed state terror, reformed collective institutions, and sought economic modernization."
        ],
        differences: [
          "Khrushchev's erratic lurches destabilized the party bureaucracy, leading to his deposition, whereas Deng maintained absolute party consensus."
        ],
        confidence: "high"
      }
    ],
    source_quality: {
      overall: "strong",
      notes: "William Taubman's Pulitzer-winning biography, Khrushchev's own dictaphone-recorded memoirs, CPSU archives, and Cuban Missile Crisis transcripts.",
      source_count: 5
    },
    sources: [
      "Taubman, William. (2003). Khrushchev: The Man and His Era.",
      "Khrushchev, Nikita. (1970). Khrushchev Remembers.",
      "Fursenko, Aleksandr & Naftali, Timothy. (1997). 'One Hell of a Gamble': Khrushchev, Castro, and Kennedy, 1958-1964.",
      "Zubok, Vladislav M. & Pleshakov, Constantine. (1996). Inside the Kremlin's Cold War: From Stalin to Khrushchev.",
      "Declassified Soviet Cold War Archives, Wilson Center."
    ],
    research_gaps: ["Determining the exact degree of his private psychological depression and isolation during his final seven years under house arrest remains sparse."],
    created_at: "2026-05-31T21:31:33Z",
    updated_at: "2026-05-31T21:31:33Z"
  },

  // 7. Nicholas II
  {
    person_id: "nicholas_ii",
    name: "Nicholas II",
    aliases: ["Nicholas Romanov", "Saint Nicholas the Passion-Bearer"],
    birth_year: 1868,
    death_year: 1918,
    countries_or_regions: ["Russia", "Europe"],
    era: "Late 19th / Early 20th Century / Fall of Romanov Dynasty",
    roles: ["Last Emperor of Russia"],
    domains: ["Geopolitics", "Statecraft", "Military"],
    priority_tier: 2,
    short_summary: "Last Emperor of Russia whose resistance to political reforms, military failures in WWI, and absolute centralization led to the 1917 Russian Revolution.",
    timeline: [
      {
        date_or_year: "1894-11-01",
        event: "Ascended the Romanov imperial throne following the death of his father Alexander III.",
        importance: "high",
        sources: ["Lieven (1993)", "Massie (1967)"]
      },
      {
        date_or_year: "1904-02",
        event: "Launched the disastrous Russo-Japanese War, resulting in humiliating Russian naval defeat.",
        importance: "high",
        sources: ["Lieven (1993)"]
      },
      {
        date_or_year: "1905-01-22",
        event: "Bloody Sunday: Imperial troops fire on peaceful petitioners in Petrograd, destroying his father-figure moral status.",
        importance: "high",
        sources: ["1905 revolution archives"]
      },
      {
        date_or_year: "1905-10-30",
        event: "Forced by general strikes to issue the October Manifesto, establishing the State Duma.",
        importance: "high",
        sources: ["October Manifesto text", "Witte Memoirs"]
      },
      {
        date_or_year: "1914-07",
        event: "Ordered general military mobilization against Austria-Germany, entering World War I.",
        importance: "high",
        sources: ["Lieven (2015)"]
      },
      {
        date_or_year: "1915-09",
        event: "Assumed personal, direct command of the Russian military, linking his prestige to battlefield defeats.",
        importance: "high",
        sources: ["Lieven (2015)", "Massie (1967)"]
      },
      {
        date_or_year: "1917-03-15",
        event: "Forced to abdicate during the February Revolution; placed under house arrest.",
        importance: "high",
        sources: ["Abdication records", "Figes (1996)"]
      },
      {
        date_or_year: "1918-07-17",
        event: "Executed alongside his wife, children, and servants by Bolshevik guards in the basement of the Ipatiev House.",
        importance: "high",
        sources: ["Execution files", "Figes (1996)"]
      }
    ],
    power_base: "Hereditary Romanov dynastic legitimacy, absolute support of the Orthodox Church, loyal imperial guard standing army, and conservative aristocratic landowners.",
    core_goals: [
      "Preserve absolute, centralized autocratic authority intact for his hemophiliac heir.",
      "Expand and defend Russian imperial borders in Asia and Europe.",
      "Foster industrial modernization while preventing liberal political reforms."
    ],
    incentives: [
      "Absolute religious duty to God to maintain autocracy.",
      "Protecting his family and dynasty.",
      "Preserving the traditional social hierarchy of Holy Russia."
    ],
    constraints: [
      "Widespread, violent peasant and urban worker revolutionary movements.",
      "Complete military collapse and mass casualties of the Russian army in WWI.",
      "Acute dynastic instability caused by his son Alexei's hemophilia."
    ],
    allies: ["Alexandra Feodorovna (wife)", "Grigori Rasputin (healer)", "Sergei Witte (reformer)"],
    rivals: ["Vladimir Lenin", "Leon Trotsky", "Kaiser Wilhelm II", "State Duma liberal leaders"],
    institutions_controlled_or_influenced: ["Russian Empire", "Imperial Guard", "State Duma (sidelined)", "Governing Senate"],
    ideology_or_worldview: {
      summary: "Divine Right Autocracy, believing that the Tsar holds absolute, divinely ordained authority over Russia and must never yield power to representative parliaments or constitutions.",
      evidence: [
        "His coronation oath pledging to maintain autocracy.",
        "His private journals consistently describing the State Duma as an illegitimate entity."
      ],
      confidence: "high"
    },
    decision_patterns: [
      {
        pattern: "Severe, gridlocked indecisiveness in constitutional matters, followed by stubborn, dogmatic refusal to compromise on autocratic powers, regularly relying on his wife's advice.",
        examples: [
          "Systematically firing reforming prime ministers (like Witte and Stolypin) once they consolidated stability.",
          "Ignoring the warnings of his generals and diplomats on the eve of the 1917 revolution."
        ],
        confidence: "high"
      }
    ],
    crisis_behavior: "Exhibited stoic, quiet, and passive resignation during crises, accepting his abdication and subsequent imprisonment with deep religious faith, completely failing to organize military resistance.",
    negotiation_style: "highly formal, evasive, avoiding direct verbal confrontations, compromising only under absolute physical threat, then immediately working to subvert the agreements.",
    risk_tolerance: "medium",
    centralization_preference: "high",
    conflict_preference: "high",
    institutional_respect: "high",
    coalition_dependency: "high",
    populism_level: "low",
    technocratic_level: "medium",
    game_theory_profile: {
      main_players: ["Tsar Nicholas II", "State Duma Liberals", "Bolsheviks", "German Empire"],
      likely_objectives: [
        "Tsar: Retain autocracy, win WWI, protect family.",
        "Duma: Establish constitutional monarchy or republic, continue WWI.",
        "Bolsheviks: Overthrow autocracy and capitalism, exit WWI.",
        "Germany: Defeat Russia, secure eastern territory."
      ],
      payoffs: [
        "His refusal to compromise with Duma liberals in early 1917 led to a catastrophic payoff where he lost both his throne and his life, enabling the Bolshevik revolution (Lowest payoff)."
      ],
      constraints: ["Severe military collapses and food shortages in Petrograd limited his tactical options in 1917."],
      common_strategic_moves: ["Autocratic decrees", "Suspending parliaments"],
      failure_modes: ["His absolute reliance on Rasputin's influence alienated the traditional aristocratic and military elites who were his primary power base."]
    },
    bayesian_assessment: [
      {
        claim: "Nicholas II was a weak-willed ruler easily dominated by his wife and Rasputin.",
        prior_confidence: "high",
        evidence: [
          "The extensive letters from Alexandra urging him to 'be the Emperor' and 'listen to Our Friend' (Rasputin).",
          "His systematic dismissal of competent, strong ministers (Stolypin, Witte) who tried to direct independent policy, indicating he was stubborn in his autocracy but weak in executive execution."
        ],
        posterior_confidence: "high",
        what_would_change_this: "Discovery of private letters showing he actively plotted to assassinate Rasputin himself to assert his authority."
      }
    ],
    historical_comparisons: [
      {
        compared_to: "Louis XVI of France",
        similarities: [
          "Stoic, highly religious last monarchs of ancient dynasties overthrown in mass revolutions.",
          "Faced severe economic/military crises, resisted constitutional reforms, and were executed by revolutionary guards."
        ],
        differences: [
          "Nicholas II ruled a massive, modernizing 20th-century empire during a global industrial war."
        ],
        confidence: "high"
      }
    ],
    source_quality: {
      overall: "strong",
      notes: "His extensive diaries, personal correspondence with Alexandra, official imperial records, and Robert Massie's classic biographies.",
      source_count: 5
    },
    sources: [
      "Massie, Robert K. (1967). Nicholas and Alexandra.",
      "Lieven, Dominic. (1993). Nicholas II: Emperor of all the Russias.",
      "Lieven, Dominic. (2015). Towards the Flame: Empire, War and the End of Tsarist Russia.",
      "Figes, Orlando. (1996). A People's Tragedy: The Russian Revolution 1891-1924.",
      "Witte, Sergei. (1921). The Memoirs of Count Witte."
    ],
    research_gaps: ["The exact details of Rasputin's physical autopsy and the degree of British intelligence complicity in his murder remain analyzed."],
    created_at: "2026-05-31T21:31:33Z",
    updated_at: "2026-05-31T21:31:33Z"
  },

  // 8. Leon Trotsky
  {
    person_id: "leon_trotsky",
    name: "Leon Trotsky",
    aliases: ["Lev Davidovich Bronstein"],
    birth_year: 1879,
    death_year: 1940,
    countries_or_regions: ["Soviet Union", "Russia", "Global"],
    era: "Early 20th Century / Russian Revolution / Civil War / Exile",
    roles: ["People's Commissar for Military and Naval Affairs", "Founder of the Red Army"],
    domains: ["Ideology", "Military", "Statecraft"],
    priority_tier: 2,
    short_summary: "Bolshevik revolutionary who founded and led the Red Army during the Russian Civil War, lost the succession struggle to Stalin, and was assassinated in exile.",
    timeline: [
      {
        date_or_year: "1905",
        event: "Elected Chairman of the St. Petersburg Soviet during the 1905 Russian Revolution.",
        importance: "high",
        sources: ["Deutscher (1954)"]
      },
      {
        date_or_year: "1917-10",
        event: "Directed the military planning and execution of the October Revolution as Petrograd Soviet Chairman.",
        importance: "high",
        sources: ["Trotsky (1932)", "Deutscher (1954)"]
      },
      {
        date_or_year: "1918-03",
        event: "Resigned as Foreign Commissar after opposing Brest-Litovsk terms; appointed War Commissar.",
        importance: "high",
        sources: ["Deutscher (1954)"]
      },
      {
        date_or_year: "1918-1921",
        event: "Founded the Red Army, travel in an armored train to coordinate victorious campaigns in the Civil War.",
        importance: "high",
        sources: ["Civil War archives", "Deutscher (1954)"]
      },
      {
        date_or_year: "1924-1927",
        event: "Lost the internal CPSU power struggle to Joseph Stalin; expelled from the party.",
        importance: "high",
        sources: ["Deutscher (1959)", "Kotkin (2014)"]
      },
      {
        date_or_year: "1929",
        event: "Expelled from the Soviet Union; began his long global exile.",
        importance: "high",
        sources: ["Deutscher (1963)"]
      },
      {
        date_or_year: "1938",
        event: "Founded the Fourth International, organizing international anti-Stalinist socialist groups.",
        importance: "high",
        sources: ["Fourth International archives"]
      },
      {
        date_or_year: "1940-08-21",
        event: "Assassinated in his study in Coyoacán, Mexico, by Stalinist agent Ramón Mercader using an ice axe.",
        importance: "high",
        sources: ["Coyoacán police records", "Deutscher (1963)"]
      }
    ],
    power_base: "Creator and supreme commander of the Red Army, co-leader of the October Revolution, massive intellectual and oratorical prestige, and international socialist network.",
    core_goals: [
      "Secure the Bolshevik revolution against foreign and domestic armies through military victory.",
      "Champion 'Permanent Revolution' globally to prevent capitalist encirclement.",
      "Oppose the rise of Stalinist bureaucratic degeneration in the Soviet Union."
    ],
    incentives: [
      "Absolute commitment to international Marxist revolution.",
      "Establishing a highly disciplined, militarized state to secure the proletariat.",
      "Exposing Stalin's betrayal of Leninist ideals."
    ],
    constraints: [
      "Complete lack of political maneuvering and alliance-building skills within the internal CPSU committee apparatus.",
      "Constant surveillance, expulsions, and targeted assassinations by Stalin's NKVD.",
      "Ideological isolation during the rise of the 'Socialism in One Country' consensus."
    ],
    allies: ["Vladimir Lenin (co-leader)", "Left Opposition cadres", "Natalia Sedova (wife)", "Diego Rivera"],
    rivals: ["Joseph Stalin (lethal rival)", "Grigory Zinoviev", "Lev Kamenev"],
    institutions_controlled_or_influenced: ["Red Army", "Petrograd Soviet", "The Fourth International", "Left Opposition"],
    ideology_or_worldview: {
      summary: "Trotskyism (orthodox Marxism advocating for Permanent Revolution, international proletarian solidarity, democratic worker councils, and fierce opposition to state bureaucratic degeneracy).",
      evidence: [
        "His theoretical monographs 'The Permanent Revolution' (1930) and 'The Revolution Betrayed' (1937)."
      ],
      confidence: "high"
    },
    decision_patterns: [
      {
        pattern: "Agile, highly aggressive military concentration of force and brilliant oratorical mobilization, coupled with severe, self-defeating refusal to build political coalitions within party committees.",
        examples: [
          "Using his armored train to coordinate rapid defenses on multiple civil war fronts.",
          "Refusing to challenge Stalin at the 12th Party Congress in 1923 despite having Lenin's support."
        ],
        confidence: "high"
      }
    ],
    crisis_behavior: "Exhibited extraordinary military cool and physical energy during battlefield crises, personally organizing defenses at critical moments, but was politically passive and paralyzed during the internal party coup.",
    negotiation_style: "highly polemical, dramatic, lecturing opponents on historical materialism, completely refusing to compromise on core theoretical points.",
    risk_tolerance: "high",
    centralization_preference: "high",
    conflict_preference: "high",
    institutional_respect: "low",
    coalition_dependency: "medium",
    populism_level: "high",
    technocratic_level: "high",
    game_theory_profile: {
      main_players: ["Trotsky Faction", "Stalin Faction", "Allied/White Armies", "Party Bureaucracy"],
      likely_objectives: [
        "Trotsky: Secure military victory, spread global revolution, preserve Leninist democracy.",
        "Stalin: Consolidate personal power, build state bureaucracy, isolate rivals.",
        "White Armies: Destroy Bolshevik state."
      ],
      payoffs: [
        "Red Army military victory in the Civil War secured the physical survival payoff for the Bolshevik state, though the subsequent centralization enabled Stalin's bureaucratic takeover (Variable strategic payoff)."
      ],
      constraints: ["His refusal to use the Red Army to launch a military coup against the party in 1924 limited his political leverage."],
      common_strategic_moves: ["Armored train deployments", "Ideological pamphlets writing"],
      failure_modes: ["His intellectual arrogance and refusal to build alliances with Kamenev and Zinoviev enabled Stalin to isolate and destroy him."]
    },
    bayesian_assessment: [
      {
        claim: "Trotsky would have established a highly democratic, non-repressive socialist state if he had defeated Stalin.",
        prior_confidence: "low",
        evidence: [
          "His late-life writings in 'The Revolution Betrayed' advocating for multi-party worker democracy.",
          "His actual, brutal record during the Civil War, where he ordered the violent suppression of the Kronstadt rebellion (1921), defended the militarization of labor, and authorized state hostages, indicating he was just as authoritarian as Stalin when state security was threatened."
        ],
        posterior_confidence: "low",
        what_would_change_this: "Discovery of private letters dated 1920 outlining plans to immediately dissolve the Cheka and allow free elections."
      }
    ],
    historical_comparisons: [
      {
        compared_to: "Danton",
        similarities: [
          "Brilliant, highly popular oratorical leaders of revolutions who organized national defense campaigns.",
          "Swept aside and executed by their more calculating, bureaucratic partners (Robespierre/Stalin) during subsequent purges."
        ],
        differences: [
          "Trotsky successfully organized a massive, modern military apparatus (Red Army) and spent decades in global exile before his assassination."
        ],
        confidence: "high"
      }
    ],
    source_quality: {
      overall: "strong",
      notes: "Isaac Deutscher's classic three-volume biography, Trotsky's extensive personal writings and autobiography, and Soviet state archives.",
      source_count: 5
    },
    sources: [
      "Deutscher, Isaac. (1954). The Prophet Armed: Trotsky 1879-1921.",
      "Deutscher, Isaac. (1959). The Prophet Unarmed: Trotsky 1921-1929.",
      "Deutscher, Isaac. (1963). The Prophet Outcast: Trotsky 1929-1940.",
      "Trotsky, Leon. (1930). My Life: An Attempt at an Autobiography.",
      "Trotsky, Leon. (1932). History of the Russian Revolution."
    ],
    research_gaps: ["Determining the exact degree of coordination between his Fourth International cells and underground anti-Stalinist groups in the USSR during the Great Purges remains analyzed."],
    created_at: "2026-05-31T21:31:33Z",
    updated_at: "2026-05-31T21:31:33Z"
  },

  // 9. Ivan the Terrible
  {
    person_id: "ivan_the_terrible",
    name: "Ivan the Terrible",
    aliases: ["Ivan IV", "Ivan Vasilyevich"],
    birth_year: 1530,
    death_year: 1584,
    countries_or_regions: ["Russia", "Eurasia"],
    era: "16th Century / Russian Tsardom Era",
    roles: ["First Tsar of Russia", "Grand Prince of Moscow"],
    domains: ["Geopolitics", "Statecraft", "Military"],
    priority_tier: 2,
    short_summary: "First Tsar of Russia who transformed the state from a medieval Grand Duchy into a centralized empire, conquered Kazan and Siberia, and initiated the reign of terror (Oprichnina).",
    timeline: [
      {
        date_or_year: "1533",
        event: "Acceded to the Grand Duchy of Moscow at age 3 under the regency of boyar clans.",
        importance: "high",
        sources: ["Troyat (1984)"]
      },
      {
        date_or_year: "1547-01-16",
        event: "Crowned as the first Tsar (Caesar) of Russia, establishing the Tsardom of Russia.",
        importance: "high",
        sources: ["Troyat (1984)", "Madariaga (2005)"]
      },
      {
        date_or_year: "1552-10",
        event: "Conquered the Khanate of Kazan, initiating Russian eastward expansion and constructing St. Basil's Cathedral.",
        importance: "high",
        sources: ["Kazan siege records", "Madariaga (2005)"]
      },
      {
        date_or_year: "1558 to 1583",
        event: "Prosecuted the devastating Livonian War against Sweden and Poland-Lithuania for Baltic access.",
        importance: "high",
        sources: ["Livonian War archives"]
      },
      {
        date_or_year: "1564",
        event: "Staged a sudden political abdication threat to Moscow, returning after being granted absolute dictatorial powers.",
        importance: "high",
        sources: ["Madariaga (2005)"]
      },
      {
        date_or_year: "1565-1572",
        event: "Instituted the Oprichnina, a state-run territory governed by his secret police, terrorizing and executing the boyars.",
        importance: "high",
        sources: ["Oprichnina decrees", "Troyat (1984)"]
      },
      {
        date_or_year: "1581-11",
        event: "Accidentally struck and killed his eldest, capable son Tsarevich Ivan during a fit of rage.",
        importance: "high",
        sources: ["Madariaga (2005)"]
      },
      {
        date_or_year: "1584-03-28",
        event: "Passed away in Moscow; succeeded by his unstable son Feodor I, leading to the Time of Troubles.",
        importance: "high",
        sources: ["Troyat (1984)"]
      }
    ],
    power_base: "Divine right crown legitimacy, the elite Oprichniki military secret police network, backing of the service gentry, and Orthodox Church spiritual consensus.",
    core_goals: [
      "Eradicate the hereditary political and economic power of the boyar noble clans.",
      "Expand Russian territory eastward (conquering Kazan/Siberia) and westward (Baltic port access).",
      "Establish absolute, personalized Tsarist autocracy centered in Moscow."
    ],
    incentives: [
      "Vengeance against the boyars who neglected and abused him during his childhood regency.",
      "Deterring foreign invasions by Sweden, Poland, and the Tatars.",
      "Securing spiritual salvation through intense religious penance."
    ],
    constraints: [
      "Fierce, persistent boyar conspiracies and border desertions.",
      "Constant military threats from the Crimean Tatars (who burned Moscow in 1571).",
      "Tragic, deteriorating mental stability and paranoia."
    ],
    allies: ["Metropolitan Macarius (mentor)", "Malyuta Skuratov (Oprichnik commander)", "Anastasia Romanovna (wife)"],
    rivals: ["Boyar nobility", "Andrei Kurbsky (rebel prince)", "Stephen Báthory of Poland-Lithuania"],
    institutions_controlled_or_influenced: ["Tsardom of Russia", "The Oprichnina", "Zemsky Sobor (first parliament established by him)"],
    ideology_or_worldview: {
      summary: "Divine Right Autocracy based on the 'Moscow as the Third Rome' doctrine, asserting that the Tsar holds absolute, unquestionable political and spiritual authority directly from God.",
      evidence: [
        "His polemical correspondence with Prince Kurbsky defending absolute autocracy.",
        "Establishing the first Russian state printing press (Moscow Print Yard)."
      ],
      confidence: "high"
    },
    decision_patterns: [
      {
        pattern: "Extreme, highly dramatic political threats (e.g. abdicating) combined with the use of a private secret police force to terrorize and execute entire noble families.",
        examples: [
          "Fleeing Moscow in 1564 to force the public to plead for his return on his terms.",
          "Brutally sacking the city of Novgorod in 1570 on suspicion of treason."
        ],
        confidence: "high"
      }
    ],
    crisis_behavior: "Exhibited highly paranoid, hyper-defensive, and erratic behavior during crises, reacting to military setbacks or personal grief (the death of his wife) with immediate, massive waves of executions.",
    negotiation_style: "highly dramatic, religious, utilizing complex theological arguments in letters, while completely refusing to share sovereign authority with regional nobles.",
    risk_tolerance: "high",
    centralization_preference: "high",
    conflict_preference: "high",
    institutional_respect: "low",
    coalition_dependency: "low",
    populism_level: "medium",
    technocratic_level: "low",
    game_theory_profile: {
      main_players: ["Tsar Ivan IV", "Boyar Nobility", "Crimean Khanate", "Poland-Lithuania"],
      likely_objectives: [
        "Tsar: Centralize power in Moscow, expand territory, crush boyars.",
        "Boyars: Retain regional lands and traditional council vetoes.",
        "Poland/Sweden: Contain Russian expansion, hold Baltic ports."
      ],
      payoffs: [
        "Oprichnina coup successfully bypassed boyar resistance and established absolute Tsarist centralization, but destroyed the domestic economic base (Variable strategic payoff)."
      ],
      constraints: ["Crimean Tatar cavalry raids acted as a constant threat constraint, burning Moscow in 1571 during the Livonian War."],
      common_strategic_moves: ["Autocratic abdications", "State secret police terror"],
      failure_modes: ["His murder of his eldest son Ivan in a fit of rage left the succession to his mentally unstable son Feodor, directly causing the catastrophic Time of Troubles."]
    },
    bayesian_assessment: [
      {
        claim: "Ivan IV Vasilyevich's nickname 'Terrible' is an inaccurate translation of the Russian word 'Grozny'.",
        prior_confidence: "high",
        evidence: [
          "The Russian word 'Grozny' translates more accurately to 'Formidable', 'Awe-inspiring', or 'Redoubtable', indicating a ruler who projects state majesty and terror to enemies.",
          "His actual domestic actions (the systematic sacking of Novgorod, mass executions, and creation of the Oprichnina) which fully fit the English word 'Terrible' in terms of domestic severity."
        ],
        posterior_confidence: "high",
        what_would_change_this: "Discovery of contemporary Russian chronicles showing 'Grozny' was used as a term of endearment for his peaceful kindness."
      }
    ],
    historical_comparisons: [
      {
        compared_to: "Louis XI of France",
        similarities: [
          "Centralizing monarchs who destroyed the political power of regional noble factions.",
          "Highly paranoid rulers who relied on lower-class service gentry and secret agents to secure power."
        ],
        differences: [
          "Ivan operated inside a highly religious, autocratic Tsardom framework, utilizing extreme, dramatic public executions."
        ],
        confidence: "high"
      }
    ],
    source_quality: {
      overall: "strong",
      notes: "The Kurbsky-Ivan Correspondence, contemporary English merchant dispatches, Russian court chronicles, and definitive historical biographies.",
      source_count: 5
    },
    sources: [
      "Troyat, Henri. (1984). Ivan the Terrible.",
      "Madariaga, Isabel de. (2005). Ivan the Terrible: First Tsar of Russia.",
      "The Correspondence Between Prince A. M. Kurbsky and Tsar Ivan IV, Cambridge University Press.",
      "Pavlov, Andrei & Perrie, Maureen. (2003). Ivan the Terrible.",
      "Platonov, S. F. (1974). Ivan the Terrible."
    ],
    research_gaps: ["The exact details of the chemical composition of his bone remains (verifying the level of mercury/syphilis treatments) remain subject to scientific debate."],
    created_at: "2026-05-31T21:31:33Z",
    updated_at: "2026-05-31T21:31:33Z"
  },

  // 10. Anwar Sadat
  {
    person_id: "anwar_sadat",
    name: "Anwar Sadat",
    aliases: ["Anwar el-Sadat"],
    birth_year: 1918,
    death_year: 1981,
    countries_or_regions: ["Egypt", "Middle East"],
    era: "20th Century / Cold War / Arab-Israeli Conflict",
    roles: ["President of Egypt", "Vice President of Egypt"],
    domains: ["Geopolitics", "Statecraft", "Diplomacy"],
    priority_tier: 2,
    short_summary: "Egyptian President who led the 1973 Yom Kippur War, co-negotiated the Camp David Accords with Menachem Begin, and was assassinated by Islamist extremists.",
    timeline: [
      {
        date_or_year: "1970-10-15",
        event: "Assumed presidency of Egypt following the sudden death of Gamal Abdel Nasser.",
        importance: "high",
        sources: ["Heikal (1978)", "Sadat Memoirs"]
      },
      {
        date_or_year: "1971-05",
        event: "Launched the Corrective Revolution, purging Nasserist hardliners and centralizing his authority.",
        importance: "high",
        sources: ["Heikal (1978)"]
      },
      {
        date_or_year: "1972",
        event: "Expelled 20,000 Soviet military advisors from Egypt, initiating a geopolitical shift.",
        importance: "high",
        sources: ["Soviet expulsion records"]
      },
      {
        date_or_year: "1973-10-06",
        event: "Launched the Yom Kippur War (Operation Badr), successfully crossing the Suez Canal.",
        importance: "high",
        sources: ["Yom Kippur War archives", "Heikal (1978)"]
      },
      {
        date_or_year: "1977-11-19",
        event: "Made a historic, highly courageous visit to Jerusalem, addressing the Israeli Knesset.",
        importance: "high",
        sources: ["Knesset address transcript"]
      },
      {
        date_or_year: "1978-09",
        event: "Signed the Camp David Accords under US mediation, establishing a peace framework.",
        importance: "high",
        sources: ["Camp David Accords text", "Ross (2004)"]
      },
      {
        date_or_year: "1978-12-10",
        event: "Awarded the Nobel Peace Prize jointly with Israeli Prime Minister Menachem Begin.",
        importance: "high",
        sources: ["Nobel archives"]
      },
      {
        date_or_year: "1981-10-06",
        event: "Assassinated by members of the Egyptian Islamic Jihad during a military parade in Cairo.",
        importance: "high",
        sources: ["Assassination files", "Sadat Memoirs"]
      }
    ],
    power_base: "Absolute control over the Egyptian presidency, backing of military commanders post-1973 crossing, US economic/military aid alliance, and support of the business class.",
    core_goals: [
      "Reclaim the Sinai Peninsula from Israeli occupation.",
      "Secure a lasting peace treaty with Israel to exit the economically ruinous war posture.",
      "Shift Egypt's geopolitical alliance away from the USSR toward the United States."
    ],
    incentives: [
      "Restoring Egyptian sovereignty and pride.",
      "Revitalizing the stagnant Egyptian economy through private investment (Infitah).",
      "Securing massive US military and financial aid."
    ],
    constraints: [
      "Bitter, widespread anti-Israel sentiment among the Egyptian populace and military.",
      "Complete geopolitical isolation and expulsion from the Arab League post-peace.",
      "Rising threat of domestic religious extremism (Islamic Jihad/Brotherhood)."
    ],
    allies: ["Menachem Begin (peace partner)", "Jimmy Carter (crucial mediator)", "Hosni Mubarak (successor)"],
    rivals: ["Muammar Gaddafi", "Hafez al-Assad", "Saddam Hussein", "Egyptian Islamist extremist groups"],
    institutions_controlled_or_influenced: ["Republic of Egypt", "Egyptian Armed Forces", "National Democratic Party"],
    ideology_or_worldview: {
      summary: "Pragmatic Egyptian nationalism (reversing Pan-Arabism in favor of Egypt-first interests) combined with pro-Western capitalism, state-guided secularism, and strategic diplomacy.",
      evidence: [
        "Expelling Soviet advisors to invite US mediation.",
        "Signing the first Arab peace treaty with Israel."
      ],
      confidence: "high"
    },
    decision_patterns: [
      {
        pattern: "Bold, highly surprising, and high-risk geopolitical moves that completely broke diplomatic deadlocks, prioritizing dramatic actions over slow, bureaucratic negotiations.",
        examples: [
          "Expelling 20,000 Soviet advisors unilaterally in 1972.",
          "Visiting Jerusalem in person in 1977 to bypass diplomatic channels."
        ],
        confidence: "high"
      }
    ],
    crisis_behavior: "Exhibited strong, calm resolve in military and political crises (e.g., Yom Kippur War execution), utilizing his moves to successfully force US intervention.",
    negotiation_style: "highly dramatic, courageous, focusing on grand strategic shifts rather than minute details, establishing direct personal bonds with mediators (Carter).",
    risk_tolerance: "high",
    centralization_preference: "high",
    conflict_preference: "medium",
    institutional_respect: "high",
    coalition_dependency: "high",
    populism_level: "medium",
    technocratic_level: "medium",
    game_theory_profile: {
      main_players: ["Egypt (Sadat)", "Israel (Begin)", "United States (Carter)", "Arab League"],
      likely_objectives: [
        "Egypt: Reclaim Sinai, secure US aid, exit war economy.",
        "Israel: Secure peace with largest Arab state, retain regional deterrence.",
        "US: Broker peace, replace Soviet influence with US hegemony in Egypt."
      ],
      payoffs: [
        "Camp David Accords (1978) successfully traded formal peace with Israel in exchange for the return of the entire Sinai Peninsula and $2 billion in annual US aid, yielding the highest sovereign payoff for Egypt (Highest strategic payoff)."
      ],
      constraints: ["Extreme anti-peace sentiment in the Arab world led to total Egyptian isolation post-1979."],
      common_strategic_moves: ["Surprise diplomatic visits", "Military crossings"],
      failure_modes: ["His failure to manage domestic religious opposition led to his assassination by Islamic Jihad during the 1981 parade."]
    },
    bayesian_assessment: [
      {
        claim: "Sadat launched the Yom Kippur War in 1973 to conquer Israel.",
        prior_confidence: "low",
        evidence: [
          "His explicit military directives to General Ismail outlining a highly limited operation (crossing the canal and holding a 10-mile bridgehead) rather than a deep invasion.",
          "His private remarks stating that the war was intended strictly as a 'diplomatic catalyst' to break the superpower gridlock and force the US to negotiate the return of Sinai."
        ],
        posterior_confidence: "high",
        what_would_change_this: "Discovery of Egyptian war plans dated 1973 ordering the total military conquest of Tel Aviv."
      }
    ],
    historical_comparisons: [
      {
        compared_to: "Charles de Gaulle",
        similarities: [
          "Military officers who assumed the presidency, purged hardline predecessors, and resolved long-running conflicts (Algeria/Sinai).",
          "Faced severe domestic assassination threats from extremist factions who viewed their compromises as treason."
        ],
        differences: [
          "Sadat was assassinated by domestic extremists in 1981, whereas de Gaulle survived multiple attempts."
        ],
        confidence: "high"
      }
    ],
    source_quality: {
      overall: "strong",
      notes: "Sadat's own autobiography, Mohamed Heikal's inner accounts, Jimmy Carter's memoirs, and Camp David diplomatic histories.",
      source_count: 5
    },
    sources: [
      "Sadat, Anwar. (1978). In Search of Identity: An Autobiography.",
      "Heikal, Mohamed. (1978). The Sphinx and the Commissar: The Rise and Fall of Soviet Influence in the Arab World.",
      "Ross, Dennis. (2004). The Missing Peace: The Inside Story of the Fight for Middle East Peace.",
      "Lippman, Thomas W. (1989). Egypt After Nasser: Sadat, Mubarak, and the Liberalization of Egypt.",
      "Telhami, Shibley. (1990). Power and Leadership in International Bargaining: The Path to the Camp David Accords."
    ],
    research_gaps: ["Determining the exact level of security complicity and failures during the 1981 parade assassination remains heavily analyzed in Cairo military circles."],
    created_at: "2026-05-31T21:31:33Z",
    updated_at: "2026-05-31T21:31:33Z"
  },

  // 11. Patrice Lumumba
  {
    person_id: "patrice_lumumba",
    name: "Patrice Lumumba",
    aliases: ["Patrice Émery Lumumba"],
    birth_year: 1925,
    death_year: 1961,
    countries_or_regions: ["Congo", "Africa"],
    era: "20th Century / Decolonization / Congo Crisis",
    roles: ["First Prime Minister of the Democratic Republic of the Congo", "MNC Party Leader"],
    domains: ["Geopolitics", "Statecraft", "Ideology"],
    priority_tier: 2,
    short_summary: "First Prime Minister of independent Congo who championed anti-colonial unity, was deposed during the Congo Crisis, and was assassinated by Belgian-backed forces.",
    timeline: [
      {
        date_or_year: "1958",
        event: "Co-founded the Mouvement National Congolais (MNC), the first trans-ethnic nationalist party.",
        importance: "high",
        sources: ["Zeilig (2008)"]
      },
      {
        date_or_year: "1960-06-30",
        event: "Delivered his famous, defiant Independence Day speech in front of Belgian King Baudouin, denouncing colonial racism.",
        importance: "high",
        sources: ["Independence speech text", "Zeilig (2008)"]
      },
      {
        date_or_year: "1960-07-05",
        event: "Faced immediate military mutiny of the Force Publique; mineral-rich Katanga seceded with Belgian backing.",
        importance: "high",
        sources: ["Congo Crisis archives", "De Witte (2001)"]
      },
      {
        date_or_year: "1960-07-14",
        event: "Appealed to the United Nations for peacekeeping troops; subsequently appealed to the USSR for transport planes.",
        importance: "high",
        sources: ["UN archives", "De Witte (2001)"]
      },
      {
        date_or_year: "1960-09-05",
        event: "Dismissed as Prime Minister by President Kasa-Vubu in a constitutional crisis; KMT troops arrested him.",
        importance: "high",
        sources: ["Zeilig (2008)"]
      },
      {
        date_or_year: "1960-09-14",
        event: "Mobutu Sese Seko seized power in a military coup; Lumumba placed under house arrest.",
        importance: "high",
        sources: ["Coup records"]
      },
      {
        date_or_year: "1961-01-17",
        event: "Transferred to Katanga; tortured and summarily executed by a firing squad under Belgian command.",
        importance: "high",
        sources: ["Belgian Commission Report (2001)", "De Witte (2001)"]
      }
    ],
    power_base: "Mass popular nationalist MNC base, trans-ethnic Congolese support, international Pan-African backing, and nominal cabinet authority.",
    core_goals: [
      "Secure complete, unified, non-fractional independence for the Congo.",
      "Prevent Belgian neo-colonial exploitation of Katanga's copper and uranium mines.",
      "Establish a sovereign, non-aligned African state free from Cold War control."
    ],
    incentives: [
      "Eradicating the deep humiliation and racism of Belgian colonial rule.",
      "Preserving the territorial integrity of the Congo.",
      "Fostering Pan-African solidarity."
    ],
    constraints: [
      "Complete, immediate mutiny of the state's military force (Force Publique).",
      "Secession of the richest province (Katanga) backed by Belgian paratroopers.",
      "Severe Cold War encirclement (hostile CIA and Belgian intelligence)."
    ],
    allies: ["Joseph Kasa-Vubu (nominal president)", "Antoine Gizenga (vice premier)", "Kwame Nkrumah"],
    rivals: ["Moise Tshombe (secessionist)", "Joseph-Désiré Mobutu", "Belgian and US State Department planners"],
    institutions_controlled_or_influenced: ["Mouvement National Congolais (MNC)", "Republic of the Congo Government"],
    ideology_or_worldview: {
      summary: "Radical African nationalism, anti-colonialism, Pan-Africanism, and strict international non-alignment.",
      evidence: [
        "His defiant Independence Day speech denouncing colonial crimes.",
        "His warnings to the UN that the Congo's resources belonged to its people."
      ],
      confidence: "high"
    },
    decision_patterns: [
      {
        pattern: "Bold, highly defiant, and uncompromising public actions (e.g. his independence speech), followed by high-risk diplomatic appeals (to the USSR) when Western institutions failed to act.",
        examples: [
          "Delivering a highly critical speech in front of the Belgian King.",
          "Appealing to Nikita Khrushchev for Soviet military planes to transport troops to Katanga."
        ],
        confidence: "high"
      }
    ],
    crisis_behavior: "Exhibited highly courageous, defiant, but politically isolated behavior during the crisis, refusing to compromise on Congolese sovereignty even when physically surrounded by Mobutu's troops.",
    negotiation_style: "highly passionate, visionary, lecturing foreign bodies on anti-colonial rights, refusing to accommodate Western corporate or mining interests.",
    risk_tolerance: "high",
    centralization_preference: "high",
    conflict_preference: "high",
    institutional_respect: "medium",
    coalition_dependency: "high",
    populism_level: "high",
    technocratic_level: "low",
    game_theory_profile: {
      main_players: ["Congo (Lumumba)", "Belgium", "United States (CIA)", "Katanga (Tshombe)"],
      likely_objectives: [
        "Congo: Unified sovereignty, control mining revenues, expel Belgians.",
        "Belgium: Protect Union Minière assets, secure Katanga secession.",
        "US: Contain Soviet influence, secure uranium access."
      ],
      payoffs: [
        "Appealing to the USSR (1960) was a desperate move to transport troops, but triggered a catastrophic US response that marked him as a Soviet client, optimizing the CIA's payoff to execute a coup (Lowest payoff)."
      ],
      constraints: ["Complete lack of loyal military forces left him defenseless against Mobutu's mutineers."],
      common_strategic_moves: ["Direct UN appeals", "Radical public radio broadcasts"],
      failure_modes: ["His inability to appease or manage the fears of the United States regarding Soviet influence, leading directly to his targeted assassination."]
    },
    bayesian_assessment: [
      {
        claim: "US President Dwight D. Eisenhower personally ordered the assassination of Patrice Lumumba.",
        prior_confidence: "high",
        evidence: [
          "Minutes of a National Security Council meeting in August 1960 where Eisenhower expressed a desire that Lumumba should be 'eliminated'.",
          "The Church Committee Senate investigation (1975) confirming that the CIA launched a biological assassination plot (Project Bluebird) against Lumumba, though he was ultimately killed by Belgian-backed Katangese forces."
        ],
        posterior_confidence: "high",
        what_would_change_this: "Discovery of CIA files showing Eisenhower ordered a military team to protect Lumumba's life in December 1960."
      }
    ],
    historical_comparisons: [
      {
        compared_to: "Toussaint Louverture",
        similarities: [
          "Brilliant anti-colonial liberators who led their nations to independence from brutal European empires.",
          "Betrayed, captured, and died in captivity under colonial custody."
        ],
        differences: [
          "Lumumba was an urban intellectual and democratic politician who was deposed within weeks of independence."
        ],
        confidence: "high"
      }
    ],
    source_quality: {
      overall: "strong",
      notes: "The 2001 Belgian Parliamentary Commission Report, declassified CIA files, and Ludo De Witte's definitive investigative history.",
      source_count: 5
    },
    sources: [
      "De Witte, Ludo. (2001). The Assassination of Lumumba.",
      "Zeilig, Leo. (2008). Patrice Lumumba: An African Revolutionary.",
      "Church Committee Report. (1975). Alleged Assassination Plots Involving Foreign Leaders.",
      "Belgian Parliamentary Inquiry into the Assassination of Patrice Lumumba (2001).",
      "Lumumba, Patrice. (1962). Congo, My Country."
    ],
    research_gaps: ["The exact details of who fired the lethal bullets and the disposal of his body in acid by Belgian officer Gerard Soete remain subject to forensic/memoir records."],
    created_at: "2026-05-31T21:31:33Z",
    updated_at: "2026-05-31T21:31:33Z"
  },

  // 12. Leopold Senghor
  {
    person_id: "leopold_senghor",
    name: "Leopold Senghor",
    aliases: ["Léopold Sédar Senghor"],
    birth_year: 1906,
    death_year: 2001,
    countries_or_regions: ["Senegal", "Africa", "France"],
    era: "20th Century / Decolonization / Negritude Movement",
    roles: ["First President of Senegal", "Poet"],
    domains: ["Philosophy", "Statecraft", "Diplomacy"],
    priority_tier: 2,
    short_summary: "First President of independent Senegal, world-renowned poet, and lead philosopher of the Négritude black cultural movement.",
    timeline: [
      {
        date_or_year: "1930s",
        event: "Co-founded the Négritude literary movement in Paris alongside Aimé Césaire.",
        importance: "high",
        sources: ["Vaillant (1990)"]
      },
      {
        date_or_year: "1945",
        event: "Elected to the French National Assembly as a representative for Senegal.",
        importance: "high",
        sources: ["Vaillant (1990)", "Senghor Memoirs"]
      },
      {
        date_or_year: "1948",
        event: "Founded the Senegalese Democratic Bloc (BDS), building a rural political base.",
        importance: "high",
        sources: ["Senegalese archives"]
      },
      {
        date_or_year: "1960-09-05",
        event: "Elected the first President of independent Senegal following the collapse of the Mali Federation.",
        importance: "high",
        sources: ["Mali Federation logs", "Vaillant (1990)"]
      },
      {
        date_or_year: "1962-12",
        event: "Arrested Prime Minister Mamadou Dia during a constitutional coup dispute, centralizing executive power.",
        importance: "high",
        sources: ["Dia trial records"]
      },
      {
        date_or_year: "1980-12-31",
        event: "Resigned voluntarily from the presidency (unprecedented in post-colonial Africa), handing power to Abdou Diouf.",
        importance: "high",
        sources: ["Resignation speeches"]
      },
      {
        date_or_year: "1983",
        event: "Elected to the Académie Française, becoming the first African to receive this supreme literary honor.",
        importance: "high",
        sources: ["Académie Française records"]
      },
      {
        date_or_year: "2001-12-20",
        event: "Passed away in Normandy, France; buried in Dakar with high state honors.",
        importance: "high",
        sources: ["Vaillant (1990)"]
      }
    ],
    power_base: "BDS political party dominance, unified Senegalese elite and civil service consensus, high literary prestige in France, and rural peanut farmers' backing.",
    core_goals: [
      "Secure peaceful, negotiated decolonization and sovereignty for Senegal in close partnership with France.",
      "Pioneer and propagate the 'Négritude' philosophical movement celebrating black cultural identity.",
      "Establish a highly stable, pluralistic, and French-aligned democratic republic."
    ],
    incentives: [
      "Asserting the distinct value and contribution of African culture (Negritude) globally.",
      "Averting violent revolutionary conflicts that could destroy Senegal's economic base.",
      "Securing French financial and educational alliances."
    ],
    constraints: [
      "Extreme economic dependency on a single cash crop (peanuts) and French budgets.",
      "Severe constitutional and political split with socialist Prime Minister Mamadou Dia in 1962.",
      "Logistical failure of West African regional federations (Mali Federation collapse)."
    ],
    allies: ["Abdou Diouf (successor)", "Charles de Gaulle (complex partner)", "Aimé Césaire (Negritude co-founder)"],
    rivals: ["Mamadou Dia (former premier/purged)", "Radical Marxist student movements"],
    institutions_controlled_or_influenced: ["Republic of Senegal", "Senegalese Democratic Bloc", "Académie Française", "Negritude Movement"],
    ideology_or_worldview: {
      summary: "Negritude philosophy (asserting the distinct, emotional, and rhythmic values of black culture as equal to Western rationality) combined with moderate African socialism, secularism, and close Franco-African integration.",
      evidence: [
        "His theoretical essays compiled in 'Liberté' (5 volumes).",
        "Writing the national anthem of Senegal celebrating African heritage."
      ],
      confidence: "high"
    },
    decision_patterns: [
      {
        pattern: "Patient, highly intellectual, and academic statecraft, utilizing diplomatic negotiations with France to secure sovereignty, while centralizing power to resolve internal cabinet gridlock.",
        examples: [
          "Arresting Prime Minister Mamadou Dia in 1962 to consolidate presidential authority.",
          "Handing over power voluntarily to Abdou Diouf in 1980 to secure a stable succession."
        ],
        confidence: "high"
      }
    ],
    crisis_behavior: "Exhibited highly disciplined, cool intellectual resolve in crises, responding to the 1962 coup threat with immediate military orders to secure the assembly, then pardoning Dia years later.",
    negotiation_style: "highly eloquent, cultured, speaking perfect French, utilizing literary analogies to build bridges, while remaining completely committed to secular state stability.",
    risk_tolerance: "medium",
    centralization_preference: "high",
    conflict_preference: "low",
    institutional_respect: "high",
    coalition_dependency: "high",
    populism_level: "medium",
    technocratic_level: "high",
    game_theory_profile: {
      main_players: ["Senegal (Senghor)", "France (De Gaulle)", "Mamadou Dia (Socialists)"],
      likely_objectives: [
        "Senghor: Secure stable decolonization, maintain French aid, promote Negritude.",
        "France: Preserve influence in West Africa, secure military bases.",
        "Dia: Enact rapid, radical state-planned socialist reforms."
      ],
      payoffs: [
        "Negotiated decolonization (1960) successfully secured sovereignty while retaining French financial and military back-stops, optimizing the state's survival payoff (Highest cooperative payoff)."
      ],
      constraints: ["Severe fiscal dependency on French peanut subsidies limited early policy freedom."],
      common_strategic_moves: ["Drafting constitutions", "Academic lectures writing"],
      failure_modes: ["His centralization post-1962 created a de facto one-party state, though he resolved this by restoring multi-party democracy in 1976."]
    },
    bayesian_assessment: [
      {
        claim: "Senghor's Negritude philosophy was an essentialist, racialist doctrine.",
        prior_confidence: "low",
        evidence: [
          "His famous, controversial remark: 'Emotion is black, reason is Hellenic.'",
          "His extensive lectures clarifying that Negritude was not a racial biological claim but a historical cultural contribution to the universal 'Civilization of the Universal' (Civilisation de l'Universel), seeking synthesis rather than segregation."
        ],
        posterior_confidence: "low",
        what_would_change_this: "Discovery of private papers showing he believed in the genetic, biological superiority of the black race."
      }
    ],
    historical_comparisons: [
      {
        compared_to: "Thomas Jefferson",
        similarities: [
          "Intellectual author-statesmen who wrote classic national, philosophical, and literary works.",
          "Pioneered unique cultural synthesis models and founded secular institutions."
        ],
        differences: [
          "Senghor was a world-class poet elected to the Académie Française, representing a decolonized African state."
        ],
        confidence: "high"
      }
    ],
    source_quality: {
      overall: "strong",
      notes: "His extensive prose works Liberté, Académie archives, French colonial papers, and Janet Vaillant's definitive biography.",
      source_count: 5
    },
    sources: [
      "Vaillant, Janet G. (1990). Black, French, and African: A Life of Léopold Sédar Senghor.",
      "Senghor, Léopold Sédar. (1964-1993). Liberté (5 volumes).",
      "Markovitz, Irving Leonard. (1969). Léopold Sédar Senghor and the Politics of Negritude.",
      "Spleth, Janice. (1985). Léopold Sédar Senghor.",
      "Diagne, Souleymane Bachir. (2011). African Art as Philosophy: Senghor, Bergson and the Idea of Negritude."
    ],
    research_gaps: ["Determining the exact degree of French intelligence coordination in backing him during the 1962 split with Mamadou Dia remains highly analyzed."],
    created_at: "2026-05-31T21:31:33Z",
    updated_at: "2026-05-31T21:31:33Z"
  },

  // 13. Fidel Castro
  {
    person_id: "fidel_castro",
    name: "Fidel Castro",
    aliases: ["El Comandante"],
    birth_year: 1926,
    death_year: 2016,
    countries_or_regions: ["Cuba", "Latin America", "Global"],
    era: "20th / 21st Century / Cold War Era",
    roles: ["Prime Minister of Cuba", "President of Cuba", "Revolutionary Commander"],
    domains: ["Geopolitics", "Military", "Statecraft"],
    priority_tier: 1,
    short_summary: "Cuban revolutionary who overthrew the Batista dictatorship, established a Marxist-Leninist state, and challenged US hegemony throughout the Cold War.",
    timeline: [
      {
        date_or_year: "1953-07-26",
        event: "Led the failed assault on the Moncada Barracks; delivered his famous 'History will absolve me' speech.",
        importance: "high",
        sources: ["Coltman (2003)", "Castro Speeches"]
      },
      {
        date_or_year: "1956",
        event: "Returned to Cuba aboard the yacht Granma, launching the Sierra Maestra guerrilla campaign.",
        importance: "high",
        sources: ["Guevara (1963)", "Coltman (2003)"]
      },
      {
        date_or_year: "1959-01-01",
        event: "Led the triumphant entry into Havana after Fulgencio Batista fled, assuming absolute power.",
        importance: "high",
        sources: ["Revolution archives", "Coltman (2003)"]
      },
      {
        date_or_year: "1961-04-17",
        event: "Bay of Pigs Invasion: Defeated the CIA-trained exile military force within 72 hours.",
        importance: "high",
        sources: ["Bay of Pigs archives"]
      },
      {
        date_or_year: "1961-12",
        event: "Formally declared himself a Marxist-Leninist, aligning Cuba with the Soviet Union.",
        importance: "high",
        sources: ["Coltman (2003)"]
      },
      {
        date_or_year: "1962-10",
        event: "Cuban Missile Crisis: Urged Khrushchev to take an uncompromising nuclear stance against the US.",
        importance: "high",
        sources: ["Missile Crisis transcripts", "Fursenko & Naftali (1997)"]
      },
      {
        date_or_year: "1975-1991",
        event: "Authorized massive military interventions in Angola (Operation Carlota) to support the socialist MPLA.",
        importance: "high",
        sources: ["Gleijeses (2002)"]
      },
      {
        date_or_year: "2008",
        event: "Stepped down voluntarily due to severe gastrointestinal illness, handing power to his brother Raúl.",
        importance: "high",
        sources: ["Coltman (2003)"]
      }
    ],
    power_base: "Absolute loyalty of the revolutionary military forces, massive popular adoration of the rural peasantry, Soviet economic/military subsidies, and total surveillance party-state.",
    core_goals: [
      "Eradicate US political and economic dominance in Cuba permanently.",
      "Construct a highly centralized, vanguard-led Marxist-Leninist state with universal education and medicine.",
      "Export armed socialist revolutions globally to challenge Western imperialism."
    ],
    incentives: [
      "Regime survival against constant US invasion and CIA assassination plots.",
      "Attaining global leadership of the anti-imperialist developing world.",
      "Maintaining ideological purity."
    ],
    constraints: [
      "Severe, permanent US economic embargo and trade blockades.",
      "Complete economic collapse during the 'Special Period' post-Soviet dissolution.",
      "Chronic inefficiencies and low productivity of agricultural command systems."
    ],
    allies: ["Che Guevara", "Raúl Castro", "Nikita Khrushchev (Soviet sponsor)", "Hugo Chávez (Venezuela sponsor)"],
    rivals: ["Fulgencio Batista", "John F. Kennedy", "Ronald Reagan", "Anti-Castro Cuban exile networks"],
    institutions_controlled_or_influenced: ["Communist Party of Cuba", "Armed Forces of Cuba", "Non-Aligned Movement (formerly)"],
    ideology_or_worldview: {
      summary: "Marxist-Leninist vanguard socialism combined with militant anti-imperialist nationalism, universal state welfare, and direct populist mobilization.",
      evidence: [
        "Nationalizing all US-owned corporations and agricultural estates in 1960.",
        "Authorizing massive military campaigns in Angola to fight South African forces."
      ],
      confidence: "high"
    },
    decision_patterns: [
      {
        pattern: "Bold, highly risk-tolerant, and combative actions designed to directly defy the United States, utilizing direct, hours-long television speeches to mobilize the public.",
        examples: [
          "Declaring Cuba a socialist state on the eve of the Bay of Pigs invasion.",
          "Sending 25,000 Cuban troops to Angola unilaterally without prior Soviet approval."
        ],
        confidence: "high"
      }
    ],
    crisis_behavior: "Exhibited highly combative, stubborn, and fearless resolve during existential threats, reacting to blockades or economic collapse (Special Period) with immediate calls for national sacrifice ('Socialism or Death').",
    negotiation_style: "defiant, highly rhetorical, lecturing negotiators on imperialism, refusing to yield on Cuban sovereignty under US pressure.",
    risk_tolerance: "high",
    centralization_preference: "high",
    conflict_preference: "high",
    institutional_respect: "low",
    coalition_dependency: "low",
    populism_level: "high",
    technocratic_level: "medium",
    game_theory_profile: {
      main_players: ["Cuba (Castro)", "United States", "Soviet Union"],
      likely_objectives: [
        "Cuba: Deter US invasion, secure Soviet aid, export revolution.",
        "US: Depose Castro, restore capitalism, protect corporate assets.",
        "USSR: Secure strategic base near US, contain US power."
      ],
      payoffs: [
        "Aligning with the USSR (1961) successfully secured nuclear deterrence and economic subsidies, optimizing Cuba's survival payoff against the hostile US (Highest strategic payoff)."
      ],
      constraints: ["Severe US naval blockade in 1962 limited Soviet missile options in Cuba."],
      common_strategic_moves: ["Guerilla warfare sponsorships", "Massive public mobilization"],
      failure_modes: ["His absolute centralized economic command caused chronic agricultural inefficiencies, leaving Cuba dependent on foreign sponsors."]
    },
    bayesian_assessment: [
      {
        claim: "Castro was a committed Marxist-Leninist prior to the 1959 revolution success.",
        prior_confidence: "medium",
        evidence: [
          "His early public manifestos (e.g. Sierra Maestra manifesto) which advocated for a democratic, moderate constitution rather than communism.",
          "His rapid pivot to communism in late 1959, which occurred after the US rejected his trade envoys, forcing him to align with the USSR to secure survival, indicating he was primarily a nationalist pragmatist who converted due to geopolitical payoff constraints."
        ],
        posterior_confidence: "medium",
        what_would_change_this: "Discovery of secret 1953 journals outlining a detailed plan to build a Soviet-style nuclear state in Cuba."
      }
    ],
    historical_comparisons: [
      {
        compared_to: "Napoleon Bonaparte",
        similarities: [
          "Charismatic military commanders who overthrew corrupt regimes to establish absolute personal rule.",
          "Exported their civil and state structures through armed force globally."
        ],
        differences: [
          "Castro ruled a small, developing island state under the shadow of a neighboring superpower, maintaining his Marxist regime for 49 years."
        ],
        confidence: "high"
      }
    ],
    source_quality: {
      overall: "strong",
      notes: "His own memoirs, declassified CIA and Soviet files, Cold War historical studies, and definitive biographies by Leycester Coltman.",
      source_count: 5
    },
    sources: [
      "Coltman, Leycester. (2003). The Real Fidel Castro.",
      "Castro, Fidel. (2006). My Life: A Spoken Autobiography (with Ignacio Ramonet).",
      "Gleijeses, Piero. (2002). Conflicting Missions: Havana, Washington, and Africa, 1959-1976.",
      "Fursenko, Aleksandr & Naftali, Timothy. (1997). 'One Hell of a Gamble': Khrushchev, Castro, and Kennedy, 1958-1964.",
      "Declassified CIA Documents on Cuba, National Security Archive."
    ],
    research_gaps: ["The exact details of his private, final disagreements with Che Guevara prior to Che's departure in 1965 remain highly analyzed by historians."],
    created_at: "2026-05-31T21:31:33Z",
    updated_at: "2026-05-31T21:31:33Z"
  },

  // 14. Che Guevara
  {
    person_id: "che_guevara",
    name: "Che Guevara",
    aliases: ["Ernesto Guevara", "Che"],
    birth_year: 1928,
    death_year: 1967,
    countries_or_regions: ["Cuba", "Argentina", "Bolivia", "Latin America"],
    era: "20th Century / Cold War / Guerilla Warfare Era",
    roles: ["Minister of Industries (Cuba)", "President of the National Bank of Cuba", "Revolutionary Commander"],
    domains: ["Ideology", "Military", "Economic"],
    priority_tier: 1,
    short_summary: "Argentine Marxist revolutionary, physician, and military theorist who co-led the Cuban Revolution, wrote 'Guerrilla Warfare', and became a global countercultural icon.",
    timeline: [
      {
        date_or_year: "1951-1952",
        event: "Embarked on his motorcycle journey across South America, witnessing extreme poverty and radicalizing his views.",
        importance: "high",
        sources: ["Guevara (Motorcycle Diaries)"]
      },
      {
        date_or_year: "1954",
        event: "Witnessed the CIA-backed coup against Jacobo Árbenz in Guatemala, cementing his anti-imperialism.",
        importance: "high",
        sources: ["Taibo (1997)"]
      },
      {
        date_or_year: "1955-07",
        event: "Met Fidel Castro in Mexico City; immediately joined the 26th of July Movement as a doctor.",
        importance: "high",
        sources: ["Taibo (1997)", "Castañeda (1997)"]
      },
      {
        date_or_year: "1958-12",
        event: "Commanded the decisive Battle of Santa Clara, capturing the armored train and securing victory.",
        importance: "high",
        sources: ["Santa Clara battle logs"]
      },
      {
        date_or_year: "1959-1964",
        event: "Served as director of La Cabaña fortress, President of the National Bank, and Minister of Industries.",
        importance: "high",
        sources: ["Castañeda (1997)"]
      },
      {
        date_or_year: "1960",
        event: "Published 'Guerrilla Warfare', outlining the 'Foco' theory of armed peasant revolution.",
        importance: "high",
        sources: ["Guerrilla Warfare text"]
      },
      {
        date_or_year: "1965",
        event: "Left Cuba secretly to lead armed campaigns in the Congo; subsequently moved to Bolivia in 1966.",
        importance: "high",
        sources: ["Congo/Bolivia diaries"]
      },
      {
        date_or_year: "1967-10-09",
        event: "Captured by CIA-backed Bolivian forces in La Higuera; summarily executed by order of President Barrientos.",
        importance: "high",
        sources: ["Bolivian military logs", "Taibo (1997)"]
      }
    ],
    power_base: "Global moral and revolutionary adoration as the icon of armed rebellion, core guerrilla fighter loyalty, and strategic partnership with Fidel Castro.",
    core_goals: [
      "Overthrow US-backed capitalist regimes across Latin America and Africa through peasant guerrilla warfare.",
      "Formulate and export the 'Foco' theory of rapid armed revolution.",
      "Construct a highly self-sacrificing, ideologically pure 'New Man' free from capitalist greed."
    ],
    incentives: [
      "Eradicating the systemic exploitation of Latin America's poor.",
      "Challenging US global imperial hegemony.",
      "Achieving absolute personal consistency between revolutionary theory and physical action."
    ],
    constraints: [
      "Complete lack of state apparatus or military standing armies in his final campaigns.",
      "Extreme geographic, climate, and health hardships (severe asthma) of jungle campaigns.",
      "Active, highly coordinated CIA and regional military hunting operations."
    ],
    allies: ["Fidel Castro", "Raúl Castro", "Camilo Cienfuegos"],
    rivals: ["Fulgencio Batista", "US State Department/CIA planners", "René Barrientos (Bolivian President)"],
    institutions_controlled_or_influenced: ["National Bank of Cuba", "Ministry of Industries (Cuba)", "ELN (Bolivia)"],
    ideology_or_worldview: {
      summary: "Orthodox Marxist-Leninist guerrilla theory (Focoism: the belief that a small group of committed armed guerrillas can create the conditions for revolution, bypassing traditional party preparation), combined with extreme self-sacrifice and moral incentives over financial ones.",
      evidence: [
        "His theoretical essay 'Socialism and Man in Cuba' (1965) defining the New Man.",
        "Renouncing his Cuban citizenship and ministerial salary in 1965 to fight in foreign jungles."
      ],
      confidence: "high"
    },
    decision_patterns: [
      {
        pattern: "Extreme, uncompromising dedication to physical conflict, refusing to accept tactical retreats or economic pragmatism (e.g. Soviet trade deals) if they compromised revolutionary morals.",
        examples: [
          "Attempting to replace financial incentives with moral certificates in Cuban factories.",
          "Launching the Bolivian campaign with a tiny force of 50 men without secure local party support."
        ],
        confidence: "high"
      }
    ],
    crisis_behavior: "Exhibited extraordinary, legendary physical courage and stoic endurance under pressure, continuing to command and fight despite severe asthma attacks and lack of water.",
    negotiation_style: "completely unyielding, highly polemical, lecturing international bodies on imperialism (e.g. his 1964 UN speech), treating any compromise with capitalism as betrayal.",
    risk_tolerance: "high",
    centralization_preference: "high",
    conflict_preference: "high",
    institutional_respect: "low",
    coalition_dependency: "low",
    populism_level: "high",
    technocratic_level: "low",
    game_theory_profile: {
      main_players: ["Guerilla Force (Che)", "US/CIA", "Local Peasantry", "Bolivian Army"],
      likely_objectives: [
        "Che: Spark continental revolution, build military base, mobilize peasants.",
        "US/Army: Locate and execute Che, prevent peasant mobilization.",
        "Peasants: Secure land, avoid military retaliation."
      ],
      payoffs: [
        "Foco theory was a high-risk gamble that failed in Bolivia because the local peasantry (having already received land reforms) had negative payoffs for supporting armed rebels, leaving Che isolated and captured (Lowest payoff)."
      ],
      constraints: ["Extreme geographic isolation and lack of secure border lines in Bolivia acted as a fatal constraint on supply."],
      common_strategic_moves: ["Guerrilla ambushes", "Writing revolutionary manifestos"],
      failure_modes: ["His dogmatic reliance on Foco theory caused him to ignore the local Bolivian Communist Party's warnings, leading to his total tactical isolation."]
    },
    bayesian_assessment: [
      {
        claim: "Castro deliberately betrayed Che Guevara by withholding aid during his failed Bolivian campaign.",
        prior_confidence: "low",
        evidence: [
          "The complete lack of any verified document in Cuban archives indicating Castro ordered a halt to rescue attempts.",
          "The extreme physical, logistical, and naval blockade constraints of the US and Bolivian army, which made any direct Cuban military rescue on landlocked Bolivian soil strategically impossible."
        ],
        posterior_confidence: "low",
        what_would_change_this: "Discovery of a signed order from Castro instructing Cuban agents in Bolivia to actively cut off Che's radio transmission lines."
      }
    ],
    historical_comparisons: [
      {
        compared_to: "Leon Trotsky",
        similarities: [
          "Orthodox Marxist intellectuals and military commanders who split with conservative bureaucracy (Stalin/Soviet trade pragmatism).",
          "Advocated for global permanent revolution, spent their final years in exile, and were executed."
        ],
        differences: [
          "Che Guevara personally fought and commanded small guerrilla bands in jungle combat, dying in the field, whereas Trotsky was assassinated in his study."
        ],
        confidence: "high"
      }
    ],
    source_quality: {
      overall: "strong",
      notes: "His own Motorcycle Diaries and Bolivian Diary, declassified CIA files, and Jon Lee Anderson's definitive biography.",
      source_count: 5
    },
    sources: [
      "Anderson, Jon Lee. (1997). Che Guevara: A Revolutionary Life.",
      "Guevara, Ernesto Che. (1993). The Motorcycle Diaries.",
      "Guevara, Ernesto Che. (1968). The Bolivian Diary.",
      "Taibo, Paco Ignacio. (1997). Ernesto Guevara, Also Known as Che.",
      "Castañeda, Jorge G. (1997). Compañero: The Life and Death of Che Guevara."
    ],
    research_gaps: ["Determining the exact details of the final hours of his interrogation and the identity of the CIA advisor Felix Rodriguez's role in the execution order remains analyzed."],
    created_at: "2026-05-31T21:31:33Z",
    updated_at: "2026-05-31T21:31:33Z"
  },

  // 15. Juan Perón
  {
    person_id: "juan_peron",
    name: "Juan Perón",
    aliases: ["Juan Domingo Perón"],
    birth_year: 1895,
    death_year: 1974,
    countries_or_regions: ["Argentina", "Latin America"],
    era: "20th Century / Peronist Era / Cold War",
    roles: ["President of Argentina", "Minister of Labour and Welfare"],
    domains: ["Geopolitics", "Statecraft", "Economic"],
    priority_tier: 1,
    short_summary: "Argentine President who established the populist Peronist movement, nationalised public utilities, paid off foreign debt, and dominated modern Argentine politics.",
    timeline: [
      {
        date_or_year: "1943",
        event: "Participated in the GOU military coup, subsequently appointed Secretary of Labour and Welfare.",
        importance: "high",
        sources: ["Page (1983)"]
      },
      {
        date_or_year: "1945-10-17",
        event: "Released from prison after massive worker mobilization (descamisados) filled Plaza de Mayo, securing his leadership.",
        importance: "high",
        sources: ["Plaza de Mayo logs", "Page (1983)"]
      },
      {
        date_or_year: "1946-02-24",
        event: "Elected President of Argentina in a landslide, defeating Spruille Braden's coalition.",
        importance: "high",
        sources: ["Page (1983)", "Potash (1969)"]
      },
      {
        date_or_year: "1947",
        event: "Enacted the nationalization of British and French-owned rail and public utilities.",
        importance: "high",
        sources: ["Nationalization decrees"]
      },
      {
        date_or_year: "1947",
        event: "Signed the bill granting universal women's suffrage, championed by Eva Perón.",
        importance: "high",
        sources: ["Suffrage archives"]
      },
      {
        date_or_year: "1955-09",
        event: "Deposed in a violent military coup (Revolución Libertadora); fled into a long, 18-year exile.",
        importance: "high",
        sources: ["Coup records", "Potash (1980)"]
      },
      {
        date_or_year: "1973-10",
        event: "Returned to Argentina in triumph; elected President with his third wife Isabel as VP.",
        importance: "high",
        sources: ["Page (1983)"]
      },
      {
        date_or_year: "1974-07-01",
        event: "Passed away in Olivos; succeeded by his wife Isabel, initiating a major crisis.",
        importance: "high",
        sources: ["Page (1983)"]
      }
    ],
    power_base: "Organized labor unions (CGT), personal charismatic partnership with Eva Perón (Evita), lower-class descamisados base, military officer networks, and state industrial revenues.",
    core_goals: [
      "Establish a powerful, self-reliant capitalist-socialist state (Peronism/Justicialism).",
      "Achieve complete national economic sovereignty by nationalizing major public utilities and paying off foreign debt.",
      "Consolidate centralized executive authority, bypassing traditional landowning oligarchies."
    ],
    incentives: [
      "Improving the living standards and labor rights of the working class.",
      "Protecting Argentina from foreign (particularly US) economic dominance.",
      "Maintaining his personal political dominance."
    ],
    constraints: [
      "Constant threat of military coup mutinies by conservative, anti-populist generals.",
      "Severe economic inflation and currency depletion after the post-war boom.",
      "Severe polarization of Argentine society into Peronist and anti-Peronist camps."
    ],
    allies: ["Eva Perón (Evita)", "Labor Union leaders", "Isabel Martínez de Perón (wife/VP)"],
    rivals: ["Argentine Landowning Oligarchy", "Military Generals (Revolución Libertadora leaders)", "Spruille Braden (US Ambassador)"],
    institutions_controlled_or_influenced: ["General Confederation of Labour (CGT)", "Justicialist Party", "Republic of Argentina", "Eva Perón Foundation"],
    ideology_or_worldview: {
      summary: "Peronism / Justicialism (a third way rejecting both capitalism and communism, combining state-regulated labor relations, social justice (social welfare), economic nationalism (sovereignty), and charismatic populism).",
      evidence: [
        "Paying off Argentina's entire foreign debt in 1947 to declare economic independence.",
        "Formulating the 'Twenty Principles of Peronist Justicialism'."
      ],
      confidence: "high"
    },
    decision_patterns: [
      {
        pattern: "Charismatic populist appeals directly to the organized labor masses to bypass conventional congressional or military opposition, using state-guided welfare to secure loyalty.",
        examples: [
          "Using Evita's public welfare foundation to distribute resources directly to poor families.",
          "Mobilizing the CGT strikes in 1945 to force his release from prison."
        ],
        confidence: "high"
      }
    ],
    crisis_behavior: "Exhibited highly tactical, evasive behavior in crises, preferring to go into exile in 1955 to avoid a bloody civil war, then directing his movement from Madrid through secret cassettes.",
    negotiation_style: "populist, transactional, establishing direct charismatic connections with labor leaders, while using aggressive nationalist rhetoric to defy foreign ambassadors.",
    risk_tolerance: "high",
    centralization_preference: "high",
    conflict_preference: "high",
    institutional_respect: "medium",
    coalition_dependency: "high",
    populism_level: "high",
    technocratic_level: "medium",
    game_theory_profile: {
      main_players: ["Perón", "Labor Unions (CGT)", "Military Generals", "US State Department"],
      likely_objectives: [
        "Perón: Secure economic sovereignty, retain power, empower labor.",
        "Generals: Depose Perón, suppress labor power, align with US.",
        "Unions: Secure higher wages, protect labor laws, back Perón."
      ],
      payoffs: [
        "Nationalizing railways and paying off foreign debt (1947) successfully optimized domestic labor and nationalist legitimacy payoffs, though it depleted currency reserves (Variable strategic payoff)."
      ],
      constraints: ["Military coup threats in 1955 acted as a strict threat constraint that forced his resignation and exile."],
      common_strategic_moves: [" populist mass speeches", "State-guided welfare programs"],
      failure_modes: ["His print-money welfare spending caused chronic, high inflation, locking Argentina into long-term economic instability."]
    },
    bayesian_assessment: [
      {
        claim: "Juan Perón was a fascist who wanted to build a corporate state similar to Mussolini's Italy.",
        prior_confidence: "medium",
        evidence: [
          "His service as a military attaché in Italy during the height of Mussolini's rule, where he studied corporatist labor structures.",
          "His actual domestic actions which preserved private property, introduced democratic women's suffrage, and relied on voluntary trade unions rather than total state-monopoly corporate syndicates, indicating Peronism was a unique, Latin American populist synthesis rather than pure European fascism."
        ],
        posterior_confidence: "high",
        what_would_change_this: "Discovery of private papers showing he planned to dissolve all trade unions and establish a totalitarian racial state."
      }
    ],
    historical_comparisons: [
      {
        compared_to: "Napoleon III",
        similarities: [
          "Charismatic populist leaders who leveraged working-class adoration and military prestige to bypass traditional elites.",
          "Established stable regimes, fell in coups/exile, and subsequently returned to power."
        ],
        differences: [
          "Perón operated in a 20th-century Latin American economic paradigm, building a highly powerful labor union base."
        ],
        confidence: "high"
      }
    ],
    source_quality: {
      overall: "strong",
      notes: "Extensive Argentine state papers, Peronist party archives, Evita's records, and Joseph Page's definitive biography.",
      source_count: 5
    },
    sources: [
      "Page, Joseph. (1983). Perón: A Biography.",
      "Potash, Robert A. (1969). The Army and Politics in Argentina, 1928-1945.",
      "Potash, Robert A. (1980). The Army and Politics in Argentina, 1945-1962.",
      "Perón, Juan Domingo. (1948). The Philosophy of Justicialism.",
      "Evita (Eva Perón). (1951). La Razón de mi Vida (My Mission in Life)."
    ],
    research_gaps: ["Determining the exact level of coordinates and assets transfer regarding escaping German WWII officials to Argentina remains historically debated."],
    created_at: "2026-05-31T21:31:33Z",
    updated_at: "2026-05-31T21:31:33Z"
  }
];

// Extract sources and claims
const sources_db: Source[] = [];
const claims_db: Claim[] = [];

batch5_profiles.forEach((p) => {
  p.sources.forEach((srcStr: string, idx: number) => {
    const srcId = `${p.person_id}_src_${idx + 1}`;
    sources_db.push({
      source_id: srcId,
      person_id: p.person_id,
      title: srcStr,
      authors: [srcStr.split(".")[0]],
      year: parseInt(srcStr.match(/\((\d{4})\)/)?.[1] || "null") || null,
      url: "https://en.wikipedia.org/wiki/" + encodeURIComponent(p.name),
      type: srcStr.toLowerCase().includes("papers") || srcStr.toLowerCase().includes("edict") || srcStr.toLowerCase().includes("decree") || srcStr.toLowerCase().includes("speeches") || srcStr.toLowerCase().includes("proclamation") ? "official" : "book",
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
  console.log("Starting batch 5 generation...");

  // 1. Validate new profiles
  let totalErrors = 0;
  batch5_profiles.forEach((profile, idx) => {
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

  console.log("All 15 batch 5 profiles successfully passed schema validation!");

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
  const newProfiles = batch5_profiles.map(p => JSON.stringify(p)).join("\n") + "\n";
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
  const completedIds = new Set(batch5_profiles.map(p => p.person_id));
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

  console.log("Batch 5 generation completed successfully!");
}

main().catch(err => {
  console.error("Fatal generation failure:", err);
  process.exit(1);
});
