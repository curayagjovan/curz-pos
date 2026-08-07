-- CreateTable
CREATE TABLE "ProductMovementSetting" (
    "id" TEXT NOT NULL,
    "visibleToCashiers" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductMovementSetting_pkey" PRIMARY KEY ("id")
);
