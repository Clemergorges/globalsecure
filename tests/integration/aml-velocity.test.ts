import { Prisma } from '@prisma/client';
import { prisma } from '../setup/prisma';

jest.mock('@/lib/auth', () => ({
  getSession: jest.fn(),
}));

import { getSession } from '@/lib/auth';
import { POST as transfersCreatePost } from '@/app/api/transfers/create/route';

function uid(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

async function seedFx() {
  await prisma.fxRate.upsert({
    where: { baseCurrency_quoteCurrency: { baseCurrency: 'USD', quoteCurrency: 'EUR' } },
    update: { rate: new Prisma.Decimal(0.9), spreadBps: 0, source: 'TEST', fetchedAt: new Date() },
    create: { baseCurrency: 'USD', quoteCurrency: 'EUR', rate: new Prisma.Decimal(0.9), spreadBps: 0, source: 'TEST', fetchedAt: new Date() },
  });
}

describe('AML velocity and high-risk jurisdiction', () => {
  beforeAll(async () => {
    await seedFx();
  });

  test('VELOCITY_TX_COUNT cria AmlReviewCase e bloqueia transfer posterior', async () => {
    process.env.AML_VELOCITY_MAX_TX = '3';
    process.env.AML_VELOCITY_WINDOW_MINUTES = '10';
    process.env.AML_HIGH_RISK_COUNTRIES = '';
    process.env.AML_SLA_HIGH_HOURS = '48';

    const email = `${uid('test_velocity')}@test.com`;
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash: 'hash',
        firstName: 'Test',
        lastName: 'User',
        emailVerified: true,
        country: 'DE',
        account: { create: { primaryCurrency: 'EUR' } },
      },
      select: { id: true },
    });

    await prisma.fiatBalance.create({ data: { userId: user.id, currency: 'USD', amount: new Prisma.Decimal(1000) } });

    (getSession as unknown as jest.Mock).mockResolvedValue({ userId: user.id, email, role: 'USER', isAdmin: false });

    const reqBody = {
      mode: 'SELF_TRANSFER',
      amountSource: 10,
      currencySource: 'USD',
      currencyTarget: 'EUR',
    };

    const r1 = await transfersCreatePost(
      new Request('http://localhost/api/transfers/create', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(reqBody),
      }),
    );
    expect(r1.status).toBe(200);

    const r2 = await transfersCreatePost(
      new Request('http://localhost/api/transfers/create', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(reqBody),
      }),
    );
    expect(r2.status).toBe(200);

    const startedAt = new Date();
    const r3 = await transfersCreatePost(
      new Request('http://localhost/api/transfers/create', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(reqBody),
      }),
    );
    expect(r3.status).toBe(200);

    const case1 = await prisma.amlReviewCase.findFirst({
      where: { userId: user.id, reason: 'VELOCITY_TX_COUNT', status: { in: ['PENDING', 'IN_REVIEW'] }, createdAt: { gte: startedAt } },
      orderBy: { createdAt: 'desc' },
    });
    expect(case1).toBeTruthy();
    expect(case1!.riskLevel).toBe('HIGH');
    expect(case1!.slaDueAt).toBeTruthy();

    const r4 = await transfersCreatePost(
      new Request('http://localhost/api/transfers/create', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(reqBody),
      }),
    );
    expect(r4.status).toBe(403);
    const body4 = await r4.json();
    expect(body4.code).toBe('AML_REVIEW_PENDING');

    const account = await prisma.account.findUnique({ where: { userId: user.id }, select: { id: true } });
    const transfers = await prisma.transfer.findMany({ where: { senderId: user.id }, select: { id: true } });
    await prisma.transactionLog.deleteMany({ where: { transferId: { in: transfers.map((t) => t.id) } } });
    await prisma.transfer.deleteMany({ where: { senderId: user.id } });
    if (account) await prisma.accountTransaction.deleteMany({ where: { accountId: account.id } });
    await prisma.amlReviewCase.deleteMany({ where: { userId: user.id } });
    await prisma.fiatBalance.deleteMany({ where: { userId: user.id } });
    await prisma.account.deleteMany({ where: { userId: user.id } });
    await prisma.user.delete({ where: { id: user.id } });
  });

  test('HIGH_RISK_JURISDICTION cria AmlReviewCase CRITICAL e bloqueia transfer posterior', async () => {
    process.env.AML_VELOCITY_MAX_TX = '100';
    process.env.AML_VELOCITY_WINDOW_MINUTES = '10';
    process.env.AML_HIGH_RISK_COUNTRIES = 'RU,IR';
    process.env.AML_SLA_CRITICAL_HOURS = '2';

    const email = `${uid('test_juris')}@test.com`;
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash: 'hash',
        firstName: 'Test',
        lastName: 'User',
        emailVerified: true,
        country: 'RU',
        account: { create: { primaryCurrency: 'EUR' } },
      },
      select: { id: true },
    });

    await prisma.fiatBalance.create({ data: { userId: user.id, currency: 'USD', amount: new Prisma.Decimal(1000) } });

    (getSession as unknown as jest.Mock).mockResolvedValue({ userId: user.id, email, role: 'USER', isAdmin: false });

    const startedAt = new Date();
    const reqBody = {
      mode: 'SELF_TRANSFER',
      amountSource: 10,
      currencySource: 'USD',
      currencyTarget: 'EUR',
    };

    const r1 = await transfersCreatePost(
      new Request('http://localhost/api/transfers/create', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(reqBody),
      }),
    );
    expect(r1.status).toBe(200);

    const case1 = await prisma.amlReviewCase.findFirst({
      where: { userId: user.id, reason: 'HIGH_RISK_JURISDICTION', status: { in: ['PENDING', 'IN_REVIEW'] }, createdAt: { gte: startedAt } },
      orderBy: { createdAt: 'desc' },
    });
    expect(case1).toBeTruthy();
    expect(case1!.riskLevel).toBe('CRITICAL');
    expect(case1!.slaDueAt).toBeTruthy();

    const r2 = await transfersCreatePost(
      new Request('http://localhost/api/transfers/create', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(reqBody),
      }),
    );
    expect(r2.status).toBe(403);
    const body2 = await r2.json();
    expect(body2.code).toBe('AML_REVIEW_PENDING');

    const account = await prisma.account.findUnique({ where: { userId: user.id }, select: { id: true } });
    const transfers = await prisma.transfer.findMany({ where: { senderId: user.id }, select: { id: true } });
    await prisma.transactionLog.deleteMany({ where: { transferId: { in: transfers.map((t) => t.id) } } });
    await prisma.transfer.deleteMany({ where: { senderId: user.id } });
    if (account) await prisma.accountTransaction.deleteMany({ where: { accountId: account.id } });
    await prisma.amlReviewCase.deleteMany({ where: { userId: user.id } });
    await prisma.fiatBalance.deleteMany({ where: { userId: user.id } });
    await prisma.account.deleteMany({ where: { userId: user.id } });
    await prisma.user.delete({ where: { id: user.id } });
  });
});

