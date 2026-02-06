
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
    const auth = await checkAuth(req);
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
        where: { userId: auth.userId }
      });

      if (!wallet) throw new Error('Wallet not found');

      // Check Balance
      // Map currency to wallet field
      const balanceField = 
        fromAsset === 'USDT' ? 'balanceUsdt' :
        fromAsset === 'EUR' ? 'balanceEur' :
        fromAsset === 'USD' ? 'balanceUsd' : null;

      if (!balanceField) throw new Error('Invalid balance field');

      // @ts-ignore - Dynamic access to Decimal field
      const currentBalance = wallet[balanceField];

      if (currentBalance.toNumber() < amount) {
        throw new Error(`Insufficient ${fromAsset} balance`);
      }

      // Debit Source
      await tx.wallet.update({
        where: { userId: auth.userId },
        data: {
          [balanceField]: { decrement: amount }
        }
      });

      // Credit Destination
      const creditField = 
        toAsset === 'USDT' ? 'balanceUsdt' :
        toAsset === 'EUR' ? 'balanceEur' :
        toAsset === 'USD' ? 'balanceUsd' : null;
      
      if (!creditField) throw new Error('Invalid credit field');

      await tx.wallet.update({
        where: { userId: auth.userId },
        data: {
          [creditField]: { increment: toAmount }
        }
      });

      // Create Swap Record
      const swap = await tx.swap.create({
        data: {
          userId: auth.userId,
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
      await tx.transaction.create({
        data: {
          walletId: wallet.id,
          type: 'EXCHANGE',
          amount: amount,
          currency: fromAsset,
          status: 'COMPLETED', // Swaps are instant internal
          description: `Swap to ${toAsset}`,
          metadata: { swapId: swap.id, direction: 'OUT' }
        }
      });

      await tx.transaction.create({
        data: {
          walletId: wallet.id,
          type: 'EXCHANGE',
          amount: toAmount,
          currency: toAsset,
          status: 'COMPLETED',
          description: `Swap from ${fromAsset}`,
          metadata: { swapId: swap.id, direction: 'IN' }
        }
      });

      return swap;
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
