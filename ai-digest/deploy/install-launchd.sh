#!/usr/bin/env bash
# Install a macOS launchd agent that runs the digest twice a day (local time).
# Usage:  bash deploy/install-launchd.sh           # default 07:00 and 17:00
#         MORNING=8 EVENING=18 bash deploy/install-launchd.sh
set -euo pipefail

DIR="$(cd "$(dirname "$0")/.." && pwd)"
LABEL="com.ai-digest.digest"
PLIST="$HOME/Library/LaunchAgents/$LABEL.plist"
MORNING="${MORNING:-7}"
EVENING="${EVENING:-17}"

mkdir -p "$HOME/Library/LaunchAgents"
cat > "$PLIST" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>$LABEL</string>
  <key>ProgramArguments</key>
  <array>
    <string>/bin/bash</string>
    <string>$DIR/deploy/run.sh</string>
  </array>
  <key>StartCalendarInterval</key>
  <array>
    <dict><key>Hour</key><integer>$MORNING</integer><key>Minute</key><integer>0</integer></dict>
    <dict><key>Hour</key><integer>$EVENING</integer><key>Minute</key><integer>0</integer></dict>
  </array>
  <key>StandardOutPath</key><string>$DIR/state/digest.log</string>
  <key>StandardErrorPath</key><string>$DIR/state/digest.log</string>
  <key>RunAtLoad</key><false/>
</dict>
</plist>
EOF

launchctl unload "$PLIST" 2>/dev/null || true
launchctl load "$PLIST"
echo "Installed $LABEL — runs daily at ${MORNING}:00 and ${EVENING}:00 (local time)."
echo "Logs: $DIR/state/digest.log"
echo "Run once now to test:  bash $DIR/deploy/run.sh"
