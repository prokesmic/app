// Loads environment variables for standalone (non-Next.js) runs of the monitor
// scripts. Next.js loads .env automatically, but `tsx scripts/*.ts` and the
// launchd service do not — so import this FIRST in every CLI entrypoint, before
// anything that reads process.env (notably lib/db, which instantiates Prisma at
// import time).
//
// Precedence (highest first): real process env > .env.local > .env
import { config } from "dotenv";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

for (const file of [".env.local", ".env"]) {
  const path = resolve(process.cwd(), file);
  // override:false => never clobber an already-set var, so .env.local (loaded
  // first) wins over .env, and a real shell/launchd env var wins over both.
  if (existsSync(path)) config({ path, override: false });
}
