// Notification dispatcher. Telegram is the active channel; email / Discord /
// web-push are stubbed so additional channels can be wired in without touching
// the runner.

import { isTelegramConfigured, sendTelegram } from "./telegram";

export type NotifyChannel = "TELEGRAM" | "EMAIL" | "DISCORD" | "WEBPUSH";

export interface NotifyResult {
  ok: boolean;
  error?: string;
}

export function configuredChannels(): NotifyChannel[] {
  const channels: NotifyChannel[] = [];
  if (isTelegramConfigured()) channels.push("TELEGRAM");
  if (process.env.DISCORD_WEBHOOK_URL) channels.push("DISCORD");
  return channels;
}

export async function notify(
  channel: NotifyChannel,
  payload: { title: string; message: string },
): Promise<NotifyResult> {
  switch (channel) {
    case "TELEGRAM":
      return sendTelegram(`<b>${payload.title}</b>\n${payload.message}`);
    case "DISCORD":
      return sendDiscord(`**${payload.title}**\n${payload.message}`);
    default:
      return { ok: false, error: `channel ${channel} not implemented` };
  }
}

async function sendDiscord(content: string): Promise<NotifyResult> {
  const url = process.env.DISCORD_WEBHOOK_URL;
  if (!url) return { ok: false, error: "DISCORD_WEBHOOK_URL not set" };
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: content.slice(0, 1900) }),
    });
    return res.ok ? { ok: true } : { ok: false, error: `Discord HTTP ${res.status}` };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}
