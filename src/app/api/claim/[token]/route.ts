import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { logClaimEvent } from '@/lib/services/claim-events';
import { ClaimLinkEventType } from '@prisma/client';

export async function GET(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const now = new Date();

  try {
    const claim = await prisma.claimLink.findUnique({
      where: { token },
      include: { virtualCard: true }
    });

    if (!claim) {
      return NextResponse.json({ ok: false, error: 'CLAIM_NOT_FOUND' }, { status: 404 });
    }

    if (!claim.virtualCard) {
      return NextResponse.json({ ok: false, error: 'CARD_NOT_FOUND' }, { status: 404 });
    }

    logClaimEvent({
      claimLinkId: claim.id,
      type: ClaimLinkEventType.VIEW,
      ipAddress: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || null,
      userAgent: req.headers.get('user-agent') || null,
      metadata: { kind: 'CLAIM_PUBLIC_VIEW' },
    }).catch(() => {});

    if (claim.status === 'CLAIMED' || claim.claimedAt || claim.virtualCard.unlockedAt) {
      return NextResponse.json({ ok: false, error: 'CLAIM_ALREADY_CLAIMED' }, { status: 409 });
    }

    if (claim.expiresAt <= now || claim.status === 'EXPIRED' || claim.status === 'CANCELLED') {
      return NextResponse.json({ ok: false, error: 'CLAIM_EXPIRED' }, { status: 410 });
    }

    return NextResponse.json({
      ok: true,
      amount: claim.amount,
      currency: claim.currency,
      last4: claim.virtualCard.last4,
      brand: claim.virtualCard.brand,
      expMonth: claim.virtualCard.expMonth,
      expYear: claim.virtualCard.expYear,
      expiresAt: claim.expiresAt.toISOString(),
      locked: true,
      message: claim.message ?? null
    });
  } catch (error: any) {
    console.error('Claim GET error:', error);
    return NextResponse.json({ ok: false, error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
