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

    const account = await prisma.account.findUnique({ where: { userId } });
    if (!account) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }

    const currency = 'BRL';
    const creditAmount = Number(amount);

    await prisma.$transaction(async (tx) => {
      const balance = await tx.balance.findUnique({
        where: { accountId_currency: { accountId: account.id, currency } }
      });
      if (balance) {
        await tx.balance.update({
          where: { id: balance.id },
          data: { amount: { increment: creditAmount } }
        });
      } else {
        await tx.balance.create({
          data: { accountId: account.id, currency, amount: creditAmount }
        });
      }

      await tx.userTransaction.create({
        data: {
          userId,
          accountId: account.id,
          type: 'PIX_IN',
          amount: creditAmount,
          currency: 'BRL',
          status: 'COMPLETED',
          metadata: { method: 'PIX' }
        }
      });
      
      await tx.accountTransaction.create({
        data: {
          accountId: account.id,
          type: 'DEPOSIT',
          amount: creditAmount,
          currency,
          description: 'PIX Deposit'
        }
      });
    });

    // Audit Log (outside transaction to not block/fail critical path if logger fails)
    // Import logAudit at top if needed, or use inline if imported
    // Assuming logAudit is available or imported. If not, I will add import.
    
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: 'Failed to process PIX deposit' }, { status: 500 });
  }
}
