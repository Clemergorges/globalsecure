import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import { getYieldGuardForAsset } from '@/lib/services/market-guard';

function getLtvMaxBps() {
  const raw = process.env.YIELD_LTV_MAX_BPS;
  const n = raw ? Number(raw) : 3500;
  const bps = Number.isFinite(n) && n >= 0 ? Math.round(n) : 3500;
  return Math.min(Math.max(bps, 0), 10000);
}

function getCollateralStubUsd() {
  const raw = process.env.YIELD_COLLATERAL_VALUE_USD_STUB;
  const n = raw ? Number(raw) : 0;
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

export async function ensureUserCreditLine(userId: string) {
  const ltvMax = new Prisma.Decimal(getLtvMaxBps()).div(10000);
  return prisma.userCreditLine.upsert({
    where: { userId },
    update: { ltvMax },
    create: {
      userId,
      collateralAsset: 'EETH',
      collateralAmount: new Prisma.Decimal(0),
      collateralValueUsd: new Prisma.Decimal(0),
      ltvMax,
      status: 'INACTIVE',
    },
  });
}

export async function setCollateralSnapshot(userId: string, collateralAmount: number, collateralValueUsd: number) {
  const line = await ensureUserCreditLine(userId);
  return prisma.userCreditLine.update({
    where: { id: line.id },
    data: {
      collateralAmount: new Prisma.Decimal(collateralAmount),
      collateralValueUsd: new Prisma.Decimal(collateralValueUsd),
      collateralUpdatedAt: new Date(),
      status: collateralValueUsd > 0 ? 'ACTIVE' : 'INACTIVE',
    },
  });
}

export async function getCollateralValueUsd(userId: string): Promise<number> {
  const line = await prisma.userCreditLine.findUnique({
    where: { userId },
    select: { collateralValueUsd: true },
  });
  const stored = line?.collateralValueUsd?.toNumber() || 0;
  if (stored > 0) return stored;
  return getCollateralStubUsd();
}

export async function getYieldDebtUsd(userId: string): Promise<number> {
  const sum = await prisma.yieldLiability.aggregate({
    where: { userId, status: { in: ['PENDING_SETTLEMENT', 'SETTLED_READY'] } },
    _sum: { amountUsd: true },
  });
  return sum._sum.amountUsd?.toNumber() || 0;
}

export async function getYieldReservedUsd(userId: string): Promise<number> {
  const sum = await prisma.yieldLiability.aggregate({
    where: { userId, status: 'PENDING_SETTLEMENT' },
    _sum: { amountUsd: true },
  });
  return sum._sum.amountUsd?.toNumber() || 0;
}

export async function getYieldPower(userId: string) {
  const line = await ensureUserCreditLine(userId);
  const collateralValueUsd = await getCollateralValueUsd(userId);
  const debtUsd = await getYieldDebtUsd(userId);
  const reservedUsd = await getYieldReservedUsd(userId);

  const guard = await getYieldGuardForAsset(prisma, line.collateralAsset);
  const effectiveLtvMax = Math.min(line.ltvMax.toNumber(), guard.ltvMaxCap.toNumber());
  const powerUsd = collateralValueUsd * effectiveLtvMax;
  const availableUsd = Math.max(powerUsd - debtUsd, 0);

  const ltvCurrent = collateralValueUsd > 0 ? debtUsd / collateralValueUsd : 0;
  await prisma.userCreditLine.update({
    where: { id: line.id },
    data: { ltvCurrent: new Prisma.Decimal(ltvCurrent) },
  });

  return {
    collateralValueUsd,
    powerUsd,
    availableUsd,
    reservedUsd,
    debtUsd,
    ltvMax: effectiveLtvMax,
    ltvCurrent,
    yieldPausedByMarketGuard: guard.isYieldPaused,
    marketGuard: {
      assetSymbol: guard.assetSymbol,
      isInAlert: guard.isInAlert,
      isYieldPaused: guard.isYieldPaused,
      lastAlertReason: guard.lastAlertReason,
      ltvMaxCap: guard.ltvMaxCap.toNumber(),
    },
  };
}
