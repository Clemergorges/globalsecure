
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function GET(_req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    // Fetch ALL relevant transactions (simplified logic from main route, but without pagination limits)
    // 1. Transfers
    const transfers = await prisma.transfer.findMany({
      where: {
        OR: [
          // @ts-expect-error Session userId
          { senderId: session.userId },
          // @ts-expect-error Session userId
          { recipientId: session.userId }
        ]
      },
      orderBy: { createdAt: 'desc' }
    });

    // 2. Card Spends
    const cards = await prisma.virtualCard.findMany({
        where: {
          OR: [
            // @ts-expect-error Session userId
            { transfer: { recipientId: session.userId } },
            // @ts-expect-error Session userId
            { userId: session.userId }
          ]
        },
        select: { id: true }
    });
    const cardIds = cards.map(c => c.id);
    const spendTransactions = cardIds.length > 0 ? await prisma.spendTransaction.findMany({
      where: { cardId: { in: cardIds } },
      orderBy: { createdAt: 'desc' }
    }) : [];

    // 3. Fees
    const wallet = await prisma.wallet.findUnique({
        where: { userId: (session as any).userId }
    });
    const fees = wallet ? await prisma.walletTransaction.findMany({
        where: { walletId: wallet.id, type: 'FEE' },
        orderBy: { createdAt: 'desc' }
    }) : [];

    // Merge
    const all = [
      ...transfers.map(t => ({
        date: t.createdAt,
        type: 'TRANSFER',
        description: t.senderId === (session as any).userId ? `Sent to ${t.recipientName}` : `Received from ${t.senderId}`,
        amount: Number(t.amountSent),
        currency: t.currencySent,
        status: t.status
      })),
      ...spendTransactions.map(t => ({
        date: t.createdAt,
        type: 'CARD',
        description: `${t.merchantName} (${t.merchantCategory})`,
        amount: Number(t.amount),
        currency: t.currency,
        status: t.status
      })),
      ...fees.map(t => ({
        date: t.createdAt,
        type: 'FEE',
        description: t.description,
        amount: Number(t.amount),
        currency: t.currency,
        status: 'COMPLETED'
      }))
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // Generate CSV
    const csvHeader = 'Date,Type,Description,Amount,Currency,Status\n';
    const csvRows = all.map(t => {
      const date = new Date(t.date).toISOString().split('T')[0];
      const desc = `"${t.description.replace(/"/g, '""')}"`; // Escape quotes
      return `${date},${t.type},${desc},${t.amount},${t.currency},${t.status}`;
    }).join('\n');

    const csvContent = csvHeader + csvRows;

    return new NextResponse(csvContent, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="transactions-${new Date().toISOString().split('T')[0]}.csv"`
      }
    });

  } catch (error) {
    return NextResponse.json({ error: 'Export failed' }, { status: 500 });
  }
}
