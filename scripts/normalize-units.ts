import { PrismaClient } from "@prisma/client";
import { normalizeUnit } from "@/lib/units";

const prisma = new PrismaClient();

async function normalizeUnitsInDatabase() {
  console.log("[Unit Migration] Starting unit normalization...");

  const products = await prisma.product.findMany({
    select: {
      id: true,
      sku: true,
      name: true,
      unit: true,
    },
  });

  const unitCounts = new Map<string, number>();
  const updateOps: Array<{
    id: string;
    oldUnit: string | null;
    newUnit: string;
  }> = [];

  for (const product of products) {
    const oldUnit = product.unit ?? "(none)";
    const normalized = normalizeUnit(product.unit);
    const newUnit = normalized.unit;

    // Track counts
    unitCounts.set(oldUnit, (unitCounts.get(oldUnit) ?? 0) + 1);

    // Only queue update if unit changed
    if (product.unit !== newUnit) {
      updateOps.push({
        id: product.id,
        oldUnit: product.unit,
        newUnit,
      });
    }
  }

  console.log("\n[Unit Migration] Current unit distribution:");
  Array.from(unitCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .forEach(([unit, count]) => {
      console.log(`  ${unit}: ${count}`);
    });

  if (updateOps.length === 0) {
    console.log(
      "\n[Unit Migration] No units need normalization. All products are already using standard units.",
    );
    return;
  }

  console.log(
    `\n[Unit Migration] Found ${updateOps.length} product(s) to normalize.`,
  );

  // Execute updates
  for (const op of updateOps) {
    await prisma.product.update({
      where: { id: op.id },
      data: { unit: op.newUnit },
    });
    console.log(`  ✓ ${op.id}: ${op.oldUnit} → ${op.newUnit}`);
  }

  console.log(
    `\n[Unit Migration] Completed! ${updateOps.length} product(s) updated.`,
  );
}

normalizeUnitsInDatabase()
  .catch((error) => {
    console.error("[Unit Migration] Error:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
