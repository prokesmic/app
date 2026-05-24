#!/usr/bin/env bash
# One-shot setup for the Mac Mini: installs Ollama + the model, deps, builds the
# taste profile, runs a dry-run, and schedules the twice-daily job.
# Run from anywhere:  bash deploy/setup.sh
set -euo pipefail

cd "$(cd "$(dirname "$0")/.." && pwd)"   # ai-digest project root
MODEL="${OLLAMA_MODEL:-gemma3:12b}"
say() { printf "\n\033[1m== %s ==\033[0m\n" "$1"; }

say "1/6 Ollama"
if ! command -v ollama >/dev/null 2>&1; then
  if command -v brew >/dev/null 2>&1; then brew install ollama
  else echo "Install Ollama from https://ollama.com, then re-run." >&2; exit 1; fi
fi
if ! curl -sf http://localhost:11434/api/tags >/dev/null 2>&1; then
  echo "Starting Ollama..."
  brew services start ollama 2>/dev/null || (ollama serve >/tmp/ollama.log 2>&1 &)
  for _ in $(seq 1 30); do curl -sf http://localhost:11434/api/tags >/dev/null 2>&1 && break; sleep 1; done
fi

say "2/6 Pulling $MODEL (first time downloads several GB)"
ollama pull "$MODEL"

say "3/6 Node dependencies"
command -v npm >/dev/null 2>&1 || { echo "Install Node 20+ (brew install node) and re-run." >&2; exit 1; }
npm install

say "4/6 Config (.env)"
[ -f .env ] || { cp .env.example .env; echo "Created .env from template."; }
if ! grep -qE '^READWISE_TOKEN=.+' .env; then
  echo ""
  echo ">> ACTION NEEDED: add your Readwise token to $(pwd)/.env"
  echo "   Get it at https://readwise.io/access_token  ->  set READWISE_TOKEN=... in .env"
  echo "   Then re-run: bash deploy/setup.sh"
  exit 1
fi

say "5/6 Building taste profile with Gemma + a dry-run"
set -a; . ./.env; set +a
npm run bootstrap
npm run dry-run

say "6/6 Scheduling twice daily (07:00 + 17:00 local)"
bash deploy/install-launchd.sh

echo ""
echo "All set. To deliver your first digest right now:  npm run digest"
echo "Logs for scheduled runs: $(pwd)/state/digest.log"
