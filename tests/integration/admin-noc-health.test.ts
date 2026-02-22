jest.mock('@/lib/auth', () => ({
  checkAdmin: jest.fn(),
  getSession: jest.fn(),
}));

import { checkAdmin } from '@/lib/auth';
import { prisma } from '../setup/prisma';
import { Prisma } from '@prisma/client';
import { GET as nocGet } from '@/app/api/admin/noc/events/route';
import { GET as healthGet } from '@/app/api/admin/health/route';

describe('Admin NOC + health', () => {
  beforeAll(() => {
    process.env.ISSUER_CONNECTOR = 'mock';
  });

  beforeEach(async () => {
    (checkAdmin as unknown as jest.Mock).mockResolvedValue({ userId: 'admin', isAdmin: true });
  });

  test('GET /api/admin/health retorna checks', async () => {
    await prisma.fxRate.upsert({
      where: { baseCurrency_quoteCurrency: { baseCurrency: 'USD', quoteCurrency: 'EUR' } },
      update: { rate: new Prisma.Decimal(1), spreadBps: 0, source: 'TEST', fetchedAt: new Date() },
      create: { baseCurrency: 'USD', quoteCurrency: 'EUR', rate: new Prisma.Decimal(1), spreadBps: 0, source: 'TEST', fetchedAt: new Date() },
    });

    const res = await healthGet();
    expect([200, 503]).toContain(res.status);
    const body = await res.json();
    expect(body).toHaveProperty('checks');
    expect(body.checks).toHaveProperty('issuer');
    expect(body.checks.issuer.kind).toBe('mock');
  });

  test('GET /api/admin/noc/events lista audit e AML', async () => {
    await prisma.auditLog.create({
      data: { action: 'MARKET_CIRCUIT_BREAKER', status: 'WARNING', metadata: { assetSymbol: 'EETH' } },
    });

    const res = await nocGet(new Request('http://localhost/api/admin/noc/events?take=10'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body.audit)).toBe(true);
    expect(body.aml).toHaveProperty('openHighOrCritical');
  });
});
