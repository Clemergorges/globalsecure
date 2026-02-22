import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import { getConsolidatedPrice } from '@/lib/services/price-oracle';
import { logger } from '@/lib/logger';

function asAssetSymbol(assetSymbol: string) {
  return assetSymbol.trim().toUpperCase();
}

function getDropWarnBps() {
  const raw = process.env.CB_DROP_WARN_BPS;
  const n = raw ? Number(raw) : 500;
  const bps = Number.isFinite(n) && n >= 0 ? Math.floor(n) : 500;
  return Math.min(bps, 10000);
}

function getDropCritBps() {
  const raw = process.env.CB_DROP_CRIT_BPS;
  const n = raw ? Number(raw) : 1000;
  const bps = Number.isFinite(n) && n >= 0 ? Math.floor(n) : 1000;
  return Math.min(bps, 10000);
}

function getLtvMaxWarnBps() {
  const raw = process.env.CB_LTV_MAX_BPS_WARN;
  const n = raw ? Number(raw) : 2000;
  const bps = Number.isFinite(n) && n >= 0 ? Math.floor(n) : 2000;
  return Math.min(bps, 10000);
}

function getLtvMaxCritBps() {
  const raw = process.env.CB_LTV_MAX_BPS_CRIT;
  const n = raw ? Number(raw) : 2000;
  const bps = Number.isFinite(n) && n >= 0 ? Math.floor(n) : 2000;
  return Math.min(bps, 10000);
}

function getEnvLtvMaxBps() {
  const raw = process.env.YIELD_LTV_MAX_BPS;
  const n = raw ? Number(raw) : 3500;
  const bps = Number.isFinite(n) && n >= 0 ? Math.floor(n) : 3500;
  return Math.min(bps, 10000);
}

function getLastPriceMaxAgeMinutes() {
  const raw = process.env.ORACLE_LAST_PRICE_MAX_AGE_MIN;
  const n = raw ? Number(raw) : 30;
  const minutes = Number.isFinite(n) && n >= 0 ? Math.floor(n) : 30;
  return Math.min(minutes, 24 * 60);
}

function getFallbackHaircutBps() {
  const raw = process.env.ORACLE_LAST_PRICE_FALLBACK_HAIRCUT_BPS;
  const n = raw ? Number(raw) : 1200;
  const bps = Number.isFinite(n) && n >= 0 ? Math.floor(n) : 1200;
  return Math.min(bps, 5000);
}

export type MarketGuardUpdateResult = {
  assetSymbol: string;
  priceUsed: number | null;
  divergence: boolean;
  sources: Record<string, number | null>;
  usedFallback: boolean;
  blockedDueToNoPrice: boolean;
};

type DbClient = Prisma.TransactionClient | typeof prisma;

function computeDropBps(lastPrice: Prisma.Decimal | null, hourAgoPrice: Prisma.Decimal | null) {
  if (!lastPrice || !hourAgoPrice) return 0;
  const last = lastPrice.toNumber();
  const hourAgo = hourAgoPrice.toNumber();
  if (!Number.isFinite(last) || !Number.isFinite(hourAgo) || hourAgo <= 0) return 0;
  const pct = (last - hourAgo) / hourAgo;
  if (pct >= 0) return 0;
  return Math.round(Math.abs(pct) * 10000);
}

export async function updateMarketGuardForAsset(assetSymbol: string, options?: { now?: Date }) {
  const sym = asAssetSymbol(assetSymbol);
  const now = options?.now || new Date();
  const consolidated = await getConsolidatedPrice(sym);

  return prisma.$transaction(async (tx) => {
    const existing = await tx.marketGuard.findUnique({ where: { assetSymbol: sym } });

    let priceUsed: number | null = consolidated.price;
    let usedFallback = false;
    let blockedDueToNoPrice = false;
    let lastAlertReason: string | null = null;

    if (priceUsed === null) {
      const lastPrice = existing?.lastPrice || null;
      const lastPriceAt = existing?.lastPriceAt || null;
      const maxAgeMs = getLastPriceMaxAgeMinutes() * 60 * 1000;
      const isFresh = !!lastPrice && !!lastPriceAt && now.getTime() - lastPriceAt.getTime() <= maxAgeMs;

      if (isFresh) {
        const haircutBps = getFallbackHaircutBps();
        priceUsed = lastPrice!.toNumber() * (1 - haircutBps / 10000);
        usedFallback = true;
        lastAlertReason = 'ORACLE_FALLBACK_LAST_PRICE';
      } else {
        blockedDueToNoPrice = true;
        lastAlertReason = 'NO_VALID_PRICE';
      }
    }

    const nextLastPrice =
      priceUsed !== null && !usedFallback ? new Prisma.Decimal(priceUsed) : existing?.lastPrice || (priceUsed !== null ? new Prisma.Decimal(priceUsed) : null);
    const nextLastPriceAt = priceUsed !== null && !usedFallback ? now : existing?.lastPriceAt || (priceUsed !== null ? now : null);

    let hourAgoPrice = existing?.hourAgoPrice || null;
    let hourAgoPriceAt = existing?.hourAgoPriceAt || null;

    if (!existing && priceUsed !== null) {
      hourAgoPrice = new Prisma.Decimal(priceUsed);
      hourAgoPriceAt = now;
    } else if (existing?.hourAgoPriceAt && existing?.lastPrice && now.getTime() - existing.hourAgoPriceAt.getTime() >= 60 * 60 * 1000) {
      hourAgoPrice = existing.lastPrice;
      hourAgoPriceAt = existing.lastPriceAt || now;
    }

    const updated = await tx.marketGuard.upsert({
      where: { assetSymbol: sym },
      update: {
        lastPrice: nextLastPrice,
        lastPriceAt: nextLastPriceAt,
        hourAgoPrice,
        hourAgoPriceAt,
        lastAlertReason: lastAlertReason || existing?.lastAlertReason || null,
        isYieldPaused: blockedDueToNoPrice ? true : existing?.isYieldPaused || false,
        isInAlert: blockedDueToNoPrice ? true : existing?.isInAlert || false,
      },
      create: {
        assetSymbol: sym,
        lastPrice: nextLastPrice,
        lastPriceAt: nextLastPriceAt,
        hourAgoPrice,
        hourAgoPriceAt,
        isYieldPaused: blockedDueToNoPrice,
        isInAlert: blockedDueToNoPrice,
        lastAlertReason,
      },
    });

    if (usedFallback || blockedDueToNoPrice) {
      logger.warn(
        { assetSymbol: sym, usedFallback, blockedDueToNoPrice, divergence: consolidated.divergence, sources: consolidated.sources },
        'MarketGuard oracle degraded',
      );
      await tx.auditLog.create({
        data: {
          action: 'MARKET_ORACLE_DEGRADED',
          userId: null,
          status: blockedDueToNoPrice ? 'BLOCKED' : 'FALLBACK',
          metadata: {
            assetSymbol: sym,
            reason: lastAlertReason,
            sources: consolidated.sources,
            divergence: consolidated.divergence,
            lastPrice: existing?.lastPrice?.toString() || null,
            lastPriceAt: existing?.lastPriceAt?.toISOString() || null,
            usedPrice: priceUsed,
          },
        },
      });
    }

    const dropBps = computeDropBps(updated.lastPrice || null, updated.hourAgoPrice || null);
    return {
      assetSymbol: sym,
      consolidated,
      marketGuard: updated,
      dropBps,
      priceUsed,
      usedFallback,
      blockedDueToNoPrice,
    };
  });
}

