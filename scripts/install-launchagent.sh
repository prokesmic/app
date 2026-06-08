#!/usr/bin/env bash
# Installs the monitor as a macOS LaunchAgent so it runs in the background,
# starts at login, and is restarted automatically if it ever exits.
#
#   npm run monitor:install-service            # default: check every 120s
#   bash scripts/install-launchagent.sh 60     # check every 60s
set -euo pipefail

if [ "$(uname)" != "Darwin" ]; then
  echo "✗ This LaunchAgent installer is macOS-only." >&2
  echo "  On Linux, run with systemd or 'npm run monitor:watch' under tmux/screen." >&2
  exit 1
fi

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
LABEL="com.macstudio.m3monitor"
PLIST="$HOME/Library/LaunchAgents/$LABEL.plist"
INTERVAL="${1:-120}"
TSX="$ROOT/node_modules/.bin/tsx"
NODE_DIR="$(cd "$(dirname "$(command -v node)")" && pwd)"

if [ ! -x "$TSX" ]; then
  echo "✗ $TSX not found — run 'npm install' first." >&2
  exit 1
fi

mkdir -p "$ROOT/logs" "$HOME/Library/LaunchAgents"

cat > "$PLIST" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>$LABEL</string>
  <key>ProgramArguments</key>
  <array>
    <string>$TSX</string>
    <string>$ROOT/scripts/monitor.ts</string>
    <string>--watch</string>
    <string>--interval=$INTERVAL</string>
  </array>
  <key>WorkingDirectory</key>
  <string>$ROOT</string>
  <key>EnvironmentVariables</key>
  <dict>
    <key>PATH</key>
    <string>$NODE_DIR:/usr/local/bin:/opt/homebrew/bin:/usr/bin:/bin:/usr/sbin:/sbin</string>
  </dict>
  <key>RunAtLoad</key>
  <true/>
  <key>KeepAlive</key>
  <true/>
  <key>ThrottleInterval</key>
  <integer>30</integer>
  <key>StandardOutPath</key>
  <string>$ROOT/logs/monitor.log</string>
  <key>StandardErrorPath</key>
  <string>$ROOT/logs/monitor.err.log</string>
</dict>
</plist>
PLIST

# Reload cleanly (works across macOS versions).
launchctl unload "$PLIST" 2>/dev/null || true
launchctl load -w "$PLIST"

echo "✓ Installed and started LaunchAgent: $LABEL"
echo "  interval : every ${INTERVAL}s"
echo "  logs     : $ROOT/logs/monitor.log"
echo "  status   : launchctl list | grep $LABEL"
echo "  stop     : npm run monitor:uninstall-service"
