#!/usr/bin/env node
// Canyon outlet monitor — watches the Canyon factory outlet for bikes coming
// available in specific frame sizes, and pushes a Telegram message (which also
// mirrors to a Garmin watch via Garmin Connect "Smart Notifications").
//
// Defaults are tuned to the user's request: GRAVEL bikes, sizes L and XS, en-de.
// Everything is overridable via environment variables (see .env.example).
//
// Zero npm dependencies: uses Node's built-in global fetch (Node >= 18).

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname } from "node:path";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------
const cfg = {
  locale: process.env.CANYON_LOCALE || "en-de",
  // Outlet sub-category slug. "gravel-bikes" => /outlet-bikes/gravel-bikes/.
  // Use "" (empty) to watch the whole outlet.
  category: process.env.CANYON_CATEGORY ?? "gravel-bikes",
  // Frame sizes we care about. Comma-separated, case-insensitive.
  sizes: (process.env.CANYON_SIZES || "L,XS")
    .split(",")
    .map((s) => s.trim().toUpperCase())
    .filter(Boolean),
  // Availability states that count as "available / listed".
  // Canyon uses InStock, PreOrder, OutOfStock. PreOrder is orderable too.
  availableStates: (process.env.CANYON_AVAILABLE_STATES || "InStock,PreOrder")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean),
  intervalSeconds: Number(process.env.INTERVAL_SECONDS || 180),
  loop: process.env.LOOP === "1" || process.argv.includes("--loop"),
  concurrency: Number(process.env.CONCURRENCY || 5),
  stateFile: process.env.STATE_FILE || "./state/canyon-state.json",
  telegram: {
    token: process.env.TELEGRAM_BOT_TOKEN || "",
    chatId: process.env.TELEGRAM_CHAT_ID || "",
  },
  // Optional second push channel (kept separate from your Telegram chats).
  ntfy: {
    topic: process.env.NTFY_TOPIC || "",
    server: process.env.NTFY_SERVER || "https://ntfy.sh",
  },
  userAgent:
    process.env.USER_AGENT ||
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36",
};

const SITE = "https://www.canyon.com";
const log = (...a) => console.log(new Date().toISOString(), ...a);

// ---------------------------------------------------------------------------
// HTTP helpers (with retry)
// ---------------------------------------------------------------------------
async function fetchText(url, { retries = 3, timeoutMs = 30000 } = {}) {
  let lastErr;
  for (let attempt = 0; attempt <= retries; attempt++) {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const res = await fetch(url, {
        headers: {
          "User-Agent": cfg.userAgent,
          Accept: "text/html,application/xhtml+xml,application/json",
          "Accept-Language": "en-GB,en;q=0.9",
        },
        signal: ctrl.signal,
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.text();
    } catch (err) {
      lastErr = err;
      if (attempt < retries) await sleep(1000 * 2 ** attempt);
    } finally {
      clearTimeout(t);
    }
  }
  throw lastErr;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function htmlUnescape(s) {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

// Run async tasks with a concurrency cap.
async function pool(items, worker, limit) {
  const results = [];
  let i = 0;
  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (i < items.length) {
      const idx = i++;
      try {
        results[idx] = await worker(items[idx], idx);
      } catch (err) {
        results[idx] = { error: String(err), item: items[idx] };
      }
    }
  });
  await Promise.all(runners);
  return results;
}

// ---------------------------------------------------------------------------
// Scraping
// ---------------------------------------------------------------------------
function gridUrl(start, sz) {
  const cat = cfg.category ? `outlet-bikes/${cfg.category}` : "outlet-bikes";
  return `${SITE}/${cfg.locale}/${cat}/?searchType=bikes&start=${start}&sz=${sz}`;
}

// Returns a de-duplicated list of color-variant PDP URLs from the outlet grid.
async function getProductLinks() {
  const links = new Set();
  const pageSize = 120;
  for (let start = 0; start < 600; start += pageSize) {
    const html = await fetchText(gridUrl(start, pageSize));
    const tilePids = html.match(/data-pid="\d+"/g) || [];
    // Product links: .../<slug>/<masterId>.html?dwvar_<id>_pv_rahmenfarbe=<color>
    const re =
      /href="(https:\/\/www\.canyon\.com\/[^"]*?\/\d{3,6}\.html\?dwvar_\d+_pv_rahmenfarbe=[^"&]+)"/g;
    let m;
    for (; (m = re.exec(html)); ) links.add(htmlUnescape(m[1]));
    // Also capture bikes whose listing link has no color variant param.
    const re2 = /href="(https:\/\/www\.canyon\.com\/[^"]*?\/\d{3,6}\.html)"/g;
    for (; (m = re2.exec(html)); ) {
      const u = htmlUnescape(m[1]);
      if (/\/(road|gravel|mountain|e-bikes|outlet)/.test(u)) links.add(u);
    }
    if (tilePids.length < pageSize) break; // last page reached
  }
  return [...links];
}

