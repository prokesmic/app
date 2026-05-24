import Anthropic from "@anthropic-ai/sdk";
import Parser from "rss-parser";
import type { Candidate } from "../types.js";
import { env, TRANSCRIBE_PODCASTS, MAX_AGE_DAYS } from "../config.js";
import { canonicalizeUrl, keyForUrl } from "../util/url.js";
import { loadTranscribed, saveTranscribed } from "../state/store.js";
import { log, warn } from "../util/log.js";

const parser = new Parser({ timeout: 20_000, headers: { "User-Agent": "ai-digest/0.1" } });
const MAX_TRANSCRIPT_CHARS = 55_000;

/** Transcribe a remote audio file via Deepgram (server-side URL fetch — no download). */
async function transcribe(audioUrl: string): Promise<string | null> {
  const res = await fetch("https://api.deepgram.com/v1/listen?model=nova-3&smart_format=true&punctuate=true", {
    method: "POST",
    headers: { Authorization: `Token ${env.deepgramKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ url: audioUrl }),
    signal: AbortSignal.timeout(180_000),
  });
  if (!res.ok) {
    warn(`Deepgram ${res.status} for ${audioUrl}`);
    return null;
  }
  const data = (await res.json()) as {
    results?: { channels?: { alternatives?: { transcript?: string }[] }[] };
  };
  const text = data.results?.channels?.[0]?.alternatives?.[0]?.transcript ?? "";
  return text.trim() || null;
}

const EXTRACT_SYSTEM = `You are given a transcript of a podcast episode. The hosts discuss and reference external works — articles, papers, blog posts, product launches, company announcements, and notable posts. Your job: identify the SPECIFIC external works they actually discuss, and use web_search to find the canonical URL for each.

Rules:
- Only include real, externally-published works the hosts engage with substantively.
- EXCLUDE the podcast's own sponsors, ad reads, promos, hosts' own products, and generic mentions with no identifiable source.
- Use web_search to resolve each to its canonical URL. Skip anything you cannot confidently resolve to a real URL.
- At most 8 items.

Respond with ONLY a JSON array inside a \`\`\`json code block, each item: {"title": "...", "url": "https://...", "why": "one terse sentence on what it is / why it matters"}.`;

/** Claude reads the transcript and resolves discussed works to URLs via web search. */
async function extractCitations(client: Anthropic, transcript: string, podcast: string, episode: string): Promise<{ title: string; url: string; why: string }[]> {
  const messages: Anthropic.MessageParam[] = [
    { role: "user", content: `Podcast: ${podcast}\nEpisode: ${episode}\n\nTranscript:\n${transcript.slice(0, MAX_TRANSCRIPT_CHARS)}` },
  ];
  const tools = [{ type: "web_search_20260209" as const, name: "web_search" as const }];

  let final: Anthropic.Message | null = null;
  for (let i = 0; i < 6; i++) {
    const res: Anthropic.Message = await client.messages.create({
      model: env.model,
      max_tokens: 6000,
      system: EXTRACT_SYSTEM,
      tools,
      messages,
    });
    if (res.stop_reason === "pause_turn") {
      messages.push({ role: "assistant", content: res.content });
      continue;
    }
    final = res;
    break;
  }
  if (!final) return [];

  const text = final.content.filter((b) => b.type === "text").map((b) => (b as { text: string }).text).join("\n");
  const fenced = text.match(/```json\s*([\s\S]*?)```/i);
  const raw = fenced ? fenced[1] : (text.match(/\[[\s\S]*\]/)?.[0] ?? "");
  if (!raw) return [];
  try {
    const arr = JSON.parse(raw) as { title?: string; url?: string; why?: string }[];
    return arr.filter((x): x is { title: string; url: string; why: string } => Boolean(x.url && /^https?:\/\//.test(x.url) && x.title));
  } catch {
    warn(`could not parse citation JSON for ${podcast} / ${episode}`);
    return [];
  }
}

/**
 * Transcribe recent episodes of `transcribe`-flagged podcasts and turn the works
 * the hosts discuss into candidates. No-op unless DEEPGRAM_API_KEY (+ Anthropic
 * key) is set. Episode keys are remembered so we never re-pay for transcription.
 */
export async function collectTranscripts(): Promise<Candidate[]> {
  if (!env.deepgramKey || !env.anthropicKey) return [];

  const client = new Anthropic({ apiKey: env.anthropicKey });
  const done = await loadTranscribed();
  const cutoff = Date.now() - MAX_AGE_DAYS * 86_400_000;
  const out: Candidate[] = [];

  for (const src of TRANSCRIBE_PODCASTS) {
    if (!src.feed) continue;
    let feed: Awaited<ReturnType<typeof parser.parseURL>>;
    try {
      feed = await parser.parseURL(src.feed);
    } catch (e) {
      warn(`transcribe feed failed: ${src.name}`, (e as Error).message);
      continue;
    }

    let processed = 0;
    for (const item of feed.items ?? []) {
      if (processed >= env.transcribeLimit) break;
      const audioUrl = item.enclosure?.url;
      if (!audioUrl) continue;
      const epKey = keyForUrl(item.guid || item.link || audioUrl);
      if (done.items[epKey]) continue;
      const t = new Date(item.isoDate || item.pubDate || 0).getTime();
      if (!Number.isNaN(t) && t < cutoff) continue;

      log(`transcribing ${src.name}: ${item.title ?? audioUrl}`);
      const transcript = await transcribe(audioUrl);
      if (!transcript) continue;
      done.items[epKey] = new Date().toISOString();
      processed++;

      const cites = await extractCitations(client, transcript, src.name, item.title ?? "");
      log(`  extracted ${cites.length} discussed works`);
      for (const c of cites) {
        out.push({
          key: keyForUrl(c.url),
          url: canonicalizeUrl(c.url),
          title: c.title,
          author: undefined,
          sourceId: `${src.id}:transcript`,
          sourceName: `${src.name} (discussed)`,
          sourceKind: "podcast",
          publishedAt: item.isoDate || item.pubDate,
          summary: c.why || `Discussed on ${src.name}: "${item.title ?? ""}"`,
          corroboration: 1,
        });
      }
    }
  }

  await saveTranscribed(done);
  log(`transcription produced ${out.length} candidates`);
  return out;
}
