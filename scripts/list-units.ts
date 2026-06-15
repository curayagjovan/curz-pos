import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const rows = await prisma.product.groupBy({
    by: ["unit"],
    _count: { _all: true },
    orderBy: { _count: { unit: "desc" } },
  });

  console.log("\nUnit".padEnd(24) + "Count");
  console.log("-".repeat(32));
  for (const r of rows) {
    console.log((r.unit ?? "(null)").padEnd(24) + r._count._all);
  }
  console.log(`\nTotal distinct units: ${rows.length}`);
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
