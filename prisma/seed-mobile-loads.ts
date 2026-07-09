import { PrismaClient } from "@prisma/client";
import { LOAD_CATALOG } from "../lib/mobile-load-catalog";

const prisma = new PrismaClient();

async function main() {
  for (const item of LOAD_CATALOG) {
    await prisma.product.upsert({
      where: { sku: item.sku },
      update: {
        name: item.label,
        price: item.amount,
        isActive: true,
      },
      create: {
        id: item.id,
        sku: item.sku,
        name: item.label,
        unit: "load",
        price: item.amount,
        cost: 0,
        stock: 0,
        isActive: true,
        usesGlobalMarkup: false,
      },
    });
  }

  console.log(`Seeded ${LOAD_CATALOG.length} mobile load products.`);
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
