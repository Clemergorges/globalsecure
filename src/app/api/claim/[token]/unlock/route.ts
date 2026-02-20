import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { z } from 'zod';
import { checkRateLimit } from '@/lib/rate-limit';
import { logAudit } from '@/lib/logger';
import { getCardData } from '@/lib/services/card';
import { closeEtherFiPosition } from '@/lib/services/etherfiService';

const unlockSchema = z.object({
  unlockCode: z
    .string()
    .min(6)
    .max(6)
    .regex(/^[a-zA-Z0-9]{6}$/),
});

export async function POST(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const ip = req.headers.get('x-forwarded-for') || 'unknown';
  const userAgent = req.headers.get('user-agent') || 'unknown';
  const proto = req.headers.get('x-forwarded-proto');

  if (process.env.NODE_ENV === 'production' && proto && proto !== 'https') {
    return NextResponse.json({ ok: false, error: 'HTTPS_REQUIRED' }, { status: 400 });
  }

  let body: any = {};
  try {
    body = await req.json();
  } catch {}

  const parsed = unlockSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: 'INVALID_REQUEST' }, { status: 400 });
  }

  const inputCode = parsed.data.unlockCode.toLowerCase();

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

    const now = new Date();
    if (claim.expiresAt <= now || claim.status === 'EXPIRED' || claim.status === 'CANCELLED') {
      return NextResponse.json({ ok: false, error: 'CLAIM_EXPIRED' }, { status: 410 });
    }

    if (claim.status === 'CLAIMED' || claim.claimedAt || claim.virtualCard.unlockedAt) {
      return NextResponse.json({ ok: false, error: 'CLAIM_ALREADY_CLAIMED' }, { status: 409 });
    }

    const expected = (claim.virtualCard.unlockCode || '').toLowerCase();

    if (expected !== inputCode) {
      const rl = await checkRateLimit(`claim_unlock:${token}:${ip}`, 3, 15 * 60);
      const attemptsRemaining = rl.remaining;
      const retryAfterSeconds = Math.max(0, Math.ceil((rl.reset - Date.now()) / 1000));
      const rateLimitHeaders = {
        'X-RateLimit-Limit': String(rl.limit),
        'X-RateLimit-Remaining': String(rl.remaining),
        'Retry-After': String(retryAfterSeconds),
      };

      await logAudit({
        action: 'CLAIM_UNLOCK_FAILED',
        status: '400',
        ipAddress: ip,
        userAgent,
        method: 'POST',
        path: `/api/claim/${token}/unlock`,
        metadata: {
          claimId: claim.id,
          cardId: claim.virtualCard.id,
          reason: 'INVALID_CODE',
          last4: claim.virtualCard.last4,
          brand: claim.virtualCard.brand,
          attemptsRemaining
        }
      });

      if (!rl.success) {
        return NextResponse.json(
          { ok: false, error: 'TOO_MANY_ATTEMPTS', attemptsRemaining: 0 },
          { status: 429, headers: rateLimitHeaders }
        );
      }

      return NextResponse.json(
        { ok: false, error: 'INVALID_UNLOCK_CODE', attemptsRemaining },
        { status: 400, headers: rateLimitHeaders }
      );
    }

    const updated = await prisma.$transaction(async (tx) => {
      const lockedClaim = await tx.claimLink.findUnique({
        where: { token },
        include: { virtualCard: true }
      });

      if (!lockedClaim || !lockedClaim.virtualCard) {
        return { ok: false as const, error: 'CLAIM_NOT_FOUND' as const };
      }

      if (lockedClaim.status === 'CLAIMED' || lockedClaim.claimedAt || lockedClaim.virtualCard.unlockedAt) {
        return { ok: false as const, error: 'CLAIM_ALREADY_CLAIMED' as const };
      }

      if (lockedClaim.expiresAt <= new Date() || lockedClaim.status === 'EXPIRED' || lockedClaim.status === 'CANCELLED') {
        return { ok: false as const, error: 'CLAIM_EXPIRED' as const };
      }

      await tx.virtualCard.update({
        where: { id: lockedClaim.virtualCard.id },
        data: { unlockedAt: new Date() }
      });

      await tx.claimLink.update({
        where: { id: lockedClaim.id },
        data: { status: 'CLAIMED', claimedAt: new Date(), claimedByIP: ip }
      });

      return { ok: true as const, claimId: lockedClaim.id, cardId: lockedClaim.virtualCard.id, last4: lockedClaim.virtualCard.last4, brand: lockedClaim.virtualCard.brand, createdAt: lockedClaim.createdAt };
    });

    if (!updated.ok) {
      const status = updated.error === 'CLAIM_EXPIRED' ? 410 : updated.error === 'CLAIM_ALREADY_CLAIMED' ? 409 : 404;
      return NextResponse.json({ ok: false, error: updated.error }, { status });
    }

    const transferId = claim.virtualCard?.transferId;
    if (transferId) {
      const transfer = await prisma.transfer.findUnique({ where: { id: transferId } });
      if (transfer?.yieldPositionId) {
        try {
          await closeEtherFiPosition({
            positionId: transfer.yieldPositionId,
            reason: 'OTP_UNLOCK',
          });
        } catch (err: any) {
          await logAudit({
            action: 'ETHERFI_CLOSE_FAILED',
            status: 'ERROR',
            ipAddress: ip,
            userAgent,
            method: 'POST',
            path: `/api/claim/${token}/unlock`,
            metadata: {
              transferId,
              positionId: transfer.yieldPositionId,
              message: String(err?.message || err),
            },
          });
        }
      }
    }

    const cardData = await getCardData(updated.cardId);

    await logAudit({
      action: 'CLAIM_UNLOCKED_SUCCESS',
      status: '200',
      ipAddress: ip,
      userAgent,
      method: 'POST',
      path: `/api/claim/${token}/unlock`,
      metadata: {
        claimId: updated.claimId,
        cardId: updated.cardId,
        last4: updated.last4,
        brand: updated.brand,
        duration: updated.createdAt ? Date.now() - new Date(updated.createdAt).getTime() : null
      }
    });

    return NextResponse.json({
      ok: true,
      cardNumber: cardData.pan,
      cvc: cardData.cvv,
      expMonth: cardData.expMonth,
      expYear: cardData.expYear,
      brand: updated.brand
    });
  } catch (error: any) {
    console.error('Claim unlock error:', error);
    return NextResponse.json({ ok: false, error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
