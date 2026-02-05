
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function GET(req: Request) {
  const session = await getSession();
  // @ts-ignore
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    // 1. Fetch Internal Transfers (Account)
    const transfers = await prisma.transfer.findMany({
      where: {
        OR: [
          // @ts-ignore
          { senderId: session.userId },
          // @ts-ignore
          { recipientId: session.userId }
        ]
      },
      orderBy: { createdAt: 'desc' },
      take: 20
    });

    // 2. Fetch Card Transactions (Spend)
    // We need to find cards owned by user first
    const cards = await prisma.virtualCard.findMany({
      where: {
        OR: [
          // @ts-ignore
          { transfer: { recipientId: session.userId } },
          // @ts-ignore
          { userId: session.userId }
        ]
      },
      select: { id: true }
    });

    const cardIds = cards.map(c => c.id);

    const spendTransactions = await prisma.spendTransaction.findMany({
      where: {
        cardId: { in: cardIds }
      },
      orderBy: { createdAt: 'desc' },
      take: 20
    });

    // 3. Fetch Wallet Transactions (Fees, Credits, Debits)
    const wallet = await prisma.wallet.findUnique({
      // @ts-ignore
      where: { userId: session.userId }
    });

    let walletTransactions: any[] = [];
    if (wallet) {
      walletTransactions = await prisma.walletTransaction.findMany({
        where: { walletId: wallet.id },
        orderBy: { createdAt: 'desc' },
        take: 20
      });
    }

    // 4. Merge and Sort
    // We normalize to a common shape for the UI
    const unifiedHistory = [
      ...transfers.map(t => ({
        id: t.id,
        // @ts-ignore
        type: t.senderId === session.userId ? 'TRANSFER_SENT' : 'TRANSFER_RECEIVED',
        amount: Number(t.amountSent), // Simplified, should handle currency conversion display
        currency: t.currencySent,
        // @ts-ignore
        description: t.senderId === session.userId ? `Sent to ${t.recipientName || t.recipientEmail}` : `Received from ${t.senderId}`, // In real app, fetch sender name
        status: t.status,
        date: t.createdAt
      })),
      ...spendTransactions.map(t => ({
        id: t.id,
        type: 'CARD_PURCHASE',
        amount: Number(t.amount),
        currency: t.currency,
        description: `${t.merchantName} (${t.merchantCategory})`,
        status: t.status,
        date: t.createdAt
      })),
      ...walletTransactions.filter(wt => wt.type === 'FEE').map(t => ({
        id: t.id,
        type: 'FEE',
        amount: Number(t.amount),
        currency: t.currency,
        description: t.description,
        status: 'COMPLETED',
        date: t.createdAt
      }))
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 20);

    return NextResponse.json({ transactions: unifiedHistory });
  } catch (error) {
    console.error('Failed to fetch transactions:', error);
    return NextResponse.json({ error: 'Failed to fetch transactions' }, { status: 500 });
  }
}
