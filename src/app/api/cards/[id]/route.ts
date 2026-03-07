
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { logAudit } from '@/lib/logger';

export async function DELETE(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id: cardId } = await context.params;

    const card = await prisma.virtualCard.findUnique({
      where: { id: cardId },
    });

    if (!card) {
      return NextResponse.json({ error: 'Card not found' }, { status: 404 });
    }

    if (card.userId !== session.userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // In a real scenario, you would also cancel the card in Stripe here.
    // await stripe.issuing.cards.update(card.stripeCardId, { status: 'canceled' });

    await prisma.virtualCard.delete({
      where: { id: cardId },
    });

    await logAudit({
      userId: session.userId,
      action: 'CARD_DELETED',
      status: 'SUCCESS',
      metadata: { cardId: cardId, last4: card.last4 }
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Delete card error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete card' },
      { status: 500 }
    );
  }
}
