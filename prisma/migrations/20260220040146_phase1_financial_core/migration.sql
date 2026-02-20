-- CreateEnum
CREATE TYPE "CreditLineStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "YieldLiabilityStatus" AS ENUM ('PENDING_SETTLEMENT', 'SETTLED_READY', 'CANCELLED');

-- CreateEnum
CREATE TYPE "RebalanceJobStatus" AS ENUM ('PENDING', 'PROCESSED', 'FAILED');

-- CreateEnum
CREATE TYPE "UserConsentType" AS ENUM ('YIELD_TOGGLE_ON', 'YIELD_TOGGLE_OFF', 'YIELD_REBALANCE_BATCH');

-- CreateTable
CREATE TABLE "fiat_balances" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "currency" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fiat_balances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_credit_lines" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "collateralAsset" TEXT NOT NULL,
    "ltvCurrent" DECIMAL(10,6) NOT NULL DEFAULT 0,
    "ltvMax" DECIMAL(10,6) NOT NULL DEFAULT 0,
    "status" "CreditLineStatus" NOT NULL DEFAULT 'INACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_credit_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "yield_liabilities" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amountUsd" DECIMAL(12,2) NOT NULL,
    "status" "YieldLiabilityStatus" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "settledAt" TIMESTAMP(3),
    "batchId" TEXT,
    "authId" TEXT,

    CONSTRAINT "yield_liabilities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "treasury_limits" (
    "id" TEXT NOT NULL,
    "currency" TEXT NOT NULL,
    "minBalance" DECIMAL(12,2) NOT NULL,
    "alertThreshold" DECIMAL(12,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "treasury_limits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rebalance_jobs" (
    "id" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "status" "RebalanceJobStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),

    CONSTRAINT "rebalance_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_consents" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "UserConsentType" NOT NULL,
    "contextJson" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_consents_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "fiat_balances_userId_idx" ON "fiat_balances"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "fiat_balances_userId_currency_key" ON "fiat_balances"("userId", "currency");

-- CreateIndex
CREATE INDEX "user_credit_lines_userId_idx" ON "user_credit_lines"("userId");

-- CreateIndex
CREATE INDEX "yield_liabilities_userId_idx" ON "yield_liabilities"("userId");

-- CreateIndex
CREATE INDEX "yield_liabilities_status_idx" ON "yield_liabilities"("status");

-- CreateIndex
CREATE INDEX "yield_liabilities_createdAt_idx" ON "yield_liabilities"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "treasury_limits_currency_key" ON "treasury_limits"("currency");

-- CreateIndex
CREATE UNIQUE INDEX "rebalance_jobs_batchId_key" ON "rebalance_jobs"("batchId");

-- CreateIndex
CREATE INDEX "rebalance_jobs_status_idx" ON "rebalance_jobs"("status");

-- CreateIndex
CREATE INDEX "rebalance_jobs_createdAt_idx" ON "rebalance_jobs"("createdAt");

-- CreateIndex
CREATE INDEX "user_consents_userId_idx" ON "user_consents"("userId");

-- CreateIndex
CREATE INDEX "user_consents_type_idx" ON "user_consents"("type");

-- CreateIndex
CREATE INDEX "user_consents_createdAt_idx" ON "user_consents"("createdAt");

-- AddForeignKey
ALTER TABLE "fiat_balances" ADD CONSTRAINT "fiat_balances_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_credit_lines" ADD CONSTRAINT "user_credit_lines_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "yield_liabilities" ADD CONSTRAINT "yield_liabilities_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_consents" ADD CONSTRAINT "user_consents_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
