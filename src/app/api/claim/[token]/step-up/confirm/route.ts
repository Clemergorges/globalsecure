import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { verifyClaimStepUpOtp } from '@/lib/services/claim-stepup';
import { getCardData } from '@/lib/services/card';
import { logClaimEvent } from '@/lib/services/claim-events';
import { ClaimLinkEventType } from '@prisma/client';
import { logAudit } from '@/lib/logger';

const schema = z.object({ otp: z.string().regex(/^[0-9]{6}$/) });

export async function POST(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const ip = req.headers.get('x-forwarded-for') || 'unknown';
  const userAgent = req.headers.get('user-agent') || 'unknown';

  let body: any = {};
  try {
    body = await req.json();
  } catch {}
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ ok: false, error: 'INVALID_REQUEST' }, { status: 400 });

  const claim = await prisma.claimLink.findUnique({ where: { token }, include: { virtualCard: true } });
  if (!claim || !claim.virtualCard) return NextResponse.json({ ok: false, error: 'CLAIM_NOT_FOUND' }, { status: 404 });

  const now = new Date();
  if (claim.expiresAt <= now || claim.status === 'EXPIRED' || claim.status === 'CANCELLED') {
    return NextResponse.json({ ok: false, error: 'CLAIM_EXPIRED' }, { status: 410 });
  }
  if (claim.status === 'CLAIMED' || claim.claimedAt || claim.virtualCard.unlockedAt) {
    return NextResponse.json({ ok: false, error: 'CLAIM_ALREADY_CLAIMED' }, { status: 409 });
  }

  const verify = await verifyClaimStepUpOtp({ claimLinkId: claim.id, otp: parsed.data.otp, ipAddress: ip, userAgent });
  if (!verify.ok) {
    logClaimEvent({
      claimLinkId: claim.id,
      type: ClaimLinkEventType.STEPUP_OTP_FAILED,
      ipAddress: ip,
      userAgent,
      metadata: { error: verify.error, attemptsRemaining: (verify as any).attemptsRemaining ?? null },
    }).catch(() => {});
    return NextResponse.json({ ok: false, error: verify.error, attemptsRemaining: (verify as any).attemptsRemaining }, { status: 401 });
  }

  logClaimEvent({ claimLinkId: claim.id, type: ClaimLinkEventType.STEPUP_OTP_VERIFIED, ipAddress: ip, userAgent }).catch(() => {});

  const updated = await prisma.$transaction(async (tx) => {
    const lockedClaim = await tx.claimLink.findUnique({ where: { token }, include: { virtualCard: true } });
    if (!lockedClaim || !lockedClaim.virtualCard) return { ok: false as const, error: 'CLAIM_NOT_FOUND' as const };
    if (lockedClaim.status === 'CLAIMED' || lockedClaim.claimedAt || lockedClaim.virtualCard.unlockedAt) return { ok: false as const, error: 'CLAIM_ALREADY_CLAIMED' as const };
    if (lockedClaim.expiresAt <= new Date() || lockedClaim.status === 'EXPIRED' || lockedClaim.status === 'CANCELLED') return { ok: false as const, error: 'CLAIM_EXPIRED' as const };

    await tx.virtualCard.update({ where: { id: lockedClaim.virtualCard.id }, data: { unlockedAt: new Date() } });
    await tx.claimLink.update({ where: { id: lockedClaim.id }, data: { status: 'CLAIMED', claimedAt: new Date(), claimedByIP: ip } });
    return { ok: true as const, claimId: lockedClaim.id, cardId: lockedClaim.virtualCard.id, last4: lockedClaim.virtualCard.last4, brand: lockedClaim.virtualCard.brand };
  });

  if (!updated.ok) {
    const status = updated.error === 'CLAIM_EXPIRED' ? 410 : updated.error === 'CLAIM_ALREADY_CLAIMED' ? 409 : 404;
    return NextResponse.json({ ok: false, error: updated.error }, { status });
  }

  const cardData = await getCardData(updated.cardId);
  logClaimEvent({ claimLinkId: claim.id, type: ClaimLinkEventType.REVEAL_SUCCESS, ipAddress: ip, userAgent, metadata: { cardId: updated.cardId, last4: updated.last4 } }).catch(() => {});
  await logAudit({
    action: 'CLAIM_STEPUP_SUCCESS',
    status: '200',
    ipAddress: ip,
    userAgent,
    method: 'POST',
    path: `/api/claim/${token}/step-up/confirm`,
    metadata: { claimId: updated.claimId, cardId: updated.cardId, last4: updated.last4, brand: updated.brand },
  });

  return NextResponse.json({
    ok: true,
    cardNumber: cardData.pan,
    cvc: cardData.cvv,
    expMonth: cardData.expMonth,
    expYear: cardData.expYear,
    brand: updated.brand,
  });
}

