#!/bin/bash
# Stop and remove the bike-finder LaunchAgent. Leaves your code and .env alone.
set -euo pipefail
LABEL="com.bikefinder.agent"
PLIST="$HOME/Library/LaunchAgents/$LABEL.plist"
launchctl unload "$PLIST" 2>/dev/null || true
rm -f "$PLIST"
echo "Removed $PLIST — the agent is stopped and will no longer auto-start."
