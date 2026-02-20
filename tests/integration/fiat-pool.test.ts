import { prisma } from '../setup/prisma';
import { Prisma } from '@prisma/client';
import { coverFiatSpend } from '@/lib/services/fiat-pool';

function uid() {
  return `test_fiatpool_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

describe('Fiat pool coverage', () => {
  let userId: string;

  beforeEach(async () => {
    const email = `${uid()}@test.com`;
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash: 'hash',
        firstName: 'Test',
        lastName: 'User',
      },
      select: { id: true },
    });
    userId = user.id;
  });

  afterEach(async () => {
    await prisma.fiatBalance.deleteMany({ where: { userId } });
    await prisma.yieldLiability.deleteMany({ where: { userId } });
    await prisma.userCreditLine.deleteMany({ where: { userId } });
    await prisma.user.delete({ where: { id: userId } });
  });

  test('debita somente na mesma moeda quando há saldo', async () => {
    await prisma.fiatBalance.create({
      data: { userId, currency: 'EUR', amount: new Prisma.Decimal(100) },
    });

    const r = await prisma.$transaction(async (tx) => coverFiatSpend(tx, userId, 'EUR', 30, 'USD'));

    expect(r.remaining).toBe(0);
    expect(r.fxSteps).toHaveLength(0);

    const eur = await prisma.fiatBalance.findUnique({
      where: { userId_currency: { userId, currency: 'EUR' } },
    });
    expect(eur?.amount.toNumber()).toBeCloseTo(70, 2);
  });

  test('cobre compra em USD usando saldo em EUR via FX', async () => {
    await prisma.fiatBalance.create({
      data: { userId, currency: 'EUR', amount: new Prisma.Decimal(100) },
    });

    await prisma.fxRate.upsert({
      where: { baseCurrency_quoteCurrency: { baseCurrency: 'EUR', quoteCurrency: 'USD' } },
      update: { rate: new Prisma.Decimal(1.2), spreadBps: 75, source: 'TEST', fetchedAt: new Date() },
      create: { baseCurrency: 'EUR', quoteCurrency: 'USD', rate: new Prisma.Decimal(1.2), spreadBps: 75, source: 'TEST', fetchedAt: new Date() },
    });

    const r = await prisma.$transaction(async (tx) => coverFiatSpend(tx, userId, 'USD', 50, 'USD'));

    expect(r.remaining).toBeLessThanOrEqual(0.05);
    expect(r.fxSteps.length).toBeGreaterThan(0);
    expect(r.fxSteps[0].from).toBe('EUR');
    expect(r.fxSteps[0].to).toBe('USD');

    const eur = await prisma.fiatBalance.findUnique({
      where: { userId_currency: { userId, currency: 'EUR' } },
    });
    expect(eur?.amount.toNumber()).toBeLessThan(100);
  });
});

