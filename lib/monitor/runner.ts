// Orchestrates one full monitoring pass:
//   1. load active targets
//   2. check each (bounded concurrency)
//   3. persist a snapshot per target
//   4. on a rising edge (was-not-in-stock -> now-in-stock), fire alerts
//      across every configured channel, with a per-target cooldown
//   5. record the run for the dashboard

import { prisma } from "@/lib/db";
import { configuredChannels, notify } from "@/lib/notify";
import { checkTarget } from "./strategies";
import type { CheckResult, TargetInput } from "./types";

// Don't re-alert the same target more than once per cooldown window, even if it
// keeps flapping in/out of stock.
const ALERT_COOLDOWN_MS = Number(process.env.MONITOR_ALERT_COOLDOWN_MS ?? 30 * 60_000);
const CONCURRENCY = Number(process.env.MONITOR_CONCURRENCY ?? 6);

export interface RunSummary {
  runId: string;
  targetsTotal: number;
  targetsChecked: number;
  inStockCount: number;
  errorCount: number;
  alertsSent: number;
  results: Array<{
    targetId: string;
    label: string;
    country: string;
    status: CheckResult["status"];
    price?: number | null;
    alerted: boolean;
    error?: string | null;
  }>;
}

function parseConfig(raw: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(raw || "{}");
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

async function mapLimit<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let cursor = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor++;
      results[index] = await fn(items[index]);
    }
  });
  await Promise.all(workers);
  return results;
}

export async function runMonitor(
  trigger: "manual" | "cron" | "api" | "watch" = "manual",
): Promise<RunSummary> {
  const targets = await prisma.monitorTarget.findMany({
    where: { isActive: true, seller: { isActive: true } },
    include: { seller: true, product: true },
  });

  const run = await prisma.monitorRun.create({
    data: { trigger, targetsTotal: targets.length },
  });

  const channels = configuredChannels();
  const summary: RunSummary = {
    runId: run.id,
    targetsTotal: targets.length,
    targetsChecked: 0,
    inStockCount: 0,
    errorCount: 0,
    alertsSent: 0,
    results: [],
  };

  await mapLimit(targets, CONCURRENCY, async (target) => {
    const input: TargetInput = {
      id: target.id,
      label: target.label,
      url: target.url,
      country: target.country,
      currency: target.currency,
      strategy: target.strategy,
      config: parseConfig(target.config),
    };

    // Look up the previous status BEFORE writing the new snapshot.
    const previous = await prisma.stockSnapshot.findFirst({
      where: { targetId: target.id },
      orderBy: { checkedAt: "desc" },
    });

    const result = await checkTarget(input);

    const snapshot = await prisma.stockSnapshot.create({
      data: {
        targetId: target.id,
        runId: run.id,
        status: result.status,
        price: result.price ?? null,
        currency: result.currency ?? target.currency,
        rawSignal: result.rawSignal ?? null,
        httpStatus: result.httpStatus ?? null,
        responseMs: result.responseMs ?? null,
        error: result.error ?? null,
      },
    });

    summary.targetsChecked += 1;
    if (result.status === "IN_STOCK") summary.inStockCount += 1;
    if (result.status === "ERROR") summary.errorCount += 1;

    const risingEdge =
      result.status === "IN_STOCK" && previous?.status !== "IN_STOCK";

    let alerted = false;
    if (risingEdge) {
      alerted = await maybeAlert(
        target,
        snapshot.id,
        result,
        channels,
      );
      if (alerted) summary.alertsSent += 1;
    }

    summary.results.push({
      targetId: target.id,
      label: target.label,
      country: target.country,
      status: result.status,
      price: result.price ?? null,
      alerted,
      error: result.error ?? null,
    });
  });

  await prisma.monitorRun.update({
    where: { id: run.id },
    data: {
      finishedAt: new Date(),
      targetsChecked: summary.targetsChecked,
      inStockCount: summary.inStockCount,
      errorCount: summary.errorCount,
      alertsSent: summary.alertsSent,
    },
  });

  return summary;
}

async function maybeAlert(
  target: { id: string; label: string; url: string; country: string },
  snapshotId: string,
  result: CheckResult,
  channels: ReturnType<typeof configuredChannels>,
): Promise<boolean> {
  // Cooldown: skip if we already sent an alert for this target recently.
  const recent = await prisma.alert.findFirst({
    where: {
      targetId: target.id,
      status: "SENT",
      createdAt: { gte: new Date(Date.now() - ALERT_COOLDOWN_MS) },
    },
  });
  if (recent) return false;

  const priceText =
    result.price != null
      ? `${result.price.toLocaleString()} ${result.currency ?? ""}`.trim()
      : "price unknown";
  const title = `🟢 IN STOCK: Mac Studio M3 Ultra — ${target.country}`;
  const message = [
    `${target.label}`,
    `Price: ${priceText}`,
    result.rawSignal ? `Signal: ${result.rawSignal}` : null,
    `${target.url}`,
  ]
    .filter(Boolean)
    .join("\n");

  if (channels.length === 0) {
    // No channel configured — still record the alert so it shows on the
    // dashboard and isn't silently lost.
    await prisma.alert.create({
      data: {
        targetId: target.id,
        snapshotId,
        channel: "TELEGRAM",
        status: "FAILED",
        title,
        message,
        error: "No notification channel configured",
      },
    });
    return false;
  }

  let anySent = false;
  for (const channel of channels) {
    const res = await notify(channel, { title, message });
    await prisma.alert.create({
      data: {
        // Only the first SENT alert claims the unique snapshotId.
        snapshotId: anySent ? null : res.ok ? snapshotId : null,
        targetId: target.id,
        channel,
        status: res.ok ? "SENT" : "FAILED",
        title,
        message,
        error: res.error ?? null,
        sentAt: res.ok ? new Date() : null,
      },
    });
    if (res.ok) anySent = true;
  }
  return anySent;
}
