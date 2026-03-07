import { Prisma } from '@prisma/client';
import { prisma } from '../setup/prisma';

import { runSettlementSweep } from '@/lib/services/settlement-engine';
import { applyFiatMovement } from '@/lib/services/fiat-ledger';

function uid(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

describe('Settlement Engine: PENDING transfers', () => {
  afterEach(async () => {
    const users = await prisma.user.findMany({
      where: { email: { contains: 'mvp_settlement_' } },
      select: { id: true },
    });
    const ids = users.map((u) => u.id);
    if (ids.length === 0) return;

    await prisma.notification.deleteMany({ where: { userId: { in: ids } } });
    await prisma.transactionLog.deleteMany({ where: { transfer: { senderId: { in: ids } } } });
    await prisma.accountTransaction.deleteMany({ where: { account: { userId: { in: ids } } } });
    await prisma.userTransaction.deleteMany({ where: { userId: { in: ids } } });
    await prisma.transfer.deleteMany({ where: { senderId: { in: ids } } });
    await prisma.fiatBalance.deleteMany({ where: { userId: { in: ids } } });
    await prisma.account.deleteMany({ where: { userId: { in: ids } } });
    await prisma.auditLog.deleteMany({ where: { userId: { in: ids } } });
    await prisma.user.deleteMany({ where: { id: { in: ids } } });
  });

  test('auto-settles PENDING ACCOUNT when recipient can be resolved by email', async () => {
    const startedAt = new Date();
    const senderEmail = `${uid('mvp_settlement_sender')}@test.com`;
    const recipientEmail = `${uid('mvp_settlement_recipient')}@test.com`;

    const [sender, recipient] = await Promise.all([
      prisma.user.create({
        data: {
          email: senderEmail,
          passwordHash: 'hash',
          emailVerified: true,
          role: 'END_USER',
          country: 'DE',
          kycLevel: 1,
          kycStatus: 'APPROVED',
          account: { create: { status: 'ACTIVE', primaryCurrency: 'EUR' } },
        },
        select: { id: true, email: true, account: { select: { id: true } } },
      }),
      prisma.user.create({
        data: {
          email: recipientEmail,
          passwordHash: 'hash',
          emailVerified: true,
          role: 'END_USER',
          country: 'DE',
          kycLevel: 1,
          kycStatus: 'APPROVED',
          account: { create: { status: 'ACTIVE', primaryCurrency: 'EUR' } },
        },
        select: { id: true, email: true, account: { select: { id: true } } },
      }),
    ]);

    await Promise.all([
      prisma.fiatBalance.create({ data: { userId: sender.id, currency: 'EUR', amount: new Prisma.Decimal(1000) } }),
      prisma.fiatBalance.create({ data: { userId: recipient.id, currency: 'EUR', amount: new Prisma.Decimal(0) } }),
    ]);

    const transfer = await prisma.$transaction(async (tx) => {
      const t = await tx.transfer.create({
        data: {
          senderId: sender.id,
          recipientId: null,
          recipientEmail: recipient.email,
          recipientName: null,
          type: 'ACCOUNT',
          status: 'PENDING',
          amountSent: 100,
          currencySent: 'EUR',
          fee: 1.8,
          feePercentage: 1.8,
          exchangeRate: 1.0,
          amountReceived: 100,
          currencyReceived: 'EUR',
          logs: { create: { type: 'CREATE_TRANSFER', metadata: { test: true } } },
        },
        select: { id: true },
      });

      await applyFiatMovement(tx, sender.id, 'EUR', -101.8);

      await tx.accountTransaction.create({
        data: {
          accountId: sender.account!.id,
          type: 'DEBIT',
          amount: 100,
          currency: 'EUR',
          description: `Transfer to ${recipient.email}`,
          transferId: t.id,
        },
      });
      await tx.accountTransaction.create({
        data: {
          accountId: sender.account!.id,
          type: 'FEE',
          amount: 1.8,
          currency: 'EUR',
          description: `Fee for transfer to ${recipient.email}`,
          transferId: t.id,
        },
      });

      return t;
    });

    const sweep = await runSettlementSweep({
      now: new Date(),
      transferIds: [transfer.id],
      batchSize: 5,
      timeoutHours: 24,
      dryRun: false,
    });

    expect(sweep.processed).toBe(1);
    expect(sweep.results[0].kind).toBe('SETTLED');

    const updated = await prisma.transfer.findUnique({ where: { id: transfer.id } });
    expect(updated?.status).toBe('COMPLETED');
    expect(updated?.recipientId).toBe(recipient.id);
    expect(updated?.completedAt).toBeTruthy();

    const senderBal = await prisma.fiatBalance.findUnique({ where: { userId_currency: { userId: sender.id, currency: 'EUR' } } });
    const recipientBal = await prisma.fiatBalance.findUnique({ where: { userId_currency: { userId: recipient.id, currency: 'EUR' } } });
    expect(senderBal?.amount.toFixed(2)).toBe('898.20');
    expect(recipientBal?.amount.toFixed(2)).toBe('100.00');

    const credit = await prisma.accountTransaction.findFirst({
      where: { accountId: recipient.account!.id, transferId: transfer.id, type: 'CREDIT' },
    });
    expect(credit).toBeTruthy();
    expect(credit!.amount.toFixed(2)).toBe('100.00');

    const logs = await prisma.transactionLog.findMany({ where: { transferId: transfer.id, createdAt: { gte: startedAt } } });
    expect(logs.some((l) => l.type === 'SETTLEMENT_COMPLETED')).toBe(true);
  });

  test('auto-refunds PENDING transfer after timeout and is idempotent', async () => {
    const senderEmail = `${uid('mvp_settlement_refund')}@test.com`;
    const sender = await prisma.user.create({
      data: {
        email: senderEmail,
        passwordHash: 'hash',
        emailVerified: true,
        role: 'END_USER',
        country: 'DE',
        kycLevel: 1,
        kycStatus: 'APPROVED',
        account: { create: { status: 'ACTIVE', primaryCurrency: 'EUR' } },
      },
      select: { id: true, email: true, account: { select: { id: true } } },
    });

    await prisma.fiatBalance.create({ data: { userId: sender.id, currency: 'EUR', amount: new Prisma.Decimal(1000) } });

    const oldCreatedAt = new Date(Date.now() - 48 * 60 * 60 * 1000);
    const transfer = await prisma.$transaction(async (tx) => {
      const t = await tx.transfer.create({
        data: {
          senderId: sender.id,
          recipientId: null,
          recipientEmail: 'unknown@test.com',
          recipientName: null,
          type: 'ACCOUNT',
          status: 'PENDING',
          amountSent: 100,
          currencySent: 'EUR',
          fee: 1.8,
          feePercentage: 1.8,
          exchangeRate: 1.0,
          amountReceived: 100,
          currencyReceived: 'EUR',
          createdAt: oldCreatedAt,
          logs: { create: { type: 'CREATE_TRANSFER', metadata: { test: true } } },
        },
        select: { id: true },
      });

      await applyFiatMovement(tx, sender.id, 'EUR', -101.8);
      await tx.accountTransaction.create({
        data: {
          accountId: sender.account!.id,
          type: 'DEBIT',
          amount: 100,
          currency: 'EUR',
          description: `Transfer to unknown`,
          transferId: t.id,
        },
      });
      await tx.accountTransaction.create({
        data: {
          accountId: sender.account!.id,
          type: 'FEE',
          amount: 1.8,
          currency: 'EUR',
          description: `Fee for transfer`,
          transferId: t.id,
        },
      });

      return t;
    });

    const sweep1 = await runSettlementSweep({
      now: new Date(),
      transferIds: [transfer.id],
      batchSize: 5,
      timeoutHours: 24,
      dryRun: false,
    });
    expect(sweep1.results[0].kind).toBe('REFUNDED');

    const updated = await prisma.transfer.findUnique({ where: { id: transfer.id } });
    expect(updated?.status).toBe('REFUNDED');
    expect(updated?.canceledAt).toBeTruthy();

    const senderBal = await prisma.fiatBalance.findUnique({ where: { userId_currency: { userId: sender.id, currency: 'EUR' } } });
    expect(senderBal?.amount.toFixed(2)).toBe('1000.00');

    const refunds = await prisma.accountTransaction.findMany({
      where: { accountId: sender.account!.id, transferId: transfer.id, type: 'REFUND' },
    });
    expect(refunds.length).toBe(1);
    expect(refunds[0].amount.toFixed(2)).toBe('101.80');

    const sweep2 = await runSettlementSweep({
      now: new Date(),
      transferIds: [transfer.id],
      batchSize: 5,
      timeoutHours: 24,
      dryRun: false,
    });
    expect(sweep2.processed).toBe(0);
    expect(sweep2.results.length).toBe(0);

    const refundsAfter = await prisma.accountTransaction.findMany({
      where: { accountId: sender.account!.id, transferId: transfer.id, type: 'REFUND' },
    });
    expect(refundsAfter.length).toBe(1);
  });
});
