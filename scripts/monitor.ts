// Standalone monitor runner — the "always on" entry point.
//
//   npx tsx scripts/monitor.ts --once               run a single pass
//   npx tsx scripts/monitor.ts --watch              loop forever
//   npx tsx scripts/monitor.ts --watch --interval=120   loop every 120s
//
// Use --watch on an always-on host (VPS, Raspberry Pi, a screen/tmux session).
// For serverless scheduling, hit /api/monitor/run instead (see MONITOR.md).

import { prisma } from "@/lib/db";
import { configuredChannels } from "@/lib/notify";
import { runMonitor } from "@/lib/monitor/runner";

function arg(name: string): string | undefined {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  if (hit) return hit.split("=")[1];
  return process.argv.includes(`--${name}`) ? "" : undefined;
}

async function once(trigger: "watch" | "manual") {
  const startedAt = new Date();
  const summary = await runMonitor(trigger);
  const inStock = summary.results.filter((r) => r.status === "IN_STOCK");
  console.log(
    `[${startedAt.toISOString()}] checked ${summary.targetsChecked}/${summary.targetsTotal} · ` +
      `in-stock ${summary.inStockCount} · errors ${summary.errorCount} · alerts ${summary.alertsSent}`,
  );
  for (const r of inStock) {
    console.log(`   🟢 ${r.country} ${r.label}${r.alerted ? " (alerted)" : ""}`);
  }
  return summary;
}

async function main() {
  const channels = configuredChannels();
  if (channels.length === 0) {
    console.warn(
      "⚠ No notification channel configured (set TELEGRAM_BOT_TOKEN + TELEGRAM_CHAT_ID). " +
        "Checks will still run and record to the dashboard.",
    );
  } else {
    console.log(`Notification channels: ${channels.join(", ")}`);
  }

  const watch = arg("watch") !== undefined;
  if (!watch) {
    await once("manual");
    await prisma.$disconnect();
    return;
  }

  const intervalSec = Math.max(30, Number(arg("interval") || 180));
  console.log(`Watching every ${intervalSec}s. Ctrl-C to stop.`);
  let stopping = false;
  process.on("SIGINT", () => {
    stopping = true;
    console.log("\nStopping after current pass…");
  });

  while (!stopping) {
    try {
      await once("watch");
    } catch (err) {
      console.error("run failed:", err);
    }
    if (stopping) break;
    await new Promise((r) => setTimeout(r, intervalSec * 1000));
  }
  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
  process.exit(1);
});
