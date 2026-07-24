import { PrismaClient, ProductCategory } from "@prisma/client";
import { PRODUCT_CATEGORY_MAP_BY_NAME } from "./data/product-category-map";

const prisma = new PrismaClient();

function normalizeNameKey(name: string) {
  return name
    .trim()
    .toLowerCase()
    .replace(/[‘’ʼʻ]/g, "'");
}

function resolveCategory(product: {
  sku: string;
  name: string;
  unit: string | null;
}): ProductCategory | null {
  if (product.sku.startsWith("LOAD-") || product.sku.startsWith("PROMO-")) {
    return ProductCategory.LOAD_AND_PROMO;
  }
  if (product.unit === "ewallet") {
    return ProductCategory.LOAD_AND_PROMO;
  }

  const mapped = PRODUCT_CATEGORY_MAP_BY_NAME[normalizeNameKey(product.name)];
  return mapped ? (mapped as ProductCategory) : null;
}

async function main() {
  console.log("[Category Backfill] Starting...");

  const products = await prisma.product.findMany({
    select: { id: true, sku: true, name: true, unit: true },
  });

  const idsByCategory = new Map<ProductCategory, string[]>();
  const unmatched: Array<{ id: string; sku: string; name: string }> = [];

  for (const product of products) {
    const category = resolveCategory(product);
    if (!category) {
      unmatched.push(product);
      continue;
    }
    idsByCategory.set(category, [
      ...(idsByCategory.get(category) ?? []),
      product.id,
    ]);
  }

  for (const [category, ids] of idsByCategory) {
    const { count } = await prisma.product.updateMany({
      where: { id: { in: ids } },
      data: { category },
    });
    console.log(`[Category Backfill] ${category}: ${count} updated`);
  }

  if (unmatched.length > 0) {
    console.warn(
      `\n[Category Backfill] ${unmatched.length} product(s) left as OTHER (no rule/name match) — review and add to scripts/data/product-category-map.ts:`,
    );
    for (const p of unmatched) {
      console.warn(`  - ${p.sku} | ${p.name}`);
    }
  } else {
    console.log("\n[Category Backfill] All products matched a category.");
  }
}

main()
  .catch((error) => {
    console.error("[Category Backfill] Error:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
