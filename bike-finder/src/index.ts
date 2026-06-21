import "dotenv/config";
import { settings } from "./config.js";
import { sources } from "./sources/index.js";
import { scoreListing } from "./score.js";
import { loadSeen, saveSeen } from "./store.js";
import { formatMessage, sendTelegram } from "./telegram.js";
import { fetchHtml, sleep } from "./util.js";
import type { Listing, ScoredListing } from "./types.js";

interface Flags {
  once: boolean;
  daemon: boolean;
  report: boolean;
  dryRun: boolean;
}

function parseFlags(argv: string[]): Flags {
  return {
    once: argv.includes("--once"),
    daemon: argv.includes("--daemon"),
    report: argv.includes("--report"),
    dryRun: argv.includes("--dry-run"),
  };
}

/** Fetch + parse every source, deduping listings by id. */
async function collectListings(): Promise<Listing[]> {
  const byId = new Map<string, Listing>();
  for (const source of sources) {
    for (const url of source.buildUrls()) {
      try {
        const html = await fetchHtml(url);
        const listings = source.parse(html, url);
        for (const l of listings) if (!byId.has(l.id)) byId.set(l.id, l);
        console.log(`[scan] ${source.name}: ${listings.length} ads from ${url}`);
      } catch (err) {
        console.warn(`[scan] ${source.name} failed for ${url}: ${(err as Error).message}`);
      }
      await sleep(settings.requestDelayMs);
    }
  }
  return [...byId.values()];
}

/** One scan cycle: collect, score, notify excellent new finds. */
async function runOnce(flags: Flags): Promise<void> {
  const started = new Date().toISOString();
  console.log(`\n=== Bike-finder scan @ ${started} ===`);

  const listings = await collectListings();
  const scored: ScoredListing[] = listings
    .map((l) => ({ ...l, result: scoreListing(l) }))
    .sort((a, b) => b.result.score - a.result.score);

  const excellent = scored.filter((s) => s.result.excellent);
  console.log(`[scan] ${listings.length} ads, ${excellent.length} excellent`);

  if (flags.report) {
    const candidates = scored.filter((s) => !s.result.rejectedReason).slice(0, 25);
    console.log(`\n--- Top candidates (not rejected) ---`);
    for (const c of candidates) {
      console.log(
        `[${c.result.score}${c.result.excellent ? "★" : " "}] ${c.priceCzk ?? "?"} Kč  ${c.title}\n    ${c.url}\n    ${c.result.reasons.join("; ")}`,
      );
    }
  }

  const seen = await loadSeen();
  let sent = 0;
  for (const item of excellent) {
    if (seen[item.id]) continue;
    const msg = formatMessage(item);
    if (flags.dryRun) {
      console.log(`\n[dry-run] would send:\n${msg}`);
      seen[item.id] = new Date().toISOString();
    } else {
      const ok = await sendTelegram(msg);
      if (ok) {
        seen[item.id] = new Date().toISOString();
        sent++;
        await sleep(500);
      }
    }
  }

  await saveSeen(seen);
  console.log(`[scan] done — ${sent} new alert(s) sent`);
}

async function main(): Promise<void> {
  const flags = parseFlags(process.argv.slice(2));

  if (flags.daemon) {
    const intervalMs = settings.intervalMinutes * 60_000;
    console.log(`Bike-finder daemon started — scanning every ${settings.intervalMinutes} min`);
    // Run immediately, then on an interval. Errors never kill the loop.
    for (;;) {
      try {
        await runOnce(flags);
      } catch (err) {
        console.error("[daemon] scan error:", err);
      }
      await sleep(intervalMs);
    }
  }

  // Default: single scan (for cron / GitHub Actions).
  await runOnce(flags);
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
