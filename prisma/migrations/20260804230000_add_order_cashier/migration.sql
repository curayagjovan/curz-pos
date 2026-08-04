-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "cashierId" TEXT;

-- CreateIndex
CREATE INDEX "Order_cashierId_idx" ON "Order"("cashierId");

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_cashierId_fkey" FOREIGN KEY ("cashierId") REFERENCES "AppUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;
