import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const email = process.env.OWNER_EMAIL?.trim().toLowerCase();

  if (!email) {
    throw new Error("Set OWNER_EMAIL in your environment before seeding.");
  }

  const owner = await prisma.appUser.upsert({
    where: { email },
    update: { role: "OWNER", isActive: true },
    create: { email, role: "OWNER", isActive: true },
  });

  console.log(`Owner account ready: ${owner.email}`);
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
