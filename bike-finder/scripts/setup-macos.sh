#!/bin/bash
#
# One-command setup: run the bike-finder agent continuously on macOS.
#
# Installs a LaunchAgent so the agent:
#   - starts automatically when you log in,
#   - restarts itself if it ever crashes,
#   - scans every 30 minutes and sends excellent finds to Telegram.
#
# Usage:  bash scripts/setup-macos.sh
#
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"   # .../bike-finder
cd "$APP_DIR"

LABEL="com.bikefinder.agent"
LA_DIR="$HOME/Library/LaunchAgents"
PLIST_DEST="$LA_DIR/$LABEL.plist"
LOG_DIR="$APP_DIR/state"
LOG_OUT="$LOG_DIR/agent.log"
LOG_ERR="$LOG_DIR/agent.err.log"

echo "==> Bike-finder macOS setup"
echo "    Folder: $APP_DIR"

# --- 1. Check Node.js -------------------------------------------------------
if ! command -v node >/dev/null 2>&1; then
  echo
  echo "ERROR: Node.js is not installed."
  echo "Easiest fix: download the macOS 'LTS' installer from https://nodejs.org,"
  echo "double-click it, then run this script again."
  exit 1
fi
NODE_BIN="$(command -v node)"
NODE_DIR="$(dirname "$NODE_BIN")"
echo "    Node:   $NODE_BIN ($(node -v))"

# --- 2. Install dependencies ------------------------------------------------
echo "==> Installing dependencies…"
npm install --no-audit --no-fund

# --- 3. Telegram credentials (.env) ----------------------------------------
mkdir -p "$LOG_DIR"
if [ ! -f .env ] || ! grep -q '^TELEGRAM_BOT_TOKEN=..*' .env 2>/dev/null; then
  echo "==> Telegram credentials"
  read -r -p "    Paste your Telegram BOT TOKEN: " BOT_TOKEN
  read -r -p "    Paste your Telegram CHAT ID [8534072157]: " CHAT_ID
  CHAT_ID="${CHAT_ID:-8534072157}"
  cat > .env <<EOF
TELEGRAM_BOT_TOKEN=$BOT_TOKEN
TELEGRAM_CHAT_ID=$CHAT_ID
SCAN_INTERVAL_MINUTES=30
REQUEST_DELAY_MS=1500
EUR_TO_CZK=25
STATE_PATH=state/seen.json
EOF
  chmod 600 .env
  echo "    Wrote .env (kept private, never committed)"
else
  echo "==> .env already present — keeping your existing credentials"
fi

# --- 4. Make the runner executable -----------------------------------------
chmod +x "$SCRIPT_DIR/run-daemon.sh"

# --- 5. Write the LaunchAgent ----------------------------------------------
echo "==> Installing LaunchAgent: $PLIST_DEST"
mkdir -p "$LA_DIR"
cat > "$PLIST_DEST" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>$LABEL</string>
  <key>ProgramArguments</key>
  <array>
    <string>$SCRIPT_DIR/run-daemon.sh</string>
  </array>
  <key>WorkingDirectory</key><string>$APP_DIR</string>
  <key>EnvironmentVariables</key>
  <dict>
    <key>PATH</key><string>$NODE_DIR:/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin</string>
  </dict>
  <key>RunAtLoad</key><true/>
  <key>KeepAlive</key><true/>
  <key>ThrottleInterval</key><integer>30</integer>
  <key>StandardOutPath</key><string>$LOG_OUT</string>
  <key>StandardErrorPath</key><string>$LOG_ERR</string>
</dict>
</plist>
EOF

# --- 6. (Re)load it ---------------------------------------------------------
launchctl unload "$PLIST_DEST" 2>/dev/null || true
launchctl load "$PLIST_DEST"

echo
echo "==> Done. The agent is running now and will keep running 24/7."
echo "    First scan starts immediately; then every 30 minutes."
echo
echo "Handy commands:"
echo "    See live activity:   tail -f \"$LOG_OUT\""
echo "    Stop the agent:      launchctl unload \"$PLIST_DEST\""
echo "    Start it again:      launchctl load \"$PLIST_DEST\""
echo "    Check it's loaded:   launchctl list | grep bikefinder"
