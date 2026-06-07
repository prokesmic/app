// Seed catalog: the product we track + the trusted sellers / targets across
// CZ, US, DE and CH. This is consumed by scripts/seed-monitor.ts.
//
// TRUST POLICY (per the monitor's requirements):
//   - AUTHORIZED  : Apple Store + Apple Authorized Resellers only
//   - MARKETPLACE : reputable marketplaces, restricted to first-party stock
//                   (e.g. "sold & shipped by Amazon")
//
// CONFIGURATION NOTES
//   * Apple targets use the `apple-fulfillment` strategy and need the regional
//     part number for the BASE M3 Ultra config (28C CPU / 60C GPU / 96GB / 1TB).
//     Fill `config.partNumber` per region — see MONITOR.md for how to find it.
//   * Reseller targets use `http-match` with locale-specific in/out-of-stock
//     phrases. Replace `url` with the exact product page once known; the
//     dashboard flags any target still returning UNKNOWN.

export interface SellerSeed {
  slug: string;
  name: string;
  country: "CZ" | "US" | "DE" | "CH";
  website: string;
  trustTier: "AUTHORIZED" | "MARKETPLACE";
}

export interface TargetSeed {
  sellerSlug: string;
  label: string;
  url: string;
  country: "CZ" | "US" | "DE" | "CH";
  currency: "CZK" | "USD" | "EUR" | "CHF";
  strategy: "apple-fulfillment" | "json-ld" | "http-match";
  config: Record<string, unknown>;
}

export const PRODUCT = {
  slug: "mac-studio-m3-ultra-base",
  name: "Mac Studio (M3 Ultra)",
  specSummary:
    "M3 Ultra · 28-core CPU · 60-core GPU · 96GB unified memory · 1TB SSD (base config)",
  family: "Mac Studio (2025)",
};

// Locale-specific availability phrases reused across reseller targets.
const PHRASES = {
  CZ: {
    inStock: ["skladem", "do košíku", "koupit"],
    outOfStock: ["vyprodáno", "není skladem", "nedostupné", "momentálně nedostupné"],
  },
  DE: {
    inStock: ["in den warenkorb", "auf lager", "sofort lieferbar", "lieferbar"],
    outOfStock: [
      "nicht verfügbar",
      "ausverkauft",
      "derzeit nicht verfügbar",
      "nicht auf lager",
    ],
  },
  US: {
    inStock: ["add to cart", "in stock", "buy now"],
    outOfStock: ["out of stock", "sold out", "currently unavailable", "coming soon"],
  },
  CH: {
    inStock: ["in den warenkorb", "an lager", "sofort lieferbar", "lieferbar"],
    outOfStock: ["nicht verfügbar", "ausverkauft", "nicht an lager", "ausverkauft"],
  },
} as const;

export const SELLERS: SellerSeed[] = [
  // --- Czech Republic ---
  { slug: "apple-cz", name: "Apple Store CZ", country: "CZ", website: "https://www.apple.com/cz", trustTier: "AUTHORIZED" },
  { slug: "alza-cz", name: "Alza.cz", country: "CZ", website: "https://www.alza.cz", trustTier: "AUTHORIZED" },
  { slug: "czc-cz", name: "CZC.cz", country: "CZ", website: "https://www.czc.cz", trustTier: "AUTHORIZED" },
  { slug: "iwant-cz", name: "iWant (Apple Premium Reseller)", country: "CZ", website: "https://www.iwant.cz", trustTier: "AUTHORIZED" },
  { slug: "datart-cz", name: "Datart", country: "CZ", website: "https://www.datart.cz", trustTier: "AUTHORIZED" },

  // --- United States ---
  { slug: "apple-us", name: "Apple Store US", country: "US", website: "https://www.apple.com", trustTier: "AUTHORIZED" },
  { slug: "bhphoto-us", name: "B&H Photo Video", country: "US", website: "https://www.bhphotovideo.com", trustTier: "AUTHORIZED" },
  { slug: "adorama-us", name: "Adorama", country: "US", website: "https://www.adorama.com", trustTier: "AUTHORIZED" },
  { slug: "bestbuy-us", name: "Best Buy", country: "US", website: "https://www.bestbuy.com", trustTier: "AUTHORIZED" },
  { slug: "amazon-us", name: "Amazon US (sold by Amazon)", country: "US", website: "https://www.amazon.com", trustTier: "MARKETPLACE" },

  // --- Germany ---
  { slug: "apple-de", name: "Apple Store DE", country: "DE", website: "https://www.apple.com/de", trustTier: "AUTHORIZED" },
  { slug: "mediamarkt-de", name: "MediaMarkt", country: "DE", website: "https://www.mediamarkt.de", trustTier: "AUTHORIZED" },
  { slug: "cyberport-de", name: "Cyberport", country: "DE", website: "https://www.cyberport.de", trustTier: "AUTHORIZED" },
  { slug: "gravis-de", name: "Gravis (Apple Premium Reseller)", country: "DE", website: "https://www.gravis.de", trustTier: "AUTHORIZED" },
  { slug: "amazon-de", name: "Amazon DE (sold by Amazon)", country: "DE", website: "https://www.amazon.de", trustTier: "MARKETPLACE" },

  // --- Switzerland ---
  { slug: "apple-ch", name: "Apple Store CH", country: "CH", website: "https://www.apple.com/ch-de", trustTier: "AUTHORIZED" },
  { slug: "digitec-ch", name: "Digitec", country: "CH", website: "https://www.digitec.ch", trustTier: "AUTHORIZED" },
  { slug: "microspot-ch", name: "microspot", country: "CH", website: "https://www.microspot.ch", trustTier: "AUTHORIZED" },
  { slug: "interdiscount-ch", name: "Interdiscount", country: "CH", website: "https://www.interdiscount.ch", trustTier: "AUTHORIZED" },
];

