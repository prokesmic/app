import { profile } from "./config.js";
import type { Listing, ScoreResult } from "./types.js";
import { containsAny, normalize } from "./util.js";

/** Find a brand mention. */
function detectBrand(text: string): string | null {
  for (const b of profile.brands) {
    if (text.includes(b)) return b;
  }
  return null;
}

/** Find a model mention (race or endurance). */
function detectModel(text: string): { model: string | null; race: boolean; endurance: boolean } {
  for (const m of profile.raceModels) {
    if (text.includes(normalize(m))) return { model: m, race: true, endurance: false };
  }
  for (const m of profile.enduranceModels) {
    if (text.includes(normalize(m))) return { model: m, race: false, endurance: true };
  }
  return { model: null, race: false, endurance: false };
}

/**
 * Detect frame size. Numeric cm sizes are only trusted when they sit next to a
 * size cue (vel/velikost/rám/size/cm) to avoid matching model years or "11s".
 * Letter sizes are matched as standalone tokens.
 */
function detectSize(rawText: string, normText: string): { size: string | null; match: boolean } {
  // Letter size as a standalone token.
  const letter = normText.match(/(?<![a-z])(xxl|xl|l|m|s|xs)(?![a-z])/);
  if (letter?.[1]) {
    const tok = letter[1];
    if ((profile.size.letters as readonly string[]).includes(tok)) {
      return { size: tok.toUpperCase(), match: true };
    }
  }

  // Numeric cm size near a size cue, or followed by cm / ".
  const numeric = rawText.match(
    /(?:vel(?:ikost)?\.?\s*|r[áa]m(?:u)?\s*|size\s*|cm\s*)?(\b(?:4[6-9]|5\d|6[0-4])\b)(?:\s*cm|"|\s*vel)?/i,
  );
  if (numeric?.[1]) {
    const cm = Number(numeric[1]);
    const context = numeric[0].toLowerCase();
    const hasCue = /vel|r[áa]m|size|cm|"/.test(context);
    if (hasCue) {
      const match = (profile.size.acceptCm as readonly number[]).includes(cm);
      return { size: `${cm}`, match };
    }
  }
  return { size: null, match: false };
}

function detectGroupset(text: string): string | null {
  for (const g of profile.goodGroupsets) {
    if (text.includes(normalize(g))) return g;
  }
  return null;
}

/**
 * Score a listing against the buyer profile.
 *
 * Hard rejects (return immediately, never "excellent"):
 *  - over budget / unknown price
 *  - non-premium brand
 *  - electronic shifting (Di2/eTap/AXS)
 *  - 12-speed (incompatible with the 11s cassette already on the trainer)
 */
export function scoreListing(listing: Listing): ScoreResult {
  const raw = `${listing.title}\n${listing.description}`;
  const text = normalize(raw);
  const reasons: string[] = [];

  const brand = detectBrand(text);
  const { model, race, endurance } = detectModel(text);
  const { size, match: sizeMatch } = detectSize(raw, text);
  const groupset = detectGroupset(text);
  const electronic = containsAny(text, profile.electronicSignals as unknown as string[]);
  const twelveSpeed = containsAny(text, profile.twelveSpeedSignals as unknown as string[]);
  const nonRoad = containsAny(text, profile.nonRoadSignals as unknown as string[]);
  const elevenSpeed = !!groupset && !twelveSpeed;
  const discreetColor = containsAny(text, profile.discreetColors as unknown as string[]);
  const loudColor = containsAny(text, profile.loudColors as unknown as string[]);
  const likeNew = containsAny(text, profile.likeNewSignals as unknown as string[]);

  const signals = {
    brand, model, size, sizeMatch, groupset,
    elevenSpeed, electronic, twelveSpeed, discreetColor, likeNew,
  };

  const reject = (why: string): ScoreResult => ({
    score: 0, excellent: false, rejectedReason: why, reasons: [why], signals,
  });

  // ---- Hard rejects -------------------------------------------------------
  if (listing.priceCzk == null) return reject("Cena neuvedena/neparsovatelná");
  if (listing.priceCzk > profile.budgetCzk) {
    return reject(`Nad rozpočet (${listing.priceCzk} Kč > ${profile.budgetCzk} Kč)`);
  }
  if (!brand) return reject("Není TOP prémiová značka");
  if (nonRoad) return reject("Není silniční závodní kolo (MTB/cross/trek/city/e-bike)");
  if (electronic) return reject("Elektronické řazení (Di2/eTap/AXS) — nechceme");
  if (twelveSpeed) return reject("12rychlostní — nekompatibilní s 11s kazetou");

  // ---- Points -------------------------------------------------------------
  let score = 0;
  score += 2;
  reasons.push(`Značka: ${brand} ✓`);

  if (race) {
    score += 3;
    reasons.push(`Závodní geometrie (${model}) ✓`);
  } else if (endurance) {
    score -= 2;
    reasons.push(`Endurance geometrie (${model}) — vzdálené Tarmac SL7`);
  }

  if (groupset) {
    score += 3;
    reasons.push(`11s mechanické řazení (${groupset.toUpperCase()}) ✓`);
  } else {
    reasons.push("11s řazení nepotvrzeno v inzerátu — ověřit");
  }

  if (sizeMatch && size) {
    score += 3;
    reasons.push(`Velikost ${size} odpovídá (190 cm) ✓`);
  } else if (size) {
    reasons.push(`Velikost ${size} — mimo cílový rozsah`);
  } else {
    reasons.push("Velikost neuvedena — ověřit");
  }

  if (discreetColor && !loudColor) {
    score += 1;
    reasons.push("Decentní barva ✓");
  } else if (loudColor) {
    score -= 1;
    reasons.push("Výrazná barva — méně vhodné");
  }

  if (likeNew) {
    score += 1;
    reasons.push("Zánovní / TOP stav ✓");
  }

  // Price headroom bonus: cheaper than budget is better.
  const headroom = profile.budgetCzk - listing.priceCzk;
  if (headroom >= 8000) {
    score += 1;
    reasons.push(`Cena ${listing.priceCzk} Kč — výrazně pod rozpočtem`);
  }

  // ---- Excellence gate ----------------------------------------------------
  // Only push truly excellent finds: right size, confirmed 11s, race-ish geo,
  // and a high overall score.
  const excellent =
    score >= profile.excellentThreshold &&
    sizeMatch &&
    elevenSpeed &&
    !endurance;

  return { score, excellent, rejectedReason: null, reasons, signals };
}
