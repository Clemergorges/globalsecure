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
            whereClause.type = { in: ['CARD_PURCHASE', 'CARD_FUNDING', 'CARD_OUT'] };
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
    
    const transactions = await prisma.userTransaction.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit
    });

    const mapped = transactions.map(tx => {
        let description = tx.type.replace('_', ' ');
        
        if (tx.metadata && typeof tx.metadata === 'object') {
            const meta = tx.metadata as any;
            if (meta.description) description = meta.description;
            else if (meta.merchantName) description = meta.merchantName;
            else if (meta.recipientEmail) description = `Sent to ${meta.recipientEmail}`;
            else if (meta.senderName) description = `Received from ${meta.senderName}`;
        }

        // Format Description for known types
        if (tx.type === 'PIX_IN') description = 'Depósito PIX Recebido';
        if (tx.type === 'SEPA_IN') description = 'Depósito SEPA Recebido';

        return {
          id: tx.id,
          type: tx.type,
          amount: Number(tx.amount),
          currency: tx.currency,
          description: description,
          status: tx.status,
          date: tx.createdAt
        };
    });

    // In-memory search filter for text (since we didn't do it in DB)
    // Only effective for the current page, which is a limitation, but acceptable for MVP
    let finalResult = mapped;
    if (search && isNaN(Number(search))) {
        const lowerSearch = search.toLowerCase();
        finalResult = mapped.filter(t => 
            t.description.toLowerCase().includes(lowerSearch) || 
            t.type.toLowerCase().includes(lowerSearch)
        );
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