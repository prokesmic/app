import Anthropic from "@anthropic-ai/sdk";
import type { Candidate, ScoredCandidate, TasteProfile } from "../types.js";
import { env } from "../config.js";
import { warn, log } from "../util/log.js";

const SYSTEM = `You are a curator for a single reader. You are given that reader's taste profile (derived from the AI podcasts they listen to and the authors they follow) and a list of candidate items (articles, essays, papers, announcements, posts, podcast episodes). Score how strongly THIS reader would want each item in their daily reading queue.

Scoring guidance (0-100):
- 85-100: squarely in their interests, high-signal, fresh, from a voice or topic they clearly value.
- 60-84: relevant and worth surfacing.
- 30-59: tangential or lower-signal.
- 0-29: off-topic, promotional, duplicative, or low quality.

Reward: substantive analysis, primary sources, things multiple trusted sources are discussing, and the specific authors/topics in the profile. Penalize: SEO listicles, pure marketing, thin rewrites, and clickbait. Judge papers on relevance to the reader's stated interests, not raw novelty.

Return one entry per candidate id with a score and a terse one-sentence reason written to the reader ("why you'll care").`;

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    rankings: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
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

/** LLM rerank. Returns null if no API key or the call fails (caller falls back). */
export async function llmRank(
  candidates: Candidate[],
  profile: TasteProfile,
): Promise<ScoredCandidate[] | null> {
  if (!env.anthropicKey) return null;
  const client = new Anthropic({ apiKey: env.anthropicKey });

  const list = candidates
    .map((c, i) => {
      const id = c.key;
      const date = c.publishedAt ? c.publishedAt.slice(0, 10) : "undated";
      return `#${i + 1} id=${id} | ${c.title}\n   source: ${c.sourceName} | ${date} | corroboration: ${c.corroboration}\n   ${c.summary ?? ""}`;
    })
    .join("\n\n");

  try {
    const res = await client.messages.create({
      model: env.model,
      max_tokens: 8000,
      thinking: { type: "adaptive" },
      output_config: { effort: "medium", format: { type: "json_schema", schema: SCHEMA } },
      // The system prompt + taste profile are the stable, cacheable prefix.
      system: [
        { type: "text", text: SYSTEM },
        { type: "text", text: profileBlock(profile), cache_control: { type: "ephemeral" } },
      ],
      messages: [
        { role: "user", content: `Score every candidate below. Candidates:\n\n${list}` },
      ],
    });

    const textBlock = res.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") return null;
    const parsed = JSON.parse(textBlock.text) as RankResult;

    const byId = new Map(candidates.map((c) => [c.key, c]));
    const scored: ScoredCandidate[] = [];
    for (const r of parsed.rankings) {
      const c = byId.get(r.id);
      if (!c) continue;
      scored.push({ ...c, score: Math.max(0, Math.min(100, Math.round(r.score))), reason: r.reason });
    }
    log(`LLM ranked ${scored.length}/${candidates.length} candidates (cache read: ${res.usage.cache_read_input_tokens ?? 0} tok)`);
    return scored.sort((a, b) => b.score - a.score);
  } catch (e) {
    warn("LLM rank failed, falling back to heuristic:", (e as Error).message);
    return null;
  }
}
