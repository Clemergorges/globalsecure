
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function GET(req: Request) {
  const session = await getSession();
  // @ts-ignore
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const wallet = await prisma.wallet.findUnique({
      // @ts-ignore
      where: { userId: session.userId }
    });

    if (!wallet) {
      return NextResponse.json({ error: 'Wallet not found' }, { status: 404 });
    }

    // Default to primary currency or EUR
    const currency = wallet.primaryCurrency || 'EUR';
    // Dynamic access to balance field e.g. balanceEUR
    // @ts-ignore
    const balance = wallet[`balance${currency}`] || 0;

    return NextResponse.json({
      balance: Number(balance),
      currency: currency,
      // @ts-ignore
      userId: session.userId
    });
  } catch (error) {
    console.error('Failed to fetch balance:', error);
    return NextResponse.json({ error: 'Failed to fetch balance' }, { status: 500 });
  }
}
