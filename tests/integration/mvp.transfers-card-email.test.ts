import { Prisma } from '@prisma/client';
import { prisma } from '../setup/prisma';

const mockGetSession = jest.fn();
const mockTrigger = jest.fn();
const mockCreateVirtualCard = jest.fn();
const mockSendEmail = jest.fn();
const mockCardCreatedTemplate = jest.fn();

jest.mock('@/lib/auth', () => ({
  getSession: () => mockGetSession(),
}));

jest.mock('@/lib/services/pusher', () => ({
  pusherService: { trigger: (...args: any[]) => mockTrigger(...args) },
}));

jest.mock('@/lib/services/issuer-connector', () => ({
  getIssuerConnector: () => ({
    kind: 'MOCK',
    createVirtualCard: (...args: any[]) => mockCreateVirtualCard(...args),
  }),
}));

jest.mock('@/lib/services/email', () => ({
  sendEmail: (...args: any[]) => mockSendEmail(...args),
  templates: {
    cardCreated: (...args: any[]) => mockCardCreatedTemplate(...args),
  },
}));

import { POST as transfersCreatePost } from '@/app/api/transfers/create/route';

function uid(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

describe('MVP Feb/2026: /api/transfers/create (CARD_EMAIL + fees)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSendEmail.mockResolvedValue({ ok: true, messageId: 'm1' });
    mockCardCreatedTemplate.mockReturnValue('<html>cardCreated</html>');

    mockCreateVirtualCard.mockResolvedValue({
      cardId: `ic_test_${Date.now()}`,
      cardholderId: `ich_test_${Date.now()}`,
      last4: '4242',
      brand: 'visa',
      exp_month: 12,
      exp_year: 2030,
    });
  });

  afterEach(async () => {
    const users = await prisma.user.findMany({
      where: { email: { contains: 'mvp_card_email_' } },
      select: { id: true },
    });
    const ids = users.map((u) => u.id);
    if (ids.length === 0) return;

    await prisma.transactionLog.deleteMany({ where: { transfer: { senderId: { in: ids } } } });
    await prisma.spendTransaction.deleteMany({ where: { card: { userId: { in: ids } } } });
    await prisma.virtualCard.deleteMany({ where: { userId: { in: ids } } });
    await prisma.transfer.deleteMany({ where: { senderId: { in: ids } } });
    await prisma.accountTransaction.deleteMany({ where: { account: { userId: { in: ids } } } });
    await prisma.fiatBalance.deleteMany({ where: { userId: { in: ids } } });
    await prisma.account.deleteMany({ where: { userId: { in: ids } } });
    await prisma.session.deleteMany({ where: { userId: { in: ids } } });
    await prisma.user.deleteMany({ where: { id: { in: ids } } });
  });

  test('creates CARD_EMAIL transfer, records fee (1.8%), and debits only amountSource', async () => {
    const startedAt = new Date();
    const email = `${uid('mvp_card_email_')}@test.com`;
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash: 'hash',
        emailVerified: true,
        role: 'END_USER',
        country: 'DE',
        kycLevel: 1,
        kycStatus: 'APPROVED',
        riskTier: 'LOW',
        account: { create: { status: 'ACTIVE', primaryCurrency: 'EUR' } },
      },
      select: { id: true, account: { select: { id: true } } },
    });

    await prisma.fiatBalance.create({
      data: { userId: user.id, currency: 'EUR', amount: new Prisma.Decimal(1000) },
    });

    mockGetSession.mockResolvedValue({
      userId: user.id,
      email,
      role: 'END_USER',
      sessionId: 'sess_test',
      isAdmin: false,
    });

    const res = await transfersCreatePost(
      new Request('http://localhost/api/transfers/create', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-forwarded-for': '127.0.0.1',
          'user-agent': 'jest-test-agent',
        },
        body: JSON.stringify({
          mode: 'CARD_EMAIL',
          amountSource: 100,
          currencySource: 'EUR',
          currencyTarget: 'EUR',
          receiverEmail: 'recipient@test.com',
          receiverName: 'Recipient',
          personalMessage: 'hello',
        }),
      }),
    );

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.transferId).toBeTruthy();

    const transfer = await prisma.transfer.findUnique({ where: { id: json.transferId } });
    expect(transfer).toBeTruthy();
    expect(transfer!.type).toBe('CARD');
    expect(transfer!.amountSent.toFixed(2)).toBe('100.00');
    expect(transfer!.fee.toFixed(2)).toBe('1.80');
    expect(transfer!.feePercentage.toFixed(2)).toBe('1.80');
    expect(transfer!.amountReceived.toFixed(2)).toBe('98.20');

    const eurBalance = await prisma.fiatBalance.findUnique({
      where: { userId_currency: { userId: user.id, currency: 'EUR' } },
    });
    expect(eurBalance?.amount.toFixed(2)).toBe('900.00');

    const lastTx = await prisma.accountTransaction.findFirst({
      where: { accountId: user.account!.id, type: 'DEBIT' },
      orderBy: { createdAt: 'desc' },
    });
    expect(lastTx).toBeTruthy();
    expect(lastTx!.amount.toFixed(2)).toBe('100.00');

    const debitTxs = await prisma.accountTransaction.findMany({
      where: { accountId: user.account!.id, type: 'DEBIT', createdAt: { gte: startedAt } },
      orderBy: { createdAt: 'asc' },
    });
    expect(debitTxs.length).toBe(1);

    const card = await prisma.virtualCard.findUnique({ where: { transferId: json.transferId } });
    expect(card).toBeTruthy();

    expect(mockCreateVirtualCard).toHaveBeenCalledTimes(1);
    expect(mockCardCreatedTemplate).toHaveBeenCalledTimes(1);
    expect(mockSendEmail).toHaveBeenCalledTimes(1);
    expect(mockSendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'recipient@test.com',
        subject: 'You received a GlobalSecure virtual card',
      }),
    );
  });
});
