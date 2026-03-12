import { NextResponse } from 'next/server';
import { sendUsdtFromHotWallet } from '@/lib/services/polygon';
import { prisma } from '@/lib/db';
import { NextRequest } from 'next/server';
import { UserRole } from '@prisma/client';
import { requireSelfOrRoles } from '@/lib/rbac';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;

    if (process.env.NODE_ENV === 'production' && process.env.CRYPTO_SEND_ENABLED !== 'true') {
      return NextResponse.json({ error: 'Endpoint disabled' }, { status: 410 });
    }
    
    const session = await requireSelfOrRoles(request, userId, [
      UserRole.ADMIN,
      UserRole.TREASURY,
    ]);
    if (session instanceof NextResponse) return session;

    const body = await request.json();
    const { to, amountUsdt } = body;

    if (!userId || !to || !amountUsdt) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    const toNormalized = String(to).trim();
    if (!/^0x[a-fA-F0-9]{40}$/.test(toNormalized)) {
      return NextResponse.json({ error: 'Invalid destination address' }, { status: 400 });
    }

    const amount = typeof amountUsdt === 'number' ? amountUsdt : Number(String(amountUsdt));
    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });
    }

    // 1. Internal Ledger Check (Prevent spending more than owned)
    // const userWallet = await prisma.account.findUnique({ where: { userId } });
    // if (!userWallet || userWallet.balanceUSDT < parseFloat(amountUsdt)) {
    //    return NextResponse.json({ error: 'Insufficient funds' }, { status: 402 });
    // }

    // 2. Compliance / Limits Check
    // if (amountUsdt > 10000) ...

    // 3. Execute Blockchain Transaction
    const txHash = await sendUsdtFromHotWallet(toNormalized, amount.toString());

    // 4. Log Transaction
    await prisma.transactionLog.create({
      data: {
        transferId: 'crypto-send-' + Date.now(), 
        type: 'CRYPTO_SEND',
        metadata: { userId, to: toNormalized, amountUsdt: amount.toString(), txHash },
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
