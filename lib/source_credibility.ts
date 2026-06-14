/**
 * Minimal source-credibility tiering for HopeIndexAI.
 *
 * This is a deliberately small, curated list. Tier 1 = major international wire/
 * national outlets. Tier 3 = state media, aggregators, and content farms that
 * frequently produce noisy rows. Everything else is Tier 2.
 */

const TIER_1_DOMAINS = new Set([
  "reuters.com",
  "apnews.com",
  "afp.com",
  "france24.com",
  "bbc.com",
  "bbc.co.uk",
  "nytimes.com",
  "washingtonpost.com",
  "wsj.com",
  "ft.com",
  "theguardian.com",
  "economist.com",
  "bloomberg.com",
  "aljazeera.com",
  "dw.com",
  "npr.org",
  "pbs.org",
  "politico.com",
  "axios.com",
  "cbsnews.com",
  "nbcnews.com",
  "abcnews.go.com",
  "cnn.com",
  "usatoday.com",
  "latimes.com",
  "time.com",
  "foreignpolicy.com",
  "irinnews.org",
]);

const TIER_3_DOMAINS = new Set([
  // State / partisan outlets that commonly feed noisy rows
  "presstv.ir",
  "sana.sy",
  "rt.com",
  "rttnews.com",
  "russiaherald.com",
  "caribbeanherald.com",
  "tass.com",
  "xinhuanet.com",
  "globaltimes.cn",
  "chinadaily.com.cn",
  "sputniknews.com",
  "telesurenglish.net",
  "prensa-latina.cu",
  // Aggregators / content farms
  "newkerala.com",
  "freepressjournal.in",
  "promptnewsonline.com",
  "sofiaglobe.com",
  "azertag.az",
  "albawaba.com",
  "globalsecurity.org",
  "wandtv.com",
  "wpbf.com",
  "local3news.com",
  "mandurahmail.com.au",
  "newcastleherald.com.au",
  "harrowtimes.co.uk",
  "cbs19.tv",
  "9news.com",
  "nypost.com",
]);

function hostFromUrl(url: string | undefined): string {
  if (!url) return "";
  try {
    return new URL(url).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return "";
  }
}

/**
 * Return a tier 1, 2, or 3 for a source URL.
 * 1 = trusted major outlet, 3 = state/aggregator/farm, 2 = everything else.
 */
export function sourceTierFromUrl(url: string | undefined): number {
  const host = hostFromUrl(url);
  if (!host) return 2;
  if (TIER_1_DOMAINS.has(host)) return 1;
  if (TIER_3_DOMAINS.has(host)) return 3;
  return 2;
}

/**
 * Convenience one-hot encoding for model features.
 */
export function sourceTierOneHot(url: string | undefined): [number, number, number] {
  const tier = sourceTierFromUrl(url);
  return tier === 1 ? [1, 0, 0] : tier === 3 ? [0, 0, 1] : [0, 1, 0];
}
