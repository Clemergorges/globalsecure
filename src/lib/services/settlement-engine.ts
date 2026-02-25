import { prisma } from '@/lib/db';
import { applyFiatMovement } from '@/lib/services/fiat-ledger';
import { createNotification } from '@/lib/notifications';

export type SettlementSweepResult =
  | { kind: 'SETTLED'; transferId: string; senderId: string; recipientId: string; currency: string; amount: number }
  | { kind: 'REFUNDED'; transferId: string; senderId: string; currency: string; amount: number }
  | { kind: 'SKIPPED'; transferId: string; reason: string };

export async function runSettlementSweep(params?: {
  now?: Date;
  transferIds?: string[];
  batchSize?: number;
  timeoutHours?: number;
  dryRun?: boolean;
}) {
  const now = params?.now ?? new Date();
  const batchSize = params?.batchSize ?? Number(process.env.SETTLEMENT_BATCH_SIZE || 50);
  const timeoutHours = params?.timeoutHours ?? Number(process.env.SETTLEMENT_TIMEOUT_HOURS || 24);
  const dryRun = params?.dryRun ?? (process.env.SETTLEMENT_DRY_RUN === 'true');

  const timeoutAt = new Date(now.getTime() - timeoutHours * 60 * 60 * 1000);

  const where = params?.transferIds?.length
    ? { status: 'PENDING' as const, id: { in: params.transferIds } }
    : { status: 'PENDING' as const };

  const transfers = await prisma.transfer.findMany({
    where,
    orderBy: { createdAt: 'asc' },
    take: Math.max(1, Math.min(200, batchSize)),
  });

  const results: SettlementSweepResult[] = [];

  for (const t of transfers) {
    const isTimedOut = t.createdAt <= timeoutAt;
    const isAccountTransfer = t.type === 'ACCOUNT';
    const hasRecipient = Boolean(t.recipientId);

    if (isAccountTransfer && (hasRecipient || t.recipientEmail)) {
      const r = await settleAccountTransfer(t.id, now, { dryRun });
      if (r.kind === 'SKIPPED' && isTimedOut && r.reason === 'RECIPIENT_ACCOUNT_NOT_FOUND') {
        const rr = await refundPendingTransfer(t.id, now, { dryRun, reason: 'TIMEOUT' });
        results.push(rr);
        continue;
      }
      results.push(r);
      continue;
    }

    if (isTimedOut) {
      const r = await refundPendingTransfer(t.id, now, { dryRun, reason: 'TIMEOUT' });
      results.push(r);
      continue;
    }

    results.push({ kind: 'SKIPPED', transferId: t.id, reason: 'NOT_DUE' });
  }

  return { processed: transfers.length, results };
}

