import Parser from "rss-parser";
import type { Candidate, SourceDef } from "../types.js";
import { canonicalizeUrl, domainOf, keyForUrl } from "../util/url.js";
import { stripHtml, extractLinks } from "../util/html.js";
import { warn } from "../util/log.js";

const parser = new Parser({ timeout: 20_000, headers: { "User-Agent": "ai-digest/0.1 (+https://github.com)" } });

/** Navigation/self-promo/social/asset noise to exclude when mining show-note links. */
const LINK_NOISE =
  /(x\.com|twitter\.com|t\.co\/|substack\.com\/(subscribe|profile|app)|substackcdn\.com|amazonaws\.com|cloudfront\.net|\/image\/fetch|facebook\.com|instagram\.com|linkedin\.com|patreon\.com|reddit\.com|spotify\.com|apple\.com|youtube\.com\/@|youtu\.be|megaphone\.fm|anchor\.fm|buzzsprout\.com|marketingaiinstitute\.com|smarterx\.ai|news\.smol\.ai|docs\.google\.com|support\.substack\.com|pod\.link|mailto:)/i;
const ASSET_EXT = /\.(png|jpe?g|gif|svg|webp|ico|mp3|mp4|wav)(\?|$)/i;
/** One annotated post can cite hundreds of links; cap to keep signal high. */
const MAX_MINED_LINKS_PER_ITEM = 12;

export async function collectRss(source: SourceDef): Promise<Candidate[]> {
  if (!source.feed) return [];
  let feed: Awaited<ReturnType<typeof parser.parseURL>>;
  try {
    feed = await parser.parseURL(source.feed);
  } catch (e) {
    warn(`feed failed: ${source.name}`, (e as Error).message);
    return [];
  }

  const out: Candidate[] = [];
  for (const item of feed.items ?? []) {
    const url = item.link;
    if (!url) continue;
    const enc = item as { content?: string; "content:encoded"?: string };
    const html = enc["content:encoded"] || enc.content || "";
    out.push({
      key: keyForUrl(url),
      url: canonicalizeUrl(url),
      title: (item.title || "(untitled)").trim(),
      author: item.creator || (item as { author?: string }).author || source.name,
      sourceId: source.id,
      sourceName: source.name,
      sourceKind: source.kind,
      publishedAt: item.isoDate || item.pubDate,
      summary: stripHtml(item.contentSnippet || html || ""),
      corroboration: 1,
    });

    // Mine cited links out of annotated show notes (e.g. Latent Space).
    if (source.mineLinks && html) {
      let mined = 0;
      for (const { url: linkUrl, text } of extractLinks(html)) {
        if (mined >= MAX_MINED_LINKS_PER_ITEM) break;
        const d = domainOf(linkUrl);
        if (!d || d === domainOf(url)) continue;
        if (LINK_NOISE.test(linkUrl) || ASSET_EXT.test(linkUrl)) continue;
        // Require descriptive anchor text. Promo/sponsor links use the URL as
        // their text (often wrapped in zero-width format chars); real citations
        // use a human description. \p{Cf} strips the zero-width wrappers.
        const t = text.replace(/\p{Cf}/gu, "").trim();
        const low = t.toLowerCase();
        if (t.length < 6 || t.startsWith("@")) continue;
        if (low.includes("://") || low.includes("www.") || low.includes(d)) continue;
        mined++;
        out.push({
          key: keyForUrl(linkUrl),
          url: canonicalizeUrl(linkUrl),
          title: t,
          author: undefined,
          sourceId: `${source.id}:cited`,
          sourceName: `${source.name} (cited)`,
          sourceKind: source.kind,
          publishedAt: item.isoDate || item.pubDate,
          summary: `Cited in "${(item.title || "").trim()}"`,
          corroboration: 1,
        });
      }
    }
  }
  return out;
}
