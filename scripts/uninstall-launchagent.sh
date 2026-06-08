#!/usr/bin/env bash
# Stops and removes the monitor LaunchAgent.
#   npm run monitor:uninstall-service
set -euo pipefail

LABEL="com.macstudio.m3monitor"
PLIST="$HOME/Library/LaunchAgents/$LABEL.plist"

if [ -f "$PLIST" ]; then
  launchctl unload "$PLIST" 2>/dev/null || true
  rm -f "$PLIST"
  echo "✓ Removed LaunchAgent: $LABEL"
else
  echo "• No LaunchAgent installed ($PLIST not found)."
fi
