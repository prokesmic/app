#!/bin/bash
# Wrapper launchd executes to run the bike-finder daemon.
# Keeps things simple: move into the bike-finder dir and start the watcher.
set -e
cd "$(cd "$(dirname "$0")/.." && pwd)"
exec npm run watch
