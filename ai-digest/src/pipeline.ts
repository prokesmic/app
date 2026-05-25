import type { ScoredCandidate } from "./types.js";
import { env, RERANK_POOL, PER_SOURCE_CAP, PROFILE_MAX_AGE_DAYS } from "./config.js";
import { ollamaUp } from "./llm/ollama.js";
import { collectAll } from "./collect/index.js";
import { fetchReaderLibrary, engagedTitles } from "./collect/readwiseLibrary.js";
import { heuristicRank } from "./rank/heuristic.js";
import { llmRank } from "./rank/llm.js";
import { buildProfile, seedProfile } from "./taste/bootstrap.js";
import { deliverToReadwise } from "./deliver/readwise.js";
import { loadSeen, saveSeen, loadProfile, saveProfile } from "./state/store.js";
import { log } from "./util/log.js";
import { notify } from "./util/notify.js";

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

  if (!(await ollamaUp())) {
    log(`Gemma/Ollama not reachable at ${env.ollamaHost} — ranking will use the heuristic fallback. Start it with: ollama serve`);
  }

  // 1. Taste profile (build on first run, when asked, or once it's stale).
  let profile = await loadProfile();
  const stale = profile ? Date.now() - new Date(profile.generatedAt).getTime() > PROFILE_MAX_AGE_DAYS * 86_400_000 : true;
  if (!profile || opts.refreshProfile || stale) {
    log(profile ? "refreshing taste profile" : "building initial taste profile");
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
  const delivered = await deliverToReadwise(picks);

  // 6. Push notification with count + top 3 titles (no-op if NTFY_TOPIC unset).
  const top3 = [...picks].sort((a, b) => b.score - a.score).slice(0, 3);
  const body = top3.map((p) => `[${p.score}] ${p.title}`).join("\n");
  await notify(`ai-digest: ${delivered} items saved`, body);

  return picks;
}
