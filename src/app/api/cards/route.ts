import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { issueCard } from '@/lib/services/stripe';
import { logAudit } from '@/lib/logger';
import { z } from 'zod';

const createCardSchema = z.object({
  type: z.enum(['VIRTUAL', 'PHYSICAL']).default('VIRTUAL'),
  currency: z.enum(['EUR', 'USD', 'GBP']).default('EUR'),
  limit: z.number().min(0).optional()
});

export async function GET(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const cards = await prisma.virtualCard.findMany({
    where: { userId: session.userId },
    orderBy: { createdAt: 'desc' }
  });

  return NextResponse.json({ cards });
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await req.json();
    const { type, currency, limit } = createCardSchema.parse(body);

    // Verificar se usuário tem carteira
    const account = await prisma.account.findUnique({ where: { userId: session.userId } });
    if (!account) return NextResponse.json({ error: 'Account not found' }, { status: 404 });

    // Emitir cartão no Stripe (Mock)
    const stripeCard = await issueCard(session.userId, type.toLowerCase() as any, currency.toLowerCase() as any, limit);

    const card = await prisma.virtualCard.create({
      data: {
        userId: session.userId,
        stripeCardId: stripeCard.id,
        stripeCardholderId: 'mock_holder',
        last4: stripeCard.last4,
        brand: stripeCard.brand,
        expMonth: stripeCard.exp_month,
        expYear: stripeCard.exp_year,
        amount: limit || 0,
        currency: currency,
        status: 'ACTIVE',
        expiresAt: new Date(new Date().setFullYear(new Date().getFullYear() + 4)),
      }
    });

    await logAudit({
      userId: session.userId,
      action: 'CARD_ISSUED',
      status: 'SUCCESS',
      metadata: { cardId: card.id, type, currency }
    });

    return NextResponse.json({ card });

  } catch (error: any) {
    console.error('Create card error:', error);
    return NextResponse.json({ error: error.message || 'Failed to create card' }, { status: 500 });
  }
}