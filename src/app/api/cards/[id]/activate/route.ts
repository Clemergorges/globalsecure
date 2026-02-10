import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { updateCardStatus } from '@/lib/services/stripe';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  // @ts-ignore
  if (!session || !session.userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  // @ts-ignore
  const userId = session.userId;
  const { id } = await params;
  const cardId = id;

  try {
    const card = await prisma.virtualCard.findUnique({
      where: { id: cardId }
    });

    if (!card) {
      return NextResponse.json({ error: 'Card not found' }, { status: 404 });
    }

    if (card.userId !== userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    if (card.status === 'ACTIVE') {
        return NextResponse.json({ error: 'Card already active' }, { status: 400 });
    }

    // Call Stripe to activate
    await updateCardStatus(card.stripeCardId, 'active');

    // Update DB
    const updatedCard = await prisma.virtualCard.update({
        where: { id: cardId },
        data: {
            status: 'ACTIVE',
            activatedAt: new Date()
        }
    });

    return NextResponse.json({ success: true, card: updatedCard });

  } catch (error: any) {
    console.error('Card activation error:', error);
    return NextResponse.json({ error: error.message || 'Failed to activate card' }, { status: 500 });
  }
}
