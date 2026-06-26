# Canyon Outlet Monitor 🚲

Watches the **Canyon factory outlet** and pings you the moment a bike becomes
available in a size you want. Alerts go to **ntfy** and/or **Telegram**, both of
which show up **on a Garmin watch** via Garmin Connect Smart Notifications.

**Configured for your request:**
- Region: `en-de` (EU English outlet)
- Category: **gravel bikes**
- Sizes: **L** and **XS**
- Scan interval: **~3 minutes**

Everything is configurable via environment variables.

---

## ✅ It already runs itself — on GitHub Actions

This repo is public, so GitHub Actions runs the monitor **free, 24/7, on
GitHub's servers** — no machine of yours, no deploy step. The schedule lives in
[`.github/workflows/canyon-monitor.yml`](../.github/workflows/canyon-monitor.yml):
it triggers every 5 minutes and does 2 scans per run (~140s apart) for an
effective cadence near 3 minutes (GitHub's scheduler has a 5-min floor and can
lag under load, so treat 3 min as best-effort).

State (what it has already seen) is persisted between runs via the Actions
cache, so you only get pinged on genuine changes.

### To receive the alerts on your phone + watch

**Option A — ntfy (no setup, already wired):**
1. Install the free **ntfy** app ([iOS](https://apps.apple.com/app/ntfy/id1625396347) /
   [Android](https://play.google.com/store/apps/details?id=io.heckel.ntfy)).
2. Tap **+**, subscribe to the topic:
   ```
   canyon-725492658e89b57c
   ```
   (default server `ntfy.sh`).
3. In **Garmin Connect → Notifications/Smart Notifications**, allow the **ntfy**
   app, and enable **Phone Notifications** on the watch.

That's it — alerts now buzz your wrist. (The topic is unguessable but lives in a
public repo; to lock it down later, switch to a [reserved/auth'd ntfy topic](https://docs.ntfy.sh/config/#access-control)
and put the token in a repo secret, or just change the topic name.)

**Option B — Telegram (optional, uses what you originally asked for):**
1. In Telegram, message **@BotFather** → `/newbot` → copy the **bot token**.
2. Message your new bot once ("hi"), then open
   `https://api.telegram.org/bot<TOKEN>/getUpdates` and copy the
   `"chat":{"id": … }` number.
3. On the GitHub mobile site: **repo → Settings → Secrets and variables →
   Actions → New repository secret**, add:
   - `TELEGRAM_BOT_TOKEN` = your token
   - `TELEGRAM_CHAT_ID` = your chat id
4. Enable **Telegram** in Garmin Connect Smart Notifications.

The workflow already references those secrets — the next run picks them up
automatically. No secrets = Telegram is silently skipped (ntfy still works).

### Watch it / trigger it manually

GitHub mobile site or web: **Actions → canyon-monitor → Run workflow** to fire a
scan on demand, or open any run to see the logs (`scanned grid: 13 …`).

> Note: GitHub disables scheduled workflows after ~60 days with no repo commits.
> If you go that long untouched, push any commit (or hit "Run workflow") to keep
> it alive.

---

## How it works

1. Every cycle it loads the outlet grid
   (`canyon.com/en-de/outlet-bikes/gravel-bikes/`) for the current gravel bikes.
2. For each bike it reads the product page's structured data (`ProductGroup`
   JSON-LD) for **per-size availability** (`InStock` / `PreOrder` / `OutOfStock`).
3. It diffs against the last-seen state. When a watched size (L or XS) **flips to
   available** — or a **brand-new bike** shows up already available — it sends a
   message with the bike, colour, price, and a direct link to that exact size.

First run seeds a silent baseline plus one "monitor is live" summary, so you
aren't blasted with everything already in stock. After that, only real changes.

No npm dependencies — uses Node's built-in `fetch` (Node 18+).

---

## Run it locally (optional)

```bash
cd canyon-monitor
cp .env.example .env          # fill in tokens if you want Telegram locally
set -a; . ./.env; set +a
npm run once                  # single scan
npm start                     # loop forever every 3 min
```

## Alternative: always-on worker (true 3-min cadence)

If you ever want a hard 3-minute cadence (no GitHub scheduler jitter), run it as
a worker on Railway / Render / Fly. `Dockerfile`, `render.yaml` and `fly.toml`
are included; see the env reference below and set `LOOP=1`,
`INTERVAL_SECONDS=180`. This needs a host account, so it's the optional upgrade
path — the GitHub Actions setup above already runs with zero hosting.

---

## Configuration reference

| Variable | Default | Meaning |
|---|---|---|
| `NTFY_TOPIC` | — | ntfy topic to publish to (set in the workflow). |
| `NTFY_SERVER` | `https://ntfy.sh` | ntfy server. |
| `TELEGRAM_BOT_TOKEN` | — | Optional. BotFather token (repo secret). |
| `TELEGRAM_CHAT_ID` | — | Optional. Your chat id (repo secret). |
| `CANYON_LOCALE` | `en-de` | Store locale (`en-us`, `en-gb`, …). |
| `CANYON_CATEGORY` | `gravel-bikes` | Outlet sub-category, or `""` for the whole outlet. |
| `CANYON_SIZES` | `L,XS` | Frame sizes to watch (comma-separated). |
| `CANYON_AVAILABLE_STATES` | `InStock,PreOrder` | States that count as "available". Set to `InStock` to ignore pre-orders. |
| `PASSES` | `1` | One-shot mode: scans per invocation (CI uses 2). |
| `PASS_DELAY` | `150` | Seconds between passes. |
| `INTERVAL_SECONDS` | `180` | Loop mode (`LOOP=1`) seconds between scans. |
| `LOOP` | — | `1` = run forever (worker); unset = one-shot. |
| `CONCURRENCY` | `5` | Parallel product fetches. |
| `STATE_FILE` | `./state/canyon-state.json` | Where last-seen state is stored. |

### Examples

Whole outlet, size M only: `CANYON_CATEGORY=` and `CANYON_SIZES=M`.
Road bikes, in-stock only: `CANYON_CATEGORY=road-bikes CANYON_AVAILABLE_STATES=InStock`.

---

## Notes & limitations

- 3-minute cadence on GitHub Actions is best-effort (5-min floor + scheduler
  jitter). Use the worker option for a strict 3 min.
- The monitor reads Canyon's public structured data; if their markup changes and
  the grid parse returns 0 products, it logs a warning and skips the cycle rather
  than wiping state.
- The ntfy topic sits in a public repo. It's random, but anyone who finds it
  could read alerts or send you noise — rotate it or move to an auth'd topic if
  that matters to you.
