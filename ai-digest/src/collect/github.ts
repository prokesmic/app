import type { Candidate } from "../types.js";
import { env } from "../config.js";
import { canonicalizeUrl, keyForUrl } from "../util/url.js";
import { log, warn } from "../util/log.js";

const TOPICS = ["llm", "ai-agents", "generative-ai"];
const PER_TOPIC = 10;
// Genuinely new repos gaining traction — not evergreen megastars that merely got
// a recent push. `created:>` + star sort approximates "trending" without an API for it.
const LOOKBACK_DAYS = 30;
const MIN_STARS = 120;

interface Repo {
  html_url: string;
  full_name: string;
  description: string | null;
  stargazers_count: number;
  pushed_at: string;
}

/** "Trending" AI repos via the official Search API: recently-pushed, star-sorted. */
export async function collectGitHub(): Promise<Candidate[]> {
  const since = new Date(Date.now() - LOOKBACK_DAYS * 86_400_000).toISOString().slice(0, 10);
  const headers: Record<string, string> = { Accept: "application/vnd.github+json" };
  if (env.githubToken) headers.Authorization = `Bearer ${env.githubToken}`;

  const byKey = new Map<string, Candidate>();
  for (const topic of TOPICS) {
    const q = encodeURIComponent(`topic:${topic} created:>${since}`);
    const url = `https://api.github.com/search/repositories?q=${q}&sort=stars&order=desc&per_page=${PER_TOPIC}`;
    try {
      const res = await fetch(url, { headers, signal: AbortSignal.timeout(20_000) });
      if (!res.ok) {
        warn(`GitHub search ${res.status} for topic:${topic}`);
        continue;
      }
      const data = (await res.json()) as { items: Repo[] };
      for (const r of data.items ?? []) {
        if (r.stargazers_count < MIN_STARS) continue;
        const key = keyForUrl(r.html_url);
        if (byKey.has(key)) continue;
        byKey.set(key, {
          key,
          url: canonicalizeUrl(r.html_url),
          title: `${r.full_name} — ${r.description ?? ""}`.trim(),
          author: r.full_name.split("/")[0],
          sourceId: "github",
          sourceName: `GitHub trending (${r.stargazers_count.toLocaleString()}★)`,
          sourceKind: "aggregator",
          publishedAt: r.pushed_at,
          summary: `${r.description ?? "Trending AI repository."} (${r.stargazers_count.toLocaleString()} stars)`,
          corroboration: 1,
        });
      }
    } catch (e) {
      warn(`GitHub search failed for topic:${topic}`, (e as Error).message);
    }
  }
  const out = [...byKey.values()];
  log(`collected ${out.length} GitHub trending repos`);
  return out;
}
