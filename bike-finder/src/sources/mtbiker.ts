import type { Listing, Source } from "../types.js";
import { extractByDetailLink } from "./extract.js";

/**
 * MTBIKER bazar — road bikes. This is where the former Bike-forum.cz bazar
 * was merged. List-based: scan newest pages, scorer filters. Detail ads live
 * at /bazar/kola/<category>/<id>/<slug>.html.
 */
const PAGES = 2;

export const mtbiker: Source = {
  name: "mtbiker",
  buildUrls() {
    const urls: string[] = [];
    for (let p = 1; p <= PAGES; p++) {
      urls.push(`https://www.mtbiker.cz/bazar/kola/silnicni?strana=${p}`);
    }
    return urls;
  },
  parse(html: string, pageUrl: string): Listing[] {
    return extractByDetailLink(html, pageUrl, {
      source: "mtbiker",
      detailHref: /\/bazar\/kola\/[a-z-]+\/(\d+)\//,
    });
  },
};
