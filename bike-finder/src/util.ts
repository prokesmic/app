/** Lowercase and strip Czech diacritics so keyword matching is robust. */
export function normalize(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

/** True if `haystack` (already normalized) contains any of the normalized needles. */
export function containsAny(haystackNorm: string, needles: string[]): boolean {
  return needles.some((n) => haystackNorm.includes(normalize(n)));
}

/**
 * Parse a CZK price out of arbitrary listing text.
 * Handles "15 000 Kč", "15.000 Kč", non-breaking spaces, and "€" amounts
 * (converted at `eurToCzk`). Returns null when no price is found.
 */
export function parsePrice(text: string, eurToCzk = 25): number | null {
  const clean = text.replace(/ /g, " ");

  const czk = clean.match(/(\d[\d .]*\d|\d)\s*K[čc]/i);
  if (czk?.[1]) {
    const n = Number(czk[1].replace(/[ .]/g, ""));
    if (Number.isFinite(n) && n > 0) return n;
  }

  const eur = clean.match(/(\d[\d .]*)(?:,(\d{1,2}))?\s*€/);
  if (eur?.[1]) {
    const whole = Number(eur[1].replace(/[ .]/g, ""));
    if (Number.isFinite(whole) && whole > 0) {
      return Math.round(whole * eurToCzk);
    }
  }
  return null;
}

export function absoluteUrl(href: string, base: string): string {
  try {
    return new URL(href, base).toString();
  } catch {
    return href;
  }
}

export function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/** Fetch with a browser-like User-Agent and a hard timeout. */
export async function fetchHtml(url: string, timeoutMs = 20000): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
        "Accept-Language": "cs-CZ,cs;q=0.9,en;q=0.6",
        Accept: "text/html,application/xhtml+xml",
      },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
    return await res.text();
  } finally {
    clearTimeout(timer);
  }
}
