import type { SourceDef } from "./types.js";

/**
 * Verified live feeds (all returned HTTP 200 during research, 2026-05).
 * Podcasts serve a dual role: their episode titles/descriptions feed the taste
 * profile, and feeds flagged `mineLinks` also contribute the articles they cite.
 */
export const SOURCES: SourceDef[] = [
  // --- Authors the user explicitly follows (essays come free via RSS) ---
  { id: "karpathy", name: "Andrej Karpathy", kind: "author", feed: "https://karpathy.bearblog.dev/feed/", weight: 1.0 },
  { id: "mollick", name: "Ethan Mollick — One Useful Thing", kind: "author", feed: "https://www.oneusefulthing.org/feed", weight: 1.0 },
  { id: "citrini", name: "Citrini Research", kind: "author", feed: "https://www.citriniresearch.com/feed", weight: 0.9 },

  // --- AI lab / company blogs ---
  { id: "openai", name: "OpenAI", kind: "lab", feed: "https://openai.com/news/rss.xml", weight: 0.85 },

  // --- Papers ---
  { id: "arxiv", name: "arXiv cs.AI/LG/CL", kind: "papers", feed: "https://rss.arxiv.org/rss/cs.AI+cs.LG+cs.CL", weight: 0.55 },

  // --- Podcasts: taste signal + (where flagged) cited-link mining ---
  { id: "latentspace", name: "Latent Space", kind: "podcast", feed: "https://www.latent.space/feed", weight: 0.9, mineLinks: true },
  { id: "aidailybrief", name: "The AI Daily Brief", kind: "podcast", feed: "https://anchor.fm/s/f7cac464/podcast/rss", weight: 0.8, mineLinks: true },
  { id: "everydayai", name: "Everyday AI", kind: "podcast", feed: "https://rss.buzzsprout.com/2175779.rss", weight: 0.7 },
  { id: "aishow", name: "The Artificial Intelligence Show", kind: "podcast", feed: "https://feeds.megaphone.fm/marketingai", weight: 0.7 },
];

/** Subset used to build/refresh the taste profile. */
export const TASTE_PODCASTS = SOURCES.filter((s) => s.kind === "podcast");
export const TASTE_AUTHORS = SOURCES.filter((s) => s.kind === "author");

/** Hacker News front-page AI items (no auth, Algolia API). */
export const HN_SEARCH_URL =
  "https://hn.algolia.com/api/v1/search?tags=front_page&numericFilters=points>75";
export const HN_KEYWORDS = ["ai", "llm", "gpt", "claude", "openai", "anthropic", "model", "agent", "neural", "transformer", "diffusion", "ml "];

/** Seed keywords for the heuristic ranker / fallback taste profile. */
export const SEED_KEYWORDS = [
  "llm", "agent", "agents", "reasoning", "evals", "fine-tuning", "rag",
  "transformer", "inference", "open source model", "benchmark", "context window",
  "multimodal", "coding agent", "prompt", "ai product", "ai strategy", "scaling",
  "reinforcement learning", "diffusion", "robotics", "ai policy", "compute",
];

/** Domains that get a corroboration-style boost in the heuristic ranker. */
export const PREFERRED_DOMAINS_SEED = [
  "arxiv.org", "openai.com", "anthropic.com", "deepmind.google",
  "oneusefulthing.org", "latent.space", "karpathy.bearblog.dev",
  "github.com", "huggingface.co",
];

export const env = {
  readwiseToken: process.env.READWISE_TOKEN ?? "",
  anthropicKey: process.env.ANTHROPIC_API_KEY ?? "",
  model: process.env.DIGEST_MODEL || "claude-opus-4-7",
  limit: Number(process.env.DIGEST_LIMIT || "10"),
  location: (process.env.READWISE_LOCATION || "feed") as "new" | "later" | "archive" | "feed",
  tags: (process.env.READWISE_TAGS || "ai-digest").split(",").map((t) => t.trim()).filter(Boolean),
};

/** Candidates older than this many days are dropped before ranking. */
export const MAX_AGE_DAYS = 4;
/** How many candidates survive the heuristic prefilter and go to the LLM reranker. */
export const RERANK_POOL = 40;
