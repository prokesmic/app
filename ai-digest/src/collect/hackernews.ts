import type { Candidate } from "../types.js";
import { HN_SEARCH_URL, HN_KEYWORDS } from "../config.js";
import { canonicalizeUrl, keyForUrl } from "../util/url.js";
import { warn } from "../util/log.js";

interface HnHit {
  objectID: string;
  title?: string;
  url?: string;
  points?: number;
  created_at?: string;
  author?: string;
}

/** Front-page HN items that look AI-related, by title keyword. */
export async function collectHackerNews(): Promise<Candidate[]> {
  try {
    const res = await fetch(HN_SEARCH_URL, { signal: AbortSignal.timeout(20_000) });
    if (!res.ok) {
      warn(`HN API ${res.status}`);
      return [];
    }
    const data = (await res.json()) as { hits: HnHit[] };
    const out: Candidate[] = [];
    for (const hit of data.hits ?? []) {
      if (!hit.url || !hit.title) continue;
      const hay = hit.title.toLowerCase();
      if (!HN_KEYWORDS.some((k) => hay.includes(k))) continue;
      out.push({
        key: keyForUrl(hit.url),
        url: canonicalizeUrl(hit.url),
        title: hit.title.trim(),
        author: hit.author,
        sourceId: "hackernews",
        sourceName: `Hacker News (${hit.points ?? 0} pts)`,
        sourceKind: "aggregator",
        publishedAt: hit.created_at,
        summary: `Front-page Hacker News discussion (${hit.points ?? 0} points).`,
        corroboration: 1,
      });
    }
    return out;
  } catch (e) {
    warn("HN collect failed", (e as Error).message);
    return [];
  }
}
