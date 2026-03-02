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
import { runSettlementSweep } from '@/lib/services/settlement-engine';

function uid(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

describe('MVP Feb/2026: /api/transfers/create (ACCOUNT_CONTROLLED + SELF_TRANSFER + CARD_EMAIL scenario A)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCreateVirtualCard.mockResolvedValue({
      cardId: `ic_test_${Date.now()}`,
      cardholderId: `ich_test_${Date.now()}`,
      last4: '4242',
      brand: 'visa',
      exp_month: 12,
      exp_year: 2030,
    });
    mockSendEmail.mockResolvedValue({ ok: true, messageId: 'm1' });
    mockCardCreatedTemplate.mockReturnValue('<html>cardCreated</html>');
  });

  afterEach(async () => {
    const users = await prisma.user.findMany({
      where: { email: { contains: 'mvp_transfer_modes_' } },
      select: { id: true },
    });
    const ids = users.map((u) => u.id);
    if (ids.length === 0) return;

    await prisma.notification.deleteMany({ where: { userId: { in: ids } } });
    await prisma.transactionLog.deleteMany({ where: { transfer: { senderId: { in: ids } } } });
    await prisma.spendTransaction.deleteMany({ where: { card: { userId: { in: ids } } } });
    await prisma.virtualCard.deleteMany({ where: { userId: { in: ids } } });
    await prisma.userTransaction.deleteMany({ where: { userId: { in: ids } } });
    await prisma.transfer.deleteMany({ where: { senderId: { in: ids } } });
    await prisma.accountTransaction.deleteMany({ where: { account: { userId: { in: ids } } } });
    await prisma.fiatBalance.deleteMany({ where: { userId: { in: ids } } });
    await prisma.account.deleteMany({ where: { userId: { in: ids } } });
    await prisma.session.deleteMany({ where: { userId: { in: ids } } });
    await prisma.amlReviewCase.deleteMany({ where: { userId: { in: ids } } });
    await prisma.auditLog.deleteMany({ where: { userId: { in: ids } } });
    await prisma.user.deleteMany({ where: { id: { in: ids } } });
  });

  test('ACCOUNT_CONTROLLED: creates PENDING ACCOUNT transfer, settles via sweep when recipient exists', async () => {
    const senderEmail = `${uid('mvp_transfer_modes_sender')}` + '@test.com';
    const recipientEmail = `${uid('mvp_transfer_modes_recipient')}` + '@test.com';

    const sender = await prisma.user.create({
      data: {
        email: senderEmail,
        passwordHash: 'hash',
        emailVerified: true,
        role: 'END_USER',
        country: 'DE',
        kycLevel: 1,
        kycStatus: 'APPROVED',
        riskTier: 'LOW',
        account: { create: { status: 'ACTIVE', primaryCurrency: 'EUR' } },
      },
      select: { id: true, email: true, account: { select: { id: true } } },
    });

    const recipient = await prisma.user.create({
      data: {
        email: recipientEmail,
        passwordHash: 'hash',
        emailVerified: true,
        role: 'END_USER',
        country: 'DE',
        kycLevel: 1,
        kycStatus: 'APPROVED',
        riskTier: 'LOW',
        account: { create: { status: 'ACTIVE', primaryCurrency: 'EUR' } },
      },
      select: { id: true, email: true, account: { select: { id: true } } },
    });

    await prisma.fiatBalance.create({ data: { userId: sender.id, currency: 'EUR', amount: new Prisma.Decimal(1000) } });
    await prisma.fiatBalance.create({ data: { userId: recipient.id, currency: 'EUR', amount: new Prisma.Decimal(0) } });

    mockGetSession.mockResolvedValue({
      userId: sender.id,
      email: sender.email,
      role: 'END_USER',
      sessionId: 'sess_test',
      isAdmin: false,
    });

    const res = await transfersCreatePost(
      new Request('http://localhost/api/transfers/create', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          mode: 'ACCOUNT_CONTROLLED',
          amountSource: 100,
          currencySource: 'EUR',
          currencyTarget: 'EUR',
          receiverEmail: recipient.email,
          receiverName: 'Recipient',
        }),
      }),
    );

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);

    const transfer = await prisma.transfer.findUnique({ where: { id: json.transferId } });
    expect(transfer).toBeTruthy();
    expect(transfer!.type).toBe('ACCOUNT');
    expect(transfer!.status).toBe('PENDING');
    expect(transfer!.recipientId).toBe(recipient.id);

    const sweep = await runSettlementSweep({ transferIds: [transfer!.id], batchSize: 5, timeoutHours: 24, dryRun: false });
    expect(sweep.processed).toBe(1);
    expect(sweep.results[0].kind).toBe('SETTLED');

    const updated = await prisma.transfer.findUnique({ where: { id: transfer!.id } });
    expect(updated?.status).toBe('COMPLETED');

    const senderBal = await prisma.fiatBalance.findUnique({ where: { userId_currency: { userId: sender.id, currency: 'EUR' } } });
    const recipientBal = await prisma.fiatBalance.findUnique({ where: { userId_currency: { userId: recipient.id, currency: 'EUR' } } });
    expect(senderBal?.amount.toFixed(2)).toBe('900.00');
    expect(recipientBal?.amount.toFixed(2)).toBe('98.20');

    expect(mockCreateVirtualCard).toHaveBeenCalledTimes(0);
    expect(mockSendEmail).toHaveBeenCalledTimes(0);
  });

  test('SELF_TRANSFER: creates PENDING, settles to same user (net fee only)', async () => {
    const senderEmail = `${uid('mvp_transfer_modes_self')}` + '@test.com';

    const sender = await prisma.user.create({
      data: {
        email: senderEmail,
        passwordHash: 'hash',
        emailVerified: true,
        role: 'END_USER',
        country: 'DE',
        kycLevel: 1,
        kycStatus: 'APPROVED',
        riskTier: 'LOW',
        account: { create: { status: 'ACTIVE', primaryCurrency: 'EUR' } },
      },
      select: { id: true, email: true },
    });

    await prisma.fiatBalance.create({ data: { userId: sender.id, currency: 'EUR', amount: new Prisma.Decimal(1000) } });

    mockGetSession.mockResolvedValue({
      userId: sender.id,
      email: sender.email,
      role: 'END_USER',
      sessionId: 'sess_test',
      isAdmin: false,
    });

    const res = await transfersCreatePost(
      new Request('http://localhost/api/transfers/create', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          mode: 'SELF_TRANSFER',
          amountSource: 100,
          currencySource: 'EUR',
          currencyTarget: 'EUR',
        }),
      }),
    );

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);

    const transfer = await prisma.transfer.findUnique({ where: { id: json.transferId } });
    expect(transfer).toBeTruthy();
    expect(transfer!.type).toBe('ACCOUNT');
    expect(transfer!.status).toBe('PENDING');
    expect(transfer!.recipientId).toBe(sender.id);

    const sweep = await runSettlementSweep({ transferIds: [transfer!.id], batchSize: 5, timeoutHours: 24, dryRun: false });
    expect(sweep.processed).toBe(1);
    expect(sweep.results[0].kind).toBe('SETTLED');

    const senderBal = await prisma.fiatBalance.findUnique({ where: { userId_currency: { userId: sender.id, currency: 'EUR' } } });
    expect(senderBal?.amount.toFixed(2)).toBe('998.20');

    expect(mockCreateVirtualCard).toHaveBeenCalledTimes(0);
    expect(mockSendEmail).toHaveBeenCalledTimes(0);
  });

  test('CARD_EMAIL scenario A: recipient exists -> completes as internal P2P without card issuance', async () => {
    const senderEmail = `${uid('mvp_transfer_modes_sender_ce')}` + '@test.com';
    const recipientEmail = `${uid('mvp_transfer_modes_recipient_ce')}` + '@test.com';

    const sender = await prisma.user.create({
      data: {
        email: senderEmail,
        passwordHash: 'hash',
        emailVerified: true,
        role: 'END_USER',
        country: 'DE',
        kycLevel: 1,
        kycStatus: 'APPROVED',
        riskTier: 'LOW',
        account: { create: { status: 'ACTIVE', primaryCurrency: 'EUR' } },
      },
      select: { id: true, email: true },
    });

    const recipient = await prisma.user.create({
      data: {
        email: recipientEmail,
        passwordHash: 'hash',
        emailVerified: true,
        role: 'END_USER',
        country: 'DE',
        kycLevel: 1,
        kycStatus: 'APPROVED',
        riskTier: 'LOW',
        account: { create: { status: 'ACTIVE', primaryCurrency: 'EUR' } },
      },
      select: { id: true, email: true },
    });

    await prisma.fiatBalance.create({ data: { userId: sender.id, currency: 'EUR', amount: new Prisma.Decimal(1000) } });
    await prisma.fiatBalance.create({ data: { userId: recipient.id, currency: 'EUR', amount: new Prisma.Decimal(0) } });

    mockGetSession.mockResolvedValue({
      userId: sender.id,
      email: sender.email,
      role: 'END_USER',
      sessionId: 'sess_test',
      isAdmin: false,
    });

    const res = await transfersCreatePost(
      new Request('http://localhost/api/transfers/create', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          mode: 'CARD_EMAIL',
          amountSource: 100,
          currencySource: 'EUR',
          currencyTarget: 'EUR',
          receiverEmail: recipient.email,
          receiverName: 'Recipient',
        }),
      }),
    );

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);

    const transfer = await prisma.transfer.findUnique({ where: { id: json.transferId } });
    expect(transfer).toBeTruthy();
    expect(transfer!.type).toBe('ACCOUNT');
    expect(transfer!.status).toBe('COMPLETED');

    const senderBal = await prisma.fiatBalance.findUnique({ where: { userId_currency: { userId: sender.id, currency: 'EUR' } } });
    const recipientBal = await prisma.fiatBalance.findUnique({ where: { userId_currency: { userId: recipient.id, currency: 'EUR' } } });
    expect(senderBal?.amount.toFixed(2)).toBe('900.00');
    expect(recipientBal?.amount.toFixed(2)).toBe('98.20');

    const card = await prisma.virtualCard.findUnique({ where: { transferId: json.transferId } });
    expect(card).toBeNull();

    expect(mockCreateVirtualCard).toHaveBeenCalledTimes(0);
    expect(mockSendEmail).toHaveBeenCalledTimes(0);
  });

  test('timeout: refunds PENDING transfer and is idempotent', async () => {
    const senderEmail = `${uid('mvp_transfer_modes_timeout')}` + '@test.com';

    const sender = await prisma.user.create({
      data: {
        email: senderEmail,
        passwordHash: 'hash',
        emailVerified: true,
        role: 'END_USER',
        country: 'DE',
        kycLevel: 1,
        kycStatus: 'APPROVED',
        riskTier: 'LOW',
        account: { create: { status: 'ACTIVE', primaryCurrency: 'EUR' } },
      },
      select: { id: true, email: true, account: { select: { id: true } } },
    });

    await prisma.fiatBalance.create({ data: { userId: sender.id, currency: 'EUR', amount: new Prisma.Decimal(1000) } });

    mockGetSession.mockResolvedValue({
      userId: sender.id,
      email: sender.email,
      role: 'END_USER',
      sessionId: 'sess_test',
      isAdmin: false,
    });

    const res = await transfersCreatePost(
      new Request('http://localhost/api/transfers/create', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          mode: 'ACCOUNT_CONTROLLED',
          amountSource: 100,
          currencySource: 'EUR',
          currencyTarget: 'EUR',
          receiverEmail: 'no-user@test.com',
        }),
      }),
    );

    expect(res.status).toBe(200);
    const json = await res.json();

    const oldCreatedAt = new Date(Date.now() - 48 * 60 * 60 * 1000);
    await prisma.transfer.update({ where: { id: json.transferId }, data: { createdAt: oldCreatedAt } });

    const sweep1 = await runSettlementSweep({ transferIds: [json.transferId], batchSize: 5, timeoutHours: 24, dryRun: false });
    expect(sweep1.processed).toBe(1);
    expect(sweep1.results[0].kind).toBe('REFUNDED');

    const updated = await prisma.transfer.findUnique({ where: { id: json.transferId } });
    expect(updated?.status).toBe('REFUNDED');

    const senderBal = await prisma.fiatBalance.findUnique({ where: { userId_currency: { userId: sender.id, currency: 'EUR' } } });
    expect(senderBal?.amount.toFixed(2)).toBe('1000.00');

    const refunds = await prisma.accountTransaction.findMany({
      where: { accountId: sender.account!.id, transferId: json.transferId, type: 'REFUND' },
    });
    expect(refunds.length).toBe(1);
    expect(refunds[0].amount.toFixed(2)).toBe('100.00');

    const sweep2 = await runSettlementSweep({ transferIds: [json.transferId], batchSize: 5, timeoutHours: 24, dryRun: false });
    expect(sweep2.processed).toBe(0);
    expect(sweep2.results.length).toBe(0);
  });
});

