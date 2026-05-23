import type { Candidate, ScoredCandidate, TasteProfile } from "../types.js";
import { SOURCES, SEED_KEYWORDS, PREFERRED_DOMAINS_SEED } from "../config.js";
import { domainOf } from "../util/url.js";

const weightOf = new Map(SOURCES.map((s) => [s.id.replace(/:cited$/, ""), s.weight]));

function recencyScore(iso?: string): number {
  if (!iso) return 0.4;
  const ageH = (Date.now() - new Date(iso).getTime()) / 3_600_000;
  if (Number.isNaN(ageH)) return 0.4;
  if (ageH < 12) return 1;
  if (ageH < 24) return 0.85;
  if (ageH < 48) return 0.6;
  if (ageH < 72) return 0.4;
  return 0.25;
}

/**
 * Transparent score used both as the LLM-free fallback and as the prefilter
 * that selects which candidates are worth an LLM rerank.
 */
export function heuristicScore(c: Candidate, profile: TasteProfile | null): ScoredCandidate {
  const keywords = (profile?.keywords?.length ? profile.keywords : SEED_KEYWORDS).map((k) => k.toLowerCase());
  const domains = profile?.preferredDomains?.length ? profile.preferredDomains : PREFERRED_DOMAINS_SEED;
  const authors = (profile?.preferredAuthors ?? []).map((a) => a.toLowerCase());

  const hay = `${c.title} ${c.summary ?? ""}`.toLowerCase();
  const kwHits = keywords.filter((k) => hay.includes(k)).length;
  const kwScore = Math.min(1, kwHits / 4);

  const srcWeight = weightOf.get(c.sourceId.replace(/:cited$/, "")) ?? 0.5;
  const domainBoost = domains.includes(domainOf(c.url)) ? 0.15 : 0;
  const authorBoost = authors.some((a) => (c.author ?? "").toLowerCase().includes(a)) ? 0.15 : 0;
  const corroborationBoost = Math.min(0.2, (c.corroboration - 1) * 0.1);

  const raw =
    0.34 * kwScore +
    0.28 * srcWeight +
    0.22 * recencyScore(c.publishedAt) +
    domainBoost +
    authorBoost +
    corroborationBoost;

  const score = Math.round(Math.min(1, raw) * 100);
  const reasons: string[] = [];
  if (kwHits) reasons.push(`${kwHits} topic match${kwHits > 1 ? "es" : ""}`);
  if (c.corroboration > 1) reasons.push(`cited by ${c.corroboration} sources`);
  if (domainBoost) reasons.push("trusted domain");
  if (authorBoost) reasons.push("followed author");
  reasons.push(`via ${c.sourceName}`);

  return { ...c, score, reason: reasons.join(", ") };
}

export function heuristicRank(candidates: Candidate[], profile: TasteProfile | null): ScoredCandidate[] {
  return candidates.map((c) => heuristicScore(c, profile)).sort((a, b) => b.score - a.score);
}
