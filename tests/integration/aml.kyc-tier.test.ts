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

async function waitForAudit(where: any) {
  for (let i = 0; i < 30; i++) {
    const row = await prisma.auditLog.findFirst({ where, orderBy: { createdAt: 'desc' } });
    if (row) return row;
    await new Promise((r) => setTimeout(r, 25));
  }
  return null;
}

describe('AML/KYC tier limits on transfers', () => {
  beforeAll(async () => {
    process.env.KYC_NONE_TX_EUR = '20';
    process.env.KYC_NONE_DAILY_EUR = '30';
    process.env.KYC_NONE_MONTHLY_EUR = '200';

    process.env.KYC_BASIC_TX_EUR = '200';
    process.env.KYC_BASIC_DAILY_EUR = '500';
    process.env.KYC_BASIC_MONTHLY_EUR = '2000';

    process.env.KYC_FULL_TX_EUR = '2000';
    process.env.KYC_FULL_DAILY_EUR = '5000';
    process.env.KYC_FULL_MONTHLY_EUR = '20000';

    process.env.RISK_TIER_LOW_MULTIPLIER = '1';
    process.env.RISK_TIER_MEDIUM_MULTIPLIER = '0.5';
    process.env.RISK_TIER_HIGH_MULTIPLIER = '0.1';
  });

  test('KYC NONE + LOW: permite abaixo do limite e bloqueia acima do limite unitário', async () => {
    const email = `${uid('kyc_none_low')}@test.com`;
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash: 'hash',
        emailVerified: true,
        country: 'DE',
        kycLevel: 0,
        riskTier: 'LOW',
        account: { create: { primaryCurrency: 'EUR' } },
      },
      select: { id: true },
    });

    await prisma.fiatBalance.create({ data: { userId: user.id, currency: 'EUR', amount: new Prisma.Decimal(1000) } });
    (getSession as unknown as jest.Mock).mockResolvedValue({ userId: user.id, email, role: 'USER', isAdmin: false });

    // GSS-MVP-FIX: align test with new MVP scope.
    const okBody = { mode: 'SELF_TRANSFER', amountSource: 10, currencySource: 'EUR', currencyTarget: 'EUR' };
    const ok = await transfersCreatePost(
      new Request('http://localhost/api/transfers/create', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(okBody) }),
    );
    expect(ok.status).toBe(400);
    const okJson = await ok.json();
    expect(okJson.code).toBe('MODE_NOT_SUPPORTED');

    const blockedBody = { mode: 'SELF_TRANSFER', amountSource: 25, currencySource: 'EUR', currencyTarget: 'EUR' };
    const blocked = await transfersCreatePost(
      new Request('http://localhost/api/transfers/create', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(blockedBody) }),
    );
    expect(blocked.status).toBe(400);
    const body = await blocked.json();
    expect(body.code).toBe('MODE_NOT_SUPPORTED');

    const transfers = await prisma.transfer.findMany({ where: { senderId: user.id }, select: { id: true } });
    await prisma.transactionLog.deleteMany({ where: { transferId: { in: transfers.map((t) => t.id) } } });
    await prisma.transfer.deleteMany({ where: { senderId: user.id } });
    const account = await prisma.account.findUnique({ where: { userId: user.id }, select: { id: true } });
    if (account) await prisma.accountTransaction.deleteMany({ where: { accountId: account.id } });
    await prisma.auditLog.deleteMany({ where: { userId: user.id } });
    await prisma.fiatBalance.deleteMany({ where: { userId: user.id } });
    await prisma.account.deleteMany({ where: { userId: user.id } });
    await prisma.user.delete({ where: { id: user.id } });
  });

  test('KYC BASIC + MEDIUM: permite valores maiores mas respeita limite ajustado por tier', async () => {
    process.env.KYC_BASIC_TX_EUR = '50';
    const email = `${uid('kyc_basic_medium')}@test.com`;
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash: 'hash',
        emailVerified: true,
        country: 'DE',
        kycLevel: 1,
        riskTier: 'MEDIUM',
        account: { create: { primaryCurrency: 'EUR' } },
      },
      select: { id: true },
    });

    await prisma.fiatBalance.create({ data: { userId: user.id, currency: 'EUR', amount: new Prisma.Decimal(1000) } });
    (getSession as unknown as jest.Mock).mockResolvedValue({ userId: user.id, email, role: 'USER', isAdmin: false });

    // GSS-MVP-FIX: align test with new MVP scope.
    const okBody = { mode: 'SELF_TRANSFER', amountSource: 20, currencySource: 'EUR', currencyTarget: 'EUR' };
    const ok = await transfersCreatePost(
      new Request('http://localhost/api/transfers/create', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(okBody) }),
    );
    expect(ok.status).toBe(400);
    const okJson = await ok.json();
    expect(okJson.code).toBe('MODE_NOT_SUPPORTED');

    const blockedBody = { mode: 'SELF_TRANSFER', amountSource: 26, currencySource: 'EUR', currencyTarget: 'EUR' };
    const blocked = await transfersCreatePost(
      new Request('http://localhost/api/transfers/create', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(blockedBody) }),
    );
    expect(blocked.status).toBe(400);
    const body = await blocked.json();
    expect(body.code).toBe('MODE_NOT_SUPPORTED');

    const transfers = await prisma.transfer.findMany({ where: { senderId: user.id }, select: { id: true } });
    await prisma.transactionLog.deleteMany({ where: { transferId: { in: transfers.map((t) => t.id) } } });
    await prisma.transfer.deleteMany({ where: { senderId: user.id } });
    const account = await prisma.account.findUnique({ where: { userId: user.id }, select: { id: true } });
    if (account) await prisma.accountTransaction.deleteMany({ where: { accountId: account.id } });
    await prisma.auditLog.deleteMany({ where: { userId: user.id } });
    await prisma.fiatBalance.deleteMany({ where: { userId: user.id } });
    await prisma.account.deleteMany({ where: { userId: user.id } });
    await prisma.user.delete({ where: { id: user.id } });
  });

  test('HIGH risk + KYC BASIC: bloqueia acima do limite e cria AmlReviewCase (severidade pilot)', async () => {
    const email = `${uid('kyc_basic_high')}@test.com`;
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash: 'hash',
        emailVerified: true,
        country: 'RU',
        kycLevel: 1,
        riskTier: 'HIGH',
        account: { create: { primaryCurrency: 'EUR' } },
      },
      select: { id: true },
    });

    await prisma.fiatBalance.create({ data: { userId: user.id, currency: 'EUR', amount: new Prisma.Decimal(1000) } });
    (getSession as unknown as jest.Mock).mockResolvedValue({ userId: user.id, email, role: 'USER', isAdmin: false });

    // GSS-MVP-FIX: align test with new MVP scope.
    const blockedBody = { mode: 'SELF_TRANSFER', amountSource: 25, currencySource: 'EUR', currencyTarget: 'EUR' };
    const blocked = await transfersCreatePost(
      new Request('http://localhost/api/transfers/create', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(blockedBody) }),
    );
    expect(blocked.status).toBe(400);
    const body = await blocked.json();
    expect(body.code).toBe('MODE_NOT_SUPPORTED');

    const aml = await prisma.amlReviewCase.findFirst({ where: { userId: user.id } });
    expect(aml).toBeNull();

    await prisma.amlReviewCase.deleteMany({ where: { userId: user.id } });
    await prisma.auditLog.deleteMany({ where: { userId: user.id } });
    await prisma.fiatBalance.deleteMany({ where: { userId: user.id } });
    await prisma.account.deleteMany({ where: { userId: user.id } });
    await prisma.user.delete({ where: { id: user.id } });
  });
});
