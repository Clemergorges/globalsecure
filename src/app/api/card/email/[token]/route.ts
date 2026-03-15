import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { logClaimEvent } from '@/lib/services/claim-events';
import { ClaimLinkEventType } from '@prisma/client';

export async function GET(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  const claim = await prisma.claimLink.findUnique({
    where: { token },
    include: { virtualCard: true },
  });

  const now = new Date();
  if (!claim || !claim.virtualCard) {
    return NextResponse.json({ ok: false, code: 'CARD_LINK_INVALID' }, { status: 404 });
  }

  logClaimEvent({
    claimLinkId: claim.id,
    type: ClaimLinkEventType.VIEW,
    ipAddress: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || null,
    userAgent: req.headers.get('user-agent') || null,
    metadata: { kind: 'CARD_EMAIL_VIEW' },
  }).catch(() => {});
  if (claim.expiresAt <= now || claim.status === 'EXPIRED' || claim.status === 'CANCELLED') {
    return NextResponse.json({ ok: false, code: 'CARD_LINK_INVALID' }, { status: 404 });
  }

  const card = claim.virtualCard;

  if (card.unlockCode && !card.unlockedAt) {
    return NextResponse.json({ ok: false, code: 'CARD_OTP_REQUIRED' }, { status: 401 });
  }

  const spends = await prisma.spendTransaction.findMany({
    where: { cardId: card.id, status: 'approved' },
    orderBy: { createdAt: 'desc' },
    take: 50,
    select: {
      merchantName: true,
      amount: true,
      currency: true,
      createdAt: true,
    },
  });

  const amountInitial = Number(card.amount);
  const amountUsed = Number(card.amountUsed);
  const amountAvailable = Math.max(0, Number((amountInitial - amountUsed).toFixed(2)));

  return NextResponse.json({
    ok: true,
    cardMasked: {
      last4: card.last4,
      brand: card.brand,
      expMonth: card.expMonth,
      expYear: card.expYear,
    },
    amountInitial,
    currency: card.currency,
    amountUsed,
    amountAvailable,
    transactions: spends.map((s) => ({
      merchant: s.merchantName,
      amount: Number(s.amount),
      currency: s.currency,
      date: s.createdAt.toISOString(),
    })),
  });
}
