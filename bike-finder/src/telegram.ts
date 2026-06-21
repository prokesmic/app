import { settings } from "./config.js";
import type { ScoredListing } from "./types.js";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/** Format an excellent find as a Telegram HTML message. */
export function formatMessage(item: ScoredListing): string {
  const price = item.priceCzk != null ? `${item.priceCzk.toLocaleString("cs-CZ")} Kč` : "?";
  const lines = [
    `🚲 <b>${escapeHtml(item.title)}</b>`,
    `💰 <b>${price}</b>  ·  ⭐ skóre ${item.result.score}  ·  ${item.source}`,
    "",
    ...item.result.reasons.map((r) => `• ${escapeHtml(r)}`),
    "",
    `🔗 ${escapeHtml(item.url)}`,
  ];
  return lines.join("\n");
}

/** Send a message to the configured Telegram chat. Returns true on success. */
export async function sendTelegram(text: string): Promise<boolean> {
  const { token, chatId } = settings.telegram;
  if (!token || !chatId) {
    console.warn("[telegram] TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID not set — skipping send");
    return false;
  }
  const url = `https://api.telegram.org/bot${token}/sendMessage`;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: "HTML",
        disable_web_page_preview: false,
      }),
    });
    if (!res.ok) {
      console.error(`[telegram] send failed: HTTP ${res.status} ${await res.text()}`);
      return false;
    }
    return true;
  } catch (err) {
    console.error("[telegram] send error:", err);
    return false;
  }
}
