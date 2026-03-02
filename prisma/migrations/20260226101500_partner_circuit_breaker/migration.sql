-- CreateEnum
CREATE TYPE "PartnerName" AS ENUM ('STRIPE', 'POLYGON', 'ETHERFI');

-- CreateEnum
CREATE TYPE "PartnerBreakerState" AS ENUM ('CLOSED', 'OPEN', 'HALF_OPEN');

-- CreateTable
CREATE TABLE "partner_circuit_states" (
    "partner" "PartnerName" NOT NULL,
    "state" "PartnerBreakerState" NOT NULL DEFAULT 'CLOSED',
    "openedAt" TIMESTAMP(3),
    "halfOpenedAt" TIMESTAMP(3),
    "lastProbeAt" TIMESTAMP(3),
    "lastStateChangeAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "partner_circuit_states_pkey" PRIMARY KEY ("partner")
);

-- CreateTable
CREATE TABLE "partner_circuit_events" (
    "id" TEXT NOT NULL,
    "partner" "PartnerName" NOT NULL,
    "success" BOOLEAN NOT NULL,
    "errorKind" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "partner_circuit_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "partner_circuit_events_partner_createdAt_idx" ON "partner_circuit_events"("partner", "createdAt");