function parseIds(url) {
  const master = (url.match(/\/(\d{3,6})\.html/) || [])[1] || "";
  const color = (url.match(/rahmenfarbe=([^&]+)/) || [])[1] || "default";
  return { master, color };
}

// Fetch a PDP and extract per-size availability from the ProductGroup ld+json.
async function getSizeAvailability(url) {
  const html = await fetchText(url);
  const { master, color } = parseIds(url);
  let group = null;
  const re = /<script type="application\/ld\+json">([\s\S]*?)<\/script>/g;
  let m;
  while ((m = re.exec(html))) {
    let data;
    try {
      data = JSON.parse(m[1]);
    } catch {
      continue;
    }
    if (data && data["@type"] === "ProductGroup") {
      group = data;
      break;
    }
  }
  if (!group) return null;

  const sizes = {};
  for (const v of group.hasVariant || []) {
    let off = v.offers || {};
    if (Array.isArray(off)) off = off[0] || {};
    const size = String(v.size || "").toUpperCase();
    if (!size) continue;
    sizes[size] = {
      status: String(off.availability || "").split("/").pop() || "Unknown",
      price: off.price || null,
      currency: off.priceCurrency || "EUR",
      sku: v.sku || "",
      url: (off.url || v.url || url).startsWith("http")
        ? off.url || v.url || url
        : SITE + (off.url || v.url),
    };
  }
  return {
    master,
    color,
    name: group.name || "Canyon bike",
    colorName: extractColorName(html) || color,
    image: group.image || "",
    url,
    sizes,
  };
}

function extractColorName(html) {
  const m = html.match(/js-colorSwatchLabel[^>]*>\s*([^<]{1,40})</);
  return m ? m[1].trim() : "";
}

// ---------------------------------------------------------------------------
// Notifications
// ---------------------------------------------------------------------------
async function sendTelegram(text) {
  if (!cfg.telegram.token || !cfg.telegram.chatId) {
    log("[telegram] not configured — skipping (would have sent):\n" + text);
    return;
  }
  const url = `https://api.telegram.org/bot${cfg.telegram.token}/sendMessage`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: cfg.telegram.chatId,
      text,
      parse_mode: "HTML",
      disable_web_page_preview: false,
    }),
  });
  if (!res.ok) log("[telegram] send failed:", res.status, await res.text());
}

async function sendNtfy(title, body, url) {
  if (!cfg.ntfy.topic) return;
  await fetch(`${cfg.ntfy.server}/${cfg.ntfy.topic}`, {
    method: "POST",
    headers: {
      Title: title,
      Tags: "bike",
      ...(url ? { Click: url } : {}),
    },
    body,
  });
}

async function notify({ title, html, plain, url }) {
  await Promise.allSettled([sendTelegram(html), sendNtfy(title, plain, url)]);
}

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------
async function loadState() {
  try {
    return JSON.parse(await readFile(cfg.stateFile, "utf8"));
  } catch {
    return { seeded: false, items: {} };
  }
}

async function saveState(state) {
  await mkdir(dirname(cfg.stateFile), { recursive: true });
  await writeFile(cfg.stateFile, JSON.stringify(state, null, 2));
}

