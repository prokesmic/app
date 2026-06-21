# Bike-Trainer Finder Agent 🚲

An always-on agent that scans Czech bike marketplaces for a **premium road bike
to live permanently on a Garmin Tacx Neo (Motion Plates) trainer** — and pushes
**only excellent matches** to Telegram.

## What it looks for

Encoded in [`src/config.ts`](src/config.ts):

| Criterion | Rule |
|-----------|------|
| **Budget** | ≤ 30 000 Kč (hard reject above) |
| **Brand** | Only TOP premium: Specialized, Trek, Canyon, Cannondale, BMC (hard reject otherwise) |
| **Drivetrain** | **11-speed mechanical** — ideally Shimano 105 R7000 / Ultegra R8000. ⛔ Electronic (Di2/eTap/AXS) and ⛔ 12-speed are **hard rejects** (the trainer has an 11s Shimano cassette) |
| **Size** | L / 58 for a 190 cm rider (56–61 accepted, 58/L ideal) |
| **Geometry** | Race fit close to Tarmac SL7 (endurance models like Domane/Synapse penalised) |
| **Colour** | Discreet preferred (black, matte black, dark grey, raw alu) |
| **Condition** | Any model year; new / almost-new gets a bonus |

A listing is flagged **excellent** (and only then sent to Telegram) when it
passes every hard rule, has a **confirmed 11-speed** groupset, a **matching
size**, race geometry, and a high overall score. Everything else is silently
skipped — you only hear about the good stuff.

### Sources scanned

- **Bazoš** (`sport.bazos.cz`) — per-brand/model searches capped at budget
- **Cyklobazar.cz** — used road bikes, newest first
- **MTBIKER bazar** (`mtbiker.cz`) — where the former Bike-forum.cz bazar now lives

Scrapers find ads by their detail-link URL pattern and read price/title/specs
from the surrounding markup, so they survive most CSS/class changes. Add a new
source by dropping an adapter in `src/sources/` and listing it in
`src/sources/index.ts`.

## Setup

```bash
cd bike-finder
npm install
cp env.example .env   # fill in TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID
```

Get a Telegram bot token from [@BotFather](https://t.me/BotFather), message your
bot once, then read your chat id from
`https://api.telegram.org/bot<TOKEN>/getUpdates`.

## Run

```bash
npm run report   # dry-run: print top candidates + scores, send nothing
npm run dry      # full pipeline but no Telegram sends
npm run once     # one scan, send new excellent finds to Telegram
npm run watch    # daemon: scan every SCAN_INTERVAL_MINUTES (default 30) forever
npm run typecheck
```

## Always-on options

1. **GitHub Actions (zero infra)** — [`.github/workflows/bike-finder.yml`](../.github/workflows/bike-finder.yml)
   runs every 30 min. Add `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID` as repo
   **Actions secrets**. Dedupe state is persisted via `actions/cache`.
2. **Daemon** — `npm run watch` on any always-on box (VPS, Raspberry Pi,
   `systemd`/pm2). State persists in `state/seen.json`.

## How dedupe works

Every alerted ad id is recorded in `state/seen.json`, so you never get the same
listing twice — even across restarts (or across Actions runs via the cache).

## Tuning

All thresholds, brands, models, groupset/colour keywords and the
`excellentThreshold` live in `src/config.ts`. Lower the threshold to widen the
net; raise it to be even stricter.
