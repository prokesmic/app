import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile, readdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import Parser from "rss-parser";
import { env, TRANSCRIBE_PODCASTS, MAX_AGE_DAYS } from "../config.js";
import { keyForUrl } from "../util/url.js";
import { ollamaJson } from "../llm/ollama.js";
import { loadTranscribed, saveTranscribed } from "../state/store.js";
import { log, warn } from "../util/log.js";

const execFileP = promisify(execFile);
const parser = new Parser({ timeout: 20_000, headers: { "User-Agent": "ai-digest/0.1" } });
const MAX_TRANSCRIPT_CHARS = 60_000;

/** Download a remote audio file to a temp path. */
async function downloadAudio(url: string, dir: string): Promise<string | null> {
  try {
    const res = await fetch(url, { redirect: "follow", signal: AbortSignal.timeout(120_000) });
    if (!res.ok) {
      warn(`audio download ${res.status} for ${url}`);
      return null;
    }
    const buf = Buffer.from(await res.arrayBuffer());
    const file = join(dir, "episode.mp3");
    await writeFile(file, buf);
    return file;
  } catch (e) {
    warn(`audio download failed: ${(e as Error).message}`);
    return null;
  }
}

/** Transcribe a local audio file with Whisper (default: mlx-whisper on Apple Silicon). */
async function whisper(audioFile: string, dir: string): Promise<string | null> {
  try {
    await execFileP(
      env.whisperCmd,
      [audioFile, "--model", env.whisperModel, "--output-dir", dir, "--output-format", "txt"],
      { timeout: 20 * 60_000, maxBuffer: 64 * 1024 * 1024 },
    );
    const txt = (await readdir(dir)).find((f) => f.endsWith(".txt"));
    if (!txt) return null;
    return (await readFile(join(dir, txt), "utf8")).trim() || null;
  } catch (e) {
    warn(`whisper failed (is '${env.whisperCmd}' installed + ffmpeg?): ${(e as Error).message}`);
    return null;
  }
}

const TOPICS_SCHEMA = {
  type: "object",
  properties: { topics: { type: "array", items: { type: "string" } } },
  required: ["topics"],
} as const;

/** Gemma reads a transcript and returns the AI topics/entities discussed. */
async function extractTopics(transcript: string, podcast: string, episode: string): Promise<string[]> {
  const system =
    "You read a podcast transcript and list the SPECIFIC AI topics, technologies, companies, models, people, papers, and products discussed. Output lowercase short phrases useful for matching future articles. Exclude sponsors/ads and generic chit-chat. JSON only.";
  const out = await ollamaJson<{ topics: string[] }>(
    system,
    `Podcast: ${podcast}\nEpisode: ${episode}\n\nTranscript:\n${transcript.slice(0, MAX_TRANSCRIPT_CHARS)}`,
    TOPICS_SCHEMA,
  );
  return (out?.topics ?? []).map((t) => t.trim().toLowerCase()).filter(Boolean);
}

/**
 * Transcribe recent episodes of `transcribe`-flagged podcasts on this machine and
 * return the topics the hosts discussed — used to enrich the taste profile.
 * No-op unless TRANSCRIBE=1. Episode keys are remembered so we never re-transcribe.
 */
export async function collectTranscriptTopics(): Promise<string[]> {
  if (!env.transcribeEnabled) return [];

  const done = await loadTranscribed();
  const cutoff = Date.now() - MAX_AGE_DAYS * 86_400_000;
  const topics = new Set<string>();

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
      const dir = await mkdtemp(join(tmpdir(), "ai-digest-"));
      try {
        const audioFile = await downloadAudio(audioUrl, dir);
        if (!audioFile) continue;
        const transcript = await whisper(audioFile, dir);
        if (!transcript) continue;
        done.items[epKey] = new Date().toISOString();
        processed++;
        const epTopics = await extractTopics(transcript, src.name, item.title ?? "");
        log(`  extracted ${epTopics.length} topics`);
        for (const tp of epTopics) topics.add(tp);
      } finally {
        await rm(dir, { recursive: true, force: true });
      }
    }
  }

  await saveTranscribed(done);
  return [...topics];
}
