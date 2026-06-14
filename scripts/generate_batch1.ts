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

const batch1_profiles: any[] = [
  // 1. George Washington
  {
    person_id: "george_washington",
    name: "George Washington",
    aliases: ["Father of His Country", "General Washington"],
    birth_year: 1732,
    death_year: 1799,
    countries_or_regions: ["United States", "North America"],
    era: "18th Century / American Revolutionary War / Founding Era",
    roles: ["General of the Continental Army", "President of the United States", "President of the Constitutional Convention"],
    domains: ["Geopolitics", "Military", "Statecraft"],
    priority_tier: 1,
    short_summary: "First President of the United States and Commander of the Continental Army who established key republican precedents, including the peaceful voluntary transfer of executive power.",
    timeline: [
      {
        date_or_year: "1775",
        event: "Appointed Commander-in-Chief of the Continental Army by the Second Continental Congress.",
        importance: "high",
        sources: ["Chernow (2010)", "Ellis (2004)"]
      },
      {
        date_or_year: "1776-12-25",
        event: "Led the legendary crossing of the icy Delaware River for a successful surprise attack on Trenton.",
        importance: "high",
        sources: ["Chernow (2010)"]
      },
      {
        date_or_year: "1781",
        event: "Secured decisive British surrender at Yorktown with assistance from French naval forces.",
        importance: "high",
        sources: ["Chernow (2010)", "Lafayette Memoirs"]
      },
      {
        date_or_year: "1783-12",
        event: "Resigned his military commission to the Continental Congress, establishing civilian control over the military.",
        importance: "high",
        sources: ["Circular Letter to States (1783)", "Ellis (2004)"]
      },
      {
        date_or_year: "1787",
        event: "Presided over the Constitutional Convention, lending crucial moral legitimacy to the new federal charter.",
        importance: "high",
        sources: ["Madison Debates (1787)"]
      },
      {
        date_or_year: "1789",
        event: "Inaugurated as the first President of the United States under the new Constitution.",
        importance: "high",
        sources: ["Chernow (2010)"]
      },
      {
        date_or_year: "1794",
        event: "Personally led federalized militia to suppress the Whiskey Rebellion, asserting federal tax authority.",
        importance: "high",
        sources: ["Ellis (2004)", "Hamilton Papers"]
      },
      {
        date_or_year: "1796",
        event: "Published his Farewell Address, warning against permanent foreign alliances and partisan factionalism.",
        importance: "high",
        sources: ["Farewell Address (1796)"]
      },
      {
        date_or_year: "1797",
        event: "Retired voluntarily after two terms, solidifying a supreme precedent of peaceful democratic power transfer.",
        importance: "high",
        sources: ["Chernow (2010)", "Ellis (2004)"]
      }
    ],
    power_base: "Vast southern agrarian elite backing, absolute Continental Army officer loyalty, supreme nationwide moral authority, and Federalist consensus.",
    core_goals: [
      "Establish a stable, sovereign American constitutional republic free from European domination.",
      "Avert military dictatorship by subordinating military forces to civilian legislative authority.",
      "Ensure national cohesion by managing emerging party factions and centralizing economic policy."
    ],
    incentives: [
      "Preservation of personal honor and reputation for absolute civic virtue.",
      "Protection of sovereign domestic territory against British, French, or Spanish incursions.",
      "Securing economic interests of the young nation's agricultural and trade bases."
    ],
    constraints: [
      "Young republic lacked a standing navy and faced financial insolvency during his first term.",
      "Deep cabinet divisions between Alexander Hamilton and Thomas Jefferson representing rival visions of state power.",
      "Geopolitical vulnerability of native frontiers and major coastal trade lanes to European navies."
    ],
    allies: ["Alexander Hamilton", "John Adams", "Marquis de Lafayette", "Henry Knox"],
    rivals: ["Thomas Jefferson (factional rivalry)", "James Madison (increasingly in opposition)", "King George III"],
    institutions_controlled_or_influenced: ["Continental Army", "United States Presidency", "Federal Constitutional Convention"],
    ideology_or_worldview: {
      summary: "Federalist-aligned constitutional republicanism advocating for a powerful, centralized executive balanced by strict civic virtue, economic integration, and strategic international neutrality.",
      evidence: [
        "Inaugural addresses emphasizing reliance on the rule of law over personality.",
        "Suppression of the Whiskey Rebellion demonstrating state monopoly on violence.",
        "Strict adherence to neutrality proclamations during the French Revolutionary Wars."
      ],
      confidence: "high"
    },
    decision_patterns: [
      {
        pattern: "Deliberate consensus-building via War Councils and Cabinet consulting.",
        examples: [
          "Regularly convened councils of war before major battles like Monmouth.",
          "Balanced conflicting legal opinions from Hamilton and Jefferson on the National Bank."
        ],
        confidence: "high"
      }
    ],
    crisis_behavior: "Extremely cool and resilient under strategic pressure, willing to retreat when structurally outmatched (e.g. Long Island), but highly decisive once a consensus/plan was finalized.",
    negotiation_style: "Dignified, highly formal mediation, using personal moral weight to reconcile bitter regional and political rivals.",
    risk_tolerance: "medium",
    centralization_preference: "high",
    conflict_preference: "low",
    institutional_respect: "high",
    coalition_dependency: "high",
    populism_level: "low",
    technocratic_level: "medium",
    game_theory_profile: {
      main_players: ["United States", "Great Britain", "Revolutionary France"],
      likely_objectives: [
        "United States: Maintain neutrality, build sovereign fiscal/military capacity.",
        "Great Britain: Limit US trade with France, retain naval dominance.",
        "France: Draw United States into war against Britain."
      ],
      payoffs: [
        "US Proclamation of Neutrality (1793) prevents destructive war while maintaining commercial ties with both European powers (Highest payoff)."
      ],
      constraints: ["Lack of US naval capacity forced avoidance of direct maritime confrontations."],
      common_strategic_moves: ["Delaying direct alignments", "Diplomatic treaties (e.g. Jay Treaty) to divide adversaries"],
      failure_modes: ["Entanglement in foreign conflicts that could bankrupt the federal treasury and provoke internal civil conflict."]
    },
    bayesian_assessment: [
      {
        claim: "Washington surrendered power voluntarily primarily to set a republican precedent rather than due to physical exhaustion.",
        prior_confidence: "high",
        evidence: [
          "His private letters to Madison in 1792 outlining retirement plans before his second term.",
          "The explicit republican rhetoric of the Farewell Address warning of hereditary/dynastic decay."
        ],
        posterior_confidence: "high",
        what_would_change_this: "Discovery of private contemporary medical records indicating acute terminal physical collapse in early 1796."
      }
    ],
    historical_comparisons: [
      {
        compared_to: "Lucius Quinctius Cincinnatus",
        similarities: [
          "Resignation of absolute power immediately upon victory.",
          "Return to agrarian private life as a civic ideal."
        ],
        differences: [
          "Washington constructed a durable, complex modern constitutional state, whereas Cincinnatus operated in a temporary Roman dictator framework."
        ],
        confidence: "high"
      }
    ],
    source_quality: {
      overall: "strong",
      notes: "Enormous volume of primary documents, including the George Washington Papers at the Library of Congress and definitive scholarly biographies.",
      source_count: 5
    },
    sources: [
      "Chernow, Ron. (2010). Washington: A Life.",
      "Ellis, Joseph J. (2004). His Excellency: George Washington.",
      "Flexner, James Thomas. (1973). Washington: The Indispensable Man.",
      "The Papers of George Washington, University of Virginia.",
      "Freeman, Douglas Southall. (1948-1957). George Washington: A Biography."
    ],
    research_gaps: ["Scholarly debate remains active on the degree of his early direct authorship vs Alexander Hamilton's drafting of the Farewell Address."],
    created_at: "2026-05-31T21:28:20Z",
    updated_at: "2026-05-31T21:28:20Z"
  },

  // 2. Napoleon Bonaparte
  {
    person_id: "napoleon_bonaparte",
    name: "Napoleon Bonaparte",
    aliases: ["Emperor Napoleon I", "The Little Corporal"],
    birth_year: 1769,
    death_year: 1821,
    countries_or_regions: ["France", "Europe"],
    era: "Late 18th / Early 19th Century / Napoleonic Wars",
    roles: ["Emperor of the French", "First Consul of the French Republic", "General of the French Army"],
    domains: ["Military", "Statecraft", "Law"],
    priority_tier: 1,
    short_summary: "French military commander and emperor who conquered much of Europe, reshaped modern warfare, and established the Napoleonic Code which remains a foundational civil law system globally.",
    timeline: [
      {
        date_or_year: "1796",
        event: "Appointed commander of the French Army of Italy, winning a series of stunning victories.",
        importance: "high",
        sources: ["Roberts (2014)"]
      },
      {
        date_or_year: "1799-11-09",
        event: "Launched the Coup of 18 Brumaire, overthrowing the Directory and becoming First Consul.",
        importance: "high",
        sources: ["Roberts (2014)", "Lefebvre (1969)"]
      },
      {
        date_or_year: "1804-03",
        event: "Promulgated the Civil Code of the French (Napoleonic Code), reformulating civil law.",
        importance: "high",
        sources: ["Napoleonic Code archives"]
      },
      {
        date_or_year: "1804-12-02",
        event: "Crowned himself Emperor of the French at Notre-Dame Cathedral.",
        importance: "high",
        sources: ["Roberts (2014)"]
      },
      {
        date_or_year: "1805-12-02",
        event: "Defeated the Austro-Russian coalition at the Battle of Austerlitz (his military masterpiece).",
        importance: "high",
        sources: ["Chandler (1966)"]
      },
      {
        date_or_year: "1806",
        event: "Instituted the Continental System, a continent-wide embargo against British trade.",
        importance: "high",
        sources: ["Lefebvre (1969)"]
      },
      {
        date_or_year: "1812",
        event: "Invaded Russia with the 600,000-strong Grande Armée; suffered catastrophic retreat.",
        importance: "high",
        sources: ["Chandler (1966)", "Clausewitz (1843)"]
      },
      {
        date_or_year: "1814-04",
        event: "Forced to abdicate following the capture of Paris by the Coalition; exiled to Elba.",
        importance: "high",
        sources: ["Roberts (2014)"]
      },
      {
        date_or_year: "1815-03",
        event: "Escaped Elba, returned to France during the 'Hundred Days', and mobilized a new army.",
        importance: "high",
        sources: ["Roberts (2014)"]
      },
      {
        date_or_year: "1815-06-18",
        event: "Defeated at Waterloo by Wellington and Blücher; permanently exiled to St. Helena.",
        importance: "high",
        sources: ["Chandler (1966)", "Roberts (2014)"]
      }
    ],
    power_base: "Unrivaled tactical and strategic loyalty of the Grande Armée veterans, plebiscitary populist support from middle classes, and a meritocratic administrative state bureaucracy.",
    core_goals: [
      "Consolidate and codify key social reforms of the French Revolution (equality before law, meritocracy).",
      "Establish French geopolitical hegemony over the European continent, crushing rival monarchical coalitions.",
      "Export centralized administrative structures to conquered territories, breaking feudal monopolies."
    ],
    incentives: [
      "Insatiable personal drive for historical glory and dynastic legitimization.",
      "Defense of France's natural frontiers (Rhine) and revolutionary gains.",
      "Technocratic efficiency of state administrative apparatus."
    ],
    constraints: [
      "Absolute British naval hegemony (exemplified at Trafalgar) preventing direct invasion.",
      "The immense economic cost and geopolitical blowback of the Continental System embargo.",
      "Severe overextension of military supply chains in hostile territory (Spain and Russia)."
    ],
    allies: ["Marshal Michel Ney", "Joachim Murat", "Jean-Baptiste Cambacérès", "Talleyrand (early)"],
    rivals: ["Klemens von Metternich", "Tsar Alexander I", "Duke of Wellington", "William Pitt the Younger", "Talleyrand (later)"],
    institutions_controlled_or_influenced: ["French Empire", "Grande Armée", "The Conseil d'État (Council of State)", "Confederation of the Rhine"],
    ideology_or_worldview: {
      summary: "Centralized authoritarian modernization, combining French Revolutionary egalitarianism, meritocratic technocracy, and legal standardization with plebiscitary dictatorship.",
      evidence: [
        "Napoleonic Code abolishing feudal privileges and religious monopolies.",
        "Systematic creation of the Lycées (elite secondary schools) based strictly on competitive exams."
      ],
      confidence: "high"
    },
    decision_patterns: [
      {
        pattern: "Stunning tactical opportunism and aggressive concentration of force on the battlefield, coupled with centralized micromanagement of civil affairs.",
        examples: [
          "Dividing enemy forces at Austerlitz to shatter their center.",
          "Personally editing drafts of the Civil Code during evening campaigns."
        ],
        confidence: "high"
      }
    ],
    crisis_behavior: "Possessed incredible tactical agility in direct crises (e.g. Six Days' Campaign), but showed systemic strategic rigidity when his grand continental alliances/embargoes faltered.",
    negotiation_style: "Dominating, transactional, backed by immediate threats of overwhelming military force, often dictating terms rather than mediating.",
    risk_tolerance: "high",
    centralization_preference: "high",
    conflict_preference: "high",
    institutional_respect: "low",
    coalition_dependency: "low",
    populism_level: "high",
    technocratic_level: "high",
    game_theory_profile: {
      main_players: ["French Empire", "British Empire", "Russian Empire", "Austrian Empire"],
      likely_objectives: [
        "France: Enforce continental blockade, secure military dominance.",
        "Britain: Break blockade, finance coalition wars, maintain balance of power.",
        "Russia: Retain sovereign trade rights, limit French eastward expansion."
      ],
      payoffs: [
        "Treaty of Tilsit (1807) represented a peak equilibrium dividing Europe between France and Russia, but failed due to mutual structural trust defects."
      ],
      constraints: ["Naval blockades forced Napoleon into increasingly risky land invasions to close European ports."],
      common_strategic_moves: ["Overwhelming preemptive land strikes", "Replacing foreign monarchs with relatives"],
      failure_modes: ["Strategic overreach caused by a refusal to accept a negotiated peace that limited his absolute hegemony."]
    },
    bayesian_assessment: [
      {
        claim: "Napoleon's invasion of Russia was driven primarily by a rational strategic necessity to enforce the Continental System rather than megalomania.",
        prior_confidence: "medium",
        evidence: [
          "Alexander I's formal withdrawal from the Continental System in late 1810 severely threatened the entire French embargo against Britain.",
          "Napoleon's diplomatic communiques repeatedly emphasizing that leaving Russia outside the system rendered all previous trade sacrifices void."
        ],
        posterior_confidence: "high",
        what_would_change_this: "Discovery of private archives showing plans to permanently colonize central Russia regardless of Alexander's trade compliance."
      }
    ],
    historical_comparisons: [
      {
        compared_to: "Julius Caesar",
        similarities: [
          "Rise from brilliant military commander to supreme political dictator.",
          "Instituted massive codification and civil reforms that outlasted their political regimes."
        ],
        differences: [
          "Napoleon operated in a post-Enlightenment nation-state paradigm with rapid mass industrial-military mobilization."
        ],
        confidence: "high"
      }
    ],
    source_quality: {
      overall: "strong",
      notes: "Extensive military dispatches, Napoleon's voluminous correspondence (over 40,000 letters), and massive global historiography.",
      source_count: 5
    },
    sources: [
      "Roberts, Andrew. (2014). Napoleon: A Life.",
      "Chandler, David G. (1966). The Campaigns of Napoleon.",
      "Lefebvre, Georges. (1969). Napoleon.",
      "Clausewitz, Carl von. (1843). The Campaign of 1812 in Russia.",
      "Dwyer, Philip. (2007-2018). Napoleon (Multi-volume biography)."
    ],
    research_gaps: ["Determining the exact psychological state and cognitive decline during the Waterloo campaign remains subject to medical/historical speculation."],
    created_at: "2026-05-31T21:28:20Z",
    updated_at: "2026-05-31T21:28:20Z"
  },

  // 3. Mahatma Gandhi
  {
    person_id: "mahatma_gandhi",
    name: "Mohandas Karamchand Gandhi",
    aliases: ["Mahatma Gandhi", "Bapu", "The Father of the Nation (India)"],
    birth_year: 1869,
    death_year: 1948,
    countries_or_regions: ["India", "South Africa"],
    era: "20th Century / Indian Independence Movement",
    roles: ["Leader of Indian National Congress", "Satyagraha Leader", "Social Reformer"],
    domains: ["Geopolitics", "Social Reform", "Philosophy"],
    priority_tier: 1,
    short_summary: "Leader of the Indian nationalist movement who pioneered 'Satyagraha'—mass nonviolent civil disobedience—forcing the end of British colonial rule in India.",
    timeline: [
      {
        date_or_year: "1893",
        event: "Arrived in South Africa, where he first encountered systemic racial segregation and began organizing resistance.",
        importance: "high",
        sources: ["Guha (2013)"]
      },
      {
        date_or_year: "1906",
        event: "Organized the first Satyagraha (nonviolent resistance) campaign in South Africa against Asiatic registration laws.",
        importance: "high",
        sources: ["Guha (2013)", "Gandhi Autobiography"]
      },
      {
        date_or_year: "1915",
        event: "Returned to India, joining the Indian National Congress and touring the rural heartland.",
        importance: "high",
        sources: ["Guha (2018)"]
      },
      {
        date_or_year: "1917",
        event: "Led the Champaran Satyagraha, securing landmark rights for peasant indigo farmers against British planters.",
        importance: "high",
        sources: ["Guha (2018)", "Gandhi Autobiography"]
      },
      {
        date_or_year: "1920",
        event: "Launched the massive nationwide Non-Cooperation Movement, boycotting British goods and institutions.",
        importance: "high",
        sources: ["Guha (2018)"]
      },
      {
        date_or_year: "1930-03",
        event: "Led the epic 240-mile Salt March to Dandi, defying the British salt monopoly and igniting global sympathy.",
        importance: "high",
        sources: ["Guha (2018)", "Dalton (1993)"]
      },
      {
        date_or_year: "1931",
        event: "Signed the Gandhi-Irwin Pact and attended the Second Round Table Conference in London as sole Congress representative.",
        importance: "high",
        sources: ["Guha (2018)"]
      },
      {
        date_or_year: "1942-08",
        event: "Launched the 'Quit India' Movement, demanding immediate British withdrawal; immediately imprisoned.",
        importance: "high",
        sources: ["Guha (2018)"]
      },
      {
        date_or_year: "1947-08",
        event: "Refused to join Delhi independence celebrations; instead walked through riot-torn Bengal to calm communal violence.",
        importance: "high",
        sources: ["Guha (2018)", "Dalton (1993)"]
      },
      {
        date_or_year: "1948-01-30",
        event: "Assassinated in New Delhi by Hindu nationalist extremist Nathuram Godse.",
        importance: "high",
        sources: ["Guha (2018)"]
      }
    ],
    power_base: "Unprecedented moral and spiritual authority mobilizing millions of Indian peasants, absolute command over the Indian National Congress party structure, and support from key domestic industrialists.",
    core_goals: [
      "Achieve complete national sovereignty (Purna Swaraj) through strictly nonviolent means.",
      "Eradicate communal hatred and preserve Hindu-Muslim unity within a pluralistic subcontinent.",
      "Dismantle caste-based untouchability (Harijan upliftment) and rebuild a self-sufficient village-based agrarian economy."
    ],
    incentives: [
      "Rigorous pursuit of absolute truth (Satya) and moral purity (Ahimsa).",
      "Upliftment of the poorest rural classes (Antyodaya).",
      "Preventing violent revolution that could destabilize post-independence society."
    ],
    constraints: [
      "British colonial state's monopoly on armed force and legal mechanisms.",
      "Severe internal socio-religious factionalism, especially the rising demands for a separate Pakistan.",
      "Strategic challenges from more militant/radical factions within the nationalist movement."
    ],
    allies: ["Jawaharlal Nehru", "Vallabhbhai Patel", "Rajendra Prasad", "Abul Kalam Azad", "C. Rajagopalachari"],
    rivals: ["Muhammad Ali Jinnah (deep partition disagreement)", "Winston Churchill", "B. R. Ambedkar (disagreement on untouchability reform methods)", "Subhas Chandra Bose (disagreement on violence/foreign aid)"],
    institutions_controlled_or_influenced: ["Indian National Congress", "All India Spinners Association", "Sabarmati Ashram", "Harijan Sevak Sangh"],
    ideology_or_worldview: {
      summary: "Satyagraha (truth-force) and Ahimsa (absolute nonviolence), combined with radical decentralization (Gram Swaraj), self-reliance (Swadeshi), and inter-faith pluralism.",
      evidence: [
        "Calling off the entire Non-Cooperation Movement in 1922 following the single Chauri Chaura police station riot.",
        "His extensive writings in Young India and Harijan outlining philosophical systems."
      ],
      confidence: "high"
    },
    decision_patterns: [
      {
        pattern: "Deploying high-impact symbolic actions (fasts, marches, boycotts) to expose the moral bankruptcy of British colonial power and unify diverse Indian demographics.",
        examples: [
          "The choice of common salt as a unifying campaign symbol in 1930.",
          "Undertaking fasts-unto-death to resolve communal violence in Calcutta (1947)."
        ],
        confidence: "high"
      }
    ],
    crisis_behavior: "Exemplified extreme philosophical calm, responding to violence with self-purification and moral pressure, refusing to compromise on nonviolence even under intense political pressure.",
    negotiation_style: "Patient, highly courteous, seeking win-win compromises that preserved the dignity of the opponent, but completely unyielding on core moral principles.",
    risk_tolerance: "high",
    centralization_preference: "low",
    conflict_preference: "low",
    institutional_respect: "medium",
    coalition_dependency: "high",
    populism_level: "high",
    technocratic_level: "low",
    game_theory_profile: {
      main_players: ["Indian National Congress", "British Raj Authorities", "Muslim League"],
      likely_objectives: [
        "Congress: Maintain unified nonviolent pressure, secure single independent state.",
        "British: Divide and rule, delay independence, protect imperial prestige.",
        "Muslim League: Secure sovereign homeland (Pakistan)."
      ],
      payoffs: [
        "Nonviolent mass mobilization shifts the payoff structure of the British state by making physical suppression of millions of peaceful citizens politically and financially unsustainable."
      ],
      constraints: ["British could easily repress violent insurrections, forcing Gandhi to enforce strict nonviolence to maintain tactical advantage."],
      common_strategic_moves: ["Moral posturing", "Voluntary imprisonment to clog administrative systems"],
      failure_modes: ["Failure to bridge the Hindu-Muslim split, leading to partition violence which represented his greatest tragedy."]
    },
    bayesian_assessment: [
      {
        claim: "Gandhi's fasts-unto-death were highly calculated political maneuvers rather than purely spiritual acts.",
        prior_confidence: "medium",
        evidence: [
          "His fast during the 1932 Poona Pact directly forced B.R. Ambedkar to yield on separate electorates for Depressed Classes.",
          "His private letters acknowledging that fasts were the most potent weapon in his satyagraha arsenal, to be used when conventional politics reached an impasse."
        ],
        posterior_confidence: "high",
        what_would_change_this: "Unearthing of private diaries showing a total indifference to the concrete legislative outcomes of his fasts."
      }
    ],
    historical_comparisons: [
      {
        compared_to: "Socrates",
        similarities: [
          "Unyielding commitment to moral truth over state mandates.",
          "Use of dialogic inquiry and passive non-cooperation to challenge authority."
        ],
        differences: [
          "Gandhi mobilized a mass nationalist political movement of millions, whereas Socrates operated primarily as an individual urban philosopher."
        ],
        confidence: "high"
      }
    ],
    source_quality: {
      overall: "strong",
      notes: "The Collected Works of Mahatma Gandhi comprise 100 volumes of primary documents, supported by rigorous modern global scholarship.",
      source_count: 5
    },
    sources: [
      "Guha, Ramachandra. (2013). Gandhi Before India.",
      "Guha, Ramachandra. (2018). Gandhi: The Years That Changed the World, 1914-1948.",
      "Gandhi, M. K. (1927). An Autobiography: The Story of My Experiments with Truth.",
      "Dalton, Dennis. (1993). Mahatma Gandhi: Nonviolent Power in Action.",
      "Fischer, Louis. (1950). The Life of Mahatma Gandhi."
    ],
    research_gaps: ["Debates remain intense regarding his early racial views during his first decade in South Africa (1893-1903)."],
    created_at: "2026-05-31T21:28:20Z",
    updated_at: "2026-05-31T21:28:20Z"
  },

  // 4. Mao Zedong
  {
    person_id: "mao_zedong",
    name: "Mao Zedong",
    aliases: ["Chairman Mao"],
    birth_year: 1893,
    death_year: 1976,
    countries_or_regions: ["China", "East Asia"],
    era: "20th Century / Chinese Civil War / Cold War",
    roles: ["Chairman of the Chinese Communist Party", "President of the People's Republic of China", "Revolutionary Strategist"],
    domains: ["Geopolitics", "Military", "Ideology"],
    priority_tier: 1,
    short_summary: "Founding father of the People's Republic of China who adapted Marxism-Leninism to peasant societies, launched the Cultural Revolution, and fundamentally unified modern China.",
    timeline: [
      {
        date_or_year: "1921",
        event: "Co-founded the Chinese Communist Party (CCP) in Shanghai.",
        importance: "high",
        sources: ["Spence (1999)"]
      },
      {
        date_or_year: "1927",
        event: "Formulated the concept of peasant-based rural guerrilla warfare after the autumn harvest uprising.",
        importance: "high",
        sources: ["Schram (1966)"]
      },
      {
        date_or_year: "1934-1935",
        event: "Led the epic 6,000-mile Long March, cementing his absolute leadership of the CCP during the Zunyi Conference.",
        importance: "high",
        sources: ["Spence (1999)", "Snow (1937)"]
      },
      {
        date_or_year: "1949-10-01",
        event: "Proclaimed the establishment of the People's Republic of China (PRC) from Tiananmen Gate.",
        importance: "high",
        sources: ["Spence (1999)"]
      },
      {
        date_or_year: "1858-1962",
        event: "Launched the Great Leap Forward industrialization campaign, resulting in catastrophic agricultural collapse and widespread famine.",
        importance: "high",
        sources: ["Dikötter (2010)", "Spence (1999)"]
      },
      {
        date_or_year: "1960",
        event: "Initiated the formal Sino-Soviet split, breaking ideological relations with Moscow.",
        importance: "high",
        sources: ["Schram (1966)"]
      },
      {
        date_or_year: "1966",
        event: "Launched the Great Proletarian Cultural Revolution, mobilizing the Red Guards to purge state institutions and party rivals.",
        importance: "high",
        sources: ["MacFarquhar & Schoenhals (2006)"]
      },
      {
        date_or_year: "1972-02",
        event: "Met with US President Richard Nixon in Beijing, initiating strategic realignment against the Soviet Union.",
        importance: "high",
        sources: ["Kissinger (2011)", "Spence (1999)"]
      }
    ],
    power_base: "Unquestioned ideological authority (Mao Zedong Thought), absolute control over the People's Liberation Army (PLA), and a highly mobilized peasant revolutionary demographic.",
    core_goals: [
      "Unify, industrialize, and restore China's historic geopolitical greatness, ending the 'Century of Humiliation'.",
      "Construct a highly centralized peasant-led socialist economy free from Western or Soviet domination.",
      "Maintain ideological purity through permanent revolutionary mass struggles (e.g. Cultural Revolution)."
    ],
    incentives: [
      "Obsessive dread of revisionism and capitalist restoration within the CCP bureaucracy.",
      "Desire for global anti-imperialist leadership.",
      "Securing personal absolute power against internal party rivals."
    ],
    constraints: [
      "Extreme economic underdevelopment, low technological base, and recurring agricultural famines.",
      "Geopolitical isolation during the early Cold War (US containment, later Soviet military threat).",
      "Frictional resistance from pragmatic technocrats within his own party apparatus."
    ],
    allies: ["Zhou Enlai", "Lin Biao (early)", "Jiang Qing (Gang of Four)", "Chen Boda"],
    rivals: ["Chiang Kai-shek", "Nikita Khrushchev (Sino-Soviet rivalry)", "Liu Shaoqi (purged)", "Deng Xiaoping (sidelined)", "Lin Biao (later, dead in crash)"],
    institutions_controlled_or_influenced: ["Chinese Communist Party", "People's Liberation Army", "Central Military Commission", "Central Cultural Revolution Group"],
    ideology_or_worldview: {
      summary: "Maoism (Marxism-Leninism adapted to agrarian societies), emphasizing rural peasant mobilization, permanent class struggle, guerrilla warfare strategy, and continuous revolution under the dictatorship of the proletariat.",
      evidence: [
        "His essays 'On Guerrilla Warfare' (1937) and 'On Contradiction' (1937).",
        "The systematic distribution of the 'Little Red Book' during the Cultural Revolution."
      ],
      confidence: "high"
    },
    decision_patterns: [
      {
        pattern: "Highly radical, high-risk policy lurches that bypassed conventional party bureaucracy in favor of direct mass mobilization.",
        examples: [
          "Bypassing economic planners to launch the Great Leap Forward.",
          "Urging students to 'bombard the headquarters' during the Cultural Revolution."
        ],
        confidence: "high"
      }
    ],
    crisis_behavior: "Exceedingly aggressive and risk-tolerant during strategic crises (e.g. entering the Korean War in 1950, Sino-Soviet border conflicts), viewing tactical retreats (like the Long March) as preparations for overwhelming counterstrikes.",
    negotiation_style: "highly philosophical, cryptic, focusing on grand historical contradictions while leaving concrete technical compromises to Zhou Enlai.",
    risk_tolerance: "high",
    centralization_preference: "high",
    conflict_preference: "high",
    institutional_respect: "low",
    coalition_dependency: "low",
    populism_level: "high",
    technocratic_level: "low",
    game_theory_profile: {
      main_players: ["People's Republic of China", "United States", "Soviet Union", "Taiwan (ROC)"],
      likely_objectives: [
        "PRC: Secure border sovereignty, deter nuclear attack, assert regional leadership.",
        "US: Contain Chinese communism, later leverage PRC against USSR.",
        "USSR: Retain socialist hegemony, contain independent Chinese influence."
      ],
      payoffs: [
        "Nixon-Mao rapprochement (1972) shifted the tripolar Cold War balance, yielding huge security payoffs for China against Soviet military build-ups (Highest payoff)."
      ],
      constraints: ["Fear of dual US-Soviet nuclear encirclement forced tactical flexibility in the 1970s."],
      common_strategic_moves: ["Sudden geopolitical alignments", "Mobilizing asymmetrical mass militancy"],
      failure_modes: ["Ideological purges that crippled state administrative capability and caused immense domestic economic suffering."]
    },
    bayesian_assessment: [
      {
        claim: "Mao initiated the Cultural Revolution primarily to destroy the rising party bureaucracy rather than out of pure paranoia.",
        prior_confidence: "high",
        evidence: [
          "His frequent warnings in late 1964 about the rise of a new privileged bureaucratic class similar to the Soviet Union's Nomenklatura.",
          "His actions targeting central state planners (Liu Shaoqi, Deng Xiaoping) who prioritized economic stability over ideological purity."
        ],
        posterior_confidence: "high",
        what_would_change_this: "Archival evidence proving he planned to establish a conventional hereditary dynastic autocracy prior to 1966."
      }
    ],
    historical_comparisons: [
      {
        compared_to: "Qin Shi Huang",
        similarities: [
          "Unification of a fractured China through absolute centralized tyranny.",
          "Systematic purging of traditional intellectuals and cultural institutions."
        ],
        differences: [
          "Mao operated inside a modern global Marxist-Leninist framework, leveraging mass popular participation rather than pure top-down legalism."
        ],
        confidence: "high"
      }
    ],
    source_quality: {
      overall: "strong",
      notes: "Significant official CCP archives, primary accounts, and comprehensive scholarship from contemporary China specialists.",
      source_count: 5
    },
    sources: [
      "Spence, Jonathan D. (1999). Mao Zedong.",
      "Schram, Stuart. (1966). Mao Tse-tung.",
      "Dikötter, Frank. (2010). Mao's Great Famine.",
      "MacFarquhar, Roderick & Schoenhals, Michael. (2006). Mao's Last Revolution.",
      "Snow, Edgar. (1937). Red Star Over China."
    ],
    research_gaps: ["Access to classified CCP Central Committee archives regarding his private decisions during the early phase of the Great Leap Forward remains restricted."],
    created_at: "2026-05-31T21:28:20Z",
    updated_at: "2026-05-31T21:28:20Z"
  },

  // 5. Vladimir Lenin
  {
    person_id: "vladimir_lenin",
    name: "Vladimir Lenin",
    aliases: ["Vladimir Ilyich Ulyanov", "Lenin"],
    birth_year: 1870,
    death_year: 1924,
    countries_or_regions: ["Russia", "Soviet Union", "Europe"],
    era: "Late 19th / Early 20th Century / Russian Revolution / WWI",
    roles: ["Chairman of the Council of People's Commissars", "Founder of the Bolshevik Party", "Revolutionary Theoretician"],
    domains: ["Geopolitics", "Ideology", "Statecraft"],
    priority_tier: 1,
    short_summary: "Bolshevik revolutionary who overthrew the Russian Provisional Government in the 1917 October Revolution, founding the Soviet state and reshaping global geopolitics.",
    timeline: [
      {
        date_or_year: "1902",
        event: "Published 'What Is to Be Done?', outlining his core theory of a highly disciplined, vanguard revolutionary party.",
        importance: "high",
        sources: ["Service (2000)", "Lenin Works"]
      },
      {
        date_or_year: "1903",
        event: "Engineered the split of the Russian Social Democratic Labour Party, establishing the Bolshevik faction.",
        importance: "high",
        sources: ["Service (2000)"]
      },
      {
        date_or_year: "1917-04",
        event: "Returned to Russia in a sealed train provided by Germany; published the radical 'April Theses'.",
        importance: "high",
        sources: ["Service (2000)", "Trotsky (1932)"]
      },
      {
        date_or_year: "1917-11-07",
        event: "Led the October Revolution, successfully seizing state power from the Provisional Government in Petrograd.",
        importance: "high",
        sources: ["Trotsky (1932)", "Reed (1919)"]
      },
      {
        date_or_year: "1918-03",
        event: "Signed the humiliating Treaty of Brest-Litovsk, yielding massive territories to Germany to exit WWI.",
        importance: "high",
        sources: ["Service (2000)", "Kennan (1956)"]
      },
      {
        date_or_year: "1918-1921",
        event: "Instituted 'War Communism' and authorized the Red Terror during the brutal Russian Civil War.",
        importance: "high",
        sources: ["Figes (1996)"]
      },
      {
        date_or_year: "1921-03",
        event: "Replaced War Communism with the pragmatic New Economic Policy (NEP), reintroducing limited capitalism.",
        importance: "high",
        sources: ["Service (2000)", "Figes (1996)"]
      },
      {
        date_or_year: "1922-12-30",
        event: "Formally established the Union of Soviet Socialist Republics (USSR).",
        importance: "high",
        sources: ["Service (2000)"]
      }
    ],
    power_base: "Highly disciplined, ideologically unified Bolshevik vanguard cadre network, the Red Army organized by Trotsky, the Cheka secret police, and the Soviet state apparatus.",
    core_goals: [
      "Overthrow the Tsarist autocracy and capitalist structures in Russia.",
      "Establish a vanguard-led proletarian dictatorship to build a socialist state.",
      "Catalyze and support a global proletarian revolution across industrialized Europe."
    ],
    incentives: [
      "Unyielding ideological commitment to Marxist historical materialism.",
      "Survival of the Bolshevik revolutionary state at all costs.",
      "Preventing domestic reaction or capitalist restoration in post-Tsarist Russia."
    ],
    constraints: [
      "Complete economic devastation and industrial collapse after WWI and the Civil War.",
      "Hostile encirclement by Western capitalist powers (Allied intervention).",
      "Massive peasant resistance to Bolshevik grain requisitioning and urban-centric ideology."
    ],
    allies: ["Leon Trotsky", "Lev Kamenev", "Grigory Zinoviev", "Yakov Sverdlov", "Joseph Stalin (early)"],
    rivals: ["Tsar Nicholas II", "Alexander Kerensky", "Julius Martov (Menshevik faction leader)", "General Anton Denikin (White forces)"],
    institutions_controlled_or_influenced: ["Bolshevik Party", "Council of People's Commissars (Sovnarkom)", "The Comintern (Third International)", "The Cheka"],
    ideology_or_worldview: {
      summary: "Leninism (adaptation of Marxism to imperialist era), arguing that socialist revolution must be spearheaded by a highly disciplined vanguard party, skipping advanced capitalist phases in developing nations.",
      evidence: [
        "His core theoretical monographs: 'Imperialism, the Highest Stage of Capitalism' (1917) and 'The State and Revolution' (1917)."
      ],
      confidence: "high"
    },
    decision_patterns: [
      {
        pattern: "Ruthless pragmatism in tactical execution combined with absolute rigidity in core ideological goals.",
        examples: [
          "Accepting the devastating Treaty of Brest-Litovsk to preserve the Bolshevik state.",
          "Launching the capitalist-leaning NEP in 1921 when War Communism caused mass peasant uprisings."
        ],
        confidence: "high"
      }
    ],
    crisis_behavior: "Exceedingly cool, decisive, and unsentimental; responded to structural threats (like civil war and assassination attempts) with immediate centralization, state terror, and tactical policy pivots.",
    negotiation_style: "highly polemical, aggressive, using debates to expose and humiliate ideological opponents, compromising only when physically forced.",
    risk_tolerance: "high",
    centralization_preference: "high",
    conflict_preference: "high",
    institutional_respect: "low",
    coalition_dependency: "medium",
    populism_level: "high",
    technocratic_level: "medium",
    game_theory_profile: {
      main_players: ["Bolshevik Russia", "German Empire (WWI)", "Allied Powers", "White Russian Forces"],
      likely_objectives: [
        "Bolsheviks: Survived, secure state control, spread revolution.",
        "Germany: Secure eastern front, extract territorial concessions.",
        "Allies: Re-establish eastern front, suppress Bolshevik threat."
      ],
      payoffs: [
        "Brest-Litovsk treaty represented an extreme territorial payoff concession to Germany, but saved the Bolshevik vanguard from total destruction (Highest survival payoff)."
      ],
      constraints: ["Military collapse of Russian armies forced complete capitulation on the eastern front."],
      common_strategic_moves: ["Tactical retreats", "Leveraging international labor class dissension"],
      failure_modes: ["Severe economic collapse and internal famines resulting from the dogmatic enforcement of early War Communism."]
    },
    bayesian_assessment: [
      {
        claim: "Lenin accepted German funding during 1917 not out of national betrayal, but because he viewed both Germany and Russia as corrupt imperialist states to be destroyed by revolution.",
        prior_confidence: "high",
        evidence: [
          "His explicit writings in 1917 arguing that any means were justified to spark international revolution.",
          "The rapid Bolshevik efforts to subvert the German military immediately after signing Brest-Litovsk in 1818."
        ],
        posterior_confidence: "high",
        what_would_change_this: "Discovery of secret personal accounts showing Lenin planned to subordinate a future Soviet state to German imperial interests permanently."
      }
    ],
    historical_comparisons: [
      {
        compared_to: "Maximilien Robespierre",
        similarities: [
          "Vanguard revolutionary intellectual who established systemic state terror to protect the republic/revolution.",
          "Absolute personal incorruptibility and dedication to ideological dogmas."
        ],
        differences: [
          "Lenin successfully constructed a durable bureaucratic state structure (USSR) that lasted decades, whereas Robespierre's apparatus collapsed quickly."
        ],
        confidence: "high"
      }
    ],
    source_quality: {
      overall: "strong",
      notes: "Massive documentation including Lenin's Collected Works (55 volumes), extensive Soviet archives opened post-1991, and rigorous global academic biographies.",
      source_count: 5
    },
    sources: [
      "Service, Robert. (2000). Lenin: A Biography.",
      "Figes, Orlando. (1996). A People's Tragedy: The Russian Revolution 1891-1924.",
      "Trotsky, Leon. (1932). History of the Russian Revolution.",
      "Reed, John. (1919). Ten Days That Shook the World.",
      "Kennan, George F. (1956). Russia Leaves the War."
    ],
    research_gaps: ["The exact degree of Lenin's personal cognitive control during his final year (1923) after multiple strokes remains debated among medical historians."],
    created_at: "2026-05-31T21:28:20Z",
    updated_at: "2026-05-31T21:28:20Z"
  },

  // 6. Gamal Abdel Nasser
  {
    person_id: "gamal_abdel_nasser",
    name: "Gamal Abdel Nasser",
    aliases: ["Nasser"],
    birth_year: 1918,
    death_year: 1970,
    countries_or_regions: ["Egypt", "Middle East", "Arab World", "Africa"],
    era: "20th Century / Cold War / Decolonization / Arab Nationalism",
    roles: ["President of Egypt", "Leader of the Free Officers Movement"],
    domains: ["Geopolitics", "Statecraft", "Military"],
    priority_tier: 1,
    short_summary: "Egyptian President who nationalized the Suez Canal, championed Pan-Arabism (Nasserism), and became a legendary symbol of anti-colonial resistance in the developing world.",
    timeline: [
      {
        date_or_year: "1952-07-23",
        event: "Led the Free Officers coup that overthrew King Farouk and abolished the Egyptian monarchy.",
        importance: "high",
        sources: ["Aburish (2004)"]
      },
      {
        date_or_year: "1954",
        event: "Assumed absolute power in Egypt, sidelining President Muhammad Naguib after an assassination attempt by the Muslim Brotherhood.",
        importance: "high",
        sources: ["Aburish (2004)", "Stephens (1971)"]
      },
      {
        date_or_year: "1955",
        event: "Attended the historic Bandung Conference, establishing himself as a founding father of the Non-Aligned Movement.",
        importance: "high",
        sources: ["Bandung Conference Archives"]
      },
      {
        date_or_year: "1956-07-26",
        event: "Nationalized the Suez Canal Company, defying British and French imperial interests.",
        importance: "high",
        sources: ["Aburish (2004)", "Kyle (1991)"]
      },
      {
        date_or_year: "1956-10-11",
        event: "Suez Crisis: Achieved huge geopolitical victory after US and Soviet diplomatic pressure forced British, French, and Israeli withdrawal.",
        importance: "high",
        sources: ["Kyle (1991)"]
      },
      {
        date_or_year: "1958",
        event: "Founded the United Arab Republic (UAR), a political union between Egypt and Syria.",
        importance: "high",
        sources: ["Stephens (1971)"]
      },
      {
        date_or_year: "1962",
        event: "Intervened in the North Yemen Civil War, engaging Egyptian forces in a long proxy conflict with Saudi Arabia.",
        importance: "high",
        sources: ["Aburish (2004)"]
      },
      {
        date_or_year: "1967-06",
        event: "Six-Day War: Suffered catastrophic military defeat by Israel; offered resignation, but returned to power after massive public demonstrations.",
        importance: "high",
        sources: ["Oren (2002)", "Aburish (2004)"]
      }
    ],
    power_base: "Vast popular adoration of the Arab working class (the street), absolute loyalty of the Free Officers military clique, state intelligence apparatus (Mukhabarat), and control over nationalized economic assets.",
    core_goals: [
      "Eliminate British and Western imperial influence in Egypt and the wider Middle East.",
      "Unify the Arab world under Egyptian secular leadership (Pan-Arabism).",
      "Modernize Egypt's infrastructure and redistribute wealth through Arab Socialism (e.g. Aswan High Dam)."
    ],
    incentives: [
      "Championing Egyptian sovereignty and regional leadership.",
      "Retaining popularity as the moral voice of anti-colonialism.",
      "Neutralizing domestic religious and Marxist factions that challenged secular military rule."
    ],
    constraints: [
      "Severe economic underdevelopment and dependence on foreign aid (eventually Soviet financial backing).",
      "Chronic military inferiority and strategic vulnerability in wars with Israel.",
      "Resistance to Egyptian hegemony from conservative Arab monarchies (like Saudi Arabia)."
    ],
    allies: ["Anwar Sadat", "Abdel Hakim Amer", "Jawaharlal Nehru", "Josip Broz Tito", "Nikita Khrushchev (key sponsor)"],
    rivals: ["David Ben-Gurion", "King Faisal of Saudi Arabia", "Western Powers (UK, France)", "The Muslim Brotherhood (domestic opposition)"],
    institutions_controlled_or_influenced: ["Republic of Egypt", "Free Officers Movement", "Arab Socialist Union", "Non-Aligned Movement"],
    ideology_or_worldview: {
      summary: "Nasserism (Pan-Arab nationalism combined with Arab Socialism, secular modernization, and international non-alignment).",
      evidence: [
        "His programmatic manifesto 'The Philosophy of the Revolution' (1954).",
        "Nationalization of land, major industries, and foreign assets."
      ],
      confidence: "high"
    },
    decision_patterns: [
      {
        pattern: "Bold, highly risky geopolitical gambles designed to capture popular sentiment, relying on international rivalries (US-USSR) to escape domestic military failures.",
        examples: [
          "Nationalizing the Suez Canal without consulting his cabinet.",
          "Requesting UN peacekeeper withdrawal and blockading the Straits of Tiran in 1967."
        ],
        confidence: "high"
      }
    ],
    crisis_behavior: "Extremely defiant and charismatic during geopolitical crises, leveraging public mobilization to survive catastrophic military setbacks (like 1967).",
    negotiation_style: "highly rhetorical, populist, refusing to compromise on public sovereignty, while secretly conducting highly pragmatic backdoor diplomacy.",
    risk_tolerance: "high",
    centralization_preference: "high",
    conflict_preference: "high",
    institutional_respect: "medium",
    coalition_dependency: "medium",
    populism_level: "high",
    technocratic_level: "medium",
    game_theory_profile: {
      main_players: ["Egypt", "Israel", "Great Britain / France", "United States", "Soviet Union"],
      likely_objectives: [
        "Egypt: Secure canal revenue, assert leadership, deter Israeli strikes.",
        "Israel: Secure shipping rights, preempt Egyptian build-up.",
        "US/USSR: Limit regional escalations, gain cold war client states."
      ],
      payoffs: [
        "Nasser nationalized the canal, risking war, but accurately calculated that the US would not back Anglo-French military action, yielding massive political payoffs (Highest prestige payoff)."
      ],
      constraints: ["Severe military weakness in conventional warfare with Israel limited his tactical options in 1967."],
      common_strategic_moves: ["Brinkmanship", "Leveraging public opinion to force superpowers to intervene"],
      failure_modes: ["Catastrophic strategic miscalculation in 1967 leading to the destruction of the Egyptian Air Force on the ground."]
    },
    bayesian_assessment: [
      {
        claim: "Nasser did not actually want war with Israel in 1967 but was trapped by his own Pan-Arab rhetorical commitments and faulty Soviet intelligence.",
        prior_confidence: "high",
        evidence: [
          "Soviet intelligence reports falsely warning of Israeli troop build-ups on the Syrian border in May 1967.",
          "His private communications to diplomats stating that his mobilization in Sinai was intended strictly as a deterrent, but political pressure forced him to close the Straits."
        ],
        posterior_confidence: "high",
        what_would_change_this: "Discovery of concrete Egyptian military orders dated prior to June 1967 outlining a planned preemptive invasion of Israel."
      }
    ],
    historical_comparisons: [
      {
        compared_to: "Simon Bolivar",
        similarities: [
          "Secular military leader who attempted to unify an entire ethnically/linguistically coherent continent.",
          "Died with their unification dreams in collapse due to fierce regional factionalism."
        ],
        differences: [
          "Nasser operated inside a Cold War post-colonial superpower rivalry, using radio and media for mass pan-national propaganda."
        ],
        confidence: "high"
      }
    ],
    source_quality: {
      overall: "medium",
      notes: "Large body of Arabic and Western diplomatic documents, though some military files from the 1967 war remain classified in Egypt.",
      source_count: 5
    },
    sources: [
      "Aburish, Said K. (2004). Nasser: The Last Arab.",
      "Stephens, Robert. (1971). Nasser: A Political Biography.",
      "Kyle, Keith. (1991). Suez: Britain's End of Empire in the Middle East.",
      "Oren, Michael B. (2002). Six Days of War: June 1967 and the Making of the Modern Middle East.",
      "Heikal, Mohamed. (1973). The Cairo Documents."
    ],
    research_gaps: ["The exact level of Egyptian intelligence complicity in provoking the 1967 crisis remains heavily contested in Middle Eastern historiography."],
    created_at: "2026-05-31T21:28:20Z",
    updated_at: "2026-05-31T21:28:20Z"
  },

  // 7. Nelson Mandela
  {
    person_id: "nelson_mandela",
    name: "Nelson Rolihlahla Mandela",
    aliases: ["Madiba", "Mandela"],
    birth_year: 1918,
    death_year: 2013,
    countries_or_regions: ["South Africa", "Africa"],
    era: "20th / 21st Century / Anti-Apartheid / Democratic Transition",
    roles: ["President of South Africa", "President of the African National Congress", "Umkhonto we Sizwe Commander"],
    domains: ["Geopolitics", "Statecraft", "Human Rights"],
    priority_tier: 1,
    short_summary: "Anti-apartheid revolutionary and President of South Africa who led the transition from white-minority rule to multi-racial democracy, embodying national reconciliation.",
    timeline: [
      {
        date_or_year: "1944",
        event: "Co-founded the ANC Youth League, advocating for militant mass action against segregation.",
        importance: "high",
        sources: ["Sampson (1999)"]
      },
      {
        date_or_year: "1961",
        event: "Co-founded Umkhonto we Sizwe ('Spear of the Nation'), the armed wing of the ANC, launching sabotage campaigns.",
        importance: "high",
        sources: ["Sampson (1999)", "Mandela Autobiography"]
      },
      {
        date_or_year: "1964-06-12",
        event: "Sentenced to life imprisonment during the Rivonia Trial; delivered his famous 'I am prepared to die' speech.",
        importance: "high",
        sources: ["Rivonia Trial transcripts"]
      },
      {
        date_or_year: "1985",
        event: "Began secret, un-mandated negotiations with South African government officials while in Pollsmoor Prison.",
        importance: "high",
        sources: ["Sampson (1999)", "Sparks (1995)"]
      },
      {
        date_or_year: "1990-02-11",
        event: "Released from Victor Verster Prison after 27 years of incarceration by President F.W. de Klerk.",
        importance: "high",
        sources: ["Sampson (1999)"]
      },
      {
        date_or_year: "1993",
        event: "Awarded the Nobel Peace Prize jointly with F.W. de Klerk for their transition negotiations.",
        importance: "high",
        sources: ["Nobel archives"]
      },
      {
        date_or_year: "1994-04",
        event: "Elected President of South Africa in the nation's first fully representative democratic elections.",
        importance: "high",
        sources: ["Sampson (1999)"]
      },
      {
        date_or_year: "1995",
        event: "Famously donned the Springbok rugby jersey during the Rugby World Cup, a potent symbol of white-black reconciliation.",
        importance: "high",
        sources: ["Carlin (2008)"]
      },
      {
        date_or_year: "1999",
        event: "Stepped down voluntarily after a single presidential term, setting a powerful democratic precedent in Africa.",
        importance: "high",
        sources: ["Sampson (1999)"]
      }
    ],
    power_base: "Unrivaled moral legitimacy among South Africa's black majority, strict discipline of the ANC political party, international anti-apartheid sanction coalitions, and a global moral consensus.",
    core_goals: [
      "Dismantle the white-minority Apartheid regime permanently.",
      "Avert a bloody racial civil war during the democratic transition.",
      "Construct a stable, multi-racial constitutional democracy ('The Rainbow Nation') protecting minority rights."
    ],
    incentives: [
      "Achieve absolute legal and social equality for all South Africans.",
      "Prevent economic collapse and capital flight by reassuring white business elites.",
      "Re-integrating South Africa into the global community."
    ],
    constraints: [
      "Armed far-right white militarist groups threat of violent secession.",
      "Violent political factionalism between ANC and Inkatha Freedom Party.",
      "Severe structural poverty and massive post-Apartheid economic inequalities."
    ],
    allies: ["Oliver Tambo", "Desmond Tutu", "Joe Slovo", "Cyril Ramaphosa", "F. W. de Klerk (cooperative transition partner)"],
    rivals: ["P. W. Botha", "Mangosuthu Buthelezi (Inkatha factional rivalry)", "Eugene Terre'Blanche (Afrikaner far-right resistance)"],
    institutions_controlled_or_influenced: ["African National Congress", "Republic of South Africa", "Umkhonto we Sizwe"],
    ideology_or_worldview: {
      summary: "Inclusive, non-racial constitutional democracy, combining social democratic economic redistribution with radical national reconciliation and institutional rule of law.",
      evidence: [
        "The Freedom Charter (1955) declaring that South Africa belongs to all who live in it, black and white.",
        "Establishing the Truth and Reconciliation Commission chaired by Desmond Tutu."
      ],
      confidence: "high"
    },
    decision_patterns: [
      {
        pattern: "Highly pragmatic, mediation-focused consensus building, using powerful symbolic gestures of reconciliation to disarm violent opponents.",
        examples: [
          "Secretly learning Afrikaans in prison to understand his jailers' psychology.",
          "Visiting the widow of Apartheid founder Hendrik Verwoerd in an Afrikaner enclave."
        ],
        confidence: "high"
      }
    ],
    crisis_behavior: "Remarkably disciplined and calm under extreme pressure; famously de-escalated nationwide racial riots after the 1993 assassination of Chris Hani by addressing the nation on television.",
    negotiation_style: "highly dignified, polite, focusing on building personal trust with adversaries, but absolute and uncompromising on the principle of one-person, one-vote.",
    risk_tolerance: "high",
    centralization_preference: "medium",
    conflict_preference: "low",
    institutional_respect: "high",
    coalition_dependency: "high",
    populism_level: "medium",
    technocratic_level: "medium",
    game_theory_profile: {
      main_players: ["African National Congress", "National Party (White Government)", "Inkatha Freedom Party"],
      likely_objectives: [
        "ANC: Establish non-racial democracy, protect minority rights to prevent war.",
        "National Party: Protect white minority property, secure amnesty.",
        "IFP: Protect Zulu regional autonomy."
      ],
      payoffs: [
        "Negotiated transition (CODESA) avoided a catastrophic racial war (which would have yielded negative payoffs for all side) in favor of shared democratic stability (Highest cooperative payoff)."
      ],
      constraints: ["Fear of total capital flight forced Mandela to protect property rights and market capitalism in the new constitution."],
      common_strategic_moves: ["Power-sharing agreements (Government of National Unity)", "Mutual security guarantees"],
      failure_modes: ["Inability to rapidly eradicate deep-seated economic inequality, leading to long-term post-apartheid social unrest."]
    },
    bayesian_assessment: [
      {
        claim: "Mandela's embrace of armed struggle in 1961 was a tactical geopolitical calculation rather than an ideological conversion to militarism.",
        prior_confidence: "high",
        evidence: [
          "His Rivonia trial speech explicitly stating that he turned to violence only when all legal channels of protest were banned.",
          "The immediate ANC return to negotiations once the government showed genuine willingness to dismantle apartheid laws."
        ],
        posterior_confidence: "high",
        what_would_change_this: "Discovery of private pre-1961 writings indicating he viewed guerrilla warfare as the primary desirable method for socialist state-building."
      }
    ],
    historical_comparisons: [
      {
        compared_to: "Abraham Lincoln",
        similarities: [
          "Preserved national unity and defeated system of institutional racial oppression.",
          "Prioritized national reconciliation and amnesty over punitive vengeance."
        ],
        differences: [
          "Mandela achieved his goals primarily through negotiated transition rather than winning a massive domestic civil war."
        ],
        confidence: "high"
      }
    ],
    source_quality: {
      overall: "strong",
      notes: "Massive primary archives, including Mandela's prison writings, official transition negotiation records, and extensive global scholarship.",
      source_count: 5
    },
    sources: [
      "Sampson, Anthony. (1999). Mandela: The Authorized Biography.",
      "Mandela, Nelson. (1994). Long Walk to Freedom.",
      "Sparks, Allister. (1995). Tomorrow is Another Country.",
      "Carlin, John. (2008). Playing the Enemy: Nelson Mandela and the Game that Made a Nation.",
      "Lodge, Tom. (2006). Mandela: A Critical Life."
    ],
    research_gaps: ["Debates continue regarding the exact terms and compromises made during the secret pre-1990 prison talks with government intelligence officials."],
    created_at: "2026-05-31T21:28:20Z",
    updated_at: "2026-05-31T21:28:20Z"
  },

  // 8. Simón Bolívar
  {
    person_id: "simon_bolivar",
    name: "Simón Bolívar",
    aliases: ["El Libertador", "The George Washington of South America"],
    birth_year: 1783,
    death_year: 1830,
    countries_or_regions: ["Venezuela", "Colombia", "Ecuador", "Peru", "Bolivia", "Latin America"],
    era: "Early 19th Century / Spanish-American Wars of Independence",
    roles: ["President of Gran Colombia", "Supreme Dictator of Peru", "Liberator of South America"],
    domains: ["Geopolitics", "Military", "Statecraft"],
    priority_tier: 1,
    short_summary: "Revolutionary general and statesman who led the liberation of northern South America from Spanish colonial rule and founded the republic of Gran Colombia.",
    timeline: [
      {
        date_or_year: "1813",
        event: "Declared 'War to the Death' against Spanish royalists; successfully captured Caracas and declared El Libertador.",
        importance: "high",
        sources: ["Lynch (2006)"]
      },
      {
        date_or_year: "1815",
        event: "Exiled to Jamaica; penned the famous 'Jamaica Letter' outlining his vision for a unified republican South America.",
        importance: "high",
        sources: ["Jamaica Letter (1815)", "Lynch (2006)"]
      },
      {
        date_or_year: "1819-08-07",
        event: "Won the decisive Battle of Boyacá after leading his army across the freezing Andes, liberating New Granada.",
        importance: "high",
        sources: ["Lynch (2006)"]
      },
      {
        date_or_year: "1819-12",
        event: "Founded the Republic of Gran Colombia, uniting Venezuela, New Granada, and Ecuador.",
        importance: "high",
        sources: ["Lynch (2006)"]
      },
      {
        date_or_year: "1822-07",
        event: "Met secretly with José de San Martín during the Guayaquil Conference; assumed sole leadership of the South American liberation wars.",
        importance: "high",
        sources: ["Lynch (2006)", "Collier (1983)"]
      },
      {
        date_or_year: "1824",
        event: "Secured absolute liberation of Peru after the battles of Junín and Ayacucho (led by Sucre).",
        importance: "high",
        sources: ["Lynch (2006)"]
      },
      {
        date_or_year: "1828",
        event: "Declared himself Supreme Dictator of Gran Colombia to prevent regional collapse; survived assassination attempt.",
        importance: "high",
        sources: ["Lynch (2006)"]
      },
      {
        date_or_year: "1830",
        event: "Resigned presidency in despair as Gran Colombia dissolved; died of tuberculosis shortly after.",
        importance: "high",
        sources: ["Lynch (2006)"]
      }
    ],
    power_base: "Loyalty of the multi-racial revolutionary patriot armies, personal charismatic authority, backing of creole elites, and executive dictatorial decrees.",
    core_goals: [
      "Eradicate Spanish colonial rule completely from South America.",
      "Unify liberated territories into a singular, powerful union (Gran Colombia) to deter European re-colonization.",
      "Establish centralized republican institutions that balanced liberty with absolute executive stability."
    ],
    incentives: [
      "Eradication of Spanish royalist presence.",
      "Achieving immortal historical glory as 'El Libertador'.",
      "Preventing racial civil wars and regional anarchy in post-colonial territories."
    ],
    constraints: [
      "Extreme geographic fragmentation and complete lack of infrastructure across South America.",
      "Deep racial, class, and regional conflicts between creoles, mestizos, and indigenous populations.",
      "Severe financial exhaustion and massive war debts owed to Britain."
    ],
    allies: ["Antonio José de Sucre", "Manuela Sáenz", "Francisco de Paula Santander (early)"],
    rivals: ["Spanish Royalist Commanders", "Francisco de Paula Santander (later, over federalism vs centralization)", "José Antonio Páez", "José de San Martín (geopolitical rival)"],
    institutions_controlled_or_influenced: ["Republic of Gran Colombia", "Republic of Peru", "Republic of Bolivia (named after him)"],
    ideology_or_worldview: {
      summary: "Centralized constitutional republicanism, arguing that Latin America's unique lack of civic experience under Spanish rule required strong, lifelong executives and centralist states rather than US-style federalism.",
      evidence: [
        "The Angostura Address (1819) warning against copying foreign constitutional templates.",
        "Drafting the Constitution of Bolivia (1826) featuring a lifelong president and hereditary senate."
      ],
      confidence: "high"
    },
    decision_patterns: [
      {
        pattern: "Bold, highly risky military maneuvers (Andean crossings) combined with a political transition from liberal republicanism to autocratic centralization when regional anarchy threatened.",
        examples: [
          "Crossing the high-altitude Páramo de Pisba to surprise royalists at Boyacá.",
          "Assuming dictatorial powers in 1828 to bypass regional parliamentary gridlock."
        ],
        confidence: "high"
      }
    ],
    crisis_behavior: "Highly resilient in defeat, turning structural setbacks into opportunities, but grew deeply pessimistic and autocratic during the political disintegration of Gran Colombia.",
    negotiation_style: "highly dramatic, eloquent, leveraging his supreme personal prestige, but ultimately preferred absolute military or dictatorial resolution over compromise.",
    risk_tolerance: "high",
    centralization_preference: "high",
    conflict_preference: "high",
    institutional_respect: "medium",
    coalition_dependency: "medium",
    populism_level: "medium",
    technocratic_level: "low",
    game_theory_profile: {
      main_players: ["Patriot Forces (Bolivar)", "Spanish Empire", "Local Creole Elites", "British Empire"],
      likely_objectives: [
        "Bolivar: Unified South American state, complete independence.",
        "Spain: Retain colonial revenues, suppress revolution.",
        "Creole Elites: Retain regional power, avoid centralized taxes."
      ],
      payoffs: [
        "Independence from Spain was successfully won, but local elites found higher payoffs in regional secession (leading to Venezuela/Ecuador splits), destroying the Gran Colombia equilibrium (Bolivar's tragedy)."
      ],
      constraints: ["Lack of financial capital forced dependency on British lenders, creating long-term fiscal constraints."],
      common_strategic_moves: ["Preemptive strikes", "Drafting constitutions to appease local generals"],
      failure_modes: ["Autocratic centralization in his final years alienated liberal allies, causing rapid political fragmentation."]
    },
    bayesian_assessment: [
      {
        claim: "Bolivar assumed dictatorial power in 1828 to prevent a civil war rather than to establish a personal monarchy.",
        prior_confidence: "medium",
        evidence: [
          "His correspondence repeatedly rejecting proposals from French and British diplomats to crown him king.",
          "The severe regional armed uprisings led by Páez in Venezuela that directly threatened to dissolve the union by force in 1826."
        ],
        posterior_confidence: "high",
        what_would_change_this: "Discovery of private archives showing Bolivar actively ordering the creation of royal crown regalia for himself in late 1827."
      }
    ],
    historical_comparisons: [
      {
        compared_to: "Napoleon Bonaparte",
        similarities: [
          "Brilliant military commander who assumed dictatorial/authoritarian state power to stabilize a post-revolutionary state.",
          "Highly influenced by Enlightenment thought, export civil reforms via military force."
        ],
        differences: [
          "Bolivar consistently rejected establishing a hereditary monarchy, remaining committed to a republican (albeit centralized) framework."
        ],
        confidence: "high"
      }
    ],
    source_quality: {
      overall: "strong",
      notes: "Vast primary documentation, including Bolivar's voluminous public letters, Angostura/Bolivian constitutional drafts, and extensive South American historiography.",
      source_count: 5
    },
    sources: [
      "Lynch, John. (2006). Simón Bolívar: A Life.",
      "Masur, Gerhard. (1948). Simón Bolívar.",
      "Bolívar, Simón. (1815). Jamaica Letter.",
      "Collier, Simon. (1983). The Guayaquil Meeting with San Martín.",
      "Madariaga, Salvador de. (1952). Bolívar."
    ],
    research_gaps: ["The exact details and spoken dialogue of the Guayaquil meeting with San Martín (1822) remain unrecorded, leaving historians to infer outcomes from subsequent actions."],
    created_at: "2026-05-31T21:28:20Z",
    updated_at: "2026-05-31T21:28:20Z"
  },

  // 9. Otto von Bismarck
  {
    person_id: "otto_von_bismarck",
    name: "Otto von Bismarck",
    aliases: ["The Iron Chancellor", "Otto Eduard Leopold von Bismarck"],
    birth_year: 1815,
    death_year: 1898,
    countries_or_regions: ["Germany", "Prussia", "Europe"],
    era: "19th Century / German Unification / European Balance of Power",
    roles: ["Chancellor of the German Empire", "Minister President of Prussia"],
    domains: ["Geopolitics", "Statecraft", "Diplomacy"],
    priority_tier: 1,
    short_summary: "Prussian statesman who engineered the unification of Germany in 1871 through a series of decisive wars and established a stable European balance of power through Realpolitik.",
    timeline: [
      {
        date_or_year: "1862",
        event: "Appointed Minister President of Prussia by King Wilhelm I; delivered his famous 'Blood and Iron' speech.",
        importance: "high",
        sources: ["Steinberg (2011)", "Pflug (1990)"]
      },
      {
        date_or_year: "1864",
        event: "Engineered alliance with Austria to defeat Denmark, securing Schleswig-Holstein.",
        importance: "high",
        sources: ["Steinberg (2011)"]
      },
      {
        date_or_year: "1866",
        event: "Austro-Prussian War: Defeated Austria at Sadowa; established the North German Confederation, sidelining Austria.",
        importance: "high",
        sources: ["Steinberg (2011)", "Taylor (1955)"]
      },
      {
        date_or_year: "1870-07",
        event: "Edited the Ems Dispatch to provoke France into declaring war, successfully mobilizing southern German states.",
        importance: "high",
        sources: ["Steinberg (2011)", "Ems Dispatch archives"]
      },
      {
        date_or_year: "1871-01-18",
        event: "Proclaimed the German Empire at the Palace of Versailles; appointed first Imperial Chancellor.",
        importance: "high",
        sources: ["Steinberg (2011)", "Taylor (1955)"]
      },
      {
        date_or_year: "1872-1878",
        event: "Launched the 'Kulturkampf' (culture struggle) against the Roman Catholic Church's domestic influence.",
        importance: "high",
        sources: ["Steinberg (2011)"]
      },
      {
        date_or_year: "1878",
        event: "Presided over the Congress of Berlin, acting as 'honest broker' to defuse Balkan crisis between major powers.",
        importance: "high",
        sources: ["Taylor (1954)"]
      },
      {
        date_or_year: "1883-1889",
        event: "Introduced the world's first modern welfare state (accident, health, and old-age insurance) to co-opt socialism.",
        importance: "high",
        sources: ["Steinberg (2011)", "Welfare archives"]
      },
      {
        date_or_year: "1890",
        event: "Forced to resign by the ambitious new Emperor, Kaiser Wilhelm II.",
        importance: "high",
        sources: ["Steinberg (2011)", "Pflug (1990)"]
      }
    ],
    power_base: "Absolute backing and trust of Prussian King Wilhelm I, dominance of the Prussian military, junker agrarian aristocracy, and supreme control over the imperial bureaucracy.",
    core_goals: [
      "Unify Germany under Prussian hegemony while strictly excluding the multi-national Austrian Empire.",
      "Maintain a complex network of European diplomatic alliances to keep France isolated and prevent a war on two fronts.",
      "Preserve monarchical-conservative political structures against rising democratic socialism and liberalism."
    ],
    incentives: [
      "Prussian loyalty and preservation of Junker aristocratic privilege.",
      "Consolidation of the German Empire's newly won borders.",
      "Prevention of any coalition of European powers against Germany (the 'cauchemar des coalitions')."
    ],
    constraints: [
      "Geopolitical vulnerability of Germany's central European geography.",
      "Severe domestic parliamentary opposition from Catholic Center Party and Social Democrats.",
      "Increasingly unstable imperial successors (e.g. Wilhelm II)."
    ],
    allies: ["King Wilhelm I", "Helmuth von Moltke (military mastermind)", "Albrecht von Roon"],
    rivals: ["Napoleon III", "Klemens von Metternich (legacy)", "Kaiser Wilhelm II (later conflict)", "Ludwig Windthorst (Catholic leader)"],
    institutions_controlled_or_influenced: ["Kingdom of Prussia", "German Empire", "Prussian Cabinet", "Federal Council (Bundesrat)"],
    ideology_or_worldview: {
      summary: "Realpolitik (pragmatic statecraft based strictly on concrete national power rather than moral or ideological dogmas), combined with monarchical conservatism and state-led paternalistic welfare.",
      evidence: [
        "His speech stating that great questions are decided not by speeches but by 'blood and iron'.",
        "Co-opting socialist programs by introducing health and old-age pensions."
      ],
      confidence: "high"
    },
    decision_patterns: [
      {
        pattern: "Carefully staging international crises to force adversaries into declaring war, while maintaining multiple alternative diplomatic avenues (options-oriented planning).",
        examples: [
          "Staging the Schleswig-Holstein dispute to trigger the 1866 war with Austria.",
          "Editing the Ems Dispatch to make France appear as the aggressor in 1870."
        ],
        confidence: "high"
      }
    ],
    crisis_behavior: "Exceedingly calm, pragmatic, and calculated in foreign policy crises, but showed severe anxiety, rage, and domestic vindictiveness when parliamentary opposition threatened his internal authority.",
    negotiation_style: "highly transactional, leveraging military threats and back-channel deals, always ensuring he held multiple secret diplomatic options (e.g. Reinsurance Treaty).",
    risk_tolerance: "medium",
    centralization_preference: "high",
    conflict_preference: "medium",
    institutional_respect: "medium",
    coalition_dependency: "high",
    populism_level: "low",
    technocratic_level: "high",
    game_theory_profile: {
      main_players: ["German Empire", "France", "Russian Empire", "Austro-Hungarian Empire", "British Empire"],
      likely_objectives: [
        "Germany: Isolate France, maintain alliances with Russia and Austria.",
        "France: Break diplomatic isolation, recover Alsace-Lorraine.",
        "Russia/Austria: Expand Balkan influence without sparking general war."
      ],
      payoffs: [
        "Bismarck's alliance system (Dual Alliance, Reinsurance Treaty) created a stable equilibrium where Germany held the balance of power, isolated France, and prevented a general war (Highest geopolitical payoff)."
      ],
      constraints: ["Fear of a dual Franco-Russian military alliance forced Bismarck to repeatedly appease Russia."],
      common_strategic_moves: ["Secret treaties", "Playing rival powers against each other in regional crises"],
      failure_modes: ["His system was too complex to be run by anyone but himself, collapsing rapidly under Wilhelm II."]
    },
    bayesian_assessment: [
      {
        claim: "Bismarck introduced the welfare state primarily to suppress the socialist movement rather than out of genuine social philanthropy.",
        prior_confidence: "high",
        evidence: [
          "His simultaneous enforcement of the Anti-Socialist Laws banning socialist meetings and publications.",
          "His private letters to King Wilhelm I explicitly stating that the state must show the workers it cared for them so they would lose interest in social democracy."
        ],
        posterior_confidence: "high",
        what_would_change_this: "Unearthing of early private journals showing a long-standing, pre-political commitment to Christian socialist philanthropy."
      }
    ],
    historical_comparisons: [
      {
        compared_to: "Klemens von Metternich",
        similarities: [
          "Conservative European statesmen who dominated continental diplomacy for decades.",
          "Designed comprehensive systemic balance of power structures to preserve monarchy."
        ],
        differences: [
          "Bismarck leveraged dynamic nationalism and modern military industry to unite Germany, whereas Metternich desperately suppressed nationalism to preserve a multi-national empire."
        ],
        confidence: "high"
      }
    ],
    source_quality: {
      overall: "strong",
      notes: "Enormous German and British diplomatic archives, Bismarck's own memoirs ('Gedanken und Erinnerungen'), and a massive volume of definitive academic histories.",
      source_count: 5
    },
    sources: [
      "Steinberg, Jonathan. (2011). Bismarck: A Life.",
      "Taylor, A. J. P. (1955). Bismarck: The Man and the Statesman.",
      "Pflug, Werner. (1990). Bismarck.",
      "Gall, Lothar. (1986). Bismarck: The White Revolutionary.",
      "Taylor, A. J. P. (1954). The Struggle for Mastery in Europe 1848-1918."
    ],
    research_gaps: ["Scholars continue to analyze his private financial deals and investments to see if they influenced his colonial/state policies in the 1880s."],
    created_at: "2026-05-31T21:28:20Z",
    updated_at: "2026-05-31T21:28:20Z"
  },

  // 10. Ashoka the Great
  {
    person_id: "ashoka_the_great",
    name: "Ashoka Maurya",
    aliases: ["Ashoka the Great", "Devanampriya Priyadasi", "Chakravartin"],
    birth_year: -304,
    death_year: -232,
    countries_or_regions: ["India", "Maurya Empire", "South Asia"],
    era: "3rd Century BCE / Mauryan Dynasty / Ancient India",
    roles: ["Emperor of the Mauryan Empire"],
    domains: ["Geopolitics", "Philosophy", "Statecraft"],
    priority_tier: 1,
    short_summary: "Indian Emperor of the Mauryan Dynasty who, after witnessing the horrors of his conquest of Kalinga, converted to Buddhism and established a rule based on Dhamma (righteousness) and nonviolence.",
    timeline: [
      {
        date_or_year: "-268",
        event: "Ascended the Mauryan imperial throne after a fierce dynastic war of succession.",
        importance: "high",
        sources: ["Thapar (1961)", "Sen (1899)"]
      },
      {
        date_or_year: "-261",
        event: "Kalinga War: Conquered the coastal Kalinga kingdom; witnessed massive slaughter (100,000 dead, 150,000 displaced).",
        importance: "high",
        sources: ["Major Rock Edict XIII", "Thapar (1961)"]
      },
      {
        date_or_year: "-260",
        event: "Converted to Buddhism under the influence of the monk Upagupta, renouncing offensive military expansion.",
        importance: "high",
        sources: ["Thapar (1961)", "Divyavadana"]
      },
      {
        date_or_year: "-258",
        event: "Began carving the Major Rock Edicts across the subcontinent, proclaiming a state policy of Dhamma (righteousness).",
        importance: "high",
        sources: ["Edicts of Ashoka", "Thapar (1961)"]
      },
      {
        date_or_year: "-250",
        event: "Convened the Third Buddhist Council at Pataliputra to purify the Buddhist order and send out global missionaries.",
        importance: "high",
        sources: ["Mahavamsa", "Thapar (1961)"]
      },
      {
        date_or_year: "-240",
        event: "Sent his son Mahindra and daughter Sanghamitra as missionaries to Sri Lanka, establishing Buddhism there.",
        importance: "high",
        sources: ["Mahavamsa"]
      },
      {
        date_or_year: "-232",
        event: "Passed away at Pataliputra; Mauryan Empire began its gradual decline shortly after.",
        importance: "high",
        sources: ["Thapar (1961)"]
      }
    ],
    power_base: "Unchallenged imperial standing army, highly centralized bureaucratic network inherited from Chandragupta Maurya/Chanakya, and massive patronage of the Buddhist order (Sangha).",
    core_goals: [
      "Maintain absolute territorial integrity of the vast Mauryan Empire without further offensive conquests.",
      "Enforce a moral, pluralistic social order (Dhamma) emphasizing nonviolence, tolerance, and respect.",
      "Propagate Buddhism as a transnational philosophical and spiritual movement."
    ],
    incentives: [
      "Absolute moral redemption for the slaughter at Kalinga.",
      "Consolidating imperial rule through spiritual integration rather than pure military coercion.",
      "Providing welfare (medical care, shade trees, roads) to all subjects."
    ],
    constraints: [
      "Extreme geographical and cultural fragmentation of the Indian subcontinent.",
      "Inherent structural vulnerability of an absolute, highly centralized autocracy.",
      "Frictional resistance from traditional Brahminical priestly elites against heterodox state patronage."
    ],
    allies: ["The Buddhist Sangha", "Upagupta", "Imperial ministers (e.g. Radhagupta)"],
    rivals: ["Kalinga defenders (crushed)", "Autonomous forest tribes (monitored via edicts)"],
    institutions_controlled_or_influenced: ["Mauryan Empire", "The Buddhist Sangha", "Imperial Dharma Ministers (Dhamma Mahamattas)"],
    ideology_or_worldview: {
      summary: "State-enforced Dhamma (moral duty/righteousness), incorporating Buddhist principles of nonviolence (Ahimsa), religious tolerance, social welfare, and respect for parents/teachers/monks.",
      evidence: [
        "Major Rock Edict XII explicitly pleading for mutual tolerance between all religious sects.",
        "Major Rock Edict XIII detailing his intense remorse for the Kalinga campaign."
      ],
      confidence: "high"
    },
    decision_patterns: [
      {
        pattern: "Deploying permanent public rock and pillar inscriptions to directly instruct the populace in moral behavior and communicate imperial policies.",
        examples: [
          "Carving edicts on major trade routes and borders.",
          "Appointing special Dhamma Mahamattas (Dharma officers) to monitor social welfare."
        ],
        confidence: "high"
      }
    ],
    crisis_behavior: "Converted profound military remorse into a permanent philosophical system of statecraft, replacing conquest by war (Dig-vijaya) with conquest by righteousness (Dharma-vijaya).",
    negotiation_style: "highly paternalistic, pleading, seeking to persuade subjects and border kingdoms of his moral sincerity while retaining ultimate imperial authority.",
    risk_tolerance: "medium",
    centralization_preference: "high",
    conflict_preference: "low",
    institutional_respect: "high",
    coalition_dependency: "low",
    populism_level: "high",
    technocratic_level: "medium",
    game_theory_profile: {
      main_players: ["Mauryan Empire", "Kalinga Kingdom", "Hellenistic Kingdoms", "Forest Tribes"],
      likely_objectives: [
        "Mauryan Empire: Stabilize borders, integrate subcontinent morally.",
        "Forest Tribes: Maintain local autonomy.",
        "Hellenistic Kingdoms: Maintain diplomatic relations and trade."
      ],
      payoffs: [
        "Replacing military expansion with diplomatic-cultural missions (Dharma-vijaya) yielded high stability and prestige payoffs across Asia without costly wars (Highest geopolitical payoff)."
      ],
      constraints: ["Retaining his massive standing army acted as a major threat constraint to prevent rebellions without active combat."],
      common_strategic_moves: ["Edicts outlining moral expectations", "Sending royal offspring as peaceful emissaries"],
      failure_modes: ["Over-centralization and massive spending on monastic donations weakened the imperial treasury, causing rapid post-Ashoka collapse."]
    },
    bayesian_assessment: [
      {
        claim: "Ashoka's conversion to Buddhism was a strategic political move to unify a diverse empire under a single state ideology rather than pure personal repentance.",
        prior_confidence: "medium",
        evidence: [
          "Buddhism's rising popularity among influential merchant guilds (Vaishyas) who desired an alternative to rigid Brahmanical caste structures.",
          "The extreme geographical spread of the edicts serving to project Mauryan imperial presence across distant borders under a benevolent moral guise."
        ],
        posterior_confidence: "medium",
        what_would_change_this: "Discovery of private Mauryan administrative manuals showing a completely secular Machiavellian calculation of monastic bribes."
      }
    ],
    historical_comparisons: [
      {
        compared_to: "Constantine the Great",
        similarities: [
          "Supreme imperial autocrat who adopted a rising heterodox religion and elevated it to state patronage.",
          "Transformed the adopted religion into a major transnational force."
        ],
        differences: [
          "Ashoka actively renounced military expansionism and preached absolute nonviolence, whereas Constantine continued aggressive military campaigns after his conversion."
        ],
        confidence: "high"
      }
    ],
    source_quality: {
      overall: "strong",
      notes: "The primary source base of his own rock and pillar edicts provides completely authentic contemporary epigraphic evidence, supported by Buddhist chronicles like Mahavamsa.",
      source_count: 5
    },
    sources: [
      "Thapar, Romila. (1961). Asoka and the Decline of the Mauryas.",
      "The Edicts of Ashoka (Rock and Pillar inscriptions).",
      "The Mahavamsa (Great Chronicle of Sri Lanka).",
      "Divyavadana (Divine Stories, ancient Buddhist legends).",
      "Sen, Amartya. (2005). The Argumentative Indian (essays on Ashoka's pluralism)."
    ],
    research_gaps: ["The exact details of his succession crisis and the primary causes of the rapid disintegration of the empire under his grandsons remain partially unresolved."],
    created_at: "2026-05-31T21:28:20Z",
    updated_at: "2026-05-31T21:28:20Z"
  }
];

