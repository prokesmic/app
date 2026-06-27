# Always-on worker image (Railway / Fly / Render) — no deps to install.
FROM node:20-alpine
WORKDIR /app/canyon-monitor

COPY package.json ./
COPY monitor.mjs ./
COPY watchlist.json ./

# --- What to watch (same as the GitHub Actions setup) ---
ENV CANYON_LOCALE=en-de
ENV CANYON_CATEGORY=gravel-bikes
ENV CANYON_SIZES=L,XS
ENV CANYON_AVAILABLE_STATES=InStock,PreOrder

# --- Notifications (ntfy needs no secret; Telegram is optional via Railway vars) ---
ENV NTFY_TOPIC=canyon-725492658e89b57c
ENV NTFY_SERVER=https://ntfy.sh

# --- Run forever, scanning every 3 minutes (true continuous cadence) ---
ENV LOOP=1
ENV INTERVAL_SECONDS=180

# State persists here; mount a Railway volume at /data to survive redeploys.
ENV STATE_FILE=/data/canyon-state.json
RUN mkdir -p /data

CMD ["node", "monitor.mjs"]
