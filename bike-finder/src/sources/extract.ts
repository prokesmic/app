import * as cheerio from "cheerio";
import type { Listing } from "../types.js";
import { absoluteUrl, parsePrice } from "../util.js";
import { settings } from "../config.js";

/**
 * Generic, resilient extractor used by every source.
 *
 * Rather than depend on brittle CSS class names (which marketplaces change
 * often), we find every <a> whose href matches the source's detail-page
 * pattern, then walk up to a reasonable container and read the title, price,
 * description and thumbnail from the surrounding text/markup.
 */
export function extractByDetailLink(
  html: string,
  pageUrl: string,
  opts: {
    source: string;
    /** Matches detail-page hrefs and captures a stable id in group 1. */
    detailHref: RegExp;
  },
): Listing[] {
  const $ = cheerio.load(html);
  const out = new Map<string, Listing>();

  $("a[href]").each((_, el) => {
    const href = $(el).attr("href") ?? "";
    const m = href.match(opts.detailHref);
    if (!m) return;

    const detailId = m[1] ?? href;
    const id = `${opts.source}:${detailId}`;
    if (out.has(id)) return;

    const url = absoluteUrl(href, pageUrl);

    // Climb to a container that holds the price text too.
    let container = $(el).closest("li, article, div");
    for (let i = 0; i < 3; i++) {
      const txt = container.text();
      if (/K[čc]|€/.test(txt) || container.parent().length === 0) break;
      container = container.parent();
    }

    const containerText = container.text().replace(/\s+/g, " ").trim();
    const linkText = $(el).text().replace(/\s+/g, " ").trim();
    const title = linkText.length >= 3 ? linkText : containerText.slice(0, 80);

    const priceCzk = parsePrice(containerText, settings.eurToCzk);

    let image: string | null = null;
    const img = container.find("img").first();
    if (img.length) {
      image =
        img.attr("src") ||
        img.attr("data-src") ||
        img.attr("data-original") ||
        null;
      if (image) image = absoluteUrl(image, pageUrl);
    }

    // Description = container text minus the title, trimmed.
    let description = containerText;
    if (title && description.startsWith(title)) {
      description = description.slice(title.length).trim();
    }
    description = description.slice(0, 600);

    out.set(id, { id, source: opts.source, title, url, priceCzk, description, image });
  });

  return [...out.values()];
}
