import { createHash } from "node:crypto";

const TRACKING_PARAMS = /^(utm_|fbclid|gclid|mc_|ref_?$|ref_src|igshid|cmpid|source$)/i;

/** Strip tracking params, fragments, and trailing slashes to a stable form. */
export function canonicalizeUrl(raw: string): string {
  try {
    const u = new URL(raw.trim());
    u.hash = "";
    u.hostname = u.hostname.replace(/^www\./, "").toLowerCase();
    const keep: [string, string][] = [];
    for (const [k, v] of u.searchParams) {
      if (!TRACKING_PARAMS.test(k)) keep.push([k, v]);
    }
    u.search = "";
    keep.sort(([a], [b]) => a.localeCompare(b));
    for (const [k, v] of keep) u.searchParams.append(k, v);
    let s = u.toString();
    if (s.endsWith("/") && u.pathname !== "/") s = s.slice(0, -1);
    return s;
  } catch {
    return raw.trim();
  }
}

export function keyForUrl(raw: string): string {
  return createHash("sha1").update(canonicalizeUrl(raw)).digest("hex").slice(0, 16);
}

export function domainOf(raw: string): string {
  try {
    return new URL(raw).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return "";
  }
}
