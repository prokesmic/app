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

  // --- High-signal AI writers in the same orbit as the podcasts ---
  { id: "simonw", name: "Simon Willison", kind: "author", feed: "https://simonwillison.net/atom/everything/", weight: 0.9 },
  { id: "interconnects", name: "Interconnects — Nathan Lambert", kind: "author", feed: "https://www.interconnects.ai/feed", weight: 0.9 },
  { id: "importai", name: "Import AI — Jack Clark", kind: "author", feed: "https://importai.substack.com/feed", weight: 0.85 },
  { id: "raschka", name: "Ahead of AI — Sebastian Raschka", kind: "author", feed: "https://magazine.sebastianraschka.com/feed", weight: 0.8 },
  { id: "zvi", name: "Don't Worry About the Vase — Zvi", kind: "author", feed: "https://thezvi.substack.com/feed", weight: 0.75 },

  // --- AI lab / company blogs ---
  { id: "openai", name: "OpenAI", kind: "lab", feed: "https://openai.com/news/rss.xml", weight: 0.85 },
  { id: "deepmind", name: "Google DeepMind", kind: "lab", feed: "https://deepmind.google/blog/rss.xml", weight: 0.85 },
  // Anthropic has no official feed; this is a community-maintained mirror (may break).
  { id: "anthropic", name: "Anthropic", kind: "lab", feed: "https://raw.githubusercontent.com/taobojlen/anthropic-rss-feed/main/anthropic_news_rss.xml", weight: 0.85 },
  { id: "huggingface", name: "Hugging Face", kind: "lab", feed: "https://huggingface.co/blog/feed.xml", weight: 0.7 },

  // --- Papers ---
  { id: "arxiv", name: "arXiv cs.AI/LG/CL", kind: "papers", feed: "https://rss.arxiv.org/rss/cs.AI+cs.LG+cs.CL", weight: 0.55 },

  // --- Podcasts: taste signal + (where flagged) cited-link mining ---
  { id: "latentspace", name: "Latent Space", kind: "podcast", feed: "https://www.latent.space/feed", weight: 0.9, mineLinks: true },
  { id: "lastweekinai", name: "Last Week in AI", kind: "podcast", feed: "https://lastweekin.ai/feed", weight: 0.8, mineLinks: true },
  { id: "aidailybrief", name: "The AI Daily Brief", kind: "podcast", feed: "https://anchor.fm/s/f7cac464/podcast/rss", weight: 0.8, mineLinks: true, transcribe: true },
  { id: "everydayai", name: "Everyday AI", kind: "podcast", feed: "https://rss.buzzsprout.com/2175779.rss", weight: 0.7, transcribe: true },
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
  "github.com", "huggingface.co", "simonwillison.net", "interconnects.ai",
  "importai.substack.com", "magazine.sebastianraschka.com", "lastweekin.ai",
];

/** Default X/Twitter handles to follow if the X collector is configured. */
export const DEFAULT_X_HANDLES = ["karpathy", "emollick", "Citrini7", "mattshumer_", "jack"];

function parseHandles(): string[] {
  const raw = process.env.X_HANDLES;
  if (!raw) return DEFAULT_X_HANDLES;
  return raw.split(",").map((h) => h.trim().replace(/^@/, "")).filter(Boolean);
}

export const env = {
  readwiseToken: process.env.READWISE_TOKEN ?? "",
  // Local LLM via Ollama (https://ollama.com) running on the Mac Mini.
  ollamaHost: (process.env.OLLAMA_HOST || "http://localhost:11434").replace(/\/$/, ""),
  ollamaModel: process.env.OLLAMA_MODEL || "gemma3:12b",
  ollamaNumCtx: Number(process.env.OLLAMA_NUM_CTX || "16384"),
  limit: Number(process.env.DIGEST_LIMIT || "20"),
  location: (process.env.READWISE_LOCATION || "feed") as "new" | "later" | "archive" | "feed",
  tags: (process.env.READWISE_TAGS || "ai-digest").split(",").map((t) => t.trim()).filter(Boolean),
  // Engagement feedback loop: skip items already in your Reader library and learn
  // from what you've archived/read. On by default when a token is present.
  readwiseFeedback: (process.env.READWISE_FEEDBACK ?? "1") !== "0",
  // Pluggable X/Twitter collector (off unless configured — no cost by default).
  // Point X_RSSHUB_BASE at a self-hosted RSSHub instance, e.g. https://rsshub.example.com
  xRsshubBase: (process.env.X_RSSHUB_BASE ?? "").replace(/\/$/, ""),
  xHandles: parseHandles(),
  // Local podcast transcription (off unless TRANSCRIBE=1). Uses Whisper on the Mac
  // to transcribe episodes whose show notes lack cited links, then Gemma extracts
  // the topics discussed to enrich your taste profile.
  transcribeEnabled: (process.env.TRANSCRIBE ?? "0") === "1",
  transcribeLimit: Number(process.env.TRANSCRIBE_LIMIT || "1"),
  whisperCmd: process.env.WHISPER_CMD || "mlx_whisper",
  whisperModel: process.env.WHISPER_MODEL || "mlx-community/whisper-large-v3-turbo",
  // Optional GitHub token to raise the trending-search rate limit (works unauth too).
  githubToken: process.env.GITHUB_TOKEN ?? "",
};

export const TRANSCRIBE_PODCASTS = SOURCES.filter((s) => s.transcribe);

/** Candidates older than this many days are dropped before ranking. */
export const MAX_AGE_DAYS = 4;
/** How many candidates survive the heuristic prefilter and go to the LLM reranker. */
export const RERANK_POOL = 40;
/** Max items any single source may contribute to one digest, for a varied mix. */
export const PER_SOURCE_CAP = 5;
/** Rebuild the taste profile automatically once it's older than this many days. */
export const PROFILE_MAX_AGE_DAYS = 7;
