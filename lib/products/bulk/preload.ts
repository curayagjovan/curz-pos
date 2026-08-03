import type { PrismaClient } from "@prisma/client";
import { generateSmartSku } from "@/lib/sku-generator";
import type { BulkProductData, ProductSnapshot } from "@/lib/products/bulk/types";
import { toNameUnitKey } from "@/lib/products/bulk/helpers";

export type BulkImportPreload = {
  existingProductBySku: Map<string, ProductSnapshot>;
  existingProductByNameUnit: Map<string, ProductSnapshot>;
  reservedSkus: Set<string>;
};

// Batches every lookup the per-row planner will need (by exact SKU, by
// case-insensitive name for unit-based matching, and by SKU suffix variants
// like "-02" for collision detection) into a handful of queries up front, so
// the row-by-row planning loop that follows never has to hit the DB itself.
export async function preloadExistingProducts(
  prisma: PrismaClient,
  products: BulkProductData[],
): Promise<BulkImportPreload> {
  const rawSkusToLookup = new Set<string>();
  const nameUnitKeysToLookup = new Set<string>();
  const namesToLookup = new Set<string>();

  for (const item of products) {
    const rawSku = item.sku?.toString().trim();
    const name = item.name?.toString().trim();
    const unit = item.unit?.toString().trim();

    if (rawSku) {
      rawSkusToLookup.add(rawSku);
    }

    if (name) {
      namesToLookup.add(name);
      if (!rawSku) {
        nameUnitKeysToLookup.add(toNameUnitKey(name, unit));

        try {
          rawSkusToLookup.add(generateSmartSku(name, item.price));
        } catch {
          // Validation for SKU generation is handled per-row below.
        }
      }
    }
  }

  const productSelect = {
    id: true,
    sku: true,
    name: true,
    unit: true,
    description: true,
    cost: true,
    markupPct: true,
    price: true,
    stock: true,
  } as const;

  const [existingBySkuList, existingByNameCandidates] = await Promise.all([
    rawSkusToLookup.size > 0
      ? prisma.product.findMany({
          where: {
            sku: { in: Array.from(rawSkusToLookup) },
          },
          select: productSelect,
        })
      : Promise.resolve([] as ProductSnapshot[]),
    namesToLookup.size > 0
      ? prisma.product.findMany({
          where: {
            OR: Array.from(namesToLookup).map((name) => ({
              name: { equals: name, mode: "insensitive" },
            })),
          },
          select: productSelect,
        })
      : Promise.resolve([] as ProductSnapshot[]),
  ]);

  const existingProductBySku = new Map<string, ProductSnapshot>();
  const existingProductByNameUnit = new Map<string, ProductSnapshot>();
  const reservedSkus = new Set<string>();

  for (const product of [...existingBySkuList, ...existingByNameCandidates]) {
    existingProductBySku.set(product.sku, product);
    reservedSkus.add(product.sku);

    const nameUnitKey = toNameUnitKey(product.name, product.unit);
    if (nameUnitKeysToLookup.has(nameUnitKey)) {
      existingProductByNameUnit.set(nameUnitKey, product);
    }
  }

  // Preload all suffix variants (e.g. SKU-02, SKU-03) to avoid per-row DB
  // calls for collision detection.
  if (rawSkusToLookup.size > 0) {
    const suffixVariants = await prisma.product.findMany({
      where: {
        OR: Array.from(rawSkusToLookup).map((sku) => ({
          sku: { startsWith: `${sku}-` },
        })),
      },
      select: { sku: true },
    });
    for (const row of suffixVariants) {
      reservedSkus.add(row.sku);
    }
  }

  return { existingProductBySku, existingProductByNameUnit, reservedSkus };
}
