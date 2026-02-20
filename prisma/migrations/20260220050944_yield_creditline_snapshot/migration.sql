-- AlterTable
ALTER TABLE "user_credit_lines" ADD COLUMN     "collateralAmount" DECIMAL(24,8) NOT NULL DEFAULT 0,
ADD COLUMN     "collateralUpdatedAt" TIMESTAMP(3),
ADD COLUMN     "collateralValueUsd" DECIMAL(14,2) NOT NULL DEFAULT 0;
