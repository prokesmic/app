// Seeds the monitor catalog (product, trusted sellers, targets).
// Idempotent: re-running upserts by stable slugs / unique keys.
//
//   npx tsx scripts/seed-monitor.ts

import { prisma } from "@/lib/db";
import { PRODUCT, SELLERS, TARGETS } from "@/lib/monitor/catalog";

async function main() {
  const product = await prisma.product.upsert({
    where: { slug: PRODUCT.slug },
    update: { name: PRODUCT.name, specSummary: PRODUCT.specSummary, family: PRODUCT.family },
    create: PRODUCT,
  });
  console.log(`✓ product: ${product.name}`);

  const sellerIdBySlug = new Map<string, string>();
  for (const s of SELLERS) {
    const seller = await prisma.seller.upsert({
      where: { slug: s.slug },
      update: { name: s.name, country: s.country, website: s.website, trustTier: s.trustTier },
      create: s,
    });
    sellerIdBySlug.set(s.slug, seller.id);
  }
  console.log(`✓ sellers: ${SELLERS.length}`);

  let created = 0;
  let updated = 0;
  for (const t of TARGETS) {
    const sellerId = sellerIdBySlug.get(t.sellerSlug);
    if (!sellerId) {
      console.warn(`! skipping target with unknown seller: ${t.sellerSlug}`);
      continue;
    }
    const data = {
      productId: product.id,
      sellerId,
      label: t.label,
      country: t.country,
      currency: t.currency,
      strategy: t.strategy,
      config: JSON.stringify(t.config),
    };
    // One target per seller in this catalog — match on seller so a changed URL
    // updates the existing row instead of creating a duplicate.
    const existing = await prisma.monitorTarget.findFirst({
      where: { sellerId, productId: product.id },
    });
    if (existing) {
      await prisma.monitorTarget.update({ where: { id: existing.id }, data: { ...data, url: t.url } });
      updated += 1;
    } else {
      await prisma.monitorTarget.create({ data: { ...data, url: t.url } });
      created += 1;
    }
  }
  console.log(`✓ targets: ${created} created, ${updated} updated`);

  const needConfig = await prisma.monitorTarget.count({
    where: { strategy: "apple-fulfillment", config: { contains: '"partNumber":""' } },
  });
  if (needConfig > 0) {
    console.log(
      `\n⚠ ${needConfig} Apple target(s) still need a regional part number ` +
        `(config.partNumber). See MONITOR.md.`,
    );
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (err) => {
    console.error(err);
    await prisma.$disconnect();
    process.exit(1);
  });
