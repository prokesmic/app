import type { Listing, Source } from "../types.js";
import { profile } from "../config.js";
import { extractByDetailLink } from "./extract.js";

/**
 * Bazoš — sport section (sport.bazos.cz). Query-based: one search per
 * brand/model term, capped at the budget. Detail ads live at
 * /inzerat/<id>/<slug>.php.
 */
const SEARCH_TERMS = [
  // Explicitly requested brands
  "specialized tarmac",
  "specialized venge",
  "specialized allez sprint",
  "trek emonda",
  "trek madone",
  "canyon ultimate",
  "canyon aeroad",
  "cannondale supersix",
  "cannondale caad",
  "bmc teammachine",
  "bmc slr",
  // Additional top premium race brands
  "cervelo",
  "pinarello",
  "colnago",
  "scott addict",
  "scott foil",
  "wilier",
  "giant tcr",
  "giant propel",
  "bianchi",
  "look",
  "factor",
  "ridley",
  "orbea orca",
];

export const bazos: Source = {
  name: "bazos",
  buildUrls() {
    return SEARCH_TERMS.map((term) => {
      const q = encodeURIComponent(term);
      return `https://sport.bazos.cz/?hledat=${q}&hlokalita=&humkreis=200&cenaod=&cenado=${profile.budgetCzk}&kitx=ano`;
    });
  },
  parse(html: string, pageUrl: string): Listing[] {
    return extractByDetailLink(html, pageUrl, {
      source: "bazos",
      detailHref: /\/inzerat\/(\d+)\//,
    });
  },
};
