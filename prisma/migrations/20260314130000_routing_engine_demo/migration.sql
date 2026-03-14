-- CreateEnum
CREATE TYPE "RoutingRail" AS ENUM ('FIAT_STUB', 'CRYPTO_POLYGON', 'LEDGER_INTERNAL');

-- CreateTable
CREATE TABLE "routing_decisions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "transferId" TEXT,
    "originCountry" TEXT,
    "destinationCountry" TEXT,
    "amount" DECIMAL(12,2) NOT NULL,
    "currencySource" TEXT NOT NULL,
    "currencyTarget" TEXT NOT NULL,
    "rail" "RoutingRail" NOT NULL,
    "estimatedFeePct" DECIMAL(6,3) NOT NULL,
    "estimatedFeeAmount" DECIMAL(18,6) NOT NULL,
    "estimatedTimeSec" INTEGER NOT NULL,
    "explanation" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "routing_decisions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "routing_decisions_userId_createdAt_idx" ON "routing_decisions"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "routing_decisions_transferId_idx" ON "routing_decisions"("transferId");

-- AddForeignKey
ALTER TABLE "routing_decisions" ADD CONSTRAINT "routing_decisions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "routing_decisions" ADD CONSTRAINT "routing_decisions_transferId_fkey" FOREIGN KEY ("transferId") REFERENCES "Transfer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

