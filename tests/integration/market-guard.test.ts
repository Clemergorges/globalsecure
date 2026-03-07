import { Prisma } from '@prisma/client';
import { prisma } from '../setup/prisma';

jest.mock('@/lib/services/price-oracle', () => ({
  getConsolidatedPrice: jest.fn(),
}));

import { getConsolidatedPrice } from '@/lib/services/price-oracle';
import { applyCircuitBreaker, updateMarketGuardForAsset } from '@/lib/services/market-guard';
import { getYieldPower, setCollateralSnapshot } from '@/lib/services/yield-credit';

function uid(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

describe('Market guard + circuit breaker', () => {
  beforeAll(() => {
    process.env.YIELD_LTV_MAX_BPS = '3000';
    process.env.CB_DROP_WARN_BPS = '500';
    process.env.CB_DROP_CRIT_BPS = '1000';
    process.env.CB_LTV_MAX_BPS_WARN = '2000';
    process.env.ORACLE_LAST_PRICE_MAX_AGE_MIN = '30';
    process.env.ORACLE_LAST_PRICE_FALLBACK_HAIRCUT_BPS = '1200';
  });

  beforeEach(async () => {
    await prisma.auditLog.deleteMany({ where: { action: { in: ['MARKET_ORACLE_DEGRADED', 'MARKET_CIRCUIT_BREAKER'] } } });
    await prisma.marketGuard.deleteMany({});
  });
 
  afterAll(async () => {
    await prisma.marketGuard.deleteMany({});
    await prisma.auditLog.deleteMany({ where: { action: { in: ['MARKET_ORACLE_DEGRADED', 'MARKET_CIRCUIT_BREAKER'] } } });
  });

  test('queda ~6% em 1h ativa alerta e reduz LTV efetivo', async () => {
    (getConsolidatedPrice as unknown as jest.Mock)
      .mockResolvedValueOnce({ price: 100, divergence: false, sources: { coingecko: 100, binance: 100 } })
      .mockResolvedValueOnce({ price: 94, divergence: false, sources: { coingecko: 94, binance: 94 } });

    const t0 = new Date('2026-02-20T00:00:00.000Z');
    const t1 = new Date(t0.getTime() + 61 * 60 * 1000);

    await updateMarketGuardForAsset('EETH', { now: t0 });
    const u2 = await updateMarketGuardForAsset('EETH', { now: t1 });
    expect(u2.dropBps).toBeGreaterThanOrEqual(500);

    const cb = await applyCircuitBreaker('EETH', { now: t1 });
    expect((cb as any).marketGuard.isInAlert).toBe(true);
    expect((cb as any).marketGuard.isYieldPaused).toBe(false);
    expect((cb as any).marketGuard.lastAlertReason).toBe('DROP_5PCT');

    const email = `${uid('test_mg_warn')}@test.com`;
    const user = await prisma.user.create({
      data: { email, passwordHash: 'hash', firstName: 'Test', lastName: 'User', yieldEnabled: true },
      select: { id: true },
    });

    await setCollateralSnapshot(user.id, 0, 10000);
    await prisma.yieldLiability.create({
      data: { userId: user.id, amountUsd: new Prisma.Decimal(500), status: 'PENDING_SETTLEMENT' },
    });

    const power = await getYieldPower(user.id);
    expect(power.ltvMax).toBeCloseTo(0.2, 6);
    expect(power.powerUsd).toBeCloseTo(2000, 2);
    expect(power.availableUsd).toBeCloseTo(1500, 2);

    await prisma.yieldLiability.deleteMany({ where: { userId: user.id } });
    await prisma.userCreditLine.deleteMany({ where: { userId: user.id } });
    await prisma.user.delete({ where: { id: user.id } });
  });

  test('queda >=10% em 1h pausa yield', async () => {
    (getConsolidatedPrice as unknown as jest.Mock)
      .mockResolvedValueOnce({ price: 100, divergence: false, sources: { coingecko: 100, binance: 100 } })
      .mockResolvedValueOnce({ price: 88, divergence: false, sources: { coingecko: 88, binance: 88 } });

    const t0 = new Date('2026-02-20T00:00:00.000Z');
    const t1 = new Date(t0.getTime() + 61 * 60 * 1000);

    await updateMarketGuardForAsset('EETH', { now: t0 });
    await updateMarketGuardForAsset('EETH', { now: t1 });
    const cb = await applyCircuitBreaker('EETH', { now: t1 });
    expect((cb as any).marketGuard.isYieldPaused).toBe(true);

    const email = `${uid('test_mg_crit')}@test.com`;
    const user = await prisma.user.create({
      data: { email, passwordHash: 'hash', firstName: 'Test', lastName: 'User', yieldEnabled: true },
      select: { id: true },
    });

    await setCollateralSnapshot(user.id, 0, 10000);
    const power = await getYieldPower(user.id);
    expect(power.yieldPausedByMarketGuard).toBe(true);

    await prisma.userCreditLine.deleteMany({ where: { userId: user.id } });
    await prisma.user.delete({ where: { id: user.id } });
  });

  test('oracles falham mas lastPrice recente -> usa fallback sem sobrescrever lastPrice', async () => {
    (getConsolidatedPrice as unknown as jest.Mock).mockResolvedValue({ price: null, divergence: false, sources: { coingecko: null, binance: null } });

    const now = new Date('2026-02-20T00:00:00.000Z');
    await prisma.marketGuard.create({
      data: {
        assetSymbol: 'EETH',
        lastPrice: new Prisma.Decimal(100),
        lastPriceAt: new Date(now.getTime() - 5 * 60 * 1000),
        hourAgoPrice: new Prisma.Decimal(100),
        hourAgoPriceAt: new Date(now.getTime() - 65 * 60 * 1000),
      },
    });

    const r = await updateMarketGuardForAsset('EETH', { now });
    expect(r.usedFallback).toBe(true);
    expect(r.priceUsed).toBeCloseTo(88, 6);

    const mg = await prisma.marketGuard.findUnique({ where: { assetSymbol: 'EETH' } });
    expect(mg?.lastPrice?.toNumber()).toBeCloseTo(100, 6);
  });

  test('oracles falham e lastPrice velho -> pausa yield', async () => {
    (getConsolidatedPrice as unknown as jest.Mock).mockResolvedValue({ price: null, divergence: false, sources: { coingecko: null, binance: null } });

    const now = new Date('2026-02-20T00:00:00.000Z');
    await prisma.marketGuard.create({
      data: {
        assetSymbol: 'EETH',
        lastPrice: new Prisma.Decimal(100),
        lastPriceAt: new Date(now.getTime() - 2 * 60 * 60 * 1000),
        hourAgoPrice: new Prisma.Decimal(100),
        hourAgoPriceAt: new Date(now.getTime() - 3 * 60 * 60 * 1000),
      },
    });

    const r = await updateMarketGuardForAsset('EETH', { now });
    expect(r.blockedDueToNoPrice).toBe(true);

    const mg = await prisma.marketGuard.findUnique({ where: { assetSymbol: 'EETH' } });
    expect(mg?.isYieldPaused).toBe(true);
    expect(mg?.lastAlertReason).toBe('NO_VALID_PRICE');
  });
});
