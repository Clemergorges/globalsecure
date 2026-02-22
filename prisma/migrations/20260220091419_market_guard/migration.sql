-- CreateTable
CREATE TABLE "market_guards" (
    "id" TEXT NOT NULL,
    "assetSymbol" TEXT NOT NULL,
    "lastPrice" DECIMAL(18,8),
    "lastPriceAt" TIMESTAMP(3),
    "hourAgoPrice" DECIMAL(18,8),
    "hourAgoPriceAt" TIMESTAMP(3),
    "isInAlert" BOOLEAN NOT NULL DEFAULT false,
    "isYieldPaused" BOOLEAN NOT NULL DEFAULT false,
    "lastAlertReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "market_guards_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "market_guards_assetSymbol_key" ON "market_guards"("assetSymbol");
