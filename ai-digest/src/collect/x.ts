import Parser from "rss-parser";
import type { Candidate } from "../types.js";
import { env } from "../config.js";
import { canonicalizeUrl, keyForUrl } from "../util/url.js";
import { stripHtml } from "../util/html.js";
import { log, warn } from "../util/log.js";

const parser = new Parser({ timeout: 20_000, headers: { "User-Agent": "ai-digest/0.1" } });

/**
 * Pluggable X/Twitter collector. Intentionally a no-op unless X_RSSHUB_BASE is
 * set — reading tweets at scale otherwise requires a paid/fragile path (see
 * README "Roadmap"). With a self-hosted RSSHub instance, it pulls recent posts
 * from the configured handles via the `/twitter/user/:id` route.
 */
export async function collectX(): Promise<Candidate[]> {
  if (!env.xRsshubBase) return [];

  const batches = await Promise.all(
    env.xHandles.map(async (handle): Promise<Candidate[]> => {
      const feedUrl = `${env.xRsshubBase}/twitter/user/${handle}`;
      try {
        const feed = await parser.parseURL(feedUrl);
        return (feed.items ?? []).flatMap((item): Candidate[] => {
          if (!item.link) return [];
          return [{
            key: keyForUrl(item.link),
            url: canonicalizeUrl(item.link),
            title: stripHtml(item.title || item.contentSnippet || "", 140) || `Post by @${handle}`,
            author: `@${handle}`,
            sourceId: `x:${handle}`,
            sourceName: `X · @${handle}`,
            sourceKind: "author",
            publishedAt: item.isoDate || item.pubDate,
            summary: stripHtml(item.contentSnippet || item.content || "", 400),
            corroboration: 1,
          }];
        });
      } catch (e) {
        warn(`X feed failed for @${handle}:`, (e as Error).message);
        return [];
      }
    }),
  );
  const all = batches.flat();
  log(`collected ${all.length} X posts from ${env.xHandles.length} handles`);
  return all;
}
