import { NextResponse } from 'next/server';
import { sendUsdtFromHotWallet } from '@/lib/services/polygon';
import { prisma } from '@/lib/db';
// import { auth } from '@/auth'; 

export async function POST(
  request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;
    
    // Security: Auth Check
    // const session = await auth();
    // if (!session || session.user.id !== userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { to, amountUsdt } = body;

    if (!userId || !to || !amountUsdt) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    // 1. Internal Ledger Check (Prevent spending more than owned)
    // const userWallet = await prisma.account.findUnique({ where: { userId } });
    // if (!userWallet || userWallet.balanceUSDT < parseFloat(amountUsdt)) {
    //    return NextResponse.json({ error: 'Insufficient funds' }, { status: 402 });
    // }

    // 2. Compliance / Limits Check
    // if (amountUsdt > 10000) ...

    // 3. Execute Blockchain Transaction
    const txHash = await sendUsdtFromHotWallet(to, amountUsdt);

    // 4. Log Transaction
    await prisma.transactionLog.create({
      data: {
        transferId: 'crypto-send-' + Date.now(), 
        type: 'CRYPTO_SEND',
        metadata: { userId, to, amountUsdt, txHash },
        // transfer: { connect: ... } 
      }
    }).catch(e => console.error("Log failed", e));

    // 5. Deduct Balance (Atomic operation recommended)
    // await prisma.account.update(...)

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
