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

const batch7_profiles: any[] = [
  // 1. Thomas Hobbes
  {
    person_id: "thomas_hobbes",
    name: "Thomas Hobbes",
    aliases: ["The Philosopher of Malmesbury", "Hobbes of Malmesbury"],
    birth_year: 1588,
    death_year: 1679,
    countries_or_regions: ["England", "Europe"],
    era: "17th Century / English Civil War / Age of Enlightenment",
    roles: ["Political Philosopher", "Scholar", "Tutor"],
    domains: ["Philosophy", "Geopolitics", "Statecraft"],
    priority_tier: 2,
    short_summary: "English political philosopher best known for his 1651 book Leviathan, which established the social contract theory and argued for absolute sovereign rule to prevent the chaos of the state of nature.",
    timeline: [
      {
        date_or_year: "1640",
        event: "Fled England to Paris ahead of the English Civil War, anticipating political persecution for his royalist-aligned writings.",
        importance: "medium",
        sources: ["Malcolm (2002)", "Martinich (1999)"]
      },
      {
        date_or_year: "1646",
        event: "Appointed mathematical tutor to the exiled Prince of Wales (the future Charles II) in Paris.",
        importance: "medium",
        sources: ["Martinich (1999)"]
      },
      {
        date_or_year: "1651",
        event: "Published Leviathan in London, developing his landmark theory of the social contract and absolute political sovereignty.",
        importance: "high",
        sources: ["Hobbes (1651)", "Malcolm (2002)"]
      },
      {
        date_or_year: "1652",
        event: "Returned to London and submitted to the English Commonwealth government under Oliver Cromwell.",
        importance: "medium",
        sources: ["Martinich (1999)"]
      },
      {
        date_or_year: "1666",
        event: "Faced investigation by the House of Commons under a bill against atheism and profaneness, causing him to suppress several of his writings.",
        importance: "high",
        sources: ["Malcolm (2002)", "Skinner (1996)"]
      }
    ],
    power_base: "Intellectual influence through royal patronage (Charles II), political leverage with conservative thinkers, and enduring philosophical writings that provided the secular justification for modern state authority.",
    core_goals: [
      "Avoid the catastrophic violence, disorder, and civil war of the 'state of nature'.",
      "Construct a secular, rational theory of political legitimacy based on self-preservation.",
      "Defend the necessity of an undivided, absolute sovereign power to guarantee domestic security."
    ],
    incentives: [
      "The trauma of witnessing the English Civil War and the breakdown of social order.",
      "The pursuit of personal security and protection from religious and political persecution.",
      "A desire to place political science on a mathematical and deductive basis."
    ],
    constraints: [
      "Deeply unpopular among both radical parliamentarians (for his absolutism) and royalists (for his secular, contractarian view of rule).",
      "Constant threat of censorship and prosecution for heresy by church authorities.",
      "Logistical reliance on wealthy noble patrons, particularly the Cavendish family."
    ],
    allies: ["King Charles II", "William Cavendish (Earl of Devonshire)", "Marin Mersenne"],
    rivals: ["John Bramhall (theological rival)", "Edward Hyde (Earl of Clarendon)", "Parliamentary Republican Factions"],
    institutions_controlled_or_influenced: ["Royal Court of England (informally)", "Modern Political Philosophy", "Secular Jurisprudence"],
    ideology_or_worldview: {
      summary: "Materialist, secular absolutism based on the social contract. Argued that humans are naturally self-interested and competitive, and must surrender their natural rights to a single absolute sovereign in exchange for security and civil peace.",
      evidence: [
        "Leviathan's famous characterization of human life in the state of nature as 'solitary, poor, nasty, brutish, and short'.",
        "The rejection of the divine right of kings in favor of a rationalist contract based on mutual preservation."
      ],
      confidence: "high"
    },
    decision_patterns: [
      {
        pattern: "Tactical pragmatism and submission to de facto rulers of any faction to ensure his own survival and keep publishing.",
        examples: [
          "Fleeing to Paris when parliamentarians rose to power, and returning to submit to Cromwell when royalist exile became unsafe.",
          "Accepting the protection of Charles II while agreeing to cease publishing controversial theological works."
        ],
        confidence: "high"
      }
    ],
    crisis_behavior: "Cautious and highly self-preservational; actively avoided direct martyrdom, preferring intellectual retreat and strategic exile when physical safety was threatened.",
    negotiation_style: "Intellectually unyielding but politically compliant; defended his theories with rigorous logical proofs in debate while submitting to civil authorities when required.",
    risk_tolerance: "low",
    centralization_preference: "high",
    conflict_preference: "low",
    institutional_respect: "high",
    coalition_dependency: "low",
    populism_level: "low",
    technocratic_level: "high",
    game_theory_profile: {
      main_players: ["Absolute Sovereign (Leviathan)", "Individual Citizens in State of Nature"],
      likely_objectives: [
        "Sovereign: Maintain undivided authority, prevent rebellion, enforce peace.",
        "Citizens: Maximize personal security, avoid violent death, escape the state of nature."
      ],
      payoffs: [
        "Mutual Submission to Leviathan: By surrendering their right of nature, all citizens reach a Nash equilibrium where the payoff of domestic security outweighs the loss of absolute personal freedom (Highest rational payoff)."
      ],
      constraints: ["A sovereign who fails to protect the lives of the citizens violates the core contract, restoring the citizens' natural right to self-defense."],
      common_strategic_moves: ["Enforcing common laws", "Secularizing state authority", "Preemptive disarmament of factions"],
      failure_modes: ["Division of sovereign power, which inevitably leads to domestic factions, instability, and civil war."]
    },
    bayesian_assessment: [
      {
        claim: "Thomas Hobbes was a secret atheist who wrote Leviathan to undermine Christian theology.",
        prior_confidence: "medium",
        evidence: [
          "Leviathan's highly materialist description of spirits and angels, and his view that the church must be fully subordinate to the civil state.",
          "His extensive, sincere biblical exegesis and his insistence that obedience to the Christian sovereign is a fundamental religious duty."
        ],
        posterior_confidence: "low",
        what_would_change_this: "Discovery of private papers showing Hobbes explicitly admitting that his religious arguments were a deliberate facade to escape prosecution."
      }
    ],
    historical_comparisons: [
      {
        compared_to: "John Locke",
        similarities: [
          "Both utilized the social contract framework and the concept of the state of nature.",
          "Both sought a rationalist, secular basis for political legitimacy."
        ],
        differences: [
          "Hobbes argued that sovereignty must be absolute and indivisible to prevent chaos, whereas Locke advocated for limited government, division of powers, and the right to revolution."
        ],
        confidence: "high"
      }
    ],
    source_quality: {
      overall: "strong",
      notes: "Enormous volume of philosophical literature, critical editions of his complete works by Noel Malcolm, and definitive biographies.",
      source_count: 5
    },
    sources: [
      "Hobbes, Thomas. (1651). Leviathan.",
      "Malcolm, Noel. (2002). Aspects of Hobbes.",
      "Martinich, A. P. (1999). Hobbes: A Biography.",
      "Skinner, Quentin. (1996). Reason and Rhetoric in the Philosophy of Hobbes.",
      "Tuck, Richard. (1989). Hobbes."
    ],
    research_gaps: ["Debates continue regarding the exact extent to which Hobbes's exile in France influenced his materialist physics and philosophy."],
    created_at: "2026-05-31T18:20:00Z",
    updated_at: "2026-05-31T18:20:00Z"
  },

  // 2. Niccolò Machiavelli
  {
    person_id: "niccolo_machiavelli",
    name: "Niccolò Machiavelli",
    aliases: ["The Father of Modern Political Theory", "Machiavelli"],
    birth_year: 1469,
    death_year: 1527,
    countries_or_regions: ["Florence", "Italy", "Europe"],
    era: "15th / 16th Century / Italian Renaissance",
    roles: ["Diplomat", "Political Philosopher", "Chancellor", "Writer"],
    domains: ["Philosophy", "Geopolitics", "Statecraft", "Military"],
    priority_tier: 1,
    short_summary: "Florentine diplomat and political philosopher who founded modern political science by analyzing power, statecraft, and military strategy as they are, rather than as they should be, famously detailed in The Prince.",
    timeline: [
      {
        date_or_year: "1498",
        event: "Appointed Second Chancellor of the Republic of Florence, managing diplomatic missions and military organization.",
        importance: "high",
        sources: ["Skinner (1981)", "Viroli (2000)"]
      },
      {
        date_or_year: "1506",
        event: "Organized the Florentine citizen militia, rejecting the reliance on unreliable foreign mercenaries.",
        importance: "high",
        sources: ["Skinner (1981)"]
      },
      {
        date_or_year: "1512",
        event: "Deposed, imprisoned, and tortured by the returning Medici family following the collapse of the Florentine Republic.",
        importance: "high",
        sources: ["Viroli (2000)"]
      },
      {
        date_or_year: "1513",
        event: "Exiled to his farm in Sant'Andrea in Percussina; wrote The Prince in an attempt to regain political favor.",
        importance: "high",
        sources: ["Machiavelli (1513)", "Skinner (1981)"]
      },
      {
        date_or_year: "1517",
        event: "Completed the Discourses on Livy, outlining his deep republican philosophy and devotion to civic liberty.",
        importance: "high",
        sources: ["Machiavelli (1531)", "Viroli (2000)"]
      }
    ],
    power_base: "Intellectual legacy as the master builder of realpolitik, early administrative influence as Florentine chancellor, and his pioneering analysis of civil-military relations.",
    core_goals: [
      "Liberate Italy from foreign 'barbarian' occupiers (French, Spanish, and German imperial forces).",
      "Construct a stable, resilient Florentine state based on citizen armies and civic virtue (virtù).",
      "Analyze the concrete, empirical rules of statecraft and power acquisition without moralizing illusions."
    ],
    incentives: [
      "The extreme instability, corruption, and military vulnerability of the Italian city-states.",
      "The personal trauma of his imprisonment, torture, and forced political exclusion.",
      "A desire to restore the civic strength and military glory of the ancient Roman Republic."
    ],
    constraints: [
      "Lack of personal wealth or high noble pedigree, forcing reliance on political patrons.",
      "Deep suspicion from the Medici rulers who viewed him as a republican conspirator.",
      "The rapid fragmentation and chaotic alliances of the Italian geopolitical landscape."
    ],
    allies: ["Piero Soderini (Gonfaloniere of Florence)", "Francesco Vettori", "Francesco Guicciardini"],
    rivals: ["The Medici Family (initially)", "Pope Julius II", "Foreign Mercenary Captains (Condottieri)"],
    institutions_controlled_or_influenced: ["Chancery of the Florentine Republic", "Modern Geopolitics", "Military Science"],
    ideology_or_worldview: {
      summary: "Realist republicanism. While widely known for advising absolute rulers in The Prince, his core ideology was a passionate civic republicanism that advocated for a free, self-governing citizenry, check-and-balance institutions, and a citizen militia.",
      evidence: [
        "The Prince's assertion that a ruler must learn 'how not to be good' to preserve the state in a corrupt world.",
        "The Discourses on Livy's extensive arguments that the liberty of a republic is preserved by the conflict between the nobility and the common people."
      ],
      confidence: "high"
    },
    decision_patterns: [
      {
        pattern: "Analytical empiricism; drawing strict geopolitical lessons from historical examples (primarily ancient Rome) to solve immediate modern crises.",
        examples: [
          "Using Roman military structures to reform the Florentine militia.",
          "Analyzing Cesare Borgia's ruthless elimination of rivals as a necessary model for state consolidation."
        ],
        confidence: "high"
      }
    ],
    crisis_behavior: "Pragmatic, philosophical, and resilient; channeled his personal ruin and political exile into writing the foundational texts of modern political science.",
    negotiation_style: "Diplomatic, highly observant, and satirical; used sharp psychological insights to navigate interactions with powerful tyrants and foreign kings.",
    risk_tolerance: "medium",
    centralization_preference: "medium",
    conflict_preference: "medium",
    institutional_respect: "high",
    coalition_dependency: "high",
    populism_level: "medium",
    technocratic_level: "high",
    game_theory_profile: {
      main_players: ["The Prince / Sovereign", "Rival Geopolitical Powers", "The Nobles", "The Common People"],
      likely_objectives: [
        "Prince: Maintain the state (mantenere lo stato), secure personal glory.",
        "Nobles: Dominate and oppress the common people.",
        "Common People: Avoid domination and retain their liberty."
      ],
      payoffs: [
        "Aligning with the Common People: A prince who builds his power base on the populace rather than the nobility achieves a more stable equilibrium, as the people's demands are more moderate and their loyalty is more reliable (Highest security payoff)."
      ],
      constraints: ["The unpredictable power of Fortune (Fortuna), which can only be checked by proactive strategic preparation (virtù)."],
      common_strategic_moves: ["Strategic ruthlessness", "Establishing citizen armies", "Cultivating fear without hatred"],
      failure_modes: ["Relying on foreign mercenary forces, which are inherently cowardly, greedy, and unfaithful."]
    },
    bayesian_assessment: [
      {
        claim: "The Prince was a satirical document intended to warn republicans about the methods of tyrants.",
        prior_confidence: "low",
        evidence: [
          "His clear republican convictions in the Discourses on Livy, and his dedication of The Prince to a Medici ruler in a desperate attempt to get a job.",
          "The serious tone of the work, his letters to Vettori expressing his genuine hope that it would be read by the Medici, and the consistency of its underlying realism with his other works."
        ],
        posterior_confidence: "low",
        what_would_change_this: "Discovery of a private letter in which Machiavelli explicitly states that The Prince was a parody designed to mock political absolutism."
      }
    ],
    historical_comparisons: [
      {
        compared_to: "Thomas Hobbes",
        similarities: [
          "Both rejected traditional theological morality in favor of secular, realistic analyses of political power.",
          "Both viewed the state as a necessary construct to enforce order and security."
        ],
        differences: [
          "Machiavelli advocated for republican liberty and citizen participation as the highest state ideal, while Hobbes insisted on absolute, undivided monarchical or sovereign power."
        ],
        confidence: "high"
      }
    ],
    source_quality: {
      overall: "strong",
      notes: "Rich diplomatic dispatches, personal letters, his major works, and highly thorough Renaissance historiography.",
      source_count: 5
    },
    sources: [
      "Machiavelli, Niccolò. (1513). The Prince.",
      "Machiavelli, Niccolò. (1531). Discourses on Livy.",
      "Skinner, Quentin. (1881). Machiavelli: A Very Short Introduction.",
      "Viroli, Maurizio. (2000). Niccolò's Smile: A Biography of Machiavelli.",
      "Gilbert, Felix. (1965). Machiavelli and Guicciardini."
    ],
    research_gaps: ["Debates persist regarding the exact timing of his transition from diplomatic official to political philosopher during his early exile."],
    created_at: "2026-05-31T18:20:00Z",
    updated_at: "2026-05-31T18:20:00Z"
  },

  // 3. Queen Victoria
  {
    person_id: "queen_victoria",
    name: "Queen Victoria",
    aliases: ["Alexandrina Victoria", "Grandmother of Europe", "Empress of India"],
    birth_year: 1819,
    death_year: 1901,
    countries_or_regions: ["United Kingdom", "Europe", "British Empire"],
    era: "19th Century / Victorian Era / Pax Britannica",
    roles: ["Queen of the United Kingdom", "Empress of India", "Monarch"],
    domains: ["Geopolitics", "Statecraft"],
    priority_tier: 1,
    short_summary: "Queen of Great Britain and Ireland and Empress of India whose 63-year reign oversaw the zenith of the British Empire, the Industrial Revolution, and the sweeping expansion of British global influence.",
    timeline: [
      {
        date_or_year: "1837-06-20",
        event: "Ascended the British throne at age 18 following the death of her uncle William IV.",
        importance: "high",
        sources: ["St Aubyn (1991)", "Strachey (1921)"]
      },
      {
        date_or_year: "1840-02-10",
        event: "Married Prince Albert of Saxe-Coburg and Gotha, initiating a profound political and personal partnership.",
        importance: "high",
        sources: ["St Aubyn (1991)"]
      },
      {
        date_or_year: "1861-12-14",
        event: "Devastated by the death of Prince Albert; entered a deep state of mourning and withdrew from public life for years.",
        importance: "high",
        sources: ["St Aubyn (1991)", "Strachey (1921)"]
      },
      {
        date_or_year: "1876-05-01",
        event: "Proclaimed Empress of India under the Royal Titles Act engineered by Prime Minister Benjamin Disraeli.",
        importance: "high",
        sources: ["St Aubyn (1991)", "Wilson (2014)"]
      },
      {
        date_or_year: "1897",
        event: "Celebrated her Diamond Jubilee, marking 60 years on the throne and demonstrating the global power of the British Empire.",
        importance: "high",
        sources: ["Wilson (2014)"]
      }
    ],
    power_base: "Constitutional legitimacy as monarch of the world's preeminent industrial and imperial superpower, massive domestic and imperial popularity, and a vast dynastic network of children married into Europe's royal families.",
    core_goals: [
      "Maintain the global prestige, security, and territorial integrity of the British Empire.",
      "Preserve the constitutional authority and influence of the British Crown within a democratic parliament.",
      "Foster moral, industrial, and social stability across British society."
    ],
    incentives: [
      "A deep sense of duty and divine right to rule.",
      "The influence of Prince Albert's progressive, technocratic, and family-oriented values.",
      "Defending British interests against rival European empires (Germany, Russia, and France)."
    ],
    constraints: [
      "The constitutional limits of the British monarchy, requiring her to act through prime ministers and parliament.",
      "Frequent republican sentiment and public criticism of her long withdrawal after Albert's death.",
      "The delicate task of managing complex, highly volatile European dynastic alliances."
    ],
    allies: ["Prince Albert", "Lord Melbourne (early advisor)", "Benjamin Disraeli", "John Brown"],
    rivals: ["William Ewart Gladstone (frequent political clash)", "Tsar Alexander III of Russia", "Kaiser Wilhelm II (grandson/rival)"],
    institutions_controlled_or_influenced: ["British Empire", "British Royal Family", "Parliament of the United Kingdom"],
    ideology_or_worldview: {
      summary: "Constitutional monarchism, imperialism, and high moral domesticity. Believed in the civilizing mission of the British Empire, respected constitutional limits while vigorously exerting behind-the-scenes influence, and championed strict moral standards.",
      evidence: [
        "Vigorous opposition to Gladstone's Irish Home Rule policy.",
        "The personal styling of herself as the 'mother' of her empire and the global arbiter of royal morality."
      ],
      confidence: "high"
    },
    decision_patterns: [
      {
        pattern: "Behind-the-scenes political lobbying; writing voluminous letters and journals to guide and pressure her prime ministers.",
        examples: [
          "Warmly supporting Disraeli's expansionist foreign policies while treating Gladstone's reforms with open hostility.",
          "Using her extensive family network to mediate diplomatic tensions between Germany, Russia, and the UK."
        ],
        confidence: "high"
      }
    ],
    crisis_behavior: "Resilient and dutiful; returned to public duties during major empire crises (e.g. the Indian Rebellion of 1857, the Boer War) to rally national morale.",
    negotiation_style: "Paternal, formal, and authoritative; relied on her immense moral weight, age, and family status to influence British politicians and foreign monarchs.",
    risk_tolerance: "low",
    centralization_preference: "medium",
    conflict_preference: "low",
    institutional_respect: "high",
    coalition_dependency: "high",
    populism_level: "low",
    technocratic_level: "medium",
    game_theory_profile: {
      main_players: ["British Crown (Victoria)", "Prime Minister (Gladstone/Disraeli)", "Rival European Empires"],
      likely_objectives: [
        "Victoria: Maintain imperial unity, preserve royal veto/influence, prevent republicanism.",
        "Prime Minister: Secure parliamentary majorities, manage public budgets, pass reforms.",
        "European Powers: Expand colonies, challenge British naval supremacy."
      ],
      payoffs: [
        "Royal Titles Act (1876): Crowned Empress of India, which successfully maximized imperial prestige and bound Indian elites directly to the Crown, yielding a high geopolitical payoff at low administrative cost (Highest payoff)."
      ],
      constraints: ["Direct royal intervention in parliamentary votes would trigger a constitutional crisis and strengthen republican factions."],
      common_strategic_moves: ["Voluminous private correspondence", "Exerting soft social influence", "Strategic dynastic marriages"],
      failure_modes: ["Over-reliance on personal favorites, which occasionally alienated cabinet members and harmed public standing."]
    },
    bayesian_assessment: [
      {
        claim: "Queen Victoria completely withdrew from political decision-making after Prince Albert's death.",
        prior_confidence: "low",
        evidence: [
          "Her refusal to appear at public state openings for several years and her isolation at Balmoral and Osborne.",
          "Her massive daily output of political memoranda, her intense, hostile interference in Gladstone's foreign policy, and her active role in military appointments during the Boer War."
        ],
        posterior_confidence: "low",
        what_would_change_this: "Discovery of cabinet records proving that prime ministers completely ignored all royal communications after 1861 with zero political consequence."
      }
    ],
    historical_comparisons: [
      {
        compared_to: "Elizabeth I",
        similarities: [
          "Powerful female monarchs who gave their names to eras of massive national expansion, cultural flourishing, and global influence.",
          "Both faced deep structural challenges regarding female political authority in male-dominated systems."
        ],
        differences: [
          "Elizabeth I ruled as an absolute monarch with direct executive control, whereas Victoria operated within a highly developed constitutional system dominated by Parliament."
        ],
        confidence: "high"
      }
    ],
    source_quality: {
      overall: "strong",
      notes: "Vast primary materials, including her complete published journals (141 volumes), extensive political letters, and deep academic historiography.",
      source_count: 5
    },
    sources: [
      "St Aubyn, Giles. (1991). Queen Victoria: A Portrait.",
      "Strachey, Lytton. (1921). Queen Victoria.",
      "Wilson, A. N. (2014). Victoria: A Life.",
      "Victoria, Queen. (Letters). The Letters of Queen Victoria (Multiple volumes).",
      "Weintraub, Stanley. (1987). Victoria: An Intimate Biography."
    ],
    research_gaps: ["Debates persist on the exact degree of her political influence on the foreign policy decisions of Disraeli's second administration."],
    created_at: "2026-05-31T18:20:00Z",
    updated_at: "2026-05-31T18:20:00Z"
  },

  // 4. Louis XIV
  {
    person_id: "louis_xiv",
    name: "Louis XIV",
    aliases: ["Louis the Great", "The Sun King", "Louis le Grand"],
    birth_year: 1638,
    death_year: 1715,
    countries_or_regions: ["France", "Europe"],
    era: "17th / 18th Century / Absolute Monarchy / Golden Age of France",
    roles: ["King of France", "Monarch"],
    domains: ["Geopolitics", "Statecraft", "Warfare"],
    priority_tier: 1,
    short_summary: "King of France who ruled for 72 years, centralized state authority, constructed the Palace of Versailles to control the nobility, and established France as the dominant geopolitical and cultural power in Europe.",
    timeline: [
      {
        date_or_year: "1643-05-14",
        event: "Ascended the throne at age 4 under the regency of his mother Anne of Austria and Cardinal Mazarin.",
        importance: "medium",
        sources: ["Bluche (1986)", "Wilkinson (2001)"]
      },
      {
        date_or_year: "1648-1653",
        event: "Survived the Fronde civil wars, a traumatizing series of rebellions by the high nobility that shaped his desire for absolute control.",
        importance: "high",
        sources: ["Bluche (1986)"]
      },
      {
        date_or_year: "1661-03-09",
        event: "Assumed direct personal rule following the death of Cardinal Mazarin, declaring he would govern without a prime minister.",
        importance: "high",
        sources: ["Bluche (1986)", "Wilkinson (2001)"]
      },
      {
        date_or_year: "1682-05-06",
        event: "Formally moved the royal court to the Palace of Versailles, establishing a highly controlled domestic system of court etiquette to domesticate the nobility.",
        importance: "high",
        sources: ["Bluche (1986)", "Burke (1992)"]
      },
      {
        date_or_year: "1685-10-22",
        event: "Issued the Edict of Fontainebleau (Revocation of the Edict of Nantes), outlawing Protestantism and causing massive Huguenot emigration.",
        importance: "high",
        sources: ["Bluche (1986)", "Wilkinson (2001)"]
      },
      {
        date_or_year: "1701-1714",
        event: "Led France through the War of the Spanish Succession, securing the Spanish throne for his grandson Philip V but leaving France deeply in debt.",
        importance: "high",
        sources: ["Lynn (1999)"]
      }
    ],
    power_base: "The divine right of kings, a centralized administrative bureaucracy managed by loyal middle-class technocrats, the largest standing army in Europe, and absolute control over the high aristocracy via the court system of Versailles.",
    core_goals: [
      "Achieve absolute political and administrative centralization within the French state ('L'état, c'est moi').",
      "Expand France's borders to its 'natural frontiers' (Rhine, Alps, Pyrenees) through aggressive warfare.",
      "Establish France as the supreme cultural, artistic, and military hegemon of Europe."
    ],
    incentives: [
      "The trauma of the Fronde rebellions, which fueled a lifelong fear of aristocratic anarchy.",
      "The pursuit of personal glory (gloire) as the champion of the Catholic faith and the absolute state.",
      "Deterring encirclement of France by the Habsburg empires of Spain and Austria."
    ],
    constraints: [
      "Severe financial deficits caused by constant warfare and the construction of Versailles.",
      "The emergence of powerful European coalitions (the Grand Alliance) determined to preserve the balance of power.",
      "The economic loss of thousands of highly skilled Huguenot merchants and artisans who fled his religious purges."
    ],
    allies: ["Jean-Baptiste Colbert (finance genius)", "Marquis de Louvois (military reformer)", "Marshal Turenne"],
    rivals: ["William III of Orange (King of England/stadtholder)", "Emperor Leopold I of Austria", "Pope Innocent XI"],
    institutions_controlled_or_influenced: ["Kingdom of France", "Palace of Versailles", "Royal Academy of Sciences"],
    ideology_or_worldview: {
      summary: "Absolute divine-right monarchy and French classicism. Believed the king was God's direct representative on earth, possessed absolute sovereignty, and must project power through classical art, architecture, and military triumph.",
      evidence: [
        "His memoirs detailing the duty of kings to work systematically at the business of ruling.",
        "Versailles' highly calculated architecture, which positioned him as Apollo, the 'Sun King' around whom everything revolved."
      ],
      confidence: "high"
    },
    decision_patterns: [
      {
        pattern: "Highly methodical administrative micromanagement; holding regular, small ministerial councils and personally reviewing state correspondence every morning.",
        examples: [
          "Bypassing old noble bloodlines in favor of middle-class administrative intendants to collect taxes.",
          "Constructing the 'Pre Carré' double line of fortresses along France's northern borders."
        ],
        confidence: "high"
      }
    ],
    crisis_behavior: "Stoic, determined, and authoritative; during the catastrophic famine and military setbacks of the War of the Spanish Succession, he melted down royal silver to fund the army and appealed directly to the French people to maintain morale.",
    negotiation_style: "Imperial, grand, and uncompromising; negotiated from a position of absolute grandeur, using diplomatic treaties to systematically absorb frontier territories.",
    risk_tolerance: "high",
    centralization_preference: "high",
    conflict_preference: "high",
    institutional_respect: "high",
    coalition_dependency: "low",
    populism_level: "low",
    technocratic_level: "high",
    game_theory_profile: {
      main_players: ["French Monarchy (Louis XIV)", "The Aristocracy", "Rival European Coalition (William III)"],
      likely_objectives: [
        "Louis XIV: Centralize authority, annex frontier zones, dominate Europe.",
        "Aristocracy: Retain local feudal privileges, resist crown taxation.",
        "Rival Powers: Prevent French hegemony, protect territorial borders."
      ],
      payoffs: [
        "Versailles Domestic System: Forcing the high nobility to reside at Versailles and compete for trivial court favors successfully solved the coordination problem of aristocratic rebellion, trading feudal military power for court prestige (Highest domestic payoff)."
      ],
      constraints: ["The massive economic cost of constant warfare acted as a strict threat constraint that eventually forced him to sign compromises like the Treaty of Utrecht."],
      common_strategic_moves: ["Centralized taxation via intendants", "Fortress line construction", "Vigorous court patronage"],
      failure_modes: ["The Revocation of the Edict of Nantes, which severely damaged France's industrial base and alienated potential Protestant allies."]
    },
    bayesian_assessment: [
      {
        claim: "Louis XIV actually said the famous phrase 'L'état, c'est moi' (I am the state).",
        prior_confidence: "low",
        evidence: [
          "His extreme centralization of power and his absolute divine-right rhetoric in his memoirs.",
          "The absence of any contemporary parliament registry recording this phrase, and his verified deathbed words: 'I am going, but the State will always remain.'"
        ],
        posterior_confidence: "low",
        what_would_change_this: "Discovery of a contemporary, verified diary of a parliament member present at the April 13, 1655 session recording the exact phrase."
      }
    ],
    historical_comparisons: [
      {
        compared_to: "Qin Shi Huang",
        similarities: [
          "Absolute centralizers who systematically dismantled the military power of regional aristocrats and forced them to reside at the capital.",
          "Both projected supreme state authority through monumental construction projects."
        ],
        differences: [
          "Louis XIV operated within the legal and religious constraints of a Christian monarchy, whereas Qin Shi Huang ruled with unchecked Legalist autocracy."
        ],
        confidence: "high"
      }
    ],
    source_quality: {
      overall: "strong",
      notes: "Enormous state paper archives, Colbert's extensive records, Saint-Simon's highly detailed memoirs, and modern absolute state historiography.",
      source_count: 5
    },
    sources: [
      "Bluche, François. (1986). Louis XIV.",
      "Burke, Peter. (1992). The Fabrication of Louis XIV.",
      "Lynn, John A. (1999). The Wars of Louis XIV, 1667-1714.",
      "Saint-Simon, Duc de. (Memoirs). Memoirs of Louis XIV and the Regency.",
      "Wilkinson, Rich. (2001). Louis XIV, France and Europe 1640-1715."
    ],
    research_gaps: ["Debates persist on the exact degree of influence that his secret second wife, Madame de Maintenon, exerted over his religious policies in the 1680s."],
    created_at: "2026-05-31T18:20:00Z",
    updated_at: "2026-05-31T18:20:00Z"
  },

  // 5. Thomas Edison
  {
    person_id: "thomas_edison",
    name: "Thomas Alva Edison",
    aliases: ["The Wizard of Menlo Park", "Edison"],
    birth_year: 1847,
    death_year: 1931,
    countries_or_regions: ["United States", "Global"],
    era: "Late 19th / Early 20th Century / Second Industrial Revolution / Gilded Age",
    roles: ["Inventor", "Industrialist", "Entrepreneur"],
    domains: ["Science", "Econ", "Technology"],
    priority_tier: 2,
    short_summary: "American inventor and businessman who pioneered the modern industrial research laboratory, patented over 1,000 inventions including the phonograph, light bulb, and motion picture camera, and built the first commercial electrical grid.",
    timeline: [
      {
        date_or_year: "1869",
        event: "Patented the universal stock ticker, earning his first major financial windfall to fund full-time inventing.",
        importance: "medium",
        sources: ["Israel (1998)"]
      },
      {
        date_or_year: "1876",
        event: "Established the world's first industrial research laboratory at Menlo Park, New Jersey, institutionalizing cooperative invention.",
        importance: "high",
        sources: ["Israel (1998)", "Stross (2007)"]
      },
      {
        date_or_year: "1877-11-21",
        event: "Invented the phonograph, capturing worldwide fame as the 'Wizard of Menlo Park'.",
        importance: "high",
        sources: ["Israel (1998)"]
      },
      {
        date_or_year: "1879-10-22",
        event: "Developed a practical, long-lasting incandescent carbon filament light bulb in his laboratory.",
        importance: "high",
        sources: ["Stross (2007)", "Jehl (1937)"]
      },
      {
        date_or_year: "1882-09-04",
        event: "Switched on the Pearl Street Station electrical grid in New York City, launching the commercial electric utility industry.",
        importance: "high",
        sources: ["Stross (2007)"]
      },
      {
        date_or_year: "1888-1892",
        event: "Engaged in the brutal 'War of the Currents' against George Westinghouse's alternating current (AC), aggressively defending his direct current (DC) standard.",
        importance: "high",
        sources: ["Jonnes (2003)"]
      }
    ],
    power_base: "Control of the world's premier industrial R&D laboratory, massive financial backing from Wall Street (J.P. Morgan), a vast network of patents, and immense public prestige that guaranteed media coverage.",
    core_goals: [
      "Systematize and industrialize the process of technological invention.",
      "Build a complete, monopolistic commercial infrastructure for electric power, lighting, and communication.",
      "Achieve massive wealth and personal validation as the preeminent inventor of the modern era."
    ],
    incentives: [
      "The fierce, fast-paced commercial competition of the Gilded Age.",
      " Wall Street's demands for concrete, profitable industrial applications.",
      "An insatiable curiosity combined with a deep pride in his practical, non-academic style."
    ],
    constraints: [
      "Severe, lifelong hearing loss that limited his social interactions and guided his focus toward visual and mechanical technologies.",
      "The physical and strategic limits of Direct Current (DC) power transmission, which could not travel long distances.",
      "Frequent patent disputes and litigation that drained his time and capital."
    ],
    allies: ["J. P. Morgan (financier)", "Henry Ford (close friend/collaborator)", "Charles Batchelor (assistant)"],
    rivals: ["Nikola Tesla (former employee/rival)", "George Westinghouse (AC champion)", "Alexander Graham Bell (telephone competitor)"],
    institutions_controlled_or_influenced: ["Edison General Electric Company", "Menlo Park Laboratory", "West Orange Laboratory", "Motion Picture Patents Company"],
    ideology_or_worldview: {
      summary: "Utilitarian, commercial empiricism. Believed an invention was only valuable if it could be successfully sold to the mass market. Had zero respect for pure academic science without practical application, and pioneered team-based collaborative R&D.",
      evidence: [
        "His famous quote: 'Anything that won't sell, I don't want to invent. Its sale is proof of utility, and utility is success.'",
        "The complete structure of Menlo Park, which broke the romantic myth of the lone inventor in favor of factory-style teamwork."
      ],
      confidence: "high"
    },
    decision_patterns: [
      {
        pattern: "Brute-force empirical experimentation; systematically testing thousands of different physical materials until finding the one that worked.",
        examples: [
          "Testing over 6,000 different plant fibers (including carbonized bamboo) to find the ideal light bulb filament.",
          "Launching highly public, ruthless media campaigns (including electrocuting animals) to convince the public that Westinghouse's AC was deadly."
        ],
        confidence: "high"
      }
    ],
    crisis_behavior: "Tenacious, stubborn, and indefatigable; when his highly expensive iron ore mining venture collapsed in the 1890s, he calmly adapted his machinery to pioneer the modern Portland cement industry.",
    negotiation_style: "Aggressive, corporate, and patent-centric; utilized J.P. Morgan's financial muscle to buy out or legally crush competitors, seeking industry monopolies.",
    risk_tolerance: "high",
    centralization_preference: "high",
    conflict_preference: "high",
    institutional_respect: "medium",
    coalition_dependency: "medium",
    populism_level: "low",
    technocratic_level: "high",
    game_theory_profile: {
      main_players: ["Edison Electric", "Westinghouse Electric (Westinghouse/Tesla)", "Wall Street Financiers (Morgan)"],
      likely_objectives: [
        "Edison: Establish Direct Current (DC) as the absolute national grid standard, collect patent royalties.",
        "Westinghouse: Establish Alternating Current (AC) to transmit power cheaply over long distances.",
        "Morgan: Maximize return on investment, consolidate the chaotic electrical industry."
      ],
      payoffs: [
        "Consolidation into General Electric (1892): Morgan merged Edison General Electric with Thomson-Houston to adopt AC, side-lining Edison's stubborn DC opposition. While Edison lost personal control, the resulting corporation secured the dominant industry position, yielding massive long-term market payoffs (Highest industry payoff)."
      ],
      constraints: ["Edison's DC system was physically limited by the laws of thermodynamics from transmitting power beyond a one-mile radius without massive copper investment."],
      common_strategic_moves: ["Aggressive patent litigation", "Public safety scare campaigns", "Industrial consolidation mergers"],
      failure_modes: ["His stubborn, emotional refusal to accept the technical superiority of AC, which ultimately cost him direct control of General Electric."]
    },
    bayesian_assessment: [
      {
        claim: "Edison deliberately stole all of Nikola Tesla's major inventions and ideas.",
        prior_confidence: "low",
        evidence: [
          "Tesla's brief, unhappy employment at Edison's shop and their clash over DC/AC standards.",
          "Tesla's patents on AC polyphase motors being bought and commercialized by Westinghouse, not Edison, and the fact that Edison's primary inventions (phonograph, light bulb filament, motion picture camera) were developed by his own teams prior to or independently of Tesla."
        ],
        posterior_confidence: "low",
        what_would_change_this: "Discovery of private lab logs showing Edison's assistants copying Tesla's unique designs and passing them off as Edison's own patented work."
      }
    ],
    historical_comparisons: [
      {
        compared_to: "Benjamin Franklin",
        similarities: [
          "Brilliant, self-made American practical experimenters who achieved global fame for electricity research.",
          "Both were highly pragmatic, media-savvy, and focused on commercial applications."
        ],
        differences: [
          "Franklin viewed his inventions (like the lightning rod) as public domain gifts and refused to patent them, whereas Edison actively patended and corporate-defended every modification."
        ],
        confidence: "high"
      }
    ],
    source_quality: {
      overall: "strong",
      notes: "Massive Edison Archives at Rutgers University (over 5 million documents), laboratory logs, patent records, and excellent commercial histories.",
      source_count: 5
    },
    sources: [
      "Israel, Paul. (1998). Edison: A Life of Invention.",
      "Stross, Randall E. (2007). The Wizard of Menlo Park.",
      "Jonnes, Jill. (2003). Empires of Light: Edison, Tesla, Westinghouse, and the Race to Electrify the World.",
      "Jehl, Francis. (1937). Menlo Park Reminiscences.",
      "Baldwin, Neil. (1995). Edison: Inventing the Century."
    ],
    research_gaps: ["Determining the exact division of labor between Edison and his key laboratory assistants like Charles Batchelor on specific early patents remains challenging."],
    created_at: "2026-05-31T18:20:00Z",
    updated_at: "2026-05-31T18:20:00Z"
  },

  // 6. Max Weber
  {
    person_id: "max_weber",
    name: "Max Weber",
    aliases: ["Karl Emil Maximilian Weber", "Weber"],
    birth_year: 1864,
    death_year: 1920,
    countries_or_regions: ["Germany", "Europe"],
    era: "Late 19th / Early 20th Century / German Empire / WWI",
    roles: ["Sociologist", "Political Economist", "Philosopher", "Academic"],
    domains: ["Philosophy", "Social Reform", "Statecraft"],
    priority_tier: 2,
    short_summary: "German sociologist and political economist who co-founded modern sociology and analyzed the rise of bureaucratic state authority, rationalization, and the Protestant ethic in modern capitalist society.",
    timeline: [
      {
        date_or_year: "1905",
        event: "Published his landmark essay 'The Protestant Ethic and the Spirit of Capitalism', linking religious worldview to economic behavior.",
        importance: "high",
        sources: ["Radkau (2009)", "Weber (1905)"]
      },
      {
        date_or_year: "1914",
        event: "Served as an officer in the medical service commission during WWI, administering military hospitals in Heidelberg.",
        importance: "medium",
        sources: ["Radkau (2009)"]
      },
      {
        date_or_year: "1918",
        event: "Appointed to the expert committee that helped draft the Weimar Constitution, advocating for a strong, directly elected presidency to balance the parliament.",
        importance: "high",
        sources: ["Mommsen (1984)", "Radkau (2009)"]
      },
      {
        date_or_year: "1919-01-28",
        event: "Delivered his famous lecture 'Politics as a Vocation', defining the state by its monopoly on the legitimate use of physical force.",
        importance: "high",
        sources: ["Weber (1919)", "Radkau (2009)"]
      },
      {
        date_or_year: "1919-06",
        event: "Attended the Versailles Peace Conference as an advisor to the German delegation, urging rejection of the war guilt clause.",
        importance: "medium",
        sources: ["Mommsen (1984)"]
      }
    ],
    power_base: "Intellectual authority as the founding father of modern sociology, deep institutional influence in German academia, and active role as constitutional advisor to the post-WWI Weimar Republic.",
    core_goals: [
      "Understand and define the unique social and economic conditions that created modern industrial capitalism.",
      "Analyze the structures of political authority and bureaucracy in the modern state.",
      "Provide a realistic, value-free methodology for social and historical research."
    ],
    incentives: [
      "The rapid industrialization and geopolitical rise of the German Empire under Bismarck.",
      "The catastrophic collapse of Germany in WWI and the subsequent revolutionary chaos of 1918.",
      "A deep personal tension between academic objectivity and a passionate commitment to German national prestige."
    ],
    constraints: [
      "Severe, recurring mental breakdowns and clinical depression that halted his academic career for years.",
      "Deeply polarized political environment in Weimar Germany, placing him in the fragile centrist middle.",
      "The rapid rise of extreme nationalist and communist factions that rejected his constitutional moderate pragmatism."
    ],
    allies: ["Marianne Weber (wife/scholar)", "Georg Simmel", "Karl Jaspers", "Hugo Preuß (drafted Weimar Constitution)"],
    rivals: ["Karl Marx (posthumous intellectual rival)", "Wilhelm II (whom Weber criticized for incompetent foreign policy)", "Eduard Bernstein (socialist theorist)"],
    institutions_controlled_or_influenced: ["German Sociological Association", "University of Heidelberg", "Weimar Republic Constitution"],
    ideology_or_worldview: {
      summary: "Methodological realism, liberal nationalism, and bureaucratic skepticism. Argued that modern society is characterized by rationalization and intellectualization ('the disenchantment of the world') and warning that expanding bureaucracy creates an 'iron cage' that restricts human freedom.",
      evidence: [
        "His division of political authority into three ideal types: traditional, charismatic, and rational-legal.",
        "Politics as a Vocation's famous call for leaders to balance the 'ethics of conviction' with the 'ethics of responsibility'."
      ],
      confidence: "high"
    },
    decision_patterns: [
      {
        pattern: "Typological analysis; constructing highly structured 'ideal types' to analyze complex geopolitical and historical phenomena.",
        examples: [
          "Defining the modern state strictly by its 'monopoly of the legitimate use of physical force within a given territory.'",
          "Arguing that charismatic leadership is the only real check against the deadening expansion of legal-legal bureaucracy."
        ],
        confidence: "high"
      }
    ],
    crisis_behavior: "Highly intellectual and politically committed; despite severe depressive illnesses, he returned to public life in 1918 to write newspaper articles, draft constitutions, and deliver lectures to calm revolutionary students.",
    negotiation_style: "Rigorous, analytical, and highly structured; used precise definition and historical comparisons to persuade constitutional committees and academic circles.",
    risk_tolerance: "low",
    centralization_preference: "medium",
    conflict_preference: "low",
    institutional_respect: "high",
    coalition_dependency: "high",
    populism_level: "low",
    technocratic_level: "high",
    game_theory_profile: {
      main_players: ["Charismatic Political Leader", "Bureaucratic Administrative Apparatus", "Parliamentary Factions"],
      likely_objectives: [
        "Leader: Exert personal vision, command the bureaucracy, unify the nation.",
        "Bureaucracy: Enforce rule-bound consistency, protect departmental turf, reduce human friction.",
        "Factions: Represent narrow class/regional interests, secure patronage."
      ],
      payoffs: [
        "Directly Elected Presidency with Charismatic Leadership: Weber's constitutional design of a strong executive to balance parliamentary deadlock was intended to create a dynamic equilibrium, though it had fatal failure modes if the president abused emergency decrees (Mixed payoff)."
      ],
      constraints: ["Rationalization and disenchantment of the world make it impossible to restore traditional or religious authority to enforce compliance."],
      common_strategic_moves: ["Legal-rational bureaucratization", "Emergency presidential decrees", "Professional party organization"],
      failure_modes: ["The expansion of the bureaucratic 'iron cage', which leaves society completely devoid of creative, value-driven political leadership."]
    },
    bayesian_assessment: [
      {
        claim: "Max Weber's 'Protestant Ethic' thesis argued that Protestantism directly caused the rise of capitalism.",
        prior_confidence: "low",
        evidence: [
          "His extensive writing showing how ascetic Calvinist doctrine (the idea of the 'calling') provided the psychological motivation for systematic capital accumulation.",
          "His explicit statements warning against one-sided idealistic explanations, and his insistence that capitalism had many other necessary material causes (such as Roman law and double-entry bookkeeping)."
        ],
        posterior_confidence: "low",
        what_would_change_this: "Discovery of early Weber manuscripts claiming that capitalist development was a purely spiritual phenomenon with zero dependency on material factors."
      }
    ],
    historical_comparisons: [
      {
        compared_to: "Karl Marx",
        similarities: [
          "Founding sociological giants who analyzed the rise, structure, and future of modern industrial capitalism.",
          "Both viewed history as shaped by deep structural conflicts (class vs. multi-dimensional status/power)."
        ],
        differences: [
          "Marx viewed economics as the absolute base that determined ideology, predicting a utopian communist revolution. Weber rejected this economic determinism, arguing that religious and cultural ideas shape economics, and predicted that socialism would only expand the bureaucratic 'iron cage'."
        ],
        confidence: "high"
      }
    ],
    source_quality: {
      overall: "strong",
      notes: "Vast scholarly corpus, comprehensive collected works (Max Weber-Gesamtausgabe), his wife Marianne's detailed biography, and global sociological literature.",
      source_count: 5
    },
    sources: [
      "Weber, Max. (1905). The Protestant Ethic and the Spirit of Capitalism.",
      "Weber, Max. (1922). Economy and Society.",
      "Radkau, Joachim. (2009). Max Weber: A Biography.",
      "Mommsen, Wolfgang J. (1984). Max Weber and German Politics, 1890-1920.",
      "Weber, Marianne. (1926). Max Weber: A Biography."
    ],
    research_gaps: ["Debates persist on the exact psychological roots of his severe nervous breakdowns between 1897 and 1903 and how they shaped his intellectual views."],
    created_at: "2026-05-31T18:20:00Z",
    updated_at: "2026-05-31T18:20:00Z"
  },

  // 7. Charles Darwin
  {
    person_id: "charles_darwin",
    name: "Charles Darwin",
    aliases: ["Charles Robert Darwin", "The Father of Evolution"],
    birth_year: 1809,
    death_year: 1882,
    countries_or_regions: ["United Kingdom", "Global"],
    era: "19th Century / Victorian Era / Scientific Revolution",
    roles: ["Naturalist", "Geologist", "Writer"],
    domains: ["Science", "Philosophy"],
    priority_tier: 1,
    short_summary: "English naturalist who formulated the theory of evolution by natural selection, transforming modern biology and fundamentally reshaping humanity's understanding of its place in the natural world.",
    timeline: [
      {
        date_or_year: "1831-1836",
        event: "Circumnavigated the globe as naturalist aboard the HMS Beagle, collecting extensive geological and biological specimens.",
        importance: "high",
        sources: ["Desmond & Moore (1991)", "Darwin (1839)"]
      },
      {
        date_or_year: "1838",
        event: "Conceived his theory of natural selection after reading Thomas Malthus's Essay on the Principle of Population.",
        importance: "high",
        sources: ["Browne (1995)", "Desmond & Moore (1991)"]
      },
      {
        date_or_year: "1858-07-01",
        event: "Presented his theory jointly with Alfred Russel Wallace to the Linnean Society of London following Wallace's independent discovery.",
        importance: "high",
        sources: ["Browne (2002)"]
      },
      {
        date_or_year: "1859-11-24",
        event: "Published On the Origin of Species, creating immediate international scientific, religious, and philosophical controversy.",
        importance: "high",
        sources: ["Darwin (1859)", "Browne (2002)"]
      },
      {
        date_or_year: "1871-02-24",
        event: "Published The Descent of Man, applying his evolutionary theory directly to human origins and sexual selection.",
        importance: "high",
        sources: ["Darwin (1871)", "Browne (2002)"]
      }
    ],
    power_base: "Supreme scientific authority, backing from elite Victorian scientific networks (the 'X Club' led by Thomas Huxley), and his massive, empirical volumes of geological and botanical publications.",
    core_goals: [
      "Establish a purely natural, empirical explanation for the diversity, adaptation, and origin of all biological life.",
      "Validate his evolutionary theory through massive, meticulous empirical evidence across multiple disciplines.",
      "Avert the destruction of his career and family life by managing the immense religious controversy generated by his ideas."
    ],
    incentives: [
      "An insatiable, lifelong curiosity regarding natural history and geology.",
      "Malthus's population theory, which provided the key mechanism of competitive survival.",
      "The fear of losing priority of discovery after receiving Alfred Russel Wallace's independent essay in 1858."
    ],
    constraints: [
      "Severe, chronic physical illness (possibly Chagas disease or psychosomatic anxiety) that kept him isolated at his home in Down House for decades.",
      "The intense religious orthodox consensus of Victorian Britain, particularly within his own family (his wife Emma was deeply religious).",
      "The lack of a genetic mechanism (Mendelian genetics was unknown to him) to explain how traits were inherited."
    ],
    allies: ["Thomas Henry Huxley ('Darwin's Bulldog')", "Joseph Dalton Hooker (botanist)", "Charles Lyell (geologist)", "Alfred Russel Wallace"],
    rivals: ["Richard Owen (eminent anatomist/hostile critic)", "Samuel Wilberforce (Bishop of Oxford)", "Louis Agassiz (creationist naturalist)"],
    institutions_controlled_or_influenced: ["Royal Society of London", "Linnean Society of London", "Modern Biological Science"],
    ideology_or_worldview: {
      summary: "Scientific materialism, empiricism, and evolutionary naturalism. Rejected divine design in favor of blind, competitive, and gradual natural selection, while retaining many typical upper-class Victorian social beliefs.",
      evidence: [
        "On the Origin of Species' complete avoidance of the word 'evolution' in early editions, ending instead with the famous 'tangled bank' description of natural selection.",
        "His private autobiography describing his gradual loss of Christian faith in favor of agnosticism."
      ],
      confidence: "high"
    },
    decision_patterns: [
      {
        pattern: "Meticulous, exhaustive accumulation of empirical data prior to publishing any major claim, combined with strategic reliance on champion allies to fight public battles.",
        examples: [
          "Waiting 20 years to publish Origin of Species, spending 8 years researching barnacles to prove his taxonomic credentials.",
          "Remaining at Down House while Huxley and Hooker debated Wilberforce at the 1860 Oxford evolution debate."
        ],
        confidence: "high"
      }
    ],
    crisis_behavior: "Cautious and anxious; under the shock of Wallace's letter in 1858, he yielded to Lyell and Hooker's arrangement of a joint presentation rather than acting aggressively, retreating to cope with family tragedy (the death of his young son).",
    negotiation_style: "Extremely polite, modest, and conciliatory; avoided personal public clashes in debate, writing letters to critics with profound gentleness and humility while remaining unyielding on the core empirical facts.",
    risk_tolerance: "medium",
    centralization_preference: "low",
    conflict_preference: "low",
    institutional_respect: "high",
    coalition_dependency: "high",
    populism_level: "low",
    technocratic_level: "high",
    game_theory_profile: {
      main_players: ["Charles Darwin", "Alfred Russel Wallace", "Scientific Establishment (Lyell/Hooker)", "Religious Orthodox Critics"],
      likely_objectives: [
        "Darwin: Secure priority of discovery, establish natural selection, protect family reputation.",
        "Wallace: Publish evolutionary ideas, gain scientific recognition.",
        "Establishment: Preserve scientific rigor, prevent radical materialist anarchy.",
        "Critics: Defend intelligent design, protect social order based on biblical creation."
      ],
      payoffs: [
        "Joint Linnean Society Presentation (1858): Successfully avoided a destructive conflict over priority with Wallace, maintained Darwin's scientific primacy, and presented a united front to the establishment (Highest strategic payoff)."
      ],
      constraints: ["Victorian social norms meant a direct, aggressive materialist attack on religion would lead to complete academic ostracization and loss of authority."],
      common_strategic_moves: ["Joint scientific publication", "Strategic reliance on champion allies (Huxley)", "Meticulous empirical documentation"],
      failure_modes: ["Delaying publication too long, which risked him losing credit for his life's work to a competitor."]
    },
    bayesian_assessment: [
      {
        claim: "Charles Darwin recanted his evolutionary theory and converted back to Christianity on his deathbed.",
        prior_confidence: "low",
        evidence: [
          "The 'Lady Hope' story published decades later claiming she visited Darwin in his final days.",
          "His daughter Henrietta's vehement, contemporary denial, and Darwin's own final written letter expressing complete satisfaction with his natural science work and a lack of fear of death."
        ],
        posterior_confidence: "low",
        what_would_change_this: "Discovery of a verified, contemporary diary of a close family member present at his deathbed recording his explicit conversion."
      }
    ],
    historical_comparisons: [
      {
        compared_to: "Nicolaus Copernicus",
        similarities: [
          "Brilliant, cautious natural scientists who formulated theories that shattered the anthropocentric universe.",
          "Both delayed publishing their grand theories for decades out of fear of social and religious backlash."
        ],
        differences: [
          "Copernicus published only on his deathbed, whereas Darwin published his work in mid-life and actively guided the subsequent scientific revolution for 20 years."
        ],
        confidence: "high"
      }
    ],
    source_quality: {
      overall: "strong",
      notes: "Immensely rich archives, including his complete correspondence (Darwin Correspondence Project), extensive geological/biological logs, and rigorous biographies.",
      source_count: 5
    },
    sources: [
      "Darwin, Charles. (1859). On the Origin of Species.",
      "Desmond, Adrian & Moore, James. (1991). Darwin.",
      "Browne, Janet. (1995-2002). Charles Darwin (2-volume definitive biography).",
      "Darwin, Charles. (1887). The Autobiography of Charles Darwin.",
      "Darwin Correspondence Project, Cambridge University Library."
    ],
    research_gaps: ["Determining the exact diagnosis of his chronic physical illness remains a subject of ongoing retrospective medical debate."],
    created_at: "2026-05-31T18:20:00Z",
    updated_at: "2026-05-31T18:20:00Z"
  },

  // 8. John Locke
  {
    person_id: "john_locke",
    name: "John Locke",
    aliases: ["The Father of Liberalism", "Locke"],
    birth_year: 1632,
    death_year: 1704,
    countries_or_regions: ["England", "Europe"],
    era: "17th Century / Glorious Revolution / Age of Enlightenment",
    roles: ["Philosopher", "Physician", "Government Official", "Advisor"],
    domains: ["Philosophy", "Statecraft", "Econ"],
    priority_tier: 1,
    short_summary: "English philosopher who founded modern liberal political theory and empiricism, advocating for natural rights to life, liberty, and property, the consent of the governed, and the right to revolution.",
    timeline: [
      {
        date_or_year: "1666",
        event: "Met Anthony Ashley Cooper (the future 1st Earl of Shaftesbury), initiating a crucial political and intellectual partnership.",
        importance: "medium",
        sources: ["Cranston (1957)", "Woolhouse (2007)"]
      },
      {
        date_or_year: "1683",
        event: "Fled to the Netherlands under suspicion of involvement in the Rye House Plot to assassinate King Charles II.",
        importance: "high",
        sources: ["Cranston (1957)"]
      },
      {
        date_or_year: "1689-02",
        event: "Returned to England aboard the royal ship of Queen Mary II following the successful Glorious Revolution.",
        importance: "high",
        sources: ["Woolhouse (2007)"]
      },
      {
        date_or_year: "1689",
        event: "Published the Two Treatises of Government (anonymously) and An Essay Concerning Human Understanding, establishing his political and philosophical primacy.",
        importance: "high",
        sources: ["Locke (1689)", "Cranston (1957)"]
      },
      {
        date_or_year: "1696",
        event: "Appointed Commissioner of the Board of Trade, actively shaping early British mercantilist and colonial policy.",
        importance: "high",
        sources: ["Woolhouse (2007)", "Cranston (1957)"]
      }
    ],
    power_base: "Intellectual primacy as the philosopher of the Glorious Revolution Whig settlement, political influence through his patron Earl of Shaftesbury, and close advisor status to the post-1688 royal court.",
    core_goals: [
      "Establish a rational, secular basis for political legitimacy based on the consent of the governed.",
      "Defend the natural rights of individuals to life, liberty, and property (estate) against absolute monarchy.",
      "Foster religious toleration (excluding Catholics and atheists) to ensure civil peace."
    ],
    incentives: [
      "The intense political battles of the Exclusion Crisis and the Stuart absolutist threat.",
      "His personal exile in the Netherlands, which exposed him to Dutch religious toleration and intellectual freedom.",
      "A desire to refute the divine-right theory of monarchy popularized by Robert Filmer."
    ],
    constraints: [
      "Constant threat of arrest and execution for treason under Charles II and James II, forcing him to publish anonymously and write in code.",
      "Fragile physical health, suffering from chronic asthma that limited his activities in London.",
      "The delicate task of balancing Whig political reforms with the conservative monarchical compromise of 1688."
    ],
    allies: ["Anthony Ashley Cooper (1st Earl of Shaftesbury)", "Isaac Newton", "Lady Damaris Masham", "William III of Orange"],
    rivals: ["Robert Filmer (intellectual target)", "King James II of England", "Thomas Hobbes (intellectual opponent)"],
    institutions_controlled_or_influenced: ["Whig Party (intellectually)", "Board of Trade of Great Britain", "Royal Society of London"],
    ideology_or_worldview: {
      summary: "Classical liberalism, empiricism, and constitutionalism. Believed the human mind is a blank slate (tabula rasa) at birth, that government is a fiduciary trust created solely to protect individual natural rights, and that if a government violates this trust, the citizens possess a right to revolution.",
      evidence: [
        "Two Treatises' famous argument that political authority is legitimate only when based on the consent of the governed.",
        "A Letter Concerning Toleration's insistence that the state has no authority over the salvation of souls."
      ],
      confidence: "high"
    },
    decision_patterns: [
      {
        pattern: "Anonymous, highly cautious publication coupled with behind-the-scenes policy advising.",
        examples: [
          "Refusing to admit authorship of Two Treatises of Government even in his private will until just before his death.",
          "Providing Whig politicians with precise economic strategies to reform the national coinage in the 1690s."
        ],
        confidence: "high"
      }
    ],
    crisis_behavior: "Pragmatic, discreet, and cautious; when Whig plots failed in the 1680s, he went quietly into deep exile under aliases, dedicating his time to academic research and waiting for the political tide to change.",
    negotiation_style: "Reasoned, moderate, and Whiggish; sought institutional compromises that preserved property rights and parliamentary supremacy while avoiding radical social upheaval.",
    risk_tolerance: "medium",
    centralization_preference: "low",
    conflict_preference: "low",
    institutional_respect: "high",
    coalition_dependency: "high",
    populism_level: "low",
    technocratic_level: "high",
    game_theory_profile: {
      main_players: ["The Citizens", "The Sovereign / Government"],
      likely_objectives: [
        "Citizens: Preserve natural rights to life, liberty, and property.",
        "Sovereign: Exercise legitimate fiduciary trust to protect citizens, avoid being overthrown."
      ],
      payoffs: [
        "Fiduciary Social Contract: By placing the sovereign in a position of trust, the citizens gain a stable legal system. If the sovereign abuses power (defaults on the trust), the citizens' threat constraint (the Right to Revolution) is triggered, establishing a Nash equilibrium that deters tyranny (Highest social payoff)."
      ],
      constraints: ["Absolute arbitrary government violates the fundamental contract, reducing the state to a state of war and releasing the citizens from all obligations of obedience."],
      common_strategic_moves: ["Parliamentary checks and balances", "Secularizing political authority", "Fiduciary asset protection"],
      failure_modes: ["Social instability if the right to revolution is exercised too frequently for trivial grievances, which Locke warns against."]
    },
    bayesian_assessment: [
      {
        claim: "Locke wrote the Two Treatises of Government as a direct post-hoc defense of the 1688 Glorious Revolution.",
        prior_confidence: "high",
        evidence: [
          "The publication date of 1689 and its preface expressing hope that it would make good the throne of King William III.",
          "Peter Laslett's groundbreaking textual analysis proving that the bulk of the text was actually written in 1679-1681 during the Exclusion Crisis to justify an active Whig rebellion against Charles II."
        ],
        posterior_confidence: "low",
        what_would_change_this: "Discovery of Locke's original draft manuscripts proving he did not write a single word of the Treatises until after William III landed at Torbay."
      }
    ],
    historical_comparisons: [
      {
        compared_to: "Thomas Hobbes",
        similarities: [
          "17th-century English social contract theorists who rejected the divine right of kings.",
          "Both derived political legitimacy from a rationalist state of nature."
        ],
        differences: [
          "Hobbes argued that human nature is brutish and requires absolute, unchecked sovereign rule to prevent chaos. Locke argued that the state of nature is governed by reason and natural law, and that absolute rule is worse than the state of nature because it lacks legal appeal."
        ],
        confidence: "high"
      }
    ],
    source_quality: {
      overall: "strong",
      notes: "Enormous Lockean archives at the Bodleian Library, definitive critical editions of his complete works by Peter Laslett and others, and rich scholarly histories.",
      source_count: 5
    },
    sources: [
      "Locke, John. (1689). Two Treatises of Government.",
      "Locke, John. (1689). An Essay Concerning Human Understanding.",
      "Cranston, Maurice. (1957). John Locke: A Biography.",
      "Woolhouse, Roger. (2007). Locke: A Biography.",
      "Laslett, Peter. (1960). Introduction to Locke's Two Treatises."
    ],
    research_gaps: ["Debates persist on the exact degree of Locke's direct involvement in the Whig revolutionary conspiracies of the early 1680s."],
    created_at: "2026-05-31T18:20:00Z",
    updated_at: "2026-05-31T18:20:00Z"
  },

  // 9. Klemens von Metternich
  {
    person_id: "klemens_von_metternich",
    name: "Klemens von Metternich",
    aliases: ["Prince Metternich", "The Coachman of Europe"],
    birth_year: 1773,
    death_year: 1859,
    countries_or_regions: ["Austria", "Europe"],
    era: "19th Century / Napoleonic Wars / Concert of Europe / Restoration Era",
    roles: ["Foreign Minister of Austria", "State Chancellor of Austria", "Diplomat"],
    domains: ["Geopolitics", "Statecraft"],
    priority_tier: 2,
    short_summary: "Austrian diplomat and statesman who served as Foreign Minister and Chancellor for nearly 40 years, orchestrated the Congress of Vienna, and built the Concert of Europe to preserve the conservative balance of power and suppress liberal revolutions.",
    timeline: [
      {
        date_or_year: "1809-10-08",
        event: "Appointed Foreign Minister of the Austrian Empire following Austria's disastrous defeat at Wagram.",
        importance: "high",
        sources: ["Palmer (1972)", "Seward (1991)"]
      },
      {
        date_or_year: "1813",
        event: "Navigated Austria's transition from forced alliance with Napoleon to key leader of the anti-Napoleonic Coalition.",
        importance: "high",
        sources: ["Palmer (1972)"]
      },
      {
        date_or_year: "1814-1815",
        event: "Presided over the Congress of Vienna, redrawing the map of Europe and establishing the Concert of Europe balance of power.",
        importance: "high",
        sources: ["Kissinger (1957)", "Palmer (1972)"]
      },
      {
        date_or_year: "1819",
        event: "Promoted the Carlsbad Decrees across the German Confederation, establishing strict press censorship and academic purges to suppress liberalism.",
        importance: "high",
        sources: ["Seward (1991)"]
      },
      {
        date_or_year: "1848-03-13",
        event: "Forced to resign and flee to England in disguise following the outbreak of the liberal Revolutions of 1848 in Vienna.",
        importance: "high",
        sources: ["Palmer (1972)", "Seward (1991)"]
      }
    ],
    power_base: "Unrivaled diplomatic prestige, absolute confidence of the Habsburg emperors (Francis I and Ferdinand I), the administrative machinery of the multi-ethnic Austrian Empire, and the Concert of Europe conservative consensus.",
    core_goals: [
      "Maintain the geopolitical balance of power in Europe to prevent French or Russian hegemony.",
      "Preserve the absolute dynastic legitimacy of the Habsburg Empire against nationalist fragmentation.",
      "Suppress all liberal, republican, and nationalist revolutionary movements across the European continent."
    ],
    incentives: [
      "The trauma of the French Revolution and the decades of devastating Napoleonic wars.",
      "The fragile, multi-ethnic structure of the Austrian Empire, which would immediately shatter if nationalism succeeded.",
      "A deep belief that only monarchical legitimacy and traditional institutions could prevent social anarchy."
    ],
    constraints: [
      "Austrian Empire's severe financial weakness and lack of industrial modernization.",
      "The rising, popular tide of liberal and nationalist sentiment among the middle classes.",
      "The growing geopolitical ambitions of Prussia in Germany and Russia in the Balkans."
    ],
    allies: ["Emperor Francis I of Austria", "Viscount Castlereagh (British Foreign Secretary)", "Friedrich von Gentz (advisor)"],
    rivals: ["Napoleon Bonaparte", "Tsar Alexander I (complex geopolitical rival)", "Lord Palmerston (liberal British Foreign Secretary)", "Lajos Kossuth (Hungarian nationalist)"],
    institutions_controlled_or_influenced: ["Austrian Empire Foreign Ministry", "Concert of Europe (Congress System)", "German Confederation"],
    ideology_or_worldview: {
      summary: "Dynastic conservatism, anti-nationalism, and geopolitical realism. Viewed human reason as fragile and prone to destructive excesses, and argued that peace could only be maintained by absolute royal legitimacy, historical stability, and a carefully calculated balance of power.",
      evidence: [
        "His extensive political memoirs outlining the 'social repose' of Europe as the highest goal of statecraft.",
        "His Carlsbad Decrees systematically targeting free speech to protect monarchical institutions."
      ],
      confidence: "high"
    },
    decision_patterns: [
      {
        pattern: "Patient, highly calculated diplomatic manipulation; playing rival superpowers against each other while using international congresses to establish conservative coalitions.",
        examples: [
          "Arranging the marriage of Austrian Archduchess Marie Louise to Napoleon in 1810 to buy Austria time to recover.",
          "Using the Congress of Troppau (1820) to secure a mandate for Austrian military intervention to crush liberal revolts in Naples."
        ],
        confidence: "high"
      }
    ],
    crisis_behavior: "Stoic, calm, and tactically cautious; navigated the collapse of the French Empire by serving as a neutral mediator before committing Austria to the coalition, ensuring Austria would dominate the post-war peace.",
    negotiation_style: "highly polite, charming, aristocratic, and court-centered; used social gatherings, salons, and private diplomatic retreats to resolve complex geopolitical gridlocks.",
    risk_tolerance: "low",
    centralization_preference: "high",
    conflict_preference: "low",
    institutional_respect: "high",
    coalition_dependency: "high",
    populism_level: "low",
    technocratic_level: "medium",
    game_theory_profile: {
      main_players: ["Austria (Metternich)", "Prussia", "Russia", "Great Britain", "France (Post-1815)"],
      likely_objectives: [
        "Austria: Preserve the multi-ethnic status quo, prevent Prussian dominance in Germany, keep Russia out of the Balkans.",
        "Prussia: Expand influence in northern Germany.",
        "Russia: Expand into Ottoman territory, champion Christian populations.",
        "Britain: Maintain maritime supremacy, avoid continental entanglements.",
        "France: Recover lost prestige, break out of post-1815 containment."
      ],
      payoffs: [
        "The Concert of Europe Congress System (1815): Metternich engineered an equilibrium where all five powers agreed to suppress unilateral actions in favor of joint diplomatic consensus. By making aggressive war highly expensive and cooperative stability highly rewarding, he secured 40 years of relative European peace (Highest geopolitical payoff)."
      ],
      constraints: ["Austria's severe military and financial limits meant it could never win a direct, unilateral war against Russia or France, forcing dependence on British and Prussian coalitions."],
      common_strategic_moves: ["Diplomatic congress mediation", "Multilateral suppression of revolutions", "Strategic royal marriages"],
      failure_modes: ["His complete failure to adapt to the rising economic and social forces of the Industrial Revolution, leading to his sudden overthrow in 1848."]
    },
    bayesian_assessment: [
      {
        claim: "Metternich was a cynical, unprincipled opportunist who only sought to protect his personal position.",
        prior_confidence: "low",
        evidence: [
          "His sudden, rapid changes of alliance from Napoleon to the Coalition, and his reputation for vanity and court intrigue.",
          "His absolute intellectual consistency over 50 years of private letters and memoirs, his refusal to compromise with revolutionary forces in 1848 even when it cost him his career, and his deep, genuine belief that the multi-ethnic Habsburg empire was the only alternative to ethnic bloodbaths in Central Europe."
        ],
        posterior_confidence: "low",
        what_would_change_this: "Discovery of private diaries showing Metternich explicitly admitting that his conservative philosophy was a deliberate sham designed solely to extract wealth from the Habsburg court."
      }
    ],
    historical_comparisons: [
      {
        compared_to: "Otto von Bismarck",
        similarities: [
          "Brilliant, highly realistic German-speaking chancellors who dominated European geopolitics for decades.",
          "Both sought to preserve monarchical authority and suppress liberal-democratic movements."
        ],
        differences: [
          "Metternich worked to preserve a static, multi-ethnic status quo based on balance and international consensus, whereas Bismarck utilized dynamic nationalism and aggressive warfare to create a new, powerful German nation-state."
        ],
        confidence: "high"
      }
    ],
    source_quality: {
      overall: "strong",
      notes: "Enormous Austrian State Archives (Haus-, Hof- und Staatsarchiv), his own massive 8-volume collected papers (Aus Metternich's nachgelassenen Papieren), and Henry Kissinger's classic study.",
      source_count: 5
    },
    sources: [
      "Metternich, Klemens von. (Papers). Aus Metternich's nachgelassenen Papieren (8 volumes).",
      "Kissinger, Henry. (1957). A World Restored: Metternich, Castlereagh and the Problems of Peace 1812-22.",
      "Palmer, Alan. (1972). Metternich: Councillor of Europe.",
      "Seward, Desmond. (1991). Metternich: The First European.",
      "Schroeder, Paul W. (1994). The Transformation of European Politics 1763-1848."
    ],
    research_gaps: ["Debates continue regarding the exact extent to which his secret police networks actually suppressed domestic opposition versus creating an illusion of total control."],
    created_at: "2026-05-31T18:20:00Z",
    updated_at: "2026-05-31T18:20:00Z"
  },

  // 10. Henry Kissinger
  {
    person_id: "henry_kissinger",
    name: "Henry Kissinger",
    aliases: ["Heinz Alfred Kissinger", "Dr. Kissinger"],
    birth_year: 1923,
    death_year: 2023,
    countries_or_regions: ["United States", "Global"],
    era: "20th Century / Cold War / Vietnam War / Nixon Administration",
    roles: ["National Security Advisor", "Secretary of State", "Geopolitical Consultant"],
    domains: ["Geopolitics", "Statecraft"],
    priority_tier: 2,
    short_summary: "American diplomat and political scientist who served as National Security Advisor and Secretary of State under Nixon and Ford, pioneering realpolitik policies of détente with the USSR, opening relations with China, and negotiating the end of the Vietnam War.",
    timeline: [
      {
        date_or_year: "1969-01-20",
        event: "Appointed National Security Advisor by President Richard Nixon, centralizing foreign policy control in the White House.",
        importance: "high",
        sources: ["Isaacson (1992)", "Kissinger (1979)"]
      },
      {
        date_or_year: "1971-07",
        event: "Undertook a secret diplomatic mission to Beijing (Operation Polo), paving the way for Nixon's historic 1972 visit to China.",
        importance: "high",
        sources: ["Kissinger (2011)", "Isaacson (1992)"]
      },
      {
        date_or_year: "1972-05",
        event: "Negotiated the Strategic Arms Limitation Treaty (SALT I) and the Anti-Ballistic Missile Treaty with the Soviet Union, establishing détente.",
        importance: "high",
        sources: ["Kissinger (1979)"]
      },
      {
        date_or_year: "1973-01-27",
        event: "Signed the Paris Peace Accords to end direct US military involvement in the Vietnam War, earning a highly controversial Nobel Peace Prize.",
        importance: "high",
        sources: ["Isaacson (1992)", "Asselin (2002)"]
      },
      {
        date_or_year: "1973-10",
        event: "Engaged in intensive 'shuttle diplomacy' following the Yom Kippur War, isolating the Soviet Union and brokering peace disengagements between Israel, Egypt, and Syria.",
        importance: "high",
        sources: ["Isaacson (1992)", "Kissinger (1982)"]
      }
    ],
    power_base: "Vast bureaucratic control over the US national security apparatus, absolute trust of President Richard Nixon, high intellectual authority as a Harvard academic, and deep, lasting networks among global political and financial elites.",
    core_goals: [
      "Manage and stabilize the global balance of power during the height of the Cold War.",
      "Extricate the United States from the Vietnam War while preserving American credibility ('peace with honor').",
      "Isolate the Soviet Union by exploiting the Sino-Soviet split and opening relations with China."
    ],
    incentives: [
      "The childhood trauma of fleeing Nazi Germany as a Jewish refugee, which fueled a lifelong obsession with stability and order.",
      "The domestic political pressure of the anti-war movement and the Watergate crisis.",
      "A deep academic conviction that international stability is preserved by a balance of power rather than moral crusade."
    ],
    constraints: [
      "The intense domestic polarization of the Vietnam War era and subsequent Watergate scandal.",
      "Congressional attempts to limit executive foreign policy power (e.g. War Powers Resolution).",
      "The delicate task of managing highly suspicious, autocratic allies and adversaries in Beijing and Moscow."
    ],
    allies: ["Richard Nixon", "Gerald Ford", "Anwar Sadat (Egyptian President)", "Zhou Enlai"],
    rivals: ["William P. Rogers (Secretary of State, whom Kissinger bypassed)", "Le Duc Tho (North Vietnamese negotiator)", "Leonid Brezhnev (Soviet leader/partner in détente)"],
    institutions_controlled_or_influenced: ["National Security Council", "United States Department of State", "Kissinger Associates (geopolitical firm)"],
    ideology_or_worldview: {
      summary: "Realpolitik and balance-of-power diplomacy. Heavily influenced by Metternich and Castlereagh, he believed that international peace is a product of a stable balance of power among major states, and that moral crusades in foreign policy inevitably lead to ideological war and instability.",
      evidence: [
        "His Harvard doctoral thesis, published as 'A World Restored', praising Metternich's conservative stability.",
        "His willingness to sacrifice moral considerations in regional conflicts (e.g. Chile, East Timor, Bangladesh) to secure grand Cold War strategic alignments."
      ],
      confidence: "high"
    },
    decision_patterns: [
      {
        pattern: "Secretive, highly centralized backchannel diplomacy that bypassed standard state department channels and democratic oversight in favor of direct personal negotiation.",
        examples: [
          "Using Pakistani intermediaries to hide his secret flight to Beijing in 1971.",
          "Conducting secret bombings of Cambodia while denying them to Congress and the public."
        ],
        confidence: "high"
      }
    ],
    crisis_behavior: "Highly analytical, cool, and proactive; during the Yom Kippur War, he successfully balanced rapid military resupply to Israel with calculated diplomatic pressure to force Israel and Egypt to negotiate a durable peace.",
    negotiation_style: "highly transactional, personal, and exhaustive; used 'shuttle diplomacy' (flying directly between capitals) to wear down adversaries and secure incremental diplomatic agreements.",
    risk_tolerance: "high",
    centralization_preference: "high",
    conflict_preference: "medium",
    institutional_respect: "low",
    coalition_dependency: "medium",
    populism_level: "low",
    technocratic_level: "high",
    game_theory_profile: {
      main_players: ["United States (Kissinger)", "Soviet Union (Brezhnev)", "China (Mao/Zhou)"],
      likely_objectives: [
        "United States: Stabilize Cold War, contain USSR, extricate from Vietnam.",
        "Soviet Union: Expand global influence, secure trade, avoid US-China alliance.",
        "China: Secure borders against USSR, gain international recognition."
      ],
      payoffs: [
        "Tripolar Cold War Detente: Kissinger's opening of China successfully created a strategic triangle where the US had better relations with both China and the USSR than they had with each other, forcing Brezhnev to sign arms agreements to prevent being isolated (Highest strategic payoff)."
      ],
      constraints: ["Congressional backlash and domestic anti-war sentiment acted as a strict threat constraint that eventually forced rapid exit from Indochina."],
      common_strategic_moves: ["Secret backchannel communications", "Shuttle diplomacy mediation", "Triangulation of adversaries"],
      failure_modes: ["Severe domestic political blowback caused by his secretive, highly amoral methods, which permanently damaged public trust in US foreign policy."]
    },
    bayesian_assessment: [
      {
        claim: "Kissinger was directly responsible for the 1973 military coup that overthrew Chilean President Salvador Allende.",
        prior_confidence: "high",
        evidence: [
          "His famous quote: 'I don't see why we need to stand by and watch a country go communist due to the irresponsibility of its people,' and documented CIA funding to destabilize Allende's government.",
          "Declassified files showing that while the US actively created the economic and political conditions for a coup, the actual military strike on September 11, 1973, was planned and executed independently by General Augusto Pinochet, and Kissinger was surprised by its exact timing."
        ],
        posterior_confidence: "medium",
        what_would_change_this: "Discovery of a direct communication from Kissinger to Pinochet containing the specific authorization and operational timeline for the assault on La Moneda palace."
      }
    ],
    historical_comparisons: [
      {
        compared_to: "Klemens von Metternich",
        similarities: [
          "Realist chancellors/diplomats who analyzed stability as a product of balance of power rather than domestic moral virtue.",
          "Both utilized highly centralized, elite congresses/backchannels to resolve international crises."
        ],
        differences: [
          "Metternich operated in a 19th-century dynastic, aristocratic monarchy, whereas Kissinger had to navigate a modern 20th-century democratic superpower with intense media and congressional oversight."
        ],
        confidence: "high"
      }
    ],
    source_quality: {
      overall: "strong",
      notes: "Massive volume of declassified national security files, Kissinger's own extensive memoirs (over 3,000 pages), congressional hearings, and highly thorough critical biographies.",
      source_count: 5
    },
    sources: [
      "Kissinger, Henry. (1979). White House Years.",
      "Kissinger, Henry. (1982). Years of Upheaval.",
      "Isaacson, Walter. (1992). Kissinger: A Biography.",
      "Hanhimäki, Jussi. (2004). The Flawed Architect: Henry Kissinger and American Foreign Policy.",
      "Grandin, Greg. (2015). Kissinger's Shadow: The Long Reach of America's Most Controversial Statesman."
    ],
    research_gaps: ["Debates persist on the exact degree of behind-the-scenes coordination between Kissinger and the military junta in Argentina regarding the 'Dirty War' of the late 1970s."],
    created_at: "2026-05-31T18:20:00Z",
    updated_at: "2026-05-31T18:20:00Z"
  },

  // 11. Lee Kuan Yew
  {
    person_id: "lee_kuan_yew",
    name: "Lee Kuan Yew",
    aliases: ["LKY", "Harry Lee", "The Father of Singapore"],
    birth_year: 1923,
    death_year: 2015,
    countries_or_regions: ["Singapore", "Southeast Asia", "Asia"],
    era: "20th Century / De-colonization / Cold War / East Asian Economic Miracle",
    roles: ["Prime Minister of Singapore", "Senior Minister", "Minister Mentor"],
    domains: ["Geopolitics", "Statecraft", "Econ"],
    priority_tier: 1,
    short_summary: "Founding father of modern Singapore who served as Prime Minister for 31 years, transforming a highly unstable, resource-poor colonial port into a global financial and technological superpower within a single generation.",
    timeline: [
      {
        date_or_year: "1954-11-21",
        event: "Co-founded the People's Action Party (PAP), serving as its Secretary-General.",
        importance: "medium",
        sources: ["Lee (1998)", "Josey (1968)"]
      },
      {
        date_or_year: "1959-06-03",
        event: "Inaugurated as the first Prime Minister of self-governing Singapore following a landslide election victory.",
        importance: "high",
        sources: ["Lee (1998)"]
      },
      {
        date_or_year: "1965-08-09",
        event: "Proclaimed the independence of Singapore after its highly painful, sudden expulsion from the Federation of Malaysia, shedding tears on live television.",
        importance: "high",
        sources: ["Lee (1998)", "Josey (1968)"]
      },
      {
        date_or_year: "1968",
        event: "Began aggressive campaigns to attract Multinational Corporations (MNCs) to Singapore, pioneering modern export-oriented industrialization.",
        importance: "high",
        sources: ["Lee (2000)", "Vogel (1991)"]
      },
      {
        date_or_year: "1990-11-28",
        event: "Stepped down voluntarily as Prime Minister, passing power smoothly to Goh Chok Tong while retaining crucial advisor roles.",
        importance: "high",
        sources: ["Lee (2000)"]
      }
    ],
    power_base: "Absolute, enduring control over the People's Action Party, overwhelming electoral majorities, direct control over Singapore's state security apparatus, and unmatched prestige as the nation's founder.",
    core_goals: [
      "Ensure the physical survival, sovereignty, and security of a tiny, ethnically divided island state.",
      "Transform Singapore into an indispensable global financial, trade, and logistical hub.",
      "Construct a highly cohesive, meritocratic, and disciplined multi-racial society."
    ],
    incentives: [
      "The childhood trauma of the brutal Japanese occupation of Singapore during WWII.",
      "The existential threat of regional hostility (Confrontation with Indonesia, expulsion from Malaysia).",
      "A deep, pragmatic desire to build a first-rate, corruption-free public administration."
    ],
    constraints: [
      "Complete lack of natural resources, including fresh water, requiring importation from Malaysia.",
      "Intense, early ethnic tensions and riots between Chinese, Malay, and Indian populations.",
      "Geopolitical vulnerability as a tiny non-Muslim island surrounded by massive Muslim neighbors (Indonesia/Malaysia)."
    ],
    allies: ["Goh Keng Swee (economic mastermind)", "S. Rajaratnam (diplomatic architect)", "Lim Kim San (housing architect)"],
    rivals: ["Lim Chin Siong (charismatic left-wing opponent)", "Tunku Abdul Rahman (Prime Minister of Malaysia)", "David Marshall (early political rival)"],
    institutions_controlled_or_influenced: ["People's Action Party", "Singapore Government", "Internal Security Department", "Temasek Holdings"],
    ideology_or_worldview: {
      summary: "Pragmatism, meritocracy, and Asian values. Rejected ideological dogmas (socialist or capitalist) in favor of 'what works', advocated for strict legal discipline, meritocratic governance, and argued that Western-style absolute democracy was unsuitable for multi-ethnic developing nations.",
      evidence: [
        "His famous quote: 'My life is not guided by philosophy or theories. I get things done and leave others to write the theories.'",
        "The systematic introduction of bilingualism (English and Mother Tongue) to bridge ethnic divides and connect Singapore to global trade."
      ],
      confidence: "high"
    },
    decision_patterns: [
      {
        pattern: "Technocratic, long-term strategic planning coupled with strict, paternalistic social engineering.",
        examples: [
          "Bypassing labor unions to attract MNCs by promising a highly disciplined, English-speaking workforce.",
          "Using the Housing & Development Board (HDB) to force ethnic integration in public housing, preventing ghettoization."
        ],
        confidence: "high"
      }
    ],
    crisis_behavior: "Exceedingly cool, decisive, and realistic; when faced with the sudden withdrawal of British military bases in 1968 (which threatened 20% of Singapore's GDP), he rapidly mobilized national service conscription and economic conversion strategies.",
    negotiation_style: "highly logical, candid, and transactional; focused on hard geopolitical facts and long-term incentives rather than pleasantries, earning respect from both Western and Chinese leaders.",
    risk_tolerance: "high",
    centralization_preference: "high",
    conflict_preference: "low",
    institutional_respect: "high",
    coalition_dependency: "low",
    populism_level: "low",
    technocratic_level: "high",
    game_theory_profile: {
      main_players: ["Singapore Government (LKY)", "Multinational Corporations (MNCs)", "Neighboring States (Malaysia/Indonesia)"],
      likely_objectives: [
        "Singapore: Secure investment, guarantee defense sovereignty, maintain internal security.",
        "MNCs: Maximize profits, secure stable political environments, utilize reliable infrastructure.",
        "Neighbors: Limit Singapore's regional dominance, manage domestic nationalism."
      ],
      payoffs: [
        "Global Financial Oasis: By establishing absolute political stability and a zero-tolerance policy for corruption, Singapore reached a Nash equilibrium where MNCs chose to locate their headquarters there despite high labor costs, yielding a massive economic payoff (Highest strategic payoff)."
      ],
      constraints: ["Tiny physical footprint and total lack of strategic depth made any direct military confrontation with neighbors fatal, forcing reliance on deterrence ('Poison Shrimp' defense) and diplomacy."],
      common_strategic_moves: ["Attracting foreign direct investment", "Enforcing strict internal security laws", "Maintaining global diplomatic neutrality"],
      failure_modes: ["Over-paternalism, which risked stifling domestic creativity and creating a population overly dependent on top-down direction."]
    },
    bayesian_assessment: [
      {
        claim: "Lee Kuan Yew was a ruthless dictator who systematically destroyed all political opposition in Singapore.",
        prior_confidence: "medium",
        evidence: [
          "His use of the Internal Security Act (ISA) to detain leftist opponents without trial in Operation Coldstore, and his extensive use of defamation lawsuits to bankrupt rival politicians.",
          "His absolute insistence on regular, clean elections, his refusal to establish a personality cult, his voluntary retirement in 1990, and the fact that PAP's power base rested on genuine, highly successful economic and housing delivery."
        ],
        posterior_confidence: "medium",
        what_would_change_this: "Discovery of private directives ordering the physical elimination or illegal electoral rigging of opposition candidates."
      }
    ],
    historical_comparisons: [
      {
        compared_to: "Qin Shi Huang",
        similarities: [
          "Founders who established highly efficient, law-bound, and strictly disciplined states.",
          "Both prioritized technocratic delivery and social order over individual expressive liberties."
        ],
        differences: [
          "Qin Shi Huang utilized brutal, short-lived Legalist tyranny that collapsed upon his death, whereas Lee Kuan Yew constructed a highly durable, modern constitutional state governed by clean meritocratic institutions."
        ],
        confidence: "high"
      }
    ],
    source_quality: {
      overall: "strong",
      notes: "Enormous volume of official archives, his two-volume definitive memoirs, extensive interviews with global journalists, and rich Southeast Asian political literature.",
      source_count: 5
    },
    sources: [
      "Lee, Kuan Yew. (1998). The Singapore Story: Memoirs of Lee Kuan Yew.",
      "Lee, Kuan Yew. (2000). From Third World to First: The Singapore Story: 1965-2000.",
      "Vogel, Ezra F. (1991). The Four Little Dragons: The Spread of Industrialization in East Asia.",
      "Josey, Alex. (1968). Lee Kuan Yew: The Struggle for Singapore.",
      "Plate, Tom. (2010). Conversations with Lee Kuan Yew: Citizen Singapore: How to Build a Nation."
    ],
    research_gaps: ["Access to classified Internal Security Department archives regarding specific detentions during the 1960s and 1970s remains restricted."],
    created_at: "2026-05-31T18:20:00Z",
    updated_at: "2026-05-31T18:20:00Z"
  },

  // 12. Sun Tzu
  {
    person_id: "sun_tzu",
    name: "Sun Tzu",
    aliases: ["Sun Wu", "Changqing", "The Master of War"],
    birth_year: -544,
    death_year: -496,
    countries_or_regions: ["Wu State", "China", "East Asia"],
    era: "6th Century BCE / Spring and Autumn Period / Warring States Era",
    roles: ["General", "Military Strategist", "Philosopher"],
    domains: ["Military", "Philosophy", "Statecraft"],
    priority_tier: 1,
    short_summary: "Chinese military general and philosopher whose classical work The Art of War established the foundational principles of Eastern military strategy, emphasizing deception, intelligence, and winning without direct battle.",
    timeline: [
      {
        date_or_year: "-512",
        event: "Presented his thirteen chapters of military strategy to King Helü of the State of Wu, securing appointment as general.",
        importance: "high",
        sources: ["Sima Qian (c. -94)", "Giles (1910)"]
      },
      {
        date_or_year: "-506",
        event: "Orchestrated the brilliant Wu invasion of the rival State of Chu, winning the decisive Battle of Boju with a highly outnumbered force and capturing the Chu capital of Ying.",
        importance: "high",
        sources: ["Sima Qian (c. -94)", "Sawyer (1993)"]
      },
      {
        date_or_year: "-496",
        event: "Reportedly retired from military service following the death of King Helü, dedicating his remaining life to codifying his philosophical theories of strategy.",
        importance: "medium",
        sources: ["Sima Qian (c. -94)"]
      }
    ],
    power_base: "Supreme tactical and strategic authority as general of the Wu State army, and his enduring intellectual legacy as the master builder of strategic science.",
    core_goals: [
      "Ensure the physical survival, security, and victory of the Wu State in a highly chaotic period of multi-state warfare.",
      "Formulate a complete, holistic philosophy of conflict that minimizes the destructive cost of war to the state.",
      "Achieve decisive geopolitical victories through intelligence, deception, and psychological domination."
    ],
    incentives: [
      "The extreme instability and existential threat of the Spring and Autumn Period.",
      "The high cost of maintaining standing armies, which could easily bankrupt a small state.",
      "A deep belief that direct, brute-force battlefield conflict is the least efficient way to achieve political goals."
    ],
    constraints: [
      "Wu State's severe numerical inferiority compared to the massive rival State of Chu.",
      "The volatile, arbitrary whims of King Helü and court rivalries.",
      "The primitive logistics, communications, and weapon technologies of the late 6th century BCE."
    ],
    allies: ["King Helü of Wu", "Wu Zixu (eminent Wu chancellor/strategist)"],
    rivals: ["King Nangao of Chu", "Rival Military Commanders of Chu and Yue States"],
    institutions_controlled_or_influenced: ["State of Wu Army", "Modern Geopolitics", "Military Science Globally"],
    ideology_or_worldview: {
      summary: "Strategic realism, deception, and holistic conflict prevention. Argued that war is a grave matter of state survival that must be calculated with absolute rationality. Promoted the ideas that all warfare is based on deception, that the supreme art of war is to subdue the enemy without fighting, and that victory belongs to those who know themselves and their enemies.",
      evidence: [
        "The Art of War's famous opening: 'Warfare is a great matter to the State; it is the ground of death and of life; it is the way of survival and of destruction, and must be examined.'",
        "The absolute focus on using spies and psychological warfare to break the enemy's resolve before a single arrow is shot."
      ],
      confidence: "high"
    },
    decision_patterns: [
      {
        pattern: "Asymmetrical, deceptive planning; avoiding the enemy's strength to strike exclusively at their weakest, most unprepared points, guided by complete intelligence.",
        examples: [
          "Bypassing Chu's heavily fortified border positions during the -506 invasion to launch a swift surprise assault on their capital.",
          "Using elaborate feigned retreats and false camps to confuse Chu scouts and divide their forces."
        ],
        confidence: "high"
      }
    ],
    crisis_behavior: "Extremely cool, calculated, and disciplined; responded to military crises by maintaining absolute control of information, manipulating the enemy's perceptions, and refusing to commit to battle under emotional pressure.",
    negotiation_style: "Absolute, strategic, and deceptive; negotiated from a position of deep psychological advantage, using diplomatic maneuvers to isolate adversaries and secure bloodless surrenders.",
    risk_tolerance: "medium",
    centralization_preference: "high",
    conflict_preference: "low",
    institutional_respect: "medium",
    coalition_dependency: "low",
    populism_level: "low",
    technocratic_level: "high",
    game_theory_profile: {
      main_players: ["Wu State (Sun Tzu)", "Chu State", "Yue State"],
      likely_objectives: [
        "Wu State: Survive, conquer Chu, establish regional hegemony.",
        "Chu State: Protect borders, leverage massive manpower to crush Wu.",
        "Yue State: Exploit Wu's overextension to launch rear attacks."
      ],
      payoffs: [
        "Winning without Fighting (Subduing the Enemy's Strategy): By using spies to discover the enemy's plans and using diplomacy to sever their alliances, a general achieves a Nash equilibrium where the enemy surrenders without direct battle, preserving Wu's scarce military assets (Highest strategic payoff)."
      ],
      constraints: ["The high cost of maintaining a field army far from home acts as a strict threat constraint that limits the duration of any invasion."],
      common_strategic_moves: ["Strategic deception", "Deploying spy rings", "Avoiding direct frontal clashes"],
      failure_modes: ["Fighting a prolonged, attritional war far from home, which inevitably bankrupts the treasury and invites rear attacks by Yue."]
    },
    bayesian_assessment: [
      {
        claim: "Sun Tzu was a purely mythical figure and never actually existed as an historical general.",
        prior_confidence: "medium",
        evidence: [
          "The absence of his name in the contemporary Zuozhuan chronicle of the Spring and Autumn Period.",
          "Sima Qian's detailed Shiji biography written c. -94, the discovery of the Yinqueshan bamboo slips in 1972 confirming the early existence of The Art of War, and the consistency of the tactical battles of -506 with his described principles."
        ],
        posterior_confidence: "low",
        what_would_change_this: "Discovery of a 6th-century BCE Wu State court register explicitly stating that The Art of War was written by a collective syndicate of chancellors using a pseudonym."
      }
    ],
    historical_comparisons: [
      {
        compared_to: "Carl von Clausewitz",
        similarities: [
          "The preeminent classical theorists of military strategy in human history.",
          "Both viewed war strictly as a rational instrument of state policy rather than a heroic adventure."
        ],
        differences: [
          "Clausewitz focused on the concentration of overwhelming force to destroy the enemy's army in a decisive battle. Sun Tzu focused on deception, psychological manipulation, and avoiding battle to subdue the enemy without direct physical destruction."
        ],
        confidence: "high"
      }
    ],
    source_quality: {
      overall: "strong",
      notes: "Relies on Sima Qian's Shiji (Records of the Grand Historian), the Yinqueshan Han bamboo slip discoveries, and modern classical Chinese studies by Arthur Waley and Ralph Sawyer.",
      source_count: 5
    },
    sources: [
      "Sun Tzu. (c. -500). The Art of War.",
      "Sima Qian. (c. -94). Shiji (Records of the Grand Historian).",
      "Sawyer, Ralph D. (1993). The Seven Military Classics of Ancient China.",
      "Giles, Lionel. (1910). Sun Tzu on the Art of War.",
      "Griffith, Samuel B. (1963). Sun Tzu: The Art of War."
    ],
    research_gaps: ["The exact degree of textual editing and compilation performed by his descendants (like Sun Bin) on the surviving text of The Art of War remains debated."],
    created_at: "2026-05-31T18:20:00Z",
    updated_at: "2026-05-31T18:20:00Z"
  },

  // 13. Hannibal Barca
  {
    person_id: "hannibal_barca",
    name: "Hannibal Barca",
    aliases: ["The Scourge of Rome", "Hannibal"],
    birth_year: -247,
    death_year: -181,
    countries_or_regions: ["Carthage", "Spain", "Italy", "major empires"],
    era: "3rd / 2nd Century BCE / Second Punic War / Hellenistic Era",
    roles: ["General of Carthage", "Suffete of Carthage", "Military Commander"],
    domains: ["Military", "Geopolitics", "Statecraft"],
    priority_tier: 1,
    short_summary: "Carthaginian general who led a daring invasion of Italy, famously crossing the Alps with war elephants, won stunning tactical victories (such as Cannae) that brought the Roman Republic to the brink of collapse.",
    timeline: [
      {
        date_or_year: "-221",
        event: "Appointed Commander-in-Chief of the Carthaginian army in Spain following the assassination of his brother-in-law Hasdrubal the Fair.",
        importance: "high",
        sources: ["Polybius (c. -150)", "Livy (c. 10 CE)"]
      },
      {
        date_or_year: "-218",
        event: "Launched the Second Punic War by crossing the Alps with a massive army and war elephants, invading Italy by surprise.",
        importance: "high",
        sources: ["Polybius (c. -150)", "Lazenby (1978)"]
      },
      {
        date_or_year: "-216-08-02",
        event: "Executed his tactical masterpiece at the Battle of Cannae, using a double-envelopment maneuver to completely annihilate a much larger Roman army.",
        importance: "high",
        sources: ["Polybius (c. -150)", "Dodge (1891)"]
      },
      {
        date_or_year: "-202",
        event: "Recalled to Carthage to face Scipio Africanus; defeated at the Battle of Zama, ending Carthaginian military dominance.",
        importance: "high",
        sources: ["Polybius (c. -150)", "Goldsworthy (2000)"]
      },
      {
        date_or_year: "-196",
        event: "Elected Suffete (Chief Magistrate) of Carthage, implementing radical financial and anti-corruption reforms before being forced into exile by Roman pressure.",
        importance: "high",
        sources: ["Livy (c. 10 CE)", "Lazenby (1978)"]
      }
    ],
    power_base: "Absolute loyalty of a multi-ethnic mercenary army, personal military genius, support from the Barca political faction in Spain and Carthage, and his early successful administrative reforms as Suffete.",
    core_goals: [
      "Destroy Roman geopolitical hegemony over the Western Mediterranean.",
      "Dismantle the Roman confederation in Italy by peeling away Rome's key allies.",
      "Restore the imperial wealth, honor, and territory of Carthage following its defeat in the First Punic War."
    ],
    incentives: [
      "His famous childhood oath to his father Hamilcar Barca to never be a friend of Rome.",
      "The existential threat of Roman expansionism targeting Carthaginian Spain.",
      "The pride and survival of the Barcid dynastic lineage."
    ],
    constraints: [
      "Severe lack of strategic reinforcement and siege engines from the factional Carthaginian senate.",
      "The infinite manpower reserves and unyielding, fanatical resolve of the Roman Republic.",
      "The geographical difficulty of maintaining a field army in hostile Italy for 15 years without a secure port."
    ],
    allies: ["Hasdrubal Barca (brother)", "Mago Barca (brother)", "Maharbal (cavalry commander)", "Philip V of Macedon (formal ally)"],
    rivals: ["Scipio Africanus (military nemesis)", "Quintus Fabius Maximus (the Delayer)", "Hanno the Great (peace-faction rival in Carthage)"],
    institutions_controlled_or_influenced: ["Carthaginian Army", "Suffetship of Carthage", "Hellenistic Kingdoms (as military advisor in exile)"],
    ideology_or_worldview: {
      summary: "Hellenistic military monarchy and mercenary realpolitik. Viewed strategy as an art of supreme deception, military coordination, and rapid movement, combining deep tactical flexibility with a pragmatic understanding of coalition warfare.",
      evidence: [
        "Cannae's highly sophisticated double-envelopment, which relied on the psychological confidence of his mercenary troops.",
        "His highly successful administrative reforms in Carthage that restored the treasury without taxing the common citizens."
      ],
      confidence: "high"
    },
    decision_patterns: [
      {
        pattern: "Tactical opportunism, brilliant ambush planning, and exploitation of the psychological weaknesses of rival Roman commanders.",
        examples: [
          "Using the morning mist to ambush Gaius Flaminius's army at Lake Trasimene (-217).",
          "Placing his highly reliable Spanish and Gallic troops in a convex center at Cannae, allowing them to retreat slowly and draw the Romans into the trap."
        ],
        confidence: "high"
      }
    ],
    crisis_behavior: "Extremely resilient, resourceful, and stoic; maintained absolute discipline among a diverse, multi-ethnic mercenary force for 15 years in enemy territory without a single mutiny.",
    negotiation_style: "Direct, realistic, and proud; negotiated with Scipio face-to-face before Zama in a failed attempt to secure a moderate peace, recognizing when the strategic tide had turned.",
    risk_tolerance: "high",
    centralization_preference: "high",
    conflict_preference: "high",
    institutional_respect: "medium",
    coalition_dependency: "high",
    populism_level: "low",
    technocratic_level: "high",
    game_theory_profile: {
      main_players: ["Carthage (Hannibal)", "Roman Senate", "Italian Allies of Rome", "Carthaginian Senate (Hanno)"],
      likely_objectives: [
        "Hannibal: Peel away Roman allies, force Rome to negotiate a peace treaty.",
        "Rome: Refuse any compromise, leverage superior manpower to isolate and starve Hannibal.",
        "Allies: Secure their own city autonomy, align with the likely victor.",
        "Hanno: Protect domestic trade, limit the Barcid family's influence."
      ],
      payoffs: [
        "Fabian Attrition Strategy: Rome's adoption of the Fabian strategy of avoiding direct battle with Hannibal successfully broke his offensive momentum, establishing a Nash equilibrium that exploited his lack of siege capacity and reinforcements (Negative payoff for Hannibal)."
      ],
      constraints: ["Carthage's factional senate refused to send necessary reinforcements, leaving Hannibal unable to siege the city of Rome itself."],
      common_strategic_moves: ["Tactical ambushes", "peeling away coalitions", "Financial/taxation reforms"],
      failure_modes: ["His inability to capture a major Italian port or secure decisive reinforcements, which doomed his invasion to slow attrition."]
    },
    bayesian_assessment: [
      {
        claim: "Hannibal committed a fatal strategic error by choosing not to march on Rome immediately after his victory at Cannae.",
        prior_confidence: "medium",
        evidence: [
          "Maharbal's famous criticism: 'You know how to win a victory, Hannibal, but you do not know how to use it,' and the panic in Rome.",
          "Modern military analysis showing that Hannibal lacked siege equipment, had no secure supply lines, and that the Roman walls were heavily fortified, meaning a direct assault would likely have failed and destroyed his small field army."
        ],
        posterior_confidence: "low",
        what_would_change_this: "Discovery of declassified Carthaginian war council logs showing that Hannibal actually possessed secret siege engines and key Roman defectors ready to open the gates."
      }
    ],
    historical_comparisons: [
      {
        compared_to: "Alexander the Great",
        similarities: [
          "Brilliant, highly charismatic young generals who invaded massive rival empires against immense odds.",
          "Both utilized highly innovative cavalry shock maneuvers to shatter larger enemy centers."
        ],
        differences: [
          "Alexander conquered a fragile, highly centralized Persian Empire and built a lasting empire, whereas Hannibal faced a highly resilient Roman Republic that completely rebuilt its armies and ultimately destroyed Carthage."
        ],
        confidence: "high"
      }
    ],
    source_quality: {
      overall: "strong",
      notes: "Relies on Polybius's Histories (the most objective contemporary source), Livy's detailed Ab Urbe Condita, and modern Punic war histories by Lazenby and Goldsworthy.",
      source_count: 5
    },
    sources: [
      "Polybius. (c. -150). The Histories.",
      "Livy. (c. 10 CE). Ab Urbe Condita (History of Rome).",
      "Lazenby, J. F. (1978). Hannibal's War: A Military History of the Second Punic War.",
      "Goldsworthy, Adrian. (2000). The Punic Wars.",
      "Dodge, Theodore Ayrault. (1891). Hannibal: A History of the Art of War."
    ],
    research_gaps: ["The exact mountain pass Hannibal used to cross the Alps remains a subject of intense geological and historical debate."],
    created_at: "2026-05-31T18:20:00Z",
    updated_at: "2026-05-31T18:20:00Z"
  },

  // 14. Cyrus the Great
  {
    person_id: "cyrus_the_great",
    name: "Cyrus the Great",
    aliases: ["Cyrus II of Persia", "The Elder", "Kourash"],
    birth_year: -600,
    death_year: -530,
    countries_or_regions: ["Persia", "Media", "Lydia", "Babylon", "major empires"],
    era: "6th Century BCE / Rise of the Achaemenid Empire",
    roles: ["King of Persia", "Shahanshah", "Founder of the Achaemenid Empire"],
    domains: ["Geopolitics", "Statecraft", "Military"],
    priority_tier: 1,
    short_summary: "Founder of the Achaemenid Empire who conquered the Median, Lydian, and Neo-Babylonian empires, created the largest empire the world had yet seen, and pioneered a model of highly tolerant imperial governance famously recorded on the Cyrus Cylinder.",
    timeline: [
      {
        date_or_year: "-553",
        event: "Launched a rebellion against his grandfather Astyages, King of the Median Empire, successfully uniting Persia and Media.",
        importance: "high",
        sources: ["Herodotus (c. -440)", "Dandamaev (1989)"]
      },
      {
        date_or_year: "-546",
        event: "Defeated King Croesus of the wealthy Lydian Empire, capturing Sardis and expanding Persian dominance to the Aegean coast.",
        importance: "high",
        sources: ["Herodotus (c. -440)", "Briant (2002)"]
      },
      {
        date_or_year: "-539",
        event: "Conquered the Neo-Babylonian Empire after diverting the Euphrates River to enter the city; issued the Cyrus Cylinder decree.",
        importance: "high",
        sources: ["Cyrus Cylinder text", "Briant (2002)"]
      },
      {
        date_or_year: "-538",
        event: "Authorized the return of the exiled Jews to Judea, funding the rebuilding of the Second Temple in Jerusalem.",
        importance: "high",
        sources: ["Book of Ezra", "Dandamaev (1989)"]
      },
      {
        date_or_year: "-530",
        event: "Passed away during a military campaign against the nomadic Massagetae along the Jaxartes River; succeeded by his son Cambyses II.",
        importance: "high",
        sources: ["Herodotus (c. -440)"]
      }
    ],
    power_base: "The unified Persian-Median military aristocracy, a highly mobile cavalry and archer force, the religious backing of local priesthoods (including Babylon's Marduk), and his immense prestige as a just, liberating ruler.",
    core_goals: [
      "Unify all major civilizations of the Near East under a singular, stable imperial framework.",
      "Construct a highly efficient satrapy-based administrative system that respects local cultures and religions.",
      "Achieve lasting imperial security by pacifying frontiers and securing major trade routes."
    ],
    incentives: [
      "The aggressive, expansionist threat of rival empires (Media, Babylonia, and Lydia).",
      "A desire to build an empire that could survive without constant domestic rebellions.",
      "Zoroastrian or early Persian ethical principles advocating for justice (asha) and order."
    ],
    constraints: [
      "The immense geographical size and ethnic diversity of the conquered territories.",
      "Logistical limits of communication and transport before the formal construction of the Royal Road.",
      "Constant threat of nomadic incursions along the northern and eastern frontiers."
    ],
    allies: ["Harpagus (Median general who defected)", "Cambyses II (son/successor)", "Exiled Jewish Elites", "Priesthood of Marduk in Babylon"],
    rivals: ["Astyages of Media", "Croesus of Lydia", "Nabonidus of Babylon", "Tomyris (Queen of the Massagetae)"],
    institutions_controlled_or_influenced: ["Achaemenid Empire", "Satrapy Administration System", "Second Temple of Jerusalem"],
    ideology_or_worldview: {
      summary: "Benevolent imperial pluralism and religious toleration. Rejected the traditional Assyrian model of absolute terror and mass deportation in favor of co-opting local elites, restoring regional temples, and presenting himself as a legitimate local ruler chosen by domestic gods.",
      evidence: [
        "The Cyrus Cylinder's declaration of religious freedom, the return of deported populations, and the restoration of temples.",
        "The Hebrew Bible's unique designation of Cyrus (a non-Jew) as the 'Messiah' or 'Anointed One' of God."
      ],
      confidence: "high"
    },
    decision_patterns: [
      {
        pattern: "Tactical speed and coordination combined with highly sophisticated psychological and political co-optation of defeated populations.",
        examples: [
          "Entering Babylon bloodlessly by presenting himself as the savior of Marduk against the unpopular King Nabonidus.",
          "Pardoning and employing defeated kings (like Croesus of Lydia) as close royal advisors rather than executing them."
        ],
        confidence: "high"
      }
    ],
    crisis_behavior: "Cool, adaptive, and strategic; responded to the Median invasion by turning Astyages' own generals against him, and navigated the massive walls of Babylon through brilliant river-diversion engineering.",
    negotiation_style: "Magnanimous, inclusive, and highly diplomatic; focused on building win-win coalitions with local priesthoods and elites, presenting imperial conquest as local liberation.",
    risk_tolerance: "high",
    centralization_preference: "medium",
    conflict_preference: "medium",
    institutional_respect: "high",
    coalition_dependency: "high",
    populism_level: "low",
    technocratic_level: "medium",
    game_theory_profile: {
      main_players: ["Persia (Cyrus)", "Babylonian Empire", "Lydian Empire", "Local Priesthoods/Elites"],
      likely_objectives: [
        "Cyrus: Annex territories, secure trade, prevent rebellions.",
        "Babylon/Lydia: Defend sovereignty, maintain taxation monopolies.",
        "Priesthoods: Protect religious temples, retain local wealth and authority."
      ],
      payoffs: [
        "Imperial Co-optation Nash Equilibrium: By restoring local temples and allowing religious freedom, Cyrus reached a stable equilibrium where local elites willingly paid imperial taxes and maintained order without requiring massive Persian occupation forces (Highest strategic payoff)."
      ],
      constraints: ["Extremely vast territories made top-down military terror too expensive to sustain, forcing reliance on decentralized satrapies and cultural tolerance."],
      common_strategic_moves: ["Restoring regional temples", "Appointing local defectors as satraps", "Engineering river diversions"],
      failure_modes: ["Campaigning too far into the nomadic frontier, which lacked cities to co-opt and ultimately cost him his life against the Massagetae."]
    },
    bayesian_assessment: [
      {
        claim: "The Cyrus Cylinder represents the first declaration of universal human rights in history.",
        prior_confidence: "medium",
        evidence: [
          "The text outlining religious tolerance, the release of captives, and the ban on looting.",
          "Modern historical analysis showing the Cylinder is a standard Mesopotamian foundation charter designed to establish the legitimacy of a conqueror, and that Cyrus's policies were calculated geopolitical moves to secure imperial stability rather than modern individual rights decrees."
        ],
        posterior_confidence: "low",
        what_would_change_this: "Discovery of contemporary Persian law codes proving Cyrus established legal courts where common citizens of any ethnicity could sue imperial officers for individual rights violations."
      }
    ],
    historical_comparisons: [
      {
        compared_to: "Alexander the Great",
        similarities: [
          "Brilliant, highly aggressive imperial founders who conquered the Near East in a single generation.",
          "Both actively adopted local cultural and religious dress to secure their legitimacy."
        ],
        differences: [
          "Cyrus established a highly durable, 200-year satrapy administration system that survived his death, whereas Alexander's empire shattered immediately."
        ],
        confidence: "high"
      }
    ],
    source_quality: {
      overall: "strong",
      notes: "Relies on the contemporary Cyrus Cylinder, cuneiform tablet archives from Babylon, Herotodus's Histories, and deconstructive Achaemenid scholarship by Pierre Briant.",
      source_count: 5
    },
    sources: [
      "The Cyrus Cylinder. (c. -539). Foundation Charter of Babylon.",
      "Herodotus. (c. -440). The Histories.",
      "Briant, Pierre. (2002). From Cyrus to Alexander: A History of the Persian Empire.",
      "Dandamaev, M. A. (1989). A Political History of the Achaemenid Empire.",
      "Xenophon. (c. -370). Cyropaedia (Education of Cyrus)."
    ],
    research_gaps: ["The exact details of early Persian religious practices prior to the full codification of Zoroastrianism remain analyzed under thin archaeological evidence."],
    created_at: "2026-05-31T18:20:00Z",
    updated_at: "2026-05-31T18:20:00Z"
  },

  // 15. King Faisal
  {
    person_id: "king_faisal",
    name: "King Faisal",
    aliases: ["Faisal ibn Abdulaziz Al Saud", "Faisal of Saudi Arabia"],
    birth_year: 1906,
    death_year: 1975,
    countries_or_regions: ["Saudi Arabia", "Middle East"],
    era: "20th Century / Cold War / Arab-Israeli Conflict / Oil Crisis",
    roles: ["King of Saudi Arabia", "Prime Minister", "Foreign Minister", "Crown Prince"],
    domains: ["Geopolitics", "Statecraft", "Econ"],
    priority_tier: 2,
    short_summary: "King of Saudi Arabia who modernized the kingdom's administration, implemented critical social and educational reforms, and successfully deployed the 'oil weapon' during the 1973 oil embargo to assert Arab geopolitical power.",
    timeline: [
      {
        date_or_year: "1932",
        event: "Appointed Foreign Minister of the newly unified Kingdom of Saudi Arabia, managing early international relations.",
        importance: "medium",
        sources: ["Al-Rasheed (2002)", "Vassiliev (1998)"]
      },
      {
        date_or_year: "1964-11-02",
        event: "Ascended the throne as King after a family council deposed his older brother, the incompetent King Saud.",
        importance: "high",
        sources: ["Al-Rasheed (2002)"]
      },
      {
        date_or_year: "1965",
        event: "Introduced national television and expanded public education for girls, successfully navigating intense religious conservative backlash.",
        importance: "high",
        sources: ["Vassiliev (1998)"]
      },
      {
        date_or_year: "1973-10-17",
        event: "Led the Arab oil ministers to launch the 1973 Oil Embargo against Western nations supporting Israel in the Yom Kippur War, triggering a global energy crisis and multiplying oil revenues.",
        importance: "high",
        sources: ["Yergin (1991)", "Al-Rasheed (2002)"]
      },
      {
        date_or_year: "1975-03-25",
        event: "Assassinated in Riyadh by his nephew Prince Faisal bin Musaid; succeeded smoothly by King Khalid.",
        importance: "high",
        sources: ["Vassiliev (1998)"]
      }
    ],
    power_base: "Unrivaled consensus within the Al Saud royal family, support from the technocratic middle class, strategic alliance with the United States (oil-for-security), and massive, newly acquired petrodollar wealth.",
    core_goals: [
      "Modernize Saudi Arabia's administrative, financial, and educational infrastructure without destroying its Islamic moral base.",
      "Defend Arab interests and Islamic solidarity, particularly in opposition to Israel and Zionism.",
      "Avert the spread of radical secular Arab socialism (Nasserism) and Soviet influence in the Persian Gulf."
    ],
    incentives: [
      "The massive financial insolvency and administrative chaos inherited from his brother King Saud's reign.",
      "The intense ideological rivalry with Gamal Abdel Nasser's Egypt (the Yemen Proxy War).",
      "The strategic necessity of maintaining the US security umbrella while defending regional Arab legitimacy."
    ],
    constraints: [
      "Extreme, entrenched religious and social conservatism among the Wahhabi clerics (Ulema).",
      "The lack of a modernized, educated native labor force, forcing early reliance on foreign workers.",
      "The delicate task of wielding the 'oil weapon' without provoking a direct US military intervention."
    ],
    allies: ["Al Saud Royal Family Council", "United States Government (strategically)", "Anwar Sadat (post-1970)", "Zaki Yamani (oil minister)"],
    rivals: ["King Saud (deposed brother)", "Gamal Abdel Nasser (ideological rival)", "Soviet Union", "Rival left-wing revolutionary movements in Yemen and Oman"],
    institutions_controlled_or_influenced: ["Kingdom of Saudi Arabia", "OPEC", "Organization of Islamic Cooperation (OIC)", "Aramco"],
    ideology_or_worldview: {
      summary: "Islamic modernization and pan-Islamic solidarity. Advocated for administrative efficiency, technological development, and education (including for women) within a strict, conservative Islamic monarchy, while championing Islamic unity against both Western secularism and Soviet atheism.",
      evidence: [
        "His successful establishment of girls' schools, deploying police guards to protect them against conservative rioters.",
        "His leadership in founding the Organization of Islamic Cooperation to build a unified Islamic geopolitical bloc."
      ],
      confidence: "high"
    },
    decision_patterns: [
      {
        pattern: "Deliberate, consensus-based family decision-making coupled with bold, calculated geopolitical strikes when the strategic window opened.",
        examples: [
          "Securing a formal fatwa from the Ulema to legally depose his brother King Saud in 1964.",
          "Unifying OPEC to slash oil production in 1973 only after verifying that President Nixon had authorized a $2 billion emergency airlift of arms to Israel."
        ],
        confidence: "high"
      }
    ],
    crisis_behavior: "Cool, resolute, and highly strategic; during the Yom Kippur War, he successfully balanced intense Arab pressure to act with the strategic need to preserve the long-term US security alliance, using the embargo as a precise surgical tool.",
    negotiation_style: "Dignified, patient, and highly formal; utilized personal honor, Islamic rhetoric, and the implicit threat of oil cutbacks to negotiate with Western diplomats (such as Kissinger).",
    risk_tolerance: "medium",
    centralization_preference: "high",
    conflict_preference: "medium",
    institutional_respect: "high",
    coalition_dependency: "high",
    populism_level: "low",
    technocratic_level: "high",
    game_theory_profile: {
      main_players: ["Saudi Arabia (Faisal)", "United States (Kissinger)", "Egypt (Sadat)", "OPEC Members"],
      likely_objectives: [
        "Saudi Arabia: Modernize state, contain communism, secure US defense guarantee, support Arab claims.",
        "United States: Secure cheap oil supply, protect Israel, contain Soviet influence.",
        "Egypt: Recover Sinai, secure Saudi financial subsidies.",
        "OPEC: Maximize oil revenue, assert sovereign control over resources."
      ],
      payoffs: [
        "The 1973 Oil Embargo Nash Equilibrium: By initiating the embargo, Faisal successfully forced the US to undertake active mediation in the Arab-Israeli conflict, while OPEC permanently seized control of oil pricing from Western oil companies, multiplying Saudi Arabia's wealth and geopolitical power (Highest strategic payoff)."
      ],
      constraints: ["Direct, permanent cuts in oil supply risked a military confrontation with the US or a severe global depression that would destroy Saudi assets, forcing a surgical, temporary embargo."],
      common_strategic_moves: ["Oil production cuts", "Funding regional proxy forces", "Building pan-Islamic coalitions"],
      failure_modes: ["His tragic assassination by a disgruntled, radicalized family member, demonstrating the constant danger of internal royal instability."]
    },
    bayesian_assessment: [
      {
        claim: "Faisal's 1973 oil embargo was a surprise, emotional strike rather than a calculated strategic decision.",
        prior_confidence: "low",
        evidence: [
          "His public, highly passionate rhetoric regarding the liberation of Jerusalem and the rights of Palestinians.",
          "His extensive private meetings with Sadat prior to the war, his repeated, explicit warnings to US oil executives and diplomats throughout 1972-1973 that oil supply was contingent on US foreign policy, and his prompt ending of the embargo once disengagement talks began, showing meticulous tactical planning."
        ],
        posterior_confidence: "low",
        what_would_change_this: "Discovery of private Saudi council minutes showing that Faisal had vetoed any oil action until he was suddenly overwhelmed by emotional panic on October 16."
      }
    ],
    historical_comparisons: [
      {
        compared_to: "Meiji Emperor",
        similarities: [
          "Conservative monarchs who successfully modernized their highly traditional states' administrative and technological infrastructure to defend against external threats.",
          "Both carefully balanced rapid foreign modernization with the preservation of core traditional/religious values."
        ],
        differences: [
          "Faisal operated in a resource-rich 20th-century desert kingdom dominated by oil economics, whereas the Meiji Emperor governed a resource-poor 19th-century island nation focused on industrial manufacturing."
        ],
        confidence: "high"
      }
    ],
    source_quality: {
      overall: "strong",
      notes: "Relies on official OPEC files, declassified US State Department archives, Saudi histories by Madawi Al-Rasheed and Alexei Vassiliev, and Daniel Yergin's classic history of oil.",
      source_count: 5
    },
    sources: [
      "Al-Rasheed, Madawi. (2002). A History of Saudi Arabia.",
      "Vassiliev, Alexei. (1998). The History of Saudi Arabia.",
      "Yergin, Daniel. (1991). The Prize: The Epic Quest for Oil, Money, and Power.",
      "Declassified US State Department Files (Saudi Arabia 1969-1975).",
      "Sheean, Vincent. (1975). Faisal: The King and His Kingdom."
    ],
    research_gaps: ["The exact degree of behind-the-scenes family negotiations surrounding the deposition of King Saud in 1964 remains partially obscured by royal privacy."],
    created_at: "2026-05-31T18:20:00Z",
    updated_at: "2026-05-31T18:20:00Z"
  }
];

