import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { createHandler } from '@/lib/api-handler';
import { z } from 'zod';
import { backfillFiatBalancesFromAccount } from '@/lib/services/fiat-ledger';

// Schema for query params (optional currency override)
const balanceQuerySchema = z.object({
  currency: z.enum(['EUR', 'USD', 'GBP']).optional()
});

export const GET = createHandler(
  z.any(), // GET request has no body
  async (req) => {
    const userId = req.userId!; // Guaranteed by requireAuth

    // Optional: Parse query params manually if needed, or use a helper
    // const { currency: requestedCurrency } = validateQuery(req, balanceQuerySchema);
    
    const account = await prisma.account.findUnique({
      where: { userId },
      select: { id: true, primaryCurrency: true }
    });

    if (!account) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }

    const fiatBalances = await prisma.fiatBalance.findMany({
      where: { userId },
      select: { currency: true, amount: true },
    });
    if (fiatBalances.length === 0) {
      await prisma.$transaction(async (tx) => {
        await backfillFiatBalancesFromAccount(tx, userId, account.id);
      });
    }

    const fiatBalancesAfter = fiatBalances.length === 0
      ? await prisma.fiatBalance.findMany({ where: { userId }, select: { currency: true, amount: true } })
      : fiatBalances;

    const balances = fiatBalancesAfter.reduce((acc, curr) => {
      acc[curr.currency] = Number(curr.amount);
      return acc;
    }, {} as Record<string, number>);

    return NextResponse.json({
      userId,
      primaryCurrency: account.primaryCurrency,
      balances: balances,
      // Backward compatibility for single balance view
      balance: balances[account.primaryCurrency] || 0,
      currency: account.primaryCurrency
    });
  },
  {
    rateLimit: { key: 'balance', limit: 20, window: 60 }, // High limit for dashboard polling
    requireAuth: true
  }
);
