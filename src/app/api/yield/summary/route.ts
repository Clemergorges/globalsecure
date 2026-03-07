import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { getExchangeRate } from '@/lib/services/exchange';

function toNumber(value: any) {
  if (typeof value === 'number') return value;
  if (value && typeof value === 'object' && typeof value.toNumber === 'function') return value.toNumber();
  return Number(value);
}

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const transfers = await prisma.transfer.findMany({
      where: {
        senderId: session.userId,
        yieldPositionId: { not: null },
        status: { in: ['PENDING', 'PROCESSING', 'COMPLETED'] },
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        createdAt: true,
        amountSent: true,
        currencySent: true,
        recipientEmail: true,
        status: true,
        type: true,
        yieldPositionId: true,
      },
      take: 200,
    });

    const currencySet = new Set<string>();
    for (const tr of transfers) currencySet.add(tr.currencySent);

    const ratesToEur: Record<string, number> = {};
    await Promise.all(
      Array.from(currencySet).map(async (c) => {
        ratesToEur[c] = await getExchangeRate(c, 'EUR');
      })
    );

    const totalPrincipalEur = transfers.reduce((sum, tr) => {
      const amount = toNumber(tr.amountSent);
      const rate = ratesToEur[tr.currencySent] ?? 1;
      return sum + amount * rate;
    }, 0);

    return NextResponse.json({
      totalPrincipalEur,
      positionsCount: transfers.length,
      positions: transfers.map((tr) => ({
        transferId: tr.id,
        createdAt: tr.createdAt.toISOString(),
        amount: toNumber(tr.amountSent),
        currency: tr.currencySent,
        recipientEmail: tr.recipientEmail,
        transferStatus: tr.status,
        transferType: tr.type,
        yieldPositionId: tr.yieldPositionId,
      })),
    });
  } catch (error) {
    console.error('Failed to fetch yield summary:', error);
    return NextResponse.json({ error: 'Failed to fetch yield summary' }, { status: 500 });
  }
}
