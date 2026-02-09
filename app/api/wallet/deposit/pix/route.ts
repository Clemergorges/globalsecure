import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function GET() {
  const session = await getSession();
  if (!session || typeof session === 'string') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const pixInfo = {
    key: process.env.PIX_KEY || 'chave@pix.com',
    beneficiary: process.env.PIX_BENEFICIARY || 'GlobalSecureSend BR',
    bank: process.env.PIX_BANK || 'GSS Bank',
    reference: `GSS-${(session as any).userId.substring(0,8)}`
  };

  return NextResponse.json(pixInfo);
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session || typeof session === 'string') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { amount } = await req.json();
    const userId = (session as any).userId as string;

    if (!amount || amount <= 0) {
      return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });
    }

    const wallet = await prisma.wallet.findUnique({ where: { userId } });
    if (!wallet) {
      return NextResponse.json({ error: 'Wallet not found' }, { status: 404 });
    }

    const currency = 'BRL';
    const creditAmount = Number(amount);

    await prisma.$transaction(async (tx) => {
      const balance = await tx.balance.findUnique({
        where: { walletId_currency: { walletId: wallet.id, currency } }
      });
      if (balance) {
        await tx.balance.update({
          where: { id: balance.id },
          data: { amount: { increment: creditAmount } }
        });
      } else {
        await tx.balance.create({
          data: { walletId: wallet.id, currency, amount: creditAmount }
        });
      }

      await tx.walletTransaction.create({
        data: {
          walletId: wallet.id,
          type: 'DEPOSIT',
          amount: creditAmount,
          currency,
          description: 'PIX'
        }
      });
    });

    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: 'Failed to process PIX deposit' }, { status: 500 });
  }
}
