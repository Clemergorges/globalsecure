-- CreateEnum
CREATE TYPE "SensitiveActionType" AS ENUM ('SENSITIVE_CHANGE_PASSWORD', 'SENSITIVE_UPDATE_CONTACT', 'SENSITIVE_HIGH_VALUE_TRANSFER');

-- CreateTable
CREATE TABLE "SensitiveActionOtp" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "actionType" "SensitiveActionType" NOT NULL,
    "codeHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ipAddress" TEXT,
    "userAgent" TEXT,

    CONSTRAINT "SensitiveActionOtp_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SensitiveActionOtp_userId_actionType_createdAt_idx" ON "SensitiveActionOtp"("userId", "actionType", "createdAt");

-- CreateIndex
CREATE INDEX "SensitiveActionOtp_expiresAt_idx" ON "SensitiveActionOtp"("expiresAt");

-- CreateIndex
CREATE INDEX "SensitiveActionOtp_userId_usedAt_idx" ON "SensitiveActionOtp"("userId", "usedAt");

-- AddForeignKey
ALTER TABLE "SensitiveActionOtp" ADD CONSTRAINT "SensitiveActionOtp_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
