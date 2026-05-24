import Parser from "rss-parser";
import type { TasteProfile } from "../types.js";
import { TASTE_PODCASTS, TASTE_AUTHORS, SEED_KEYWORDS, PREFERRED_DOMAINS_SEED } from "../config.js";
import { stripHtml } from "../util/html.js";
import { ollamaJson } from "../llm/ollama.js";
import { collectTranscriptTopics } from "../collect/transcripts.js";
import { log, warn } from "../util/log.js";

const parser = new Parser({ timeout: 20_000, headers: { "User-Agent": "ai-digest/0.1" } });

const BOOTSTRAP_DAYS = 30;

/** A reasonable default so the pipeline works before/without an LLM bootstrap. */
export function seedProfile(): TasteProfile {
  return {
    generatedAt: new Date().toISOString(),
    summary:
      "Builder-practitioner interested in frontier AI: model releases, agents, evals, applied LLM engineering, and the strategy/economics of AI. Follows Karpathy, Mollick, Citrini, and AI-news podcasts.",
    topics: [
      { name: "LLMs & frontier models", weight: 1.0 },
      { name: "AI agents & tooling", weight: 0.95 },
      { name: "applied AI / product", weight: 0.85 },
      { name: "evals & benchmarks", weight: 0.7 },
      { name: "AI strategy & economics", weight: 0.7 },
      { name: "research papers", weight: 0.6 },
    ],
    keywords: SEED_KEYWORDS,
    preferredAuthors: ["Andrej Karpathy", "Ethan Mollick", "Citrini", "Matt Shumer", "Jack Dorsey"],
    preferredDomains: PREFERRED_DOMAINS_SEED,
  };
}

async function gatherCorpus(): Promise<string> {
  const cutoff = Date.now() - BOOTSTRAP_DAYS * 86_400_000;
  const chunks: string[] = [];
  for (const src of [...TASTE_PODCASTS, ...TASTE_AUTHORS]) {
    if (!src.feed) continue;
    try {
      const feed = await parser.parseURL(src.feed);
      const recent = (feed.items ?? []).filter((it) => {
        const t = new Date(it.isoDate || it.pubDate || 0).getTime();
        return Number.isNaN(t) || t >= cutoff;
      });
      const lines = recent.slice(0, 30).map((it) => `- ${it.title ?? ""}: ${stripHtml(it.contentSnippet || it.content || "", 240)}`);
      if (lines.length) chunks.push(`## ${src.name} (${src.kind})\n${lines.join("\n")}`);
    } catch (e) {
      warn(`bootstrap feed failed: ${src.name}`, (e as Error).message);
    }
  }
  return chunks.join("\n\n");
}

const PROFILE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    summary: { type: "string" },
    topics: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: { name: { type: "string" }, weight: { type: "number" } },
        required: ["name", "weight"],
      },
    },
    keywords: { type: "array", items: { type: "string" } },
    preferredAuthors: { type: "array", items: { type: "string" } },
    preferredDomains: { type: "array", items: { type: "string" } },
  },
  required: ["summary", "topics", "keywords", "preferredAuthors", "preferredDomains"],
} as const;

/**
 * Build a taste profile from ~30 days of the reader's podcasts + followed authors,
 * optionally enriched by locally-transcribed podcast topics and Readwise engagement.
 * Falls back to the seed profile if Gemma is unreachable.
 */
export async function buildProfile(engagedTitles: string[] = []): Promise<TasteProfile> {
  let corpus = await gatherCorpus();

  // Local Whisper transcripts -> discussed topics (no-op unless TRANSCRIBE=1).
  const transcriptTopics = await collectTranscriptTopics();
  if (transcriptTopics.length) {
    corpus += `\n\n## Topics discussed on your podcasts (from transcripts)\n${transcriptTopics.join(", ")}`;
  }
  if (engagedTitles.length) {
    corpus += `\n\n## Articles you saved & engaged with in Readwise (strong positive signal)\n${engagedTitles.map((t) => `- ${t}`).join("\n")}`;
  }
  if (!corpus) {
    warn("empty bootstrap corpus — using seed profile");
    return seedProfile();
  }

  const system =
    "You analyze what a reader cares about based on the AI podcasts they listen to and the authors they follow. From the recent episode titles/descriptions, author posts, discussed topics, and engaged articles below, infer a concrete taste profile: the topics they lean into, high-signal keywords to match future articles against, the authors and domains they value. Be specific to AI/ML; avoid generic filler. Keywords should be lowercase phrases useful for substring matching. JSON only.";
  const p = await ollamaJson<Omit<TasteProfile, "generatedAt">>(
    system,
    `Recent material from the reader's sources (last ${BOOTSTRAP_DAYS} days):\n\n${corpus}`,
    PROFILE_SCHEMA,
  );
  if (!p?.topics || !p.keywords) {
    warn("Gemma profile build failed — using seed profile");
    return seedProfile();
  }
  log(`built taste profile with Gemma: ${p.topics.length} topics, ${p.keywords.length} keywords`);
  return {
    ...p,
    preferredAuthors: p.preferredAuthors ?? [],
    preferredDomains: p.preferredDomains ?? [],
    generatedAt: new Date().toISOString(),
  };
}
