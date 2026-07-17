-- CreateTable
CREATE TABLE "EWalletFeeSetting" (
    "id" TEXT NOT NULL,
    "tier1Max" DOUBLE PRECISION NOT NULL,
    "tier1Fee" DOUBLE PRECISION NOT NULL,
    "tier2Max" DOUBLE PRECISION NOT NULL,
    "tier2Fee" DOUBLE PRECISION NOT NULL,
    "tier3Fee" DOUBLE PRECISION NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EWalletFeeSetting_pkey" PRIMARY KEY ("id")
);
