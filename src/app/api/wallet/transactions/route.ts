import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import type { UserTransaction } from '@prisma/client';
import { getSession } from '@/lib/auth';

export async function GET(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const page = Number(searchParams.get('page')) || 1;
  const limit = Number(searchParams.get('limit')) || 20;
  const search = searchParams.get('search') || '';
  const type = searchParams.get('type') || 'ALL';

  try {
    const whereClause: any = {
      userId: session.userId,
    };

    // Type Filter
    if (type !== 'ALL') {
        if (type === 'TRANSFER') {
            whereClause.type = { in: ['TRANSFER', 'PIX_IN', 'SEPA_IN', 'CRYPTO_IN', 'CRYPTO_OUT'] };
        } else if (type === 'CARD') {
            whereClause.type = { in: ['CARD_OUT'] };
        } else if (type === 'FEE') {
            whereClause.type = 'FEE';
        }
    }

    // Search (Basic implementation)
    // Note: Searching inside JSON metadata efficiently requires PostgreSQL specific features or Raw Query.
    // For MVP, we won't filter by search in DB to avoid complexity, relying on client or simplified backend filter if needed.
    // However, if we want to search by amount:
    if (search && !isNaN(Number(search))) {
        whereClause.amount = { equals: Number(search) };
    }

    const total = await prisma.userTransaction.count({ where: whereClause });
    
    const transactions: UserTransaction[] = await prisma.userTransaction.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit
    });

    const transferIds: string[] = [];
    for (const tx of transactions) {
      if (tx.type !== 'TRANSFER') continue;
      const meta = tx.metadata;
      if (!meta || typeof meta !== 'object') continue;
      const direction = (meta as any).direction;
      const transferId = (meta as any).transferId;
      if (direction === 'OUT' && typeof transferId === 'string' && transferId) {
        transferIds.push(transferId);
      }
    }

    const yieldByTransferId = new Map<string, string>();
    if (transferIds.length > 0) {
      const yieldTransfers = await prisma.transfer.findMany({
        where: { id: { in: transferIds }, yieldPositionId: { not: null } },
        select: { id: true, yieldPositionId: true },
      });
      for (const tr of yieldTransfers) {
        if (tr.yieldPositionId) yieldByTransferId.set(tr.id, tr.yieldPositionId);
      }
    }

    const mapped = transactions.map((tx: UserTransaction) => ({
      id: tx.id,
      type: tx.type,
      amount: Number(tx.amount),
      currency: tx.currency,
      status: tx.status,
      date: tx.createdAt.toISOString(),
      metadata:
        tx.type === 'TRANSFER' && tx.metadata && typeof tx.metadata === 'object'
          ? (() => {
              const meta = tx.metadata as any;
              const transferId = typeof meta.transferId === 'string' ? meta.transferId : undefined;
              const direction = meta.direction;
              const yieldPositionId =
                direction === 'OUT' && transferId ? yieldByTransferId.get(transferId) : undefined;
              return yieldPositionId ? { ...meta, yieldPositionId } : meta;
            })()
          : tx.metadata ?? null,
    }));

    // In-memory search filter for text (since we didn't do it in DB)
    // Only effective for the current page, which is a limitation, but acceptable for MVP
    let finalResult = mapped;
    if (search && isNaN(Number(search))) {
        const lowerSearch = search.toLowerCase();
        finalResult = mapped.filter((t) => {
          const meta = (t as any).metadata;
          const metaText =
            meta && typeof meta === 'object'
              ? Object.values(meta).map(String).join(' ')
              : '';
          return (
            String(t.type).toLowerCase().includes(lowerSearch) ||
            metaText.toLowerCase().includes(lowerSearch)
          );
        });
    }

    return NextResponse.json({
      transactions: finalResult,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Failed to fetch transactions:', error);
    return NextResponse.json({ error: 'Failed to fetch transactions' }, { status: 500 });
  }
}
