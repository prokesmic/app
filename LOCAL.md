# Run the Mac Studio M3 Ultra monitor locally (macOS)

This runs the monitor entirely on **your** machine — your residential IP, your
SQLite DB, your Telegram bot. Nothing depends on the Claude sandbox, and a
residential IP avoids the bot-blocking (403/503) that datacenter IPs hit.

## 1. One-time setup

```bash
git clone <your-repo> && cd app   # or just cd into the repo
npm run monitor:setup
```

`monitor:setup` installs dependencies, creates the SQLite DB, seeds the trusted
sellers, runs the offline tests, and creates `.env.local` from the template.

## 2. Add your Telegram credentials

Edit `.env.local`:

```bash
TELEGRAM_BOT_TOKEN="123456:ABC..."   # from @BotFather
TELEGRAM_CHAT_ID="8534072157"        # the chat you message the bot from
```

(Find the chat ID: message your bot once, then open
`https://api.telegram.org/bot<TOKEN>/getUpdates` and copy `chat.id`.)

Verify it works:

```bash
npm run monitor          # one pass now; in-stock finds will ping Telegram
```

## 3. Run it always-on

Install it as a background service that starts at login and auto-restarts:

```bash
npm run monitor:install-service        # checks every 120s
# or a custom interval:
bash scripts/install-launchagent.sh 60 # every 60s
```

That's it — it now runs continuously in the background.

| Task | Command |
|------|---------|
| Check it's running | `launchctl list \| grep com.macstudio.m3monitor` |
| Live logs | `tail -f logs/monitor.log` |
| Stop / remove | `npm run monitor:uninstall-service` |
| Run in foreground instead | `npm run monitor:watch` |

> The Mac must be awake to poll. To keep checks running with the lid closed /
> display off, either run on a Mac that stays awake (a Mac Studio does) or use
> `caffeinate -s` / Amphetamine. The LaunchAgent itself resumes automatically
> after sleep.

## 4. Optional: the dashboard

```bash
npm run dev      # then open http://localhost:3000/monitor
```

The dashboard reads the same local DB the service writes to, so you'll see live
status, last-checked times, and recent alerts. Use the ✎ buttons to paste exact
product URLs for any seller still flagged "needs product URL".

## Adjusting what's monitored

- **Apple part numbers** are pre-filled (US `MU973LL/A`, DE `MU973D/A`,
  CZ `MU973CZ/A`, CH `MU973SM/A`).
- **Reseller product URLs**: Alza, Datart, MediaMarkt, B&H and Best Buy are set.
  Paste exact product pages for the rest via the dashboard, or edit
  `lib/monitor/catalog.ts` and run `npm run monitor:seed`.

See `MONITOR.md` for detection internals and tuning.
