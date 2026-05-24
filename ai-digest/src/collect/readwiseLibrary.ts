import { env } from "../config.js";
import { canonicalizeUrl, keyForUrl } from "../util/url.js";
import { log, warn } from "../util/log.js";

const LIST_URL = "https://readwise.io/api/v3/list/";

export interface LibraryDoc {
  key: string;
  url: string;
  title: string;
  author?: string;
  location?: string; // new | later | shortlist | archive | feed
  readingProgress: number; // 0..1
}

/** How far back to pull library items (bounds the number of pages fetched). */
const LOOKBACK_DAYS = 90;

/**
 * Fetch the reader's existing Reader library so we can (a) avoid recommending
 * anything already saved and (b) learn from what they've engaged with.
 * Returns [] if there's no token or the feedback loop is disabled.
 */
export async function fetchReaderLibrary(): Promise<LibraryDoc[]> {
  if (!env.readwiseToken || !env.readwiseFeedback) return [];
  const updatedAfter = new Date(Date.now() - LOOKBACK_DAYS * 86_400_000).toISOString();
  const docs: LibraryDoc[] = [];
  let cursor: string | undefined;
  let pages = 0;

  try {
    do {
      const params = new URLSearchParams({ updatedAfter, withHtmlContent: "false" });
      if (cursor) params.set("pageCursor", cursor);
      const res = await fetch(`${LIST_URL}?${params}`, {
        headers: { Authorization: `Token ${env.readwiseToken}` },
        signal: AbortSignal.timeout(30_000),
      });
      if (res.status === 429) {
        const retry = Number(res.headers.get("Retry-After") || "5");
        await new Promise((r) => setTimeout(r, retry * 1000));
        continue;
      }
      if (!res.ok) {
        warn(`Readwise list ${res.status}`);
        break;
      }
      const data = (await res.json()) as {
        results: { source_url?: string; url?: string; title?: string; author?: string; location?: string; reading_progress?: number }[];
        nextPageCursor?: string | null;
      };
      for (const d of data.results ?? []) {
        const url = d.source_url || d.url;
        if (!url) continue;
        docs.push({
          key: keyForUrl(url),
          url: canonicalizeUrl(url),
          title: d.title ?? "",
          author: d.author,
          location: d.location,
          readingProgress: d.reading_progress ?? 0,
        });
      }
      cursor = data.nextPageCursor || undefined;
    } while (cursor && ++pages < 20);

    log(`fetched ${docs.length} docs from Readwise library`);
    return docs;
  } catch (e) {
    warn("Readwise library fetch failed:", (e as Error).message);
    return docs;
  }
}

/** Titles of items the reader actually engaged with — a positive taste signal. */
export function engagedTitles(docs: LibraryDoc[], limit = 40): string[] {
  return docs
    .filter((d) => d.location === "archive" || d.readingProgress > 0.25)
    .map((d) => d.title)
    .filter((t): t is string => Boolean(t))
    .slice(0, limit);
}
