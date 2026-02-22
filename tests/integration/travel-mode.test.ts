import { Prisma } from '@prisma/client';
import { prisma } from '../setup/prisma';

jest.mock('@/lib/auth', () => ({
  getSession: jest.fn(),
}));

import { getSession } from '@/lib/auth';
import { GET as travelModeGet, PATCH as travelModePatch } from '@/app/api/user/travel-mode/route';
import { checkUserGeoFraudContext } from '@/lib/services/risk-gates';
import { coverFiatSpend } from '@/lib/services/fiat-pool';

function uid(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

describe('Travel mode', () => {
  test('GET e PATCH /api/user/travel-mode alternam estado', async () => {
    const email = `${uid('test_travel')}@test.com`;
    const user = await prisma.user.create({
      data: { email, passwordHash: 'hash', firstName: 'Test', lastName: 'User', country: 'DE' },
      select: { id: true },
    });

    (getSession as unknown as jest.Mock).mockResolvedValue({ userId: user.id, email, role: 'USER', isAdmin: false });

    const r1 = await travelModeGet();
    const b1 = await r1.json();
    expect(b1.travelModeEnabled).toBe(false);

    const r2 = await travelModePatch(
      new Request('http://localhost/api/user/travel-mode', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ enabled: true, travelRegion: 'EU' }),
      }),
    );
    expect(r2.status).toBe(200);
    const b2 = await r2.json();
    expect(b2.travelModeEnabled).toBe(true);
    expect(b2.travelRegion).toBe('EU');

    const stored = await prisma.user.findUnique({ where: { id: user.id }, select: { travelModeEnabled: true, travelRegion: true } });
    expect(stored?.travelModeEnabled).toBe(true);
    expect(stored?.travelRegion).toBe('EU');

    await prisma.auditLog.deleteMany({ where: { userId: user.id, action: { in: ['TRAVEL_MODE_UPDATED'] } } });
    await prisma.user.delete({ where: { id: user.id } });
  });

  test('geofraude bloqueia fora do país habitual quando travel mode off', async () => {
    const email = `${uid('test_geo_block')}@test.com`;
    const user = await prisma.user.create({
      data: { email, passwordHash: 'hash', firstName: 'Test', lastName: 'User', country: 'DE', travelModeEnabled: false },
      select: { id: true },
    });

    const r = await checkUserGeoFraudContext(user.id, 'US', { source: 'MERCHANT', mcc: '5812' });
    expect(r.allowed).toBe(false);
    if (!r.allowed) expect(r.code).toBe('GEOFRAUD_COUNTRY_MISMATCH');

    const log = await prisma.auditLog.findFirst({
      where: { userId: user.id, action: 'TRAVEL_MODE_BLOCKED' },
      orderBy: { createdAt: 'desc' },
    });
    expect(log).toBeTruthy();

    await prisma.auditLog.deleteMany({ where: { userId: user.id, action: { in: ['TRAVEL_MODE_BLOCKED', 'TRAVEL_MODE_RELAXED'] } } });
    await prisma.user.delete({ where: { id: user.id } });
  });

  test('geofraude relaxa dentro da região quando travel mode on', async () => {
    const email = `${uid('test_geo_relaxed')}@test.com`;
    const user = await prisma.user.create({
      data: { email, passwordHash: 'hash', firstName: 'Test', lastName: 'User', country: 'DE', travelModeEnabled: true, travelRegion: 'EU' },
      select: { id: true },
    });

    const r = await checkUserGeoFraudContext(user.id, 'FR', { source: 'MERCHANT', mcc: '5411' });
    expect(r.allowed).toBe(true);

    const log = await prisma.auditLog.findFirst({
      where: { userId: user.id, action: 'TRAVEL_MODE_RELAXED' },
      orderBy: { createdAt: 'desc' },
    });
    expect(log).toBeTruthy();

    await prisma.auditLog.deleteMany({ where: { userId: user.id, action: { in: ['TRAVEL_MODE_BLOCKED', 'TRAVEL_MODE_RELAXED'] } } });
    await prisma.user.delete({ where: { id: user.id } });
  });

  test('geofraude bloqueia fora da região quando travel mode on', async () => {
    const email = `${uid('test_geo_region_block')}@test.com`;
    const user = await prisma.user.create({
      data: { email, passwordHash: 'hash', firstName: 'Test', lastName: 'User', country: 'DE', travelModeEnabled: true, travelRegion: 'EU' },
      select: { id: true },
    });

    const r = await checkUserGeoFraudContext(user.id, 'US', { source: 'MERCHANT', mcc: '5411' });
    expect(r.allowed).toBe(false);
    if (!r.allowed) expect(r.code).toBe('GEOFRAUD_OUTSIDE_TRAVEL_REGION');

    await prisma.auditLog.deleteMany({ where: { userId: user.id, action: { in: ['TRAVEL_MODE_BLOCKED', 'TRAVEL_MODE_RELAXED'] } } });
    await prisma.user.delete({ where: { id: user.id } });
  });

  test('fiat pool prioriza moedas da região quando travel mode ativo', async () => {
    const email = `${uid('test_pool_region')}@test.com`;
    const user = await prisma.user.create({
      data: { email, passwordHash: 'hash', firstName: 'Test', lastName: 'User', travelModeEnabled: true, travelRegion: 'EU' },
      select: { id: true },
    });

    await prisma.fiatBalance.create({ data: { userId: user.id, currency: 'EUR', amount: new Prisma.Decimal(10) } });
    await prisma.fiatBalance.create({ data: { userId: user.id, currency: 'JPY', amount: new Prisma.Decimal(2000) } });

    await prisma.fxRate.upsert({
      where: { baseCurrency_quoteCurrency: { baseCurrency: 'EUR', quoteCurrency: 'USD' } },
      update: { rate: new Prisma.Decimal(1.2), spreadBps: 0, source: 'TEST', fetchedAt: new Date() },
      create: { baseCurrency: 'EUR', quoteCurrency: 'USD', rate: new Prisma.Decimal(1.2), spreadBps: 0, source: 'TEST', fetchedAt: new Date() },
    });
    await prisma.fxRate.upsert({
      where: { baseCurrency_quoteCurrency: { baseCurrency: 'JPY', quoteCurrency: 'USD' } },
      update: { rate: new Prisma.Decimal(0.02), spreadBps: 0, source: 'TEST', fetchedAt: new Date() },
      create: { baseCurrency: 'JPY', quoteCurrency: 'USD', rate: new Prisma.Decimal(0.02), spreadBps: 0, source: 'TEST', fetchedAt: new Date() },
    });

    const r = await prisma.$transaction(async (tx) => coverFiatSpend(tx, user.id, 'USD', 5, 'USD'));
    expect(r.fxSteps.length).toBeGreaterThan(0);
    expect(r.fxSteps[0].from).toBe('EUR');

    await prisma.fiatBalance.deleteMany({ where: { userId: user.id } });
    await prisma.user.delete({ where: { id: user.id } });
  });
});

