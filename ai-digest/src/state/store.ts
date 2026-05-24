import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { SeenStore, TasteProfile } from "../types.js";

const STATE_DIR = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "state");
const SEEN_PATH = join(STATE_DIR, "seen.json");
const PROFILE_PATH = join(STATE_DIR, "taste-profile.json");
const TRANSCRIBED_PATH = join(STATE_DIR, "transcribed.json");

/** Drop seen entries older than this so the file doesn't grow unbounded. */
const SEEN_RETENTION_DAYS = 45;

async function readJson<T>(path: string, fallback: T): Promise<T> {
  try {
    return JSON.parse(await readFile(path, "utf8")) as T;
  } catch {
    return fallback;
  }
}

async function writeJson(path: string, data: unknown): Promise<void> {
  await mkdir(STATE_DIR, { recursive: true });
  await writeFile(path, JSON.stringify(data, null, 2) + "\n", "utf8");
}

export async function loadSeen(): Promise<SeenStore> {
  return readJson<SeenStore>(SEEN_PATH, { items: {} });
}

export async function saveSeen(store: SeenStore): Promise<void> {
  const cutoff = Date.now() - SEEN_RETENTION_DAYS * 86_400_000;
  for (const [key, iso] of Object.entries(store.items)) {
    if (new Date(iso).getTime() < cutoff) delete store.items[key];
  }
  await writeJson(SEEN_PATH, store);
}

export async function loadProfile(): Promise<TasteProfile | null> {
  return readJson<TasteProfile | null>(PROFILE_PATH, null);
}

export async function saveProfile(profile: TasteProfile): Promise<void> {
  await writeJson(PROFILE_PATH, profile);
}

/** Episode keys already transcribed, so we never pay to transcribe one twice. */
export async function loadTranscribed(): Promise<SeenStore> {
  return readJson<SeenStore>(TRANSCRIBED_PATH, { items: {} });
}

export async function saveTranscribed(store: SeenStore): Promise<void> {
  const cutoff = Date.now() - SEEN_RETENTION_DAYS * 86_400_000;
  for (const [key, iso] of Object.entries(store.items)) {
    if (new Date(iso).getTime() < cutoff) delete store.items[key];
  }
  await writeJson(TRANSCRIBED_PATH, store);
}
