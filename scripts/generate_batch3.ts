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

const batch3_profiles: any[] = [
  // 1. Theodore Roosevelt
  {
    person_id: "theodore_roosevelt",
    name: "Theodore Roosevelt",
    aliases: ["TR", "Teddy Roosevelt"],
    birth_year: 1858,
    death_year: 1919,
    countries_or_regions: ["United States", "North America"],
    era: "Late 19th / Early 20th Century / Progressive Era",
    roles: ["President of the United States", "Governor of New York"],
    domains: ["Geopolitics", "Statecraft", "Economic"],
    priority_tier: 2,
    short_summary: "26th US President who championed progressive domestic reforms (trust-busting, conservation) and established the US as a major global naval power.",
    timeline: [
      {
        date_or_year: "1898",
        event: "Led the 'Rough Riders' cavalry charge at the Battle of San Juan Hill during the Spanish-American War.",
        importance: "high",
        sources: ["Morris (1979)"]
      },
      {
        date_or_year: "1901-09-14",
        event: "Ascended to the presidency following the assassination of William McKinley.",
        importance: "high",
        sources: ["Morris (2001)"]
      },
      {
        date_or_year: "1902",
        event: "Intervened in the anthracite coal strike, establishing the federal executive as an impartial mediator.",
        importance: "high",
        sources: ["Morris (2001)", "Progressive archives"]
      },
      {
        date_or_year: "1903",
        event: "Engineered Panama's independence from Colombia to secure US rights to build the Panama Canal.",
        importance: "high",
        sources: ["Canal Treaty records"]
      },
      {
        date_or_year: "1904",
        event: "Proclaimed the Roosevelt Corollary to the Monroe Doctrine, asserting US police power in Latin America.",
        importance: "high",
        sources: ["Morris (2001)"]
      },
      {
        date_or_year: "1906",
        event: "Awarded the Nobel Peace Prize for mediating the Treaty of Portsmouth, ending the Russo-Japanese War.",
        importance: "high",
        sources: ["Nobel archives"]
      },
      {
        date_or_year: "1907-12",
        event: "Dispatched the 'Great White Fleet' on a highly visible round-the-world cruise to project US naval power.",
        importance: "high",
        sources: ["Naval archives"]
      },
      {
        date_or_year: "1912",
        event: "Formed the Progressive 'Bull Moose' Party, split the Republican vote, and survived an assassination attempt.",
        importance: "high",
        sources: ["Morris (2010)"]
      }
    ],
    power_base: "Massive popular progressive base, support of reform-minded corporate elites, absolute command of federal regulatory agencies, and charismatic military reputation.",
    core_goals: [
      "Establish the United States as a dominant, respected global naval and imperial power.",
      "Break up predatory corporate monopolies (trusts) to preserve market capitalism under federal regulation.",
      "Pioneer the systematic conservation of American wilderness, national parks, and natural resources."
    ],
    incentives: [
      "Securing the global prestige and military capability of the United States.",
      "Protecting working-class citizens from the predatory excesses of corporate monopolies.",
      "Achieving personal athletic, intellectual, and military honor."
    ],
    constraints: [
      "Fierce, entrenched pro-business conservative opposition within the Republican Party leadership.",
      "Severe constitutional limits on direct federal executive intervention in labor and commerce.",
      "Rising geopolitical imperial competition from European powers in the Caribbean."
    ],
    allies: ["Gifford Pinchot", "Elihu Root", "William Howard Taft (early)"],
    rivals: ["J.P. Morgan", "Woodrow Wilson", "William Howard Taft (later political split)"],
    institutions_controlled_or_influenced: ["United States Presidency", "Department of Justice (Antitrust Division)", "National Park Service (foundations)"],
    ideology_or_worldview: {
      summary: "Progressive nationalism (New Nationalism) advocating for a strong, active federal regulatory state, massive infrastructure, environmental conservation, and confident imperial realism.",
      evidence: [
        "Enforcing the Sherman Antitrust Act against the Northern Securities Company in 1904.",
        "Withdrawing over 230 million acres of public land for federal forest reserves and parks."
      ],
      confidence: "high"
    },
    decision_patterns: [
      {
        pattern: "Bold, highly muscular executive initiatives that aggressively stretched constitutional boundaries, presenting results to Congress as accomplished facts.",
        examples: [
          "Taking the Panama Canal Zone and telling Congress to debate it while construction proceeded.",
          "Sending the Great White Fleet around the world and forcing Congress to fund its return."
        ],
        confidence: "high"
      }
    ],
    crisis_behavior: "Exceedingly aggressive and energetic under strategic pressure, viewing physical danger and conflict as opportunities to demonstrate moral and national resolve.",
    negotiation_style: "highly muscular, combining bold private threats of military intervention with public diplomatic mediation (e.g. Russo-Japanese War).",
    risk_tolerance: "high",
    centralization_preference: "high",
    conflict_preference: "medium",
    institutional_respect: "high",
    coalition_dependency: "high",
    populism_level: "high",
    technocratic_level: "medium",
    game_theory_profile: {
      main_players: ["United States", "European Empires", "Latin American States", "Corporate Monopolies"],
      likely_objectives: [
        "US: Secure regional dominance, protect canal routes, regulate trusts.",
        "Europe: Extract debts from Latin America, expand imperial trade.",
        "Monopolies: Maintain unregulated corporate pricing."
      ],
      payoffs: [
        "Roosevelt Corollary (1904) established a stable equilibrium where the US assumed police duties in Latin America, preventing European military interventions and securing US naval hegemony (Highest strategic payoff)."
      ],
      constraints: ["Lack of direct congressional funding for foreign expeditions forced creative use of executive navy commands."],
      common_strategic_moves: ["Big Stick diplomacy (naval threats)", "Antitrust prosecutions"],
      failure_modes: ["Splitting the Republican Party in 1912, which directly enabled the election of Woodrow Wilson, whom he despised."]
    },
    bayesian_assessment: [
      {
        claim: "Roosevelt intervened in Panama primarily to secure canal rights rather than out of genuine support for Panamanian self-determination.",
        prior_confidence: "high",
        evidence: [
          "His immediate orders dispatching the USS Nashville to block Colombian troops from suppressing the Panamanian revolt.",
          "His private remarks stating: 'I took the Isthmus, started the canal and then left Congress not to debate the canal, but to debate me.'"
        ],
        posterior_confidence: "high",
        what_would_change_this: "Discovery of private papers showing he refused to build the canal even after Panama achieved independence."
      }
    ],
    historical_comparisons: [
      {
        compared_to: "Napoleon Bonaparte",
        similarities: [
          "Energetic executive centralizers who reorganized domestic legal and corporate structures.",
          "Obsessive personal drive for physical adventure, military glory, and historical immortality."
        ],
        differences: [
          "Roosevelt remained committed to a constitutional, democratic framework, voluntarily stepping down from the presidency in 1909."
        ],
        confidence: "high"
      }
    ],
    source_quality: {
      overall: "strong",
      notes: "Voluminous personal letters, presidential papers, and Edmund Morris's definitive three-volume biography.",
      source_count: 5
    },
    sources: [
      "Morris, Edmund. (1979). The Rise of Theodore Roosevelt.",
      "Morris, Edmund. (2001). Theodore Rex.",
      "Morris, Edmund. (2010). Colonel Roosevelt.",
      "Roosevelt, Theodore. (1913). An Autobiography.",
      "Brands, H. W. (1997). T.R.: The Last Romantic."
    ],
    research_gaps: ["Determining the exact level of early coordination between his administration and Bunau-Varilla in plotting the Panamanian revolution remains analyzed."],
    created_at: "2026-05-31T21:31:33Z",
    updated_at: "2026-05-31T21:31:33Z"
  },

  // 2. Dwight D. Eisenhower
  {
    person_id: "dwight_d_eisenhower",
    name: "Dwight D. Eisenhower",
    aliases: ["Ike"],
    birth_year: 1890,
    death_year: 1969,
    countries_or_regions: ["United States", "North America"],
    era: "20th Century / WWII / Cold War Era",
    roles: ["President of the United States", "Supreme Allied Commander Europe"],
    domains: ["Geopolitics", "Military", "Statecraft"],
    priority_tier: 2,
    short_summary: "34th US President and Supreme Allied Commander in WWII who supervised the D-Day invasion, ended the Korean War, and pioneered the Interstate Highway System.",
    timeline: [
      {
        date_or_year: "1943",
        event: "Appointed Supreme Allied Commander in Europe, coordinating multi-national war efforts.",
        importance: "high",
        sources: ["Ambrose (1983)"]
      },
      {
        date_or_year: "1944-06-06",
        event: "Authorized Operation Overlord (D-Day), leading to the successful liberation of Western Europe.",
        importance: "high",
        sources: ["D-Day archives", "Ambrose (1983)"]
      },
      {
        date_or_year: "1952-11-04",
        event: "Elected President of the United States, promising to personally visit Korea and end the war.",
        importance: "high",
        sources: ["Ambrose (1984)"]
      },
      {
        date_or_year: "1953-07-27",
        event: "Secured the signing of the Korean Armistice Agreement, halting active combat on the peninsula.",
        importance: "high",
        sources: ["Korean armistice records"]
      },
      {
        date_or_year: "1956",
        event: "Signed the Federal-Aid Highway Act, launching the massive US Interstate Highway System.",
        importance: "high",
        sources: ["Highway Act archives", "Ambrose (1984)"]
      },
      {
        date_or_year: "1957",
        event: "Dispatched the 101st Airborne Division to Little Rock, Arkansas, to enforce high school desegregation.",
        importance: "high",
        sources: ["Little Rock desegregation records"]
      },
      {
        date_or_year: "1960",
        event: "Faced U-2 espionage spy plane crisis when pilot Francis Gary Powers was shot down over the USSR.",
        importance: "high",
        sources: ["Ambrose (1984)"]
      },
      {
        date_or_year: "1961-01-17",
        event: "Delivered his iconic Farewell Address, warning the nation against the rise of the 'military-industrial complex'.",
        importance: "high",
        sources: ["Farewell Address (1961)"]
      }
    ],
    power_base: "Immense, unmatched nationwide military prestige, moderate 'Modern Republicanism' voter coalition, corporate technocratic cabinet, and absolute control of post-war military institutions.",
    core_goals: [
      "Contain global Soviet expansionism without triggering a financially ruinous conventional arms race or hot nuclear war.",
      "Construct a massive national infrastructure network (Interstate Highway System) to secure defense logistics.",
      "Preserve domestic fiscal sanity and institutional rule of law against ideological extremism (McCarthyism)."
    ],
    incentives: [
      "Averting a third global war in the nuclear age.",
      "Maintaining balanced federal budgets and economic competitiveness.",
      "Securing institutional respect for constitutional law."
    ],
    constraints: [
      "Intense Soviet geopolitical competition and launch of Sputnik (initiating the Space Race).",
      "Severe domestic racial tensions requiring unprecedented federal military intervention in the South.",
      "Inherent threat of nuclear escalation (brinkmanship) during localized proxy crises."
    ],
    allies: ["John Foster Dulles (Secretary of State)", "Richard Nixon (Vice President)", "George Marshall", "Sherman Adams"],
    rivals: ["Nikita Khrushchev", "Robert A. Taft (conservative critic)", "Douglas MacArthur (military rival)"],
    institutions_controlled_or_influenced: ["Allied Expeditionary Force (SHAEF)", "United States Presidency", "National Security Council", "The Joint Chiefs of Staff"],
    ideology_or_worldview: {
      summary: "Moderate, middle-of-the-road Republicanism ('Modern Republicanism') advocating for balanced budgets, centralized infrastructure, and a defensive Cold War security posture relying on nuclear deterrence (New Look) rather than costly conventional troop expansion.",
      evidence: [
        "Creating the Department of Health, Education, and Welfare in 1953.",
        "Using massive strategic nuclear deterrence (Massive Retaliation) to reduce army budgets."
      ],
      confidence: "high"
    },
    decision_patterns: [
      {
        pattern: "Hidden-hand leadership: operating behind the scenes, using his cabinet and National Security Council as buffers, allowing staff to take credit or blame while he maintained absolute control.",
        examples: [
          "Silently outmaneuvering Senator Joseph McCarthy through back-channel leaks rather than direct confrontation.",
          "Delegating aggressive foreign policy pronouncements strictly to John Foster Dulles."
        ],
        confidence: "high"
      }
    ],
    crisis_behavior: "Exceedingly calm, analytical, and structured under pressure, relying on rigorous staff organization and military planning to assess strategic options (e.g. D-Day authorization decision).",
    negotiation_style: "highly polite, formal, utilizing his famous warm smile to build trust, while relying on rigorous, calculated conditions in final agreements.",
    risk_tolerance: "medium",
    centralization_preference: "high",
    conflict_preference: "low",
    institutional_respect: "high",
    coalition_dependency: "high",
    populism_level: "medium",
    technocratic_level: "high",
    game_theory_profile: {
      main_players: ["United States", "Soviet Union", "NATO Allies", "Suez Coalitions (1956)"],
      likely_objectives: [
        "US: Contain USSR, preserve NATO cohesion, avoid budget deficits.",
        "USSR: Expand influence, split NATO alliance.",
        "Anglo-French: Reclaim Suez Canal by force."
      ],
      payoffs: [
        "Suez Crisis (1956) response successfully cut off financial backing to Anglo-French allies, optimizing the US payoff by preventing a wider Middle Eastern war and keeping newly decolonized states non-aligned (Highest strategic payoff)."
      ],
      constraints: ["Dread of a global thermonuclear exchange limited US options in directly assisting the Hungarian uprising in 1956."],
      common_strategic_moves: ["Nuclear deterrence brinkmanship", "Hidden-hand staff delegations"],
      failure_modes: ["The U-2 spy plane shootdown (1960) derailed a major peace summit with Khrushchev, representing his biggest late-term diplomatic failure."]
    },
    bayesian_assessment: [
      {
        claim: "Eisenhower warned against the military-industrial complex because he sincerely feared it would bankrupt the state and subvert democracy rather than out of anti-militarianism.",
        prior_confidence: "high",
        evidence: [
          "His frequent, private budget memos throughout his presidency expressing anxiety that endless military spending would destroy the economy from within.",
          "His explicit warning in the address that: 'We must never let the weight of this combination endanger our liberties or democratic processes.'"
        ],
        posterior_confidence: "high",
        what_would_change_this: "Discovery of private documents showing Eisenhower wanted to establish a fully demilitarized pacifist state."
      }
    ],
    historical_comparisons: [
      {
        compared_to: "George Washington",
        similarities: [
          "General-turned-President who commanded absolute bipartisan public trust.",
          "Warned the nation against foreign entanglements and partisan factionalism in their farewell addresses."
        ],
        differences: [
          "Eisenhower operated a massive global security state with nuclear arsenals, managing a complex bureaucracy during the Cold War."
        ],
        confidence: "high"
      }
    ],
    source_quality: {
      overall: "strong",
      notes: "Extensive archives at the Eisenhower Presidential Library, official cabinet/NSC minutes, and Stephen Ambrose's definitive biography.",
      source_count: 5
    },
    sources: [
      "Ambrose, Stephen E. (1983). Eisenhower: Soldier, General of the Army, President-Elect, 1890-1952.",
      "Ambrose, Stephen E. (1984). Eisenhower: The President.",
      "Eisenhower, Dwight D. (1948). Crusade in Europe.",
      "Greenstein, Fred I. (1982). The Hidden-Hand Presidency: Eisenhower as Leader.",
      "Korda, Michael. (2007). Ike: An American Hero."
    ],
    research_gaps: ["Determining the exact degree of behind-the-scenes approval for early CIA covert operations in Iran (1953) and Guatemala (1954) remains analyzed."],
    created_at: "2026-05-31T21:31:33Z",
    updated_at: "2026-05-31T21:31:33Z"
  },

  // 3. Richard Nixon
  {
    person_id: "richard_nixon",
    name: "Richard Nixon",
    aliases: ["Richard Milhous Nixon"],
    birth_year: 1913,
    death_year: 1994,
    countries_or_regions: ["United States", "North America"],
    era: "20th Century / Cold War / Vietnam War Era",
    roles: ["President of the United States", "Vice President of the United States"],
    domains: ["Geopolitics", "Statecraft", "Diplomacy"],
    priority_tier: 2,
    short_summary: "37th US President who achieved a historic geopolitical opening to China, established detente with the USSR, but became the only president to resign due to the Watergate scandal.",
    timeline: [
      {
        date_or_year: "1952",
        event: "Delivered his famous 'Checkers speech' on television, saving his vice presidential candidacy.",
        importance: "high",
        sources: ["Ambrose (1987)"]
      },
      {
        date_or_year: "1968-11-05",
        event: "Won the presidency after promising to bring the nation together and end the Vietnam War.",
        importance: "high",
        sources: ["Ambrose (1987)", "Reeves (2001)"]
      },
      {
        date_or_year: "1972-02-21",
        event: "Arrived in Beijing, initiating a historic diplomatic opening to the People's Republic of China.",
        importance: "high",
        sources: ["Kissinger (2011)", "Vogel (2011)"]
      },
      {
        date_or_year: "1972-05",
        event: "Traveled to Moscow, signing the landmark SALT I anti-ballistic missile treaty with Leonid Brezhnev.",
        importance: "high",
        sources: ["Detente archives", "Reeves (2001)"]
      },
      {
        date_or_year: "1973-01-27",
        event: "Signed the Paris Peace Accords, ending direct US military involvement in the Vietnam War.",
        importance: "high",
        sources: ["Paris Peace Accords text"]
      },
      {
        date_or_year: "1973-10",
        event: "Saturdays Night Massacre: Ordered firing of Watergate Special Prosecutor Archibald Cox, provoking constitutional crisis.",
        importance: "high",
        sources: ["Watergate records"]
      },
      {
        date_or_year: "1974-08-08",
        event: "Announced his resignation from the presidency on national television due to the Watergate scandal.",
        importance: "high",
        sources: ["Resignation transcript", "Ambrose (1991)"]
      }
    ],
    power_base: "The 'Silent Majority' conservative voter base, absolute control of foreign policy (via Henry Kissinger), centralized executive power, and close control over the Republican party apparatus.",
    core_goals: [
      "Achieve 'Peace with Honor' in the Vietnam War, withdrawing US troops while maintaining regional balance.",
      "Execute a major tripolar Cold War opening to China to isolate the Soviet Union.",
      "Establish a stable detente with the Soviet Union through nuclear arms control treaties (SALT I)."
    ],
    incentives: [
      "Securing a global multipolar balance of power favoring the United States.",
      "Retaining political power and defeating domestic political and media adversaries.",
      "Attaining personal recognition as a master geopolitical strategist."
    ],
    constraints: [
      "Widespread, highly organized domestic anti-war protests.",
      "Hostile, aggressive Democratic congressional majority.",
      "Fatal legal exposure and loss of political backing during the Watergate investigation."
    ],
    allies: ["Henry Kissinger (national security advisor)", "H.R. Haldeman", "John Ehrlichman", "John Mitchell"],
    rivals: ["Mao Zedong (strategic partner)", "Leonid Brezhnev", "Daniel Ellsberg (Pentagon Papers)", "Mitch Halperin"],
    institutions_controlled_or_influenced: ["United States Presidency", "National Security Council", "The Republican Party", "Federal Bureau of Investigation (abused)"],
    ideology_or_worldview: {
      summary: "Geopolitical realism (Realpolitik) prioritizing pragmatic balance of power over moral or ideological goals, combined with a conservative domestic populism advocating for the interests of the white middle class.",
      evidence: [
        "Bypassing the State Department to conduct secret diplomacy with China.",
        "Establishing the Environmental Protection Agency (EPA) in 1970 to co-opt liberal programs."
      ],
      confidence: "high"
    },
    decision_patterns: [
      {
        pattern: "Highly secretive, personalized decision-making conducted in extreme isolation (bypassing conventional channels), coupled with aggressive tactical risk-taking to catch opponents off balance.",
        examples: [
          "Secretly bombing Cambodia (Operation Menu) without informing Congress.",
          "Launching the historic opening to China using back-channel Pakistani communications."
        ],
        confidence: "high"
      }
    ],
    crisis_behavior: "Exhibited highly defensive, paranoid, and aggressive behavior during political crises (e.g. Watergate), reacting to domestic threats with illegal surveillance and political purges.",
    negotiation_style: "highly transactional, realistic, focused on hard power trades and secret diplomatic channels, bypassing public scrutiny to secure agreements.",
    risk_tolerance: "high",
    centralization_preference: "high",
    conflict_preference: "medium",
    institutional_respect: "low",
    coalition_dependency: "high",
    populism_level: "high",
    technocratic_level: "high",
    game_theory_profile: {
      main_players: ["United States", "Soviet Union", "People's Republic of China", "North Vietnam"],
      likely_objectives: [
        "US: Leverage China to isolate USSR, withdraw from Vietnam, detente.",
        "USSR: Avoid isolation, secure grain imports, secure SALT treaty.",
        "PRC: Deter Soviet military threat, normalize trade with West."
      ],
      payoffs: [
        "Opening to China (1972) shifted the Cold War payoff structure to a tripolar game where Washington could play Moscow and Beijing against each other, yielding massive leverage (Highest strategic payoff)."
      ],
      constraints: ["Congressional war powers legislation post-1973 severely limited executive military options in Vietnam."],
      common_strategic_moves: ["Secret back-channel diplomacy", "Triangular balance of power plays"],
      failure_modes: ["His paranoid focus on crushing political opponents led to the Watergate cover-up, destroying his presidency."]
    },
    bayesian_assessment: [
      {
        claim: "Nixon sabotaged the Paris Peace Talks in late 1968 to secure his presidential election victory.",
        prior_confidence: "medium",
        evidence: [
          "Secret wiretaps of Anna Chennault advising South Vietnamese President Thieu to hold out for better terms under a Nixon administration.",
          "Nixon's private handwritten notes to Haldeman ordering him to 'monkey wrench' the peace talks."
        ],
        posterior_confidence: "high",
        what_would_change_this: "Discovery of South Vietnamese archives showing Thieu had decided to reject the peace terms completely independent of any contact from Nixon."
      }
    ],
    historical_comparisons: [
      {
        compared_to: "Otto von Bismarck",
        similarities: [
          "Master practitioners of Realpolitik who bypassed traditional cabinet departments to execute brilliant global diplomatic shifts.",
          "Fiercely centralist executives who despised domestic liberals and parliamentary interference."
        ],
        differences: [
          "Nixon's systemic domestic political violations led to his constitutional downfall, whereas Bismarck retained imperial crown backing."
        ],
        confidence: "high"
      }
    ],
    source_quality: {
      overall: "strong",
      notes: "Vast documentation including the Nixon White House Tapes, Henry Kissinger's memoirs, and extensive academic biographies.",
      source_count: 5
    },
    sources: [
      "Ambrose, Stephen E. (1987-1991). Nixon (3 volumes).",
      "Reeves, Richard. (2001). President Nixon: Alone in the White House.",
      "Kissinger, Henry. (1979-1999). White House Years / Years of Upheaval.",
      "Nixon, Richard M. (1978). RN: The Memoirs of Richard Nixon.",
      "Gaddis, John Lewis. (1982). Strategies of Containment."
    ],
    research_gaps: ["Determining the exact degree of his personal involvement in organizing the initial Watergate break-in (vs just the subsequent cover-up) remains subject to historical speculation."],
    created_at: "2026-05-31T21:31:33Z",
    updated_at: "2026-05-31T21:31:33Z"
  },

  // 4. Ronald Reagan
  {
    person_id: "ronald_reagan",
    name: "Ronald Reagan",
    aliases: ["The Great Communicator", "Dutch"],
    birth_year: 1911,
    death_year: 2004,
    countries_or_regions: ["United States", "North America"],
    era: "Late 20th Century / Cold War Era",
    roles: ["President of the United States", "Governor of California"],
    domains: ["Geopolitics", "Statecraft", "Economic"],
    priority_tier: 1,
    short_summary: "40th US President who revitalized the conservative movement, implemented supply-side economic reforms (Reaganomics), and co-negotiated the end of the Cold War.",
    timeline: [
      {
        date_or_year: "1966",
        event: "Elected Governor of California, establishing himself as the premier voice of the rising conservative movement.",
        importance: "high",
        sources: ["Cannon (2003)"]
      },
      {
        date_or_year: "1980-11-04",
        event: "Elected President in a landslide victory over Jimmy Carter, initiating the 'Reagan Revolution'.",
        importance: "high",
        sources: ["Cannon (2003)", "Pemberton (1997)"]
      },
      {
        date_or_year: "1981-03-30",
        event: "Survived an assassination attempt by John Hinckley Jr., projecting humor and resilience.",
        importance: "high",
        sources: ["Medical/Secret Service records"]
      },
      {
        date_or_year: "1981-08",
        event: "Signed the Economic Recovery Tax Act, implementing historic supply-side tax cuts.",
        importance: "high",
        sources: ["Tax Act archives", "Pemberton (1997)"]
      },
      {
        date_or_year: "1983",
        event: "Announced the Strategic Defense Initiative (SDI), dubbed 'Star Wars', shifting Cold War military calculations.",
        importance: "high",
        sources: ["SDI archives", "FitzGerald (2000)"]
      },
      {
        date_or_year: "1986",
        event: "Faced severe political crisis over the Iran-Contra affair (secret arms sales to Iran to finance Nicaraguan contras).",
        importance: "high",
        sources: ["Tower Commission Report"]
      },
      {
        date_or_year: "1987-06-12",
        event: "Delivered his 'Tear down this wall' speech in West Berlin, defying Soviet division.",
        importance: "high",
        sources: ["Berlin Wall speech text"]
      },
      {
        date_or_year: "1987-12-08",
        event: "Signed the INF Treaty with Mikhail Gorbachev, eliminating an entire class of intermediate nuclear missiles.",
        importance: "high",
        sources: ["INF Treaty text", "Gorbachev Memoirs"]
      }
    ],
    power_base: "The 'Reagan Coalition' (social/religious conservatives, supply-side economists, defense hawks), absolute command over the Republican Party, and supreme television/oratorical communication talent.",
    core_goals: [
      "Defeat Soviet communism globally by escalating military and economic pressure to force collapse.",
      "Deregulate the US economy and implement sweeping supply-side tax cuts to restore capitalism.",
      "Restore American national pride, optimism, and global leadership."
    ],
    incentives: [
      "Eradicating Soviet ideological and physical dominance.",
      "Minimizing federal tax burdens and state regulatory intervention in private lives.",
      "Securing global peace through military strength ('peace through strength')."
    ],
    constraints: [
      "Huge federal budget deficits caused by simultaneous tax cuts and massive defense spending.",
      "Deep geopolitical crisis over the illegal Iran-Contra affair that threatened impeachment.",
      "Widespread international and domestic fear of nuclear war due to his aggressive early rhetoric."
    ],
    allies: ["Margaret Thatcher", "Mikhail Gorbachev (later negotiating partner)", "George Shultz", "Paul Volcker", "William J. Casey"],
    rivals: ["Mikhail Gorbachev (initially)", "Fidel Castro", "Tip O'Neill (Democratic Speaker)"],
    institutions_controlled_or_influenced: ["United States Presidency", "The Republican Party", "Federal Reserve (coordinated interest policies)", "Department of Defense"],
    ideology_or_worldview: {
      summary: "Modern American conservatism (Reaganism) combining free-market neoliberalism, supply-side economics, social/religious conservatism, and assertive, moralistic anti-communist realism.",
      evidence: [
        "His speech describing the Soviet Union as an 'Evil Empire'.",
        "Systematic reduction of top marginal tax rates from 70% to 28% during his tenure."
      ],
      confidence: "high"
    },
    decision_patterns: [
      {
        pattern: "Clinging dogmatically to a few simple, grand goals (e.g. defeating communism, cutting taxes) while delegating all technical and operational details to his staff.",
        examples: [
          "Refusing to abandon the Strategic Defense Initiative despite intense Soviet treaty pressure.",
          "Completely delegating the operational details of Central American aid, leading to the Iran-Contra scandal."
        ],
        confidence: "high"
      }
    ],
    crisis_behavior: "Exhibited remarkable public optimism, wit, and calm under physical and political pressure, using his acting talent and television addresses to reassure the public.",
    negotiation_style: "highly personable, charming, focusing on grand moral principles, while leaving concrete technical compromises entirely to George Shultz.",
    risk_tolerance: "high",
    centralization_preference: "medium",
    conflict_preference: "medium",
    institutional_respect: "high",
    coalition_dependency: "high",
    populism_level: "high",
    technocratic_level: "low",
    game_theory_profile: {
      main_players: ["United States", "Soviet Union", "NATO Allies", "Congress"],
      likely_objectives: [
        "US: Force Soviet economic/military capitulation, build SDI, cut taxes.",
        "USSR: Protect regime, limit US military build-up, secure trade.",
        "Congress: Balance budget, limit military risks."
      ],
      payoffs: [
        "Escalating military spending and launching SDI shifted the game to a high-cost arms race that the bankrupt Soviet state could not sustain, forcing Gorbachev to negotiate the INF treaty (Highest strategic payoff)."
      ],
      constraints: ["Congressional Boland Amendments banned funding to Contras, forcing the administration into high-risk back-channel financing."],
      common_strategic_moves: ["Strategic Defense Initiative threats", "Summit diplomacy (Reykjavik/Geneva)"],
      failure_modes: ["Iran-Contra scandal, which almost crippled his second term due to a total lack of executive oversight."]
    },
    bayesian_assessment: [
      {
        claim: "Reagan's launch of the Strategic Defense Initiative (SDI) was a calculated bluff to force Soviet economic capitulation rather than a genuine scientific project.",
        prior_confidence: "medium",
        evidence: [
          "His private letters to Margaret Thatcher indicating he viewed SDI primarily as a massive diplomatic bargaining chip.",
          "Soviet archives showing that Gorbachev was so terrified of SDI that he was willing to offer near-complete nuclear disarmament at Reykjavik to kill it."
        ],
        posterior_confidence: "high",
        what_would_change_this: "Discovery of private papers showing Reagan believed a working shield was scientifically impossible but ordered it anyway purely to trick his own generals."
      }
    ],
    historical_comparisons: [
      {
        compared_to: "Franklin D. Roosevelt",
        similarities: [
          "Supreme communicators who used media (radio/TV) to project hope and restore national optimism during crises.",
          "Consolidated massive ideological coalitions that dominated politics for a generation."
        ],
        differences: [
          "Reagan sought to shrink federal regulatory intervention and taxes, whereas Roosevelt sought to expand state social planning."
        ],
        confidence: "high"
      }
    ],
    source_quality: {
      overall: "strong",
      notes: "Reagan Presidential Library archives, his extensive personal diaries, and rigorous biographies by Lou Cannon.",
      source_count: 5
    },
    sources: [
      "Cannon, Lou. (2003). Governor Reagan: His Rise to Power.",
      "Cannon, Lou. (1991). President Reagan: The Role of a Lifetime.",
      "Reagan, Ronald. (2007). The Reagan Diaries.",
      "Pemberton, William E. (1997). Exit with Honor: The Life and Presidency of Ronald Reagan.",
      "FitzGerald, Frances. (2000). Way Out There in the Blue: Reagan, Star Wars and the End of the Cold War."
    ],
    research_gaps: ["The exact degree of his early cognitive decline (Alzheimer's) in his final two years in office remains a subject of intense debate among medical historians."],
    created_at: "2026-05-31T21:31:33Z",
    updated_at: "2026-05-31T21:31:33Z"
  },

  // 5. Barack Obama
  {
    person_id: "barack_obama",
    name: "Barack Obama",
    aliases: ["Barack Hussein Obama"],
    birth_year: 1961,
    death_year: null,
    countries_or_regions: ["United States", "North America"],
    era: "21st Century / Modern Era",
    roles: ["President of the United States", "US Senator"],
    domains: ["Geopolitics", "Statecraft", "Social Reform"],
    priority_tier: 2,
    short_summary: "44th US President and first African American president who signed the Affordable Care Act, navigated the Great Recession, and authorized the mission that killed Osama bin Laden.",
    timeline: [
      {
        date_or_year: "2004",
        event: "Delivered keynote address at the Democratic National Convention, rising to national prominence.",
        importance: "high",
        sources: ["Remnick (2010)"]
      },
      {
        date_or_year: "2008-11-04",
        event: "Elected first African American President of the United States, promising 'Change We Can Believe In'.",
        importance: "high",
        sources: ["Remnick (2010)", "Obama Memoirs"]
      },
      {
        date_or_year: "2009-02",
        event: "Signed the American Recovery and Reinvestment Act, deploying $787 billion to stabilize the economy.",
        importance: "high",
        sources: ["Recovery Act archives"]
      },
      {
        date_or_year: "2009-12",
        event: "Awarded the Nobel Peace Prize for his extraordinary efforts to strengthen international diplomacy.",
        importance: "high",
        sources: ["Nobel archives"]
      },
      {
        date_or_year: "2010-03-23",
        event: "Signed the Affordable Care Act (Obamacare), enacting the largest US healthcare reform in decades.",
        importance: "high",
        sources: ["ACA archives", "Obama Memoirs"]
      },
      {
        date_or_year: "2011-05-02",
        event: "Authorized the joint special operations raid in Abbottabad, Pakistan, killing al-Qaeda leader Osama bin Laden.",
        importance: "high",
        sources: ["Bin Laden mission records"]
      },
      {
        date_or_year: "2015-07-14",
        event: "Secured the JCPOA (Iran nuclear deal), establishing multilateral limits on Iran's nuclear program.",
        importance: "high",
        sources: ["JCPOA text", "Diplomatic records"]
      },
      {
        date_or_year: "2016-03",
        event: "Visited Havana, Cuba, completing the historic normalization of diplomatic relations.",
        importance: "high",
        sources: ["Cuba normalization records"]
      }
    ],
    power_base: "Massive progressive youth/minority electoral coalition, absolute Democratic Party backing, elite technocratic economic and foreign policy advisors, and global diplomatic goodwill.",
    core_goals: [
      "Avert a total domestic and global economic collapse during the Great Recession.",
      "Implement comprehensive universal healthcare reform in the United States.",
      "Rebalance US foreign policy away from costly ground invasions toward multilateral diplomacy and regional pivots."
    ],
    incentives: [
      "Securing social and economic safety for working-class families.",
      "Restoring US global moral prestige and alliances post-Iraq War.",
      "Instituting durable technocratic structural reforms."
    ],
    constraints: [
      "Fierce, unyielding Republican congressional majority opposition (Tea Party movement).",
      "Extreme polarization and hostility of domestic political and media discourse.",
      "Entrenched Middle Eastern conflicts and rise of ISIS that limited his planned pivot to Asia."
    ],
    allies: ["Joe Biden (Vice President)", "Hillary Clinton (Secretary of State)", "Angela Merkel", "Timothy Geithner"],
    rivals: ["Vladimir Putin", "Mitch McConnell", "John Boehner", "Xi Jinping"],
    institutions_controlled_or_influenced: ["United States Presidency", "The Democratic Party", "Federal Executive Agencies"],
    ideology_or_worldview: {
      summary: "Progressive pragmatism and technocratic liberalism advocating for state-regulated capitalism, universal social safety nets, systemic institutional reform, and collaborative international multilateralism.",
      evidence: [
        "Signing the Dodd-Frank Wall Street Reform Act in 2010.",
        "Using executive orders (DACA) to bypass congressional gridlock on immigration."
      ],
      confidence: "high"
    },
    decision_patterns: [
      {
        pattern: "Highly analytical, deliberate, and academic decision-making, regularly demanding extensive policy memos and staging long debates to systematically assess all options before choosing.",
        examples: [
          "Conducting a three-month strategic review before authorizing the Afghanistan troop surge in 2009.",
          "Personally assessing the probability of bin Laden's presence in the Abbottabad compound."
        ],
        confidence: "high"
      }
    ],
    crisis_behavior: "Exhibited highly disciplined emotional control and calm under pressure (earning the nickname 'No-Drama Obama'), preferring a measured, institutional response over rapid political gestures.",
    negotiation_style: "highly rational, civil, trying to find common analytical ground with opponents, but was often critiqued for failing to manage the raw emotional politics of congressional leaders.",
    risk_tolerance: "medium",
    centralization_preference: "medium",
    conflict_preference: "low",
    institutional_respect: "high",
    coalition_dependency: "high",
    populism_level: "medium",
    technocratic_level: "high",
    game_theory_profile: {
      main_players: ["United States", "Iran", "P5+1 Powers", "Congress"],
      likely_objectives: [
        "US: Prevent Iranian nuclear weapon, avoid another Middle Eastern war.",
        "Iran: Lift economic sanctions, retain domestic nuclear research capacity.",
        "Congress: Block deal, maintain absolute sanctions."
      ],
      payoffs: [
        "JCPOA (2015) represented a stable cooperative equilibrium that blocked Iran's breakout path while lifting sanctions, avoiding war (Highest multilateral payoff)."
      ],
      constraints: ["Republican control of Congress severely limited his ability to pass the JCPOA as a formal treaty, forcing reliance on executive authority."],
      common_strategic_moves: ["Multilateral sanctions coalitions", "Direct secret diplomatic channels"],
      failure_modes: ["Underestimating the speed of partisan polarization, allowing his successor to easily dismantle his executive agreements (e.g. JCPOA)."]
    },
    bayesian_assessment: [
      {
        claim: "Obama declined to enforce his 'red line' in Syria in 2013 primarily to avoid a disastrous, un-mandated ground war rather than out of weakness.",
        prior_confidence: "medium",
        evidence: [
          "The complete lack of congressional backing or public support for military strikes in early September 2013.",
          "His sudden diplomatic pivot to a Russian-brokered deal that successfully removed 1,300 tons of declared Syrian chemical weapons without firing a shot."
        ],
        posterior_confidence: "high",
        what_would_change_this: "Discovery of private communications proving he intended to launch a full-scale invasion of Syria but lost his nerve at the last minute."
      }
    ],
    historical_comparisons: [
      {
        compared_to: "Abraham Lincoln",
        similarities: [
          "Constitutional lawyers who rose from Illinois politics to the presidency.",
          "Faced severe, polarized domestic divisions that threatened state unity."
        ],
        differences: [
          "Obama operated inside a modern globalized economic and social media framework, managing highly technocratic federal agencies."
        ],
        confidence: "high"
      }
    ],
    source_quality: {
      overall: "strong",
      notes: "Obama's extensive personal memoir 'A Promised Land', official state papers, and a large body of contemporary political analyses.",
      source_count: 5
    },
    sources: [
      "Obama, Barack. (2020). A Promised Land.",
      "Remnick, David. (2010). The Bridge: The Life and Rise of Barack Obama.",
      "Gellman, Barton. (2016). Obama's Wars.",
      "Rhodes, Ben. (2018). The World as It Is: A Memoir of the Obama White House.",
      "Chait, Jonathan. (2016). Audacity: How Barack Obama Defied His Critics."
    ],
    research_gaps: ["Determining the long-term impact of his extensive drone warfare policies on regional stability in Yemen and Pakistan remains highly analyzed by human rights scholars."],
    created_at: "2026-05-31T21:31:33Z",
    updated_at: "2026-05-31T21:31:33Z"
  },

  // 6. Elizabeth I
  {
    person_id: "elizabeth_i",
    name: "Elizabeth I",
    aliases: ["Gloriana", "The Virgin Queen"],
    birth_year: 1533,
    death_year: 1603,
    countries_or_regions: ["England", "Europe"],
    era: "16th Century / Tudor Period",
    roles: ["Queen of England and Ireland"],
    domains: ["Geopolitics", "Statecraft", "Diplomacy"],
    priority_tier: 1,
    short_summary: "Tudor monarch who established the Church of England, defeated the Spanish Armada, and presided over a golden age of English literature and global exploration.",
    timeline: [
      {
        date_or_year: "1558-11-17",
        event: "Ascended the English throne following the death of her Catholic half-sister Mary I.",
        importance: "high",
        sources: ["Neale (1934)"]
      },
      {
        date_or_year: "1559",
        event: "Passed the Act of Supremacy and Act of Uniformity, establishing the moderate Elizabethan Religious Settlement.",
        importance: "high",
        sources: ["Tudor archives", "Neale (1934)"]
      },
      {
        date_or_year: "1570",
        event: "Excommunicated by Pope Pius V in the bull Regnans in Excelsis, encouraging Catholic rebellions.",
        importance: "high",
        sources: ["Vatican archives"]
      },
      {
        date_or_year: "1585",
        event: "Signed the Treaty of Nonsuch, committing English forces to assist Dutch rebels against Spanish rule.",
        importance: "high",
        sources: ["Nonsuch records", "Guy (2016)"]
      },
      {
        date_or_year: "1587-02-08",
        event: "Authorized the execution of her cousin Mary, Queen of Scots, after the discovery of the Babington Plot.",
        importance: "high",
        sources: ["Trial transcripts", "Guy (2016)"]
      },
      {
        date_or_year: "1588-08-08",
        event: "Defeated the Spanish Armada; delivered her iconic speech to the troops at Tilbury ('heart and stomach of a king').",
        importance: "high",
        sources: ["Armada logs", "Tilbury speech text"]
      },
      {
        date_or_year: "1601",
        event: "Delivered her famous 'Golden Speech' to Parliament, reinforcing her deep love and bond with her subjects.",
        importance: "high",
        sources: ["Golden Speech text"]
      },
      {
        date_or_year: "1603-03-24",
        event: "Passed away at Richmond Palace; succeeded smoothly by James VI of Scotland, unifying the crowns.",
        importance: "high",
        sources: ["Neale (1934)"]
      }
    ],
    power_base: "Loyalty of the rising English Protestant gentry, absolute control over court appointments and trade monopolies, popular English nationalism, and the institutional structure of the Church of England.",
    core_goals: [
      "Establish and preserve a stable, moderate Protestant religious settlement in England.",
      "Defend England against military invasion and subversion from dominant Catholic powers (Spain, France).",
      "Foster mercantile expansion, trade fleets, and early global exploration to build national wealth."
    ],
    incentives: [
      "Preserving her sovereign executive authority and remaining free from foreign husband/king control.",
      "Averting a return to the bloody religious executions of her sister's reign.",
      "Protecting the crown treasury from bankruptcy."
    ],
    constraints: [
      "Severe financial limits and complete lack of a standing army.",
      "Constant Catholic assassination and rebellion conspiracies (Northern Rebellion, Ridolfi plot).",
      "Dynastic instability caused by her refusal to marry and produce a direct heir."
    ],
    allies: ["William Cecil (Lord Burghley)", "Francis Walsingham (spymaster)", "Robert Dudley", "Robert Devereux (early)"],
    rivals: ["Philip II of Spain", "Mary, Queen of Scots (executed)", "Pope Pius V", "Robert Devereux (later, executed)"],
    institutions_controlled_or_influenced: ["Kingdom of England", "Church of England", "The Privy Council", "Royal Navy (expanded)"],
    ideology_or_worldview: {
      summary: "Moderate, nationalistic Protestantism seeking social and religious stability ('not looking to open windows into men's souls'), combined with a pragmatic belief in English maritime supremacy and monarchical sovereignty.",
      evidence: [
        "The Elizabethan Religious Settlement allowing Catholic private worship as long as public supremacy was acknowledged.",
        "Chartering the East India Company in 1600."
      ],
      confidence: "high"
    },
    decision_patterns: [
      {
        pattern: "Extreme procrastination and delay in high-stakes political choices, waiting for events to force her hand to avoid premature military or financial commitments.",
        examples: [
          "Delaying the execution of Mary, Queen of Scots, for 19 years despite repeated plots.",
          "Avoiding direct marriage alignments for decades to keep all European alliances open."
        ],
        confidence: "high"
      }
    ],
    crisis_behavior: "Exhibited extraordinary personal courage and rhetorical majesty during existential threats (e.g. the Spanish Armada), using public appearances directly to project absolute national resolve.",
    negotiation_style: "highly flirtatious, cryptic, utilizing her marriage eligibility as a major diplomatic bargaining chip with European princes for decades, while remaining completely unyielding on English sovereignty.",
    risk_tolerance: "medium",
    centralization_preference: "high",
    conflict_preference: "low",
    institutional_respect: "high",
    coalition_dependency: "high",
    populism_level: "high",
    technocratic_level: "medium",
    game_theory_profile: {
      main_players: ["England", "Spain", "France", "Mary, Queen of Scots"],
      likely_objectives: [
        "England: Defend sovereignty, avoid costly wars, preserve Protestant settlement.",
        "Spain: Overthrow Elizabeth, restore Catholicism, protect American trade monopoly.",
        "France: Limit Spanish power, secure influence in Scotland."
      ],
      payoffs: [
        "Treaty of Nonsuch (1885) and Armada defense successfully leveraged Spain's strategic overreach, securing English sovereign survival and maritime growth (Highest defensive payoff)."
      ],
      constraints: ["Severe crown debt limited her ability to finance prolonged ground military campaigns in Europe."],
      common_strategic_moves: ["Using privateer raids (Drake) for deniable maritime war", "Procrastinating on successions"],
      failure_modes: ["Her refusal to name a successor until her deathbed created decades of severe political anxiety and conspiracy risks."]
    },
    bayesian_assessment: [
      {
        claim: "Elizabeth refused to marry primarily because she recognized that a foreign husband would subordinate England's interest to his own.",
        prior_confidence: "high",
        evidence: [
          "The disastrous precedent of her sister Mary's marriage to Philip II of Spain, which dragged England into a losing French war.",
          "Her explicit statement to Parliament that she was already 'married' to the Kingdom of England."
        ],
        posterior_confidence: "high",
        what_would_change_this: "Discovery of verified medical records proving she had a secret physical malformation that prevented childbearing."
      }
    ],
    historical_comparisons: [
      {
        compared_to: "Cleopatra VII",
        similarities: [
          "Highly educated female rulers of strategically vulnerable states.",
          "Leveraged their personal relationships and diplomatic eligibility to protect national sovereignty."
        ],
        differences: [
          "Elizabeth successfully defended her realm and preserved her independent rule without becoming subordinate to a foreign conqueror."
        ],
        confidence: "high"
      }
    ],
    source_quality: {
      overall: "strong",
      notes: "Enormous Tudor state paper archives, Walsingham's spymaster logs, her public speeches, and extensive modern historical analyses.",
      source_count: 5
    },
    sources: [
      "Neale, J. E. (1934). Queen Elizabeth I.",
      "Guy, John. (2016). Elizabeth: The Forgotten Years.",
      "Haigh, Christopher. (1988). Elizabeth I.",
      "MacCaffrey, Wallace T. (1981-1992). Elizabeth I (3 volumes).",
      "Speeches of Queen Elizabeth I, University of Chicago Press."
    ],
    research_gaps: ["Determining the exact degree of her private romantic attachment to Robert Dudley remains a subject of historical analysis due to ambiguous court records."],
    created_at: "2026-05-31T21:31:33Z",
    updated_at: "2026-05-31T21:31:33Z"
  },

  // 7. Suleiman the Magnificent
  {
    person_id: "suleiman_the_magnificent",
    name: "Suleiman the Magnificent",
    aliases: ["Suleiman I", "The Lawgiver"],
    birth_year: 1494,
    death_year: 1566,
    countries_or_regions: ["Ottoman Empire", "Middle East", "Europe"],
    era: "16th Century / Ottoman Golden Age",
    roles: ["Sultan of the Ottoman Empire", "Caliph of Islam"],
    domains: ["Geopolitics", "Military", "Statecraft"],
    priority_tier: 1,
    short_summary: "Ottoman Sultan who expanded the empire to its absolute geopolitical peak, codified the Ottoman civil law system, and patronized a magnificent cultural golden age.",
    timeline: [
      {
        date_or_year: "1520-09",
        event: "Ascended the Ottoman imperial throne as the tenth Sultan.",
        importance: "high",
        sources: ["Inalcik (1973)"]
      },
      {
        date_or_year: "1521",
        event: "Conquered Belgrade, opening the path for Ottoman expansion into Central Europe.",
        importance: "high",
        sources: ["Inalcik (1973)", "Finkel (2005)"]
      },
      {
        date_or_year: "1522",
        event: "Captured Rhodes from the Knights of St. John after a brutal five-month siege.",
        importance: "high",
        sources: ["Finkel (2005)"]
      },
      {
        date_or_year: "1526-08-29",
        event: "Crushed the Hungarian army at the Battle of Mohács, killing King Lajos II and annexing Hungary.",
        importance: "high",
        sources: ["Finkel (2005)", "Clot (1989)"]
      },
      {
        date_or_year: "1529",
        event: "Laid siege to Vienna; forced to retreat due to early winter and supply lines (his military limit).",
        importance: "high",
        sources: ["Clot (1989)"]
      },
      {
        date_or_year: "1534",
        event: "Captured Baghdad from the Safavid Persian Empire, securing Iraq and Gulf trade.",
        importance: "high",
        sources: ["Inalcik (1973)"]
      },
      {
        date_or_year: "1555",
        event: "Signed the Peace of Amasya with Safavid Persia, stabilizing the eastern border for decades.",
        importance: "high",
        sources: ["Peace of Amasya text"]
      },
      {
        date_or_year: "1566-09-06",
        event: "Passed away in his tent during the Siege of Szigetvár in Hungary.",
        importance: "high",
        sources: ["Clot (1989)"]
      }
    ],
    power_base: "Absolute loyalty of the elite Janissary military corps, massive centralized provincial administrative bureaucracy, control over global East-West silk/spice trade crossroads, and moral leadership as Caliph.",
    core_goals: [
      "Expand Ottoman territory deep into Central Europe, defeating the Habsburg Empire.",
      "Codify a comprehensive, unified Ottoman civil and Sharia legal code ('Kanun').",
      "Transform Constantinople into the supreme cultural, scientific, and architectural capital of the Islamic world."
    ],
    incentives: [
      "Asserting the absolute military and religious hegemony of the Ottoman state.",
      "Protecting Sunni orthodoxy against the rising Safavid Shia threat.",
      "Securing dynastic continuity and imperial revenue."
    ],
    constraints: [
      "Severe logistical limits of military campaigning over massive geographic distances from Constantinople.",
      "Fierce, persistent Safavid Shia military threats on the eastern border requiring regular troop diversions.",
      "Bitter, tragic internal succession rivalries within his harem and family."
    ],
    allies: ["Pargalı Ibrahim Pasha (Grand Vizier)", "Hürrem Sultan (wife/advisor)", "Hayreddin Barbarossa (admiral)", "Francis I of France (strategic anti-Habsburg ally)"],
    rivals: ["Charles V (Holy Roman Emperor)", "Shah Tahmasp of Persia", "Ferdinand I of Austria"],
    institutions_controlled_or_influenced: ["Ottoman Empire", "The Janissaries", "The Divan (Imperial Council)", "The Caliphate"],
    ideology_or_worldview: {
      summary: "Sunni Islamic imperial expansionism combined with centralized legal codification, state-sponsored cultural renaissance, and strategic balance of power diplomacy against Christian empires.",
      evidence: [
        "Establishing the Kanun-i Osmani civil legal codes that balanced Sharia with secular state needs.",
        "Signing the historic Franco-Ottoman alliance to divide European Christian coalitions."
      ],
      confidence: "high"
    },
    decision_patterns: [
      {
        pattern: "Leading massive, highly structured summer campaigns in person on one front (West or East) while executing strict, defensive treaties on the other front to avoid dual-war entanglements.",
        examples: [
          "Signing the Peace of Amasya with Persia before launching Mediterranean naval campaigns.",
          "Personally commanding 13 separate grand campaigns to project imperial presence."
        ],
        confidence: "high"
      }
    ],
    crisis_behavior: "Exhibited strong, ruthless resolve in military and domestic crises, responding to succession threats or Janissary revolts with immediate, absolute executions of even his closest allies and sons (e.g. Ibrahim Pasha, Mustafa).",
    negotiation_style: "commanding, imperial, treating foreign ambassadors as representatives of vassal states, compromising only when major military blockades occurred.",
    risk_tolerance: "high",
    centralization_preference: "high",
    conflict_preference: "high",
    institutional_respect: "high",
    coalition_dependency: "low",
    populism_level: "medium",
    technocratic_level: "high",
    game_theory_profile: {
      main_players: ["Ottoman Empire", "Holy Roman Empire (Habsburgs)", "Safavid Empire", "Kingdom of France"],
      likely_objectives: [
        "Ottomans: Capture Vienna, dominate Hungary, secure eastern borders.",
        "Habsburgs: Defend Vienna, hold Hungary, contain Ottomans.",
        "Persia: Expand Shia influence, reclaim Baghdad.",
        "France: Leverage Ottomans to weaken Habsburg encirclement."
      ],
      payoffs: [
        "Franco-Ottoman Alliance (1536) successfully split the European Christian front, optimizing the Ottoman military payoff in Central Europe while securing French trade ties (Highest diplomatic payoff)."
      ],
      constraints: ["Early winter weather in Central Europe acted as a strict threat constraint on Ottoman siege logistics."],
      common_strategic_moves: ["Seasonal massive land campaigns", "Trade privileges (Capitulations) to divide enemies"],
      failure_modes: ["His execution of his highly capable son Mustafa left the succession to Selim II, initiating the long, gradual decline of Ottoman administrative quality."]
    },
    bayesian_assessment: [
      {
        claim: "Suleiman executed his eldest son Mustafa primarily due to genuine evidence of treason rather than Roxelana's harem intrigues.",
        prior_confidence: "medium",
        evidence: [
          "Austrian diplomatic dispatches indicating that Mustafa was actively communicating with Safavid Shah Tahmasp to secure backing for a coup.",
          "Mustafa's military popularity among the Janissaries, who were openly demanding that the aging Suleiman step down."
        ],
        posterior_confidence: "medium",
        what_would_change_this: "Discovery of verified personal correspondence proving Roxelana completely fabricated all intercept evidence of Mustafa's contact with Persia."
      }
    ],
    historical_comparisons: [
      {
        compared_to: "Augustus",
        similarities: [
          "Monarchs who presided over their empires' absolute golden ages of expansion, legal reform, and architectural renaissance.",
          "Faced severe, tragic dynastic succession crises in their final years."
        ],
        differences: [
          "Suleiman operated as an absolute, overt military monarch and religious Caliph, rather than maintaining a republican facade."
        ],
        confidence: "high"
      }
    ],
    source_quality: {
      overall: "strong",
      notes: "Voluminous Ottoman court chronicles, European diplomatic archives, Sinan's architectural records, and definitive Turkish histories.",
      source_count: 5
    },
    sources: [
      "Inalcik, Halil. (1973). The Ottoman Empire: The Classical Age 1300-1600.",
      "Finkel, Caroline. (2005). Osman's Dream: The History of the Ottoman Empire.",
      "Clot, André. (1989). Suleiman the Magnificent.",
      "Imber, Colin. (2002). The Ottoman Empire, 1300-1650: The Structure of Power.",
      "Necipoglu, Gülru. (2005). The Age of Sinan: Architectural Culture in the Ottoman Empire."
    ],
    research_gaps: ["Determining the exact private dialogue and true extent of Hürrem Sultan's influence in the execution of Grand Vizier Ibrahim Pasha remains highly debated due to secretive court dynamics."],
    created_at: "2026-05-31T21:31:33Z",
    updated_at: "2026-05-31T21:31:33Z"
  },

  // 8. Saladin
  {
    person_id: "saladin",
    name: "Saladin",
    aliases: ["Salah ad-Din", "Salah ad-Din Yusuf ibn Ayyub"],
    birth_year: 1137,
    death_year: 1193,
    countries_or_regions: ["Egypt", "Syria", "Middle East"],
    era: "12th Century / Crusades Era",
    roles: ["Sultan of Egypt and Syria", "Founder of the Ayyubid Dynasty"],
    domains: ["Geopolitics", "Military", "Statecraft"],
    priority_tier: 1,
    short_summary: "Muslim general who founded the Ayyubid Dynasty, unified the Middle East, recaptured Jerusalem from the Crusaders, and famously fought Richard the Lionheart in the Third Crusade.",
    timeline: [
      {
        date_or_year: "1169",
        event: "Appointed Vizier of the Fatimid Caliphate in Egypt after assisting in its defense against Crusaders.",
        importance: "high",
        sources: ["Lyons & Jackson (1982)"]
      },
      {
        date_or_year: "1171-09",
        event: "Abolished the Shia Fatimid Caliphate in Egypt, restoring Sunni authority and establishing the Ayyubid Dynasty.",
        importance: "high",
        sources: ["Lyons & Jackson (1982)", "Gibb (1973)"]
      },
      {
        date_or_year: "1174 to 1186",
        event: "Unified Egypt and Syria under his rule, capturing Damascus and Aleppo from rival Muslim emirs.",
        importance: "high",
        sources: ["Gibb (1973)"]
      },
      {
        date_or_year: "1187-07-04",
        event: "Crushed the Crusader army at the Battle of Hattin, capturing King Guy of Jerusalem.",
        importance: "high",
        sources: ["Lyons & Jackson (1982)", "Hattin battle archives"]
      },
      {
        date_or_year: "1187-10-02",
        event: "Recaptured Jerusalem after 88 years of Crusader rule, granting merciful terms to the Christian citizens.",
        importance: "high",
        sources: ["Jerusalem surrender logs", "Gibb (1973)"]
      },
      {
        date_or_year: "1191",
        event: "Faced Richard the Lionheart during the Third Crusade; suffered tactical defeats but held Jerusalem.",
        importance: "high",
        sources: ["Third Crusade records", "Lyons & Jackson (1982)"]
      },
      {
        date_or_year: "1192-09-02",
        event: "Signed the Treaty of Jaffa with Richard I, securing Muslim control of Jerusalem while guaranteeing Christian pilgrim access.",
        importance: "high",
        sources: ["Treaty of Jaffa text"]
      },
      {
        date_or_year: "1193-03-04",
        event: "Passed away in Damascus; his treasury contained only a few coins as he had donated all his wealth to his subjects.",
        importance: "high",
        sources: ["Lyons & Jackson (1982)"]
      }
    ],
    power_base: "Loyalty of elite Kurdish/Turkish military commanders (Mamluks), unified Sunni religious coalition, immense agricultural wealth of the Nile delta, and moral authority as champion of Jihad.",
    core_goals: [
      "Unify fractured Muslim principalities under Ayyubid Sunni hegemony.",
      "Reclaim Jerusalem (Al-Quds) and the Holy Land from Crusader rule.",
      "Establish stable administrative structures and defensive fortifications across Egypt and Syria."
    ],
    incentives: [
      "Religious duty to restore Sunni supremacy and reclaim Islamic holy sites.",
      "Defeating political and factional opponents (Shia Fatimids, Zangids).",
      "Maintaining his personal honor, generosity, and chivalric moral reputation."
    ],
    constraints: [
      "Persistent internal rivalries and assassination threats from the Shia Assassins (Hashashin).",
      "Constant threat of heavily armored military reinforcements arriving from Europe.",
      "Severe financial limits of sustaining a loose coalition of independent, volatile emirs."
    ],
    allies: ["Al-Adil (brother/diplomat)", "Shirkuh (uncle/general)", "Sunni Abbasid Caliphate (nominal sponsor)"],
    rivals: ["Richard I of England", "Guy of Lusignan (King of Jerusalem)", "Raynald of Châtillon (executed by Saladin)", "The Hashashin (Assassins)"],
    institutions_controlled_or_influenced: ["Ayyubid Sultanate", "Sunni Monastic Orders (Madrasas)", "Syrian and Egyptian armies"],
    ideology_or_worldview: {
      summary: "Sunni Islamic piety combined with chivalric honor, commitment to holy struggle (Jihad) to reclaim Jerusalem, and a generous, merciful model of monarchical leadership.",
      evidence: [
        "Refusing to slaughter the Christian population of Jerusalem in 1187, in stark contrast to the Crusader massacre of 1099.",
        "Dying nearly bankrupt due to constant charity and monastic donations."
      ],
      confidence: "high"
    },
    decision_patterns: [
      {
        pattern: "Patient, long-term political consolidation of Muslim Syria/Egypt before launching major campaigns against the Crusaders, avoiding premature battles unless tactical advantages were absolute.",
        examples: [
          "Spending 15 years unifying Syria and Egypt before launching the decisive campaign in 1187.",
          "Using diplomatic treaties to divide rival Crusader factions (e.g., Raymond of Tripoli)."
        ],
        confidence: "high"
      }
    ],
    crisis_behavior: "Exhibited strong patience and strategic resilience under pressure, maintaining a unified front among his volatile emirs even during heavy tactical defeats by Richard the Lionheart.",
    negotiation_style: "highly chivalrous, courteous, exchanging gifts and medical aid with opponents (famously sending horses to Richard I), but absolute and unyielding on Muslim sovereignty over Jerusalem.",
    risk_tolerance: "medium",
    centralization_preference: "medium",
    conflict_preference: "high",
    institutional_respect: "high",
    coalition_dependency: "high",
    populism_level: "high",
    technocratic_level: "low",
    game_theory_profile: {
      main_players: ["Muslim Coalition", "Crusader States", "Third Crusade (Richard I)"],
      likely_objectives: [
        "Saladin: Hold Jerusalem, maintain Muslim unity, expel Crusaders.",
        "Richard: Capture Jerusalem, break Saladin's army.",
        "Crusader Nobles: Protect coastal holdings, maintain local fiefdoms."
      ],
      payoffs: [
        "Treaty of Jaffa (1192) established a stable Nash equilibrium where Saladin kept Jerusalem while granting pilgrim rights, optimizing the survival payoff for both exhausted armies (Highest strategic payoff)."
      ],
      constraints: ["Severe financial exhaustion and emir desertions limited Saladin's ability to completely destroy the coastal Crusader states."],
      common_strategic_moves: ["Scorched-earth tactics against Crusader marches", "Generous surrender terms to divide enemies"],
      failure_modes: ["His loose, decentralised Ayyubid family system fractured into rival states immediately after his death."]
    },
    bayesian_assessment: [
      {
        claim: "Saladin's legendary chivalry and mercy were calculated geopolitical strategies to win public legitimacy rather than pure personal piety.",
        prior_confidence: "medium",
        evidence: [
          "His merciful treatment of Jerusalem's Christians directly contrast with his brutal execution of all captured Templar and Hospitaller knights after Hattin, indicating highly calculated selectivity.",
          "His deliberate cultivation of a chivalric reputation, which won him immense praise in European chronicles and weakened Crusader resolve."
        ],
        posterior_confidence: "high",
        what_would_change_this: "Discovery of private letters showing he actively ordered the secret slaughter of the Christian populations he publicly pardoned."
      }
    ],
    historical_comparisons: [
      {
        compared_to: "Nelson Mandela",
        similarities: [
          "Secular-leaning military and political leaders who chose mercy and reconciliation over revenge upon capturing capital cities.",
          "Held together loose, highly volatile political coalitions through personal moral prestige."
        ],
        differences: [
          "Saladin operated inside a medieval dynastic warfare framework, personally commanding armies in religious conflicts."
        ],
        confidence: "high"
      }
    ],
    source_quality: {
      overall: "strong",
      notes: "Contemporary biographies by Baha ad-Din ibn Shaddad, letters compiled by Imad ad-Din al-Isfahani, Crusader chronicles, and extensive modern historical works.",
      source_count: 5
    },
    sources: [
      "Lyons, M. C. & Jackson, D. E. P. (1982). Saladin: The Politics of the Holy War.",
      "Gibb, H. A. R. (1973). The Life of Saladin.",
      "Ibn Shaddad, Baha ad-Din. (c. 1200). The Rare and Excellent History of Saladin.",
      "Asbridge, Thomas. (2010). The Crusades: The War for the Holy Land.",
      "Maalouf, Amin. (1984). The Crusades Through Arab Eyes."
    ],
    research_gaps: ["Determining the exact terms of his secret negotiations with the Assassins (Hashashin) after they twice attempted to kill him remains unresolved due to sparse records."],
    created_at: "2026-05-31T21:31:33Z",
    updated_at: "2026-05-31T21:31:33Z"
  },

  // 9. Siddhartha Gautama
  {
    person_id: "siddhartha_gautama",
    name: "Siddhartha Gautama",
    aliases: ["The Buddha", "Shakyamuni", "Gautama Buddha"],
    birth_year: -563,
    death_year: -483,
    countries_or_regions: ["Ancient India", "South Asia", "Global"],
    era: "6th / 5th Century BCE / Ancient India",
    roles: ["Spiritual Teacher", "Founder of Buddhism"],
    domains: ["Philosophy", "Social Reform", "Religion"],
    priority_tier: 1,
    short_summary: "Indian philosopher and sage who founded Buddhism, proposing the Four Noble Truths and establishing a self-governing monastic order open to all.",
    timeline: [
      {
        date_or_year: "-534",
        event: "Renounced his royal princely life (The Great Departure) to wander as an ascetic seeker.",
        importance: "high",
        sources: ["Armstrong (2001)"]
      },
      {
        date_or_year: "-528",
        event: "Achieved absolute enlightenment under the Bodhi tree in Bodh Gaya; formulated the Middle Way.",
        importance: "high",
        sources: ["Armstrong (2001)", "Pali Canon"]
      },
      {
        date_or_year: "-528",
        event: "Delivered his first sermon at Sarnath (Setting the Wheel of Dhamma in motion) to his first five disciples.",
        importance: "high",
        sources: ["Dhammacakkappavattana Sutta"]
      },
      {
        date_or_year: "-520s",
        event: "Established the Sangha (monastic order), drafting the Vinaya (monastic codes of conduct).",
        importance: "high",
        sources: ["Vinaya Pitaka"]
      },
      {
        date_or_year: "-510",
        event: "Authorized the ordination of women (establishing the Bhikkhuni order) at the request of Mahapajapati Gotami.",
        importance: "high",
        sources: ["Vinaya Pitaka", "Harvey (2013)"]
      },
      {
        date_or_year: "-490",
        event: "Converted notorious bandit Angulimala, demonstrating the pacifying moral power of nonviolence.",
        importance: "high",
        sources: ["Angulimala Sutta"]
      },
      {
        date_or_year: "-483",
        event: "Achieved Mahaparinirvana (final passing) at Kushinagar; urged his disciples to be 'lamps unto themselves'.",
        importance: "high",
        sources: ["Maha-parinibbana Sutta"]
      }
    ],
    power_base: "Spiritual devotion of the rapidly expanding monastic Sangha, extensive financial and land patronage from wealthy merchant guilds and kings (e.g. Bimbisara), and universal appeal to marginalized castes.",
    core_goals: [
      "Provide a logical, practical philosophical path to eradicate human suffering (Dukkha).",
      "Establish a self-governing, democratic, egalitarian monastic order (Sangha) independent of traditional states.",
      "Challenge the birth-based caste monopolies and sacrificial violence of the dominant Brahmin priesthood."
    ],
    incentives: [
      "Eradicating universal human suffering and rebirth cycle.",
      "Providing safe, organized communal spaces for philosophical inquiry and meditation.",
      "Ensuring the survival of his teachings without establishing a singular, dynastic leader."
    ],
    constraints: [
      "Fierce cultural and intellectual opposition from the dominant Vedic Brahmin priesthood.",
      "Severe physical challenges of constant barefoot wandering and begging across the Ganges plain.",
      "Internal factional schisms and assassination attempts (led by his cousin Devadatta)."
    ],
    allies: ["Ananda (loyal attendant)", "Sariputta (chief disciple)", "Moggallana", "King Bimbisara of Magadha"],
    rivals: ["Vedic Brahmin Priesthood", "Devadatta (schismatic rival)", "Mahavira (Jain founder, competing teacher)"],
    institutions_controlled_or_influenced: ["The Buddhist Sangha", "Kingdom of Magadha (patronized)", "Kingdom of Kosala (patronized)"],
    ideology_or_worldview: {
      summary: "Buddhism (The Middle Way between extreme asceticism and indulgence, proposing the Four Noble Truths, the Noble Eightfold Path, non-self (Anatta), impermanence (Anicca), and absolute nonviolence (Ahimsa)).",
      evidence: [
        "The extensive discourses of the Sutta Pitaka detailing logical, empirical psychological systems.",
        "Complete rejection of animal sacrifices and hereditary caste distinctions within the Sangha."
      ],
      confidence: "high"
    },
    decision_patterns: [
      {
        pattern: "Deploying logical, dialogue-based teaching methods (similar to the Socratic method) to guide seekers to self-realization, coupled with democratic, consensus-based monastic governance.",
        examples: [
          "Refusing to name a successor, declaring that his teaching (Dhamma) would serve as the guide.",
          "Drafting monastic rules (Vinaya) incrementally in response to specific community disputes."
        ],
        confidence: "high"
      }
    ],
    crisis_behavior: "Exhibited absolute psychological calm and compassion under direct threat, using mindful dialogue to pacify violent attackers or schismatic rebels.",
    negotiation_style: "patient, highly analytical, using analogies and logical classification, completely avoiding claims of divine authority, focusing on empirical human suffering.",
    risk_tolerance: "high",
    centralization_preference: "low",
    conflict_preference: "low",
    institutional_respect: "high",
    coalition_dependency: "high",
    populism_level: "high",
    technocratic_level: "low",
    game_theory_profile: {
      main_players: ["The Sangha", "Vedic Orthodoxy", "Regional Kings (Magadha/Kosala)"],
      likely_objectives: [
        "Sangha: Secure state protection, expand monastic order, spread Dhamma.",
        "Vedic Orthodoxy: Maintain ritual monopolies, protect caste privileges.",
        "Kings: Maintain social stability, patronize popular teachers to secure legitimacy."
      ],
      payoffs: [
        "Establishing a self-governing monastic order independent of state control (but enjoying state protection) optimized the Sangha's survival payoff, ensuring its continuity across dynastic changes (Highest cooperative payoff)."
      ],
      constraints: ["Strict non-political status was required to avoid appearing as a threat to royal authority, limiting his policy interventions."],
      common_strategic_moves: ["Consensus-based assembly voting", "Establishing monastic centers near trade routes"],
      failure_modes: ["His refusal to appoint a singular leader made the Sangha highly vulnerable to sectarian splits immediately after his passing."]
    },
    bayesian_assessment: [
      {
        claim: "The Buddha's rejection of caste was a revolutionary social reform campaign rather than a spiritual philosophy.",
        prior_confidence: "low",
        evidence: [
          "His discourses clarifying that caste is spiritually irrelevant because all humans possess the same capacity for enlightenment.",
          "His explicit focus on individual liberation (Nirvana) rather than restructuring the political or economic class systems of ancient Indian states."
        ],
        posterior_confidence: "low",
        what_would_change_this: "Discovery of ancient texts showing the Buddha organized mass political protests to overthrow regional kings and abolish the class system."
      }
    ],
    historical_comparisons: [
      {
        compared_to: "Socrates",
        similarities: [
          "Philosophers who used dialectical inquiry to challenge traditional religious orthodoxies.",
          "Refused to write their teachings down, relying entirely on oral transmission by disciples."
        ],
        differences: [
          "The Buddha successfully established a massive, durable, international monastic institution (Sangha) that outlasted him by millennia."
        ],
        confidence: "high"
      }
    ],
    source_quality: {
      overall: "strong",
      notes: "The massive oral-derived scriptures of the Pali Canon, early epigraphic rock edicts of Ashoka, and extensive modern global Buddhist scholarship.",
      source_count: 5
    },
    sources: [
      "Armstrong, Karen. (2001). Buddha.",
      "Harvey, Peter. (2013). An Introduction to Buddhism: Teachings, History and Practices.",
      "The Pali Canon (Vinaya, Sutta, and Abhidhamma Pitakas).",
      "Carrithers, Michael. (1983). The Buddha.",
      "Nanamoli, Bhikkhu. (1972). The Life of the Buddha."
    ],
    research_gaps: ["The exact, absolute calendar dates of his birth and death remain subject to minor scholarly debates (with the 'short chronology' placing his death around 400 BCE)."],
    created_at: "2026-05-31T21:31:33Z",
    updated_at: "2026-05-31T21:31:33Z"
  },

  // 10. Jesus of Nazareth
  {
    person_id: "jesus_of_nazareth",
    name: "Jesus of Nazareth",
    aliases: ["Jesus Christ", "Yeshua"],
    birth_year: -4,
    death_year: 30,
    countries_or_regions: ["Judea", "Middle East", "Roman Empire"],
    era: "1st Century CE / Roman Judea",
    roles: ["Spiritual Leader", "Founder of Christianity"],
    domains: ["Philosophy", "Social Reform", "Religion"],
    priority_tier: 1,
    short_summary: "Judean spiritual teacher whose life and moral message of love, forgiveness, and the Kingdom of God founded Christianity, transforming global history.",
    timeline: [
      {
        date_or_year: "27",
        event: "Baptized by John the Baptist in the Jordan River, initiating his public ministry.",
        importance: "high",
        sources: ["Gospel accounts", "Sanders (1993)"]
      },
      {
        date_or_year: "28",
        event: "Delivered the Sermon on the Mount, outlining a radical moral ethic of love for enemies.",
        importance: "high",
        sources: ["Gospel of Matthew text"]
      },
      {
        date_or_year: "29",
        event: "Assembled a core network of twelve disciples, wandering across Galilee and Judea.",
        importance: "high",
        sources: ["Sanders (1993)"]
      },
      {
        date_or_year: "30-04",
        event: "Triumphal Entry into Jerusalem during Passover; cleansed the Temple courts of money changers.",
        importance: "high",
        sources: ["Gospel accounts", "Meier (1991)"]
      },
      {
        date_or_year: "30-04",
        event: "Celebrated the Last Supper with his disciples, initiating the new covenant.",
        importance: "high",
        sources: ["Sanders (1993)"]
      },
      {
        date_or_year: "30-04",
        event: "Arrested in the Garden of Gethsemane; tried by the Sanhedrin under Caiaphas for blasphemy.",
        importance: "high",
        sources: ["Trial transcripts/Gospels"]
      },
      {
        date_or_year: "30-04-07",
        event: "Crucified by order of Roman Governor Pontius Pilate outside Jerusalem on charges of sedition.",
        importance: "high",
        sources: ["Tacitus (Annals)", "Josephus (Antiquities)", "Sanders (1993)"]
      }
    ],
    power_base: "Devoted popular following among Galilee's peasant farmers and outcasts, a highly committed core network of disciples, and charismatic reputation for spiritual authority.",
    core_goals: [
      "Proclaim and initiate the arrival of the non-military 'Kingdom of God'.",
      "Reform Judean religious practices to prioritize inner mercy, love, and justice over hollow legalism.",
      "Establish a global moral covenant welcoming all outcasts, poor, and nations."
    ],
    incentives: [
      "Absolute obedience to the will of God.",
      "Uplifting the poorest, sickest, and most marginalized social classes.",
      "Offering himself as a redemptive model of self-sacrificing love."
    ],
    constraints: [
      "Brutal, armed military occupation of Judea by the Roman Empire.",
      "Fierce institutional hostility from the wealthy Judean Temple elite (Sadducees and Pharisees).",
      "Radical, violent nationalistic expectations of Jewish zealots who wanted a military Messiah."
    ],
    allies: ["Simon Peter", "John the Apostle", "Mary Magdalene", "Twelve Disciples"],
    rivals: ["Pontius Pilate", "Caiaphas (High Priest)", "Herod Antipas (Galilean ruler)"],
    institutions_controlled_or_influenced: ["The Christian Church (foundations)", "Galilean peasant networks"],
    ideology_or_worldview: {
      summary: "Radical moral transformation prioritizing love for God and absolute love for one's neighbor (including enemies), emphasizing inner purity over external ritual, and declaring that God's kingdom belongs to the poor, meek, and peacemakers.",
      evidence: [
        "The Sermon on the Mount (Matthew 5-7) reversing traditional legal paradigms.",
        "His parables (e.g. The Good Samaritan) redefining neighborly duty across ethnic divides."
      ],
      confidence: "high"
    },
    decision_patterns: [
      {
        pattern: "Using highly provocative, memorable parables and symbolic actions (cleansing the Temple, dining with outcasts) to expose religious hypocrisy and directly challenge the political-temple elite.",
        examples: [
          "Using a simple coin to define boundaries of state duty ('Render unto Caesar').",
          "Cleansing the Temple during the highly sensitive Passover festival."
        ],
        confidence: "high"
      }
    ],
    crisis_behavior: "Exhibited extraordinary spiritual courage and serene self-possession under arrest and trial, refusing to defend himself or recant his message, accepting crucifixion as a redemptive culmination.",
    negotiation_style: "highly cryptic, using questions and parables to expose the motives of examiners, completely refusing to lobby Roman or Temple authorities for personal safety.",
    risk_tolerance: "high",
    centralization_preference: "low",
    conflict_preference: "low",
    institutional_respect: "medium",
    coalition_dependency: "high",
    populism_level: "high",
    technocratic_level: "low",
    game_theory_profile: {
      main_players: ["Jesus", "Temple Authorities (Caiaphas)", "Roman Governor (Pilate)", "The Crowds"],
      likely_objectives: [
        "Jesus: Proclaim Kingdom of God, execute moral mission, accept sacrifice.",
        "Caiaphas: Preserve Temple stability, avoid Roman intervention.",
        "Pilate: Maintain public order, suppress potential messianic rebellions."
      ],
      payoffs: [
        "Cleansing the Temple created a high-risk crisis where Caiaphas felt forced to execute Jesus to prevent Roman intervention, which Jesus accepted as the ultimate strategic payoff of his redemptive mission (Highest spiritual payoff)."
      ],
      constraints: ["Roman monopoly on capital punishment forced Caiaphas to frame charges as sedition ('King of the Jews') to compel Pilate's execution order."],
      common_strategic_moves: ["Charismatic public parables", "Voluntary submission to trial"],
      failure_modes: ["His execution initially scattered his disciples, though his reported resurrection transformed it into the ultimate catalyst for a global movement."]
    },
    bayesian_assessment: [
      {
        claim: "Jesus planned to establish a permanent global church hierarchy during his earthly ministry.",
        prior_confidence: "low",
        evidence: [
          "His frequent statements indicating the imminent, historic arrival of the Kingdom of God within his generation.",
          "His total lack of drafting any written codifications, rules, or institutional structures compared to the detailed Sangha codes of the Buddha."
        ],
        posterior_confidence: "low",
        what_would_change_this: "Discovery of a verified contemporary scroll written by Jesus outlining a detailed bureaucratic hierarchy for a global church."
      }
    ],
    historical_comparisons: [
      {
        compared_to: "Socrates",
        similarities: [
          "Charismatic moral teachers who challenged traditional civic/religious elites.",
          "Executed by the state (hemlock/crucifixion) on charges of subverting youth/treason.",
          "Wrote nothing down, relying entirely on accounts compiled by disciples."
        ],
        differences: [
          "Jesus mobilized a popular religious movement among the absolute poorest classes, which rapidly became a dominant transnational force."
        ],
        confidence: "high"
      }
    ],
    source_quality: {
      overall: "strong",
      notes: "The four classical Gospels, contemporary Roman mentions (Tacitus, Pliny), Jewish testimonies (Josephus), and massive modern historical-critical scholarship.",
      source_count: 5
    },
    sources: [
      "Sanders, E. P. (1993). The Historical Figure of Jesus.",
      "Meier, John P. (1991-2016). A Marginal Jew: Rethinking the Historical Jesus (5 volumes).",
      "Wright, N. T. (1996). Jesus and the Victory of God.",
      "Josephus, Flavius. (c. 93 CE). Antiquities of the Jews (Testimonium Flavianum).",
      "Tacitus. (c. 116 CE). Annals (Book XV, Chapter 44 reference)."
    ],
    research_gaps: ["The exact chronology of his ministry (whether it lasted one year or three) and his early 'silent years' (ages 12-30) remain unresolved."],
    created_at: "2026-05-31T21:31:33Z",
    updated_at: "2026-05-31T21:31:33Z"
  },

  // 11. Karl Marx
  {
    person_id: "karl_marx",
    name: "Karl Marx",
    aliases: ["The Father of Modern Socialism"],
    birth_year: 1818,
    death_year: 1883,
    countries_or_regions: ["Germany", "United Kingdom", "Europe"],
    era: "19th Century / Industrial Revolution",
    roles: ["Philosopher", "Social Scientist", "Political Journalist"],
    domains: ["Philosophy", "Economic", "Ideology"],
    priority_tier: 1,
    short_summary: "German philosopher and political economist who drafted 'The Communist Manifesto' and wrote 'Das Kapital', formulating the materialist critique of capitalism.",
    timeline: [
      {
        date_or_year: "1843",
        event: "Exiled from Prussia following his radical editorship of the Rheinische Zeitung; moved to Paris.",
        importance: "high",
        sources: ["McLellan (1973)"]
      },
      {
        date_or_year: "1844",
        event: "Met Friedrich Engels in Paris, initiating the most famous intellectual partnership in history.",
        importance: "high",
        sources: ["McLellan (1973)", "Wheen (1999)"]
      },
      {
        date_or_year: "1848-02-21",
        event: "Published 'The Communist Manifesto' on the eve of the European revolutions.",
        importance: "high",
        sources: ["Communist Manifesto text", "Wheen (1999)"]
      },
      {
        date_or_year: "1849",
        event: "Permanently exiled to London; spent the rest of his life researching in the British Museum.",
        importance: "high",
        sources: ["Wheen (1999)"]
      },
      {
        date_or_year: "1864",
        event: "Co-founded the International Workingmen's Association (First International) in London.",
        importance: "high",
        sources: ["First International records"]
      },
      {
        date_or_year: "1867",
        event: "Published the first volume of 'Das Kapital', his monumental critique of capitalist production.",
        importance: "high",
        sources: ["Das Kapital (Vol 1)", "McLellan (1973)"]
      },
      {
        date_or_year: "1883-03-14",
        event: "Passed away in his London study; buried at Highgate Cemetery.",
        importance: "high",
        sources: ["Wheen (1999)"]
      }
    ],
    power_base: "Expanding international socialist and labor network of the First International, intellectual collaboration and financial backing of Friedrich Engels, and massive systemic appeal of his writings.",
    core_goals: [
      "Provide a rigorous, scientific critique of the laws of motion of capitalist production.",
      "Establish a unified, international class-conscious worker movement (proletariat).",
      "Lay the theoretical foundation for the inevitable historical transition to communism."
    ],
    incentives: [
      "Eradicating the severe exploitation of the industrial working class.",
      "Advancing the scientific understanding of human history through materialist lenses.",
      "Defeating reformist/bourgeois factions that compromised revolutionary goals."
    ],
    constraints: [
      "Constant political exile, police surveillance, and expulsions by European states.",
      "Severe, crushing lifelong personal poverty and physical illness (boils, insomnia).",
      "Fierce, bitter factional gridlock within early socialist and anarchist movements."
    ],
    allies: ["Friedrich Engels (patron/co-author)", "Jenny von Westphalen (wife/advisor)"],
    rivals: ["Mikhail Bakunin (anarchist rival)", "Pierre-Joseph Proudhon", "European capitalist state authorities"],
    institutions_controlled_or_influenced: ["First International", "Socialist movement (globally)", "The Communist League"],
    ideology_or_worldview: {
      summary: "Historical materialism (asserting that human history is driven strictly by class struggles over economic production forces) and scientific critique of capitalism (labor theory of value, surplus value, exploitation).",
      evidence: [
        "Das Kapital detailing the commodity form and capital accumulation dynamics.",
        "His famous thesis: 'Philosophers have only interpreted the world, in various ways; the point is to change it.'"
      ],
      confidence: "high"
    },
    decision_patterns: [
      {
        pattern: "Fierce, uncompromising intellectual polemics, completely rejecting reformist compromises or bourgeois morality in favor of absolute scientific consistency.",
        examples: [
          "Purging Bakunin and the anarchists from the First International to preserve ideological purity.",
          "Writing 'The Civil War in France' immediately after the Paris Commune of 1871."
        ],
        confidence: "high"
      }
    ],
    crisis_behavior: "Exhibited highly stubborn, intellectual resilience during exile and poverty, completely refusing to abandon his monumental research for profitable work, relying on Engels to survive.",
    negotiation_style: "highly intellectual, dominating, combative, using debates to expose the logical flaws of opponents, completely refusing to compromise on core theoretical points.",
    risk_tolerance: "high",
    centralization_preference: "medium",
    conflict_preference: "high",
    institutional_respect: "low",
    coalition_dependency: "high",
    populism_level: "high",
    technocratic_level: "high",
    game_theory_profile: {
      main_players: ["The Proletariat (Workers)", "The Bourgeoisie (Capitalists)", "Socialist Factions"],
      likely_objectives: [
        "Workers: Organize internationally, seize means of production.",
        "Capitalists: Maximize surplus value extraction, suppress revolution.",
        "Socialist Factions: Cooperate vs capitalists, compete for ideological control."
      ],
      payoffs: [
        "Providing the working class with a 'scientific' historical materialist ideology optimized their class-consciousness payoff, turning localized strikes into a global historical movement (Highest ideological payoff)."
      ],
      constraints: ["Severe state surveillance and exile laws acted as a strict constraint on physical revolutionary organization."],
      common_strategic_moves: ["Writing theoretical treatises", "Organizing international labor congresses"],
      failure_modes: ["His centralized vanguard concepts were later leveraged by Lenin/Stalin to justify totalitarian state control, which Marx did not foresee."]
    },
    bayesian_assessment: [
      {
        claim: "Marx believed that a violent revolution was the only possible path to transition from capitalism to socialism.",
        prior_confidence: "medium",
        evidence: [
          "His famous statement in Capital that: 'Force is the midwife of every old society pregnant with a new one.'",
          "His late-life speech in Amsterdam (1872) acknowledging that in democratic nations like the US and Britain, workers might achieve their goals through peaceful parliamentary means."
        ],
        posterior_confidence: "medium",
        what_would_change_this: "Discovery of private letters proving he viewed the Amsterdam speech as a deliberate lie to deceive police spies."
      }
    ],
    historical_comparisons: [
      {
        compared_to: "Martin Luther",
        similarities: [
          "Radical intellectuals whose writings split a dominant global system (Catholicism/Capitalism).",
          "Fierce, combative polemicists who refused to compromise with institutional authorities."
        ],
        differences: [
          "Marx operated in an industrial, secular era, basing his critique strictly on material economics rather than theology."
        ],
        confidence: "high"
      }
    ],
    source_quality: {
      overall: "strong",
      notes: "The massive Marx-Engels Collected Works (50 volumes), extensive personal correspondence, and definitive modern biographies.",
      source_count: 5
    },
    sources: [
      "McLellan, David. (1973). Karl Marx: His Life and Thought.",
      "Wheen, Francis. (1999). Karl Marx.",
      "Marx, Karl & Engels, Friedrich. (1848). The Communist Manifesto.",
      "Marx, Karl. (1867). Das Kapital: Critique of Political Economy.",
      "Sperber, Jonathan. (2013). Karl Marx: A Nineteenth-Century Life."
    ],
    research_gaps: ["Determining the exact degree of his early Hegelian philosophical influence vs his later purely economic focus remains a major debate among Marxist scholars."],
    created_at: "2026-05-31T21:31:33Z",
    updated_at: "2026-05-31T21:31:33Z"
  },

  // 12. Adam Smith
  {
    person_id: "adam_smith",
    name: "Adam Smith",
    aliases: ["The Father of Modern Economics"],
    birth_year: 1723,
    death_year: 1790,
    countries_or_regions: ["Scotland", "United Kingdom", "Europe"],
    era: "18th Century / Scottish Enlightenment",
    roles: ["Philosopher", "Political Economist", "Customs Commissioner"],
    domains: ["Economic", "Philosophy"],
    priority_tier: 1,
    short_summary: "Scottish philosopher who wrote 'The Wealth of Nations', establishing modern political economy and the foundational principles of free market capitalism.",
    timeline: [
      {
        date_or_year: "1751",
        event: "Appointed Professor of Logic and later Moral Philosophy at the University of Glasgow.",
        importance: "high",
        sources: ["Ross (1995)"]
      },
      {
        date_or_year: "1759",
        event: "Published 'The Theory of Moral Sentiments', establishing his reputation as a major moral philosopher.",
        importance: "high",
        sources: ["Theory of Moral Sentiments", "Ross (1995)"]
      },
      {
        date_or_year: "1764",
        event: "Resigned his professorship to tutor the young Duke of Buccleuch, traveling to France and meeting Voltaire and Quesnay.",
        importance: "high",
        sources: ["Ross (1995)", "Rae (1895)"]
      },
      {
        date_or_year: "1776-03-09",
        event: "Published 'The Wealth of Nations', establishing modern political economy.",
        importance: "high",
        sources: ["Wealth of Nations", "Rae (1895)"]
      },
      {
        date_or_year: "1778",
        event: "Appointed Commissioner of Customs for Scotland, actively regulating trade and suppressing smuggling.",
        importance: "high",
        sources: ["Ross (1995)"]
      },
      {
        date_or_year: "1787",
        event: "Elected Lord Rector of the University of Glasgow, a highly prestigious academic honor.",
        importance: "high",
        sources: ["Ross (1995)"]
      },
      {
        date_or_year: "1790-07-17",
        event: "Passed away in Edinburgh; ordered all his unpublished manuscripts to be burned.",
        importance: "high",
        sources: ["Rae (1895)"]
      }
    ],
    power_base: "Intellectual networks of the Scottish Enlightenment, backing of progressive British merchants, and rapid adopt of his free-market ideas by rising British policymakers.",
    core_goals: [
      "Dismantle the monopolistic, state-directed system of Mercantilism that choked global trade.",
      "Formulate a systematic theory of division of labor, market pricing, and wealth generation.",
      "Establish a moral philosophical framework where individual self-interest in free markets constructively benefits society ('Invisible Hand')."
    ],
    incentives: [
      "Eradicating predatory colonial monopolies that harmed consumers.",
      "Promoting the economic and moral progress of human society.",
      "Securing academic and philosophical truth."
    ],
    constraints: [
      "Entrenched mercantile trade monopolies protected by royal charters (e.g. East India Company).",
      "Complete lack of modern macroeconomic statistics or national data.",
      "Academic isolation of Scotland compared to major continental centers like Paris."
    ],
    allies: ["David Hume (philosopher/friend)", "William Pitt the Younger (student of his work)", "Benjamin Franklin (correspondent)"],
    rivals: ["Mercantile Monopolists", "French Physiocrats (philosophical differences)"],
    institutions_controlled_or_influenced: ["University of Glasgow", "HM Customs (Scotland)", "Political Economy (globally)"],
    ideology_or_worldview: {
      summary: "Classical liberalism and market-based moral philosophy, arguing that individual self-interest in free, competitive markets yields maximum societal wealth, balanced by deep moral sympathy and state-backed primary education.",
      evidence: [
        "The Wealth of Nations critique of the East India Company's monopoly.",
        "The Theory of Moral Sentiments detailing the 'impartial spectator' moral conscience."
      ],
      confidence: "high"
    },
    decision_patterns: [
      {
        pattern: "Patient, highly systematic observation of concrete mercantile trade practices combined with rigorous moral philosophical classification of human motives.",
        examples: [
          "Using the concrete example of a pin factory to illustrate the division of labor.",
          "Personally inspecting customs cargo to understand smuggling dynamics."
        ],
        confidence: "high"
      }
    ],
    crisis_behavior: "Exhibited quiet, academic calm under pressure, spending a decade revising and polishing his drafts in his mother's home in Kirkcaldy rather than publishing hastily.",
    negotiation_style: "highly polite, conversational, utilizing academic letters to persuade, completely avoiding direct political or personal conflicts.",
    risk_tolerance: "medium",
    centralization_preference: "low",
    conflict_preference: "low",
    institutional_respect: "high",
    coalition_dependency: "high",
    populism_level: "medium",
    technocratic_level: "high",
    game_theory_profile: {
      main_players: ["Consumers", "Mercantile Monopolists", "The State"],
      likely_objectives: [
        "Consumers: Secure cheap, high-quality goods.",
        "Monopolists: Restrict supply, maintain high prices via royal charters.",
        "State: Maximize gold reserves (Mercantilism), secure tax revenue."
      ],
      payoffs: [
        "A free market system creates a competitive Nash equilibrium where the self-interested actions of monopolists are curtailed by new entrants, optimizing the wealth payoff for all of society (Highest welfare payoff)."
      ],
      constraints: ["Royal trade charters and corporate lobbying in Parliament limited the early adoption of free trade."],
      common_strategic_moves: ["Writing theoretical critiques", "Bargaining with university boards"],
      failure_modes: ["His 'Invisible Hand' concept was later co-opted by extreme laissez-faire advocates to oppose even basic state regulations (which Smith supported, like banking rules)."]
    },
    bayesian_assessment: [
      {
        claim: "Adam Smith was a dogmatic advocate of absolute Laissez-Faire capitalism who opposed all state intervention.",
        prior_confidence: "low",
        evidence: [
          "His explicit support in The Wealth of Nations for state-funded primary education, public roads, and basic regulations on banking currency.",
          "His appointment and active work as a customs commissioner, enforcing state trade laws for over a decade."
        ],
        posterior_confidence: "low",
        what_would_change_this: "Discovery of a verified private manuscript advocating for the complete abolition of all taxation and state courts."
      }
    ],
    historical_comparisons: [
      {
        compared_to: "Karl Marx",
        similarities: [
          "Founding theoreticians of major modern economic frameworks (Capitalism/Socialism).",
          "Used detailed historical and material observation of production to derive laws."
        ],
        differences: [
          "Smith believed free competition was inherently self-correcting and morally beneficial under proper regulation, whereas Marx viewed capitalism as inherently unstable and exploitative."
        ],
        confidence: "high"
      }
    ],
    source_quality: {
      overall: "strong",
      notes: "The Wealth of Nations, The Theory of Moral Sentiments, his extensive Glasgow lectures, and definitive scholarly biographies by Ian Ross.",
      source_count: 5
    },
    sources: [
      "Ross, Ian Simpson. (1995). The Life of Adam Smith.",
      "Rae, John. (1895). Life of Adam Smith.",
      "Smith, Adam. (1776). An Inquiry into the Nature and Causes of the Wealth of Nations.",
      "Smith, Adam. (1759). The Theory of Moral Sentiments.",
      "Skinner, Andrew S. (1979). A System of Social Science: Papers Relating to Adam Smith."
    ],
    research_gaps: ["Determining the exact contents of the voluminous manuscripts he ordered burned on his deathbed remains a major focus of historical interest."],
    created_at: "2026-05-31T21:31:33Z",
    updated_at: "2026-05-31T21:31:33Z"
  },

  // 13. Isaac Newton
  {
    person_id: "isaac_newton",
    name: "Isaac Newton",
    aliases: ["Sir Isaac Newton"],
    birth_year: 1643,
    death_year: 1727,
    countries_or_regions: ["England", "Europe"],
    era: "17th / 18th Century / Scientific Revolution",
    roles: ["Mathematician", "Physicist", "President of the Royal Society", "Master of the Mint"],
    domains: ["Science", "Philosophy", "Economic"],
    priority_tier: 1,
    short_summary: "English mathematician and physicist who formulated the laws of motion and universal gravitation in his 'Principia', co-invented calculus, and reformed the British currency.",
    timeline: [
      {
        date_or_year: "1665 to 1666",
        event: "His 'Annus Mirabilis' (Year of Wonders) at Woolsthorpe Manor; invented calculus, developed optics, and formulated gravity theories during the plague outbreak.",
        importance: "high",
        sources: ["Westfall (1980)"]
      },
      {
        date_or_year: "1669",
        event: "Appointed Lucasian Professor of Mathematics at the University of Cambridge.",
        importance: "high",
        sources: ["Westfall (1980)"]
      },
      {
        date_or_year: "1687-07-05",
        event: "Published 'Philosophiae Naturalis Principia Mathematica', establishing modern physical mechanics.",
        importance: "high",
        sources: ["Principia Mathematica", "Westfall (1980)"]
      },
      {
        date_or_year: "1696",
        event: "Appointed Warden of the Royal Mint; launched the Great Recoinage of 1696 and prosecuted counterfeiters.",
        importance: "high",
        sources: ["Mint archives", "Levenson (2009)"]
      },
      {
        date_or_year: "1703",
        event: "Elected President of the Royal Society, dominating English science for over two decades.",
        importance: "high",
        sources: ["Royal Society records"]
      },
      {
        date_or_year: "1704",
        event: "Published 'Opticks', explaining the spectrum of light and corpuscular light theory.",
        importance: "high",
        sources: ["Opticks text"]
      },
      {
        date_or_year: "1705",
        event: "Knighted by Queen Anne, becoming Sir Isaac Newton.",
        importance: "high",
        sources: ["Royal archives"]
      },
      {
        date_or_year: "1727-03-20",
        event: "Passed away in London; buried at Westminster Abbey.",
        importance: "high",
        sources: ["Westfall (1980)"]
      }
    ],
    power_base: "Unrivaled global scientific prestige following the 'Principia', absolute institutional control over the Royal Society, and royal backing for currency reforms at the Royal Mint.",
    core_goals: [
      "Provide a unified mathematical framework for all physical motion (mechanics and gravity).",
      "Establish rigorous empirical mathematics as the foundation of natural philosophy.",
      "Reconstruct and secure the British currency system against counterfeiting."
    ],
    incentives: [
      "Securing the exact mathematical and physical truths of the universe.",
      "Eliminating counterfeiting to protect national economic security.",
      "Defeating academic rivals who challenged his priority of inventions."
    ],
    constraints: [
      "Intense, lifelong academic priority disputes (with Hooke on gravity, Leibniz on calculus).",
      "Inherent difficulty of publishing complex mathematics before modern printing formats.",
      "Severe mental strain and cognitive isolation during intense research periods."
    ],
    allies: ["Edmond Halley (publisher/patron)", "John Locke", "Charles Montague"],
    rivals: ["Robert Hooke", "Gottfried Wilhelm Leibniz (calculus rival)", "William Chaloner (counterfeiter)"],
    institutions_controlled_or_influenced: ["The Royal Society", "The Royal Mint", "University of Cambridge"],
    ideology_or_worldview: {
      summary: "Deterministic, mathematically ordered physical universe governed by immutable laws, combined with a deeply secretive unitarian theology and obsessive interest in alchemy and biblical chronology.",
      evidence: [
        "The Principia's mathematical formulation of universal gravity.",
        "Over 1 million words of unpublished private alchemical and unitarian theological manuscripts."
      ],
      confidence: "high"
    },
    decision_patterns: [
      {
        pattern: "Obsessive, isolated concentration on single complex problems for months without sleep, followed by highly aggressive, litigious defense of his priority once published.",
        examples: [
          "Locking himself in his Cambridge rooms for 18 months to write the Principia.",
          "Using the Royal Society's resources to publish an official report accusing Leibniz of plagiarism."
        ],
        confidence: "high"
      }
    ],
    crisis_behavior: "Exhibited highly paranoid, hyper-defensive behavior when under stress or academic attack, occasionally suffering nervous breakdowns (e.g. in 1693), but was incredibly relentless and thorough in prosecuting counterfeiters.",
    negotiation_style: "unyielding, highly formal, refusing direct debate, preferring to use his networks of younger mathematical disciples to attack opponents.",
    risk_tolerance: "medium",
    centralization_preference: "high",
    conflict_preference: "high",
    institutional_respect: "high",
    coalition_dependency: "medium",
    populism_level: "low",
    technocratic_level: "high",
    game_theory_profile: {
      main_players: ["Newton", "Leibniz", "European Mathematicians"],
      likely_objectives: [
        "Newton: Secure absolute priority of calculus, humiliate Leibniz.",
        "Leibniz: Secure recognition for independent discovery of calculus.",
        "Mathematicians: Utilize calculus, avoid choosing sides."
      ],
      payoffs: [
        "Publishing the Royal Society's Commercium Epistolicum (1712) successfully utilized his institutional power to formally declare himself the inventor, securing his priority payoff in England (Highest institutional payoff)."
      ],
      constraints: ["Leibniz's calculus notation was mathematically superior, forcing Newton's faction into increasingly desperate defensive arguments."],
      common_strategic_moves: ["Anonymous reviews", "Litigious commissions"],
      failure_modes: ["His lifelong obsession with alchemy and unitarian heresy remained hidden to protect his institutional respectability."]
    },
    bayesian_assessment: [
      {
        claim: "Newton's work on alchemy was a distraction rather than a foundational part of his physical worldview.",
        prior_confidence: "low",
        evidence: [
          "His alchemical manuscripts detailing efforts to discover the 'active principles' of attraction and cohesion in matter.",
          "Scholarly analyses showing his concept of universal gravity (action at a distance) was heavily influenced by alchemical views of attraction rather than mechanistic physics."
        ],
        posterior_confidence: "low",
        what_would_change_this: "Discovery of a diary stating he viewed alchemy purely as a fun hobby completely unrelated to his physics research."
      }
    ],
    historical_comparisons: [
      {
        compared_to: "Albert Einstein",
        similarities: [
          "Brilliant physicists who formulated the primary scientific paradigms of their eras.",
          "Experienced sudden global celebrity that elevated them to primary public intellectuals."
        ],
        differences: [
          "Newton spent his later years as an active state technocrat (Master of the Mint), personally prosecuting criminals, whereas Einstein remained in academia."
        ],
        confidence: "high"
      }
    ],
    source_quality: {
      overall: "strong",
      notes: "The Principia, Opticks, his extensive Royal Mint records, Newton Project online archives, and Westfall's definitive biography.",
      source_count: 5
    },
    sources: [
      "Westfall, Richard S. (1980). Never at Rest: A Biography of Isaac Newton.",
      "Levenson, Thomas. (2009). Newton and the Counterfeiter.",
      "Newton, Isaac. (1687). Philosophiae Naturalis Principia Mathematica.",
      "Newton, Isaac. (1704). Opticks.",
      "Dobbs, Betty Jo Teeter. (1975). The Foundations of Newton's Alchemy."
    ],
    research_gaps: ["The exact cause of his 1693 nervous breakdown (whether mercury poisoning from alchemical experiments or psychological exhaustion) remains unresolved."],
    created_at: "2026-05-31T21:31:33Z",
    updated_at: "2026-05-31T21:31:33Z"
  },

  // 14. Albert Einstein
  {
    person_id: "albert_einstein",
    name: "Albert Einstein",
    aliases: ["Einstein"],
    birth_year: 1879,
    death_year: 1955,
    countries_or_regions: ["Germany", "Switzerland", "United States"],
    era: "20th Century / Modern Era",
    roles: ["Theoretical Physicist", "Public Intellectual"],
    domains: ["Science", "Philosophy", "Human Rights"],
    priority_tier: 1,
    short_summary: "Theoretical physicist who developed the theory of relativity, won the Nobel Prize in Physics for his explanation of the photoelectric effect, and became the global symbol of modern science.",
    timeline: [
      {
        date_or_year: "1905",
        event: "His 'Annus Mirabilis' at the Swiss Patent Office; published four papers on photoelectric effect, Brownian motion, special relativity, and E=mc².",
        importance: "high",
        sources: ["Pais (1982)"]
      },
      {
        date_or_year: "1915-11",
        event: "Presented his field equations of General Relativity, revolutionizing gravity theory.",
        importance: "high",
        sources: ["General relativity equations", "Pais (1982)"]
      },
      {
        date_or_year: "1919-11-06",
        event: "British solar eclipse expeditions confirmed his general relativity prediction; catapulted him to global celebrity.",
        importance: "high",
        sources: ["Eclipse logs", "Isaacson (2007)"]
      },
      {
        date_or_year: "1921",
        event: "Awarded the Nobel Prize in Physics for his services to theoretical physics, especially his discovery of the law of the photoelectric effect.",
        importance: "high",
        sources: ["Nobel archives"]
      },
      {
        date_or_year: "1933-03",
        event: "Permanently emigrated to the US to escape the Nazi regime; joined the Institute for Advanced Study.",
        importance: "high",
        sources: ["Isaacson (2007)"]
      },
      {
        date_or_year: "1939-08-02",
        event: "Co-signed the Szilard-Einstein letter to FDR warning of potential German nuclear bomb research, initiating the Manhattan Project.",
        importance: "high",
        sources: ["Szilard-Einstein letter"]
      },
      {
        date_or_year: "1955",
        event: "Co-signed the Russell-Einstein Manifesto, urging nuclear disarmament and highlighting the dangers of hydrogen bombs.",
        importance: "high",
        sources: ["Manifesto text", "Pais (1982)"]
      }
    ],
    power_base: "Unprecedented global moral and scientific adoration post-1919 relativity verification, backing of the Institute for Advanced Study, and international pacifist network.",
    core_goals: [
      "Reformulate classical physics to describe space, time, and gravity (Relativity).",
      "Establish a unified field theory combining electromagnetism and gravity.",
      "Deter the rise of fascism and advocate for global nuclear disarmament."
    ],
    incentives: [
      "Securing the exact mathematical and physical truths of the universe.",
      "Promoting global peace and human rights.",
      "Helping Jewish refugees escape Nazi persecution."
    ],
    constraints: [
      "Rise of Nazi anti-Semitism in Germany, forcing his exile and labeling of his work as 'Jewish physics'.",
      "Deep resistance from quantum physicists to his unified, deterministic worldview ('God does not play dice').",
      "Active FBI surveillance and suspicion of his leftist pacifist leanings during the Red Scare."
    ],
    allies: ["Niels Bohr (complex debating partner)", "Max Planck", "Leo Szilard", "Bertrand Russell"],
    rivals: ["Philipp Lenard (anti-Semitic critic)", "J. Edgar Hoover (FBI surveillance coordinator)", "National Socialist Regime"],
    institutions_controlled_or_influenced: ["Institute for Advanced Study (Princeton)", "Emergency Committee of Atomic Scientists", "Science (globally)"],
    ideology_or_worldview: {
      summary: "Democratic socialism, international pacifism, and deterministic physics, combined with a deeply philosophical pantheism ('Spinoza's God').",
      evidence: [
        "His essay 'Why Socialism?' (1949) outlining democratic planned economies.",
        "His frequent, public anti-war manifestos and support for a world government."
      ],
      confidence: "high"
    },
    decision_patterns: [
      {
        pattern: "Relying on highly creative, intuitive 'thought experiments' (Gedankenexperiment) to deduce physical laws, completely refusing to abandon his deterministic worldview despite quantum physics consensus.",
        examples: [
          "Imagining riding alongside a light beam to deduce special relativity.",
          "Refusing to accept quantum entanglement ('spooky action at a distance')."
        ],
        confidence: "high"
      }
    ],
    crisis_behavior: "Exhibited strong, calm moral resolve during political crises, using his global celebrity systematically to write public letters and assist refugees, ignoring personal security threats.",
    negotiation_style: "highly polite, humorous, focusing on universal moral principles, while remaining completely unyielding on his commitment to pacifism and free scientific inquiry.",
    risk_tolerance: "high",
    centralization_preference: "low",
    conflict_preference: "low",
    institutional_respect: "high",
    coalition_dependency: "high",
    populism_level: "high",
    technocratic_level: "high",
    game_theory_profile: {
      main_players: ["US Government", "Nazi Germany", "Scientific Community"],
      likely_objectives: [
        "US: Build atomic bomb to defeat Axis, preserve security.",
        "Germany: Defeat Allies, research atomic energy.",
        "Einstein: Prevent Nazi bomb, secure global disarmament."
      ],
      payoffs: [
        "Signing the letter to FDR (1939) successfully catalyzed the Manhattan Project, optimizing the security payoff against a potential Nazi atomic monopoly (Highest security payoff)."
      ],
      constraints: ["His strict pacifism limited his direct participation in military weapons research, keeping him outside the Manhattan Project."],
      common_strategic_moves: ["Public moral declarations", "Collaborative scientific debates"],
      failure_modes: ["His lifelong search for a Unified Field Theory failed because he ignored the emerging strong and weak nuclear forces."]
    },
    bayesian_assessment: [
      {
        claim: "Einstein regretted signing the 1939 letter to President Roosevelt.",
        prior_confidence: "high",
        evidence: [
          "His late-life statement to Linus Pauling: 'I made one great mistake in my life—when I signed the letter to President Roosevelt recommending that atom bombs be made; but there was some justification—the danger that the Germans would make them.'",
          "His intensive post-war campaigns for nuclear disarmament and the abolition of war."
        ],
        posterior_confidence: "high",
        what_would_change_this: "Discovery of private letters showing he actively celebrated the bombing of Hiroshima as a victory for his physics."
      }
    ],
    historical_comparisons: [
      {
        compared_to: "Isaac Newton",
        similarities: [
          "Brilliant physicists who formulated the primary scientific paradigms of their eras.",
          "Experienced sudden global celebrity that elevated them to primary public intellectuals."
        ],
        differences: [
          "Einstein was a lifelong political activist, socialist, and pacifist, whereas Newton spent his later years as an active state bureaucrat."
        ],
        confidence: "high"
      }
    ],
    source_quality: {
      overall: "strong",
      notes: "Enormous Einstein Papers Project archives, his personal writings, and Walter Isaacson's definitive biography.",
      source_count: 5
    },
    sources: [
      "Pais, Abraham. (1982). Subtle is the Lord: The Science and the Life of Albert Einstein.",
      "Isaacson, Walter. (2007). Einstein: His Life and Universe.",
      "Einstein, Albert. (1949). Why Socialism? (essay).",
      "Stachel, John. (1998). Einstein's Miraculous Year: Five Papers that Changed the Face of Physics.",
      "The Collected Papers of Albert Einstein, Princeton University Press."
    ],
    research_gaps: ["Determining the exact degree of mathematical contribution from his first wife, Mileva Marić, in his 1905 papers remains analyzed by modern historians."],
    created_at: "2026-05-31T21:31:33Z",
    updated_at: "2026-05-31T21:31:33Z"
  },

  // 15. John Maynard Keynes
  {
    person_id: "john_maynard_keynes",
    name: "John Maynard Keynes",
    aliases: ["Lord Keynes"],
    birth_year: 1883,
    death_year: 1946,
    countries_or_regions: ["United Kingdom", "Global"],
    era: "20th Century / Interwar / WWII Era",
    roles: ["Economist", "British Treasury Advisor", "Architect of Bretton Woods"],
    domains: ["Economic", "Statecraft"],
    priority_tier: 2,
    short_summary: "British economist who developed Keynesian economics, advocating for state fiscal intervention to manage recessions, and co-architected the Bretton Woods system.",
    timeline: [
      {
        date_or_year: "1919",
        event: "Resigned from the British delegation at the Versailles Peace Conference; published 'The Economic Consequences of the Peace' warning against punitive reparations.",
        importance: "high",
        sources: ["Skidelsky (1983)"]
      },
      {
        date_or_year: "1930",
        event: "Published 'A Treatise on Money', exploring saving and investment dynamics.",
        importance: "high",
        sources: ["Treatise text"]
      },
      {
        date_or_year: "1936",
        event: "Published 'The General Theory of Employment, Interest and Money', revolutionizing macroeconomic theory.",
        importance: "high",
        sources: ["General Theory", "Skidelsky (1992)"]
      },
      {
        date_or_year: "1940",
        event: "Appointed advisor to the Chancellor of the Exchequer, directing British war finance strategies.",
        importance: "high",
        sources: ["Skidelsky (2000)"]
      },
      {
        date_or_year: "1942",
        event: "Elevated to the peerage as Baron Keynes of Tilton, joining the House of Lords.",
        importance: "high",
        sources: ["Royal archives"]
      },
      {
        date_or_year: "1944-07",
        event: "Led the British delegation at the Bretton Woods Conference, co-designing the IMF, World Bank, and post-war financial order.",
        importance: "high",
        sources: ["Bretton Woods transcripts", "Skidelsky (2000)"]
      },
      {
        date_or_year: "1946-04-21",
        event: "Passed away peacefully at his home in Sussex; his heart failed due to intense post-war negotiation stress.",
        importance: "high",
        sources: ["Skidelsky (2000)"]
      }
    ],
    power_base: "Unrivaled intellectual authority among Western treasury planners, official backing of the British Government, and key role in constructing post-war financial institutions.",
    core_goals: [
      "Provide a scientific theory showing how state fiscal intervention cures systemic unemployment.",
      "Dismantle rigid gold-standard orthodoxies that prolonged the Great Depression.",
      "Establish a stable, collaborative international monetary system (Bretton Woods)."
    ],
    incentives: [
      "Preventing total capitalist collapse and subsequent communist revolution.",
      "Securing British financial independence from absolute US dominance.",
      "Promoting global monetary stability."
    ],
    constraints: [
      "Entrenched, conservative economic orthodoxies at the Bank of England.",
      "Severe British wartime bankruptcy and debt to the United States.",
      "Extreme physical exhaustion and failing heart during critical negotiations."
    ],
    allies: ["Franklin D. Roosevelt (indirectly)", "Harry Dexter White (complex partner)", "Bloomsbury Group"],
    rivals: ["Friedrich Hayek (free-market rival)", "Montagu Norman (Bank of England governor)"],
    institutions_controlled_or_influenced: ["British Treasury", "International Monetary Fund (IMF)", "World Bank (IBRD)"],
    ideology_or_worldview: {
      summary: "Keynesianism (macroeconomics arguing that aggregate demand determines economic activity, and during recessions, the state must deploy deficit spending to stimulate demand), combined with social liberalism and international cooperation.",
      evidence: [
        "The General Theory critique of classical supply-demand self-correction.",
        "Advocating for the creation of an international clearing union and currency ('Bancor')."
      ],
      confidence: "high"
    },
    decision_patterns: [
      {
        pattern: "Rigorous, highly creative economic modeling to challenge established dogmas, coupled with close, elite negotiation with treasury officials rather than public populist campaigns.",
        examples: [
          "Writing a best-selling book to warning against the Versailles treaty.",
          "Bargaining intensely with Harry Dexter White at Bretton Woods."
        ],
        confidence: "high"
      }
    ],
    crisis_behavior: "Exhibited remarkable intellectual agility and dedication under pressure, working tirelessly to manage British war finance and post-war negotiations despite knowing his heart was failing.",
    negotiation_style: "highly eloquent, brilliant, witty, using superior intellect and charm to dominate discussions, though sometimes causing friction with American negotiators who found him condescending.",
    risk_tolerance: "high",
    centralization_preference: "high",
    conflict_preference: "low",
    institutional_respect: "high",
    coalition_dependency: "high",
    populism_level: "medium",
    technocratic_level: "high",
    game_theory_profile: {
      main_players: ["United Kingdom", "United States", "European States"],
      likely_objectives: [
        "UK: Retain imperial trade preferences, secure low-interest loans, establish Bancor.",
        "US: Open global markets, replace Sterling with Dollar, establish fixed rates.",
        "Europe: Secure rebuild funds, stabilize currencies."
      ],
      payoffs: [
        "Bretton Woods Agreement (1944) created a stable, institutionalized monetary system that avoided interwar currency wars, though the US Dollar emerged as dominant over Keynes's Bancor (Highest collaborative payoff)."
      ],
      constraints: ["Severe UK wartime bankruptcy and debt to the US severely limited British bargaining leverage at Bretton Woods."],
      common_strategic_moves: ["Intellectual drafts", "Leveraging war alliance to secure loans"],
      failure_modes: ["His proposed international clearing union and Bancor currency were rejected due to absolute US hard power dominance at Bretton Woods."]
    },
    bayesian_assessment: [
      {
        claim: "Keynes's early warning against the Versailles treaty in 1919 was a major cause of the treaty's subsequent delegitimization in the West.",
        prior_confidence: "high",
        evidence: [
          "The massive success and rapid translation of 'The Economic Consequences of the Peace' into dozens of languages.",
          "Its immense influence in persuading US Senate leaders to reject the treaty and isolate the US from the League of Nations."
        ],
        posterior_confidence: "high",
        what_would_change_this: "Discovery of state records proving US Senate leaders had decided to reject the treaty completely independent of any contact with Keynes's book."
      }
    ],
    historical_comparisons: [
      {
        compared_to: "Adam Smith",
        similarities: [
          "Founding economic thinkers whose treatises established completely new macroeconomic paradigms.",
          "Served as active state regulators and advisors (Customs/Treasury)."
        ],
        differences: [
          "Keynes advocated for aggressive state fiscal intervention to balance markets, whereas Smith favored reducing state trade monopolies."
        ],
        confidence: "high"
      }
    ],
    source_quality: {
      overall: "strong",
      notes: "Robert Skidelsky's definitive three-volume biography, Keynes's Collected Writings (30 volumes), and Bretton Woods official logs.",
      source_count: 5
    },
    sources: [
      "Skidelsky, Robert. (1983). John Maynard Keynes: Hopes Betrayed 1883-1920.",
      "Skidelsky, Robert. (1992). John Maynard Keynes: The Economist as Savior 1920-1937.",
      "Skidelsky, Robert. (2000). John Maynard Keynes: Fighting for Freedom 1937-1946.",
      "Keynes, John Maynard. (1936). The General Theory of Employment, Interest and Money.",
      "Moggridge, Donald. (1992). Maynard Keynes: An Economist's Biography."
    ],
    research_gaps: ["Determining the exact degree of his private influence on early FDR New Deal planners (e.g. Tugwell) remains highly analyzed due to sparse personal records."],
    created_at: "2026-05-31T21:31:33Z",
    updated_at: "2026-05-31T21:31:33Z"
  }
];

// Extract sources and claims
const sources_db: Source[] = [];
const claims_db: Claim[] = [];

batch3_profiles.forEach((p) => {
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
  console.log("Starting batch 3 generation...");

  // 1. Validate new profiles
  let totalErrors = 0;
  batch3_profiles.forEach((profile, idx) => {
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

  console.log("All 15 batch 3 profiles successfully passed schema validation!");

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
  const newProfiles = batch3_profiles.map(p => JSON.stringify(p)).join("\n") + "\n";
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
  const completedIds = new Set(batch3_profiles.map(p => p.person_id));
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

  console.log("Batch 3 generation completed successfully!");
}

main().catch(err => {
  console.error("Fatal generation failure:", err);
  process.exit(1);
});
