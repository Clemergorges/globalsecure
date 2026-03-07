-- AlterTable
ALTER TABLE "treasury_limits" ADD COLUMN     "criticalThreshold" DECIMAL(12,2),
ADD COLUMN     "lastAlertAt" TIMESTAMP(3),
ADD COLUMN     "lastAlertLevel" TEXT;
