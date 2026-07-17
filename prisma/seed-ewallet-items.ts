import { PrismaClient } from "@prisma/client";
import { EWALLET_CATALOG } from "../lib/ewallet-catalog";

const prisma = new PrismaClient();

async function main() {
  for (const entry of EWALLET_CATALOG) {
    await prisma.product.upsert({
      where: { id: entry.id },
      update: { allowCustomPrice: true },
      create: {
        id: entry.id,
        sku: entry.id.toUpperCase(),
        name: entry.label,
        unit: "ewallet",
        price: 0,
        cost: 0,
        stock: 0,
        isActive: true,
        usesGlobalMarkup: false,
        allowCustomPrice: true,
      },
    });
  }

  console.log(`Seeded ${EWALLET_CATALOG.length} e-wallet items.`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
