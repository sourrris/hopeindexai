/**
 * Minimal article fetch helpers for pipeline ingestion.
 *
 * These deliberately avoid the caching/complexity in api/index.ts so they can
 * be used during batch enrichment without side effects.
 */

export function hostFromUrl(url: string | undefined): string {
  if (!url) return "";
  try {
    return new URL(url).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return "";
  }
}

export function isSafeHttpUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)));
}

export function extractTitle(html: string): string | undefined {
  const raw = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1];
  if (!raw) return undefined;
  const text = decodeHtmlEntities(raw.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim());
  return text.slice(0, 180) || undefined;
}

export interface ArticleFetchResult {
  url: string;
  domain: string;
  ok: boolean;
  status: string;
  title?: string;
}

export async function fetchArticleTitle(url: string, timeoutMs = 8_000): Promise<ArticleFetchResult> {
  const domain = hostFromUrl(url);
  if (!isSafeHttpUrl(url)) {
    return { url, domain, ok: false, status: "Source URL is not a safe public HTTP(S) URL." };
  }

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      headers: {
        accept: "text/html,application/xhtml+xml,text/plain;q=0.8,*/*;q=0.2",
        "user-agent": "HopeIndexAI/0.1 causal-analysis-bot",
      },
      signal: ctrl.signal,
      redirect: "follow",
    });
    clearTimeout(timer);

    if (!res.ok) {
      return { url, domain, ok: false, status: `Source fetch failed with HTTP ${res.status}.` };
    }

    const raw = await res.text();
    const title = extractTitle(raw);
    if (!title) {
      return { url, domain, ok: false, status: "Source fetched, but no <title> tag was found." };
    }
    return { url, domain, ok: true, status: "Title extracted.", title };
  } catch (err: any) {
    clearTimeout(timer);
    return { url, domain, ok: false, status: `Source fetch failed: ${err.name === "AbortError" ? "timeout" : err.message}.` };
  }
}

/**
 * Fetch titles for many URLs with a concurrency limit.
 */
export async function fetchTitlesInBatches(
  urls: string[],
  concurrency: number,
  timeoutMs = 8_000,
  onProgress?: (done: number, total: number) => void
): Promise<Map<string, ArticleFetchResult>> {
  const results = new Map<string, ArticleFetchResult>();
  const uniqueUrls = [...new Set(urls)];

  async function fetchOne(url: string): Promise<void> {
    const result = await fetchArticleTitle(url, timeoutMs);
    results.set(url, result);
  }

  let done = 0;
  for (let i = 0; i < uniqueUrls.length; i += concurrency) {
    const batch = uniqueUrls.slice(i, i + concurrency);
    await Promise.all(batch.map(async (url) => {
      await fetchOne(url);
      done++;
      onProgress?.(done, uniqueUrls.length);
    }));
  }

  return results;
}