async function settleAccountTransfer(transferId: string, now: Date, opts: { dryRun: boolean }): Promise<SettlementSweepResult> {
  const outcome = await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${transferId}))`;

    const transfer = await tx.transfer.findUnique({ where: { id: transferId } });
    if (!transfer) return { kind: 'SKIPPED' as const, transferId, reason: 'NOT_FOUND' as const };
    if (transfer.status !== 'PENDING') return { kind: 'SKIPPED' as const, transferId, reason: 'NOT_PENDING' as const };
    if (transfer.type !== 'ACCOUNT') return { kind: 'SKIPPED' as const, transferId, reason: 'NOT_ACCOUNT' as const };

    const senderAccount = await tx.account.findUnique({ where: { userId: transfer.senderId } });
    if (!senderAccount) return { kind: 'SKIPPED' as const, transferId, reason: 'SENDER_ACCOUNT_NOT_FOUND' as const };

    const recipient = transfer.recipientId
      ? await tx.user.findUnique({ where: { id: transfer.recipientId }, include: { account: true } })
      : await tx.user.findUnique({ where: { email: transfer.recipientEmail }, include: { account: true } });

    if (!recipient?.account) return { kind: 'SKIPPED' as const, transferId, reason: 'RECIPIENT_ACCOUNT_NOT_FOUND' as const };

    if (!transfer.recipientId) {
      await tx.transfer.update({
        where: { id: transfer.id },
        data: {
          recipientId: recipient.id,
          recipientName: `${recipient.firstName || ''} ${recipient.lastName || ''}`.trim() || transfer.recipientName,
        },
      });
    }

    const amountReceived = Number(transfer.amountReceived);
    const currencyReceived = transfer.currencyReceived;
    const amountSent = Number(transfer.amountSent);
    const feeAmount = Number(transfer.fee);

    if (!opts.dryRun) {
      await applyFiatMovement(tx, recipient.id, currencyReceived, amountReceived);
    }

    const senderDebitExists = await tx.accountTransaction.findFirst({
      where: { accountId: senderAccount.id, transferId: transfer.id, type: 'DEBIT' },
      select: { id: true },
    });
    const senderFeeExists = await tx.accountTransaction.findFirst({
      where: { accountId: senderAccount.id, transferId: transfer.id, type: 'FEE' },
      select: { id: true },
    });

    if (!opts.dryRun && !senderDebitExists) {
      await tx.accountTransaction.create({
        data: {
          accountId: senderAccount.id,
          type: 'DEBIT',
          amount: amountSent,
          currency: transfer.currencySent,
          description: `Transfer to ${transfer.recipientEmail}`,
          transferId: transfer.id,
        },
      });
    }

    if (!opts.dryRun && feeAmount > 0 && !senderFeeExists) {
      await tx.accountTransaction.create({
        data: {
          accountId: senderAccount.id,
          type: 'FEE',
          amount: feeAmount,
          currency: transfer.currencySent,
          description: `Fee for transfer to ${transfer.recipientEmail}`,
          transferId: transfer.id,
        },
      });
    }

    if (!opts.dryRun) {
      await tx.accountTransaction.create({
        data: {
          accountId: recipient.account.id,
          type: 'CREDIT',
          amount: amountReceived,
          currency: currencyReceived,
          description: `Received from ${transfer.senderId}`,
          transferId: transfer.id,
        },
      });

      await tx.userTransaction.create({
        data: {
          userId: transfer.senderId,
          accountId: senderAccount.id,
          type: 'TRANSFER',
          amount: amountSent,
          currency: transfer.currencySent,
          status: 'COMPLETED',
          metadata: {
            direction: 'OUT',
            recipientEmail: transfer.recipientEmail,
            recipientId: recipient.id,
            transferId: transfer.id,
            fee: feeAmount,
            amountReceived,
            currencyReceived,
            exchangeRate: Number(transfer.exchangeRate),
          },
        },
      });

      await tx.userTransaction.create({
        data: {
          userId: recipient.id,
          accountId: recipient.account.id,
          type: 'TRANSFER',
          amount: amountReceived,
          currency: currencyReceived,
          status: 'COMPLETED',
          metadata: {
            direction: 'IN',
            senderId: transfer.senderId,
            senderEmail: null,
            transferId: transfer.id,
          },
        },
      });

      if (feeAmount > 0) {
        await tx.userTransaction.create({
          data: {
            userId: transfer.senderId,
            accountId: senderAccount.id,
            type: 'FEE',
            amount: feeAmount,
            currency: transfer.currencySent,
            status: 'COMPLETED',
            metadata: {
              direction: 'OUT',
              transferId: transfer.id,
              feePercentage: Number(transfer.feePercentage),
            },
          },
        });
      }

      await tx.transfer.update({
        where: { id: transfer.id },
        data: { status: 'COMPLETED', completedAt: now },
      });

      await tx.transactionLog.create({
        data: {
          transferId: transfer.id,
          type: 'SETTLEMENT_COMPLETED',
          metadata: {
            settledAt: now.toISOString(),
            recipientId: recipient.id,
          },
        },
      });

      await tx.auditLog.create({
        data: {
          userId: transfer.senderId,
          action: 'TRANSFER_SETTLEMENT',
          status: 'SUCCESS',
          metadata: { transferId: transfer.id, recipientId: recipient.id },
        },
      });
    }

    return {
      kind: 'SETTLED' as const,
      transferId: transfer.id,
      senderId: transfer.senderId,
      recipientId: recipient.id,
      currency: currencyReceived,
      amount: amountReceived,
    };
  });

  if (outcome.kind === 'SETTLED' && !opts.dryRun) {
    await Promise.allSettled([
      createNotification({
        userId: outcome.senderId,
        title: 'Transfer completed',
        body: `Your transfer ${outcome.transferId} was completed.`,
        type: 'SUCCESS',
      }),
      createNotification({
        userId: outcome.recipientId,
        title: 'Funds received',
        body: `You received ${outcome.amount.toFixed(2)} ${outcome.currency}.`,
        type: 'SUCCESS',
      }),
    ]);
  }

  return outcome;
}

async function refundPendingTransfer(
  transferId: string,
  now: Date,
  opts: { dryRun: boolean; reason: 'TIMEOUT' }
): Promise<SettlementSweepResult> {
  const outcome = await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${transferId}))`;

    const transfer = await tx.transfer.findUnique({ where: { id: transferId } });
    if (!transfer) return { kind: 'SKIPPED' as const, transferId, reason: 'NOT_FOUND' as const };
    if (transfer.status !== 'PENDING') return { kind: 'SKIPPED' as const, transferId, reason: 'NOT_PENDING' as const };

    const senderAccount = await tx.account.findUnique({ where: { userId: transfer.senderId } });
    if (!senderAccount) return { kind: 'SKIPPED' as const, transferId, reason: 'SENDER_ACCOUNT_NOT_FOUND' as const };

    const feeCharged = await tx.accountTransaction.findFirst({
      where: { accountId: senderAccount.id, transferId: transfer.id, type: 'FEE' },
      select: { id: true },
    });

    const principal = Number(transfer.amountSent);
    const fee = feeCharged ? Number(transfer.fee) : 0;
    const refundTotal = principal + fee;

    if (!opts.dryRun) {
      await applyFiatMovement(tx, transfer.senderId, transfer.currencySent, refundTotal);
      await tx.accountTransaction.create({
        data: {
          accountId: senderAccount.id,
          type: 'REFUND',
          amount: refundTotal,
          currency: transfer.currencySent,
          description: `Refund for transfer ${transfer.id}`,
          transferId: transfer.id,
        },
      });
      await tx.userTransaction.create({
        data: {
          userId: transfer.senderId,
          accountId: senderAccount.id,
          type: 'ADJUSTMENT',
          amount: refundTotal,
          currency: transfer.currencySent,
          status: 'COMPLETED',
          metadata: { reason: 'TRANSFER_REFUND_TIMEOUT', transferId: transfer.id },
        },
      });
      await tx.transfer.update({ where: { id: transfer.id }, data: { status: 'REFUNDED', canceledAt: now } });
      await tx.transactionLog.create({
        data: {
          transferId: transfer.id,
          type: 'SETTLEMENT_REFUND',
          metadata: { refundedAt: now.toISOString(), reason: opts.reason, refundTotal },
        },
      });
      await tx.auditLog.create({
        data: {
          userId: transfer.senderId,
          action: 'TRANSFER_REFUND',
          status: 'SUCCESS',
          metadata: { transferId: transfer.id, reason: opts.reason, refundTotal },
        },
      });
    }

    return {
      kind: 'REFUNDED' as const,
      transferId: transfer.id,
      senderId: transfer.senderId,
      currency: transfer.currencySent,
      amount: refundTotal,
    };
  });

  if (outcome.kind === 'REFUNDED' && !opts.dryRun) {
    await Promise.allSettled([
      createNotification({
        userId: outcome.senderId,
        title: 'Transfer refunded',
        body: `Your transfer ${outcome.transferId} was refunded.`,
        type: 'WARNING',
      }),
    ]);
  }

  return outcome;
}
