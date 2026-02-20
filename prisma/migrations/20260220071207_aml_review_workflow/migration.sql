-- CreateEnum
CREATE TYPE "AmlRiskLevel" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "AmlDecision" AS ENUM ('CLEAR', 'BLOCK');

-- AlterTable
ALTER TABLE "aml_review_queue" ADD COLUMN     "assignedToId" TEXT,
ADD COLUMN     "decidedAt" TIMESTAMP(3),
ADD COLUMN     "decidedById" TEXT,
ADD COLUMN     "decision" "AmlDecision",
ADD COLUMN     "decisionNote" TEXT,
ADD COLUMN     "riskLevel" "AmlRiskLevel" NOT NULL DEFAULT 'MEDIUM',
ADD COLUMN     "riskScore" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "slaDueAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "aml_review_notes" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "authorId" TEXT,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "aml_review_notes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "aml_review_notes_caseId_createdAt_idx" ON "aml_review_notes"("caseId", "createdAt");

-- CreateIndex
CREATE INDEX "aml_review_queue_riskLevel_status_createdAt_idx" ON "aml_review_queue"("riskLevel", "status", "createdAt");

-- CreateIndex
CREATE INDEX "aml_review_queue_assignedToId_status_createdAt_idx" ON "aml_review_queue"("assignedToId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "aml_review_queue_slaDueAt_idx" ON "aml_review_queue"("slaDueAt");

-- AddForeignKey
ALTER TABLE "aml_review_queue" ADD CONSTRAINT "aml_review_queue_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "aml_review_queue" ADD CONSTRAINT "aml_review_queue_decidedById_fkey" FOREIGN KEY ("decidedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "aml_review_notes" ADD CONSTRAINT "aml_review_notes_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "aml_review_queue"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "aml_review_notes" ADD CONSTRAINT "aml_review_notes_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
