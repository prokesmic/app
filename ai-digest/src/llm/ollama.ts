import { env } from "../config.js";
import { warn } from "../util/log.js";

interface OllamaChatResponse {
  message?: { content?: string };
}

/**
 * Call the local Ollama server (Gemma) and parse the reply as JSON.
 * Returns null if Ollama is unreachable or the reply isn't valid JSON, so every
 * caller can fall back to a non-LLM path (heuristic ranker / seed profile).
 *
 * `schema` is passed as Ollama's structured-output `format` when provided.
 */
export async function ollamaJson<T>(
  system: string,
  user: string,
  schema?: object,
  timeoutMs = 300_000,
): Promise<T | null> {
  let res: Response;
  try {
    res = await fetch(`${env.ollamaHost}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: env.ollamaModel,
        stream: false,
        format: schema ?? "json",
        options: { temperature: 0.2, num_ctx: env.ollamaNumCtx },
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      }),
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (e) {
    warn(`Ollama unreachable at ${env.ollamaHost} (${(e as Error).message}) — is it running?`);
    return null;
  }

  if (!res.ok) {
    warn(`Ollama ${res.status}: ${(await res.text()).slice(0, 200)}`);
    return null;
  }

  let content: string;
  try {
    const data = (await res.json()) as OllamaChatResponse;
    content = data.message?.content ?? "";
  } catch {
    return null;
  }

  // Gemma sometimes wraps JSON in a ```json fence even in format mode.
  const fenced = content.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const raw = (fenced ? fenced[1] : content).trim();
  try {
    return JSON.parse(raw) as T;
  } catch {
    warn("Ollama returned non-JSON content");
    return null;
  }
}

/** Quick reachability probe so callers can log a clear hint when Gemma is off. */
export async function ollamaUp(): Promise<boolean> {
  try {
    const res = await fetch(`${env.ollamaHost}/api/tags`, { signal: AbortSignal.timeout(5_000) });
    return res.ok;
  } catch {
    return false;
  }
}
