import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  await prisma.product.createMany({
    data: [
      { sku: "ESP-001", name: "Espresso", price: 3.25, stock: 40 },
      { sku: "LAT-001", name: "Cafe Latte", price: 4.5, stock: 32 },
      { sku: "CRS-002", name: "Butter Croissant", price: 2.9, stock: 25 },
      { sku: "SND-011", name: "Chicken Sandwich", price: 6.5, stock: 15 },
      { sku: "TEA-003", name: "Iced Tea", price: 2.25, stock: 22 },
    ],
    skipDuplicates: true,
  });
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
