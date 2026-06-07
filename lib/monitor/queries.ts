// Read-side helpers shared by the dashboard page and the status API.

import { prisma } from "@/lib/db";

export interface TargetView {
  id: string;
  label: string;
  sellerName: string;
  trustTier: string;
  country: string;
  currency: string;
  url: string;
  strategy: string;
  isActive: boolean;
  needsConfig: boolean;
  status: string;
  price: number | null;
  rawSignal: string | null;
  error: string | null;
  checkedAt: string | null;
}

export interface MonitorOverview {
  generatedAt: string;
  product: { name: string; specSummary: string } | null;
  totals: {
    targets: number;
    active: number;
    inStock: number;
    outOfStock: number;
    unknown: number;
    error: number;
    needsConfig: number;
  };
  byCountry: Record<string, { total: number; inStock: number }>;
  lastRun: {
    startedAt: string;
    finishedAt: string | null;
    trigger: string;
    targetsChecked: number;
    inStockCount: number;
    errorCount: number;
    alertsSent: number;
  } | null;
  targets: TargetView[];
  recentAlerts: Array<{
    id: string;
    title: string;
    channel: string;
    status: string;
    createdAt: string;
    error: string | null;
  }>;
}

function configNeedsAttention(strategy: string, config: string): boolean {
  if (strategy !== "apple-fulfillment") return false;
  try {
    const parsed = JSON.parse(config || "{}");
    return !parsed.partNumber;
  } catch {
    return true;
  }
}

export async function getMonitorOverview(): Promise<MonitorOverview> {
  const [product, targets, lastRun, recentAlerts] = await Promise.all([
    prisma.product.findFirst(),
    prisma.monitorTarget.findMany({
      include: {
        seller: true,
        snapshots: { orderBy: { checkedAt: "desc" }, take: 1 },
      },
      orderBy: [{ country: "asc" }, { label: "asc" }],
    }),
    prisma.monitorRun.findFirst({ orderBy: { startedAt: "desc" } }),
    prisma.alert.findMany({ orderBy: { createdAt: "desc" }, take: 20 }),
  ]);

  const totals = {
    targets: targets.length,
    active: 0,
    inStock: 0,
    outOfStock: 0,
    unknown: 0,
    error: 0,
    needsConfig: 0,
  };
  const byCountry: Record<string, { total: number; inStock: number }> = {};

  const targetViews: TargetView[] = targets.map((t) => {
    const snap = t.snapshots[0];
    const status = snap?.status ?? "PENDING";
    const needsConfig = configNeedsAttention(t.strategy, t.config);
    if (t.isActive) totals.active += 1;
    if (status === "IN_STOCK") totals.inStock += 1;
    else if (status === "OUT_OF_STOCK") totals.outOfStock += 1;
    else if (status === "ERROR") totals.error += 1;
    else totals.unknown += 1;
    if (needsConfig) totals.needsConfig += 1;

    byCountry[t.country] ??= { total: 0, inStock: 0 };
    byCountry[t.country].total += 1;
    if (status === "IN_STOCK") byCountry[t.country].inStock += 1;

    return {
      id: t.id,
      label: t.label,
      sellerName: t.seller.name,
      trustTier: t.seller.trustTier,
      country: t.country,
      currency: t.currency,
      url: t.url,
      strategy: t.strategy,
      isActive: t.isActive,
      needsConfig,
      status,
      price: snap?.price ?? null,
      rawSignal: snap?.rawSignal ?? null,
      error: snap?.error ?? null,
      checkedAt: snap?.checkedAt.toISOString() ?? null,
    };
  });

  return {
    generatedAt: new Date().toISOString(),
    product: product
      ? { name: product.name, specSummary: product.specSummary }
      : null,
    totals,
    byCountry,
    lastRun: lastRun
      ? {
          startedAt: lastRun.startedAt.toISOString(),
          finishedAt: lastRun.finishedAt?.toISOString() ?? null,
          trigger: lastRun.trigger,
          targetsChecked: lastRun.targetsChecked,
          inStockCount: lastRun.inStockCount,
          errorCount: lastRun.errorCount,
          alertsSent: lastRun.alertsSent,
        }
      : null,
    targets: targetViews,
    recentAlerts: recentAlerts.map((a) => ({
      id: a.id,
      title: a.title,
      channel: a.channel,
      status: a.status,
      createdAt: a.createdAt.toISOString(),
      error: a.error,
    })),
  };
}