export const TARGETS: TargetSeed[] = [
  // ---------------- Apple official stores (apple-fulfillment) ----------------
  // partNumber must be the regional BASE M3 Ultra part number — fill per MONITOR.md.
  {
    sellerSlug: "apple-cz",
    label: "Apple CZ — Mac Studio M3 Ultra (base)",
    url: "https://www.apple.com/cz/shop/buy-mac/mac-studio/apple-m3-ultra-s-28jádrovým-cpu-60jádrovým-gpu-96gb-1tb",
    country: "CZ",
    currency: "CZK",
    strategy: "apple-fulfillment",
    config: { partNumber: "", postalCode: "11000" }, // TODO: regional part number
  },
  {
    sellerSlug: "apple-us",
    label: "Apple US — Mac Studio M3 Ultra (base)",
    url: "https://www.apple.com/shop/buy-mac/mac-studio/apple-m3-ultra-with-28-core-cpu-60-core-gpu-96gb-1tb",
    country: "US",
    currency: "USD",
    strategy: "apple-fulfillment",
    config: { partNumber: "", postalCode: "10001" },
  },
  {
    sellerSlug: "apple-de",
    label: "Apple DE — Mac Studio M3 Ultra (base)",
    url: "https://www.apple.com/de/shop/buy-mac/mac-studio/apple-m3-ultra-mit-28-core-cpu-60-core-gpu-96gb-1tb",
    country: "DE",
    currency: "EUR",
    strategy: "apple-fulfillment",
    config: { partNumber: "", postalCode: "10115" },
  },
  {
    sellerSlug: "apple-ch",
    label: "Apple CH — Mac Studio M3 Ultra (base)",
    url: "https://www.apple.com/ch-de/shop/buy-mac/mac-studio/apple-m3-ultra-mit-28-core-cpu-60-core-gpu-96gb-1tb",
    country: "CH",
    currency: "CHF",
    strategy: "apple-fulfillment",
    config: { partNumber: "", postalCode: "8001" },
  },

  // ---------------- CZ resellers (http-match) ----------------
  {
    sellerSlug: "alza-cz",
    label: "Alza.cz — Mac Studio M3 Ultra",
    url: "https://www.alza.cz/apple-mac-studio-m3-ultra",
    country: "CZ",
    currency: "CZK",
    strategy: "http-match",
    config: { ...PHRASES.CZ, searchPage: true, priceRegex: '"price"\\s*:\\s*"?([\\d.,\\s]+)"?' },
  },
  {
    sellerSlug: "czc-cz",
    label: "CZC.cz — Mac Studio M3 Ultra",
    url: "https://www.czc.cz/apple-mac-studio-m3-ultra/produkt",
    country: "CZ",
    currency: "CZK",
    strategy: "http-match",
    config: { ...PHRASES.CZ, searchPage: true },
  },
  {
    sellerSlug: "iwant-cz",
    label: "iWant — Mac Studio M3 Ultra",
    url: "https://www.iwant.cz/mac-studio",
    country: "CZ",
    currency: "CZK",
    strategy: "http-match",
    config: { ...PHRASES.CZ, searchPage: true },
  },
  {
    sellerSlug: "datart-cz",
    label: "Datart — Mac Studio M3 Ultra",
    url: "https://www.datart.cz/mac-studio.html",
    country: "CZ",
    currency: "CZK",
    strategy: "http-match",
    config: { ...PHRASES.CZ, searchPage: true },
  },

  // ---------------- US resellers (http-match / json-ld) ----------------
  {
    sellerSlug: "bhphoto-us",
    label: "B&H — Mac Studio M3 Ultra",
    url: "https://www.bhphotovideo.com/c/search?q=mac%20studio%20m3%20ultra",
    country: "US",
    currency: "USD",
    strategy: "http-match",
    config: { ...PHRASES.US, searchPage: true },
  },
  {
    sellerSlug: "adorama-us",
    label: "Adorama — Mac Studio M3 Ultra",
    url: "https://www.adorama.com/l/?searchinfo=mac%20studio%20m3%20ultra",
    country: "US",
    currency: "USD",
    strategy: "http-match",
    config: { ...PHRASES.US, searchPage: true },
  },
  {
    sellerSlug: "bestbuy-us",
    label: "Best Buy — Mac Studio M3 Ultra",
    url: "https://www.bestbuy.com/site/searchpage.jsp?st=mac+studio+m3+ultra",
    country: "US",
    currency: "USD",
    strategy: "http-match",
    config: { ...PHRASES.US, searchPage: true },
  },
  {
    sellerSlug: "amazon-us",
    label: "Amazon US — Mac Studio M3 Ultra (sold by Amazon)",
    url: "https://www.amazon.com/s?k=mac+studio+m3+ultra",
    country: "US",
    currency: "USD",
    strategy: "http-match",
    config: {
      searchPage: true, // replace url with the ASIN product page (sold by Amazon) to enable
      inStock: ["add to cart"],
      // Amazon: require first-party sold-by-Amazon to honour the trust policy.
      outOfStock: ["currently unavailable", "out of stock", "see all buying options"],
    },
  },

  // ---------------- DE resellers (http-match) ----------------
  {
    sellerSlug: "mediamarkt-de",
    label: "MediaMarkt — Mac Studio M3 Ultra",
    url: "https://www.mediamarkt.de/de/search.html?query=mac%20studio%20m3%20ultra",
    country: "DE",
    currency: "EUR",
    strategy: "http-match",
    config: { ...PHRASES.DE, searchPage: true },
  },
  {
    sellerSlug: "cyberport-de",
    label: "Cyberport — Mac Studio M3 Ultra",
    url: "https://www.cyberport.de/?DEEP=mac-studio-m3-ultra&APID=2",
    country: "DE",
    currency: "EUR",
    strategy: "http-match",
    config: { ...PHRASES.DE, searchPage: true },
  },
  {
    sellerSlug: "gravis-de",
    label: "Gravis — Mac Studio M3 Ultra",
    url: "https://www.gravis.de/Mac/Mac-Studio/",
    country: "DE",
    currency: "EUR",
    strategy: "http-match",
    config: { ...PHRASES.DE, searchPage: true },
  },
  {
    sellerSlug: "amazon-de",
    label: "Amazon DE — Mac Studio M3 Ultra (sold by Amazon)",
    url: "https://www.amazon.de/s?k=mac+studio+m3+ultra",
    country: "DE",
    currency: "EUR",
    strategy: "http-match",
    config: {
      searchPage: true, // replace url with the ASIN product page (sold by Amazon) to enable
      inStock: ["in den einkaufswagen", "in den warenkorb"],
      outOfStock: ["derzeit nicht verfügbar", "nicht verfügbar", "alle kaufoptionen"],
    },
  },

  // ---------------- CH resellers (http-match) ----------------
  {
    sellerSlug: "digitec-ch",
    label: "Digitec — Mac Studio M3 Ultra",
    url: "https://www.digitec.ch/de/search?q=mac%20studio%20m3%20ultra",
    country: "CH",
    currency: "CHF",
    strategy: "http-match",
    config: { ...PHRASES.CH, searchPage: true },
  },
  {
    sellerSlug: "microspot-ch",
    label: "microspot — Mac Studio M3 Ultra",
    url: "https://www.microspot.ch/de/search?q=mac+studio+m3+ultra",
    country: "CH",
    currency: "CHF",
    strategy: "http-match",
    config: { ...PHRASES.CH, searchPage: true },
  },
  {
    sellerSlug: "interdiscount-ch",
    label: "Interdiscount — Mac Studio M3 Ultra",
    url: "https://www.interdiscount.ch/de/search?q=mac+studio+m3+ultra",
    country: "CH",
    currency: "CHF",
    strategy: "http-match",
    config: { ...PHRASES.CH, searchPage: true },
  },
];
