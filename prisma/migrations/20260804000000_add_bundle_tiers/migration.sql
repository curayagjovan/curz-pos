-- CreateTable
CREATE TABLE "BundleTier" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,

    CONSTRAINT "BundleTier_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BundleTier_productId_quantity_key" ON "BundleTier"("productId", "quantity");

-- CreateIndex
CREATE INDEX "BundleTier_productId_idx" ON "BundleTier"("productId");

-- AddForeignKey
ALTER TABLE "BundleTier" ADD CONSTRAINT "BundleTier_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill: move each product's existing single bundle deal into a
-- BundleTier row before the source columns are dropped below. Ids are
-- generated here (rather than left to Prisma's cuid() default, which only
-- applies at the client layer) since this is a raw data migration.
INSERT INTO "BundleTier" ("id", "productId", "quantity", "price")
SELECT substr(md5(random()::text || clock_timestamp()::text || "id"), 1, 25),
       "id",
       "bundleQty",
       "bundlePrice"
FROM "Product"
WHERE "bundleQty" IS NOT NULL AND "bundlePrice" IS NOT NULL;

-- AlterTable
ALTER TABLE "Product" DROP COLUMN "bundleQty",
                       DROP COLUMN "bundleMarkdownPct",
                       DROP COLUMN "bundlePrice";
