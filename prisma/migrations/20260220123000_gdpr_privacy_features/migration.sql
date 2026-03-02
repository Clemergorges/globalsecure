-- CreateEnum
CREATE TYPE "ConsentType" AS ENUM ('GDPR_TERMS', 'MARKETING', 'COOKIES');

-- CreateEnum
CREATE TYPE "PrivacyIncidentSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "PrivacyIncidentStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'CLOSED');

-- CreateEnum
CREATE TYPE "PrivacyRequestType" AS ENUM ('ACCESS', 'RECTIFY', 'EXPORT', 'ERASE');

-- CreateEnum
CREATE TYPE "PrivacyRequestStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'FULFILLED', 'REJECTED');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "anonymizedAt" TIMESTAMP(3),
ADD COLUMN     "anonymizationVersion" INTEGER,
ADD COLUMN     "emailAnonymized" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "phoneAnonymized" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "ConsentDocument" (
    "id" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "locale" TEXT NOT NULL,
    "renderedTextHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdByUserId" TEXT,

    CONSTRAINT "ConsentDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserConsentRecord" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "consentType" "ConsentType" NOT NULL,
    "documentVersion" TEXT NOT NULL,
    "acceptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ip" TEXT,
    "userAgent" TEXT,

    CONSTRAINT "UserConsentRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeletionJob" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "JobStatus" NOT NULL DEFAULT 'PENDING',
    "failureReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "DeletionJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PrivacyIncident" (
    "id" TEXT NOT NULL,
    "severity" "PrivacyIncidentSeverity" NOT NULL,
    "detectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "description" TEXT NOT NULL,
    "affectedUserCount" INTEGER NOT NULL DEFAULT 0,
    "status" "PrivacyIncidentStatus" NOT NULL DEFAULT 'OPEN',
    "supervisoryNotifiedAt" TIMESTAMP(3),
    "userNotifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdByUserId" TEXT,

    CONSTRAINT "PrivacyIncident_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PrivacyRequest" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "PrivacyRequestType" NOT NULL,
    "status" "PrivacyRequestStatus" NOT NULL DEFAULT 'OPEN',
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fulfilledAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PrivacyRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DataExportJob" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "JobStatus" NOT NULL DEFAULT 'PENDING',
    "objectKey" TEXT,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "DataExportJob_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ConsentDocument_createdAt_idx" ON "ConsentDocument"("createdAt");

-- CreateIndex
CREATE INDEX "ConsentDocument_version_idx" ON "ConsentDocument"("version");

-- CreateIndex
CREATE INDEX "ConsentDocument_locale_idx" ON "ConsentDocument"("locale");

-- CreateIndex
CREATE INDEX "UserConsentRecord_userId_consentType_acceptedAt_idx" ON "UserConsentRecord"("userId", "consentType", "acceptedAt");

-- CreateIndex
CREATE INDEX "UserConsentRecord_userId_acceptedAt_idx" ON "UserConsentRecord"("userId", "acceptedAt");

-- CreateIndex
CREATE INDEX "DeletionJob_userId_status_createdAt_idx" ON "DeletionJob"("userId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "PrivacyIncident_severity_status_detectedAt_idx" ON "PrivacyIncident"("severity", "status", "detectedAt");

-- CreateIndex
CREATE INDEX "PrivacyIncident_createdAt_idx" ON "PrivacyIncident"("createdAt");

-- CreateIndex
CREATE INDEX "PrivacyRequest_userId_type_status_requestedAt_idx" ON "PrivacyRequest"("userId", "type", "status", "requestedAt");

-- CreateIndex
CREATE INDEX "DataExportJob_userId_status_createdAt_idx" ON "DataExportJob"("userId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "DataExportJob_expiresAt_idx" ON "DataExportJob"("expiresAt");

-- AddForeignKey
ALTER TABLE "ConsentDocument" ADD CONSTRAINT "ConsentDocument_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserConsentRecord" ADD CONSTRAINT "UserConsentRecord_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeletionJob" ADD CONSTRAINT "DeletionJob_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrivacyIncident" ADD CONSTRAINT "PrivacyIncident_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrivacyRequest" ADD CONSTRAINT "PrivacyRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DataExportJob" ADD CONSTRAINT "DataExportJob_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

