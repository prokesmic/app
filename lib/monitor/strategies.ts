// Availability-detection strategies. Each strategy takes a target and returns a
// normalised CheckResult. Strategies are pure with respect to the database so
// they can be tested in isolation (see scripts/test-monitor.ts).

import type {
  AppleFulfillmentConfig,
  CheckResult,
  HttpMatchConfig,
  JsonLdConfig,
  TargetInput,
} from "./types";

const DEFAULT_TIMEOUT_MS = 15_000;

// A desktop browser UA — many retailers return a stripped/blocked page to
// obvious bots. Keep this reasonably current.
const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

interface FetchOutcome {
  ok: boolean;
  status: number;
  body: string;
  responseMs: number;
  error?: string;
}

async function fetchText(
  url: string,
  headers: Record<string, string> = {},
  timeoutMs = DEFAULT_TIMEOUT_MS,
): Promise<FetchOutcome> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const startedAt = Date.now();
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      redirect: "follow",
      headers: {
        "User-Agent": USER_AGENT,
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,application/json;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9,de;q=0.7,cs;q=0.6",
        ...headers,
      },
    });
    const body = await res.text();
    return {
      ok: res.ok,
      status: res.status,
      body,
      responseMs: Date.now() - startedAt,
    };
  } catch (err) {
    return {
      ok: false,
      status: 0,
      body: "",
      responseMs: Date.now() - startedAt,
      error: err instanceof Error ? err.message : String(err),
    };
  } finally {
    clearTimeout(timer);
  }
}

function parsePrice(raw: string | undefined | null): number | null {
  if (!raw) return null;
  // Normalise "1 234,56" / "1.234,56" / "1,234.56" / "12345" => number.
  const cleaned = raw.replace(/[^\d.,]/g, "").trim();
  if (!cleaned) return null;
  let normalised = cleaned;
  const lastComma = cleaned.lastIndexOf(",");
  const lastDot = cleaned.lastIndexOf(".");
  if (lastComma > lastDot) {
    // comma is the decimal separator
    normalised = cleaned.replace(/\./g, "").replace(",", ".");
  } else {
    // dot is the decimal separator (or no decimals)
    normalised = cleaned.replace(/,/g, "");
  }
  const value = Number.parseFloat(normalised);
  return Number.isFinite(value) ? value : null;
}

// --- http-match -------------------------------------------------------------
// Fetch the listing page and look for in-stock / out-of-stock marker strings.
// Robust default that works for most reseller pages.
async function httpMatch(target: TargetInput): Promise<CheckResult> {
  const cfg = target.config as HttpMatchConfig;
  // Listing/search URLs can't be trusted either way — don't risk a false alert.
  if (cfg.searchPage) {
    return {
      status: "UNKNOWN",
      rawSignal: "search/listing page — set the exact product URL to enable alerts",
    };
  }
  const outcome = await fetchText(target.url, cfg.headers);
  if (!outcome.ok) {
    return {
      status: outcome.status === 0 ? "ERROR" : "UNKNOWN",
      httpStatus: outcome.status,
      responseMs: outcome.responseMs,
      error: outcome.error ?? `HTTP ${outcome.status}`,
    };
  }

  const hay = outcome.body.toLowerCase();
  const inStockHit = (cfg.inStock ?? []).find((s) => hay.includes(s.toLowerCase()));
  const outHit = (cfg.outOfStock ?? []).find((s) => hay.includes(s.toLowerCase()));

  let status: CheckResult["status"] = "UNKNOWN";
  let rawSignal: string | null = null;

  if (inStockHit && outHit) {
    status = cfg.inStockWins ? "IN_STOCK" : "OUT_OF_STOCK";
    rawSignal = cfg.inStockWins ? inStockHit : outHit;
  } else if (inStockHit) {
    status = "IN_STOCK";
    rawSignal = inStockHit;
  } else if (outHit) {
    status = "OUT_OF_STOCK";
    rawSignal = outHit;
  }

  let price: number | null = null;
  if (cfg.priceRegex) {
    try {
      const m = outcome.body.match(new RegExp(cfg.priceRegex, "i"));
      price = parsePrice(m?.[1] ?? m?.[0]);
    } catch {
      /* ignore bad regex */
    }
  }

  return {
    status,
    price,
    currency: target.currency,
    rawSignal,
    httpStatus: outcome.status,
    responseMs: outcome.responseMs,
  };
}

// --- json-ld ----------------------------------------------------------------
// Parse schema.org Product/Offer JSON-LD blocks for availability + price.
const DEFAULT_INSTOCK_AVAIL = [
  "instock",
  "limitedavailability",
  "onlineonly",
  "preorder",
  "instoreonly",
];

