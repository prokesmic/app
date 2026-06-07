// Telegram Bot API sender. Set TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID.
//
// Quick setup:
//   1. Message @BotFather, /newbot, copy the token        -> TELEGRAM_BOT_TOKEN
//   2. Message your new bot once, then open
//      https://api.telegram.org/bot<TOKEN>/getUpdates and copy
//      result[].message.chat.id                            -> TELEGRAM_CHAT_ID

export interface TelegramResult {
  ok: boolean;
  error?: string;
}

export function isTelegramConfigured(): boolean {
  return Boolean(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID);
}

export async function sendTelegram(
  text: string,
  opts: { disablePreview?: boolean } = {},
): Promise<TelegramResult> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) {
    return { ok: false, error: "TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID not set" };
  }
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: "HTML",
        disable_web_page_preview: opts.disablePreview ?? false,
      }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      return { ok: false, error: `Telegram HTTP ${res.status}: ${body.slice(0, 200)}` };
    }
    const data = (await res.json()) as { ok: boolean; description?: string };
    return data.ok ? { ok: true } : { ok: false, error: data.description };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}