// Extract and prepare sources and claims databases
const sources_db: Source[] = [];
const claims_db: Claim[] = [];

batch1_profiles.forEach((p) => {
  // Extract sources
  p.sources.forEach((srcStr: string, idx: number) => {
    const srcId = `${p.person_id}_src_${idx + 1}`;
    sources_db.push({
      source_id: srcId,
      person_id: p.person_id,
      title: srcStr,
      authors: [srcStr.split(".")[0]],
      year: parseInt(srcStr.match(/\((\d{4})\)/)?.[1] || "null") || null,
      url: "https://en.wikipedia.org/wiki/" + encodeURIComponent(p.name),
      type: srcStr.toLowerCase().includes("papers") || srcStr.toLowerCase().includes("edict") ? "official" : "book",
      credibility: "high"
    });
  });

  // Extract claims
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
  console.log("Starting batch 1 generation...");

  // 1. Validate all profiles
  let totalErrors = 0;
  batch1_profiles.forEach((profile, idx) => {
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

  console.log("All 10 profiles successfully passed schema validation! Writing files...");

  // Write profiles.jsonl
  const profilesLines = batch1_profiles.map(p => JSON.stringify(p)).join("\n") + "\n";
  await fs.writeFile(join(process.cwd(), "data/profiles.jsonl"), profilesLines);
  console.log(`Wrote 10 valid profiles to data/profiles.jsonl`);

  // Write sources.jsonl
  const sourcesLines = sources_db.map(s => JSON.stringify(s)).join("\n") + "\n";
  await fs.writeFile(join(process.cwd(), "data/sources.jsonl"), sourcesLines);
  console.log(`Wrote ${sources_db.length} sources to data/sources.jsonl`);

  // Write claims.jsonl
  const claimsLines = claims_db.map(c => JSON.stringify(c)).join("\n") + "\n";
  await fs.writeFile(join(process.cwd(), "data/claims.jsonl"), claimsLines);
  console.log(`Wrote ${claims_db.length} claims to data/claims.jsonl`);

  // Update queue.jsonl to mark these 10 figures as completed
  const queuePath = join(process.cwd(), "data/queue.jsonl");
  const queueData = await fs.readFile(queuePath, "utf8");
  const queueLines = queueData.split("\n").filter(l => l.trim() !== "");
  const updatedQueueLines = queueLines.map((line) => {
    const obj = JSON.parse(line);
    const completedIds = new Set(batch1_profiles.map(p => p.person_id));
    if (completedIds.has(obj.person_id)) {
      obj.status = "completed";
    }
    return JSON.stringify(obj);
  }).join("\n") + "\n";
  await fs.writeFile(queuePath, updatedQueueLines);
  console.log(`Updated queue.jsonl statuses.`);

  // Update progress.json
  const progressPath = join(process.cwd(), "data/progress.json");
  const progress = {
    total_queued: queueLines.length,
    completed_count: batch1_profiles.length,
    failed_count: 0,
    needs_review_count: 0,
    last_updated: new Date().toISOString()
  };
  await fs.writeFile(progressPath, JSON.stringify(progress, null, 2));
  console.log("Updated progress.json successfully.");

  console.log("Batch 1 generation completed successfully!");
}

main().catch(err => {
  console.error("Fatal generation failure:", err);
  process.exit(1);
});
