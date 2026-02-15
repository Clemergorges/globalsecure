
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { checkAuth } from '@/lib/auth';
import { Decimal } from '@prisma/client/runtime/library';

// Configuration (Could be DB driven)
const RATES = {
  USDT: { EUR: 0.92, USD: 1.00 },
  EUR: { USDT: 1.08, USD: 1.09 },
  USD: { USDT: 1.00, EUR: 0.91 }
} as const;

const SPREAD_PERCENT = 0.008; // 0.8%

export async function POST(req: Request) {
  try {
    const auth = await checkAuth();
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { fromAsset, toAsset, amount } = await req.json();

    // 1. Validation
    if (!amount || amount <= 0) {
      return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });
    }
    if (!['USDT', 'EUR', 'USD'].includes(fromAsset) || !['USDT', 'EUR', 'USD'].includes(toAsset)) {
      return NextResponse.json({ error: 'Invalid currency pair' }, { status: 400 });
    }
    if (fromAsset === toAsset) {
      return NextResponse.json({ error: 'Cannot swap same currency' }, { status: 400 });
    }

    // 2. Calculate Rates
    const baseRate = (RATES as any)[fromAsset]?.[toAsset];
    if (!baseRate) {
      return NextResponse.json({ error: 'Exchange rate not available' }, { status: 400 });
    }

    // Apply Spread (User gets LESS destination currency)
    // Rate Applied = Base Rate * (1 - Spread)
    // Example: 100 USDT -> EUR. Base 0.92. 
    // User should get 92 EUR. Minus 0.8% fee.
    const rateApplied = baseRate * (1 - SPREAD_PERCENT);
    const toAmount = amount * rateApplied;

    // 3. Execute Transaction (ACID)
    const result = await prisma.$transaction(async (tx) => {
      const account = await tx.account.findUnique({
        where: { userId: (auth as any).userId }
      });

      if (!account) throw new Error('Account not found');

      // 3.1 Debit Source (Atomic Check via Balance table)
      // Use updateMany with 'gte' guard to prevent negative balance
      const debitResult = await tx.balance.updateMany({
        where: { 
            accountId: account.id,
            currency: fromAsset,
            amount: { gte: amount }
        },
        data: {
          amount: { decrement: amount }
        }
      });

      if (debitResult.count === 0) {
          // Check if balance exists to give better error
          const balanceExists = await tx.balance.findUnique({
              where: { accountId_currency: { accountId: account.id, currency: fromAsset } }
          });
          if (!balanceExists) {
              throw new Error(`Insufficient ${fromAsset} balance (No record found)`);
          }
          throw new Error(`Insufficient ${fromAsset} balance (Concurrency Check)`);
      }

      // 3.2 Credit Destination
      // Upsert to ensure balance record exists
      await tx.balance.upsert({
        where: { 
            accountId_currency: { accountId: account.id, currency: toAsset } 
        },
        update: {
          amount: { increment: toAmount }
        },
        create: {
          accountId: account.id,
          currency: toAsset,
          amount: toAmount
        }
      });

      // Create Swap Record
      const swap = await tx.swap.create({
        data: {
          userId: (auth as any).userId,
          fromAsset,
          toAsset,
          fromAmount: amount,
          toAmount: toAmount,
          rateBase: baseRate,
          spread: SPREAD_PERCENT,
          rateApplied: rateApplied
        }
      });

      // Create Ledger Entries (One for Debit, One for Credit)
      await tx.accountTransaction.create({
        data: {
          accountId: account.id,
          type: 'DEBIT', // Was REFUND, but DEBIT is more appropriate for Swap Out
          amount: amount,
          currency: fromAsset,
          description: `Swap to ${toAsset}`,
        }
      });

      await tx.accountTransaction.create({
        data: {
          accountId: account.id,
          type: 'CREDIT',
          amount: toAmount,
          currency: toAsset,
          description: `Swap from ${fromAsset}`,
        }
      });

      return swap;
    }, {
      maxWait: 10000, // Wait up to 10s for a connection
      timeout: 10000  // Transaction runs for max 10s
    });

    return NextResponse.json({ 
      success: true, 
      swap: result,
      message: `Swapped ${amount} ${fromAsset} to ${toAmount.toFixed(2)} ${toAsset}`
    });

  } catch (error: any) {
    console.error('Swap error:', error);
    return NextResponse.json({ error: error.message || 'Internal Error' }, { status: 500 });
  }
}
