import { runBootstrap, runDigest } from "./pipeline.js";
import { collectAll } from "./collect/index.js";
import { log } from "./util/log.js";

const cmd = process.argv[2];
const flags = new Set(process.argv.slice(3));

async function main(): Promise<void> {
  switch (cmd) {
    case "bootstrap":
      await runBootstrap();
      break;
    case "collect": {
      // Diagnostic: collect + print, no ranking/delivery.
      const items = await collectAll();
      for (const c of items.slice(0, 50)) log(`${c.sourceName} | ${c.title} | ${c.url}`);
      break;
    }
    case "digest":
      await runDigest({ dryRun: flags.has("--dry-run"), refreshProfile: flags.has("--refresh-profile") });
      break;
    default:
      console.log(`Usage: tsx src/cli.ts <command> [flags]

Commands:
  bootstrap                 Build the taste profile from ~30 days of podcasts + author feeds.
  collect                   Collect candidates and print them (diagnostic; no delivery).
  digest [--dry-run]        Collect -> rank -> save top N to Readwise.
            [--refresh-profile]  Rebuild the taste profile before ranking.`);
      process.exit(cmd ? 1 : 0);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
