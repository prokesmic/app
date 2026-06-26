# Minimal worker image — no dependencies to install, just the script.
FROM node:20-alpine
WORKDIR /app/canyon-monitor

COPY package.json ./
COPY monitor.mjs ./

# State lives on a mounted volume in production (see deploy docs).
ENV STATE_FILE=/data/canyon-state.json
RUN mkdir -p /data

# Run forever, scanning every INTERVAL_SECONDS.
ENV LOOP=1
CMD ["node", "monitor.mjs"]
