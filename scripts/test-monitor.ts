// Offline unit checks for the detection strategies. Mocks global.fetch so the
// matching logic can be verified without hitting any real seller.
//
//   npx tsx scripts/test-monitor.ts

import { checkTarget } from "@/lib/monitor/strategies";
import { __test } from "@/lib/monitor/strategies";
import type { TargetInput } from "@/lib/monitor/types";

let pass = 0;
let fail = 0;
function assert(name: string, cond: boolean) {
  if (cond) {
    pass += 1;
    console.log(`  ✓ ${name}`);
  } else {
    fail += 1;
    console.error(`  ✗ ${name}`);
  }
}

function mockFetch(body: string, init: { status?: number; json?: boolean } = {}) {
  const status = init.status ?? 200;
  global.fetch = (async () =>
    ({
      ok: status >= 200 && status < 300,
      status,
      text: async () => body,
      json: async () => JSON.parse(body),
    }) as unknown as Response) as typeof fetch;
}

async function run() {
  console.log("parsePrice");
  assert("1.234,56 -> 1234.56", __test.parsePrice("1.234,56 Kč") === 1234.56);
  assert("1,234.56 -> 1234.56", __test.parsePrice("$1,234.56") === 1234.56);
  assert("CHF 5 999 -> 5999", __test.parsePrice("CHF 5 999.–") === 5999);
  assert("empty -> null", __test.parsePrice("") === null);

  console.log("http-match");
  const t: TargetInput = {
    id: "1", label: "x", url: "https://e.example", country: "CZ", currency: "CZK",
    strategy: "http-match",
    config: { inStock: ["skladem", "do košíku"], outOfStock: ["vyprodáno"] },
  };
  mockFetch("<html>Produkt SKLADEM, přidat do košíku</html>");
  assert("detects in stock", (await checkTarget(t)).status === "IN_STOCK");
  mockFetch("<html>Bohužel VYPRODÁNO</html>");
  assert("detects out of stock", (await checkTarget(t)).status === "OUT_OF_STOCK");
  mockFetch("<html>nothing relevant here</html>");
  assert("unknown when no markers", (await checkTarget(t)).status === "UNKNOWN");
  mockFetch("err", { status: 503 });
  assert("non-200 -> not in stock", (await checkTarget(t)).status !== "IN_STOCK");

  // out-of-stock wins by default when both present (conservative)
  mockFetch("<html>do košíku ... vyprodáno</html>");
  assert("conservative when conflicting", (await checkTarget(t)).status === "OUT_OF_STOCK");

  console.log("json-ld");
  const j: TargetInput = { ...t, strategy: "json-ld", config: {} };
  mockFetch(
    `<script type="application/ld+json">{"@type":"Product","offers":{"@type":"Offer","price":"5999","priceCurrency":"CHF","availability":"https://schema.org/InStock"}}</script>`,
  );
  const jr = await checkTarget(j);
  assert("json-ld in stock", jr.status === "IN_STOCK");
  assert("json-ld price", jr.price === 5999);
  mockFetch(
    `<script type="application/ld+json">{"offers":{"availability":"OutOfStock"}}</script>`,
  );
  assert("json-ld out of stock", (await checkTarget(j)).status === "OUT_OF_STOCK");

  console.log("apple-fulfillment");
  const a: TargetInput = { ...t, strategy: "apple-fulfillment", country: "US", currency: "USD", config: { partNumber: "MU963LL/A" } };
  mockFetch(
    JSON.stringify({
      body: {
        content: {
          deliveryMessage: { "MU963LL/A": { isBuyable: true, regular: { deliveryOptionMessages: [{ displayName: "Delivers Tomorrow" }] } } },
          pickupMessage: { stores: [] },
        },
      },
    }),
  );
  assert("apple in stock (buyable)", (await checkTarget(a)).status === "IN_STOCK");
  mockFetch(JSON.stringify({ body: { content: { deliveryMessage: { "MU963LL/A": { isBuyable: false } }, pickupMessage: { stores: [] } } } }));
  assert("apple out of stock", (await checkTarget(a)).status === "OUT_OF_STOCK");
  const aNoPart: TargetInput = { ...a, config: {} };
  assert("apple needs part number", (await checkTarget(aNoPart)).status === "UNKNOWN");

  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail === 0 ? 0 : 1);
}

run();
