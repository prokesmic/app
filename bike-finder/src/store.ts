import { promises as fs } from "node:fs";
import path from "node:path";
import { settings } from "./config.js";

/** Persisted set of already-notified listing ids (id -> ISO timestamp). */
export type SeenMap = Record<string, string>;

export async function loadSeen(): Promise<SeenMap> {
  try {
    const raw = await fs.readFile(settings.statePath, "utf8");
    return JSON.parse(raw) as SeenMap;
  } catch {
    return {};
  }
}

export async function saveSeen(seen: SeenMap): Promise<void> {
  await fs.mkdir(path.dirname(settings.statePath), { recursive: true });
  await fs.writeFile(settings.statePath, JSON.stringify(seen, null, 2), "utf8");
}
