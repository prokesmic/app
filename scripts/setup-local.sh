#!/usr/bin/env bash
# One-command local setup for the Mac Studio M3 Ultra monitor.
# Runs entirely on your machine — no Claude / cloud sandbox involved.
#
#   npm run monitor:setup
set -euo pipefail

cd "$(dirname "$0")/.."
ROOT="$(pwd)"
echo "▶ Setting up monitor in $ROOT"

# 1. Node check
if ! command -v node >/dev/null 2>&1; then
  echo "✗ Node.js not found. Install Node 20+ (https://nodejs.org) and retry." >&2
  exit 1
fi
echo "✓ node $(node -v)"

# 2. Dependencies
echo "▶ Installing dependencies (npm install)…"
npm install --no-audit --no-fund

# 3. Local env file
if [ ! -f .env.local ] && [ ! -f .env ]; then
  cp .env.local.example .env.local
  echo "✓ Created .env.local from template — edit it and add your Telegram token."
fi

# 4. Database (SQLite, local file)
export DATABASE_URL="${DATABASE_URL:-file:./dev.db}"
echo "▶ Preparing database ($DATABASE_URL)…"
npx prisma generate >/dev/null
npx prisma db push --skip-generate
npx tsx scripts/seed-monitor.ts

# 5. Verify detection logic offline
echo "▶ Running offline tests…"
npx tsx scripts/test-monitor.ts >/dev/null && echo "✓ detection tests passed"

# 6. Telegram readiness hint
if grep -qsE '^TELEGRAM_BOT_TOKEN="?.+"?$' .env.local .env 2>/dev/null && \
   grep -qsE '^TELEGRAM_CHAT_ID="?.+"?$' .env.local .env 2>/dev/null; then
  echo "✓ Telegram credentials detected"
else
  echo "⚠ Set TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID in .env.local to receive alerts."
fi

cat <<'NEXT'

✅ Setup complete. Next:

  • Test alerts:        npm run monitor          (one pass now)
  • Run continuously:   npm run monitor:watch    (foreground, Ctrl-C to stop)
  • Always-on service:  npm run monitor:install-service
  • Dashboard (opt.):   npm run dev   → http://localhost:3000/monitor

NEXT
