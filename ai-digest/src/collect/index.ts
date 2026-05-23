import type { Candidate } from "../types.js";
import { SOURCES, MAX_AGE_DAYS } from "../config.js";
import { collectRss } from "./rss.js";
import { collectHackerNews } from "./hackernews.js";
import { log } from "../util/log.js";

/** Run every collector, then merge duplicates (boosting corroboration). */
export async function collectAll(): Promise<Candidate[]> {
  const batches = await Promise.all([
    ...SOURCES.map((s) => collectRss(s)),
    collectHackerNews(),
  ]);
  const all = batches.flat();
  log(`collected ${all.length} raw items from ${batches.length} sources`);

  const cutoff = Date.now() - MAX_AGE_DAYS * 86_400_000;
  const merged = new Map<string, Candidate>();
  for (const c of all) {
    if (!c.url || !c.title) continue;
    // Drop stale items, but keep undated ones (some feeds omit dates).
    if (c.publishedAt) {
      const t = new Date(c.publishedAt).getTime();
      if (!Number.isNaN(t) && t < cutoff) continue;
    }
    const existing = merged.get(c.key);
    if (existing) {
      existing.corroboration += 1;
      // Upgrade a "cited" placeholder when a real source surfaces the same URL.
      if (existing.sourceId.includes(":cited") && !c.sourceId.includes(":cited")) {
        existing.sourceName = c.sourceName;
        existing.sourceId = c.sourceId;
        existing.title = c.title;
        existing.author = c.author ?? existing.author;
      }
      if ((c.summary?.length ?? 0) > (existing.summary?.length ?? 0)) existing.summary = c.summary;
    } else {
      merged.set(c.key, { ...c });
    }
  }
  const result = [...merged.values()];
  log(`merged to ${result.length} unique candidates`);
  return result;
}