async function jsonLd(target: TargetInput): Promise<CheckResult> {
  const cfg = target.config as JsonLdConfig;
  const outcome = await fetchText(target.url, cfg.headers);
  if (!outcome.ok) {
    return {
      status: outcome.status === 0 ? "ERROR" : "UNKNOWN",
      httpStatus: outcome.status,
      responseMs: outcome.responseMs,
      error: outcome.error ?? `HTTP ${outcome.status}`,
    };
  }

  const allowed = (cfg.inStockAvailability ?? DEFAULT_INSTOCK_AVAIL).map((s) =>
    s.toLowerCase(),
  );

  const blocks = [
    ...outcome.body.matchAll(
      /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
    ),
  ];

  let foundInStock = false;
  let sawOffer = false;
  let price: number | null = null;
  let currency: string | null = target.currency;
  let rawSignal: string | null = null;

  outer: for (const block of blocks) {
    const offers = extractOffers(block[1]);
    for (const offer of offers) {
      const avail = String(offer.availability ?? "")
        .toLowerCase()
        .replace(/^https?:\/\/schema\.org\//, "");
      if (!avail) continue;
      sawOffer = true;
      rawSignal = avail;
      if (offer.price != null) price = parsePrice(String(offer.price));
      if (offer.priceCurrency) currency = String(offer.priceCurrency);
      if (allowed.some((a) => avail.includes(a))) {
        foundInStock = true;
        break outer;
      }
    }
  }

  const status: CheckResult["status"] = foundInStock
    ? "IN_STOCK"
    : sawOffer
      ? "OUT_OF_STOCK"
      : "UNKNOWN";

  return {
    status,
    price,
    currency,
    rawSignal,
    httpStatus: outcome.status,
    responseMs: outcome.responseMs,
  };
}

interface OfferLike {
  availability?: unknown;
  price?: unknown;
  priceCurrency?: unknown;
}

function extractOffers(json: string): OfferLike[] {
  let data: unknown;
  try {
    data = JSON.parse(json.trim());
  } catch {
    return [];
  }
  const offers: OfferLike[] = [];
  const visit = (node: unknown) => {
    if (!node || typeof node !== "object") return;
    if (Array.isArray(node)) {
      node.forEach(visit);
      return;
    }
    const obj = node as Record<string, unknown>;
    if ("availability" in obj || ("price" in obj && "priceCurrency" in obj)) {
      offers.push(obj as OfferLike);
    }
    for (const v of Object.values(obj)) visit(v);
  };
  visit(data);
  return offers;
}

// --- apple-fulfillment ------------------------------------------------------
// Uses Apple's public fulfillment-messages endpoint, which returns delivery +
// pickup availability for a given part number. This is the most reliable
// signal for the official Apple stores. Requires a part number in config.
function appleStorefront(country: string, override?: string): string {
  if (override != null) return override; // "" means US
  switch (country.toUpperCase()) {
    case "US":
      return "";
    case "CZ":
      return "cz";
    case "DE":
      return "de";
    case "CH":
      return "ch-de"; // Swiss store defaults to the German-language front
    default:
      return "";
  }
}

async function appleFulfillment(target: TargetInput): Promise<CheckResult> {
  const cfg = target.config as AppleFulfillmentConfig;
  if (!cfg.partNumber) {
    return {
      status: "UNKNOWN",
      error: "apple-fulfillment requires config.partNumber",
    };
  }
  const sf = appleStorefront(target.country, cfg.storefront);
  const base = sf ? `https://www.apple.com/${sf}` : "https://www.apple.com";
  const params = new URLSearchParams({
    "pl": "true",
    "mts.0": "regular",
    "parts.0": cfg.partNumber,
  });
  if (cfg.postalCode) params.set("location", cfg.postalCode);
  const url = `${base}/shop/fulfillment-messages?${params.toString()}`;

  const outcome = await fetchText(url, { Accept: "application/json" });
  if (!outcome.ok) {
    return {
      status: outcome.status === 0 ? "ERROR" : "UNKNOWN",
      httpStatus: outcome.status,
      responseMs: outcome.responseMs,
      error: outcome.error ?? `HTTP ${outcome.status}`,
    };
  }

  try {
    const data = JSON.parse(outcome.body);
    const content = data?.body?.content ?? data?.content;
    const dm =
      content?.deliveryMessage?.[cfg.partNumber] ??
      content?.deliveryMessage;
    // deliveryOptionMessages / isBuyable signal online availability.
    const isBuyable =
      dm?.isBuyable === true ||
      dm?.commitCodeId === "1" /* in-stock commit code */;
    const deliveryText: string =
      dm?.regular?.deliveryOptionMessages?.[0]?.displayName ??
      dm?.deliveryOptions?.[0]?.displayName ??
      "";

    // Pickup availability across nearby stores.
    const pickup = content?.pickupMessage?.stores ?? [];
    const pickupAvailable = Array.isArray(pickup)
      ? pickup.some(
          (s: { partsAvailability?: Record<string, { pickupDisplay?: string }> }) =>
            s.partsAvailability?.[cfg.partNumber!]?.pickupDisplay === "available",
        )
      : false;

    const inStock = isBuyable || pickupAvailable;
    return {
      status: inStock ? "IN_STOCK" : "OUT_OF_STOCK",
      currency: target.currency,
      rawSignal:
        deliveryText ||
        (pickupAvailable ? "pickup:available" : "not buyable"),
      httpStatus: outcome.status,
      responseMs: outcome.responseMs,
    };
  } catch (err) {
    return {
      status: "UNKNOWN",
      httpStatus: outcome.status,
      responseMs: outcome.responseMs,
      error: err instanceof Error ? err.message : "parse error",
    };
  }
}

const STRATEGIES: Record<string, (t: TargetInput) => Promise<CheckResult>> = {
  "http-match": httpMatch,
  "json-ld": jsonLd,
  "apple-fulfillment": appleFulfillment,
};

export async function checkTarget(target: TargetInput): Promise<CheckResult> {
  const fn = STRATEGIES[target.strategy] ?? httpMatch;
  try {
    return await fn(target);
  } catch (err) {
    return {
      status: "ERROR",
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

export const __test = { parsePrice, extractOffers, httpMatch, jsonLd };
