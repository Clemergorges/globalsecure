import { Prisma } from '@prisma/client';
import { prisma } from '../setup/prisma';

jest.mock('@/lib/auth', () => ({
  getSession: jest.fn(),
  checkAdmin: jest.fn(),
}));

import { getSession, checkAdmin } from '@/lib/auth';
import { GET as yieldPowerGet } from '@/app/api/yield/power/route';
import { GET as adminFinanceUsersGet } from '@/app/api/admin/finance/users/route';
import { GET as amlQueueGet, POST as amlQueuePost } from '@/app/api/admin/aml/review-queue/route';
import { runTreasuryCheck } from '@/lib/services/treasury';

function uid(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

describe('Phase 3 endpoints and jobs', () => {
  const adminId = 'admin';

  beforeAll(async () => {
    await prisma.marketGuard.deleteMany({});
    process.env.YIELD_SPENDING_ENABLED = 'true';
    await prisma.user.upsert({
      where: { id: adminId },
      update: {},
      create: { id: adminId, email: 'admin@test.com', passwordHash: 'hash', firstName: 'Admin', lastName: 'Test', emailVerified: true },
      select: { id: true },
    });
    await prisma.fxRate.upsert({
      where: { baseCurrency_quoteCurrency: { baseCurrency: 'USD', quoteCurrency: 'EUR' } },
      update: { rate: new Prisma.Decimal(0.9), spreadBps: 0, source: 'TEST', fetchedAt: new Date() },
      create: { baseCurrency: 'USD', quoteCurrency: 'EUR', rate: new Prisma.Decimal(0.9), spreadBps: 0, source: 'TEST', fetchedAt: new Date() },
    });
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { id: adminId } });
  });

  test('GET /api/yield/power retorna valores consistentes', async () => {
    const email = `${uid('test_yieldpower')}@test.com`;
    const user = await prisma.user.create({
      data: { email, passwordHash: 'hash', firstName: 'Test', lastName: 'User', yieldEnabled: true },
      select: { id: true },
    });

    await prisma.userCreditLine.create({
      data: {
        userId: user.id,
        collateralAsset: 'EETH',
        collateralAmount: new Prisma.Decimal(0),
        collateralValueUsd: new Prisma.Decimal(10000),
        ltvMax: new Prisma.Decimal(0.3),
        ltvCurrent: new Prisma.Decimal(0),
        status: 'ACTIVE',
      },
    });

    await prisma.yieldLiability.create({
      data: { userId: user.id, amountUsd: new Prisma.Decimal(500), status: 'PENDING_SETTLEMENT' },
    });

    (getSession as unknown as jest.Mock).mockResolvedValue({ userId: user.id, email, role: 'USER', isAdmin: false });

    const res = await yieldPowerGet();
    const body = await res.json();

    expect(body.yieldEnabled).toBe(true);
    expect(body.usd.powerUsd).toBeCloseTo(3000, 2);
    expect(body.usd.debtUsd).toBeCloseTo(500, 2);
    expect(body.usd.reservedUsd).toBeCloseTo(500, 2);
    expect(body.usd.availableUsd).toBeCloseTo(2500, 2);

    await prisma.yieldLiability.deleteMany({ where: { userId: user.id } });
    await prisma.userCreditLine.deleteMany({ where: { userId: user.id } });
    await prisma.user.delete({ where: { id: user.id } });
  });

  test('GET /api/admin/finance/users agrega saldos e yield', async () => {
    const email = `${uid('test_adminfinance')}@test.com`;
    const user = await prisma.user.create({
      data: { email, passwordHash: 'hash', firstName: 'Test', lastName: 'User', yieldEnabled: true },
      select: { id: true },
    });

    await prisma.fiatBalance.create({ data: { userId: user.id, currency: 'EUR', amount: new Prisma.Decimal(123.45) } });
    await prisma.userCreditLine.create({
      data: {
        userId: user.id,
        collateralAsset: 'EETH',
        collateralAmount: new Prisma.Decimal(0),
        collateralValueUsd: new Prisma.Decimal(10000),
        ltvMax: new Prisma.Decimal(0.3),
        ltvCurrent: new Prisma.Decimal(0),
        status: 'ACTIVE',
      },
    });
    await prisma.yieldLiability.create({
      data: { userId: user.id, amountUsd: new Prisma.Decimal(200), status: 'PENDING_SETTLEMENT' },
    });

    (checkAdmin as unknown as jest.Mock).mockResolvedValue({ userId: adminId, email: 'admin@test.com', role: 'ADMIN', isAdmin: true });

    const res = await adminFinanceUsersGet(new Request('http://localhost/api/admin/finance/users?take=10'));
    const body = await res.json();

    expect(Array.isArray(body.users)).toBe(true);
    const row = body.users.find((u: any) => u.id === user.id);
    expect(row).toBeTruthy();
    expect(row.yield.debtUsd).toBeCloseTo(200, 2);
    expect(row.yield.powerUsd).toBeGreaterThan(0);
    expect(row.fiatBalances.some((b: any) => b.currency === 'EUR')).toBe(true);

    await prisma.yieldLiability.deleteMany({ where: { userId: user.id } });
    await prisma.userCreditLine.deleteMany({ where: { userId: user.id } });
    await prisma.fiatBalance.deleteMany({ where: { userId: user.id } });
    await prisma.user.delete({ where: { id: user.id } });
  });

  test('GET/POST /api/admin/aml/review-queue lista e atualiza casos', async () => {
    const email = `${uid('test_amlqueue')}@test.com`;
    const user = await prisma.user.create({
      data: { email, passwordHash: 'hash', firstName: 'Test', lastName: 'User', yieldEnabled: true },
      select: { id: true },
    });

    const created = await prisma.amlReviewCase.create({
      data: { userId: user.id, reason: 'DAILY_MAX', contextJson: { amountUsd: 10 }, status: 'PENDING' },
      select: { id: true },
    });

    (checkAdmin as unknown as jest.Mock).mockResolvedValue({ userId: adminId, email: 'admin@test.com', role: 'ADMIN', isAdmin: true });

    const res = await amlQueueGet(new Request('http://localhost/api/admin/aml/review-queue?status=PENDING&take=50'));
    const body = await res.json();
    expect(body.cases.some((c: any) => c.id === created.id)).toBe(true);

    const res2 = await amlQueuePost(
      new Request('http://localhost/api/admin/aml/review-queue', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ id: created.id, status: 'CLEARED' }),
      }),
    );
    const body2 = await res2.json();
    expect(body2.success).toBe(true);

    await prisma.amlReviewCase.delete({ where: { id: created.id } });
    await prisma.user.delete({ where: { id: user.id } });
  });

  test('TREASURY_CHECK cria AuditLog quando saldo total < threshold', async () => {
    await prisma.treasuryLimit.upsert({
      where: { currency: 'EUR' },
      update: { alertThreshold: new Prisma.Decimal(999999) },
      create: { currency: 'EUR', minBalance: new Prisma.Decimal(0), alertThreshold: new Prisma.Decimal(999999) },
    });

    const r = await runTreasuryCheck();
    expect(r.alerts.some((a) => a.currency === 'EUR')).toBe(true);

    const log = await prisma.auditLog.findFirst({
      where: { action: 'TREASURY_ALERT', status: 'WARNING' },
      orderBy: { createdAt: 'desc' },
    });
    expect(log).toBeTruthy();
  });
});