const isAvailable = (status) => cfg.availableStates.includes(status);

// ---------------------------------------------------------------------------
// One monitoring cycle
// ---------------------------------------------------------------------------
async function runCycle(state) {
  const links = await getProductLinks();
  log(`scanned grid: ${links.length} ${cfg.category || "outlet"} bike variants`);
  if (links.length === 0) {
    log("WARNING: 0 products parsed — site layout may have changed; skipping cycle");
    return state;
  }

  const products = (await pool(links, getSizeAvailability, cfg.concurrency)).filter(
    (p) => p && !p.error && p.sizes
  );

  const events = [];
  const currentlyAvailable = [];

  for (const p of products) {
    for (const size of cfg.sizes) {
      const info = p.sizes[size];
      if (!info) continue; // this model doesn't come in that size
      const key = `${p.master}|${p.color}|${size}`;
      const prev = state.items[key];
      const nowAvail = isAvailable(info.status);

      if (nowAvail) currentlyAvailable.push({ p, size, info });

      const wasAvail = prev ? isAvailable(prev.status) : false;
      if (nowAvail && !wasAvail) {
        events.push({ p, size, info, isNewBike: !prev });
      }
      state.items[key] = { status: info.status, ts: Date.now() };
    }
  }

  // First run: seed silently, send one summary so the user knows it's alive.
  if (!state.seeded) {
    state.seeded = true;
    const lines = currentlyAvailable
      .map(
        ({ p, size, info }) =>
          `• ${p.name} — ${size} (${info.status}) — €${info.price}`
      )
      .join("\n");
    await notify({
      title: "Canyon monitor started",
      html:
        `✅ <b>Canyon outlet monitor is live</b>\n` +
        `Watching <b>${cfg.category || "all outlet"}</b> in sizes <b>${cfg.sizes.join(
          ", "
        )}</b> every ${cfg.intervalSeconds / 60} min.\n\n` +
        (lines
          ? `Currently available now:\n${escapeHtml(lines)}`
          : `Nothing in ${cfg.sizes.join("/")} available right now — I'll ping you the moment something appears.`),
      plain: `Canyon monitor live. ${currentlyAvailable.length} bike(s) currently in ${cfg.sizes.join(
        "/"
      )}.`,
    });
    log(`seeded baseline: ${currentlyAvailable.length} available now`);
    return state;
  }

  // Subsequent runs: notify per new availability.
  for (const ev of events) {
    const { p, size, info, isNewBike } = ev;
    const tag = isNewBike ? "🆕 NEW BIKE" : "📦 NEW SIZE";
    const html =
      `${tag} in size <b>${size}</b>!\n` +
      `🚲 <b>${escapeHtml(p.name)}</b> (${escapeHtml(p.colorName)})\n` +
      `💶 €${info.price} • ${info.status}\n` +
      `🔗 ${info.url}`;
    await notify({
      title: `${p.name} — ${size} available`,
      html,
      plain: `${p.name} (${p.colorName}) — size ${size} ${info.status} — €${info.price}`,
      url: info.url,
    });
    log(`NOTIFIED: ${p.name} ${size} ${info.status}`);
  }
  if (events.length === 0) log("no changes");

  // Prune stale keys for products that left the outlet entirely (optional tidy).
  return state;
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function once() {
  const state = await loadState();
  try {
    const next = await runCycle(state);
    await saveState(next);
  } catch (err) {
    log("cycle error:", err?.message || err);
  }
}

async function main() {
  log(
    `Canyon monitor — locale=${cfg.locale} category=${cfg.category || "(all outlet)"} sizes=${cfg.sizes.join(
      ","
    )} available=${cfg.availableStates.join(",")} interval=${cfg.intervalSeconds}s loop=${cfg.loop}`
  );
  if (!cfg.loop) return once();
  // self-scheduling loop: run, wait interval, repeat (no overlap)
  for (;;) {
    const started = Date.now();
    await once();
    const elapsed = Date.now() - started;
    const wait = Math.max(0, cfg.intervalSeconds * 1000 - elapsed);
    await sleep(wait);
  }
}

main();
