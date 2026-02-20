import { Prisma } from '@prisma/client';
import { prisma } from '../setup/prisma';
import { runTreasuryCheck } from '@/lib/services/treasury';

function uid(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

describe('Treasury alert levels and anti-spam', () => {
  test('WARNING, CRITICAL and dedupe behavior', async () => {
    process.env.TREASURY_ALERT_DEDUPE_MINUTES = '60';

    const startedAt = new Date();
    const currency = `T${Math.random().toString(16).slice(2, 4).toUpperCase()}`;

    const email = `${uid('test_treasury')}@test.com`;
    const user = await prisma.user.create({
      data: { email, passwordHash: 'hash', firstName: 'Test', lastName: 'User', emailVerified: true },
      select: { id: true },
    });

    await prisma.fiatBalance.create({
      data: { userId: user.id, currency, amount: new Prisma.Decimal(500) },
    });

    await prisma.treasuryLimit.upsert({
      where: { currency },
      update: {
        minBalance: new Prisma.Decimal(0),
        alertThreshold: new Prisma.Decimal(600),
        criticalThreshold: new Prisma.Decimal(400),
        lastAlertAt: null,
        lastAlertLevel: null,
      },
      create: {
        currency,
        minBalance: new Prisma.Decimal(0),
        alertThreshold: new Prisma.Decimal(600),
        criticalThreshold: new Prisma.Decimal(400),
      },
    });

    await runTreasuryCheck();

    const logs1 = await prisma.auditLog.findMany({
      where: { action: 'TREASURY_ALERT', createdAt: { gte: startedAt } },
      orderBy: { createdAt: 'asc' },
    });
    const currencyLogs1 = logs1.filter((l: any) => (l.metadata as any)?.currency === currency);
    expect(currencyLogs1.length).toBe(1);
    expect(currencyLogs1[0].status).toBe('WARNING');
    expect((currencyLogs1[0].metadata as any).level).toBe('WARNING');

    await runTreasuryCheck();
    const logs2 = await prisma.auditLog.findMany({
      where: { action: 'TREASURY_ALERT', createdAt: { gte: startedAt } },
      orderBy: { createdAt: 'asc' },
    });
    const currencyLogs2 = logs2.filter((l: any) => (l.metadata as any)?.currency === currency);
    expect(currencyLogs2.length).toBe(1);

    await prisma.fiatBalance.update({
      where: { userId_currency: { userId: user.id, currency } },
      data: { amount: new Prisma.Decimal(300) },
    });

    await runTreasuryCheck();
    const logs3 = await prisma.auditLog.findMany({
      where: { action: 'TREASURY_ALERT', createdAt: { gte: startedAt } },
      orderBy: { createdAt: 'asc' },
    });
    const currencyLogs3 = logs3.filter((l: any) => (l.metadata as any)?.currency === currency);
    expect(currencyLogs3.length).toBe(2);
    expect(currencyLogs3[1].status).toBe('CRITICAL');
    expect((currencyLogs3[1].metadata as any).level).toBe('CRITICAL');

    await prisma.fiatBalance.deleteMany({ where: { userId: user.id } });
    await prisma.treasuryLimit.deleteMany({ where: { currency } });
    await prisma.user.delete({ where: { id: user.id } });
  });
});

