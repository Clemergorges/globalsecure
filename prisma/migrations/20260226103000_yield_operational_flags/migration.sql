-- AlterTable
ALTER TABLE "User" ADD COLUMN     "cryptoWithdrawVelocityFlag" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN     "cryptoWithdrawVelocityFlagAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Transfer" ADD COLUMN     "yieldReconcileStatus" TEXT NOT NULL DEFAULT 'OK';
ALTER TABLE "Transfer" ADD COLUMN     "yieldReconcilePendingAt" TIMESTAMP(3);
ALTER TABLE "Transfer" ADD COLUMN     "yieldLastReconciledAt" TIMESTAMP(3);
ALTER TABLE "Transfer" ADD COLUMN     "yieldInternalValueUsd" DECIMAL(18,2);
ALTER TABLE "Transfer" ADD COLUMN     "yieldExternalValueUsd" DECIMAL(18,2);

-- CreateTable
CREATE TABLE "operational_flags" (
    "key" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "reason" TEXT,
    "metadata" JSONB,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "operational_flags_pkey" PRIMARY KEY ("key")
);
