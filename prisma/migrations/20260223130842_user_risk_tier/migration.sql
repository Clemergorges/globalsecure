-- CreateEnum
CREATE TYPE "UserRiskTier" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "kycCompletedAt" TIMESTAMP(3),
ADD COLUMN     "riskScore" INTEGER,
ADD COLUMN     "riskTier" "UserRiskTier" NOT NULL DEFAULT 'LOW';
