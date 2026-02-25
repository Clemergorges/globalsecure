CREATE TABLE "treasury_snapshots" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "accountRef" TEXT,
    "currency" TEXT NOT NULL,
    "balance" DECIMAL(12,2) NOT NULL,
    "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB,
    CONSTRAINT "treasury_snapshots_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "treasury_snapshots_provider_currency_capturedAt_idx" ON "treasury_snapshots"("provider", "currency", "capturedAt");
CREATE INDEX "treasury_snapshots_capturedAt_idx" ON "treasury_snapshots"("capturedAt");

