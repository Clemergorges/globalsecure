
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function GET(_req: Request) {
  const session = await getSession();
  
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const wallet = await prisma.wallet.findUnique({
      where: { userId: (session as any).userId }
    });

    if (!wallet) {
      return NextResponse.json({ error: 'Wallet not found' }, { status: 404 });
    }

    // Default to primary currency or EUR
    const currency = wallet.primaryCurrency || 'EUR';
    // Dynamic access to balance field e.g. balanceEUR
    // @ts-expect-error Dynamic balance access
    const balance = wallet[`balance${currency}`] || 0;

    return NextResponse.json({
      balance: Number(balance),
      currency: currency,
      userId: (session as any).userId
    });
  } catch (error) {
    console.error('Failed to fetch balance:', error);
    return NextResponse.json({ error: 'Failed to fetch balance' }, { status: 500 });
  }
}
