
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function GET(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const page = Number(searchParams.get('page')) || 1;
  const limit = Number(searchParams.get('limit')) || 20;
  const search = searchParams.get('search') || '';
  const type = searchParams.get('type') || 'ALL'; // ALL, TRANSFER, CARD, FEE
  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');

  // Date filters for Prisma
  const dateFilter: { gte?: Date; lte?: Date } = {};
  if (startDate) {
    dateFilter.gte = new Date(startDate);
  }
  if (endDate) {
    dateFilter.lte = new Date(endDate);
  }

  const hasDateFilter = startDate || endDate;

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let allTransactions: any[] = [];

    // 1. Fetch Internal Transfers (Account)
    if (type === 'ALL' || type === 'TRANSFER') {
      const transfers = await prisma.transfer.findMany({
        where: {
          OR: [
            // @ts-expect-error Session userId
            { senderId: session.userId },
            // @ts-expect-error Session userId
            { recipientId: session.userId }
          ],
          createdAt: hasDateFilter ? dateFilter : undefined,
          // Search filter (naive implementation for MVP)
          ...(search ? {
             OR: [
               { recipientEmail: { contains: search, mode: 'insensitive' } },
               { recipientName: { contains: search, mode: 'insensitive' } }
             ]
          } : {})
        },
        orderBy: { createdAt: 'desc' },
        take: limit * 2 // Fetch more to allow merging and slicing later
      });

      allTransactions = allTransactions.concat(transfers.map(t => ({
        id: t.id,
        type: t.senderId === (session as any).userId ? 'TRANSFER_SENT' : 'TRANSFER_RECEIVED',
        amount: Number(t.amountSent),
        currency: t.currencySent,
        description: t.senderId === (session as any).userId ? `Sent to ${t.recipientName || t.recipientEmail}` : `Received from ${t.senderId}`,
        status: t.status,
        date: t.createdAt
      })));
    }

    // 2. Fetch Card Transactions (Spend)
    if (type === 'ALL' || type === 'CARD') {
      const cards = await prisma.virtualCard.findMany({
        where: {
          OR: [
            { transfer: { recipientId: (session as any).userId } },
            { userId: (session as any).userId }
          ]
        },
        select: { id: true }
      });
      const cardIds = cards.map(c => c.id);

      if (cardIds.length > 0) {
        const spendTransactions = await prisma.spendTransaction.findMany({
          where: {
            cardId: { in: cardIds },
            createdAt: hasDateFilter ? dateFilter : undefined,
            ...(search ? {
              merchantName: { contains: search, mode: 'insensitive' }
            } : {})
          },
          orderBy: { createdAt: 'desc' },
          take: limit * 2
        });

        allTransactions = allTransactions.concat(spendTransactions.map(t => ({
          id: t.id,
          type: 'CARD_PURCHASE',
          amount: Number(t.amount),
          currency: t.currency,
          description: `${t.merchantName} (${t.merchantCategory})`,
          status: t.status,
          date: t.createdAt
        })));
      }
    }

    // 3. Fetch Wallet Transactions (Fees)
    if (type === 'ALL' || type === 'FEE') {
      const wallet = await prisma.wallet.findUnique({
        where: { userId: (session as any).userId }
      });

      if (wallet) {
        const walletTransactions = await prisma.walletTransaction.findMany({
          where: { 
            walletId: wallet.id,
            type: 'FEE',
            createdAt: hasDateFilter ? dateFilter : undefined,
            ...(search ? {
              description: { contains: search, mode: 'insensitive' }
            } : {})
          },
          orderBy: { createdAt: 'desc' },
          take: limit * 2
        });

        allTransactions = allTransactions.concat(walletTransactions.map(t => ({
          id: t.id,
          type: 'FEE',
          amount: Number(t.amount),
          currency: t.currency,
          description: t.description,
          status: 'COMPLETED',
          date: t.createdAt
        })));
      }
    }

    // 4. Merge, Sort and Paginate (In-memory for MVP due to dispersed data sources)
    // For a production app with high volume, this strategy would move to a unified "Activity" table or view.
    
    // Search filtering (Post-fetch for fields not covered by DB queries if needed, though we tried to cover basic ones)
    if (search) {
      allTransactions = allTransactions.filter(t => 
        t.description.toLowerCase().includes(search.toLowerCase()) ||
        String(t.amount).includes(search)
      );
    }

    const sorted = allTransactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    
    const startIndex = (page - 1) * limit;
    const paginated = sorted.slice(startIndex, startIndex + limit);

    return NextResponse.json({
      transactions: paginated,
      pagination: {
        page,
        limit,
        total: sorted.length,
        totalPages: Math.ceil(sorted.length / limit)
      }
    });

  } catch (error) {
    console.error('Failed to fetch transactions:', error);
    return NextResponse.json({ error: 'Failed to fetch transactions' }, { status: 500 });
  }
}
