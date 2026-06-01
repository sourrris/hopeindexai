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

const batch6_profiles: any[] = [
  // 1. Adolf Hitler
  {
    person_id: "adolf_hitler",
    name: "Adolf Hitler",
    aliases: ["Der Führer"],
    birth_year: 1889,
    death_year: 1945,
    countries_or_regions: ["Germany", "Europe", "Austria"],
    era: "20th Century / Interwar Era / World War II",
    roles: ["Führer and Chancellor of Germany", "Supreme Commander of the Wehrmacht"],
    domains: ["Geopolitics", "Statecraft", "Military"],
    priority_tier: 1,
    short_summary: "Totalitarian dictator of Nazi Germany who initiated World War II in Europe and orchestrated the state-sponsored genocide of six million Jews and millions of others in the Holocaust.",
    timeline: [
      {
        date_or_year: "1923-11-09",
        event: "Attempted to seize power in the failed Munich Beer Hall Putsch; imprisoned, where he wrote 'Mein Kampf'.",
        importance: "high",
        sources: ["Kershaw (2000)", "Evans (2003)"]
      },
      {
        date_or_year: "1933-01-30",
        event: "Appointed Chancellor of Germany by President Paul von Hindenburg.",
        importance: "high",
        sources: ["Kershaw (2000)", "Evans (2003)"]
      },
      {
        date_or_year: "1933-03-23",
        event: "Passed the Enabling Act, granting himself dictatorial legislative powers and suspending civil liberties.",
        importance: "high",
        sources: ["Evans (2003)"]
      },
      {
        date_or_year: "1938-09-30",
        event: "Signed the Munich Agreement, annexing the Sudetenland in a high-stakes geopolitical blackmail.",
        importance: "high",
        sources: ["Kershaw (2000)", "Overy (1998)"]
      },
      {
        date_or_year: "1939-09-01",
        event: "Ordered the invasion of Poland, triggering the outbreak of World War II in Europe.",
        importance: "high",
        sources: ["Kershaw (2000)", "Evans (2005)"]
      },
      {
        date_or_year: "1941-06-22",
        event: "Launched Operation Barbarossa, a massive, unprovoked invasion of the Soviet Union.",
        importance: "high",
        sources: ["Evans (2005)", "Overy (1998)"]
      },
      {
        date_or_year: "1941-12",
        event: "Formally initiated the 'Final Solution' at the Wannsee Conference, launching the systematic extermination of European Jewry.",
        importance: "high",
        sources: ["Evans (2005)", "Browning (2004)"]
      },
      {
        date_or_year: "1945-04-30",
        event: "Committed suicide in his underground Führerbunker in Berlin as Soviet troops surrounded the city.",
        importance: "high",
        sources: ["Kershaw (2000)", "Beevor (2002)"]
      }
    ],
    power_base: "Absolute totalitarian control over the Nazi Party (NSDAP), total subjugation of the German state apparatus, backing of corporate industrial cartels, fanatical loyalty of the SS elite paramilitary force, and extensive charismatic propaganda control over the masses.",
    core_goals: [
      "Establish a racially pure, pan-Germanic empire ('Greater Germanic Reich') dominant over continental Europe.",
      "Conquer vast territorial 'Lebensraum' (living space) in Eastern Europe by colonizing or exterminating Slavic populations.",
      "Annihilate European Jewry and eradicate all other racial, political, and ideological threats to the state."
    ],
    incentives: [
      "Overcoming the humiliation of the Treaty of Versailles and the defeat of WWI.",
      "Executing racial-biological theories of social Darwinist struggle.",
      "Securing permanent global hegemony for the Germanic race."
    ],
    constraints: [
      "Severe resource deficits, particularly in oil, steel, and synthetic rubber.",
      "The massive war-fighting industrial and demographic scale of the United States and Soviet Union.",
      "Internal administrative inefficiencies caused by overlapping, competing Nazi party fiefdoms."
    ],
    allies: ["Benito Mussolini", "Hideki Tojo", "Heinrich Himmler", "Joseph Goebbels"],
    rivals: ["Winston Churchill", "Joseph Stalin", "Franklin D. Roosevelt", "Internal military conspirators (Stauffenberg)"],
    institutions_controlled_or_influenced: ["Nazi Party (NSDAP)", "German Wehrmacht", "Schutzstaffel (SS)", "Geheime Staatspolizei (Gestapo)"],
    ideology_or_worldview: {
      summary: "Violent, radical social Darwinist fascism combining extreme racial anti-Semitism, pan-Germanic imperialism (Lebensraum), absolute anti-communism, and the leadership principle (Führerprinzip).",
      evidence: [
        "His detailed political manifesto 'Mein Kampf' outlining expansionist and racial plans.",
        "The systematic, state-executed mass murder of millions in specialized death camps."
      ],
      confidence: "high"
    },
    decision_patterns: [
      {
        pattern: "Highly aggressive, high-risk geopolitical and military gambles based on ideological fanaticism and contempt for Western liberal democratic resolve, coupled with a total refusal to compromise or execute tactical retreats.",
        examples: [
          "Remilitarizing the Rhineland in 1936 in defiance of the Versailles Treaty.",
          "Refusing to allow Field Marshal Paulus to retreat during the Battle of Stalingrad."
        ],
        confidence: "high"
      }
    ],
    crisis_behavior: "Exhibited hyper-paranoid, absolute denial of structural realities in crises, blaming military generals and the civilian public for strategic failures while ordering suicidal scorched-earth defenses (Nero Decree).",
    negotiation_style: "highly coercive, relying on deceptive promises, sudden rages, and extreme geopolitical blackmail designed to intimidate foreign powers into immediate concessions rather than reaching peer compromises.",
    risk_tolerance: "high",
    centralization_preference: "high",
    conflict_preference: "high",
    institutional_respect: "low",
    coalition_dependency: "low",
    populism_level: "high",
    technocratic_level: "low",
    game_theory_profile: {
      main_players: ["Nazi Germany (Hitler)", "Soviet Union (Stalin)", "Great Britain (Churchill)", "United States (FDR)"],
      likely_objectives: [
        "Hitler: Conquer Eastern Europe, avoid two-front war (failed), eliminate rivals.",
        "Stalin: Survive German onslaught, expand Soviet security zone.",
        "Churchill: Maintain resistance, secure US entry, crush Nazism."
      ],
      payoffs: [
        "Signing the Molotov-Ribbentrop Pact (1939) was a high-stakes tactical move designed to isolate Poland and secure a one-front war, but his ideological commitment to invade the East eventually created a fatal two-front war (Negative payoff)."
      ],
      constraints: ["German industrial capacity and raw oil supplies acted as an absolute physical limit on wartime duration."],
      common_strategic_moves: ["Blitzkrieg military offensives", "Surprise treaty betrayals"],
      failure_modes: ["His absolute ideological refusal to negotiate or allow strategic retreats locked Germany into a war of attrition it was structurally guaranteed to lose."]
    },
    bayesian_assessment: [
      {
        claim: "Hitler's aggressive war plans were primarily defensive moves to counter potential Soviet expansion.",
        prior_confidence: "low",
        evidence: [
          "The extensive pre-war documentation in 'Mein Kampf' and the Hossbach Memorandum outlining explicit expansionist goals in Eastern Europe.",
          "The complete lack of any verified Soviet mobilization plans showing a preemptive invasion of Germany was imminent in June 1941."
        ],
        posterior_confidence: "low",
        what_would_change_this: "Discovery of declassified contemporary Soviet logs proving Stalin had ordered a full-scale invasion of Germany to commence in July 1941."
      }
    ],
    historical_comparisons: [
      {
        compared_to: "Napoleon Bonaparte",
        similarities: [
          "Charismatic, authoritarian conquerors of continental Europe.",
          "Both launched catastrophic, high-risk invasions of Russia that led to their total strategic collapse."
        ],
        differences: [
          "Napoleon sought to spread the administrative, legal ideals of the Enlightenment and French Revolution, whereas Hitler sought the total racial-biological destruction of subject populations."
        ],
        confidence: "high"
      }
    ],
    source_quality: {
      overall: "strong",
      notes: "Extensive, exhaustively researched primary Nazi documents, war logs, Nuremberg trials testimony, and definitive biographies by Ian Kershaw and Richard Evans.",
      source_count: 5
    },
    sources: [
      "Kershaw, Ian. (2000). Hitler: 1889-1936 Hubris & 1936-1945 Nemesis.",
      "Evans, Richard J. (2003-2008). The Third Reich Trilogy (3 volumes).",
      "Overy, Richard. (1998). Russia's War: A History of the Soviet Effort.",
      "Browning, Christopher R. (2004). The Origins of the Final Solution.",
      "Beevor, Antony. (2002). Berlin: The Downfall 1945."
    ],
    research_gaps: ["Debates persist regarding the exact timing and mechanisms of the psychological transformation that drove his radicalization in post-WWI Munich."],
    created_at: "2026-05-31T21:31:33Z",
    updated_at: "2026-05-31T21:31:33Z"
  },

  // 2. Charlemagne
  {
    person_id: "charlemagne",
    name: "Charlemagne",
    aliases: ["Charles the Great", "Father of Europe", "Karolus Magnus"],
    birth_year: 742,
    death_year: 814,
    countries_or_regions: ["France", "Germany", "Italy", "Western Europe"],
    era: "Early Middle Ages / Carolingian Era",
    roles: ["King of the Franks", "King of the Lombards", "Emperor of the Romans"],
    domains: ["Geopolitics", "Statecraft", "Religion"],
    priority_tier: 1,
    short_summary: "King of the Franks who united much of Western and Central Europe, founded the Carolingian Empire, co-initiated the Carolingian Renaissance, and was crowned Emperor of the Romans in 800.",
    timeline: [
      {
        date_or_year: "768",
        event: "Ascended the Frankish throne jointly with his brother Carloman I.",
        importance: "high",
        sources: ["Einhard (c. 830)", "McKitterick (2008)"]
      },
      {
        date_or_year: "772-804",
        event: "Prosecuted the highly brutal, thirty-year Saxon Wars to conquer and forcibly convert Saxony to Christianity.",
        importance: "high",
        sources: ["Einhard (c. 830)", "Royal Frankish Annals"]
      },
      {
        date_or_year: "774",
        event: "Conquered the Kingdom of the Lombards in northern Italy; declared himself King of the Lombards.",
        importance: "high",
        sources: ["Einhard (c. 830)"]
      },
      {
        date_or_year: "782",
        event: "Ordered the Massacre of Verden, executing 4,500 rebellious Saxon captives.",
        importance: "high",
        sources: ["Royal Frankish Annals", "McKitterick (2008)"]
      },
      {
        date_or_year: "800-12-25",
        event: "Crowned Emperor of the Romans by Pope Leo III at St. Peter's Basilica in Rome, reviving the Western Roman Empire.",
        importance: "high",
        sources: ["Einhard (c. 830)", "Collins (1998)"]
      },
      {
        date_or_year: "814-01-28",
        event: "Passed away in Aachen, his imperial capital; succeeded smoothly by his son Louis the Pious.",
        importance: "high",
        sources: ["Einhard (c. 830)"]
      }
    ],
    power_base: "Unrivaled personal military prestige, a highly mobile, loyal Frankish aristocratic cavalry elite, vast landholdings and imperial estates, and close administrative alliance with the Catholic Church.",
    core_goals: [
      "Unify and politically consolidate all Germanic and Western European territories under Frankish hegemony.",
      "Establish a Christian empire, enforcing conversion of pagan populations through severe legal codes.",
      "Revive Roman administrative, literacy, educational, and cultural standards (Carolingian Renaissance)."
    ],
    incentives: [
      "Fulfilling the religious obligation of a Christian king to defend and expand the Church.",
      "Consolidating royal wealth through plunder and land redistribution.",
      "Attaining imperial prestige comparable to the Byzantine and ancient Roman emperors."
    ],
    constraints: [
      "Complete lack of modern transport infrastructure, making communication across a vast empire extremely slow.",
      "Constant threat of localized rebellions from newly conquered Saxons and Lombards.",
      "Absence of a permanent, professional standing army, relying on seasonal noble levies."
    ],
    allies: ["Pope Leo III", "Alcuin of York (scholar)", "Einhard (biographer)"],
    rivals: ["Widukind (Saxon rebel leader)", "Byzantine Empire (imperial legitimacy rival)", "Tassilo III of Bavaria"],
    institutions_controlled_or_influenced: ["Carolingian Empire", "Roman Catholic Church", "Aachen Palace School", "Missi Dominici (royal envoys)"],
    ideology_or_worldview: {
      summary: "Christian imperial theology (Augustinian theory of the City of God on Earth) combining absolute monarchical rule, royal duty to defend the Church, and the preservation of classical Latin culture.",
      evidence: [
        "The Capitulatio de partibus Saxoniae (782) prescribing the death penalty for refusing baptism.",
        "His Admonitio Generalis (789) mandating schools in every bishopric to teach reading and arithmetic."
      ],
      confidence: "high"
    },
    decision_patterns: [
      {
        pattern: "Relentless, seasonal military campaigns designed to force territorial submission and religious conversion, followed by highly structured administrative codification through royal capitularies.",
        examples: [
          "Launching annual summer military expeditions into Saxony, Spain, or Bavaria.",
          "Sending pairs of 'missi dominici' (one noble, one cleric) to systematically inspect provincial governors (Counts)."
        ],
        confidence: "high"
      }
    ],
    crisis_behavior: "Exhibited absolute strategic resilience in military crises (e.g. after the massacre of Frankish forces at Süntel in 782), immediately raising fresh armies and executing ruthless reprisal campaigns.",
    negotiation_style: "highly dominant, paternalistic, demanding absolute conversion and political submission under threat of military eradication, while treating the Pope as a spiritual subordinate to be protected.",
    risk_tolerance: "high",
    centralization_preference: "high",
    conflict_preference: "high",
    institutional_respect: "medium",
    coalition_dependency: "high",
    populism_level: "low",
    technocratic_level: "medium",
    game_theory_profile: {
      main_players: ["Frankish Crown (Charlemagne)", "Papacy (Leo III)", "Saxon Tribes (Widukind)", "Byzantine Empire"],
      likely_objectives: [
        "Charlemagne: Secure imperial crown, unify Europe under Christian law, defeat Saxony.",
        "Papacy: Secure military protection from Lombard/Roman rivals, assert papal supremacy.",
        "Saxons: Retain pagan religion, maintain tribal independence."
      ],
      payoffs: [
        "The Christmas Coronation in 800 successfully traded military protection of the Pope in exchange for absolute imperial legitimacy, yielding the highest long-term payoff for European political unification (Highest cooperative payoff)."
      ],
      constraints: ["Seasonal nature of feudal warfare limited the duration of remote campaigns (e.g., in Spain)."],
      common_strategic_moves: ["Annual military campaigns", "Forced religious conversions", "Educational reforms"],
      failure_modes: ["His partition plan (Divisio Regnorum) of dividing the empire among his sons, though averted by the deaths of his elder sons, eventually caused total empire fracture under his grandsons in the Treaty of Verdun (843)."]
    },
    bayesian_assessment: [
      {
        claim: "Charlemagne was completely taken by surprise and displeased by Pope Leo III's sudden decision to crown him Emperor on Christmas Day in 800.",
        prior_confidence: "low",
        evidence: [
          "Einhard's claim that Charlemagne declared he would not have entered the church had he known the Pope's intention.",
          "The extensive pre-coronation diplomatic negotiations, the strategic trial of Pope Leo III presided over by Charlemagne in Rome just weeks prior, and his clear need to claim imperial equality with the Byzantine Empress Irene."
        ],
        posterior_confidence: "low",
        what_would_change_this: "Discovery of contemporary, private Vatican letters between the Pope and Carolingian advisors showing the coronation was completely unplanned and protested by Charlemagne."
      }
    ],
    historical_comparisons: [
      {
        compared_to: "Augustus",
        similarities: [
          "Founders of vast, enduring western empires after periods of major structural conflict.",
          "Patronized massive cultural, literary, and architectural revivals (Augustan Age/Carolingian Renaissance)."
        ],
        differences: [
          "Charlemagne was a highly active battlefield commander who personally led dozens of brutal, low-tech cavalry campaigns, whereas Augustus relied on military generals like Agrippa."
        ],
        confidence: "high"
      }
    ],
    source_quality: {
      overall: "strong",
      notes: "The contemporary biography Vita Karoli Magni by Einhard, the Royal Frankish Annals, numerous surviving capitularies, and exhaustive modern historical studies by Rosamond McKitterick.",
      source_count: 5
    },
    sources: [
      "Einhard. (c. 830). Vita Karoli Magni (Life of Charlemagne).",
      "McKitterick, Rosamond. (2008). Charlemagne: The Formation of a European Identity.",
      "Collins, Roger. (1998). Charlemagne.",
      "Royal Frankish Annals (Annales Regni Francorum).",
      "Dutton, Paul Edward. (1998). Charlemagne's Courtier: The Einhard Anthology."
    ],
    research_gaps: ["The exact birth year of Charlemagne (742 vs 747/748) and the precise location of his birth remain subject to debate due to conflicting early annals."],
    created_at: "2026-05-31T21:31:33Z",
    updated_at: "2026-05-31T21:31:33Z"
  },

  // 3. Narendra Modi
  {
    person_id: "narendra_modi",
    name: "Narendra Modi",
    aliases: ["Modi"],
    birth_year: 1950,
    death_year: null,
    countries_or_regions: ["India", "South Asia", "Global"],
    era: "21st Century / Modern India / BJP Era",
    roles: ["Prime Minister of India", "Chief Minister of Gujarat"],
    domains: ["Geopolitics", "Statecraft", "Economy"],
    priority_tier: 1,
    short_summary: "Prime Minister of India who has presided over a major shift toward Hindu nationalist modernization, massive infrastructure expansion, and a highly centralized executive statecraft.",
    timeline: [
      {
        date_or_year: "1971",
        event: "Joined the Rashtriya Swayamsevak Sangh (RSS) as a full-time campaigner (pracharak).",
        importance: "high",
        sources: ["Jaffrelot (2021)", "Marino (2014)"]
      },
      {
        date_or_year: "2001-10-07",
        event: "Appointed Chief Minister of Gujarat by the BJP leadership.",
        importance: "high",
        sources: ["Jaffrelot (2021)"]
      },
      {
        date_or_year: "2002-02",
        event: "Presided over the highly controversial Gujarat communal riots; faced intense domestic and international criticism.",
        importance: "high",
        sources: ["Official SIT reports", "Jaffrelot (2021)"]
      },
      {
        date_or_year: "2014-05-26",
        event: "Led the BJP to a historic landslide majority, ending 30 years of coalition governments; sworn in as Prime Minister.",
        importance: "high",
        sources: ["Election Commission of India", "Guha (2018)"]
      },
      {
        date_or_year: "2016-11-08",
        event: "Announced the sudden demonetization of 86% of India's circulating currency in a high-risk economic gamble.",
        importance: "high",
        sources: ["Reserve Bank of India reports", "Jaffrelot (2021)"]
      },
      {
        date_or_year: "2019-05",
        event: "Won a second, larger parliamentary majority in national elections.",
        importance: "high",
        sources: ["Election Commission of India"]
      },
      {
        date_or_year: "2019-08-05",
        event: "Abrogated Article 370 of the Constitution, revoking the special autonomous status of Jammu and Kashmir.",
        importance: "high",
        sources: ["Gazette of India", "Jaffrelot (2021)"]
      },
      {
        date_or_year: "2024-01-22",
        event: "Consecrated the grand Ram Mandir in Ayodhya, cementing a core Hindu nationalist socio-cultural goal.",
        importance: "high",
        sources: ["State telecast logs", "Press Trust of India"]
      }
    ],
    power_base: "Extraordinary personal charismatic popularity among the Hindu majority, complete command over the BJP party organization and RSS volunteer networks, massive backing from Indian corporate elites, and highly centralized executive control over the civil services and media landscape.",
    core_goals: [
      "Transform India into a proud, sovereign, and explicitly Hindu-centric cultural and political power (Hindu Rashtra).",
      "Execute rapid, massive infrastructure modernization (highways, digital identity, renewable energy, manufacturing).",
      "Assert Indian geopolitical dominance in South Asia and establish it as a leading global pole."
    ],
    incentives: [
      "Eradicating the post-colonial hegemony of the secular Congress party elite.",
      "Achieving complete national security integration and defense self-reliance.",
      "Solidifying his legacy as the chief architect of India's civilizational resurrection."
    ],
    constraints: [
      "Severe domestic social, regional, and religious diversities that trigger intense localized protests (e.g. farmers' protests).",
      "Geopolitical and military challenges along the disputed borders with China and Pakistan.",
      "The massive structural challenge of creating high-quality employment for a population of 1.4 billion."
    ],
    allies: ["Amit Shah (Home Minister)", "S. Jaishankar (Foreign Minister)", "RSS Leadership Networks"],
    rivals: ["Rahul Gandhi (Congress leader)", "Regional Opposition Leaders", "Sectarian Activists"],
    institutions_controlled_or_influenced: ["Prime Minister's Office (PMO)", "Bharatiya Janata Party (BJP)", "Cabinet Committee on Security", "NITI Aayog"],
    ideology_or_worldview: {
      summary: "Hindutva (Hindu cultural nationalism) combined with highly centralized, technocratic governance, massive welfare delivery (welfare-populism), digital state consolidation, and assertive realist foreign policy.",
      evidence: [
        "Abrogating Article 370 and building the Ram Mandir in Ayodhya.",
        "Implementing the Aadhaar-linked Direct Benefit Transfer (DBT) welfare system on an unprecedented scale."
      ],
      confidence: "high"
    },
    decision_patterns: [
      {
        pattern: "Extremely bold, centralized, and disruptive top-down executive actions, executed with high secrecy and minimal legislative debate, designed to fundamentally shock existing systems and project iron resolve.",
        examples: [
          "Announcing the 2016 currency demonetization on live television with zero advance warning.",
          "Launching a sudden, nationwide lockdown in March 2020 to counter COVID-19."
        ],
        confidence: "high"
      }
    ],
    crisis_behavior: "Exhibits highly controlled, media-insulated, and assertive crisis statecraft, framing systemic challenges as opportunities for national self-reliance (Atmanirbhar Bharat) and rallying public support through direct national broadcasts (Mann Ki Baat).",
    negotiation_style: "highly transactional, personalist, leveraging personal chemistry with foreign leaders, while remaining domestic-audience focused and unyielding on core nationalist security issues.",
    risk_tolerance: "high",
    centralization_preference: "high",
    conflict_preference: "medium",
    institutional_respect: "medium",
    coalition_dependency: "low",
    populism_level: "high",
    technocratic_level: "high",
    game_theory_profile: {
      main_players: ["BJP Administration (Modi)", "Opposition Parties", "Neighboring States (China/Pakistan)", "Global Corporations"],
      likely_objectives: [
        "Modi: Maintain absolute political hegemony, industrialize economy, assert border security.",
        "Opposition: Build regional coalitions, exploit economic/unemployment issues.",
        "China: Contain Indian growth, maintain border pressure."
      ],
      payoffs: [
        "Welfare-Populism Nash Equilibrium: Providing direct cash transfers, gas cylinders, and grain to millions successfully bypassed traditional intermediate caste brokers, securing a highly stable electoral payoff (Highest domestic payoff)."
      ],
      constraints: ["Lack of a comfortable majority in the 2024 general election forced a return to tactical negotiation with regional coalition partners."],
      common_strategic_moves: ["Assertive border operations (surgical strikes)", "Massive digital welfare rolls"],
      failure_modes: ["His highly centralized decision-making occasionally leads to major implementation blockages, as seen in the forced repeal of the Farm Laws in 2021."]
    },
    bayesian_assessment: [
      {
        claim: "Modi was directly involved in ordering and orchestrating the communal violence during the 2002 Gujarat riots.",
        prior_confidence: "medium",
        evidence: [
          "The extensive judicial investigations conducted by the Supreme Court-appointed Special Investigation Team (SIT) which found no actionable evidence of Modi's complicity, resulting in his complete legal exoneration in 2012.",
          "The ongoing political debate and criticisms from international human rights bodies arguing that the state police apparatus under his control failed to act with sufficient speed to stop the initial violence."
        ],
        posterior_confidence: "low",
        what_would_change_this: "Discovery of verified, contemporary internal state documents or recording showing Modi explicitly ordered police officers to stand down and allow rioting."
      }
    ],
    historical_comparisons: [
      {
        compared_to: "Indira Gandhi",
        similarities: [
          "Highly popular, charismatic, and executive-dominated Indian Prime Ministers.",
          "Both bypassed party elders to build direct, populist connections with the masses and centralized power heavily within the PMO."
        ],
        differences: [
          "Indira Gandhi relied on secular, dynastic socialist centralization and suspended democracy (the Emergency), whereas Modi operates on Hindutva, technocratic market-modernization, and has won successive democratic majorities."
        ],
        confidence: "high"
      }
    ],
    source_quality: {
      overall: "strong",
      notes: "Abundant modern geopolitical reports, Indian election logs, Supreme Court rulings, and analytical biographies by Christophe Jaffrelot.",
      source_count: 5
    },
    sources: [
      "Jaffrelot, Christophe. (2021). Modi's India: Hindu Nationalism and the Rise of Ethnic Democracy.",
      "Guha, Ramachandra. (2018). India After Gandhi (Revised Edition).",
      "Marino, Andy. (2014). Narendra Modi: A Political Biography.",
      "Supreme Court of India SIT Reports on Gujarat Riots (2012).",
      "Mukhopadhyay, Nilanjan. (2013). Narendra Modi: The Man, The Times."
    ],
    research_gaps: ["The exact details of his private consultations with security planners prior to major national security decisions (e.g., the 2019 Balakot airstrikes) remain highly classified."],
    created_at: "2026-05-31T21:31:33Z",
    updated_at: "2026-05-31T21:31:33Z"
  },

  // 4. Shivaji Maharaj
  {
    person_id: "shivaji_maharaj",
    name: "Shivaji Maharaj",
    aliases: ["Chhatrapati Shivaji", "Shivaji I"],
    birth_year: 1630,
    death_year: 1680,
    countries_or_regions: ["India", "Maratha Empire", "Deccan"],
    era: "17th Century / Mughal-Deccan Wars",
    roles: ["Chhatrapati of the Maratha Empire", "Founder of the Maratha Kingdom"],
    domains: ["Geopolitics", "Military", "Statecraft"],
    priority_tier: 2,
    short_summary: "Chhatrapati and founder of the Maratha Empire who pioneered asymmetric guerrilla warfare, challenged Mughal and Adil Shahi hegemonies, and established a sovereign Hindu kingdom in western India.",
    timeline: [
      {
        date_or_year: "1646",
        event: "Captured the Torna Fort at age 16, launching his independent military career.",
        importance: "high",
        sources: ["Sarkar (1919)", "Gordon (1993)"]
      },
      {
        date_or_year: "1659-11-10",
        event: "Met and slew the giant Adil Shahi general Afzal Khan in a famous close-quarters duel using tiger claws (bagh nakh) at Pratapgad.",
        importance: "high",
        sources: ["Sarkar (1919)", "Sabhasad Bakhar"]
      },
      {
        date_or_year: "1663-04",
        event: "Launched a daring, midnight raid on Shaista Khan's palace in Pune, severing the Mughal general's fingers and forcing a retreat.",
        importance: "high",
        sources: ["Sarkar (1919)"]
      },
      {
        date_or_year: "1664-01",
        event: "Sacked the wealthy Mughal port city of Surat, dealing a massive financial blow to Emperor Aurangzeb.",
        importance: "high",
        sources: ["Sarkar (1919)", "Gordon (1993)"]
      },
      {
        date_or_year: "1665",
        event: "Signed the Treaty of Purandar with Mughal general Jai Singh I after intense siege pressure, surrendering 23 forts temporarily.",
        importance: "high",
        sources: ["Treaty documents", "Sarkar (1919)"]
      },
      {
        date_or_year: "1666-08",
        event: "Daringly escaped from house arrest in Aurangzeb's court at Agra, reportedly hiding in large sweet baskets.",
        importance: "high",
        sources: ["Sabhasad Bakhar", "Sarkar (1919)"]
      },
      {
        date_or_year: "1674-06-06",
        event: "Crowned 'Chhatrapati' (paramount sovereign) in a grand Vedic coronation ceremony at Raigad Fort, establishing Maratha sovereignty.",
        importance: "high",
        sources: ["Gordon (1993)", "Laine (2003)"]
      },
      {
        date_or_year: "1680-04-03",
        event: "Passed away at Raigad Fort; succeeded by his eldest son Sambhaji.",
        importance: "high",
        sources: ["Sarkar (1919)"]
      }
    ],
    power_base: "Fierce loyalty of the local Mavali hill tribes and Maratha peasantry, command of a highly mobile, swift light cavalry force, a network of 300 hill and naval forts, and deep regional Hindu cultural pride.",
    core_goals: [
      "Establish a sovereign, independent Maratha kingdom (Hindavi Swarajya) free from Islamic sultanate rule.",
      "Construct a highly defensive fort-based military and naval network along the Western Ghats and Konkan coast.",
      "Re-establish traditional Hindu administrative, legal, and Sanskrit terms in statecraft."
    ],
    incentives: [
      "Eradicating the humiliation of regional vassalage to remote Mughal or Deccan sultans.",
      "Protecting local agrarian populations from predatory tax collectors and sectarian persecution.",
      "Securing the honor and wealth of his Bhonsle clan."
    ],
    constraints: [
      "Extremely limited financial resources compared to the fabulously wealthy Mughal Empire.",
      "Constant threat of multi-front invasions from the Mughals, Adil Shahis of Bijapur, and Siddis of Janjira.",
      "Fierce, conservative clan rivalries among other prominent Maratha noble families (Deshmukhs)."
    ],
    allies: ["Tanaji Malusare (general)", "Baji Prabhu Deshpande", "Jijabai (mother/mentor)"],
    rivals: ["Aurangzeb (Mughal Emperor)", "Afzal Khan (Bijapuri general)", "Shaista Khan", "Siddis of Janjira"],
    institutions_controlled_or_influenced: ["Maratha Kingdom", "Ashta Pradhan (Council of Eight Ministers)", "Maratha Navy", "Raigad Administration"],
    ideology_or_worldview: {
      summary: "Sovereign Hindu self-rule (Hindavi Swarajya) prioritizing religious freedom, local agrarian protection, the abolition of predatory feudal fiefs, and the systematic institutionalization of Marathi culture.",
      evidence: [
        "Commissioning the Rajya Vyavahara Kosha, a Sanskrit dictionary of administrative terms.",
        "His strict military orders forbidding the harassment of women, peasants, or religious shrines of any community during campaigns."
      ],
      confidence: "high"
    },
    decision_patterns: [
      {
        pattern: "Highly creative, swift, and asymmetrical military maneuvers (Ganimi Kava) based on deep terrain knowledge, surprise, and deception, coupled with transactional diplomatic surrenders when cornered by superior forces.",
        examples: [
          "Using Afzal Khan's own hubris to lure him into a close-quarters meeting at Pratapgad and slaying him.",
          "Signing the Treaty of Purandar in 1665 to preserve his forces, only to systematically recapture all lost forts within five years."
        ],
        confidence: "high"
      }
    ],
    crisis_behavior: "Exhibited extraordinary, legendary calm, physical bravery, and strategic improvisation in high-stakes crises, turning apparent traps (Agra confinement) into dramatic tactical escapes.",
    negotiation_style: "highly tactical, polite, transactional, utilizing written peace agreements to play his superior enemies against each other, while refusing to ever compromise on the core principle of his sovereign status.",
    risk_tolerance: "high",
    centralization_preference: "high",
    conflict_preference: "high",
    institutional_respect: "medium",
    coalition_dependency: "medium",
    populism_level: "high",
    technocratic_level: "medium",
    game_theory_profile: {
      main_players: ["Maratha State (Shivaji)", "Mughal Empire (Aurangzeb)", "Bijapur Sultanate", "European Coastal Traders"],
      likely_objectives: [
        "Shivaji: Secure Swarajya, capture defensive forts, tax commerce.",
        "Aurangzeb: Annex the Deccan, crush the Maratha 'mountain rat' (failed).",
        "Bijapur: Hold territorial borders, contain Shivaji's rebellion."
      ],
      payoffs: [
        "Guerrilla War Nash Equilibrium: Bypassing massive Mughal armies in open battle to raid their supply lines and cities (Surat) yielded a massive payoff in wealth and demoralized the imperial forces (Highest asymmetric payoff)."
      ],
      constraints: ["Severe local noble divisions (Deshmukhs) forced Shivaji to rely on cash salaries rather than land grants to prevent factional splits."],
      common_strategic_moves: ["Night raids", "Hill fort sieges", "Dynamic tactical surrenders"],
      failure_modes: ["His early death at age 50 left the newly born kingdom facing a massive, 27-year invasion by Aurangzeb, which tested the decentralised resilience of the Maratha state to its absolute limits."]
    },
    bayesian_assessment: [
      {
        claim: "Shivaji sought to establish a pan-Indian Hindu Empire replacing the Mughals.",
        prior_confidence: "low",
        evidence: [
          "His early letters and coronations focusing heavily on the liberation and sovereignty of the Maharashtra region (Maharashtra Dharma) and the Deccan.",
          "His active alliances with Islamic sultans of Golconda (Qutb Shahis) against the Mughals, showing his strategic focus was regional Deccan sovereignty rather than a pan-Indian crusade."
        ],
        posterior_confidence: "low",
        what_would_change_this: "Discovery of contemporary Sanskrit decrees showing Shivaji mapped out administrative plans for the conquest and rule of Delhi and Kashmir."
      }
    ],
    historical_comparisons: [
      {
        compared_to: "Robert the Bruce",
        similarities: [
          "National liberation leaders who used guerrilla warfare and deep mountain terrain knowledge to defeat much larger, wealthier empires.",
          "Both systematically captured enemy-held castles to dismantle occupation infrastructures."
        ],
        differences: [
          "Shivaji built a major sovereign naval force from scratch to secure his coastline, a dimension Robert the Bruce did not develop."
        ],
        confidence: "high"
      }
    ],
    source_quality: {
      overall: "strong",
      notes: "The contemporary Sabhasad Bakhar (chronicle), extensive Mughal court chronicles, factory records of British/French traders, and definitive biographies by Jadunath Sarkar.",
      source_count: 5
    },
    sources: [
      "Sarkar, Jadunath. (1919). Shivaji and His Times.",
      "Gordon, Stewart. (1993). The Marathas 1600-1818.",
      "Sabhasad, Krishnaji Anant. (1697). Sabhasad Bakhar (Contemporary Chronicle).",
      "Laine, James W. (2003). Shivaji: Hindu King in Islamic India.",
      "Ranade, Mahadev Govind. (1900). Rise of the Maratha Power."
    ],
    research_gaps: ["The exact birth date of Shivaji (Feb 19, 1630 vs April 6, 1627) was a subject of official state debate until settled by legislative committee."],
    created_at: "2026-05-31T21:31:33Z",
    updated_at: "2026-05-31T21:31:33Z"
  },

  // 5. Emperor Wu of Han
  {
    person_id: "emperor_wu_of_han",
    name: "Emperor Wu of Han",
    aliases: ["Han Wudi", "Liu Che"],
    birth_year: -156,
    death_year: -87,
    countries_or_regions: ["China", "East Asia", "Central Asia"],
    era: "2nd Century BCE / Han Dynasty Expansion",
    roles: ["Seventh Emperor of the Han Dynasty"],
    domains: ["Geopolitics", "Statecraft", "Military"],
    priority_tier: 2,
    short_summary: "Seventh Emperor of the Han Dynasty who dramatically expanded China's borders to Central Asia, Korea, and Vietnam, established Confucianism as the state ideology, and monopolized salt and iron.",
    timeline: [
      {
        date_or_year: "-141",
        event: "Ascended the Han imperial throne at age 15.",
        importance: "high",
        sources: ["Sima Qian (Shiji)", "Loewe (2000)"]
      },
      {
        date_or_year: "-138",
        event: "Dispatched Zhang Qian on a secret diplomatic mission to Central Asia, initiating the Silk Road.",
        importance: "high",
        sources: ["Sima Qian (Shiji)"]
      },
      {
        date_or_year: "-136",
        event: "Adopted Confucianism as the sole official state ideology, establishing the Imperial Academy.",
        importance: "high",
        sources: ["Sima Qian (Shiji)", "Lewis (2007)"]
      },
      {
        date_or_year: "-129 to -119",
        event: "Launched a series of massive, highly successful cavalry campaigns that crushed the nomadic Xiongnu confederation.",
        importance: "high",
        sources: ["Sima Qian (Shiji)", "Loewe (2000)"]
      },
      {
        date_or_year: "-119",
        event: "Established lucrative state monopolies on salt, iron, and liquor to fund continuous expansionist wars.",
        importance: "high",
        sources: ["Debate on Salt and Iron", "Lewis (2007)"]
      },
      {
        date_or_year: "-111",
        event: "Conquered Nanyue (modern Guangdong and northern Vietnam), integrating it into the empire.",
        importance: "high",
        sources: ["Loewe (2000)"]
      },
      {
        date_or_year: "-89",
        event: "Issued the Luntai Edict of Repentance, expressing deep regret for past military excesses and shifting focus to agriculture.",
        importance: "high",
        sources: ["Book of Han (Hanshu)"]
      },
      {
        date_or_year: "-87-03-29",
        event: "Passed away in Chang'an; succeeded by his young son Emperor Zhao under the regency of Huo Guang.",
        importance: "high",
        sources: ["Loewe (2000)"]
      }
    ],
    power_base: "Absolute, highly centralized imperial authority, professional merit-based standing armies led by brilliant generals (Wei Qing, Huo Qubing), state financial monopolies, and a loyal, Confucian-trained civil service bureaucracy.",
    core_goals: [
      "Permanently crush the nomadic Xiongnu threat to secure northern Chinese borders.",
      "Expand Chinese territorial control into Central Asia, securing the Silk Road trade route.",
      "Unify the empire's administrative and intellectual life under a sole Confucian bureaucratic framework."
    ],
    incentives: [
      "Overcoming the humiliating tribute policy (heqin) previously paid to the Xiongnu.",
      "Maximizing imperial treasury revenues to fund massive territorial conquests.",
      "Attaining historical immortality as the ultimate expander of Han civilizational boundaries."
    ],
    constraints: [
      "Severe financial bankruptcy and peasant exhaustion caused by continuous, highly expensive military campaigns.",
      "Persistent, deep factional opposition from conservative Taoist court elites (including his grandmother Grand Empress Dowager Dou).",
      "Extreme logistics and supply challenges of moving armies across the barren Gobi Desert."
    ],
    allies: ["Zhang Qian (explorer)", "Wei Qing (cavalry general)", "Huo Qubing (general)", "Dong Zhongshu (scholar)"],
    rivals: ["Xiongnu Chanyu (nomad ruler)", "Conservative Taoist Court Factions", "Prince of Huainan (rebel)"],
    institutions_controlled_or_influenced: ["Han Dynasty Empire", "Imperial Academy (Taixue)", "State Salt and Iron Monopolies", "Imperial Secretariat"],
    ideology_or_worldview: {
      summary: "State Confucianism (Han Synthesis) combining Confucian ethical social codes with highly centralized, legalist administrative structures and state economic monopolies.",
      evidence: [
        "Establishing the Imperial Academy in -136, making mastery of the Confucian Five Classics the sole path to government office.",
        "Implementing aggressive state price stabilization (pingzhun) and taxation policies that rejected traditional laissez-faire principles."
      ],
      confidence: "high"
    },
    decision_patterns: [
      {
        pattern: "Bold, highly ambitious, and aggressive strategic planning, utilizing state capital monopolies to construct massive logistical networks for rapid, long-range cavalry and exploring expeditions.",
        examples: [
          "Funding the hazardous, decades-long Silk Road exploring missions of Zhang Qian.",
          "Sending armies deep into Fergana (modern Uzbekistan) to capture the legendary 'Heavenly Horses' in -104."
        ],
        confidence: "high"
      }
    ],
    crisis_behavior: "Exhibited highly pragmatic, self-correcting statesmanship in late-life crises, issuing the historic Luntai Edict in -89 to halt imperial overreach when peasant revolts threatened dynastic survival.",
    negotiation_style: "highly imperial, demanding absolute vassalage and tribute under threat of total military eradication, while showing tactical generosity to cooperative foreign rulers.",
    risk_tolerance: "high",
    centralization_preference: "high",
    conflict_preference: "high",
    institutional_respect: "medium",
    coalition_dependency: "low",
    populism_level: "low",
    technocratic_level: "high",
    game_theory_profile: {
      main_players: ["Han Dynasty (Han Wudi)", "Nomadic Xiongnu Confederation", "Central Asian Kingdoms", "Han Aristocracy"],
      likely_objectives: [
        "Han: Defeat Xiongnu, secure Silk Road trade, extract state monopoly profits.",
        "Xiongnu: Maintain tribute extraction, raid Chinese borders.",
        "Central Asian Kingdoms: Survive between Han and Xiongnu giants, maximize commerce."
      ],
      payoffs: [
        "Cavalry Offensive Nash Equilibrium: Melting copper coins and state monopolies successfully funded massive, preemptive cavalry campaigns that permanently broke the Xiongnu confederation, securing the Silk Road (Highest geopolitical payoff)."
      ],
      constraints: ["Severe logistical degradation across the desert limited the size and duration of offensive campaigns."],
      common_strategic_moves: ["Long-range military expeditions", "Diplomatic alliances (marriage diplomacy)"],
      failure_modes: ["His late-career paranoia led to the devastating Witchcraft Persecution in -91, resulting in the forced suicide of his Crown Prince and destabilizing court succession."]
    },
    bayesian_assessment: [
      {
        claim: "Han Wudi adopted Confucianism because he was a devout follower of its moral philosophy.",
        prior_confidence: "low",
        evidence: [
          "His highly aggressive military campaigns and severe, legalist state monopolies which directly violated traditional Confucian ideals of ruler moderation and low taxes.",
          "His pragmatic realization that Dong Zhongshu's Confucianism provided a perfect ideological justification for absolute, centralized imperial authority based on the Mandate of Heaven."
        ],
        posterior_confidence: "low",
        what_would_change_this: "Discovery of verified, private palace diaries showing he privately wept over his military campaigns and sought to dismantle all legalist tax codes."
      }
    ],
    historical_comparisons: [
      {
        compared_to: "Qin Shi Huang",
        similarities: [
          "Aggressive, highly centralized Chinese emperors who crushed regional rivals and expanded borders.",
          "Both built massive defensive walls, standardized state functions, and relied on severe legal codes."
        ],
        differences: [
          "Qin Shi Huang buried Confucian scholars alive to enforce Legalism, whereas Han Wudi institutionalized Confucianism as the official state ideology to secure the same centralized power."
        ],
        confidence: "high"
      }
    ],
    source_quality: {
      overall: "strong",
      notes: "Sima Qian's Shiji (contemporary account) and Ban Gu's Book of Han remain definitive, supported by extensive Han-era archaeological excavations of tomb inventories and clay records.",
      source_count: 5
    },
    sources: [
      "Sima, Qian. (c. 91 BCE). Shiji (Records of the Grand Historian).",
      "Ban, Gu. (1st Century CE). Hanshu (Book of Han).",
      "Loewe, Michael. (2000). A Biographical Dictionary of the Qin, Former Han and Later Han Periods.",
      "Lewis, Mark Edward. (2007). The Early Chinese Empires: Qin and Han.",
      "Huan, Kuan. (81 BCE). Debate on Salt and Iron (Yantielun)."
    ],
    research_gaps: ["Debates persist regarding the exact extent of the economic disruption and population loss caused by his mid-reign wars and monopolies."],
    created_at: "2026-05-31T21:31:33Z",
    updated_at: "2026-05-31T21:31:33Z"
  },

  // 6. Empress Dowager Cixi
  {
    person_id: "cixi",
    name: "Empress Dowager Cixi",
    aliases: ["Lao Foye", "The Dragon Lady"],
    birth_year: 1835,
    death_year: 1908,
    countries_or_regions: ["China", "East Asia"],
    era: "Late 19th / Early 20th Century / Late Qing Dynasty",
    roles: ["Empress Dowager of the Qing Dynasty", "De Facto Ruler of China"],
    domains: ["Geopolitics", "Statecraft", "Diplomacy"],
    priority_tier: 2,
    short_summary: "De facto ruler of the Qing Dynasty for 47 years who managed the self-strengthening movement, navigated Western imperialist invasions, and dominated the imperial court.",
    timeline: [
      {
        date_or_year: "1861-11",
        event: "Launched the Xinyou Coup alongside Prince Gong, seizing power as regent for her young son, the Tongzhi Emperor.",
        importance: "high",
        sources: ["Spence (1990)", "Chang (2013)"]
      },
      {
        date_or_year: "1860s-1870s",
        event: "Supported the Self-Strengthening Movement, importing Western military technology and building modern arsenals.",
        importance: "high",
        sources: ["Spence (1990)"]
      },
      {
        date_or_year: "1875",
        event: "Adopted her young nephew Guangxu as son and placed him on the throne, preserving her regency power.",
        importance: "high",
        sources: ["Chang (2013)"]
      },
      {
        date_or_year: "1898-09-21",
        event: "Launched the Wuxu Coup, arresting the Guangxu Emperor and halting the radical Hundred Days' Reform.",
        importance: "high",
        sources: ["Spence (1990)", "Chang (2013)"]
      },
      {
        date_or_year: "1900",
        event: "Allied with the Boxer Rebellion and declared war on the Eight-Nation Alliance, leading to a disastrous defeat and flight from Beijing.",
        importance: "high",
        sources: ["Boxer protocols", "Chang (2013)"]
      },
      {
        date_or_year: "1901-1908",
        event: "Implemented the New Policy (Late Qing Reforms), abolishing the imperial examinations and preparing for a constitution.",
        importance: "high",
        sources: ["Spence (1990)"]
      },
      {
        date_or_year: "1908-11-15",
        event: "Passed away in the Forbidden City, just one day after the mysterious death of the Guangxu Emperor.",
        importance: "high",
        sources: ["Autopsy reports", "Chang (2013)"]
      }
    ],
    power_base: "Complete mastery over the complex, highly factional Qing imperial court bureaucracy, loyalty of senior Manchu and Han military commanders (like Li Hongzhang and Yuan Shikai), control over imperial succession, and traditional Confucian filial obedience.",
    core_goals: [
      "Preserve and defend the sovereignty of the Manchu Qing Dynasty against internal rebellions and foreign colonization.",
      "Maintain absolute personal control over the imperial court and imperial succession.",
      "Execute highly cautious, selective modernization of China's military and administrative systems without destabilizing traditional Confucian authority."
    ],
    incentives: [
      "Averting the total collapse of the empire under Western and Japanese imperialist invasions.",
      "Preventing Han Chinese majoritarian movements from overthrowing the Manchu minority dynasty.",
      "Securing her personal survival, luxury, and prestige as the absolute ruler."
    ],
    constraints: [
      "Severe financial bankruptcy of the Qing treasury and crippling war indemnities owed to foreign powers.",
      "Extreme military weakness of the traditional Chinese forces compared to modernized Western and Japanese armies.",
      "Fierce, unyielding resistance from conservative Manchu princes who opposed any westernizing reforms."
    ],
    allies: ["Prince Gong", "Li Hongzhang (statesman)", "Yuan Shikai (general)", "Ronglu (general)"],
    rivals: ["Guangxu Emperor (nephew/reformer)", "Kang Youwei (reformer)", "Eight-Nation Alliance Leaders"],
    institutions_controlled_or_influenced: ["Grand Council of the Qing Dynasty", "Imperial Household Department", "Zongli Yamen (foreign office)", "New Army"],
    ideology_or_worldview: {
      summary: "Pragmatic dynastic preservationism combining traditional Manchu-Confucian court conservatism with selective, defensive adoption of Western technology ('Chinese learning for essence, Western learning for utility').",
      evidence: [
        "Halting the Hundred Days' Reform in 1898 to protect Manchu political privilege.",
        "Abolishing the 1,300-year-old imperial civil service examinations in 1905 to foster modern administrative training."
      ],
      confidence: "high"
    },
    decision_patterns: [
      {
        pattern: "Patient, highly calculated court maneuvers designed to balance competing factions (conservatives vs reformers, Manchu vs Han), followed by rapid, decisive political strikes when her personal authority was threatened.",
        examples: [
          "Crushing the Hundred Days' Reform and imprisoning the Guangxu Emperor to prevent a coup by reformists.",
          "Co-opting the Boxer Rebellion to channel anti-foreign anger away from the ruling Qing Dynasty."
        ],
        confidence: "high"
      }
    ],
    crisis_behavior: "Exhibited strong political survival skills in extreme crises (e.g. during the sack of Beijing in 1900), disguised herself as a peasant to flee, negotiated painful treaties (Boxer Protocol), and immediately launched reforms to regain legitimacy.",
    negotiation_style: "highly defensive, stalling, utilizing senior diplomats (like Li Hongzhang) to divide foreign adversaries, while making painful financial and territorial concessions to preserve the survival of the ruling dynasty.",
    risk_tolerance: "medium",
    centralization_preference: "high",
    conflict_preference: "medium",
    institutional_respect: "medium",
    coalition_dependency: "high",
    populism_level: "medium",
    technocratic_level: "medium",
    game_theory_profile: {
      main_players: ["Qing Court (Cixi)", "Western Imperialist Powers", "Chinese Reformers", "Anti-Manchu Revolutionaries (Sun Yat-sen)"],
      likely_objectives: [
        "Cixi: Maintain Manchu dynastic rule, avoid direct foreign deposition, control Guangxu.",
        "Foreign Powers: Extract trade concessions, territories, and financial indemnities.",
        "Reformers: Establish a constitutional monarchy, modernize rapidly."
      ],
      payoffs: [
        "Tactical Capitulation Nash Equilibrium: Surrendering vast financial indemnities in treaties successfully secured foreign backing to protect the Qing Dynasty from domestic revolutionary collapse (Highest dynastic survival payoff)."
      ],
      constraints: ["Crippling financial indemnities severely limited the funds available for industrialization."],
      common_strategic_moves: ["Balancing court factions", "Sudden regency coups"],
      failure_modes: ["Her decision to declare war on the Eight-Nation Alliance in 1900 led to the catastrophic sack of Beijing, destroying any remaining moral legitimacy of the Qing regime."]
    },
    bayesian_assessment: [
      {
        claim: "Cixi ordered the deliberate poisoning of the Guangxu Emperor with arsenic just before her own death in 1908.",
        prior_confidence: "medium",
        evidence: [
          "The long-standing court rumors and the coincidence of their deaths within 24 hours.",
          "The 2008 scientific forensic test of the Guangxu Emperor's remains which revealed levels of arsenic 2,400 times higher than normal, confirming acute poisoning, combined with the fact that Cixi desperately feared the Emperor would regain power and execute her allies after she died."
        ],
        posterior_confidence: "high",
        what_would_change_this: "Discovery of verified medical records showing the Guangxu Emperor had been taking high-dose traditional arsenic-based medicines for chronic illnesses for years."
      }
    ],
    historical_comparisons: [
      {
        compared_to: "Catherine de' Medici",
        similarities: [
          "Powerful dowager regents who ruled during periods of severe structural and religious/factional crisis.",
          "Both used intense, pragmatic balancing acts and sudden, violent political strikes to preserve their dynastic lines."
        ],
        differences: [
          "Cixi ruled a massive, continental empire facing direct global imperialist colonization, a far larger scale of external pressure."
        ],
        confidence: "high"
      }
    ],
    source_quality: {
      overall: "strong",
      notes: "Extensive imperial archives, foreign diplomatic logs, court memoirs, and major modern revisionist biographies by Jung Chang.",
      source_count: 5
    },
    sources: [
      "Spence, Jonathan D. (1990). The Search for Modern China.",
      "Chang, Jung. (2013). Empress Dowager Cixi: The Concubine Who Launched Modern China.",
      "Bland, J. O. P. & Backhouse, E. (1910). China Under the Empress Dowager.",
      "Schrecker, John. (2004). The Hundred Days' Reform and the Late Qing Reforms.",
      "Autopsy and Forensic Reports on the Guangxu Emperor (2008)."
    ],
    research_gaps: ["Determining the exact degree of her private sympathy for the Boxer rebels prior to their entry into Beijing remains historically debated."],
    created_at: "2026-05-31T21:31:33Z",
    updated_at: "2026-05-31T21:31:33Z"
  },

  // 7. Chiang Kai-shek
  {
    person_id: "chiang_kai_shek",
    name: "Chiang Kai-shek",
    aliases: ["Jiang Jieshi", "Generalissimo"],
    birth_year: 1887,
    death_year: 1975,
    countries_or_regions: ["China", "Taiwan", "East Asia"],
    era: "20th Century / WWI / WWII / Chinese Civil War / Cold War",
    roles: ["President of the Republic of China", "Director-General of the Kuomintang", "Supreme Commander of the Allied Forces in the China Theater"],
    domains: ["Geopolitics", "Military", "Statecraft"],
    priority_tier: 2,
    short_summary: "Nationalist leader of China who led the Northern Expedition, fought a brutal civil war against the Communists, led China's resistance against Japanese invasion in WWII, and established the Republic of China government in Taiwan.",
    timeline: [
      {
        date_or_year: "1924",
        event: "Appointed by Sun Yat-sen as the first Commandant of the Whampoa Military Academy.",
        importance: "high",
        sources: ["Taylor (2009)", "Fenby (2003)"]
      },
      {
        date_or_year: "1926-1928",
        event: "Led the Northern Expedition, defeating regional warlords to nominally unify China under the KMT.",
        importance: "high",
        sources: ["Fenby (2003)"]
      },
      {
        date_or_year: "1927-04-12",
        event: "Ordered the Shanghai Massacre, brutally purging Communists from the KMT and initiating the Civil War.",
        importance: "high",
        sources: ["Shanghai massacre records", "Taylor (2009)"]
      },
      {
        date_or_year: "1936-12-12",
        event: "Kidnapped in the Xi'an Incident; forced to agree to a Second United Front with the CCP to fight Japan.",
        importance: "high",
        sources: ["Xi'an incident records", "Taylor (2009)"]
      },
      {
        date_or_year: "1937-1945",
        event: "Led China's protracted, high-casualty military resistance against the massive Japanese invasion during WWII.",
        importance: "high",
        sources: ["Taylor (2009)", "Fenby (2003)"]
      },
      {
        date_or_year: "1949-12-10",
        event: "Fled to Taiwan after total defeat by Mao's PLA in the Civil War, establishing Taipei as the temporary ROC capital.",
        importance: "high",
        sources: ["Taylor (2009)", "Guha (2007)"]
      },
      {
        date_or_year: "1949-1975",
        event: "Ruled Taiwan under martial law (White Terror), consolidating economic growth and preparing to 'reclaim the mainland'.",
        importance: "high",
        sources: ["Taiwan martial law archives", "Taylor (2009)"]
      },
      {
        date_or_year: "1975-04-05",
        event: "Passed away in Taipei; succeeded as president by his son Chiang Ching-kuo.",
        importance: "high",
        sources: ["Taylor (2009)"]
      }
    ],
    power_base: "Command of the Nationalist Revolutionary Army, absolute control over the Whampoa military officer clique, KMT party machinery, backing of wealthy coastal financial elites and landowners, and close strategic alliance with the United States during the Cold War.",
    core_goals: [
      "Defeat all regional warlords and foreign invaders to build a unified, sovereign Chinese Republic.",
      "Annihilate the Chinese Communist Party and suppress all leftist revolutionary movements.",
      "Maintain the international legitimacy of the Republic of China (ROC) government as the sole representative of China."
    ],
    incentives: [
      "Fulfilling Sun Yat-sen's nationalist revolution.",
      "Averting total Japanese colonization of the Chinese heartland.",
      "Preserving his personal position as the supreme 'Generalissimo' of China."
    ],
    constraints: [
      "Rampant, severe inflation, corruption, and administrative incompetence within the KMT state apparatus.",
      "Fierce, highly effective guerrilla and conventional military campaigns of Mao's PLA.",
      "Deep geopolitical shifts, including the eventually loss of US diplomatic recognition to the PRC in 1979 (posthumous)."
    ],
    allies: ["Soong Mei-ling (wife/diplomat)", "Chiang Ching-kuo (son)", "United States military planners (Stilwell/Chennault)"],
    rivals: ["Mao Zedong (arch-rival)", "Wang Jingwei (puppet collaborator)", "Zhang Xueliang (kidnapper)", "Li Zongren"],
    institutions_controlled_or_influenced: ["Kuomintang (KMT)", "Nationalist Revolutionary Army", "Republic of China Government", "Whampoa Military Academy"],
    ideology_or_worldview: {
      summary: "Authoritarian Chinese nationalism combining selective elements of Sun Yat-sen's Three Principles (heavily prioritizing Nationalism) with traditional Neo-Confucian moral discipline (New Life Movement) and anti-communism.",
      evidence: [
        "Launching the New Life Movement in 1934 to promote traditional Confucian hygiene and morals to counter leftist ideas.",
        "Ruling Taiwan under strict martial law for 26 years to enforce political conformity."
      ],
      confidence: "high"
    },
    decision_patterns: [
      {
        pattern: "Highly militarized, top-down, and often stubborn decision-making, preferring direct conventional force and political purges, while struggling to implement necessary agrarian economic reforms to secure peasant support.",
        examples: [
          "Ordering the dynamic destruction of the Yellow River dikes in 1938 to halt the Japanese advance, causing massive peasant civilian casualties.",
          "Launching successive 'Encirclement Campaigns' against the Communist Jiangxi Soviet."
        ],
        confidence: "high"
      }
    ],
    crisis_behavior: "Exhibited extreme personal stubbornness and survival resilience in major crises, retreating deep inland to Chongqing during WWII, refusing to surrender to Japan, and successfully rebuilding a prosperous state in Taiwan after civil war defeat.",
    negotiation_style: "highly formal, uncompromising, viewing the Communists as illegitimate bandits (gongfei) to be exterminated rather than negotiated with, while displaying transactional flexibility with US military sponsors.",
    risk_tolerance: "high",
    centralization_preference: "high",
    conflict_preference: "high",
    institutional_respect: "medium",
    coalition_dependency: "high",
    populism_level: "medium",
    technocratic_level: "medium",
    game_theory_profile: {
      main_players: ["KMT (Chiang)", "CCP (Mao)", "Imperial Japan", "United States"],
      likely_objectives: [
        "Chiang: Unify China under KMT, exterminate CCP, survive Japanese invasion.",
        "Mao: Build rural peasant soviets, wear down KMT, seize power.",
        "Japan: Annex northern/coastal China, exploit raw resources."
      ],
      payoffs: [
        "Xi'an Incident Nash Equilibrium: Agreeing to a Second United Front successfully secured his physical release and paused KMT-CCP war to resist Japan, but allowed CCP forces to expand in remote rural zones (Mixed payoff)."
      ],
      constraints: ["Rampant hyperinflation post-WWII acted as a strict threat constraint that destroyed middle-class trust in the KMT regime."],
      common_strategic_moves: ["Conventional military offensives", "Martial law decrees", "Strategic retreats"],
      failure_modes: ["His failure to address rural land reform and curb rampant corruption allowed Mao to easily win over the massive peasant population, causing KMT mainland collapse in 1949."]
    },
    bayesian_assessment: [
      {
        claim: "Chiang Kai-shek was a purely corrupt warlord who did not care about Chinese sovereignty or modernization.",
        prior_confidence: "low",
        evidence: [
          "The extensive corruption of KMT generals and his family members (the Soong/Kung clans) who pocketed US aid.",
          "His unyielding, heroic refusal to surrender to Japan during the darkest years of WWII (1837-1941) when isolated, and his highly successful post-1950 land reform and economic industrialization program in Taiwan which laid the foundation for the miracle economy."
        ],
        posterior_confidence: "low",
        what_would_change_this: "Discovery of secret documents proving Chiang signed a deal with Japan in 1940 agreeing to partition China in exchange for a massive personal bank transfer."
      }
    ],
    historical_comparisons: [
      {
        compared_to: "Jefferson Davis",
        similarities: [
          "Highly formal, stiff, and militarized leaders of regimes that faced devastating civil war defeats.",
          "Both struggled with severe currency inflation, internal factionalism, and lack of supply chain depth."
        ],
        differences: [
          "Chiang successfully escaped with a substantial army to a distinct geographic territory (Taiwan) and preserved his state's international legitimacy for decades."
        ],
        confidence: "high"
      }
    ],
    source_quality: {
      overall: "strong",
      notes: "The comprehensive personal diaries of Chiang Kai-shek (housed at the Hoover Institution), extensive KMT archives in Taipei, and major biographies by Jay Taylor and Jonathan Fenby.",
      source_count: 5
    },
    sources: [
      "Taylor, Jay. (2009). The Generalissimo: Chiang Kai-shek and the Struggle for Modern China.",
      "Fenby, Jonathan. (2003). Generalissimo: Chiang Kai-shek and the China He Lost.",
      "Chiang, Kai-shek. Personal Diaries (Hoover Institution Archives).",
      "Eastman, Lloyd E. (1984). Seeds of Destruction: Nationalist China in War and Revolution.",
      "Spence, Jonathan D. (1990). The Search for Modern China."
    ],
    research_gaps: ["Debates persist regarding the exact extent of his private foreknowledge of the February 28 (228) Incident violence in Taiwan in 1947."],
    created_at: "2026-05-31T21:31:33Z",
    updated_at: "2026-05-31T21:31:33Z"
  },

  // 8. Emperor Taizong of Tang
  {
    person_id: "tang_taizong",
    name: "Emperor Taizong of Tang",
    aliases: ["Li Shimin"],
    birth_year: 598,
    death_year: 649,
    countries_or_regions: ["China", "East Asia", "Central Asia"],
    era: "7th Century / Tang Dynasty Golden Age",
    roles: ["Second Emperor of the Tang Dynasty", "Co-founder of the Tang Dynasty"],
    domains: ["Geopolitics", "Statecraft", "Military"],
    priority_tier: 2,
    short_summary: "Second Emperor of the Tang Dynasty who co-founded the empire, initiated the Golden Age of Tang (Reign of Zhenguan), expanded into Central Asia, and institutionalized highly meritocratic civil services.",
    timeline: [
      {
        date_or_year: "617",
        event: "Encouraged his father Li Yuan to launch the rebellion against the collapsing Sui Dynasty, establishing the Tang.",
        importance: "high",
        sources: ["Sima Guang (Zizhi Tongjian)", "Twitchett (1979)"]
      },
      {
        date_or_year: "626-07-02",
        event: "Xuanwu Gate Incident: Assassinated his elder brothers (who were plotting his death) and forced his father to abdicate the throne.",
        importance: "high",
        sources: ["Sima Guang (Zizhi Tongjian)"]
      },
      {
        date_or_year: "626-09-04",
        event: "Ascended the imperial throne; initiated the celebrated 'Reign of Zhenguan'.",
        importance: "high",
        sources: ["Twitchett (1979)"]
      },
      {
        date_or_year: "630",
        event: "Defeated and captured the Eastern Turkic Khagan, Illig Qaghan; proclaimed 'Tian Kehan' (Heavenly Khagan) by nomadic tribes.",
        importance: "high",
        sources: ["Twitchett (1979)", "Wechsler (1985)"]
      },
      {
        date_or_year: "640",
        event: "Annexed Gaochang (modern Xinjiang), securing deep military control over the Silk Road trade.",
        importance: "high",
        sources: ["Silk Road records"]
      },
      {
        date_or_year: "648",
        event: "Authored the 'Di Fan' (Plan for an Emperor), a political manual on imperial governance for his successor.",
        importance: "high",
        sources: ["Di Fan text", "Wechsler (1985)"]
      },
      {
        date_or_year: "649-07-10",
        event: "Passed away in Chang'an; buried in the massive Zhaoling Mausoleum; succeeded by Emperor Gaozong.",
        importance: "high",
        sources: ["Twitchett (1979)"]
      }
    ],
    power_base: "Unrivaled personal military prestige as a young cavalry commander, a highly professional meritocratic officer corps, a loyal and efficient civilian bureaucracy staffed by elite scholars, and traditional dynastic legitimacy.",
    core_goals: [
      "Consolidate and secure the newly established Tang Dynasty, preventing a return to Sui-era civil war.",
      "Construct a highly efficient, transparent, and non-corrupt civil administration using scholar-bureaucrats.",
      "Defeat the nomadic Turkic confederations to secure the Silk Road and northern imperial frontiers."
    ],
    incentives: [
      "Overcoming the moral taint of the Xuanwu Gate fratricide through exemplary, virtuous rule.",
      "Maximizing economic wealth through agrarian reforms (Equal-field system) and secure Silk Road commerce.",
      "Attaining legacy as the ultimate model of the 'sage king' in Chinese imperial history."
    ],
    constraints: [
      "The massive post-Sui economic exhaustion and demographic collapse of the Chinese heartland.",
      "Fierce, highly mobile nomadic Turkic cavalry coalitions along the northern borders.",
      "The continuous challenge of balancing Manchu-style military clans against Han scholar-officials."
    ],
    allies: ["Wei Zheng (celebrated critic/advisor)", "Fang Xuanling (chancellor)", "Du Ruhui (chancellor)"],
    rivals: ["Crown Prince Li Jiancheng (brother/slain)", "Eastern Turkic Khagans", "Goguryeo Kingdom (military rival)"],
    institutions_controlled_or_influenced: ["Tang Dynasty Empire", "Three Departments and Six Ministries system", "Imperial Examination (Keju)", "Equal-field system"],
    ideology_or_worldview: {
      summary: "Pragmatic, enlightened imperial statecraft combining Confucian political ethics (prioritizing the people as the water that can float or capsize the boat) with Taoist moderation and severe legalist efficiency.",
      evidence: [
        "Actively encouraging and protecting his advisor Wei Zheng's severe, direct criticisms of his personal behavior.",
        "Writing the 'Di Fan' advising his son that an emperor must govern with constant self-restraint and humility."
      ],
      confidence: "high"
    },
    decision_patterns: [
      {
        pattern: "Highly systematic, consultative decision-making, actively gathering competing inputs from civil chancellors and military generals before executing rapid, overwhelming strategic actions.",
        examples: [
          "Establishing formal chancellery debating chambers where imperial decrees had to be vetted and signed off before taking effect.",
          "Launching a rapid, winter cavalry assault that completely caught the Eastern Turks unprepared in 630."
        ],
        confidence: "high"
      }
    ],
    crisis_behavior: "Exhibited remarkable calm, strategic flexibility, and direct courage in crises, famously riding out with just a few horsemen to negotiate face-to-face with the massive invading Turkic army at the Bian Bridge in 626.",
    negotiation_style: "highly inclusive, diplomatic, and civilizational; incorporating defeated nomadic chiefs directly into his military guard, while establishing deep personal trust with civil advisors.",
    risk_tolerance: "high",
    centralization_preference: "high",
    conflict_preference: "medium",
    institutional_respect: "high",
    coalition_dependency: "high",
    populism_level: "high",
    technocratic_level: "high",
    game_theory_profile: {
      main_players: ["Tang Crown (Taizong)", "Turkic Khaganates", "Scholar-Officials (Wei Zheng)", "Goguryeo"],
      likely_objectives: [
        "Taizong: Consolidate Tang dynasty, defeat Turks, secure civil services, avoid Sui mistakes.",
        "Turks: Extract border tribute, exploit Chinese dynastic splits.",
        "Officials: Limit emperor's autocratic power, enforce Confucian laws."
      ],
      payoffs: [
        "Zhenguan Governance Nash Equilibrium: Allowing chancellors to actively veto and edit imperial decrees successfully prevented policy errors, yielding the highest long-term administrative stability payoff (Highest cooperative payoff)."
      ],
      constraints: ["Peasant exhaustion post-Sui acted as a strict threat constraint that prevented Taizong from launching premature, large-scale public works projects."],
      common_strategic_moves: ["Consultative chancellery debates", "Long-range cavalry offensives"],
      failure_modes: ["His late-career military campaign against Goguryeo in 645 turned into a costly, stalled siege, exposing the limits of Tang military projection."]
    },
    bayesian_assessment: [
      {
        claim: "Taizong actively edited the official Court Diaries and Imperial History to justify his fratricide at the Xuanwu Gate.",
        prior_confidence: "high",
        evidence: [
          "The traditional Chinese court taboo against emperors reading or editing the official daily court records (to ensure historical honesty).",
          "The explicit records showing Taizong broke this taboo, demanded to see the daily logs from historian Fang Xuanling, and ordered the accounts of the Xuanwu Gate incident to be 'clarified' to emphasize his brothers' plots and his father's willingness, creating a highly polished narrative."
        ],
        posterior_confidence: "high",
        what_would_change_this: "Discovery of a contemporary, unedited pre-640 manuscript of daily court records showing Li Shimin acted purely to seize power without any prior plot by his brothers."
      }
    ],
    historical_comparisons: [
      {
        compared_to: "Augustus",
        similarities: [
          "Enlightened autocrats who seized power through family fratricide/civil war, but established stable, highly institutionalized golden ages (Pax Romana/Zhenguan governance).",
          "Both carefully balanced militarized elites against civil bureaucracies to secure dynastic continuity."
        ],
        differences: [
          "Taizong was a highly active, direct cavalry general who personally led shock assaults in his youth, whereas Augustus relied on military commanders."
        ],
        confidence: "high"
      }
    ],
    source_quality: {
      overall: "strong",
      notes: "The comprehensive Zizhi Tongjian by Sima Guang, the Old Book of Tang, New Book of Tang, and the Zhenguan Zhengyao (Administrative Dialogues).",
      source_count: 5
    },
    sources: [
      "Sima, Guang. (1084). Zizhi Tongjian (Comprehensive Mirror to Aid in Government).",
      "Wu, Jing. (c. 730). Zhenguan Zhengyao (Essentials of Governance from the Zhenguan Reign).",
      "Twitchett, Denis (Editor). (1979). The Cambridge History of China, Volume 3: Sui and T'ang China.",
      "Wechsler, Howard J. (1985). Offerings of Jade and Silk: Ritual and Symbol in the Legitimation of the T'ang Dynasty.",
      "Old Book of Tang (Jiu Tangshu) & New Book of Tang (Xin Tangshu)."
    ],
    research_gaps: ["The exact degree of his late-life reliance on alchemical longevity pills, which reportedly contributed to his early death, remains partially unverified."],
    created_at: "2026-05-31T21:31:33Z",
    updated_at: "2026-05-31T21:31:33Z"
  },

  // 9. Mohammad Reza Pahlavi
  {
    person_id: "mohammad_reza_pahlavi",
    name: "Mohammad Reza Pahlavi",
    aliases: ["The Shah of Iran", "Aryamehr"],
    birth_year: 1919,
    death_year: 1980,
    countries_or_regions: ["Iran", "Middle East", "Global"],
    era: "20th Century / Cold War Era / Pahlavi Dynasty",
    roles: ["Last Shah of Iran", "Shahanshah"],
    domains: ["Geopolitics", "Statecraft", "Economy"],
    priority_tier: 2,
    short_summary: "Last Shah of Iran who ruled for 37 years, launched the White Revolution modernization program, built a highly centralized secular state, and was deposed in the 1979 Islamic Revolution.",
    timeline: [
      {
        date_or_year: "1941-09-16",
        event: "Ascended the throne after his father Reza Shah was forced into exile by the Anglo-Soviet invasion of Iran.",
        importance: "high",
        sources: ["Milani (2011)", "Abrahamian (1982)"]
      },
      {
        date_or_year: "1953-08-19",
        event: "Restored to absolute power after the CIA-backed coup (Operation Ajax) deposed nationalist Prime Minister Mohammad Mossadegh.",
        importance: "high",
        sources: ["Milani (2011)", "Abrahamian (1982)"]
      },
      {
        date_or_year: "1963",
        event: "Launched the White Revolution, a sweeping modernization program focusing on land reform and women's enfranchisement.",
        importance: "high",
        sources: ["Milani (2011)", "Axworthy (2013)"]
      },
      {
        date_or_year: "1971-10",
        event: "Hosted the lavish, highly criticized 2,500-year celebration of the Persian Empire at Persepolis.",
        importance: "high",
        sources: ["Persepolis archives", "Axworthy (2013)"]
      },
      {
        date_or_year: "1973",
        event: "Unilaterally raised oil prices during the OPEC oil crisis, injecting billions into the Iranian economy and defense budget.",
        importance: "high",
        sources: ["OPEC archives", "Milani (2011)"]
      },
      {
        date_or_year: "1978-09-08",
        event: "Black Friday: Ordered martial law; state security forces fired on mass protests in Tehran, initiating the revolution.",
        importance: "high",
        sources: ["Axworthy (2013)"]
      },
      {
        date_or_year: "1979-01-16",
        event: "Fled Iran into exile as millions took to the streets and Ayatollah Khomeini returned to establish an Islamic Republic.",
        importance: "high",
        sources: ["Axworthy (2013)", "Milani (2011)"]
      },
      {
        date_or_year: "1980-07-27",
        event: "Passed away in Cairo, Egypt, from cancer; buried in the Al-Rifa'i Mosque.",
        importance: "high",
        sources: ["Milani (2011)"]
      }
    ],
    power_base: "Absolute constitutional monarchy backed by a massive, US-equipped military and air force, the highly repressive SAVAK secret police apparatus, a vast technocratic planning state funded by oil revenues, and close strategic alliance with the United States.",
    core_goals: [
      "Rapidly secularize, industrialize, and Westernize Iran, turning it into a leading global industrial power.",
      "Maintain absolute, centralized autocratic control over all political and administrative life, suppressing both leftist and religious opposition.",
      "Establish Iran as the undisputed regional military hegemon and guardian of the Persian Gulf."
    ],
    incentives: [
      "Eradicating the traditional, feudal power of landowning elites and clerics.",
      "Re-establishing ancient Persian imperial glory to legitimize his secular dynasty.",
      "Securing the geopolitical and oil alliance with the Western powers."
    ],
    constraints: [
      "Fierce, widespread domestic social and religious hostility led by Ayatollah Khomeini and the Shia clergy.",
      "Rampant urban inflation, inequality, and corruption triggered by the sudden influx of massive oil revenues.",
      "His own secret, terminal lymphatic cancer diagnosis, which paralyzed his executive decision-making in 1978."
    ],
    allies: ["United States Government", "SAVAK Networks", "Technocratic Planning Elites", "Empress Farah Pahlavi"],
    rivals: ["Ayatollah Khomeini (arch-rival)", "Mohammad Mossadegh (nationalist)", "Tudeh Party (leftist)"],
    institutions_controlled_or_influenced: ["Imperial State of Iran", "SAVAK (Secret Police)", "OPEC (Oil Cartel)", "Plan and Budget Organization"],
    ideology_or_worldview: {
      summary: "Secular, royalist modernization (Pahlavism) combining aggressive, Western-style industrial and social modernization (White Revolution) with ancient Persian imperial nationalism, absolute autocracy, and strict anti-communism.",
      evidence: [
        "Implementing major land redistribution and women's voting rights in 1963 in defiance of Shia clerics.",
        "Replacing the traditional Islamic calendar with a royalist calendar dated from the founding of Cyrus the Great's empire in 1976."
      ],
      confidence: "high"
    },
    decision_patterns: [
      {
        pattern: "Ambitious, top-down technocratic planning funded by oil windfalls, combined with a total refusal to allow domestic political participation, and a fatal paralysis of resolve during major public crises.",
        examples: [
          "Bypassing parliament to launch the White Revolution reforms by national referendum.",
          "Refusing to make decisive political choices (either crushing the protests with absolute force or conceding key reforms) in 1978 due to his cancer and fear of US disapproval."
        ],
        confidence: "high"
      }
    ],
    crisis_behavior: "Exhibited extreme indecisiveness, personal isolation, and paralysis of resolve in the face of mass popular protests in 1978, choosing to flee the country rather than launching a total military crackdown.",
    negotiation_style: "highly formal, assertive on international economic stages (OPEC), but domestic-audience insulated, refusing to directly negotiate with local political or religious opponents, viewing them as foreign agents.",
    risk_tolerance: "medium",
    centralization_preference: "high",
    conflict_preference: "medium",
    institutional_respect: "low",
    coalition_dependency: "high",
    populism_level: "low",
    technocratic_level: "high",
    game_theory_profile: {
      main_players: ["The Shah", "Ayatollah Khomeini", "United States (Jimmy Carter)", "Nationalist/Leftist Coalition"],
      likely_objectives: [
        "Shah: Secularize Iran, maintain absolute royal authority, secure US backing.",
        "Khomeini: Overthrow monarchy, establish Islamic state, eliminate US influence.",
        "Carter: Promote human rights, preserve strategic oil/Cold War alliance with Iran."
      ],
      payoffs: [
        "The Oil Boom Tragedy: Unilaterally raising oil prices in 1973 successfully maximized treasury cash but triggered severe domestic hyperinflation and urban migration, destroying middle-class economic stability (Negative payoff)."
      ],
      constraints: ["US President Carter's emphasis on human rights acted as a strict threat constraint that prevented the Shah from launching a total military crackdown in 1977-1978."],
      common_strategic_moves: ["Secular modernization reforms", "SAVAK surveillance", "Geopolitical oil negotiations"],
      failure_modes: ["His total suppression of moderate secular opposition left the radical, highly organized religious networks of Ayatollah Khomeini as the only viable channel for public discontent, causing rapid regime collapse."]
    },
    bayesian_assessment: [
      {
        claim: "The Shah was a mere puppet of the United States who had no independent national goals.",
        prior_confidence: "low",
        evidence: [
          "His dependency on US military guards and the CIA coup of 1953.",
          "His highly aggressive, independent role in OPEC in 1973, where he actively fought the US to double oil prices, and his extensive state plans to build a sovereign nuclear energy program and domestic arms industry, showing major sovereign ambitions."
        ],
        posterior_confidence: "low",
        what_would_change_this: "Discovery of declassified US diplomatic logs showing the Shah submitted every single state decree and budget to the US Ambassador for editing and approval."
      }
    ],
    historical_comparisons: [
      {
        compared_to: "Louis XVI",
        similarities: [
          "Indecisive autocrats who ruled over deeply factionalized, rapidly modernizing societies facing major structural bankruptcies.",
          "Both launched selective, top-down reforms that alienated traditional elites (nobility/clerics) while failing to satisfy radical reformists, resulting in complete revolutionary collapse."
        ],
        differences: [
          "The Shah successfully escaped into exile and died of natural causes, whereas Louis XVI was guillotined."
        ],
        confidence: "high"
      }
    ],
    source_quality: {
      overall: "strong",
      notes: "Rich contemporary memoirs (including the Shah's own 'Answer to History'), extensive declassified CIA and British archives, and definitive scholarly biographies by Abbas Milani.",
      source_count: 5
    },
    sources: [
      "Milani, Abbas. (2011). The Shah.",
      "Abrahamian, Ervand. (1982). Iran Between Two Revolutions.",
      "Axworthy, Michael. (2013). Revolutionary Iran: A History of the Islamic Republic.",
      "Pahlavi, Mohammad Reza. (1980). Answer to History.",
      "Shawcross, William. (1988). The Shah's Last Ride: The Fate of an Ally."
    ],
    research_gaps: ["The exact degree of SAVAK's structural independence and true scale of executions during the White Terror remain subject to highly polarized political claims."],
    created_at: "2026-05-31T21:31:33Z",
    updated_at: "2026-05-31T21:31:33Z"
  },

  // 10. Shaka Zulu
  {
    person_id: "shaka_zulu",
    name: "Shaka Zulu",
    aliases: ["Shaka kaSenzangakhona"],
    birth_year: 1787,
    death_year: 1828,
    countries_or_regions: ["South Africa", "Southern Africa", "Zululand"],
    era: "Late 18th / Early 19th Century / Mfecane Era",
    roles: ["King of the Zulu Kingdom", "Founder of the Zulu Empire"],
    domains: ["Geopolitics", "Military", "Statecraft"],
    priority_tier: 2,
    short_summary: "Founder and king of the Zulu Kingdom who revolutionized southern African military tactics, created a highly disciplined standing army, and consolidated political control during the Mfecane.",
    timeline: [
      {
        date_or_year: "1809",
        event: "Joined the Mthethwa forces under King Dingiswayo; excelled as a brave warrior.",
        importance: "high",
        sources: ["Ritter (1955)", "Wylie (2006)"]
      },
      {
        date_or_year: "1816",
        event: "Seized the Zulu chieftainship with Dingiswayo's military backing after his father's death.",
        importance: "high",
        sources: ["Ritter (1955)"]
      },
      {
        date_or_year: "1818-1819",
        event: "Defeated the rival Ndwandwe forces at the Battle of Gqokli Hill, establishing military supremacy.",
        importance: "high",
        sources: ["Battle records", "Wylie (2006)"]
      },
      {
        date_or_year: "1820s",
        event: "Consolidated the Zulu Kingdom through aggressive expansion and incorporation of defeated tribes, initiating the Mfecane.",
        importance: "high",
        sources: ["Spence (1990)", "Wylie (2006)"]
      },
      {
        date_or_year: "1827",
        event: "His mother Nandi passed away; ordered an extreme, highly disruptive period of national mourning (slaying pregnant women and halting agriculture).",
        importance: "high",
        sources: ["Contemporary trader journals", "Ritter (1955)"]
      },
      {
        date_or_year: "1828-09-24",
        event: "Assassinated by his half-brothers Dingane and Mhlangana at his royal kraal in kwaDukuza.",
        importance: "high",
        sources: ["Ritter (1955)", "Wylie (2006)"]
      }
    ],
    power_base: "Absolute, highly centralized military autocracy, a standing army of 40,000 highly disciplined, age-grade warriors (Amabutho), complete state control over cattle wealth, and intense personal terror/prestige.",
    core_goals: [
      "Consolidate and expand the Zulu Kingdom into the dominant political and military empire in southern Africa.",
      "Systematically restructure tribal warfare, replacing traditional long-range skirmishes with lethal, close-quarters combat.",
      "Enforce absolute, unquestioned obedience to the Zulu crown, eradicating independent clan lineages."
    ],
    incentives: [
      "Overcoming the childhood humiliation of his illegitimacy and exile from the Zulu clan.",
      "Maximizing royal control over cattle herds and ivory trade routes.",
      "Defeating regional rivals (Ndwandwe/Mthethwa) to secure territorial hegemony."
    ],
    constraints: [
      "Severe logistical limits, relying on foot marches and herd movements without horses or wheeled transport.",
      "The rapid geopolitical encroachment of European colonial forces along the southern coast.",
      "Widespread, deep internal exhaustion and plotting by his own family members against his increasingly erratic rule."
    ],
    allies: ["Dingiswayo (early mentor)", "Henry Francis Fynn (British trader)", "Nandi (mother)"],
    rivals: ["Zwide (Ndwandwe king)", "Dingane (half-brother/assassin)", "Mzilikazi (rebellious general)"],
    institutions_controlled_or_influenced: ["Zulu Kingdom", "Amabutho (Standing Army System)", "Impi (Tactical Battalions)", "Royal Kraals"],
    ideology_or_worldview: {
      summary: "Absolute military centralism and militarized social discipline, prioritizing state expansion, complete integration of conquered youth into Zulu regiments, and the absolute sovereign power of the monarch.",
      evidence: [
        "Abolishing the traditional regional tribal initiations in favor of state military service.",
        "Implementing the death penalty for any warrior who returned from battle without their spear or shield."
      ],
      confidence: "high"
    },
    decision_patterns: [
      {
        pattern: "Brilliant, highly disruptive military innovations (introducing the short stabbing spear 'iklwa', the 'buffalo horns' tactical formation, and barefoot combat) coupled with ruthless, terror-based social consolidation.",
        examples: [
          "Forcing his warriors to discard traditional sandals to run faster on rough terrain.",
          "Slaying hundreds of his own subjects during his mother's mourning period to enforce absolute public grief."
        ],
        confidence: "high"
      }
    ],
    crisis_behavior: "Exhibited highly erratic, hyper-violent, and paranoid behavior in late-life personal crises (especially after his mother's death), executing political allies and ordering suicidal military campaigns that alienated his core commanders.",
    negotiation_style: "highly dominant, intimidating, dictating terms of complete submission to local tribes, while showing tactical interest and diplomatic curiosity in British traders to acquire firearms.",
    risk_tolerance: "high",
    centralization_preference: "high",
    conflict_preference: "high",
    institutional_respect: "low",
    coalition_dependency: "low",
    populism_level: "medium",
    technocratic_level: "medium",
    game_theory_profile: {
      main_players: ["Zulu Crown (Shaka)", "Ndwandwe Kingdom", "British Traders", "Royal Conspirators"],
      likely_objectives: [
        "Shaka: Expand empire, enforce army discipline, secure trade monopolies.",
        "Ndwandwe: Destroy Zulu growth, capture cattle grazing lands.",
        "Conspirators: Assassinate Shaka, seize crown, end constant wars."
      ],
      payoffs: [
        "Buffalo Horns Nash Equilibrium: Restructuring military forces into a pincer formation successfully surrounded and annihilated traditional skirmishing tribal forces, yielding absolute regional supremacy (Highest tactical payoff)."
      ],
      constraints: ["Lack of cavalry or firearms limited his ability to resist European colonial expansions in the long term."],
      common_strategic_moves: ["Tactical military pincer moves", "Forced tribal assimilations", "Terror executions"],
      failure_modes: ["His increasingly erratic, hyper-violent domestic executions post-1827 united his family members in a desperate assassination plot, ending his reign abruptly."]
    },
    bayesian_assessment: [
      {
        claim: "Shaka Zulu was a bloodthirsty savage who slaughtered over a million people during the Mfecane.",
        prior_confidence: "low",
        evidence: [
          "The highly sensationalized 19th-century accounts of British colonial writers who sought to paint Zulu culture as uniquely violent to justify British conquest and land grabs.",
          "Modern revisionist histories by Dan Wylie showing that while Shaka was indeed a ruthless military autocrat, the demographic displacements ('Mfecane') were equally driven by severe regional droughts and slave-raiding by Portuguese and Griqua traders, with the figure of 'one million dead' being a massive colonial exaggeration."
        ],
        posterior_confidence: "low",
        what_would_change_this: "Discovery of contemporary, objective census records and archaeological remains proving Shaka's impis executed a systematic extermination campaign of millions."
      }
    ],
    historical_comparisons: [
      {
        compared_to: "Philip II of Macedon",
        similarities: [
          "Military innovators who took small, backward states and built highly professional, lethal standing infantry formations (Macedonian phalanx/Impi).",
          "Both integrated conquered neighbors to build powerful regional kingdoms and fell victim to family assassination plots."
        ],
        differences: [
          "Philip II left a highly stable kingdom to a brilliant son (Alexander), whereas Shaka's assassination initiated a period of regional succession struggles."
        ],
        confidence: "high"
      }
    ],
    source_quality: {
      overall: "medium",
      notes: "Highly reliant on oral traditions (compiled later) and journals of early British traders, requiring careful modern critical analysis due to colonial bias.",
      source_count: 5
    },
    sources: [
      "Ritter, E. A. (1955). Shaka Zulu: The Rise of the Zulu Empire.",
      "Wylie, Dan. (2006). Myth of Iron: Shaka in History.",
      "Hamilton, Carolyn (Editor). (1995). The Mfecane Aftermath.",
      "Fynn, Henry Francis. (Compiled 1950). The Diary of Henry Francis Fynn.",
      "Omer-Cooper, J. D. (1966). The Zulu Aftermath: A Nineteenth-Century Revolution in Bantu Africa."
    ],
    research_gaps: ["Due to the lack of contemporary written Zulu records, the exact details of Shaka's early military innovations remain subject to historical deconstruction."],
    created_at: "2026-05-31T21:31:33Z",
    updated_at: "2026-05-31T21:31:33Z"
  },

  // 11. Idi Amin
  {
    person_id: "idi_amin",
    name: "Idi Amin",
    aliases: ["The Butcher of Uganda"],
    birth_year: 1925,
    death_year: 2003,
    countries_or_regions: ["Uganda", "East Africa", "Saudi Arabia"],
    era: "20th Century / Cold War Era / Post-colonial Africa",
    roles: ["President of Uganda", "Major General in the Ugandan Armed Forces"],
    domains: ["Geopolitics", "Statecraft", "Military"],
    priority_tier: 2,
    short_summary: "Military dictator and President of Uganda whose eight-year rule was marked by massive human rights abuses, the sudden expulsion of Uganda's Asian minority, and total economic collapse.",
    timeline: [
      {
        date_or_year: "1946",
        event: "Joined the King's African Rifles (KAR) of the British colonial army as an assistant cook.",
        importance: "high",
        sources: ["Kyemba (1977)", "Decalo (1989)"]
      },
      {
        date_or_year: "1971-01-25",
        event: "Launched a successful military coup while President Milton Obote was abroad, seizing absolute power.",
        importance: "high",
        sources: ["Coup logs", "Kyemba (1977)"]
      },
      {
        date_or_year: "1972-08",
        event: "Ordered the sudden, complete expulsion of Uganda's 50,000 Asian (predominantly Indian) minority, giving them 90 days to leave.",
        importance: "high",
        sources: ["State decrees", "Decalo (1989)"]
      },
      {
        date_or_year: "1976-07",
        event: "Allowed Palestinian hijackers to land a French airliner at Entebbe Airport; faced a humiliating Israeli commando rescue raid (Operation Entebbe).",
        importance: "high",
        sources: ["Entebbe raid logs", "Decalo (1989)"]
      },
      {
        date_or_year: "1978-10",
        event: "Launched a highly erratic, unprovoked invasion of neighboring Tanzania to annex the Kagera region.",
        importance: "high",
        sources: ["Axworthy (2013)", "Decalo (1989)"]
      },
      {
        date_or_year: "1979-04-11",
        event: "Deposed by invading Tanzanian troops and Ugandan rebels; fled into exile to Libya and later Saudi Arabia.",
        importance: "high",
        sources: ["Kyemba (1977)"]
      },
      {
        date_or_year: "2003-08-16",
        event: "Passed away in Jeddah, Saudi Arabia, from organ failure; never faced trial for his crimes.",
        importance: "high",
        sources: ["Jeddah hospital records", "Milani (2011)"]
      }
    ],
    power_base: "Absolute personal command over the military, particularly elite northern-ethnic (Kakwa and Nubian) military police units, systematic elimination of rival ethnic officers, and early Cold War shifting alliances.",
    core_goals: [
      "Maintain absolute personal dictatorial power in Uganda at any cost.",
      "Execute rapid, aggressive redistribution of minority wealth (Asian businesses) to secure military loyalty.",
      "Suppress and physically eliminate all political, ethnic, and intellectual opposition."
    ],
    incentives: [
      "Eradicating the post-colonial political dominance of southern ethnic groups (Acholi/Lango).",
      "Attaining personal prestige and absolute wealth.",
      "Cultivating a highly populist, anti-imperialist international persona."
    ],
    constraints: [
      "Severe financial bankruptcy and systemic economic collapse caused by the sudden loss of Asian business managers.",
      "Severe internal military mutinies and ethnic clashes within the army.",
      "Total international isolation, eventually culminating in a direct military invasion by neighboring Tanzania."
    ],
    allies: ["Muammar Gaddafi (early sponsor)", "State Security Committee (SRB)"],
    rivals: ["Milton Obote (deposed president)", "Julius Nyerere (Tanzanian President)", "Israel", "Internal rebel factions"],
    institutions_controlled_or_influenced: ["Ugandan Armed Forces", "State Research Bureau (SRB)", "Public Safety Unit (PSU)", "Organization of African Unity (formerly chair)"],
    ideology_or_worldview: {
      summary: "Violent, opportunistic militarism and extreme ethnic nationalism, combining aggressive anti-Western anti-imperialist rhetoric with ethnic favoritism, anti-intellectualism, and state-sponsored terror.",
      evidence: [
        "The expulsion of 50,000 Asians under the guise of 'economic war'.",
        "The systematic, state-executed murder of an estimated 300,000 to 500,000 Ugandan citizens."
      ],
      confidence: "high"
    },
    decision_patterns: [
      {
        pattern: "Highly erratic, unpredictable, and impulsive decision-making based on personal whim, ethnic paranoia, and extreme anti-intellectualism, completely bypassing civil planning structures in favor of immediate decrees.",
        examples: [
          "Expelling the entire Asian population after claiming God spoke to him in a dream.",
          "Invading Tanzania in 1978 to distract his mutinous soldiers, despite having a bankrupt treasury."
        ],
        confidence: "high"
      }
    ],
    crisis_behavior: "Exhibited extreme paranoia, media defiance, and personal isolation in crises, launching brutal domestic purges of suspected traitors while claiming increasingly bizarre international titles.",
    negotiation_style: "highly bizarre, theatrical, and unpredictable; combining aggressive insults to Western leaders (e.g. Queen Elizabeth II) with sudden declarations of peace, while remaining completely untrustworthy.",
    risk_tolerance: "high",
    centralization_preference: "high",
    conflict_preference: "high",
    institutional_respect: "low",
    coalition_dependency: "low",
    populism_level: "high",
    technocratic_level: "low",
    game_theory_profile: {
      main_players: ["Idi Amin", "Tanzania (Nyerere)", "Ugandan Rebels", "Western Powers"],
      likely_objectives: [
        "Amin: Maintain power, plunder state treasury, secure military loyalty.",
        "Nyerere: Restore stable neighbor, depose Amin, protect borders.",
        "Rebels: Overthrow Amin, restore constitutional rule."
      ],
      payoffs: [
        "Economic War Plunder: Expelling the Asians successfully redistributed valuable shops to his loyal officers, buying short-term military loyalty but triggering a total long-term collapse of tax revenues (Negative payoff)."
      ],
      constraints: ["Total economic collapse and fuel shortages severely constrained the mobility of his armored military units in 1979."],
      common_strategic_moves: ["Impulsive state decrees", "Ethnic purges", "Erratic border invasions"],
      failure_modes: ["His erratic invasion of Tanzania in 1978 crossed Nyerere's red line, prompting a full-scale counter-invasion that easily swept away his demoralized, bankrupt army in 1979."]
    },
    bayesian_assessment: [
      {
        claim: "Idi Amin was a cannibal who kept the severed heads of political enemies in his palace refrigerator.",
        prior_confidence: "low",
        evidence: [
          "The extensive post-regime memoirs of his ministers (Henry Kyemba) and international media reports claiming he privately boasted of eating human flesh.",
          "The lack of verified, contemporary physical evidence or photographic proof of refrigeration chambers during the post-coup investigations, though his extreme brutality and murders of figures like Chief Justice Kiwanuka are fully documented."
        ],
        posterior_confidence: "medium",
        what_would_change_this: "Discovery of contemporary, verified secret police logs or medical testimonies from 1970s Kampala confirming he practiced ritual cannibalism."
      }
    ],
    historical_comparisons: [
      {
        compared_to: "Jean-Bédel Bokassa",
        similarities: [
          "Post-colonial African military dictators who launched coups to depose civilian governments.",
          "Both ruled through extreme personal terror, eccentric grandiosity, and bizarre international theater, leading to total economic ruin."
        ],
        differences: [
          "Bokassa declared himself Emperor in a multi-million dollar coronation, whereas Amin styled himself as the 'Conqueror of the British Empire'."
        ],
        confidence: "high"
      }
    ],
    source_quality: {
      overall: "medium",
      notes: "Highly reliant on memoirs of escaped ministers, foreign intelligence logs, and human rights reports, requiring careful cross-referencing due to the highly sensationalized nature of contemporary media.",
      source_count: 5
    },
    sources: [
      "Kyemba, Henry. (1977). State of Blood: The Inside Story of Idi Amin.",
      "Decalo, Samuel. (1989). Psychotic Dictatorships in Africa.",
      "Mamdani, Mahmood. (1983). Imperialism and Fascism in Uganda.",
      "Grahame, Iain. (1980). Amin and Uganda: A Personal Memoir.",
      "Human Rights Watch/Amnesty International reports on Uganda (1970s)."
    ],
    research_gaps: ["The exact number of casualties (300,000 vs 500,000) remains difficult to verify precisely due to the destruction of state records in 1979."],
    created_at: "2026-05-31T21:31:33Z",
    updated_at: "2026-05-31T21:31:33Z"
  },

  // 12. Getúlio Vargas
  {
    person_id: "getulio_vargas",
    name: "Getúlio Vargas",
    aliases: ["The Father of the Poor", "O Pai dos Pobres"],
    birth_year: 1882,
    death_year: 1954,
    countries_or_regions: ["Brazil", "Latin America"],
    era: "20th Century / Vargas Era / Estado Novo / Cold War",
    roles: ["President of Brazil", "Dictator of Brazil"],
    domains: ["Geopolitics", "Statecraft", "Economy"],
    priority_tier: 2,
    short_summary: "President and dictator of Brazil who ruled for 19 years across two periods, led the Revolution of 1930, built the centralized 'Estado Novo', industrialized the economy, and created modern labor laws.",
    timeline: [
      {
        date_or_year: "1930-11-03",
        event: "Led the Revolution of 1930, deposing President Washington Luís and ending the 'Old Republic'.",
        importance: "high",
        sources: ["Skidmore (1967)", "Levine (1998)"]
      },
      {
        date_or_year: "1932",
        event: "Brutally suppressed the Constitutionalist Revolution launched by the elite state of São Paulo.",
        importance: "high",
        sources: ["Skidmore (1967)"]
      },
      {
        date_or_year: "1937-11-10",
        event: "Launched a self-coup, dissolved congress, and proclaimed the corporatist 'Estado Novo' (New State) dictatorship.",
        importance: "high",
        sources: ["State proclamations", "Levine (1998)"]
      },
      {
        date_or_year: "1942-08-22",
        event: "Declared war on the Axis powers, sending the Brazilian Expeditionary Force (FEB) to fight in Italy.",
        importance: "high",
        sources: ["FEB archives", "Skidmore (1967)"]
      },
      {
        date_or_year: "1945-10-29",
        event: "Deposed in a military coup by his own generals as WWII ended.",
        importance: "high",
        sources: ["Skidmore (1967)"]
      },
      {
        date_or_year: "1950",
        event: "Won a democratic national election, returning to the presidency on a highly populist platform.",
        importance: "high",
        sources: ["Election logs", "Levine (1998)"]
      },
      {
        date_or_year: "1953-10-03",
        event: "Signed the law establishing Petrobras, the state oil monopoly, amid intense nationalist campaigning.",
        importance: "high",
        sources: ["Petrobras archives"]
      },
      {
        date_or_year: "1954-08-24",
        event: "Committed suicide by shooting himself in the chest at the Catete Palace, leaving a famous political testament ('I leave life to enter history').",
        importance: "high",
        sources: ["Vargas Testament text", "Skidmore (1967)"]
      }
    ],
    power_base: "Massive popular support among the urban working class (organized through state-controlled unions), the loyalty of the federal military, a centralized technocratic civil bureaucracy, and national industrial elites.",
    core_goals: [
      "Modernize and industrialize Brazil's coffee-dependent agrarian economy through state-led import substitution.",
      "Centralize federal authority, destroying the political hegemony of regional state oligarchies (São Paulo/Minas Gerais).",
      "Incorporate the urban working class into a state-regulated labor framework to prevent communist revolutions."
    ],
    incentives: [
      "Eradicating the corrupt oligarchical 'café com leite' political system.",
      "Achieving national economic sovereignty and heavy industrial self-sufficiency.",
      "Securing his personal legacy as the ultimate builder of modern Brazil."
    ],
    constraints: [
      "Fierce, wealthy resistance from São Paulo coffee oligarchs and traditional liberal elites.",
      "The constant, looming threat of military veto and coups by conservative generals.",
      "Severe financial limits and dependency on foreign industrial technology."
    ],
    allies: ["Brazilian Expeditionary Force", "Dutra (general)", "Urban Labor Union Networks"],
    rivals: ["Luis Carlos Prestes (Communist leader)", "São Paulo Oligarchs", "Carlos Lacerda (journalist/adversary)"],
    institutions_controlled_or_influenced: ["Estado Novo", "Petrobras (founded by him)", "Companhia Siderúrgica Nacional (CSN)", "Ministry of Labor"],
    ideology_or_worldview: {
      summary: "Pragmatic, corporatist developmentalism and welfare-populism, combining centralized state economic planning with state-regulated labor unions, industrial nationalism, and social stability.",
      evidence: [
        "Decreeing the Consolidation of Labor Laws (CLT) in 1943, creating the minimum wage and eight-hour workday.",
        "Establishing the state steel monopoly (CSN) in Volta Redonda through strategic bargaining with the US."
      ],
      confidence: "high"
    },
    decision_patterns: [
      {
        pattern: "Highly agile, pragmatic, and balancing statecraft, playing competing ideological factions (fascists vs liberals, US vs Germany) against each other to extract the highest strategic benefits for Brazilian industrialization.",
        examples: [
          "Bargaining between the US and Germany in the late 1930s to secure US funding for Brazil's first steel mill in exchange for military base rights in Natal.",
          "Systematically co-opting both fascist (Integralists) and communist labor demands into state laws before crushing both movements politically."
        ],
        confidence: "high"
      }
    ],
    crisis_behavior: "Exhibited highly dramatic, calculated, and politically explosive behavior in crises, culminating in his 1954 suicide which turned a looming military coup into a massive wave of public grief that swept away his conservative rivals.",
    negotiation_style: "highly diplomatic, patient, transactional, utilizing personal charm and behind-the-scenes compromises to reconcile regional elites, while presenting himself as the ultimate paternal protector of the working class.",
    risk_tolerance: "high",
    centralization_preference: "high",
    conflict_preference: "medium",
    institutional_respect: "medium",
    coalition_dependency: "high",
    populism_level: "high",
    technocratic_level: "high",
    game_theory_profile: {
      main_players: ["Vargas", "Military Generals", "Regional Oligarchs", "United States (FDR)"],
      likely_objectives: [
        "Vargas: Centralize state, industrialize Brazil, maintain executive power.",
        "Generals: Maintain law and order, prevent communist growth, veto radical reforms.",
        "Oligarchs: Restore regional autonomy, protect agricultural exports."
      ],
      payoffs: [
        "The Steel Mill Bargain Nash Equilibrium: Threatening to buy weapons from Nazi Germany successfully forced the US to fund the CSN steel mill, yielding a massive heavy industrial payoff for Brazil (Highest cooperative payoff)."
      ],
      constraints: ["Military veto power acted as a strict threat constraint that forced Vargas to commit suicide in 1954 rather than face a humiliating military arrest."],
      common_strategic_moves: ["Corporatist labor decrees", "Strategic geopolitical bargaining", "Political martyrdom"],
      failure_modes: ["His reliance on the military to sustain the Estado Novo dictatorship eventually allowed those same generals to easily depose him in 1945 once the war was won."]
    },
    bayesian_assessment: [
      {
        claim: "Vargas was a devout fascist who modeled the Estado Novo directly on Mussolini's Italy.",
        prior_confidence: "medium",
        evidence: [
          "The corporatist CLT labor laws and the highly repressive DIP censorship department which resembled European fascist regimes.",
          "His immediate ban and brutal suppression of Brazil's actual fascist party (the Integralists) in 1938, his declaration of war on the Axis in 1942, and his lifelong pragmatism, showing he used corporatist tools purely for state centralization rather than fascist ideology."
        ],
        posterior_confidence: "low",
        what_would_change_this: "Discovery of private letters to Mussolini proving Vargas planned to annex Brazil to the Axis and adopt racial laws."
      }
    ],
    historical_comparisons: [
      {
        compared_to: "Juan Perón",
        similarities: [
          "Latin American populist presidents who built highly centralized developmentalist states in the mid-20th century.",
          "Both co-opted the working class through major labor laws and state unions to counter regional agricultural elites."
        ],
        differences: [
          "Vargas was a highly cautious, career bureaucrat and lawyer who relied on state planning, whereas Perón was a charismatic military officer who relied on mass rallies."
        ],
        confidence: "high"
      }
    ],
    source_quality: {
      overall: "strong",
      notes: "Rich national archives, his voluminous diaries and suicide letters, and definitive academic works by Thomas Skidmore.",
      source_count: 5
    },
    sources: [
      "Skidmore, Thomas E. (1967). Politics in Brazil, 1930-1964: An Experiment in Democracy.",
      "Levine, Robert M. (1998). Father of the Poor? Getúlio Vargas and His Era.",
      "Williams, Daryle. (2001). Culture Wars in Brazil: The First Vargas Regime, 1930-1945.",
      "Fausto, Boris. (1999). A Concise History of Brazil.",
      "Vargas, Getúlio. Personal Diaries (Centro de Pesquisa e Documentação de História Contemporânea do Brasil - CPDOC)."
    ],
    research_gaps: ["The exact level of his personal knowledge regarding the assassination attempt on Carlos Lacerda in 1954 by his personal guard remains historically debated."],
    created_at: "2026-05-31T21:31:33Z",
    updated_at: "2026-05-31T21:31:33Z"
  },

  // 13. Hugo Chávez
  {
    person_id: "hugo_chavez",
    name: "Hugo Chávez",
    aliases: ["Chávez", "Comandante"],
    birth_year: 1954,
    death_year: 2013,
    countries_or_regions: ["Venezuela", "Latin America", "Global"],
    era: "Late 20th / Early 21st Century / Pink Tide Era",
    roles: ["President of Venezuela", "Lieutenant Colonel in the Venezuelan Army"],
    domains: ["Geopolitics", "Statecraft", "Economy"],
    priority_tier: 1,
    short_summary: "President of Venezuela who launched the Bolivarian Revolution, constructed the 'Socialism of the 21st Century' welfare state, nationalized oil, and led the anti-US leftist 'Pink Tide' in Latin America.",
    timeline: [
      {
        date_or_year: "1992-02-04",
        event: "Led a failed military coup against President Carlos Andrés Pérez; arrested, but his brief televised speech ('por ahora') launched his political career.",
        importance: "high",
        sources: ["Jones (2007)", "Corrales & Penfold (2011)"]
      },
      {
        date_or_year: "1998-12",
        event: "Won the presidential election in a landslide victory on a populist anti-corruption platform.",
        importance: "high",
        sources: ["Election Commission logs"]
      },
      {
        date_or_year: "1999",
        event: "Drafted and passed a new, highly progressive constitution via national referendum, renaming the country the Bolivarian Republic of Venezuela.",
        importance: "high",
        sources: ["1999 Constitution text", "Corrales & Penfold (2011)"]
      },
      {
        date_or_year: "2002-04",
        event: "Briefly deposed in a right-wing military coup; restored to power within 47 hours by massive urban poor protests and loyal guard forces.",
        importance: "high",
        sources: ["Jones (2007)", "Corrales & Penfold (2011)"]
      },
      {
        date_or_year: "2003",
        event: "Launched the 'Misiones' (welfare programs) offering free healthcare and education, funded by massive oil price windfalls.",
        importance: "high",
        sources: ["Misiones archives", "Corrales & Penfold (2011)"]
      },
      {
        date_or_year: "2006",
        event: "Gave a famous speech at the UN General Assembly calling US President George W. Bush 'the devil' ('Yesterday, the devil was here...').",
        importance: "high",
        sources: ["UN transcripts"]
      },
      {
        date_or_year: "2007",
        event: "Nationalized major multi-national oil projects in the Orinoco belt, establishing total PDVSA control.",
        importance: "high",
        sources: ["PDVSA archives"]
      },
      {
        date_or_year: "2013-03-05",
        event: "Passed away in Caracas from cancer; succeeded by his hand-picked vice president Nicolás Maduro.",
        importance: "high",
        sources: ["State funeral logs", "Corrales & Penfold (2011)"]
      }
    ],
    power_base: "Fanatical, highly emotional popularity among the massive urban poor population, complete control over the military (which he heavily politicized), absolute command over the PDVSA state oil monopoly and planning ministries, and the United Socialist Party of Venezuela (PSUV).",
    core_goals: [
      "Establish 'Socialism of the 21st Century' and redistribute Venezuela's massive oil wealth directly to the poor.",
      "Construct a highly centralized, executive-dominated state, systematically dismantling institutional checks and balances.",
      "Build a united, anti-US geopolitical bloc in Latin America (ALBA, UNASUR) utilizing oil diplomacy (Petrocaribe)."
    ],
    incentives: [
      "Eradicating the corrupt two-party 'Puntofijo' political monopoly.",
      "Attaining global leadership of the anti-imperialist, anti-neoliberal movement.",
      "Securing the permanent survival of his Bolivarian socialist revolution."
    ],
    constraints: [
      "Extreme dependency of the entire state budget and welfare system on highly volatile international oil prices.",
      "Severe domestic inflation, food shortages, and massive decline in domestic private agricultural and industrial production.",
      "Fierce, wealthy political and media opposition backed by elite classes and private corporations."
    ],
    allies: ["Fidel Castro (mentor)", "Evo Morales", "Rafael Correa", "Nicolás Maduro"],
    rivals: ["George W. Bush", "Venezuelan Opposition Leaders", "Private Media Conglomerates"],
    institutions_controlled_or_influenced: ["Bolivarian Republic of Venezuela", "PDVSA (State Oil Company)", "United Socialist Party of Venezuela (PSUV)", "Armed Forces of Venezuela"],
    ideology_or_worldview: {
      summary: "Bolivarianism and Socialism of the 21st Century, combining aggressive welfare populism and oil nationalization with military anti-imperialism, Latin American integration, and participatory democracy under a charismatic leader.",
      evidence: [
        "Creating the communal councils and Misiones (healthcare/literacy) bypass traditional ministries.",
        "Renaming the country and altering the national flag to reflect Bolivarian symbols."
      ],
      confidence: "high"
    },
    decision_patterns: [
      {
        pattern: "Highly personalized, impulsive, and televised decision-making (exemplified on his weekly show 'Aló Presidente'), announcing multi-million dollar investments and expropriations of private companies on live TV, bypassing all formal cabinet planning.",
        examples: [
          "Expropriating massive private cement and steel plants on live television.",
          "Sacking 18,000 striking PDVSA technicians on TV using a whistle in 2003."
        ],
        confidence: "high"
      }
    ],
    crisis_behavior: "Exhibited highly dramatic, charismatic resilience in major crises, mobilizing massive, poor urban loyalists and patriotic military guard officers to defeat the 2002 coup and the 2003 general strike.",
    negotiation_style: "highly polarizing, theatrical, utilizing aggressive anti-imperialist rhetoric to rally public support, while showing absolute unyieldingness to domestic political opposition, framing them as oligarchical traitors.",
    risk_tolerance: "high",
    centralization_preference: "high",
    conflict_preference: "high",
    institutional_respect: "low",
    coalition_dependency: "high",
    populism_level: "high",
    technocratic_level: "low",
    game_theory_profile: {
      main_players: ["Chávez", "Venezuelan Opposition", "United States", "PDVSA Technocrats"],
      likely_objectives: [
        "Chávez: Consolidate socialist revolution, control oil revenues, eliminate checks and balances.",
        "Opposition: Force recall referendums, protect private property, restore liberal democracy.",
        "US: Contain Venezuelan regional influence, secure oil exports."
      ],
      payoffs: [
        "Oil Welfare Nash Equilibrium: Directing massive oil revenues into immediate cash and welfare subsidies successfully bypassed traditional state ministries, securing a highly loyal voter payoff that repeatedly won national elections (Highest electoral payoff)."
      ],
      constraints: ["Severe decline in PDVSA technical competence post-2003 acted as a strict threat constraint that eventually degraded oil production capacity."],
      common_strategic_moves: ["Televised expropriations", "Constitutional referendums", "Oil diplomacy (ALBA)"],
      failure_modes: ["His massive price controls and currency interventions destroyed domestic private industries, locking Venezuela into a fragile, hyper-dependent oil monoculture that collapsed catastrophically under his successor once oil prices fell."]
    },
    bayesian_assessment: [
      {
        claim: "Chávez was a classical communist puppet of Cuba who sought to build a Soviet-style totalitarian state.",
        prior_confidence: "low",
        evidence: [
          "His close personal alliance with Fidel Castro and the presence of thousands of Cuban medical and security personnel in Venezuela.",
          "His preservation of a substantial (though heavily regulated) private merchant sector, his constant reliance on national democratic elections and referendums to legitimize his power, and his primary ideological roots in Latin American military nationalism (Bolivar/Peron) rather than Marxist-Leninist internationalism."
        ],
        posterior_confidence: "low",
        what_would_change_this: "Discovery of verified, secret PSUV plans showing Chávez intended to completely outlaw private property and abolish all national elections."
      }
    ],
    historical_comparisons: [
      {
        compared_to: "Juan Perón",
        similarities: [
          "Charismatic, military-born Latin American populist presidents who overthrew traditional party systems.",
          "Both nationalized key sectors, redistributed massive natural resource windfalls directly to the working class, and built highly emotional, personalized political movements."
        ],
        differences: [
          "Chávez operated in a highly globalized media age and built a much larger regional geopolitical alliance (ALBA) using direct oil subsidies."
        ],
        confidence: "high"
      }
    ],
    source_quality: {
      overall: "strong",
      notes: "Rich electoral logs, abundant international economic reports, and definitive academic studies of the Bolivarian Revolution by Corrales and Penfold.",
      source_count: 5
    },
    sources: [
      "Corrales, Javier & Penfold, Michael. (2011). Dragon in the Tropics: Hugo Chávez and the Political Economy of Revolution in Venezuela.",
      "Jones, Bart. (2007). Hugo! The Hugo Chávez Story from Mud Hut to Perpetual Power.",
      "Wilpert, Gregory. (2007). Changing Venezuela by Taking Power: The History and Policies of the Chávez Government.",
      "Gott, Richard. (2005). Hugo Chávez and the Bolivarian Revolution.",
      "Weyland, Kurt. (2001). The Politics of Populism in Latin America."
    ],
    research_gaps: ["The exact details of his medical treatment in Cuba and the precise timeline of his final weeks of life remain closely guarded state secrets in Caracas."],
    created_at: "2026-05-31T21:31:33Z",
    updated_at: "2026-05-31T21:31:33Z"
  },

  // 14. Salvador Allende
  {
    person_id: "salvador_allende",
    name: "Salvador Allende",
    aliases: ["Allende"],
    birth_year: 1908,
    death_year: 1973,
    countries_or_regions: ["Chile", "Latin America"],
    era: "20th Century / Cold War Era / Chilean Socialist Era",
    roles: ["President of Chile", "Senator of Chile", "Minister of Health"],
    domains: ["Geopolitics", "Statecraft", "Economy"],
    priority_tier: 2,
    short_summary: "Marxist President of Chile who sought to establish a socialist society through democratic constitutional means, nationalized copper, and was deposed in a bloody 1973 military coup.",
    timeline: [
      {
        date_or_year: "1937",
        event: "Elected to the Chamber of Deputies; co-founded the Socialist Party of Chile.",
        importance: "high",
        sources: ["Collier & Sater (2004)", "Allende text"]
      },
      {
        date_or_year: "1970-09-04",
        event: "Won the presidency with a narrow plurality (36.6%) leading the Unidad Popular (Popular Unity) coalition.",
        importance: "high",
        sources: ["Election Commission logs", "Collier & Sater (2004)"]
      },
      {
        date_or_year: "1971-07-11",
        event: "Signed the constitutional amendment nationalizing all major foreign-owned copper mines with unanimous parliamentary approval.",
        importance: "high",
        sources: ["Constitutional amendments", "Sigmund (1977)"]
      },
      {
        date_or_year: "1972",
        event: "Faced severe economic paralysis, rampant inflation, and a major CIA-funded truck drivers' strike.",
        importance: "high",
        sources: ["Kornbluh (2003)", "Sigmund (1977)"]
      },
      {
        date_or_year: "1973-09-11",
        event: "Deposed in a bloody military coup led by General Augusto Pinochet; committed suicide with an AK-47 inside the burning La Moneda Presidential Palace.",
        importance: "high",
        sources: ["Autopsy reports", "Kornbluh (2003)", "Collier & Sater (2004)"]
      }
    ],
    power_base: "Loyalty of the Chilean working class and organized labor unions, the Unidad Popular leftist coalition, and deep respect for Chile's traditional constitutional democracy.",
    core_goals: [
      "Transition Chile to a socialist society ('the Chilean road to socialism') using existing democratic, constitutional institutions.",
      "Nationalize all major heavy industries, copper mines, banks, and large agricultural estates.",
      "Improve the nutritional, educational, and housing standards of the poorest Chilean classes."
    ],
    incentives: [
      "Eradicating the economic dominance of foreign multi-nationals and local landowning oligarchies.",
      "Providing a democratic, non-violent model of Marxist transition that bypassed Soviet-style dictatorship.",
      "Securing social justice and wealth redistribution."
    ],
    constraints: [
      "Fierce, unyielding political gridlock and majority opposition in the Chilean Congress.",
      "A massive, covert campaign of economic destabilization and funding of opposition strikes by the US CIA.",
      "Severe domestic inflation, price distortions, and food shortages caused by rapid state spending and price controls."
    ],
    allies: ["Unidad Popular Coalition", "Leftist Labor Unions", "Fidel Castro (friendly partner)"],
    rivals: ["Richard Nixon", "Augusto Pinochet (coup general)", "Christian Democratic Party", "CIA Planners"],
    institutions_controlled_or_influenced: ["Republic of Chile", "Socialist Party of Chile", "Unidad Popular Coalition", "CYBERSYN (pioneering computer planning network)"],
    ideology_or_worldview: {
      summary: "Democratic Socialism and Marxism, prioritizing transition to socialism through established constitutional channels, absolute preservation of pluralist liberties, and national economic sovereignty.",
      evidence: [
        "His historic first address to Congress (1971) articulating the unique 'Chilean road to socialism'.",
        "Refusing to form armed workers' militias to fight the military, insisting on constitutional loyalty."
      ],
      confidence: "high"
    },
    decision_patterns: [
      {
        pattern: "Strict adherence to legal and constitutional procedures to execute radical economic reforms, combined with an insistence on maintaining democratic liberties even as the state faced total economic and military paralysis.",
        examples: [
          "Refusing to bypass Congress to rule by decree, despite severe legislative gridlock.",
          "Using Cybersyn (a decentralized cybernetic planning network) to manage industrial distribution during strikes."
        ],
        confidence: "high"
      }
    ],
    crisis_behavior: "Exhibited heroic, absolute moral courage during the 1973 coup, refusing to surrender or flee the country, giving a famous farewell broadcast over radio, and dying defending the presidential palace.",
    negotiation_style: "highly diplomatic, parliamentary, seeking to reach compromises with the Christian Democrats to preserve the democratic system, while refusing to compromise on the nationalization of copper.",
    risk_tolerance: "high",
    centralization_preference: "medium",
    conflict_preference: "low",
    institutional_respect: "high",
    coalition_dependency: "high",
    populism_level: "high",
    technocratic_level: "high",
    game_theory_profile: {
      main_players: ["Allende", "Pinochet/Military", "United States (Nixon/CIA)", "Christian Democrats"],
      likely_objectives: [
        "Allende: Transition to socialism constitutionally, avoid civil war, preserve democracy.",
        "Military: Depose Allende, restore capitalist order, suppress leftist parties.",
        "US: Destroy Allende's socialist model, protect corporate investments, contain Marxism."
      ],
      payoffs: [
        "Uncompromising Constitutionalism: Refusing to arm the working class successfully preserved his democratic integrity but left him completely defenseless against a conventional military coup, yielding a tragic geopolitical payoff (Negative tactical payoff)."
      ],
      constraints: ["US-led international credit embargo and CIA-funded strikes acted as a strict threat constraint that paralyzed the economy."],
      common_strategic_moves: ["Constitutional reforms", "State nationalization of copper", "Televised strikes management"],
      failure_modes: ["His belief that the Chilean military would respect its traditional non-political constitutional role (Schneider Doctrine) allowed Pinochet to organize the coup in absolute secrecy, destroying the regime."]
    },
    bayesian_assessment: [
      {
        claim: "Allende was planning a violent, Cuban-style communist dictatorship in Chile.",
        prior_confidence: "low",
        evidence: [
          "The extreme rhetoric of radical factions within his coalition (like the MIR) calling for armed revolution.",
          "His consistent, lifelong career as a constitutional senator, his refusal to suspend civil liberties, censor opposition media, or form workers' militias even when urged by Castro, and his planned announcement of a national plebiscite to resolve the crisis on the day of the coup, showing deep commitment to democratic channels."
        ],
        posterior_confidence: "low",
        what_would_change_this: "Discovery of verified, secret Unidad Popular military orders signed by Allende planning a violent purge of Congress and the execution of military officers in September 1973."
      }
    ],
    historical_comparisons: [
      {
        compared_to: "Alexander Dubček",
        similarities: [
          "Leftist leaders who sought to build humane, democratic socialist systems (Socialism with a human face/Chilean road).",
          "Both faced overwhelming, violent military interventions (Warsaw Pact/Pinochet) backed by global superpowers."
        ],
        differences: [
          "Allende died fighting in his burning palace, whereas Dubček was arrested and politically sidelined."
        ],
        confidence: "high"
      }
    ],
    source_quality: {
      overall: "strong",
      notes: "Abundant declassified CIA documents (The Hinchey Report), Chilean parliamentary logs, and definitive historical studies of the coup by Peter Kornbluh.",
      source_count: 5
    },
    sources: [
      "Kornbluh, Peter. (2003). The Pinochet File: A Declassified Files on Atrocity and Accountability.",
      "Sigmund, Paul E. (1977). The Overthrow of Allende and the Politics of Chile, 1964-1976.",
      "Collier, Simon & Sater, William F. (2004). A History of Chile, 1808-2002.",
      "Declassified US National Security Archive Documents on Chile (Nixon/Kissinger papers).",
      "Allende, Salvador. (1973). Farewell Address to the Nation (Speech transcripts)."
    ],
    research_gaps: ["Determining the exact degree of coordination between Pinochet and CIA planners on the specific morning of September 11 remains a subject of ongoing historical analysis."],
    created_at: "2026-05-31T21:31:33Z",
    updated_at: "2026-05-31T21:31:33Z"
  },

  // 15. Augusto Pinochet
  {
    person_id: "augusto_pinochet",
    name: "Augusto Pinochet",
    aliases: ["Pinochet"],
    birth_year: 1915,
    death_year: 2006,
    countries_or_regions: ["Chile", "Latin America"],
    era: "Late 20th Century / Cold War / Military Dictatorship Era",
    roles: ["President of Chile", "Commander-in-Chief of the Chilean Army", "Head of the Military Junta"],
    domains: ["Geopolitics", "Statecraft", "Economy"],
    priority_tier: 2,
    short_summary: "Military dictator of Chile who seized power in the 1973 coup, established a highly repressive military junta, introduced radical neoliberal economic reforms under the 'Chicago Boys', and stepped down in 1990.",
    timeline: [
      {
        date_or_year: "1973-08-23",
        event: "Appointed Commander-in-Chief of the Army by President Salvador Allende, who trusted his constitutional loyalty.",
        importance: "high",
        sources: ["Collier & Sater (2004)"]
      },
      {
        date_or_year: "1973-09-11",
        event: "Led the bloody military coup that assaulted the La Moneda Palace and deposed President Allende.",
        importance: "high",
        sources: ["Kornbluh (2003)", "Collier & Sater (2004)"]
      },
      {
        date_or_year: "1973-1990",
        event: "Ruled Chile as head of the military junta, executing a brutal campaign of political repression and disappearances.",
        importance: "high",
        sources: ["Valech Report", "Rettig Report"]
      },
      {
        date_or_year: "1975",
        event: "Adopted radical neoliberal economic reforms ('Shock Therapy') proposed by Chicago School economists (Chicago Boys).",
        importance: "high",
        sources: ["Valdes (1995)"]
      },
      {
        date_or_year: "1980",
        event: "Passed a new, highly conservative constitution that cemented military veto power and his own lifetime senate seat.",
        importance: "high",
        sources: ["1980 Constitution text"]
      },
      {
        date_or_year: "1988-10-05",
        event: "Lost a historic national plebiscite (Yes/No vote) on extending his presidency, initiating the transition to democracy.",
        importance: "high",
        sources: ["Plebiscite logs", "Collier & Sater (2004)"]
      },
      {
        date_or_year: "1998-10-16",
        event: "Arrested in London on a Spanish warrant for human rights abuses under universal jurisdiction, a landmark legal precedent.",
        importance: "high",
        sources: ["House of Lords rulings", "Kornbluh (2003)"]
      },
      {
        date_or_year: "2006-12-10",
        event: "Passed away in Santiago; never convicted in court for his human rights crimes or secret bank accounts (Riggs Bank).",
        importance: "high",
        sources: ["Riggs Bank investigation logs", "Collier & Sater (2004)"]
      }
    ],
    power_base: "Absolute, unified control over the Chilean military forces and police, the repressive DINA secret police apparatus, backing of wealthy business elites and landowners, and strategic anti-communist support from the US during the Cold War.",
    core_goals: [
      "Eradicate all Marxist, socialist, and leftist parties and labor unions in Chile.",
      "Re-establish a highly stable, private-property capitalist economic order through radical deregulation and privatization.",
      "Construct a highly conservative constitutional order that permanently insulated state sovereignty from popular left-wing movements."
    ],
    incentives: [
      "Preventing a perceived Cuban-style communist takeover of Chile.",
      "Securing the wealth and corporate interests of elite classes.",
      "Maintaining his personal immunity from prosecution."
    ],
    constraints: [
      "Severe international condemnation, boycotts, and legal investigations for human rights atrocities.",
      "The massive economic shock and high unemployment caused by early neoliberal reforms.",
      "The legal and political limits of his own 1980 Constitution, which forced him to respect the 1988 plebiscite loss."
    ],
    allies: ["Milton Friedman (advisor)", "DINA Secret Police", "Chicago Boys (economists)", "Margaret Thatcher (foreign ally)"],
    rivals: ["Salvador Allende (deposed president)", "Manuel Contreras (SAVAK-style DINA chief/rival)", "Leftist Resistance Movements (FPMR)", "Christian Democratic Party"],
    institutions_controlled_or_influenced: ["Chilean Armed Forces", "DINA (Secret Police)", "Central Bank of Chile", "Senate of Chile (formerly Senator-for-life)"],
    ideology_or_worldview: {
      summary: "Violent anti-communist militarism combined with extreme free-market neoliberalism, authoritarian nationalism, social conservatism, and technocratic economic planning under Chicago School principles.",
      evidence: [
        "Systematically privatizing state industries, health care, and the national pension system.",
        "Establishing the DINA secret police to systematically disappear over 3,000 political opponents."
      ],
      confidence: "high"
    },
    decision_patterns: [
      {
        pattern: "Brutal, highly repressive top-down authoritarianism combined with complete delegation of economic policy to specialized technocrats (Chicago Boys), ensuring state force protected market reforms.",
        examples: [
          "Dissolving all political parties and labor unions immediately in 1973.",
          "Allowing economists to implement 'Shock Therapy' in 1975, despite massive, immediate spikes in unemployment."
        ],
        confidence: "high"
      }
    ],
    crisis_behavior: "Exhibited highly defiant, aggressive behavior under international pressure, framing human rights investigations as Marxist conspiracies, while showing calculating legal pragmatism to secure lifetime immunity.",
    negotiation_style: "absolute, uncompromising, backed by absolute state violence, refusing any peer dialogues with leftist or democratic opponents, while maintaining transactional alliances with international anti-communist leaders.",
    risk_tolerance: "high",
    centralization_preference: "high",
    conflict_preference: "high",
    institutional_respect: "low",
    coalition_dependency: "low",
    populism_level: "low",
    technocratic_level: "high",
    game_theory_profile: {
      main_players: ["Pinochet", "Chicago Boys", "Democratic Opposition", "United States"],
      likely_objectives: [
        "Pinochet: Eliminate Marxism, maintain absolute power, secure lifetime immunity.",
        "Chicago Boys: Implement radical free-market reforms, privatize economy.",
        "Opposition: Restore democracy, prosecute human rights crimes."
      ],
      payoffs: [
        "The Chicago Shock Nash Equilibrium: Utilizing absolute military terror to suppress labor union strikes successfully allowed the implementation of radical neoliberal reforms without public resistance, yielding a modernized capitalist economy (Highest corporate payoff)."
      ],
      constraints: ["The explicit legal structures of his own 1980 Constitution acted as a strict threat constraint that forced Pinochet to step down after losing the 1988 plebiscite to avoid a coup by other generals who feared civil war."],
      common_strategic_moves: ["Military junta decrees", "Secret police disappearances", "Neoliberal privatizations"],
      failure_modes: ["His arrogance in allowing the 1988 plebiscite (believing he would easily win) resulted in a shocking loss, ending his dictatorship democratically."]
    },
    bayesian_assessment: [
      {
        claim: "Pinochet saved Chile from a catastrophic economic collapse and built its modern economic miracle.",
        prior_confidence: "medium",
        evidence: [
          "The rapid GDP growth, export diversification, and low inflation achieved by Chile in the late 1980s and 1990s compared to other debt-ridden Latin American nations.",
          "The severe economic collapse of 1982 (where GDP fell 14% and the state had to nationalize the bankrupt banks anyway), and the massive, permanent increase in inequality, poverty, and systemic underfunding of public health and education, showing the 'miracle' had massive human costs."
        ],
        posterior_confidence: "medium",
        what_would_change_this: "Discovery of verified economic data showing Chile's economic growth was identical to regional peers without any neoliberal reforms."
      }
    ],
    historical_comparisons: [
      {
        compared_to: "Francisco Franco",
        similarities: [
          "Ultra-conservative, anti-communist military generals who launched bloody coups against democratic governments.",
          "Both ruled through extreme personal terror, eliminated leftists, and eventually transitioned their countries back to constitutional systems."
        ],
        differences: [
          "Franco maintained a traditional, corporatist state-dominated economy for decades, whereas Pinochet pioneered radical free-market globalization."
        ],
        confidence: "high"
      }
    ],
    source_quality: {
      overall: "strong",
      notes: "Definitive national truth commissions (Rettig and Valech reports), declassified US archives, Riggs Bank financial logs, and major studies of the Chicago Boys by Juan Valdés.",
      source_count: 5
    },
    sources: [
      "Kornbluh, Peter. (2003). The Pinochet File: A Declassified Files on Atrocity and Accountability.",
      "Valdés, Juan Gabriel. (1995). Pinochet's Economists: The Chicago School in Chile.",
      "Collier, Simon & Sater, William F. (2004). A History of Chile, 1808-2002.",
      "Rettig Report (National Commission for Truth and Reconciliation) (1991).",
      "Valech Report (National Commission on Political Imprisonment and Torture) (2004)."
    ],
    research_gaps: ["The exact details of Pinochet's secret personal wealth (estimated at $21 million in Riggs Bank accounts) and the full extent of weapons-grade chemical programs (sarin gas) developed by the DINA remain partially unverified."],
    created_at: "2026-05-31T21:31:33Z",
    updated_at: "2026-05-31T21:31:33Z"
  },

  // 16. Benito Juárez
  {
    person_id: "benito_juarez",
    name: "Benito Juárez",
    aliases: ["Juárez", "Benemérito de las Américas"],
    birth_year: 1806,
    death_year: 1872,
    countries_or_regions: ["Mexico", "Latin America"],
    era: "19th Century / La Reforma / French Intervention",
    roles: ["President of Mexico", "Chief Justice of the Supreme Court of Mexico"],
    domains: ["Geopolitics", "Statecraft", "Law"],
    priority_tier: 2,
    short_summary: "Five-term President of Mexico of Zapotec origin who led 'La Reforma' secularization, successfully resisted the French intervention and the puppet empire of Maximilian, and consolidated the Mexican liberal republic.",
    timeline: [
      {
        date_or_year: "1831",
        event: "Graduated with a law degree, championing the rights of poor indigenous Zapotec peasants.",
        importance: "high",
        sources: ["Hamnett (1994)", "Scholes (1957)"]
      },
      {
        date_or_year: "1955",
        event: "Drafted the 'Ley Juárez' (Juárez Law), abolishing special military and ecclesiastical courts.",
        importance: "high",
        sources: ["Ley Juárez text", "Hamnett (1994)"]
      },
      {
        date_or_year: "1858-01-15",
        event: "Assumed the presidency after the conservative coup, initiating the War of the Reform.",
        importance: "high",
        sources: ["Hamnett (1994)"]
      },
      {
        date_or_year: "1859",
        event: "Issued the Reform Laws in Veracruz, nationalizing all church property and completely separating church and state.",
        importance: "high",
        sources: ["Reform Laws decrees", "Scholes (1957)"]
      },
      {
        date_or_year: "1862-1867",
        event: "Led the republican resistance against the invading French military forces of Napoleon III.",
        importance: "high",
        sources: ["Hamnett (1994)", "Scholes (1957)"]
      },
      {
        date_or_year: "1867-06-19",
        event: "Ordered the execution of the captured puppet Emperor Maximilian I in Querétaro, asserting absolute Mexican sovereignty.",
        importance: "high",
        sources: ["Execution records", "Hamnett (1994)"]
      },
      {
        date_or_year: "1872-07-18",
        event: "Passed away in office at the National Palace in Mexico City from a heart attack; mourned nationally.",
        importance: "high",
        sources: ["National Palace logs", "Scholes (1957)"]
      }
    ],
    power_base: "Unyielding loyalty of the Mexican liberal party network, the federal republican army, the indigenous peasant population, and strategic diplomatic recognition from the United States (Lincoln administration).",
    core_goals: [
      "Establish a modern, secular, and liberal democratic republic in Mexico, permanently separating church and state.",
      "Abolish all feudal, ecclesiastical, and military legal privileges (fueros) that blocked indigenous integration.",
      "Defeat foreign imperialist invasions and preserve Mexico's absolute sovereign geographic integrity."
    ],
    incentives: [
      "Eradicating the massive, paralyzing wealth and land monopoly of the Catholic Church.",
      "Overcoming the historical oppression of Mexico's indigenous populations.",
      "Preventing European monarchical colonization of the Americas."
    ],
    constraints: [
      "Total fiscal bankruptcy of the Mexican state treasury during his entire presidency.",
      "Fierce, wealthy military resistance from conservative elites who allied with the French invaders.",
      "Extreme geographical splits and lack of transport infrastructure across Mexico."
    ],
    allies: ["Melchor Ocampo (reformer)", "Abraham Lincoln (diplomatic sponsor)", "Porfirio Díaz (military general/later rival)"],
    rivals: ["Emperor Maximilian I (puppet ruler)", "Napoleon III of France", "Miguel Miramón (conservative general)"],
    institutions_controlled_or_influenced: ["Republic of Mexico", "Liberal Party of Mexico", "Supreme Court of Mexico"],
    ideology_or_worldview: {
      summary: "Strict constitutional liberalism and secularism, prioritizing the rule of law, the complete subordination of the military and church to civil authority, individual property rights, and national sovereignty.",
      evidence: [
        "Promulgating the Constitution of 1857 which codified basic civil liberties and anti-clerical laws.",
        "His famous maxim: 'Among individuals, as among nations, respect for the rights of others is peace' ('El respeto al derecho ajeno es la paz')."
      ],
      confidence: "high"
    },
    decision_patterns: [
      {
        pattern: "Iron-willed, highly legalistic, and unyielding decision-making, refusing to surrender or make concessions even when forced to flee the capital and govern from a traveling carriage (the 'republic on wheels').",
        examples: [
          "Refusing to commute the death sentence of Emperor Maximilian I, despite intense diplomatic appeals from Victor Hugo and European monarchs, to prove foreign intervention was fatal.",
          "Signing the MacLane-Ocampo Treaty in 1859 to secure US financial aid during the Reform War (highly controversial strategic move)."
        ],
        confidence: "high"
      }
    ],
    crisis_behavior: "Exhibited extraordinary, legendary resilience and absolute calm in extreme crises, maintaining the moral and legal continuity of the Mexican Republic during years of French occupation.",
    negotiation_style: "highly formal, legalistic, backed by constitutional law, refusing any compromises with conservative monarchists or foreign empires that challenged Mexican sovereignty.",
    risk_tolerance: "high",
    centralization_preference: "medium",
    conflict_preference: "medium",
    institutional_respect: "high",
    coalition_dependency: "high",
    populism_level: "high",
    technocratic_level: "medium",
    game_theory_profile: {
      main_players: ["Mexican Liberals (Juárez)", "Mexican Conservatives", "French Empire (Napoleon III)", "United States"],
      likely_objectives: [
        "Juárez: Preserve liberal republic, defeat French invasion, secularize state.",
        "Conservatives: Restore monarchical privileges, protect Church wealth.",
        "French: Build regional imperial buffer, collect Mexican debts."
      ],
      payoffs: [
        "Executions of Maximilian Nash Equilibrium: Ordering the execution of the French puppet emperor successfully sent an absolute warning that foreign intervention was structurally fatal, permanently ending European monarchical plots in the Americas (Highest sovereignty payoff)."
      ],
      constraints: ["Total state bankruptcy forced dependency on US diplomatic and weapons support."],
      common_strategic_moves: ["Reform decrees", "Guerrilla resistance coordination", "Diplomatic legalism"],
      failure_modes: ["His late-career insistence on repeated presidential re-elections alienated progressive liberals, sparking early revolts by generals like Porfirio Díaz."]
    },
    bayesian_assessment: [
      {
        claim: "Juárez's land reforms (Ley Lerdo) successfully liberated the indigenous peasants from agrarian poverty.",
        prior_confidence: "low",
        evidence: [
          "The liberal goal of the Ley Lerdo to force the sale of corporate lands, including Church estates.",
          "The legal fact that the law also forced the privatization of communal indigenous lands (ejidos), allowing wealthy land speculators to easily buy up these lands and reduce the Zapotec/Mayan peasantry to landless debt peonage, showing a massive, tragic gap between liberal theory and rural reality."
        ],
        posterior_confidence: "high",
        what_would_change_this: "Discovery of verified 19th-century land deeds showing indigenous peasant farming cooperatives expanded and thrived under Juárez's laws."
      }
    ],
    historical_comparisons: [
      {
        compared_to: "Abraham Lincoln",
        similarities: [
          "Contemporary, highly legalistic mid-19th century presidents who led their nations through devastating civil wars against conservative rebellions.",
          "Both rose from humble origins, defended constitutional supremacy, and became ultimate national martyrs."
        ],
        differences: [
          "Juárez faced a direct, conventional foreign military invasion by a global superpower (France) alongside domestic civil war."
        ],
        confidence: "high"
      }
    ],
    source_quality: {
      overall: "strong",
      notes: "Abundant presidential papers, surviving Reform Laws decrees, and definitive historical biographies by Charles Hale and Brian Hamnett.",
      source_count: 5
    },
    sources: [
      "Hamnett, Brian R. (1994). Juárez.",
      "Scholes, Walter V. (1957). Mexican Politics During the Juárez Regime, 1855-1872.",
      "Hale, Charles A. (1968). Liberalism in the Age of Mora, 1821-1853.",
      "Juárez, Benito. (Compiled works). Documentos, Discursos y Correspondencia (15 volumes).",
      "Krauze, Enrique. (1997). Mexico: Biography of Power."
    ],
    research_gaps: ["Debates persist regarding the exact level of his private concessions in the MacLane-Ocampo Treaty, which was ultimately rejected by the US Senate."],
    created_at: "2026-05-31T21:31:33Z",
    updated_at: "2026-05-31T21:31:33Z"
  },

  // 17. Dom Pedro II
  {
    person_id: "dom_pedro_ii",
    name: "Dom Pedro II",
    aliases: ["The Magnanimous", "Dom Pedro de Alcântara"],
    birth_year: 1825,
    death_year: 1891,
    countries_or_regions: ["Brazil", "Latin America"],
    era: "19th Century / Empire of Brazil / Victorian Era",
    roles: ["Second and Last Emperor of Brazil"],
    domains: ["Geopolitics", "Statecraft", "Science"],
    priority_tier: 2,
    short_summary: "Last Emperor of Brazil who ruled for 58 years, transformed the nation into a stable constitutional representative empire, patronized arts and sciences, and successfully abolished slavery before being deposed by a republican military coup.",
    timeline: [
      {
        date_or_year: "1831-04-07",
        event: "Became Emperor at age 5 after his father Pedro I abdicated; ruled under a chaotic regency.",
        importance: "high",
        sources: ["Barman (1999)", "Carvalho (2007)"]
      },
      {
        date_or_year: "1840-07-23",
        event: "Declared of age prematurely at 14; assumed direct control of the imperial crown to restore national unity.",
        importance: "high",
        sources: ["Barman (1999)"]
      },
      {
        date_or_year: "1864-1870",
        event: "Led Brazil through the highly brutal Paraguayan War (War of the Triple Alliance), defeating Francisco Solano López.",
        importance: "high",
        sources: ["Paraguayan war archives", "Barman (1999)"]
      },
      {
        date_or_year: "1871-09-28",
        event: "Sanctioned the Law of the Free Womb, declaring all children born to enslaved mothers free.",
        importance: "high",
        sources: ["Abolitionist archives", "Carvalho (2007)"]
      },
      {
        date_or_year: "1888-05-13",
        event: "His daughter Regent Isabel signed the 'Lei Áurea' (Golden Law), completely abolishing slavery in Brazil with no compensation.",
        importance: "high",
        sources: ["Lei Áurea text", "Barman (1999)"]
      },
      {
        date_or_year: "1889-11-15",
        event: "Deposed in a sudden, bloodless military coup led by Marshal Deodoro da Fonseca; refused to resist and went into exile.",
        importance: "high",
        sources: ["Coup logs", "Barman (1999)"]
      },
      {
        date_or_year: "1891-12-05",
        event: "Passed away in Paris, France, in poverty; mourned nationally as the master builder of Brazilian unity.",
        importance: "high",
        sources: ["Paris logs", "Carvalho (2007)"]
      }
    ],
    power_base: "Vast moral authority as a neutral national arbiter (the moderating power 'Poder Moderador'), loyalty of the parliamentary civil elites (Liberals and Conservatives), high prestige among European intellectuals, and the direct backing of the imperial navy.",
    core_goals: [
      "Maintain the political and geographic unity of the vast Brazilian Empire, preventing regional secessions.",
      "Construct a stable, functioning constitutional representative government with regular elections and rotating parties.",
      "Abolish slavery systematically and peacefully, while promoting modern science, education, and immigration."
    ],
    incentives: [
      "Overcoming the extreme factional instability of the regency era.",
      "Fostering Brazilian cultural, scientific, and educational modernization.",
      "Fulfilling the moral duty of a modern, enlightened monarch."
    ],
    constraints: [
      "Fierce, unyielding political resistance from wealthy, slave-owning coffee planters (oligarchs).",
      "Severe financial strains caused by the highly expensive, protracted Paraguayan War.",
      "His own growing weariness of the crown and lack of a male heir, which weakened the long-term legitimacy of the monarchy."
    ],
    allies: ["Princess Isabel (daughter/regent)", "Caxias (general)", "Victor Hugo (scientific correspondent)"],
    rivals: ["Francisco Solano López (Paraguayan dictator)", "Republican Military Officers", "Pro-Slavery Coffee Planters"],
    institutions_controlled_or_influenced: ["Empire of Brazil", "Poder Moderador (Moderating Power)", "Brazilian Historical and Geographical Institute", "General Assembly of Brazil"],
    ideology_or_worldview: {
      summary: "Enlightened constitutional monarchism and scientific progressivism, prioritizing civil liberties, religious tolerance, freedom of the press, absolute submission of the military to civil law, and scientific patronage.",
      evidence: [
        "Refusing to allow any censorship of newspapers, even when they published highly critical cartoons of him.",
        "Personally funding research grants and corresponding with scientists like Pasteur, Darwin, and Bell."
      ],
      confidence: "high"
    },
    decision_patterns: [
      {
        pattern: "Patient, highly calculated, and neutral arbitration (utilizing his constitutional Moderating Power to dissolve parliaments and rotate parties to prevent one faction from monopolizing power), combined with a total refusal to use force to defend his crown.",
        examples: [
          "Dissolving deadlocked cabinets to force electoral rotations between Liberals and Conservatives.",
          "Voluntarily boarding the ship to exile in 1889 without ordering any loyal naval forces to launch a counter-coup, to prevent civil war."
        ],
        confidence: "high"
      }
    ],
    crisis_behavior: "Exhibited calm, dignified, and highly ethical resolve in national crises (e.g. during the Paraguayan War, serving as a 'volunteer of the motherland'), while showing complete passivity in the 1889 coup, accepting his exile with absolute stoicism.",
    negotiation_style: "highly polite, diplomatic, paternal, relying on written constitutional law and moral prestige to resolve regional disputes, while acting as a gentle patron rather than a dictator.",
    risk_tolerance: "low",
    centralization_preference: "medium",
    conflict_preference: "low",
    institutional_respect: "high",
    coalition_dependency: "high",
    populism_level: "low",
    technocratic_level: "high",
    game_theory_profile: {
      main_players: ["Imperial Crown (Pedro II)", "Slave-Owning Oligarchs", "Military Officers", "Republican Faction"],
      likely_objectives: [
        "Pedro II: Abolish slavery peacefully, maintain constitutional order, prevent civil war.",
        "Oligarchs: Protect slave assets, secure high compensations, block abolition.",
        "Military: Establish a positivist republic, increase military budgets."
      ],
      payoffs: [
        "Abolition without Compensation: Signing the Golden Law in 1888 successfully freed all slaves but alienated the wealthy coffee oligarchs (who immediately withdrew their support from the crown), leading to a fatal republican military coup (Negative dynastic payoff)."
      ],
      constraints: ["His lack of a male Romanov-style heir weakened the long-term strategic commitment of elite classes to the imperial succession."],
      common_strategic_moves: ["Cabinet dissolutions", "Scientific expeditions", "Constitutional pardons"],
      failure_modes: ["His extreme passivity and refusal to use loyal forces to suppress the 1889 military guard coup allowed a small clique of officers to easily overthrow a highly popular, democratic monarchy."]
    },
    bayesian_assessment: [
      {
        claim: "Dom Pedro II secretly desired the abolition of the Brazilian monarchy.",
        prior_confidence: "low",
        evidence: [
          "His extensive diaries expressing deep fatigue with imperial protocols and a desire to be a simple schoolteacher or president.",
          "His total failure to take any political or military action to groom his daughter Isabel or build alliances to defend the crown in the 1880s, indicating he viewed the monarchy as a temporary phase that had fulfilled its role of unifying Brazil, and was ready for a republic."
        ],
        posterior_confidence: "high",
        what_would_change_this: "Discovery of private letters showing he spent his final years in Paris actively plotting a armed restoration of the empire in Brazil."
      }
    ],
    historical_comparisons: [
      {
        compared_to: "Marcus Aurelius",
        similarities: [
          "Stoic, philosophical, and highly educated rulers who ruled with deep ethical duty and personal modesty.",
          "Both patronized arts and letters, faced costly external wars, and were universally respected for their high integrity."
        ],
        differences: [
          "Marcus Aurelius ruled a highly militarized pagan empire, whereas Pedro II ruled a constitutional representative system with an active parliament."
        ],
        confidence: "high"
      }
    ],
    source_quality: {
      overall: "strong",
      notes: "Rich imperial archives in Petrópolis, the Emperor's extensive diaries, parliamentary annals, and definitive academic biographies by Roderick Barman.",
      source_count: 5
    },
    sources: [
      "Barman, Roderick J. (1999). Citizen Emperor: Pedro II and the Making of Brazil, 1825-1891.",
      "Carvalho, José Murilo de. (2007). D. Pedro II: Ser o não Ser.",
      "Schwarcz, Lilia Moritz. (2004). The Emperor's Beard: Dom Pedro II and His Tropical Monarchy.",
      "Diários de D. Pedro II (Diaries of Emperor Pedro II, Petrópolis Archives).",
      "Vianna, Hélio. (1975). Vultos do Império."
    ],
    research_gaps: ["Determining the exact degree of behind-the-scenes cooperation between Marshal Deodoro da Fonseca and civilian republican conspirators prior to November 15 remains analyzed."],
    created_at: "2026-05-31T21:31:33Z",
    updated_at: "2026-05-31T21:31:33Z"
  },

  // 18. Genghis Khan
  {
    person_id: "genghis_khan",
    name: "Genghis Khan",
    aliases: ["Temüjin", "Chinggis Khan"],
    birth_year: 1162,
    death_year: 1227,
    countries_or_regions: ["Mongolia", "Central Asia", "China", "Eurasia"],
    era: "12th / 13th Century / Mongol Empire Unification",
    roles: ["Founder and Great Khan of the Mongol Empire"],
    domains: ["Geopolitics", "Military", "Statecraft"],
    priority_tier: 1,
    short_summary: "Founder of the Mongol Empire who unified the nomadic tribes of Northeast Asia, conquered vast territories across China, Central Asia, and Persia, and established the Great Yassa code.",
    timeline: [
      {
        date_or_year: "1206",
        event: "Unified all rival steppe tribes; proclaimed 'Genghis Khan' (Universal Ruler) at the Kurultai along the Onon River.",
        importance: "high",
        sources: ["Secret History of the Mongols", "Ratchnevsky (1991)"]
      },
      {
        date_or_year: "1211",
        event: "Launched the invasion of the Jurchen Jin Dynasty in northern China.",
        importance: "high",
        sources: ["Secret History of the Mongols", "Morgan (1986)"]
      },
      {
        date_or_year: "1215",
        event: "Captured and sacked the Jin capital of Zhongdu (modern Beijing).",
        importance: "high",
        sources: ["Morgan (1986)", "Ratchnevsky (1991)"]
      },
      {
        date_or_year: "1218",
        event: "Annexed the Kara-Khitan Khanate, extending the empire's borders to the Khwarazmian Empire.",
        importance: "high",
        sources: ["Morgan (1986)"]
      },
      {
        date_or_year: "1219-1221",
        event: "Launched a highly destructive invasion of the Khwarazmian Empire in retaliation for the murder of Mongol merchants, sacking Samarkand and Bukhara.",
        importance: "high",
        sources: ["Juvayni (1260)", "Ratchnevsky (1991)"]
      },
      {
        date_or_year: "1225",
        event: "Returned to Mongolia; established the Pax Mongolica, securing Silk Road trade.",
        importance: "high",
        sources: ["Morgan (1986)"]
      },
      {
        date_or_year: "1227-08-18",
        event: "Passed away during the campaign against the Western Xia; succeeded smoothly by his son Ögedei Khan.",
        importance: "high",
        sources: ["Secret History of the Mongols", "Ratchnevsky (1991)"]
      }
    ],
    power_base: "Unrivaled personal military prestige, a highly mobile, meritocratic nomadic cavalry force organized on a decimal decimal system, the legal authority of the Great Yassa, and complete control over regional plunder redistribution.",
    core_goals: [
      "Unify all nomadic steppe tribes under a singular, perpetual imperial lineage.",
      "Execute rapid, aggressive conquests of surrounding sedentary empires to extract tribute and wealth.",
      "Establish a highly stable, secure trans-Eurasian trade network (Pax Mongolica) governed by Mongol law."
    ],
    incentives: [
      "Eradicating the devastating, centuries-long cycle of tribal warfare on the Mongolian steppe.",
      "Securing the physical survival and absolute wealth of his nomadic population.",
      "Fulfilling a divine mandate from Tengri (the Sky God) to conquer the earth."
    ],
    constraints: [
      "Fierce, entrenched clan rivalries and the constant threat of assassination in early life.",
      "Extreme numerical inferiority compared to the massive populations of China and Persia.",
      "Severe logistical limitations, relying on vast herds of horses for mobility and grazing lands."
    ],
    allies: ["Subutai (military genius general)", "Jebe (general)", "Borte (wife)"],
    rivals: ["Jamukha (blood-brother/later rival)", "Toghrul (Ong Khan/early sponsor)", "Khwarazmian Shah Muhammad II"],
    institutions_controlled_or_influenced: ["Mongol Empire", "Great Yassa (Mongol Code of Law)", "Yam (highly efficient postal relay system)", "Keshig (imperial guard)"],
    ideology_or_worldview: {
      summary: "Steppe legalism and absolute meritocracy, combining supreme belief in a divine mandate from Tengri with religious tolerance, strict legal obedience to the Yassa, and absolute loyalty over hereditary lineage.",
      evidence: [
        "Promulgating the Great Yassa which outlawed animal theft, adultery, and tribal kidnapping under penalty of death.",
        "Promoting soldiers purely for battlefield valor (like Jebe, who had shot Genghis in the neck) rather than noble birth."
      ],
      confidence: "high"
    },
    decision_patterns: [
      {
        pattern: "Highly systematic, deceptive, and asymmetrical military planning (feigned retreats, psychological terror, siege engineering co-opted from conquered Chinese/Persians) combined with swift, absolute destruction of any cities that refused to surrender.",
        examples: [
          "Deploying a highly organized merchant intelligence network (spy rings) before launching campaigns.",
          "Using captured captives as human shields during sieges to demoralize defenders."
        ],
        confidence: "high"
      }
    ],
    crisis_behavior: "Exhibited extraordinary, cold tactical calm and unyielding resilience in early life crises, surviving capture by the Taichi'uts and climbing sacred Mount Burkhan Khaldun to plan retaliatory strikes.",
    negotiation_style: "absolute, uncompromising; offering two clear choices (surrender peaceably and pay tribute, or face complete physical annihilation), refusing any peer compromises.",
    risk_tolerance: "high",
    centralization_preference: "high",
    conflict_preference: "high",
    institutional_respect: "medium",
    coalition_dependency: "low",
    populism_level: "low",
    technocratic_level: "medium",
    game_theory_profile: {
      main_players: ["Mongols (Genghis)", "Jin Dynasty", "Khwarazmian Empire", "Western Xia"],
      likely_objectives: [
        "Genghis: Conquer sedentary empires, extract tribute, secure Silk Road.",
        "Jin Dynasty: Contain nomadic expansion, play tribes against each other.",
        "Khwarazmian Shah: Protect borders, monopolize Central Asian trade."
      ],
      payoffs: [
        "Surrender or Exterminate Game: Enforcing complete destruction on cities that resisted successfully established a Nash equilibrium where subsequent cities surrendered immediately, saving Mongol forces (Highest tactical payoff)."
      ],
      constraints: ["Extreme numerical inferiority forced reliance on speed, psychological terror, and co-opting local engineering technocrats."],
      common_strategic_moves: ["Feigned retreats", "Siege engineering co-optation", "Yam postal lines"],
      failure_modes: ["His decimal military organization occasionally broke traditional nomadic clan structures, leading to future succession crises among the Golden Horde."]
    },
    bayesian_assessment: [
      {
        claim: "Genghis Khan was a barbaric monster who only sought mindless physical destruction.",
        prior_confidence: "low",
        evidence: [
          "The devastating massacres of populations in Merv, Nishapur, and Herat.",
          "His systematic creation of a written language for the Mongols (Uighur script), the establishment of the Pax Mongolica which allowed safe travel of figures like Marco Polo, his absolute religious tolerance exempting clergy from taxes, and his creation of the first international postal relay system (Yam), showing highly sophisticated statecraft."
        ],
        posterior_confidence: "low",
        what_would_change_this: "Discovery of contemporary Uighur decrees proving Genghis ordered the permanent, physical destruction of all agriculture and cities across the globe."
      }
    ],
    historical_comparisons: [
      {
        compared_to: "Alexander the Great",
        similarities: [
          "Charismatic military conquerors who created massive, contiguous land empires stretching from Europe/Central Asia to Asia.",
          "Both shattered ancient, wealthy empires (Persia/Khwarazm) through highly innovative, swift cavalry maneuvers."
        ],
        differences: [
          "Genghis Khan successfully consolidated a highly stable legal code (Yassa) and administrative succession that endured for generations, whereas Alexander's empire shattered immediately upon his death."
        ],
        confidence: "high"
      }
    ],
    source_quality: {
      overall: "strong",
      notes: "The contemporary Secret History of the Mongols, Persian court history by Juvayni, Chinese dynastic annals (Yuanshi), and definitive modern academic biographies by Igor de Rachewiltz.",
      source_count: 5
    },
    sources: [
      "Anonymous. (c. 1240). The Secret History of the Mongols (Translated by Igor de Rachewiltz).",
      "Ratchnevsky, Paul. (1991). Genghis Khan: His Life and Legacy.",
      "Morgan, David. (1986). The Mongols.",
      "Juvayni, Ala-ad-Din Ata-Malik. (c. 1260). Tarikh-i Jahangushay (History of the World Conqueror).",
      "Weatherford, Jack. (2004). Genghis Khan and the Making of the Modern World."
    ],
    research_gaps: ["The exact location of Genghis Khan's burial site remains undiscovered, reportedly hidden by his funeral guards who killed anyone they met on their return path."],
    created_at: "2026-05-31T21:31:33Z",
    updated_at: "2026-05-31T21:31:33Z"
  },

  // 19. Alexander the Great
  {
    person_id: "alexander_the_great",
    name: "Alexander the Great",
    aliases: ["Alexander III of Macedon", "Iskandar"],
    birth_year: -356,
    death_year: -323,
    countries_or_regions: ["Macedonia", "Greece", "Persia", "Egypt", "India", "Middle East"],
    era: "4th Century BCE / Hellenistic Era / Conquest of Persia",
    roles: ["King of Macedon", "Hegemon of the Hellenic League", "Shahanshah of Persia", "Pharaoh of Egypt"],
    domains: ["Geopolitics", "Military", "Statecraft"],
    priority_tier: 1,
    short_summary: "King of Macedon who created one of the largest empires of the ancient world, defeated the Persian Empire under Darius III, and initiated the Hellenistic cultural era.",
    timeline: [
      {
        date_or_year: "-336",
        event: "Ascended the Macedonian throne at age 20 after the assassination of his father Philip II.",
        importance: "high",
        sources: ["Arrian (c. 150 CE)", "Plutarch (c. 100 CE)"]
      },
      {
        date_or_year: "-334",
        event: "Crossed the Hellespont into Asia, launching the invasion of the Achaemenid Persian Empire.",
        importance: "high",
        sources: ["Arrian (c. 150 CE)", "Lane Fox (1973)"]
      },
      {
        date_or_year: "-333",
        event: "Defeated Darius III at the Battle of Issus, capturing the Persian royal family.",
        importance: "high",
        sources: ["Arrian (c. 150 CE)"]
      },
      {
        date_or_year: "-332",
        event: "Successfully besieged the island city of Tyre after a seven-month engineering effort; crowned Pharaoh in Egypt.",
        importance: "high",
        sources: ["Siege logs", "Lane Fox (1973)"]
      },
      {
        date_or_year: "-331-10-01",
        event: "Won the decisive Battle of Gaugamela, shattering Persian imperial power and taking Babylon.",
        importance: "high",
        sources: ["Arrian (c. 150 CE)", "Plutarch (c. 100 CE)"]
      },
      {
        date_or_year: "-326",
        event: "Defeated King Porus at the Battle of the Hydaspes River in India; faced a major army mutiny at the Hyphasis River, forcing a return.",
        importance: "high",
        sources: ["Arrian (c. 150 CE)"]
      },
      {
        date_or_year: "-323-06-10",
        event: "Passed away in Babylon at age 32 from a sudden fever; his empire immediately fractured into rival Diadochi kingdoms.",
        importance: "high",
        sources: ["Arrian (c. 150 CE)", "Plutarch (c. 100 CE)"]
      }
    ],
    power_base: "The highly professional, unified Macedonian veteran army (Companion cavalry, sarissa phalanx), supreme battlefield charisma, co-opted wealth and administrative structures of the Persian Empire, and absolute dynastic prestige.",
    core_goals: [
      "Conquer the entire Achaemenid Persian Empire, expanding Macedonian hegemony to the outer limits of the known world.",
      "Merge Greek, Macedonian, and Persian cultures into a unified civilizational elite (Hellenism).",
      "Achieve personal deification and glory matching his mythological ancestors Achilles and Heracles."
    ],
    incentives: [
      "Fulfilling his father Philip II's planned pan-Hellenic invasion of Asia.",
      "Securing the absolute loyalty of his battle-hardened Macedonian generals.",
      "Attaining unmatched historical immortality."
    ],
    constraints: [
      "Severe demographic limits, relying on a small core of Macedonian soldiers far from home.",
      "Persistent, deep factional opposition from conservative Macedonian nobles who rejected his Persian dress and court protocols (proskynesis).",
      "Extreme logistics and supply challenges across deserts and mountain ranges."
    ],
    allies: ["Hephaestion (general/companion)", "Ptolemy I Soter", "Seleucus I Nicator", "Aristotle (tutor)"],
    rivals: ["Darius III of Persia", "Spitamenes (Sogdian rebel)", "King Porus of India", "Internal conspirators (Philotas/Callisthenes)"],
    institutions_controlled_or_influenced: ["Kingdom of Macedon", "Hellenic League", "Achaemenid Empire", "Alexandria (founded by him)"],
    ideology_or_worldview: {
      summary: "Heroic monarchism (Hellenistic fusion) combining absolute military kingship and personal deification with the integration of conquered elites, cosmopolitanism, and state-sponsored cultural syncretism.",
      evidence: [
        "Forcing the massive Susa weddings in -324, where 10,000 Macedonian officers married Persian noblewomen.",
        "Visiting the Oracle of Ammon in Siwa (-331) to be proclaimed the actual son of Zeus-Ammon."
      ],
      confidence: "high"
    },
    decision_patterns: [
      {
        pattern: "Extremely high-risk, aggressive battlefield leadership, personally leading the cavalry shock charge into the enemy's weakest point, combined with complex engineering sieges and dynamic tactical adaptions to local terrain.",
        examples: [
          "Leading the decisive charge at Gaugamela directly targeting Darius III's royal chariot.",
          "Building a half-mile causeway through deep water to siege the island of Tyre."
        ],
        confidence: "high"
      }
    ],
    crisis_behavior: "Exhibited extraordinary, high-energy physical and strategic adaptability in military crises, fighting alongside his men and surviving severe wounds, but showed increasingly paranoid, hyper-violent behavior in late-life political crises.",
    negotiation_style: "absolute, imperial; demanding total submission and recognition as the supreme King of Asia under threat of total military eradication, while showing generous respect to defeated kings who fought bravely (Porus).",
    risk_tolerance: "high",
    centralization_preference: "high",
    conflict_preference: "high",
    institutional_respect: "low",
    coalition_dependency: "medium",
    populism_level: "high",
    technocratic_level: "medium",
    game_theory_profile: {
      main_players: ["Macedonian Crown (Alexander)", "Persian Empire (Darius III)", "Macedonian Generals (Diadochi)", "Greek City-States"],
      likely_objectives: [
        "Alexander: Conquer Persia, merge elites, achieve personal deification, reach the Great Outer Ocean.",
        "Darius III: Preserve Persian crown, isolate Alexander far from supply lines.",
        "Generals: Retain military ranks, limit Persian integration, secure regional satrapies."
      ],
      payoffs: [
        "Unyielding Expansion Nash Equilibrium: Pushing his forces deep into India successfully maximized his mythological glory payoff but crossed his veterans' survival constraint, triggering a fatal military mutiny (Mixed geopolitical payoff)."
      ],
      constraints: ["Veterans' homesickness and exhaustion acted as a strict threat constraint that forced the return from India at the Hyphasis River."],
      common_strategic_moves: ["Cavalry shock charges", "Siege causeway construction", "Dynastic fusion marriages"],
      failure_modes: ["His complete failure to name a clear, capable successor (famously saying he left the empire 'to the strongest') triggered decades of devastating wars of succession among his generals (the Diadochi)."]
    },
    bayesian_assessment: [
      {
        claim: "Alexander was assassinated by his generals in Babylon using a slow-acting poison.",
        prior_confidence: "low",
        evidence: [
          "The court rumors blaming Antipater's family and the sudden onset of his illness.",
          "The extensive daily court diaries showing he had suffered multiple severe wounds (including a punctured lung), drank heavily, and contracted malaria or typhoid fever in the swamps around Babylon, with his symptoms matching natural causes, though a tactical poisoning cannot be 100% ruled out."
        ],
        posterior_confidence: "low",
        what_would_change_this: "Discovery of a contemporary, verified private letter from Antipater to Cassander detailing the specific formula and administration of the poison used on Alexander."
      }
    ],
    historical_comparisons: [
      {
        compared_to: "Julius Caesar",
        similarities: [
          "Brilliant, highly aggressive military generals who conquered vast territories and leveraged extreme personal charisma.",
          "Both faced deep resentment from traditional noble elites who feared their personal deification and royal ambitions."
        ],
        differences: [
          "Alexander inherited a sovereign monarchy and ruled as a divine king, whereas Caesar operated within a republican system and was assassinated for attempting to dismantle it."
        ],
        confidence: "high"
      }
    ],
    source_quality: {
      overall: "strong",
      notes: "Relies on Arrian's Anabasis (utilizing lost contemporary accounts by Ptolemy and Aristobulus) and Plutarch's Life of Alexander, supported by rich Hellenistic archaeology.",
      source_count: 5
    },
    sources: [
      "Arrian. (c. 150 CE). Anabasis Alexandri (Campaigns of Alexander).",
      "Plutarch. (c. 100 CE). Life of Alexander.",
      "Lane Fox, Robin. (1973). Alexander the Great.",
      "Bosworth, A. B. (1988). Conquest and Empire: The Reign of Alexander the Great.",
      "Curtius Rufus, Quintus. (1st Century CE). Historiae Alexandri Magni."
    ],
    research_gaps: ["The exact cause of his death and the precise location of his lost tomb in Alexandria remain major historical mysteries."],
    created_at: "2026-05-31T21:31:33Z",
    updated_at: "2026-05-31T21:31:33Z"
  },

  // 20. Prophet Muhammad
  {
    person_id: "prophet_muhammad",
    name: "Prophet Muhammad",
    aliases: ["Muhammad ibn Abdullah", "The Messenger of God"],
    birth_year: 570,
    death_year: 632,
    countries_or_regions: ["Arabia", "Middle East", "Global"],
    era: "6th / 7th Century / Rise of Islam / Late Antiquity",
    roles: ["Founder of Islam", "Messenger of God", "Sovereign of Medina and Mecca", "Military Commander"],
    domains: ["Religion", "Geopolitics", "Statecraft", "Military"],
    priority_tier: 1,
    short_summary: "Religious, political, and military leader who unified the warring nomadic tribes of Arabia under the sole banner of Islam, established the Medina Charter, and founded the Islamic State.",
    timeline: [
      {
        date_or_year: "610",
        event: "Received his first divine revelation in the Cave of Hira near Mecca, launching his prophetic mission.",
        importance: "high",
        sources: ["Ibn Ishaq (c. 760)", "Lings (1983)"]
      },
      {
        date_or_year: "622-09",
        event: "The Hijra (Migration): Fled Meccan persecution to Medina, establishing the first sovereign Islamic community.",
        importance: "high",
        sources: ["Medina Charter", "Ibn Ishaq (c. 760)"]
      },
      {
        date_or_year: "624-03-13",
        event: "Won the historic Battle of Badr, defeating a much larger Quraysh force and cementing military prestige.",
        importance: "high",
        sources: ["Ibn Ishaq (c. 760)", "Watt (1956)"]
      },
      {
        date_or_year: "627",
        event: "Successfully defended Medina in the Battle of the Trench against a massive confederation siege.",
        importance: "high",
        sources: ["Watt (1956)"]
      },
      {
        date_or_year: "628",
        event: "Signed the Treaty of Hudaybiyyah, securing a strategic ten-year peace with the Quraysh of Mecca.",
        importance: "high",
        sources: ["Treaty documents", "Lings (1983)"]
      },
      {
        date_or_year: "630-01-11",
        event: "Conquered Mecca bloodlessly after the Quraysh violated the treaty; cleansed the Kaaba of pagan idols.",
        importance: "high",
        sources: ["Ibn Ishaq (c. 760)", "Watt (1956)"]
      },
      {
        date_or_year: "632-03",
        event: "Delivered his Farewell Sermon in Arafat, establishing the social, legal, and racial equality principles of Islam.",
        importance: "high",
        sources: ["Hadith compilations", "Lings (1983)"]
      },
      {
        date_or_year: "632-06-08",
        event: "Passed away in Medina; succeeded politically by his father-in-law Abu Bakr as the first Caliph.",
        importance: "high",
        sources: ["Ibn Ishaq (c. 760)", "Donner (2010)"]
      }
    ],
    power_base: "Unrivaled spiritual authority as the recipient of divine revelations (the Quran), the highly cohesive bond of the Islamic brotherhood (Ummah) which transcended ancient tribal divisions, the constitutional authority of the Medina Charter, and a highly motivated, battle-hardened volunteer military force.",
    core_goals: [
      "Eradicate polytheism and establish absolute monotheism (Tawhid) across the Arabian Peninsula.",
      "Unify all historically warring, highly factional Arab tribes under a singular, law-governed religious state.",
      "Construct a comprehensive, just social and legal order protecting orphans, women, and the poor."
    ],
    incentives: [
      "Fulfilling the absolute divine mandate of his prophetic mission.",
      "Eradicating the systemic injustices, tribal feuds, and infanticide of the pre-Islamic Jahiliyyah era.",
      "Securing the survival and global propagation of the Islamic faith."
    ],
    constraints: [
      "Fierce, wealthy military and commercial opposition from the ruling Quraysh oligarchy of Mecca.",
      "Persistent, deep-seated tribal factionalism and regional hypocrites (Munafiqun) in Medina.",
      "Severe resource and water deficits of the barren Arabian desert."
    ],
    allies: ["Abu Bakr (successor/companion)", "Ali ibn Abi Talib (cousin/commander)", "Khadija (wife/first believer)", "Medina Ansar Networks"],
    rivals: ["Quraysh Oligarchy (Abu Sufyan)", "Internal Hypocrites (Abdullah ibn Ubayy)", "Hostile Regional Jewish Tribes (Banu Qurayza/Khaibar)"],
    institutions_controlled_or_influenced: ["Islamic State of Medina", "Medina Charter", "Ummah (Global Islamic Community)", "Kaaba Sanctuary"],
    ideology_or_worldview: {
      summary: "Absolute Islamic Monotheism (Tawhid) and social justice, combining absolute submission to the will of God with tribal equality, written constitutional law, complete abolition of hereditary elite privileges, and just rules of warfare.",
      evidence: [
        "Drafting the Medina Charter in 622, establishing a multi-religious confederation with equal rights.",
        "Systematically outlawing female infanticide, establishing women's inheritance rights, and setting strict rules protecting non-combatants, trees, and civilian infrastructure during wars."
      ],
      confidence: "high"
    },
    decision_patterns: [
      {
        pattern: "Agile, highly strategic, and transformative statesmanship, combining defensive military resolve (trench warfare) with highly sophisticated, patient diplomatic compromises designed to isolate his enemies and secure bloodless victories.",
        examples: [
          "Signing the Treaty of Hudaybiyyah in 628, accepting apparently disadvantageous terms (returning Meccan escapees) to secure legal recognition and peace, which allowed peaceful proselytizing to multiply the number of Muslims.",
          "Cleansing the Kaaba of pagan idols while pardoning his bitterest Meccan enemies (including Abu Sufyan) upon his return in 630."
        ],
        confidence: "high"
      }
    ],
    crisis_behavior: "Exhibited extraordinary, absolute spiritual and strategic calm in extreme crises (e.g. during the migration while hiding in the Cave of Thawr, or at the Battle of the Trench), maintaining the unity of his followers through direct Quranic revelations.",
    negotiation_style: "highly patient, inclusive, utilizing written constitutional contracts (Medina Charter) and treaty compromises to bind disparate tribes, while remaining unyielding on the core theological principle of absolute monotheism.",
    risk_tolerance: "high",
    centralization_preference: "high",
    conflict_preference: "medium",
    institutional_respect: "high",
    coalition_dependency: "high",
    populism_level: "high",
    technocratic_level: "medium",
    game_theory_profile: {
      main_players: ["Muslims (Muhammad)", "Meccan Quraysh", "Medina Jewish Tribes", "Bedouin Nomads"],
      likely_objectives: [
        "Muhammad: Establish monotheism, secure Medina state, unify Arabia under Islam.",
        "Quraysh: Exterminate Muslims, protect Meccan trade monopolies, preserve pagan Kaaba.",
        "Medina Tribes: Maintain regional influence, navigate between Meccan and Muslim giants."
      ],
      payoffs: [
        "The Hudaybiyyah Treaty Nash Equilibrium: Pausing direct military conflict successfully traded short-term military pride in exchange for absolute diplomatic legitimacy, allowing a massive, peaceful expansion of the Ummah (Highest strategic payoff)."
      ],
      constraints: ["Entrenched tribal blood feuds acted as a strict threat constraint that required divine legal codes to systematically dismantle."],
      common_strategic_moves: ["Constitutional confederations", "Strategic treaty pacts", "Defensive military sieges"],
      failure_modes: ["His death without leaving an explicit, written political succession plan for the Caliphate eventually sparked deep, permanent sectarian splits (Sunni-Shia) during the early caliphates."]
    },
    bayesian_assessment: [
      {
        claim: "Muhammad was an ambitious Arab nationalist who created Islam primarily to build a united Arab empire.",
        prior_confidence: "low",
        evidence: [
          "His unification of the Arab tribes for the first time in history and the subsequent rapid Arab conquests of Persia and Byzantium.",
          "His explicit Farewell Sermon stating that 'an Arab has no superiority over a non-Arab, nor a non-Arab any superiority over an Arab... except by piety,' his active inclusion of Persian (Salman al-Farsi), Abyssinian (Bilal), and Roman companions, and his primary theological focus on universal monotheism rather than ethnic nationalism, showing a cosmic, non-nationalist mission."
        ],
        posterior_confidence: "low",
        what_would_change_this: "Discovery of contemporary 7th-century parchment logs showing Muhammad planned to completely exclude non-Arabs from the Islamic state and establish a hereditary Arab racial aristocracy."
      }
    ],
    historical_comparisons: [
      {
        compared_to: "Moses",
        similarities: [
          "Supreme religious lawgivers who unified historically oppressed, nomadic populations through divine covenants.",
          "Both served as spiritual, legal, political, and military leaders of sovereign, migrating states."
        ],
        differences: [
          "Muhammad successfully conquered his people's historical homeland (Mecca) and unified the entire peninsula within his own lifetime."
        ],
        confidence: "high"
      }
    ],
    source_quality: {
      overall: "strong",
      notes: "The text of the Quran (contemporary source), the Medina Charter, early biographies (Sira by Ibn Ishaq/Ibn Hisham), Hadith compilations, and major critical studies by Montgomery Watt.",
      source_count: 5
    },
    sources: [
      "Ibn Ishaq / Ibn Hisham. (c. 760 CE). Sirat Rasul Allah (Life of the Messenger of God).",
      "Watt, W. Montgomery. (1953-1956). Muhammad at Mecca & Muhammad at Medina (2 volumes).",
      "Donner, Fred M. (2010). Muhammad and the Believers: At the Origins of Islam.",
      "The Medina Charter (Constitutional Contract of Medina, 622 CE).",
      "Lings, Martin. (1983). Muhammad: His Life Based on the Earliest Sources."
    ],
    research_gaps: ["The exact details of the oral preservation and specific manuscript compilation timeline prior to the standard Uthmanic codex remain subject to highly analytical academic deconstruction."],
    created_at: "2026-05-31T21:31:33Z",
    updated_at: "2026-05-31T21:31:33Z"
  }
];

// Compile databases dynamically
const sources_db: Source[] = [];
const claims_db: Claim[] = [];

batch6_profiles.forEach(p => {
  p.sources.forEach((s: string, idx: number) => {
    const sId = `${p.person_id}_source_${idx + 1}`;
    sources_db.push({
      source_id: sId,
      person_id: p.person_id,
      title: s,
      authors: [],
      year: null,
      url: "",
      type: "book",
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
  console.log("Starting batch 6 generation...");

  // 1. Validate new profiles
  let totalErrors = 0;
  batch6_profiles.forEach((profile, idx) => {
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

  console.log("All 20 batch 6 profiles successfully passed schema validation!");

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
  const newProfiles = batch6_profiles.map(p => JSON.stringify(p)).join("\n") + "\n";
  const updatedProfiles = existingProfiles.trim() + "\n" + newProfiles;
  await fs.writeFile(profilesPath, updatedProfiles.trim() + "\n");
  console.log("Appended 20 new profiles to data/profiles.jsonl");

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
  const completedIds = new Set(batch6_profiles.map(p => p.person_id));
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

  console.log("Batch 6 generation completed successfully!");
}

main().catch(err => {
  console.error("Fatal generation failure:", err);
  process.exit(1);
});
