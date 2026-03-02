import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { getIssuerConnector } from '@/lib/services/issuer-connector';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || !session.userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const cardId = id;

  try {
    const card = await prisma.virtualCard.findUnique({
      where: { id: cardId }
    });

    if (!card) {
      return NextResponse.json({ error: 'Card not found' }, { status: 404 });
    }

    if (card.userId !== session.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const issuer = getIssuerConnector();
    const revealed = await issuer.revealCard(card.stripeCardId, {
      last4: card.last4,
      expMonth: card.expMonth,
      expYear: card.expYear,
    });

    return NextResponse.json(revealed);

  } catch (error: any) {
    console.error('Reveal error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
