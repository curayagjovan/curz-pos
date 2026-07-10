-- CreateTable
CREATE TABLE "LoadMarkupSetting" (
    "id" TEXT NOT NULL,
    "tier1Max" DOUBLE PRECISION NOT NULL,
    "tier1Markup" DOUBLE PRECISION NOT NULL,
    "tier2Max" DOUBLE PRECISION NOT NULL,
    "tier2Markup" DOUBLE PRECISION NOT NULL,
    "tier3Markup" DOUBLE PRECISION NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LoadMarkupSetting_pkey" PRIMARY KEY ("id")
);
