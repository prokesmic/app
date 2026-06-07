# Mac Studio M3 Ultra Availability Monitor

An always-on monitor that watches **trusted sellers** across **🇨🇿 CZ, 🇺🇸 US,
🇩🇪 DE, 🇨🇭 CH** and sends you a **Telegram** alert the instant the **base
M3 Ultra** Mac Studio (28-core CPU · 60-core GPU · 96GB · 1TB) comes in stock.

- **Trust policy:** Apple Store + Apple Authorized Resellers, plus reputable
  marketplaces restricted to first-party stock (e.g. *sold & shipped by Amazon*).
- **Dashboard:** `/monitor`
- **Trigger endpoint:** `POST /api/monitor/run` (secret-protected)
- **Status feed:** `GET /api/monitor/status`

## How it works

```
targets (sellers) ──▶ strategy check ──▶ snapshot ──▶ rising-edge? ──▶ Telegram
   catalog.ts           strategies.ts      Prisma      runner.ts        notify/
```

Each seller is a **target** with a detection **strategy**:

| Strategy            | Used for            | How it detects stock |
|---------------------|---------------------|----------------------|
| `apple-fulfillment` | Apple official stores | Apple's `fulfillment-messages` API (delivery + pickup) for a part number |
| `http-match`        | most resellers      | locale-specific in/out-of-stock phrases on the product page |
| `json-ld`           | schema.org sites    | `Offer.availability` + price from JSON-LD |

Alerts fire only on a **rising edge** (was-not-in-stock → in-stock) and are
de-duplicated per seller via `MONITOR_ALERT_COOLDOWN_MS` (default 30 min), so
you won't get spammed when a page flaps.

## Setup

1. **Install & migrate**
   ```bash
   npm install
   npx prisma migrate deploy      # or: npx prisma db push
   npx tsx scripts/seed-monitor.ts
   ```

2. **Configure Telegram** (see `.env.example`)
   - `@BotFather` → `/newbot` → copy token → `TELEGRAM_BOT_TOKEN`
   - message the bot once, open `https://api.telegram.org/bot<TOKEN>/getUpdates`,
     copy `chat.id` → `TELEGRAM_CHAT_ID`
   - Verify with the **“Send test alert”** button on `/monitor`.

3. **Fill in the Apple part numbers** (the only required tuning)
   The four Apple targets need the *regional* part number for the base M3 Ultra
   config. Find it by configuring the machine on apple.com (CZ/US/DE/CH) and
   reading the part number from the bag/review step, or via the page's
   `fulfillment-messages` request in devtools. Paste it via the ✎ button on each
   Apple row in `/monitor`, or edit `lib/monitor/catalog.ts` and re-seed.

   Reseller targets use search/product URLs that may shift over time — paste the
   exact product page URL via the ✎ button for the most reliable matching. Any
   target returning `Unknown` on the dashboard needs its URL/markers adjusted.

## Running it always-on

**Option A — long-running watcher (best latency).** On any always-on host
(VPS, Raspberry Pi, a `tmux`/`screen` session):

```bash
npx tsx scripts/monitor.ts --watch --interval=120   # check every 2 min
```

**Option B — serverless cron.** Deploy the app, set `MONITOR_SECRET`, then hit
the endpoint on a schedule:

- **Vercel Cron** — add to `vercel.json`:
  ```json
  { "crons": [{ "path": "/api/monitor/run?secret=YOUR_SECRET", "schedule": "*/5 * * * *" }] }
  ```
- **GitHub Actions** — `.github/workflows/monitor.yml` is included. Set repo
  secrets `MONITOR_URL` and `MONITOR_SECRET`.
- **Any cron**:
  ```bash
  curl -X POST https://<host>/api/monitor/run -H "Authorization: Bearer $MONITOR_SECRET"
  ```

> Stock-transition detection needs a persistent database. With Option B the
> deployed app owns the DB; for Option A the watcher uses whatever `DATABASE_URL`
> points at. SQLite is fine for a single watcher; use Postgres if multiple
> runners share state.

## Tuning detection

Edit a target's `config` (JSON) — see `lib/monitor/types.ts`:

- `http-match`: `inStock[]`, `outOfStock[]`, `inStockWins`, `priceRegex`
- `json-ld`: `inStockAvailability[]`
- `apple-fulfillment`: `partNumber`, `postalCode`, `storefront`

By default, when both in- and out-of-stock phrases match a page, the result is
**out of stock** (conservative — avoids false alerts). Set `inStockWins: true`
per target to flip that.

## Verify the logic offline

```bash
npx tsx scripts/test-monitor.ts   # mocks fetch, checks every strategy
```

## Adding a seller

Add a `SellerSeed` + `TargetSeed` to `lib/monitor/catalog.ts` and re-run
`scripts/seed-monitor.ts`. Keep new sellers within the trust policy
(authorized resellers or first-party marketplace stock only).
