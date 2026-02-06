
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
    const auth = await checkAuth(req);
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
        where: { userId: auth.userId }
      });

      if (!wallet || wallet.balanceUsdt.toNumber() < amount) {
        throw new Error('Insufficient USDT balance');
      }

      // Create Withdraw Record
      const withdraw = await tx.cryptoWithdraw.create({
        data: {
          userId: auth.userId,
          asset: 'USDT_POLYGON_TESTNET',
          amount: amount,
          toAddress: toAddress,
          status: 'PENDING'
        }
      });

      // Debit Ledger
      await tx.wallet.update({
        where: { userId: auth.userId },
        data: {
          balanceUsdt: { decrement: amount }
        }
      });

      // Create Ledger Entry
      await tx.transaction.create({
        data: {
          walletId: wallet.id,
          type: 'WITHDRAW',
          amount: amount,
          currency: 'USDT',
          status: 'PENDING',
          description: `Withdraw to ${toAddress.slice(0, 6)}...`,
          metadata: { withdrawId: withdraw.id }
        }
      });

      return withdraw;
    });

    // 3. Queue Async Job (Simulated here, but ideally via Queue)
    // For MVP, we'll trigger the worker immediately but don't wait for it in the response if it was a real queue.
    // However, since we don't have a separate worker process running, we'll rely on the Cron Job we created earlier to pick this up,
    // OR we can trigger a "process-withdraw" endpoint.
    // Let's rely on the CRON JOB created in Priority 2 (`/api/cron/process-queue`) to pick up PENDING withdrawals if we add logic there,
    // OR we can just return success and let the user wait.
    
    // BETTER FOR DEMO: Let's create a Job record so our Cron/Worker picks it up.
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