export async function applyCircuitBreaker(assetSymbol: string, options?: { now?: Date }) {
  const sym = asAssetSymbol(assetSymbol);
  const now = options?.now || new Date();

  const guard = await prisma.marketGuard.findUnique({ where: { assetSymbol: sym } });
  if (!guard) return { assetSymbol: sym, updated: false as const };

  const dropBps = computeDropBps(guard.lastPrice || null, guard.hourAgoPrice || null);
  const warn = getDropWarnBps();
  const crit = getDropCritBps();

  if (guard.isYieldPaused && guard.lastAlertReason === 'NO_VALID_PRICE') {
    return { assetSymbol: sym, updated: false as const, dropBps };
  }

  let isInAlert = guard.isInAlert;
  let isYieldPaused = guard.isYieldPaused;
  let lastAlertReason = guard.lastAlertReason;

  if (dropBps >= crit) {
    isInAlert = true;
    isYieldPaused = true;
    lastAlertReason = 'DROP_10PCT';
  } else if (dropBps >= warn) {
    isInAlert = true;
    isYieldPaused = false;
    lastAlertReason = 'DROP_5PCT';
  } else {
    isInAlert = false;
    lastAlertReason = null;
  }

  if (isInAlert !== guard.isInAlert || isYieldPaused !== guard.isYieldPaused || lastAlertReason !== guard.lastAlertReason) {
    const updated = await prisma.marketGuard.update({
      where: { assetSymbol: sym },
      data: { isInAlert, isYieldPaused, lastAlertReason },
    });

    logger.warn(
      { assetSymbol: sym, dropBps, warnBps: warn, critBps: crit, isInAlert, isYieldPaused, lastAlertReason },
      'Market circuit breaker updated',
    );
    await prisma.auditLog.create({
      data: {
        action: 'MARKET_CIRCUIT_BREAKER',
        userId: null,
        status: isYieldPaused ? 'CRITICAL' : isInAlert ? 'WARNING' : 'OK',
        metadata: {
          assetSymbol: sym,
          dropBps,
          warnBps: warn,
          critBps: crit,
          isInAlert,
          isYieldPaused,
          lastAlertReason,
          ltvMaxBps: isInAlert ? getLtvMaxWarnBps() : getEnvLtvMaxBps(),
        },
      },
    });

    return { assetSymbol: sym, updated: true as const, dropBps, marketGuard: updated };
  }

  return { assetSymbol: sym, updated: false as const, dropBps, marketGuard: guard };
}

export async function getYieldGuardForAsset(db: DbClient, assetSymbol: string) {
  const sym = asAssetSymbol(assetSymbol);
  const guard = await db.marketGuard.findUnique({ where: { assetSymbol: sym } });

  const capBps = guard?.isInAlert ? getLtvMaxWarnBps() : getEnvLtvMaxBps();
  const cap = new Prisma.Decimal(capBps).div(10000);

  return {
    assetSymbol: sym,
    isInAlert: guard?.isInAlert || false,
    isYieldPaused: guard?.isYieldPaused || false,
    lastAlertReason: guard?.lastAlertReason || null,
    ltvMaxCap: cap,
    ltvMaxCapBps: capBps,
  };
}

export async function evaluateMarketGuards(assetSymbols: string[]) {
  const results: any[] = [];
  for (const a of assetSymbols) {
    const u = await updateMarketGuardForAsset(a);
    const cb = await applyCircuitBreaker(a);
    results.push({ update: u, circuitBreaker: cb });
  }
  return results;
}
