import { warn } from "./log.js";

/**
 * Send a push notification via ntfy.sh (or any compatible self-hosted server).
 * Configured by NTFY_TOPIC and optional NTFY_SERVER (defaults to https://ntfy.sh).
 * No-op when NTFY_TOPIC is unset, so this is safe to call unconditionally.
 */
export async function notify(title: string, body: string): Promise<void> {
  const topic = (process.env.NTFY_TOPIC ?? "").trim();
  if (!topic) return;
  const server = (process.env.NTFY_SERVER ?? "https://ntfy.sh").replace(/\/$/, "");
  try {
    const res = await fetch(`${server}/${encodeURIComponent(topic)}`, {
      method: "POST",
      headers: {
        Title: title,
        Tags: "newspaper",
        // Use "Click" so tapping the push opens Readwise Reader.
        Click: "https://read.readwise.io/tag/ai-digest",
      },
      body,
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) warn(`ntfy push failed ${res.status}`);
  } catch (e) {
    warn(`ntfy push error: ${e instanceof Error ? e.message : String(e)}`);
  }
}