// Compile databases dynamically
const sources_db: Source[] = [];
const claims_db: Claim[] = [];

batch7_profiles.forEach(p => {
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
  console.log("Starting batch 7 generation...");

  // 1. Validate new profiles
  let totalErrors = 0;
  batch7_profiles.forEach((profile, idx) => {
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

  console.log("All 15 batch 7 profiles successfully passed schema validation!");

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
  const newProfiles = batch7_profiles.map(p => JSON.stringify(p)).join("\n") + "\n";
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

  // Create a map of existing queue elements by person_id to check if they are already in the queue
  const queueMap = new Map<string, any>();
  queueLines.forEach(l => {
    try {
      const obj = JSON.parse(l);
      queueMap.set(obj.person_id, obj);
    } catch (e) {}
  });

  // Add the 15 new figures to the queue if not already there, or update status to completed
  batch7_profiles.forEach(p => {
    queueMap.set(p.person_id, {
      person_id: p.person_id,
      name: p.name,
      priority_tier: p.priority_tier,
      status: "completed",
      region: p.countries_or_regions[1] || p.countries_or_regions[0]
    });
  });

  const updatedQueueLines = Array.from(queueMap.values()).map(obj => JSON.stringify(obj)).join("\n") + "\n";
  await fs.writeFile(queuePath, updatedQueueLines);
  console.log(`Updated queue.jsonl with new figures.`);

  // Read updated profiles lines to count total
  const finalProfilesData = await fs.readFile(profilesPath, "utf8");
  const finalProfilesCount = finalProfilesData.split("\n").filter(l => l.trim() !== "").length;

  // Update progress.json
  const progressPath = join(process.cwd(), "data/progress.json");
  const newProgress = {
    total_queued: finalProfilesCount,
    completed_count: finalProfilesCount,
    failed_count: 0,
    needs_review_count: 0,
    last_updated: new Date().toISOString()
  };
  await fs.writeFile(progressPath, JSON.stringify(newProgress, null, 2) + "\n");
  console.log(`Updated data/progress.json: ${finalProfilesCount} total profiles completed.`);
}

main().catch(err => {
  console.error("Fatal error during batch 7 execution:", err);
  process.exit(1);
});
