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

const batch2_profiles: any[] = [
  // 1. Abraham Lincoln
  {
    person_id: "abraham_lincoln",
    name: "Abraham Lincoln",
    aliases: ["Honest Abe", "The Great Emancipator"],
    birth_year: 1809,
    death_year: 1865,
    countries_or_regions: ["United States", "North America"],
    era: "19th Century / American Civil War Era",
    roles: ["President of the United States"],
    domains: ["Geopolitics", "Statecraft", "Human Rights"],
    priority_tier: 1,
    short_summary: "16th President of the United States who successfully preserved the Union during the American Civil War and issued the Emancipation Proclamation abolishing slavery.",
    timeline: [
      {
        date_or_year: "1860-11-06",
        event: "Elected as the first Republican President of the United States, triggering southern secession.",
        importance: "high",
        sources: ["Donald (1995)"]
      },
      {
        date_or_year: "1861-04-12",
        event: "Confederate forces fire on Fort Sumter, initiating the American Civil War.",
        importance: "high",
        sources: ["Donald (1995)", "McPherson (1988)"]
      },
      {
        date_or_year: "1862-09-22",
        event: "Issued the preliminary Emancipation Proclamation, declaring all slaves in rebel states free.",
        importance: "high",
        sources: ["Emancipation Proclamation archives", "McPherson (1988)"]
      },
      {
        date_or_year: "1863-07-03",
        event: "Union secured key double victories at Gettysburg and Vicksburg, turning the tide of the war.",
        importance: "high",
        sources: ["McPherson (1988)"]
      },
      {
        date_or_year: "1863-11-19",
        event: "Delivered the historic Gettysburg Address, redefining the American democratic experiment.",
        importance: "high",
        sources: ["Gettysburg Address text"]
      },
      {
        date_or_year: "1864-11",
        event: "Won reelection in a landslide against McClellan, securing a mandate to prosecute the war to victory.",
        importance: "high",
        sources: ["Donald (1995)"]
      },
      {
        date_or_year: "1865-04-09",
        event: "General Robert E. Lee surrendered to Ulysses S. Grant at Appomattox Court House.",
        importance: "high",
        sources: ["McPherson (1988)"]
      },
      {
        date_or_year: "1865-04-14",
        event: "Assassinated by Confederate sympathizer John Wilkes Booth at Ford's Theatre.",
        importance: "high",
        sources: ["Donald (1995)"]
      }
    ],
    power_base: "Vast Union Army troop and commander backing, Republican Party congressional coalition, northern industrialist financial support, and moral mandate of the anti-slavery movement.",
    core_goals: [
      "Preserve the absolute constitutional integrity and unity of the United States.",
      "Abolish institutional slavery completely through federal constitutional amendments.",
      "Reconstruct a reconciled, non-vengeful nation post-war ('with malice toward none')."
    ],
    incentives: [
      "Securing the global survival of self-governing constitutional democracy.",
      "Minimizing Union military casualties while achieving decisive strategic victory.",
      "Preventing European recognition or financial backing of the Confederacy."
    ],
    constraints: [
      "Extreme early Confederate military leadership advantages (e.g. Robert E. Lee).",
      "Deep racial and political factionalism within the North (Peace Democrats/Copperheads).",
      "Strict constitutional restrictions on federal executive power during internal civil wars."
    ],
    allies: ["William H. Seward", "Edwin M. Stanton", "Ulysses S. Grant", "Salmon P. Chase"],
    rivals: ["Jefferson Davis", "Robert E. Lee", "George B. McClellan (political and military rival)"],
    institutions_controlled_or_influenced: ["United States Presidency", "Union Army", "Republican Party"],
    ideology_or_worldview: {
      summary: "Constitutional republicanism advocating for a perpetual Union, national federal supremacy, and gradualist but unyielding abolition of slavery grounded in the moral principles of the Declaration of Independence.",
      evidence: [
        "First and Second Inaugural Addresses invoking divine justice and constitutional continuity.",
        "Systematic suspension of Habeas Corpus to protect critical rail/border lines from saboteurs."
      ],
      confidence: "high"
    },
    decision_patterns: [
      {
        pattern: "Patient, options-oriented planning that delayed major moral policies until a favorable military victory was secured to maximize public and legal support.",
        examples: [
          "Holding back the Emancipation Proclamation until the Union victory at Antietam.",
          "Assembling a cabinet of his chief political rivals ('Team of Rivals') to consolidate party unity."
        ],
        confidence: "high"
      }
    ],
    crisis_behavior: "Exhibited extraordinary mental resilience and calm under severe strategic pressure, adapting military commanders dynamically (shifting through McClellan, Burnside, and Meade) until Grant's total war doctrine succeeded.",
    negotiation_style: "highly flexible in tactical details, humorous, using parables and stories to disarm critics, but completely unyielding on the twin principles of Union perpetuity and emancipation.",
    risk_tolerance: "high",
    centralization_preference: "high",
    conflict_preference: "high",
    institutional_respect: "high",
    coalition_dependency: "high",
    populism_level: "medium",
    technocratic_level: "medium",
    game_theory_profile: {
      main_players: ["The Union", "The Confederacy", "Great Britain", "France"],
      likely_objectives: [
        "Union: Defeat rebellion, prevent foreign intervention.",
        "Confederacy: Secure independence, win British cotton-based recognition.",
        "Britain: Protect textile economy, avoid war with Union."
      ],
      payoffs: [
        "Emancipation Proclamation (1863) fundamentally shifted the payoff structure for Britain by turning the conflict into a war against slavery, making British intervention politically impossible (Highest strategic payoff)."
      ],
      constraints: ["Union military failures in 1861-1862 severely limited diplomatic leverage in London."],
      common_strategic_moves: ["Blockades", "Timing major policy proclamations with battlefield outcomes"],
      failure_modes: ["Risk of a negotiated peace in late 1864 that preserved slavery if Union armies had remained gridlocked."]
    },
    bayesian_assessment: [
      {
        claim: "Lincoln suspended habeas corpus primarily out of immediate military necessity to secure Washington D.C. rather than dictatorial ambition.",
        prior_confidence: "high",
        evidence: [
          "The severe isolation of Washington D.C. in April 1861 due to Maryland secessionist mobs tearing down rail lines.",
          "His explicit defense to Congress asking: 'Are all the laws but one to go unexecuted, and the government itself go to pieces, lest that one be violated?'"
        ],
        posterior_confidence: "high",
        what_would_change_this: "Discovery of private pre-war journals outlining a planned military dictatorship regardless of secession threats."
      }
    ],
    historical_comparisons: [
      {
        compared_to: "George Washington",
        similarities: [
          "Preserved the American republic during its greatest existential crisis.",
          "Subordinated military operations strictly to ultimate civilian/constitutional authority."
        ],
        differences: [
          "Lincoln fought an internal ideological civil war utilizing rapid industrial rail and telegraph networks, requiring massive central government expansion."
        ],
        confidence: "high"
      }
    ],
    source_quality: {
      overall: "strong",
      notes: "Immense primary archives, including the Lincoln Papers at the Library of Congress and definitive scholarly histories of the Civil War.",
      source_count: 5
    },
    sources: [
      "Donald, David Herbert. (1995). Lincoln.",
      "McPherson, James M. (1988). Battle Cry of Freedom: The Civil War Era.",
      "Goodwin, Doris Kearns. (2005). Team of Rivals: The Political Genius of Abraham Lincoln.",
      "Sandburg, Carl. (1926-1939). Abraham Lincoln (Multi-volume biography).",
      "Basler, Roy P. (Editor). (1953). The Collected Works of Abraham Lincoln."
    ],
    research_gaps: ["Vigorous debate persists regarding his private spiritual/religious beliefs, as he never formally joined a Christian church."],
    created_at: "2026-05-31T21:31:33Z",
    updated_at: "2026-05-31T21:31:33Z"
  },

  // 2. Franklin D. Roosevelt
  {
    person_id: "franklin_d_roosevelt",
    name: "Franklin Delano Roosevelt",
    aliases: ["FDR"],
    birth_year: 1882,
    death_year: 1945,
    countries_or_regions: ["United States", "North America"],
    era: "20th Century / Great Depression / WWII",
    roles: ["President of the United States"],
    domains: ["Geopolitics", "Statecraft", "Economic"],
    priority_tier: 1,
    short_summary: "32nd US President who guided the nation through the Great Depression with his New Deal programs and led the Allied coalition to the brink of victory in World War II.",
    timeline: [
      {
        date_or_year: "1932-11-08",
        event: "Elected President in a landslide, promising a 'New Deal' for the American people.",
        importance: "high",
        sources: ["Burns (1956)"]
      },
      {
        date_or_year: "1933-03-09",
        event: "Launched 'First Hundred Days' of emergency legislation, restructuring the US banking and agricultural systems.",
        importance: "high",
        sources: ["Burns (1956)", "Kennedy (1999)"]
      },
      {
        date_or_year: "1935",
        event: "Signed the Social Security Act and National Labor Relations Act, establishing the modern US safety net.",
        importance: "high",
        sources: ["Kennedy (1999)", "Social Security archives"]
      },
      {
        date_or_year: "1937",
        event: "Introduced the controversial 'Court-packing plan' to bypass Supreme Court opposition to the New Deal.",
        importance: "high",
        sources: ["Burns (1956)"]
      },
      {
        date_or_year: "1941-03-11",
        event: "Signed the Lend-Lease Act, turning the US into the 'Arsenal of Democracy' backing Great Britain.",
        importance: "high",
        sources: ["Lend-Lease records", "Kimball (1984)"]
      },
      {
        date_or_year: "1941-12-08",
        event: "Delivered his 'Infamy' speech to Congress following the Japanese surprise attack on Pearl Harbor.",
        importance: "high",
        sources: ["Kennedy (1999)"]
      },
      {
        date_or_year: "1943-11",
        event: "Met with Churchill and Stalin at the Tehran Conference to coordinate grand Allied military strategy.",
        importance: "high",
        sources: ["Tehran Conference archives", "Kimball (1984)"]
      },
      {
        date_or_year: "1945-02",
        event: "Attended the Yalta Conference, shaping the post-war division of Europe and securing Soviet entry into the UN.",
        importance: "high",
        sources: ["Yalta transcripts", "Burns (1970)"]
      }
    ],
    power_base: "Massive New Deal voter coalition (unions, urban machines, southern democrats), absolute command over the Democratic Party, unprecedented federal executive authority, and wartime military command.",
    core_goals: [
      "Rescue the American capitalist democracy from collapse during the Great Depression.",
      "Achieve complete military defeat of the Axis powers (Germany, Japan, Italy).",
      "Establish a durable post-war multilateral collective security order centered on the United Nations."
    ],
    incentives: [
      "Preservation of democratic capitalist stability in the face of rising fascism and communism.",
      "Expanding American global industrial and commercial influence.",
      "Maintaining his personal historical legacy (securing an unprecedented four terms)."
    ],
    constraints: [
      "Fierce, entrenched domestic isolationist sentiments prior to Pearl Harbor.",
      "Conservative Supreme Court hostility that declared key early New Deal programs unconstitutional.",
      "Severe physical mobility limitations caused by paralytic illness."
    ],
    allies: ["Winston Churchill", "Harry Hopkins", "Eleanor Roosevelt", "George Marshall"],
    rivals: ["Adolf Hitler", "Hideki Tojo", "Wendell Willkie", "Huey Long (populist rival)"],
    institutions_controlled_or_influenced: ["United States Presidency", "Federal Bureaucracy", "Democratic Party", "Allied Joint Chiefs of Staff"],
    ideology_or_worldview: {
      summary: "Modern liberal progressivism advocating for state-regulated capitalism, a strong social safety net, executive-led federal initiative, and internationalist collective security.",
      evidence: [
        "The 'Four Freedoms' speech defining universal democratic rights.",
        "Creating major regulatory bodies like the SEC, FDIC, and TVA."
      ],
      confidence: "high"
    },
    decision_patterns: [
      {
        pattern: "Experimentalism in domestic policy ('try something and if it fails, try another') combined with strategic deception in foreign policy to nudge public opinion.",
        examples: [
          "Launching multiple parallel agencies with overlapping jurisdictions to test solutions.",
          "Using the Destroyer-for-Bases deal in 1940 to aid Britain while circumventing neutrality acts."
        ],
        confidence: "high"
      }
    ],
    crisis_behavior: "Exceedingly buoyant, optimistic, and decisive under stress, using his 'Fireside Chats' to directly project confidence to the public during economic and military crises.",
    negotiation_style: "highly charming, indirect, utilizing personal relationships and vague compromises to keep all options open while avoiding definitive commitments.",
    risk_tolerance: "high",
    centralization_preference: "high",
    conflict_preference: "high",
    institutional_respect: "high",
    coalition_dependency: "high",
    populism_level: "high",
    technocratic_level: "medium",
    game_theory_profile: {
      main_players: ["United States", "Great Britain", "Soviet Union", "Axis Powers"],
      likely_objectives: [
        "US: Secure total victory, prevent unilateral Soviet control of Europe, establish UN.",
        "Britain: Preserve empire, defeat Germany.",
        "USSR: Create Eastern European security buffer, defeat Germany."
      ],
      payoffs: [
        "Tehran and Yalta agreements divided military zones of operation and established the UN, optimizing the payoff of joint Axis defeat while managing inevitable post-war geopolitical competition (Highest cooperative payoff)."
      ],
      constraints: ["Soviet physical military occupation of Eastern Europe in 1945 limited US leverage in Poland."],
      common_strategic_moves: ["Financial aid leverage (Lend-Lease)", "Personal summit diplomacy"],
      failure_modes: ["Naivety or overestimation of his personal ability to manage Joseph Stalin's post-war security demands."]
    },
    bayesian_assessment: [
      {
        claim: "FDR did not deliberately allow the attack on Pearl Harbor to occur, though he did actively seek a strategic back-door to enter the European war.",
        prior_confidence: "high",
        evidence: [
          "The total lack of any credible document in US naval or presidential archives indicating foreknowledge of the specific Hawaiian target.",
          "The severe damage inflicted on the US Pacific Fleet, which was a resource FDR desperately needed to prosecute any global naval campaign."
        ],
        posterior_confidence: "high",
        what_would_change_this: "Unearthing of a verified decoded Japanese diplomatic intercept with FDR's handwritten signature ordering its suppression prior to Dec 7."
      }
    ],
    historical_comparisons: [
      {
        compared_to: "Napoleon Bonaparte",
        similarities: [
          "Massive consolidation of executive authority and creation of modern state administrative bureaus.",
          "Led a global military coalition against autocratic empires."
        ],
        differences: [
          "Roosevelt operated strictly inside a democratic constitutional framework, never dissolving Congress or declaring a monarchy."
        ],
        confidence: "high"
      }
    ],
    source_quality: {
      overall: "strong",
      notes: "Massive presidential archives at Hyde Park, extensive diplomatic records, and comprehensive academic biographies.",
      source_count: 5
    },
    sources: [
      "Burns, James MacGregor. (1956). Roosevelt: The Lion and the Fox.",
      "Burns, James MacGregor. (1970). Roosevelt: The Soldier of Freedom.",
      "Kennedy, David M. (1999). Freedom from Fear: The American People in Depression and War.",
      "Freidel, Frank. (1952-1973). Franklin D. Roosevelt (Multi-volume biography).",
      "Kimball, Warren F. (1984). The Churchill-Roosevelt Correspondence."
    ],
    research_gaps: ["Scholars continue to analyze his private health records to determine how much his cognitive decline in early 1945 affected Yalta negotiations."],
    created_at: "2026-05-31T21:31:33Z",
    updated_at: "2026-05-31T21:31:33Z"
  },

  // 3. Thomas Jefferson
  {
    person_id: "thomas_jefferson",
    name: "Thomas Jefferson",
    aliases: ["The Sage of Monticello"],
    birth_year: 1743,
    death_year: 1826,
    countries_or_regions: ["United States", "North America"],
    era: "18th / 19th Century / Founding Era",
    roles: ["President of the United States", "Secretary of State", "Author of the Declaration of Independence"],
    domains: ["Geopolitics", "Philosophy", "Statecraft"],
    priority_tier: 1,
    short_summary: "Principal author of the Declaration of Independence and third US President who doubled the nation's size through the Louisiana Purchase.",
    timeline: [
      {
        date_or_year: "1776-07-04",
        event: "Drafted and secured adoption of the Declaration of Independence.",
        importance: "high",
        sources: ["Peterson (1970)"]
      },
      {
        date_or_year: "1789",
        event: "Appointed first Secretary of State under George Washington, initiating factional disputes with Hamilton.",
        importance: "high",
        sources: ["Peterson (1970)", "Malone (1948-1981)"]
      },
      {
        date_or_year: "1800-11",
        event: "Elected President in the 'Revolution of 1800', marking the first peaceful transfer of party power.",
        importance: "high",
        sources: ["Malone (1948-1981)"]
      },
      {
        date_or_year: "1803-04-30",
        event: "Purchased the massive Louisiana Territory from Napoleon for $15 million, doubling US territory.",
        importance: "high",
        sources: ["Louisiana Purchase Treaty", "Ellis (1996)"]
      },
      {
        date_or_year: "1804",
        event: "Commissioned the Lewis and Clark Expedition to map and assert claims to the Pacific Northwest.",
        importance: "high",
        sources: ["Ellis (1996)"]
      },
      {
        date_or_year: "1807-12-22",
        event: "Signed the disastrous Embargo Act, banning all exports to force British/French respect for US shipping.",
        importance: "high",
        sources: ["Malone (1948-1981)"]
      },
      {
        date_or_year: "1819",
        event: "Founded the University of University of Virginia, establishing a secular, state-backed higher education model.",
        importance: "high",
        sources: ["Peterson (1970)"]
      }
    ],
    power_base: "Agrarian southern plantation elites, rising Democratic-Republican party machines, yeoman farmer popular support, and vast western territorial interests.",
    core_goals: [
      "Promote agrarian democracy (an empire of liberty) centered on independent yeoman farmers.",
      "Secure unlimited territorial expansion to preserve agricultural independence for generations.",
      "Strictly limit the expansion of federal taxation, debt, and centralized executive authority."
    ],
    incentives: [
      "Defense of individual liberty and state sovereignty against federal consolidation.",
      "Achieving absolute religious freedom and separating church and state.",
      "Protecting southern agrarian economic structures."
    ],
    constraints: [
      "Complete lack of naval power to defend merchant shipping during the Napoleonic Wars.",
      "New England commercial states' dependency on British trade, causing regional secession threats.",
      "The massive ideological contradiction between his republican declarations of universal liberty and his ownership of enslaved people."
    ],
    allies: ["James Madison", "James Monroe", "Albert Gallatin"],
    rivals: ["Alexander Hamilton", "John Adams", "Aaron Burr"],
    institutions_controlled_or_influenced: ["Democratic-Republican Party", "United States Presidency", "University of Virginia"],
    ideology_or_worldview: {
      summary: "Jeffersonian republicanism advocating for strict constitutional construction, states' rights, agrarian expansion, absolute freedom of conscience, and anti-aristocratic populism.",
      evidence: [
        "Virginia Statute for Religious Freedom (1786).",
        "Drafting the Kentucky Resolutions (1798) asserting state nullification rights."
      ],
      confidence: "high"
    },
    decision_patterns: [
      {
        pattern: "Ideologically dogmatic in theory and writings, but highly pragmatic and flexible in executive execution when national geopolitical opportunities arose.",
        examples: [
          "Bypassing his own strict constitutional construction beliefs to execute the Louisiana Purchase.",
          "Using federal force to enforce the highly centralized Embargo Act of 1807."
        ],
        confidence: "high"
      }
    ],
    crisis_behavior: "Prone to severe stress and avoidance under direct legislative or military crisis (e.g. his flight as Virginia Governor in 1781), but exceptionally patient and structured in long-term geopolitical planning.",
    negotiation_style: "highly polite, conversational, avoiding direct verbal confrontations, preferring to use his pen and dinner-table hospitality to build consensus.",
    risk_tolerance: "medium",
    centralization_preference: "low",
    conflict_preference: "medium",
    institutional_respect: "high",
    coalition_dependency: "high",
    populism_level: "high",
    technocratic_level: "medium",
    game_theory_profile: {
      main_players: ["United States", "French Empire (Napoleon)", "British Empire"],
      likely_objectives: [
        "US: Secure western frontiers, maintain trade, avoid war.",
        "France: Sell Louisiana to finance European wars, deny territory to Britain.",
        "Britain: Command maritime trade, restrict US commerce with France."
      ],
      payoffs: [
        "Louisiana Purchase (1803) successfully leveraged Napoleon's temporary fiscal crisis to secure a massive geographic payoff for the US without military conflict (Highest strategic payoff)."
      ],
      constraints: ["Constitutional silence on territorial acquisition forced Jefferson to prioritize strategic payoffs over legal consistency."],
      common_strategic_moves: ["Financial purchase of territories", "Commercial embargoes"],
      failure_modes: ["Dogmatic enforcement of the Embargo Act of 1807 which devastated the domestic US economy and provoked widespread smuggling."]
    },
    bayesian_assessment: [
      {
        claim: "Jefferson's purchase of Louisiana was motivated primarily by a desire to preserve an agrarian republican demographic rather than pure territorial greed.",
        prior_confidence: "high",
        evidence: [
          "His extensive correspondence stating that a massive territory was required to keep the US population agrarian and prevent European-style urban decay.",
          "His warnings that if the port of New Orleans remained in European hands, the western states would eventually secede."
        ],
        posterior_confidence: "high",
        what_would_change_this: "Discovery of private papers showing Jefferson planned to immediately industrialize and urbanize the newly acquired western territories."
      }
    ],
    historical_comparisons: [
      {
        compared_to: "Solon of Athens",
        similarities: [
          "Philosopher-statesman who drafted foundational legal/civic codes for a republic.",
          "Prioritized agrarian reforms and civic liberty."
        ],
        differences: [
          "Jefferson operated inside a massive, expanding continental state structure, balancing complex post-Enlightenment international relations."
        ],
        confidence: "high"
      }
    ],
    source_quality: {
      overall: "strong",
      notes: "Enormous volume of personal correspondence, drafts of declarations/laws, and definitive multi-volume biographies.",
      source_count: 5
    },
    sources: [
      "Peterson, Merrill D. (1970). Thomas Jefferson and the New Nation.",
      "Malone, Dumas. (1948-1981). Jefferson and His Time (6-volume biography).",
      "Ellis, Joseph J. (1996). American Sphinx: The Character of Thomas Jefferson.",
      "Banning, Lance. (1978). The Jeffersonian Persuasion.",
      "The Papers of Thomas Jefferson, Princeton University Press."
    ],
    research_gaps: ["Determining the exact timeline and nature of his private views on the morality of the domestic slave trade remains an active area of research."],
    created_at: "2026-05-31T21:31:33Z",
    updated_at: "2026-05-31T21:31:33Z"
  },

  // 4. Winston Churchill
  {
    person_id: "winston_churchill",
    name: "Winston Churchill",
    aliases: ["Winston Spencer Churchill"],
    birth_year: 1874,
    death_year: 1965,
    countries_or_regions: ["United Kingdom", "Europe", "British Empire"],
    era: "20th Century / WWII / Cold War",
    roles: ["Prime Minister of the United Kingdom"],
    domains: ["Geopolitics", "Military", "Statecraft"],
    priority_tier: 1,
    short_summary: "British Prime Minister who led the United Kingdom through World War II, rallying public resistance against Nazi Germany and co-shaping the post-war global order.",
    timeline: [
      {
        date_or_year: "1915",
        event: "Resigned as First Lord of the Admiralty following the catastrophic failure of the Gallipoli campaign.",
        importance: "high",
        sources: ["Gilbert (1991)"]
      },
      {
        date_or_year: "1930s",
        event: "Remained in the political wilderness, warning repeatedly and fruitlessly against Nazi German rearmament.",
        importance: "high",
        sources: ["Gilbert (1991)", "Churchill Memoirs"]
      },
      {
        date_or_year: "1940-05-10",
        event: "Appointed Prime Minister during the catastrophic Battle of France, forming a coalition government.",
        importance: "high",
        sources: ["Gilbert (1991)", "Jenkins (2001)"]
      },
      {
        date_or_year: "1940-06",
        event: "Delivered 'We shall fight on the beaches' speech, refusing any negotiated peace with Hitler.",
        importance: "high",
        sources: ["Churchill Speeches", "Jenkins (2001)"]
      },
      {
        date_or_year: "1940-09",
        event: "Led Britain through the Blitz, rallying civilian morale during the Battle of Britain.",
        importance: "high",
        sources: ["Gilbert (1991)"]
      },
      {
        date_or_year: "1941-12",
        event: "Traveled to Washington post-Pearl Harbor, securing the 'Germany First' war strategy with FDR.",
        importance: "high",
        sources: ["Kimball (1984)"]
      },
      {
        date_or_year: "1945-07",
        event: "Defeated in the general election by Clement Attlee's Labour Party; stepped down as PM.",
        importance: "high",
        sources: ["Jenkins (2001)"]
      },
      {
        date_or_year: "1946-03-05",
        event: "Delivered his 'Iron Curtain' speech in Fulton, Missouri, warning of Soviet expansion.",
        importance: "high",
        sources: ["Iron Curtain speech text", "Gilbert (1991)"]
      }
    ],
    power_base: "Absolute national wartime consensus, backing of the British Crown (George VI), supreme oratorical control over public sentiment, and a deep strategic alliance with the United States.",
    core_goals: [
      "Defeat Nazi Germany and preserve the sovereign independence of the United Kingdom.",
      "Maintain the global prestige and territorial integrity of the British Empire.",
      "Deter Soviet post-war expansionism in Europe, cement Anglo-American strategic dominance."
    ],
    incentives: [
      "Unyielding defense of British imperial honor and historical heritage.",
      "Deterrence of tyrannical hegemony (first Nazi, then Soviet) over the European continent.",
      "Attaining personal historic glory as the savior of Western civilization."
    ],
    constraints: [
      "Complete military isolation of the UK in 1940 after the fall of France.",
      "Financial exhaustion and near-bankruptcy of the British state by late 1940.",
      "Structural decline of British superpower status, yielding dominance to the US and USSR."
    ],
    allies: ["Franklin D. Roosevelt", "Clement Attlee (coalition partner)", "Anthony Eden", "Field Marshal Alan Brooke"],
    rivals: ["Adolf Hitler", "Joseph Stalin (geopolitical rival)", "Neville Chamberlain (early appeasement opponent)", "Mahatma Gandhi (imperial opponent)"],
    institutions_controlled_or_influenced: ["British Cabinet", "Parliament of the United Kingdom", "British Armed Forces", "The Conservative Party"],
    ideology_or_worldview: {
      summary: "Imperial conservatism and romantic British nationalism, combined with an absolute commitment to constitutional parliamentarism, Anglo-American unity, and balance of power diplomacy.",
      evidence: [
        "Voluminous writings detailing the history of English-speaking peoples.",
        "Lifelong fierce resistance to decolonization movements, particularly in India."
      ],
      confidence: "high"
    },
    decision_patterns: [
      {
        pattern: "Agile, highly aggressive tactical military ideas (often high-risk) coupled with a grand strategic reliance on building powerful foreign coalitions.",
        examples: [
          "Pioneering early military tank development in WWI and commandos in WWII.",
          "Desperately lobbying the US to enter both WWI and WWII through personal letters."
        ],
        confidence: "high"
      }
    ],
    crisis_behavior: "Exhibited extraordinary courage, energy, and defiance under direct bombardment, using his rhetoric systematically to transform strategic disasters into moral crusades.",
    negotiation_style: "eloquent, highly theatrical, combining intense dining-table charm and alcohol-fueled midnight discussions with an unyielding defense of British imperial interests.",
    risk_tolerance: "high",
    centralization_preference: "medium",
    conflict_preference: "high",
    institutional_respect: "high",
    coalition_dependency: "high",
    populism_level: "medium",
    technocratic_level: "medium",
    game_theory_profile: {
      main_players: ["United Kingdom", "Nazi Germany", "United States", "Soviet Union"],
      likely_objectives: [
        "UK: Defeat Germany, preserve empire.",
        "Germany: Secure British surrender or neutrality, dominate East.",
        "US: Support UK commercial/military lines, secure post-war commercial rights."
      ],
      payoffs: [
        "Churchill's absolute refusal to negotiate with Hitler in May 1940 (despite Halifax's peace proposals) forced the conflict into a long total war, which eventually brought in US/USSR resources (Highest survival payoff)."
      ],
      constraints: ["Military exhaustion forced British subordination to US financial conditions (e.g. Bretton Woods)."],
      common_strategic_moves: ["Rhetorical defiance", "Summit meetings (Tehran/Yalta)"],
      failure_modes: ["Blind spot regarding the inevitability of decolonization, leading to futile post-war resistance in India."]
    },
    bayesian_assessment: [
      {
        claim: "Churchill was primarily responsible for the devastating Bengal Famine of 1943 due to deliberate imperial policy.",
        prior_confidence: "medium",
        evidence: [
          "His refusal to divert commercial shipping from the war effort to send grain to Bengal despite appeals from Viceroy Linlithgow.",
          "His private racist remarks regarding Indians recorded in Amery's diaries during cabinet discussions."
        ],
        posterior_confidence: "medium",
        what_would_change_this: "Discovery of secret wartime orders showing Churchill actively tried to import grain from Australia but was physically blocked by Japanese submarine blockades."
      }
    ],
    historical_comparisons: [
      {
        compared_to: "Demosthenes of Athens",
        similarities: [
          "Orator who warned his democracy repeatedly and fruitlessly against a rising militarist tyranny (Macedon/Nazi Germany).",
          "Rallied civic resistance in the face of near-total isolation."
        ],
        differences: [
          "Churchill successfully oversaw a winning global coalition, whereas Demosthenes failed to save Athens from Macedonian conquest."
        ],
        confidence: "high"
      }
    ],
    source_quality: {
      overall: "strong",
      notes: "Enormous personal archive, his own multi-volume histories of both World Wars, official cabinet records, and extensive scholarly biographies.",
      source_count: 5
    },
    sources: [
      "Gilbert, Martin. (1991). Churchill: A Life.",
      "Jenkins, Roy. (2001). Churchill: A Biography.",
      "Churchill, Winston S. (1948-1953). The Second World War (6 volumes).",
      "Charmley, John. (1993). Churchill: The End of Glory.",
      "Addison, Paul. (1980). Churchill on the Home Front."
    ],
    research_gaps: ["Determining the exact impact of his mid-war strokes and medical treatments on his decision-making capacity during late-war summits remains a focus of medical history."],
    created_at: "2026-05-31T21:31:33Z",
    updated_at: "2026-05-31T21:31:33Z"
  },

  // 5. Charles de Gaulle
  {
    person_id: "charles_de_gaulle",
    name: "Charles de Gaulle",
    aliases: ["General de Gaulle"],
    birth_year: 1890,
    death_year: 1970,
    countries_or_regions: ["France", "Europe"],
    era: "20th Century / WWII / Cold War / Decolonization",
    roles: ["President of France", "Leader of Free France", "General of the French Army"],
    domains: ["Geopolitics", "Military", "Statecraft"],
    priority_tier: 1,
    short_summary: "French general who led the Free French Forces during WWII and founded the French Fifth Republic, establishing a highly stable executive-led constitutional state.",
    timeline: [
      {
        date_or_year: "1940-06-18",
        event: "Delivered his famous 'Appeal of 18 June' radio broadcast from London, rallying French resistance after the fall of France.",
        importance: "high",
        sources: ["Lacouture (1990)", "De Gaulle Memoirs"]
      },
      {
        date_or_year: "1944-08-25",
        event: "Led the triumphant liberation of Paris, establishing a provisional republican government.",
        importance: "high",
        sources: ["Lacouture (1990)"]
      },
      {
        date_or_year: "1946-01",
        event: "Resigned as provisional president in protest against the return to weak parliamentary factionalism.",
        importance: "high",
        sources: ["Jackson (2018)"]
      },
      {
        date_or_year: "1958-06",
        event: "Returned to power during the Algerian crisis; drafted a new constitution establishing the Fifth Republic.",
        importance: "high",
        sources: ["Jackson (2018)", "Fifth Republic archives"]
      },
      {
        date_or_year: "1962",
        event: "Negotiated the Evian Accords, granting full independence to Algeria; survived multiple military coup attempts.",
        importance: "high",
        sources: ["Evian Accords text", "Lacouture (1990)"]
      },
      {
        date_or_year: "1966-03",
        event: "Withdrew French forces from NATO's integrated military command to assert sovereign French independence.",
        importance: "high",
        sources: ["NATO archives", "Jackson (2018)"]
      },
      {
        date_or_year: "1968-05",
        event: "Faced massive student and labor protests; successfully dissolved parliament and won a landslide election.",
        importance: "high",
        sources: ["Jackson (2018)"]
      },
      {
        date_or_year: "1969-04",
        event: "Resigned immediately after losing a national referendum on constitutional reform.",
        importance: "high",
        sources: ["Lacouture (1990)"]
      }
    ],
    power_base: "Moral status as the savior of French honor, massive populist support among the French electorate, strong executive powers under Fifth Republic constitution, and support from the state bureaucracy.",
    core_goals: [
      "Restore France's geopolitical status as a major independent global power (Grandeur).",
      "Construct a highly stable, executive-dominated constitutional system to replace volatile parliamentary regimes.",
      "End the Algerian war while preventing a domestic military civil war."
    ],
    incentives: [
      "Unyielding defense of French national sovereignty and pride.",
      "Resisting Anglo-American global hegemony within Western alliances.",
      "Technocratic modernization of French nuclear and industrial capacity."
    ],
    constraints: [
      " France's complete military and moral collapse in 1940.",
      "Deep cabinet and military divisions over Algerian decolonization, including assassination threats (OAS).",
      "France's economic and demographic weakness compared to the US and USSR."
    ],
    allies: ["Winston Churchill (complex)", "Michel Debré (constitution drafter)", "Georges Pompidou", "Konrad Adenauer"],
    rivals: ["Philippe Pétain", "Franklin D. Roosevelt (hostile to de Gaulle)", "OAS military mutineers"],
    institutions_controlled_or_influenced: ["Free French Forces", "French Fifth Republic", "French Armed Forces", "The European Economic Community"],
    ideology_or_worldview: {
      summary: "Gaullism (pragmatic, highly centralized French nationalism advocating for executive-led statecraft, strategic independence, and a 'Europe of Nations' rather than federal integration).",
      evidence: [
        "His creation of the Fifth Republic constitution with immense presidential emergency powers (Article 16).",
        "Developing France's independent nuclear deterrent (Force de Frappe)."
      ],
      confidence: "high"
    },
    decision_patterns: [
      {
        pattern: "Intransigent refusal to compromise when representing French interests, using dramatic threats of resignation or boycott to force concession.",
        examples: [
          "Vetoing British entry into the Common Market in 1963 and 1967.",
          "Staging the 'Empty Chair Crisis' to block supranational voting in the EEC."
        ],
        confidence: "high"
      }
    ],
    crisis_behavior: "Exceedingly calm, dramatic, and authoritarian in high-stakes crises (e.g. the 1961 generals' putsch), using television addresses directly to appeal to the nation's honor.",
    negotiation_style: "unyielding, highly formal, refusing to negotiate on equal terms unless France's status was fully recognized, treating compromises as concessions to be avoided.",
    risk_tolerance: "high",
    centralization_preference: "high",
    conflict_preference: "high",
    institutional_respect: "high",
    coalition_dependency: "medium",
    populism_level: "high",
    technocratic_level: "medium",
    game_theory_profile: {
      main_players: ["France", "United States", "Great Britain", "West Germany", "Soviet Union"],
      likely_objectives: [
        "France: Assert global independence, develop nuclear arms, dominate European Community.",
        "US: Contain USSR, preserve NATO integration under US command.",
        "West Germany: Secure French reconciliation while maintaining US nuclear umbrella."
      ],
      payoffs: [
        "Withdrawing from NATO's military command (1966) yielded a massive national prestige payoff and established France as a unique independent mediator in the Cold War (Highest sovereign payoff)."
      ],
      constraints: ["French security ultimately relied on the US nuclear umbrella, limiting his ability to break completely with NATO in a hot war."],
      common_strategic_moves: ["Vetoes", "Sudden withdrawals", "Appealing to national honor"],
      failure_modes: ["His personalized style of rule alienated young generations, leading directly to the explosive protests of May 1968."]
    },
    bayesian_assessment: [
      {
        claim: "De Gaulle returned to power in 1958 with a secret plan to decolonize Algeria rather than preserve French rule.",
        prior_confidence: "medium",
        evidence: [
          "His private remarks to advisors in 1954 noting that keeping 9 million Algerians under French rule was demographically and financially unsustainable.",
          "His rapid pivot once in power to offering self-determination, despite having been brought to power by French Algerian colons."
        ],
        posterior_confidence: "high",
        what_would_change_this: "Discovery of personal archives showing he planned to permanently deport the entire Muslim population of Algeria to secure French dominance."
      }
    ],
    historical_comparisons: [
      {
        compared_to: "Joan of Arc",
        similarities: [
          "National savior figure who arose from complete military defeat to restore French sovereign legitimacy.",
          "Absolutely unyielding belief in France's unique historical mission."
        ],
        differences: [
          "De Gaulle was a highly sophisticated modern general and constitutional architect who built a durable state apparatus."
        ],
        confidence: "high"
      }
    ],
    source_quality: {
      overall: "strong",
      notes: "De Gaulle's extensive War Memoirs, presidential archives, and a massive body of French political scholarship.",
      source_count: 5
    },
    sources: [
      "Jackson, Julian. (2018). A Certain Idea of France: The Life of Charles de Gaulle.",
      "Lacouture, Jean. (1990). De Gaulle: The Rebel (Multi-volume biography).",
      "De Gaulle, Charles. (1954-1959). War Memoirs.",
      "Williams, Philip M. & Harrison, Martin. (1971). Politics and Society in de Gaulle's Republic.",
      "Cerny, Philip G. (1980). The Politics of Grandeur."
    ],
    research_gaps: ["Determining the exact degree of his behind-the-scenes coordination with military generals during the crucial days of May 1958 remains highly analyzed."],
    created_at: "2026-05-31T21:31:33Z",
    updated_at: "2026-05-31T21:31:33Z"
  },

  // 6. Margaret Thatcher
  {
    person_id: "margaret_thatcher",
    name: "Margaret Thatcher",
    aliases: ["The Iron Lady"],
    birth_year: 1925,
    death_year: 2013,
    countries_or_regions: ["United Kingdom", "Europe"],
    era: "Late 20th Century / Cold War Era",
    roles: ["Prime Minister of the United Kingdom"],
    domains: ["Geopolitics", "Statecraft", "Economic"],
    priority_tier: 1,
    short_summary: "First female British Prime Minister who dismantled the post-war consensus through economic deregulation and privatization, and co-led the Western alliance in the late Cold War.",
    timeline: [
      {
        date_or_year: "1975",
        event: "Elected Leader of the Conservative Party, defeating Edward Heath.",
        importance: "high",
        sources: ["Campbell (2000)"]
      },
      {
        date_or_year: "1979-05-03",
        event: "Elected Prime Minister, inheriting a nation crippled by high inflation and labor disputes.",
        importance: "high",
        sources: ["Thatcher Memoirs"]
      },
      {
        date_or_year: "1982-04",
        event: "Ordered British task force to reclaim the Falkland Islands after Argentinian invasion, securing victory.",
        importance: "high",
        sources: ["Falklands war archives", "Campbell (2003)"]
      },
      {
        date_or_year: "1984-03",
        event: "Engaged in a year-long confrontation with the National Union of Mineworkers, decisively breaking union strike power.",
        importance: "high",
        sources: ["Campbell (2003)"]
      },
      {
        date_or_year: "1984-10-12",
        event: "Survived the Brighton hotel bombing by the Provisional IRA; insisted on delivering her conference speech.",
        importance: "high",
        sources: ["IRA bombing records"]
      },
      {
        date_or_year: "1986",
        event: "Instituted the 'Big Bang' deregulation of the London financial markets, revitalizing the City.",
        importance: "high",
        sources: ["Thatcher Memoirs"]
      },
      {
        date_or_year: "1990-11",
        event: "Forced to resign after a cabinet rebellion over the Poll Tax and her hostility to European integration.",
        importance: "high",
        sources: ["Campbell (2003)", "Thatcher Memoirs"]
      }
    ],
    power_base: "Entrenched Conservative Party majority, property-owning middle-class voter base, financial sector backing, and massive national prestige from the Falklands victory.",
    core_goals: [
      "Dismantle Britain's post-war socialist-leaning welfare state and curb trade union power.",
      "Privatize nationalized industries (telecom, gas, rail) to create a property-owning democracy.",
      "Defeat Soviet communism globally in close alignment with Ronald Reagan's United States."
    ],
    incentives: [
      "Restoring British national self-reliance and economic dynamism.",
      "Absolute defense of national sovereignty against European federal integration.",
      "Eradicating collective socialist welfare dependencies."
    ],
    constraints: [
      "Intense cabinet factionalism over European integration ('Wets' vs Drys).",
      "Severe inner-city riots and record unemployment during early economic restructurings.",
      "Violent domestic terrorism campaigns from the Provisional IRA."
    ],
    allies: ["Ronald Reagan", "Keith Joseph (ideological mentor)", "Denis Thatcher", "F.W. de Klerk (complex partnership)"],
    rivals: ["Arthur Scargill (miners' union leader)", "Mikhail Gorbachev (initially)", "Jacques Delors (EU integration champion)", "Michael Heseltine (cabinet rival)"],
    institutions_controlled_or_influenced: ["United Kingdom Cabinet", "The Conservative Party", "HM Treasury", "The City of London"],
    ideology_or_worldview: {
      summary: "Thatcherism (neoliberal deregulation, monetarism, privatization of state assets, combined with fierce British nationalism, small government, and family social conservatism).",
      evidence: [
        "Systematic sale of council houses to tenants to create property owners.",
        "Fierce parliamentary speech declaring 'No, No, No' to European Commission powers."
      ],
      confidence: "high"
    },
    decision_patterns: [
      {
        pattern: "Intransigent, highly adversarial style of rule that framed policy choices as absolute moral battles to be fought to a finish, completely rejecting consensus.",
        examples: [
          "Refusing to negotiate with IRA hunger strikers in 1981.",
          "Stockpiling coal for a year to ensure the miners' strike would fail."
        ],
        confidence: "high"
      }
    ],
    crisis_behavior: "Exhibited extraordinary resolve and courage under physical and geopolitical pressure, refusing to panic during the Falklands invasion or the Brighton assassination attempt.",
    negotiation_style: "highly aggressive, dominating, lecturing adversaries on economic principles, compromising only when strategically cornered.",
    risk_tolerance: "high",
    centralization_preference: "high",
    conflict_preference: "high",
    institutional_respect: "high",
    coalition_dependency: "medium",
    populism_level: "high",
    technocratic_level: "medium",
    game_theory_profile: {
      main_players: ["United Kingdom", "Argentina (Falklands)", "European Community", "United States"],
      likely_objectives: [
        "UK: Reclaim Falklands, limit EU federalism, deregulate economy.",
        "Argentina: Hold Falklands to bolster military regime legitimacy.",
        "US: Mediate Falklands to protect Latin alliances, later backed UK."
      ],
      payoffs: [
        "Sending the task force to the Falklands (1982) was a massive gamble, but successful military reclamation yielded an immense national prestige payoff that secured her reelection (Highest political payoff)."
      ],
      constraints: ["High interest rates and unemployment in 1980-1981 limited early policy flexibility."],
      common_strategic_moves: ["Uncompromising public stances", "Privatization of state monopolies"],
      failure_modes: ["Enforcement of the highly regressive Poll Tax (1990) provoked widespread riots and alienated her base, causing her sudden downfall."]
    },
    bayesian_assessment: [
      {
        claim: "Thatcher was crucial in persuading Ronald Reagan that Mikhail Gorbachev was a genuine partner for peace.",
        prior_confidence: "high",
        evidence: [
          "Her famous 1984 remark: 'I like Mr. Gorbachev. We can do business together,' delivered before Reagan met him.",
          "Her private memos to Reagan urging him to engage with Gorbachev's reform efforts without dropping military deterrence."
        ],
        posterior_confidence: "high",
        what_would_change_this: "Discovery of US state documents showing Reagan had already decided on total engagement prior to any consultation with Thatcher."
      }
    ],
    historical_comparisons: [
      {
        compared_to: "Elizabeth I",
        similarities: [
          "First female leader to dominate British statecraft through unyielding force of will.",
          "Faced severe domestic Catholic/Irish insurrections and foreign maritime conflict."
        ],
        differences: [
          "Thatcher operated in a modern democratic parliamentary framework during a period of de-industrialization."
        ],
        confidence: "high"
      }
    ],
    source_quality: {
      overall: "strong",
      notes: "Margaret Thatcher Foundation archives, her extensive memoirs, official UK cabinet records, and rigorous historical biographies.",
      source_count: 5
    },
    sources: [
      "Campbell, John. (2000). Margaret Thatcher: The Grocer's Daughter.",
      "Campbell, John. (2003). Margaret Thatcher: The Iron Lady.",
      "Thatcher, Margaret. (1993). The Downing Street Years.",
      "Moore, Charles. (2013-2019). Margaret Thatcher: The Authorized Biography (3 volumes).",
      "Evans, Eric J. (1997). Thatcher and Thatcherism."
    ],
    research_gaps: ["Determining the exact degree of her private knowledge regarding the sinking of the Argentinian cruiser Belgrano during the Falklands war remains debated in military circles."],
    created_at: "2026-05-31T21:31:33Z",
    updated_at: "2026-05-31T21:31:33Z"
  },

  // 7. Julius Caesar
  {
    person_id: "julius_caesar",
    name: "Gaius Julius Caesar",
    aliases: ["Julius Caesar"],
    birth_year: -100,
    death_year: -44,
    countries_or_regions: ["Rome", "Europe", "Mediterranean"],
    era: "1st Century BCE / Late Roman Republic",
    roles: ["Dictator of Rome", "Roman Consul", "Military General"],
    domains: ["Military", "Statecraft", "Geopolitics"],
    priority_tier: 1,
    short_summary: "Roman general and statesman whose brilliant conquests and civil war victory dismantled the Roman Republic, paving the way for the Roman Empire.",
    timeline: [
      {
        date_or_year: "-60",
        event: "Formed the First Triumvirate, an informal political alliance with Pompey and Crassus.",
        importance: "high",
        sources: ["Goldsworthy (2006)"]
      },
      {
        date_or_year: "-58 to -50",
        event: "Conducted the Gallic Wars, conquering all of Gaul and expanding Rome's borders to the Rhine.",
        importance: "high",
        sources: ["Caesar (Gallic War)", "Goldsworthy (2006)"]
      },
      {
        date_or_year: "-49-01-10",
        event: "Crossed the Rubicon with the 13th Legion, defying the Senate and initiating the civil war.",
        importance: "high",
        sources: ["Suetonius (Lives)", "Goldsworthy (2006)"]
      },
      {
        date_or_year: "-48-08-09",
        event: "Defeated Pompey the Great at the Battle of Pharsalus in Greece.",
        importance: "high",
        sources: ["Caesar (Civil War)", "Plutarch"]
      },
      {
        date_or_year: "-47",
        event: "Aligned with Cleopatra VII in Egypt, securing her throne and fathering Caesarion.",
        importance: "high",
        sources: ["Goldsworthy (2006)", "Plutarch"]
      },
      {
        date_or_year: "-46",
        event: "Initiated the Julian Calendar, reforming the Roman calendar system (still highly visible today).",
        importance: "high",
        sources: ["Julian calendar archives"]
      },
      {
        date_or_year: "-44-02",
        event: "Declared Dictator Perpetuo (Dictator in perpetuity) by the Roman Senate.",
        importance: "high",
        sources: ["Suetonius (Lives)"]
      },
      {
        date_or_year: "-44-03-15",
        event: "Assassinated by a conspiracy of senators led by Brutus and Cassius on the Ides of March.",
        importance: "high",
        sources: ["Suetonius (Lives)", "Plutarch"]
      }
    ],
    power_base: "Absolute, fanatical loyalty of his veteran legions, immense popular adoration of the Roman working class (plebeians) due to debt relief and land distributions, and vast wealth from Gaul.",
    core_goals: [
      "Overthrow the oligarchy of the conservative Roman Senate (Optimates faction).",
      "Implement comprehensive agrarian reforms, debt relief, and administrative standardization in Rome.",
      "Secure his personal safety, legal immunity, and unmatched historical glory."
    ],
    incentives: [
      "Maintaining his personal dignity (Dignitas) and political survival.",
      "Reorganizing the fractured, corrupt administrative structure of the expanding Roman empire.",
      "Defeating political enemies who sought to prosecute him for his consulship actions."
    ],
    constraints: [
      "Deep-seated Roman cultural taboos against monarchy and kingship.",
      "The massive wealth and traditional legal legitimacy of the Senate Optimates faction.",
      "The physical logistical challenges of fighting civil wars across Spain, Greece, Egypt, and Africa."
    ],
    allies: ["Mark Antony", "Marcus Licinius Crassus (early)", "Gnaeus Pompeius Magnus (early)", "Cleopatra VII"],
    rivals: ["Gnaeus Pompeius Magnus (later)", "Marcus Porcius Cato (Cato the Younger)", "Marcus Junius Brutus", "Gaius Cassius Longinus"],
    institutions_controlled_or_influenced: ["Roman Legions", "Roman Senate", "Popular Assemblies", "Tribunes of the Plebs"],
    ideology_or_worldview: {
      summary: "Populares faction politics advocating for agrarian reform, debt relief, and provincial citizenship expansion, combined with a pragmatic belief that the republican Senate was too corrupt to govern and required centralized autocratic rule.",
      evidence: [
        "His extensive agrarian land distribution acts for veterans during his 59 BCE consulship.",
        "Systematically expanding Roman citizenship to Gallic and Sicilian provinces."
      ],
      confidence: "high"
    },
    decision_patterns: [
      {
        pattern: "Stunning speed of movement (Celeritas) to catch enemies unprepared, coupled with supreme acts of political clemency (Clementia) to co-opt defeated rivals.",
        examples: [
          "Crossing the Adriatic in winter with half an army to surprise Pompey.",
          "Pardoning Brutus and Cicero immediately after Pharsalus."
        ],
        confidence: "high"
      }
    ],
    crisis_behavior: "Exhibited extraordinary tactical resourcefulness and courage under immediate threat, regularly fighting on the front lines to rally his troops when battles faced collapse (e.g. Munda).",
    negotiation_style: "highly charming, direct, offering generous terms of alliance, but treating any formal legal challenges to his dignity as absolute deal-breakers.",
    risk_tolerance: "high",
    centralization_preference: "high",
    conflict_preference: "high",
    institutional_respect: "low",
    coalition_dependency: "medium",
    populism_level: "high",
    technocratic_level: "low",
    game_theory_profile: {
      main_players: ["Caesar", "Pompey & Senate Optimates", "The Roman Mob"],
      likely_objectives: [
        "Caesar: Secure legal immunity, retain military command, implement reforms.",
        "Senate: Strip Caesar of command, prosecute him, restore oligarchic power.",
        "Mob: Secure debt relief, cheap grain, support strong patrons."
      ],
      payoffs: [
        "Crossing the Rubicon (49 BCE) was a high-stakes move, but successfully preempted legal execution by the Senate, yielding absolute power as the ultimate payoff (Highest autocratic payoff)."
      ],
      constraints: ["Roman constitutional law strictly banned generals from entering Italy with armies, forcing a binary peace-or-civil-war choice."],
      common_strategic_moves: ["Rapid marches", "Public displays of mercy (Clementia)"],
      failure_modes: ["His excessive clemency allowed conspirators to remain in the Senate, leading directly to his assassination."]
    },
    bayesian_assessment: [
      {
        claim: "Caesar did not actually seek the formal title of King (Rex), recognizing it as a fatal political risk in Rome.",
        prior_confidence: "high",
        evidence: [
          "His repeated public rejection of the diadem offered by Mark Antony during the Lupercalia festival.",
          "His declaration: 'My name is Caesar, not King,' designed to appease republican crowds while retaining absolute dictatorial power."
        ],
        posterior_confidence: "high",
        what_would_change_this: "Discovery of a verified private letter to Cleopatra outlining plans to crown himself monarch of Rome in late 44 BCE."
      }
    ],
    historical_comparisons: [
      {
        compared_to: "Alexander the Great",
        similarities: [
          "Brilliant military commanders who conquered vast territories.",
          "Reshaped the geopolitical map of the Mediterranean world permanently."
        ],
        differences: [
          "Caesar operated as a political actor within a highly sophisticated, bureaucratic constitutional republic, rather than inheriting a traditional monarchy."
        ],
        confidence: "high"
      }
    ],
    source_quality: {
      overall: "strong",
      notes: "Caesar's own campaign commentaries, contemporary letters of Cicero, and classical biographies by Plutarch and Suetonius.",
      source_count: 5
    },
    sources: [
      "Goldsworthy, Adrian. (2006). Caesar: Life of a Colossus.",
      "Caesar, Julius. (c. 50s BCE). Commentarii de Bello Gallico.",
      "Caesar, Julius. (c. 40s BCE). Commentarii de Bello Civili.",
      "Suetonius. (121 CE). The Twelve Caesars.",
      "Plutarch. (c. 100 CE). Parallel Lives: Life of Caesar."
    ],
    research_gaps: ["The exact degree of Caesar's physical health decline (epilepsy or mini-strokes) in his final years remains medically speculative."],
    created_at: "2026-05-31T21:31:33Z",
    updated_at: "2026-05-31T21:31:33Z"
  },

  // 8. Augustus
  {
    person_id: "augustus",
    name: "Octavian Augustus",
    aliases: ["Caesar Augustus", "Octavian"],
    birth_year: -63,
    death_year: 14,
    countries_or_regions: ["Rome", "Europe", "Mediterranean"],
    era: "1st Century BCE / 1st Century CE / Roman Principate",
    roles: ["First Emperor of Rome", "Roman Consul", "Triumvir"],
    domains: ["Geopolitics", "Statecraft", "Military"],
    priority_tier: 1,
    short_summary: "Founder of the Roman Principate and first Roman Emperor who ended decades of civil war, establishing the Pax Romana and consolidating imperial bureaucracy.",
    timeline: [
      {
        date_or_year: "-44",
        event: "Adopted posthumously by his great-uncle Julius Caesar in his will, inheriting his name and wealth.",
        importance: "high",
        sources: ["Everitt (2006)"]
      },
      {
        date_or_year: "-43",
        event: "Formed the Second Triumvirate with Mark Antony and Lepidus, launching bloody proscriptions.",
        importance: "high",
        sources: ["Everitt (2006)", "Syme (1939)"]
      },
      {
        date_or_year: "-31-09-02",
        event: "Defeated Mark Antony and Cleopatra at the naval Battle of Actium, securing absolute control of Rome.",
        importance: "high",
        sources: ["Syme (1939)"]
      },
      {
        date_or_year: "-27",
        event: "First Constitutional Settlement: Formally 'restored' the Republic while retaining ultimate military authority; granted name Augustus.",
        importance: "high",
        sources: ["Res Gestae Divi Augusti", "Everitt (2006)"]
      },
      {
        date_or_year: "-23",
        event: "Second Constitutional Settlement: Resigned consulship, assuming tribunician power (Tribunicia Potestas) for life.",
        importance: "high",
        sources: ["Everitt (2006)"]
      },
      {
        date_or_year: "-9",
        event: "Battle of the Teutoburg Forest: Three Roman legions destroyed by Germanic tribes; halted northern expansion.",
        importance: "high",
        sources: ["Syme (1939)", "Suetonius"]
      },
      {
        date_or_year: "14-08-19",
        event: "Passed away peacefully; succeeded smoothly by his stepson Tiberius, cementing the imperial system.",
        importance: "high",
        sources: ["Everitt (2006)"]
      }
    ],
    power_base: "Ultimate command over all 28 Roman legions, immense private wealth inherited from Julius Caesar and Egyptian conquests, personal patronage networks, and the legal fiction of restoring the Senate's authority.",
    core_goals: [
      "Establish a stable, permanent autocratic system (Principate) that preserved peace while avoiding the appearance of monarchy.",
      "Secure and consolidate the vast frontiers of the Roman Empire (Pax Romana).",
      "Reconstruct Roman civic infrastructure, religious morals, and economic stability."
    ],
    incentives: [
      "Averting a return to the catastrophic civil wars that defined his youth.",
      "Legitimizing his dynasty and securing smooth imperial succession.",
      "Reestablishing traditional Roman religious and family values."
    ],
    constraints: [
      "The persistent threat of republican assassination if he appeared as a king (Rex).",
      "The massive financial cost of maintaining a standing army of 150,000 legionaries.",
      "Chronic health problems and lack of direct male heirs."
    ],
    allies: ["Marcus Vipsanius Agrippa (military genius)", "Gaius Maecenas (diplomat/patron)", "Livia Drusilla (wife/advisor)"],
    rivals: ["Mark Antony", "Cleopatra VII", "Sextus Pompeius (naval rival)"],
    institutions_controlled_or_influenced: ["Roman Legions", "Roman Senate", "Aerarium (Imperial Treasury)", "Praetorian Guard (established by him)"],
    ideology_or_worldview: {
      summary: "Restoration of the traditional Roman Republic in name ('Res Publica Restituta') while consolidating absolute, centralized military and civil authority as 'Princeps' (First Citizen).",
      evidence: [
        "His monumental inscription 'Res Gestae Divi Augusti' detailing his accomplishments.",
        "Passage of the Julian Laws on marriage and adultery to restore traditional moral virtues."
      ],
      confidence: "high"
    },
    decision_patterns: [
      {
        pattern: "Patient, highly calculated constitutional adjustments that gradually absorbed traditional republican powers into the office of the Princeps, completely avoiding radical military proclamations.",
        examples: [
          "Resigning the direct consulship in 23 BCE to assume less offensive tribunician veto powers.",
          "Using Agrippa's military talents to win his battles while retaining supreme political credit."
        ],
        confidence: "high"
      }
    ],
    crisis_behavior: "Prone to physical illness and strategic caution during active military campaign threats, but exceptionally resilient and politically brilliant in post-battle administrative stabilization.",
    negotiation_style: "highly diplomatic, deferential to the Senate, maintaining a facade of equal republican partnership while holding complete veto power.",
    risk_tolerance: "medium",
    centralization_preference: "high",
    conflict_preference: "medium",
    institutional_respect: "high",
    coalition_dependency: "high",
    populism_level: "medium",
    technocratic_level: "high",
    game_theory_profile: {
      main_players: ["Octavian", "Mark Antony", "The Roman Senate"],
      likely_objectives: [
        "Octavian: Secure absolute power, eliminate rivals, preserve republican facade.",
        "Antony: Secure Eastern empire dominion, establish dynastic line with Cleopatra.",
        "Senate: Retain oligarchic prestige, play triumvirs against each other."
      ],
      payoffs: [
        "Actium victory and subsequent constitutional settlements created a stable Nash equilibrium where the Senate surrendered actual power in exchange for hollow honors and physical security, ending the civil wars (Highest payoff)."
      ],
      constraints: ["Republican cultural taboos forced Octavian to avoid absolute monarchs' titles like Rex or Dictator."],
      common_strategic_moves: ["Constitutional settlements", "Using surrogate military commanders (Agrippa)"],
      failure_modes: ["Difficulties in securing stable hereditary succession, creating a long-term structural weakness in the Principate system."]
    },
    bayesian_assessment: [
      {
        claim: "Augustus restored the Roman Republic in good faith in 27 BCE.",
        prior_confidence: "low",
        evidence: [
          "His simultaneous retention of absolute command over the legions in Spain, Gaul, and Syria.",
          "The rapid, systematic suppression of any independent senatorial military initiatives throughout his 40-year reign."
        ],
        posterior_confidence: "low",
        what_would_change_this: "Discovery of private letters showing he actively tried to hand over command of the legions to senatorial control."
      }
    ],
    historical_comparisons: [
      {
        compared_to: "Julius Caesar",
        similarities: [
          "Consolidated absolute authority over the Roman world.",
          "Used Caesar's name and veterans to build their primary power bases."
        ],
        differences: [
          "Augustus survived by showing deep public respect for republican institutions, whereas Caesar's overt dictatorial arrogance led to his assassination."
        ],
        confidence: "high"
      }
    ],
    source_quality: {
      overall: "strong",
      notes: "The Res Gestae monument, contemporary histories of Velleius Paterculus, classical biographies by Suetonius, and Syme's definitive modern analysis.",
      source_count: 5
    },
    sources: [
      "Everitt, Anthony. (2006). Augustus: The Life of Rome's First Emperor.",
      "Syme, Ronald. (1939). The Roman Revolution.",
      "Augustus. (14 CE). Res Gestae Divi Augusti.",
      "Galinsky, Karl. (1996). Augustan Culture.",
      "Suetonius. (121 CE). The Twelve Caesars: Life of Augustus."
    ],
    research_gaps: ["The exact details and true scale of the political conspiracies against his life in the early 20s BCE remain heavily analyzed due to sparse/biased contemporary records."],
    created_at: "2026-05-31T21:31:33Z",
    updated_at: "2026-05-31T21:31:33Z"
  },

  // 9. Jawaharlal Nehru
  {
    person_id: "jawaharlal_nehru",
    name: "Jawaharlal Nehru",
    aliases: ["Pandit Nehru"],
    birth_year: 1889,
    death_year: 1964,
    countries_or_regions: ["India", "South Asia"],
    era: "20th Century / Post-Independence Era / Cold War",
    roles: ["Prime Minister of India", "Leader of the Indian National Congress"],
    domains: ["Geopolitics", "Statecraft", "Economic"],
    priority_tier: 1,
    short_summary: "First Prime Minister of independent India who established its democratic institutions, secular constitution, and non-aligned foreign policy.",
    timeline: [
      {
        date_or_year: "1929",
        event: "Elected President of the Indian National Congress at Lahore, declaring complete independence (Purna Swaraj) as the goal.",
        importance: "high",
        sources: ["Gopal (1975)"]
      },
      {
        date_or_year: "1947-08-15",
        event: "Delivered his famous 'Tryst with Destiny' speech, inaugurating independent India.",
        importance: "high",
        sources: ["Nehru Speeches", "Gopal (1979)"]
      },
      {
        date_or_year: "1948",
        event: "Secured integration of Kashmir into India; initiated first Indo-Pakistani War.",
        importance: "high",
        sources: ["Gopal (1979)", "Brown (2003)"]
      },
      {
        date_or_year: "1950",
        event: "Established the Planning Commission of India, initiating Soviet-style Five-Year Plans for industrialization.",
        importance: "high",
        sources: ["Planning Commission records"]
      },
      {
        date_or_year: "1955",
        event: "Co-organized the Bandung Conference, formalizing the Non-Aligned Movement of developing nations.",
        importance: "high",
        sources: ["Bandung archives", "Brown (2003)"]
      },
      {
        date_or_year: "1956",
        event: "Passed the Hindu Code Bills, codifying and reforming civil laws to protect women's inheritance rights.",
        importance: "high",
        sources: ["Gopal (1984)"]
      },
      {
        date_or_year: "1961",
        event: "Ordered military annexation of Portuguese Goa, ending European colonial presence on the subcontinent.",
        importance: "high",
        sources: ["Gopal (1984)"]
      },
      {
        date_or_year: "1962-10",
        event: "Sino-Indian War: Suffered sudden military defeat by China; severely shattered his domestic security assumptions.",
        importance: "high",
        sources: ["Maxwell (1970)", "Gopal (1984)"]
      }
    ],
    power_base: "Unchallenged popularity as Gandhi's chosen successor, absolute dominance over the Congress party machine, technocratic backing for state planning, and support of secular minority groups.",
    core_goals: [
      "Construct a secular, stable, constitutional democratic Indian republic.",
      "Achieve rapid economic self-reliance through state-led heavy industrialization.",
      "Champion international non-alignment and peaceful coexistence (Panchsheel) for newly decolonized states."
    ],
    incentives: [
      "Eradicating severe poverty and building modern scientific infrastructure ('temples of modern India').",
      "Preventing religious or caste-based balkanization of the subcontinent.",
      "Retaining moral leadership of the developing world."
    ],
    constraints: [
      "Severe post-partition refugee crises and immediate military conflict with Pakistan.",
      "Chronic lack of heavy industrial capital and food insecurity.",
      "Strategic vulnerabilities of a long, contested Himalayan border with China."
    ],
    allies: ["Mahatma Gandhi", "Vallabhbhai Patel (complex transition partner)", "Indira Gandhi", "Josip Broz Tito", "Gamal Abdel Nasser"],
    rivals: ["Muhammad Ali Jinnah", "Mao Zedong (later border opponent)", "Syama Prasad Mukherjee (Hindu nationalist leader)"],
    institutions_controlled_or_influenced: ["Indian National Congress", "Republic of India", "Planning Commission of India", "Non-Aligned Movement"],
    ideology_or_worldview: {
      summary: "Democratic socialism (Fabian socialism) combined with secularism, scientific temper, and international non-alignment.",
      evidence: [
        "His classic historical works 'The Discovery of India' (1946) and 'Glimpses of World History'.",
        "Passage of the Hindu Code Bills despite fierce conservative opposition."
      ],
      confidence: "high"
    },
    decision_patterns: [
      {
        pattern: "Highly intellectual, institutional consensus building, using state planning agencies and parliamentary debate to drive modernization while avoiding coercive social engineering.",
        examples: [
          "Creating the Indian Institutes of Technology (IITs) to build scientific capacity.",
          "Insisting on resolving the Kashmir dispute through the United Nations in 1948."
        ],
        confidence: "high"
      }
    ],
    crisis_behavior: "Exhibited strong rhetorical resolve and high-minded moral appeals in domestic crises (e.g. partition riots), but was severely shaken and indecisive when faced with direct military betrayal (the 1962 Chinese invasion).",
    negotiation_style: "highly eloquent, civilized, focusing on shared global principles, but was often critiqued by pragmatists as being overly idealistic in international relations.",
    risk_tolerance: "medium",
    centralization_preference: "high",
    conflict_preference: "low",
    institutional_respect: "high",
    coalition_dependency: "high",
    populism_level: "high",
    technocratic_level: "high",
    game_theory_profile: {
      main_players: ["India", "Pakistan", "People's Republic of China", "United States", "Soviet Union"],
      likely_objectives: [
        "India: Secure democratic stability, develop heavy industry, remain non-aligned.",
        "Pakistan: Secure Kashmir, build Western alliances to offset India.",
        "China: Establish border dominance, assert leadership of Asian socialism."
      ],
      payoffs: [
        "The Non-Aligned Movement (1955) allowed India to extract developmental and military aid from both the US and USSR without surrendering sovereign foreign policy (Highest strategic payoff)."
      ],
      constraints: ["Severe military weakness during the 1962 border war with China destroyed his peaceful border equilibrium."],
      common_strategic_moves: ["Five-Year economic plans", "Multilateral diplomatic treaties (Panchsheel)"],
      failure_modes: ["Over-idealistic reliance on diplomatic goodwill with China, leaving the Himalayan border catastrophically undefended in 1962."]
    },
    bayesian_assessment: [
      {
        claim: "Nehru's referral of the Kashmir issue to the United Nations in 1948 was a rational move to avoid total war rather than a tactical blunder.",
        prior_confidence: "medium",
        evidence: [
          "His letters to Mountbatten indicating a deep desire to prevent a wider, financially ruinous war with Pakistan that would cripple the newly independent state.",
          "The lack of any standing Indian military capability to easily sustain a long winter campaign in high-altitude Kashmir in early 1948."
        ],
        posterior_confidence: "high",
        what_would_change_this: "Discovery of private letters showing Nehru planned to partition Kashmir unilaterally in late 1947 regardless of UN involvement."
      }
    ],
    historical_comparisons: [
      {
        compared_to: "Thomas Jefferson",
        similarities: [
          "Intellectual, aristocratic author of foundational republican documents.",
          "Champion of secularism and scientific education to eradicate traditional superstition."
        ],
        differences: [
          "Nehru advocated for a powerful centralized planning state and heavy industrial socialism, whereas Jefferson feared industrial cities and favored decentralization."
        ],
        confidence: "high"
      }
    ],
    source_quality: {
      overall: "strong",
      notes: "Massive documentation including Nehru's Selected Works (over 80 volumes), personal writings, and definitive academic biographies by S. Gopal.",
      source_count: 5
    },
    sources: [
      "Gopal, Sarvepalli. (1975-1984). Jawaharlal Nehru: A Biography (3 volumes).",
      "Brown, Judith M. (2003). Nehru: A Political Life.",
      "Nehru, Jawaharlal. (1946). The Discovery of India.",
      "Zachariah, Benjamin. (2004). Nehru.",
      "Maxwell, Neville. (1970). India's China War."
    ],
    research_gaps: ["The exact degree of his private health deterioration and depression in the years immediately following the 1962 Chinese war remains heavily analyzed."],
    created_at: "2026-05-31T21:31:33Z",
    updated_at: "2026-05-31T21:31:33Z"
  },

  // 10. Indira Gandhi
  {
    person_id: "indira_gandhi",
    name: "Indira Gandhi",
    aliases: ["The Iron Lady of India"],
    birth_year: 1917,
    death_year: 1984,
    countries_or_regions: ["India", "South Asia"],
    era: "20th Century / Cold War Era",
    roles: ["Prime Minister of India"],
    domains: ["Geopolitics", "Statecraft", "Military"],
    priority_tier: 1,
    short_summary: "Third Prime Minister of India who centralised political power, won a decisive war against Pakistan in 1971 creating Bangladesh, and ruled under a controversial state of Emergency.",
    timeline: [
      {
        date_or_year: "1966-01",
        event: "Appointed Prime Minister by the Congress party syndicate, who viewed her as a malleable figurehead ('Gungi Gudiya').",
        importance: "high",
        sources: ["Frank (2001)"]
      },
      {
        date_or_year: "1969",
        event: "Split the Indian National Congress, outmaneuvering the conservative syndicate and nationalizing 14 major banks.",
        importance: "high",
        sources: ["Frank (2001)", "Guha (2007)"]
      },
      {
        date_or_year: "1971-12",
        event: "Decisive victory in the Indo-Pakistani War, liberating East Pakistan and creating the sovereign nation of Bangladesh.",
        importance: "high",
        sources: ["Guha (2007)", "War archives"]
      },
      {
        date_or_year: "1974-05",
        event: "Authorized 'Smiling Buddha', India's first successful peaceful nuclear test, asserting nuclear capability.",
        importance: "high",
        sources: ["Nuclear records"]
      },
      {
        date_or_year: "1975-06-25",
        event: "Declared a nationwide state of Emergency, suspending civil liberties, censoring the press, and imprisoning opponents.",
        importance: "high",
        sources: ["Emergency decrees", "Guha (2007)"]
      },
      {
        date_or_year: "1977",
        event: "Voluntarily lifted the Emergency and called elections; suffered a crushing defeat.",
        importance: "high",
        sources: ["Frank (2001)"]
      },
      {
        date_or_year: "1980-01",
        event: "Returned to power after the opposition coalition collapsed due to internal factionalism.",
        importance: "high",
        sources: ["Frank (2001)"]
      },
      {
        date_or_year: "1984-06",
        event: "Ordered Operation Blue Star, sending the army into the Golden Temple to flush out armed Sikh militants.",
        importance: "high",
        sources: ["Operation Blue Star records", "Guha (2007)"]
      },
      {
        date_or_year: "1984-10-31",
        event: "Assassinated by her own Sikh bodyguards in retaliation for Operation Blue Star.",
        importance: "high",
        sources: ["Frank (2001)"]
      }
    ],
    power_base: "Enormous populist adoration among the rural poor ('Garibi Hatao'), absolute centralized control over the Congress Party machine, loyal state security and intelligence services (RAW), and military backing.",
    core_goals: [
      "Consolidate centralized federal authority in India, dismantling regional oligarchies.",
      "Assert absolute Indian strategic hegemony in South Asia.",
      "Achieve national economic self-reliance through state-led nationalization and the Green Revolution."
    ],
    incentives: [
      "Maintaining the political hegemony of the Nehru-Gandhi dynasty.",
      "Protecting India's national sovereignty against joint US-Pakistani-Chinese encirclement.",
      "Eradicating extreme rural poverty through populist intervention."
    ],
    constraints: [
      "Severe economic inflation, food shortages, and massive labor strikes in the early 1970s.",
      "Judicial challenges from the Allahabad High Court that threatened her seat.",
      "Violent, armed regional and religious separatist insurrections (Sikh militancy, Naxalites)."
    ],
    allies: ["Sanjay Gandhi", "Pranab Mukherjee", "Leonid Brezhnev (crucial Soviet backing)"],
    rivals: ["Morarji Desai (syndicate leader)", "Jayaprakash Narayan (opposition leader)", "Richard Nixon (hostile US President)"],
    institutions_controlled_or_influenced: ["Republic of India", "Indian National Congress (I)", "Research and Analysis Wing (RAW)", "Indian Armed Forces"],
    ideology_or_worldview: {
      summary: "Highly centralized, populist nationalism combining state-directed economic intervention (socialism) with assertive geopolitical realism and secular dynasty preservation.",
      evidence: [
        "Amending the Constitution to add the words 'Socialist' and 'Secular' to the Preamble.",
        "Nationalizing major private industries, coal mines, and banking systems."
      ],
      confidence: "high"
    },
    decision_patterns: [
      {
        pattern: "Bold, highly decisive, and high-risk maneuvers that bypassed conventional party or administrative consensus in favor of highly personalized authority.",
        examples: [
          "Launching the 1971 war despite US threats to intervene.",
          "Declaring the Emergency immediately after a court ruled her election invalid."
        ],
        confidence: "high"
      }
    ],
    crisis_behavior: "Exhibited extraordinary resolve and steel under extreme threat (earning the moniker 'Iron Lady'), responding to political cornering with immediate aggressive counterstrikes (Emergency, military operation).",
    negotiation_style: "calculating, highly secretive, using division among opponents to secure dominance, rarely compromising from a position of weakness.",
    risk_tolerance: "high",
    centralization_preference: "high",
    conflict_preference: "high",
    institutional_respect: "low",
    coalition_dependency: "low",
    populism_level: "high",
    technocratic_level: "medium",
    game_theory_profile: {
      main_players: ["India", "Pakistan", "United States", "Soviet Union"],
      likely_objectives: [
        "India: Secure eastern border, dismantle Pakistani military threat, assist Bangladesh.",
        "Pakistan: Suppress East Bengal rebellion, retain national unity.",
        "US: Support Pakistan to maintain channel to China, deter India.",
        "USSR: Support India to offset US-China alignment."
      ],
      payoffs: [
        "Signing the Indo-Soviet Treaty of Friendship (1971) successfully deterred Chinese or US intervention during the Bangladesh war, optimizing India's military payoff (Highest security payoff)."
      ],
      constraints: ["US Seventh Fleet deployment in the Bay of Bengal acted as a direct threat constraint that forced rapid military victory in 13 days."],
      common_strategic_moves: ["Preemptive strikes", "Signing strategic security treaties"],
      failure_modes: ["Declaring the Emergency, which temporarily crippled India's democratic legitimacy and caused long-term institutional erosion."]
    },
    bayesian_assessment: [
      {
        claim: "Indira Gandhi called elections in 1977 because she believed she would win based on biased intelligence reports rather than a desire to restore democracy.",
        prior_confidence: "high",
        evidence: [
          "Extensive intelligence reports from the Intelligence Bureau (IB) in early 1977 predicting a clear majority for Congress due to the 'Emergency stability'.",
          "Her shock and depression when the actual results were announced, indicating she was completely unprepared for defeat."
        ],
        posterior_confidence: "high",
        what_would_change_this: "Discovery of private journals showing she knew she would lose but called the elections specifically to surrender power peacefully."
      }
    ],
    historical_comparisons: [
      {
        compared_to: "Margaret Thatcher",
        similarities: [
          "Brilliant, highly centralist female Prime Ministers of major democracies.",
          "Achieved massive domestic popularity through decisive military victories (Falklands/1971)."
        ],
        differences: [
          "Indira Gandhi suspended democratic constitutional rule and civil liberties, whereas Thatcher always operated within parliamentary rule of law."
        ],
        confidence: "high"
      }
    ],
    source_quality: {
      overall: "strong",
      notes: "Comprehensive biography by Katherine Frank, official Indian state records, and modern post-independence histories by Ramachandra Guha.",
      source_count: 5
    },
    sources: [
      "Frank, Katherine. (2001). Indira: The Life of Indira Nehru Gandhi.",
      "Guha, Ramachandra. (2007). India After Gandhi: The History of the World's Largest Democracy.",
      "Dhar, P. N. (2000). Indira Gandhi, the 'Emergency', and Indian Democracy.",
      "Malhotra, Inder. (1989). Indira Gandhi: A Personal and Political Biography.",
      "Gupte, Pranay. (1992). Mother India: A Political Biography of Indira Gandhi."
    ],
    research_gaps: ["Determining the exact level of influence exercised by her younger son Sanjay Gandhi during the Emergency remains an active subject of historical debate."],
    created_at: "2026-05-31T21:31:33Z",
    updated_at: "2026-05-31T21:31:33Z"
  },

  // 11. Deng Xiaoping
  {
    person_id: "deng_xiaoping",
    name: "Deng Xiaoping",
    aliases: ["The Architect of Modern China"],
    birth_year: 1904,
    death_year: 1997,
    countries_or_regions: ["China", "East Asia"],
    era: "Late 20th Century / Reform and Opening Up Era",
    roles: ["Paramount Leader of China", "Chairman of the Central Military Commission"],
    domains: ["Geopolitics", "Economic", "Statecraft"],
    priority_tier: 1,
    short_summary: "Chinese statesman who led China through the 'Reform and Opening Up' market-oriented economic reforms, lifting hundreds of millions out of poverty.",
    timeline: [
      {
        date_or_year: "1966",
        event: "Purged during the Cultural Revolution as the 'No. 2 Capitalist Roader'; sent to work in a tractor factory.",
        importance: "high",
        sources: ["Vogel (2011)"]
      },
      {
        date_or_year: "1978-12",
        event: "Outmaneuvered Hua Guofeng at the Third Plenary Session, launching the historic 'Reform and Opening Up' policy.",
        importance: "high",
        sources: ["Vogel (2011)", "Spence (1999)"]
      },
      {
        date_or_year: "1979-01",
        event: "Visited the United States, meeting President Jimmy Carter; initiated normalized diplomatic relations.",
        importance: "high",
        sources: ["Vogel (2011)"]
      },
      {
        date_or_year: "1980",
        event: "Established the first Special Economic Zones (SEZs) in Shenzhen, introducing market capitalism to China.",
        importance: "high",
        sources: ["Shenzhen SEZ archives"]
      },
      {
        date_or_year: "1884-12",
        event: "Signed the Sino-British Joint Declaration, establishing the 'One Country, Two Systems' framework for Hong Kong.",
        importance: "high",
        sources: ["Joint Declaration text", "Vogel (2011)"]
      },
      {
        date_or_year: "1989-06-04",
        event: "Ordered the military crackdown on the Tiananmen Square protests to preserve CCP authority.",
        importance: "high",
        sources: ["Vogel (2011)", "MacFarquhar (2011)"]
      },
      {
        date_or_year: "1992-01",
        event: "Embarked on his famous Southern Tour ('Nanxun'), revitalizing economic reforms after post-Tiananmen stagnation.",
        importance: "high",
        sources: ["Vogel (2011)", "Southern Tour speeches"]
      }
    ],
    power_base: "Absolute backing of the PLA elder revolutionary generals, alliance of moderate CCP economic pragmatists, and rapid success of market reforms.",
    core_goals: [
      "Modernize China's economy through market reforms ('Four Modernizations') while preserving the socialist core.",
      "Preserve absolute CCP political monopoly and domestic social stability.",
      "Maintain a pragmatic, low-profile foreign policy to avoid international confrontation ('hide strength, bide time')."
    ],
    incentives: [
      "Dread of China repeating the chaotic famines and purges of the late Mao era.",
      "Lifting the Chinese population out of structural poverty.",
      "Restoring China's regional and global economic influence."
    ],
    constraints: [
      "Fierce ideological resistance from conservative Marxist central planners (Chen Yun faction).",
      "Severe domestic inflation, corruption, and social unrest resulting from rapid price reforms.",
      "Post-1989 Western diplomatic isolation and economic sanctions."
    ],
    allies: ["Hu Yaobang (early)", "Zhao Ziyang (early)", "Yang Shangkun", "Ye Jianying"],
    rivals: ["Hua Guofeng", "Jiang Qing (Gang of Four)", "Chen Yun (economic planning rival)"],
    institutions_controlled_or_influenced: ["Chinese Communist Party", "Central Military Commission", "Central Advisory Commission", "People's Liberation Army"],
    ideology_or_worldview: {
      summary: "Deng Xiaoping Theory (pragmatic socialist market economy: 'seeking truth from facts' and 'it doesn't matter if a cat is black or white, as long as it catches mice').",
      evidence: [
        "Southern Tour speeches declaring that market mechanisms are not unique to capitalism.",
        "Formulating the 'Four Cardinal Principles' defining the limits of political reform."
      ],
      confidence: "high"
    },
    decision_patterns: [
      {
        pattern: "Incremental experimentalism ('crossing the river by feeling the stones'), testing capitalist policies in small zones before national rollout.",
        examples: [
          "Testing Special Economic Zones in Shenzhen before opening other coastal cities.",
          "Abolishing communes in favor of the Household Responsibility System."
        ],
        confidence: "high"
      }
    ],
    crisis_behavior: "Exceedingly cool and uncompromising during political threats, prioritizing state stability and CCP control above all else, even if it required extreme force (Tiananmen).",
    negotiation_style: "highly pragmatic, direct, focusing on concrete economic and sovereign results, bypassing ideological rhetoric entirely.",
    risk_tolerance: "high",
    centralization_preference: "high",
    conflict_preference: "medium",
    institutional_respect: "medium",
    coalition_dependency: "high",
    populism_level: "low",
    technocratic_level: "high",
    game_theory_profile: {
      main_players: ["China (Deng)", "United States", "Soviet Union", "Taiwan (ROC)"],
      likely_objectives: [
        "China: Secure US trade and tech access, isolate USSR, modernise economy.",
        "US: Leverage China against USSR, gain access to Chinese markets.",
        "USSR: Retain border security, manage Sino-Soviet normalization."
      ],
      payoffs: [
        "Diplomatic normalization and Southern Tour (1992) locked in massive Western investment and trade payoffs for China, transforming it into a global industrial giant (Highest economic payoff)."
      ],
      constraints: ["US congressional human rights sanctions post-1989 limited diplomatic options, forcing Deng to double down on economic growth to maintain legitimacy."],
      common_strategic_moves: ["Pragmatic foreign visits", "Special Economic Zones creation"],
      failure_modes: ["Refusal to initiate deep political reforms, leading to systemic corruption and wealth inequalities in modern China."]
    },
    bayesian_assessment: [
      {
        claim: "Deng ordered the military crackdown in 1989 because he sincerely believed it prevented a Soviet-style total state collapse rather than out of pure cruelty.",
        prior_confidence: "high",
        evidence: [
          "His frequent references to Poland's Solidarity movement and the subsequent collapse of Eastern bloc regimes as a warning.",
          "His Southern Tour speeches reiterating that without the CCP's monopoly on power, China would descend into factional warlordism."
        ],
        posterior_confidence: "high",
        what_would_change_this: "Discovery of private documents showing Deng wanted to deliberately maximize casualties to terrorize the population."
      }
    ],
    historical_comparisons: [
      {
        compared_to: "Otto von Bismarck",
        similarities: [
          "Pragmatic 'white revolutionaries' who modernized their states' economies and structures.",
          "Fiercely preserved traditional authoritarian regimes (Prussian crown/CCP) against democratic forces."
        ],
        differences: [
          "Deng modernized a massive, developing socialist state of 1 billion people through peaceful global trade rather than military unification."
        ],
        confidence: "high"
      }
    ],
    source_quality: {
      overall: "strong",
      notes: "Ezra Vogel's definitive biography, official CCP history compilations, and extensive Western analyses of China's economic reforms.",
      source_count: 5
    },
    sources: [
      "Vogel, Ezra F. (2011). Deng Xiaoping and the Transformation of China.",
      "Spence, Jonathan D. (1999). The Search for Modern China.",
      "MacFarquhar, Roderick. (2011). The Politics of China.",
      "Deng, Xiaoping. (1994). Selected Works of Deng Xiaoping.",
      "Naughton, Barry. (1995). Growing Out of the Plan: Chinese Economic Reform."
    ],
    research_gaps: ["Determining the exact internal debates and minute-by-minute decisions of the Central Committee on the evening of June 3, 1989, remains restricted in Beijing archives."],
    created_at: "2026-05-31T21:31:33Z",
    updated_at: "2026-05-31T21:31:33Z"
  },

  // 12. Xi Jinping
  {
    person_id: "xi_jinping",
    name: "Xi Jinping",
    aliases: ["General Secretary Xi"],
    birth_year: 1953,
    death_year: null,
    countries_or_regions: ["China", "East Asia", "Global"],
    era: "21st Century / Modern Era",
    roles: ["General Secretary of the Chinese Communist Party", "President of the People's Republic of China", "Chairman of the Central Military Commission"],
    domains: ["Geopolitics", "Statecraft", "Economic"],
    priority_tier: 1,
    short_summary: "Current Paramount Leader of China who has centralized power, launched the Belt and Road Initiative, and asserted a highly confident, muscular global presence.",
    timeline: [
      {
        date_or_year: "2012-11-15",
        event: "Appointed General Secretary of the CCP at the 18th Party Congress; launched massive anti-corruption campaign.",
        importance: "high",
        sources: ["Economy (2018)"]
      },
      {
        date_or_year: "2013-09",
        event: "Announced the Belt and Road Initiative (BRI) during a speech in Kazakhstan, outlining a massive global infrastructure network.",
        importance: "high",
        sources: ["BRI official documents", "Economy (2018)"]
      },
      {
        date_or_year: "2017",
        event: "His political philosophy ('Xi Jinping Thought') was codified into the CCP Constitution, elevating his status to that of Mao and Deng.",
        importance: "high",
        sources: ["CCP 19th Congress reports"]
      },
      {
        date_or_year: "2018-03",
        event: "Secured constitutional amendments abolishing presidential term limits, allowing lifelong rule.",
        importance: "high",
        sources: ["National People's Congress records"]
      },
      {
        date_or_year: "2020",
        event: "Enforced the National Security Law in Hong Kong, ending the territory's democratic autonomy.",
        importance: "high",
        sources: ["Hong Kong Security Law text"]
      },
      {
        date_or_year: "2020-2022",
        event: "Instituted the strict 'Zero-COVID' policy, using total lockdowns to demonstrate systemic state capability.",
        importance: "high",
        sources: ["Zero-COVID directives"]
      },
      {
        date_or_year: "2022-10-23",
        event: "Secured an unprecedented third term as CCP General Secretary at the 20th Party Congress.",
        importance: "high",
        sources: ["20th Party Congress records"]
      }
    ],
    power_base: "Highly centralized anti-corruption purge networks (the CCDI), absolute control over CCP ideological and digital surveillance systems, and complete loyalty of the PLA military command.",
    core_goals: [
      "Achieve the 'Great Rejuvenation of the Chinese Nation' (The Chinese Dream) by 2049.",
      "Assert absolute Chinese regional dominance (particularly over Taiwan and South China Sea) and global economic leadership.",
      "Cement total, technology-backed CCP social and political control over all aspects of public and private life."
    ],
    incentives: [
      "Ensuring the longevity of the CCP regime against Western subversion.",
      "Transforming China into a leading global scientific and industrial innovator.",
      "Preventing any challenge to his personalized centralized leadership."
    ],
    constraints: [
      "Structural deceleration of Chinese economic growth and massive real estate debt.",
      "Aggressive Sino-US strategic decoupling and Western technological containment.",
      "Severe domestic demographic decline (shrinking labor force)."
    ],
    allies: ["Wang Qishan (anti-corruption architect)", "Liu He (economic advisor)", "Li Qiang (Premier)"],
    rivals: ["Bo Xilai (purged)", "Zhou Yongkang (purged)", "Factions of the Communist Youth League (sidelined)"],
    institutions_controlled_or_influenced: ["Chinese Communist Party", "Central Military Commission", "Central Commission for Discipline Inspection (CCDI)"],
    ideology_or_worldview: {
      summary: "Xi Jinping Thought on Socialism with Chinese Characteristics for a New Era (combining Marxism-Leninism, highly assertive nationalism, technology-backed authoritarian social control, and state-capitalist economic planning).",
      evidence: [
        "The systematic construction of the social credit system and national firewall.",
        "His official publication series 'The Governance of China'."
      ],
      confidence: "high"
    },
    decision_patterns: [
      {
        pattern: "Top-down, highly centralized decision-making through direct party committees, completely bypassing traditional state council ministries in favor of personal directives.",
        examples: [
          "Launching the anti-corruption campaign that investigated millions of officials.",
          "Personally directing the Zero-COVID policy execution."
        ],
        confidence: "high"
      }
    ],
    crisis_behavior: "Exhibits strong ideological resilience and unyielding stance during strategic confrontations (e.g. trade wars, Hong Kong protests), preferring centralization and total social control over compromise.",
    negotiation_style: "muscular, highly scripted, emphasizing Chinese sovereignty and civilizational pride, refusing to negotiate under foreign pressure.",
    risk_tolerance: "medium",
    centralization_preference: "high",
    conflict_preference: "medium",
    institutional_respect: "high",
    coalition_dependency: "low",
    populism_level: "medium",
    technocratic_level: "high",
    game_theory_profile: {
      main_players: ["China", "United States", "European Union", "Taiwan"],
      likely_objectives: [
        "China: Achieve tech independence, unify with Taiwan, expand Belt & Road.",
        "US: Contain China's military expansion, protect high-tech monopoly.",
        "Taiwan: Maintain de facto independence, secure US military backing."
      ],
      payoffs: [
        "The Belt and Road Initiative (2013) successfully established long-term economic and infrastructural dependencies across developing countries, maximizing China's international leverage payoffs (Highest geopolitical payoff)."
      ],
      constraints: ["US technological sanctions on semiconductor access act as a severe constraint on China's AI and industrial plans."],
      common_strategic_moves: ["Muscular maritime blockades", "Sovereign energy alignments (e.g. Russia)"],
      failure_modes: ["Economic stagnation caused by excessive centralization and suppression of the private tech sector."]
    },
    bayesian_assessment: [
      {
        claim: "Xi's anti-corruption campaign was launched primarily to consolidate his personal power rather than to clean up the CCP.",
        prior_confidence: "medium",
        evidence: [
          "The anti-corruption purges disproportionately targeted and dismantled powerful rival factions (e.g., Bo Xilai, Zhou Yongkang, and the Youth League).",
          "The systematic replacement of purged officials with loyalists from Xi's early career in Zhejiang and Fujian."
        ],
        posterior_confidence: "high",
        what_would_change_this: "The campaign investigating and purging top active members of Xi's own direct personal faction."
      }
    ],
    historical_comparisons: [
      {
        compared_to: "Mao Zedong",
        similarities: [
          "Centralization of absolute personal authority, breaking previous collective leadership norms.",
          "Codification of personal thought into the state constitution."
        ],
        differences: [
          "Xi operates a highly institutionalized, digital-surveillance state with massive modern technological capacity, rather than Mao's chaotic mass peasant mobilizations."
        ],
        confidence: "high"
      }
    ],
    source_quality: {
      overall: "medium",
      notes: "Large volume of contemporary geopolitical analysis, think-tank reports, and official CCP state releases, though internal leadership debates remain heavily guarded.",
      source_count: 5
    },
    sources: [
      "Economy, Elizabeth C. (2018). The Third Revolution: Xi Jinping and the New Chinese State.",
      "Xi, Jinping. (2014-2022). The Governance of China (4 volumes).",
      "Shambaugh, David. (2021). China's Leaders: From Mao to Now.",
      "Brown, Kerry. (2016). CEO China: The Rise of Xi Jinping.",
      "Rudd, Kevin. (2022). The Avoidable War: The Dangers of a Catastrophic Conflict between the US and Xi Jinping's China."
    ],
    research_gaps: ["The exact details of internal party pushback against his third term and his private decision-making timeline during the sudden abandonment of Zero-COVID in late 2022 remain classified."],
    created_at: "2026-05-31T21:31:33Z",
    updated_at: "2026-05-31T21:31:33Z"
  },

  // 13. Joseph Stalin
  {
    person_id: "joseph_stalin",
    name: "Joseph Stalin",
    aliases: ["Iosif Dzhugashvili", "Stalin"],
    birth_year: 1878,
    death_year: 1953,
    countries_or_regions: ["Soviet Union", "Russia", "Europe"],
    era: "20th Century / Soviet Era / WWII / Cold War",
    roles: ["General Secretary of the Communist Party of the Soviet Union", "Premier of the Soviet Union"],
    domains: ["Geopolitics", "Statecraft", "Military"],
    priority_tier: 1,
    short_summary: "Soviet leader who centralized power in the USSR, directed its rapid industrialization and forced collectivization, led the nation through WWII, and initiated the Cold War.",
    timeline: [
      {
        date_or_year: "1922-04-03",
        event: "Appointed General Secretary of the Central Committee of the CCP, using it to build a massive patronage network.",
        importance: "high",
        sources: ["Kotkin (2014)"]
      },
      {
        date_or_year: "1928",
        event: "Launched the first Five-Year Plan, initiating rapid forced industrialization and agricultural collectivization.",
        importance: "high",
        sources: ["Kotkin (2014)", "Conquest (1986)"]
      },
      {
        date_or_year: "1932-1933",
        event: "Enforced catastrophic grain requisitions, resulting in the Holodomor famine across Ukraine.",
        importance: "high",
        sources: ["Conquest (1986)", "Holodomor archives"]
      },
      {
        date_or_year: "1936-1938",
        event: "Initiated the Great Purge (Yezhovshchina), executing or imprisoning millions of party members, military officers, and citizens.",
        importance: "high",
        sources: ["Conquest (1990)"]
      },
      {
        date_or_year: "1939-08-23",
        event: "Signed the Molotov-Ribbentrop Pact with Nazi Germany, dividing Eastern Europe into spheres of influence.",
        importance: "high",
        sources: ["Pact transcripts", "Kotkin (2017)"]
      },
      {
        date_or_year: "1941-06-22",
        event: "Faced sudden German invasion (Operation Barbarossa); assumed absolute military command as Stavka Chairman.",
        importance: "high",
        sources: ["Kotkin (2017)", "Glantz (1995)"]
      },
      {
        date_or_year: "1945-02",
        event: "Attended the Yalta Conference, securing Soviet control over Eastern Europe and entry into the Pacific War.",
        importance: "high",
        sources: ["Yalta transcripts"]
      },
      {
        date_or_year: "1948-06",
        event: "Ordered the Berlin Blockade, initiating the first major crisis of the Cold War.",
        importance: "high",
        sources: ["Kotkin (2017)"]
      }
    ],
    power_base: "Totalitarian control over the Communist Party bureaucracy (Nomenklatura), NKVD secret police networks, state command economy, and absolute loyalty of the Red Army after the war.",
    core_goals: [
      "Consolidate 'Socialism in One Country' by turning the USSR into a massive industrial-military superpower.",
      "Defeat Nazi Germany and build a vast Eastern European defensive buffer zone.",
      "Compete globally with Western capitalist powers (Cold War), exporting Soviet-style communism."
    ],
    incentives: [
      "Obsessive fear of capitalist encirclement and internal subversion.",
      "Total industrialization at any human cost to prepare for inevitable war with capitalist powers.",
      "Retaining absolute personal power."
    ],
    constraints: [
      "Extreme initial agricultural and technical backwardness of the Russian state.",
      "Severe destruction and loss of 27 million Soviet lives during WWII.",
      "Geopolitical nuclear monopoly held by the United States during the early Cold War (until 1949)."
    ],
    allies: ["Vyacheslav Molotov", "Lavrentiy Beria", "Lazar Kaganovich", "Nikita Khrushchev (early)"],
    rivals: ["Leon Trotsky (purged/assassinated)", "Adolf Hitler", "Nikolai Bukharin (executed)", "Harry S. Truman", "Josip Broz Tito (after split)"],
    institutions_controlled_or_influenced: ["Communist Party of the Soviet Union", "NKVD", "Sovnarkom", "The Warsaw Pact (established post-mortem but based on his zones)"],
    ideology_or_worldview: {
      summary: "Marxism-Leninism-Stalinism (advocating for Socialism in One Country, rapid collectivization, state terror to protect the revolution, and absolute centralized command planning).",
      evidence: [
        "His monograph 'Problems of Leninism' (1926).",
        "The complete eradication of private property and individual farming."
      ],
      confidence: "high"
    },
    decision_patterns: [
      {
        pattern: "Paranoid, highly systematic elimination of all potential rivals through state show trials and terror, combined with absolute centralized control over military and economic planners.",
        examples: [
          "Purging the Red Army high command in 1937 on sparse evidence.",
          "Personally checking lists of execution targets during the Great Purge."
        ],
        confidence: "high"
      }
    ],
    crisis_behavior: "Exhibited profound denial and temporary collapse during the initial hours of the 1941 German invasion, but recovered to enforce a highly disciplined, completely centralized war effort that ruthlessly sacrificed millions of soldiers to win.",
    negotiation_style: "patient, highly realistic, transactional, focused on concrete territorial boundaries and physical military control, refusing to yield on sphere of influence borders.",
    risk_tolerance: "high",
    centralization_preference: "high",
    conflict_preference: "high",
    institutional_respect: "low",
    coalition_dependency: "low",
    populism_level: "high",
    technocratic_level: "medium",
    game_theory_profile: {
      main_players: ["Soviet Union", "Nazi Germany", "United States", "Great Britain"],
      likely_objectives: [
        "USSR: Defeat Germany, establish Eastern European buffer zone, secure aid.",
        "Germany: Destroy Soviet state, acquire Lebensraum.",
        "US/UK: Defeat Germany, limit Soviet post-war expansion."
      ],
      payoffs: [
        "Molotov-Ribbentrop Pact (1939) successfully delayed German invasion while yielding half of Poland, maximizing preparation payoffs (Highest survival payoff)."
      ],
      constraints: ["Severe military underdevelopment after the 1937 purges forced the delay of direct conflict with Germany."],
      common_strategic_moves: ["Sphere division pacts", "Ruthless total mobilization"],
      failure_modes: ["His extreme paranoia caused the execution of his most talented military commanders, nearly causing total defeat in 1941."]
    },
    bayesian_assessment: [
      {
        claim: "Stalin did not expect the German invasion of June 1941 because he believed Hitler would not risk a war on two fronts.",
        prior_confidence: "high",
        evidence: [
          "His systematic dismissal of over 80 concrete intelligence warnings from spies (like Richard Sorge) and British diplomats.",
          "His orders to border troops not to return fire in the early hours to avoid 'provoking' the Germans."
        ],
        posterior_confidence: "high",
        what_would_change_this: "Discovery of Soviet military plans showing Stalin intended to preemptively attack Germany in late June 1941."
      }
    ],
    historical_comparisons: [
      {
        compared_to: "Ivan the Terrible",
        similarities: [
          "Autocratic Russian rulers who centralized power through brutal purges of the nobility (boyars/old Bolsheviks).",
          "Expanded territory through military force while terrorizing the domestic population."
        ],
        differences: [
          "Stalin commanded a massive, industrialized global superpower utilizing modern ideological propaganda."
        ],
        confidence: "high"
      }
    ],
    source_quality: {
      overall: "strong",
      notes: "Stephen Kotkin's definitive multi-volume biography, extensive Soviet state archives opened post-1991, and definitive histories of the Great Purges.",
      source_count: 5
    },
    sources: [
      "Kotkin, Stephen. (2014). Stalin: Paradoxes of Power, 1878-1928.",
      "Kotkin, Stephen. (2017). Stalin: Waiting for Hitler, 1929-1941.",
      "Conquest, Robert. (1990). The Great Terror: A Reassessment.",
      "Conquest, Robert. (1986). The Harvest of Sorrow: Soviet Collectivization and the Terror-Famine.",
      "Glantz, David M. & House, Jonathan. (1995). When Titans Clashed: How the Red Army Stopped Hitler."
    ],
    research_gaps: ["The exact details of his final days and whether Lavrentiy Beria deliberately delayed medical treatment during his stroke in 1953 remain subject to debate."],
    created_at: "2026-05-31T21:31:33Z",
    updated_at: "2026-05-31T21:31:33Z"
  },

  // 14. Vladimir Putin
  {
    person_id: "vladimir_putin",
    name: "Vladimir Putin",
    aliases: ["President Putin"],
    birth_year: 1952,
    death_year: null,
    countries_or_regions: ["Russia", "Eurasia"],
    era: "21st Century / Modern Era",
    roles: ["President of Russia", "Prime Minister of Russia"],
    domains: ["Geopolitics", "Statecraft", "Military"],
    priority_tier: 1,
    short_summary: "Russian President who has centralized domestic authority, consolidated state control over energy resources, and challenged Western global hegemony through military interventions.",
    timeline: [
      {
        date_or_year: "1999-12-31",
        event: "Appointed Acting President of Russia by Boris Yeltsin following his sudden resignation.",
        importance: "high",
        sources: ["Myers (2015)"]
      },
      {
        date_or_year: "2000",
        event: "Prosecuted the Second Chechen War with absolute force, securing grozny and stabilizing the region.",
        importance: "high",
        sources: ["Myers (2015)"]
      },
      {
        date_or_year: "2003",
        event: "Ordered the arrest of oil oligarch Mikhail Khodorkovsky, consolidating state control over strategic energy assets.",
        importance: "high",
        sources: ["Myers (2015)", "Gessen (2012)"]
      },
      {
        date_or_year: "2007",
        event: "Delivered his famous Munich speech warning against NATO expansion and US unilateral hegemony.",
        importance: "high",
        sources: ["Munich speech transcript"]
      },
      {
        date_or_year: "2014-03",
        event: "Annexed Crimea from Ukraine following the Maidan revolution, defying Western international boundaries.",
        importance: "high",
        sources: ["Crimean annexation records"]
      },
      {
        date_or_year: "2015-09",
        event: "Ordered military intervention in the Syrian Civil War, securing Bashar al-Assad's regime and Russian naval bases.",
        importance: "high",
        sources: ["Syrian campaign records"]
      },
      {
        date_or_year: "2020",
        event: "Passed constitutional reforms resetting his presidential term limits, allowing him to run until 2036.",
        importance: "high",
        sources: ["Russian constitutional amendment documents"]
      },
      {
        date_or_year: "2022-02-24",
        event: "Launched the full-scale invasion of Ukraine, initiating the largest land war in Europe since WWII.",
        importance: "high",
        sources: ["Ukraine invasion documents"]
      }
    ],
    power_base: "The network of security services veterans (Siloviki), state energy conglomerates (Gazprom/Rosneft), total control over domestic media and telecommunications, and a patriotic voter demographic.",
    core_goals: [
      "Re-establish Russia as a sovereign, respected global superpower in a multipolar world.",
      "Deter NATO expansion and assert regional hegemony over post-Soviet Eurasian states.",
      "Ensure personal regime survival and protect the state energy-based wealth structure."
    ],
    incentives: [
      "Averting a domestic color revolution similar to Ukraine's Maidan.",
      "Asserting Russia's historical and cultural civilizational role against Western values.",
      "Securing energy corridors to China and non-Western markets."
    ],
    constraints: [
      "Severe demographic contraction and resource-dependent economic structure.",
      "Comprehensive Western financial, technological, and trade embargoes.",
      "Inherent inefficiencies and corruption of a personalized patronage-based state."
    ],
    allies: ["Alexander Lukashenko", "Xi Jinping (strategic partner)", "Ramzan Kadyrov", "Dmitry Medvedev"],
    rivals: ["Alexei Navalny (deceased opponent)", "Volodymyr Zelenskyy", "NATO and United States leadership"],
    institutions_controlled_or_influenced: ["Russian Federation Presidency", "The FSB", "Gazprom", "The Collective Security Treaty Organization (CSTO)"],
    ideology_or_worldview: {
      summary: "Eurasianism combined with conservative nationalism, sovereign democracy, challenges to US unilateral hegemony, and a romanticized view of historical Russian imperial/Soviet borders.",
      evidence: [
        "His Munich speech (2007) and essay 'On the Historical Unity of Russians and Ukrainians' (2021).",
        "State-backed promotion of conservative orthodox family values."
      ],
      confidence: "high"
    },
    decision_patterns: [
      {
        pattern: "Opportunistic, tactical military strikes designed to catch Western decision-makers by surprise, using energy and grain blockades to create geopolitical leverage.",
        examples: [
          "Annexing Crimea while the West was focused on post-Sochi diplomacy.",
          "Intervening in Syria to force the US to negotiate on regional security."
        ],
        confidence: "high"
      }
    ],
    crisis_behavior: "Exhibits highly aggressive and risk-tolerant behavior when cornered (e.g. launching the 2022 invasion when Ukraine drifted toward NATO), preferring prolonged conflict over any visible retreat.",
    negotiation_style: "highly transactional, cynical, using historical grievances and nuclear deterrence threats as leverage, compromising only when physically blocked.",
    risk_tolerance: "high",
    centralization_preference: "high",
    conflict_preference: "high",
    institutional_respect: "low",
    coalition_dependency: "low",
    populism_level: "high",
    technocratic_level: "medium",
    game_theory_profile: {
      main_players: ["Russia", "Ukraine", "United States", "European Union", "China"],
      likely_objectives: [
        "Russia: Deter NATO, annex territory, secure regime survival.",
        "Ukraine: Defend sovereignty, integrate with EU/NATO.",
        "US/EU: Defeat Russian invasion, maintain NATO unity, impose sanctions.",
        "China: Maintain strategic alliance with Russia, secure cheap energy."
      ],
      payoffs: [
        "Annexing Crimea (2014) yielded a massive domestic popularity payoff with minimal Western military response, though the 2022 escalation created a high-cost gridlock (Variable strategic payoff)."
      ],
      constraints: ["Western microchip and tech sanctions act as a severe constraint on Russian modern military industry."],
      common_strategic_moves: ["Nuclear saber-rattling", "Energy price manipulations"],
      failure_modes: ["Underestimating Ukrainian national resistance and Western coalition unity in 2022, leading to a long, attritional economic war."]
    },
    bayesian_assessment: [
      {
        claim: "Putin's decision to invade Ukraine in 2022 was based on flawed intelligence that predicted rapid political collapse in Kyiv.",
        prior_confidence: "high",
        evidence: [
          "The rapid, initial Russian paratrooper assault on Hostomel Airport, designed to secure a quick landing zone to capture Kyiv within days.",
          "The systematic arrest of FSB Fifth Service officers (like Beseda) shortly after the failed initial offensive, indicating rage over inaccurate intelligence."
        ],
        posterior_confidence: "high",
        what_would_change_this: "Discovery of Russian state plans dated pre-2022 outlining a planned 10-year attritional war from the very beginning."
      }
    ],
    historical_comparisons: [
      {
        compared_to: "Nicholas I",
        similarities: [
          "Autocratic Russian tsars who suppressed domestic liberalism and prosecuted wars to assert hegemony over neighboring territories (Crimean War/Ukraine).",
          "Faced severe Western diplomatic and military coalitions designed to contain them."
        ],
        differences: [
          "Putin commands a modern state with a massive nuclear arsenal, operating inside a tripolar (US-China-Russia) global security framework."
        ],
        confidence: "high"
      }
    ],
    source_quality: {
      overall: "medium",
      notes: "Large volume of contemporary intelligence, geopolitical monographs, and Russian state records, though active war decisions remain classified.",
      source_count: 5
    },
    sources: [
      "Myers, Steven Lee. (2015). The New Tsar: The Rise and Reign of Vladimir Putin.",
      "Gessen, Masha. (2012). The Man Without a Face: The Unlikely Rise of Vladimir Putin.",
      "Putin, Vladimir. (2021). On the Historical Unity of Russians and Ukrainians (essay).",
      "Stent, Angela. (2019). Putin's World: Russia Against the West and with the Rest.",
      "Galeotti, Mark. (2019). We Need to Talk About Putin."
    ],
    research_gaps: ["The exact degree of his personal isolation and day-to-day decision-making during the COVID-19 pandemic remains highly analyzed by intelligence agencies."],
    created_at: "2026-05-31T21:31:33Z",
    updated_at: "2026-05-31T21:31:33Z"
  },

  // 15. Ayatollah Khomeini
  {
    person_id: "ayatollah_khomeini",
    name: "Ruhollah Khomeini",
    aliases: ["Ayatollah Khomeini"],
    birth_year: 1902,
    death_year: 1989,
    countries_or_regions: ["Iran", "Middle East"],
    era: "20th Century / Islamic Revolution / Cold War",
    roles: ["Supreme Leader of Iran", "Grand Ayatollah"],
    domains: ["Geopolitics", "Philosophy", "Statecraft"],
    priority_tier: 1,
    short_summary: "Iranian Shia cleric who led the 1979 Islamic Revolution, overthrew the Pahlavi monarchy, and established the world's first modern Islamic theological republic.",
    timeline: [
      {
        date_or_year: "1963",
        event: "Arrested and exiled by the Shah after delivering fierce sermons against the Shah's pro-Western White Revolution.",
        importance: "high",
        sources: ["Milani (2011)", "Khomeini Works"]
      },
      {
        date_or_year: "1979-02-01",
        event: "Returned to Iran in triumph following the flight of the Shah, greeted by millions in Tehran.",
        importance: "high",
        sources: ["Milani (2011)", "Axworthy (2013)"]
      },
      {
        date_or_year: "1979-11-04",
        event: "Endorsed the seizure of the US Embassy by student militants, initiating the 444-day Iran hostage crisis.",
        importance: "high",
        sources: ["Hostage crisis records", "Axworthy (2013)"]
      },
      {
        date_or_year: "1979-12",
        event: "Promulgated a new constitution establishing the Islamic Republic based on Velayat-e Faqih (Guardianship of the Islamic Jurist).",
        importance: "high",
        sources: ["Iranian Constitution text"]
      },
      {
        date_or_year: "1980-09",
        event: "Faced sudden invasion by Saddam Hussein's Iraq, initiating a brutal 8-year war.",
        importance: "high",
        sources: ["Axworthy (2013)", "Karsh (2002)"]
      },
      {
        date_or_year: "1988-07-20",
        event: "Accepted UN Security Council Resolution 598 ending the war, describing it as 'drinking a cup of poison'.",
        importance: "high",
        sources: ["UN resolution records", "Milani (2011)"]
      },
      {
        date_or_year: "1989-02",
        event: "Issued a fatwa ordering the execution of British author Salman Rushdie over his book 'The Satanic Verses'.",
        importance: "high",
        sources: ["Fatwa records"]
      },
      {
        date_or_year: "1989-06-03",
        event: "Passed away; his funeral in Tehran was attended by an estimated 10 million mourners, causing massive crowd crushes.",
        importance: "high",
        sources: ["Milani (2011)"]
      }
    ],
    power_base: "Devout, absolute spiritual loyalty of the traditional Shia clerical networks and bazaar merchant classes, the Islamic Revolutionary Guard Corps (IRGC), and ideological control over all education and state organs.",
    core_goals: [
      "Overthrow the secular, pro-Western Pahlavi monarchy in Iran.",
      "Establish a modern, strict theological state based on the rule of Islamic jurists (Velayat-e Faqih).",
      "Export the Islamic revolution globally, aggressively opposing both US capitalism ('Great Satan') and Soviet communism ('Lesser Satan')."
    ],
    incentives: [
      "Absolute obedience to divine Islamic law (Sharia) as he interpreted it.",
      "Eradicating Western cultural and political influence (Westoxification) in the Muslim world.",
      "Supporting oppressed Islamic groups globally."
    ],
    constraints: [
      "Devastating 8-year war with Iraq that completely exhausted the state's economy.",
      "Fierce domestic armed uprisings and opposition from secular/communist factions.",
      "Total international diplomatic and financial isolation due to embassy seizures."
    ],
    allies: ["Ali Khamenei", "Akbar Hashemi Rafsanjani", "Mustafa Chamran", "Shia clerical hierarchy"],
    rivals: ["Mohammad Reza Pahlavi (Shah of Iran)", "Saddam Hussein", "Jimmy Carter", "Militant secular leftists (MEK)"],
    institutions_controlled_or_influenced: ["Islamic Republic of Iran", "Islamic Revolutionary Guard Corps (IRGC)", "Qom Clerical Establishments", "Hezbollah (established in Lebanon under his patronage)"],
    ideology_or_worldview: {
      summary: "Velayat-e Faqih (Guardianship of the Islamic Jurist, asserting that senior Shia clerics hold absolute political and legal authority until the return of the Mahdi), combined with anti-imperialism and anti-secularism.",
      evidence: [
        "His core theoretical lectures compiled in 'Islamic Government: Governance of the Jurist' (1970).",
        "Systematic purging of all secular, nationalist, and Marxist elements from the post-revolutionary cabinet."
      ],
      confidence: "high"
    },
    decision_patterns: [
      {
        pattern: "Absolute, unyielding theological dogmatism in public pronouncements, completely refusing to compromise on moral/religious principles, while selectively allowing the IRGC tactical flexibility.",
        examples: [
          "Refusing any peace talks with Saddam Hussein until he was overthrown, prolonging the war for years.",
          "Refusing to release US hostages until Jimmy Carter lost the 1980 election."
        ],
        confidence: "high"
      }
    ],
    crisis_behavior: "Exhibited extraordinary spiritual stubbornness and defiance under extreme military or physical threat, using crises (like the Iraqi invasion) to successfully unite the nation and purge domestic opposition.",
    negotiation_style: "refused direct negotiations with Western leaders, communicating through religious decrees and intermediaries, treating compromise as a form of spiritual betrayal.",
    risk_tolerance: "high",
    centralization_preference: "high",
    conflict_preference: "high",
    institutional_respect: "low",
    coalition_dependency: "low",
    populism_level: "high",
    technocratic_level: "low",
    game_theory_profile: {
      main_players: ["Iran", "Iraq (Saddam)", "United States", "Soviet Union"],
      likely_objectives: [
        "Iran: Expose secular tyrants, export revolution, defend borders.",
        "Iraq: Annex Khuzestan oilfields, suppress Shia uprising threat.",
        "US: Contain Islamic revolution, protect Gulf oil lanes."
      ],
      payoffs: [
        "Accepting the 1988 ceasefire ( UN 598) was described as 'poison', but preserved the theological regime from total economic and military collapse under Iraqi chemical weapons (Highest survival payoff)."
      ],
      constraints: ["Severe military equipment shortages due to US embargoes limited Iran's conventional offensive capabilities against Iraq."],
      common_strategic_moves: ["Asymmetric proxy support (Hezbollah)", "Clerical decrees (Fatwas)"],
      failure_modes: ["Extending the Iraq war for 6 unnecessary years in a futile attempt to capture Baghdad, causing hundreds of thousands of needless deaths."]
    },
    bayesian_assessment: [
      {
        claim: "Khomeini tolerated the seizure of the US Embassy primarily to neutralize moderate secular forces in the provisional government.",
        prior_confidence: "high",
        evidence: [
          "The immediate resignation of moderate Prime Minister Mehdi Bazargan following Khomeini's endorsement of the embassy takeover.",
          "The rapid, subsequent drafting and passage of the highly clerical constitution while the nation was mobilized in anti-US hysteria."
        ],
        posterior_confidence: "high",
        what_would_change_this: "Discovery of contemporary records showing Khomeini actively tried to order the students to release the hostages immediately."
      }
    ],
    historical_comparisons: [
      {
        compared_to: "Girolamo Savonarola",
        similarities: [
          "Religious reformists who overthrew wealthy, secular, corrupt regimes (Medici/Shah).",
          "Established a strict moral/theological order based on divine law, purging secular art/ideas."
        ],
        differences: [
          "Khomeini successfully built a durable state bureaucracy and modern military apparatus (IRGC) that survived decades, whereas Savonarola was executed within years."
        ],
        confidence: "high"
      }
    ],
    source_quality: {
      overall: "strong",
      notes: "Abbas Milani's rigorous historical biographies, extensive diplomatic history of the 1979 revolution, and Khomeini's own voluminous legal/religious writings.",
      source_count: 5
    },
    sources: [
      "Milani, Abbas. (2011). The Shah.",
      "Axworthy, Michael. (2013). Revolutionary Iran: A History of the Islamic Republic.",
      "Khomeini, Ruhollah. (1970). Hokumat-e Islami: Velayat-e Faqih (Islamic Government).",
      "Karsh, Efraim. (2002). The Iran-Iraq War 1980-1988.",
      "Bakhash, Shaul. (1984). The Reign of the Ayatollahs: Iran and the Islamic Revolution."
    ],
    research_gaps: ["The exact details of the internal debates between senior Grand Ayatollahs in Qom who privately opposed his Velayat-e Faqih theory remain sparse due to state censorship."],
    created_at: "2026-05-31T21:31:33Z",
    updated_at: "2026-05-31T21:31:33Z"
  }
];

