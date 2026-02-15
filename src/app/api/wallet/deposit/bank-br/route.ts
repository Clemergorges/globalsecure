import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function GET() {
  const session = await getSession();
  if (!session || typeof session === 'string') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const brBankInfo = {
    beneficiary: process.env.BR_BANK_BENEFICIARY || 'GlobalSecureSend BR',
    bank: process.env.BR_BANK_NAME || 'GSS Bank',
    branch: process.env.BR_BANK_BRANCH || '0001',
    account: process.env.BR_BANK_ACCOUNT || '123456-7',
    cpfCnpj: process.env.BR_BANK_DOC || '00.000.000/0001-00',
    reference: `GSS-${(session as any).userId.substring(0,8)}`
  };

  return NextResponse.json(brBankInfo);
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

      await tx.accountTransaction.create({
        data: {
          accountId: account.id,
          type: 'DEPOSIT',
          amount: creditAmount,
          currency,
          description: 'Bank Transfer (BR)'
        }
      });
    });

    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: 'Failed to process BR bank deposit' }, { status: 500 });
  }
}
