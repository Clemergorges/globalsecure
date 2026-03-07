-- CreateEnum
CREATE TYPE "AmlReviewStatus" AS ENUM ('PENDING', 'IN_REVIEW', 'BLOCKED', 'CLEARED');

-- AlterEnum
ALTER TYPE "UserConsentType" ADD VALUE 'YIELD_AML_BLOCK';

-- DropIndex
DROP INDEX "user_credit_lines_userId_idx";

-- CreateTable
CREATE TABLE "aml_review_queue" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "contextJson" JSONB NOT NULL,
    "status" "AmlReviewStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "aml_review_queue_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "aml_review_queue_userId_idx" ON "aml_review_queue"("userId");

-- CreateIndex
CREATE INDEX "aml_review_queue_status_idx" ON "aml_review_queue"("status");

-- CreateIndex
CREATE INDEX "aml_review_queue_createdAt_idx" ON "aml_review_queue"("createdAt");

-- AddForeignKey
ALTER TABLE "aml_review_queue" ADD CONSTRAINT "aml_review_queue_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