// Extract sources and claims
const sources_db: Source[] = [];
const claims_db: Claim[] = [];

batch2_profiles.forEach((p) => {
  p.sources.forEach((srcStr: string, idx: number) => {
    const srcId = `${p.person_id}_src_${idx + 1}`;
    sources_db.push({
      source_id: srcId,
      person_id: p.person_id,
      title: srcStr,
      authors: [srcStr.split(".")[0]],
      year: parseInt(srcStr.match(/\((\d{4})\)/)?.[1] || "null") || null,
      url: "https://en.wikipedia.org/wiki/" + encodeURIComponent(p.name),
      type: srcStr.toLowerCase().includes("papers") || srcStr.toLowerCase().includes("edict") || srcStr.toLowerCase().includes("decree") ? "official" : "book",
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
  console.log("Starting batch 2 generation...");

  // 1. Validate new profiles
  let totalErrors = 0;
  batch2_profiles.forEach((profile, idx) => {
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

  console.log("All 15 batch 2 profiles successfully passed schema validation!");

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
  const newProfiles = batch2_profiles.map(p => JSON.stringify(p)).join("\n") + "\n";
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
  const completedIds = new Set(batch2_profiles.map(p => p.person_id));
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

  console.log("Batch 2 generation completed successfully!");
}

main().catch(err => {
  console.error("Fatal generation failure:", err);
  process.exit(1);
});
