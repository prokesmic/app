import type { Candidate, ScoredCandidate, TasteProfile } from "../types.js";
import { ollamaJson } from "../llm/ollama.js";
import { log } from "../util/log.js";

const SYSTEM = `You are a curator for a single reader. You are given that reader's taste profile (derived from the AI podcasts they listen to and the authors they follow) and a list of candidate items (articles, essays, papers, announcements, posts, podcast episodes, repos). Score how strongly THIS reader would want each item in their daily reading queue.

Scoring guidance (0-100):
- 85-100: squarely in their interests, high-signal, fresh, from a voice or topic they clearly value.
- 60-84: relevant and worth surfacing.
- 30-59: tangential or lower-signal.
- 0-29: off-topic, promotional, duplicative, or low quality.

Reward substantive analysis, primary sources, things multiple trusted sources discuss, and the specific authors/topics in the profile. Penalize SEO listicles, pure marketing, thin rewrites, and clickbait.

Return one entry per candidate id with a score and a terse one-sentence reason written to the reader ("why you'll care"). Respond with JSON only.`;

const SCHEMA = {
  type: "object",
  properties: {
    rankings: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: { type: "string" },
          score: { type: "integer" },
          reason: { type: "string" },
        },
        required: ["id", "score", "reason"],
      },
    },
  },
  required: ["rankings"],
} as const;

function profileBlock(p: TasteProfile): string {
  return [
    `READER TASTE PROFILE`,
    `Summary: ${p.summary}`,
    `Top topics: ${p.topics.map((t) => `${t.name} (${t.weight})`).join(", ")}`,
    `Keywords: ${p.keywords.join(", ")}`,
    `Followed authors: ${p.preferredAuthors.join(", ")}`,
    `Preferred domains: ${p.preferredDomains.join(", ")}`,
  ].join("\n");
}

interface RankResult {
  rankings: { id: string; score: number; reason: string }[];
}

/** Gemma rerank via local Ollama. Returns null if Ollama is down (caller falls back). */
export async function llmRank(
  candidates: Candidate[],
  profile: TasteProfile,
): Promise<ScoredCandidate[] | null> {
  const list = candidates
    .map((c) => {
      const date = c.publishedAt ? c.publishedAt.slice(0, 10) : "undated";
      return `id=${c.key} | ${c.title}\n  source: ${c.sourceName} | ${date} | corroboration: ${c.corroboration}\n  ${(c.summary ?? "").slice(0, 220)}`;
    })
    .join("\n\n");

  const system = `${SYSTEM}\n\n${profileBlock(profile)}`;
  const parsed = await ollamaJson<RankResult>(system, `Score every candidate below.\n\n${list}`, SCHEMA);
  if (!parsed?.rankings) return null;

  const byId = new Map(candidates.map((c) => [c.key, c]));
  const scored: ScoredCandidate[] = [];
  for (const r of parsed.rankings) {
    const c = byId.get(r.id);
    if (!c) continue;
    scored.push({ ...c, score: Math.max(0, Math.min(100, Math.round(r.score))), reason: r.reason });
  }
  log(`Gemma ranked ${scored.length}/${candidates.length} candidates`);
  return scored.length ? scored.sort((a, b) => b.score - a.score) : null;
}
