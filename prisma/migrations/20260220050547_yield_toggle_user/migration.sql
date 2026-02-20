-- AlterTable
ALTER TABLE "User" ADD COLUMN     "yieldEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "yieldEnabledAt" TIMESTAMP(3);
