// Shared types for the Mac Studio M3 Ultra availability monitor.

export type StockStatus = "IN_STOCK" | "OUT_OF_STOCK" | "UNKNOWN" | "ERROR";

export type StrategyName = "apple-fulfillment" | "json-ld" | "http-match";

// The normalised result every strategy returns for a single target check.
export interface CheckResult {
  status: StockStatus;
  price?: number | null;
  currency?: string | null;
  rawSignal?: string | null;
  httpStatus?: number | null;
  responseMs?: number | null;
  error?: string | null;
}

// Minimal shape of a target the strategies need (decoupled from Prisma types
// so the strategies stay unit-testable without a database).
export interface TargetInput {
  id: string;
  label: string;
  url: string;
  country: string;
  currency: string;
  strategy: string;
  // Parsed JSON config (see strategy-specific shapes below).
  config: Record<string, unknown>;
}

// --- Strategy config shapes -------------------------------------------------

export interface HttpMatchConfig {
  // When the URL is a search/category listing rather than a single product
  // page, generic markers like "add to cart" are meaningless (they belong to
  // other products on the page). Such targets always report UNKNOWN and are
  // flagged "needs product URL" on the dashboard so they never false-alert.
  searchPage?: boolean;
  // If ANY of these (case-insensitive) match the page body => IN_STOCK.
  inStock?: string[];
  // If ANY of these match => OUT_OF_STOCK. Evaluated before inStock by default
  // unless `inStockWins` is set.
  outOfStock?: string[];
  // When both kinds match, treat as in stock (some pages keep an "out of stock"
  // string in hidden markup). Default false.
  inStockWins?: boolean;
  // Optional regex (with one capture group) to extract a price.
  priceRegex?: string;
  // Extra request headers.
  headers?: Record<string, string>;
}

export interface JsonLdConfig {
  // schema.org availability values that count as in stock.
  // Defaults to InStock / LimitedAvailability / PreOrder / OnlineOnly.
  inStockAvailability?: string[];
  headers?: Record<string, string>;
}

export interface AppleFulfillmentConfig {
  // Apple part number, e.g. "MU963" + region suffix. Required for this strategy.
  partNumber?: string;
  // Apple store-front country code used in the URL path, e.g. "" (US), "cz",
  // "de", "ch-de". Defaults derived from target.country.
  storefront?: string;
  // Postal code used to query delivery/pickup availability.
  postalCode?: string;
}
