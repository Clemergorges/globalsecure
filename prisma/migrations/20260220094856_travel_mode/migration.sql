-- AlterTable
ALTER TABLE "User" ADD COLUMN     "travelModeEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "travelRegion" TEXT;
