-- CreateEnum
CREATE TYPE "ClaimLinkEventType" AS ENUM ('VIEW', 'UNLOCK_CODE_FAILED', 'UNLOCK_CODE_OK', 'STEPUP_OTP_SENT', 'STEPUP_OTP_FAILED', 'STEPUP_OTP_VERIFIED', 'REVEAL_SUCCESS');

-- CreateTable
CREATE TABLE "ClaimLinkEvent" (
    "id" TEXT NOT NULL,
    "claimLinkId" TEXT NOT NULL,
    "type" "ClaimLinkEventType" NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClaimLinkEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClaimOtpChallenge" (
    "id" TEXT NOT NULL,
    "claimLinkId" TEXT NOT NULL,
    "recipientEmail" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClaimOtpChallenge_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ClaimLinkEvent_claimLinkId_createdAt_idx" ON "ClaimLinkEvent"("claimLinkId", "createdAt");

-- CreateIndex
CREATE INDEX "ClaimLinkEvent_type_createdAt_idx" ON "ClaimLinkEvent"("type", "createdAt");

-- CreateIndex
CREATE INDEX "ClaimOtpChallenge_claimLinkId_createdAt_idx" ON "ClaimOtpChallenge"("claimLinkId", "createdAt");

-- CreateIndex
CREATE INDEX "ClaimOtpChallenge_expiresAt_idx" ON "ClaimOtpChallenge"("expiresAt");

-- CreateIndex
CREATE INDEX "ClaimOtpChallenge_recipientEmail_createdAt_idx" ON "ClaimOtpChallenge"("recipientEmail", "createdAt");

-- AddForeignKey
ALTER TABLE "ClaimLinkEvent" ADD CONSTRAINT "ClaimLinkEvent_claimLinkId_fkey" FOREIGN KEY ("claimLinkId") REFERENCES "ClaimLink"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClaimOtpChallenge" ADD CONSTRAINT "ClaimOtpChallenge_claimLinkId_fkey" FOREIGN KEY ("claimLinkId") REFERENCES "ClaimLink"("id") ON DELETE CASCADE ON UPDATE CASCADE;

