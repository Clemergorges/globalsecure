import { Prisma, UserConsentType } from '@prisma/client';
import { prisma } from '@/lib/db';

type TxClient = Prisma.TransactionClient;

function asDecimal(value: Prisma.Decimal | number | string) {
  return value instanceof Prisma.Decimal ? value : new Prisma.Decimal(value);
}

export async function applyFiatMovement(
  tx: TxClient,
  userId: string,
  currency: string,
  amountDelta: Prisma.Decimal | number | string
) {
  const delta = asDecimal(amountDelta);

  if (delta.greaterThanOrEqualTo(0)) {
    const updated = await tx.fiatBalance.upsert({
      where: { userId_currency: { userId, currency } },
      update: { amount: { increment: delta } },
      create: { userId, currency, amount: delta },
    });
    return updated;
  }

  const debitAmount = delta.mul(-1);
  const debitResult = await tx.fiatBalance.updateMany({
    where: {
      userId,
      currency,
      amount: { gte: debitAmount },
    },
    data: { amount: { decrement: debitAmount } },
  });

  if (debitResult.count === 0) {
    const exists = await tx.fiatBalance.findUnique({
      where: { userId_currency: { userId, currency } },
      select: { id: true },
    });
    if (!exists) {
      const canBackfill =
        typeof (tx as any).account?.findUnique === 'function' && typeof (tx as any).balance?.findMany === 'function';
      if (canBackfill) {
        const account = await (tx as any).account.findUnique({
          where: { userId },
          select: { id: true },
        });
        if (account?.id) {
          await backfillFiatBalancesFromAccount(tx, userId, account.id);
          const debitAfterBackfill = await tx.fiatBalance.updateMany({
            where: {
              userId,
              currency,
              amount: { gte: debitAmount },
            },
            data: { amount: { decrement: debitAmount } },
          });
          if (debitAfterBackfill.count > 0) {
            const updatedAfterBackfill = await tx.fiatBalance.findUnique({
              where: { userId_currency: { userId, currency } },
            });
            return updatedAfterBackfill!;
          }
          const existsAfterBackfill = await tx.fiatBalance.findUnique({
            where: { userId_currency: { userId, currency } },
            select: { id: true },
          });
          if (!existsAfterBackfill) {
            throw new Error('BALANCE_NOT_FOUND');
          }
          throw new Error('INSUFFICIENT_FUNDS');
        }
      }
      throw new Error('BALANCE_NOT_FOUND');
    }
    throw new Error('INSUFFICIENT_FUNDS');
  }

  const updated = await tx.fiatBalance.findUnique({
    where: { userId_currency: { userId, currency } },
  });
  return updated!;
}

export async function recordUserConsent(
  tx: TxClient,
  userId: string,
  type: UserConsentType,
  context: Record<string, any>
) {
  return tx.userConsent.create({
    data: {
      userId,
      type,
      contextJson: context,
    },
  });
}

export function isYieldSpendingEnabled() {
  const raw = (process.env.YIELD_SPENDING_ENABLED || '').toLowerCase();
  return raw === 'true' || raw === '1' || raw === 'yes';
}

export async function getFiatBalances(userId: string) {
  return prisma.fiatBalance.findMany({ where: { userId } });
}

export async function backfillFiatBalancesFromAccount(tx: TxClient, userId: string, accountId: string) {
  const legacy = await tx.balance.findMany({
    where: { accountId },
    select: { currency: true, amount: true },
  });

  for (const b of legacy) {
    await tx.fiatBalance.upsert({
      where: { userId_currency: { userId, currency: b.currency } },
      update: {},
      create: { userId, currency: b.currency, amount: b.amount },
    });
  }
}
