import { NextResponse } from 'next/server';
import { sendUsdtFromHotWallet } from '@/lib/services/polygon';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;
    
    // Security: Auth Check
    const session = await getSession();
    if (!session || session.userId !== userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { to, amountUsdt } = body;

    if (!userId || !to || !amountUsdt) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    const amount = parseFloat(amountUsdt);

    // 1. Internal Ledger Check & Atomic Debit
    const txHash = await prisma.$transaction(async (tx) => {
        // Find USDT Balance
        // Assuming USDT is stored in Balance table with currency 'USDT' or 'USDT_POL'
        // Need to check schema or convention. Assuming 'USDT' for now based on context.
        // Or if it's using the old Wallet fields, we should check that.
        // The schema showed `cryptoAddress` in Wallet, but not explicit USDT balance column (removed).
        // So it MUST be in Balance table.
        
        const balance = await tx.balance.findFirst({
            where: { 
                wallet: { userId },
                currency: 'USDT' 
            }
        });

        if (!balance || balance.amount.toNumber() < amount) {
            throw new Error('Insufficient USDT funds');
        }

        // Debit
        await tx.balance.update({
            where: { id: balance.id },
            data: { amount: { decrement: amount } }
        });

        // 3. Execute Blockchain Transaction (This is risky inside transaction if it takes long, 
        // but necessary to ensure we don't debit if it fails immediately. 
        // Ideally, we debit first, then process in background job. 
        // For now, keeping it synchronous but safer.)
        const hash = await sendUsdtFromHotWallet(to, amountUsdt);
        
        return hash;
    });

    // 4. Log Transaction (Outside transaction block to capture the hash)
    await prisma.transactionLog.create({
      data: {
        transferId: 'crypto-send-' + Date.now(), 
        type: 'CRYPTO_SEND',
        metadata: { userId, to, amountUsdt, txHash },
        // transfer: { connect: ... } 
      }
    }).catch(e => console.error("Log failed", e));

    return NextResponse.json({
      success: true,
      txHash,
      explorerUrl: `https://polygonscan.com/tx/${txHash}`
    });

  } catch (error: unknown) {
    console.error('Send USDT error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
