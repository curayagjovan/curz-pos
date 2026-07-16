import { PrismaClient } from "@prisma/client";
import { LOAD_CATALOG } from "../lib/mobile-load-catalog";

const prisma = new PrismaClient();

function buildSku(prefix: string, brand: string, code: string) {
  return `${prefix}-${brand}-${code}`.toUpperCase();
}

async function main() {
  let created = 0;

  for (const item of LOAD_CATALOG) {
    const prefix = item.category === "Data Promo" ? "PROMO" : "LOAD";
    const sku = buildSku(prefix, item.brand, item.code);

    const existing = await prisma.loadItem.findUnique({ where: { sku } });
    if (existing) {
      continue;
    }

    const loadItem = await prisma.loadItem.create({
      data: {
        sku,
        brand: item.brand as never,
        group: item.group as never,
        category:
          item.category === "Data Promo"
            ? ("DATA_PROMO" as never)
            : ("REGULAR_LOAD" as never),
        code: item.code,
        amount: item.amount,
        label: item.label,
        description: item.description ?? null,
      },
    });

    await prisma.product.upsert({
      where: { id: loadItem.id },
      update: {},
      create: {
        id: loadItem.id,
        sku,
        name: item.label,
        unit: "load",
        price: item.amount,
        cost: 0,
        stock: 0,
        isActive: true,
        usesGlobalMarkup: false,
      },
    });

    created += 1;
  }

  console.log(`Seeded ${created} load items (of ${LOAD_CATALOG.length} catalog entries).`);
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
