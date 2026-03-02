-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('END_USER', 'COMPLIANCE', 'TREASURY', 'ADMIN');

-- AlterTable
ALTER TABLE "Session" ADD COLUMN     "revokedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "role" "UserRole" NOT NULL DEFAULT 'END_USER';
