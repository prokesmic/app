import type { ScoredCandidate } from "../types.js";
import { env } from "../config.js";
import { log, warn } from "../util/log.js";

const SAVE_URL = "https://readwise.io/api/v3/save/";

interface SaveResult { ok: boolean; alreadyExists: boolean }

async function saveOne(item: ScoredCandidate): Promise<SaveResult> {
  const body: Record<string, unknown> = {
    url: item.url,
    title: item.title,
    author: item.author || item.sourceName,
    summary: item.reason,
    location: env.location,
    category: item.sourceKind === "papers" ? "pdf" : item.sourceKind === "podcast" ? "rss" : "article",
    tags: [...env.tags, item.sourceId.replace(/:cited$/, "")],
    saved_using: "ai-digest",
    notes: `ai-digest score ${item.score}/100 — ${item.reason}`,
  };
  if (item.publishedAt) body.published_date = item.publishedAt;

  const res = await fetch(SAVE_URL, {
    method: "POST",
    headers: { Authorization: `Token ${env.readwiseToken}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(30_000),
  });

  if (res.status === 429) {
    const retry = Number(res.headers.get("Retry-After") || "5");
    warn(`Readwise rate limited; waiting ${retry}s`);
    await new Promise((r) => setTimeout(r, retry * 1000));
    return saveOne(item);
  }
  if (!res.ok) {
    warn(`Readwise save failed ${res.status} for ${item.url}`);
    return { ok: false, alreadyExists: false };
  }
  return { ok: true, alreadyExists: res.status === 200 };
}

/** Save the chosen items to Readwise Reader. Returns the count successfully saved. */
export async function deliverToReadwise(items: ScoredCandidate[]): Promise<number> {
  if (!env.readwiseToken) {
    warn("no READWISE_TOKEN set — skipping delivery");
    return 0;
  }
  let saved = 0;
  for (const item of items) {
    const r = await saveOne(item);
    if (r.ok) saved++;
    // Stay well under the 50 req/min limit.
    await new Promise((res) => setTimeout(res, 250));
  }
  log(`delivered ${saved}/${items.length} items to Readwise (${env.location})`);
  return saved;
}
