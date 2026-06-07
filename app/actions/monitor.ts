"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { runMonitor } from "@/lib/monitor/runner";
import { isTelegramConfigured, sendTelegram } from "@/lib/notify/telegram";

export async function triggerRunAction() {
  const summary = await runMonitor("manual");
  revalidatePath("/monitor");
  return summary;
}

export async function toggleTargetAction(targetId: string, isActive: boolean) {
  await prisma.monitorTarget.update({
    where: { id: targetId },
    data: { isActive },
  });
  revalidatePath("/monitor");
}

// Lets the user paste the exact product URL and/or Apple part number from the UI.
export async function updateTargetAction(
  targetId: string,
  patch: { url?: string; partNumber?: string },
) {
  const target = await prisma.monitorTarget.findUnique({ where: { id: targetId } });
  if (!target) throw new Error("Target not found");

  const data: { url?: string; config?: string } = {};
  if (patch.url && patch.url !== target.url) data.url = patch.url;
  if (patch.partNumber !== undefined) {
    let config: Record<string, unknown> = {};
    try {
      config = JSON.parse(target.config || "{}");
    } catch {
      config = {};
    }
    config.partNumber = patch.partNumber;
    data.config = JSON.stringify(config);
  }
  if (Object.keys(data).length > 0) {
    await prisma.monitorTarget.update({ where: { id: targetId }, data });
    revalidatePath("/monitor");
  }
}

export async function sendTestAlertAction() {
  if (!isTelegramConfigured()) {
    return { ok: false, error: "Telegram not configured (set TELEGRAM_BOT_TOKEN + TELEGRAM_CHAT_ID)" };
  }
  return sendTelegram(
    "<b>✅ Mac Studio monitor test</b>\nNotifications are wired up correctly.",
  );
}
