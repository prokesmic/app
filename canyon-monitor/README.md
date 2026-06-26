# Canyon Outlet Monitor 🚲

A 24/7 worker that watches the **Canyon factory outlet** and pings you the
moment a bike becomes available in a size you want. Alerts go to **Telegram**,
which also shows up **on your Garmin watch** via Garmin Connect's Smart
Notifications.

**Default configuration (your request):**
- Region: `en-de` (EU English outlet)
- Category: **gravel bikes**
- Sizes: **L** and **XS**
- Scan interval: **every 3 minutes**

All of that is configurable with environment variables.

---

## How it works

1. Every 3 minutes it loads the outlet grid
   (`canyon.com/en-de/outlet-bikes/gravel-bikes/`) to get the current list of
   gravel bikes.
2. For each bike it reads the product page's structured data
   (`ProductGroup` JSON-LD) to get **per-size availability**
   (`InStock` / `PreOrder` / `OutOfStock`).
3. It remembers the last state in a small JSON file. When a watched size
   (L or XS) **flips to available** — or a **brand-new bike** shows up already
   available — it sends you a message with the bike, colour, price, and a
   direct link to that exact size.

The first run is silent except for one "monitor is live" summary, so you don't
get blasted with everything that's already in stock. After that you only hear
about genuine changes.

No npm dependencies — it uses Node's built-in `fetch` (Node 18+).

---

## 1. Create your Telegram bot (2 minutes)

1. In Telegram, open a chat with **@BotFather**.
2. Send `/newbot`, pick a name and username. BotFather replies with a
   **bot token** like `123456789:ABCdef...` → that's `TELEGRAM_BOT_TOKEN`.
3. Open a chat with your new bot and send it any message (e.g. "hi"). This is
   required before the bot can message you.
4. Visit `https://api.telegram.org/bot<YOUR_TOKEN>/getUpdates` in a browser.
   Find `"chat":{"id":123456789,...}` → that number is `TELEGRAM_CHAT_ID`.

## 2. Make the alerts reach your Garmin watch

Telegram → phone → watch, using the standard mirroring built into Garmin:

1. Install the **Telegram** app on your phone and sign in.
2. In **Garmin Connect** app → **Settings → Notifications / Smart
   Notifications** → enable notifications and make sure **Telegram** is in the
   allowed apps list (Garmin mirrors your phone's notifications).
3. On your watch, enable **Phone Notifications** (and "during activity" if you
   want alerts while riding).

Now every Telegram alert from the monitor buzzes your wrist. (Optional: set
`NTFY_TOPIC` to also push via [ntfy.sh](https://ntfy.sh) as a separate channel —
see `.env.example`.)

---

## 3. Try it locally first

```bash
cd canyon-monitor
cp .env.example .env          # fill in TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID
set -a; . ./.env; set +a      # load the env file
npm run once                  # single scan; sends the "live" summary to Telegram
```

You should get the startup summary in Telegram (and on your watch). Run it once
more — it should say `no changes` in the logs.

To run it continuously on your own machine: `npm start` (loops every 3 min).

---

## 4. Deploy as a 24/7 cloud worker

This is a background worker (no web port). Pick one host. **Attach a small disk
so a redeploy doesn't make it forget what it has already seen.**

### Option A — Railway (easiest)

1. Create a project from this repo, **Root Directory = `canyon-monitor`**.
   Railway auto-detects the `Dockerfile`.
2. Add a **Volume** mounted at `/data`.
3. Variables → add `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID` (the rest have
   sane defaults baked into the Dockerfile; override any if you like).
4. Deploy. Check the logs for `Canyon monitor — ...` and `scanned grid`.

### Option B — Render (blueprint included)

`render.yaml` defines a Background Worker with a 1 GB disk at `/data`.
New + → **Blueprint** → point at this repo → set the two Telegram secrets in the
dashboard → deploy. Use a paid worker plan (the free tier sleeps).

### Option C — Fly.io (config included)

```bash
cd canyon-monitor
fly launch --no-deploy            # accept the provided fly.toml
fly volume create canyon_state --size 1 --region fra
fly secrets set TELEGRAM_BOT_TOKEN=xxx TELEGRAM_CHAT_ID=yyy
fly deploy
```

`fly.toml` pins one always-on machine in Frankfurt (close to the EU store).

---

## Configuration reference

| Variable | Default | Meaning |
|---|---|---|
| `TELEGRAM_BOT_TOKEN` | — | **Required.** BotFather token. |
| `TELEGRAM_CHAT_ID` | — | **Required.** Your chat id. |
| `CANYON_LOCALE` | `en-de` | Store locale (`en-us`, `en-gb`, …). |
| `CANYON_CATEGORY` | `gravel-bikes` | Outlet sub-category, or `""` for the whole outlet. |
| `CANYON_SIZES` | `L,XS` | Frame sizes to watch (comma-separated). |
| `CANYON_AVAILABLE_STATES` | `InStock,PreOrder` | Which states count as "available". Set to `InStock` to ignore pre-orders. |
| `INTERVAL_SECONDS` | `180` | Seconds between scans. |
| `LOOP` | `1` (worker) | `1` = run forever; unset = run once. |
| `CONCURRENCY` | `5` | Parallel product fetches. |
| `STATE_FILE` | `./state/canyon-state.json` | Where last-seen state is stored. Put on a volume in prod. |
| `NTFY_TOPIC` | — | Optional second push channel via ntfy.sh. |

### Examples

Watch the **whole** outlet in size M only:
```
CANYON_CATEGORY=   CANYON_SIZES=M
```
Watch road bikes in 56cm-equivalent and only when actually in stock:
```
CANYON_CATEGORY=road-bikes   CANYON_SIZES=M   CANYON_AVAILABLE_STATES=InStock
```

---

## Notes & limitations

- **Be polite:** 3-minute scans of ~13 gravel bikes is light traffic. If you
  widen to the whole outlet (~240 bikes) consider raising `INTERVAL_SECONDS`.
- The monitor reads Canyon's public structured data; if Canyon changes their
  page markup the grid parse may return 0 products — the script logs a warning
  and skips that cycle rather than wiping state.
- State persistence matters: without a mounted disk, a redeploy re-seeds the
  baseline (one summary message, no false "new bike" spam).
