#!/usr/bin/env bash
# Entry point for the scheduled local run on the Mac Mini.
# launchd starts with a bare PATH, so add the usual Homebrew/Node locations.
set -euo pipefail

export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:$PATH"

# Resolve to the ai-digest project root regardless of where this is invoked from.
cd "$(cd "$(dirname "$0")/.." && pwd)"

# cli.ts loads ./.env automatically (Node >= 20.12).
exec npx tsx src/cli.ts digest "$@"
