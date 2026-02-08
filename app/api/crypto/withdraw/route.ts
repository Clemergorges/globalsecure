
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { checkAuth } from '@/lib/auth';
import { ethers } from 'ethers';

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
      const wallet = await tx.wallet.findUnique({
        where: { userId: (auth as any).userId }
      });

      if (!wallet || wallet.balanceUSD.toNumber() < amount) {
        throw new Error('Insufficient USDT/USD balance');
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

      // Debit Ledger
      await tx.wallet.update({
        where: { userId: (auth as any).userId },
        data: {
          balanceUSD: { decrement: amount }
        }
      });

      // Create Ledger Entry
      await tx.walletTransaction.create({
        data: {
          walletId: wallet.id,
          type: 'WITHDRAW',
          amount: amount,
          currency: 'USD',
          description: `Withdraw to ${toAddress.slice(0, 6)}...`,
          // metadata: { withdrawId: withdraw.id } // Metadata not in schema yet for WalletTransaction
        }
      });

      return withdraw;
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
    return NextResponse.json({ error: error.message || 'Internal Error' }, { status: 500 });
  }
}
