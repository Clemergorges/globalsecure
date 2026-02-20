-- CreateTable
CREATE TABLE "fx_rates" (
    "id" TEXT NOT NULL,
    "baseCurrency" TEXT NOT NULL,
    "quoteCurrency" TEXT NOT NULL,
    "rate" DECIMAL(12,6) NOT NULL,
    "spreadBps" INTEGER NOT NULL DEFAULT 0,
    "source" TEXT NOT NULL,
    "fetchedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fx_rates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "fx_rates_baseCurrency_idx" ON "fx_rates"("baseCurrency");

-- CreateIndex
CREATE INDEX "fx_rates_quoteCurrency_idx" ON "fx_rates"("quoteCurrency");

-- CreateIndex
CREATE UNIQUE INDEX "fx_rates_baseCurrency_quoteCurrency_key" ON "fx_rates"("baseCurrency", "quoteCurrency");
