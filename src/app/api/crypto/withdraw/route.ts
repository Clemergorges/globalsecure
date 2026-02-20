
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { checkAuth } from '@/lib/auth';
import { ethers } from 'ethers';
import { applyFiatMovement } from '@/lib/services/fiat-ledger';

// Helper: Validate Polygon Address
function isValidAddress(address: string) {
  return ethers.isAddress(address);
}

export async function POST(req: Request) {
  try {
    const auth = await checkAuth();
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { amount, toAddress } = await req.json();

    // 1. Validation
    if (!amount || amount <= 0) {
      return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });
    }
    if (!toAddress || !isValidAddress(toAddress)) {
      return NextResponse.json({ error: 'Invalid Polygon address' }, { status: 400 });
    }

    // Limits (MVP)
    if (amount < 5) {
      return NextResponse.json({ error: 'Minimum withdraw is 5 USDT' }, { status: 400 });
    }
    if (amount > 500) {
      return NextResponse.json({ error: 'Maximum withdraw is 500 USDT (Sandbox limit)' }, { status: 400 });
    }

    // 2. Check Balance & Create Transaction (ACID)
    const result = await prisma.$transaction(async (tx) => {
      // Lock wallet
      const account = await tx.account.findUnique({
        where: { userId: (auth as any).userId }
      });

      if (!account) throw new Error('Account not found');

      // Check Balance via Balance table (assuming USDT uses USD currency code in balance)
      const currency = 'USD';
      
      try {
        await applyFiatMovement(tx, (auth as any).userId, currency, -amount);
      } catch (e: any) {
        if (e?.message === 'BALANCE_NOT_FOUND') throw new Error('INSUFFICIENT_FUNDS');
        if (e?.message === 'INSUFFICIENT_FUNDS') throw new Error('INSUFFICIENT_FUNDS');
        throw e;
      }

      // Create Withdraw Record
      const withdraw = await tx.cryptoWithdraw.create({
        data: {
          userId: (auth as any).userId,
          asset: 'USDT_POLYGON_TESTNET',
          amount: amount,
          toAddress: toAddress,
          status: 'PENDING'
        }
      });

      // Create Ledger Entry
      await tx.accountTransaction.create({
        data: {
          accountId: account.id,
          type: 'WITHDRAW',
          amount: amount,
          currency: 'USD',
          description: `Withdraw to ${toAddress.slice(0, 6)}...`,
        }
      });

      return withdraw;
    }, {
      maxWait: 10000,
      timeout: 10000
    });

    // 3. Queue Async Job
    await prisma.job.create({
      data: {
        type: 'PROCESS_WITHDRAW',
        payload: { withdrawId: result.id },
        status: 'PENDING'
      }
    });

    return NextResponse.json({ 
      success: true, 
      withdrawId: result.id,
      message: 'Withdrawal request submitted successfully' 
    });

  } catch (error: any) {
    console.error('Withdraw error:', error);
    if (error?.message === 'INSUFFICIENT_FUNDS') {
      return NextResponse.json({ error: 'Insufficient USDT/USD balance' }, { status: 409 });
    }
    return NextResponse.json({ error: error.message || 'Internal Error' }, { status: 500 });
  }
}
