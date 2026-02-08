
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
      const wallet = await tx.wallet.findUnique({
        where: { userId: (auth as any).userId }
      });

      if (!wallet) throw new Error('Wallet not found');

      // Check Balance
      // Map currency to wallet field
      // Assuming USDT is mapped to balanceUSD for now, or we should use Balance table
      const balanceField = 
        fromAsset === 'USDT' ? 'balanceUSD' :
        fromAsset === 'EUR' ? 'balanceEUR' :
        fromAsset === 'USD' ? 'balanceUSD' : null;

      if (!balanceField) throw new Error('Invalid balance field');

      // @ts-ignore - Dynamic access to Decimal field
      const currentBalance = wallet[balanceField];

      if (currentBalance.toNumber() < amount) {
        throw new Error(`Insufficient ${fromAsset} balance`);
      }

      // Debit Source with Atomic Check
      // We use updateMany to ensure we only update if balance is sufficient at the moment of write.
      const debitResult = await tx.wallet.updateMany({
        where: { 
            userId: (auth as any).userId,
            [balanceField]: { gte: amount }
        },
        data: {
          [balanceField]: { decrement: amount }
        }
      });

      if (debitResult.count === 0) {
          throw new Error(`Insufficient ${fromAsset} balance (Concurrency Check)`);
      }

      // Credit Destination
      const creditField = 
        toAsset === 'USDT' ? 'balanceUSD' :
        toAsset === 'EUR' ? 'balanceEUR' :
        toAsset === 'USD' ? 'balanceUSD' : null;
      
      if (!creditField) throw new Error('Invalid credit field');

      await tx.wallet.update({
        where: { userId: (auth as any).userId },
        data: {
          [creditField]: { increment: toAmount }
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
      await tx.walletTransaction.create({
        data: {
          walletId: wallet.id,
          type: 'REFUND', // DEBIT equivalent
          amount: amount,
          currency: fromAsset,
          description: `Swap to ${toAsset}`,
        }
      });

      await tx.walletTransaction.create({
        data: {
          walletId: wallet.id,
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
