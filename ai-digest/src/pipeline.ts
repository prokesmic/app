import type { ScoredCandidate } from "./types.js";
import { env, RERANK_POOL, PER_SOURCE_CAP } from "./config.js";
import { collectAll } from "./collect/index.js";
import { fetchReaderLibrary, engagedTitles } from "./collect/readwiseLibrary.js";
import { heuristicRank } from "./rank/heuristic.js";
import { llmRank } from "./rank/llm.js";
import { buildProfile, seedProfile } from "./taste/bootstrap.js";
import { deliverToReadwise } from "./deliver/readwise.js";
import { loadSeen, saveSeen, loadProfile, saveProfile } from "./state/store.js";
import { log } from "./util/log.js";

export async function runBootstrap(): Promise<void> {
  const library = await fetchReaderLibrary();
  const profile = await buildProfile(engagedTitles(library));
  await saveProfile(profile);
  log("taste profile saved to state/taste-profile.json");
}

interface DigestOptions {
  dryRun?: boolean;
  refreshProfile?: boolean;
}

export async function runDigest(opts: DigestOptions = {}): Promise<ScoredCandidate[]> {
  // 0. Pull the existing Reader library (engagement feedback loop).
  const library = await fetchReaderLibrary();
  const inLibrary = new Set(library.map((d) => d.key));

  // 1. Taste profile (build on first run or when asked to refresh).
  let profile = await loadProfile();
  if (!profile || opts.refreshProfile) {
    profile = await buildProfile(engagedTitles(library));
    await saveProfile(profile);
  }
  const effectiveProfile = profile ?? seedProfile();

  // 2. Collect + drop anything already delivered OR already in the library.
  const seen = await loadSeen();
  const candidates = (await collectAll()).filter((c) => !seen.items[c.key] && !inLibrary.has(c.key));
  log(`${candidates.length} candidates after removing seen + already-in-library items`);
  if (candidates.length === 0) return [];

  // 3. Heuristic prefilter -> small pool -> LLM rerank (fallback to heuristic).
  const prefiltered = heuristicRank(candidates, effectiveProfile).slice(0, RERANK_POOL);
  const ranked = (await llmRank(prefiltered, effectiveProfile)) ?? heuristicRank(prefiltered, effectiveProfile);

  // 4. Top N for this run, with a per-source cap so no single feed floods the digest.
  const perSource = new Map<string, number>();
  const picks: ScoredCandidate[] = [];
  for (const r of ranked) {
    const base = r.sourceId.replace(/:(cited|transcript)$/, "");
    const n = perSource.get(base) ?? 0;
    if (n >= PER_SOURCE_CAP) continue;
    perSource.set(base, n + 1);
    picks.push(r);
    if (picks.length >= env.limit) break;
  }
  log(`selected ${picks.length} items (limit ${env.limit}, max ${PER_SOURCE_CAP}/source)`);
  for (const p of picks) log(`  [${p.score}] ${p.title} — ${p.reason}`);

  if (opts.dryRun) {
    log("dry-run: not saving state or delivering");
    return picks;
  }

  // 5. Mark seen + deliver.
  const now = new Date().toISOString();
  for (const p of picks) seen.items[p.key] = now;
  await saveSeen(seen);
  await deliverToReadwise(picks);
  return picks;
}
