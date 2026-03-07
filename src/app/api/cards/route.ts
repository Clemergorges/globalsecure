import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { logAudit } from '@/lib/logger';
import { getIssuerConnector } from '@/lib/services/issuer-connector';
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

    const issuer = getIssuerConnector();
    const issued = await issuer.createVirtualCard({
      amount: limit || 0,
      currency: currency.toLowerCase(),
      userId: session.userId,
      recipientEmail: session.email,
      recipientName: 'User',
    });

    const card = await prisma.virtualCard.create({
      data: {
        userId: session.userId,
        stripeCardId: issued.cardId,
        stripeCardholderId: issued.cardholderId,
        last4: issued.last4,
        brand: issued.brand,
        expMonth: issued.exp_month,
        expYear: issued.exp_year,
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
      metadata: { cardId: card.id, type, currency, issuer: issuer.kind }
    });

    return NextResponse.json({ card });

  } catch (error: any) {
    console.error('Create card error:', error);
    return NextResponse.json({ error: error.message || 'Failed to create card' }, { status: 500 });
  }
}
