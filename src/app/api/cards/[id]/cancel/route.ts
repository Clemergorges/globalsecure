import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { getIssuerConnector } from '@/lib/services/issuer-connector';
import { logAudit } from '@/lib/logger';

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;

    const virtualCard = await prisma.virtualCard.findUnique({
      where: { id },
      include: { transfer: { select: { senderId: true } } },
    });

    if (!virtualCard) return NextResponse.json({ error: 'Card not found' }, { status: 404 });

    const isOwner = virtualCard.userId === session.userId || virtualCard.transfer?.senderId === session.userId;
    if (!isOwner && !session.isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    if (virtualCard.status === 'CANCELED' || virtualCard.status === 'INACTIVE') {
      return NextResponse.json({ error: 'Already cancelled', code: 'ALREADY_CANCELLED' }, { status: 400 });
    }

    const issuer = getIssuerConnector();

    try {
      if (issuer.kind === 'stripe_sandbox') {
        await issuer.updateCardStatus(virtualCard.stripeCardId, 'inactive');
      }
    } catch (e: any) {
      await logAudit({
        userId: session.userId,
        action: 'CARD_CANCELLED',
        status: 'FAILURE',
        metadata: { cardId: id, issuer: issuer.kind, error: e?.message || String(e) },
      });
    }

    await prisma.virtualCard.update({
      where: { id },
      data: {
        status: 'CANCELED',
        canceledAt: new Date(),
      },
    });

    await logAudit({
      userId: session.userId,
      action: 'CARD_CANCELLED',
      status: 'SUCCESS',
      metadata: { cardId: id, issuer: issuer.kind },
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('CARD_CANCEL_ERROR', err);
    return NextResponse.json({ error: 'Cancel failed', code: 'CANCEL_UPDATE_FAILED', details: err?.message || String(err) }, { status: 500 });
  }
}
