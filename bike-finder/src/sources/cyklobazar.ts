import type { Listing, Source } from "../types.js";
import { extractByDetailLink } from "./extract.js";

/**
 * Cyklobazar.cz — used road bikes. List-based: scan the newest pages and let
 * the scorer filter by brand/price/spec. Detail ads live at /inzerat/<id>/<slug>.
 */
const PAGES = 2;

export const cyklobazar: Source = {
  name: "cyklobazar",
  buildUrls() {
    const urls: string[] = [];
    for (let p = 1; p <= PAGES; p++) {
      urls.push(
        `https://www.cyklobazar.cz/silnicni-kola?condition=used&sort=newest&vp-page=${p}`,
      );
    }
    return urls;
  },
  parse(html: string, pageUrl: string): Listing[] {
    return extractByDetailLink(html, pageUrl, {
      source: "cyklobazar",
      detailHref: /\/inzerat\/([A-Za-z0-9]+)\//,
    });
  },
};
